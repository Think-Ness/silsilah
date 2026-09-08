-- ============================================================
-- Migration 006: Berikan izin DELETE untuk pengguna terautentikasi
-- ============================================================
-- Memastikan anggota keluarga yang login dapat menghapus data
-- orang, relasi, dan informasi terkait di pohon keluarga.
-- ============================================================

-- 1. TABLE: people
DROP POLICY IF EXISTS "people_delete_admin_only" ON people;
DROP POLICY IF EXISTS "people_delete_authenticated" ON people;
CREATE POLICY "people_delete_authenticated" ON people
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- 2. TABLE: unions
DROP POLICY IF EXISTS "unions_delete_admin" ON unions;
DROP POLICY IF EXISTS "unions_delete_authenticated" ON unions;
CREATE POLICY "unions_delete_authenticated" ON unions
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- 3. TABLE: parent_child_relationships
DROP POLICY IF EXISTS "pcr_delete_admin" ON parent_child_relationships;
DROP POLICY IF EXISTS "pcr_delete_authenticated" ON parent_child_relationships;
CREATE POLICY "pcr_delete_authenticated" ON parent_child_relationships
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- 4. TABLE: addresses
DROP POLICY IF EXISTS "addresses_delete_admin" ON addresses;
DROP POLICY IF EXISTS "addresses_delete_authenticated" ON addresses;
CREATE POLICY "addresses_delete_authenticated" ON addresses
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- 5. TABLE: contacts
DROP POLICY IF EXISTS "contacts_delete_admin" ON contacts;
DROP POLICY IF EXISTS "contacts_delete_authenticated" ON contacts;
CREATE POLICY "contacts_delete_authenticated" ON contacts
  FOR DELETE
  USING (auth.role() = 'authenticated');
