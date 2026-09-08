import { getAllUnions } from "@/lib/genealogy/relationships";
import { getAllParentChildRelationships } from "@/lib/genealogy/relationships";
import { getAllPeople } from "@/lib/genealogy/people";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus } from "lucide-react";

export const metadata = {
  title: "Hubungan Keluarga | Silsilah",
};

function getDisplayName(p: { prefix_title?: string | null; display_name?: string | null; full_name: string }) {
  return [p.prefix_title, p.display_name || p.full_name].filter(Boolean).join(" ");
}

export default async function RelationshipsPage() {
  const supabase = await createClient();
  const [unions, parentChildRels, people] = await Promise.all([
    getAllUnions(supabase),
    getAllParentChildRelationships(supabase),
    getAllPeople(undefined, supabase),
  ]);

  const peopleMap = new Map(people.map((p) => [p.id, p]));

  return (
    <div className="page-content">
      <div
        className="page-header"
        style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}
      >
        <div>
          <h1 className="page-title">Hubungan Keluarga</h1>
          <p className="page-subtitle">
            {unions.length} pernikahan/union · {parentChildRels.length} hubungan ortu-anak
          </p>
        </div>
        <Link
          href="/relationships/new"
          id="add-relationship-button"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            padding: "8px 16px",
            background: "var(--foreground)",
            color: "var(--surface)",
            borderRadius: "var(--radius-md)",
            fontSize: "13px",
            fontWeight: 500,
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          <Plus className="w-4 h-4" />
          Tambah Hubungan
        </Link>
      </div>

      {/* Unions */}
      <section style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "13px", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
          Pernikahan & Union ({unions.length})
        </h2>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
          }}
        >
          {unions.length === 0 ? (
            <div className="empty-state" style={{ padding: "32px" }}>
              <div className="empty-state-title">Belum ada union</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pasangan</th>
                  <th>Jenis</th>
                  <th>Status</th>
                  <th>Mulai</th>
                </tr>
              </thead>
              <tbody>
                {unions.map((union) => {
                  // Get members dari parent_child_relationships — ini perlu union_members
                  return (
                    <tr key={union.id}>
                      <td>
                        <span style={{ fontSize: "14px", color: "var(--foreground)" }}>
                          {union.id.slice(0, 8)}...
                        </span>
                      </td>
                      <td style={{ fontSize: "13px", color: "var(--muted)" }}>
                        {union.relationship_type === "marriage" ? "Pernikahan" : union.relationship_type}
                      </td>
                      <td style={{ fontSize: "13px", color: "var(--muted)" }}>
                        {union.status === "active" ? "Aktif" : union.status === "ended" ? "Berakhir" : union.status === "widowed" ? "Duda/Janda" : "—"}
                      </td>
                      <td style={{ fontSize: "13px", color: "var(--muted)" }}>
                        {union.start_date || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Parent-Child */}
      <section>
        <h2 style={{ fontSize: "13px", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
          Hubungan Orang Tua - Anak ({parentChildRels.length})
        </h2>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
          }}
        >
          {parentChildRels.length === 0 ? (
            <div className="empty-state" style={{ padding: "32px" }}>
              <div className="empty-state-title">Belum ada hubungan ortu-anak</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Orang Tua</th>
                  <th>Anak</th>
                  <th>Jenis</th>
                  <th>Status Biologis</th>
                </tr>
              </thead>
              <tbody>
                {parentChildRels.map((rel) => {
                  const parent = peopleMap.get(rel.parent_id);
                  const child = peopleMap.get(rel.child_id);
                  return (
                    <tr key={rel.id}>
                      <td style={{ fontSize: "14px" }}>
                        {parent ? (
                          <Link href={`/people/${parent.id}`} style={{ color: "var(--foreground)", textDecoration: "none" }}>
                            {getDisplayName(parent)}
                          </Link>
                        ) : rel.parent_id.slice(0, 8)}
                      </td>
                      <td style={{ fontSize: "14px" }}>
                        {child ? (
                          <Link href={`/people/${child.id}`} style={{ color: "var(--foreground)", textDecoration: "none" }}>
                            {getDisplayName(child)}
                          </Link>
                        ) : rel.child_id.slice(0, 8)}
                      </td>
                      <td style={{ fontSize: "13px", color: "var(--muted)" }}>
                        {rel.relationship_type === "parent" ? "Orang Tua" : "Wali"}
                      </td>
                      <td style={{ fontSize: "13px", color: "var(--muted)" }}>
                        {rel.biological_status === "biological" ? "Biologis" : rel.biological_status === "adoptive" ? "Adoptif" : rel.biological_status === "step" ? "Tiri" : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
