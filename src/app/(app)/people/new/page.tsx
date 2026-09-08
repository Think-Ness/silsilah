"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createPerson } from "@/lib/genealogy/people";
import type { CreatePersonInput, Gender, LifeStatus, DatePrecision, Visibility } from "@/types/genealogy";
import { toast } from "sonner";

export default function NewPersonPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<CreatePersonInput>({
    full_name: "",
    display_name: "",
    nickname: "",
    prefix_title: "",
    suffix_title: "",
    gender: "unknown" as Gender,
    birth_date: "",
    birth_date_precision: "unknown" as DatePrecision,
    birth_place: "",
    death_date: "",
    death_date_precision: "unknown" as DatePrecision,
    death_place: "",
    life_status: "unknown" as LifeStatus,
    biography: "",
    occupation: "",
    education: "",
    notes: "",
    visibility: "family" as Visibility,
  });

  function updateField<K extends keyof CreatePersonInput>(
    key: K,
    value: CreatePersonInput[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) {
      toast.error("Nama lengkap wajib diisi");
      return;
    }

    setLoading(true);
    try {
      const person = await createPerson({
        ...form,
        display_name: form.display_name || undefined,
        nickname: form.nickname || undefined,
        prefix_title: form.prefix_title || undefined,
        suffix_title: form.suffix_title || undefined,
        birth_date: form.birth_date || undefined,
        birth_place: form.birth_place || undefined,
        death_date: form.death_date || undefined,
        death_place: form.death_place || undefined,
        biography: form.biography || undefined,
        occupation: form.occupation || undefined,
        education: form.education || undefined,
        notes: form.notes || undefined,
      });
      toast.success(`${form.display_name || form.full_name} berhasil ditambahkan`);
      router.push(`/people/${person.id}`);
    } catch (err) {
      console.error(err);
      toast.error("Gagal menyimpan anggota. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-content" style={{ maxWidth: 640, margin: "0 auto" }}>
      {/* Back */}
      <div style={{ marginBottom: "24px" }}>
        <Link
          href="/people"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--muted)", textDecoration: "none" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Semua Anggota
        </Link>
      </div>

      <div className="page-header">
        <h1 className="page-title">Tambah Anggota Keluarga</h1>
        <p className="page-subtitle">Isi informasi anggota keluarga. Hubungan dapat ditambahkan setelah disimpan.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* ──────────── INFORMASI DASAR ──────────── */}
        <div className="form-section">
          <h2 className="form-section-title">Informasi Dasar</h2>
          <div className="form-section-divider" />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <Label htmlFor="full_name">Nama Lengkap *</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => updateField("full_name", e.target.value)}
                placeholder="Contoh: Misbahul Khair"
                required
                style={{ marginTop: "6px" }}
              />
            </div>

            <div>
              <Label htmlFor="display_name">Nama Tampil</Label>
              <Input
                id="display_name"
                value={form.display_name}
                onChange={(e) => updateField("display_name", e.target.value)}
                placeholder="Nama yang ditampilkan di pohon"
                style={{ marginTop: "6px" }}
              />
            </div>

            <div>
              <Label htmlFor="nickname">Nama Panggilan</Label>
              <Input
                id="nickname"
                value={form.nickname}
                onChange={(e) => updateField("nickname", e.target.value)}
                placeholder="Contoh: Pak Mis"
                style={{ marginTop: "6px" }}
              />
            </div>

            <div>
              <Label htmlFor="prefix_title">Gelar Depan</Label>
              <Input
                id="prefix_title"
                value={form.prefix_title}
                onChange={(e) => updateField("prefix_title", e.target.value)}
                placeholder="H., Hj., Dr., Prof., TGH."
                style={{ marginTop: "6px" }}
              />
            </div>

            <div>
              <Label htmlFor="suffix_title">Gelar Belakang</Label>
              <Input
                id="suffix_title"
                value={form.suffix_title}
                onChange={(e) => updateField("suffix_title", e.target.value)}
                placeholder="S.T., M.Ag., Ph.D."
                style={{ marginTop: "6px" }}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <Label htmlFor="gender">Jenis Kelamin</Label>
              <Select
                value={form.gender}
                onValueChange={(v) => updateField("gender", v as Gender)}
              >
                <SelectTrigger id="gender" style={{ marginTop: "6px" }}>
                  <SelectValue placeholder="Pilih jenis kelamin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Laki-laki</SelectItem>
                  <SelectItem value="female">Perempuan</SelectItem>
                  <SelectItem value="unknown">Tidak diketahui</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* ──────────── KELAHIRAN ──────────── */}
        <div className="form-section">
          <h2 className="form-section-title">Kelahiran</h2>
          <div className="form-section-divider" />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <Label htmlFor="birth_date">Tanggal Lahir</Label>
              <Input
                id="birth_date"
                type="date"
                value={form.birth_date}
                onChange={(e) => updateField("birth_date", e.target.value)}
                style={{ marginTop: "6px" }}
              />
            </div>

            <div>
              <Label htmlFor="birth_date_precision">Ketepatan Tanggal</Label>
              <Select
                value={form.birth_date_precision}
                onValueChange={(v) => updateField("birth_date_precision", v as DatePrecision)}
              >
                <SelectTrigger id="birth_date_precision" style={{ marginTop: "6px" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exact">Tepat</SelectItem>
                  <SelectItem value="month">Perkiraan bulan</SelectItem>
                  <SelectItem value="year">Perkiraan tahun</SelectItem>
                  <SelectItem value="unknown">Tidak diketahui</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <Label htmlFor="birth_place">Tempat Lahir</Label>
              <Input
                id="birth_place"
                value={form.birth_place}
                onChange={(e) => updateField("birth_place", e.target.value)}
                placeholder="Contoh: Ponorogo, Jawa Timur"
                style={{ marginTop: "6px" }}
              />
            </div>
          </div>
        </div>

        {/* ──────────── KEHIDUPAN ──────────── */}
        <div className="form-section">
          <h2 className="form-section-title">Status Kehidupan</h2>
          <div className="form-section-divider" />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <Label htmlFor="life_status">Status</Label>
              <Select
                value={form.life_status}
                onValueChange={(v) => updateField("life_status", v as LifeStatus)}
              >
                <SelectTrigger id="life_status" style={{ marginTop: "6px" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="living">Masih Hidup</SelectItem>
                  <SelectItem value="deceased">Almarhum/Almarhumah</SelectItem>
                  <SelectItem value="unknown">Tidak Diketahui</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.life_status === "deceased" && (
              <>
                <div>
                  <Label htmlFor="death_date">Tanggal Wafat</Label>
                  <Input
                    id="death_date"
                    type="date"
                    value={form.death_date}
                    onChange={(e) => updateField("death_date", e.target.value)}
                    style={{ marginTop: "6px" }}
                  />
                </div>
                <div>
                  <Label htmlFor="death_place">Tempat Wafat</Label>
                  <Input
                    id="death_place"
                    value={form.death_place}
                    onChange={(e) => updateField("death_place", e.target.value)}
                    style={{ marginTop: "6px" }}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* ──────────── BIOGRAFI ──────────── */}
        <div className="form-section">
          <h2 className="form-section-title">Biografi & Informasi</h2>
          <div className="form-section-divider" />

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <Label htmlFor="biography">Biografi</Label>
              <Textarea
                id="biography"
                value={form.biography}
                onChange={(e) => updateField("biography", e.target.value)}
                placeholder="Cerita singkat tentang kehidupan beliau..."
                rows={4}
                style={{ marginTop: "6px" }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <Label htmlFor="occupation">Pekerjaan</Label>
                <Input
                  id="occupation"
                  value={form.occupation}
                  onChange={(e) => updateField("occupation", e.target.value)}
                  placeholder="Contoh: Petani, Pengusaha, PNS"
                  style={{ marginTop: "6px" }}
                />
              </div>

              <div>
                <Label htmlFor="education">Pendidikan</Label>
                <Input
                  id="education"
                  value={form.education}
                  onChange={(e) => updateField("education", e.target.value)}
                  placeholder="Contoh: Pesantren Al-Aziziyah"
                  style={{ marginTop: "6px" }}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Catatan</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Catatan tambahan yang perlu diverifikasi atau diingat..."
                rows={2}
                style={{ marginTop: "6px" }}
              />
            </div>
          </div>
        </div>

        {/* ──────────── VISIBILITAS ──────────── */}
        <div className="form-section">
          <h2 className="form-section-title">Visibilitas</h2>
          <div className="form-section-divider" />

          <div>
            <Label htmlFor="visibility">Siapa yang bisa melihat profil ini?</Label>
            <Select
              value={form.visibility}
              onValueChange={(v) => updateField("visibility", v as Visibility)}
            >
              <SelectTrigger id="visibility" style={{ marginTop: "6px" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Publik — semua orang</SelectItem>
                <SelectItem value="family">Keluarga — hanya anggota yang login</SelectItem>
                <SelectItem value="private">Privat — hanya admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <Button
            id="save-person-button"
            type="submit"
            disabled={loading}
            style={{ background: "var(--foreground)", color: "var(--surface)" }}
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Simpan Anggota
          </Button>
          <Link
            href="/people"
            style={{ fontSize: "13px", color: "var(--muted)", textDecoration: "none", padding: "8px 12px" }}
          >
            Batal
          </Link>
        </div>
      </form>
    </div>
  );
}
