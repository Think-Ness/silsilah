import { listProfiles, listInvitations, getOrBootstrapUserProfile, claimSuperAdminRole } from "@/lib/admin/users";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { UserManagementClient } from "./UserManagementClient";
import Link from "next/link";
import { ShieldAlert, Database, ArrowLeft, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Manajemen Pengguna | Silsilah Keluarga",
};

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { profile: myProfile, user, error: bootstrapErr } = await getOrBootstrapUserProfile(supabase);

  if (!user) redirect("/login");

  // Jika tabel database belum siap
  if (bootstrapErr === "TABLE_NOT_FOUND") {
    return (
      <div className="page-content" style={{ maxWidth: 640, margin: "60px auto" }}>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "32px",
            textAlign: "center",
          }}
        >
          <Database className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 style={{ fontSize: "20px", fontWeight: 600, color: "var(--foreground)", marginBottom: "8px" }}>
            Tabel Database Pengguna Belum Siap
          </h2>
          <p style={{ fontSize: "14px", color: "var(--muted)", lineHeight: 1.6, marginBottom: "20px" }}>
            Fitur Manajemen Pengguna memerlukan tabel <code>profiles</code> dan <code>invitations</code>.
            Silakan jalankan file migrasi <code>supabase/migrations/009_profiles_and_invitations.sql</code> melalui Supabase SQL Editor.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
                textDecoration: "none",
                fontSize: "13px",
              }}
            >
              <ArrowLeft className="w-4 h-4" /> Kembali ke Ringkasan
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Jika user bukan super_admin
  if (!myProfile || myProfile.role !== "super_admin") {
    const { count: superAdminCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "super_admin");
    const hasSuperAdmin = (superAdminCount ?? 0) > 0;

    return (
      <div className="page-content" style={{ maxWidth: 600, margin: "60px auto" }}>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "32px",
            textAlign: "center",
          }}
        >
          <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 style={{ fontSize: "20px", fontWeight: 600, color: "var(--foreground)", marginBottom: "8px" }}>
            Akses Terbatas: Super Admin
          </h2>
          <p style={{ fontSize: "14px", color: "var(--muted)", lineHeight: 1.6, marginBottom: "20px" }}>
            Halaman Manajemen Pengguna hanya dapat diakses oleh Super Admin. Anda saat ini masuk sebagai{" "}
            <strong>{user.email}</strong> dengan peran <strong>{myProfile?.role === "family_member" ? "Anggota Keluarga" : "Pengamat"}</strong>.
          </p>

          {!hasSuperAdmin ? (
            <form
              action={async () => {
                "use server";
                await claimSuperAdminRole();
              }}
            >
              <button
                type="submit"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 20px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--primary-color)",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 600,
                  marginBottom: "16px",
                }}
              >
                <ShieldCheck className="w-4 h-4" /> Inisialisasi Akun sebagai Super Admin Pertama
              </button>
            </form>
          ) : (
            <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "20px" }}>
              Silakan hubungi administrator silsilah keluarga jika Anda memerlukan peningkatan peran akun.
            </p>
          )}

          <div>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                color: "var(--foreground)",
                textDecoration: "none",
                padding: "8px 16px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
              }}
            >
              <ArrowLeft className="w-4 h-4" /> Kembali ke Ringkasan
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const [{ profiles }, { invitations }] = await Promise.all([
    listProfiles(),
    listInvitations(),
  ]);

  return (
    <UserManagementClient
      currentUserId={user.id}
      currentUserEmail={user.email ?? ""}
      profiles={profiles}
      invitations={invitations}
    />
  );
}
