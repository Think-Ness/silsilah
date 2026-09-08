import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, User, MapPin, Phone, BookOpen, GraduationCap, Briefcase, HeartHandshake } from "lucide-react";
import { getPersonProfile } from "@/lib/genealogy/people";
import { getMediaUrl } from "@/lib/genealogy/media";
import { getUnionMortalityInfo } from "@/lib/genealogy/relationships";
import { DeletePersonButton } from "@/components/people/DeletePersonButton";
import { PersonChildrenList } from "@/components/people/PersonChildrenList";
import type { PersonProfile } from "@/types/genealogy";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cleanId = decodeURIComponent(id).trim().replace(/[\s_]+/g, "-");
  const supabase = await createClient();
  const profile = await getPersonProfile(cleanId, supabase);
  if (!profile) return { title: "Tidak Ditemukan" };
  const name = [profile.prefix_title, profile.display_name || profile.full_name].filter(Boolean).join(" ");
  return {
    title: `${name} | Silsilah Keluarga`,
    description: profile.biography || `Profil ${name} dalam arsip silsilah keluarga.`,
  };
}

function getDisplayName(p: { prefix_title?: string | null; display_name?: string | null; full_name: string; suffix_title?: string | null }) {
  return [p.prefix_title, p.display_name || p.full_name, p.suffix_title].filter(Boolean).join(" ");
}

function Section({ title, icon: Icon, children }: { title: string; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", paddingBottom: "10px", borderBottom: "1px solid var(--border)" }}>
        {Icon && <Icon className="w-4 h-4 text-[var(--muted)]" />}
        <h2 style={{ fontSize: "13px", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

export default async function PersonProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cleanId = decodeURIComponent(id).trim().replace(/[\s_]+/g, "-");
  const supabase = await createClient();
  const profile = await getPersonProfile(cleanId, supabase);

  if (!profile) {
    notFound();
  }

  const displayName = getDisplayName(profile);
  const portraitUrl = profile.portrait ? getMediaUrl(profile.portrait.storage_path) : null;

  return (
    <div className="page-content" style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* Back button */}
      <div style={{ marginBottom: "24px" }}>
        <Link
          href="/people"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
            color: "var(--muted)",
            textDecoration: "none",
          }}
          className="hover:text-[var(--foreground)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Semua Anggota
        </Link>
      </div>

      {/* Hero: Photo + Name */}
      <div
        style={{
          display: "flex",
          gap: "24px",
          alignItems: "flex-start",
          marginBottom: "32px",
          flexWrap: "wrap",
        }}
      >
        {/* Photo */}
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            background: "var(--subtle)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {portraitUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={portraitUrl}
              alt={displayName}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <User className="w-12 h-12 text-[var(--muted)]" />
          )}
        </div>

        {/* Name + basic info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            style={{
              fontSize: "26px",
              fontWeight: 700,
              color: "var(--foreground)",
              margin: "0 0 6px",
              lineHeight: 1.2,
            }}
          >
            {displayName}
          </h1>
          <div style={{ fontSize: "14px", color: "var(--muted)", marginBottom: "12px" }}>
            {profile.gender === "male" ? "Laki-laki" : profile.gender === "female" ? "Perempuan" : ""}
            {profile.birth_date && ` · Lahir ${profile.birth_date.split("-")[0]}`}
            {profile.life_status === "deceased" && profile.death_date && ` · Wafat ${profile.death_date.split("-")[0]}`}
          </div>

          {profile.life_status === "deceased" && (
            <span
              style={{
                fontSize: "11px",
                fontWeight: 500,
                padding: "2px 8px",
                borderRadius: "4px",
                background: "var(--subtle)",
                color: "var(--muted)",
                border: "1px solid var(--border)",
              }}
            >
              Almarhum/Almarhumah
            </span>
          )}

          {/* Action buttons */}
          <div style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <Link
              href={`/people/${id}/edit`}
              id="edit-person-button"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 14px",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                fontSize: "13px",
                fontWeight: 500,
                color: "var(--foreground)",
                textDecoration: "none",
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Profil
            </Link>

            <DeletePersonButton
              personId={cleanId}
              personName={displayName}
            />
          </div>
        </div>
      </div>

      {/* Keluarga */}
      <Section title="Keluarga">
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {profile.parents.length > 0 && (
            <div>
              <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "4px" }}>Orang Tua</div>
              <div style={{ fontSize: "14px", color: "var(--foreground)" }}>
                {profile.parents.map((p, i) => (
                  <span key={p.id}>
                    {i > 0 && " + "}
                    <Link href={`/people/${p.id}`} style={{ color: "var(--accent-color)", textDecoration: "none" }}>
                      {getDisplayName(p)}
                    </Link>
                  </span>
                ))}
              </div>
            </div>
          )}

          {profile.spouses.length > 0 && (
            <div>
              <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "6px" }}>Pasangan & Hubungan</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {profile.spouses.map(({ person, union }) => {
                  const info = getUnionMortalityInfo([profile, person], union);
                  const isSpouseDeceased = person.life_status === "deceased" || !!person.death_date;
                  const isSelfDeceased = profile.life_status === "deceased" || !!profile.death_date;

                  // Tentukan status spesifik orang ini terhadap pasangannya
                  let personalStatusLabel = "Menikah";
                  let dateLabel = "";

                  if (union.status === "divorced") {
                    personalStatusLabel = profile.gender === "female" ? "Janda (Cerai Hidup)" : profile.gender === "male" ? "Duda (Cerai Hidup)" : "Bercerai";
                    dateLabel = union.end_date ? ` · Cerai: ${union.end_date}` : union.start_date ? ` · Menikah: ${union.start_date}` : "";
                  } else if (union.status === "ended") {
                    personalStatusLabel = "Berakhir / Pisah";
                    dateLabel = union.end_date ? ` · ${union.end_date}` : "";
                  } else if (isSpouseDeceased && !isSelfDeceased) {
                    personalStatusLabel = profile.gender === "female" ? "Janda (Suami Wafat)" : profile.gender === "male" ? "Duda (Istri Wafat)" : "Duda / Janda";
                    dateLabel = person.death_date ? ` · Wafat: ${person.death_date}` : union.start_date ? ` · Menikah: ${union.start_date}` : "";
                  } else if (isSpouseDeceased && isSelfDeceased) {
                    personalStatusLabel = "Keduanya Telah Wafat (Rahimahumallah)";
                    const deaths = [profile.death_date, person.death_date].filter(Boolean);
                    dateLabel = deaths.length > 0 ? ` · Wafat: ${deaths.join(" & ")}` : "";
                  } else {
                    dateLabel = union.start_date ? ` · Menikah: ${union.start_date}` : "";
                  }

                  return (
                    <div
                      key={person.id}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "var(--radius-md)",
                        background: "var(--subtle)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <HeartHandshake className={`w-4 h-4 ${isSpouseDeceased ? "text-purple-600" : union.status === "divorced" ? "text-red-600" : "text-rose-600"}`} />
                            <Link href={`/people/${person.id}`} style={{ fontWeight: 600, color: "var(--accent-color)", textDecoration: "none" }}>
                              {getDisplayName(person)}
                            </Link>
                            {person.life_status === "deceased" && (
                              <span style={{ fontSize: "11px", color: "var(--muted)" }}>(Alm.)</span>
                            )}
                          </div>
                          {/* Tanggal Pernikahan Tambahan jika ada tanggal wafat */}
                          {isSpouseDeceased && !isSelfDeceased && union.start_date && person.death_date && (
                            <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px", marginLeft: "24px" }}>
                              Pernikahan: {union.start_date}
                            </div>
                          )}
                        </div>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 500,
                            padding: "2px 8px",
                            borderRadius: "4px",
                            background: info.isOneDeceased ? "#F3E8FF" : info.isBothDeceased ? "#F4F4F5" : info.isDivorced ? "#FEE2E2" : "#FFE4E6",
                            color: info.isOneDeceased ? "#7E22CE" : info.isBothDeceased ? "#52525B" : info.isDivorced ? "#DC2626" : "#E11D48",
                          }}
                        >
                          {personalStatusLabel}
                          {dateLabel}
                        </span>
                      </div>

                      {/* Kotak Doa & Pesan Kebaikan (jika salah satu/keduanya wafat) */}
                      {(info.isOneDeceased || info.isBothDeceased) && (
                        <div
                          style={{
                            marginTop: "8px",
                            padding: "8px 10px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            lineHeight: 1.5,
                            fontStyle: "italic",
                            background: info.isBothDeceased ? "rgba(244, 244, 245, 0.6)" : "rgba(243, 232, 255, 0.6)",
                            color: info.isBothDeceased ? "#3F3F46" : "#581C87",
                            border: `1px solid ${info.isBothDeceased ? "rgba(212, 212, 216, 0.8)" : "rgba(233, 213, 255, 0.8)"}`,
                          }}
                        >
                          🕊️ &ldquo;{info.doaText}&rdquo;
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {profile.children.length > 0 && (
            <PersonChildrenList
              parentId={profile.id}
              initialChildren={profile.children}
              spouseIds={profile.spouses.map((s) => s.person.id)}
            />
          )}
        </div>
      </Section>

      {/* Biography */}
      {(profile.biography || profile.occupation || profile.education) && (
        <Section title="Biografi" icon={BookOpen}>
          {profile.biography && (
            <p style={{ fontSize: "14px", color: "var(--foreground)", lineHeight: 1.7, marginBottom: "16px" }}>
              {profile.biography}
            </p>
          )}
          {profile.occupation && (
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", marginBottom: "8px" }}>
              <Briefcase className="w-4 h-4 text-[var(--muted)] mt-0.5 flex-shrink-0" />
              <div>
                <div style={{ fontSize: "12px", color: "var(--muted)" }}>Pekerjaan</div>
                <div style={{ fontSize: "14px", color: "var(--foreground)" }}>{profile.occupation}</div>
              </div>
            </div>
          )}
          {profile.education && (
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
              <GraduationCap className="w-4 h-4 text-[var(--muted)] mt-0.5 flex-shrink-0" />
              <div>
                <div style={{ fontSize: "12px", color: "var(--muted)" }}>Pendidikan</div>
                <div style={{ fontSize: "14px", color: "var(--foreground)" }}>{profile.education}</div>
              </div>
            </div>
          )}
        </Section>
      )}

      {/* Addresses */}
      {profile.addresses.length > 0 && (
        <Section title="Alamat" icon={MapPin}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {profile.addresses.map((addr) => (
              <div key={addr.id} style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--foreground)" }}>{addr.label}</span>
                    {addr.is_current && (
                      <span style={{ fontSize: "10px", padding: "1px 5px", borderRadius: "3px", background: "#DCFCE7", color: "#166534" }}>
                        Sekarang
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--muted)" }}>
                    {[addr.address_line, addr.village, addr.district, addr.city_regency, addr.province, addr.country]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Contacts */}
      {profile.contacts.length > 0 && (
        <Section title="Kontak" icon={Phone}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {profile.contacts.map((c) => (
              <div key={c.id} style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <div style={{ fontSize: "12px", color: "var(--muted)", width: 80, flexShrink: 0 }}>
                  {c.contact_type === "whatsapp" ? "WhatsApp" : c.contact_type === "phone" ? "Telepon" : c.contact_type === "email" ? "Email" : c.contact_type}
                </div>
                <div style={{ fontSize: "14px", color: "var(--foreground)" }}>
                  {c.contact_type === "whatsapp" ? (
                    <a href={`https://wa.me/${c.value.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-color)", textDecoration: "none" }}>
                      {c.value}
                    </a>
                  ) : c.contact_type === "email" ? (
                    <a href={`mailto:${c.value}`} style={{ color: "var(--accent-color)", textDecoration: "none" }}>{c.value}</a>
                  ) : (
                    c.value
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Notes */}
      {profile.notes && (
        <Section title="Catatan">
          <p style={{ fontSize: "14px", color: "var(--muted)", lineHeight: 1.7, fontStyle: "italic" }}>
            {profile.notes}
          </p>
        </Section>
      )}
    </div>
  );
}
