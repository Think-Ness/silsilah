"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GitBranch,
  Users,
  Network,
  Image,
  FileText,
  UserCog,
  ScrollText,
  Settings,
  LayoutDashboard,
  Clock,
  CheckSquare,
  Globe,
  Crown,
  Shield,
  Eye,
} from "lucide-react";
import { useCurrentUser } from "@/context/UserRoleContext";

const navGroups = [
  {
    label: null,
    items: [
      {
        href: "/",
        label: "Ringkasan",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Silsilah",
    items: [
      {
        href: "/tree",
        label: "Silsilah",
        icon: GitBranch,
      },
      {
        href: "/people",
        label: "Anggota",
        icon: Users,
      },
      {
        href: "/relationships",
        label: "Hubungan",
        icon: Network,
      },
      {
        href: "/timeline",
        label: "Timeline",
        icon: Clock,
      },
    ],
  },
  {
    label: "Arsip",
    items: [
      {
        href: "/archive/photos",
        label: "Foto",
        icon: Image,
      },
      {
        href: "/archive/documents",
        label: "Dokumen",
        icon: FileText,
      },
    ],
  },
  {
    label: "Administrasi",
    adminOnly: true,
    items: [
      {
        href: "/admin/users",
        label: "Pengguna",
        icon: UserCog,
      },
      {
        href: "/admin/approvals",
        label: "Persetujuan",
        icon: CheckSquare,
      },
      {
        href: "/admin/audit-log",
        label: "Audit Log",
        icon: ScrollText,
      },
      {
        href: "/settings",
        label: "Pengaturan",
        icon: Settings,
      },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { isSuperAdmin, isFamilyMember, isViewer } = useCurrentUser();

  // Filter groups: jika adminOnly, hanya tampil untuk super_admin
  const visibleGroups = navGroups.filter(
    (group) => !group.adminOnly || isSuperAdmin
  );

  return (
    <nav className="app-sidebar" aria-label="Navigasi utama">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-[var(--border)]">
        <Link href="/" className="flex items-center gap-2.5 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon.png"
            alt="Logo Silsilah"
            className="w-7 h-7 rounded-md object-cover shadow-sm flex-shrink-0"
          />
          <div>
            <div className="text-[13px] font-600 leading-tight text-[var(--foreground)]">
              Silsilah Keluarga
            </div>
            <div className="text-[11px] text-[var(--muted)]">Arsip Genealogi</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {visibleGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <div className="px-2 mb-1">
                <span className="text-[11px] font-600 uppercase tracking-wider text-[var(--muted)]">
                  {group.label}
                </span>
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item ${isActive ? "active" : ""}`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <item.icon
                      className="nav-icon w-4 h-4 flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer & Role Badge */}
      <div className="px-3.5 py-3 border-t border-[var(--border)] space-y-2">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Peran Anda
          </span>
          <a
            href="/public/tree"
            target="_blank"
            rel="noopener"
            title="Pohon Keluarga Publik"
            style={{ color: "var(--muted)", display: "flex", alignItems: "center", gap: 3, fontSize: 11 }}
          >
            <Globe size={12} />
            <span>Publik</span>
          </a>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 8px",
            borderRadius: "var(--radius-xs)",
            background: isSuperAdmin
              ? "rgba(124, 58, 237, 0.12)"
              : isFamilyMember
              ? "rgba(14, 165, 233, 0.12)"
              : "rgba(100, 116, 139, 0.12)",
            color: isSuperAdmin
              ? "#7c3aed"
              : isFamilyMember
              ? "#0284c7"
              : "#64748b",
            fontSize: "11px",
            fontWeight: 600,
          }}
        >
          {isSuperAdmin ? (
            <Crown size={12} className="flex-shrink-0" />
          ) : isFamilyMember ? (
            <Shield size={12} className="flex-shrink-0" />
          ) : (
            <Eye size={12} className="flex-shrink-0" />
          )}
          <span className="truncate">
            {isSuperAdmin
              ? "Super Admin"
              : isFamilyMember
              ? "Anggota Keluarga"
              : "Pengamat (Read-Only)"}
          </span>
        </div>
      </div>
    </nav>
  );
}
