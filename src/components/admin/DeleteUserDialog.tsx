"use client";

import { useState } from "react";
import { Trash2, AlertTriangle, Loader2, X } from "lucide-react";
import type { Profile } from "@/lib/admin/types";

export interface DeleteUserDialogProps {
  open: boolean;
  userProfile: Profile | null;
  onClose: () => void;
  onConfirm: (userId: string) => Promise<void>;
}

export function DeleteUserDialog({
  open,
  userProfile,
  onClose,
  onConfirm,
}: DeleteUserDialogProps) {
  const [loading, setLoading] = useState(false);

  if (!open || !userProfile) return null;

  async function handleDelete() {
    if (!userProfile) return;
    setLoading(true);
    try {
      await onConfirm(userProfile.id);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Warning Icon */}
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
            <Trash2 className="w-6 h-6" />
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Hapus Akun Pengguna?
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Tindakan ini akan mencabut seluruh hak akses akun{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                {userProfile.full_name || userProfile.email}
              </strong>
              . Pengguna tidak akan dapat masuk kembali ke sistem silsilah.
            </p>
          </div>
        </div>

        {/* User Info Box */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center justify-center shrink-0">
            {(userProfile.full_name || userProfile.email || "?")[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
              {userProfile.full_name || "(Tanpa nama)"}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              {userProfile.email || "(Email tidak tersedia)"}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleDelete}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menghapus...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Pengguna</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
