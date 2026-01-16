"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { User, RegisterRequest, LoginRequest } from "./auth-types";
import { authApi, AuthError } from "./auth-api";

// ===========================================================================
// Types
// ===========================================================================

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: "AUTH_START" }
  | { type: "AUTH_SUCCESS"; payload: User }
  | { type: "AUTH_ERROR"; payload: string }
  | { type: "AUTH_LOGOUT" }
  | { type: "UPDATE_CREDITS"; payload: number }
  | { type: "CLEAR_ERROR" };

interface AuthContextType extends AuthState {
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGitHub: () => void;
  refreshUser: () => Promise<void>;
  updateCredits: (credits: number) => void;
  clearError: () => void;
}

// ===========================================================================
// Initial State & Reducer
// ===========================================================================

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start with loading to check for existing session
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "AUTH_START":
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case "AUTH_SUCCESS":
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case "AUTH_ERROR":
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case "AUTH_LOGOUT":
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case "UPDATE_CREDITS":
      if (!state.user) return state;
      return {
        ...state,
        user: {
          ...state.user,
          credits: action.payload,
        },
      };
    case "CLEAR_ERROR":
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
}

// ===========================================================================
// Context
// ===========================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ===========================================================================
// Provider
// ===========================================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const router = useRouter();

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = authApi.getAccessToken();
      if (!token) {
        dispatch({ type: "AUTH_LOGOUT" });
        return;
      }

      try {
        const user = await authApi.getCurrentUser();
        dispatch({ type: "AUTH_SUCCESS", payload: user });
      } catch (error) {
        // Token invalid or expired
        authApi.clearTokens();
        dispatch({ type: "AUTH_LOGOUT" });
      }
    };

    checkAuth();
  }, []);

  // Handle OAuth callback - check URL params on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const error = params.get("error");

    if (error) {
      dispatch({ type: "AUTH_ERROR", payload: error });
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    if (accessToken && refreshToken) {
      authApi.handleGitHubTokens(accessToken, refreshToken);
      // Fetch user data
      authApi.getCurrentUser().then((user) => {
        dispatch({ type: "AUTH_SUCCESS", payload: user });
        // Clean up URL
        window.history.replaceState({}, "", window.location.pathname);
      });
    }
  }, []);

  const login = useCallback(async (data: LoginRequest) => {
    dispatch({ type: "AUTH_START" });
    try {
      const response = await authApi.login(data);
      dispatch({ type: "AUTH_SUCCESS", payload: response.user });
    } catch (error) {
      const message =
        error instanceof AuthError ? error.message : "Login failed";
      dispatch({ type: "AUTH_ERROR", payload: message });
      throw error;
    }
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    dispatch({ type: "AUTH_START" });
    try {
      const response = await authApi.register(data);
      dispatch({ type: "AUTH_SUCCESS", payload: response.user });
    } catch (error) {
      const message =
        error instanceof AuthError ? error.message : "Registration failed";
      dispatch({ type: "AUTH_ERROR", payload: message });
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    dispatch({ type: "AUTH_LOGOUT" });
    router.push("/");
  }, [router]);

  const loginWithGitHub = useCallback(() => {
    window.location.href = authApi.getGitHubAuthUrl();
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const user = await authApi.getCurrentUser();
      dispatch({ type: "AUTH_SUCCESS", payload: user });
    } catch (error) {
      // Ignore errors during refresh
    }
  }, []);

  const updateCredits = useCallback((credits: number) => {
    dispatch({ type: "UPDATE_CREDITS", payload: credits });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: "CLEAR_ERROR" });
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    loginWithGitHub,
    refreshUser,
    updateCredits,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ===========================================================================
// Hook
// ===========================================================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// ===========================================================================
// Auth Guard HOC
// ===========================================================================

export function withAuth<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return function AuthGuard(props: P) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      );
    }

    if (!isAuthenticated) {
      // Redirect to login
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return null;
    }

    return <Component {...props} />;
  };
}

// ===========================================================================
// Admin Guard HOC
// ===========================================================================

export function withAdmin<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return function AdminGuard(props: P) {
    const { user, isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      );
    }

    if (!isAuthenticated || user?.role !== "admin") {
      // Redirect to home or show forbidden
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
      return null;
    }

    return <Component {...props} />;
  };
}
