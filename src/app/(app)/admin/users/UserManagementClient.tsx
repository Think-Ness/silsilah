"use client";

import { useState, useTransition } from "react";
import type { Profile, Invitation, UserRole } from "@/lib/admin/types";
import {
  updateUserRole,
  toggleUserActive,
  createInvitation,
  revokeInvitation,
} from "@/lib/admin/users";
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  ShieldOff,
  CheckCircle,
  XCircle,
  Clock,
  Crown,
  User,
  Eye,
  Copy,
  Trash2,
  ChevronDown,
  MoreVertical,
  Share2,
  ExternalLink,
  Send,
  Check,
} from "lucide-react";

interface UserManagementClientProps {
  currentUserId: string;
  currentUserEmail: string;
  profiles: Profile[];
  invitations: Invitation[];
}

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  family_member: "Anggota Keluarga",
  viewer: "Penonton",
};

const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: "#7c3aed",
  family_member: "#0ea5e9",
  viewer: "#64748b",
};

const ROLE_ICONS: Record<UserRole, React.ElementType> = {
  super_admin: Crown,
  family_member: User,
  viewer: Eye,
};

export function UserManagementClient({
  currentUserId,
  currentUserEmail,
  profiles,
  invitations,
}: UserManagementClientProps) {
  const [activeTab, setActiveTab] = useState<"users" | "invitations">("users");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [createdInviteModal, setCreatedInviteModal] = useState<{
    email: string;
    role: UserRole;
    link: string;
  } | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("family_member");
  const [inviteMessage, setInviteMessage] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const pendingInvitations = invitations.filter(
    (inv) => !inv.accepted_at && new Date(inv.expires_at) > new Date()
  );
  const acceptedInvitations = invitations.filter((inv) => inv.accepted_at);
  const expiredInvitations = invitations.filter(
    (inv) => !inv.accepted_at && new Date(inv.expires_at) <= new Date()
  );

  const activeUsers = profiles.filter((p) => p.is_active);
  const inactiveUsers = profiles.filter((p) => !p.is_active);

  function showFeedback(msg: string, isError = false) {
    if (isError) setError(msg);
    else setSuccess(msg);
    setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 4000);
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setError(null);

    startTransition(async () => {
      const { invitation, error } = await createInvitation(
        inviteEmail,
        inviteRole,
        inviteMessage || undefined
      );
      if (error) {
        showFeedback(error, true);
      } else if (invitation) {
        const inviteLink = `${window.location.origin}/invite/${invitation.token}`;
        setCreatedInviteModal({
          email: invitation.email,
          role: invitation.role,
          link: inviteLink,
        });
        setInviteEmail("");
        setInviteMessage("");
        setShowInviteForm(false);
        setActiveTab("invitations");
      }
    });
  }

  async function handleRoleChange(userId: string, role: UserRole) {
    startTransition(async () => {
      const { error } = await updateUserRole(userId, role);
      if (error) showFeedback(error, true);
      else showFeedback("Peran berhasil diperbarui");
    });
  }

  async function handleToggleActive(userId: string, isActive: boolean) {
    startTransition(async () => {
      const { error } = await toggleUserActive(userId, isActive);
      if (error) showFeedback(error, true);
      else showFeedback(isActive ? "Pengguna diaktifkan" : "Pengguna dinonaktifkan");
    });
  }

  async function handleRevoke(invitationId: string) {
    startTransition(async () => {
      const { error } = await revokeInvitation(invitationId);
      if (error) showFeedback(error, true);
      else showFeedback("Undangan berhasil dihapus");
    });
  }

  function handleCopyLink(token: string) {
    const link = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title">Manajemen Pengguna</h1>
          <p className="page-subtitle">
            Kelola akses, peran, dan undangan ke sistem silsilah keluarga
          </p>
        </div>
        <button
          id="invite-user-btn"
          onClick={() => setShowInviteForm(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            background: "var(--accent-color)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius-md)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <UserPlus size={15} />
          Undang Pengguna
        </button>
      </div>

      {/* Feedback */}
      {(error || success) && (
        <div
          style={{
            margin: "16px 0",
            padding: "12px 16px",
            borderRadius: "var(--radius-md)",
            background: error ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
            border: `1px solid ${error ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
            color: error ? "#ef4444" : "#16a34a",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {error ? <XCircle size={15} /> : <CheckCircle size={15} />}
          {error || success}
        </div>
      )}

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
          margin: "20px 0",
        }}
      >
        {[
          { label: "Total Pengguna", value: profiles.length, icon: Users, color: "#6366f1" },
          { label: "Aktif", value: activeUsers.length, icon: CheckCircle, color: "#22c55e" },
          { label: "Undangan Aktif", value: pendingInvitations.length, icon: Mail, color: "#f59e0b" },
          { label: "Super Admin", value: profiles.filter((p) => p.role === "super_admin").length, icon: Crown, color: "#7c3aed" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: `${stat.color}20`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <stat.icon size={14} color={stat.color} />
              </div>
              <span style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)" }}>
                {stat.value}
              </span>
            </div>
            <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500 }}>
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "1px solid var(--border)",
          marginBottom: 20,
        }}
      >
        {[
          { key: "users", label: "Pengguna", count: profiles.length },
          { key: "invitations", label: "Undangan", count: pendingInvitations.length },
        ].map((tab) => (
          <button
            key={tab.key}
            id={`tab-${tab.key}`}
            onClick={() => setActiveTab(tab.key as "users" | "invitations")}
            style={{
              padding: "8px 16px",
              border: "none",
              borderBottom: `2px solid ${activeTab === tab.key ? "var(--accent-color)" : "transparent"}`,
              background: "transparent",
              color: activeTab === tab.key ? "var(--accent-color)" : "var(--muted)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.15s",
            }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                style={{
                  background: activeTab === tab.key ? "var(--accent-color)" : "var(--muted)",
                  color: "#fff",
                  borderRadius: 999,
                  padding: "0 6px",
                  fontSize: 10,
                  fontWeight: 700,
                  minWidth: 18,
                  height: 18,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {activeTab === "users" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {profiles.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "var(--muted)", fontSize: 13 }}>
              Belum ada pengguna
            </div>
          )}
          {profiles.map((profile) => {
            const RoleIcon = ROLE_ICONS[profile.role];
            const isCurrentUser = profile.id === currentUserId;
            return (
              <div
                key={profile.id}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  opacity: profile.is_active ? 1 : 0.6,
                  transition: "all 0.15s",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: `${ROLE_COLORS[profile.role]}20`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 15,
                    fontWeight: 700,
                    color: ROLE_COLORS[profile.role],
                    flexShrink: 0,
                  }}
                >
                  {(profile.full_name || profile.email || "?")[0].toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>
                      {profile.full_name || "(Tanpa nama)"}
                    </span>
                    {isCurrentUser && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          background: "var(--accent-subtle)",
                          color: "var(--accent-color)",
                          padding: "1px 6px",
                          borderRadius: 999,
                        }}
                      >
                        Saya
                      </span>
                    )}
                    {!profile.is_active && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          background: "rgba(239,68,68,0.1)",
                          color: "#ef4444",
                          padding: "1px 6px",
                          borderRadius: 999,
                        }}
                      >
                        Nonaktif
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                    {profile.email ?? "(Email tidak tersedia)"}
                  </div>
                </div>

                {/* Role badge */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    background: `${ROLE_COLORS[profile.role]}15`,
                    color: ROLE_COLORS[profile.role],
                    padding: "4px 10px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  <RoleIcon size={12} />
                  {ROLE_LABELS[profile.role]}
                </div>

                {/* Actions — only for non-current users */}
                {!isCurrentUser && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    {/* Role selector */}
                    <div style={{ position: "relative" }}>
                      <select
                        id={`role-select-${profile.id}`}
                        value={profile.role}
                        onChange={(e) =>
                          handleRoleChange(profile.id, e.target.value as UserRole)
                        }
                        disabled={isPending}
                        style={{
                          padding: "4px 24px 4px 8px",
                          fontSize: 12,
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-sm)",
                          background: "var(--background)",
                          color: "var(--foreground)",
                          cursor: "pointer",
                          appearance: "none",
                        }}
                      >
                        <option value="super_admin">Super Admin</option>
                        <option value="family_member">Anggota Keluarga</option>
                        <option value="viewer">Penonton</option>
                      </select>
                      <ChevronDown
                        size={12}
                        style={{
                          position: "absolute",
                          right: 6,
                          top: "50%",
                          transform: "translateY(-50%)",
                          pointerEvents: "none",
                          color: "var(--muted)",
                        }}
                      />
                    </div>

                    {/* Toggle active */}
                    <button
                      id={`toggle-active-${profile.id}`}
                      onClick={() => handleToggleActive(profile.id, !profile.is_active)}
                      disabled={isPending}
                      title={profile.is_active ? "Nonaktifkan" : "Aktifkan"}
                      style={{
                        width: 30,
                        height: 30,
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--background)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: profile.is_active ? "#ef4444" : "#22c55e",
                      }}
                    >
                      {profile.is_active ? <ShieldOff size={14} /> : <Shield size={14} />}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Invitations Tab */}
      {activeTab === "invitations" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Banner Penjelasan Konsep Undangan */}
          <div
            style={{
              padding: "14px 16px",
              background: "rgba(59,130,246,0.06)",
              border: "1px solid rgba(59,130,246,0.2)",
              borderRadius: "var(--radius-md)",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <Share2 size={18} color="#3b82f6" style={{ marginTop: 2, flexShrink: 0 }} />
            <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--foreground)" }}>
              <strong>Bagaimana Cara Mengundang Keluarga?</strong>
              <div style={{ color: "var(--muted)", marginTop: 2, fontSize: 12 }}>
                Sistem membuat <strong>Tautan Khusus</strong> untuk setiap undangan. Anda dapat langsung mengklik tombol <span style={{ color: "#25D366", fontWeight: 600 }}>WhatsApp</span> atau <strong>Salin Link</strong> pada daftar undangan di bawah ini dan mengirimkannya ke keluarga Anda. Saat membuka link, mereka cukup membuat kata sandi dan langsung otomatis aktif sebagai Anggota Keluarga tanpa perlu menunggu verifikasi email.
              </div>
            </div>
          </div>

          {/* Pending */}
          {pendingInvitations.length > 0 && (
            <div>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                Menunggu ({pendingInvitations.length})
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {pendingInvitations.map((inv) => (
                  <InvitationCard
                    key={inv.id}
                    invitation={inv}
                    status="pending"
                    copiedToken={copiedToken}
                    onCopy={handleCopyLink}
                    onRevoke={handleRevoke}
                    isPending={isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Accepted */}
          {acceptedInvitations.length > 0 && (
            <div>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                Diterima ({acceptedInvitations.length})
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {acceptedInvitations.map((inv) => (
                  <InvitationCard
                    key={inv.id}
                    invitation={inv}
                    status="accepted"
                    copiedToken={copiedToken}
                    onCopy={handleCopyLink}
                    onRevoke={handleRevoke}
                    isPending={isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Expired */}
          {expiredInvitations.length > 0 && (
            <div>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                Kadaluarsa ({expiredInvitations.length})
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {expiredInvitations.map((inv) => (
                  <InvitationCard
                    key={inv.id}
                    invitation={inv}
                    status="expired"
                    copiedToken={copiedToken}
                    onCopy={handleCopyLink}
                    onRevoke={handleRevoke}
                    isPending={isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {invitations.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "var(--muted)", fontSize: 13 }}>
              Belum ada undangan
            </div>
          )}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={(e) => e.target === e.currentTarget && setShowInviteForm(false)}
        >
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: 24,
              width: "100%",
              maxWidth: 440,
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "var(--accent-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <UserPlus size={18} color="var(--accent-color)" />
              </div>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Undang Pengguna Baru</h2>
                <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>Link undangan aktif 7 hari</p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 6 }}>
                  Email *
                </label>
                <input
                  id="invite-email-input"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@contoh.com"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--background)",
                    fontSize: 13,
                    color: "var(--foreground)",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 6 }}>
                  Peran
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(["super_admin", "family_member", "viewer"] as UserRole[]).map((role) => {
                    const Icon = ROLE_ICONS[role];
                    const descriptions: Record<UserRole, string> = {
                      super_admin: "Akses penuh: edit, hapus, approve, kelola pengguna",
                      family_member: "Dapat submit perubahan untuk disetujui admin",
                      viewer: "Hanya dapat melihat data silsilah",
                    };
                    return (
                      <label
                        key={role}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          padding: "10px 12px",
                          border: `1px solid ${inviteRole === role ? ROLE_COLORS[role] : "var(--border)"}`,
                          borderRadius: "var(--radius-sm)",
                          cursor: "pointer",
                          background: inviteRole === role ? `${ROLE_COLORS[role]}10` : "transparent",
                          transition: "all 0.15s",
                        }}
                      >
                        <input
                          type="radio"
                          name="invite-role"
                          value={role}
                          checked={inviteRole === role}
                          onChange={() => setInviteRole(role)}
                          style={{ marginTop: 2 }}
                        />
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <Icon size={13} color={ROLE_COLORS[role]} />
                            <span style={{ fontSize: 13, fontWeight: 600, color: ROLE_COLORS[role] }}>
                              {ROLE_LABELS[role]}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                            {descriptions[role]}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 6 }}>
                  Pesan (opsional)
                </label>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder="Tambahkan pesan personal untuk orang yang diundang..."
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--background)",
                    fontSize: 13,
                    color: "var(--foreground)",
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {error && (
                <div style={{ fontSize: 12, color: "#ef4444", background: "rgba(239,68,68,0.1)", padding: "8px 12px", borderRadius: "var(--radius-sm)" }}>
                  {error}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
                <button
                  onClick={() => setShowInviteForm(false)}
                  style={{
                    flex: 1,
                    padding: "9px",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    background: "transparent",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    color: "var(--muted)",
                  }}
                >
                  Batal
                </button>
                <button
                  id="confirm-invite-btn"
                  onClick={handleInvite}
                  disabled={!inviteEmail.trim() || isPending}
                  style={{
                    flex: 2,
                    padding: "9px",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    background: inviteEmail.trim() ? "var(--accent-color)" : "var(--subtle)",
                    color: inviteEmail.trim() ? "#fff" : "var(--muted)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: inviteEmail.trim() ? "pointer" : "not-allowed",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <Mail size={14} />
                  {isPending ? "Membuat..." : "Buat Undangan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tautan Undangan Berhasil Dibuat */}
      {createdInviteModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: 24,
              maxWidth: 480,
              width: "100%",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: "50%",
                  background: "rgba(34,197,94,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                  color: "#16a34a",
                }}
              >
                <CheckCircle size={26} />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 4px", color: "var(--foreground)" }}>
                Tautan Undangan Siap Dibagikan!
              </h3>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
                Undangan untuk <strong>{createdInviteModal.email}</strong> ({ROLE_LABELS[createdInviteModal.role]})
              </p>
            </div>

            <div
              style={{
                background: "var(--subtle)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "10px 12px",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <input
                readOnly
                value={createdInviteModal.link}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  fontSize: 12,
                  color: "var(--foreground)",
                  fontFamily: "monospace",
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(createdInviteModal.link);
                  setCopiedToken("modal");
                  setTimeout(() => setCopiedToken(null), 2000);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "6px 12px",
                  background: copiedToken === "modal" ? "#22c55e" : "var(--foreground)",
                  color: "var(--surface)",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                {copiedToken === "modal" ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedToken === "modal" ? "Tersalin!" : "Salin Link"}</span>
              </button>
            </div>

            {/* Tombol Bagikan WhatsApp */}
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                `Halo! Anda diundang bergabung ke Silsilah Keluarga sebagai ${ROLE_LABELS[createdInviteModal.role]}. Silakan klik tautan berikut untuk membuat kata sandi dan mengakses bagan silsilah keluarga:\n\n${createdInviteModal.link}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "11px 16px",
                background: "#25D366",
                color: "#fff",
                borderRadius: "var(--radius-md)",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 14,
                boxShadow: "0 2px 8px rgba(37,211,102,0.25)",
              }}
            >
              <Share2 size={16} />
              <span>Bagikan via WhatsApp</span>
            </a>

            <div
              style={{
                padding: "10px 12px",
                background: "rgba(59,130,246,0.08)",
                border: "1px solid rgba(59,130,246,0.2)",
                borderRadius: "var(--radius-sm)",
                fontSize: 12,
                color: "var(--foreground)",
                lineHeight: 1.5,
                marginBottom: 16,
              }}
            >
              💡 <strong>Cara Kerja:</strong> Karena server pengiriman email otomatis (SMTP) di Supabase belum disetel, Anda dapat langsung mengirimkan tautan ini via WhatsApp atau email pribadi. Penerima cukup membuka link ini untuk membuat kata sandi &amp; langsung masuk!
            </div>

            <button
              type="button"
              onClick={() => setCreatedInviteModal(null)}
              style={{
                width: "100%",
                padding: "9px",
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--muted)",
                borderRadius: "var(--radius-sm)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Invitation Card Component
// ============================================================
interface InvitationCardProps {
  invitation: Invitation;
  status: "pending" | "accepted" | "expired";
  copiedToken: string | null;
  onCopy: (token: string) => void;
  onRevoke: (id: string) => void;
  isPending: boolean;
}

function InvitationCard({
  invitation,
  status,
  copiedToken,
  onCopy,
  onRevoke,
  isPending,
}: InvitationCardProps) {
  const statusColors = {
    pending: { bg: "#f59e0b", text: "Menunggu" },
    accepted: { bg: "#22c55e", text: "Diterima" },
    expired: { bg: "#94a3b8", text: "Kadaluarsa" },
  };

  const roleColors: Record<string, string> = {
    super_admin: "#7c3aed",
    family_member: "#0ea5e9",
    viewer: "#64748b",
  };

  const roleLabels: Record<string, string> = {
    super_admin: "Super Admin",
    family_member: "Anggota",
    viewer: "Penonton",
  };

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        opacity: status === "expired" ? 0.6 : 1,
      }}
    >
      {/* Status icon */}
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: `${statusColors[status].bg}20`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {status === "pending" && <Clock size={15} color={statusColors[status].bg} />}
        {status === "accepted" && <CheckCircle size={15} color={statusColors[status].bg} />}
        {status === "expired" && <XCircle size={15} color={statusColors[status].bg} />}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
          {invitation.email}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: roleColors[invitation.role],
              background: `${roleColors[invitation.role]}15`,
              padding: "1px 7px",
              borderRadius: 999,
            }}
          >
            {roleLabels[invitation.role]}
          </span>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>
            {status === "accepted"
              ? `Diterima ${new Date(invitation.accepted_at!).toLocaleDateString("id-ID")}`
              : status === "expired"
              ? `Kadaluarsa ${new Date(invitation.expires_at).toLocaleDateString("id-ID")}`
              : `Berlaku hingga ${new Date(invitation.expires_at).toLocaleDateString("id-ID")}`}
          </span>
        </div>
      </div>

      {/* Actions */}
      {status === "pending" && (
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {/* WhatsApp share */}
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
              `Halo! Anda diundang bergabung ke Silsilah Keluarga sebagai ${roleLabels[invitation.role]}. Silakan klik tautan berikut untuk membuat akun:\n\n${typeof window !== "undefined" ? window.location.origin : ""}/invite/${invitation.token}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Bagikan via WhatsApp"
            style={{
              width: 30,
              height: 30,
              border: "1px solid rgba(37,211,102,0.3)",
              borderRadius: "var(--radius-sm)",
              background: "rgba(37,211,102,0.1)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#25D366",
              textDecoration: "none",
            }}
          >
            <Share2 size={13} />
          </a>
          <button
            id={`copy-invite-${invitation.id}`}
            onClick={() => onCopy(invitation.token)}
            title="Salin link undangan"
            style={{
              width: 30,
              height: 30,
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              background: copiedToken === invitation.token ? "rgba(34,197,94,0.1)" : "var(--background)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: copiedToken === invitation.token ? "#22c55e" : "var(--muted)",
            }}
          >
            {copiedToken === invitation.token ? <Check size={13} /> : <Copy size={13} />}
          </button>
          <button
            id={`revoke-invite-${invitation.id}`}
            onClick={() => onRevoke(invitation.id)}
            disabled={isPending}
            title="Hapus undangan"
            style={{
              width: 30,
              height: 30,
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              background: "var(--background)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ef4444",
            }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
