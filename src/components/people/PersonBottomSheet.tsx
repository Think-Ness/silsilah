"use client";

import { X, User, ArrowRight, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { PersonProfile } from "@/types/genealogy";
import { getMediaUrl } from "@/lib/genealogy/media";

interface PersonBottomSheetProps {
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

export function PersonBottomSheet({ profile, onClose }: PersonBottomSheetProps) {
  const displayName = getDisplayName(profile);
  const primaryAddress = profile.addresses.find((a) => a.is_current) || profile.addresses[0];

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="lg:hidden rounded-t-xl"
        style={{ maxHeight: "80dvh", overflow: "hidden", display: "flex", flexDirection: "column" }}
        aria-label={`Profil ${displayName}`}
      >
        {/* Drag indicator */}
        <div style={{ width: 40, height: 4, background: "var(--border)", borderRadius: 2, margin: "0 auto 16px" }} />

        <SheetHeader className="sr-only">
          <SheetTitle>Profil {displayName}</SheetTitle>
        </SheetHeader>

        <div style={{ flex: 1, overflowY: "auto", paddingBottom: "16px" }}>
          {/* Photo + Name */}
          <div style={{ display: "flex", gap: "14px", alignItems: "center", marginBottom: "20px" }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                overflow: "hidden",
                background: "var(--subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
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
                <User className="w-6 h-6 text-[var(--muted)]" />
              )}
            </div>
            <div>
              <div style={{ fontSize: "16px", fontWeight: 600 }}>{displayName}</div>
              <div style={{ fontSize: "13px", color: "var(--muted)" }}>
                {profile.gender === "male" ? "Laki-laki" : profile.gender === "female" ? "Perempuan" : "—"}
              </div>
            </div>
          </div>

          {/* Info rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {profile.parents.length > 0 && (
              <InfoRow label="Orang Tua">
                {profile.parents.map((p) => getDisplayName(p)).join(" + ")}
              </InfoRow>
            )}
            {profile.spouses.length > 0 && (
              <InfoRow label="Pasangan">
                {profile.spouses.map(({ person }) => getDisplayName(person)).join(", ")}
              </InfoRow>
            )}
            {profile.children.length > 0 && (
              <InfoRow label="Anak">
                {profile.children.length} anak
              </InfoRow>
            )}
            {primaryAddress && (
              <InfoRow label="Lokasi">
                {[primaryAddress.city_regency, primaryAddress.province].filter(Boolean).join(", ")}
              </InfoRow>
            )}
          </div>
        </div>

        {/* CTA */}
        <div style={{ paddingTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <Link
            href={`/people/${profile.id}`}
            id={`sheet-view-profile-${profile.id}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              width: "100%",
              padding: "10px 16px",
              background: "var(--foreground)",
              color: "var(--surface)",
              borderRadius: "var(--radius-md)",
              fontSize: "13px",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Lihat Profil Lengkap
            <ArrowRight className="w-4 h-4" />
          </Link>

          <div style={{ display: "flex", gap: "8px" }}>
            <Link
              href={`/people/${profile.id}/edit`}
              style={{
                flex: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "8px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                fontSize: "12px",
                fontWeight: 500,
                color: "var(--foreground)",
                textDecoration: "none",
              }}
            >
              <Pencil className="w-3.5 h-3.5 text-[var(--muted)]" />
              Edit
            </Link>
            <button
              type="button"
              onClick={() => {
                onClose();
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
                padding: "8px 14px",
                borderRadius: "var(--radius-md)",
                border: "1px solid rgba(220, 38, 38, 0.3)",
                fontSize: "12px",
                fontWeight: 500,
                color: "#DC2626",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Hapus
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: "12px" }}>
      <div style={{ fontSize: "12px", color: "var(--muted)", width: 80, flexShrink: 0, paddingTop: "1px" }}>
        {label}
      </div>
      <div style={{ fontSize: "14px", color: "var(--foreground)", flex: 1 }}>
        {children}
      </div>
    </div>
  );
}
