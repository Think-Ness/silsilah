-- ============================================================
-- 013_multi_user_and_sharing.sql
-- Multi-User Canvas Ownership, Access Control & Canvas Sharing
-- ============================================================

-- 1. Add owner_id and is_public to canvases table
ALTER TABLE canvases 
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- Backfill existing canvases to the super_admin or first user if owner_id is NULL
DO $$
DECLARE
  v_admin_id UUID;
BEGIN
  -- Cari user dengan role super_admin dari profiles atau auth.users
  SELECT id INTO v_admin_id 
  FROM profiles 
  WHERE role = 'super_admin' 
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    SELECT id INTO v_admin_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  END IF;

  IF v_admin_id IS NOT NULL THEN
    UPDATE canvases 
    SET owner_id = v_admin_id 
    WHERE owner_id IS NULL;
  END IF;
END $$;

-- 2. Create canvas_shares table
CREATE TABLE IF NOT EXISTS canvas_shares (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canvas_id   UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission  TEXT NOT NULL CHECK (permission IN ('view', 'edit')) DEFAULT 'view',
  shared_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (canvas_id, user_id)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_canvas_shares_canvas_id ON canvas_shares(canvas_id);
CREATE INDEX IF NOT EXISTS idx_canvas_shares_user_id ON canvas_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_canvases_owner_id ON canvases(owner_id);

-- 3. Enable RLS on canvas_shares
ALTER TABLE canvas_shares ENABLE ROW LEVEL SECURITY;

-- Drop existing generic policies on canvases to replace with secure ownership rules
DROP POLICY IF EXISTS "Public read canvases" ON canvases;
DROP POLICY IF EXISTS "Allow insert canvases" ON canvases;
DROP POLICY IF EXISTS "Allow update canvases" ON canvases;
DROP POLICY IF EXISTS "Allow delete canvases" ON canvases;

-- 4. RLS on canvases
-- SELECT: Super Admin OR Owner OR Shared with User OR Public OR anonymous/initial setup fallback
CREATE POLICY "canvases_select_policy" ON canvases
  FOR SELECT
  USING (
    public.is_super_admin()
    OR owner_id = auth.uid()
    OR owner_id IS NULL -- backward compatibility
    OR is_public = true
    OR EXISTS (
      SELECT 1 FROM canvas_shares 
      WHERE canvas_shares.canvas_id = canvases.id 
        AND canvas_shares.user_id = auth.uid()
    )
  );

-- INSERT: Authenticated users can create canvases (sets owner_id)
CREATE POLICY "canvases_insert_policy" ON canvases
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    OR public.is_super_admin()
  );

-- UPDATE: Super Admin OR Owner OR Shared with 'edit' permission
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

-- DELETE: Only Super Admin OR Owner
CREATE POLICY "canvases_delete_policy" ON canvases
  FOR DELETE
  USING (
    public.is_super_admin()
    OR owner_id = auth.uid()
    OR owner_id IS NULL
  );

-- 5. RLS on canvas_shares
-- SELECT: Super Admin OR Canvas Owner OR the shared User
CREATE POLICY "canvas_shares_select" ON canvas_shares
  FOR SELECT
  USING (
    public.is_super_admin()
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM canvases 
      WHERE canvases.id = canvas_shares.canvas_id 
        AND (canvases.owner_id = auth.uid() OR canvases.owner_id IS NULL)
    )
  );

-- INSERT/UPDATE/DELETE: Only Super Admin OR Canvas Owner
CREATE POLICY "canvas_shares_manage" ON canvas_shares
  FOR ALL
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM canvases 
      WHERE canvases.id = canvas_shares.canvas_id 
        AND (canvases.owner_id = auth.uid() OR canvases.owner_id IS NULL)
    )
  );

-- 6. RPC Function to share canvas by email
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
  -- Verify permission parameter
  IF p_permission NOT IN ('view', 'edit') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Izin harus view atau edit');
  END IF;

  -- Check canvas ownership or super admin
  SELECT owner_id INTO v_canvas_owner FROM canvases WHERE id = p_canvas_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kanvas tidak ditemukan');
  END IF;

  IF NOT (public.is_super_admin() OR v_canvas_owner = auth.uid() OR v_canvas_owner IS NULL) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Hanya pemilik kanvas yang dapat membagikan kanvas ini');
  END IF;

  -- Find user by email in auth.users
  SELECT id INTO v_target_user_id 
  FROM auth.users 
  WHERE email ILIKE TRIM(p_email) 
  LIMIT 1;

  IF v_target_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pengguna dengan email tersebut belum terdaftar');
  END IF;

  -- Cannot share with oneself
  IF v_target_user_id = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Anda adalah pemilik kanvas ini');
  END IF;

  -- Insert or update share
  INSERT INTO canvas_shares (canvas_id, user_id, permission, shared_by)
  VALUES (p_canvas_id, v_target_user_id, p_permission, auth.uid())
  ON CONFLICT (canvas_id, user_id) 
  DO UPDATE SET 
    permission = EXCLUDED.permission,
    shared_by = EXCLUDED.shared_by,
    created_at = NOW()
  RETURNING id INTO v_share_id;

  -- Get target profile info
  SELECT full_name, avatar_url INTO v_target_profile FROM profiles WHERE id = v_target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'share_id', v_share_id,
    'user_id', v_target_user_id,
    'email', p_email,
    'full_name', v_target_profile.full_name,
    'avatar_url', v_target_profile.avatar_url,
    'permission', p_permission
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
