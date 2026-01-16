"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/ui/Sidebar";
import { MenuIcon } from "@/components/ui/Icons";
import { ProfileContent } from "@/components/auth/UserProfile";
import { withAuth } from "@/lib/auth-context";

function ProfilePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#FFFEF0]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Neo-Brutalist Header */}
        <header
          className="h-20 bg-[#9D00FF] border-b-4 border-black flex items-center px-6"
          style={{ boxShadow: "0 4px 0px #000000" }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden w-12 h-12 bg-black text-white flex items-center justify-center border-4 border-black hover:bg-[#FF006E] transition-colors mr-4"
          >
            <MenuIcon size={20} />
          </button>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">
            👤 PROFILE & CREDITS
          </h1>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <ProfileContent />
        </main>
      </div>
    </div>
  );
}

export default withAuth(ProfilePage);
