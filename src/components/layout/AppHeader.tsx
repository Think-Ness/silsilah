"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Search, UserCircle, LogOut, Crown, Shield, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/admin/types";
import { useCurrentUser } from "@/context/UserRoleContext";

interface AppHeaderProps {
  user: User;
  profile?: Profile | null;
}

export function AppHeader({ user, profile: initialProfile }: AppHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { role, isSuperAdmin, isFamilyMember } = useCurrentUser();

  const roleLabel = isSuperAdmin
    ? "Super Admin"
    : isFamilyMember
    ? "Anggota Keluarga"
    : "Pengamat (Hanya-Baca)";

  const roleColor = isSuperAdmin
    ? "#7c3aed"
    : isFamilyMember
    ? "#0284c7"
    : "#64748b";

  const RoleIcon = isSuperAdmin ? Crown : isFamilyMember ? Shield : Eye;

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <header className="app-header">
        {/* Title (mobile) */}
        <div className="lg:hidden">
          <span className="text-[14px] font-600 text-[var(--foreground)]">
            Silsilah Keluarga
          </span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search */}
        <button
          id="global-search-trigger"
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 px-3 h-8 rounded-md border border-[var(--border)] text-[var(--muted)] text-[13px] hover:border-[var(--accent-color)] hover:text-[var(--foreground)] transition-colors"
          aria-label="Cari anggota keluarga"
        >
          <Search className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Cari anggota...</span>
        </button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger
            id="user-menu-trigger"
            className="flex items-center gap-2 p-1.5 rounded-md hover:bg-[var(--subtle)] transition-colors cursor-pointer"
            aria-label="Menu pengguna"
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: `${roleColor}20`,
                color: roleColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {(user.email?.[0] || "U").toUpperCase()}
            </div>
            <div className="hidden sm:flex flex-col items-start leading-tight">
              <span className="text-[12px] font-600 text-[var(--foreground)] max-w-[120px] truncate">
                {initialProfile?.full_name || user.email?.split("@")[0]}
              </span>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  color: roleColor,
                }}
              >
                {roleLabel}
              </span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-2">
            <div className="px-2 py-1.5">
              <p className="text-[13px] font-600 text-[var(--foreground)] truncate">
                {initialProfile?.full_name || user.email}
              </p>
              <p className="text-[11px] text-[var(--muted)] truncate mb-2">
                {user.email}
              </p>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: `${roleColor}15`,
                  color: roleColor,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                <RoleIcon size={11} />
                <span>{roleLabel}</span>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              id="signout-button"
              onClick={handleSignOut}
              className="text-[var(--destructive)] cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Global search modal */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
