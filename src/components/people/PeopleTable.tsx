"use client";

import { useState } from "react";
import Link from "next/link";
import { User, MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import type { PersonWithPortrait } from "@/types/genealogy";
import { getMediaUrl } from "@/lib/genealogy/media";
import { DeletePersonDialog } from "@/components/people/DeletePersonDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentUser } from "@/context/UserRoleContext";

interface PeopleTableProps {
  people: PersonWithPortrait[];
}

function getDisplayName(p: PersonWithPortrait): string {
  const parts: string[] = [];
  if (p.prefix_title) parts.push(p.prefix_title);
  parts.push(p.display_name || p.full_name);
  if (p.suffix_title) parts.push(p.suffix_title);
  return parts.join(" ");
}

function LifeStatusBadge({ status }: { status: string }) {
  const classes = {
    living: "badge-living",
    deceased: "badge-deceased",
    unknown: "badge-unknown",
  }[status] || "badge-unknown";

  const labels = {
    living: "Hidup",
    deceased: "Almarhum",
    unknown: "Tidak diketahui",
  } as Record<string, string>;

  return (
    <span
      className={classes}
      style={{
        fontSize: "11px",
        fontWeight: 500,
        padding: "2px 8px",
        borderRadius: "4px",
        display: "inline-block",
      }}
    >
      {labels[status] || status}
    </span>
  );
}

export function PeopleTable({ people }: PeopleTableProps) {
  const { canEdit, canDelete } = useCurrentUser();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  if (people.length === 0) {
    return (
      <div className="empty-state" style={{ padding: "48px 24px" }}>
        <div className="empty-state-title">Belum ada anggota</div>
        <p className="empty-state-description">
          Mulai dokumentasikan silsilah keluarga dengan menambahkan anggota pertama.
        </p>
        <Link
          href="/people/new"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 16px",
            background: "var(--foreground)",
            color: "var(--surface)",
            borderRadius: "var(--radius-md)",
            fontSize: "13px",
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          Tambah Anggota
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="data-table" aria-label="Daftar anggota keluarga">
          <thead>
            <tr>
              <th style={{ width: 60 }}>Foto</th>
              <th>Nama</th>
              <th>Jenis Kelamin</th>
              <th>Status</th>
              <th>Tempat</th>
              <th style={{ width: 80 }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {people.map((person) => (
              <tr key={person.id}>
                <td>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      overflow: "hidden",
                      background: "var(--subtle)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {person.portrait ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getMediaUrl(person.portrait.storage_path)}
                        alt={getDisplayName(person)}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <User className="w-4 h-4 text-[var(--muted)]" />
                    )}
                  </div>
                </td>
                <td>
                  <div>
                    <Link
                      href={`/people/${person.id}`}
                      style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)", textDecoration: "none" }}
                      className="hover:text-[var(--accent-color)] transition-colors"
                    >
                      {getDisplayName(person)}
                    </Link>
                    {person.nickname && (
                      <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                        &ldquo;{person.nickname}&rdquo;
                      </div>
                    )}
                  </div>
                </td>
                <td style={{ fontSize: "13px", color: "var(--muted)" }}>
                  {person.gender === "male" ? "Laki-laki" : person.gender === "female" ? "Perempuan" : "—"}
                </td>
                <td>
                  <LifeStatusBadge status={person.life_status} />
                </td>
                <td style={{ fontSize: "13px", color: "var(--muted)" }}>
                  {person.birth_place || "—"}
                </td>
                <td>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      id={`person-actions-${person.id}`}
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--subtle)] transition-colors"
                      aria-label={`Aksi untuk ${getDisplayName(person)}`}
                    >
                      <MoreHorizontal className="w-4 h-4 text-[var(--muted)]" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => window.location.href = `/people/${person.id}`}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Eye className="w-4 h-4" /> Lihat Profil
                      </DropdownMenuItem>
                      {canEdit && (
                        <DropdownMenuItem
                          onClick={() => window.location.href = `/people/${person.id}/edit`}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" /> Edit
                        </DropdownMenuItem>
                      )}
                      {canDelete && (
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget({ id: person.id, name: getDisplayName(person) })}
                          className="text-red-600 focus:text-red-700 flex items-center gap-2 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" /> Hapus Anggota
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile list */}
      <div className="md:hidden">
        {people.map((person) => (
          <Link
            key={person.id}
            href={`/people/${person.id}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "14px 16px",
              borderBottom: "1px solid var(--border)",
              textDecoration: "none",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                overflow: "hidden",
                background: "var(--subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {person.portrait ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getMediaUrl(person.portrait.storage_path)}
                  alt={getDisplayName(person)}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <User className="w-5 h-5 text-[var(--muted)]" />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)", marginBottom: "2px" }}>
                {getDisplayName(person)}
              </div>
              <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                {person.gender === "male" ? "Laki-laki" : person.gender === "female" ? "Perempuan" : "—"}
                {person.birth_place && ` · ${person.birth_place}`}
              </div>
            </div>
            <LifeStatusBadge status={person.life_status} />
          </Link>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      <DeletePersonDialog
        open={!!deleteTarget}
        personId={deleteTarget?.id || null}
        personName={deleteTarget?.name || ""}
        onClose={() => setDeleteTarget(null)}
        onSuccess={() => window.location.reload()}
      />
    </>
  );
}
