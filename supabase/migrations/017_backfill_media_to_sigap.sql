-- ============================================================
-- 017_backfill_media_to_sigap.sql
-- Backfill ownership of all legacy photos and document media 
-- to Sigap Dwi Aminullah
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

  -- 2. Backfill ownership media (foto dan dokumen) ke akun Sigap jika belum terisi (NULL)
  IF v_sigap_id IS NOT NULL THEN
    UPDATE media 
    SET uploaded_by = v_sigap_id 
    WHERE uploaded_by IS NULL;
  END IF;
END $$;
