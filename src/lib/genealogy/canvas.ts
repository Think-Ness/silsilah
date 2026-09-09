// ============================================================
// Canvas Graph Builder — Generational Family Tree Layout Engine
// Menata pasangan suami-istri berdampingan dengan badge pernikahan
// dan cabang anak orthogonal berlabel jelas tanpa garis saling silang.
// ============================================================

import type { Node, Edge } from "@xyflow/react";
import type {
  PersonWithPortrait,
  ParentChildRelationship,
  Union,
  UnionMember,
} from "@/types/genealogy";

export interface PersonNodeData {
  person: PersonWithPortrait;
  spouses: PersonWithPortrait[];
  lineageRole:
    | "root"
    | "root_spouse"
    | "parent"
    | "grandparent"
    | "great_grandparent"
    | "ancestor"
    | "sibling"
    | "child"
    | "in_law"
    | "grandchild"
    | "great_grandchild"
    | "nephew_niece"
    | "descendant";
  roleLabel: string;
  childOrderLabel?: string | null;
  childrenCount?: number | null;
  parentsNames?: string[];
  generation: number;
  isHighlighted?: boolean;
  hasFather?: boolean;
  hasMother?: boolean;
  availableSnapshots?: {
    parents: PersonWithPortrait[];
    siblings: PersonWithPortrait[];
    spouses: PersonWithPortrait[];
    children: PersonWithPortrait[];
  };
  canvasId?: string;
  isDefaultCanvas?: boolean;
  [key: string]: unknown;
}

export interface UnionNodeData {
  union: Union;
  memberIds: string[];
  members?: PersonWithPortrait[];
  [key: string]: unknown;
}

export const PERSON_NODE_WIDTH = 240;
export const PERSON_NODE_HEIGHT = 115;
const COUPLE_GAP = 90;
const SIBLING_GAP = 90;
const SPOUSE_STACK_GAP = 28;
const BESAN_GAP = 140;
const GENERATION_HEIGHT = 280;
const UNION_NODE_SIZE = 28;

interface SpouseUnitInfo {
  spouse: PersonWithPortrait;
  union: Union;
}

interface FamilyUnit {
  id: string;
  primaryPerson: PersonWithPortrait;
  spouses: SpouseUnitInfo[];
  generation: number;
  childUnitIds: string[];
  subtreeWidth: number;
  x: number;
  y: number;
}

function getStoredChildOrders(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("silsilah_child_order_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        for (const [key, val] of Object.entries(parsed)) {
          if (Array.isArray(val)) {
            map.set(key, val as string[]);
          }
        }
      }
    } catch (e) {}
  }
  return map;
}

/** Hitung tata letak pohon silsilah keluarga terstruktur per generasi */
export function calculateFamilyTreePositions(
  people: PersonWithPortrait[],
  unions: Union[],
  unionMembers: UnionMember[],
  parentChildRels: ParentChildRelationship[],
  customChildOrders?: Map<string, string[]>,
  rootPersonId?: string | null
): Map<string, { x: number; y: number }> {
  const effectiveChildOrders = customChildOrders || getStoredChildOrders();
  const positions = new Map<string, { x: number; y: number }>();
  if (people.length === 0) return positions;

  const peopleMap = new Map(people.map((p) => [p.id, p]));

  // Index union -> members
  const unionToMembers = new Map<string, string[]>();
  for (const um of unionMembers) {
    if (!unionToMembers.has(um.union_id)) unionToMembers.set(um.union_id, []);
    unionToMembers.get(um.union_id)!.push(um.person_id);
  }

  // Index person -> unions
  const personToUnions = new Map<string, string[]>();
  for (const um of unionMembers) {
    if (!personToUnions.has(um.person_id)) personToUnions.set(um.person_id, []);
    personToUnions.get(um.person_id)!.push(um.union_id);
  }

  // Index child -> parents
  const childToParents = new Map<string, string[]>();
  const parentToChildren = new Map<string, string[]>();
  for (const rel of parentChildRels) {
    if (!childToParents.has(rel.child_id)) childToParents.set(rel.child_id, []);
    childToParents.get(rel.child_id)!.push(rel.parent_id);

    if (!parentToChildren.has(rel.parent_id)) parentToChildren.set(rel.parent_id, []);
    parentToChildren.get(rel.parent_id)!.push(rel.child_id);
  }

  // 1. Hitung Generasi tiap orang (Top-down propagation)
  const generationMap = new Map<string, number>();

  // Orang tanpa orang tua = Generasi 0
  for (const p of people) {
    const parents = childToParents.get(p.id) || [];
    if (parents.length === 0) {
      generationMap.set(p.id, 0);
    }
  }

  // Propagasi generasi ke pasangan & anak berulang sampai stabil
  for (let pass = 0; pass < 10; pass++) {
    let changed = false;

    // Pasangan memiliki generasi yang sama
    for (const [, members] of unionToMembers) {
      if (members.length >= 2) {
        const gen0 = generationMap.get(members[0]);
        const gen1 = generationMap.get(members[1]);
        if (gen0 != null && gen1 == null) {
          generationMap.set(members[1], gen0);
          changed = true;
        } else if (gen1 != null && gen0 == null) {
          generationMap.set(members[0], gen1);
          changed = true;
        }
      }
    }

    // Anak memiliki generasi = max(orang tua) + 1
    for (const rel of parentChildRels) {
      const parentGen = generationMap.get(rel.parent_id);
      if (parentGen != null) {
        const currentChildGen = generationMap.get(rel.child_id);
        const expectedGen = parentGen + 1;
        if (currentChildGen == null || currentChildGen < expectedGen) {
          generationMap.set(rel.child_id, expectedGen);
          changed = true;
        }
      }
    }

    if (!changed) break;
  }

  // Default bagi yang belum terisi
  for (const p of people) {
    if (!generationMap.has(p.id)) generationMap.set(p.id, 0);
  }

  // 2. Bentuk Family Units (Mendukung Poligami / Multi-Spouse & Single)
  const placedPeople = new Set<string>();
  const familyUnits: FamilyUnit[] = [];
  const personToUnitId = new Map<string, string>();

  // Map union id -> union object
  const unionById = new Map(unions.map((u) => [u.id, u]));

  // Prioritaskan orang yang memiliki keturunan atau garis darah (bukan hanya menantu)
  const sortedPeople = [...people].sort((a, b) => {
    const aHasParents = (childToParents.get(a.id) || []).length > 0;
    const bHasParents = (childToParents.get(b.id) || []).length > 0;
    if (aHasParents && !bHasParents) return -1;
    if (!aHasParents && bHasParents) return 1;
    const aChildren = (parentToChildren.get(a.id) || []).length;
    const bChildren = (parentToChildren.get(b.id) || []).length;
    return bChildren - aChildren;
  });

  for (const person of sortedPeople) {
    if (placedPeople.has(person.id)) continue;

    const uIds = personToUnions.get(person.id) || [];
    const spouses: SpouseUnitInfo[] = [];

    for (const uId of uIds) {
      const union = unionById.get(uId);
      if (!union) continue;
      const memberIds = unionToMembers.get(uId) || [];
      const spouseId = memberIds.find((mId) => mId !== person.id);
      if (spouseId && !placedPeople.has(spouseId)) {
        const spouseObj = peopleMap.get(spouseId);
        if (spouseObj) {
          spouses.push({ spouse: spouseObj, union });
          placedPeople.add(spouseId);
        }
      }
    }

    const gen = generationMap.get(person.id) ?? 0;
    const unit: FamilyUnit = {
      id: `unit-${person.id}`,
      primaryPerson: person,
      spouses,
      generation: gen,
      childUnitIds: [],
      subtreeWidth: 0,
      x: 0,
      y: gen * GENERATION_HEIGHT,
    };

    familyUnits.push(unit);
    personToUnitId.set(person.id, unit.id);
    for (const s of spouses) {
      personToUnitId.set(s.spouse.id, unit.id);
    }
    placedPeople.add(person.id);
  }

  const unitMap = new Map(familyUnits.map((u) => [u.id, u]));

  // 3. Hubungkan unit orang tua ke unit anak
  for (const rel of parentChildRels) {
    const parentUnitId = personToUnitId.get(rel.parent_id);
    const childUnitId = personToUnitId.get(rel.child_id);

    if (parentUnitId && childUnitId && parentUnitId !== childUnitId) {
      const parentUnit = unitMap.get(parentUnitId);
      if (parentUnit && !parentUnit.childUnitIds.includes(childUnitId)) {
        parentUnit.childUnitIds.push(childUnitId);
      }
    }
  }

  // 3.5. Urutkan childUnitIds untuk setiap parent unit (Anak ke-1 di kiri, ke-2 dst)
  for (const unit of familyUnits) {
    if (unit.childUnitIds.length > 1) {
      let explicitOrder: string[] | undefined;
      if (effectiveChildOrders) {
        if (effectiveChildOrders.has(unit.primaryPerson.id)) {
          explicitOrder = effectiveChildOrders.get(unit.primaryPerson.id);
        }
        for (const s of unit.spouses) {
          if (!explicitOrder && effectiveChildOrders.has(s.union.id)) {
            explicitOrder = effectiveChildOrders.get(s.union.id);
          } else if (!explicitOrder && effectiveChildOrders.has(s.spouse.id)) {
            explicitOrder = effectiveChildOrders.get(s.spouse.id);
          }
        }
      }

      const parentIds = [unit.primaryPerson.id, ...unit.spouses.map((s) => s.spouse.id)];

      const getChildPerson = (u?: FamilyUnit): PersonWithPortrait | undefined => {
        if (!u) return undefined;
        const isPrimaryChild = parentIds.some((pId) => (parentToChildren.get(pId) || []).includes(u.primaryPerson.id));
        if (isPrimaryChild) return u.primaryPerson;
        for (const s of u.spouses) {
          if (parentIds.some((pId) => (parentToChildren.get(pId) || []).includes(s.spouse.id))) {
            return s.spouse;
          }
        }
        return u.primaryPerson;
      };

      const originalOrder = new Map(unit.childUnitIds.map((id, idx) => [id, idx]));

      unit.childUnitIds.sort((aId, bId) => {
        const uA = unitMap.get(aId);
        const uB = unitMap.get(bId);
        const pA = getChildPerson(uA);
        const pB = getChildPerson(uB);
        if (!pA || !pB) return (originalOrder.get(aId) ?? 0) - (originalOrder.get(bId) ?? 0);

        // 1. Prioritaskan urutan eksplisit (drag & drop modal)
        if (explicitOrder && explicitOrder.length > 0) {
          const idxA = explicitOrder.indexOf(pA.id);
          const idxB = explicitOrder.indexOf(pB.id);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
        }

        // 2. Prioritaskan sort_order dari database parentChildRels
        const relA = parentChildRels.find(
          (r) => r.child_id === pA.id && parentIds.includes(r.parent_id)
        );
        const relB = parentChildRels.find(
          (r) => r.child_id === pB.id && parentIds.includes(r.parent_id)
        );

        if (
          relA &&
          relB &&
          typeof relA.sort_order === "number" &&
          typeof relB.sort_order === "number"
        ) {
          if (relA.sort_order !== relB.sort_order) {
            return relA.sort_order - relB.sort_order;
          }
        }

        // 3. Fallback: Tanggal lahir (tertua di kiri)
        if (pA.birth_date && pB.birth_date) {
          const cmp = pA.birth_date.localeCompare(pB.birth_date);
          if (cmp !== 0) return cmp;
        } else if (pA.birth_date && !pB.birth_date) {
          return -1;
        } else if (!pA.birth_date && pB.birth_date) {
          return 1;
        }

        return (originalOrder.get(aId) ?? 0) - (originalOrder.get(bId) ?? 0);
      });
    }
  }

  // 4. Identifikasi Focal Couple / Zuriat Center (Unit dengan keturunan terbanyak)
  function countDescendants(unitId: string, visited = new Set<string>()): number {
    if (visited.has(unitId)) return 0;
    visited.add(unitId);
    const unit = unitMap.get(unitId);
    if (!unit) return 0;
    let count = unit.childUnitIds.length;
    for (const cId of unit.childUnitIds) {
      count += countDescendants(cId, visited);
    }
    return count;
  }

  // 4. Identifikasi Focal Couple & Topmost Ancestor Unit untuk POV Canvas
  let focalUnit: FamilyUnit | null = null;
  let startRootUnit: FamilyUnit | null = null;

  if (rootPersonId) {
    focalUnit =
      familyUnits.find(
        (u) =>
          u.primaryPerson.id === rootPersonId ||
          u.spouses.some((s) => s.spouse.id === rootPersonId)
      ) || null;

    // Cari leluhur tertinggi dari rootPersonId untuk menjadi titik awal penataan pohon POV
    let curPId: string | undefined = rootPersonId;
    let curUnit = focalUnit;
    const seenAncestors = new Set<string>();

    while (curPId && !seenAncestors.has(curPId)) {
      seenAncestors.add(curPId);
      const parentIds: string[] = childToParents.get(curPId) || [];
      if (parentIds.length > 0) {
        const pUnit: FamilyUnit | undefined = familyUnits.find(
          (u) =>
            u.primaryPerson.id === parentIds[0] ||
            u.spouses.some((s) => s.spouse.id === parentIds[0])
        );
        if (pUnit) {
          curUnit = pUnit;
          curPId = pUnit.primaryPerson.id;
          continue;
        }
      }
      break;
    }
    startRootUnit = curUnit || focalUnit;
  }

  if (!focalUnit) {
    let maxDirectChildren = -1;
    for (const unit of familyUnits) {
      const childCount = unit.childUnitIds.length;
      if (childCount > maxDirectChildren && childCount > 0) {
        maxDirectChildren = childCount;
        focalUnit = unit;
      }
    }
  }

  if (!focalUnit && familyUnits.length > 0) {
    focalUnit = familyUnits[0];
  }

  const primaryStartUnit = startRootUnit || focalUnit;

  // 5. Hitung lebar subtree secara rekursif (Bottom-Up)
  function computeSubtreeWidth(unit: FamilyUnit, visited = new Set<string>()): number {
    if (visited.has(unit.id)) return unit.subtreeWidth;
    visited.add(unit.id);

    // Multi-spouse stacked di kolom kanan: lebar kartu = suami + gap + istri
    const selfWidth =
      unit.spouses.length > 0
        ? PERSON_NODE_WIDTH + COUPLE_GAP + PERSON_NODE_WIDTH
        : PERSON_NODE_WIDTH;

    if (unit.childUnitIds.length === 0) {
      unit.subtreeWidth = selfWidth;
      return selfWidth;
    }

    let childrenWidth = 0;
    for (let i = 0; i < unit.childUnitIds.length; i++) {
      const childUnit = unitMap.get(unit.childUnitIds[i]);
      if (childUnit) {
        const cw = computeSubtreeWidth(childUnit, visited);
        childrenWidth += cw + (i > 0 ? SIBLING_GAP : 0);
      }
    }

    unit.subtreeWidth = Math.max(selfWidth, childrenWidth);
    return unit.subtreeWidth;
  }

  for (const u of familyUnits) {
    computeSubtreeWidth(u);
  }

  // 6. Tempatkan koordinat X & Y
  function assignCoordinates(
    unit: FamilyUnit,
    startX: number,
    baseY: number,
    visited = new Set<string>()
  ) {
    if (visited.has(unit.id)) return;
    visited.add(unit.id);

    const selfWidth =
      unit.spouses.length > 0
        ? PERSON_NODE_WIDTH + COUPLE_GAP + PERSON_NODE_WIDTH
        : PERSON_NODE_WIDTH;

    const unitHeight =
      Math.max(1, unit.spouses.length) * (PERSON_NODE_HEIGHT + SPOUSE_STACK_GAP) -
      SPOUSE_STACK_GAP;

    // Filter anak-anak yang belum divisit
    const validChildren: FamilyUnit[] = [];
    for (let i = 0; i < unit.childUnitIds.length; i++) {
      const childUnit = unitMap.get(unit.childUnitIds[i]);
      if (childUnit && !visited.has(childUnit.id)) {
        validChildren.push(childUnit);
      }
    }

    // Jika unit ini tidak menaungi anak baru (misal unit leluhur),
    // gunakan selfWidth agar tidak tergeser oleh subtreeWidth anak yang sudah ditaruh duluan
    const effectiveWidth = validChildren.length > 0 ? unit.subtreeWidth : selfWidth;
    const cardX = startX + (effectiveWidth - selfWidth) / 2;
    const cardY = baseY;

    unit.x = cardX;
    unit.y = cardY;

    // Tempatkan Primary Person (Suami di kolom kiri)
    positions.set(`person-${unit.primaryPerson.id}`, { x: cardX, y: cardY });

    // Tempatkan setiap pasangan (Istri 1, Istri 2, dst) secara vertikal di kolom kanan
    for (let i = 0; i < unit.spouses.length; i++) {
      const spouseInfo = unit.spouses[i];
      const sX = cardX + PERSON_NODE_WIDTH + COUPLE_GAP;
      const sY = cardY + i * (PERSON_NODE_HEIGHT + SPOUSE_STACK_GAP);
      const uX =
        cardX +
        PERSON_NODE_WIDTH +
        COUPLE_GAP / 2 -
        UNION_NODE_SIZE / 2;
      const uY = sY + PERSON_NODE_HEIGHT / 2 - UNION_NODE_SIZE / 2;

      positions.set(`person-${spouseInfo.spouse.id}`, { x: sX, y: sY });
      positions.set(`union-${spouseInfo.union.id}`, { x: uX, y: uY });
    }

    // Tempatkan anak-anak di bawah unit ini jika ada
    if (validChildren.length > 0) {
      let totalChildrenWidth = 0;
      for (let i = 0; i < validChildren.length; i++) {
        totalChildrenWidth +=
          validChildren[i].subtreeWidth + (i > 0 ? SIBLING_GAP : 0);
      }

      let currentChildX = startX + (unit.subtreeWidth - totalChildrenWidth) / 2;
      const childY = baseY + Math.max(GENERATION_HEIGHT, unitHeight + 110);
      for (const childUnit of validChildren) {
        assignCoordinates(childUnit, currentChildX, childY, visited);
        currentChildX += childUnit.subtreeWidth + SIBLING_GAP;
      }
    }
  }

  const visitedUnits = new Set<string>();

  if (primaryStartUnit) {
    const startY = GENERATION_HEIGHT;
    const startX = 0;

    // Posisikan root lineage unit dan seluruh cabangnya
    assignCoordinates(primaryStartUnit, startX, startY, visitedUnits);
  }

  // 7. Posisikan Orang Tua / Leluhur & Besan (Anti Tabrakan dengan Gap Luas)
  // Menempatkan orang tua tepat di atas anak dan menantunya dengan jarak renggang & simetris
  const getParentUnitSelfWidth = (u: FamilyUnit) =>
    u.spouses.length > 0
      ? PERSON_NODE_WIDTH + COUPLE_GAP + PERSON_NODE_WIDTH
      : PERSON_NODE_WIDTH;

  let ancestorsPlaced = true;
  while (ancestorsPlaced) {
    ancestorsPlaced = false;

    for (const unit of familyUnits) {
      if (!visitedUnits.has(unit.id)) continue;

      // Kumpulkan pasangan di unit ini yang memiliki orang tua belum terpasang
      const membersInUnit: { person: PersonWithPortrait; isPrimary: boolean }[] = [
        { person: unit.primaryPerson, isPrimary: true },
        ...unit.spouses.map((s) => ({ person: s.spouse, isPrimary: false })),
      ];

      const parentUnitsToPlace: {
        member: PersonWithPortrait;
        parentUnit: FamilyUnit;
      }[] = [];

      for (const m of membersInUnit) {
        const pParentIds = childToParents.get(m.person.id) || [];
        for (const pId of pParentIds) {
          const pUnitId = personToUnitId.get(pId);
          if (pUnitId && !visitedUnits.has(pUnitId)) {
            const pUnit = unitMap.get(pUnitId);
            if (pUnit && !parentUnitsToPlace.some((item) => item.parentUnit.id === pUnit.id)) {
              parentUnitsToPlace.push({ member: m.person, parentUnit: pUnit });
            }
          }
        }
      }

      if (parentUnitsToPlace.length === 0) continue;

      const pY = unit.y - GENERATION_HEIGHT;

      if (parentUnitsToPlace.length === 1) {
        // Hanya 1 orang tua (misal hanya orang tua suami, atau hanya orang tua menantu)
        const item = parentUnitsToPlace[0];
        const memberPos = positions.get(`person-${item.member.id}`) || { x: unit.x, y: unit.y };
        const pWidth = getParentUnitSelfWidth(item.parentUnit);
        const pX = memberPos.x + PERSON_NODE_WIDTH / 2 - pWidth / 2;
        assignCoordinates(item.parentUnit, pX, pY, visitedUnits);
        ancestorsPlaced = true;
      } else {
        // Lebih dari 1 pihak orang tua (misal Orang Tua Suami & Orang Tua Menantu/Besan)
        // Hitung total lebar kedua keluarga dengan BESAN_GAP yang luas agar tidak bertumpuk
        let totalParentWidth = 0;
        for (let i = 0; i < parentUnitsToPlace.length; i++) {
          const pWidth = getParentUnitSelfWidth(parentUnitsToPlace[i].parentUnit);
          totalParentWidth += pWidth + (i > 0 ? BESAN_GAP : 0);
        }

        const firstPos = positions.get(`person-${parentUnitsToPlace[0].member.id}`) || { x: unit.x, y: unit.y };
        const lastPos = positions.get(`person-${parentUnitsToPlace[parentUnitsToPlace.length - 1].member.id}`) || { x: unit.x, y: unit.y };
        const coupleMidX = (firstPos.x + lastPos.x + PERSON_NODE_WIDTH) / 2;

        let curParentX = coupleMidX - totalParentWidth / 2;
        for (const item of parentUnitsToPlace) {
          const pWidth = getParentUnitSelfWidth(item.parentUnit);
          assignCoordinates(item.parentUnit, curParentX, pY, visitedUnits);
          curParentX += pWidth + BESAN_GAP;
          ancestorsPlaced = true;
        }
      }
    }
  }

  // 8. Posisikan sisa unit yang belum terhubung (Standalone families)
  let extraX = 0;
  for (const pos of positions.values()) {
    if (pos.x + PERSON_NODE_WIDTH > extraX) {
      extraX = pos.x + PERSON_NODE_WIDTH + SIBLING_GAP * 2;
    }
  }

  for (const unit of familyUnits) {
    if (!visitedUnits.has(unit.id)) {
      assignCoordinates(unit, extraX, unit.generation * GENERATION_HEIGHT, visitedUnits);
      extraX += unit.subtreeWidth + SIBLING_GAP * 2;
    }
  }

  // 9. Atomic Unit-Level Anti-Collision Pass: Garansi mutlak tidak ada pasangan / keluarga yang bertumpuk atau menyusup
  // Setiap unit keluarga (suami + union + istri-istri) diperlakukan sebagai 1 cluster atomik tidak terpisahkan.
  interface UnitCluster {
    id: string;
    nodeIds: string[];
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  }

  const clusters: UnitCluster[] = [];
  const assignedNodes = new Set<string>();

  // Bentuk cluster dari familyUnits
  for (const unit of familyUnits) {
    const nodeIds: string[] = [];
    const pId = `person-${unit.primaryPerson.id}`;
    if (positions.has(pId)) {
      nodeIds.push(pId);
      assignedNodes.add(pId);
    }
    for (const s of unit.spouses) {
      const spId = `person-${s.spouse.id}`;
      const unId = `union-${s.union.id}`;
      if (positions.has(spId)) {
        nodeIds.push(spId);
        assignedNodes.add(spId);
      }
      if (positions.has(unId)) {
        nodeIds.push(unId);
        assignedNodes.add(unId);
      }
    }

    if (nodeIds.length > 0) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const nId of nodeIds) {
        const pos = positions.get(nId)!;
        const w = nId.startsWith("person-") ? PERSON_NODE_WIDTH : UNION_NODE_SIZE;
        const h = nId.startsWith("person-") ? PERSON_NODE_HEIGHT : UNION_NODE_SIZE;
        if (pos.x < minX) minX = pos.x;
        if (pos.x + w > maxX) maxX = pos.x + w;
        if (pos.y < minY) minY = pos.y;
        if (pos.y + h > maxY) maxY = pos.y + h;
      }
      clusters.push({ id: unit.id, nodeIds, minX, maxX, minY, maxY });
    }
  }

  // Masukkan sisa node yang belum tercover sebagai cluster individual
  for (const [nodeId, pos] of positions.entries()) {
    if (!assignedNodes.has(nodeId)) {
      const w = nodeId.startsWith("person-") ? PERSON_NODE_WIDTH : UNION_NODE_SIZE;
      const h = nodeId.startsWith("person-") ? PERSON_NODE_HEIGHT : UNION_NODE_SIZE;
      clusters.push({
        id: `standalone-${nodeId}`,
        nodeIds: [nodeId],
        minX: pos.x,
        maxX: pos.x + w,
        minY: pos.y,
        maxY: pos.y + h,
      });
    }
  }

  // Kelompokkan cluster berdasarkan baris horizontal (Y level dengan toleransi tinggi)
  const rowClustersMap = new Map<number, UnitCluster[]>();
  for (const cluster of clusters) {
    const rowKey = Math.round(cluster.minY / 80) * 80;
    if (!rowClustersMap.has(rowKey)) rowClustersMap.set(rowKey, []);
    rowClustersMap.get(rowKey)!.push(cluster);
  }

  for (const [, rowClusters] of rowClustersMap.entries()) {
    // Urutkan cluster dari kiri ke kanan berdasarkan minX
    rowClusters.sort((a, b) => a.minX - b.minX);

    for (let i = 0; i < rowClusters.length - 1; i++) {
      const current = rowClusters[i];
      const next = rowClusters[i + 1];

      const minRequiredNextX = current.maxX + BESAN_GAP;

      if (next.minX < minRequiredNextX) {
        const shiftX = minRequiredNextX - next.minX;
        // Geser seluruh cluster berikutnya dan semua node di dalamnya secara utuh
        for (let j = i + 1; j < rowClusters.length; j++) {
          const cToShift = rowClusters[j];
          for (const nId of cToShift.nodeIds) {
            const originalPos = positions.get(nId);
            if (originalPos) {
              positions.set(nId, { x: originalPos.x + shiftX, y: originalPos.y });
            }
          }
          cToShift.minX += shiftX;
          cToShift.maxX += shiftX;
        }
      }
    }
  }

  return positions;
}

/** Build canvas graph lengkap dengan penataan berdampingan & label relasi */
export function buildCanvasGraph(
  people: PersonWithPortrait[],
  unions: Union[],
  unionMembers: UnionMember[],
  parentChildRels: ParentChildRelationship[],
  customPositions?: Map<string, { x: number; y: number }>,
  customChildOrders?: Map<string, string[]>,
  rootPersonId?: string | null,
  includedPersonIds?: string[] | null,
  canvasId?: string,
  isDefaultCanvas?: boolean
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const effectiveChildOrders = customChildOrders || getStoredChildOrders();
  const globalPeopleMap = new Map(people.map((p) => [p.id, p]));

  // Global indexes across the entire database (for snapshot detection)
  const globalChildToParentsMap = new Map<string, string[]>();
  const globalParentToChildrenMap = new Map<string, string[]>();
  const globalPersonToSpousesMap = new Map<string, string[]>();

  for (const rel of parentChildRels) {
    if (!globalChildToParentsMap.has(rel.child_id)) globalChildToParentsMap.set(rel.child_id, []);
    globalChildToParentsMap.get(rel.child_id)!.push(rel.parent_id);

    if (!globalParentToChildrenMap.has(rel.parent_id)) globalParentToChildrenMap.set(rel.parent_id, []);
    if (!globalParentToChildrenMap.get(rel.parent_id)!.includes(rel.child_id)) {
      globalParentToChildrenMap.get(rel.parent_id)!.push(rel.child_id);
    }
  }

  for (const um of unionMembers) {
    const unionMembersList = unionMembers.filter((m) => m.union_id === um.union_id && m.person_id !== um.person_id);
    if (!globalPersonToSpousesMap.has(um.person_id)) globalPersonToSpousesMap.set(um.person_id, []);
    for (const om of unionMembersList) {
      if (!globalPersonToSpousesMap.get(um.person_id)!.includes(om.person_id)) {
        globalPersonToSpousesMap.get(um.person_id)!.push(om.person_id);
      }
    }
  }

  // Filter people and relationships if this is a custom scoped canvas
  const isCustomCanvas = !!(includedPersonIds && includedPersonIds.length > 0 && !isDefaultCanvas);
  const activePeople = isCustomCanvas
    ? people.filter((p) => includedPersonIds.includes(p.id))
    : people;

  const activePeopleSet = new Set(activePeople.map((p) => p.id));

  // Filter unions & parentChildRels to only members present on canvas
  const activeUnionMembers = isCustomCanvas
    ? unionMembers.filter((um) => activePeopleSet.has(um.person_id))
    : unionMembers;

  const activeUnions = isCustomCanvas
    ? unions.filter((u) => {
        const members = activeUnionMembers.filter((um) => um.union_id === u.id);
        return members.length >= 2;
      })
    : unions;

  const activeParentChildRels = isCustomCanvas
    ? parentChildRels.filter((r) => activePeopleSet.has(r.parent_id) && activePeopleSet.has(r.child_id))
    : parentChildRels;

  const peopleMap = new Map(activePeople.map((p) => [p.id, p]));

  // Hitung posisi pohon hierarkis cerdas
  const computedPositions = calculateFamilyTreePositions(
    activePeople,
    activeUnions,
    activeUnionMembers,
    activeParentChildRels,
    effectiveChildOrders,
    rootPersonId
  );

  // Map union -> members
  const unionMembersMap = new Map<string, string[]>();
  for (const um of activeUnionMembers) {
    if (!unionMembersMap.has(um.union_id)) unionMembersMap.set(um.union_id, []);
    unionMembersMap.get(um.union_id)!.push(um.person_id);
  }

  // Index child -> parents & parent -> children
  const childToParentsMap = new Map<string, string[]>();
  const parentToChildrenMap = new Map<string, string[]>();
  const childBiologicalStatusMap = new Map<string, string>();

  for (const rel of activeParentChildRels) {
    if (!childToParentsMap.has(rel.child_id)) childToParentsMap.set(rel.child_id, []);
    childToParentsMap.get(rel.child_id)!.push(rel.parent_id);

    if (!parentToChildrenMap.has(rel.parent_id)) parentToChildrenMap.set(rel.parent_id, []);
    if (!parentToChildrenMap.get(rel.parent_id)!.includes(rel.child_id)) {
      parentToChildrenMap.get(rel.parent_id)!.push(rel.child_id);
    }

    if (rel.biological_status) {
      childBiologicalStatusMap.set(rel.child_id, rel.biological_status);
    }
  }

  // Hitung jumlah keturunan untuk mendeteksi focal root
  function getDescendantCount(pId: string, visited = new Set<string>()): number {
    if (visited.has(pId)) return 0;
    visited.add(pId);
    const children = parentToChildrenMap.get(pId) || [];
    let cnt = children.length;
    for (const c of children) {
      cnt += getDescendantCount(c, visited);
    }
    return cnt;
  }

  let focalPersonId: string | null = rootPersonId || null;
  if (!focalPersonId) {
    let maxDesc = -1;
    for (const p of people) {
      const dCount = getDescendantCount(p.id);
      if (dCount > maxDesc && dCount > 0) {
        maxDesc = dCount;
        focalPersonId = p.id;
      }
    }
  }

  // Cari pasangan focal person
  const focalSpouseIds = new Set<string>();
  if (focalPersonId) {
    for (const um of unionMembers) {
      if (um.person_id === focalPersonId) {
        const otherMembers = unionMembers
          .filter((m) => m.union_id === um.union_id && m.person_id !== focalPersonId)
          .map((m) => m.person_id);
        for (const om of otherMembers) focalSpouseIds.add(om);
      }
    }
  }

  // Map peran & generasi relatif terhadap focal person
  const relativeRoleMap = new Map<
    string,
    { role: PersonNodeData["lineageRole"]; label: string; depth: number }
  >();

  if (focalPersonId) {
    // 1. Focal Person (Tokoh Utama POV)
    relativeRoleMap.set(focalPersonId, {
      role: "root",
      label: rootPersonId ? "Tokoh Utama (POV)" : "Kepala Zuriat",
      depth: 0,
    });

    // 2. Pasangan Focal Person
    for (const spId of focalSpouseIds) {
      const sp = peopleMap.get(spId);
      relativeRoleMap.set(spId, {
        role: "root_spouse",
        label: sp?.gender === "female" ? "Istri / Pasangan" : "Suami / Pasangan",
        depth: 0,
      });
    }

    // 3. Telusuri Leluhur ke atas secara rekursif (Orang Tua, Kakek/Nenek, Buyut, Moyang)
    const ancestorQueue: { id: string; depth: number }[] = [{ id: focalPersonId, depth: 0 }];
    const visitedAncestors = new Set<string>([focalPersonId]);

    while (ancestorQueue.length > 0) {
      const { id, depth } = ancestorQueue.shift()!;
      const parentIds = childToParentsMap.get(id) || [];
      const parentDepth = depth - 1;

      for (const pId of parentIds) {
        if (!visitedAncestors.has(pId)) {
          visitedAncestors.add(pId);
          const p = peopleMap.get(pId);
          let role: PersonNodeData["lineageRole"] = "ancestor";
          let label = "Leluhur";

          if (parentDepth === -1) {
            role = "parent";
            label = p?.gender === "female" ? "Ibu Kandung" : "Ayah Kandung";
          } else if (parentDepth === -2) {
            role = "grandparent";
            label = p?.gender === "female" ? "Nenek" : "Kakek";
          } else if (parentDepth === -3) {
            role = "great_grandparent";
            label = "Buyut";
          } else {
            role = "ancestor";
            label = "Moyang";
          }

          relativeRoleMap.set(pId, { role, label, depth: parentDepth });
          ancestorQueue.push({ id: pId, depth: parentDepth });
        }
      }
    }

    // 4. Saudara Kandung dari Focal Person (Kakak / Adik Laki-laki / Perempuan)
    const directParents = childToParentsMap.get(focalPersonId) || [];
    const focalPersonObj = peopleMap.get(focalPersonId);

    for (const parentId of directParents) {
      const siblingIds = parentToChildrenMap.get(parentId) || [];
      for (const sId of siblingIds) {
        if (sId !== focalPersonId && !focalSpouseIds.has(sId) && !relativeRoleMap.has(sId)) {
          const sPerson = peopleMap.get(sId);
          let label = sPerson?.gender === "female" ? "Saudara Perempuan" : "Saudara Laki-laki";

          if (focalPersonObj?.birth_date && sPerson?.birth_date) {
            if (sPerson.birth_date < focalPersonObj.birth_date) {
              label = sPerson.gender === "female" ? "Kakak Perempuan" : "Kakak Laki-laki";
            } else if (sPerson.birth_date > focalPersonObj.birth_date) {
              label = sPerson.gender === "female" ? "Adik Perempuan" : "Adik Laki-laki";
            }
          }

          relativeRoleMap.set(sId, {
            role: "sibling",
            label,
            depth: 0,
          });
        }
      }
    }

    // 5. Keturunan ke bawah (Anak, Cucu, Cicit, Keponakan)
    const descQueue: { id: string; depth: number; isDirectLine: boolean }[] = [];

    // Anak-anak langsung dari focal person & pasangan
    const focalChildren = new Set<string>();
    for (const c of parentToChildrenMap.get(focalPersonId) || []) focalChildren.add(c);
    for (const spId of focalSpouseIds) {
      for (const c of parentToChildrenMap.get(spId) || []) focalChildren.add(c);
    }

    for (const cId of focalChildren) {
      descQueue.push({ id: cId, depth: 1, isDirectLine: true });
      const bio = childBiologicalStatusMap.get(cId);
      const bioLabel = bio === "adoptive" ? "Anak Adopsi" : bio === "step" ? "Anak Tiri" : "Anak Kandung";
      relativeRoleMap.set(cId, {
        role: "child",
        label: bioLabel,
        depth: 1,
      });
    }

    // Keponakan (Anak dari Saudara Kandung)
    for (const [id, info] of relativeRoleMap.entries()) {
      if (info.role === "sibling") {
        const sibChildren = parentToChildrenMap.get(id) || [];
        for (const scId of sibChildren) {
          if (!relativeRoleMap.has(scId)) {
            descQueue.push({ id: scId, depth: 1, isDirectLine: false });
            relativeRoleMap.set(scId, {
              role: "nephew_niece",
              label: "Keponakan",
              depth: 1,
            });
          }
        }
      }
    }

    // BFS ke bawah (Cucu, Cicit, Keturunan)
    while (descQueue.length > 0) {
      const { id, depth, isDirectLine } = descQueue.shift()!;
      const nextChildren = parentToChildrenMap.get(id) || [];

      for (const nc of nextChildren) {
        if (!relativeRoleMap.has(nc)) {
          const nextDepth = depth + 1;
          let role: PersonNodeData["lineageRole"] = "descendant";
          let label = "Keturunan";

          if (isDirectLine) {
            if (nextDepth === 2) {
              role = "grandchild";
              label = "Cucu";
            } else if (nextDepth === 3) {
              role = "great_grandchild";
              label = "Cicit";
            }
          }

          relativeRoleMap.set(nc, { role, label, depth: nextDepth });
          descQueue.push({ id: nc, depth: nextDepth, isDirectLine });
        }
      }
    }
  }

  // 1. Buat Person Nodes
  // 1. Buat Person Nodes
  for (const person of activePeople) {
    const pos =
      customPositions?.get(`person-${person.id}`) ||
      computedPositions.get(`person-${person.id}`) ||
      { x: 0, y: 0 };

    // Cari pasangan untuk info di node (yang aktif di kanvas)
    const personUnionIds = activeUnionMembers
      .filter((um) => um.person_id === person.id)
      .map((um) => um.union_id);

    const spouseIds = new Set<string>();
    for (const unionId of personUnionIds) {
      const members = unionMembersMap.get(unionId) || [];
      for (const memberId of members) {
        if (memberId !== person.id) spouseIds.add(memberId);
      }
    }

    const spouses = Array.from(spouseIds)
      .map((id) => peopleMap.get(id))
      .filter((p): p is PersonWithPortrait => !!p);

    // Cari orang tua aktif di kanvas
    const pIds = childToParentsMap.get(person.id) || [];
    const parentPeople = pIds.map((id) => peopleMap.get(id)).filter(Boolean) as PersonWithPortrait[];
    const hasFather = parentPeople.some((p) => p.gender === "male");
    const hasMother = parentPeople.some((p) => p.gender === "female");
    const parentsNames = parentPeople
      .map((p) => p.display_name || p.full_name)
      .filter(Boolean) as string[];

    // Hitung Snapshot data di DB yang belum dimasukkan ke kanvas ini
    let availableSnapshots: PersonNodeData["availableSnapshots"] | undefined = undefined;
    if (isCustomCanvas) {
      // 1. Orang tua di DB yang belum ada di kanvas
      const globalParentIds = globalChildToParentsMap.get(person.id) || [];
      const availableParents = globalParentIds
        .filter((pId) => !activePeopleSet.has(pId))
        .map((pId) => globalPeopleMap.get(pId))
        .filter((p): p is PersonWithPortrait => !!p);

      // 2. Pasangan di DB yang belum ada di kanvas
      const globalSpouseIds = globalPersonToSpousesMap.get(person.id) || [];
      const availableSpouses = globalSpouseIds
        .filter((sId) => !activePeopleSet.has(sId))
        .map((sId) => globalPeopleMap.get(sId))
        .filter((p): p is PersonWithPortrait => !!p);

      // 3. Anak di DB yang belum ada di kanvas
      const globalChildIds = globalParentToChildrenMap.get(person.id) || [];
      const availableChildren = globalChildIds
        .filter((cId) => !activePeopleSet.has(cId))
        .map((cId) => globalPeopleMap.get(cId))
        .filter((p): p is PersonWithPortrait => !!p);

      // 4. Saudara di DB yang belum ada di kanvas
      const availableSiblingsSet = new Set<string>();
      for (const parentId of globalParentIds) {
        const sibIds = globalParentToChildrenMap.get(parentId) || [];
        for (const sId of sibIds) {
          if (sId !== person.id && !activePeopleSet.has(sId)) {
            availableSiblingsSet.add(sId);
          }
        }
      }
      const availableSiblings = Array.from(availableSiblingsSet)
        .map((sId) => globalPeopleMap.get(sId))
        .filter((p): p is PersonWithPortrait => !!p);

      availableSnapshots = {
        parents: availableParents,
        siblings: availableSiblings,
        spouses: availableSpouses,
        children: availableChildren,
      };
    }

    // Tentukan lineageRole dan roleLabel dari relativeRoleMap
    const relInfo = relativeRoleMap.get(person.id);
    let lineageRole: PersonNodeData["lineageRole"] = relInfo?.role || "descendant";
    let roleLabel = relInfo?.label || "Anggota Keluarga";
    const depth = relInfo?.depth ?? 0;

    if (!relInfo) {
      // Fallback jika tidak terpetakan dalam relativeRoleMap
      const isMarriedToDescendant = Array.from(spouseIds).some((sId) => {
        const sInfo = relativeRoleMap.get(sId);
        return (
          sInfo?.role === "child" ||
          sInfo?.role === "grandchild" ||
          sInfo?.role === "great_grandchild"
        );
      });

      if (isMarriedToDescendant) {
        lineageRole = "in_law";
        roleLabel = "Menantu";
      } else if (pIds.length === 0) {
        lineageRole = "ancestor";
        roleLabel = "Leluhur";
      }
    }

    // Hitung urutan anak di antara saudara kandung
    let childOrderNumber: number | undefined;
    let childOrderLabel: string | undefined;

    if (pIds.length > 0) {
      const primaryParentId = pIds[0];
      const siblings = parentToChildrenMap.get(primaryParentId) || [];
      if (siblings.length > 1) {
        let explicitOrder: string[] | undefined;
        if (effectiveChildOrders) {
          explicitOrder =
            effectiveChildOrders.get(primaryParentId) ||
            (pIds.length > 1 ? effectiveChildOrders.get(pIds[1]) : undefined);
        }

        const originalSiblingOrder = new Map(siblings.map((id, idx) => [id, idx]));

        const sortedSiblings = [...siblings].sort((aId, bId) => {
          const pA = peopleMap.get(aId);
          const pB = peopleMap.get(bId);
          if (!pA || !pB) return (originalSiblingOrder.get(aId) ?? 0) - (originalSiblingOrder.get(bId) ?? 0);

          if (explicitOrder && explicitOrder.length > 0) {
            const idxA = explicitOrder.indexOf(pA.id);
            const idxB = explicitOrder.indexOf(pB.id);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
          }

          const relA = activeParentChildRels.find((r) => r.child_id === aId && pIds.includes(r.parent_id));
          const relB = activeParentChildRels.find((r) => r.child_id === bId && pIds.includes(r.parent_id));
          if (relA && relB && typeof relA.sort_order === "number" && typeof relB.sort_order === "number") {
            if (relA.sort_order !== relB.sort_order) return relA.sort_order - relB.sort_order;
          }

          if (pA.birth_date && pB.birth_date) {
            const cmp = pA.birth_date.localeCompare(pB.birth_date);
            if (cmp !== 0) return cmp;
          } else if (pA.birth_date && !pB.birth_date) {
            return -1;
          } else if (!pA.birth_date && pB.birth_date) {
            return 1;
          }

          return (originalSiblingOrder.get(aId) ?? 0) - (originalSiblingOrder.get(bId) ?? 0);
        });

        const sIdx = sortedSiblings.indexOf(person.id);
        if (sIdx !== -1) {
          childOrderNumber = sIdx + 1;
          childOrderLabel = `Anak ke-${sIdx + 1}`;
        }
      } else if (siblings.length === 1) {
        childOrderNumber = 1;
        childOrderLabel = "Anak Tunggal";
      }
    }

    const childrenCount = (parentToChildrenMap.get(person.id) || []).length;

    nodes.push({
      id: `person-${person.id}`,
      type: "personNode",
      position: pos,
      data: {
        person,
        spouses,
        lineageRole,
        roleLabel,
        parentsNames,
        generation: depth ?? 0,
        hasFather,
        hasMother,
        childrenCount,
        childOrderNumber,
        childOrderLabel,
        availableSnapshots,
        canvasId,
        isDefaultCanvas,
      } as PersonNodeData,
      width: PERSON_NODE_WIDTH,
      height: PERSON_NODE_HEIGHT,
    });
  }

  // 2. Buat Union Nodes (titik pernikahan di antara suami dan istri)
  for (const union of unions) {
    const memberIds = unionMembersMap.get(union.id) || [];
    if (memberIds.length < 2) continue;

    const unionPos =
      customPositions?.get(`union-${union.id}`) ||
      computedPositions.get(`union-${union.id}`) || {
        x: 0,
        y: 0,
      };

    const m1 = peopleMap.get(memberIds[0]);
    const m2 = peopleMap.get(memberIds[1]);
    const members = [m1, m2].filter((p): p is PersonWithPortrait => !!p);

    nodes.push({
      id: `union-${union.id}`,
      type: "unionNode",
      position: unionPos,
      data: { union, memberIds, members } as UnionNodeData,
      width: UNION_NODE_SIZE,
      height: UNION_NODE_SIZE,
    });

    // Edge pernikahan: Orang di sebelah kiri -> titik kanan ke union (titik kiri),
    // Orang di sebelah kanan -> titik kiri ke union (titik kanan)
    if (m1 && m2) {
      const pos1 =
        customPositions?.get(`person-${m1.id}`) ||
        computedPositions.get(`person-${m1.id}`) ||
        { x: 0, y: 0 };
      const pos2 =
        customPositions?.get(`person-${m2.id}`) ||
        computedPositions.get(`person-${m2.id}`) ||
        { x: 0, y: 0 };

      const leftPerson = pos1.x <= pos2.x ? m1 : m2;
      const rightPerson = pos1.x <= pos2.x ? m2 : m1;

      // Garis pernikahan Orang Kiri (titik kanan) -> UnionNode (titik kiri)
      edges.push({
        id: `spouse-edge-${union.id}-${leftPerson.id}`,
        source: `person-${leftPerson.id}`,
        sourceHandle: "right",
        target: `union-${union.id}`,
        targetHandle: "left",
        type: "smoothstep",
        animated: false,
        style: { stroke: "#D97706", strokeWidth: 2 },
      });

      // Garis pernikahan Orang Kanan (titik kiri) -> UnionNode (titik kanan)
      edges.push({
        id: `spouse-edge-${union.id}-${rightPerson.id}`,
        source: `person-${rightPerson.id}`,
        sourceHandle: "left",
        target: `union-${union.id}`,
        targetHandle: "right",
        type: "smoothstep",
        animated: false,
        style: { stroke: "#D97706", strokeWidth: 2 },
      });
    }
  }

  // 3. Buat Parent-Child Edges berlabel jelas
  // Kelompokkan relasi per anak untuk menghubungkan ke Union pernikahan orang tua secara rapi
  const relsByChild = new Map<string, ParentChildRelationship[]>();
  for (const rel of parentChildRels) {
    if (!relsByChild.has(rel.child_id)) relsByChild.set(rel.child_id, []);
    relsByChild.get(rel.child_id)!.push(rel);
  }

  const nodeIds = new Set(nodes.map((n) => n.id));

  for (const [childId, rels] of relsByChild) {
    const isBiological = rels.every(
      (r) => r.biological_status === "biological" || !r.biological_status
    );
    const hasAdoptive = rels.some((r) => r.biological_status === "adoptive");
    const hasStep = rels.some((r) => r.biological_status === "step");

    const edgeLabel = hasAdoptive ? "Adopsi" : hasStep ? "Tiri" : undefined;
    const edgeStyle = isBiological
      ? { stroke: "#4B5563", strokeWidth: 2 }
      : { stroke: "#9CA3AF", strokeWidth: 2, strokeDasharray: "5,5" };

    // 1. Cek apakah ada explicit union_id di relasi
    let targetUnionId: string | null = null;
    for (const r of rels) {
      if (r.union_id && nodeIds.has(`union-${r.union_id}`)) {
        targetUnionId = r.union_id;
        break;
      }
    }

    // 2. Jika tidak ada explicit union_id, cari union yang dimiliki bersama oleh orang tua anak ini
    if (!targetUnionId && rels.length >= 2) {
      const parentIds = rels.map((r) => r.parent_id);
      for (const union of unions) {
        const members = unionMembersMap.get(union.id) || [];
        const bothAreMembers = parentIds.filter((pId) => members.includes(pId)).length >= 2;
        if (bothAreMembers && nodeIds.has(`union-${union.id}`)) {
          targetUnionId = union.id;
          break;
        }
      }
    }

    // 3. Jika anak hanya punya 1 orang tua terdaftar, periksa apakah orang tua tersebut terikat pada 1 union saja
    if (!targetUnionId && rels.length === 1) {
      const parentId = rels[0].parent_id;
      const parentUnions = (unions || []).filter((u) => {
        const members = unionMembersMap.get(u.id) || [];
        return members.includes(parentId) && nodeIds.has(`union-${u.id}`);
      });
      if (parentUnions.length === 1 && rels[0].union_id) {
        targetUnionId = parentUnions[0].id;
      }
    }

    // Jika union ditemukan: buat 1 edge rapi dari UnionNode (bawah) ke Child (atas)
    if (targetUnionId) {
      edges.push({
        id: `pcr-union-${targetUnionId}-${childId}`,
        source: `union-${targetUnionId}`,
        sourceHandle: "bottom",
        target: `person-${childId}`,
        targetHandle: "top",
        type: "smoothstep",
        label: edgeLabel,
        labelStyle: edgeLabel ? { fill: "#4B5563", fontSize: 10, fontWeight: 600 } : undefined,
        labelBgStyle: edgeLabel
          ? {
              fill: "#FFFFFF",
              stroke: "#E5E7EB",
              strokeWidth: 1,
              rx: 4,
              ry: 4,
            }
          : undefined,
        labelBgPadding: edgeLabel ? [3, 5] : undefined,
        style: edgeStyle,
      });
      continue;
    }

    // Fallback: jika orang tua tidak terdaftar dalam union/pernikahan, sambungkan dari parent (bawah) langsung ke anak (atas)
    for (const rel of rels) {
      edges.push({
        id: `pcr-${rel.id}`,
        source: `person-${rel.parent_id}`,
        sourceHandle: "bottom",
        target: `person-${rel.child_id}`,
        targetHandle: "top",
        type: "smoothstep",
        label: edgeLabel,
        labelStyle: edgeLabel ? { fill: "#4B5563", fontSize: 10, fontWeight: 600 } : undefined,
        labelBgStyle: edgeLabel
          ? {
              fill: "#FFFFFF",
              stroke: "#E5E7EB",
              strokeWidth: 1,
              rx: 4,
              ry: 4,
            }
          : undefined,
        labelBgPadding: edgeLabel ? [3, 5] : undefined,
        style: edgeStyle,
      });
    }
  }

  return { nodes, edges };
}
