"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { authApi } from "@/lib/auth-api";
import type { CreditTransaction } from "@/lib/auth-types";

export function UserProfileDropdown() {
  const { user, isAuthenticated, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
        >
          Sign in
        </Link>
        <Link
          href="/register"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Sign up
        </Link>
      </div>
    );
  }

  const initials = user.display_name
    ? user.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-700/50 transition-colors"
      >
        {/* Avatar */}
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.display_name || user.email}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
            {initials}
          </div>
        )}

        {/* Credits badge */}
        <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-full">
          {user.credits} credits
        </span>

        {/* Dropdown arrow */}
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-20 overflow-hidden">
            {/* User info */}
            <div className="p-4 border-b border-gray-700">
              <p className="text-white font-medium truncate">
                {user.display_name || user.email}
              </p>
              <p className="text-gray-400 text-sm truncate">{user.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded">
                  {user.credits} credits remaining
                </span>
                {user.role === "admin" && (
                  <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs font-medium rounded">
                    Admin
                  </span>
                )}
              </div>
            </div>

            {/* Menu items */}
            <div className="py-1">
              <Link
                href="/profile"
                onClick={() => setIsOpen(false)}
                className="block px-4 py-2 text-gray-300 hover:bg-gray-700/50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  Profile & Credits
                </span>
              </Link>

              {user.role === "admin" && (
                <Link
                  href="/admin"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-gray-300 hover:bg-gray-700/50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    Admin Dashboard
                  </span>
                </Link>
              )}
            </div>

            {/* Logout */}
            <div className="border-t border-gray-700 py-1">
              <button
                onClick={async () => {
                  setIsOpen(false);
                  await logout();
                }}
                className="w-full text-left px-4 py-3 bg-[#FF006E] text-white font-black uppercase border-4 border-black shadow-[3px_3px_0px_#000] hover:shadow-[5px_5px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] active:shadow-[1px_1px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] transition-all duration-100"
              >
                <span className="flex items-center gap-2 justify-center">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Sign Out →
                </span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Credit balance display component
export function CreditBalance() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 rounded-lg border border-gray-700">
      <svg
        className="w-4 h-4 text-yellow-400"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" />
      </svg>
      <span className="text-gray-300 text-sm">
        <span className="font-medium text-white">{user.credits}</span> credits
      </span>
    </div>
  );
}

// Full profile page content
export function ProfileContent() {
  const { user, isAuthenticated } = useAuth();
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated) return;

      try {
        const [txData, providerData] = await Promise.all([
          authApi.getCreditTransactions(),
          authApi.getAuthProviders(),
        ]);
        setTransactions(txData);
        setProviders(providerData);
      } catch (error) {
        console.error("Failed to fetch profile data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated]);

  if (!isAuthenticated || !user) {
    return (
      <div className="text-center py-12">
        <p className="text-black font-bold uppercase text-lg mb-4">
          Please sign in to view your profile.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-3 bg-[#FFFF00] text-black font-black uppercase border-4 border-black shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-100"
        >
          Sign in →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Profile header */}
      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] p-6 mb-6">
        <div className="flex items-start gap-4">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt=""
              className="w-16 h-16 border-4 border-black"
            />
          ) : (
            <div className="w-16 h-16 bg-[#00FFFF] border-4 border-black flex items-center justify-center text-black text-xl font-black">
              {user.email[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-black text-black uppercase">
              {user.display_name || "User"}
            </h1>
            <p className="text-black font-bold">{user.email}</p>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="px-4 py-2 bg-[#FFFF00] border-4 border-black text-black text-sm font-black uppercase shadow-[2px_2px_0px_#000]">
                {user.credits} credits
              </span>
              <span
                className={`px-4 py-2 border-4 border-black text-sm font-black uppercase shadow-[2px_2px_0px_#000] ${
                  user.status === "active"
                    ? "bg-[#00FF00] text-black"
                    : "bg-[#FF006E] text-white"
                }`}
              >
                {user.status}
              </span>
              {user.role === "admin" && (
                <span className="px-4 py-2 bg-[#FF006E] border-4 border-black text-white text-sm font-black uppercase shadow-[2px_2px_0px_#000]">
                  Admin
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Connected providers */}
        <div className="mt-6 pt-6 border-t-4 border-black">
          <h3 className="text-sm font-black text-black uppercase mb-3">
            Connected Accounts
          </h3>
          <div className="flex items-center gap-3">
            {providers.includes("github") ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-[#00FFFF] border-4 border-black shadow-[2px_2px_0px_#000]">
                <svg
                  className="w-5 h-5 text-black"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-black text-sm font-black uppercase">
                  GitHub ✓
                </span>
              </div>
            ) : (
              <button
                onClick={() => {
                  window.location.href = authApi.getGitHubAuthUrl();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white border-4 border-black shadow-[2px_2px_0px_#000] hover:shadow-[4px_4px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-100"
              >
                <svg
                  className="w-5 h-5 text-black"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-black text-sm font-black uppercase">
                  Connect GitHub
                </span>
              </button>
            )}

            {providers.includes("email") && (
              <div className="flex items-center gap-2 px-4 py-2 bg-[#00FFFF] border-4 border-black shadow-[2px_2px_0px_#000]">
                <svg
                  className="w-5 h-5 text-black"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-black text-sm font-black uppercase">
                  Email ✓
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Credit history */}
      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] p-6">
        <h2 className="text-2xl font-black text-black uppercase mb-4 border-b-4 border-black pb-2">
          Credit History
        </h2>

        {loading ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 border-4 border-black border-t-transparent animate-spin mx-auto" />
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-black font-bold uppercase text-center py-8 bg-[#FFFEF0] border-4 border-black">
            No credit transactions yet.
          </p>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 bg-[#FFFEF0] border-4 border-black shadow-[2px_2px_0px_#000]"
              >
                <div>
                  <p className="text-black font-black uppercase text-sm">
                    {tx.description || tx.transaction_type}
                  </p>
                  <p className="text-black font-bold text-xs">
                    {new Date(tx.created_at).toLocaleDateString()} at{" "}
                    {new Date(tx.created_at).toLocaleTimeString()}
                  </p>
                </div>
                <span
                  className={`px-4 py-2 font-black text-lg border-4 border-black shadow-[2px_2px_0px_#000] ${
                    tx.amount > 0
                      ? "bg-[#00FF00] text-black"
                      : "bg-[#FF006E] text-white"
                  }`}
                >
                  {tx.amount > 0 ? "+" : ""}
                  {tx.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
