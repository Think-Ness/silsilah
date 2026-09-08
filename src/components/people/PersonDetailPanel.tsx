"use client";

import { X, User, ArrowRight, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import type { PersonProfile } from "@/types/genealogy";
import { getMediaUrl } from "@/lib/genealogy/media";

interface PersonDetailPanelProps {
  profile: PersonProfile;
  onClose: () => void;
}

function getDisplayName(p: { prefix_title?: string | null; display_name?: string | null; full_name: string; suffix_title?: string | null }): string {
  const parts: string[] = [];
  if (p.prefix_title) parts.push(p.prefix_title);
  parts.push(p.display_name || p.full_name);
  if (p.suffix_title) parts.push(p.suffix_title);
  return parts.join(" ");
}

export function PersonDetailPanel({ profile, onClose }: PersonDetailPanelProps) {
  const displayName = getDisplayName(profile);
  const primaryAddress = profile.addresses.find((a) => a.is_current) || profile.addresses[0];
  const whatsapp = profile.contacts.find((c) => c.contact_type === "whatsapp");

  return (
    <aside
      className="profile-panel w-full h-full"
      style={{ boxSizing: "border-box" }}
      aria-label={`Profil ${displayName}`}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <h2 style={{ fontSize: "13px", fontWeight: 600, color: "var(--muted)", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Profil
        </h2>
        <button
          id="close-profile-panel"
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--subtle)] transition-colors cursor-pointer"
          aria-label="Tutup panel profil"
        >
          <X className="w-4 h-4 text-[var(--muted)]" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Photo + Name */}
        <div style={{ padding: "20px 16px 16px", textAlign: "center", borderBottom: "1px solid var(--border)" }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              overflow: "hidden",
              background: "var(--subtle)",
              margin: "0 auto 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {profile.portrait ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getMediaUrl(profile.portrait.storage_path)}
                alt={displayName}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <User className="w-8 h-8 text-[var(--muted)]" />
            )}
          </div>

          <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--foreground)", marginBottom: "4px" }}>
            {displayName}
          </div>
          <div style={{ fontSize: "13px", color: "var(--muted)" }}>
            {profile.gender === "male"
              ? "Laki-laki"
              : profile.gender === "female"
              ? "Perempuan"
              : "—"}
            {profile.life_status === "deceased" && (
              <span style={{ marginLeft: "8px", fontSize: "11px", background: "var(--subtle)", padding: "1px 6px", borderRadius: "3px" }}>
                Almarhum
              </span>
            )}
          </div>
        </div>

        {/* Details */}
        <div style={{ padding: "16px" }}>
          {/* Parents */}
          {profile.parents.length > 0 && (
            <Section title="Orang Tua">
              <div style={{ fontSize: "13px", color: "var(--foreground)" }}>
                {profile.parents.map((p) => getDisplayName(p)).join(" + ")}
              </div>
            </Section>
          )}

          {/* Spouses */}
          {profile.spouses.length > 0 && (
            <Section title="Pasangan">
              {profile.spouses.map(({ person, union }) => (
                <div key={person.id} style={{ fontSize: "13px", color: "var(--foreground)", marginBottom: "4px" }}>
                  {getDisplayName(person)}
                  <span style={{ fontSize: "11px", color: "var(--muted)", marginLeft: "6px" }}>
                    {union.relationship_type === "marriage" ? "Menikah" : union.relationship_type}
                  </span>
                </div>
              ))}
            </Section>
          )}

          {/* Children */}
          {profile.children.length > 0 && (
            <Section title="Anak">
              <div style={{ fontSize: "13px", color: "var(--foreground)" }}>
                {profile.children.length} anak
              </div>
              <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                {profile.children.slice(0, 3).map((c) => getDisplayName(c)).join(", ")}
                {profile.children.length > 3 && ` dan ${profile.children.length - 3} lainnya`}
              </div>
            </Section>
          )}

          {/* Location */}
          {primaryAddress && (
            <Section title="Lokasi">
              <div style={{ fontSize: "13px", color: "var(--foreground)" }}>
                {[primaryAddress.city_regency, primaryAddress.province]
                  .filter(Boolean)
                  .join(", ") || primaryAddress.address_line}
              </div>
            </Section>
          )}

          {/* Contact */}
          {whatsapp && (
            <Section title="Kontak">
              <div style={{ fontSize: "13px", color: "var(--foreground)" }}>
                <a
                  href={`https://wa.me/${whatsapp.value.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent-color)", textDecoration: "none" }}
                >
                  WhatsApp
                </a>
              </div>
            </Section>
          )}
        </div>
      </div>

      {/* Footer — View Full Profile & Actions */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
        <Link
          href={`/people/${profile.id}`}
          id={`view-profile-${profile.id}`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            width: "100%",
            padding: "8px 16px",
            background: "var(--foreground)",
            color: "var(--surface)",
            borderRadius: "var(--radius-md)",
            fontSize: "13px",
            fontWeight: 500,
            textDecoration: "none",
            transition: "opacity 150ms",
          }}
        >
          Lihat profil lengkap
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>

        <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
          <Link
            href={`/people/${profile.id}/edit`}
            style={{
              flex: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              fontSize: "12px",
              fontWeight: 500,
              color: "var(--foreground)",
              textDecoration: "none",
            }}
            className="hover:bg-[var(--subtle)] transition-colors"
          >
            <Pencil className="w-3.5 h-3.5 text-[var(--muted)]" />
            Edit
          </Link>
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("silsilah:delete-person", {
                  detail: {
                    personId: profile.id,
                    personName: displayName,
                  },
                })
              );
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid rgba(220, 38, 38, 0.3)",
              fontSize: "12px",
              fontWeight: 500,
              color: "#DC2626",
              background: "transparent",
              cursor: "pointer",
            }}
            className="hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Hapus
          </button>
        </div>
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <div
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: "var(--muted)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: "6px",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}
