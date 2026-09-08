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
  lineageRole: "root" | "root_spouse" | "ancestor" | "child" | "in_law" | "grandchild" | "great_grandchild" | "descendant";
  roleLabel: string;
  parentsNames?: string[];
  generation: number;
  isHighlighted?: boolean;
  hasFather?: boolean;
  hasMother?: boolean;
  childrenCount?: number;
  childOrderNumber?: number;
  childOrderLabel?: string;
  [key: string]: unknown;
}

export interface UnionNodeData {
  union: Union;
  memberIds: string[];
  [key: string]: unknown;
}

export const PERSON_NODE_WIDTH = 240;
export const PERSON_NODE_HEIGHT = 115;
const COUPLE_GAP = 90;
const SIBLING_GAP = 90;
const GENERATION_HEIGHT = 280;
const UNION_NODE_SIZE = 28;

interface FamilyUnit {
  id: string; // union.id atau person.id
  type: "couple" | "single";
  personA: PersonWithPortrait; // suami/anggota 1
  personB?: PersonWithPortrait; // istri/anggota 2 (jika couple)
  union?: Union;
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
  customChildOrders?: Map<string, string[]>
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

  // Index union -> children
  const unionToChildren = new Map<string, string[]>();
  for (const rel of parentChildRels) {
    if (rel.union_id) {
      if (!unionToChildren.has(rel.union_id)) unionToChildren.set(rel.union_id, []);
      if (!unionToChildren.get(rel.union_id)!.includes(rel.child_id)) {
        unionToChildren.get(rel.union_id)!.push(rel.child_id);
      }
    }
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

  // 2. Bentuk Family Units (Pasangan / Single)
  const placedPeople = new Set<string>();
  const familyUnits: FamilyUnit[] = [];
  const personToUnitId = new Map<string, string>();

  // Buat couple unit untuk setiap union
  for (const union of unions) {
    const members = unionToMembers.get(union.id) || [];
    if (members.length >= 2) {
      const p1 = peopleMap.get(members[0]);
      const p2 = peopleMap.get(members[1]);
      if (p1 && p2 && !placedPeople.has(p1.id) && !placedPeople.has(p2.id)) {
        // Taruh laki-laki di kiri jika ada informasi gender
        const personA = p1.gender === "male" || p2.gender === "female" ? p1 : p2;
        const personB = personA.id === p1.id ? p2 : p1;

        const gen = Math.min(
          generationMap.get(personA.id) ?? 0,
          generationMap.get(personB.id) ?? 0
        );

        const unit: FamilyUnit = {
          id: `union-${union.id}`,
          type: "couple",
          personA,
          personB,
          union,
          generation: gen,
          childUnitIds: [],
          subtreeWidth: 0,
          x: 0,
          y: gen * GENERATION_HEIGHT,
        };

        familyUnits.push(unit);
        personToUnitId.set(personA.id, unit.id);
        personToUnitId.set(personB.id, unit.id);
        placedPeople.add(personA.id);
        placedPeople.add(personB.id);
      }
    }
  }

  // Buat single unit untuk yang belum berpasangan
  for (const person of people) {
    if (!placedPeople.has(person.id)) {
      const gen = generationMap.get(person.id) ?? 0;
      const unit: FamilyUnit = {
        id: `person-${person.id}`,
        type: "single",
        personA: person,
        generation: gen,
        childUnitIds: [],
        subtreeWidth: 0,
        x: 0,
        y: gen * GENERATION_HEIGHT,
      };

      familyUnits.push(unit);
      personToUnitId.set(person.id, unit.id);
      placedPeople.add(person.id);
    }
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
        if (unit.union && effectiveChildOrders.has(unit.union.id)) {
          explicitOrder = effectiveChildOrders.get(unit.union.id);
        } else if (effectiveChildOrders.has(unit.personA.id)) {
          explicitOrder = effectiveChildOrders.get(unit.personA.id);
        } else if (unit.personB && effectiveChildOrders.has(unit.personB.id)) {
          explicitOrder = effectiveChildOrders.get(unit.personB.id);
        }
      }

      const parentIds = [unit.personA.id];
      if (unit.personB) parentIds.push(unit.personB.id);

      // Helper untuk mendapatkan objek Person anak yang sebenarnya dari unit anak (bukan menantu/pasangannya)
      const getChildPerson = (u?: FamilyUnit): PersonWithPortrait | undefined => {
        if (!u) return undefined;
        if (u.type === "single") return u.personA;
        // Pada unit pasangan, periksa apakah personA atau personB yang merupakan keturunan dari parentIds
        const isAChild = parentIds.some((pId) => (parentToChildren.get(pId) || []).includes(u.personA.id));
        if (isAChild) return u.personA;
        if (u.personB) {
          const isBChild = parentIds.some((pId) => (parentToChildren.get(pId) || []).includes(u.personB!.id));
          if (isBChild) return u.personB;
        }
        return u.personA;
      };

      const originalOrder = new Map(unit.childUnitIds.map((id, idx) => [id, idx]));

      unit.childUnitIds.sort((aId, bId) => {
        const uA = unitMap.get(aId);
        const uB = unitMap.get(bId);
        const pA = getChildPerson(uA);
        const pB = getChildPerson(uB);
        if (!pA || !pB) return (originalOrder.get(aId) ?? 0) - (originalOrder.get(bId) ?? 0);

        // 1. Prioritaskan urutan eksplisit (drag & drop modal / custom order)
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

        // 4. Default: Pertahankan formasi urutan asli dari database (natural insertion order)
        return (originalOrder.get(aId) ?? 0) - (originalOrder.get(bId) ?? 0);
      });
    }
  }

  // 4. Identifikasi Focal Couple / Zuriat Center
  // Unit dengan jumlah keturunan terbanyak
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

  let focalUnit: FamilyUnit | null = null;
  let maxDescendants = -1;

  for (const unit of familyUnits) {
    const descCount = countDescendants(unit.id);
    if (descCount > maxDescendants && descCount > 0) {
      maxDescendants = descCount;
      focalUnit = unit;
    }
  }

  // Jika tidak ada unit dengan anak, ambil unit generasi teratas pertama
  if (!focalUnit && familyUnits.length > 0) {
    focalUnit = familyUnits[0];
  }

  // Identifikasi parent units dari focalUnit (Leluhur/Moyang)
  const focalAncestorUnitIds = new Set<string>();
  let focalPersonAParentUnit: FamilyUnit | null = null;
  let focalPersonBParentUnit: FamilyUnit | null = null;

  if (focalUnit) {
    const pAParentId = (childToParents.get(focalUnit.personA.id) || [])[0];
    if (pAParentId) {
      const uId = personToUnitId.get(pAParentId);
      if (uId && uId !== focalUnit.id) {
        focalPersonAParentUnit = unitMap.get(uId) || null;
        if (focalPersonAParentUnit) focalAncestorUnitIds.add(focalPersonAParentUnit.id);
      }
    }

    if (focalUnit.personB) {
      const pBParentId = (childToParents.get(focalUnit.personB.id) || [])[0];
      if (pBParentId) {
        const uId = personToUnitId.get(pBParentId);
        if (uId && uId !== focalUnit.id) {
          focalPersonBParentUnit = unitMap.get(uId) || null;
          if (focalPersonBParentUnit) focalAncestorUnitIds.add(focalPersonBParentUnit.id);
        }
      }
    }
  }

  // Hapus focalUnit dari childUnitIds milik ancestor agar tidak dobel diposisikan di bawah ancestor
  if (focalUnit) {
    if (focalPersonAParentUnit) {
      focalPersonAParentUnit.childUnitIds = focalPersonAParentUnit.childUnitIds.filter(
        (id) => id !== focalUnit!.id
      );
    }
    if (focalPersonBParentUnit) {
      focalPersonBParentUnit.childUnitIds = focalPersonBParentUnit.childUnitIds.filter(
        (id) => id !== focalUnit!.id
      );
    }
  }

  // 5. Hitung lebar subtree secara rekursif (Bottom-Up)
  function computeSubtreeWidth(unit: FamilyUnit, visited = new Set<string>()): number {
    if (visited.has(unit.id)) return unit.subtreeWidth;
    visited.add(unit.id);

    const selfWidth =
      unit.type === "couple"
        ? PERSON_NODE_WIDTH * 2 + COUPLE_GAP
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

  // Hitung lebar semua unit
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
      unit.type === "couple"
        ? PERSON_NODE_WIDTH * 2 + COUPLE_GAP
        : PERSON_NODE_WIDTH;

    // Posisi card sendiri (center dalam rentang subtree)
    const cardX = startX + (unit.subtreeWidth - selfWidth) / 2;
    const cardY = baseY;

    if (unit.type === "couple") {
      // Suami di kiri
      positions.set(`person-${unit.personA.id}`, { x: cardX, y: cardY });

      // Node union pernikahan di tengah antara suami dan istri
      const unionNodeX = cardX + PERSON_NODE_WIDTH + (COUPLE_GAP / 2) - (UNION_NODE_SIZE / 2);
      const unionNodeY = cardY + (PERSON_NODE_HEIGHT / 2) - (UNION_NODE_SIZE / 2);
      if (unit.union) {
        positions.set(`union-${unit.union.id}`, { x: unionNodeX, y: unionNodeY });
      }

      // Istri di kanan berdampingan
      positions.set(`person-${unit.personB!.id}`, {
        x: cardX + PERSON_NODE_WIDTH + COUPLE_GAP,
        y: cardY,
      });
    } else {
      // Single
      positions.set(`person-${unit.personA.id}`, { x: cardX, y: cardY });
    }

    // Tempatkan anak-anaknya di bawah
    if (unit.childUnitIds.length > 0) {
      let totalChildrenWidth = 0;
      const validChildren: FamilyUnit[] = [];

      for (let i = 0; i < unit.childUnitIds.length; i++) {
        const childUnit = unitMap.get(unit.childUnitIds[i]);
        if (childUnit && !visited.has(childUnit.id)) {
          validChildren.push(childUnit);
          totalChildrenWidth += childUnit.subtreeWidth + (validChildren.length > 1 ? SIBLING_GAP : 0);
        }
      }

      let currentChildX = startX + (unit.subtreeWidth - totalChildrenWidth) / 2;
      for (const childUnit of validChildren) {
        assignCoordinates(childUnit, currentChildX, baseY + GENERATION_HEIGHT, visited);
        currentChildX += childUnit.subtreeWidth + SIBLING_GAP;
      }
    }
  }

  const visitedUnits = new Set<string>();

  if (focalUnit) {
    const focalStartY = focalAncestorUnitIds.size > 0 ? GENERATION_HEIGHT : 0;
    const focalStartX = 0;

    // Posisikan focal unit dan keturunannya
    assignCoordinates(focalUnit, focalStartX, focalStartY, visitedUnits);

    const focalPersonAPos = positions.get(`person-${focalUnit.personA.id}`);
    const focalPersonBPos = focalUnit.personB ? positions.get(`person-${focalUnit.personB.id}`) : null;

    // Posisikan orang tua suami (Leluhur Pihak Suami) persis di atas suami
    if (focalPersonAParentUnit && focalPersonAPos) {
      const parentWidth =
        focalPersonAParentUnit.type === "couple"
          ? PERSON_NODE_WIDTH * 2 + COUPLE_GAP
          : PERSON_NODE_WIDTH;
      const pX = focalPersonAPos.x + (PERSON_NODE_WIDTH / 2) - (parentWidth / 2);
      assignCoordinates(focalPersonAParentUnit, pX, 0, visitedUnits);
    }

    // Posisikan orang tua istri (Leluhur Pihak Istri) persis di atas istri
    if (focalPersonBParentUnit && focalPersonBPos) {
      const parentWidth =
        focalPersonBParentUnit.type === "couple"
          ? PERSON_NODE_WIDTH * 2 + COUPLE_GAP
          : PERSON_NODE_WIDTH;
      const pX = focalPersonBPos.x + (PERSON_NODE_WIDTH / 2) - (parentWidth / 2);
      assignCoordinates(focalPersonBParentUnit, pX, 0, visitedUnits);
    }
  }

  // Sisanya yang belum diposisikan (jika ada unit independen lain)
  let extraX = 0;
  for (const pos of positions.values()) {
    if (pos.x + PERSON_NODE_WIDTH > extraX) extraX = pos.x + PERSON_NODE_WIDTH + SIBLING_GAP * 2;
  }

  for (const unit of familyUnits) {
    if (!visitedUnits.has(unit.id)) {
      assignCoordinates(unit, extraX, unit.generation * GENERATION_HEIGHT, visitedUnits);
      extraX += unit.subtreeWidth + SIBLING_GAP * 2;
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
  customChildOrders?: Map<string, string[]>
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const effectiveChildOrders = customChildOrders || getStoredChildOrders();
  const peopleMap = new Map(people.map((p) => [p.id, p]));

  // Hitung posisi pohon hierarkis cerdas
  const computedPositions = calculateFamilyTreePositions(
    people,
    unions,
    unionMembers,
    parentChildRels,
    effectiveChildOrders
  );

  // Map union -> members
  const unionMembersMap = new Map<string, string[]>();
  for (const um of unionMembers) {
    if (!unionMembersMap.has(um.union_id)) unionMembersMap.set(um.union_id, []);
    unionMembersMap.get(um.union_id)!.push(um.person_id);
  }

  // Index child -> parents & parent -> children
  const childToParentsMap = new Map<string, string[]>();
  const parentToChildrenMap = new Map<string, string[]>();
  const childBiologicalStatusMap = new Map<string, string>();

  for (const rel of parentChildRels) {
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

  let focalPersonId: string | null = null;
  let maxDesc = -1;
  for (const p of people) {
    const dCount = getDescendantCount(p.id);
    if (dCount > maxDesc && dCount > 0) {
      maxDesc = dCount;
      focalPersonId = p.id;
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

  // Cari orang tua dari focal person dan pasangan (Leluhur)
  const focalAncestorIds = new Set<string>();
  if (focalPersonId) {
    for (const pId of childToParentsMap.get(focalPersonId) || []) {
      focalAncestorIds.add(pId);
    }
    for (const spId of focalSpouseIds) {
      for (const pId of childToParentsMap.get(spId) || []) {
        focalAncestorIds.add(pId);
      }
    }
  }

  // Hitung kedalaman generasi dari focal person
  const personGenerationFromFocal = new Map<string, number>();
  if (focalPersonId) {
    personGenerationFromFocal.set(focalPersonId, 0);
    for (const spId of focalSpouseIds) {
      personGenerationFromFocal.set(spId, 0);
    }
    for (const ancId of focalAncestorIds) {
      personGenerationFromFocal.set(ancId, -1);
    }

    // BFS ke bawah
    const queue: { id: string; depth: number }[] = [];
    const focalChildren = new Set<string>();
    for (const c of parentToChildrenMap.get(focalPersonId) || []) focalChildren.add(c);
    for (const spId of focalSpouseIds) {
      for (const c of parentToChildrenMap.get(spId) || []) focalChildren.add(c);
    }

    for (const cId of focalChildren) {
      queue.push({ id: cId, depth: 1 });
      personGenerationFromFocal.set(cId, 1);
    }

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      const nextChildren = parentToChildrenMap.get(id) || [];
      for (const nc of nextChildren) {
        if (!personGenerationFromFocal.has(nc)) {
          personGenerationFromFocal.set(nc, depth + 1);
          queue.push({ id: nc, depth: depth + 1 });
        }
      }
    }
  }

  // 1. Buat Person Nodes
  for (const person of people) {
    const pos =
      customPositions?.get(`person-${person.id}`) ||
      computedPositions.get(`person-${person.id}`) ||
      { x: 0, y: 0 };

    // Cari pasangan untuk info di node
    const personUnionIds = unionMembers
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

    // Cari orang tua
    const pIds = childToParentsMap.get(person.id) || [];
    const parentPeople = pIds.map((id) => peopleMap.get(id)).filter(Boolean) as PersonWithPortrait[];
    const hasFather = parentPeople.some((p) => p.gender === "male");
    const hasMother = parentPeople.some((p) => p.gender === "female");
    const parentsNames = parentPeople
      .map((p) => p.display_name || p.full_name)
      .filter(Boolean) as string[];

    // Tentukan lineageRole dan roleLabel
    const depth = personGenerationFromFocal.get(person.id);
    let lineageRole: PersonNodeData["lineageRole"] = "descendant";
    let roleLabel = "Anggota Keluarga";

    if (person.id === focalPersonId) {
      lineageRole = "root";
      roleLabel = person.gender === "female" ? "Kepala Zuriat" : "Kepala Zuriat";
    } else if (focalSpouseIds.has(person.id)) {
      lineageRole = "root_spouse";
      roleLabel = person.gender === "female" ? "Istri / Pasangan Utama" : "Suami / Pasangan Utama";
    } else if (focalAncestorIds.has(person.id)) {
      lineageRole = "ancestor";
      roleLabel = "Leluhur / Moyang";
    } else if (depth === 1) {
      lineageRole = "child";
      const bio = childBiologicalStatusMap.get(person.id);
      roleLabel = bio === "adoptive" ? "Anak Adopsi" : bio === "step" ? "Anak Tiri" : "Anak Kandung";
    } else if (depth === 2) {
      lineageRole = "grandchild";
      roleLabel = "Cucu";
    } else if (depth === 3) {
      lineageRole = "great_grandchild";
      roleLabel = "Cicit";
    } else if (depth != null && depth > 3) {
      lineageRole = "descendant";
      roleLabel = "Keturunan";
    } else {
      // Tidak punya hubungan orang tua di tree, tapi menikah dengan keturunan?
      const isMarriedToDescendant = Array.from(spouseIds).some((sId) => {
        const sDepth = personGenerationFromFocal.get(sId);
        return sDepth != null && sDepth >= 1;
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

          const relA = parentChildRels.find((r) => r.child_id === aId && pIds.includes(r.parent_id));
          const relB = parentChildRels.find((r) => r.child_id === bId && pIds.includes(r.parent_id));
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

    nodes.push({
      id: `union-${union.id}`,
      type: "unionNode",
      position: unionPos,
      data: { union, memberIds } as UnionNodeData,
      width: UNION_NODE_SIZE,
      height: UNION_NODE_SIZE,
    });

    // Edge pernikahan: Suami (kanan) ke UnionNode (kiri), Istri (kiri) ke UnionNode (kanan)
    const m1 = peopleMap.get(memberIds[0]);
    const m2 = peopleMap.get(memberIds[1]);

    if (m1 && m2) {
      const husband = m1.gender === "male" || m2.gender === "female" ? m1 : m2;
      const wife = husband.id === m1.id ? m2 : m1;

      // Garis pernikahan Suami -> UnionNode
      edges.push({
        id: `spouse-edge-${union.id}-${husband.id}`,
        source: `person-${husband.id}`,
        sourceHandle: "right",
        target: `union-${union.id}`,
        targetHandle: "left",
        type: "smoothstep",
        animated: false,
        style: { stroke: "#D97706", strokeWidth: 2 },
      });

      // Garis pernikahan Istri -> UnionNode
      edges.push({
        id: `spouse-edge-${union.id}-${wife.id}`,
        source: `person-${wife.id}`,
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

    // Jika union ditemukan: buat 1 edge rapi dari UnionNode ke Child
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

    // Fallback: jika orang tua tidak terdaftar dalam union/pernikahan, sambungkan dari parent langsung
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
