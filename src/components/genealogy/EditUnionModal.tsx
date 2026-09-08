"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { HeartHandshake, Loader2, Trash2, X, Calendar, FileText } from "lucide-react";
import { updateUnion, deleteUnion } from "@/lib/genealogy/relationships";
import type { Union, UnionRelationshipType, UnionStatus, DatePrecision, PersonWithPortrait } from "@/types/genealogy";
import { useQueryClient } from "@tanstack/react-query";
import { getMediaUrl } from "@/lib/genealogy/media";

export interface EditUnionModalProps {
  open: boolean;
  union: Union | null;
  members?: PersonWithPortrait[];
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditUnionModal({
  open,
  union,
  members = [],
  onClose,
  onSuccess,
}: EditUnionModalProps) {
  const queryClient = useQueryClient();
  const [relationshipType, setRelationshipType] = useState<UnionRelationshipType>("marriage");
  const [status, setStatus] = useState<UnionStatus>("active");
  const [startDate, setStartDate] = useState("");
  const [startDatePrecision, setStartDatePrecision] = useState<DatePrecision>("exact");
  const [endDate, setEndDate] = useState("");
  const [endDatePrecision, setEndDatePrecision] = useState<DatePrecision>("exact");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open || !union) return;

    setRelationshipType((union.relationship_type as UnionRelationshipType) || "marriage");
    setStatus((union.status as UnionStatus) || "active");
    setStartDate(union.start_date || "");
    setStartDatePrecision((union.start_date_precision as DatePrecision) || "exact");
    setEndDate(union.end_date || "");
    setEndDatePrecision((union.end_date_precision as DatePrecision) || "exact");
    setNotes(union.notes || "");
  }, [open, union]);

  if (!open || !union) return null;

  const [p1, p2] = members;
  const p1Name = p1 ? [p1.prefix_title, p1.display_name || p1.full_name, p1.suffix_title].filter(Boolean).join(" ") : "Pasangan 1";
  const p2Name = p2 ? [p2.prefix_title, p2.display_name || p2.full_name, p2.suffix_title].filter(Boolean).join(" ") : "Pasangan 2";
  const p1Portrait = p1?.portrait ? getMediaUrl(p1.portrait.storage_path) : null;
  const p2Portrait = p2?.portrait ? getMediaUrl(p2.portrait.storage_path) : null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUnion(union.id, {
        relationship_type: relationshipType,
        status: status,
        start_date: startDate || undefined,
        start_date_precision: startDatePrecision,
        end_date: (status === "divorced" || status === "ended" || status === "widowed") ? (endDate || undefined) : undefined,
        end_date_precision: endDatePrecision,
        notes: notes.trim() || undefined,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["canvas-data"] }),
        queryClient.invalidateQueries({ queryKey: ["people"] }),
        queryClient.invalidateQueries({ queryKey: ["unions"] }),
        queryClient.invalidateQueries({ queryKey: ["relationships"] }),
      ]);

      toast.success("Status dan detail pernikahan berhasil diperbarui!");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error("Gagal menyimpan perubahan pernikahan:", err);
      toast.error(err.message || "Gagal menyimpan perubahan pernikahan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Hapus hubungan pernikahan antara ${p1Name} & ${p2Name}? Hubungan ini akan dilepas dari pohon silsilah.`)) {
      return;
    }

    setDeleting(true);
    try {
      await deleteUnion(union.id);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["canvas-data"] }),
        queryClient.invalidateQueries({ queryKey: ["people"] }),
        queryClient.invalidateQueries({ queryKey: ["unions"] }),
      ]);

      toast.success("Hubungan pernikahan telah dihapus");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error("Gagal menghapus pernikahan:", err);
      toast.error(err.message || "Gagal menghapus hubungan");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--foreground)]">
                Edit Status Pernikahan
              </h3>
              <p className="text-xs text-[var(--muted)]">
                Perbarui tanggal nikah, status ikatan, dan catatan keluarga
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] rounded-lg hover:bg-[var(--subtle)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pasangan Info Card */}
        <div className="px-6 pt-5 pb-2">
          <div className="flex items-center justify-center gap-4 p-3.5 rounded-xl bg-[var(--subtle)]/50 border border-[var(--border)]">
            {/* Suami / Pasangan 1 */}
            <div className="flex flex-col items-center text-center flex-1 min-w-0">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-500/50 bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center mb-1.5 shadow-xs">
                {p1Portrait ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p1Portrait} alt={p1Name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                    {p1Name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-xs font-bold text-[var(--foreground)] truncate max-w-full">
                {p1Name}
              </span>
            </div>

            {/* Simbol Ikatan */}
            <div className="flex flex-col items-center justify-center px-1 text-amber-600 dark:text-amber-400">
              <div className="p-1.5 rounded-full bg-amber-100 dark:bg-amber-900/50">
                <HeartHandshake className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-semibold mt-1 opacity-80">Menikah</span>
            </div>

            {/* Istri / Pasangan 2 */}
            <div className="flex flex-col items-center text-center flex-1 min-w-0">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-500/50 bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center mb-1.5 shadow-xs">
                {p2Portrait ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p2Portrait} alt={p2Name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                    {p2Name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-xs font-bold text-[var(--foreground)] truncate max-w-full">
                {p2Name}
              </span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 pt-3 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Jenis Hubungan */}
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                Jenis Hubungan
              </label>
              <select
                value={relationshipType}
                onChange={(e) => setRelationshipType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] focus:border-amber-500 outline-none"
              >
                <option value="marriage">Pernikahan (Resmi / Sah)</option>
                <option value="partner">Pasangan Hidup</option>
                <option value="engagement">Tunangan</option>
                <option value="historical_union">Historis</option>
              </select>
            </div>

            {/* Status Hubungan */}
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                Status Saat Ini
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] focus:border-amber-500 outline-none"
              >
                <option value="active">Menikah (Aktif)</option>
                <option value="widowed">Duda / Janda (Salah satu wafat)</option>
                <option value="divorced">Bercerai</option>
                <option value="ended">Berakhir</option>
                <option value="unknown">Tidak Diketahui</option>
              </select>
            </div>
          </div>

          {/* Tanggal Pernikahan (Mulai) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-[var(--subtle)]/30 border border-[var(--border)]">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                Tanggal Pernikahan
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--muted)] mb-1">
                Ketepatan
              </label>
              <select
                value={startDatePrecision}
                onChange={(e) => setStartDatePrecision(e.target.value as any)}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] outline-none"
              >
                <option value="exact">Tepat (Hari/Bln/Thn)</option>
                <option value="month">Bulan & Tahun</option>
                <option value="year">Tahun Saja</option>
              </select>
            </div>
          </div>

          {/* Tanggal Berakhir (Jika cerai / ended) */}
          {(status === "divorced" || status === "ended" || status === "widowed") && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  Tanggal Berakhir / Cerai
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] focus:border-rose-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--muted)] mb-1">
                  Ketepatan
                </label>
                <select
                  value={endDatePrecision}
                  onChange={(e) => setEndDatePrecision(e.target.value as any)}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] outline-none"
                >
                  <option value="exact">Tepat</option>
                  <option value="month">Bulan & Tahun</option>
                  <option value="year">Tahun Saja</option>
                </select>
              </div>
            </div>
          )}

          {/* Catatan */}
          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)] mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[var(--muted)]" />
              Catatan Pernikahan / Lokasi Akad
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Menikah di Pagutan, saksi keluarga besar..."
              rows={2}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] focus:border-amber-500 outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            >
              {deleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>Hapus Hubungan</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving || deleting}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--subtle)] transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving || deleting}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>Simpan Perubahan</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
