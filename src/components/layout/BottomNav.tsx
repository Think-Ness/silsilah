"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { GitBranch, Users, Clock, Image, MoreHorizontal } from "lucide-react";

const navItems = [
  { href: "/tree", label: "Silsilah", icon: GitBranch },
  { href: "/people", label: "Anggota", icon: Users },
  { href: "/timeline", label: "Timeline", icon: Clock },
  { href: "/archive/photos", label: "Arsip", icon: Image },
  { href: "/settings", label: "Lainnya", icon: MoreHorizontal },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="bottom-nav"
      aria-label="Navigasi mobile"
      role="navigation"
    >
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`bottom-nav-item ${isActive ? "active" : ""}`}
            aria-current={isActive ? "page" : undefined}
            aria-label={item.label}
          >
            <item.icon className="w-5 h-5" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
