import Link from "next/link";
import { ArrowRight, Download, Clock, Users, Globe } from "lucide-react";

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

      {/* App info */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          padding: "20px 24px",
          marginBottom: 16,
        }}
      >
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>Versi Sistem</h2>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
          Silsilah Keluarga v2.0.0 — Phase 2
        </p>
      </div>

      {/* Feature cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            margin: "8px 0 4px",
          }}
        >
          Fitur Lanjutan
        </h2>

        {[
          {
            href: "/settings/gedcom",
            icon: Download,
            color: "#6366f1",
            title: "GEDCOM Import / Export",
            desc: "Transfer data ke/dari FamilySearch, Ancestry, MyHeritage",
          },
          {
            href: "/timeline",
            icon: Clock,
            color: "#f59e0b",
            title: "Timeline Keluarga",
            desc: "Garis waktu kronologis semua peristiwa penting keluarga",
          },
          {
            href: "/admin/users",
            icon: Users,
            color: "#22c55e",
            title: "Manajemen Pengguna",
            desc: "Undang anggota, kelola peran dan akses",
          },
          {
            href: "/admin/approvals",
            icon: Clock,
            color: "#ec4899",
            title: "Persetujuan Perubahan",
            desc: "Tinjau dan setujui perubahan dari anggota keluarga",
          },
          {
            href: "/public/tree",
            icon: Globe,
            color: "#0ea5e9",
            title: "Pohon Keluarga Publik",
            desc: "Bagikan silsilah keluarga — dapat diakses tanpa login",
            external: true,
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            target={item.external ? "_blank" : undefined}
            rel={item.external ? "noopener" : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "16px 18px",
              textDecoration: "none",
              color: "inherit",
              transition: "border-color 0.15s, background 0.15s",
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: `${item.color}15`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <item.icon size={18} color={item.color} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
                {item.title}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                {item.desc}
              </div>
            </div>
            <ArrowRight size={14} color="var(--muted)" style={{ flexShrink: 0 }} />
          </Link>
        ))}
      </div>
    </div>
  );
}
