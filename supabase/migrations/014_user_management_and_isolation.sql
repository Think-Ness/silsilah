-- ============================================================
-- 014_user_management_and_isolation.sql
-- User Management RPCs (Edit Profile, Delete User, List With Emails)
-- and Data Isolation Cleanup
-- ============================================================

-- 1. Ensure all existing canvases have owner_id assigned to super_admin
DO $$
DECLARE
  v_admin_id UUID;
BEGIN
  SELECT id INTO v_admin_id FROM profiles WHERE role = 'super_admin' LIMIT 1;
  IF v_admin_id IS NULL THEN
    SELECT id INTO v_admin_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  END IF;

  IF v_admin_id IS NOT NULL THEN
    UPDATE canvases 
    SET owner_id = v_admin_id 
    WHERE owner_id IS NULL;
  END IF;
END $$;

-- 2. RPC: List all user profiles with their registered emails (Super Admin only)
CREATE OR REPLACE FUNCTION public.admin_get_users_with_email()
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  role TEXT,
  is_active BOOLEAN,
  person_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    COALESCE(u.email::TEXT, '(Email tidak tersedia)') as email,
    p.avatar_url,
    p.role,
    p.is_active,
    p.person_id,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  ORDER BY p.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RPC: Update user profile from admin panel
CREATE OR REPLACE FUNCTION public.admin_update_user_profile(
  p_user_id UUID,
  p_full_name TEXT DEFAULT NULL,
  p_role TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_person_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role != 'super_admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Hanya Super Admin yang dapat mengubah data pengguna');
  END IF;

  UPDATE public.profiles
  SET
    full_name = COALESCE(p_full_name, full_name),
    role = COALESCE(p_role, role),
    is_active = COALESCE(p_is_active, is_active),
    person_id = p_person_id,
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC: Delete user account from auth.users and profiles
CREATE OR REPLACE FUNCTION public.admin_delete_user(
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role != 'super_admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Hanya Super Admin yang dapat menghapus akun pengguna');
  END IF;

  IF p_user_id = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tidak dapat menghapus akun Anda sendiri');
  END IF;

  -- Delete from profiles & auth.users
  DELETE FROM public.canvas_shares WHERE user_id = p_user_id OR shared_by = p_user_id;
  DELETE FROM public.profiles WHERE id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
