// ============================================================
// Admin: User Management — Shared Types
// ============================================================

export type UserRole = "super_admin" | "family_member" | "viewer";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
  person_id: string | null;
  created_at: string;
  updated_at: string;
  // joined from auth.users
  email?: string;
  last_sign_in_at?: string | null;
}

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  token: string;
  invited_by: string | null;
  message: string | null;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
  // joined
  inviter_name?: string | null;
  inviter_email?: string | null;
}

export interface PendingChange {
  id: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  proposed_data: Record<string, unknown>;
  current_data: Record<string, unknown> | null;
  change_summary: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  submitted_by: string;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
  // joined
  submitter_name?: string | null;
  submitter_email?: string | null;
}
