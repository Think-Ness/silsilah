"use client";

import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { User, UserPlus, Heart, Plus, Trash2 } from "lucide-react";
import type { PersonNodeData } from "@/lib/genealogy/canvas";
import { getMediaUrl } from "@/lib/genealogy/media";

interface PersonNodeProps extends NodeProps {
  data: PersonNodeData;
}

function getDisplayName(person: PersonNodeData["person"]): string {
  const parts: string[] = [];
  if (person.prefix_title) parts.push(person.prefix_title);
  parts.push(person.display_name || person.full_name);
  if (person.suffix_title) parts.push(person.suffix_title);
  return parts.join(" ");
}

export const PersonNode = memo(function PersonNode({
  data,
  selected,
}: PersonNodeProps) {
  const { person, spouses, roleLabel, lineageRole, parentsNames, hasFather, hasMother } = data;

  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 350);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const showActions = isHovered || !!selected;

  const handleQuickAdd = (
    e: React.MouseEvent,
    actionType: "add_father" | "add_mother" | "add_spouse" | "add_child"
  ) => {
    e.stopPropagation();
    window.dispatchEvent(
      new CustomEvent("silsilah:quick-add", {
        detail: {
          targetPerson: person,
          actionType,
          spouses,
        },
      })
    );
  };

  const isDeceased = person.life_status === "deceased";
  const rawDisplayName = getDisplayName(person);
  // Suffix (Alm) / (Almh) untuk yang telah wafat
  const displayName = isDeceased
    ? `${rawDisplayName} ${person.gender === "female" ? "(Almh)" : "(Alm)"}`
    : rawDisplayName;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(
      new CustomEvent("silsilah:delete-person", {
        detail: {
          personId: person.id,
          personName: displayName,
        },
      })
    );
  };

  // Hanya tampilkan tombol tambah pasangan jika belum menikah (atau pria < 4)
  const canAddSpouse = person.gender === "female" ? spouses.length === 0 : spouses.length < 4;

  const primarySpouse = spouses[0];

  // Badge style berdasarkan lineageRole
  const getBadgeStyle = () => {
    switch (lineageRole) {
      case "root":
        return {
          bg: "#FEF3C7",
          color: "#92400E",
          border: "#FCD34D",
          label: roleLabel || "Kepala Zuriat",
        };
      case "root_spouse":
        return {
          bg: "#FEF9C3",
          color: "#854D0E",
          border: "#FDE047",
          label: roleLabel || "Pasangan Utama",
        };
      case "child":
        return {
          bg: "#D1FAE5",
          color: "#065F46",
          border: "#6EE7B7",
          label: roleLabel || "Anak Kandung",
        };
      case "in_law":
        return {
          bg: "#EDE9FE",
          color: "#5B21B6",
          border: "#C4B5FD",
          label: roleLabel || "Menantu",
        };
      case "grandchild":
        return {
          bg: "#E0F2FE",
          color: "#075985",
          border: "#7DD3FC",
          label: roleLabel || "Cucu",
        };
      case "great_grandchild":
        return {
          bg: "#E0E7FF",
          color: "#3730A3",
          border: "#A5B4FC",
          label: roleLabel || "Cicit",
        };
      case "ancestor":
        return {
          bg: "#F1F5F9",
          color: "#334155",
          border: "#CBD5E1",
          label: roleLabel || "Leluhur / Moyang",
        };
      default:
        return {
          bg: "#F3F4F6",
          color: "#374151",
          border: "#D1D5DB",
          label: roleLabel || "Keluarga",
        };
    }
  };

  const badge = getBadgeStyle();

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`person-node group ${isDeceased ? "deceased" : ""} ${selected ? "selected" : ""}`}
      style={{
        width: 240,
        minHeight: 115,
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        borderRadius: "10px",
        background: isDeceased ? "rgba(249, 250, 251, 0.95)" : "var(--surface)",
        border: selected
          ? "2px solid #2563EB"
          : isDeceased
          ? "1px dashed #9CA3AF"
          : "1px solid var(--border)",
        boxShadow: selected
          ? "0 0 0 3px rgba(37, 99, 235, 0.2), 0 4px 12px rgba(0,0,0,0.08)"
          : "0 2px 6px rgba(0,0,0,0.04)",
        cursor: "pointer",
        position: "relative",
        transition: "all 0.15s ease",
      }}
      role="button"
      aria-label={`${displayName}`}
    >
      {/* Floating Action Buttons: Top (Ayah / Ibu & Hapus) */}
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`action-toolbar absolute bottom-full pb-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 transition-all duration-150 z-30 whitespace-nowrap ${
          showActions ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {!hasFather && (
          <button
            type="button"
            onClick={(e) => handleQuickAdd(e, "add_father")}
            title="Tambah Ayah"
            aria-label="Tambah Ayah"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/95 hover:bg-blue-600 text-white text-[11px] font-medium backdrop-blur shadow-md transition-all hover:scale-105 cursor-pointer border border-slate-700/60"
          >
            <UserPlus className="w-3 h-3 text-blue-300" />
            <span>Ayah</span>
          </button>
        )}
        {!hasMother && (
          <button
            type="button"
            onClick={(e) => handleQuickAdd(e, "add_mother")}
            title="Tambah Ibu"
            aria-label="Tambah Ibu"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/95 hover:bg-rose-600 text-white text-[11px] font-medium backdrop-blur shadow-md transition-all hover:scale-105 cursor-pointer border border-slate-700/60"
          >
            <UserPlus className="w-3 h-3 text-rose-300" />
            <span>Ibu</span>
          </button>
        )}
        <button
          type="button"
          onClick={handleDelete}
          title="Hapus Anggota"
          aria-label="Hapus Anggota"
          className="inline-flex items-center justify-center p-1.5 rounded-full bg-slate-900/95 hover:bg-red-600 text-slate-300 hover:text-white backdrop-blur shadow-md transition-all hover:scale-105 cursor-pointer border border-slate-700/60"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Floating Action Button: Side (+ Pasangan) */}
      {canAddSpouse && (
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`action-toolbar absolute left-full pl-3.5 top-1/2 -translate-y-1/2 flex flex-col gap-1 transition-all duration-150 z-30 whitespace-nowrap ${
            showActions ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        >
          <button
            type="button"
            onClick={(e) => handleQuickAdd(e, "add_spouse")}
            title={person.gender === "male" ? "Tambah Istri" : person.gender === "female" ? "Tambah Suami" : "Tambah Pasangan"}
            aria-label="Tambah Pasangan"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/95 hover:bg-amber-600 text-white text-[11px] font-medium backdrop-blur shadow-md transition-all hover:scale-105 cursor-pointer border border-slate-700/60"
          >
            <Heart className="w-3 h-3 text-amber-300" />
            <span>{person.gender === "male" ? "+ Istri" : person.gender === "female" ? "+ Suami" : "+ Pasangan"}</span>
          </button>
        </div>
      )}

      {/* Floating Action Button: Bottom (+ Anak) */}
      {spouses && spouses.length > 0 && (
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`action-toolbar absolute top-full pt-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 transition-all duration-150 z-30 whitespace-nowrap ${
            showActions ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        >
          <button
            type="button"
            onClick={(e) => handleQuickAdd(e, "add_child")}
            title="Tambah Anak"
            aria-label="Tambah Anak"
            className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-800/95 hover:bg-emerald-600 text-white text-[11px] font-medium backdrop-blur shadow-md transition-all hover:scale-105 cursor-pointer border border-emerald-600/60"
          >
            <Plus className="w-3 h-3 text-emerald-200" />
            <span>Anak</span>
          </button>
        </div>
      )}

      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{ width: 8, height: 8, background: "#4B5563", border: "2px solid #FFFFFF" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ width: 8, height: 8, background: "#4B5563", border: "2px solid #FFFFFF" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ width: 8, height: 8, background: "#D97706", border: "2px solid #FFFFFF" }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        style={{ width: 8, height: 8, background: "#D97706", border: "2px solid #FFFFFF" }}
      />

      {/* Top Bar: Role Status Badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
        <span
          style={{
            fontSize: "10px",
            fontWeight: 700,
            padding: "2px 7px",
            borderRadius: "4px",
            background: badge.bg,
            color: badge.color,
            border: `1px solid ${badge.border}`,
            letterSpacing: "0.02em",
            whiteSpace: "nowrap",
          }}
        >
          {badge.label}
        </span>
        <span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 500 }}>
          {person.gender === "male" ? "Laki-laki" : person.gender === "female" ? "Perempuan" : ""}
        </span>
      </div>

      {/* Main Info: Photo + Name */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <div
          className="flex-shrink-0 rounded-md overflow-hidden"
          style={{
            width: 44,
            height: 44,
            background: "var(--subtle)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {person.portrait ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={getMediaUrl(person.portrait.storage_path)}
              alt={displayName}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <User size={22} style={{ color: "var(--muted)" }} aria-hidden="true" />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: isDeceased ? "#4B5563" : "var(--foreground)",
              lineHeight: 1.25,
              wordBreak: "break-word",
            }}
          >
            {displayName}
            {person.suffix_title && (
              <span style={{ fontWeight: 500, color: "var(--muted)", fontSize: "11px" }}>
                {" "}{person.suffix_title}
              </span>
            )}
          </div>

          {/* Deceased tag if applicable */}
          {isDeceased && (
            <div style={{ fontSize: "10px", color: "#6B7280", marginTop: "2px", fontStyle: "italic" }}>
              Almarhum/Almarhumah
            </div>
          )}
        </div>
      </div>

      {/* Footer Info: Orang Tua / Pasangan */}
      {(primarySpouse || (parentsNames && parentsNames.length > 0)) && (
        <div
          style={{
            borderTop: "1px solid var(--border)",
            paddingTop: "5px",
            marginTop: "2px",
            fontSize: "11px",
            color: "var(--muted)",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          {primarySpouse && (
            <div style={{ display: "flex", alignItems: "center", gap: "5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <Heart className="w-3 h-3 text-rose-500 flex-shrink-0" />
              <span style={{ fontWeight: 600, color: "var(--foreground)" }}>
                {getDisplayName(primarySpouse)}
              </span>
              {spouses.length > 1 && (
                <span style={{ fontSize: "10px" }}>+{spouses.length - 1}</span>
              )}
            </div>
          )}

          {parentsNames && parentsNames.length > 0 && lineageRole !== "ancestor" && lineageRole !== "root" && (
            <div style={{ fontSize: "10px", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              Ortu: <span style={{ fontWeight: 500 }}>{parentsNames.join(" & ")}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
