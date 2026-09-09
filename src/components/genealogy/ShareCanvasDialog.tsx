import { useState, useEffect } from "react";
import {
  Share2,
  Users,
  UserPlus,
  Trash2,
  Check,
  Shield,
  Eye,
  Edit3,
  Loader2,
  X,
  Sparkles,
  Mail,
} from "lucide-react";
import type { Canvas, CanvasShare } from "@/types/genealogy";
import {
  shareCanvasAction,
  getCanvasSharesAction,
  removeCanvasShareAction,
  updateCanvasShareAction,
} from "@/app/actions/canvasShares";
import {
  getLocalSharesForCanvas,
  saveLocalSharesForCanvas,
  saveLocalShareForUser,
  removeLocalShareForUser,
} from "@/lib/genealogy/canvases";
import { toast } from "sonner";

export interface ShareCanvasDialogProps {
  open: boolean;
  canvas: Canvas | null;
  onClose: () => void;
}

export function ShareCanvasDialog({
  open,
  canvas,
  onClose,
}: ShareCanvasDialogProps) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"view" | "edit">("view");
  const [loading, setLoading] = useState(false);
  const [sharesLoading, setSharesLoading] = useState(false);
  const [shares, setShares] = useState<CanvasShare[]>([]);

  useEffect(() => {
    if (open && canvas?.id) {
      loadShares(canvas.id);
    } else {
      setShares([]);
      setEmail("");
    }
  }, [open, canvas?.id]);

  async function loadShares(canvasId: string) {
    setSharesLoading(true);
    try {
      const serverShares = await getCanvasSharesAction(canvasId);
      const localShares = getLocalSharesForCanvas(canvasId);

      const dbUserIds = new Set(serverShares.map((s) => s.user_id));
      const merged = [...serverShares];
      for (const loc of localShares) {
        if (!dbUserIds.has(loc.user_id)) {
          merged.push(loc);
        }
      }

      setShares(merged);
    } catch (err) {
      console.warn("Gagal memuat daftar share:", err);
      setShares(getLocalSharesForCanvas(canvasId));
    } finally {
      setSharesLoading(false);
    }
  }

  async function handleShare(e: React.FormEvent) {
    e.preventDefault();
    if (!canvas?.id || !email.trim()) return;

    setLoading(true);
    const targetEmail = email.trim().toLowerCase();
    try {
      const res = await shareCanvasAction(canvas.id, targetEmail, permission);
      if (!res.success) {
        toast.error(res.error || "Gagal membagikan kanvas");
      } else {
        const newShare: CanvasShare = {
          ...(res.share || {
            id: `share-${Date.now()}`,
            canvas_id: canvas.id,
            user_id: `user-${targetEmail.replace(/[^a-zA-Z0-9]/g, "-")}`,
            permission,
            shared_by: null,
            created_at: new Date().toISOString(),
            user_profile: {
              id: `user-${targetEmail.replace(/[^a-zA-Z0-9]/g, "-")}`,
              full_name: targetEmail.split("@")[0],
              avatar_url: null,
            },
          }),
          ...({ email: targetEmail } as any),
        };

        // Save to local storage for instant multi-user sync
        const currentLocal = getLocalSharesForCanvas(canvas.id);
        const updatedLocal = [
          ...currentLocal.filter((s) => s.user_id !== newShare.user_id),
          newShare,
        ];
        saveLocalSharesForCanvas(canvas.id, updatedLocal);
        saveLocalShareForUser(targetEmail, canvas.id, permission);
        if (newShare.user_id) saveLocalShareForUser(newShare.user_id, canvas.id, permission);

        setShares((prev) => [
          ...prev.filter((s) => s.user_id !== newShare.user_id),
          newShare,
        ]);

        toast.success(`Akses kanvas berhasil dibagikan ke ${targetEmail}`);
        setEmail("");

        // Trigger update event
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("silsilah:canvases-updated", {
              detail: { canvasId: canvas.id },
            })
          );
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat membagikan kanvas");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveShare(shareId: string, name?: string, userId?: string) {
    try {
      await removeCanvasShareAction(shareId);
      if (canvas?.id) {
        const currentLocal = getLocalSharesForCanvas(canvas.id);
        const updatedLocal = currentLocal.filter((s) => s.id !== shareId);
        saveLocalSharesForCanvas(canvas.id, updatedLocal);
        if (userId) removeLocalShareForUser(userId, canvas.id);
      }
      setShares((prev) => prev.filter((s) => s.id !== shareId));
      toast.success(`Izin akses untuk ${name || "pengguna"} telah dicabut`);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("silsilah:canvases-updated", {
            detail: { canvasId: canvas?.id },
          })
        );
      }
    } catch (err) {
      toast.error("Gagal mencabut akses");
    }
  }

  async function handleUpdatePermission(shareId: string, newPerm: "view" | "edit", userId?: string) {
    try {
      await updateCanvasShareAction(shareId, newPerm);
      if (canvas?.id) {
        const currentLocal = getLocalSharesForCanvas(canvas.id);
        const updatedLocal = currentLocal.map((s) =>
          s.id === shareId ? { ...s, permission: newPerm } : s
        );
        saveLocalSharesForCanvas(canvas.id, updatedLocal);
        if (userId) saveLocalShareForUser(userId, canvas.id, newPerm);
      }
      setShares((prev) =>
        prev.map((s) => (s.id === shareId ? { ...s, permission: newPerm } : s))
      );
      toast.success(`Izin diperbarui menjadi ${newPerm === "edit" ? "Editor" : "Viewer"}`);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("silsilah:canvases-updated", {
            detail: { canvasId: canvas?.id },
          })
        );
      }
    } catch (err) {
      toast.error("Gagal memperbarui izin");
    }
  }

  if (!open || !canvas) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Bagikan Kanvas Silsilah
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[320px]">
                {canvas.title}
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

        {/* Form: Invite by Email */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto max-h-[70vh]">
          <form onSubmit={handleShare} className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Undang Pengguna / Keluarga
            </label>
            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <div className="relative flex-1">
                <input
                  type="email"
                  required
                  placeholder="Masukkan email akun pengguna..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                />
              </div>

              {/* Permission dropdown */}
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as "view" | "edit")}
                className="px-3 py-2.5 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="view">👁️ Hanya Lihat (Viewer)</option>
                <option value="edit">✏️ Bisa Edit (Editor)</option>
              </select>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-600/20 transition-all shrink-0"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Bagikan</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              *Pengguna yang diundang akan mendapatkan akses ke kanvas ini di tab &quot;Dibagikan ke Saya&quot;.
            </p>
          </form>

          {/* List of current shares */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Akses yang Diberikan</span>
              <span className="text-[11px] font-normal text-slate-400">
                {shares.length} Pengguna
              </span>
            </h3>

            {sharesLoading ? (
              <div className="flex items-center justify-center p-8 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : shares.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1 bg-slate-50/50 dark:bg-slate-950/30">
                <Users className="w-6 h-6 mx-auto text-slate-400" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Belum ada pengguna yang dibagikan
                </p>
                <p className="text-[11px] text-slate-400">
                  Kanvas ini saat ini bersifat pribadi dan hanya dapat diakses oleh Anda.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/40 dark:bg-slate-950/40">
                {shares.map((share) => {
                  const profile = share.user_profile;
                  const displayName = profile?.full_name || share.user_id;
                  const isEmail = share.user_id.includes("@") || (share as any).email;
                  const displayEmail = (share as any).email || (isEmail ? share.user_id : (profile as any)?.email);

                  return (
                    <div
                      key={share.id}
                      className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-300/40">
                          {profile?.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={profile.avatar_url}
                              alt={displayName}
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            displayName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {displayName}
                          </p>
                          {displayEmail && displayEmail !== displayName ? (
                            <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{displayEmail}</span>
                            </p>
                          ) : (
                            <p className="text-[10px] text-slate-400 truncate">
                              {share.created_at ? new Date(share.created_at).toLocaleDateString("id-ID") : ""}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={share.permission}
                          onChange={(e) =>
                            handleUpdatePermission(
                              share.id,
                              e.target.value as "view" | "edit",
                              share.user_id
                            )
                          }
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none"
                        >
                          <option value="view">👁️ Viewer</option>
                          <option value="edit">✏️ Editor</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => handleRemoveShare(share.id, displayName, share.user_id)}
                          title="Cabut Akses"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
