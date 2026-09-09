-- ============================================================
-- 016_backfill_relationships_to_sigap.sql
-- Backfill ownership of all legacy unions, parent-child relationships,
-- and timeline genealogy data to Sigap Dwi Aminullah
-- ============================================================

DO $$
DECLARE
  v_sigap_id UUID;
BEGIN
  -- 1. Cari akun Sigap dari profiles atau auth.users
  SELECT id INTO v_sigap_id 
  FROM profiles 
  WHERE full_name ILIKE '%Sigap%'
  LIMIT 1;

  IF v_sigap_id IS NULL THEN
    SELECT id INTO v_sigap_id 
    FROM auth.users 
    WHERE email ILIKE '%sigap%' OR raw_user_meta_data->>'full_name' ILIKE '%Sigap%'
    LIMIT 1;
  END IF;

  -- Fallback jika belum ditemukan: cari super_admin atau user terlama
  IF v_sigap_id IS NULL THEN
    SELECT id INTO v_sigap_id FROM profiles WHERE role = 'super_admin' LIMIT 1;
  END IF;

  IF v_sigap_id IS NULL THEN
    SELECT id INTO v_sigap_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  END IF;

  -- 2. Backfill ownership ke akun Sigap jika belum terisi (NULL)
  IF v_sigap_id IS NOT NULL THEN
    -- People
    UPDATE people 
    SET created_by = v_sigap_id, updated_by = v_sigap_id 
    WHERE created_by IS NULL;

    -- Canvases
    UPDATE canvases 
    SET owner_id = v_sigap_id, created_by = v_sigap_id 
    WHERE owner_id IS NULL OR created_by IS NULL;

    -- Unions (Pernikahan / Pasangan)
    UPDATE unions 
    SET created_by = v_sigap_id, updated_by = v_sigap_id 
    WHERE created_by IS NULL;

    -- Parent-Child Relationships (Hubungan Ortu-Anak)
    UPDATE parent_child_relationships 
    SET created_by = v_sigap_id 
    WHERE created_by IS NULL;
  END IF;
END $$;
