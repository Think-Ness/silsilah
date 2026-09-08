-- ============================================================
-- Migration 007: Tambahkan kolom sort_order pada parent_child_relationships
-- ============================================================
-- Memungkinkan pengaturan urutan kelahiran anak (Anak ke-1, ke-2, dst.)
-- secara custom, baik melalui drag & drop di kanvas maupun dialog urutan.
-- ============================================================

-- 1. Tambah kolom sort_order jika belum ada
ALTER TABLE parent_child_relationships
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- 2. Beri izin UPDATE untuk pengguna terautentikasi jika belum ada
DROP POLICY IF EXISTS "pcr_update_authenticated" ON parent_child_relationships;
CREATE POLICY "pcr_update_authenticated" ON parent_child_relationships
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 3. Inisialisasi urutan awal berdasarkan tanggal lahir (jika ada)
-- Anak yang lahir lebih awal mendapat nomor urut lebih kecil
WITH ranked_children AS (
  SELECT
    pcr.id AS rel_id,
    ROW_NUMBER() OVER (
      PARTITION BY pcr.parent_id
      ORDER BY p.birth_date ASC NULLS LAST, pcr.created_at ASC
    ) - 1 AS new_sort_order
  FROM parent_child_relationships pcr
  JOIN people p ON p.id = pcr.child_id
)
UPDATE parent_child_relationships
SET sort_order = ranked_children.new_sort_order
FROM ranked_children
WHERE parent_child_relationships.id = ranked_children.rel_id;
