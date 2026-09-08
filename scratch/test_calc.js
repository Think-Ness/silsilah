// Test focal selection and ancestor centering
const fs = require('fs');

function testLayoutLogic() {
  const people = [
    { id: 'p_abdul', full_name: 'Abdul Mu\'in', display_name: 'Abdul Mu\'in', gender: 'male' },
    { id: 'p_masdep', full_name: 'Masdep', display_name: 'Masdep', gender: 'female' },
    { id: 'p_bohari', full_name: 'Bohari', display_name: 'Bohari', gender: 'male' },
    { id: 'p_amnah', full_name: 'Amnah', display_name: 'Amnah', gender: 'female' },
    { id: 'p_ahlan', full_name: 'Ahlan', display_name: 'Ahlan', gender: 'male' },
    { id: 'p_maskah', full_name: 'Siti Maskah', display_name: 'Siti Maskah', gender: 'female' },
    { id: 'p_misbah', full_name: 'Misbahul Khair', display_name: 'Misbahul Khair', gender: 'male' },
    { id: 'p_laela', full_name: 'Laela Wahyuni', display_name: 'Laela Wahyuni', gender: 'female' },
    { id: 'p_dwi', full_name: 'Dwi Sapariah', display_name: 'Dwi Sapariah', gender: 'female' },
    { id: 'p_muizzi', full_name: 'Abdul Muizzi', display_name: 'Abdul Muizzi', gender: 'male' },
    { id: 'p_nuraini', full_name: 'Nuraini', display_name: 'Nuraini', gender: 'female' },
    { id: 'p_izzatillah', full_name: 'Siti Izzatillah', display_name: 'Siti Izzatillah', gender: 'female' },
    { id: 'p_mujtahidin', full_name: 'Mujtahidin', display_name: 'Mujtahidin', gender: 'male' }
  ];

  const unions = [
    { id: 'u_abdul_masdep', status: 'unknown' },
    { id: 'u_bohari_amnah', status: 'unknown' },
    { id: 'u_ahlan_maskah', status: 'unknown' },
    { id: 'u_misbah_laela', status: 'unknown' },
    { id: 'u_muizzi_nuraini', status: 'unknown' },
    { id: 'u_izzatillah_mujtahidin', status: 'unknown' }
  ];

  const unionMembers = [
    { union_id: 'u_abdul_masdep', person_id: 'p_abdul' },
    { union_id: 'u_abdul_masdep', person_id: 'p_masdep' },
    { union_id: 'u_bohari_amnah', person_id: 'p_bohari' },
    { union_id: 'u_bohari_amnah', person_id: 'p_amnah' },
    { union_id: 'u_ahlan_maskah', person_id: 'p_ahlan' },
    { union_id: 'u_ahlan_maskah', person_id: 'p_maskah' },
    { union_id: 'u_misbah_laela', person_id: 'p_misbah' },
    { union_id: 'u_misbah_laela', person_id: 'p_laela' },
    { union_id: 'u_muizzi_nuraini', person_id: 'p_muizzi' },
    { union_id: 'u_muizzi_nuraini', person_id: 'p_nuraini' },
    { union_id: 'u_izzatillah_mujtahidin', person_id: 'p_izzatillah' },
    { union_id: 'u_izzatillah_mujtahidin', person_id: 'p_mujtahidin' }
  ];

  const parentChildRels = [
    { id: 'r1', parent_id: 'p_abdul', child_id: 'p_ahlan' },
    { id: 'r2', parent_id: 'p_masdep', child_id: 'p_ahlan' },
    { id: 'r3', parent_id: 'p_bohari', child_id: 'p_maskah' },
    { id: 'r4', parent_id: 'p_amnah', child_id: 'p_maskah' },
    { id: 'r5', parent_id: 'p_ahlan', child_id: 'p_misbah' },
    { id: 'r6', parent_id: 'p_maskah', child_id: 'p_misbah' },
    { id: 'r7', parent_id: 'p_ahlan', child_id: 'p_dwi' },
    { id: 'r8', parent_id: 'p_maskah', child_id: 'p_dwi' },
    { id: 'r9', parent_id: 'p_ahlan', child_id: 'p_muizzi' },
    { id: 'r10', parent_id: 'p_maskah', child_id: 'p_muizzi' },
    { id: 'r11', parent_id: 'p_ahlan', child_id: 'p_izzatillah' },
    { id: 'r12', parent_id: 'p_maskah', child_id: 'p_izzatillah' }
  ];

  const PERSON_NODE_WIDTH = 240;
  const PERSON_NODE_HEIGHT = 115;
  const COUPLE_GAP = 90;
  const SIBLING_GAP = 90;
  const SPOUSE_STACK_GAP = 28;
  const BESAN_GAP = 140;
  const GENERATION_HEIGHT = 280;
  const UNION_NODE_SIZE = 28;

  const positions = new Map();
  const peopleMap = new Map(people.map((p) => [p.id, p]));

  const unionToMembers = new Map();
  for (const um of unionMembers) {
    if (!unionToMembers.has(um.union_id)) unionToMembers.set(um.union_id, []);
    unionToMembers.get(um.union_id).push(um.person_id);
  }

  const personToUnions = new Map();
  for (const um of unionMembers) {
    if (!personToUnions.has(um.person_id)) personToUnions.set(um.person_id, []);
    personToUnions.get(um.person_id).push(um.union_id);
  }

  const childToParents = new Map();
  const parentToChildren = new Map();
  for (const rel of parentChildRels) {
    if (!childToParents.has(rel.child_id)) childToParents.set(rel.child_id, []);
    childToParents.get(rel.child_id).push(rel.parent_id);

    if (!parentToChildren.has(rel.parent_id)) parentToChildren.set(rel.parent_id, []);
    parentToChildren.get(rel.parent_id).push(rel.child_id);
  }

  const generationMap = new Map();
  for (const p of people) {
    const parents = childToParents.get(p.id) || [];
    if (parents.length === 0) {
      generationMap.set(p.id, 0);
    }
  }

  for (let pass = 0; pass < 10; pass++) {
    let changed = false;
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

  for (const p of people) {
    if (!generationMap.has(p.id)) generationMap.set(p.id, 0);
  }

  const placedPeople = new Set();
  const familyUnits = [];
  const personToUnitId = new Map();

  const unionById = new Map(unions.map((u) => [u.id, u]));

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
    const spouses = [];

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
    const unit = {
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

  // Identifikasi Focal Couple: unit yang memiliki anak terbanyak secara langsung
  let focalUnit = null;
  let maxDirectChildren = -1;

  for (const unit of familyUnits) {
    const childCount = unit.childUnitIds.length;
    if (childCount > maxDirectChildren && childCount > 0) {
      maxDirectChildren = childCount;
      focalUnit = unit;
    }
  }

  if (!focalUnit && familyUnits.length > 0) {
    focalUnit = familyUnits[0];
  }

  console.log('Selected focal unit:', focalUnit.id, focalUnit.primaryPerson.full_name);

  function computeSubtreeWidth(unit, visited = new Set()) {
    if (visited.has(unit.id)) return unit.subtreeWidth;
    visited.add(unit.id);

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

  function assignCoordinates(
    unit,
    startX,
    baseY,
    visited = new Set()
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

    const validChildren = [];
    for (let i = 0; i < unit.childUnitIds.length; i++) {
      const childUnit = unitMap.get(unit.childUnitIds[i]);
      if (childUnit && !visited.has(childUnit.id)) {
        validChildren.push(childUnit);
      }
    }

    const effectiveWidth = validChildren.length > 0 ? unit.subtreeWidth : selfWidth;
    const cardX = startX + (effectiveWidth - selfWidth) / 2;
    const cardY = baseY;

    unit.x = cardX;
    unit.y = cardY;

    positions.set(`person-${unit.primaryPerson.id}`, { x: cardX, y: cardY });

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

  const visitedUnits = new Set();

  if (focalUnit) {
    const focalStartY = GENERATION_HEIGHT;
    const focalStartX = 0;
    assignCoordinates(focalUnit, focalStartX, focalStartY, visitedUnits);
  }

  const getParentUnitSelfWidth = (u) =>
    u.spouses.length > 0
      ? PERSON_NODE_WIDTH + COUPLE_GAP + PERSON_NODE_WIDTH
      : PERSON_NODE_WIDTH;

  let ancestorsPlaced = true;
  while (ancestorsPlaced) {
    ancestorsPlaced = false;

    for (const unit of familyUnits) {
      if (!visitedUnits.has(unit.id)) continue;

      const membersInUnit = [
        { person: unit.primaryPerson, isPrimary: true },
        ...unit.spouses.map((s) => ({ person: s.spouse, isPrimary: false })),
      ];

      const parentUnitsToPlace = [];

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
        const item = parentUnitsToPlace[0];
        const memberPos = positions.get(`person-${item.member.id}`) || { x: unit.x, y: unit.y };
        const pWidth = getParentUnitSelfWidth(item.parentUnit);
        const pX = memberPos.x + PERSON_NODE_WIDTH / 2 - pWidth / 2;
        assignCoordinates(item.parentUnit, pX, pY, visitedUnits);
        ancestorsPlaced = true;
      } else {
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

  return positions;
}

const pos = testLayoutLogic();
console.log('--- ANCESTORS & PARENTS COORDINATES ---');
for (const [k, v] of pos.entries()) {
  console.log(k.padEnd(30), JSON.stringify(v));
}
