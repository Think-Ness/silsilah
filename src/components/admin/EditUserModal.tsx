"use client";

import { useState, useEffect } from "react";
import { User, Shield, Crown, Eye, Loader2, X, CheckCircle2, Link2 } from "lucide-react";
import type { Profile, UserRole } from "@/lib/admin/types";

export interface EditUserModalProps {
  open: boolean;
  userProfile: Profile | null;
  onClose: () => void;
  onSave: (
    userId: string,
    data: {
      full_name: string;
      role: UserRole;
      is_active: boolean;
    }
  ) => Promise<void>;
}

export function EditUserModal({
  open,
  userProfile,
  onClose,
  onSave,
}: EditUserModalProps) {
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("family_member");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setFullName(userProfile.full_name || "");
      setRole(userProfile.role || "family_member");
      setIsActive(userProfile.is_active ?? true);
    }
  }, [userProfile]);

  if (!open || !userProfile) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userProfile) return;

    setLoading(true);
    try {
      await onSave(userProfile.id, {
        full_name: fullName.trim(),
        role,
        is_active: isActive,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Edit Data Pengguna
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {userProfile.email || userProfile.id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Nama Lengkap
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nama pengguna..."
              className="w-full px-4 py-2.5 text-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Peran Hak Akses
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  id: "super_admin" as UserRole,
                  label: "Super Admin",
                  desc: "Akses Penuh",
                  icon: Crown,
                  color: "border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300",
                },
                {
                  id: "family_member" as UserRole,
                  label: "Anggota Keluarga",
                  desc: "Bisa Edit Silsilah",
                  icon: User,
                  color: "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300",
                },
                {
                  id: "viewer" as UserRole,
                  label: "Pengamat",
                  desc: "Hanya Baca",
                  icon: Eye,
                  color: "border-slate-500 bg-slate-500/10 text-slate-700 dark:text-slate-300",
                },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = role === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRole(item.id)}
                    className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all ${
                      isSelected
                        ? `${item.color} ring-2 ring-emerald-500/20 shadow-sm font-semibold`
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className="w-4 h-4" />
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <span className="text-xs font-bold">{item.label}</span>
                    <span className="text-[10px] text-slate-400">{item.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Toggle */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Status Akun
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all border ${
                  isActive
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                    : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800"
                }`}
              >
                {isActive ? "✓ Akun Aktif" : "✕ Akun Dinonaktifkan"}
              </button>
              <span className="text-[11px] text-slate-400">
                {isActive
                  ? "Pengguna dapat masuk dan beraktivitas di aplikasi"
                  : "Pengguna dilarang masuk ke dalam sistem"}
              </span>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Simpan Perubahan</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
