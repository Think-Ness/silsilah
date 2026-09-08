"use client";

import { useState } from "react";
import { Trash2, Loader2, AlertTriangle, X } from "lucide-react";
import { deletePerson } from "@/lib/genealogy/people";
import { toast } from "sonner";

interface DeletePersonDialogProps {
  open: boolean;
  personId: string | null;
  personName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeletePersonDialog({
  open,
  personId,
  personName,
  onClose,
  onSuccess,
}: DeletePersonDialogProps) {
  const [loading, setLoading] = useState(false);

  if (!open || !personId) return null;

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deletePerson(personId);
      toast.success(`Anggota "${personName}" berhasil dihapus.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Gagal menghapus anggota");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-y-auto max-h-[calc(100dvh-1.5rem)] animate-in zoom-in-95 duration-150 p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1 rounded-md text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--subtle)] transition-colors"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex-shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-[var(--foreground)]">
              Hapus Anggota Keluarga
            </h3>
            <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">
              Apakah Anda yakin ingin menghapus <span className="font-semibold text-[var(--foreground)]">{personName}</span> dari silsilah keluarga? Hubungan perkawinan dan anak terkait juga akan otomatis disesuaikan.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-[var(--border)]">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium rounded-md border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--subtle)] transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menghapus...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
