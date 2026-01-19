"""
Database Schema Initialization

SQL schema for documents, namespaces, users, and authentication tables.
"""

# =============================================================================
# USER & AUTHENTICATION TABLES
# =============================================================================

CREATE_USERS_TABLE = """
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    
    -- GitHub OAuth
    github_id VARCHAR(255) UNIQUE,
    github_username VARCHAR(255),
    github_avatar_url TEXT,
    
    -- Auth method: 'email', 'github', or 'both'
    auth_method VARCHAR(50) NOT NULL DEFAULT 'email',
    
    -- Role: 'user' or 'admin'
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    
    -- Credits system
    credits INTEGER NOT NULL DEFAULT 3,
    
    -- Profile
    display_name VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    
    -- Account status
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
"""

CREATE_CREDIT_TRANSACTIONS_TABLE = """
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Transaction details
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- 'usage', 'grant', 'initial'
    
    -- Usage tracking
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    
    -- Admin grant tracking
    granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(transaction_type);
"""

CREATE_REFRESH_TOKENS_TABLE = """
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
"""

# =============================================================================
# CREDIT REQUESTS TABLE
# =============================================================================

CREATE_CREDIT_REQUESTS_TABLE = """
CREATE TABLE IF NOT EXISTS credit_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Request details
    amount_requested INTEGER NOT NULL DEFAULT 10,
    reason TEXT,
    
    -- Status: 'pending', 'approved', 'rejected'
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    
    -- Admin response
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    admin_response TEXT,
    amount_granted INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_credit_requests_user ON credit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_requests_status ON credit_requests(status);
"""

# =============================================================================
# MIGRATIONS (DISABLED - ONLY RUN MANUALLY IF NEEDED)
# =============================================================================

# ⚠️ WARNING: This migration drops all data!
# Only uncomment and run manually if you need to reset the database schema.
# DO NOT include this in INIT_SCHEMA as it will delete data on every deployment.

# Drop old tables if they exist and create new ones with user_id
# MIGRATE_OLD_TABLES = """
# -- Drop old table structure (in correct order due to foreign keys)
# DROP TABLE IF EXISTS document_namespaces CASCADE;
# DROP TABLE IF EXISTS chunks CASCADE;
# DROP TABLE IF EXISTS credit_transactions CASCADE;
# DROP TABLE IF EXISTS documents CASCADE;
# DROP TABLE IF EXISTS namespaces CASCADE;
# """

# =============================================================================
# NAMESPACE & DOCUMENT TABLES
# =============================================================================

CREATE_NAMESPACES_TABLE = """
CREATE TABLE IF NOT EXISTS namespaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    document_count INTEGER DEFAULT 0,
    total_chunks INTEGER DEFAULT 0,
    
    -- User ownership (multi-tenant)
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Pinecone Configuration
    default_dense_namespace VARCHAR(255),
    default_sparse_namespace VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique name per user, not globally
    UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_namespaces_name ON namespaces(name);
CREATE INDEX IF NOT EXISTS idx_namespaces_user ON namespaces(user_id);
"""

CREATE_DOCUMENTS_TABLE = """
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    page_count INTEGER,
    mime_type VARCHAR(100) DEFAULT 'application/pdf',
    
    -- User ownership (multi-tenant)
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Credits tracking
    credits_used INTEGER DEFAULT 0,
    
    -- Pinecone References
    pinecone_dense_namespace VARCHAR(255) NOT NULL,
    pinecone_sparse_namespace VARCHAR(255) NOT NULL,
    dense_index_name VARCHAR(255) DEFAULT 'rag-comparator-dense',
    sparse_index_name VARCHAR(255) DEFAULT 'rag-comparator-sparse',
    
    -- Processing Metadata
    processing_strategy VARCHAR(50),
    chunk_count INTEGER NOT NULL DEFAULT 0,
    total_chunks_with_tables INTEGER DEFAULT 0,
    total_chunks_with_images INTEGER DEFAULT 0,
    ai_enhancement_enabled BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_documents_namespace ON documents(pinecone_dense_namespace);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON documents(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
"""

CREATE_DOCUMENT_NAMESPACES_TABLE = """
CREATE TABLE IF NOT EXISTS document_namespaces (
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    namespace_id UUID REFERENCES namespaces(id) ON DELETE CASCADE,
    PRIMARY KEY (document_id, namespace_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
"""

CREATE_CHUNKS_TABLE = """
CREATE TABLE IF NOT EXISTS chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    
    -- Pinecone Vector IDs
    dense_vector_id VARCHAR(255) UNIQUE NOT NULL,
    sparse_vector_id VARCHAR(255),
    
    -- Content Preview (first 200 chars)
    text_preview TEXT,
    
    -- Content Type Flags
    has_table BOOLEAN DEFAULT FALSE,
    has_image BOOLEAN DEFAULT FALSE,
    content_type VARCHAR(50),
    
    -- Position in Document
    chunk_index INTEGER NOT NULL,
    page_numbers INTEGER[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chunks_document ON chunks(document_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_chunks_dense_vector ON chunks(dense_vector_id);
"""

# Function to update namespace counts
CREATE_NAMESPACE_COUNT_TRIGGER = """
CREATE OR REPLACE FUNCTION update_namespace_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE namespaces 
        SET document_count = document_count + 1
        WHERE id = NEW.namespace_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE namespaces 
        SET document_count = document_count - 1
        WHERE id = OLD.namespace_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS namespace_count_trigger ON document_namespaces;
CREATE TRIGGER namespace_count_trigger
AFTER INSERT OR DELETE ON document_namespaces
FOR EACH ROW EXECUTE FUNCTION update_namespace_counts();
"""

# All initialization statements
INIT_SCHEMA = [
    # First: Create user tables (needed for foreign keys)
    CREATE_USERS_TABLE,
    
    # MIGRATION REMOVED: No longer drops tables on startup
    # This ensures data persists across deployments
    
    # Create tables only if they don't exist (CREATE TABLE IF NOT EXISTS)
    CREATE_NAMESPACES_TABLE,
    CREATE_DOCUMENTS_TABLE,
    CREATE_DOCUMENT_NAMESPACES_TABLE,
    CREATE_CHUNKS_TABLE,
    CREATE_CREDIT_TRANSACTIONS_TABLE,
    CREATE_REFRESH_TOKENS_TABLE,
    CREATE_CREDIT_REQUESTS_TABLE,
    CREATE_NAMESPACE_COUNT_TRIGGER,
]
