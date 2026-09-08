"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  User,
  X,
  Loader2,
  ListOrdered,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { updateChildOrder } from "@/lib/genealogy/relationships";
import { getMediaUrl } from "@/lib/genealogy/media";
import type {
  PersonWithPortrait,
  ParentChildRelationship,
  Union,
  UnionMember,
} from "@/types/genealogy";

export interface ReorderChildrenModalProps {
  open: boolean;
  parentId: string | null;
  parentName: string;
  people: PersonWithPortrait[];
  parentChildRels: ParentChildRelationship[];
  unions: Union[];
  unionMembers: UnionMember[];
  onClose: () => void;
  onSuccess: () => void;
}

function getDisplayName(person: PersonWithPortrait): string {
  const parts: string[] = [];
  if (person.prefix_title) parts.push(person.prefix_title);
  parts.push(person.display_name || person.full_name);
  if (person.suffix_title) parts.push(person.suffix_title);
  if (person.life_status === "deceased") {
    parts.push(person.gender === "female" ? "(Almh)" : "(Alm)");
  }
  return parts.join(" ");
}

export function ReorderChildrenModal({
  open,
  parentId,
  parentName,
  people,
  parentChildRels,
  unions,
  unionMembers,
  onClose,
  onSuccess,
}: ReorderChildrenModalProps) {
  const [childrenList, setChildrenList] = useState<PersonWithPortrait[]>([]);
  const [coParent, setCoParent] = useState<PersonWithPortrait | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Inisialisasi daftar anak saat modal dibuka
  useEffect(() => {
    if (!open || !parentId) return;

    // 1. Cari pasangan/co-parent
    const parentUnions = unionMembers
      .filter((um) => um.person_id === parentId)
      .map((um) => um.union_id);

    let partner: PersonWithPortrait | null = null;
    for (const uId of parentUnions) {
      const otherMembers = unionMembers.filter(
        (um) => um.union_id === uId && um.person_id !== parentId
      );
      if (otherMembers.length > 0) {
        const p = people.find((item) => item.id === otherMembers[0].person_id);
        if (p) {
          partner = p;
          break;
        }
      }
    }
    setCoParent(partner);

    // 2. Kumpulkan semua child_id dari parent ini dan pasangan
    const childRels = parentChildRels.filter(
      (r) => r.parent_id === parentId || (partner && r.parent_id === partner.id)
    );
    const childIdsSet = new Set(childRels.map((r) => r.child_id));
    const allChildren = people.filter((p) => childIdsSet.has(p.id));

    // 3. Baca urutan tersimpan (localStorage atau DB sort_order atau birth_date)
    let customOrder: string[] = [];
    try {
      const raw = localStorage.getItem("silsilah_child_order_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        customOrder = parsed[parentId] || (partner ? parsed[partner.id] : []) || [];
      }
    } catch (e) {
      console.warn("Gagal membaca child order dari localStorage:", e);
    }

    const sortedChildren = [...allChildren].sort((a, b) => {
      // 1. Prioritaskan custom order jika ada
      if (customOrder.length > 0) {
        const idxA = customOrder.indexOf(a.id);
        const idxB = customOrder.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
      }

      // 2. DB sort_order
      const relA = childRels.find((r) => r.child_id === a.id);
      const relB = childRels.find((r) => r.child_id === b.id);
      if (
        relA &&
        relB &&
        typeof relA.sort_order === "number" &&
        typeof relB.sort_order === "number"
      ) {
        if (relA.sort_order !== relB.sort_order) {
          return relA.sort_order - relB.sort_order;
        }
      }

      // 3. Tanggal lahir (tertua di awal)
      if (a.birth_date && b.birth_date) {
        return a.birth_date.localeCompare(b.birth_date);
      }
      if (a.birth_date) return -1;
      if (b.birth_date) return 1;

      return 0;
    });

    setChildrenList(sortedChildren);
  }, [open, parentId, people, parentChildRels, unionMembers]);

  // Pindahkan item dalam array
  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    setChildrenList((prev) => {
      if (toIndex < 0 || toIndex >= prev.length) return prev;
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  }, []);

  // Handler Drag & Drop HTML5
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (index: number) => {
    if (draggedIndex !== null && draggedIndex !== index) {
      moveItem(draggedIndex, index);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Reset ke urutan tanggal lahir
  const handleResetToBirthDate = () => {
    setChildrenList((prev) => {
      return [...prev].sort((a, b) => {
        if (a.birth_date && b.birth_date) {
          return a.birth_date.localeCompare(b.birth_date);
        }
        if (a.birth_date) return -1;
        if (b.birth_date) return 1;
        return a.full_name.localeCompare(b.full_name);
      });
    });
    toast.info("Urutan diatur ulang berdasarkan tanggal lahir");
  };

  // Simpan urutan baru
  const handleSaveOrder = async () => {
    if (!parentId || childrenList.length === 0) return;

    setSaving(true);
    try {
      const orderedChildIds = childrenList.map((c) => c.id);

      // 1. Simpan ke localStorage
      let savedOrders: Record<string, string[]> = {};
      try {
        const raw = localStorage.getItem("silsilah_child_order_v1");
        if (raw) savedOrders = JSON.parse(raw);
      } catch (e) {}

      savedOrders[parentId] = orderedChildIds;
      if (coParent) savedOrders[coParent.id] = orderedChildIds;
      localStorage.setItem("silsilah_child_order_v1", JSON.stringify(savedOrders));

      // 2. Bersihkan koordinat custom node anak-anak ini dari localStorage
      // agar kanvas langsung menata ulang posisi horizontal mereka sesuai urutan baru
      try {
        const rawPos = localStorage.getItem("silsilah_custom_positions_v2");
        if (rawPos) {
          const posMap = JSON.parse(rawPos);
          for (const cId of orderedChildIds) {
            delete posMap[`person-${cId}`];
          }
          localStorage.setItem("silsilah_custom_positions_v2", JSON.stringify(posMap));
        }
      } catch (e) {}

      // 3. Update ke database Supabase
      await updateChildOrder(parentId, orderedChildIds, coParent?.id);

      // 4. Dispatch event update untuk canvas
      window.dispatchEvent(
        new CustomEvent("silsilah:child-order-updated", {
          detail: {
            parentId,
            coParentId: coParent?.id,
            orderedChildIds,
          },
        })
      );

      toast.success("Urutan anak berhasil diperbarui!");
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Gagal menyimpan urutan anak:", err);
      toast.error(err.message || "Gagal menyimpan urutan anak");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reorder-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)] bg-gradient-to-r from-emerald-500/10 via-transparent to-teal-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ListOrdered className="w-5 h-5" />
            </div>
            <div>
              <h2 id="reorder-modal-title" className="text-base font-bold leading-tight">
                Atur Urutan Anak
              </h2>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Keluarga {parentName} {coParent ? `& ${getDisplayName(coParent)}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--subtle)] transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Tip Alert */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs leading-relaxed">
            <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <span>
              <strong>Geser kartu anak</strong> ke atas atau bawah untuk menentukan urutan
              kelahiran (Anak ke-1, ke-2, dst). Nomor urut akan langsung tertata dari kiri ke
              kanan di pohon silsilah.
            </span>
          </div>

          {/* Children List */}
          {childrenList.length === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--muted)]">
              Belum ada data anak yang terdaftar untuk orang tua ini.
            </div>
          ) : (
            <div className="space-y-2">
              {childrenList.map((child, index) => {
                const isDragging = draggedIndex === index;
                const isOver = dragOverIndex === index;

                return (
                  <div
                    key={child.id}
                    draggable={true}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={() => handleDrop(index)}
                    onDragEnd={handleDragEnd}
                    className={`group flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-150 select-none ${
                      isDragging
                        ? "opacity-40 scale-95 border-emerald-500 bg-emerald-500/10"
                        : isOver
                        ? "border-emerald-500 bg-emerald-500/10 shadow-md ring-2 ring-emerald-500/30"
                        : "border-[var(--border)] bg-[var(--surface)] hover:border-emerald-500/50 hover:bg-[var(--subtle)]"
                    }`}
                  >
                    {/* Drag Handle */}
                    <div
                      className="cursor-grab active:cursor-grabbing p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      title="Tahan & geser untuk mengubah urutan"
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>

                    {/* Order Number Badge */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center border border-emerald-300 dark:border-emerald-800 shadow-sm">
                      #{index + 1}
                    </div>

                    {/* Portrait Photo */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-[var(--subtle)] border border-[var(--border)] flex items-center justify-center">
                      {child.portrait ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getMediaUrl(child.portrait.storage_path)}
                          alt={child.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-[var(--muted)]" />
                      )}
                    </div>

                    {/* Child Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-[var(--foreground)] truncate">
                        {getDisplayName(child)}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[var(--muted)] mt-0.5">
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          Anak ke-{index + 1}
                        </span>
                        <span>•</span>
                        <span>{child.gender === "male" ? "Laki-laki" : "Perempuan"}</span>
                        {child.birth_date && (
                          <>
                            <span>•</span>
                            <span>Lahir: {child.birth_date}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Quick Move Buttons (Great for Mobile & Touch) */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => moveItem(index, index - 1)}
                        disabled={index === 0}
                        title="Geser ke atas"
                        aria-label={`Geser ${child.full_name} ke atas`}
                        className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--subtle)] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(index, index + 1)}
                        disabled={index === childrenList.length - 1}
                        title="Geser ke bawah"
                        aria-label={`Geser ${child.full_name} ke bawah`}
                        className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--subtle)] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--surface)] flex flex-wrap items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleResetToBirthDate}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--subtle)] border border-[var(--border)] transition-colors cursor-pointer"
            title="Urutkan otomatis tertua ke termuda berdasarkan tanggal lahir"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Sesuai Tgl Lahir</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-xl border border-[var(--border)] hover:bg-[var(--subtle)] transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSaveOrder}
              disabled={saving || childrenList.length <= 1}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md hover:shadow-lg disabled:opacity-50 transition-all cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Simpan Urutan</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
