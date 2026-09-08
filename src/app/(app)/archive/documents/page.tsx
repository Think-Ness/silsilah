import { getAllMedia } from "@/lib/genealogy/media";

export const metadata = {
  title: "Arsip Dokumen | Silsilah Keluarga",
};

export default async function DocumentsPage() {
  const documents = await getAllMedia({ media_type: "document" });

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Arsip Dokumen</h1>
        <p className="page-subtitle">{documents.length} dokumen dalam arsip</p>
      </div>

      {documents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">Belum ada dokumen</div>
          <p className="empty-state-description">
            Dokumen keluarga seperti akta lahir, surat nikah, atau foto historis dapat diunggah melalui profil anggota.
          </p>
        </div>
      ) : (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
          }}
        >
          <table className="data-table">
            <thead>
              <tr>
                <th>Judul</th>
                <th>Jenis</th>
                <th>Ukuran</th>
                <th>Diunggah</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td style={{ fontSize: "14px", color: "var(--foreground)" }}>
                    {doc.title || "Tanpa judul"}
                  </td>
                  <td style={{ fontSize: "13px", color: "var(--muted)" }}>
                    {doc.mime_type || "Dokumen"}
                  </td>
                  <td style={{ fontSize: "13px", color: "var(--muted)" }}>
                    {doc.file_size_bytes
                      ? `${(doc.file_size_bytes / 1024).toFixed(0)} KB`
                      : "—"}
                  </td>
                  <td style={{ fontSize: "12px", color: "var(--muted)" }}>
                    {new Date(doc.created_at).toLocaleDateString("id-ID")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
