"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { PersonWithPortrait } from "@/types/genealogy";

interface PersonChildrenListProps {
  parentId: string;
  initialChildren: PersonWithPortrait[];
  spouseIds?: string[];
}

function getDisplayName(p: { prefix_title?: string | null; display_name?: string | null; full_name: string; suffix_title?: string | null }) {
  return [p.prefix_title, p.display_name || p.full_name, p.suffix_title].filter(Boolean).join(" ");
}

export function PersonChildrenList({
  parentId,
  initialChildren,
  spouseIds = [],
}: PersonChildrenListProps) {
  const [children, setChildren] = useState(initialChildren);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("silsilah_child_order_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        let customOrder: string[] = parsed[parentId] || [];
        if (customOrder.length === 0 && spouseIds.length > 0) {
          for (const spId of spouseIds) {
            if (parsed[spId]?.length > 0) {
              customOrder = parsed[spId];
              break;
            }
          }
        }

        if (customOrder.length > 0) {
          const sorted = [...initialChildren].sort((a, b) => {
            const idxA = customOrder.indexOf(a.id);
            const idxB = customOrder.indexOf(b.id);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return 0;
          });
          setChildren(sorted);
        }
      }
    } catch (e) {}
  }, [parentId, initialChildren, spouseIds]);

  if (children.length === 0) return null;

  return (
    <div>
      <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "6px" }}>
        Anak ({children.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {children.map((c, i) => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "var(--foreground)" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "22px",
                height: "22px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: 700,
                background: "rgba(16, 185, 129, 0.12)",
                color: "#047857",
                border: "1px solid rgba(16, 185, 129, 0.25)",
              }}
            >
              {i + 1}
            </span>
            <Link
              href={`/people/${c.id}`}
              style={{ color: "var(--accent-color)", textDecoration: "none", fontWeight: 500 }}
              className="hover:underline"
            >
              {getDisplayName(c)}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
