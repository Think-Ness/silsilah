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
  description: string;
  relatedPersonId?: string;       // e.g. spouse in marriage event
  relatedPersonName?: string;
  place?: string;
}

const MONTH_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function formatDate(dateStr: string, precision: string): string {
  if (!dateStr) return "Tanggal tidak diketahui";
  const d = new Date(dateStr);
  if (precision === "exact") {
    return `${d.getDate()} ${MONTH_ID[d.getMonth()]} ${d.getFullYear()}`;
  } else if (precision === "month") {
    return `${MONTH_ID[d.getMonth()]} ${d.getFullYear()}`;
  }
  return `${d.getFullYear()}`;
}

function getYear(dateStr: string): number {
  return new Date(dateStr).getFullYear();
}

function personDisplayName(p: Person): string {
  const parts = [p.prefix_title, p.display_name || p.full_name, p.suffix_title]
    .filter(Boolean)
    .join(" ");
  return parts || p.full_name;
}

/** Fetch all timeline events from the database */
export async function getTimelineEvents(personId?: string): Promise<TimelineEvent[]> {
  const supabase = await createClient();

  const events: TimelineEvent[] = [];

  // Fetch people
  let peopleQuery = supabase
    .from("people")
    .select("*")
    .is("archived_at", null)
    .not("birth_date", "is", null);

  if (personId) {
    peopleQuery = peopleQuery.eq("id", personId);
  }

  const { data: people } = await peopleQuery.returns<Person[]>();

  // Birth events
  for (const person of people ?? []) {
    if (person.birth_date) {
      events.push({
        id: `birth-${person.id}`,
        type: "birth",
        date: person.birth_date,
        dateDisplay: formatDate(person.birth_date, person.birth_date_precision),
        year: getYear(person.birth_date),
        precision: person.birth_date_precision as "exact" | "year" | "month" | "unknown",
        personId: person.id,
        personName: personDisplayName(person),
        personGender: person.gender,
        description: `${personDisplayName(person)} lahir`,
        place: person.birth_place ?? undefined,
      });
    }

    if (person.death_date && person.life_status === "deceased") {
      events.push({
        id: `death-${person.id}`,
        type: "death",
        date: person.death_date,
        dateDisplay: formatDate(person.death_date, person.death_date_precision),
        year: getYear(person.death_date),
        precision: person.death_date_precision as "exact" | "year" | "month" | "unknown",
        personId: person.id,
        personName: personDisplayName(person),
        personGender: person.gender,
        description: `${personDisplayName(person)} wafat`,
        place: person.death_place ?? undefined,
      });
    }
  }

  // Fetch unions (marriages)
  const { data: unions } = await supabase
    .from("unions")
    .select("*")
    .not("start_date", "is", null)
    .returns<Union[]>();

  // Fetch union members to get names
  const { data: unionMembers } = await supabase
    .from("union_members")
    .select("*")
    .returns<UnionMember[]>();

  const { data: allPeople } = await supabase
    .from("people")
    .select("id, full_name, display_name, prefix_title, suffix_title, gender")
    .is("archived_at", null)
    .returns<Person[]>();

  const peopleMap = new Map<string, Person>(allPeople?.map((p) => [p.id, p]) ?? []);

  for (const union of unions ?? []) {
    const members = unionMembers?.filter((um) => um.union_id === union.id) ?? [];
    if (members.length < 2) continue;

    const [m1, m2] = members;
    const p1 = peopleMap.get(m1.person_id);
    const p2 = peopleMap.get(m2.person_id);
    if (!p1 || !p2) continue;

    // Filter: only include if personId is one of the members
    if (personId && p1.id !== personId && p2.id !== personId) continue;

    if (union.start_date) {
      const eventType: TimelineEventType =
        union.relationship_type === "marriage" ? "marriage" : "marriage";

      events.push({
        id: `union-${union.id}`,
        type: eventType,
        date: union.start_date,
        dateDisplay: formatDate(union.start_date, union.start_date_precision),
        year: getYear(union.start_date),
        precision: union.start_date_precision as "exact" | "year" | "month" | "unknown",
        personId: p1.id,
        personName: personDisplayName(p1),
        personGender: p1.gender,
        relatedPersonId: p2.id,
        relatedPersonName: personDisplayName(p2),
        description: `${personDisplayName(p1)} menikah dengan ${personDisplayName(p2)}`,
      });
    }

    // Divorce / ended
    if (union.end_date && (union.status === "divorced" || union.status === "ended")) {
      events.push({
        id: `divorce-${union.id}`,
        type: union.status === "divorced" ? "divorce" : "divorce",
        date: union.end_date,
        dateDisplay: formatDate(union.end_date, union.end_date_precision),
        year: getYear(union.end_date),
        precision: union.end_date_precision as "exact" | "year" | "month" | "unknown",
        personId: p1.id,
        personName: personDisplayName(p1),
        personGender: p1.gender,
        relatedPersonId: p2.id,
        relatedPersonName: personDisplayName(p2),
        description:
          union.status === "divorced"
            ? `${personDisplayName(p1)} dan ${personDisplayName(p2)} bercerai`
            : `Pernikahan ${personDisplayName(p1)} dan ${personDisplayName(p2)} berakhir`,
      });
    }
  }

  // Sort by date ascending
  events.sort((a, b) => {
    if (a.date < b.date) return -1;
    if (a.date > b.date) return 1;
    return 0;
  });

  return events;
}

/** Group events by decade for timeline display */
export function groupByDecade(events: TimelineEvent[]): Map<number, TimelineEvent[]> {
  const map = new Map<number, TimelineEvent[]>();
  for (const evt of events) {
    const decade = Math.floor(evt.year / 10) * 10;
    if (!map.has(decade)) map.set(decade, []);
    map.get(decade)!.push(evt);
  }
  return map;
}
