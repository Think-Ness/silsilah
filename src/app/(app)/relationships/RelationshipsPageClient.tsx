"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, HeartHandshake, Users, Share2, Search } from "lucide-react";
import { getUnionMortalityInfo } from "@/lib/genealogy/relationships";
import { useCurrentUser } from "@/context/UserRoleContext";
import type { Union, ParentChildRelationship, PersonWithPortrait } from "@/types/genealogy";

interface RelationshipsPageClientProps {
  unions: Union[];
  parentChildRels: ParentChildRelationship[];
  people: PersonWithPortrait[];
  unionMembers: any[];
}

function getDisplayName(p: { prefix_title?: string | null; display_name?: string | null; full_name: string }) {
  return [p.prefix_title, p.display_name || p.full_name].filter(Boolean).join(" ");
}

export function RelationshipsPageClient({
  unions,
  parentChildRels,
  people,
  unionMembers,
}: RelationshipsPageClientProps) {
  const { user, isSuperAdmin, canEdit } = useCurrentUser();
  const currentUserId = user?.id;

  const [activeTab, setActiveTab] = useState<"all" | "my" | "shared">("all");
  const [searchTerm, setSearchTerm] = useState("");

  const peopleMap = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  // Klasifikasi data Unions
  const myUnions = useMemo(() => {
    if (isSuperAdmin) return unions;
    return unions.filter((u) => !u.created_by || u.created_by === currentUserId);
  }, [unions, currentUserId, isSuperAdmin]);

  const sharedUnions = useMemo(() => {
    if (isSuperAdmin) return [];
    return unions.filter((u) => u.created_by && u.created_by !== currentUserId);
  }, [unions, currentUserId, isSuperAdmin]);

  // Klasifikasi data Parent-Child
  const myParentChildRels = useMemo(() => {
    if (isSuperAdmin) return parentChildRels;
    return parentChildRels.filter((r) => !r.created_by || r.created_by === currentUserId);
  }, [parentChildRels, currentUserId, isSuperAdmin]);

  const sharedParentChildRels = useMemo(() => {
    if (isSuperAdmin) return [];
    return parentChildRels.filter((r) => r.created_by && r.created_by !== currentUserId);
  }, [parentChildRels, currentUserId, isSuperAdmin]);

  const hasSharedItems = sharedUnions.length > 0 || sharedParentChildRels.length > 0;

  // Filter Unions
  const filteredUnions = useMemo(() => {
    let list = unions;
    if (activeTab === "my") list = myUnions;
    if (activeTab === "shared") list = sharedUnions;

    if (!searchTerm.trim()) return list;
    const lower = searchTerm.toLowerCase();

    return list.filter((u) => {
      const members = unionMembers.filter((um: any) => um.union_id === u.id);
      const p1 = members[0] ? peopleMap.get(members[0].person_id) : null;
      const p2 = members[1] ? peopleMap.get(members[1].person_id) : null;
      const name1 = p1 ? getDisplayName(p1).toLowerCase() : "";
      const name2 = p2 ? getDisplayName(p2).toLowerCase() : "";
      return name1.includes(lower) || name2.includes(lower);
    });
  }, [unions, myUnions, sharedUnions, activeTab, searchTerm, unionMembers, peopleMap]);

  // Filter Parent-Child
  const filteredParentChildRels = useMemo(() => {
    let list = parentChildRels;
    if (activeTab === "my") list = myParentChildRels;
    if (activeTab === "shared") list = sharedParentChildRels;

    if (!searchTerm.trim()) return list;
    const lower = searchTerm.toLowerCase();

    return list.filter((r) => {
      const parent = peopleMap.get(r.parent_id);
      const child = peopleMap.get(r.child_id);
      const pName = parent ? getDisplayName(parent).toLowerCase() : "";
      const cName = child ? getDisplayName(child).toLowerCase() : "";
      return pName.includes(lower) || cName.includes(lower);
    });
  }, [parentChildRels, myParentChildRels, sharedParentChildRels, activeTab, searchTerm, peopleMap]);

  return (
    <div className="page-content space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Hubungan Keluarga</h1>
          <p className="page-subtitle">
            {unions.length} pernikahan/pasangan · {parentChildRels.length} hubungan ortu-anak
          </p>
        </div>
        {canEdit && (
          <Link
            href="/relationships/new"
            id="add-relationship-button"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:bg-emerald-600 dark:hover:bg-emerald-400 dark:hover:text-white transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Hubungan</span>
          </Link>
        )}
      </div>

      {/* Toolbar: Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl gap-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === "all"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Semua ({unions.length + parentChildRels.length})
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
            Data Saya ({myUnions.length + myParentChildRels.length})
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
              <span>Dibagikan ({sharedUnions.length + sharedParentChildRels.length})</span>
            </button>
          )}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama pasangan/anak..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* Unions Section */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Pernikahan & Pasangan ({filteredUnions.length})
        </h2>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          {filteredUnions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Belum ada data pernikahan/pasangan untuk filter ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Pasangan</th>
                    <th>Kepemilikan</th>
                    <th>Jenis Hubungan</th>
                    <th>Status</th>
                    <th>Tanggal Pernikahan</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUnions.map((union) => {
                    const members = unionMembers.filter((um: any) => um.union_id === union.id);
                    const p1 = members[0] ? peopleMap.get(members[0].person_id) : null;
                    const p2 = members[1] ? peopleMap.get(members[1].person_id) : null;
                    const isShared = union.created_by && union.created_by !== currentUserId && !isSuperAdmin;

                    return (
                      <tr key={union.id}>
                        <td>
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {p1 ? (
                              <Link href={`/people/${p1.id}`} className="hover:text-emerald-600">
                                {getDisplayName(p1)}
                              </Link>
                            ) : (
                              "Anggota"
                            )}
                            {" & "}
                            {p2 ? (
                              <Link href={`/people/${p2.id}`} className="hover:text-emerald-600">
                                {getDisplayName(p2)}
                              </Link>
                            ) : (
                              "Anggota"
                            )}
                          </span>
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
                        <td className="text-xs text-slate-500">
                          {union.relationship_type === "marriage" ? "Pernikahan" : union.relationship_type}
                        </td>
                        <td>
                          {(() => {
                            const info = getUnionMortalityInfo([p1, p2], union);
                            return (
                              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {info.statusLabel}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="text-xs text-slate-500">
                          {(() => {
                            const info = getUnionMortalityInfo([p1, p2], union);
                            return info.dateSummary || union.start_date || "—";
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Parent-Child Section */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Hubungan Orang Tua - Anak ({filteredParentChildRels.length})
        </h2>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          {filteredParentChildRels.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Belum ada data hubungan ortu-anak untuk filter ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Orang Tua</th>
                    <th>Anak</th>
                    <th>Kepemilikan</th>
                    <th>Jenis</th>
                    <th>Status Biologis</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParentChildRels.map((rel) => {
                    const parent = peopleMap.get(rel.parent_id);
                    const child = peopleMap.get(rel.child_id);
                    const isShared = rel.created_by && rel.created_by !== currentUserId && !isSuperAdmin;

                    return (
                      <tr key={rel.id}>
                        <td className="text-sm font-semibold">
                          {parent ? (
                            <Link href={`/people/${parent.id}`} className="hover:text-emerald-600">
                              {getDisplayName(parent)}
                            </Link>
                          ) : (
                            rel.parent_id.slice(0, 8)
                          )}
                        </td>
                        <td className="text-sm font-semibold">
                          {child ? (
                            <Link href={`/people/${child.id}`} className="hover:text-emerald-600">
                              {getDisplayName(child)}
                            </Link>
                          ) : (
                            rel.child_id.slice(0, 8)
                          )}
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
                        <td className="text-xs text-slate-500">
                          {rel.relationship_type === "parent" ? "Orang Tua" : "Wali"}
                        </td>
                        <td className="text-xs text-slate-500">
                          {rel.biological_status === "biological"
                            ? "Biologis"
                            : rel.biological_status === "adoptive"
                            ? "Adoptif"
                            : rel.biological_status === "step"
                            ? "Tiri"
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
