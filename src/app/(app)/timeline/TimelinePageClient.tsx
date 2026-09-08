"use client";

import { useRouter } from "next/navigation";
import type { TimelineEvent } from "@/lib/genealogy/timeline";
import { Heart, Star, Cross, Minus, MapPin, User, Filter } from "lucide-react";

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

const EVENT_CONFIG = {
  birth: {
    icon: Star,
    color: "#22c55e",
    bg: "rgba(34,197,94,0.1)",
    border: "rgba(34,197,94,0.3)",
    label: "Kelahiran",
    emoji: "🌟",
  },
  death: {
    icon: Cross,
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.1)",
    border: "rgba(148,163,184,0.3)",
    label: "Wafat",
    emoji: "🕊️",
  },
  marriage: {
    icon: Heart,
    color: "#ec4899",
    bg: "rgba(236,72,153,0.1)",
    border: "rgba(236,72,153,0.3)",
    label: "Pernikahan",
    emoji: "💑",
  },
  divorce: {
    icon: Minus,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.3)",
    label: "Cerai",
    emoji: "📄",
  },
  widowed: {
    icon: Cross,
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.1)",
    border: "rgba(139,92,246,0.3)",
    label: "Duda/Janda",
    emoji: "🕊️",
  },
};

export function TimelinePageClient({
  events,
  decadesArr,
  people,
  selectedPersonId,
}: TimelinePageClientProps) {
  const router = useRouter();

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

  const birthCount = events.filter((e) => e.type === "birth").length;
  const marriageCount = events.filter((e) => e.type === "marriage").length;
  const deathCount = events.filter((e) => e.type === "death").length;

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Timeline Keluarga</h1>
          <p className="page-subtitle">
            {selectedPersonName
              ? `Garis waktu peristiwa kehidupan ${selectedPersonName}`
              : "Garis waktu kronologis semua peristiwa penting keluarga"}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
          gap: 10,
          marginBottom: 24,
        }}
      >
        {[
          { label: "Total Event", value: events.length, color: "#6366f1", emoji: "📅" },
          { label: "Kelahiran", value: birthCount, color: "#22c55e", emoji: "🌟" },
          { label: "Pernikahan", value: marriageCount, color: "#ec4899", emoji: "💑" },
          { label: "Wafat", value: deathCount, color: "#94a3b8", emoji: "🕊️" },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "14px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 4 }}>{s.emoji}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 24,
          padding: "12px 16px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <Filter size={14} color="var(--muted)" />
        <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, flexShrink: 0 }}>
          Filter anggota:
        </span>
        <select
          id="timeline-person-filter"
          value={selectedPersonId ?? ""}
          onChange={(e) => handlePersonFilter(e.target.value)}
          style={{
            flex: 1,
            padding: "6px 10px",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            background: "var(--background)",
            fontSize: 13,
            color: "var(--foreground)",
          }}
        >
          <option value="">Semua anggota keluarga</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {[p.prefix_title, p.display_name || p.full_name, p.suffix_title]
                .filter(Boolean)
                .join(" ")}
              {p.birth_date ? ` (${new Date(p.birth_date).getFullYear()})` : ""}
            </option>
          ))}
        </select>
        {selectedPersonId && (
          <button
            onClick={() => handlePersonFilter("")}
            style={{
              padding: "5px 10px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              background: "transparent",
              fontSize: 12,
              color: "var(--muted)",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Timeline */}
      {decadesArr.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "64px 24px",
            color: "var(--muted)",
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 16 }}>📅</div>
          <p style={{ fontSize: 14, margin: 0 }}>Belum ada data tanggal yang tersedia</p>
          <p style={{ fontSize: 12, margin: "8px 0 0", color: "var(--muted)" }}>
            Tambahkan tanggal lahir atau tanggal pernikahan pada data anggota
          </p>
        </div>
      ) : (
        <div style={{ position: "relative", paddingLeft: 28 }}>
          {/* Vertical line */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 2,
              background: "linear-gradient(to bottom, var(--accent-color), transparent)",
              opacity: 0.3,
            }}
          />

          {decadesArr.map(([decade, decadeEvents]) => (
            <div key={decade} style={{ marginBottom: 32 }}>
              {/* Decade label */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: -6,
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: "var(--accent-color)",
                    border: "2px solid var(--background)",
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: "var(--accent-color)",
                    letterSpacing: "0.1em",
                    paddingLeft: 16,
                  }}
                >
                  {decade}an
                </span>
                <div style={{ height: 1, flex: 1, background: "var(--border)" }} />
                <span style={{ fontSize: 11, color: "var(--muted)" }}>
                  {decadeEvents.length} event
                </span>
              </div>

              {/* Events in this decade */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {decadeEvents.map((event) => {
                  const config = EVENT_CONFIG[event.type];
                  const Icon = config.icon;

                  return (
                    <div
                      key={event.id}
                      style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "flex-start",
                      }}
                    >
                      {/* Event dot */}
                      <div
                        style={{
                          position: "absolute",
                          left: -4,
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: config.color,
                          border: "2px solid var(--background)",
                          marginTop: 14,
                          flexShrink: 0,
                        }}
                      />

                      {/* Event card */}
                      <div
                        style={{
                          flex: 1,
                          marginLeft: 16,
                          background: config.bg,
                          border: `1px solid ${config.border}`,
                          borderRadius: "var(--radius-md)",
                          padding: "12px 14px",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                        }}
                      >
                        {/* Icon */}
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            background: `${config.color}20`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Icon size={13} color={config.color} />
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "var(--foreground)",
                              lineHeight: 1.4,
                            }}
                          >
                            {event.description}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              marginTop: 4,
                              flexWrap: "wrap",
                            }}
                          >
                            <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500 }}>
                              {event.dateDisplay}
                            </span>
                            {event.place && (
                              <span
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 3,
                                  fontSize: 11,
                                  color: "var(--muted)",
                                }}
                              >
                                <MapPin size={10} />
                                {event.place}
                              </span>
                            )}
                            <a
                              href={`/people/${event.personId}`}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 3,
                                fontSize: 11,
                                color: config.color,
                                textDecoration: "none",
                                fontWeight: 500,
                              }}
                            >
                              <User size={10} />
                              Profil
                            </a>
                          </div>
                        </div>

                        {/* Badge */}
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: config.color,
                            background: `${config.color}20`,
                            padding: "2px 7px",
                            borderRadius: 999,
                            flexShrink: 0,
                          }}
                        >
                          {config.label}
                        </span>
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
