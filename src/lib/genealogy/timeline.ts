// ============================================================
// Timeline — aggregate life events from genealogy data
// ============================================================

import { createClient } from "@/lib/supabase/server";
import type { Person, Union, UnionMember } from "@/types/genealogy";

export type TimelineEventType =
  | "birth"
  | "death"
  | "marriage"
  | "divorce"
  | "widowed";

export interface TimelineEvent {
  id: string;                     // unique key
  type: TimelineEventType;
  date: string;                   // ISO date string
  dateDisplay: string;            // formatted for display
  year: number;
  precision: "exact" | "year" | "month" | "unknown";
  personId: string;
  personName: string;
  personGender: string;
  personPortraitPath?: string | null;
  description: string;
  relatedPersonId?: string;       // e.g. spouse in marriage event
  relatedPersonName?: string;
  relatedPersonGender?: string;
  relatedPersonPortraitPath?: string | null;
  place?: string;
  ageAtEvent?: number | null;     // e.g. age at marriage, age at death
  created_by?: string | null;
}

const MONTH_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function formatDate(dateStr: string, precision?: string | null): string {
  if (!dateStr) return "Tanggal tidak diketahui";
  const parts = dateStr.split("-");
  if (parts.length < 3) return dateStr;

  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);

  if (precision === "year") {
    return `${y}`;
  } else if (precision === "month") {
    return `${MONTH_ID[m] || parts[1]} ${y}`;
  }
  return `${d} ${MONTH_ID[m] || parts[1]} ${y}`;
}

function getYear(dateStr: string): number {
  if (!dateStr) return 0;
  const y = parseInt(dateStr.split("-")[0], 10);
  return isNaN(y) ? new Date(dateStr).getFullYear() : y;
}

function calculateAge(birthDateStr?: string | null, targetDateStr?: string | null): number | null {
  if (!birthDateStr || !targetDateStr) return null;
  const birthYear = getYear(birthDateStr);
  const targetYear = getYear(targetDateStr);
  if (!birthYear || !targetYear || targetYear < birthYear) return null;
  return targetYear - birthYear;
}

function personDisplayName(p: { prefix_title?: string | null; display_name?: string | null; full_name: string; suffix_title?: string | null }): string {
  const parts = [p.prefix_title, p.display_name || p.full_name, p.suffix_title]
    .filter(Boolean)
    .join(" ");
  return parts || p.full_name;
}

/** Fetch all timeline events from the database with user isolation */
export async function getTimelineEvents(personId?: string): Promise<TimelineEvent[]> {
  const supabase = await createClient();

  const events: TimelineEvent[] = [];

  // Fetch people with their portrait media
  let peopleQuery = supabase
    .from("people")
    .select("*, portrait:media!portrait_media_id(storage_path)")
    .is("archived_at", null);

  if (personId) {
    peopleQuery = peopleQuery.eq("id", personId);
  }

  const { data: people } = await peopleQuery;

  // Process birth and death events
  for (const person of people ?? []) {
    const portraitPath = (person as any).portrait?.storage_path || null;
    const name = personDisplayName(person);

    // 1. Birth Event
    if (person.birth_date) {
      events.push({
        id: `birth-${person.id}`,
        type: "birth",
        date: person.birth_date,
        dateDisplay: formatDate(person.birth_date, person.birth_date_precision),
        year: getYear(person.birth_date),
        precision: (person.birth_date_precision as any) || "exact",
        personId: person.id,
        personName: name,
        personGender: person.gender,
        personPortraitPath: portraitPath,
        description: `Kelahiran ${name}`,
        place: person.birth_place ?? undefined,
        ageAtEvent: null,
        created_by: person.created_by || null,
      });
    }

    // 2. Death Event (Wafat) - include if death_date is provided, or if life_status is deceased with death_date
    if (person.death_date) {
      const ageAtDeath = calculateAge(person.birth_date, person.death_date);
      events.push({
        id: `death-${person.id}`,
        type: "death",
        date: person.death_date,
        dateDisplay: formatDate(person.death_date, person.death_date_precision),
        year: getYear(person.death_date),
        precision: (person.death_date_precision as any) || "exact",
        personId: person.id,
        personName: name,
        personGender: person.gender,
        personPortraitPath: portraitPath,
        description: `${name} wafat`,
        place: person.death_place ?? undefined,
        ageAtEvent: ageAtDeath,
        created_by: person.created_by || null,
      });
    }
  }

  // 3. Fetch unions (marriages & divorces)
  let unionsQuery = supabase
    .from("unions")
    .select("*")
    .or("start_date.not.is.null,end_date.not.is.null");

  const { data: unions } = await unionsQuery.returns<Union[]>();

  // Fetch union members
  const { data: unionMembers } = await supabase
    .from("union_members")
    .select("*")
    .returns<UnionMember[]>();

  let allPeopleQuery = supabase
    .from("people")
    .select("id, full_name, display_name, prefix_title, suffix_title, gender, birth_date, created_by, portrait:media!portrait_media_id(storage_path)")
    .is("archived_at", null);

  const { data: allPeople } = await allPeopleQuery;

  const peopleMap = new Map<string, any>(allPeople?.map((p) => [p.id, p]) ?? []);

  for (const union of unions ?? []) {
    const members = unionMembers?.filter((um) => um.union_id === union.id) ?? [];
    if (members.length < 2) continue;

    const [m1, m2] = members;
    const p1 = peopleMap.get(m1.person_id);
    const p2 = peopleMap.get(m2.person_id);
    if (!p1 || !p2) continue;

    // Filter: only include if personId matches one of the partners
    if (personId && p1.id !== personId && p2.id !== personId) continue;

    const p1Name = personDisplayName(p1);
    const p2Name = personDisplayName(p2);
    const p1Portrait = p1.portrait?.storage_path || null;
    const p2Portrait = p2.portrait?.storage_path || null;

    // Marriage event
    if (union.start_date) {
      const ageP1 = calculateAge(p1.birth_date, union.start_date);

      events.push({
        id: `union-${union.id}`,
        type: "marriage",
        date: union.start_date,
        dateDisplay: formatDate(union.start_date, union.start_date_precision),
        year: getYear(union.start_date),
        precision: (union.start_date_precision as any) || "exact",
        personId: p1.id,
        personName: p1Name,
        personGender: p1.gender,
        personPortraitPath: p1Portrait,
        relatedPersonId: p2.id,
        relatedPersonName: p2Name,
        relatedPersonGender: p2.gender,
        relatedPersonPortraitPath: p2Portrait,
        description: `Pernikahan ${p1Name} & ${p2Name}`,
        ageAtEvent: ageP1,
        created_by: union.created_by || p1.created_by || null,
      });
    }

    // Divorce / ended event
    if (union.end_date && (union.status === "divorced" || union.status === "ended")) {
      const isDivorce = union.status === "divorced";
      events.push({
        id: `divorce-${union.id}`,
        type: isDivorce ? "divorce" : "divorce",
        date: union.end_date,
        dateDisplay: formatDate(union.end_date, union.end_date_precision),
        year: getYear(union.end_date),
        precision: (union.end_date_precision as any) || "exact",
        personId: p1.id,
        personName: p1Name,
        personGender: p1.gender,
        personPortraitPath: p1Portrait,
        relatedPersonId: p2.id,
        relatedPersonName: p2Name,
        relatedPersonGender: p2.gender,
        relatedPersonPortraitPath: p2Portrait,
        description: isDivorce
          ? `Perceraian ${p1Name} & ${p2Name}`
          : `Pernikahan ${p1Name} & ${p2Name} berakhir`,
        created_by: union.created_by || p1.created_by || null,
      });
    }
  }

function parseEventTimestamp(dateStr: string): number {
  if (!dateStr) return 0;
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d).getTime();
  } else if (parts.length === 2) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    return new Date(y, m, 1).getTime();
  } else if (parts.length === 1) {
    const y = parseInt(parts[0], 10);
    return new Date(y, 0, 1).getTime();
  }
  return new Date(dateStr).getTime() || 0;
}

  // Sort chronologically ascending
  events.sort((a, b) => {
    const tA = parseEventTimestamp(a.date);
    const tB = parseEventTimestamp(b.date);
    if (tA !== tB) return tA - tB;
    return a.id.localeCompare(b.id);
  });

  return events;
}

/** Group events by decade for timeline display */
export function groupByDecade(events: TimelineEvent[]): Map<number, TimelineEvent[]> {
  const map = new Map<number, TimelineEvent[]>();
  for (const evt of events) {
    if (!evt.year) continue;
    const decade = Math.floor(evt.year / 10) * 10;
    if (!map.has(decade)) map.set(decade, []);
    map.get(decade)!.push(evt);
  }
  return map;
}
