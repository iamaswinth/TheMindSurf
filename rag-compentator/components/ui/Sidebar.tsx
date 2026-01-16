"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  FolderIcon,
  FileTextIcon,
  MessageSquareIcon,
  SettingsIcon,
  UserIcon,
} from "./Icons";
import { useAuth } from "@/lib/auth-context";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  color: string;
}

const navItems: NavItem[] = [
  {
    icon: <HomeIcon size={20} />,
    label: "Dashboard",
    href: "/",
    color: "#FFFF00",
  },
  {
    icon: <FolderIcon size={20} />,
    label: "Namespaces",
    href: "/namespaces",
    color: "#00FFFF",
  },
  {
    icon: <FileTextIcon size={20} />,
    label: "Documents",
    href: "/documents",
    color: "#CCFF00",
  },
  {
    icon: <MessageSquareIcon size={20} />,
    label: "Chat",
    href: "/chat",
    color: "#FF006E",
  },
  {
    icon: <SettingsIcon size={20} />,
    label: "Settings",
    href: "/settings",
    color: "#9D00FF",
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose }) => {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar - NEO-BRUTALIST */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 w-72 
          bg-black border-r-4 border-[#FFFF00]
          flex flex-col transition-transform duration-100 
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Logo - BRUTAL */}
        <div className="h-20 flex items-center px-6 border-b-4 border-[#FFFF00] bg-[#FF006E]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FFFF00] border-3 border-black flex items-center justify-center shadow-[3px_3px_0px_#000]">
              <MessageSquareIcon size={20} className="text-black" />
            </div>
            <span className="text-xl font-black text-white uppercase tracking-tight">
              The Mind Surf
            </span>
          </div>
        </div>

        {/* Navigation - BRUTAL */}
        <nav className="flex-1 py-6 px-4 overflow-y-auto scrollbar-dark">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`
                      flex items-center gap-3 px-4 py-3 
                      font-bold uppercase text-sm tracking-wide
                      border-4 border-black transition-all duration-100
                      ${
                        isActive
                          ? "text-black shadow-[4px_4px_0px_#000] translate-x-0"
                          : "bg-transparent text-white border-transparent hover:border-black hover:bg-[#FFFF00] hover:text-black hover:shadow-[4px_4px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px]"
                      }
                    `}
                    style={{
                      backgroundColor: isActive ? item.color : undefined,
                    }}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section - BRUTAL */}
        <div className="p-4 border-t-4 border-[#FFFF00]">
          {isAuthenticated && user ? (
            <div className="space-y-2">
              {/* Credits display */}
              <div className="flex items-center justify-between px-4 py-2 bg-[#00FFFF] border-4 border-black">
                <span className="text-xs font-black text-black uppercase">
                  Credits
                </span>
                <span className="text-lg font-black text-black">
                  {user.credits}
                </span>
              </div>

              {/* User info */}
              <Link
                href="/profile"
                className="flex items-center gap-3 px-4 py-3 bg-[#FFFF00] border-4 border-black shadow-[4px_4px_0px_#000] cursor-pointer hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000] transition-all duration-100"
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt=""
                    className="w-10 h-10 border-2 border-black"
                  />
                ) : (
                  <div className="w-10 h-10 bg-black flex items-center justify-center">
                    <UserIcon size={18} className="text-[#FFFF00]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-black uppercase truncate">
                    {user.display_name || "USER"}
                  </p>
                  <p className="text-xs font-bold text-black/70 truncate">
                    {user.email}
                  </p>
                </div>
              </Link>

              {/* Admin link */}
              {user.role === "admin" && (
                <Link
                  href="/admin"
                  className="block px-4 py-2 bg-[#9D00FF] border-4 border-black text-center font-black text-white uppercase text-sm hover:shadow-[4px_4px_0px_#000] transition-all"
                >
                  Admin Dashboard
                </Link>
              )}

              {/* Logout button */}
              <button
                onClick={logout}
                className="w-full px-4 py-2 bg-[#FF006E] border-4 border-black text-center font-black text-white uppercase text-sm hover:shadow-[4px_4px_0px_#000] transition-all"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Link
                href="/login"
                className="block px-4 py-3 bg-[#FFFF00] border-4 border-black text-center font-black text-black uppercase text-sm shadow-[4px_4px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000] transition-all duration-100"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="block px-4 py-3 bg-[#00FFFF] border-4 border-black text-center font-black text-black uppercase text-sm hover:shadow-[4px_4px_0px_#000] transition-all"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
