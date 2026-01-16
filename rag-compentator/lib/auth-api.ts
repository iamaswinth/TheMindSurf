/**
 * Authentication API Client
 *
 * Handles all authentication-related API calls including:
 * - Email/password registration and login
 * - GitHub OAuth
 * - Token refresh
 * - User profile management
 */

import {
  User,
  AuthResponse,
  RegisterRequest,
  LoginRequest,
  CreditHistoryResponse,
  CreditTransaction,
  AuthProviders,
  UserListResponse,
  AdminUserDetail,
  GrantCreditsRequest,
  AdminStats,
  CreditRequest,
  UserCreditRequestsResponse,
  CreateCreditRequestRequest,
  AdminCreditRequestListResponse,
  ReviewCreditRequestRequest,
} from "./auth-types";
import { apiClient } from "./api-client";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// Token storage keys
const ACCESS_TOKEN_KEY = "rag_access_token";
const REFRESH_TOKEN_KEY = "rag_refresh_token";

class AuthApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // ===========================================================================
  // Token Management
  // ===========================================================================

  getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

    // Sync with apiClient so all API calls include the token
    apiClient.syncTokenFromStorage();
  }

  clearTokens(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);

    // Sync with apiClient to clear token there too
    apiClient.clearToken();
  }

  // ===========================================================================
  // API Request Helper
  // ===========================================================================

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
    requireAuth: boolean = false
  ): Promise<T> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options?.headers,
    };

    if (requireAuth) {
      const token = this.getAccessToken();
      if (token) {
        (headers as Record<string, string>)[
          "Authorization"
        ] = `Bearer ${token}`;
      }
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Unknown error" }));

      // Handle token expiry
      if (response.status === 401 && requireAuth) {
        // Try to refresh token
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          // Retry the request with new token
          const newToken = this.getAccessToken();
          (headers as Record<string, string>)[
            "Authorization"
          ] = `Bearer ${newToken}`;

          const retryResponse = await fetch(`${this.baseURL}${endpoint}`, {
            ...options,
            headers,
          });

          if (retryResponse.ok) {
            return retryResponse.json();
          }
        }
      }

      throw new AuthError(
        error.detail?.message ||
          error.detail ||
          error.message ||
          "Request failed",
        response.status,
        error.detail?.code || error.code
      );
    }

    return response.json();
  }

  private async tryRefreshToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await this.refresh(refreshToken);
      this.setTokens(response.access_token, response.refresh_token);
      return true;
    } catch {
      this.clearTokens();
      return false;
    }
  }

  // ===========================================================================
  // Authentication Endpoints
  // ===========================================================================

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });

    this.setTokens(response.access_token, response.refresh_token);
    return response;
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });

    this.setTokens(response.access_token, response.refresh_token);
    return response;
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    return this.request<AuthResponse>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }

  async logout(): Promise<void> {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      try {
        await this.request("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch {
        // Ignore logout errors
      }
    }
    this.clearTokens();
  }

  getGitHubAuthUrl(): string {
    return `${this.baseURL}/auth/github`;
  }

  async handleGitHubCallback(
    code: string,
    state?: string
  ): Promise<AuthResponse> {
    // Exchange code for tokens via backend
    const params = new URLSearchParams({ code });
    if (state) params.append("state", state);

    const response = await this.request<AuthResponse>(
      `/auth/github/callback?${params.toString()}`,
      { method: "GET" }
    );

    this.setTokens(response.access_token, response.refresh_token);
    return response;
  }

  // Handle GitHub OAuth when tokens are provided directly (from redirect)
  handleGitHubTokens(accessToken: string, refreshToken: string): void {
    this.setTokens(accessToken, refreshToken);
  }

  // ===========================================================================
  // User Profile Endpoints
  // ===========================================================================

  async getCurrentUser(): Promise<User> {
    return this.request<User>("/auth/me", {}, true);
  }

  async getCreditHistory(): Promise<CreditHistoryResponse> {
    return this.request<CreditHistoryResponse>("/auth/me/credits", {}, true);
  }

  async getCreditTransactions(): Promise<CreditTransaction[]> {
    const response = await this.getCreditHistory();
    return response.transactions;
  }

  async getAuthProviders(): Promise<string[]> {
    const response = await this.request<AuthProviders>(
      "/auth/providers",
      {},
      true
    );
    const providers: string[] = [];
    if (response.email) providers.push("email");
    if (response.github) providers.push("github");
    return providers;
  }

  // ===========================================================================
  // Admin Endpoints
  // ===========================================================================

  async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
  }): Promise<UserListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.search) queryParams.append("search", params.search);
    if (params?.role) queryParams.append("role", params.role);

    const endpoint = queryParams.toString()
      ? `/admin/users?${queryParams.toString()}`
      : "/admin/users";

    return this.request<UserListResponse>(endpoint, {}, true);
  }

  async getUserDetail(userId: string): Promise<AdminUserDetail> {
    return this.request<AdminUserDetail>(`/admin/users/${userId}`, {}, true);
  }

  async grantCredits(
    userId: string,
    amount: number,
    reason: string
  ): Promise<{ new_balance: number }> {
    return this.request(
      `/admin/users/credits`,
      {
        method: "POST",
        body: JSON.stringify({ user_id: userId, amount, reason }),
      },
      true
    );
  }

  async updateUserRole(userId: string, role: "user" | "admin"): Promise<void> {
    await this.request(
      `/admin/users/${userId}/role`,
      {
        method: "PATCH",
        body: JSON.stringify({ role }),
      },
      true
    );
  }

  async updateUserStatus(
    userId: string,
    status: "active" | "suspended"
  ): Promise<void> {
    await this.request(
      `/admin/users/${userId}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      },
      true
    );
  }

  async toggleUserStatus(userId: string): Promise<void> {
    await this.request(
      `/admin/users/${userId}/status`,
      {
        method: "PATCH",
      },
      true
    );
  }

  async getAdminStats(): Promise<AdminStats> {
    return this.request<AdminStats>("/admin/stats", {}, true);
  }

  // ===========================================================================
  // Credit Request Endpoints (User)
  // ===========================================================================

  async requestCredits(
    amount: number,
    reason?: string
  ): Promise<CreditRequest> {
    return this.request<CreditRequest>(
      "/auth/credits/request",
      {
        method: "POST",
        body: JSON.stringify({ amount, reason }),
      },
      true
    );
  }

  async getMyCreditRequests(): Promise<UserCreditRequestsResponse> {
    return this.request<UserCreditRequestsResponse>(
      "/auth/credits/requests",
      {},
      true
    );
  }

  // ===========================================================================
  // Credit Request Endpoints (Admin)
  // ===========================================================================

  async getAdminCreditRequests(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<AdminCreditRequestListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.status) queryParams.append("status_filter", params.status);

    const endpoint = queryParams.toString()
      ? `/admin/credit-requests?${queryParams.toString()}`
      : "/admin/credit-requests";

    return this.request<AdminCreditRequestListResponse>(endpoint, {}, true);
  }

  async reviewCreditRequest(
    requestId: string,
    action: "approve" | "reject",
    amount?: number,
    response?: string
  ): Promise<{ message: string }> {
    return this.request(
      `/admin/credit-requests/${requestId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ action, amount, response }),
      },
      true
    );
  }
}

// Custom error class for auth errors
export class AuthError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
    this.name = "AuthError";
  }

  isUnauthorized() {
    return this.status === 401;
  }

  isPaymentRequired() {
    return this.status === 402;
  }

  isForbidden() {
    return this.status === 403;
  }
}

// Export singleton instance
export const authApi = new AuthApiClient();
