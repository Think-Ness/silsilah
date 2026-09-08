"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import type {
  PersonWithPortrait,
  Union,
  UnionMember,
  ParentChildRelationship,
} from "@/types/genealogy";
import { User, Printer, Pencil, Check, ZoomIn, ZoomOut, Maximize2, RotateCcw, HeartHandshake } from "lucide-react";
import { getUnionMortalityInfo } from "@/lib/genealogy/relationships";

interface ZuriatChartViewProps {
  people: PersonWithPortrait[];
  unions: Union[];
  unionMembers: UnionMember[];
  parentChildRels: ParentChildRelationship[];
  onPersonClick?: (personId: string) => void;
  rootPersonId?: string;
  customTitle?: string;
  onTitleChange?: (title: string) => void;
}

interface CicitNode {
  child: PersonWithPortrait;
  spouse?: PersonWithPortrait | null;
}

interface CucuNode {
  child: PersonWithPortrait;
  spouse?: PersonWithPortrait | null;
  union?: Union | null;
  cicit: CicitNode[];
}

interface ChildColumn {
  child: PersonWithPortrait;
  spouse?: PersonWithPortrait | null;
  union?: Union | null;
  cucu: CucuNode[];
}

function formatNameWithTitle(p: PersonWithPortrait): string {
  const parts: string[] = [];
  if (p.prefix_title) parts.push(p.prefix_title);
  parts.push(p.display_name || p.full_name);
  if (p.suffix_title) parts.push(p.suffix_title);
  let name = parts.join(" ");
  if (p.life_status === "deceased") {
    name += " (Alm)";
  }
  return name;
}

/** Menghasilkan font size adaptif & word-break agar nama panjang tidak merusak layout */
function getAdaptiveNameStyle(name: string, defaultSize: number, minSize: number = 8.5) {
  let size = defaultSize;
  if (name.length > 34) {
    size = Math.max(minSize, defaultSize - 3);
  } else if (name.length > 24) {
    size = Math.max(minSize, defaultSize - 2);
  } else if (name.length > 17) {
    size = Math.max(minSize, defaultSize - 1);
  }

  return {
    fontSize: `${size}px`,
    lineHeight: 1.25,
    wordBreak: "break-word" as const,
    overflowWrap: "break-word" as const,
  };
}

export function ZuriatChartView({
  people,
  unions,
  unionMembers,
  parentChildRels,
  onPersonClick,
  rootPersonId,
  customTitle,
  onTitleChange,
}: ZuriatChartViewProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(customTitle || "");
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setZoom((z) => Math.min(1.8, +(z + 0.15).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(0.35, +(z - 0.15).toFixed(2)));
  const handleResetZoom = () => setZoom(1);

  const handleFitWidth = useCallback(() => {
    if (containerRef.current && chartRef.current) {
      const containerW = containerRef.current.clientWidth - 48;
      const chartW = chartRef.current.scrollWidth || 1200;
      if (containerW > 0 && chartW > 0) {
        const ratio = +(containerW / chartW).toFixed(2);
        setZoom(Math.min(1, Math.max(0.35, ratio)));
      }
    }
  }, []);

  // Hitung skala otomatis saat mencetak agar muat di ukuran kertas apapun (A4, Folio/F4, A3, landscape)
  const updatePrintScale = useCallback(() => {
    if (chartRef.current) {
      const chartWidth = chartRef.current.scrollWidth || 1200;
      // Target lebar printable area landscape standar (~1080px)
      const targetPrintWidth = 1080;
      const printScale = chartWidth > targetPrintWidth ? +(targetPrintWidth / chartWidth).toFixed(3) : 1;
      document.documentElement.style.setProperty("--zuriat-print-scale", `${printScale}`);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("beforeprint", updatePrintScale);
    return () => window.removeEventListener("beforeprint", updatePrintScale);
  }, [updatePrintScale]);

  const handlePrint = () => {
    updatePrintScale();
    window.print();
  };

  // Pas di layar saat pertama dimuat jika layar lebih sempit dari bagan
  useEffect(() => {
    const timer = setTimeout(() => {
      handleFitWidth();
    }, 100);
    return () => clearTimeout(timer);
  }, [handleFitWidth]);
  const peopleMap = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  // Index union -> members
  const unionToMembers = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const um of unionMembers) {
      if (!map.has(um.union_id)) map.set(um.union_id, []);
      map.get(um.union_id)!.push(um.person_id);
    }
    return map;
  }, [unionMembers]);

  // Index person -> unions
  const personToUnions = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const um of unionMembers) {
      if (!map.has(um.person_id)) map.set(um.person_id, []);
      map.get(um.person_id)!.push(um.union_id);
    }
    return map;
  }, [unionMembers]);

  // Index child -> parents
  const childToParents = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const rel of parentChildRels) {
      if (!map.has(rel.child_id)) map.set(rel.child_id, []);
      map.get(rel.child_id)!.push(rel.parent_id);
    }
    return map;
  }, [parentChildRels]);

  // Index parent -> children
  const parentToChildren = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const rel of parentChildRels) {
      if (!map.has(rel.parent_id)) map.set(rel.parent_id, []);
      if (!map.get(rel.parent_id)!.includes(rel.child_id)) {
        map.get(rel.parent_id)!.push(rel.child_id);
      }
    }
    return map;
  }, [parentChildRels]);

  // Helper untuk mendapatkan pasangan
  function getSpouse(personId: string): { spouse: PersonWithPortrait | null; union: Union | null } {
    const uIds = personToUnions.get(personId) || [];
    for (const uId of uIds) {
      const members = unionToMembers.get(uId) || [];
      const spouseId = members.find((id) => id !== personId);
      if (spouseId) {
        const spouse = peopleMap.get(spouseId) || null;
        const union = unions.find((u) => u.id === uId) || null;
        return { spouse, union };
      }
    }
    return { spouse: null, union: null };
  }

  // Tentukan Tokoh Utama (Default: Ahlan atau rootPersonId)
  const mainPerson = useMemo(() => {
    if (rootPersonId && peopleMap.has(rootPersonId)) {
      return peopleMap.get(rootPersonId)!;
    }
    // Cari Ahlan atau generasi 1 yang punya anak terbanyak
    const ahlan = people.find((p) => p.full_name.toLowerCase().includes("ahlan"));
    if (ahlan) return ahlan;
    // Fallback: cari orang dengan anak terbanyak
    let best = people[0];
    let maxKids = 0;
    for (const p of people) {
      const kids = parentToChildren.get(p.id) || [];
      if (kids.length > maxKids) {
        maxKids = kids.length;
        best = p;
      }
    }
    return best;
  }, [people, peopleMap, rootPersonId, parentToChildren]);

  // Pasangan Tokoh Utama
  const mainSpouse = useMemo(() => {
    if (!mainPerson) return null;
    return getSpouse(mainPerson.id).spouse;
  }, [mainPerson, personToUnions, unionToMembers, peopleMap]);

  // Moyang / Orang Tua dari Tokoh Utama
  const mainParents = useMemo(() => {
    if (!mainPerson) return [];
    const parentIds = childToParents.get(mainPerson.id) || [];
    return parentIds.map((id) => peopleMap.get(id)).filter((p): p is PersonWithPortrait => !!p);
  }, [mainPerson, childToParents, peopleMap]);

  // Moyang / Orang Tua dari Pasangan Tokoh Utama
  const spouseParents = useMemo(() => {
    if (!mainSpouse) return [];
    const parentIds = childToParents.get(mainSpouse.id) || [];
    return parentIds.map((id) => peopleMap.get(id)).filter((p): p is PersonWithPortrait => !!p);
  }, [mainSpouse, childToParents, peopleMap]);

  // Helper untuk mengurutkan daftar anak berdasarkan custom order (localStorage), sort_order (DB), atau birth_date
  const sortChildrenIds = useCallback(
    (parentId: string, childrenIds: string[], unionId?: string | null): string[] => {
      if (childrenIds.length <= 1) return childrenIds;

      // 1. Ambil custom order dari localStorage jika ada
      let customOrder: string[] = [];
      try {
        const raw = localStorage.getItem("silsilah_child_order_v1");
        if (raw) {
          const parsed = JSON.parse(raw);
          customOrder = parsed[parentId] || (unionId ? parsed[unionId] : []) || [];
          if (customOrder.length === 0) {
            const spouseData = getSpouse(parentId);
            if (spouseData.spouse && parsed[spouseData.spouse.id]?.length > 0) {
              customOrder = parsed[spouseData.spouse.id];
            }
          }
        }
      } catch (e) {}

      // 2. Sort children
      return [...childrenIds].sort((aId, bId) => {
        const pA = peopleMap.get(aId);
        const pB = peopleMap.get(bId);
        if (!pA || !pB) return 0;

        // Prioritas 1: Custom order (drag to reorder)
        if (customOrder.length > 0) {
          const idxA = customOrder.indexOf(aId);
          const idxB = customOrder.indexOf(bId);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
        }

        // Prioritas 2: DB sort_order
        const relA = parentChildRels.find((r) => r.child_id === aId && r.parent_id === parentId);
        const relB = parentChildRels.find((r) => r.child_id === bId && r.parent_id === parentId);
        if (relA && relB && typeof relA.sort_order === "number" && typeof relB.sort_order === "number") {
          if (relA.sort_order !== relB.sort_order) return relA.sort_order - relB.sort_order;
        }

        // Prioritas 3: Tanggal lahir (tertua di kiri / urutan awal)
        if (pA.birth_date && pB.birth_date) {
          return pA.birth_date.localeCompare(pB.birth_date);
        }
        if (pA.birth_date) return -1;
        if (pB.birth_date) return 1;

        return pA.full_name.localeCompare(pB.full_name);
      });
    },
    [peopleMap, parentChildRels, personToUnions, unionToMembers]
  );

  // Struktur Kolom Anak-Cucu-Cicit dari Tokoh Utama (dengan urutan persis)
  const childColumns: ChildColumn[] = useMemo(() => {
    if (!mainPerson) return [];
    const rawChildIds = parentToChildren.get(mainPerson.id) || [];
    const mainUnionId = getSpouse(mainPerson.id).union?.id;
    const childIds = sortChildrenIds(mainPerson.id, rawChildIds, mainUnionId);

    return childIds.map((cId) => {
      const child = peopleMap.get(cId)!;
      const { spouse, union } = getSpouse(cId);

      // Cucu (Anak dari child ini) - Terurut rapi
      const rawCucuIds = parentToChildren.get(cId) || [];
      const cucuIds = sortChildrenIds(cId, rawCucuIds, union?.id);
      const cucuList: CucuNode[] = cucuIds.map((gcId) => {
        const gcChild = peopleMap.get(gcId)!;
        const gcSpouseData = getSpouse(gcId);

        // Cicit (Anak dari cucu ini) - Terurut rapi
        const rawCicitIds = parentToChildren.get(gcId) || [];
        const cicitIds = sortChildrenIds(gcId, rawCicitIds, gcSpouseData.union?.id);
        const cicitList: CicitNode[] = cicitIds.map((ggcId) => {
          const ggcChild = peopleMap.get(ggcId)!;
          const ggcSpouseData = getSpouse(ggcId);
          return {
            child: ggcChild,
            spouse: ggcSpouseData.spouse,
          };
        });

        return {
          child: gcChild,
          spouse: gcSpouseData.spouse,
          union: gcSpouseData.union,
          cicit: cicitList,
        };
      });

      return {
        child,
        spouse,
        union,
        cucu: cucuList,
      };
    });
  }, [mainPerson, parentToChildren, peopleMap, personToUnions, unionToMembers, sortChildrenIds]);

  if (!mainPerson) {
    return <div className="p-8 text-center text-muted">Data silsilah belum tersedia.</div>;
  }

  return (
    <div
      ref={containerRef}
      className="zuriat-chart-wrapper"
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#1B3B2B",
        backgroundImage: "radial-gradient(ellipse at center, #26503B 0%, #152E22 100%)",
        color: "#1E293B",
        padding: "16px 20px 60px",
        overflowX: "auto",
        overflowY: "auto",
        fontFamily: "'Inter', sans-serif",
        position: "relative",
      }}
    >
      {/* Sticky Floating Control Bar (No Print) */}
      <div
        className="no-print"
        style={{
          position: "sticky",
          top: "8px",
          left: 0,
          right: 0,
          zIndex: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: "1000px",
          margin: "0 auto 16px",
          background: "rgba(17, 43, 31, 0.9)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(254, 240, 138, 0.3)",
          padding: "6px 14px",
          borderRadius: "30px",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        {/* Zoom Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            onClick={handleZoomOut}
            style={{
              padding: "5px",
              borderRadius: "50%",
              border: "none",
              background: "rgba(255,255,255,0.08)",
              color: "#FEF08A",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Perkecil (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "#FEF08A",
              minWidth: "44px",
              textAlign: "center",
              userSelect: "none",
            }}
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            style={{
              padding: "5px",
              borderRadius: "50%",
              border: "none",
              background: "rgba(255,255,255,0.08)",
              color: "#FEF08A",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Perbesar (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div style={{ width: 1, height: 16, background: "rgba(254,240,138,0.25)", margin: "0 4px" }} />
          <button
            onClick={handleFitWidth}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 10px",
              fontSize: "11px",
              fontWeight: 600,
              color: "#FEF08A",
              background: "rgba(254, 240, 138, 0.12)",
              border: "1px solid rgba(254, 240, 138, 0.35)",
              borderRadius: "20px",
              cursor: "pointer",
            }}
            title="Sesuaikan bagan agar pas di layar tanpa terpotong"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Pas di Layar
          </button>
          <button
            onClick={handleResetZoom}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 10px",
              fontSize: "11px",
              fontWeight: 600,
              color: "#FEF08A",
              background: "transparent",
              border: "none",
              borderRadius: "20px",
              cursor: "pointer",
            }}
            title="Reset ke skala 100%"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            100%
          </button>
        </div>

        {/* Print / Export Button */}
        <button
          onClick={handlePrint}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 14px",
            background: "#FDE047",
            color: "#1E293B",
            border: "none",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
            transition: "all 0.15s ease",
          }}
        >
          <Printer className="w-4 h-4 text-stone-900" />
          Cetak / Export PDF Bagan
        </button>
      </div>

      {/* Main Chart Area (Scaled for screen, full resolution for print) */}
      <div
        id="zuriat-chart-print-area"
        ref={chartRef}
        style={{
          minWidth: `${Math.max(1100, childColumns.length * 360)}px`,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: `scale(${zoom})`,
          transformOrigin: "top center",
          transition: "transform 0.15s ease",
        }}
      >

        <div
          style={{
            textAlign: "center",
            marginBottom: "28px",
            position: "relative",
            width: "100%",
            maxWidth: "900px",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              fontWeight: 800,
              color: "#FEF08A",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              marginBottom: "6px",
            }}
          >
            (BAGAN SILSILAH RESMI)
          </div>

          {isEditingTitle ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setIsEditingTitle(false);
                if (tempTitle.trim() && onTitleChange) {
                  onTitleChange(tempTitle.trim());
                }
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
            >
              <input
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                autoFocus
                onBlur={() => {
                  setIsEditingTitle(false);
                  if (tempTitle.trim() && onTitleChange) {
                    onTitleChange(tempTitle.trim());
                  }
                }}
                style={{
                  fontSize: "24px",
                  fontWeight: 900,
                  color: "#1E293B",
                  background: "#FEF08A",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "2px solid #CA8A04",
                  outline: "none",
                  textAlign: "center",
                  minWidth: "400px",
                }}
              />
              <button
                type="submit"
                style={{
                  background: "#FDE047",
                  border: "none",
                  borderRadius: "6px",
                  padding: "8px",
                  cursor: "pointer",
                }}
              >
                <Check className="w-5 h-5 text-stone-900" />
              </button>
            </form>
          ) : (
            <div
              onClick={() => {
                setTempTitle(
                  customTitle ||
                    `SILSILAH ZURIAT ${mainPerson.display_name || mainPerson.full_name}${
                      mainSpouse ? ` & ${mainSpouse.display_name || mainSpouse.full_name}` : ""
                    }`
                );
                setIsEditingTitle(true);
              }}
              style={{
                fontSize: "28px",
                fontWeight: 900,
                color: "#FDE047",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                background: "rgba(0,0,0,0.25)",
                padding: "10px 24px",
                borderRadius: "8px",
                border: "1px solid rgba(254, 240, 138, 0.3)",
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
              }}
              title="Klik untuk mengedit judul bagan"
            >
              <span>
                {customTitle ||
                  `SILSILAH ZURIAT ${mainPerson.display_name || mainPerson.full_name}${
                    mainSpouse ? ` & ${mainSpouse.display_name || mainSpouse.full_name}` : ""
                  }`}
              </span>
              <Pencil className="w-4 h-4 text-yellow-300 opacity-60 hover:opacity-100 transition-opacity" />
            </div>
          )}
        </div>

        {/* ================= MOYANG / LELUHUR ================= */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "80px",
            marginBottom: "24px",
            position: "relative",
          }}
        >
          {/* Moyang Pihak Suami/Utama */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#E2E8F0",
                textTransform: "uppercase",
                marginBottom: "6px",
                letterSpacing: "0.05em",
              }}
            >
              Leluhur Pihak {mainPerson.display_name || mainPerson.full_name}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              {mainParents.length > 0 ? (
                mainParents.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onPersonClick?.(p.id)}
                    style={{
                      background: "#FFFFFF",
                      border: "2px solid #C2410C",
                      borderRadius: "6px",
                      padding: "8px 14px",
                      textAlign: "center",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#C2410C" }}>
                      MOYANG
                    </div>
                    <div
                      style={{
                        ...getAdaptiveNameStyle(formatNameWithTitle(p), 12, 9),
                        fontWeight: 800,
                        color: "#0F172A",
                      }}
                    >
                      {formatNameWithTitle(p)}
                    </div>
                  </button>
                ))
              ) : (
                <div
                  style={{
                    background: "rgba(255,255,255,0.9)",
                    border: "1px dashed #CBD5E1",
                    borderRadius: "6px",
                    padding: "6px 16px",
                    fontSize: "12px",
                    color: "#64748B",
                  }}
                >
                  Moyang TGH. Abdul Mu&apos;in &amp; Masdep
                </div>
              )}
            </div>
          </div>

          {/* Moyang Pihak Pasangan */}
          {mainSpouse && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#E2E8F0",
                  textTransform: "uppercase",
                  marginBottom: "6px",
                  letterSpacing: "0.05em",
                }}
              >
                Leluhur Pihak {mainSpouse.display_name || mainSpouse.full_name}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                {spouseParents.length > 0 ? (
                  spouseParents.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => onPersonClick?.(p.id)}
                      style={{
                        background: "#FFFFFF",
                        border: "2px solid #C2410C",
                        borderRadius: "6px",
                        padding: "8px 14px",
                        textAlign: "center",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#C2410C" }}>
                        MOYANG
                      </div>
                      <div
                        style={{
                          ...getAdaptiveNameStyle(formatNameWithTitle(p), 12, 9),
                          fontWeight: 800,
                          color: "#0F172A",
                        }}
                      >
                        {formatNameWithTitle(p)}
                      </div>
                    </button>
                  ))
                ) : (
                  <div
                    style={{
                      background: "rgba(255,255,255,0.9)",
                      border: "1px dashed #CBD5E1",
                      borderRadius: "6px",
                      padding: "6px 16px",
                      fontSize: "12px",
                      color: "#64748B",
                    }}
                  >
                    Moyang Bohari &amp; Amnah
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Garis vertikal dari Moyang ke Tokoh Utama */}
        <div
          style={{
            width: "2px",
            height: "18px",
            background: "#FEF08A",
            marginBottom: "0",
          }}
        />

        {/* ================= TOKOH UTAMA (PUSAT SILSILAH) ================= */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "24px",
            background: "rgba(0,0,0,0.4)",
            padding: "10px 16px",
            borderRadius: "12px",
            border: "2px solid #84CC16",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
        >
          {/* Tokoh Utama */}
          <button
            onClick={() => onPersonClick?.(mainPerson.id)}
            style={{
              background: "#15803D",
              color: "#FFFFFF",
              border: "2px solid #4ADE80",
              borderRadius: "8px",
              padding: "12px 20px",
              textAlign: "center",
              cursor: "pointer",
              minWidth: "180px",
              maxWidth: "260px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{
                ...getAdaptiveNameStyle(formatNameWithTitle(mainPerson), 16, 12),
                fontWeight: 900,
                textTransform: "uppercase",
              }}
            >
              {formatNameWithTitle(mainPerson)}
            </div>
            <div style={{ fontSize: "11px", color: "#BBF7D0", marginTop: "2px", fontWeight: 600 }}>
              KEPALA ZURIAT
            </div>
          </button>

          {/* Simbol Pernikahan */}
          {(() => {
            const info = getUnionMortalityInfo([mainPerson, mainSpouse]);
            const badgeBg = info.isOneDeceased ? "#FAF5FF" : info.isBothDeceased ? "#F4F4F5" : "#FFF1F2";
            const badgeBorder = info.isOneDeceased ? "#9333EA" : info.isBothDeceased ? "#71717A" : "#E11D48";
            const iconColor = info.isOneDeceased ? "text-purple-600" : info.isBothDeceased ? "text-zinc-600" : "text-rose-600";

            return (
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: badgeBg,
                  border: `2px solid ${badgeBorder}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                  cursor: "help",
                }}
                title={`Pernikahan: ${info.statusLabel}\n${info.doaText}`}
              >
                <HeartHandshake className={`w-5 h-5 ${iconColor}`} />
              </div>
            );
          })()}

          {/* Pasangan */}
          {mainSpouse && (
            <button
              onClick={() => onPersonClick?.(mainSpouse.id)}
              style={{
                background: "#15803D",
                color: "#FFFFFF",
                border: "2px solid #4ADE80",
                borderRadius: "8px",
                padding: "12px 20px",
                textAlign: "center",
                cursor: "pointer",
                minWidth: "180px",
                maxWidth: "260px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              }}
            >
              <div
                style={{
                  ...getAdaptiveNameStyle(formatNameWithTitle(mainSpouse), 16, 12),
                  fontWeight: 900,
                  textTransform: "uppercase",
                }}
              >
                {formatNameWithTitle(mainSpouse)}
              </div>
              <div style={{ fontSize: "11px", color: "#BBF7D0", marginTop: "2px", fontWeight: 600 }}>
                ISTRI KEPALA ZURIAT
              </div>
            </button>
          )}
        </div>

        {/* Garis vertikal turun ke baris anak */}
        <div
          style={{
            width: "3px",
            height: "24px",
            background: "#FDE047",
          }}
        />

        {/* ================= CABANG ANAK, MENANTU, CUCU, CICIT ================= */}
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            position: "relative",
            paddingTop: "24px",
          }}
        >
          {/* Garis horizontal bus yang membagikan cabang ke setiap kolom anak */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "60px",
              right: "60px",
              height: "3px",
              background: "#FDE047",
            }}
          />

          {/* Kolom-kolom anak */}
          <div
            style={{
              display: "flex",
              gap: "36px",
              justifyContent: "center",
              alignItems: "flex-start",
              width: "100%",
            }}
          >
            {childColumns.map((col, colIdx) => (
              <div
                key={col.child.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  minWidth: "260px",
                  position: "relative",
                }}
              >
                {/* Garis vertikal dari bus horizontal ke kartu anak */}
                <div
                  style={{
                    width: "2px",
                    height: "24px",
                    background: "#FDE047",
                    position: "absolute",
                    top: "-24px",
                  }}
                />

                {/* ================= KARTU ANAK + MENANTU ================= */}
                <div
                  style={{
                    width: "100%",
                    maxWidth: "240px",
                    borderRadius: "8px",
                    overflow: "hidden",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
                    border: "2px solid #F59E0B",
                    marginBottom: "24px",
                  }}
                >
                  {/* Bagian Atas: ANAK KANDUNG (Warna Kuning/Emas sesuai referensi) */}
                  <button
                    onClick={() => onPersonClick?.(col.child.id)}
                    style={{
                      width: "100%",
                      background: "#FEF08A",
                      color: "#78350F",
                      padding: "10px 12px",
                      border: "none",
                      borderBottom: col.spouse ? "1px solid #FCD34D" : "none",
                      textAlign: "center",
                      cursor: "pointer",
                      display: "block",
                    }}
                  >
                    <div
                      style={{
                        ...getAdaptiveNameStyle(formatNameWithTitle(col.child), 13, 10),
                        fontWeight: 900,
                        textTransform: "uppercase",
                      }}
                    >
                      {formatNameWithTitle(col.child)}
                    </div>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "#92400E", marginTop: "2px" }}>
                      ANAK KE-{colIdx + 1}
                    </div>
                  </button>

                  {/* Bagian Bawah: MENANTU (Warna Putih sesuai referensi) */}
                  {col.spouse ? (
                    <button
                      onClick={() => onPersonClick?.(col.spouse!.id)}
                      style={{
                        width: "100%",
                        background: "#FFFFFF",
                        color: "#0F172A",
                        padding: "8px 12px",
                        border: "none",
                        textAlign: "center",
                        cursor: "pointer",
                        display: "block",
                      }}
                    >
                      <div
                        style={{
                          ...getAdaptiveNameStyle(formatNameWithTitle(col.spouse), 12, 9.5),
                          fontWeight: 700,
                        }}
                      >
                        {formatNameWithTitle(col.spouse)}
                      </div>
                      <div style={{ fontSize: "10px", color: "#64748B", fontWeight: 600 }}>
                        MENANTU
                      </div>
                    </button>
                  ) : (
                    <div
                      style={{
                        background: "#FFFFFF",
                        padding: "4px 8px",
                        textAlign: "center",
                        fontSize: "10px",
                        color: "#94A3B8",
                        fontStyle: "italic",
                      }}
                    >
                      (Lajang / Belum Berkeluarga)
                    </div>
                  )}
                </div>

                {/* ================= DAFTAR CUCU (DAN CICIT) ================= */}
                {col.cucu.length > 0 && (
                  <div
                    style={{
                      width: "100%",
                      display: "flex",
                      flexDirection: "column",
                      gap: "14px",
                      position: "relative",
                      paddingLeft: "16px",
                      borderLeft: "2px dashed rgba(254, 240, 138, 0.4)",
                    }}
                  >
                    {col.cucu.map((gc, gcIdx) => (
                      <div
                        key={gc.child.id}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "12px",
                          position: "relative",
                        }}
                      >
                        {/* Blok Pasangan Cucu (Anak Kandung: Biru, Menantu: Putih) */}
                        <div
                          style={{
                            width: "190px",
                            borderRadius: "6px",
                            overflow: "hidden",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                            border: "1.5px solid #60A5FA",
                            flexShrink: 0,
                          }}
                        >
                          {/* Cucu (Anak Kandung) — Warna Biru Muda */}
                          <button
                            onClick={() => onPersonClick?.(gc.child.id)}
                            style={{
                              width: "100%",
                              background: "#BFDBFE",
                              color: "#1E3A8A",
                              padding: "6px 8px",
                              border: "none",
                              borderBottom: gc.spouse ? "1px solid #93C5FD" : "none",
                              textAlign: "center",
                              cursor: "pointer",
                              display: "block",
                            }}
                          >
                            <div
                              style={{
                                ...getAdaptiveNameStyle(formatNameWithTitle(gc.child), 11, 9),
                                fontWeight: 800,
                              }}
                            >
                              {formatNameWithTitle(gc.child)}
                            </div>
                            <div style={{ fontSize: "9px", color: "#1D4ED8", fontWeight: 700 }}>
                              CUCU KE-{gcIdx + 1}
                            </div>
                          </button>

                          {/* Menantu Cucu — Warna Putih */}
                          {gc.spouse && (
                            <button
                              onClick={() => onPersonClick?.(gc.spouse!.id)}
                              style={{
                                width: "100%",
                                background: "#FFFFFF",
                                color: "#0F172A",
                                padding: "6px 8px",
                                border: "none",
                                textAlign: "center",
                                cursor: "pointer",
                                display: "block",
                              }}
                            >
                              <div
                                style={{
                                  ...getAdaptiveNameStyle(formatNameWithTitle(gc.spouse), 11, 9),
                                  fontWeight: 700,
                                }}
                              >
                                {formatNameWithTitle(gc.spouse)}
                              </div>
                              <div style={{ fontSize: "9px", color: "#64748B", fontWeight: 600 }}>
                                MENANTU
                              </div>
                            </button>
                          )}
                        </div>

                        {/* Cabang ke Cicit (jika ada) */}
                        {gc.cicit.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "6px",
                              paddingLeft: "10px",
                              borderLeft: "2px solid #93C5FD",
                              justifyContent: "center",
                            }}
                          >
                            <div style={{ fontSize: "9px", fontWeight: 800, color: "#93C5FD" }}>
                              CICIT:
                            </div>
                            {gc.cicit.map((ggc) => (
                              <button
                                key={ggc.child.id}
                                onClick={() => onPersonClick?.(ggc.child.id)}
                                style={{
                                  background: "#EFF6FF",
                                  border: "1px solid #60A5FA",
                                  borderRadius: "4px",
                                  padding: "4px 8px",
                                  textAlign: "left",
                                  cursor: "pointer",
                                  color: "#1E3A8A",
                                  maxWidth: "185px",
                                  whiteSpace: "normal",
                                }}
                              >
                                <span
                                  style={{
                                    ...getAdaptiveNameStyle(formatNameWithTitle(ggc.child), 11, 8.5),
                                    fontWeight: 700,
                                    display: "block",
                                  }}
                                >
                                  {formatNameWithTitle(ggc.child)}
                                </span>
                                {ggc.spouse && (
                                  <span
                                    style={{
                                      ...getAdaptiveNameStyle(formatNameWithTitle(ggc.spouse), 10, 8),
                                      color: "#64748B",
                                      display: "block",
                                      marginTop: "2px",
                                    }}
                                  >
                                    + {formatNameWithTitle(ggc.spouse)}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ================= LEGENDA / KETERANGAN RESMI ================= */}
        <div
          style={{
            marginTop: "60px",
            background: "rgba(0,0,0,0.5)",
            border: "1px solid rgba(254, 240, 138, 0.4)",
            borderRadius: "8px",
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            gap: "28px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ fontSize: "12px", fontWeight: 900, color: "#FEF08A", letterSpacing: "0.08em" }}>
            KETERANGAN:
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "24px", height: "16px", background: "#FEF08A", border: "1px solid #B45309", borderRadius: "3px" }} />
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#FFFFFF" }}>Anak Utama</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "24px", height: "16px", background: "#BFDBFE", border: "1px solid #3B82F6", borderRadius: "3px" }} />
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#FFFFFF" }}>Anak Kandung (Cucu/Cicit)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "24px", height: "16px", background: "#FFFFFF", border: "1px solid #94A3B8", borderRadius: "3px" }} />
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#FFFFFF" }}>Menantu (Pasangan)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 800, color: "#FEF08A" }}>(Alm)</span>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#E2E8F0" }}>Almarhum / Wafat</span>
          </div>
        </div>
      </div>
    </div>
  );
}
