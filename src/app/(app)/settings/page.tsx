export const metadata = {
  title: "Pengaturan | Silsilah Keluarga",
};

export default function SettingsPage() {
  return (
    <div className="page-content" style={{ maxWidth: 640, margin: "0 auto" }}>
      <div className="page-header">
        <h1 className="page-title">Pengaturan</h1>
        <p className="page-subtitle">Konfigurasi sistem silsilah keluarga</p>
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
        <h2 style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 4px" }}>Versi Sistem</h2>
        <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>Silsilah Keluarga v0.1.0 — MVP</p>
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
          Fitur Lanjutan (Phase 2)
        </h3>
        <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0, lineHeight: 1.6 }}>
          Pengaturan lanjutan seperti GEDCOM import/export, approval workflow, public family tree,
          dan timeline akan tersedia pada fase pengembangan berikutnya.
        </p>
      </div>
    </div>
  );
}
