"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { TimelineEvent, TimelineEventType } from "@/lib/genealogy/timeline";
import { getMediaUrl } from "@/lib/genealogy/media";
import {
  CalendarDays,
  Sparkles,
  HeartHandshake,
  Moon,
  Scissors,
  MapPin,
  User,
  Filter,
  Search,
  ArrowRight,
  Plus,
  RotateCcw,
  Sparkle,
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
  }
> = {
  birth: {
    icon: Sparkles,
    color: "#16a34a",
    bg: "rgba(22, 163, 74, 0.05)",
    border: "rgba(22, 163, 74, 0.25)",
    badgeBg: "rgba(22, 163, 74, 0.12)",
    label: "Kelahiran",
  },
  death: {
    icon: Moon,
    color: "#64748b",
    bg: "rgba(100, 116, 139, 0.05)",
    border: "rgba(100, 116, 139, 0.25)",
    badgeBg: "rgba(100, 116, 139, 0.12)",
    label: "Wafat",
  },
  marriage: {
    icon: HeartHandshake,
    color: "#e11d48",
    bg: "rgba(225, 29, 72, 0.05)",
    border: "rgba(225, 29, 72, 0.25)",
    badgeBg: "rgba(225, 29, 72, 0.12)",
    label: "Pernikahan",
  },
  divorce: {
    icon: Scissors,
    color: "#d97706",
    bg: "rgba(217, 119, 6, 0.05)",
    border: "rgba(217, 119, 6, 0.25)",
    badgeBg: "rgba(217, 119, 6, 0.12)",
    label: "Perceraian",
  },
  widowed: {
    icon: Moon,
    color: "#7c3aed",
    bg: "rgba(124, 58, 237, 0.05)",
    border: "rgba(124, 58, 237, 0.25)",
    badgeBg: "rgba(124, 58, 237, 0.12)",
    label: "Duda / Janda",
  },
};

export function TimelinePageClient({
  events,
  decadesArr,
  people,
  selectedPersonId,
}: TimelinePageClientProps) {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState<"all" | TimelineEventType>("all");
  const [searchQuery, setSearchQuery] = useState("");

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

  // Filter events based on search and type
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
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
  }, [events, typeFilter, searchQuery]);

  // Regroup filtered events by decade
  const filteredDecadesArr = useMemo(() => {
    const map = new Map<number, TimelineEvent[]>();
    for (const evt of filteredEvents) {
      if (!evt.year) continue;
      const decade = Math.floor(evt.year / 10) * 10;
      if (!map.has(decade)) map.set(decade, []);
      map.get(decade)!.push(evt);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [filteredEvents]);

  // Overall counts
  const birthCount = events.filter((e) => e.type === "birth").length;
  const marriageCount = events.filter((e) => e.type === "marriage").length;
  const deathCount = events.filter((e) => e.type === "death").length;

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
          marginBottom: 24,
        }}
      >
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CalendarDays className="w-6 h-6 text-[var(--accent-color)]" />
            Timeline Peristiwa Keluarga
          </h1>
          <p className="page-subtitle">
            {selectedPersonName
              ? `Garis waktu kronologis peristiwa kehidupan untuk ${selectedPersonName}`
              : "Garis waktu kronologis sejarah kelahiran, pernikahan, dan peristiwa penting keluarga"}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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

      {/* Stats Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {[
          {
            label: "Total Peristiwa",
            value: events.length,
            icon: CalendarDays,
            color: "#4f46e5",
            bg: "rgba(79, 70, 229, 0.08)",
            border: "rgba(79, 70, 229, 0.2)",
            filter: "all" as const,
          },
          {
            label: "Kelahiran",
            value: birthCount,
            icon: Sparkles,
            color: "#16a34a",
            bg: "rgba(22, 163, 74, 0.08)",
            border: "rgba(22, 163, 74, 0.2)",
            filter: "birth" as const,
          },
          {
            label: "Pernikahan",
            value: marriageCount,
            icon: HeartHandshake,
            color: "#e11d48",
            bg: "rgba(225, 29, 72, 0.08)",
            border: "rgba(225, 29, 72, 0.2)",
            filter: "marriage" as const,
          },
          {
            label: "Wafat",
            value: deathCount,
            icon: Moon,
            color: "#64748b",
            bg: "rgba(100, 116, 139, 0.08)",
            border: "rgba(100, 116, 139, 0.2)",
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

      {/* Control Bar: Filter and Search */}
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

      {/* Fast Decade Quick-Navigator */}
      {filteredDecadesArr.length > 1 && (
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
      {filteredDecadesArr.length === 0 ? (
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
          <div style={{ marginTop: 16 }}>
            <Link
              href="/people"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                fontSize: 13,
                color: "var(--foreground)",
                textDecoration: "none",
              }}
            >
              Lihat Daftar Anggota
            </Link>
          </div>
        </div>
      ) : (
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
                {/* Glowing decade dot */}
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
                          transition: "transform 150ms ease, box-shadow 150ms ease",
                        }}
                        className="hover:shadow-md transition-shadow"
                      >
                        {/* Avatar / Portrait or Icon */}
                        <div style={{ display: "flex", alignItems: "center", gap: -8, flexShrink: 0 }}>
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
                              <img
                                src={portraitUrl}
                                alt={event.personName}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            ) : (
                              <Icon className="w-4 h-4" />
                            )}
                          </div>

                          {/* Second spouse portrait if marriage/divorce */}
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
                                <img
                                  src={relatedPortraitUrl}
                                  alt={event.relatedPersonName}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
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

                            {/* Event Type Badge */}
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

                          {/* Event Meta Row */}
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

                            {/* Links */}
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

