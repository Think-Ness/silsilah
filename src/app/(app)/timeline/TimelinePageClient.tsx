"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { TimelineEvent, TimelineEventType } from "@/lib/genealogy/timeline";
import { getMediaUrl } from "@/lib/genealogy/media";
import { useCurrentUser } from "@/context/UserRoleContext";
import {
  CalendarDays,
  Sparkles,
  HeartHandshake,
  Moon,
  Scissors,
  MapPin,
  User,
  Users,
  Share2,
  Filter,
  Search,
  ArrowRight,
  Plus,
  RotateCcw,
  BookOpen,
  ArrowDownUp,
  Clock,
  Milestone,
} from "lucide-react";

interface TimelinePageClientProps {
  events: TimelineEvent[];
  decadesArr: [number, TimelineEvent[]][];
  people: Array<{
    id: string;
    full_name: string;
    display_name: string | null;
    prefix_title: string | null;
    suffix_title: string | null;
    birth_date: string | null;
  }>;
  selectedPersonId?: string;
}

const EVENT_CONFIG: Record<
  TimelineEventType,
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bg: string;
    border: string;
    badgeBg: string;
    label: string;
    storyCategory: string;
  }
> = {
  birth: {
    icon: Sparkles,
    color: "#16a34a",
    bg: "rgba(22, 163, 74, 0.05)",
    border: "rgba(22, 163, 74, 0.25)",
    badgeBg: "rgba(22, 163, 74, 0.12)",
    label: "Kelahiran",
    storyCategory: "Kelahiran Anggota Keluarga",
  },
  death: {
    icon: Moon,
    color: "#64748b",
    bg: "rgba(100, 116, 139, 0.05)",
    border: "rgba(100, 116, 139, 0.25)",
    badgeBg: "rgba(100, 116, 139, 0.12)",
    label: "Wafat",
    storyCategory: "Penghormatan & Kenangan",
  },
  marriage: {
    icon: HeartHandshake,
    color: "#e11d48",
    bg: "rgba(225, 29, 72, 0.05)",
    border: "rgba(225, 29, 72, 0.25)",
    badgeBg: "rgba(225, 29, 72, 0.12)",
    label: "Pernikahan",
    storyCategory: "Ikatan Suci Pernikahan",
  },
  divorce: {
    icon: Scissors,
    color: "#d97706",
    bg: "rgba(217, 119, 6, 0.05)",
    border: "rgba(217, 119, 6, 0.25)",
    badgeBg: "rgba(217, 119, 6, 0.12)",
    label: "Perceraian",
    storyCategory: "Perubahan Status Hubungan",
  },
  widowed: {
    icon: Moon,
    color: "#7c3aed",
    bg: "rgba(124, 58, 237, 0.05)",
    border: "rgba(124, 58, 237, 0.25)",
    badgeBg: "rgba(124, 58, 237, 0.12)",
    label: "Duda / Janda",
    storyCategory: "Perubahan Status Hubungan",
  },
};

function parseEventTime(dateStr: string): number {
  if (!dateStr) return 0;
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d).getTime();
  }
  return new Date(dateStr).getTime() || 0;
}

export function TimelinePageClient({
  events,
  decadesArr,
  people,
  selectedPersonId,
}: TimelinePageClientProps) {
  const router = useRouter();
  const { user, isSuperAdmin } = useCurrentUser();
  const currentUserId = user?.id;

  const [activeTab, setActiveTab] = useState<"all" | "my" | "shared">("my");
  const [typeFilter, setTypeFilter] = useState<"all" | TimelineEventType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<"story" | "decade">("story");

  function handlePersonFilter(personId: string) {
    if (personId) {
      router.push(`/timeline?person=${personId}`);
    } else {
      router.push("/timeline");
    }
  }

  const selectedPerson = people.find((p) => p.id === selectedPersonId);
  const selectedPersonName = selectedPerson
    ? [selectedPerson.prefix_title, selectedPerson.display_name || selectedPerson.full_name, selectedPerson.suffix_title]
        .filter(Boolean)
        .join(" ")
    : null;

  // Klasifikasi data peristiwa: Milik Saya vs Dibagikan
  const myEvents = useMemo(() => {
    if (isSuperAdmin) return events;
    return events.filter((e) => !e.created_by || e.created_by === currentUserId);
  }, [events, currentUserId, isSuperAdmin]);

  const sharedEvents = useMemo(() => {
    if (isSuperAdmin) return [];
    return events.filter((e) => e.created_by && e.created_by !== currentUserId);
  }, [events, currentUserId, isSuperAdmin]);

  const hasSharedItems = sharedEvents.length > 0;

  const baseEvents = useMemo(() => {
    if (activeTab === "my") return myEvents;
    if (activeTab === "shared") return sharedEvents;
    return events;
  }, [events, myEvents, sharedEvents, activeTab]);

  // Filter events based on search and type
  const filteredEvents = useMemo(() => {
    const result = baseEvents.filter((evt) => {
      if (typeFilter !== "all" && evt.type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = evt.personName.toLowerCase().includes(query);
        const matchRelated = evt.relatedPersonName?.toLowerCase().includes(query);
        const matchPlace = evt.place?.toLowerCase().includes(query);
        const matchYear = evt.year.toString().includes(query);
        const matchDesc = evt.description.toLowerCase().includes(query);
        if (!matchName && !matchRelated && !matchPlace && !matchYear && !matchDesc) return false;
      }
      return true;
    });

    // Sort based on user selected order
    return result.sort((a, b) => {
      const timeA = parseEventTime(a.date);
      const timeB = parseEventTime(b.date);
      if (sortOrder === "asc") {
        return timeA - timeB;
      } else {
        return timeB - timeA;
      }
    });
  }, [baseEvents, typeFilter, searchQuery, sortOrder]);

  // Regroup filtered events by decade
  const filteredDecadesArr = useMemo(() => {
    const map = new Map<number, TimelineEvent[]>();
    for (const evt of filteredEvents) {
      if (!evt.year) continue;
      const decade = Math.floor(evt.year / 10) * 10;
      if (!map.has(decade)) map.set(decade, []);
      map.get(decade)!.push(evt);
    }
    const arr = Array.from(map.entries());
    return sortOrder === "asc" ? arr.sort((a, b) => a[0] - b[0]) : arr.sort((a, b) => b[0] - a[0]);
  }, [filteredEvents, sortOrder]);

  // Overall counts
  const birthCount = baseEvents.filter((e) => e.type === "birth").length;
  const marriageCount = baseEvents.filter((e) => e.type === "marriage").length;
  const deathCount = baseEvents.filter((e) => e.type === "death").length;

  const minYear = baseEvents.length > 0 ? Math.min(...baseEvents.map((e) => e.year).filter(Boolean)) : 0;
  const maxYear = baseEvents.length > 0 ? Math.max(...baseEvents.map((e) => e.year).filter(Boolean)) : 0;
  const yearSpan = maxYear && minYear ? maxYear - minYear : 0;

  const scrollToDecade = (decade: number) => {
    const el = document.getElementById(`decade-${decade}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="page-content" style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BookOpen className="w-6 h-6 text-[var(--accent-color)]" />
            Alur Kisah &amp; Timeline Keluarga
          </h1>
          <p className="page-subtitle">
            {selectedPersonName
              ? `Jejak langkah dan kisah hidup kronologis ${selectedPersonName}`
              : `Kisah perjalanan sejarah keluarga (${minYear || "?"} – ${maxYear || "?"}${yearSpan > 0 ? ` · Rentang ${yearSpan} tahun` : ""})`}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Link
            href="/relationships/new"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: "var(--radius-md)",
              background: "var(--foreground)",
              color: "var(--surface)",
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            <Plus className="w-4 h-4" />
            Tambah Hubungan / Pernikahan
          </Link>
        </div>
      </div>

      {/* Ownership Filter Tabs: Data Saya (Default), Semua, Dibagikan */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 w-fit mb-4">
        <button
          type="button"
          onClick={() => setActiveTab("my")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "my"
              ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Data Saya</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === "my"
                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold"
                : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
            }`}
          >
            {myEvents.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "all"
              ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Semua</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === "all"
                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold"
                : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
            }`}
          >
            {events.length}
          </span>
        </button>

        {hasSharedItems && (
          <button
            type="button"
            onClick={() => setActiveTab("shared")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "shared"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Dibagikan</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === "shared"
                  ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
              }`}
            >
              {sharedEvents.length}
            </span>
          </button>
        )}
      </div>

      {/* Stats Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          {
            label: "Total Peristiwa",
            value: events.length,
            icon: CalendarDays,
            color: "#4f46e5",
            bg: "rgba(79, 70, 229, 0.08)",
            filter: "all" as const,
          },
          {
            label: "Kelahiran",
            value: birthCount,
            icon: Sparkles,
            color: "#16a34a",
            bg: "rgba(22, 163, 74, 0.08)",
            filter: "birth" as const,
          },
          {
            label: "Pernikahan",
            value: marriageCount,
            icon: HeartHandshake,
            color: "#e11d48",
            bg: "rgba(225, 29, 72, 0.08)",
            filter: "marriage" as const,
          },
          {
            label: "Wafat",
            value: deathCount,
            icon: Moon,
            color: "#64748b",
            bg: "rgba(100, 116, 139, 0.08)",
            filter: "death" as const,
          },
        ].map((s) => {
          const Icon = s.icon;
          const isActive = typeFilter === s.filter;
          return (
            <button
              key={s.label}
              type="button"
              onClick={() => setTypeFilter(s.filter)}
              style={{
                background: isActive ? s.bg : "var(--surface)",
                border: `1px solid ${isActive ? s.color : "var(--border)"}`,
                borderRadius: "var(--radius-lg)",
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                textAlign: "left",
                cursor: "pointer",
                transition: "all 150ms ease",
                boxShadow: isActive ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "var(--radius-md)",
                  background: s.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: s.color,
                  flexShrink: 0,
                }}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)", lineHeight: 1.1 }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{s.label}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Control Bar: Filter, View Switcher & Search */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "14px 16px",
          marginBottom: 20,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          {/* Person Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 260px" }}>
            <Filter className="w-4 h-4 text-[var(--muted)] flex-shrink-0" />
            <select
              id="timeline-person-filter"
              value={selectedPersonId ?? ""}
              onChange={(e) => handlePersonFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 10px",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                background: "var(--background)",
                fontSize: 13,
                color: "var(--foreground)",
                outline: "none",
              }}
            >
              <option value="">Semua Anggota Keluarga</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {[p.prefix_title, p.display_name || p.full_name, p.suffix_title].filter(Boolean).join(" ")}
                  {p.birth_date ? ` (${p.birth_date.split("-")[0]})` : ""}
                </option>
              ))}
            </select>
            {selectedPersonId && (
              <button
                type="button"
                onClick={() => handlePersonFilter("")}
                title="Reset filter anggota"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "6px 10px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  background: "transparent",
                  fontSize: 12,
                  color: "var(--muted)",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>

          {/* Keyword Search */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 220px", position: "relative" }}>
            <Search className="w-4 h-4 text-[var(--muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nama, tahun, atau tempat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 10px 7px 32px",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                background: "var(--background)",
                fontSize: 13,
                color: "var(--foreground)",
                outline: "none",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  fontSize: 12,
                  color: "var(--muted)",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* View Mode & Sort Order Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto", flexWrap: "wrap" }}>
            {/* View Mode Switcher */}
            <div style={{ display: "flex", background: "var(--subtle)", padding: 2, borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
              <button
                type="button"
                onClick={() => setViewMode("story")}
                style={{
                  padding: "4px 10px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 12,
                  fontWeight: viewMode === "story" ? 600 : 500,
                  background: viewMode === "story" ? "var(--foreground)" : "transparent",
                  color: viewMode === "story" ? "var(--surface)" : "var(--muted)",
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Alur Kisah
              </button>
              <button
                type="button"
                onClick={() => setViewMode("decade")}
                style={{
                  padding: "4px 10px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 12,
                  fontWeight: viewMode === "decade" ? 600 : 500,
                  background: viewMode === "decade" ? "var(--foreground)" : "transparent",
                  color: viewMode === "decade" ? "var(--surface)" : "var(--muted)",
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Dekade
              </button>
            </div>

            {/* Sort Order Button */}
            <button
              type="button"
              onClick={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))}
              title="Ubah urutan alur waktu"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 10px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--foreground)",
                cursor: "pointer",
              }}
            >
              <ArrowDownUp className="w-3.5 h-3.5 text-amber-600" />
              <span>{sortOrder === "asc" ? "Awal → Terkini" : "Terkini → Awal"}</span>
            </button>
          </div>
        </div>

        {/* Event Type Filter Pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
          <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500, marginRight: 4 }}>Kategori:</span>
          {[
            { id: "all", label: "Semua", count: events.length },
            { id: "birth", label: "Kelahiran", count: birthCount },
            { id: "marriage", label: "Pernikahan", count: marriageCount },
            { id: "death", label: "Wafat", count: deathCount },
          ].map((tab) => {
            const isActive = typeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTypeFilter(tab.id as any)}
                style={{
                  padding: "4px 10px",
                  borderRadius: "var(--radius-full, 999px)",
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                  border: `1px solid ${isActive ? "var(--foreground)" : "var(--border)"}`,
                  background: isActive ? "var(--foreground)" : "transparent",
                  color: isActive ? "var(--surface)" : "var(--muted)",
                  cursor: "pointer",
                  transition: "all 120ms ease",
                }}
              >
                {tab.label} <span style={{ opacity: 0.8, fontSize: 11 }}>({tab.count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fast Decade Quick-Navigator (Only in Decade view) */}
      {viewMode === "decade" && filteredDecadesArr.length > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            overflowX: "auto",
            padding: "8px 0 16px",
            marginBottom: 12,
          }}
          className="scrollbar-none"
        >
          <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0 }}>
            Lompat ke:
          </span>
          {filteredDecadesArr.map(([decade]) => (
            <button
              key={decade}
              type="button"
              onClick={() => scrollToDecade(decade)}
              style={{
                padding: "3px 10px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--foreground)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
              className="hover:border-[var(--accent-color)] hover:text-[var(--accent-color)] transition-colors"
            >
              {decade}an
            </button>
          ))}
        </div>
      )}

      {/* Timeline Content */}
      {filteredEvents.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "56px 20px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            color: "var(--muted)",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "var(--subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              color: "var(--muted)",
            }}
          >
            <CalendarDays className="w-6 h-6" />
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)", margin: "0 0 6px" }}>
            Tidak ada peristiwa yang ditemukan
          </h3>
          <p style={{ fontSize: 13, margin: 0, maxWidth: 420, marginInline: "auto" }}>
            {searchQuery || typeFilter !== "all"
              ? "Coba ubah kata kunci pencarian atau reset filter kategori."
              : "Belum ada data tanggal lahir, tanggal wafat, atau tanggal pernikahan. Anda dapat mengisinya melalui form edit anggota atau tambah hubungan."}
          </p>
        </div>
      ) : viewMode === "story" ? (
        /* ================= MODE ALUR KISAH (STORYLINE MODE) ================= */
        <div style={{ position: "relative", paddingLeft: 28, marginTop: 16 }}>
          {/* Main vertical flow line */}
          <div
            style={{
              position: "absolute",
              left: 7,
              top: 12,
              bottom: 16,
              width: 2,
              background: "linear-gradient(to bottom, var(--accent-color), var(--border) 95%, transparent)",
              opacity: 0.45,
            }}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {filteredEvents.map((event, idx) => {
              const config = EVENT_CONFIG[event.type] || EVENT_CONFIG.birth;
              const Icon = config.icon;
              const portraitUrl = event.personPortraitPath ? getMediaUrl(event.personPortraitPath) : null;
              const relatedPortraitUrl = event.relatedPersonPortraitPath
                ? getMediaUrl(event.relatedPersonPortraitPath)
                : null;

              // Calculate time interval from previous event
              const prevEvent = idx > 0 ? filteredEvents[idx - 1] : null;
              let yearsInterval: number | null = null;
              if (prevEvent && event.year && prevEvent.year) {
                yearsInterval = Math.abs(event.year - prevEvent.year);
              }

              return (
                <div key={event.id}>
                  {/* Story Interval Connector */}
                  {yearsInterval !== null && yearsInterval > 0 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        margin: "-6px 0 14px -28px",
                      }}
                    >
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          background: "var(--surface)",
                          border: "2px solid var(--accent-color)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          marginLeft: 0,
                        }}
                      >
                        <Clock className="w-2.5 h-2.5 text-[var(--accent-color)]" />
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "var(--muted)",
                          background: "var(--subtle)",
                          padding: "2px 8px",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--border)",
                          letterSpacing: "0.02em",
                        }}
                      >
                        {sortOrder === "asc"
                          ? `⏳ Selang ${yearsInterval} tahun kemudian (${event.year})`
                          : `⏳ Berselang ${yearsInterval} tahun sebelumnya (${event.year})`}
                      </span>
                    </div>
                  )}

                  {/* Story Event Node */}
                  <div style={{ position: "relative", display: "flex", gap: 14, alignItems: "flex-start" }}>
                    {/* Node Dot */}
                    <div
                      style={{
                        position: "absolute",
                        left: -25,
                        top: 16,
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: config.color,
                        border: "2px solid var(--background)",
                        boxShadow: `0 0 0 2px ${config.color}40`,
                        flexShrink: 0,
                      }}
                    />

                    {/* Story Narrative Card */}
                    <div
                      style={{
                        flex: 1,
                        background: "var(--surface)",
                        border: `1px solid var(--border)`,
                        borderLeft: `4px solid ${config.color}`,
                        borderRadius: "var(--radius-xl, 14px)",
                        padding: "16px 18px",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                      className="hover:shadow-md transition-shadow"
                    >
                      {/* Card Header */}
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {/* Avatar */}
                          <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                            <div
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: "50%",
                                overflow: "hidden",
                                background: config.bg,
                                border: `2px solid ${config.color}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {portraitUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={portraitUrl} alt={event.personName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : (
                                <Icon className="w-5 h-5" />
                              )}
                            </div>
                            {/* Spouse avatar if marriage */}
                            {(event.type === "marriage" || event.type === "divorce") && event.relatedPersonName && (
                              <div
                                style={{
                                  width: 44,
                                  height: 44,
                                  borderRadius: "50%",
                                  overflow: "hidden",
                                  background: config.bg,
                                  border: `2px solid ${config.color}`,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  marginLeft: -14,
                                  zIndex: 1,
                                }}
                              >
                                {relatedPortraitUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={relatedPortraitUrl} alt={event.relatedPersonName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                ) : (
                                  <User className="w-5 h-5 text-[var(--muted)]" />
                                )}
                              </div>
                            )}
                          </div>

                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: config.color, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
                              {config.storyCategory} · {event.year}
                            </div>
                            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", margin: 0, lineHeight: 1.3 }}>
                              {event.description}
                            </h3>
                          </div>
                        </div>

                        {/* Badges Container */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {event.created_by && event.created_by !== currentUserId && !isSuperAdmin ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              <Share2 className="w-2.5 h-2.5" /> Dibagikan
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              Data Saya
                            </span>
                          )}

                          {/* Category Badge */}
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: config.color,
                              background: config.badgeBg,
                              padding: "3px 9px",
                              borderRadius: "var(--radius-sm)",
                              border: `1px solid ${config.border}`,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Icon className="w-3 h-3" />
                            {config.label}
                          </span>
                        </div>
                      </div>

                      {/* Story Footer Meta */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          flexWrap: "wrap",
                          fontSize: 12,
                          color: "var(--muted)",
                          paddingTop: 8,
                          borderTop: "1px solid var(--border)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 600, color: "var(--foreground)" }}>
                            {event.dateDisplay}
                          </span>

                          {event.place && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                              <MapPin className="w-3.5 h-3.5 text-[var(--muted)]" />
                              {event.place}
                            </span>
                          )}

                          {event.ageAtEvent !== null && event.ageAtEvent !== undefined && (
                            <span
                              style={{
                                background: "var(--subtle)",
                                padding: "2px 7px",
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 500,
                                border: "1px solid var(--border)",
                              }}
                            >
                              {event.type === "death"
                                ? `Usia ${event.ageAtEvent} tahun saat wafat`
                                : event.type === "marriage"
                                ? `Usia ${event.ageAtEvent} tahun saat menikah`
                                : `Usia ${event.ageAtEvent} tahun`}
                            </span>
                          )}
                        </div>

                        {/* Person Links */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Link
                            href={`/people/${event.personId}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              color: "var(--accent-color)",
                              textDecoration: "none",
                              fontWeight: 600,
                              fontSize: 12,
                            }}
                          >
                            Profil {event.personName.split(" ")[0]}
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                          {event.relatedPersonId && (
                            <Link
                              href={`/people/${event.relatedPersonId}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                color: "var(--accent-color)",
                                textDecoration: "none",
                                fontWeight: 600,
                                fontSize: 12,
                              }}
                            >
                              Profil {event.relatedPersonName?.split(" ")[0]}
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ================= MODE LINIMASA DEKADE (DECADE VIEW) ================= */
        <div style={{ position: "relative", paddingLeft: 24, marginTop: 12 }}>
          {/* Main vertical line */}
          <div
            style={{
              position: "absolute",
              left: 5,
              top: 8,
              bottom: 12,
              width: 2,
              background: "linear-gradient(to bottom, var(--accent-color), var(--border) 90%, transparent)",
              opacity: 0.4,
            }}
          />

          {filteredDecadesArr.map(([decade, decadeEvents]) => (
            <div key={decade} id={`decade-${decade}`} style={{ marginBottom: 36, scrollMarginTop: 80 }}>
              {/* Decade Marker Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 16,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: -24,
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: "var(--accent-color)",
                    border: "3px solid var(--background)",
                    boxShadow: "0 0 0 2px var(--accent-color)",
                  }}
                />
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--foreground)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  Dekade {decade}an
                </span>
                <div style={{ height: 1, flex: 1, background: "var(--border)" }} />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: "var(--muted)",
                    background: "var(--subtle)",
                    padding: "2px 8px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {decadeEvents.length} Peristiwa
                </span>
              </div>

              {/* Events in this Decade */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {decadeEvents.map((event) => {
                  const config = EVENT_CONFIG[event.type] || EVENT_CONFIG.birth;
                  const Icon = config.icon;
                  const portraitUrl = event.personPortraitPath ? getMediaUrl(event.personPortraitPath) : null;
                  const relatedPortraitUrl = event.relatedPersonPortraitPath
                    ? getMediaUrl(event.relatedPersonPortraitPath)
                    : null;

                  return (
                    <div
                      key={event.id}
                      style={{
                        position: "relative",
                        display: "flex",
                        gap: 12,
                        alignItems: "flex-start",
                      }}
                    >
                      {/* Node indicator */}
                      <div
                        style={{
                          position: "absolute",
                          left: -22,
                          top: 14,
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: config.color,
                          border: "2px solid var(--background)",
                          flexShrink: 0,
                        }}
                      />

                      {/* Event Card */}
                      <div
                        style={{
                          flex: 1,
                          background: "var(--surface)",
                          border: `1px solid var(--border)`,
                          borderLeft: `3px solid ${config.color}`,
                          borderRadius: "var(--radius-lg)",
                          padding: "14px 16px",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 14,
                          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                        }}
                        className="hover:shadow-md transition-shadow"
                      >
                        {/* Avatar */}
                        <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: "50%",
                              overflow: "hidden",
                              background: config.bg,
                              border: `1.5px solid ${config.color}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {portraitUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={portraitUrl} alt={event.personName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <Icon className="w-4 h-4" />
                            )}
                          </div>

                          {(event.type === "marriage" || event.type === "divorce") && event.relatedPersonName && (
                            <div
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: "50%",
                                overflow: "hidden",
                                background: config.bg,
                                border: `1.5px solid ${config.color}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                marginLeft: -12,
                                zIndex: 1,
                              }}
                            >
                              {relatedPortraitUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={relatedPortraitUrl} alt={event.relatedPersonName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : (
                                <User className="w-4 h-4 text-[var(--muted)]" />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 8,
                              flexWrap: "wrap",
                              marginBottom: 4,
                            }}
                          >
                            <h4
                              style={{
                                fontSize: 14,
                                fontWeight: 600,
                                color: "var(--foreground)",
                                margin: 0,
                                lineHeight: 1.3,
                              }}
                            >
                              {event.description}
                            </h4>

                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              {event.created_by && event.created_by !== currentUserId && !isSuperAdmin ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                  <Share2 className="w-2.5 h-2.5" /> Dibagikan
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  Data Saya
                                </span>
                              )}

                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: config.color,
                                  background: config.badgeBg,
                                  padding: "2px 8px",
                                  borderRadius: "var(--radius-sm)",
                                  border: `1px solid ${config.border}`,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                              >
                                <Icon className="w-3 h-3" />
                                {config.label}
                              </span>
                            </div>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              flexWrap: "wrap",
                              fontSize: 12,
                              color: "var(--muted)",
                              marginTop: 6,
                            }}
                          >
                            <span style={{ fontWeight: 600, color: "var(--foreground)" }}>
                              {event.dateDisplay}
                            </span>

                            {event.place && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <MapPin className="w-3.5 h-3.5 text-[var(--muted)]" />
                                {event.place}
                              </span>
                            )}

                            {event.ageAtEvent !== null && event.ageAtEvent !== undefined && (
                              <span
                                style={{
                                  background: "var(--subtle)",
                                  padding: "1px 6px",
                                  borderRadius: 4,
                                  fontSize: 11,
                                  border: "1px solid var(--border)",
                                }}
                              >
                                {event.type === "death"
                                  ? `Usia ${event.ageAtEvent} thn saat wafat`
                                  : event.type === "marriage"
                                  ? `Usia ${event.ageAtEvent} thn saat menikah`
                                  : `Usia ${event.ageAtEvent} thn`}
                              </span>
                            )}

                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
                              <Link
                                href={`/people/${event.personId}`}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  color: "var(--accent-color)",
                                  textDecoration: "none",
                                  fontWeight: 500,
                                  fontSize: 12,
                                }}
                              >
                                Profil {event.personName.split(" ")[0]}
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                              {event.relatedPersonId && (
                                <Link
                                  href={`/people/${event.relatedPersonId}`}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    color: "var(--accent-color)",
                                    textDecoration: "none",
                                    fontWeight: 500,
                                    fontSize: 12,
                                  }}
                                >
                                  Profil {event.relatedPersonName?.split(" ")[0]}
                                  <ArrowRight className="w-3 h-3" />
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
