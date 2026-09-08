import Link from "next/link";
import { Plus, Filter } from "lucide-react";
import { PeopleTable } from "@/components/people/PeopleTable";
import { getAllPeople } from "@/lib/genealogy/people";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Anggota Keluarga | Silsilah",
  description: "Daftar semua anggota keluarga yang terdokumentasi.",
};

export default async function PeoplePage() {
  const supabase = await createClient();
  const people = await getAllPeople(undefined, supabase);

  return (
    <div className="page-content">
      <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
        <div>
          <h1 className="page-title">Anggota Keluarga</h1>
          <p className="page-subtitle">{people.length} anggota terdokumentasi</p>
        </div>
        <Link
          href="/people/new"
          id="add-person-button"
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
          Tambah Anggota
        </Link>
      </div>

      {/* Table */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
        }}
      >
        <PeopleTable people={people} />
      </div>
    </div>
  );
}
