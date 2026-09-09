"use client";

import { useState } from "react";
import { Trash2, Loader2, X, Layers } from "lucide-react";
import { deleteCanvas } from "@/lib/genealogy/canvases";
import { toast } from "sonner";

interface DeleteCanvasDialogProps {
  open: boolean;
  canvasId: string | null;
  canvasTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteCanvasDialog({
  open,
  canvasId,
  canvasTitle,
  onClose,
  onSuccess,
}: DeleteCanvasDialogProps) {
  const [loading, setLoading] = useState(false);

  if (!open || !canvasId) return null;

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteCanvas(canvasId);
      toast.success(`Kanvas "${canvasTitle}" berhasil dihapus.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Gagal menghapus kanvas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex-shrink-0 border border-rose-200 dark:border-rose-900/50">
            <Trash2 className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Hapus Kanvas Silsilah
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Apakah Anda yakin ingin menghapus kanvas{" "}
              <span className="font-bold text-slate-900 dark:text-slate-100">
                &ldquo;{canvasTitle}&rdquo;
              </span>
              ? Data anggota dan relasi di database tetap aman dan tidak akan terhapus.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menghapus...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Kanvas</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
