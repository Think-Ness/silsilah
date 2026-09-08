"use client";

import { createContext, useContext, useMemo, ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import type { Profile, UserRole } from "@/lib/admin/types";

export interface UserRoleContextValue {
  user: User | null;
  profile: Profile | null;
  role: UserRole;
  isSuperAdmin: boolean;
  isFamilyMember: boolean;
  isViewer: boolean;
  canEdit: boolean;      // super_admin || family_member
  canDelete: boolean;    // super_admin
  canAdmin: boolean;     // super_admin
  canUpload: boolean;    // super_admin || family_member
}

const UserRoleContext = createContext<UserRoleContextValue>({
  user: null,
  profile: null,
  role: "viewer",
  isSuperAdmin: false,
  isFamilyMember: false,
  isViewer: true,
  canEdit: false,
  canDelete: false,
  canAdmin: false,
  canUpload: false,
});

interface UserRoleProviderProps {
  user: User | null;
  profile: Profile | null;
  children: ReactNode;
}

export function UserRoleProvider({
  user,
  profile,
  children,
}: UserRoleProviderProps) {
  const value = useMemo<UserRoleContextValue>(() => {
    const role: UserRole = profile?.role || "viewer";
    const isSuperAdmin = role === "super_admin";
    const isFamilyMember = role === "family_member";
    const isViewer = role === "viewer" || (!isSuperAdmin && !isFamilyMember);

    return {
      user,
      profile,
      role,
      isSuperAdmin,
      isFamilyMember,
      isViewer,
      canEdit: isSuperAdmin || isFamilyMember,
      canDelete: isSuperAdmin,
      canAdmin: isSuperAdmin,
      canUpload: isSuperAdmin || isFamilyMember,
    };
  }, [user, profile]);

  return (
    <UserRoleContext.Provider value={value}>
      {children}
    </UserRoleContext.Provider>
  );
}

export function useCurrentUser(): UserRoleContextValue {
  return useContext(UserRoleContext);
}
