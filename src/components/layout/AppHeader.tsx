"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Search, UserCircle, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { createClient } from "@/lib/supabase/client";

interface AppHeaderProps {
  user: User;
}

export function AppHeader({ user }: AppHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

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
            className="flex items-center gap-1.5 p-1.5 rounded-md hover:bg-[var(--subtle)] transition-colors"
            aria-label="Menu pengguna"
          >
            <UserCircle className="w-5 h-5 text-[var(--muted)]" />
            <span className="hidden sm:inline text-[13px] text-[var(--muted)]">
              {user.email?.split("@")[0]}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-3 py-2">
              <p className="text-[13px] font-500 text-[var(--foreground)]">
                {user.email}
              </p>
              <p className="text-[11px] text-[var(--muted)]">Super Admin</p>
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
