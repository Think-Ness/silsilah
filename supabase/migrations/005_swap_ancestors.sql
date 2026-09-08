-- ============================================================
-- Migration 005: Koreksi Silsilah Leluhur
-- ============================================================
-- Leluhur Pihak Ahlan: TGH. Abdul Mu'in & Masdep
-- Leluhur Pihak Siti Maskah: Bohari & Amnah
-- ============================================================

-- Hapus relasi orang tua lama untuk Ahlan dan Siti Maskah
DELETE FROM parent_child_relationships
WHERE child_id IN (
  '00000002-0000-0000-0000-000000000001', -- Ahlan
  '00000002-0000-0000-0000-000000000002'  -- Siti Maskah
)
AND parent_id IN (
  '00000001-0000-0000-0000-000000000001', -- TGH. Abdul Mu'in
  '00000001-0000-0000-0000-000000000002', -- Masdep
  '00000001-0000-0000-0000-000000000003', -- Bohari
  '00000001-0000-0000-0000-000000000004'  -- Amnah
);

-- Masukkan relasi yang benar:
-- 1. TGH. Abdul Mu'in + Masdep adalah orang tua AHLAN
INSERT INTO parent_child_relationships (parent_id, child_id, union_id, relationship_type, biological_status)
VALUES
  ('00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000001', '10000001-0000-0000-0000-000000000001', 'parent', 'biological'),
  ('00000001-0000-0000-0000-000000000002', '00000002-0000-0000-0000-000000000001', '10000001-0000-0000-0000-000000000001', 'parent', 'biological');

-- 2. Bohari + Amnah adalah orang tua SITI MASKAH
INSERT INTO parent_child_relationships (parent_id, child_id, union_id, relationship_type, biological_status)
VALUES
  ('00000001-0000-0000-0000-000000000003', '00000002-0000-0000-0000-000000000002', '10000001-0000-0000-0000-000000000002', 'parent', 'biological'),
  ('00000001-0000-0000-0000-000000000004', '00000002-0000-0000-0000-000000000002', '10000001-0000-0000-0000-000000000002', 'parent', 'biological');
