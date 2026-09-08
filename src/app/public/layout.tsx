import type { ReactNode } from "react";
import { GitBranch, ExternalLink } from "lucide-react";

export const metadata = {
  title: "Silsilah Keluarga — Pohon Keluarga Publik",
  description: "Jelajahi silsilah keluarga kami — tersedia untuk umum",
};

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--background)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Minimal public header */}
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--surface)",
        }}
      >
        <a
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
            color: "var(--foreground)",
          }}
        >
          <GitBranch size={18} color="var(--accent-color)" />
          <span style={{ fontSize: 14, fontWeight: 700 }}>Silsilah Keluarga</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              background: "var(--accent-subtle)",
              color: "var(--accent-color)",
              padding: "2px 7px",
              borderRadius: 999,
            }}
          >
            PUBLIK
          </span>
        </a>
        <a
          href="/login"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 12,
            color: "var(--accent-color)",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Masuk ke akun
          <ExternalLink size={12} />
        </a>
      </header>

      {/* Content */}
      <main style={{ flex: 1 }}>{children}</main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          padding: "16px 24px",
          textAlign: "center",
          fontSize: 11,
          color: "var(--muted)",
        }}
      >
        Silsilah Keluarga — Hanya menampilkan data yang ditandai sebagai publik
      </footer>
    </div>
  );
}
