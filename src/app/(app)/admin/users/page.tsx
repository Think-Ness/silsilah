import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Manajemen Pengguna | Silsilah Keluarga",
};

export default async function AdminUsersPage() {
  const supabase = await createClient();

  // Hanya super admin yang bisa akses — untuk MVP ambil semua users via admin API
  // Ini butuh service_role key, untuk MVP tampilkan info current user saja
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Manajemen Pengguna</h1>
        <p className="page-subtitle">Kelola akses ke sistem silsilah keluarga</p>
      </div>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          padding: "24px",
          marginBottom: "16px",
        }}
      >
        <h2 style={{ fontSize: "13px", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
          Pengguna Aktif
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "var(--accent-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--accent-color)",
            }}
          >
            {user?.email?.[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 500 }}>{user?.email}</div>
            <div style={{ fontSize: "12px", color: "var(--muted)" }}>Super Admin</div>
          </div>
        </div>
      </div>

      <div
        style={{
          background: "var(--accent-subtle)",
          border: "1px solid #D6CFC8",
          borderRadius: "var(--radius-md)",
          padding: "20px 24px",
        }}
      >
        <h3 style={{ fontSize: "13px", fontWeight: 600, color: "var(--accent-color)", margin: "0 0 8px" }}>
          Multi-User (Phase 2)
        </h3>
        <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0, lineHeight: 1.6 }}>
          Sistem undangan, pembagian peran (Family Member, Super Admin), dan approval workflow
          akan tersedia pada fase pengembangan berikutnya.
          <br /><br />
          Untuk menambah pengguna saat ini: Supabase Dashboard → Authentication → Users → Add User.
        </p>
      </div>
    </div>
  );
}
