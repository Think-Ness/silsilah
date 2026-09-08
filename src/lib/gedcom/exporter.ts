// ============================================================
// GEDCOM 5.5.1 Exporter
// Converts Supabase genealogy data to standard GEDCOM format
// ============================================================

import type { Person, Union, UnionMember, ParentChildRelationship } from "@/types/genealogy";

interface GedcomExportData {
  people: Person[];
  unions: Union[];
  unionMembers: UnionMember[];
  relationships: ParentChildRelationship[];
}

/** Format a date to GEDCOM format: DD MON YYYY */
function formatGedcomDate(dateStr: string | null, precision: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  if (precision === "year") {
    return date.getFullYear().toString();
  } else if (precision === "month") {
    return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  } else if (precision === "exact") {
    return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  }
  return date.getFullYear().toString();
}

/** Escape GEDCOM special characters */
function gedcomEscape(str: string | null): string {
  if (!str) return "";
  return str.replace(/\n/g, " ").replace(/\r/g, " ").replace(/@/g, "@@");
}

/** Generate unique GEDCOM IDs */
function personId(id: string): string {
  return `@I${id.replace(/-/g, "").substring(0, 16).toUpperCase()}@`;
}

function familyId(id: string): string {
  return `@F${id.replace(/-/g, "").substring(0, 16).toUpperCase()}@`;
}

/** Build a GEDCOM 5.5.1 file string from genealogy data */
export function exportToGedcom(data: GedcomExportData): string {
  const lines: string[] = [];

  // ============================================================
  // HEAD
  // ============================================================
  lines.push("0 HEAD");
  lines.push("1 SOUR SILSILAH-KELUARGA");
  lines.push("2 VERS 1.0");
  lines.push("2 NAME Silsilah Keluarga App");
  lines.push("1 DEST ANY");
  lines.push(`1 DATE ${new Date().toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}`);
  lines.push("1 CHAR UTF-8");
  lines.push("1 GEDC");
  lines.push("2 VERS 5.5.1");
  lines.push("2 FORM LINEAGE-LINKED");

  // ============================================================
  // INDI records (people)
  // ============================================================
  for (const person of data.people) {
    const pid = personId(person.id);

    lines.push(`0 ${pid} INDI`);

    // Name
    const nameParts = [
      person.prefix_title,
      person.full_name,
      person.suffix_title,
    ]
      .filter(Boolean)
      .join(" ");

    // GEDCOM name format: Given /Surname/
    lines.push(`1 NAME ${gedcomEscape(nameParts)}`);
    if (person.display_name) {
      lines.push(`2 NICK ${gedcomEscape(person.display_name)}`);
    }
    if (person.nickname) {
      lines.push(`2 _NICK ${gedcomEscape(person.nickname)}`);
    }

    // Sex
    if (person.gender === "male") lines.push("1 SEX M");
    else if (person.gender === "female") lines.push("1 SEX F");

    // Birth
    if (person.birth_date || person.birth_place) {
      lines.push("1 BIRT");
      if (person.birth_date) {
        lines.push(`2 DATE ${formatGedcomDate(person.birth_date, person.birth_date_precision)}`);
      }
      if (person.birth_place) {
        lines.push(`2 PLAC ${gedcomEscape(person.birth_place)}`);
      }
    }

    // Death
    if (person.life_status === "deceased") {
      if (person.death_date || person.death_place) {
        lines.push("1 DEAT Y");
        if (person.death_date) {
          lines.push(`2 DATE ${formatGedcomDate(person.death_date, person.death_date_precision)}`);
        }
        if (person.death_place) {
          lines.push(`2 PLAC ${gedcomEscape(person.death_place)}`);
        }
      } else {
        lines.push("1 DEAT Y");
      }
    }

    // Occupation
    if (person.occupation) {
      lines.push(`1 OCCU ${gedcomEscape(person.occupation)}`);
    }

    // Education
    if (person.education) {
      lines.push(`1 EDUC ${gedcomEscape(person.education)}`);
    }

    // Biography / notes
    if (person.biography) {
      const bioLines = person.biography.split("\n");
      lines.push(`1 NOTE ${gedcomEscape(bioLines[0])}`);
      for (let i = 1; i < bioLines.length; i++) {
        lines.push(`2 CONT ${gedcomEscape(bioLines[i])}`);
      }
    }

    if (person.notes) {
      lines.push(`1 _NOTE ${gedcomEscape(person.notes)}`);
    }

    // Family links — as spouse
    const asSpouseFamilies = data.unionMembers
      .filter((um) => um.person_id === person.id)
      .map((um) => um.union_id);
    for (const unionId of asSpouseFamilies) {
      lines.push(`1 FAMS ${familyId(unionId)}`);
    }

    // Family links — as child
    // Find parent-child relationships where this person is the child
    const parentRels = data.relationships.filter((r) => r.child_id === person.id);
    // Find the union(s) this person belongs to as a child
    const childFamilyUnions = new Set<string>();
    for (const rel of parentRels) {
      if (rel.union_id) childFamilyUnions.add(rel.union_id);
    }
    if (childFamilyUnions.size > 0) {
      for (const unionId of childFamilyUnions) {
        lines.push(`1 FAMC ${familyId(unionId)}`);
      }
    } else if (parentRels.length > 0) {
      // Has parents but no union — create a virtual family reference
      lines.push(`1 FAMC @F_${person.id.substring(0, 8).toUpperCase()}@`);
    }

    // Change date
    lines.push("1 CHAN");
    lines.push(`2 DATE ${formatGedcomDate(person.updated_at, "exact")}`);
  }

  // ============================================================
  // FAM records (unions / families)
  // ============================================================
  for (const union of data.unions) {
    const fid = familyId(union.id);
    lines.push(`0 ${fid} FAM`);

    // Members
    const members = data.unionMembers.filter((um) => um.union_id === union.id);
    // Try to identify husband/wife from gender
    const memberPeople = members.map((m) => data.people.find((p) => p.id === m.person_id)).filter(Boolean) as Person[];
    const husband = memberPeople.find((p) => p.gender === "male");
    const wife = memberPeople.find((p) => p.gender === "female");
    const others = memberPeople.filter((p) => p !== husband && p !== wife);

    if (husband) lines.push(`1 HUSB ${personId(husband.id)}`);
    if (wife) lines.push(`1 WIFE ${personId(wife.id)}`);
    for (const other of others) {
      lines.push(`1 _PART ${personId(other.id)}`);
    }

    // Marriage event
    const relTypeMap: Record<string, string> = {
      marriage: "MARR",
      engagement: "ENGA",
      partner: "_COHA",
      historical_union: "MARR",
      unknown: "MARR",
    };
    const evt = relTypeMap[union.relationship_type] ?? "MARR";

    if (union.start_date || union.status === "active") {
      lines.push(`1 ${evt}`);
      if (union.start_date) {
        lines.push(`2 DATE ${formatGedcomDate(union.start_date, union.start_date_precision)}`);
      }
    }

    // Divorce / ended
    if (union.status === "divorced" || union.status === "ended") {
      lines.push("1 DIV Y");
      if (union.end_date) {
        lines.push(`2 DATE ${formatGedcomDate(union.end_date, union.end_date_precision)}`);
      }
    }

    // Children
    const children = data.relationships
      .filter((r) => r.union_id === union.id)
      .map((r) => r.child_id);
    for (const childId of children) {
      lines.push(`1 CHIL ${personId(childId)}`);
    }

    if (union.notes) {
      lines.push(`1 NOTE ${gedcomEscape(union.notes)}`);
    }
  }

  // ============================================================
  // TRLR
  // ============================================================
  lines.push("0 TRLR");

  return lines.join("\n");
}

/** Trigger browser download of GEDCOM file */
export function downloadGedcom(content: string, filename = "silsilah-keluarga.ged") {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
