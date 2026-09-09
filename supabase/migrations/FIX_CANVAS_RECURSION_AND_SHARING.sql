-- ============================================================
-- FIX_CANVAS_RECURSION_AND_SHARING.sql
-- JALANKAN SQL INI DI SUPABASE SQL EDITOR UNTUK MEMPERBAIKI RLS & SHARING
-- ============================================================

-- 1. PASTIKAN STRUKTUR KOLOM TABEL CANVASES LENGKAP
ALTER TABLE canvases 
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS included_person_ids JSONB DEFAULT NULL;

-- 2. HAPUS SEMUA KEBIJAKAN RLS YANG MENYEBABKAN REKURSI (ERROR 42P17)
DROP POLICY IF EXISTS "canvases_select_policy" ON canvases;
DROP POLICY IF EXISTS "canvases_update_policy" ON canvases;
DROP POLICY IF EXISTS "canvases_delete_policy" ON canvases;
DROP POLICY IF EXISTS "canvases_insert_policy" ON canvases;
DROP POLICY IF EXISTS "canvas_shares_select" ON canvas_shares;
DROP POLICY IF EXISTS "canvas_shares_manage" ON canvas_shares;
DROP POLICY IF EXISTS "Public read canvases" ON canvases;
DROP POLICY IF EXISTS "Allow insert canvases" ON canvases;
DROP POLICY IF EXISTS "Allow update canvases" ON canvases;
DROP POLICY IF EXISTS "Allow delete canvases" ON canvases;

-- 2. HELPER SUPER ADMIN
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. RLS PADA TABEL CANVAS_SHARES (BEBAS REKURSI - TIDAK JOIN CANVASES)
CREATE POLICY "canvas_shares_select" ON canvas_shares
  FOR SELECT
  USING (
    public.is_super_admin()
    OR user_id = auth.uid()
    OR shared_by = auth.uid()
  );

CREATE POLICY "canvas_shares_manage" ON canvas_shares
  FOR ALL
  USING (
    public.is_super_admin()
    OR shared_by = auth.uid()
  );

-- 4. RLS PADA TABEL CANVASES (MENGGUNAKAN ATURAN NON-CIRCULAR)
CREATE POLICY "canvases_select_policy" ON canvases
  FOR SELECT
  USING (
    public.is_super_admin()
    OR owner_id = auth.uid()
    OR owner_id IS NULL
    OR is_public = true
    OR EXISTS (
      SELECT 1 FROM canvas_shares 
      WHERE canvas_shares.canvas_id = canvases.id 
        AND canvas_shares.user_id = auth.uid()
    )
  );

CREATE POLICY "canvases_insert_policy" ON canvases
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    OR public.is_super_admin()
  );

CREATE POLICY "canvases_update_policy" ON canvases
  FOR UPDATE
  USING (
    public.is_super_admin()
    OR owner_id = auth.uid()
    OR owner_id IS NULL
    OR EXISTS (
      SELECT 1 FROM canvas_shares 
      WHERE canvas_shares.canvas_id = canvases.id 
        AND canvas_shares.user_id = auth.uid()
        AND canvas_shares.permission = 'edit'
    )
  );

CREATE POLICY "canvases_delete_policy" ON canvases
  FOR DELETE
  USING (
    public.is_super_admin()
    OR owner_id = auth.uid()
    OR owner_id IS NULL
  );

-- 5. FUNGSI RPC: SHARE_CANVAS_BY_EMAIL
CREATE OR REPLACE FUNCTION public.share_canvas_by_email(
  p_canvas_id UUID,
  p_email TEXT,
  p_permission TEXT DEFAULT 'view'
)
RETURNS JSONB AS $$
DECLARE
  v_target_user_id UUID;
  v_share_id UUID;
  v_canvas_owner UUID;
  v_target_profile RECORD;
BEGIN
  IF p_permission NOT IN ('view', 'edit') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Izin harus view atau edit');
  END IF;

  SELECT owner_id INTO v_canvas_owner FROM canvases WHERE id = p_canvas_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kanvas tidak ditemukan');
  END IF;

  IF NOT (public.is_super_admin() OR v_canvas_owner = auth.uid() OR v_canvas_owner IS NULL) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Hanya pemilik kanvas yang dapat membagikan kanvas ini');
  END IF;

  SELECT id INTO v_target_user_id 
  FROM auth.users 
  WHERE email ILIKE TRIM(p_email) 
  LIMIT 1;

  IF v_target_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pengguna dengan email ' || p_email || ' belum terdaftar');
  END IF;

  IF v_target_user_id = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Anda adalah pemilik kanvas ini');
  END IF;

  INSERT INTO canvas_shares (canvas_id, user_id, permission, shared_by)
  VALUES (p_canvas_id, v_target_user_id, p_permission, auth.uid())
  ON CONFLICT (canvas_id, user_id) 
  DO UPDATE SET 
    permission = EXCLUDED.permission,
    shared_by = EXCLUDED.shared_by,
    created_at = NOW()
  RETURNING id INTO v_share_id;

  SELECT full_name, avatar_url INTO v_target_profile FROM profiles WHERE id = v_target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'share_id', v_share_id,
    'user_id', v_target_user_id,
    'email', p_email,
    'full_name', COALESCE(v_target_profile.full_name, p_email),
    'avatar_url', v_target_profile.avatar_url,
    'permission', p_permission
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. SET KEPEMILIKAN SELURUH DATA LEGACY KE AKUN SIGAP
DO $$
DECLARE
  v_sigap_id UUID;
  v_ahlan_id UUID;
  v_canvas RECORD;
BEGIN
  -- Cari ID akun Sigap
  SELECT id INTO v_sigap_id FROM profiles WHERE full_name ILIKE '%Sigap%' LIMIT 1;
  IF v_sigap_id IS NULL THEN
    SELECT id INTO v_sigap_id FROM auth.users WHERE email ILIKE '%sigap%' LIMIT 1;
  END IF;

  -- Cari ID akun Ahlan
  SELECT id INTO v_ahlan_id FROM auth.users WHERE email ILIKE '%ahlan%' LIMIT 1;
  IF v_ahlan_id IS NULL THEN
    SELECT id INTO v_ahlan_id FROM profiles WHERE full_name ILIKE '%Ahlan%' LIMIT 1;
  END IF;

  IF v_sigap_id IS NOT NULL THEN
    UPDATE canvases SET owner_id = v_sigap_id, created_by = v_sigap_id WHERE owner_id IS NULL OR created_by IS NULL;
    UPDATE people SET created_by = v_sigap_id, updated_by = v_sigap_id WHERE created_by IS NULL;
    UPDATE unions SET created_by = v_sigap_id, updated_by = v_sigap_id WHERE created_by IS NULL;
    UPDATE parent_child_relationships SET created_by = v_sigap_id WHERE created_by IS NULL;
    UPDATE media SET uploaded_by = v_sigap_id WHERE uploaded_by IS NULL;

    -- Bagikan kanvas Sigap ke Ahlan jika akun Ahlan terdaftar
    IF v_ahlan_id IS NOT NULL THEN
      FOR v_canvas IN SELECT id FROM canvases WHERE owner_id = v_sigap_id LOOP
        INSERT INTO canvas_shares (canvas_id, user_id, permission, shared_by)
        VALUES (v_canvas.id, v_ahlan_id, 'edit', v_sigap_id)
        ON CONFLICT (canvas_id, user_id) DO UPDATE SET permission = 'edit';
      END LOOP;
    END IF;
  END IF;
END $$;
