"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, ArrowRight } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createUnion, createParentChildRelationship } from "@/lib/genealogy/relationships";
import { searchPeople } from "@/lib/genealogy/people";
import type { PersonWithPortrait, UnionRelationshipType, UnionStatus, BiologicalStatus } from "@/types/genealogy";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

type RelType = "union" | "parent_child";

function PersonSelector({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: PersonWithPortrait | null;
  onChange: (p: PersonWithPortrait) => void;
}) {
  const [search, setSearch] = useState("");

  const { data: results = [] } = useQuery({
    queryKey: ["search-selector", search],
    queryFn: () => searchPeople(search),
    enabled: search.length >= 2,
  });

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      {value ? (
        <div
          style={{
            marginTop: "6px",
            padding: "10px 12px",
            border: "1px solid var(--accent-color)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--accent-subtle)",
          }}
        >
          <span style={{ fontSize: "14px", color: "var(--foreground)" }}>
            {[value.prefix_title, value.display_name || value.full_name].filter(Boolean).join(" ")}
          </span>
          <button
            type="button"
            onClick={() => onChange(null as unknown as PersonWithPortrait)}
            style={{ fontSize: "12px", color: "var(--muted)", background: "none", border: "none", cursor: "pointer" }}
          >
            Ganti
          </button>
        </div>
      ) : (
        <div style={{ position: "relative", marginTop: "6px" }}>
          <Input
            id={id}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ketik nama untuk mencari..."
          />
          {results.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-dropdown)",
                zIndex: 50,
                maxHeight: 240,
                overflowY: "auto",
                marginTop: "4px",
              }}
            >
              {results.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => {
                    onChange(person);
                    setSearch("");
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "10px 14px",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "14px",
                    color: "var(--foreground)",
                    borderBottom: "1px solid var(--border)",
                  }}
                  className="hover:bg-[var(--subtle)]"
                >
                  {[person.prefix_title, person.display_name || person.full_name].filter(Boolean).join(" ")}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function NewRelationshipPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [relType, setRelType] = useState<RelType>("union");

  // Union form
  const [personA, setPersonA] = useState<PersonWithPortrait | null>(null);
  const [personB, setPersonB] = useState<PersonWithPortrait | null>(null);
  const [unionType, setUnionType] = useState<UnionRelationshipType>("marriage");
  const [unionStatus, setUnionStatus] = useState<UnionStatus>("active");
  const [startDate, setStartDate] = useState("");
  const [notes, setNotes] = useState("");

  // Parent-child form
  const [parent, setParent] = useState<PersonWithPortrait | null>(null);
  const [child, setChild] = useState<PersonWithPortrait | null>(null);
  const [bioStatus, setBioStatus] = useState<BiologicalStatus>("biological");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (relType === "union") {
      if (!personA || !personB) {
        toast.error("Pilih kedua pasangan");
        return;
      }
      if (personA.id === personB.id) {
        toast.error("Pasangan tidak boleh orang yang sama");
        return;
      }
    } else {
      if (!parent || !child) {
        toast.error("Pilih orang tua dan anak");
        return;
      }
      if (parent.id === child.id) {
        toast.error("Orang tua dan anak tidak boleh orang yang sama");
        return;
      }
    }

    setLoading(true);
    try {
      if (relType === "union") {
        await createUnion({
          relationship_type: unionType,
          person_a_id: personA!.id,
          person_b_id: personB!.id,
          start_date: startDate || undefined,
          status: unionStatus,
          notes: notes || undefined,
        });
        toast.success("Hubungan pasangan berhasil ditambahkan");
      } else {
        await createParentChildRelationship({
          parent_id: parent!.id,
          child_id: child!.id,
          biological_status: bioStatus,
        });
        toast.success("Hubungan orang tua-anak berhasil ditambahkan");
      }
      router.push("/relationships");
    } catch (err) {
      console.error(err);
      toast.error("Gagal menyimpan hubungan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-content" style={{ maxWidth: 560, margin: "0 auto" }}>
      <div style={{ marginBottom: "24px" }}>
        <Link
          href="/relationships"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--muted)", textDecoration: "none" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Semua Hubungan
        </Link>
      </div>

      <div className="page-header">
        <h1 className="page-title">Tambah Hubungan</h1>
        <p className="page-subtitle">Hubungkan dua anggota keluarga.</p>
      </div>

      {/* Rel type selector */}
      <div className="form-section">
        <h2 className="form-section-title">Jenis Hubungan</h2>
        <div className="form-section-divider" />
        <div style={{ display: "flex", gap: "10px" }}>
          {(["union", "parent_child"] as RelType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setRelType(t)}
              style={{
                padding: "8px 16px",
                borderRadius: "var(--radius-md)",
                border: `1px solid ${relType === t ? "var(--foreground)" : "var(--border)"}`,
                background: relType === t ? "var(--foreground)" : "transparent",
                color: relType === t ? "var(--surface)" : "var(--muted)",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 150ms",
              }}
            >
              {t === "union" ? "Pasangan / Pernikahan" : "Orang Tua → Anak"}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {relType === "union" ? (
          <>
            <div className="form-section">
              <h2 className="form-section-title">Pihak yang Terlibat</h2>
              <div className="form-section-divider" />
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <PersonSelector id="person-a" label="Pasangan 1" value={personA} onChange={setPersonA} />
                <div style={{ textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>+</div>
                <PersonSelector id="person-b" label="Pasangan 2" value={personB} onChange={setPersonB} />
              </div>
            </div>

            <div className="form-section">
              <h2 className="form-section-title">Detail Hubungan</h2>
              <div className="form-section-divider" />
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <Label htmlFor="union-type">Jenis</Label>
                    <Select value={unionType} onValueChange={(v) => setUnionType(v as UnionRelationshipType)}>
                      <SelectTrigger id="union-type" style={{ marginTop: "6px" }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="marriage">Pernikahan</SelectItem>
                        <SelectItem value="partner">Pasangan</SelectItem>
                        <SelectItem value="engagement">Tunangan</SelectItem>
                        <SelectItem value="historical_union">Historis</SelectItem>
                        <SelectItem value="unknown">Tidak Diketahui</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="union-status">Status</Label>
                    <Select value={unionStatus} onValueChange={(v) => setUnionStatus(v as UnionStatus)}>
                      <SelectTrigger id="union-status" style={{ marginTop: "6px" }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Aktif</SelectItem>
                        <SelectItem value="ended">Berakhir</SelectItem>
                        <SelectItem value="widowed">Duda/Janda</SelectItem>
                        <SelectItem value="divorced">Cerai</SelectItem>
                        <SelectItem value="unknown">Tidak Diketahui</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="start-date">Tanggal Mulai (Pernikahan)</Label>
                  <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ marginTop: "6px" }} />
                </div>
                <div>
                  <Label htmlFor="union-notes">Catatan</Label>
                  <Textarea id="union-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ marginTop: "6px" }} />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="form-section">
              <h2 className="form-section-title">Pihak yang Terlibat</h2>
              <div className="form-section-divider" />
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <PersonSelector id="parent-person" label="Orang Tua" value={parent} onChange={setParent} />
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--muted)", fontSize: "13px" }}>
                  <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                  <ArrowRight className="w-4 h-4" />
                  <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                </div>
                <PersonSelector id="child-person" label="Anak" value={child} onChange={setChild} />
              </div>
            </div>

            <div className="form-section">
              <h2 className="form-section-title">Detail</h2>
              <div className="form-section-divider" />
              <div>
                <Label htmlFor="bio-status">Status Biologis</Label>
                <Select value={bioStatus} onValueChange={(v) => setBioStatus(v as BiologicalStatus)}>
                  <SelectTrigger id="bio-status" style={{ marginTop: "6px" }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="biological">Biologis</SelectItem>
                    <SelectItem value="adoptive">Adoptif</SelectItem>
                    <SelectItem value="step">Tiri</SelectItem>
                    <SelectItem value="unknown">Tidak Diketahui</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <Button
            id="save-relationship-button"
            type="submit"
            disabled={loading}
            style={{ background: "var(--foreground)", color: "var(--surface)" }}
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Simpan Hubungan
          </Button>
          <Link
            href="/relationships"
            style={{ fontSize: "13px", color: "var(--muted)", textDecoration: "none", padding: "8px 12px" }}
          >
            Batal
          </Link>
        </div>
      </form>
    </div>
  );
}
