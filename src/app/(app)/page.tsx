import { Suspense } from "react";
import Link from "next/link";
import { getPeopleStats } from "@/lib/genealogy/people";
import { getRelationshipStats } from "@/lib/genealogy/relationships";
import { getMediaStats } from "@/lib/genealogy/media";
import { GitBranch, Users, Network, Image, Plus, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

async function DashboardStats() {
  const supabase = await createClient();
  const [peopleStats, relStats, mediaStats] = await Promise.all([
    getPeopleStats(supabase),
    getRelationshipStats(supabase),
    getMediaStats(supabase),
  ]);

  const stats = [
    { label: "Anggota", value: peopleStats.total, sub: `${peopleStats.living} masih hidup`, icon: Users },
    { label: "Hubungan", value: relStats.totalUnions + relStats.totalParentChild, sub: `${relStats.totalUnions} pernikahan`, icon: Network },
    { label: "Foto", value: mediaStats.photos, sub: "dalam arsip", icon: Image },
    { label: "Dokumen", value: mediaStats.documents, sub: "dalam arsip", icon: GitBranch },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: "16px",
        marginBottom: "32px",
      }}
    >
      {stats.map((s) => (
        <div key={s.label} className="stat-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <div className="stat-card-value">{s.value}</div>
            <s.icon className="w-4 h-4 text-[var(--muted)]" />
          </div>
          <div className="stat-card-label">{s.label}</div>
          <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>{s.sub}</div>
        </div>
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const quickActions = [
    { href: "/tree", label: "Buka Silsilah", icon: GitBranch, primary: true },
    { href: "/people/new", label: "Tambah Anggota", icon: Plus, primary: false },
    { href: "/relationships/new", label: "Tambah Hubungan", icon: Network, primary: false },
    { href: "/archive/photos", label: "Lihat Arsip Foto", icon: Image, primary: false },
  ];

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Silsilah Keluarga</h1>
        <p className="page-subtitle">
          Selamat datang, {user?.email?.split("@")[0]}. Ini ringkasan arsip genealogi keluarga Anda.
        </p>
      </div>

      {/* Stats */}
      <Suspense
        fallback={
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px", marginBottom: "32px" }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="stat-card skeleton" style={{ height: 100 }} />
            ))}
          </div>
        }
      >
        <DashboardStats />
      </Suspense>

      {/* Quick Actions */}
      <div style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "13px", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
          Aksi Cepat
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              id={`quick-action-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 16px",
                borderRadius: "var(--radius-md)",
                fontSize: "13px",
                fontWeight: 500,
                textDecoration: "none",
                transition: "all 150ms",
                ...(action.primary
                  ? {
                      background: "var(--foreground)",
                      color: "var(--surface)",
                    }
                  : {
                      background: "var(--surface)",
                      color: "var(--foreground)",
                      border: "1px solid var(--border)",
                    }),
              }}
            >
              <action.icon className="w-4 h-4" />
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Info section */}
      <div
        style={{
          background: "var(--accent-subtle)",
          border: "1px solid #D6CFC8",
          borderRadius: "var(--radius-md)",
          padding: "20px 24px",
          maxWidth: "560px",
        }}
      >
        <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--accent-color)", margin: "0 0 8px" }}>
          Tentang Arsip Ini
        </h3>
        <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0, lineHeight: 1.6 }}>
          Sistem ini menyimpan silsilah keluarga menggunakan model relasional yang fleksibel.
          Canvas adalah visualisasi data, bukan sumber kebenaran. Semua hubungan disimpan sebagai
          data terstruktur yang dapat berkembang seiring waktu.
        </p>
        <Link
          href="/tree"
          style={{ display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "12px", fontSize: "13px", color: "var(--accent-color)", fontWeight: 500, textDecoration: "none" }}
        >
          Buka pohon keluarga <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
