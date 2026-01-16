"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { authApi } from "@/lib/auth-api";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const accessToken = searchParams.get("access_token");
      const refreshToken = searchParams.get("refresh_token");
      const errorParam = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");
      const message = searchParams.get("message");

      // Check for OAuth errors
      if (errorParam) {
        setStatus("error");
        setError(
          message || errorDescription || errorParam || "Authentication failed"
        );
        return;
      }

      // Case 1: Backend sent tokens directly (current flow)
      if (accessToken && refreshToken) {
        try {
          // Store tokens directly
          authApi.handleGitHubTokens(accessToken, refreshToken);

          // Refresh user data in context
          await refreshUser();

          setStatus("success");

          // Redirect to home after brief delay
          setTimeout(() => {
            router.push("/");
          }, 1500);
        } catch (err) {
          setStatus("error");
          setError(
            err instanceof Error ? err.message : "Authentication failed"
          );
        }
        return;
      }

      // Case 2: Need to exchange code for tokens (alternate flow)
      if (code) {
        // Verify state matches stored state (CSRF protection)
        const storedState = sessionStorage.getItem("github_oauth_state");
        if (state && storedState && state !== storedState) {
          setStatus("error");
          setError("Invalid state parameter - possible CSRF attack");
          return;
        }

        // Clear the stored state
        sessionStorage.removeItem("github_oauth_state");

        try {
          // Exchange code for tokens via backend
          await authApi.handleGitHubCallback(code, state ?? undefined);

          // Refresh user data in context
          await refreshUser();

          setStatus("success");

          // Redirect to home after brief delay
          setTimeout(() => {
            router.push("/");
          }, 1500);
        } catch (err) {
          setStatus("error");
          setError(
            err instanceof Error ? err.message : "Authentication failed"
          );
        }
        return;
      }

      // No valid parameters found
      setStatus("error");
      setError("Missing authentication data");
    };

    handleCallback();
  }, [searchParams, router, refreshUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFFEF0] px-4">
      <div className="max-w-md w-full">
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] p-8 text-center">
          {status === "loading" && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 border-4 border-black border-t-transparent animate-spin"></div>
              </div>
              <h2 className="text-2xl font-black text-black uppercase mb-2">
                Authenticating...
              </h2>
              <p className="text-black font-bold">
                Please wait while we sign you in.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-[#00FF00] border-4 border-black flex items-center justify-center">
                  <svg
                    className="h-8 w-8 text-black stroke-[3]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-black text-black uppercase mb-2">
                Success!
              </h2>
              <p className="text-black font-bold">
                Redirecting you to the app...
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-[#FF006E] border-4 border-black flex items-center justify-center">
                  <svg
                    className="h-8 w-8 text-white stroke-[3]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-black text-black uppercase mb-2">
                Authentication Failed
              </h2>
              <p className="bg-[#FF006E] border-4 border-black text-white font-bold uppercase text-sm p-4 mb-4">
                ⚠️ {error}
              </p>
              <button
                onClick={() => router.push("/login")}
                className="px-6 py-3 bg-[#FFFF00] text-black font-black uppercase border-4 border-black shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-100"
              >
                Back to Login →
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GitHubCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FFFEF0]">
          <div className="w-16 h-16 border-4 border-black border-t-transparent animate-spin"></div>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
