-- ============================================================
-- 015_fix_canvas_rls_recursion.sql
-- Fix infinite recursion in canvases and canvas_shares RLS policies
-- ============================================================

-- 1. Drop the recursive policies from migration 013
DROP POLICY IF EXISTS "canvases_select_policy" ON canvases;
DROP POLICY IF EXISTS "canvases_update_policy" ON canvases;
DROP POLICY IF EXISTS "canvases_delete_policy" ON canvases;
DROP POLICY IF EXISTS "canvases_insert_policy" ON canvases;
DROP POLICY IF EXISTS "canvas_shares_select" ON canvas_shares;
DROP POLICY IF EXISTS "canvas_shares_manage" ON canvas_shares;

-- 2. Helper function to check super_admin without recursion (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. Non-recursive policies on canvas_shares
-- canvas_shares checks direct user_id/shared_by without querying canvases table
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

-- 4. Policies on canvases table
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
