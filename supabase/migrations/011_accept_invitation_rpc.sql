-- ============================================================
-- Migration 011: Secure Invitation Acceptance & Auto-Confirm Email
-- ============================================================
-- Fungsi ini memungkinkan anggota yang diundang untuk langsung
-- mengonfirmasi email dan mengaktifkan akun tanpa terhalang
-- verifikasi email default Supabase (Confirm email).
-- ============================================================

CREATE OR REPLACE FUNCTION public.accept_user_invitation(
  p_token TEXT,
  p_user_id UUID DEFAULT NULL,
  p_full_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_invitation RECORD;
  v_target_user_id UUID;
BEGIN
  -- 1. Cari undangan yang valid berdasarkan token
  SELECT * INTO v_invitation
  FROM public.invitations
  WHERE token = p_token
    AND accepted_at IS NULL
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Undangan tidak valid atau telah kadaluarsa'
    );
  END IF;

  -- 2. Tentukan user ID (dari argumen atau dari auth.users berdasarkan email undangan)
  v_target_user_id := p_user_id;
  IF v_target_user_id IS NULL THEN
    SELECT id INTO v_target_user_id
    FROM auth.users
    WHERE email = LOWER(v_invitation.email)
    LIMIT 1;
  END IF;

  -- 3. Jika user ada di auth.users, langsung konfirmasi emailnya otomatis (auto-confirm)
  IF v_target_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        updated_at = NOW()
    WHERE id = v_target_user_id;

    -- 4. Buat / perbarui profil anggota dengan peran yang diundang
    INSERT INTO public.profiles (id, full_name, role, is_active, updated_at)
    VALUES (
      v_target_user_id,
      COALESCE(p_full_name, split_part(v_invitation.email, '@', 1)),
      v_invitation.role,
      TRUE,
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      role = EXCLUDED.role,
      is_active = TRUE,
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
      updated_at = NOW();
  END IF;

  -- 5. Tandai undangan telah diterima
  UPDATE public.invitations
  SET accepted_at = NOW()
  WHERE id = v_invitation.id;

  RETURN jsonb_build_object(
    'success', true,
    'role', v_invitation.role,
    'email', v_invitation.email,
    'user_id', v_target_user_id
  );
END;
$$;

-- Berikan izin eksekusi ke anon & authenticated
GRANT EXECUTE ON FUNCTION public.accept_user_invitation(TEXT, UUID, TEXT) TO anon, authenticated, service_role;

-- ============================================================
-- Auto-confirm trigger: setiap user yang sign up dengan email
-- yang sudah ada di tabel invitations otomatis dikonfirmasi
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_confirm_invited_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Cek apakah email user yang mendaftar ada di tabel invitations
  IF EXISTS (
    SELECT 1 FROM public.invitations
    WHERE LOWER(email) = LOWER(NEW.email)
  ) THEN
    NEW.email_confirmed_at = COALESCE(NEW.email_confirmed_at, NOW());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_auto_confirm_invited_users ON auth.users;
CREATE TRIGGER tr_auto_confirm_invited_users
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_invited_users();
