"use client";

import { useState, useMemo } from "react";
import {
  Layers,
  Plus,
  Search,
  ArrowRight,
  Printer,
  Trash2,
  Users,
  Network,
  Share2,
  ShieldCheck,
  Eye,
  Edit3,
  Sparkles,
  FolderOpen,
} from "lucide-react";
import type { Canvas, PersonWithPortrait } from "@/types/genealogy";
import { getMediaUrl } from "@/lib/genealogy/media";
import { DeleteCanvasDialog } from "@/components/genealogy/DeleteCanvasDialog";
import { ShareCanvasDialog } from "@/components/genealogy/ShareCanvasDialog";
import { useCurrentUser } from "@/context/UserRoleContext";

export interface CanvasDashboardProps {
  canvases: Canvas[];
  people: PersonWithPortrait[];
  activeCanvasId: string | null;
  onSelectCanvas: (canvas: Canvas, mode?: "canvas" | "zuriat") => void;
  onCreateNewClick: () => void;
  onEditCanvas?: (canvas: Canvas) => void;
  onDeleteCanvas?: (canvasId: string) => void;
}

export function CanvasDashboard({
  canvases,
  people,
  activeCanvasId,
  onSelectCanvas,
  onCreateNewClick,
  onEditCanvas,
  onDeleteCanvas,
}: CanvasDashboardProps) {
  const { user, isSuperAdmin, isViewer } = useCurrentUser();
  const currentUserId = user?.id;

  const [activeTab, setActiveTab] = useState<"all" | "my" | "shared">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    canvasId: string | null;
    canvasTitle: string;
  }>({
    open: false,
    canvasId: null,
    canvasTitle: "",
  });

  const [shareDialog, setShareDialog] = useState<{
    open: boolean;
    canvas: Canvas | null;
  }>({
    open: false,
    canvas: null,
  });

  // Helper to determine canvas ownership vs shared status
  const isOwnerCanvas = (c: Canvas) => {
    if (c.user_permission === "owner") {
      // Jika owner_id ada dan milik orang lain, maka ini adalah kanvas yang di-share (bukan milik sendiri)
      if (c.owner_id && currentUserId && c.owner_id !== currentUserId && !isSuperAdmin) {
        return false;
      }
      return true;
    }
    if (currentUserId && c.owner_id === currentUserId) return true;
    return false;
  };

  // Categorize counts
  const myCanvasesCount = useMemo(() => {
    return canvases.filter((c) => isOwnerCanvas(c)).length;
  }, [canvases, currentUserId, isSuperAdmin]);

  const sharedCanvasesCount = useMemo(() => {
    return canvases.filter((c) => !isOwnerCanvas(c) || (c.owner_id && currentUserId && c.owner_id !== currentUserId)).length;
  }, [canvases, currentUserId, isSuperAdmin]);

  const filteredCanvases = useMemo(() => {
    return canvases.filter((c) => {
      // Tab filter
      if (activeTab === "my") {
        if (!isOwnerCanvas(c)) return false;
      } else if (activeTab === "shared") {
        const isShared = !isOwnerCanvas(c) || (c.owner_id && currentUserId && c.owner_id !== currentUserId) || c.user_permission === "edit" || c.user_permission === "view";
        if (!isShared) return false;
      }

      // Search filter
      const matchesSearch =
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.root_person && c.root_person.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    });
  }, [canvases, activeTab, searchTerm, currentUserId, isSuperAdmin]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Banner */}
        <div className="relative rounded-3xl p-6 md:p-8 overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-slate-900 text-white shadow-xl shadow-emerald-950/10 border border-emerald-500/20">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-emerald-100">
                <Layers className="w-3.5 h-3.5" />
                <span>Multi-Family Genealogy & Canvas Sharing</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                Dashboard Kanvas Silsilah
              </h1>
              <p className="text-sm text-emerald-100/90 leading-relaxed">
                Kelola berbagai kanvas silsilah keluarga dalam satu tempat. Buka kanvas keluarga Anda, kolaborasi dengan anggota keluarga lain, atau buat kanvas baru untuk cabang keluarga lainnya.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onCreateNewClick}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-emerald-900 hover:bg-emerald-50 text-sm font-bold shadow-lg shadow-black/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                <span>+ Buat Kanvas Baru</span>
              </button>
            </div>
          </div>

          {/* Decorative shapes */}
          <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
          <div className="absolute right-1/3 -top-16 w-48 h-48 rounded-full bg-teal-300/10 blur-2xl pointer-events-none" />
        </div>

        {/* Navigation Tabs & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                activeTab === "all"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Semua Kanvas</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-700 dark:bg-slate-200 text-slate-200 dark:text-slate-800">
                {canvases.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("my")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                activeTab === "my"
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Kanvas Saya</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-800/40 text-emerald-200">
                {myCanvasesCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("shared")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                activeTab === "shared"
                  ? "bg-teal-600 text-white shadow-sm shadow-teal-600/30"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Dibagikan ke Saya</span>
              {sharedCanvasesCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-teal-800/40 text-teal-200">
                  {sharedCanvasesCount}
                </span>
              )}
            </button>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[260px] sm:w-80">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama kanvas / tokoh..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Canvas Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCanvases.map((canvas) => {
            const rootPerson = canvas.root_person;
            const isCurrentlyActive = canvas.id === activeCanvasId;
            const isOwner =
              isSuperAdmin ||
              canvas.user_permission === "owner" ||
              !canvas.owner_id ||
              canvas.owner_id === currentUserId;

            const isShared = !isOwner && canvas.owner_id && canvas.owner_id !== currentUserId;
            const permissionBadge = isOwner
              ? { label: "Pemilik", icon: ShieldCheck, color: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" }
              : canvas.user_permission === "edit"
              ? { label: "Editor", icon: Edit3, color: "text-sky-700 bg-sky-50 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800" }
              : { label: "Viewer", icon: Eye, color: "text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700" };

            const BadgeIcon = permissionBadge.icon;

            return (
              <div
                key={canvas.id}
                className={`group relative flex flex-col justify-between rounded-3xl p-6 bg-white dark:bg-slate-900 border transition-all duration-200 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-950/50 hover:-translate-y-0.5 ${
                  isCurrentlyActive
                    ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg"
                    : "border-slate-200/80 dark:border-slate-800"
                }`}
              >
                <div className="space-y-4">
                  {/* Top Bar: Icon, Role Badge, Share & Delete */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-11 w-11 rounded-2xl flex items-center justify-center font-bold text-base shadow-sm bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/20">
                        <Layers className="w-5 h-5" />
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${permissionBadge.color}`}
                        >
                          <BadgeIcon className="w-3 h-3" />
                          <span>{permissionBadge.label}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Share Button (Owner or Super Admin) */}
                      {isOwner && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShareDialog({ open: true, canvas });
                          }}
                          className="p-2 text-slate-400 hover:text-emerald-600 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all"
                          title="Bagikan Kanvas Ini ke Pengguna Lain"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      )}

                      {/* Delete Button (Owner or Super Admin) */}
                      {onDeleteCanvas && isOwner && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteDialog({
                              open: true,
                              canvasId: canvas.id,
                              canvasTitle: canvas.title,
                            });
                          }}
                          className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
                          title="Hapus Kanvas"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {canvas.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {canvas.description || "Pohon silsilah keluarga dan garis keturunan."}
                    </p>
                  </div>

                  {/* Tokoh Utama (Root Person) Card */}
                  {rootPerson ? (
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                      <div className="h-9 w-9 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0 flex items-center justify-center font-bold text-xs text-slate-600 dark:text-slate-300">
                        {rootPerson.portrait ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={getMediaUrl(rootPerson.portrait.storage_path)}
                            alt={rootPerson.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          rootPerson.full_name.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Tokoh Pusat Silsilah
                        </p>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {rootPerson.full_name}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                      <div className="h-9 w-9 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 shrink-0 flex items-center justify-center font-bold text-xs">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Cakupan Silsilah
                        </p>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          Seluruh Anggota Keluarga
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="pt-5 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onSelectCanvas(canvas, "canvas")}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.01]"
                  >
                    <Network className="w-3.5 h-3.5" />
                    <span>Buka Kanvas</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectCanvas(canvas, "zuriat")}
                    title="Buka Template Print / Bagan Zuriat"
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-amber-600 hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-all"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Quick Create Card */}
          <button
            type="button"
            onClick={onCreateNewClick}
            className="flex flex-col items-center justify-center gap-3 p-8 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 transition-all text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300 min-h-[260px]"
          >
            <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 group-hover:bg-emerald-100 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors">
              <Plus className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                + Buat Kanvas Silsilah Baru
              </p>
              <p className="text-xs text-slate-400 max-w-[200px]">
                Buat kanvas silsilah keluarga baru dari tokoh anggota mana pun
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Share Canvas Dialog */}
      <ShareCanvasDialog
        open={shareDialog.open}
        canvas={shareDialog.canvas}
        onClose={() => setShareDialog({ open: false, canvas: null })}
      />

      {/* Delete Canvas Dialog UI */}
      <DeleteCanvasDialog
        open={deleteDialog.open}
        canvasId={deleteDialog.canvasId}
        canvasTitle={deleteDialog.canvasTitle}
        onClose={() => setDeleteDialog({ open: false, canvasId: null, canvasTitle: "" })}
        onSuccess={() => {
          if (onDeleteCanvas && deleteDialog.canvasId) {
            onDeleteCanvas(deleteDialog.canvasId);
          }
        }}
      />
    </div>
  );
}
