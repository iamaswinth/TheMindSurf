"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth, withAdmin } from "@/lib/auth-context";
import { authApi } from "@/lib/auth-api";
import type {
  AdminUser,
  AdminStats,
  AdminCreditRequest,
} from "@/lib/auth-types";

function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const pageSize = 10;

  // Active tab
  const [activeTab, setActiveTab] = useState<"users" | "requests">("users");

  // Grant credits modal
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [creditAmount, setCreditAmount] = useState(10);
  const [creditDescription, setCreditDescription] = useState("");
  const [granting, setGranting] = useState(false);

  // Credit requests
  const [creditRequests, setCreditRequests] = useState<AdminCreditRequest[]>(
    []
  );
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    fetchData();
  }, [page]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsData, usersData, requestsData] = await Promise.all([
        authApi.getAdminStats(),
        authApi.getUsers({ page, limit: pageSize }),
        authApi.getAdminCreditRequests({ status: "pending" }),
      ]);
      setStats(statsData);
      setUsers(usersData.users);
      setTotalUsers(usersData.total);
      setCreditRequests(requestsData.requests);
      setPendingCount(requestsData.total);
    } catch (error) {
      console.error("Failed to fetch admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGrantCredits = async () => {
    if (!selectedUser) return;

    try {
      setGranting(true);
      await authApi.grantCredits(
        selectedUser.id,
        creditAmount,
        creditDescription || `Admin grant by ${user?.email}`
      );
      await fetchData();
      setShowGrantModal(false);
      setCreditAmount(10);
      setCreditDescription("");
      setSelectedUser(null);
    } catch (error) {
      console.error("Failed to grant credits:", error);
    } finally {
      setGranting(false);
    }
  };

  const handleToggleStatus = async (targetUser: AdminUser) => {
    try {
      await authApi.toggleUserStatus(targetUser.id);
      await fetchData();
    } catch (error) {
      console.error("Failed to toggle user status:", error);
    }
  };

  const handleToggleRole = async (targetUser: AdminUser) => {
    const newRole = targetUser.role === "admin" ? "user" : "admin";
    try {
      await authApi.updateUserRole(targetUser.id, newRole);
      await fetchData();
    } catch (error) {
      console.error("Failed to update user role:", error);
    }
  };

  const handleApproveRequest = async (
    request: AdminCreditRequest,
    amount?: number
  ) => {
    try {
      await authApi.reviewCreditRequest(
        request.id,
        "approve",
        amount || request.amount_requested,
        "Approved"
      );
      await fetchData();
    } catch (error) {
      console.error("Failed to approve credit request:", error);
    }
  };

  const handleRejectRequest = async (request: AdminCreditRequest) => {
    try {
      await authApi.reviewCreditRequest(
        request.id,
        "reject",
        undefined,
        "Rejected"
      );
      await fetchData();
    } catch (error) {
      console.error("Failed to reject credit request:", error);
    }
  };

  const totalPages = Math.ceil(totalUsers / pageSize);

  return (
    <div className="max-w-7xl mx-auto p-3 md:p-6">
      {/* Page Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-4xl font-black text-black uppercase tracking-tight mb-2">
          👑 ADMIN DASHBOARD
        </h1>
        <p className="text-sm md:text-base font-bold text-black/60">
          Manage users, credits, and system settings
        </p>
      </div>

      <div>
        {loading && !stats ? (
          <div className="flex justify-center py-12">
            <div
              className="animate-spin h-12 w-12 border-8 border-black border-t-transparent"
              style={{ boxShadow: "4px 4px 0px #000000" }}
            />
          </div>
        ) : (
          <>
            {/* Stats cards */}
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
                <div
                  className="bg-[#00FFFF] border-4 border-black p-3 md:p-6"
                  style={{
                    boxShadow: "4px 4px 0px #000000, 6px 6px 0px #000000",
                  }}
                >
                  <p className="text-[10px] md:text-xs font-black text-black uppercase tracking-wider mb-1 md:mb-2">
                    TOTAL USERS
                  </p>
                  <p className="text-2xl md:text-4xl font-black text-black">
                    {stats.users.total}
                  </p>
                </div>
                <div
                  className="bg-[#00FF00] border-4 border-black p-3 md:p-6"
                  style={{
                    boxShadow: "4px 4px 0px #000000, 6px 6px 0px #000000",
                  }}
                >
                  <p className="text-[10px] md:text-xs font-black text-black uppercase tracking-wider mb-1 md:mb-2">
                    ACTIVE USERS
                  </p>
                  <p className="text-2xl md:text-4xl font-black text-black">
                    {stats.users.active}
                  </p>
                </div>
                <div
                  className="bg-[#FFFF00] border-4 border-black p-3 md:p-6"
                  style={{
                    boxShadow: "4px 4px 0px #000000, 6px 6px 0px #000000",
                  }}
                >
                  <p className="text-[10px] md:text-xs font-black text-black uppercase tracking-wider mb-1 md:mb-2">
                    TOTAL CREDITS
                  </p>
                  <p className="text-2xl md:text-4xl font-black text-black">
                    {stats.credits.total_in_system}
                  </p>
                </div>
                <div
                  className="bg-[#9D00FF] border-4 border-black p-3 md:p-6"
                  style={{
                    boxShadow: "4px 4px 0px #000000, 6px 6px 0px #000000",
                  }}
                >
                  <p className="text-[10px] md:text-xs font-black text-white uppercase tracking-wider mb-1 md:mb-2">
                    ADMINS
                  </p>
                  <p className="text-2xl md:text-4xl font-black text-white">
                    {stats.users.admins}
                  </p>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-4 md:mb-6 overflow-x-auto">
              <button
                onClick={() => setActiveTab("users")}
                className={`px-3 md:px-4 py-2 text-xs md:text-sm font-black uppercase border-4 border-black transition-all whitespace-nowrap ${
                  activeTab === "users"
                    ? "bg-[#FF006E] text-white"
                    : "bg-white text-black hover:bg-[#FFFEF0]"
                }`}
                style={{
                  boxShadow:
                    activeTab === "users" ? "4px 4px 0px #000000" : "none",
                }}
              >
                👥 USERS
              </button>
              <button
                onClick={() => setActiveTab("requests")}
                className={`px-3 md:px-4 py-2 text-xs md:text-sm font-black uppercase border-4 border-black transition-all relative whitespace-nowrap ${
                  activeTab === "requests"
                    ? "bg-[#FF006E] text-white"
                    : "bg-white text-black hover:bg-[#FFFEF0]"
                }`}
                style={{
                  boxShadow:
                    activeTab === "requests" ? "4px 4px 0px #000000" : "none",
                }}
              >
                💳 <span className="hidden sm:inline">CREDIT</span> REQUESTS
                {pendingCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 md:w-6 md:h-6 bg-[#FFFF00] border-2 border-black text-black text-[10px] md:text-xs font-black flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </button>
            </div>

            {/* Users table */}
            {activeTab === "users" && (
              <div
                className="bg-white border-4 border-black overflow-hidden"
                style={{
                  boxShadow: "6px 6px 0px #000000, 8px 8px 0px #000000",
                }}
              >
                <div className="p-3 md:p-4 bg-[#FF006E] border-b-4 border-black">
                  <h2 className="text-base md:text-xl font-black text-white uppercase tracking-tight">
                    👥 USERS
                  </h2>
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#FFFEF0]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-black text-black uppercase tracking-wider border-b-4 border-black">
                          USER
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-black text-black uppercase tracking-wider border-b-4 border-black">
                          ROLE
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-black text-black uppercase tracking-wider border-b-4 border-black">
                          CREDITS
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-black text-black uppercase tracking-wider border-b-4 border-black">
                          STATUS
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-black text-black uppercase tracking-wider border-b-4 border-black">
                          JOINED
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-black text-black uppercase tracking-wider border-b-4 border-black">
                          ACTIONS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u, idx) => (
                        <tr
                          key={u.id}
                          className={`border-b-2 border-black hover:bg-[#FFFF00] transition-colors ${
                            idx % 2 === 0 ? "bg-white" : "bg-[#FFFEF0]"
                          }`}
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              {u.avatar_url ? (
                                <img
                                  src={u.avatar_url}
                                  alt=""
                                  className="w-10 h-10 border-2 border-black"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-[#00FFFF] border-2 border-black flex items-center justify-center">
                                  <span className="text-lg font-black text-black">
                                    {u.email[0].toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-black">
                                  {u.display_name || "—"}
                                </p>
                                <p className="text-sm text-black/70">
                                  {u.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`px-3 py-1 text-xs font-black uppercase border-2 border-black inline-block ${
                                u.role === "admin"
                                  ? "bg-[#9D00FF] text-white"
                                  : "bg-[#00FFFF] text-black"
                              }`}
                              style={{ boxShadow: "2px 2px 0px #000000" }}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-lg font-black text-black">
                              {u.credits}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`px-3 py-1 text-xs font-black uppercase border-2 border-black inline-block ${
                                u.is_active
                                  ? "bg-[#00FF00] text-black"
                                  : "bg-[#FF006E] text-white"
                              }`}
                              style={{ boxShadow: "2px 2px 0px #000000" }}
                            >
                              {u.is_active ? "ACTIVE" : "SUSPENDED"}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-black font-bold text-sm">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-end gap-2 flex-wrap">
                              <button
                                onClick={() => {
                                  setSelectedUser(u);
                                  setShowGrantModal(true);
                                }}
                                className="px-3 py-1.5 text-xs font-black uppercase bg-[#FFFF00] hover:bg-[#00FFFF] text-black border-2 border-black transition-colors"
                                style={{ boxShadow: "2px 2px 0px #000000" }}
                              >
                                💰 GRANT
                              </button>
                              <button
                                onClick={() => handleToggleStatus(u)}
                                className={`px-3 py-1.5 text-xs font-black uppercase border-2 border-black transition-colors ${
                                  u.is_active
                                    ? "bg-[#FF006E] hover:bg-[#9D00FF] text-white"
                                    : "bg-[#00FF00] hover:bg-[#00FFFF] text-black"
                                }`}
                                style={{ boxShadow: "2px 2px 0px #000000" }}
                              >
                                {u.is_active ? "🚫 SUSPEND" : "✓ ACTIVATE"}
                              </button>
                              {u.id !== user?.id && (
                                <button
                                  onClick={() => handleToggleRole(u)}
                                  className="px-3 py-1.5 text-xs font-black uppercase bg-[#9D00FF] hover:bg-[#FF006E] text-white border-2 border-black transition-colors"
                                  style={{
                                    boxShadow: "2px 2px 0px #000000",
                                  }}
                                >
                                  {u.role === "admin"
                                    ? "⬇️ DEMOTE"
                                    : "⬆️ PROMOTE"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden">
                  {users.map((u, idx) => (
                    <div
                      key={u.id}
                      className={`p-4 border-b-4 border-black ${
                        idx % 2 === 0 ? "bg-white" : "bg-[#FFFEF0]"
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        {u.avatar_url ? (
                          <img
                            src={u.avatar_url}
                            alt=""
                            className="w-12 h-12 border-2 border-black shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-[#00FFFF] border-2 border-black flex items-center justify-center shrink-0">
                            <span className="text-xl font-black text-black">
                              {u.email[0].toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-black truncate">
                            {u.display_name || "—"}
                          </p>
                          <p className="text-xs text-black/70 truncate">
                            {u.email}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div>
                          <p className="text-[10px] font-black text-black/60 uppercase mb-1">
                            ROLE
                          </p>
                          <span
                            className={`px-2 py-1 text-[10px] font-black uppercase border-2 border-black inline-block ${
                              u.role === "admin"
                                ? "bg-[#9D00FF] text-white"
                                : "bg-[#00FFFF] text-black"
                            }`}
                            style={{ boxShadow: "2px 2px 0px #000000" }}
                          >
                            {u.role}
                          </span>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-black/60 uppercase mb-1">
                            CREDITS
                          </p>
                          <span className="text-lg font-black text-black">
                            {u.credits}
                          </span>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-black/60 uppercase mb-1">
                            STATUS
                          </p>
                          <span
                            className={`px-2 py-1 text-[10px] font-black uppercase border-2 border-black inline-block ${
                              u.is_active
                                ? "bg-[#00FF00] text-black"
                                : "bg-[#FF006E] text-white"
                            }`}
                            style={{ boxShadow: "2px 2px 0px #000000" }}
                          >
                            {u.is_active ? "ACTIVE" : "SUSPENDED"}
                          </span>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-black/60 uppercase mb-1">
                            JOINED
                          </p>
                          <p className="text-xs text-black font-bold">
                            {new Date(u.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setShowGrantModal(true);
                          }}
                          className="w-full px-3 py-2 text-xs font-black uppercase bg-[#FFFF00] hover:bg-[#00FFFF] text-black border-2 border-black transition-colors"
                          style={{ boxShadow: "2px 2px 0px #000000" }}
                        >
                          💰 GRANT CREDITS
                        </button>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`flex-1 px-3 py-2 text-xs font-black uppercase border-2 border-black transition-colors ${
                              u.is_active
                                ? "bg-[#FF006E] hover:bg-[#9D00FF] text-white"
                                : "bg-[#00FF00] hover:bg-[#00FFFF] text-black"
                            }`}
                            style={{ boxShadow: "2px 2px 0px #000000" }}
                          >
                            {u.is_active ? "🚫 SUSPEND" : "✓ ACTIVATE"}
                          </button>
                          {u.id !== user?.id && (
                            <button
                              onClick={() => handleToggleRole(u)}
                              className="flex-1 px-3 py-2 text-xs font-black uppercase bg-[#9D00FF] hover:bg-[#FF006E] text-white border-2 border-black transition-colors"
                              style={{ boxShadow: "2px 2px 0px #000000" }}
                            >
                              {u.role === "admin" ? "⬇️ DEMOTE" : "⬆️ PROMOTE"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="p-3 md:p-4 bg-[#FFFEF0] border-t-4 border-black flex flex-col sm:flex-row items-center justify-between gap-3 md:gap-4">
                    <p className="text-black font-bold text-xs md:text-sm text-center sm:text-left">
                      SHOWING {(page - 1) * pageSize + 1} TO{" "}
                      {Math.min(page * pageSize, totalUsers)} OF {totalUsers}{" "}
                      USERS
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 md:px-4 py-2 bg-black hover:bg-[#FF006E] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-[10px] md:text-xs uppercase border-2 border-black transition-colors"
                        style={{ boxShadow: "3px 3px 0px #000000" }}
                      >
                        <span className="hidden sm:inline">← PREVIOUS</span>
                        <span className="sm:hidden">←</span>
                      </button>
                      <button
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={page === totalPages}
                        className="px-3 md:px-4 py-2 bg-black hover:bg-[#FF006E] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-[10px] md:text-xs uppercase border-2 border-black transition-colors"
                        style={{ boxShadow: "3px 3px 0px #000000" }}
                      >
                        <span className="hidden sm:inline">NEXT →</span>
                        <span className="sm:hidden">→</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Credit Requests Table */}
            {activeTab === "requests" && (
              <div
                className="bg-white border-4 border-black overflow-hidden"
                style={{
                  boxShadow: "6px 6px 0px #000000, 8px 8px 0px #000000",
                }}
              >
                <div className="p-3 md:p-4 bg-[#00FFFF] border-b-4 border-black">
                  <h2 className="text-base md:text-xl font-black text-black uppercase tracking-tight">
                    💳 <span className="hidden sm:inline">PENDING</span> CREDIT
                    REQUESTS
                  </h2>
                </div>

                {creditRequests.length === 0 ? (
                  <div className="p-6 md:p-8 text-center">
                    <p className="text-3xl md:text-4xl mb-3 md:mb-4">✨</p>
                    <p className="text-sm md:text-base font-black text-black uppercase">
                      NO PENDING REQUESTS
                    </p>
                    <p className="text-xs md:text-sm font-bold text-black/60 mt-1 uppercase">
                      All credit requests have been reviewed
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-[#FFFEF0]">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-black text-black uppercase tracking-wider border-b-4 border-black">
                              USER
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-black text-black uppercase tracking-wider border-b-4 border-black">
                              AMOUNT
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-black text-black uppercase tracking-wider border-b-4 border-black">
                              REASON
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-black text-black uppercase tracking-wider border-b-4 border-black">
                              REQUESTED
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-black text-black uppercase tracking-wider border-b-4 border-black">
                              ACTIONS
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {creditRequests.map((req, idx) => (
                            <tr
                              key={req.id}
                              className={`border-b-2 border-black hover:bg-[#FFFF00] transition-colors ${
                                idx % 2 === 0 ? "bg-white" : "bg-[#FFFEF0]"
                              }`}
                            >
                              <td className="px-4 py-4">
                                <div>
                                  <p className="font-bold text-black">
                                    {req.user_display_name || "—"}
                                  </p>
                                  <p className="text-sm text-black/70">
                                    {req.user_email}
                                  </p>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <span
                                  className="px-3 py-1 text-sm font-black bg-[#FFFF00] text-black border-2 border-black inline-block"
                                  style={{
                                    boxShadow: "2px 2px 0px #000000",
                                  }}
                                >
                                  {req.amount_requested} CREDITS
                                </span>
                              </td>
                              <td className="px-4 py-4 text-black text-sm max-w-xs">
                                {req.reason || (
                                  <span className="text-black/50 italic">
                                    No reason provided
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-black font-bold text-sm">
                                {new Date(req.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleApproveRequest(req)}
                                    className="px-3 py-1.5 text-xs font-black uppercase bg-[#00FF00] hover:bg-[#00FFFF] text-black border-2 border-black transition-colors"
                                    style={{
                                      boxShadow: "2px 2px 0px #000000",
                                    }}
                                  >
                                    ✓ APPROVE
                                  </button>
                                  <button
                                    onClick={() => handleRejectRequest(req)}
                                    className="px-3 py-1.5 text-xs font-black uppercase bg-[#FF006E] hover:bg-[#9D00FF] text-white border-2 border-black transition-colors"
                                    style={{
                                      boxShadow: "2px 2px 0px #000000",
                                    }}
                                  >
                                    ✕ REJECT
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden">
                      {creditRequests.map((req, idx) => (
                        <div
                          key={req.id}
                          className={`p-4 border-b-4 border-black ${
                            idx % 2 === 0 ? "bg-white" : "bg-[#FFFEF0]"
                          }`}
                        >
                          <div className="mb-3">
                            <p className="font-bold text-black">
                              {req.user_display_name || "—"}
                            </p>
                            <p className="text-xs text-black/70 truncate">
                              {req.user_email}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div>
                              <p className="text-[10px] font-black text-black/60 uppercase mb-1">
                                AMOUNT
                              </p>
                              <span
                                className="px-2 py-1 text-xs font-black bg-[#FFFF00] text-black border-2 border-black inline-block"
                                style={{ boxShadow: "2px 2px 0px #000000" }}
                              >
                                {req.amount_requested}
                              </span>
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-black/60 uppercase mb-1">
                                REQUESTED
                              </p>
                              <p className="text-xs text-black font-bold">
                                {new Date(req.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          {req.reason && (
                            <div className="mb-3">
                              <p className="text-[10px] font-black text-black/60 uppercase mb-1">
                                REASON
                              </p>
                              <p className="text-xs text-black">{req.reason}</p>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApproveRequest(req)}
                              className="flex-1 px-3 py-2 text-xs font-black uppercase bg-[#00FF00] hover:bg-[#00FFFF] text-black border-2 border-black transition-colors"
                              style={{ boxShadow: "2px 2px 0px #000000" }}
                            >
                              ✓ APPROVE
                            </button>
                            <button
                              onClick={() => handleRejectRequest(req)}
                              className="flex-1 px-3 py-2 text-xs font-black uppercase bg-[#FF006E] hover:bg-[#9D00FF] text-white border-2 border-black transition-colors"
                              style={{ boxShadow: "2px 2px 0px #000000" }}
                            >
                              ✕ REJECT
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Grant Credits Modal */}
      {showGrantModal && selectedUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3 md:p-4">
          <div
            className="bg-white border-4 border-black w-full max-w-md"
            style={{ boxShadow: "6px 6px 0px #000000, 8px 8px 0px #000000" }}
          >
            <div className="p-4 md:p-6 bg-[#FFFF00] border-b-4 border-black">
              <h3 className="text-lg md:text-xl font-black text-black uppercase">
                💰 GRANT CREDITS
              </h3>
              <p className="text-xs md:text-sm font-bold text-black/70 mt-1 truncate">
                TO: {selectedUser?.display_name || selectedUser?.email}
              </p>
            </div>

            <div className="p-4 md:p-6 space-y-4 md:space-y-6">
              <div>
                <label className="block text-xs font-black text-black uppercase mb-2">
                  AMOUNT
                </label>
                <input
                  type="number"
                  value={creditAmount}
                  onChange={(e) =>
                    setCreditAmount(parseInt(e.target.value) || 0)
                  }
                  min="1"
                  className="w-full px-3 md:px-4 py-2 md:py-3 border-4 border-black text-black font-bold text-base md:text-lg focus:outline-none focus:ring-4 focus:ring-[#00FFFF]"
                  style={{
                    boxShadow: "3px 3px 0px #000000, 4px 4px 0px #000000",
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-black text-black uppercase mb-2">
                  DESCRIPTION (OPTIONAL)
                </label>
                <input
                  type="text"
                  value={creditDescription}
                  onChange={(e) => setCreditDescription(e.target.value)}
                  placeholder="Reason for granting credits"
                  className="w-full px-3 md:px-4 py-2 md:py-3 border-4 border-black text-black font-bold text-sm md:text-base placeholder-black/40 focus:outline-none focus:ring-4 focus:ring-[#00FFFF]"
                  style={{
                    boxShadow: "3px 3px 0px #000000, 4px 4px 0px #000000",
                  }}
                />
              </div>
            </div>

            <div className="p-4 md:p-6 border-t-4 border-black flex flex-col sm:flex-row justify-end gap-2 md:gap-3 bg-[#FFFEF0]">
              <button
                onClick={() => {
                  setShowGrantModal(false);
                  setSelectedUser(null);
                }}
                className="w-full sm:w-auto px-4 md:px-6 py-2 md:py-3 text-xs md:text-sm font-black uppercase bg-white hover:bg-[#FF006E] hover:text-white text-black border-2 border-black transition-colors"
                style={{ boxShadow: "3px 3px 0px #000000" }}
              >
                CANCEL
              </button>
              <button
                onClick={handleGrantCredits}
                disabled={granting || creditAmount <= 0}
                className="w-full sm:w-auto px-4 md:px-6 py-2 md:py-3 text-xs md:text-sm font-black uppercase bg-[#00FF00] hover:bg-[#00FFFF] disabled:opacity-50 disabled:cursor-not-allowed text-black border-2 border-black transition-colors"
                style={{ boxShadow: "3px 3px 0px #000000" }}
              >
                {granting ? "GRANTING..." : `GRANT ${creditAmount} CREDITS`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default withAdmin(AdminDashboard);
