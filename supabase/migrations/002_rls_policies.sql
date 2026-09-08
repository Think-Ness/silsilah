-- ============================================================
-- Family Genealogy — RLS (Row Level Security) Policies
-- ============================================================
-- Visibility levels:
--   public  → semua orang bisa baca (termasuk anon)
--   family  → hanya authenticated users
--   private → hanya creator atau super admin
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE people                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE unions                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE union_members               ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_child_relationships  ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE media                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_media                ENABLE ROW LEVEL SECURITY;
ALTER TABLE genealogy_canvas_layouts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE genealogy_node_positions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs                  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER: check apakah user adalah super_admin
-- Diletakkan di schema public (karena schema auth diproteksi oleh Supabase)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin',
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin',
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
        AND (
          raw_app_meta_data->>'role' = 'super_admin'
          OR raw_user_meta_data->>'role' = 'super_admin'
          OR role = 'super_admin'
        )
    ),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- TABLE: people
-- ============================================================

-- SELECT: public records bisa dibaca semua, family hanya authenticated
CREATE POLICY "people_select_public" ON people
  FOR SELECT
  USING (
    (visibility = 'public' AND archived_at IS NULL)
    OR
    (auth.role() = 'authenticated' AND visibility IN ('public', 'family') AND archived_at IS NULL)
    OR
    (auth.uid() = created_by AND archived_at IS NULL)
    OR
    public.is_super_admin()
  );

-- INSERT: hanya authenticated
CREATE POLICY "people_insert_authenticated" ON people
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- UPDATE: creator atau super admin
CREATE POLICY "people_update_own_or_admin" ON people
  FOR UPDATE
  USING (
    auth.uid() = created_by OR public.is_super_admin()
  );

-- DELETE: hanya super admin (hard delete jarang dipakai, prefer archive)
CREATE POLICY "people_delete_admin_only" ON people
  FOR DELETE
  USING (public.is_super_admin());

-- ============================================================
-- TABLE: unions
-- ============================================================
CREATE POLICY "unions_select_authenticated" ON unions
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "unions_insert_authenticated" ON unions
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "unions_update_admin" ON unions
  FOR UPDATE
  USING (auth.uid() = created_by OR public.is_super_admin());

CREATE POLICY "unions_delete_admin" ON unions
  FOR DELETE
  USING (public.is_super_admin());

-- ============================================================
-- TABLE: union_members
-- ============================================================
CREATE POLICY "union_members_select_authenticated" ON union_members
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "union_members_insert_authenticated" ON union_members
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "union_members_delete_admin" ON union_members
  FOR DELETE
  USING (public.is_super_admin());

-- ============================================================
-- TABLE: parent_child_relationships
-- ============================================================
CREATE POLICY "pcr_select_authenticated" ON parent_child_relationships
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "pcr_insert_authenticated" ON parent_child_relationships
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "pcr_update_admin" ON parent_child_relationships
  FOR UPDATE
  USING (auth.uid() = created_by OR public.is_super_admin());

CREATE POLICY "pcr_delete_admin" ON parent_child_relationships
  FOR DELETE
  USING (public.is_super_admin());

-- ============================================================
-- TABLE: addresses
-- ============================================================
CREATE POLICY "addresses_select" ON addresses
  FOR SELECT
  USING (
    (visibility = 'public')
    OR
    (auth.role() = 'authenticated' AND visibility IN ('public', 'family'))
    OR
    public.is_super_admin()
  );

CREATE POLICY "addresses_insert_authenticated" ON addresses
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "addresses_update_admin" ON addresses
  FOR UPDATE
  USING (public.is_super_admin());

CREATE POLICY "addresses_delete_admin" ON addresses
  FOR DELETE
  USING (public.is_super_admin());

-- ============================================================
-- TABLE: contacts
-- ============================================================
CREATE POLICY "contacts_select" ON contacts
  FOR SELECT
  USING (
    (is_public = TRUE AND visibility = 'public')
    OR
    (auth.role() = 'authenticated' AND visibility IN ('public', 'family'))
    OR
    public.is_super_admin()
  );

CREATE POLICY "contacts_insert_authenticated" ON contacts
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "contacts_update_admin" ON contacts
  FOR UPDATE
  USING (public.is_super_admin());

CREATE POLICY "contacts_delete_admin" ON contacts
  FOR DELETE
  USING (public.is_super_admin());

-- ============================================================
-- TABLE: media
-- ============================================================
CREATE POLICY "media_select" ON media
  FOR SELECT
  USING (
    (visibility = 'public')
    OR
    (auth.role() = 'authenticated' AND visibility IN ('public', 'family'))
    OR
    (auth.uid() = uploaded_by)
    OR
    public.is_super_admin()
  );

CREATE POLICY "media_insert_authenticated" ON media
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "media_update_own_or_admin" ON media
  FOR UPDATE
  USING (auth.uid() = uploaded_by OR public.is_super_admin());

CREATE POLICY "media_delete_admin" ON media
  FOR DELETE
  USING (public.is_super_admin());

-- ============================================================
-- TABLE: person_media
-- ============================================================
CREATE POLICY "person_media_select_authenticated" ON person_media
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "person_media_insert_authenticated" ON person_media
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "person_media_delete_admin" ON person_media
  FOR DELETE
  USING (public.is_super_admin());

-- ============================================================
-- TABLE: genealogy_canvas_layouts + genealogy_node_positions
-- ============================================================
CREATE POLICY "canvas_layouts_select_authenticated" ON genealogy_canvas_layouts
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "canvas_layouts_insert_authenticated" ON genealogy_canvas_layouts
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "canvas_layouts_update_own_or_admin" ON genealogy_canvas_layouts
  FOR UPDATE
  USING (auth.uid() = created_by OR public.is_super_admin());

CREATE POLICY "canvas_layouts_delete_admin" ON genealogy_canvas_layouts
  FOR DELETE
  USING (public.is_super_admin());

CREATE POLICY "node_positions_select_authenticated" ON genealogy_node_positions
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "node_positions_all_authenticated" ON genealogy_node_positions
  FOR ALL
  USING (auth.role() = 'authenticated');

-- ============================================================
-- TABLE: audit_logs (read-only untuk semua user, write via SECURITY DEFINER function)
-- ============================================================
CREATE POLICY "audit_logs_select_admin" ON audit_logs
  FOR SELECT
  USING (public.is_super_admin());

-- Audit log hanya bisa di-insert melalui server/trusted function
CREATE POLICY "audit_logs_insert_system" ON audit_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR public.is_super_admin());

-- ============================================================
-- Storage Policies (jalankan setelah bucket dibuat di Supabase)
-- ============================================================
-- Bucket: media (untuk foto & dokumen)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', false);

-- Authenticated bisa upload
-- CREATE POLICY "media_upload" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');

-- Authenticated bisa baca
-- CREATE POLICY "media_read" ON storage.objects
--   FOR SELECT USING (bucket_id = 'media' AND auth.role() = 'authenticated');

-- Admin bisa hapus
-- CREATE POLICY "media_delete_admin" ON storage.objects
--   FOR DELETE USING (bucket_id = 'media' AND public.is_super_admin());
