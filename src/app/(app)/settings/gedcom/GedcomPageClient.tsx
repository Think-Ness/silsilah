"use client";

import { useState, useRef, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { exportToGedcom, downloadGedcom } from "@/lib/gedcom/exporter";
import { parseGedcom, buildImportSummary } from "@/lib/gedcom/importer";
import type { GedcomParseResult } from "@/lib/gedcom/importer";
import {
  Download,
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  GitBranch,
} from "lucide-react";

type ImportStep = "idle" | "parsed" | "importing" | "done" | "error";

export function GedcomPageClient() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export state
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);

  // Import state
  const [importStep, setImportStep] = useState<ImportStep>("idle");
  const [parseResult, setParseResult] = useState<GedcomParseResult | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [showWarnings, setShowWarnings] = useState(false);
  const [isPending, startTransition] = useTransition();

  // ============================================================
  // EXPORT
  // ============================================================
  async function handleExport() {
    setExporting(true);
    setExportDone(false);
    try {
      const [
        { data: people },
        { data: unions },
        { data: unionMembers },
        { data: relationships },
      ] = await Promise.all([
        supabase.from("people").select("*").is("archived_at", null),
        supabase.from("unions").select("*"),
        supabase.from("union_members").select("*"),
        supabase.from("parent_child_relationships").select("*"),
      ]);

      const gedcom = exportToGedcom({
        people: people ?? [],
        unions: unions ?? [],
        unionMembers: unionMembers ?? [],
        relationships: relationships ?? [],
      });

      const now = new Date();
      const filename = `silsilah-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}.ged`;
      downloadGedcom(gedcom, filename);
      setExportDone(true);
      setTimeout(() => setExportDone(false), 5000);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  }

  // ============================================================
  // IMPORT — Parse
  // ============================================================
  async function handleFileSelect(file: File) {
    setImportStep("idle");
    setParseResult(null);
    setImportError(null);

    const text = await file.text();
    const result = parseGedcom(text);
    setParseResult(result);
    setImportStep("parsed");
  }

  // ============================================================
  // IMPORT — Execute
  // ============================================================
  async function handleImport() {
    if (!parseResult) return;
    setImportStep("importing");
    setImportProgress(0);
    setImportError(null);

    startTransition(async () => {
      let imported = 0;
      const total = parseResult.people.length + parseResult.families.length;

      // Map gedcomId → DB id
      const idMap = new Map<string, string>();

      // 1. Insert people
      for (const gp of parseResult.people) {
        const { data, error } = await supabase
          .from("people")
          .insert({
            full_name: gp.full_name,
            prefix_title: gp.prefix_title ?? null,
            suffix_title: gp.suffix_title ?? null,
            nickname: gp.nickname ?? null,
            gender: gp.gender,
            birth_date: gp.birth_date ?? null,
            birth_date_precision: gp.birth_date_precision ?? "unknown",
            birth_place: gp.birth_place ?? null,
            death_date: gp.death_date ?? null,
            death_date_precision: gp.death_date_precision ?? "unknown",
            death_place: gp.death_place ?? null,
            life_status: gp.life_status,
            occupation: gp.occupation ?? null,
            education: gp.education ?? null,
            biography: gp.biography ?? null,
            visibility: "family",
          })
          .select("id")
          .single();

        if (!error && data) {
          idMap.set(gp.gedcomId, data.id);
        }

        imported++;
        setImportProgress(Math.round((imported / total) * 100));
      }

      // 2. Insert families (unions)
      for (const gf of parseResult.families) {
        const { data: unionData, error: unionError } = await supabase
          .from("unions")
          .insert({
            relationship_type: gf.relationshipType,
            start_date: gf.marriageDate ?? null,
            start_date_precision: gf.marriageDatePrecision ?? "unknown",
            end_date: gf.divorceDate ?? null,
            status: gf.status,
          })
          .select("id")
          .single();

        if (!unionError && unionData) {
          idMap.set(gf.gedcomId, unionData.id);
          const unionId = unionData.id;

          // Insert union members
          const memberGedIds = [gf.husbId, gf.wifeId, ...gf.partnerIds].filter(Boolean) as string[];
          for (const gedId of memberGedIds) {
            const personId = idMap.get(gedId);
            if (personId) {
              await supabase.from("union_members").insert({
                union_id: unionId,
                person_id: personId,
                role: "spouse",
              });
            }
          }

          // Insert parent-child relationships
          for (const childGedId of gf.childIds) {
            const childId = idMap.get(childGedId);
            if (!childId) continue;

            // Get parents
            const parentGedIds = [gf.husbId, gf.wifeId].filter(Boolean) as string[];
            for (const parentGedId of parentGedIds) {
              const parentId = idMap.get(parentGedId);
              if (parentId) {
                await supabase.from("parent_child_relationships").insert({
                  parent_id: parentId,
                  child_id: childId,
                  union_id: unionId,
                  relationship_type: "parent",
                  biological_status: "biological",
                });
              }
            }
          }
        }

        imported++;
        setImportProgress(Math.round((imported / total) * 100));
      }

      setImportedCount(imported);
      setImportStep("done");
    });
  }

  return (
    <div className="page-content" style={{ maxWidth: 640, margin: "0 auto" }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">GEDCOM Import / Export</h1>
          <p className="page-subtitle">
            Transfer data silsilah ke/dari aplikasi lain (FamilySearch, Ancestry, dll)
          </p>
        </div>
      </div>

      {/* ============================================================
          EXPORT
          ============================================================ */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          padding: "24px",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "rgba(99,102,241,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Download size={18} color="#6366f1" />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>
              Export ke GEDCOM
            </h2>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
              Unduh seluruh data silsilah dalam format standar GEDCOM 5.5.1.
              Kompatibel dengan FamilySearch, Ancestry, MyHeritage, dan aplikasi genealogi lainnya.
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8,
            marginBottom: 20,
          }}
        >
          {[
            { icon: "👤", label: "Semua Anggota" },
            { icon: "💑", label: "Data Pernikahan" },
            { icon: "👨‍👩‍👧", label: "Hubungan Silsilah" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: "var(--subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "10px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 4 }}>{item.icon}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500 }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>

        <button
          id="export-gedcom-btn"
          onClick={handleExport}
          disabled={exporting}
          style={{
            width: "100%",
            padding: "11px",
            border: "none",
            borderRadius: "var(--radius-sm)",
            background: exporting ? "var(--subtle)" : "#6366f1",
            color: exporting ? "var(--muted)" : "#fff",
            fontSize: 14,
            fontWeight: 700,
            cursor: exporting ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "all 0.15s",
          }}
        >
          {exporting ? (
            <>Mengekspor data...</>
          ) : exportDone ? (
            <>
              <CheckCircle size={16} />
              File berhasil diunduh!
            </>
          ) : (
            <>
              <Download size={16} />
              Export GEDCOM (.ged)
            </>
          )}
        </button>
      </div>

      {/* ============================================================
          IMPORT
          ============================================================ */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          padding: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "rgba(34,197,94,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Upload size={18} color="#22c55e" />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>
              Import dari GEDCOM
            </h2>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
              Impor data dari file GEDCOM (.ged). Data baru akan ditambahkan — data yang sudah ada tidak akan dihapus.
            </p>
          </div>
        </div>

        {/* Warning */}
        <div
          style={{
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: "var(--radius-sm)",
            padding: "10px 14px",
            marginBottom: 20,
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
          }}
        >
          <AlertTriangle size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: "#92400e", margin: 0 }}>
            Data yang diimport akan ditambahkan ke database. Proses ini tidak dapat dibatalkan.
            Pastikan file GEDCOM benar sebelum mengimpor.
          </p>
        </div>

        {/* File upload zone */}
        {importStep === "idle" && (
          <>
            <div
              id="gedcom-dropzone"
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: "2px dashed var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "32px",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file?.name.endsWith(".ged")) {
                  handleFileSelect(file);
                }
              }}
            >
              <FileText size={32} color="var(--muted)" style={{ margin: "0 auto 12px" }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", margin: "0 0 4px" }}>
                Pilih atau seret file GEDCOM
              </p>
              <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
                Format yang didukung: .ged (GEDCOM 5.5, 5.5.1)
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".ged,.GED"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
          </>
        )}

        {/* Parsed preview */}
        {importStep === "parsed" && parseResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              style={{
                background: "rgba(34,197,94,0.05)",
                border: "1px solid rgba(34,197,94,0.2)",
                borderRadius: "var(--radius-sm)",
                padding: "14px 16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Eye size={14} color="#22c55e" />
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>
                  Preview Import
                </span>
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>
                {buildImportSummary(parseResult)}
              </div>
            </div>

            {/* People preview */}
            {parseResult.people.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase" }}>
                  Anggota yang akan diimport ({parseResult.people.slice(0, 5).length} dari {parseResult.people.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {parseResult.people.slice(0, 5).map((p, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 12px",
                        background: "var(--subtle)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: 12,
                      }}
                    >
                      <span>{p.gender === "male" ? "👨" : p.gender === "female" ? "👩" : "👤"}</span>
                      <span style={{ fontWeight: 600 }}>{p.full_name}</span>
                      {p.birth_date && (
                        <span style={{ color: "var(--muted)" }}>
                          b. {new Date(p.birth_date).getFullYear()}
                        </span>
                      )}
                    </div>
                  ))}
                  {parseResult.people.length > 5 && (
                    <div style={{ fontSize: 11, color: "var(--muted)", padding: "4px 12px" }}>
                      ... dan {parseResult.people.length - 5} anggota lainnya
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Warnings */}
            {parseResult.warnings.length > 0 && (
              <div>
                <button
                  onClick={() => setShowWarnings(!showWarnings)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    color: "#f59e0b",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    fontWeight: 600,
                  }}
                >
                  <AlertTriangle size={13} />
                  {parseResult.warnings.length} peringatan
                  {showWarnings ? " (tutup)" : " (lihat)"}
                </button>
                {showWarnings && (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                    {parseResult.warnings.map((w, i) => (
                      <div key={i} style={{ fontSize: 11, color: "#92400e", padding: "4px 8px", background: "rgba(245,158,11,0.08)", borderRadius: 4 }}>
                        {w}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                onClick={() => {
                  setImportStep("idle");
                  setParseResult(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                style={{
                  flex: 1,
                  padding: "9px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  background: "transparent",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  color: "var(--muted)",
                }}
              >
                Batal
              </button>
              <button
                id="confirm-import-btn"
                onClick={handleImport}
                disabled={isPending}
                style={{
                  flex: 2,
                  padding: "9px",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  background: "#22c55e",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Upload size={14} />
                Mulai Import ({parseResult.people.length} anggota)
              </button>
            </div>
          </div>
        )}

        {/* Importing progress */}
        {importStep === "importing" && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
              Mengimpor data... {importProgress}%
            </div>
            <div
              style={{
                height: 8,
                background: "var(--subtle)",
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${importProgress}%`,
                  background: "#22c55e",
                  borderRadius: 999,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
              Mohon jangan tutup halaman ini
            </div>
          </div>
        )}

        {/* Done */}
        {importStep === "done" && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <CheckCircle size={32} color="#22c55e" style={{ margin: "0 auto 12px" }} />
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
              Import Berhasil!
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
              {parseResult?.people.length} anggota dan {parseResult?.families.length} keluarga berhasil diimport
            </div>
            <a
              href="/tree"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 20px",
                background: "#22c55e",
                color: "#fff",
                borderRadius: "var(--radius-sm)",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              <GitBranch size={14} />
              Lihat Silsilah
            </a>
          </div>
        )}

        {/* Error */}
        {importStep === "error" && importError && (
          <div
            style={{
              padding: "16px",
              background: "rgba(239,68,68,0.05)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "var(--radius-sm)",
              color: "#ef4444",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <XCircle size={15} />
            {importError}
          </div>
        )}
      </div>
    </div>
  );
}
