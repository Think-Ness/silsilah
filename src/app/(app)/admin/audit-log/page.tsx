import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Audit Log | Silsilah Keluarga",
};

export default async function AuditLogPage() {
  const supabase = await createClient();

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
        <p className="page-subtitle">Riwayat perubahan data sistem</p>
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
                        padding: "2px 7px",
                        borderRadius: "4px",
                        background: log.action === "CREATE" ? "#DCFCE7" : log.action === "DELETE" ? "#FEE2E2" : "var(--subtle)",
                        color: log.action === "CREATE" ? "#166534" : log.action === "DELETE" ? "#991B1B" : "var(--foreground)",
                      }}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td style={{ fontSize: "13px", color: "var(--muted)" }}>
                    {log.entity_type} · {log.entity_id.slice(0, 8)}...
                  </td>
                  <td style={{ fontSize: "13px", color: "var(--muted)" }}>
                    {log.user_email || log.user_id?.slice(0, 8) || "—"}
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
