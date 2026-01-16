"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function RegisterPage() {
  const router = useRouter();
  const { register, loginWithGitHub, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [localError, setLocalError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    clearError();

    if (!email || !password || !confirmPassword) {
      setLocalError("Please fill in all required fields");
      return;
    }

    if (password.length < 8) {
      setLocalError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setLocalError("Passwords do not match");
      return;
    }

    try {
      await register({
        email,
        password,
        display_name: displayName || undefined,
      });
      router.push("/");
    } catch (err) {
      // Error is handled by auth context
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-[#FFFEF0] flex flex-col">
      {/* Header */}
      <header className="h-16 md:h-20 bg-[#FFFF00] border-b-4 border-black flex items-center justify-between px-4 md:px-6">
        <Link href="/">
          <h1 className="text-xl md:text-2xl font-black text-black uppercase tracking-tight hover:text-[#FF006E] transition-colors">
            TheMindSurf
          </h1>
        </Link>
        <Link href="/login">
          <button className="px-4 md:px-6 py-2 bg-white text-black font-black uppercase border-4 border-black shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] active:shadow-[2px_2px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] transition-all duration-100 text-sm">
            Sign In
          </button>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-6">
        <div className="w-full max-w-md">
          {/* Register Card */}
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000]">
            {/* Card Header */}
            <div className="bg-[#FF006E] border-b-4 border-black px-6 py-4">
              <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight text-center">
                Create Account
              </h2>
            </div>

            {/* Card Body */}
            <div className="p-6 bg-[#FFFEF0]">
              {displayError && (
                <div className="mb-6 p-4 bg-[#FF006E] border-4 border-black text-white font-bold uppercase text-sm">
                  ⚠️ {displayError}
                </div>
              )}

              {/* Free Credits Banner */}
              <div className="mb-6 p-4 bg-[#CCFF00] border-4 border-black font-bold uppercase text-sm text-center text-black">
                🎁 Get 3 Free Credits When You Sign Up!
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="displayName"
                    className="block text-sm font-black text-black uppercase mb-2"
                  >
                    Display Name{" "}
                    <span className="text-black/50">(Optional)</span>
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-3 bg-white border-4 border-black font-bold text-black placeholder-black/40 focus:outline-none focus:ring-0 focus:border-[#FF006E] transition-colors"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-black text-black uppercase mb-2"
                  >
                    Email Address <span className="text-[#FF006E]">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-white border-4 border-black font-bold text-black placeholder-black/40 focus:outline-none focus:ring-0 focus:border-[#FF006E] transition-colors"
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-black text-black uppercase mb-2"
                  >
                    Password <span className="text-[#FF006E]">*</span>
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white border-4 border-black font-bold text-black placeholder-black/40 focus:outline-none focus:ring-0 focus:border-[#FF006E] transition-colors"
                    placeholder="••••••••"
                    minLength={8}
                    required
                  />
                  <p className="mt-1 text-xs font-bold text-black/50 uppercase">
                    Minimum 8 characters
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-black text-black uppercase mb-2"
                  >
                    Confirm Password <span className="text-[#FF006E]">*</span>
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white border-4 border-black font-bold text-black placeholder-black/40 focus:outline-none focus:ring-0 focus:border-[#FF006E] transition-colors"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 px-6 bg-[#00FFFF] text-black font-black uppercase border-4 border-black shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] active:shadow-[2px_2px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[4px_4px_0px_#000] disabled:hover:translate-x-0 disabled:hover:translate-y-0"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-4 border-black border-t-transparent animate-spin"></div>
                      Creating Account...
                    </span>
                  ) : (
                    "Create Account →"
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-4 border-black" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 bg-[#FFFEF0] text-black font-black uppercase text-sm">
                    Or
                  </span>
                </div>
              </div>

              {/* GitHub OAuth */}
              <button
                onClick={loginWithGitHub}
                disabled={isLoading}
                className="w-full py-4 px-6 bg-black text-white font-black uppercase border-4 border-black shadow-[4px_4px_0px_#FF006E] hover:shadow-[6px_6px_0px_#FF006E] hover:translate-x-[-2px] hover:translate-y-[-2px] active:shadow-[2px_2px_0px_#FF006E] active:translate-x-[2px] active:translate-y-[2px] transition-all duration-100 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
                Continue with GitHub
              </button>
            </div>
          </div>

          {/* Login link */}
          <div className="mt-6 text-center">
            <p className="font-bold text-black">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-[#FF006E] hover:underline uppercase font-black"
              >
                Sign in →
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 px-6 bg-black text-white text-center">
        <p className="font-bold uppercase text-xs">© 2026 TheMindSurf</p>
      </footer>
    </div>
  );
}
