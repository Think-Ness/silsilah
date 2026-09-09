"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Network, Plus, Loader2, X, Search, User, Sparkles } from "lucide-react";
import { createCanvas } from "@/lib/genealogy/canvases";
import { useCurrentUser } from "@/context/UserRoleContext";
import type { Canvas, PersonWithPortrait } from "@/types/genealogy";

export interface CreateCanvasModalProps {
  open: boolean;
  people: PersonWithPortrait[];
  initialRootPersonId?: string | null;
  onClose: () => void;
  onSuccess: (newCanvas: Canvas) => void;
}

export function CreateCanvasModal({
  open,
  people,
  initialRootPersonId,
  onClose,
  onSuccess,
}: CreateCanvasModalProps) {
  const { user, isSuperAdmin } = useCurrentUser();
  const currentUserId = user?.id;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedRootPersonId, setSelectedRootPersonId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Hanya anggota milik user sendiri yang bisa dijadikan titik pusat silsilah baru
  const ownPeople = useMemo(() => {
    if (isSuperAdmin) return people;
    if (!currentUserId) return [];
    return people.filter((p) => p.created_by === currentUserId);
  }, [people, currentUserId, isSuperAdmin]);

  // Set initial state saat modal terbuka
  useEffect(() => {
    if (!open) return;

    if (initialRootPersonId) {
      const rootPerson = ownPeople.find((p) => p.id === initialRootPersonId);
      if (rootPerson) {
        setSelectedRootPersonId(initialRootPersonId);
        setTitle(`Silsilah Keluarga ${rootPerson.full_name}`);
        setDescription(`Pohon silsilah yang berpusat pada ${rootPerson.full_name} beserta leluhur dan seluruh keturunan.`);
      } else {
        setSelectedRootPersonId("");
        setTitle("");
        setDescription("");
      }
    } else {
      setTitle("");
      setDescription("");
      setSelectedRootPersonId("");
    }
    setSearchTerm("");
  }, [open, initialRootPersonId, ownPeople]);

  // Handle saat memilih tokoh utama
  const handleSelectRootPerson = (person: PersonWithPortrait) => {
    setSelectedRootPersonId(person.id);
    if (!title || title.startsWith("Silsilah Keluarga")) {
      setTitle(`Silsilah Keluarga ${person.full_name}`);
    }
    if (!description) {
      setDescription(`Pohon silsilah yang berpusat pada ${person.full_name} beserta leluhur dan seluruh keturunan.`);
    }
  };

  const filteredPeople = useMemo(() => {
    if (!searchTerm.trim()) return ownPeople.slice(0, 10);
    const lower = searchTerm.toLowerCase();
    return ownPeople
      .filter(
        (p) =>
          p.full_name.toLowerCase().includes(lower) ||
          (p.display_name && p.display_name.toLowerCase().includes(lower)) ||
          (p.nickname && p.nickname.toLowerCase().includes(lower))
      )
      .slice(0, 15);
  }, [ownPeople, searchTerm]);

  const selectedPerson = ownPeople.find((p) => p.id === selectedRootPersonId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Nama kanvas tidak boleh kosong");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createCanvas({
        title: title.trim(),
        description: description.trim() || null,
        root_person_id: selectedRootPersonId || null,
        is_default: false,
      });

      toast.success(`Kanvas "${created.title}" berhasil dibuat!`);
      onSuccess(created);
      onClose();
    } catch (err: any) {
      console.error("Gagal membuat kanvas:", err);
      toast.error(err.message || "Gagal membuat kanvas baru");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Network className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Buat Kanvas Silsilah Baru
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih tokoh utama (POV) untuk membuat pohon silsilah cabang keluarga
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Tokoh Utama (Root Person) */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Tokoh Utama (Titik Pusat Silsilah)</span>
              {selectedPerson && (
                <button
                  type="button"
                  onClick={() => setSelectedRootPersonId("")}
                  className="text-[11px] font-normal text-rose-500 hover:underline"
                >
                  Batal Pilih
                </button>
              )}
            </label>

            {selectedPerson ? (
              <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                    {selectedPerson.full_name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {selectedPerson.full_name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                      {selectedPerson.gender === "male" ? "Laki-laki" : selectedPerson.gender === "female" ? "Perempuan" : "-"} • {selectedPerson.life_status === "deceased" ? "Almarhum" : "Masih Hidup"}
                    </p>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                  Terpilih
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama anggota keluarga..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {filteredPeople.length > 0 ? (
                    filteredPeople.map((person) => (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => handleSelectRootPerson(person)}
                        className="w-full flex items-center justify-between p-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold text-xs">
                            {person.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-900 dark:text-white">
                              {person.full_name}
                            </p>
                            {person.display_name && (
                              <p className="text-[10px] text-slate-400">
                                ({person.display_name})
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 capitalize">
                          {person.gender === "male" ? "L" : "P"}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400">
                      {ownPeople.length === 0
                        ? "Belum ada anggota keluarga milik Anda. Anda tetap dapat membuat kanvas kosong."
                        : "Anggota tidak ditemukan"}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Nama Kanvas */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Nama Kanvas <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Silsilah Keluarga Sigap Dwi Aminullah"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Deskripsi */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Deskripsi / Catatan (Opsional)
            </label>
            <textarea
              rows={2}
              placeholder="Catatan mengenai garis silsilah kanvas ini..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Buat & Buka Kanvas</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
