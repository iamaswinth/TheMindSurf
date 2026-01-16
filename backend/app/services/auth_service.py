"""
Authentication Service

Handles user authentication, JWT tokens, and password hashing.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from uuid import UUID
import secrets
import hashlib

import bcrypt
from jose import JWTError, jwt
import httpx

from app.core.config import settings
from app.db.connection import db

logger = logging.getLogger(__name__)


class AuthenticationError(Exception):
    """Custom exception for authentication errors."""
    def __init__(self, message: str, code: str = "AUTH_ERROR"):
        self.message = message
        self.code = code
        super().__init__(self.message)


class AuthService:
    """Service for handling authentication operations."""
    
    # =========================================================================
    # Password Hashing
    # =========================================================================
    
    @staticmethod
    def hash_password(password: str) -> str:
        """
        Hash a password using bcrypt.
        
        Automatically handles bcrypt's 72-byte limit by truncating if necessary.
        Uses UTF-8 encoding for password bytes.
        """
        # Convert password to bytes and truncate to 72 bytes for bcrypt limit
        password_bytes = password.encode('utf-8')[:72]
        # Generate salt and hash
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password_bytes, salt)
        # Return as string for database storage
        return hashed.decode('utf-8')
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """
        Verify a password against its hash.
        
        Args:
            plain_password: The plain text password to verify
            hashed_password: The bcrypt hash from the database
            
        Returns:
            True if password matches, False otherwise
        """
        try:
            # Convert password to bytes and truncate to 72 bytes
            password_bytes = plain_password.encode('utf-8')[:72]
            # Convert hash to bytes
            hash_bytes = hashed_password.encode('utf-8')
            # Verify
            return bcrypt.checkpw(password_bytes, hash_bytes)
        except Exception as e:
            logger.error(f"Password verification error: {e}")
            return False
    
    # =========================================================================
    # Token Generation
    # =========================================================================
    
    @staticmethod
    def create_access_token(user_id: str, email: str, role: str = "user") -> str:
        """Create a JWT access token."""
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode = {
            "sub": user_id,
            "email": email,
            "role": role,
            "type": "access",
            "exp": expire
        }
        return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    
    @staticmethod
    def create_refresh_token() -> str:
        """Create a random refresh token."""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def hash_token(token: str) -> str:
        """Hash a token for storage."""
        return hashlib.sha256(token.encode()).hexdigest()
    
    @staticmethod
    def decode_access_token(token: str) -> Dict[str, Any]:
        """Decode and validate a JWT access token."""
        try:
            payload = jwt.decode(
                token, 
                settings.JWT_SECRET_KEY, 
                algorithms=[settings.JWT_ALGORITHM]
            )
            if payload.get("type") != "access":
                raise AuthenticationError("Invalid token type", "INVALID_TOKEN")
            return payload
        except JWTError as e:
            raise AuthenticationError(f"Invalid token: {str(e)}", "INVALID_TOKEN")
    
    # =========================================================================
    # User Registration
    # =========================================================================
    
    @staticmethod
    async def register_user(
        email: str,
        password: str,
        display_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Register a new user with email and password.
        
        Returns the created user record.
        """
        # Check if email already exists
        existing_user = await AuthService.get_user_by_email(email)
        if existing_user:
            raise AuthenticationError("Email already registered", "EMAIL_EXISTS")
        
        # Hash password
        password_hash = AuthService.hash_password(password)
        
        # Create user with initial credits
        query = """
        INSERT INTO users (email, password_hash, display_name, auth_method, credits)
        VALUES ($1, $2, $3, 'email', $4)
        RETURNING id, email, display_name, role, credits, auth_method, created_at
        """
        
        result = await db.execute_one(
            query,
            email,
            password_hash,
            display_name or email.split("@")[0],
            settings.INITIAL_USER_CREDITS
        )
        
        if result:
            user = dict(result)
            # Record initial credits transaction
            await AuthService._record_credit_transaction(
                user_id=user["id"],
                amount=settings.INITIAL_USER_CREDITS,
                balance_after=settings.INITIAL_USER_CREDITS,
                transaction_type="initial",
                reason="Initial signup credits"
            )
            logger.info(f"User registered: {email}")
            return user
        
        raise AuthenticationError("Failed to create user", "CREATE_USER_FAILED")
    
    # =========================================================================
    # User Login
    # =========================================================================
    
    @staticmethod
    async def login_user(email: str, password: str) -> Dict[str, Any]:
        """
        Authenticate user with email and password.
        
        Returns user data and tokens.
        """
        user = await AuthService.get_user_by_email(email)
        
        if not user:
            raise AuthenticationError("Invalid email or password", "INVALID_CREDENTIALS")
        
        if not user.get("password_hash"):
            raise AuthenticationError(
                "This account uses GitHub login. Please sign in with GitHub.",
                "USE_GITHUB_LOGIN"
            )
        
        if not AuthService.verify_password(password, user["password_hash"]):
            raise AuthenticationError("Invalid email or password", "INVALID_CREDENTIALS")
        
        if not user.get("is_active", True):
            raise AuthenticationError("Account is disabled", "ACCOUNT_DISABLED")
        
        # Update last login
        await AuthService._update_last_login(user["id"])
        
        # Generate tokens
        access_token = AuthService.create_access_token(
            str(user["id"]),
            user["email"],
            user.get("role", "user")
        )
        refresh_token = AuthService.create_refresh_token()
        
        # Store refresh token
        await AuthService._store_refresh_token(user["id"], refresh_token)
        
        logger.info(f"User logged in: {email}")
        
        return {
            "user": {
                "id": str(user["id"]),
                "email": user["email"],
                "display_name": user.get("display_name"),
                "role": user.get("role", "user"),
                "credits": user.get("credits", 0),
                "auth_method": user.get("auth_method", "email"),
                "github_username": user.get("github_username"),
                "github_avatar_url": user.get("github_avatar_url"),
            },
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
    
    # =========================================================================
    # GitHub OAuth
    # =========================================================================
    
    @staticmethod
    def get_github_auth_url(state: str) -> str:
        """Generate GitHub OAuth authorization URL."""
        if not settings.is_github_oauth_available:
            raise AuthenticationError("GitHub OAuth not configured", "GITHUB_NOT_CONFIGURED")
        
        params = {
            "client_id": settings.GITHUB_CLIENT_ID,
            "redirect_uri": settings.GITHUB_REDIRECT_URI,
            "scope": "user:email",
            "state": state
        }
        query_string = "&".join(f"{k}={v}" for k, v in params.items())
        return f"https://github.com/login/oauth/authorize?{query_string}"
    
    @staticmethod
    async def handle_github_callback(code: str) -> Dict[str, Any]:
        """
        Handle GitHub OAuth callback.
        
        Exchanges code for access token, fetches user info,
        and creates or updates user account.
        """
        if not settings.is_github_oauth_available:
            raise AuthenticationError("GitHub OAuth not configured", "GITHUB_NOT_CONFIGURED")
        
        # Exchange code for access token
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": settings.GITHUB_CLIENT_ID,
                    "client_secret": settings.GITHUB_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": settings.GITHUB_REDIRECT_URI,
                },
                headers={"Accept": "application/json"}
            )
            token_data = token_response.json()
            
            if "error" in token_data:
                raise AuthenticationError(
                    token_data.get("error_description", "GitHub OAuth failed"),
                    "GITHUB_OAUTH_FAILED"
                )
            
            github_access_token = token_data.get("access_token")
            
            # Fetch user info from GitHub
            user_response = await client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"Bearer {github_access_token}",
                    "Accept": "application/json"
                }
            )
            github_user = user_response.json()
            
            # Fetch user email (may be private)
            email_response = await client.get(
                "https://api.github.com/user/emails",
                headers={
                    "Authorization": f"Bearer {github_access_token}",
                    "Accept": "application/json"
                }
            )
            emails = email_response.json()
            
            # Get primary email
            primary_email = None
            for email_obj in emails:
                if email_obj.get("primary") and email_obj.get("verified"):
                    primary_email = email_obj.get("email")
                    break
            
            if not primary_email:
                primary_email = github_user.get("email")
            
            if not primary_email:
                raise AuthenticationError(
                    "Could not get email from GitHub. Please make your email public or add a verified email.",
                    "NO_GITHUB_EMAIL"
                )
        
        github_id = str(github_user.get("id"))
        github_username = github_user.get("login")
        github_avatar = github_user.get("avatar_url")
        display_name = github_user.get("name") or github_username
        
        # Check if user exists by GitHub ID
        existing_by_github = await AuthService.get_user_by_github_id(github_id)
        
        if existing_by_github:
            # Update GitHub info and login
            await AuthService._update_github_info(
                existing_by_github["id"],
                github_username,
                github_avatar
            )
            await AuthService._update_last_login(existing_by_github["id"])
            user = await AuthService.get_user_by_id(existing_by_github["id"])
        else:
            # Check if user exists by email
            existing_by_email = await AuthService.get_user_by_email(primary_email)
            
            if existing_by_email:
                # Link GitHub to existing account
                await AuthService._link_github_account(
                    existing_by_email["id"],
                    github_id,
                    github_username,
                    github_avatar
                )
                await AuthService._update_last_login(existing_by_email["id"])
                user = await AuthService.get_user_by_id(existing_by_email["id"])
            else:
                # Create new user with GitHub
                user = await AuthService._create_github_user(
                    email=primary_email,
                    github_id=github_id,
                    github_username=github_username,
                    github_avatar=github_avatar,
                    display_name=display_name
                )
        
        # Generate tokens
        access_token = AuthService.create_access_token(
            str(user["id"]),
            user["email"],
            user.get("role", "user")
        )
        refresh_token = AuthService.create_refresh_token()
        
        # Store refresh token
        await AuthService._store_refresh_token(user["id"], refresh_token)
        
        logger.info(f"GitHub user logged in: {primary_email}")
        
        return {
            "user": {
                "id": str(user["id"]),
                "email": user["email"],
                "display_name": user.get("display_name"),
                "role": user.get("role", "user"),
                "credits": user.get("credits", 0),
                "auth_method": user.get("auth_method", "github"),
                "github_username": user.get("github_username"),
                "github_avatar_url": user.get("github_avatar_url"),
            },
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
    
    # =========================================================================
    # Token Refresh
    # =========================================================================
    
    @staticmethod
    async def refresh_access_token(refresh_token: str) -> Dict[str, Any]:
        """Refresh access token using refresh token."""
        token_hash = AuthService.hash_token(refresh_token)
        
        query = """
        SELECT rt.*, u.email, u.role, u.display_name, u.credits, u.auth_method,
               u.github_username, u.github_avatar_url
        FROM refresh_tokens rt
        JOIN users u ON rt.user_id = u.id
        WHERE rt.token_hash = $1 
          AND rt.expires_at > NOW()
          AND rt.revoked_at IS NULL
          AND u.is_active = TRUE
        """
        
        result = await db.execute_one(query, token_hash)
        
        if not result:
            raise AuthenticationError("Invalid or expired refresh token", "INVALID_REFRESH_TOKEN")
        
        user_id = result["user_id"]
        
        # Generate new access token
        access_token = AuthService.create_access_token(
            str(user_id),
            result["email"],
            result.get("role", "user")
        )
        
        # Optionally rotate refresh token
        new_refresh_token = AuthService.create_refresh_token()
        
        # Revoke old refresh token
        await AuthService._revoke_refresh_token(token_hash)
        
        # Store new refresh token
        await AuthService._store_refresh_token(user_id, new_refresh_token)
        
        return {
            "user": {
                "id": str(user_id),
                "email": result["email"],
                "display_name": result.get("display_name"),
                "role": result.get("role", "user"),
                "credits": result.get("credits", 0),
                "auth_method": result.get("auth_method"),
                "github_username": result.get("github_username"),
                "github_avatar_url": result.get("github_avatar_url"),
            },
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }
    
    # =========================================================================
    # Logout
    # =========================================================================
    
    @staticmethod
    async def logout(refresh_token: str) -> None:
        """Revoke refresh token on logout."""
        token_hash = AuthService.hash_token(refresh_token)
        await AuthService._revoke_refresh_token(token_hash)
        logger.info("User logged out")
    
    # =========================================================================
    # User Queries
    # =========================================================================
    
    @staticmethod
    async def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
        """Get user by email."""
        query = """
        SELECT id, email, password_hash, display_name, role, credits, auth_method,
               github_id, github_username, github_avatar_url, is_active, created_at
        FROM users
        WHERE email = $1
        """
        result = await db.execute_one(query, email)
        return dict(result) if result else None
    
    @staticmethod
    async def get_user_by_id(user_id: UUID) -> Optional[Dict[str, Any]]:
        """Get user by ID."""
        query = """
        SELECT id, email, display_name, role, credits, auth_method,
               github_id, github_username, github_avatar_url, is_active, created_at
        FROM users
        WHERE id = $1
        """
        result = await db.execute_one(query, user_id)
        return dict(result) if result else None
    
    @staticmethod
    async def get_user_by_github_id(github_id: str) -> Optional[Dict[str, Any]]:
        """Get user by GitHub ID."""
        query = """
        SELECT id, email, display_name, role, credits, auth_method,
               github_id, github_username, github_avatar_url, is_active, created_at
        FROM users
        WHERE github_id = $1
        """
        result = await db.execute_one(query, github_id)
        return dict(result) if result else None
    
    # =========================================================================
    # Helper Methods
    # =========================================================================
    
    @staticmethod
    async def _update_last_login(user_id: UUID) -> None:
        """Update user's last login timestamp."""
        query = "UPDATE users SET last_login_at = NOW() WHERE id = $1"
        await db.execute(query, user_id)
    
    @staticmethod
    async def _store_refresh_token(user_id: UUID, token: str) -> None:
        """Store a refresh token in the database."""
        token_hash = AuthService.hash_token(token)
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        
        query = """
        INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
        """
        await db.execute(query, user_id, token_hash, expires_at)
    
    @staticmethod
    async def _revoke_refresh_token(token_hash: str) -> None:
        """Revoke a refresh token."""
        query = "UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1"
        await db.execute(query, token_hash)
    
    @staticmethod
    async def _update_github_info(
        user_id: UUID,
        github_username: str,
        github_avatar: str
    ) -> None:
        """Update GitHub info for existing user."""
        query = """
        UPDATE users 
        SET github_username = $2, github_avatar_url = $3, updated_at = NOW()
        WHERE id = $1
        """
        await db.execute(query, user_id, github_username, github_avatar)
    
    @staticmethod
    async def _link_github_account(
        user_id: UUID,
        github_id: str,
        github_username: str,
        github_avatar: str
    ) -> None:
        """Link GitHub account to existing user."""
        query = """
        UPDATE users 
        SET github_id = $2, github_username = $3, github_avatar_url = $4,
            auth_method = 'both', updated_at = NOW()
        WHERE id = $1
        """
        await db.execute(query, user_id, github_id, github_username, github_avatar)
        logger.info(f"Linked GitHub account to user {user_id}")
    
    @staticmethod
    async def _create_github_user(
        email: str,
        github_id: str,
        github_username: str,
        github_avatar: str,
        display_name: str
    ) -> Dict[str, Any]:
        """Create a new user from GitHub OAuth."""
        query = """
        INSERT INTO users (email, github_id, github_username, github_avatar_url,
                          display_name, auth_method, credits)
        VALUES ($1, $2, $3, $4, $5, 'github', $6)
        RETURNING id, email, display_name, role, credits, auth_method,
                  github_id, github_username, github_avatar_url
        """
        result = await db.execute_one(
            query,
            email,
            github_id,
            github_username,
            github_avatar,
            display_name,
            settings.INITIAL_USER_CREDITS
        )
        
        if result:
            user = dict(result)
            # Record initial credits transaction
            await AuthService._record_credit_transaction(
                user_id=user["id"],
                amount=settings.INITIAL_USER_CREDITS,
                balance_after=settings.INITIAL_USER_CREDITS,
                transaction_type="initial",
                reason="Initial signup credits"
            )
            logger.info(f"Created GitHub user: {email}")
            return user
        
        raise AuthenticationError("Failed to create GitHub user", "CREATE_USER_FAILED")
    
    @staticmethod
    async def _record_credit_transaction(
        user_id: UUID,
        amount: int,
        balance_after: int,
        transaction_type: str,
        reason: Optional[str] = None,
        document_id: Optional[UUID] = None,
        granted_by: Optional[UUID] = None
    ) -> None:
        """Record a credit transaction."""
        query = """
        INSERT INTO credit_transactions 
            (user_id, amount, balance_after, transaction_type, reason, document_id, granted_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        """
        await db.execute(
            query,
            user_id,
            amount,
            balance_after,
            transaction_type,
            reason,
            document_id,
            granted_by
        )
