"use client";

import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import {
  User,
  UserPlus,
  Heart,
  Plus,
  Trash2,
  ArrowUpDown,
  ListOrdered,
  Layers,
  Download,
  MinusCircle,
  Sparkles,
} from "lucide-react";
import type { PersonNodeData } from "@/lib/genealogy/canvas";
import { getMediaUrl } from "@/lib/genealogy/media";
import { useCurrentUser } from "@/context/UserRoleContext";

type PersonNodeType = Node<PersonNodeData, "personNode">;
type PersonNodeProps = NodeProps<PersonNodeType>;

function getDisplayName(person: PersonNodeData["person"]): string {
  const parts: string[] = [];
  if (person.prefix_title) parts.push(person.prefix_title);
  parts.push(person.display_name || person.full_name);
  if (person.suffix_title) parts.push(person.suffix_title);
  return parts.join(" ");
}

interface GhostCardProps {
  person: PersonNodeData["person"];
  label?: string;
  theme: "blue" | "sky" | "amber" | "emerald";
}

function GhostCard({ person, label, theme }: GhostCardProps) {
  const isDeceased = person.life_status === "deceased";
  const rawName = [person.prefix_title, person.display_name || person.full_name].filter(Boolean).join(" ");
  const name = isDeceased ? `${rawName} ${person.gender === "female" ? "(Almh)" : "(Alm)"}` : rawName;

  const styles = {
    blue: {
      border: "border-blue-400 dark:border-blue-500",
      bg: "bg-blue-50/95 dark:bg-blue-950/90",
      badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border-blue-200 dark:border-blue-800",
      shadow: "shadow-blue-500/25",
      text: "text-blue-600 dark:text-blue-400",
    },
    sky: {
      border: "border-sky-400 dark:border-sky-500",
      bg: "bg-sky-50/95 dark:bg-sky-950/90",
      badge: "bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200 border-sky-200 dark:border-sky-800",
      shadow: "shadow-sky-500/25",
      text: "text-sky-600 dark:text-sky-400",
    },
    amber: {
      border: "border-amber-400 dark:border-amber-500",
      bg: "bg-amber-50/95 dark:bg-amber-950/90",
      badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border-amber-200 dark:border-amber-800",
      shadow: "shadow-amber-500/25",
      text: "text-amber-600 dark:text-amber-400",
    },
    emerald: {
      border: "border-emerald-400 dark:border-emerald-500",
      bg: "bg-emerald-50/95 dark:bg-emerald-950/90",
      badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800",
      shadow: "shadow-emerald-500/25",
      text: "text-emerald-600 dark:text-emerald-400",
    },
  }[theme];

  return (
    <div
      className={`w-[220px] min-h-[90px] p-2.5 rounded-2xl border-2 border-dashed ${styles.border} ${styles.bg} backdrop-blur-md shadow-2xl ${styles.shadow} flex flex-col gap-1.5 pointer-events-none animate-in fade-in zoom-in-95 duration-150 relative z-50`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${styles.badge} flex items-center gap-1`}>
          <Sparkles className="w-2.5 h-2.5" />
          <span>{label || (person.gender === "female" ? "Ibu Kandung" : "Ayah Kandung")}</span>
        </span>
        <span className="text-[10px] font-bold text-slate-400">
          {person.gender === "female" ? "♀" : "♂"}
        </span>
      </div>

      <div className="flex items-center gap-2 mt-0.5">
        <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-200/60 dark:bg-slate-800/60 flex-shrink-0 flex items-center justify-center font-bold text-xs border border-dashed border-slate-300 dark:border-slate-700">
          {person.portrait ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={getMediaUrl(person.portrait.storage_path)}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <User size={16} className={styles.text} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
            {name}
          </p>
          <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">
            Klik tombol untuk memasukkan
          </p>
        </div>
      </div>
    </div>
  );
}

export const PersonNode = memo(function PersonNode({
  data,
  selected,
}: PersonNodeProps) {
  const {
    person,
    spouses,
    roleLabel,
    lineageRole,
    parentsNames,
    hasFather,
    hasMother,
    availableSnapshots,
    isDefaultCanvas,
  } = data;

  const [isHovered, setIsHovered] = useState(false);
  const [hoveredSnapshot, setHoveredSnapshot] = useState<"parents" | "siblings" | "spouses" | "children" | null>(null);
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

  const { user, isViewer, isSuperAdmin } = useCurrentUser();
  const currentUserId = user?.id;
  const nodeCanEdit = Boolean((data as any)?.canEdit);
  const showActions = nodeCanEdit && (isHovered || !!selected);

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

  const handleImportSnapshot = (e: React.MouseEvent, personIds: string[]) => {
    e.stopPropagation();
    window.dispatchEvent(
      new CustomEvent("silsilah:import-to-canvas", {
        detail: {
          personIds,
          sourcePersonName: person.full_name,
        },
      })
    );
  };

  const handleRemoveFromCanvas = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(
      new CustomEvent("silsilah:remove-from-canvas", {
        detail: {
          personId: person.id,
          personName: displayName,
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

  const handleOpenCreateCanvas = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(
      new CustomEvent("silsilah:open-create-canvas", {
        detail: {
          rootPersonId: person.id,
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
          label: roleLabel || "Kepala Zuriat (POV)",
        };
      case "root_spouse":
        return {
          bg: "#FEF9C3",
          color: "#854D0E",
          border: "#FDE047",
          label: roleLabel || "Pasangan Utama",
        };
      case "parent":
        return {
          bg: "#EFF6FF",
          color: "#1E40AF",
          border: "#BFDBFE",
          label: roleLabel || "Orang Tua",
        };
      case "grandparent":
        return {
          bg: "#EEF2FF",
          color: "#3730A3",
          border: "#C7D2FE",
          label: roleLabel || "Kakek / Nenek",
        };
      case "great_grandparent":
        return {
          bg: "#F5F3FF",
          color: "#5B21B6",
          border: "#DDD6FE",
          label: roleLabel || "Buyut",
        };
      case "ancestor":
        return {
          bg: "#F8FAFC",
          color: "#334155",
          border: "#CBD5E1",
          label: roleLabel || "Moyang / Leluhur",
        };
      case "sibling":
        return {
          bg: "#F0F9FF",
          color: "#0369A1",
          border: "#BAE6FD",
          label: data.childOrderLabel ? `${roleLabel} (${data.childOrderLabel})` : roleLabel || "Saudara Kandung",
        };
      case "child":
        return {
          bg: "#D1FAE5",
          color: "#065F46",
          border: "#6EE7B7",
          label: data.childOrderLabel || roleLabel || "Anak Kandung",
        };
      case "nephew_niece":
        return {
          bg: "#CCFBF1",
          color: "#115E59",
          border: "#99F6E4",
          label: roleLabel || "Keponakan",
        };
      case "in_law":
        return {
          bg: "#FCE7F3",
          color: "#9D174D",
          border: "#FBCFE8",
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
          bg: "#EDE9FE",
          color: "#5B21B6",
          border: "#C4B5FD",
          label: roleLabel || "Cicit",
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
      {/* Ghost Preview Containers */}
      {hoveredSnapshot === "parents" && availableSnapshots?.parents && availableSnapshots.parents.length > 0 && (
        <div className="absolute bottom-[calc(100%+48px)] left-1/2 -translate-x-1/2 flex items-center gap-2.5 pointer-events-none z-[70] animate-in fade-in zoom-in-95 duration-150">
          {availableSnapshots.parents.map((p) => (
            <GhostCard
              key={p.id}
              person={p}
              label={p.gender === "female" ? "Ibu Kandung" : "Ayah Kandung"}
              theme="blue"
            />
          ))}
        </div>
      )}

      {hoveredSnapshot === "siblings" && availableSnapshots?.siblings && availableSnapshots.siblings.length > 0 && (
        <div className="absolute bottom-[calc(100%+48px)] left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none z-[70] animate-in fade-in zoom-in-95 duration-150">
          {availableSnapshots.siblings.slice(0, 2).map((p) => (
            <GhostCard
              key={p.id}
              person={p}
              label="Saudara Kandung"
              theme="sky"
            />
          ))}
          {availableSnapshots.siblings.length > 2 && (
            <div className="px-3 py-2 rounded-2xl bg-sky-950/90 text-sky-200 text-xs font-bold shadow-2xl border-2 border-dashed border-sky-400 backdrop-blur-md flex items-center justify-center min-h-[90px]">
              +{availableSnapshots.siblings.length - 2} Saudara
            </div>
          )}
        </div>
      )}

      {hoveredSnapshot === "spouses" && availableSnapshots?.spouses && availableSnapshots.spouses.length > 0 && (
        <div className="absolute left-[calc(100%+165px)] top-1/2 -translate-y-1/2 flex flex-col gap-2 pointer-events-none z-[70] animate-in fade-in zoom-in-95 duration-150">
          {availableSnapshots.spouses.map((p) => (
            <GhostCard
              key={p.id}
              person={p}
              label={p.gender === "female" ? "Istri" : "Suami"}
              theme="amber"
            />
          ))}
        </div>
      )}

      {hoveredSnapshot === "children" && availableSnapshots?.children && availableSnapshots.children.length > 0 && (
        <div className="absolute top-[calc(100%+48px)] left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none z-[70] animate-in fade-in zoom-in-95 duration-150">
          {availableSnapshots.children.slice(0, 2).map((p) => (
            <GhostCard
              key={p.id}
              person={p}
              label="Anak Kandung"
              theme="emerald"
            />
          ))}
          {availableSnapshots.children.length > 2 && (
            <div className="px-3 py-2 rounded-2xl bg-emerald-950/90 text-emerald-200 text-xs font-bold shadow-2xl border-2 border-dashed border-emerald-400 backdrop-blur-md flex items-center justify-center min-h-[90px]">
              +{availableSnapshots.children.length - 2} Anak
            </div>
          )}
        </div>
      )}

      {/* Floating Action Buttons: Top (Ayah / Ibu / Snapshot Orang Tua & Saudara) */}
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`action-toolbar absolute bottom-full pb-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 transition-all duration-150 z-30 whitespace-nowrap ${
          showActions ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Snapshot Orang Tua (Jika sudah ada di DB tapi belum ada di kanvas) */}
        {availableSnapshots?.parents && availableSnapshots.parents.length > 0 ? (
          <button
            type="button"
            onMouseEnter={() => setHoveredSnapshot("parents")}
            onMouseLeave={() => setHoveredSnapshot(null)}
            onClick={(e) => {
              setHoveredSnapshot(null);
              handleImportSnapshot(
                e,
                availableSnapshots.parents.map((p) => p.id)
              );
            }}
            title={`Masukkan data Orang Tua (${availableSnapshots.parents.map((p) => p.display_name || p.full_name).join(" & ")}) ke kanvas ini`}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-lg shadow-blue-600/30 transition-all hover:scale-105 cursor-pointer border border-blue-400"
          >
            <Download className="w-3 h-3 text-blue-100" />
            <span>+ Masukkan Orang Tua ({availableSnapshots.parents.length})</span>
          </button>
        ) : (
          <>
            {!hasFather && (
              <button
                type="button"
                onClick={(e) => handleQuickAdd(e, "add_father")}
                title="Tambah Ayah Baru"
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
                title="Tambah Ibu Baru"
                aria-label="Tambah Ibu"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/95 hover:bg-rose-600 text-white text-[11px] font-medium backdrop-blur shadow-md transition-all hover:scale-105 cursor-pointer border border-slate-700/60"
              >
                <UserPlus className="w-3 h-3 text-rose-300" />
                <span>Ibu</span>
              </button>
            )}
          </>
        )}

        {/* Snapshot Saudara Kandung (Jika ada di DB tapi belum ada di kanvas) */}
        {availableSnapshots?.siblings && availableSnapshots.siblings.length > 0 && (
          <button
            type="button"
            onMouseEnter={() => setHoveredSnapshot("siblings")}
            onMouseLeave={() => setHoveredSnapshot(null)}
            onClick={(e) => {
              setHoveredSnapshot(null);
              handleImportSnapshot(
                e,
                availableSnapshots.siblings.map((p) => p.id)
              );
            }}
            title={`Masukkan ${availableSnapshots.siblings.length} Saudara Kandung dari database ke kanvas ini`}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold shadow-lg shadow-sky-600/30 transition-all hover:scale-105 cursor-pointer border border-sky-400"
          >
            <Download className="w-3 h-3 text-sky-100" />
            <span>+ Masukkan Saudara ({availableSnapshots.siblings.length})</span>
          </button>
        )}

        {/* Tombol Keluarkan dari Kanvas */}
        <button
          type="button"
          onClick={handleRemoveFromCanvas}
          title="Keluarkan anggota ini dari kanvas (data di database tidak terhapus)"
          aria-label="Keluarkan dari Kanvas"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-[11px] font-medium shadow-md transition-all hover:scale-105 cursor-pointer border border-slate-600"
        >
          <MinusCircle className="w-3 h-3 text-slate-400" />
          <span>Lepas</span>
        </button>

        {isSuperAdmin && (
          <button
            type="button"
            onClick={handleDelete}
            title="Hapus Anggota Permanen (Khusus Super Admin)"
            aria-label="Hapus Anggota"
            className="inline-flex items-center justify-center p-1.5 rounded-full bg-slate-900/95 hover:bg-red-600 text-slate-300 hover:text-white backdrop-blur shadow-md transition-all hover:scale-105 cursor-pointer border border-slate-700/60"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Floating Action Button: Side (+ Pasangan / Snapshot Pasangan) */}
      {(canAddSpouse || (availableSnapshots?.spouses && availableSnapshots.spouses.length > 0)) && (
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`action-toolbar absolute left-full pl-3.5 top-1/2 -translate-y-1/2 flex flex-col gap-1 transition-all duration-150 z-30 whitespace-nowrap ${
            showActions ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        >
          {availableSnapshots?.spouses && availableSnapshots.spouses.length > 0 ? (
            <button
              type="button"
              onMouseEnter={() => setHoveredSnapshot("spouses")}
              onMouseLeave={() => setHoveredSnapshot(null)}
              onClick={(e) => {
                setHoveredSnapshot(null);
                handleImportSnapshot(
                  e,
                  availableSnapshots.spouses.map((p) => p.id)
                );
              }}
              title={`Masukkan Pasangan (${availableSnapshots.spouses.map((p) => p.display_name || p.full_name).join(", ")}) ke kanvas`}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold shadow-lg shadow-amber-600/30 transition-all hover:scale-105 cursor-pointer border border-amber-400"
            >
              <Download className="w-3 h-3 text-amber-100" />
              <span>+ Masukkan Pasangan ({availableSnapshots.spouses.length})</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => handleQuickAdd(e, "add_spouse")}
              title={person.gender === "male" ? "Tambah Istri Baru" : person.gender === "female" ? "Tambah Suami Baru" : "Tambah Pasangan Baru"}
              aria-label="Tambah Pasangan"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/95 hover:bg-amber-600 text-white text-[11px] font-medium backdrop-blur shadow-md transition-all hover:scale-105 cursor-pointer border border-slate-700/60"
            >
              <Heart className="w-3 h-3 text-amber-300" />
              <span>{person.gender === "male" ? "+ Istri" : person.gender === "female" ? "+ Suami" : "+ Pasangan"}</span>
            </button>
          )}
        </div>
      )}

      {/* Floating Action Button: Bottom (+ Anak / Snapshot Anak & Atur Urutan) */}
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`action-toolbar absolute top-full pt-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 transition-all duration-150 z-30 whitespace-nowrap ${
          showActions ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Snapshot Anak (Jika ada di DB tapi belum ada di kanvas) */}
        {availableSnapshots?.children && availableSnapshots.children.length > 0 ? (
          <button
            type="button"
            onMouseEnter={() => setHoveredSnapshot("children")}
            onMouseLeave={() => setHoveredSnapshot(null)}
            onClick={(e) => {
              setHoveredSnapshot(null);
              handleImportSnapshot(
                e,
                availableSnapshots.children.map((p) => p.id)
              );
            }}
            title={`Masukkan ${availableSnapshots.children.length} Anak dari database ke kanvas ini`}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-lg shadow-emerald-600/30 transition-all hover:scale-105 cursor-pointer border border-emerald-400"
          >
            <Download className="w-3 h-3 text-emerald-100" />
            <span>+ Masukkan Anak ({availableSnapshots.children.length})</span>
          </button>
        ) : spouses && spouses.length > 0 ? (
          <button
            type="button"
            onClick={(e) => handleQuickAdd(e, "add_child")}
            title="Tambah Anak Baru"
            aria-label="Tambah Anak"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-800/95 hover:bg-emerald-600 text-white text-[11px] font-medium backdrop-blur shadow-md transition-all hover:scale-105 cursor-pointer border border-emerald-600/60"
          >
            <Plus className="w-3 h-3 text-emerald-200" />
            <span>Anak</span>
          </button>
        ) : null}

        {data.childrenCount != null && data.childrenCount > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(
                new CustomEvent("silsilah:reorder-children", {
                  detail: {
                    parentId: person.id,
                    parentName: displayName,
                  },
                })
              );
            }}
            title="Atur Urutan Kelahiran Anak (Drag & Drop)"
            aria-label="Atur Urutan Anak"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/95 hover:bg-emerald-700 text-white text-[11px] font-medium backdrop-blur shadow-md transition-all hover:scale-105 cursor-pointer border border-slate-700/60"
          >
            <ArrowUpDown className="w-3 h-3 text-emerald-300" />
            <span>Urutan</span>
          </button>
        )}

        {(isSuperAdmin || (Boolean(currentUserId) && person.created_by === currentUserId)) && (
          <button
            type="button"
            onClick={handleOpenCreateCanvas}
            title={`Buat Kanvas Silsilah Cabang Keluarga ${displayName}`}
            aria-label="Buat Kanvas Silsilah"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-900/95 hover:bg-cyan-700 text-white text-[11px] font-medium backdrop-blur shadow-md transition-all hover:scale-105 cursor-pointer border border-cyan-600/60"
          >
            <Layers className="w-3 h-3 text-cyan-300" />
            <span>+ Kanvas</span>
          </button>
        )}
      </div>

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

      {/* Top Bar: Role Status Badge & Minimal Gender Icon */}
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
            maxWidth: "185px",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {badge.label}
        </span>

        {/* Minimal Gender Icon */}
        {person.gender === "male" && (
          <span
            title="Laki-laki"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 18,
              height: 18,
              borderRadius: "4px",
              background: "rgba(59, 130, 246, 0.12)",
              color: "#2563EB",
              border: "1px solid rgba(59, 130, 246, 0.25)",
              flexShrink: 0,
            }}
          >
            <svg style={{ width: 10, height: 10 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="10" cy="14" r="5" />
              <path d="M19 5l-5.4 5.4" />
              <path d="M19 5h-5" />
              <path d="M19 5v5" />
            </svg>
          </span>
        )}
        {person.gender === "female" && (
          <span
            title="Perempuan"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 18,
              height: 18,
              borderRadius: "4px",
              background: "rgba(244, 63, 94, 0.12)",
              color: "#E11D48",
              border: "1px solid rgba(244, 63, 94, 0.25)",
              flexShrink: 0,
            }}
          >
            <svg style={{ width: 10, height: 10 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="9" r="5" />
              <path d="M12 14v7" />
              <path d="M9 18h6" />
            </svg>
          </span>
        )}
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
              fontSize: displayName.length > 32 ? "11px" : displayName.length > 22 ? "12px" : "13px",
              fontWeight: 700,
              color: isDeceased ? "#4B5563" : "var(--foreground)",
              lineHeight: 1.25,
              wordBreak: "break-word",
              overflowWrap: "break-word",
            }}
          >
            {displayName}
          </div>
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
