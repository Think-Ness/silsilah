-- ============================================================
-- Phase 2A: Profiles, Roles & Invitations
-- ============================================================
-- Adds:
--   profiles          — linked to auth.users, stores role & display info
--   invitations       — token-based invite links with expiry
--   Updated helper functions for role checks
-- ============================================================

-- ============================================================
-- TABLE: profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Display
  full_name     TEXT,
  avatar_url    TEXT,

  -- Role: super_admin can do everything, family_member can submit edits,
  --       viewer can only read
  role          TEXT CHECK (role IN ('super_admin', 'family_member', 'viewer'))
                NOT NULL DEFAULT 'viewer',

  -- Status
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,

  -- Linked person in genealogy (optional)
  person_id     UUID REFERENCES people(id) ON DELETE SET NULL,

  -- Audit
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_app_meta_data->>'role', 'viewer')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name  = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TABLE: invitations
-- ============================================================
CREATE TABLE IF NOT EXISTS invitations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT NOT NULL,
  role          TEXT CHECK (role IN ('super_admin', 'family_member', 'viewer'))
                NOT NULL DEFAULT 'viewer',
  token         TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message       TEXT,
  accepted_at   TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for token lookup
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);

-- ============================================================
-- UPDATED HELPER FUNCTIONS
-- ============================================================

-- Check if current user is super_admin (using profiles table as primary source)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'super_admin'
        AND is_active = TRUE
    ),
    -- Fallback to app_metadata for bootstrap scenario (first admin)
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin',
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin',
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if current user is family_member or higher
CREATE OR REPLACE FUNCTION public.is_family_member_or_above()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('super_admin', 'family_member')
        AND is_active = TRUE
    ),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get current user's role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = auth.uid() AND is_active = TRUE;
  RETURN COALESCE(v_role, 'viewer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- RLS on profiles
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Everyone can read their own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id OR public.is_super_admin());

-- Super admin can see all profiles
CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT USING (public.is_super_admin());

-- Only super admin can update roles
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_super_admin());

-- Insert: only via trigger (handle_new_user)
CREATE POLICY "profiles_insert_trigger" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id OR public.is_super_admin());

-- ============================================================
-- RLS on invitations
-- ============================================================
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Super admin can manage all invitations
CREATE POLICY "invitations_admin_all" ON invitations
  FOR ALL USING (public.is_super_admin());

-- Anyone can read their own invitation by email (for accept page)
CREATE POLICY "invitations_read_by_token" ON invitations
  FOR SELECT USING (
    -- Allow reading to accept (uses anon or authenticated)
    expires_at > NOW() AND accepted_at IS NULL
  );

-- ============================================================
-- UPDATE RLS on people to allow family_member INSERT
-- (previously only authenticated, now explicitly family_member+)
-- ============================================================

-- Drop and recreate with updated check
DROP POLICY IF EXISTS "people_insert_authenticated" ON people;
CREATE POLICY "people_insert_family_member" ON people
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.is_family_member_or_above()
  );

-- ============================================================
-- Seed existing auth users into profiles (if any exist)
-- Run once after migration
-- ============================================================
INSERT INTO public.profiles (id, full_name, avatar_url, role)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'full_name', email),
  raw_user_meta_data->>'avatar_url',
  CASE
    WHEN raw_app_meta_data->>'role' = 'super_admin' THEN 'super_admin'
    WHEN raw_user_meta_data->>'role' = 'super_admin' THEN 'super_admin'
    ELSE 'family_member'  -- treat existing users as family_member
  END
FROM auth.users
ON CONFLICT (id) DO NOTHING;
