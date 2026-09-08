"use client";

import { X, User, ArrowRight, Pencil, Trash2, UserPlus, Heart, Plus, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { PersonProfile } from "@/types/genealogy";
import { getMediaUrl } from "@/lib/genealogy/media";
import { useCurrentUser } from "@/context/UserRoleContext";

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
  const { isViewer, canEdit, canDelete } = useCurrentUser();
  const displayName = getDisplayName(profile);
  const primaryAddress = profile.addresses.find((a) => a.is_current) || profile.addresses[0];
  const isDeceased = profile.life_status === "deceased";

  const hasFather = profile.parents.some((p) => p.gender === "male");
  const hasMother = profile.parents.some((p) => p.gender === "female");
  const canAddSpouse = profile.gender === "female" ? profile.spouses.length === 0 : profile.spouses.length < 4;
  const canAddChild = profile.spouses.length > 0;

  const handleQuickAdd = (actionType: "add_father" | "add_mother" | "add_spouse" | "add_child") => {
    onClose();
    window.dispatchEvent(
      new CustomEvent("silsilah:quick-add", {
        detail: {
          targetPerson: profile,
          actionType,
          spouses: profile.spouses.map((s) => s.person),
        },
      })
    );
  };

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="lg:hidden rounded-t-2xl p-0 max-h-[85dvh] flex flex-col border-t border-[var(--border)] bg-[var(--surface)]"
        aria-label={`Profil ${displayName}`}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Profil {displayName}</SheetTitle>
        </SheetHeader>

        {/* Drag Indicator & Header Bar */}
        <div className="pt-3 pb-2 px-5 flex flex-col items-center border-b border-[var(--border)] flex-shrink-0">
          <div className="w-10 h-1 bg-[var(--border)] rounded-full mb-2" />
          <div className="w-full flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
              Detail Anggota
            </span>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--subtle)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 space-y-4">
          {/* Identity Header */}
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-[var(--subtle)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
              {profile.portrait ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getMediaUrl(profile.portrait.storage_path)}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-7 h-7 text-[var(--muted)]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[16px] font-bold text-[var(--foreground)] leading-snug truncate">
                {displayName}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[12px] text-[var(--muted)]">
                <span>
                  {profile.gender === "male"
                    ? "Laki-laki"
                    : profile.gender === "female"
                    ? "Perempuan"
                    : "—"}
                </span>
                {isDeceased && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    Almarhum
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Relationship Actions for Mobile (Tanpa perlu hover) — Tersembunyi untuk Viewer */}
          {!isViewer && (
            <div className="bg-[var(--subtle)]/60 p-3 rounded-xl border border-[var(--border)]">
              <div className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
                Tambah Relasi Cepat
              </div>
              <div className="flex flex-wrap gap-2">
                {!hasFather && (
                  <button
                    type="button"
                    onClick={() => handleQuickAdd("add_father")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 dark:bg-slate-800 hover:bg-blue-600 text-white text-[11px] font-medium shadow-sm transition-all active:scale-95 cursor-pointer"
                  >
                    <UserPlus className="w-3 h-3 text-blue-300" />
                    <span>+ Ayah</span>
                  </button>
                )}
                {!hasMother && (
                  <button
                    type="button"
                    onClick={() => handleQuickAdd("add_mother")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 dark:bg-slate-800 hover:bg-rose-600 text-white text-[11px] font-medium shadow-sm transition-all active:scale-95 cursor-pointer"
                  >
                    <UserPlus className="w-3 h-3 text-rose-300" />
                    <span>+ Ibu</span>
                  </button>
                )}
                {canAddSpouse && (
                  <button
                    type="button"
                    onClick={() => handleQuickAdd("add_spouse")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 dark:bg-slate-800 hover:bg-amber-600 text-white text-[11px] font-medium shadow-sm transition-all active:scale-95 cursor-pointer"
                  >
                    <Heart className="w-3 h-3 text-amber-300" />
                    <span>{profile.gender === "male" ? "+ Istri" : profile.gender === "female" ? "+ Suami" : "+ Pasangan"}</span>
                  </button>
                )}
                {canAddChild && (
                  <button
                    type="button"
                    onClick={() => handleQuickAdd("add_child")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-800 hover:bg-emerald-700 text-white text-[11px] font-medium shadow-sm transition-all active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-emerald-200" />
                    <span>+ Anak</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Silsilah Family Info */}
          <div className="space-y-3 pt-1">
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
                <div className="flex items-center justify-between">
                  <div className="font-medium text-[var(--foreground)]">{profile.children.length} anak</div>
                  {profile.children.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        window.dispatchEvent(
                          new CustomEvent("silsilah:reorder-children", {
                            detail: {
                              parentId: profile.id,
                              parentName: displayName,
                            },
                          })
                        );
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 transition-colors cursor-pointer"
                    >
                      <ArrowUpDown className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      Atur Urutan
                    </button>
                  )}
                </div>
                <div className="text-[12px] text-[var(--muted)] mt-1">
                  {profile.children.slice(0, 4).map((c) => getDisplayName(c)).join(", ")}
                  {profile.children.length > 4 && ` dan ${profile.children.length - 4} lainnya`}
                </div>
              </InfoRow>
            )}
            {primaryAddress && (
              <InfoRow label="Lokasi">
                {[primaryAddress.city_regency, primaryAddress.province].filter(Boolean).join(", ") || primaryAddress.address_line}
              </InfoRow>
            )}
          </div>
        </div>

        {/* Footer Actions with Safe Area Padding */}
        <div
          className="p-4 pt-3 border-t border-[var(--border)] bg-[var(--surface)] flex flex-col gap-2 flex-shrink-0"
          style={{ paddingBottom: "max(18px, env(safe-area-inset-bottom))" }}
        >
          <Link
            href={`/people/${profile.id}`}
            id={`sheet-view-profile-${profile.id}`}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-[var(--foreground)] text-[var(--surface)] rounded-lg text-[13px] font-medium transition-opacity active:opacity-90"
          >
            Lihat Profil Lengkap
            <ArrowRight className="w-4 h-4" />
          </Link>

          {(canEdit || canDelete) && (
            <div className="flex gap-2">
              {canEdit && (
                <Link
                  href={`/people/${profile.id}/edit`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-[var(--border)] text-[12px] font-medium text-[var(--foreground)] hover:bg-[var(--subtle)] transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5 text-[var(--muted)]" />
                  Edit Profil
                </Link>
              )}
              {canDelete && (
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
                  className="inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg border border-red-200 dark:border-red-950/40 text-[12px] font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                  title="Hapus Anggota (Khusus Super Admin)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus
                </button>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="text-[12px] text-[var(--muted)] w-20 flex-shrink-0 pt-0.5">
        {label}
      </div>
      <div className="text-[13px] text-[var(--foreground)] flex-1 font-medium">
        {children}
      </div>
    </div>
  );
}
