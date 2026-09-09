"use client";

import { useState, useRef, useEffect } from "react";
import {
  Network,
  ChevronDown,
  Plus,
  Check,
  Trash2,
  Edit2,
  Sparkles,
  Layers,
} from "lucide-react";
import type { Canvas } from "@/types/genealogy";

export interface CanvasSelectorProps {
  canvases: Canvas[];
  activeCanvasId: string | null;
  onSelectCanvas: (canvas: Canvas) => void;
  onCreateNewClick: () => void;
  onDeleteCanvas?: (canvasId: string) => void;
}

export function CanvasSelector({
  canvases,
  activeCanvasId,
  onSelectCanvas,
  onCreateNewClick,
  onDeleteCanvas,
}: CanvasSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeCanvas =
    canvases.find((c) => c.id === activeCanvasId) || canvases[0] || null;

  // Tutup dropdown jika klik di luar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm hover:border-emerald-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all text-slate-800 dark:text-slate-100"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <Layers className="h-3.5 w-3.5" />
        </div>

        <div className="flex flex-col text-left">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 leading-none">
            Kanvas Silsilah
          </span>
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 line-clamp-1 max-w-[200px] sm:max-w-[280px]">
            {activeCanvas?.title || "Pilih Kanvas"}
          </span>
        </div>

        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-emerald-500" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-[120] animate-in fade-in zoom-in-95 duration-150">
          {/* Header Info */}
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Daftar Kanvas ({canvases.length})
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              Multi-POV Pohon
            </span>
          </div>

          {/* List of Canvases */}
          <div className="max-h-64 overflow-y-auto py-1 divide-y divide-slate-100/60 dark:divide-slate-800/60">
            {canvases.map((canvas) => {
              const isSelected = canvas.id === activeCanvas?.id;
              return (
                <div
                  key={canvas.id}
                  className={`group flex items-center justify-between px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-100"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                  onClick={() => {
                    onSelectCanvas(canvas);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div
                      className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                        isSelected
                          ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                      }`}
                    >
                      {canvas.title.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold truncate">
                          {canvas.title}
                        </p>
                      </div>
                      {canvas.root_person ? (
                        <p className="text-[11px] text-slate-400 truncate">
                          Fokus: {canvas.root_person.full_name}
                        </p>
                      ) : (
                        canvas.description && (
                          <p className="text-[11px] text-slate-400 truncate">
                            {canvas.description}
                          </p>
                        )
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isSelected && (
                      <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                    {onDeleteCanvas && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            confirm(
                              `Apakah Anda yakin ingin menghapus kanvas "${canvas.title}"?`
                            )
                          ) {
                            onDeleteCanvas(canvas.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-slate-200/50 dark:hover:bg-slate-700 transition-all"
                        title="Hapus Kanvas"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Footer: Tambah Kanvas Baru */}
          <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onCreateNewClick();
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-xl text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Buat Kanvas Silsilah Baru</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
