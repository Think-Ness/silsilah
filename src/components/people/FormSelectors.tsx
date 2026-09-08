"use client";

import React from "react";
import type { Gender, LifeStatus, DatePrecision } from "@/types/genealogy";
import { HelpCircle, Heart, Sparkles } from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   GENDER SELECTOR
   Tampilan tombol toggle interaktif (Laki-laki ♂ / Perempuan ♀)
   ───────────────────────────────────────────────────────────── */
interface GenderSelectorProps {
  value: Gender;
  onChange: (value: Gender) => void;
  disabled?: boolean;
}

export function GenderSelector({ value, onChange, disabled }: GenderSelectorProps) {
  const options: Array<{
    key: Gender;
    label: string;
    symbol: string;
    activeClasses: string;
    hoverClasses: string;
  }> = [
    {
      key: "male",
      label: "Laki-laki",
      symbol: "♂",
      activeClasses:
        "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/25 font-semibold shadow-xs",
      hoverClasses: "hover:border-blue-400/60 hover:bg-blue-50/50 dark:hover:bg-blue-950/20",
    },
    {
      key: "female",
      label: "Perempuan",
      symbol: "♀",
      activeClasses:
        "border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/25 font-semibold shadow-xs",
      hoverClasses: "hover:border-rose-400/60 hover:bg-rose-50/50 dark:hover:bg-rose-950/20",
    },
    {
      key: "unknown",
      label: "Belum Tahu",
      symbol: "?",
      activeClasses:
        "border-[var(--muted)] bg-[var(--subtle)] text-[var(--foreground)] ring-2 ring-[var(--border)] font-semibold shadow-xs",
      hoverClasses: "hover:border-[var(--muted)] hover:bg-[var(--subtle)]",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mt-1.5">
      {options.map((opt) => {
        const isSelected = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.key)}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border transition-all duration-150 cursor-pointer text-xs sm:text-sm select-none ${
              isSelected
                ? opt.activeClasses
                : `border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] ${opt.hoverClasses}`
            } ${disabled ? "opacity-50 cursor-not-allowed" : "active:scale-98"}`}
          >
            <span
              className={`text-base leading-none font-bold ${
                opt.key === "male"
                  ? "text-blue-600 dark:text-blue-400"
                  : opt.key === "female"
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-[var(--muted)]"
              }`}
            >
              {opt.symbol}
            </span>
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   LIFE STATUS SELECTOR
   Tampilan tombol pilihan status kehidupan (Masih Hidup / Almarhum)
   ───────────────────────────────────────────────────────────── */
interface LifeStatusSelectorProps {
  value: LifeStatus;
  onChange: (value: LifeStatus) => void;
  disabled?: boolean;
}

export function LifeStatusSelector({ value, onChange, disabled }: LifeStatusSelectorProps) {
  const options: Array<{
    key: LifeStatus;
    label: string;
    indicator: React.ReactNode;
    activeClasses: string;
  }> = [
    {
      key: "living",
      label: "Masih Hidup",
      indicator: <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />,
      activeClasses:
        "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/25 font-semibold shadow-xs",
    },
    {
      key: "deceased",
      label: "Almarhum / Wafat",
      indicator: <span className="w-2 h-2 rounded-full bg-slate-400" />,
      activeClasses:
        "border-slate-500 bg-slate-500/10 text-slate-800 dark:text-slate-200 ring-2 ring-slate-400/25 font-semibold shadow-xs",
    },
    {
      key: "unknown",
      label: "Tidak Diketahui",
      indicator: <span className="w-2 h-2 rounded-full bg-amber-400" />,
      activeClasses:
        "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/25 font-semibold shadow-xs",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mt-1.5">
      {options.map((opt) => {
        const isSelected = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.key)}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border transition-all duration-150 cursor-pointer text-xs sm:text-sm select-none ${
              isSelected
                ? opt.activeClasses
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--muted)] hover:text-[var(--foreground)]"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "active:scale-98"}`}
          >
            {opt.indicator}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   DATE PRECISION SELECTOR
   Pill selector untuk ketepatan tanggal lahir
   ───────────────────────────────────────────────────────────── */
interface DatePrecisionSelectorProps {
  value?: DatePrecision;
  onChange: (value: DatePrecision) => void;
  disabled?: boolean;
}

export function DatePrecisionSelector({ value = "exact", onChange, disabled }: DatePrecisionSelectorProps) {
  const options: Array<{ key: DatePrecision; label: string }> = [
    { key: "exact", label: "Tepat" },
    { key: "month", label: "Kira-kira Bulan" },
    { key: "year", label: "Hanya Tahun" },
    { key: "unknown", label: "Tidak Tahu" },
  ];

  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {options.map((opt) => {
        const isSelected = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.key)}
            className={`px-3 py-1.5 rounded-lg border text-xs transition-all duration-150 cursor-pointer select-none ${
              isSelected
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold ring-1 ring-emerald-500/30"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--muted)] hover:text-[var(--foreground)]"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
