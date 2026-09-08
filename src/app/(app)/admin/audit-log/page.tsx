import { createClient } from "@/lib/supabase/server";
import { getOrBootstrapUserProfile } from "@/lib/admin/users";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Audit Log | Silsilah Keluarga",
};

export default async function AuditLogPage() {
  const supabase = await createClient();
  const { profile, user } = await getOrBootstrapUserProfile(supabase);

  if (!user) {
    redirect("/login");
  }

  // Hanya Super Admin yang berhak melihat audit log sistem
  if (!profile || profile.role !== "super_admin") {
    return (
      <div className="page-content" style={{ maxWidth: 540, margin: "60px auto" }}>
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
            Halaman Audit Log hanya dapat diakses oleh Super Admin. Anda saat ini masuk dengan peran{" "}
            <strong>{profile?.role === "family_member" ? "Anggota Keluarga" : "Pengamat"}</strong>.
          </p>
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
    );
  }

  const { data: logs, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    redirect("/");
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Audit Log</h1>
        <p className="page-subtitle">Riwayat perubahan data sistem (Khusus Super Admin)</p>
      </div>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
        }}
      >
        {!logs || logs.length === 0 ? (
          <div className="empty-state" style={{ padding: "48px" }}>
            <div className="empty-state-title">Belum ada catatan audit</div>
            <p className="empty-state-description">
              Perubahan data akan tercatat di sini.
            </p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Aksi</th>
                <th>Entitas</th>
                <th>Pengguna</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontSize: "12px", color: "var(--muted)", whiteSpace: "nowrap" }}>
                    {new Date(log.created_at).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: "4px",
                        background:
                          log.action === "create" || log.action === "insert"
                            ? "rgba(34,197,94,0.1)"
                            : log.action === "delete"
                            ? "rgba(239,68,68,0.1)"
                            : "rgba(59,130,246,0.1)",
                        color:
                          log.action === "create" || log.action === "insert"
                            ? "#16a34a"
                            : log.action === "delete"
                            ? "#dc2626"
                            : "#2563eb",
                      }}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td style={{ fontSize: "13px" }}>
                    {log.entity_type} {log.entity_id ? `(${log.entity_id.slice(0, 8)}...)` : ""}
                  </td>
                  <td style={{ fontSize: "12px", color: "var(--muted)" }}>
                    {log.performed_by || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
