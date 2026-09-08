-- ============================================================
-- Family Genealogy — Seed Data
-- Data dari PRD §30
-- ============================================================
-- CATATAN: Jalankan migration 001 dan 002 terlebih dahulu.
-- Seed ini menggunakan hardcoded UUIDs agar konsisten.
-- ============================================================

-- Matikan RLS sementara untuk seed
SET session_replication_role = replica;

-- ============================================================
-- GENERASI 0 (Kakek-Nenek)
-- ============================================================

INSERT INTO people (id, full_name, display_name, prefix_title, gender, life_status, visibility, created_at, updated_at) VALUES
  ('00000001-0000-0000-0000-000000000001', 'Abdul Mu''in', 'Abdul Mu''in', 'TGH.', 'male', 'unknown', 'family', NOW(), NOW()),
  ('00000001-0000-0000-0000-000000000002', 'Masdep', 'Masdep', NULL, 'female', 'unknown', 'family', NOW(), NOW()),
  ('00000001-0000-0000-0000-000000000003', 'Bohari', 'Bohari', NULL, 'male', 'unknown', 'family', NOW(), NOW()),
  ('00000001-0000-0000-0000-000000000004', 'Amnah', 'Amnah', NULL, 'female', 'unknown', 'family', NOW(), NOW());

-- ============================================================
-- GENERASI 1
-- ============================================================

INSERT INTO people (id, full_name, display_name, gender, life_status, visibility, created_at, updated_at) VALUES
  ('00000002-0000-0000-0000-000000000001', 'Ahlan', 'Ahlan', 'male', 'unknown', 'family', NOW(), NOW()),
  ('00000002-0000-0000-0000-000000000002', 'Siti Maskah', 'Siti Maskah', 'female', 'unknown', 'family', NOW(), NOW());

-- Siti Maskah pakai prefix Hj.
UPDATE people SET prefix_title = 'Hj.' WHERE id = '00000002-0000-0000-0000-000000000002';

-- ============================================================
-- GENERASI 2
-- ============================================================

INSERT INTO people (id, full_name, display_name, prefix_title, gender, life_status, visibility, created_at, updated_at) VALUES
  -- Anak 1: H. Misbahul Khair + Hj. Laela Wahyuni
  ('00000003-0000-0000-0000-000000000001', 'Misbahul Khair', 'Misbahul Khair', 'H.', 'male', 'living', 'family', NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000002', 'Laela Wahyuni', 'Laela Wahyuni', 'Hj.', 'female', 'living', 'family', NOW(), NOW()),

  -- Anak 2: Hj. Dwi Sapariah
  ('00000003-0000-0000-0000-000000000003', 'Dwi Sapariah', 'Dwi Sapariah', 'Hj.', 'female', 'living', 'family', NOW(), NOW()),

  -- Anak 3: H. Abdul Muizzi + Nuraini
  ('00000003-0000-0000-0000-000000000004', 'Abdul Muizzi', 'Abdul Muizzi', 'H.', 'male', 'living', 'family', NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000005', 'Nuraini', 'Nuraini', NULL, 'female', 'living', 'family', NOW(), NOW()),

  -- Anak 4: Siti Izzatillah + Mujtahidin
  ('00000003-0000-0000-0000-000000000006', 'Siti Izzatillah', 'Siti Izzatillah', NULL, 'female', 'living', 'family', NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000007', 'Mujtahidin', 'Mujtahidin', NULL, 'male', 'living', 'family', NOW(), NOW());

-- ============================================================
-- GENERASI 3
-- ============================================================

INSERT INTO people (id, full_name, display_name, gender, life_status, visibility, created_at, updated_at) VALUES
  -- Anak-anak Misbahul Khair + Laela Wahyuni
  ('00000004-0000-0000-0000-000000000001', 'Khairul Atqiya', 'Khairul Atqiya', 'male', 'living', 'family', NOW(), NOW()),
  ('00000004-0000-0000-0000-000000000002', 'Ratu Kamila', 'Ratu Kamila', 'female', 'living', 'family', NOW(), NOW()),
  ('00000004-0000-0000-0000-000000000003', 'Dhiya Uduha', 'Dhiya Uduha', 'female', 'living', 'family', NOW(), NOW()),
  ('00000004-0000-0000-0000-000000000004', 'Thabrani', 'Thabrani', 'male', 'living', 'family', NOW(), NOW()),
  ('00000004-0000-0000-0000-000000000005', 'Ahmad Tanjiallah', 'Ahmad Tanjiallah', 'male', 'living', 'family', NOW(), NOW()),
  ('00000004-0000-0000-0000-000000000006', 'Khairina Yasmin', 'Khairina Yasmin', 'female', 'living', 'family', NOW(), NOW()),

  -- Anak-anak Abdul Muizzi + Nuraini
  ('00000004-0000-0000-0000-000000000007', 'Nuzi Ajrina', 'Nuzi Ajrina', 'female', 'living', 'family', NOW(), NOW()),
  ('00000004-0000-0000-0000-000000000008', 'Muhammad Idrus Farogi', 'Muhammad Idrus Farogi', 'male', 'living', 'family', NOW(), NOW()),
  ('00000004-0000-0000-0000-000000000009', 'Muhammad Fitroni Jazlan', 'Muhammad Fitroni Jazlan', 'male', 'living', 'family', NOW(), NOW()),

  -- Anak-anak Siti Izzatillah + Mujtahidin
  ('00000004-0000-0000-0000-000000000010', 'Mudawamatul Muajahah', 'Mudawamatul Muajahah', 'female', 'living', 'family', NOW(), NOW()),
  ('00000004-0000-0000-0000-000000000011', 'Muhammad Ardiannur Filsuf Tasaufi', 'Muhammad Ardiannur', 'male', 'living', 'family', NOW(), NOW()),
  ('00000004-0000-0000-0000-000000000012', 'Sigap Dwi Aminullah', 'Sigap Dwi Aminullah', 'male', 'living', 'family', NOW(), NOW());

-- ============================================================
-- GENERASI 4
-- ============================================================

INSERT INTO people (id, full_name, display_name, gender, life_status, visibility, created_at, updated_at) VALUES
  -- Anak-anak Dhiya Uduha + Thabrani
  ('00000005-0000-0000-0000-000000000001', 'Hatica Lubna', 'Hatica Lubna', 'female', 'living', 'family', NOW(), NOW()),
  ('00000005-0000-0000-0000-000000000002', 'Zaina', 'Zaina', 'female', 'living', 'family', NOW(), NOW()),

  -- Anak-anak Nuzi Ajrina + Muhammad Idrus Farogi
  ('00000005-0000-0000-0000-000000000003', 'Jamilal Muhayya Uzaibal Madzaq', 'Jamilal Muhayya', 'male', 'living', 'family', NOW(), NOW()),
  ('00000005-0000-0000-0000-000000000004', 'Sayyida Sofiya Nafisa', 'Sayyida Sofiya', 'female', 'living', 'family', NOW(), NOW()),

  -- Anak Mudawamatul Muajahah + Muhammad Ardiannur
  ('00000005-0000-0000-0000-000000000005', 'Bunayya Muhammad Fatihil Quds', 'Bunayya Muhammad', 'male', 'living', 'family', NOW(), NOW());

-- ============================================================
-- UNIONS (Pernikahan)
-- ============================================================

INSERT INTO unions (id, relationship_type, status, created_at, updated_at) VALUES
  -- Gen 0
  ('10000001-0000-0000-0000-000000000001', 'marriage', 'unknown', NOW(), NOW()),  -- TGH. Abdul Mu'in + Masdep
  ('10000001-0000-0000-0000-000000000002', 'marriage', 'unknown', NOW(), NOW()),  -- Bohari + Amnah

  -- Gen 1
  ('10000002-0000-0000-0000-000000000001', 'marriage', 'unknown', NOW(), NOW()),  -- Ahlan + Siti Maskah

  -- Gen 2
  ('10000003-0000-0000-0000-000000000001', 'marriage', 'active', NOW(), NOW()),   -- Misbahul Khair + Laela Wahyuni
  ('10000003-0000-0000-0000-000000000002', 'marriage', 'active', NOW(), NOW()),   -- Abdul Muizzi + Nuraini
  ('10000003-0000-0000-0000-000000000003', 'marriage', 'active', NOW(), NOW()),   -- Siti Izzatillah + Mujtahidin

  -- Gen 3
  ('10000004-0000-0000-0000-000000000001', 'marriage', 'active', NOW(), NOW()),   -- Khairul Atqiya + Ratu Kamila
  ('10000004-0000-0000-0000-000000000002', 'marriage', 'active', NOW(), NOW()),   -- Dhiya Uduha + Thabrani
  ('10000004-0000-0000-0000-000000000003', 'marriage', 'active', NOW(), NOW()),   -- Nuzi Ajrina + Muhammad Idrus Farogi
  ('10000004-0000-0000-0000-000000000004', 'marriage', 'active', NOW(), NOW());   -- Mudawamatul Muajahah + Muhammad Ardiannur

-- ============================================================
-- UNION_MEMBERS
-- ============================================================

INSERT INTO union_members (union_id, person_id, role) VALUES
  -- TGH. Abdul Mu'in + Masdep
  ('10000001-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'spouse'),
  ('10000001-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000002', 'spouse'),

  -- Bohari + Amnah
  ('10000001-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000003', 'spouse'),
  ('10000001-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000004', 'spouse'),

  -- Ahlan + Siti Maskah
  ('10000002-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000001', 'spouse'),
  ('10000002-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000002', 'spouse'),

  -- Misbahul Khair + Laela Wahyuni
  ('10000003-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000001', 'spouse'),
  ('10000003-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000002', 'spouse'),

  -- Abdul Muizzi + Nuraini
  ('10000003-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000004', 'spouse'),
  ('10000003-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000005', 'spouse'),

  -- Siti Izzatillah + Mujtahidin
  ('10000003-0000-0000-0000-000000000003', '00000003-0000-0000-0000-000000000006', 'spouse'),
  ('10000003-0000-0000-0000-000000000003', '00000003-0000-0000-0000-000000000007', 'spouse'),

  -- Khairul Atqiya + Ratu Kamila
  ('10000004-0000-0000-0000-000000000001', '00000004-0000-0000-0000-000000000001', 'spouse'),
  ('10000004-0000-0000-0000-000000000001', '00000004-0000-0000-0000-000000000002', 'spouse'),

  -- Dhiya Uduha + Thabrani
  ('10000004-0000-0000-0000-000000000002', '00000004-0000-0000-0000-000000000003', 'spouse'),
  ('10000004-0000-0000-0000-000000000002', '00000004-0000-0000-0000-000000000004', 'spouse'),

  -- Nuzi Ajrina + Muhammad Idrus Farogi
  ('10000004-0000-0000-0000-000000000003', '00000004-0000-0000-0000-000000000007', 'spouse'),
  ('10000004-0000-0000-0000-000000000003', '00000004-0000-0000-0000-000000000008', 'spouse'),

  -- Mudawamatul Muajahah + Muhammad Ardiannur
  ('10000004-0000-0000-0000-000000000004', '00000004-0000-0000-0000-000000000010', 'spouse'),
  ('10000004-0000-0000-0000-000000000004', '00000004-0000-0000-0000-000000000011', 'spouse');

-- ============================================================
-- PARENT_CHILD_RELATIONSHIPS
-- ============================================================

INSERT INTO parent_child_relationships (parent_id, child_id, union_id, relationship_type, biological_status) VALUES
  -- TGH. Abdul Mu'in + Masdep → Ahlan
  ('00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000001', '10000001-0000-0000-0000-000000000001', 'parent', 'biological'),
  ('00000001-0000-0000-0000-000000000002', '00000002-0000-0000-0000-000000000001', '10000001-0000-0000-0000-000000000001', 'parent', 'biological'),

  -- Bohari + Amnah → Siti Maskah
  ('00000001-0000-0000-0000-000000000003', '00000002-0000-0000-0000-000000000002', '10000001-0000-0000-0000-000000000002', 'parent', 'biological'),
  ('00000001-0000-0000-0000-000000000004', '00000002-0000-0000-0000-000000000002', '10000001-0000-0000-0000-000000000002', 'parent', 'biological'),

  -- Ahlan + Siti Maskah → 4 anak
  ('00000002-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000001', '10000002-0000-0000-0000-000000000001', 'parent', 'biological'), -- Misbahul Khair
  ('00000002-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000001', '10000002-0000-0000-0000-000000000001', 'parent', 'biological'),
  ('00000002-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000003', '10000002-0000-0000-0000-000000000001', 'parent', 'biological'), -- Dwi Sapariah
  ('00000002-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000003', '10000002-0000-0000-0000-000000000001', 'parent', 'biological'),
  ('00000002-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000004', '10000002-0000-0000-0000-000000000001', 'parent', 'biological'), -- Abdul Muizzi
  ('00000002-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000004', '10000002-0000-0000-0000-000000000001', 'parent', 'biological'),
  ('00000002-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000006', '10000002-0000-0000-0000-000000000001', 'parent', 'biological'), -- Siti Izzatillah
  ('00000002-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000006', '10000002-0000-0000-0000-000000000001', 'parent', 'biological'),

  -- Misbahul Khair + Laela Wahyuni → 4 anak
  ('00000003-0000-0000-0000-000000000001', '00000004-0000-0000-0000-000000000001', '10000003-0000-0000-0000-000000000001', 'parent', 'biological'), -- Khairul Atqiya
  ('00000003-0000-0000-0000-000000000002', '00000004-0000-0000-0000-000000000001', '10000003-0000-0000-0000-000000000001', 'parent', 'biological'),
  ('00000003-0000-0000-0000-000000000001', '00000004-0000-0000-0000-000000000003', '10000003-0000-0000-0000-000000000001', 'parent', 'biological'), -- Dhiya Uduha
  ('00000003-0000-0000-0000-000000000002', '00000004-0000-0000-0000-000000000003', '10000003-0000-0000-0000-000000000001', 'parent', 'biological'),
  ('00000003-0000-0000-0000-000000000001', '00000004-0000-0000-0000-000000000005', '10000003-0000-0000-0000-000000000001', 'parent', 'biological'), -- Ahmad Tanjiallah
  ('00000003-0000-0000-0000-000000000002', '00000004-0000-0000-0000-000000000005', '10000003-0000-0000-0000-000000000001', 'parent', 'biological'),
  ('00000003-0000-0000-0000-000000000001', '00000004-0000-0000-0000-000000000006', '10000003-0000-0000-0000-000000000001', 'parent', 'biological'), -- Khairina Yasmin
  ('00000003-0000-0000-0000-000000000002', '00000004-0000-0000-0000-000000000006', '10000003-0000-0000-0000-000000000001', 'parent', 'biological'),

  -- Abdul Muizzi + Nuraini → 2 anak
  ('00000003-0000-0000-0000-000000000004', '00000004-0000-0000-0000-000000000007', '10000003-0000-0000-0000-000000000002', 'parent', 'biological'), -- Nuzi Ajrina
  ('00000003-0000-0000-0000-000000000005', '00000004-0000-0000-0000-000000000007', '10000003-0000-0000-0000-000000000002', 'parent', 'biological'),
  ('00000003-0000-0000-0000-000000000004', '00000004-0000-0000-0000-000000000009', '10000003-0000-0000-0000-000000000002', 'parent', 'biological'), -- Muhammad Fitroni Jazlan
  ('00000003-0000-0000-0000-000000000005', '00000004-0000-0000-0000-000000000009', '10000003-0000-0000-0000-000000000002', 'parent', 'biological'),

  -- Siti Izzatillah + Mujtahidin → 2 anak
  ('00000003-0000-0000-0000-000000000006', '00000004-0000-0000-0000-000000000010', '10000003-0000-0000-0000-000000000003', 'parent', 'biological'), -- Mudawamatul
  ('00000003-0000-0000-0000-000000000007', '00000004-0000-0000-0000-000000000010', '10000003-0000-0000-0000-000000000003', 'parent', 'biological'),
  ('00000003-0000-0000-0000-000000000006', '00000004-0000-0000-0000-000000000012', '10000003-0000-0000-0000-000000000003', 'parent', 'biological'), -- Sigap Dwi Aminullah
  ('00000003-0000-0000-0000-000000000007', '00000004-0000-0000-0000-000000000012', '10000003-0000-0000-0000-000000000003', 'parent', 'biological'),

  -- Dhiya Uduha + Thabrani → 2 anak
  ('00000004-0000-0000-0000-000000000003', '00000005-0000-0000-0000-000000000001', '10000004-0000-0000-0000-000000000002', 'parent', 'biological'), -- Hatica Lubna
  ('00000004-0000-0000-0000-000000000004', '00000005-0000-0000-0000-000000000001', '10000004-0000-0000-0000-000000000002', 'parent', 'biological'),
  ('00000004-0000-0000-0000-000000000003', '00000005-0000-0000-0000-000000000002', '10000004-0000-0000-0000-000000000002', 'parent', 'biological'), -- Zaina
  ('00000004-0000-0000-0000-000000000004', '00000005-0000-0000-0000-000000000002', '10000004-0000-0000-0000-000000000002', 'parent', 'biological'),

  -- Nuzi Ajrina + Muhammad Idrus Farogi → 2 anak
  ('00000004-0000-0000-0000-000000000007', '00000005-0000-0000-0000-000000000003', '10000004-0000-0000-0000-000000000003', 'parent', 'biological'), -- Jamilal
  ('00000004-0000-0000-0000-000000000008', '00000005-0000-0000-0000-000000000003', '10000004-0000-0000-0000-000000000003', 'parent', 'biological'),
  ('00000004-0000-0000-0000-000000000007', '00000005-0000-0000-0000-000000000004', '10000004-0000-0000-0000-000000000003', 'parent', 'biological'), -- Sayyida Sofiya
  ('00000004-0000-0000-0000-000000000008', '00000005-0000-0000-0000-000000000004', '10000004-0000-0000-0000-000000000003', 'parent', 'biological'),

  -- Mudawamatul + Muhammad Ardiannur → 1 anak
  ('00000004-0000-0000-0000-000000000010', '00000005-0000-0000-0000-000000000005', '10000004-0000-0000-0000-000000000004', 'parent', 'biological'), -- Bunayya Muhammad
  ('00000004-0000-0000-0000-000000000011', '00000005-0000-0000-0000-000000000005', '10000004-0000-0000-0000-000000000004', 'parent', 'biological');

-- ============================================================
-- CANVAS LAYOUT (Default)
-- ============================================================
INSERT INTO genealogy_canvas_layouts (id, name, root_person_id, display_mode) VALUES
  ('20000001-0000-0000-0000-000000000001', 'Layout Utama', '00000002-0000-0000-0000-000000000001', 'descendants');

-- Re-enable RLS
SET session_replication_role = DEFAULT;
