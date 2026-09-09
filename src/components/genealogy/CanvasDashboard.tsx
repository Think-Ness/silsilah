"use client";

import { useState, useMemo } from "react";
import {
  Layers,
  Plus,
  Search,
  ArrowRight,
  Printer,
  Trash2,
  Edit2,
  Calendar,
  Users,
  Crown,
  Network,
  GitBranch,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import type { Canvas, PersonWithPortrait } from "@/types/genealogy";
import { getMediaUrl } from "@/lib/genealogy/media";

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
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCanvases = useMemo(() => {
    return canvases.filter((c) => {
      const matchesSearch =
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.root_person && c.root_person.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    });
  }, [canvases, searchTerm]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Banner */}
        <div className="relative rounded-3xl p-6 md:p-8 overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-slate-900 text-white shadow-xl shadow-emerald-950/10 border border-emerald-500/20">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-emerald-100">
                <Layers className="w-3.5 h-3.5" />
                <span>Multi-Family Genealogy Canvases</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                Dashboard Kanvas Silsilah
              </h1>
              <p className="text-sm text-emerald-100/90 leading-relaxed">
                Kelola berbagai kanvas silsilah keluarga dalam satu tempat. Buka kanvas keluarga yang sudah ada atau buat kanvas baru untuk berbagai cabang dan silsilah keluarga.
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

        {/* Stats & Search Input */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Daftar Kanvas ({canvases.length})
            </span>
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
                  {/* Top Bar: Icon & Delete */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-11 w-11 rounded-2xl flex items-center justify-center font-bold text-base shadow-sm bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/20">
                        <Layers className="w-5 h-5" />
                      </div>

                      <div>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                          Kanvas Silsilah
                        </span>
                      </div>
                    </div>

                    {onDeleteCanvas && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            confirm(`Apakah Anda yakin ingin menghapus kanvas "${canvas.title}"?`)
                          ) {
                            onDeleteCanvas(canvas.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
                        title="Hapus Kanvas"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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
    </div>
  );
}
