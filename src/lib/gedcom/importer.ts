// ============================================================
// GEDCOM 5.5.1 Parser/Importer
// Parses a GEDCOM file and returns a preview + importable data
// ============================================================

export interface GedcomPerson {
  gedcomId: string;       // @Ixxxx@
  full_name: string;
  prefix_title?: string;
  suffix_title?: string;
  nickname?: string;
  gender: "male" | "female" | "unknown";
  birth_date?: string;
  birth_date_precision?: "exact" | "year" | "month" | "unknown";
  birth_place?: string;
  death_date?: string;
  death_date_precision?: "exact" | "year" | "month" | "unknown";
  death_place?: string;
  life_status: "living" | "deceased" | "unknown";
  occupation?: string;
  education?: string;
  biography?: string;
  notes?: string;
  spouseFamilyIds: string[];  // FAMS pointers
  childFamilyIds: string[];   // FAMC pointers
}

export interface GedcomFamily {
  gedcomId: string;       // @Fxxxx@
  husbId?: string;
  wifeId?: string;
  partnerIds: string[];
  childIds: string[];
  marriageDate?: string;
  marriageDatePrecision?: "exact" | "year" | "month" | "unknown";
  divorceDate?: string;
  notes?: string;
  relationshipType: "marriage" | "partner" | "historical_union" | "unknown";
  status: "active" | "ended" | "divorced" | "widowed" | "unknown";
}

export interface GedcomParseResult {
  people: GedcomPerson[];
  families: GedcomFamily[];
  warnings: string[];
  totalRecords: number;
}

// ============================================================
// Date parsing helpers
// ============================================================

const MONTH_MAP: Record<string, number> = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};

function parseGedcomDate(dateStr: string): {
  date: string | undefined;
  precision: "exact" | "year" | "month" | "unknown";
} {
  if (!dateStr) return { date: undefined, precision: "unknown" };
  const str = dateStr.trim().toUpperCase().replace(/^(ABT|EST|CAL|BEF|AFT|FROM|TO)\s+/, "");

  // DD MON YYYY
  const fullMatch = str.match(/^(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{4})$/);
  if (fullMatch) {
    const [, day, mon, year] = fullMatch;
    const m = MONTH_MAP[mon];
    return {
      date: `${year}-${String(m).padStart(2, "0")}-${day.padStart(2, "0")}`,
      precision: "exact",
    };
  }

  // MON YYYY
  const monYearMatch = str.match(/^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{4})$/);
  if (monYearMatch) {
    const [, mon, year] = monYearMatch;
    const m = MONTH_MAP[mon];
    return {
      date: `${year}-${String(m).padStart(2, "0")}-01`,
      precision: "month",
    };
  }

  // YYYY only
  const yearMatch = str.match(/^(\d{4})$/);
  if (yearMatch) {
    return { date: `${yearMatch[1]}-01-01`, precision: "year" };
  }

  return { date: undefined, precision: "unknown" };
}

// ============================================================
// Main Parser
// ============================================================

interface GedcomLine {
  level: number;
  xref?: string;
  tag: string;
  value: string;
}

function parseLine(line: string): GedcomLine | null {
  const match = line.trim().match(/^(\d+)\s+(@[^@]+@\s+)?(\w+)\s*(.*)?$/);
  if (!match) return null;
  const [, levelStr, xrefRaw, tag, value = ""] = match;
  return {
    level: parseInt(levelStr),
    xref: xrefRaw?.trim(),
    tag: tag.toUpperCase(),
    value: value.trim(),
  };
}

/** Main GEDCOM parser */
export function parseGedcom(content: string): GedcomParseResult {
  const lines = content.split(/\r?\n/).map(parseLine).filter(Boolean) as GedcomLine[];
  const warnings: string[] = [];

  const people: GedcomPerson[] = [];
  const families: GedcomFamily[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (line.level === 0 && line.xref) {
      // INDI record
      if (line.tag === "INDI") {
        const gedcomId = line.xref;
        const person: GedcomPerson = {
          gedcomId,
          full_name: "",
          gender: "unknown",
          life_status: "unknown",
          spouseFamilyIds: [],
          childFamilyIds: [],
        };

        i++;
        let noteLines: string[] = [];
        let inNote = false;

        while (i < lines.length && lines[i].level > 0) {
          const sub = lines[i];

          if (sub.level === 1) {
            inNote = false;

            if (sub.tag === "NAME") {
              // GEDCOM name format: "First /Last/"
              const raw = sub.value.replace(/\//g, " ").replace(/\s+/g, " ").trim();
              person.full_name = raw;
            } else if (sub.tag === "SEX") {
              person.gender = sub.value === "M" ? "male" : sub.value === "F" ? "female" : "unknown";
            } else if (sub.tag === "BIRT") {
              // look ahead for DATE and PLAC
              while (i + 1 < lines.length && lines[i + 1].level >= 2) {
                i++;
                const bd = lines[i];
                if (bd.tag === "DATE") {
                  const { date, precision } = parseGedcomDate(bd.value);
                  person.birth_date = date;
                  person.birth_date_precision = precision;
                } else if (bd.tag === "PLAC") {
                  person.birth_place = bd.value;
                }
              }
            } else if (sub.tag === "DEAT") {
              person.life_status = "deceased";
              if (sub.value === "Y" || sub.value === "") {
                while (i + 1 < lines.length && lines[i + 1].level >= 2) {
                  i++;
                  const dd = lines[i];
                  if (dd.tag === "DATE") {
                    const { date, precision } = parseGedcomDate(dd.value);
                    person.death_date = date;
                    person.death_date_precision = precision;
                  } else if (dd.tag === "PLAC") {
                    person.death_place = dd.value;
                  }
                }
              }
            } else if (sub.tag === "OCCU") {
              person.occupation = sub.value;
            } else if (sub.tag === "EDUC") {
              person.education = sub.value;
            } else if (sub.tag === "NOTE" || sub.tag === "_NOTE") {
              noteLines = [sub.value];
              inNote = true;
            } else if (sub.tag === "NICK") {
              person.nickname = sub.value;
            } else if (sub.tag === "FAMS") {
              person.spouseFamilyIds.push(sub.value);
            } else if (sub.tag === "FAMC") {
              person.childFamilyIds.push(sub.value);
            }
          } else if (sub.level === 2 && inNote) {
            if (sub.tag === "CONT" || sub.tag === "CONC") {
              noteLines.push(sub.value);
            }
          } else if (sub.level === 2 && sub.tag === "NICK") {
            person.nickname = sub.value;
          }

          i++;
        }

        if (noteLines.length > 0) {
          person.biography = noteLines.join("\n");
        }

        if (!person.full_name) {
          warnings.push(`INDI ${gedcomId}: Tidak ada nama — dilewati`);
        } else {
          people.push(person);
        }
        continue;
      }

      // FAM record
      if (line.tag === "FAM") {
        const gedcomId = line.xref;
        const family: GedcomFamily = {
          gedcomId,
          partnerIds: [],
          childIds: [],
          relationshipType: "marriage",
          status: "unknown",
        };

        i++;
        while (i < lines.length && lines[i].level > 0) {
          const sub = lines[i];

          if (sub.level === 1) {
            if (sub.tag === "HUSB") {
              family.husbId = sub.value;
            } else if (sub.tag === "WIFE") {
              family.wifeId = sub.value;
            } else if (sub.tag === "_PART") {
              family.partnerIds.push(sub.value);
              family.relationshipType = "partner";
            } else if (sub.tag === "CHIL") {
              family.childIds.push(sub.value);
            } else if (sub.tag === "MARR") {
              family.status = "active";
              while (i + 1 < lines.length && lines[i + 1].level >= 2) {
                i++;
                const md = lines[i];
                if (md.tag === "DATE") {
                  const { date, precision } = parseGedcomDate(md.value);
                  family.marriageDate = date;
                  family.marriageDatePrecision = precision;
                }
              }
            } else if (sub.tag === "ENGA") {
              family.relationshipType = "partner";
            } else if (sub.tag === "DIV") {
              family.status = "divorced";
              while (i + 1 < lines.length && lines[i + 1].level >= 2) {
                i++;
                const dd = lines[i];
                if (dd.tag === "DATE") {
                  family.divorceDate = parseGedcomDate(dd.value).date;
                }
              }
            } else if (sub.tag === "NOTE") {
              family.notes = sub.value;
            }
          }

          i++;
        }

        families.push(family);
        continue;
      }
    }

    i++;
  }

  if (people.length === 0) {
    warnings.push("Tidak ada data individu (INDI) yang ditemukan dalam file");
  }

  return {
    people,
    families,
    warnings,
    totalRecords: people.length + families.length,
  };
}

/** Build a human-readable import summary */
export function buildImportSummary(result: GedcomParseResult): string {
  const lines = [
    `✅ ${result.people.length} anggota`,
    `💑 ${result.families.length} keluarga/pernikahan`,
    `⚠️ ${result.warnings.length} peringatan`,
  ];
  return lines.join("  ·  ");
}
