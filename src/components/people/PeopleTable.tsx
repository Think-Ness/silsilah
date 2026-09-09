"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { User, MoreHorizontal, Eye, Pencil, Trash2, Search, Users, Share2, Shield } from "lucide-react";
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
  const { user, isSuperAdmin, isViewer, canEdit, canDelete } = useCurrentUser();
  const currentUserId = user?.id;

  const [activeTab, setActiveTab] = useState<"all" | "my" | "shared">("my");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // Klasifikasi data anggota: Milik Saya vs Dibagikan
  const myPeople = useMemo(() => {
    if (isSuperAdmin) return people;
    return people.filter((p) => !p.created_by || p.created_by === currentUserId);
  }, [people, currentUserId, isSuperAdmin]);

  const sharedPeople = useMemo(() => {
    if (isSuperAdmin) return [];
    return people.filter((p) => p.created_by && p.created_by !== currentUserId);
  }, [people, currentUserId, isSuperAdmin]);

  const hasSharedItems = sharedPeople.length > 0;

  const filteredPeople = useMemo(() => {
    let list = people;
    if (activeTab === "my") list = myPeople;
    if (activeTab === "shared") list = sharedPeople;

    if (!searchTerm.trim()) return list;
    const lower = searchTerm.toLowerCase();
    return list.filter(
      (p) =>
        p.full_name.toLowerCase().includes(lower) ||
        (p.display_name && p.display_name.toLowerCase().includes(lower)) ||
        (p.nickname && p.nickname.toLowerCase().includes(lower)) ||
        (p.birth_place && p.birth_place.toLowerCase().includes(lower))
    );
  }, [people, myPeople, sharedPeople, activeTab, searchTerm]);

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
    <div className="space-y-4">
      {/* Header Toolbar & Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        {/* Tab Filter */}
        <div className="inline-flex p-1 bg-slate-200/60 dark:bg-slate-800 rounded-xl gap-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === "all"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Semua ({people.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("my")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === "my"
                ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Data Saya ({myPeople.length})
          </button>
          {hasSharedItems && (
            <button
              type="button"
              onClick={() => setActiveTab("shared")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "shared"
                  ? "bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Share2 className="w-3 h-3 text-blue-500" />
              <span>Dibagikan ({sharedPeople.length})</span>
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari anggota keluarga..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="data-table" aria-label="Daftar anggota keluarga">
          <thead>
            <tr>
              <th style={{ width: 60 }}>Foto</th>
              <th>Nama</th>
              <th>Kepemilikan</th>
              <th>Jenis Kelamin</th>
              <th>Status</th>
              <th>Tempat</th>
              <th style={{ width: 80 }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredPeople.map((person) => {
              const isShared = person.created_by && person.created_by !== currentUserId && !isSuperAdmin;
              const canEditThisPerson = canEdit && (!isShared || isSuperAdmin);

              return (
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
                  <td>
                    {isShared ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        <Share2 className="w-2.5 h-2.5" /> Dibagikan
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Data Saya
                      </span>
                    )}
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
                        {canEditThisPerson && (
                          <DropdownMenuItem
                            onClick={() => window.location.href = `/people/${person.id}/edit`}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" /> Edit
                          </DropdownMenuItem>
                        )}
                        {canDelete && canEditThisPerson && (
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
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile list */}
      <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
        {filteredPeople.map((person) => {
          const isShared = person.created_by && person.created_by !== currentUserId && !isSuperAdmin;

          return (
            <Link
              key={person.id}
              href={`/people/${person.id}`}
              className="flex items-center gap-3 p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                {person.portrait ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getMediaUrl(person.portrait.storage_path)}
                    alt={getDisplayName(person)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {getDisplayName(person)}
                  </p>
                  {isShared && (
                    <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      Shared
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {person.gender === "male" ? "Laki-laki" : person.gender === "female" ? "Perempuan" : "—"}
                  {person.birth_place && ` · ${person.birth_place}`}
                </p>
              </div>
              <LifeStatusBadge status={person.life_status} />
            </Link>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      <DeletePersonDialog
        open={!!deleteTarget}
        personId={deleteTarget?.id || null}
        personName={deleteTarget?.name || ""}
        onClose={() => setDeleteTarget(null)}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}
