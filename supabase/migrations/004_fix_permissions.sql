-- ============================================================
-- Migration 004: Berikan izin update untuk pengguna terautentikasi
-- ============================================================
-- Memastikan anggota keluarga yang login dapat memperbarui data
-- silsilah, relasi, dan informasi kontak tanpa terhalang RLS.
-- ============================================================

-- 1. TABLE: people
DROP POLICY IF EXISTS "people_update_own_or_admin" ON people;
DROP POLICY IF EXISTS "people_update_authenticated" ON people;
CREATE POLICY "people_update_authenticated" ON people
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- 2. TABLE: unions
DROP POLICY IF EXISTS "unions_update_admin" ON unions;
DROP POLICY IF EXISTS "unions_update_authenticated" ON unions;
CREATE POLICY "unions_update_authenticated" ON unions
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- 3. TABLE: parent_child_relationships
DROP POLICY IF EXISTS "pcr_update_admin" ON parent_child_relationships;
DROP POLICY IF EXISTS "pcr_update_authenticated" ON parent_child_relationships;
CREATE POLICY "pcr_update_authenticated" ON parent_child_relationships
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- 4. TABLE: addresses
DROP POLICY IF EXISTS "addresses_update_admin" ON addresses;
DROP POLICY IF EXISTS "addresses_update_authenticated" ON addresses;
CREATE POLICY "addresses_update_authenticated" ON addresses
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- 5. TABLE: contacts
DROP POLICY IF EXISTS "contacts_update_admin" ON contacts;
DROP POLICY IF EXISTS "contacts_update_authenticated" ON contacts;
CREATE POLICY "contacts_update_authenticated" ON contacts
  FOR UPDATE
  USING (auth.role() = 'authenticated');
