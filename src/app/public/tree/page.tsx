import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Users, Search, ExternalLink, Baby, User } from "lucide-react";

export const metadata = {
  title: "Pohon Keluarga Publik | Silsilah Keluarga",
  description: "Jelajahi silsilah keluarga kami — hanya menampilkan anggota yang bersifat publik",
  openGraph: {
    title: "Pohon Keluarga Publik | Silsilah Keluarga",
    description: "Jelajahi silsilah keluarga kami",
    type: "website",
  },
};

export default async function PublicTreePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const supabase = await createClient();
  const { q } = await searchParams;

  // Fetch only public people
  let query = supabase
    .from("people")
    .select(`
      id,
      full_name,
      display_name,
      prefix_title,
      suffix_title,
      gender,
      birth_date,
      birth_date_precision,
      birth_place,
      death_date,
      life_status,
      occupation
    `)
    .eq("visibility", "public")
    .is("archived_at", null)
    .order("full_name");

  if (q) {
    query = query.ilike("full_name", `%${q}%`);
  }

  const { data: people } = await query;

  // Get total public count
  const { count: totalPublic } = await supabase
    .from("people")
    .select("*", { count: "exact", head: true })
    .eq("visibility", "public")
    .is("archived_at", null);

  function formatDate(dateStr: string | null, precision: string): string {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (precision === "exact") {
      return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    } else if (precision === "month") {
      return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    }
    return d.getFullYear().toString();
  }

  return (
    <div style={{ padding: "24px", maxWidth: 960, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <h1
          style={{
            fontSize: "clamp(22px, 4vw, 32px)",
            fontWeight: 800,
            color: "var(--foreground)",
            margin: "0 0 8px",
          }}
        >
          Pohon Keluarga
        </h1>
        <p style={{ fontSize: 14, color: "var(--muted)", margin: "0 0 20px" }}>
          {totalPublic ?? 0} anggota keluarga — hanya menampilkan data yang bersifat publik
        </p>

        {/* Search */}
        <form style={{ maxWidth: 400, margin: "0 auto" }}>
          <div style={{ position: "relative" }}>
            <Search
              size={15}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted)",
              }}
            />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Cari nama anggota..."
              style={{
                width: "100%",
                padding: "10px 12px 10px 36px",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                background: "var(--surface)",
                fontSize: 13,
                color: "var(--foreground)",
                boxSizing: "border-box",
              }}
            />
          </div>
        </form>
      </div>

      {/* People grid */}
      {people && people.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 14,
          }}
        >
          {people.map((person) => {
            const name = [
              person.prefix_title,
              person.display_name || person.full_name,
              person.suffix_title,
            ]
              .filter(Boolean)
              .join(" ");

            const genderEmoji =
              person.gender === "male" ? "👨" : person.gender === "female" ? "👩" : "👤";

            return (
              <div
                key={person.id}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  transition: "box-shadow 0.15s, border-color 0.15s",
                }}
              >
                {/* Avatar + name */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background:
                        person.gender === "male"
                          ? "rgba(99,102,241,0.1)"
                          : person.gender === "female"
                          ? "rgba(236,72,153,0.1)"
                          : "rgba(100,116,139,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                      flexShrink: 0,
                    }}
                  >
                    {genderEmoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--foreground)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {name}
                    </div>
                    {person.life_status === "deceased" && (
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>Almarhum/a</div>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {person.birth_date && (
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)" }}
                    >
                      <Baby size={11} />
                      Lahir: {formatDate(person.birth_date, person.birth_date_precision)}
                      {person.birth_place && `, ${person.birth_place}`}
                    </div>
                  )}
                  {person.death_date && (
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)" }}
                    >
                      🕊️ Wafat: {formatDate(person.death_date, "unknown")}
                    </div>
                  )}
                  {person.occupation && (
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)" }}
                    >
                      <User size={11} />
                      {person.occupation}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "64px 24px", color: "var(--muted)" }}>
          {q ? (
            <>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
              <p style={{ fontSize: 14, margin: "0 0 8px" }}>
                Tidak ada anggota yang cocok dengan &ldquo;{q}&rdquo;
              </p>
              <a href="/public/tree" style={{ fontSize: 12, color: "var(--accent-color)" }}>
                Lihat semua anggota
              </a>
            </>
          ) : (
            <>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🌳</div>
              <p style={{ fontSize: 14, margin: 0 }}>
                Belum ada anggota yang ditandai sebagai publik
              </p>
            </>
          )}
        </div>
      )}

      {/* Info banner */}
      <div
        style={{
          marginTop: 32,
          padding: "16px 20px",
          background: "var(--accent-subtle)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          fontSize: 12,
          color: "var(--muted)",
          textAlign: "center",
        }}
      >
        Ingin melihat data lengkap atau menambah anggota keluarga?{" "}
        <a
          href="/login"
          style={{ color: "var(--accent-color)", textDecoration: "none", fontWeight: 600 }}
        >
          Masuk ke akun
        </a>{" "}
        atau hubungi admin keluarga untuk mendapatkan akses.
      </div>
    </div>
  );
}
