"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { UserPlus, Heart, Plus, Loader2, X } from "lucide-react";
import { createPerson } from "@/lib/genealogy/people";
import {
  createParentChildRelationship,
  createUnion,
  getUnionBetweenPeople,
} from "@/lib/genealogy/relationships";
import type { PersonWithPortrait } from "@/types/genealogy";

export type QuickAddActionType = "add_father" | "add_mother" | "add_spouse" | "add_child";

export interface QuickAddModalProps {
  open: boolean;
  actionType: QuickAddActionType | null;
  targetPerson: PersonWithPortrait | null;
  spouses?: PersonWithPortrait[];
  onClose: () => void;
  onSuccess: () => void;
}

export function QuickAddMemberModal({
  open,
  actionType,
  targetPerson,
  spouses = [],
  onClose,
  onSuccess,
}: QuickAddModalProps) {
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [prefixTitle, setPrefixTitle] = useState("");
  const [suffixTitle, setSuffixTitle] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [lifeStatus, setLifeStatus] = useState<"living" | "deceased">("living");
  const [birthDate, setBirthDate] = useState("");
  const [deathDate, setDeathDate] = useState("");
  const [biologicalStatus, setBiologicalStatus] = useState<"biological" | "adoptive" | "step">("biological");
  const [selectedSpouseId, setSelectedSpouseId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Inisialisasi default berdasarkan tipe aksi dan targetPerson
  useEffect(() => {
    if (!open || !targetPerson || !actionType) return;

    setFullName("");
    setNickname("");
    setPrefixTitle("");
    setSuffixTitle("");
    setBirthDate("");
    setDeathDate("");
    setBiologicalStatus("biological");

    if (actionType === "add_father") {
      setGender("male");
      setLifeStatus("living");
    } else if (actionType === "add_mother") {
      setGender("female");
      setLifeStatus("living");
    } else if (actionType === "add_spouse") {
      setGender(targetPerson.gender === "male" ? "female" : "male");
      setLifeStatus("living");
    } else if (actionType === "add_child") {
      setGender("male");
      setLifeStatus("living");
      if (spouses.length > 0) {
        setSelectedSpouseId(spouses[0].id);
      } else {
        setSelectedSpouseId("");
      }
    }
  }, [open, actionType, targetPerson, spouses]);

  if (!open || !targetPerson || !actionType) return null;

  const targetName = targetPerson.display_name || targetPerson.full_name;

  const getModalMeta = () => {
    switch (actionType) {
      case "add_father":
        return {
          title: "Tambah Ayah Kandung",
          subtitle: `Menambahkan orang tua (ayah) untuk ${targetName}`,
          icon: <UserPlus className="w-4 h-4 text-blue-600" />,
        };
      case "add_mother":
        return {
          title: "Tambah Ibu Kandung",
          subtitle: `Menambahkan orang tua (ibu) untuk ${targetName}`,
          icon: <UserPlus className="w-4 h-4 text-rose-600" />,
        };
      case "add_spouse":
        return {
          title: targetPerson.gender === "male" ? "Tambah Istri" : "Tambah Suami",
          subtitle: `Mencatat pernikahan dengan ${targetName}`,
          icon: <Heart className="w-4 h-4 text-amber-600" />,
        };
      case "add_child":
        return {
          title: "Tambah Anak",
          subtitle: `Menambahkan keturunan dari ${targetName}`,
          icon: <Plus className="w-4 h-4 text-emerald-600" />,
        };
    }
  };

  const meta = getModalMeta();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Nama lengkap wajib diisi");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Buat data orang baru
      const newPerson = await createPerson({
        full_name: fullName.trim(),
        nickname: nickname.trim() || undefined,
        prefix_title: prefixTitle.trim() || undefined,
        suffix_title: suffixTitle.trim() || undefined,
        gender,
        life_status: lifeStatus,
        visibility: "public",
        birth_date: birthDate || undefined,
        death_date: lifeStatus === "deceased" ? deathDate || undefined : undefined,
      });

      // 2. Hubungkan relasi sesuai aksi
      if (actionType === "add_father" || actionType === "add_mother") {
        await createParentChildRelationship({
          parent_id: newPerson.id,
          child_id: targetPerson.id,
          relationship_type: "parent",
          biological_status: "biological",
        });
      } else if (actionType === "add_spouse") {
        await createUnion({
          person_a_id: targetPerson.id,
          person_b_id: newPerson.id,
          relationship_type: "marriage",
          status: "active",
        });
      } else if (actionType === "add_child") {
        let matchedUnionId: string | undefined;
        if (selectedSpouseId) {
          const union = await getUnionBetweenPeople(targetPerson.id, selectedSpouseId);
          if (union) {
            matchedUnionId = union.id;
          }
        }

        // Relasi ke target person
        await createParentChildRelationship({
          parent_id: targetPerson.id,
          child_id: newPerson.id,
          union_id: matchedUnionId,
          relationship_type: "parent",
          biological_status: biologicalStatus,
        });

        // Relasi ke pasangan yang dipilih
        if (selectedSpouseId) {
          await createParentChildRelationship({
            parent_id: selectedSpouseId,
            child_id: newPerson.id,
            union_id: matchedUnionId,
            relationship_type: "parent",
            biological_status: biologicalStatus,
          });
        }
      }

      toast.success(`Berhasil menambahkan ${fullName.trim()} ke silsilah!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Gagal menambahkan anggota silsilah:", err);
      toast.error(err.message || "Terjadi kesalahan saat menyimpan data");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in-0"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] bg-[var(--subtle)]/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] shadow-xs">
              {meta.icon}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                {meta.title}
              </h3>
              <p className="text-xs text-[var(--muted)]">
                {meta.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] rounded-md hover:bg-[var(--subtle)] transition-colors"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Gelar Depan & Nama Lengkap */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                Gelar Depan
              </label>
              <input
                type="text"
                placeholder="H. / Hj. / TGH."
                value={prefixTitle}
                onChange={(e) => setPrefixTitle(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[var(--border)] bg-[var(--surface)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Contoh: Muhammad Yusuf"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[var(--border)] bg-[var(--surface)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-medium"
              />
            </div>
          </div>

          {/* Nama Panggilan & Gelar Belakang */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                Nama Panggilan / Alias
              </label>
              <input
                type="text"
                placeholder="Contoh: Yusuf"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[var(--border)] bg-[var(--surface)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                Gelar Belakang
              </label>
              <input
                type="text"
                placeholder="Contoh: S.Pd / Lc. / M.Ag"
                value={suffixTitle}
                onChange={(e) => setSuffixTitle(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[var(--border)] bg-[var(--surface)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Jenis Kelamin & Status Hidup */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1">
                Jenis Kelamin
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGender("male")}
                  disabled={actionType === "add_father" || actionType === "add_mother"}
                  className={`px-3 py-1.5 text-xs rounded-md font-medium border text-center transition-all ${
                    gender === "male"
                      ? "border-blue-600 bg-blue-50/50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-semibold"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--subtle)]"
                  }`}
                >
                  Laki-laki
                </button>
                <button
                  type="button"
                  onClick={() => setGender("female")}
                  disabled={actionType === "add_father" || actionType === "add_mother"}
                  className={`px-3 py-1.5 text-xs rounded-md font-medium border text-center transition-all ${
                    gender === "female"
                      ? "border-rose-600 bg-rose-50/50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-semibold"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--subtle)]"
                  }`}
                >
                  Perempuan
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1">
                Status Kehidupan
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLifeStatus("living")}
                  className={`px-3 py-1.5 text-xs rounded-md font-medium border text-center transition-all ${
                    lifeStatus === "living"
                      ? "border-emerald-600 bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--subtle)]"
                  }`}
                >
                  Masih Hidup
                </button>
                <button
                  type="button"
                  onClick={() => setLifeStatus("deceased")}
                  className={`px-3 py-1.5 text-xs rounded-md font-medium border text-center transition-all ${
                    lifeStatus === "deceased"
                      ? "border-slate-600 bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 font-semibold"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--subtle)]"
                  }`}
                >
                  Telah Wafat
                </button>
              </div>
            </div>
          </div>

          {/* Jika Aksi Tambah Anak: Pilihan Pasangan & Status Hubungan */}
          {actionType === "add_child" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-[var(--subtle)]/40 border border-[var(--border)]">
              {spouses.length > 1 && (
                <div>
                  <label className="block text-xs font-medium text-[var(--foreground)] mb-1">
                    Orang Tua Pasangan
                  </label>
                  <select
                    value={selectedSpouseId}
                    onChange={(e) => setSelectedSpouseId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[var(--border)] bg-[var(--surface)] outline-none"
                  >
                    {spouses.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.display_name || sp.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className={spouses.length <= 1 ? "sm:col-span-2" : ""}>
                <label className="block text-xs font-medium text-[var(--foreground)] mb-1">
                  Status Hubungan Anak
                </label>
                <select
                  value={biologicalStatus}
                  onChange={(e) => setBiologicalStatus(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[var(--border)] bg-[var(--surface)] outline-none"
                >
                  <option value="biological">Anak Kandung</option>
                  <option value="adoptive">Anak Adopsi</option>
                  <option value="step">Anak Tiri</option>
                </select>
              </div>
            </div>
          )}

          {/* Tanggal Lahir & Wafat */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                Tanggal Lahir
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[var(--border)] bg-[var(--surface)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            {lifeStatus === "deceased" && (
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                  Tanggal Wafat
                </label>
                <input
                  type="date"
                  value={deathDate}
                  onChange={(e) => setDeathDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[var(--border)] bg-[var(--surface)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--subtle)] transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Simpan & Tambahkan</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
