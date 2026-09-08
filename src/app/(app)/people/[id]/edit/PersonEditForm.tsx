"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Archive } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updatePerson, archivePerson } from "@/lib/genealogy/people";
import type { Person, Gender, LifeStatus, DatePrecision, Visibility } from "@/types/genealogy";
import { toast } from "sonner";

interface PersonEditFormProps {
  person: Person;
}

export default function PersonEditForm({ person }: PersonEditFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const [form, setForm] = useState({
    full_name: person.full_name,
    display_name: person.display_name || "",
    nickname: person.nickname || "",
    prefix_title: person.prefix_title || "",
    suffix_title: person.suffix_title || "",
    gender: person.gender as Gender,
    birth_date: person.birth_date || "",
    birth_date_precision: person.birth_date_precision as DatePrecision,
    birth_place: person.birth_place || "",
    death_date: person.death_date || "",
    death_place: person.death_place || "",
    life_status: person.life_status as LifeStatus,
    biography: person.biography || "",
    occupation: person.occupation || "",
    education: person.education || "",
    notes: person.notes || "",
    visibility: person.visibility as Visibility,
  });

  function update<K extends keyof typeof form>(key: K, value: typeof form[K]) {
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
      const payload = {
        ...form,
        display_name: form.display_name.trim() || undefined,
        nickname: form.nickname.trim() || undefined,
        prefix_title: form.prefix_title.trim() || undefined,
        suffix_title: form.suffix_title.trim() || undefined,
        birth_date: form.birth_date.trim() || undefined,
        birth_place: form.birth_place.trim() || undefined,
        death_date: form.death_date.trim() || undefined,
        death_place: form.death_place.trim() || undefined,
        biography: form.biography.trim() || undefined,
        occupation: form.occupation.trim() || undefined,
        education: form.education.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };

      // Coba server action terlebih dahulu (autentikasi server cookies)
      try {
        const { updatePersonServerAction } = await import("@/app/actions/people");
        await updatePersonServerAction(person.id, payload);
      } catch {
        // Fallback ke client-side update
        await updatePerson(person.id, payload);
      }

      toast.success("Profil berhasil diperbarui");
      router.push(`/people/${person.id}`);
    } catch (err: any) {
      console.error("Error saving person:", err);
      toast.error(err?.message || "Gagal menyimpan perubahan");
    } finally {
      setLoading(false);
    }
  }

  async function handleArchive() {
    if (!confirm(`Arsipkan ${form.display_name || form.full_name}? Data tidak akan dihapus.`)) return;
    setArchiving(true);
    try {
      await archivePerson(person.id);
      toast.success("Anggota diarsipkan");
      router.push("/people");
    } catch (err) {
      console.error(err);
      toast.error("Gagal mengarsipkan");
    } finally {
      setArchiving(false);
    }
  }

  const displayName = [person.prefix_title, person.display_name || person.full_name].filter(Boolean).join(" ");

  return (
    <div className="page-content" style={{ maxWidth: 640, margin: "0 auto" }}>
      <div style={{ marginBottom: "24px" }}>
        <Link
          href={`/people/${person.id}`}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--muted)", textDecoration: "none" }}
        >
          <ArrowLeft className="w-4 h-4" />
          {displayName}
        </Link>
      </div>

      <div className="page-header">
        <h1 className="page-title">Edit Profil</h1>
        <p className="page-subtitle">{displayName}</p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* Informasi Dasar */}
        <div className="form-section">
          <h2 className="form-section-title">Informasi Dasar</h2>
          <div className="form-section-divider" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <Label htmlFor="full_name">Nama Lengkap *</Label>
              <Input id="full_name" value={form.full_name} onChange={(e) => update("full_name", e.target.value)} required style={{ marginTop: "6px" }} />
            </div>
            <div>
              <Label htmlFor="display_name">Nama Tampil</Label>
              <Input id="display_name" value={form.display_name} onChange={(e) => update("display_name", e.target.value)} style={{ marginTop: "6px" }} />
            </div>
            <div>
              <Label htmlFor="nickname">Nama Panggilan</Label>
              <Input id="nickname" value={form.nickname} onChange={(e) => update("nickname", e.target.value)} style={{ marginTop: "6px" }} />
            </div>
            <div>
              <Label htmlFor="prefix_title">Gelar Depan</Label>
              <Input id="prefix_title" value={form.prefix_title} onChange={(e) => update("prefix_title", e.target.value)} style={{ marginTop: "6px" }} />
            </div>
            <div>
              <Label htmlFor="suffix_title">Gelar Belakang</Label>
              <Input id="suffix_title" value={form.suffix_title} onChange={(e) => update("suffix_title", e.target.value)} style={{ marginTop: "6px" }} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <Label htmlFor="gender">Jenis Kelamin</Label>
              <Select value={form.gender} onValueChange={(v) => update("gender", v as Gender)}>
                <SelectTrigger id="gender" style={{ marginTop: "6px" }}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Laki-laki</SelectItem>
                  <SelectItem value="female">Perempuan</SelectItem>
                  <SelectItem value="unknown">Tidak diketahui</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Kelahiran */}
        <div className="form-section">
          <h2 className="form-section-title">Kelahiran</h2>
          <div className="form-section-divider" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <Label htmlFor="birth_date">Tanggal Lahir</Label>
              <Input id="birth_date" type="date" value={form.birth_date} onChange={(e) => update("birth_date", e.target.value)} style={{ marginTop: "6px" }} />
            </div>
            <div>
              <Label htmlFor="birth_date_precision">Ketepatan</Label>
              <Select value={form.birth_date_precision} onValueChange={(v) => update("birth_date_precision", v as DatePrecision)}>
                <SelectTrigger id="birth_date_precision" style={{ marginTop: "6px" }}><SelectValue /></SelectTrigger>
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
              <Input id="birth_place" value={form.birth_place} onChange={(e) => update("birth_place", e.target.value)} style={{ marginTop: "6px" }} />
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="form-section">
          <h2 className="form-section-title">Status</h2>
          <div className="form-section-divider" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <Label htmlFor="life_status">Status Kehidupan</Label>
              <Select value={form.life_status} onValueChange={(v) => update("life_status", v as LifeStatus)}>
                <SelectTrigger id="life_status" style={{ marginTop: "6px" }}><SelectValue /></SelectTrigger>
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
                  <Input id="death_date" type="date" value={form.death_date} onChange={(e) => update("death_date", e.target.value)} style={{ marginTop: "6px" }} />
                </div>
                <div>
                  <Label htmlFor="death_place">Tempat Wafat</Label>
                  <Input id="death_place" value={form.death_place} onChange={(e) => update("death_place", e.target.value)} style={{ marginTop: "6px" }} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Biografi */}
        <div className="form-section">
          <h2 className="form-section-title">Biografi</h2>
          <div className="form-section-divider" />
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <Label htmlFor="biography">Biografi</Label>
              <Textarea id="biography" value={form.biography} onChange={(e) => update("biography", e.target.value)} rows={4} style={{ marginTop: "6px" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <Label htmlFor="occupation">Pekerjaan</Label>
                <Input id="occupation" value={form.occupation} onChange={(e) => update("occupation", e.target.value)} style={{ marginTop: "6px" }} />
              </div>
              <div>
                <Label htmlFor="education">Pendidikan</Label>
                <Input id="education" value={form.education} onChange={(e) => update("education", e.target.value)} style={{ marginTop: "6px" }} />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Catatan</Label>
              <Textarea id="notes" value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={2} style={{ marginTop: "6px" }} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <Button id="save-edit-button" type="submit" disabled={loading} style={{ background: "var(--foreground)", color: "var(--surface)" }}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Simpan Perubahan
          </Button>
          <Link href={`/people/${person.id}`} style={{ fontSize: "13px", color: "var(--muted)", textDecoration: "none", padding: "8px 12px" }}>
            Batal
          </Link>
          <div style={{ flex: 1 }} />
          <Button
            id="archive-person-button"
            type="button"
            variant="outline"
            disabled={archiving}
            onClick={handleArchive}
            style={{ color: "var(--destructive)", borderColor: "var(--destructive)" }}
          >
            {archiving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Archive className="w-4 h-4 mr-2" />
            Arsipkan
          </Button>
        </div>
      </form>
    </div>
  );
}
