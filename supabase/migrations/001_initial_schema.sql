-- ============================================================
-- Family Genealogy & Archive System — Initial Schema
-- ============================================================
-- Architecture:
--   PEOPLE
--     ├── UNION (pasangan/pernikahan)
--     │     └── UNION_MEMBERS (anggota union)
--     └── PARENT_CHILD_RELATIONSHIPS (hubungan ortu-anak)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: people
-- ============================================================
CREATE TABLE IF NOT EXISTS people (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identity
  full_name             TEXT NOT NULL,
  display_name          TEXT,
  nickname              TEXT,
  prefix_title          TEXT,     -- H., Hj., Dr., Prof., TGH., dll
  suffix_title          TEXT,     -- S.T., M.Ag., dll

  -- Demographic
  gender                TEXT CHECK (gender IN ('male', 'female', 'unknown')) DEFAULT 'unknown',

  -- Birth
  birth_date            DATE,
  birth_date_precision  TEXT CHECK (birth_date_precision IN ('exact', 'year', 'month', 'unknown')) DEFAULT 'unknown',
  birth_place           TEXT,

  -- Death
  death_date            DATE,
  death_date_precision  TEXT CHECK (death_date_precision IN ('exact', 'year', 'month', 'unknown')) DEFAULT 'unknown',
  death_place           TEXT,

  -- Life status
  life_status           TEXT CHECK (life_status IN ('living', 'deceased', 'unknown')) DEFAULT 'unknown',

  -- Biography
  biography             TEXT,
  occupation            TEXT,
  education             TEXT,
  notes                 TEXT,

  -- Photo (reference ke storage)
  portrait_media_id     UUID,  -- FK ditambahkan setelah tabel media dibuat

  -- Visibility
  visibility            TEXT CHECK (visibility IN ('public', 'family', 'private')) DEFAULT 'family',

  -- Soft delete
  archived_at           TIMESTAMPTZ,
  archived_by           UUID,

  -- Audit
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID,
  updated_by            UUID
);

-- ============================================================
-- TABLE: unions (hubungan pasangan)
-- ============================================================
CREATE TABLE IF NOT EXISTS unions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Type: marriage, partner, engagement, historical_union, unknown
  relationship_type     TEXT CHECK (relationship_type IN ('marriage', 'partner', 'engagement', 'historical_union', 'unknown')) DEFAULT 'unknown',

  -- Dates
  start_date            DATE,
  start_date_precision  TEXT CHECK (start_date_precision IN ('exact', 'year', 'month', 'unknown')) DEFAULT 'unknown',
  end_date              DATE,
  end_date_precision    TEXT CHECK (end_date_precision IN ('exact', 'year', 'month', 'unknown')) DEFAULT 'unknown',

  -- Status: active, ended, widowed, divorced, unknown
  status                TEXT CHECK (status IN ('active', 'ended', 'widowed', 'divorced', 'unknown')) DEFAULT 'unknown',

  notes                 TEXT,

  -- Audit
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID,
  updated_by            UUID
);

-- ============================================================
-- TABLE: union_members (anggota union — many-to-many)
-- ============================================================
CREATE TABLE IF NOT EXISTS union_members (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  union_id              UUID NOT NULL REFERENCES unions(id) ON DELETE CASCADE,
  person_id             UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,

  -- Role: spouse, partner
  role                  TEXT CHECK (role IN ('spouse', 'partner')) DEFAULT 'spouse',

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (union_id, person_id)
);

-- ============================================================
-- TABLE: parent_child_relationships
-- ============================================================
CREATE TABLE IF NOT EXISTS parent_child_relationships (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id             UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  child_id              UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,

  -- Link ke union tertentu (optional — anak dari pasangan mana)
  union_id              UUID REFERENCES unions(id) ON DELETE SET NULL,

  -- relationship_type: parent, guardian
  relationship_type     TEXT CHECK (relationship_type IN ('parent', 'guardian')) DEFAULT 'parent',

  -- biological_status: biological, adoptive, step, unknown
  biological_status     TEXT CHECK (biological_status IN ('biological', 'adoptive', 'step', 'unknown')) DEFAULT 'biological',

  notes                 TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID,

  -- Constraints
  UNIQUE (parent_id, child_id),
  CHECK (parent_id <> child_id)  -- Tidak boleh menjadi parent dirinya sendiri
);

-- ============================================================
-- TABLE: addresses
-- ============================================================
CREATE TABLE IF NOT EXISTS addresses (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id             UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,

  -- Label: "Tempat Tinggal", "Rumah Keluarga", "Kerja", "Historis"
  label                 TEXT DEFAULT 'Tempat Tinggal',

  address_line          TEXT,
  village               TEXT,    -- Desa/Kelurahan
  district              TEXT,    -- Kecamatan
  city_regency          TEXT,    -- Kota/Kabupaten
  province              TEXT,
  country               TEXT DEFAULT 'Indonesia',
  postal_code           TEXT,

  latitude              NUMERIC(10, 8),
  longitude             NUMERIC(11, 8),

  is_current            BOOLEAN DEFAULT FALSE,

  -- Visibility
  visibility            TEXT CHECK (visibility IN ('public', 'family', 'private')) DEFAULT 'family',

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: contacts
-- ============================================================
CREATE TABLE IF NOT EXISTS contacts (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id             UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,

  -- contact_type: phone, whatsapp, email, website, instagram, dll
  contact_type          TEXT NOT NULL,
  label                 TEXT,
  value                 TEXT NOT NULL,

  is_primary            BOOLEAN DEFAULT FALSE,
  is_public             BOOLEAN DEFAULT FALSE,

  -- Visibility
  visibility            TEXT CHECK (visibility IN ('public', 'family', 'private')) DEFAULT 'family',

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: media
-- ============================================================
CREATE TABLE IF NOT EXISTS media (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  title                 TEXT,
  description           TEXT,

  -- Path di Supabase Storage
  storage_path          TEXT NOT NULL,
  storage_bucket        TEXT NOT NULL DEFAULT 'media',

  -- Metadata
  media_type            TEXT CHECK (media_type IN ('photo', 'document', 'video', 'other')) DEFAULT 'photo',
  mime_type             TEXT,
  file_size_bytes       BIGINT,
  width_px              INTEGER,
  height_px             INTEGER,

  -- Taken/created date
  taken_at              DATE,

  -- Visibility
  visibility            TEXT CHECK (visibility IN ('public', 'family', 'private')) DEFAULT 'family',

  uploaded_by           UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: person_media (many-to-many: orang & media)
-- ============================================================
CREATE TABLE IF NOT EXISTS person_media (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id             UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  media_id              UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,

  -- role: portrait, family_photo, historical_photo, document, other
  role                  TEXT CHECK (role IN ('portrait', 'family_photo', 'historical_photo', 'document', 'other')) DEFAULT 'other',

  is_primary_portrait   BOOLEAN DEFAULT FALSE,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (person_id, media_id)
);

-- ============================================================
-- TABLE: genealogy_canvas_layouts
-- ============================================================
CREATE TABLE IF NOT EXISTS genealogy_canvas_layouts (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  name                  TEXT NOT NULL DEFAULT 'Default Layout',

  -- Root person untuk branch/focus mode
  root_person_id        UUID REFERENCES people(id) ON DELETE SET NULL,

  -- Viewport state (zoom, pan)
  viewport              JSONB DEFAULT '{"x": 0, "y": 0, "zoom": 1}'::JSONB,

  -- Mode: full, branch, ancestors, descendants
  display_mode          TEXT CHECK (display_mode IN ('full', 'branch', 'ancestors', 'descendants')) DEFAULT 'full',

  created_by            UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: genealogy_node_positions
-- ============================================================
CREATE TABLE IF NOT EXISTS genealogy_node_positions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  layout_id             UUID NOT NULL REFERENCES genealogy_canvas_layouts(id) ON DELETE CASCADE,
  person_id             UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,

  position_x            NUMERIC NOT NULL DEFAULT 0,
  position_y            NUMERIC NOT NULL DEFAULT 0,
  width                 NUMERIC DEFAULT 240,
  height                NUMERIC DEFAULT 120,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (layout_id, person_id)
);

-- ============================================================
-- TABLE: audit_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  user_id               UUID,
  user_email            TEXT,

  action                TEXT NOT NULL,   -- CREATE, UPDATE, DELETE, ARCHIVE
  entity_type           TEXT NOT NULL,   -- people, unions, parent_child_relationships, dll
  entity_id             UUID NOT NULL,

  old_data              JSONB,
  new_data              JSONB,

  ip_address            INET,
  user_agent            TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Add FK: people.portrait_media_id → media.id
-- ============================================================
ALTER TABLE people
  ADD CONSTRAINT people_portrait_media_fk
  FOREIGN KEY (portrait_media_id) REFERENCES media(id) ON DELETE SET NULL;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_people_full_name ON people(full_name);
CREATE INDEX IF NOT EXISTS idx_people_life_status ON people(life_status);
CREATE INDEX IF NOT EXISTS idx_people_archived_at ON people(archived_at);
CREATE INDEX IF NOT EXISTS idx_union_members_union_id ON union_members(union_id);
CREATE INDEX IF NOT EXISTS idx_union_members_person_id ON union_members(person_id);
CREATE INDEX IF NOT EXISTS idx_pcr_parent_id ON parent_child_relationships(parent_id);
CREATE INDEX IF NOT EXISTS idx_pcr_child_id ON parent_child_relationships(child_id);
CREATE INDEX IF NOT EXISTS idx_pcr_union_id ON parent_child_relationships(union_id);
CREATE INDEX IF NOT EXISTS idx_addresses_person_id ON addresses(person_id);
CREATE INDEX IF NOT EXISTS idx_contacts_person_id ON contacts(person_id);
CREATE INDEX IF NOT EXISTS idx_person_media_person_id ON person_media(person_id);
CREATE INDEX IF NOT EXISTS idx_person_media_media_id ON person_media(media_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- Full text search index untuk people
CREATE INDEX IF NOT EXISTS idx_people_fts ON people
  USING GIN(to_tsvector('indonesian',
    COALESCE(full_name, '') || ' ' ||
    COALESCE(display_name, '') || ' ' ||
    COALESCE(nickname, '') || ' ' ||
    COALESCE(prefix_title, '') || ' ' ||
    COALESCE(occupation, '') || ' ' ||
    COALESCE(birth_place, '') || ' ' ||
    COALESCE(notes, '')
  ));

-- ============================================================
-- FUNCTION: updated_at auto-trigger
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger ke semua tabel yang punya updated_at
CREATE TRIGGER set_updated_at_people
  BEFORE UPDATE ON people
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_unions
  BEFORE UPDATE ON unions
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_parent_child_relationships
  BEFORE UPDATE ON parent_child_relationships
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_addresses
  BEFORE UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_genealogy_canvas_layouts
  BEFORE UPDATE ON genealogy_canvas_layouts
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_genealogy_node_positions
  BEFORE UPDATE ON genealogy_node_positions
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
