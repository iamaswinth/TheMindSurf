// Authentication Types

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  role: "user" | "admin";
  credits: number;
  is_active: boolean;
  status?: "active" | "inactive";
  auth_method: "email" | "github" | "both";
  github_username: string | null;
  avatar_url: string | null;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  display_name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreditTransaction {
  id: string;
  amount: number;
  balance_after: number;
  transaction_type: "usage" | "grant" | "initial";
  description: string | null;
  reason: string | null;
  document_name: string | null;
  granted_by_email: string | null;
  created_at: string;
}

export interface CreditHistoryResponse {
  transactions: CreditTransaction[];
  current_balance: number;
}

// Admin Types
export interface AdminUser {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  credits: number;
  status: "active" | "suspended";
  auth_method: string;
  github_username: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface AdminUserDetail extends AdminUser {
  github_id: string | null;
  github_avatar_url: string | null;
  email_verified: boolean;
  namespace_count: number;
  document_count: number;
}

export interface UserListResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

export interface GrantCreditsRequest {
  user_id: string;
  amount: number;
  reason: string;
}

export interface AdminStats {
  total_users: number;
  active_users: number;
  total_credits: number;
  admin_count: number;
  users: {
    total: number;
    admins: number;
    active: number;
    new_this_week: number;
  };
  content: {
    namespaces: number;
    documents: number;
  };
  credits: {
    total_in_system: number;
    total_grants: number;
  };
}

export interface AuthProviders {
  email: boolean;
  github: boolean;
}

// Credit Request Types
export interface CreditRequest {
  id: string;
  amount_requested: number;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface UserCreditRequestsResponse {
  requests: CreditRequest[];
  has_pending: boolean;
}

export interface CreateCreditRequestRequest {
  amount: number;
  reason?: string;
}

// Admin Credit Request Types
export interface AdminCreditRequest {
  id: string;
  user_id: string;
  user_email: string;
  user_display_name: string | null;
  amount_requested: number;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  admin_response: string | null;
  amount_granted: number | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface AdminCreditRequestListResponse {
  requests: AdminCreditRequest[];
  total: number;
  page: number;
  limit: number;
}

export interface ReviewCreditRequestRequest {
  action: "approve" | "reject";
  amount?: number;
  response?: string;
}
