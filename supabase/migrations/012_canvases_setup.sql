-- ============================================================
-- 012_canvases_setup.sql
-- Table & RLS for Multi-Canvas (Multiple Family Trees / Lineage POV)
-- ============================================================

CREATE TABLE IF NOT EXISTS canvases (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title             TEXT NOT NULL,
  slug              TEXT,
  description       TEXT,
  root_person_id    UUID REFERENCES people(id) ON DELETE SET NULL,
  custom_positions  JSONB DEFAULT '{}'::jsonb,
  settings          JSONB DEFAULT '{}'::jsonb,
  is_default        BOOLEAN NOT NULL DEFAULT false,
  
  -- Audit
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_canvases_root_person ON canvases(root_person_id);
CREATE INDEX IF NOT EXISTS idx_canvases_is_default ON canvases(is_default);

-- Enable RLS
ALTER TABLE canvases ENABLE ROW LEVEL SECURITY;

-- Allow read for public / anon / authenticated
CREATE POLICY "Public read canvases"
  ON canvases FOR SELECT
  USING (true);

-- Allow all operations for authenticated / service role
CREATE POLICY "Allow insert canvases"
  ON canvases FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow update canvases"
  ON canvases FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete canvases"
  ON canvases FOR DELETE
  USING (true);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_canvases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_canvases_updated_at ON canvases;
CREATE TRIGGER trigger_canvases_updated_at
  BEFORE UPDATE ON canvases
  FOR EACH ROW
  EXECUTE FUNCTION update_canvases_updated_at();

-- Seed Default Canvas: Silsilah Zuriat Ahlan & Hj. Siti Maskah
DO $$
DECLARE
  v_ahlan_id UUID;
  v_default_count INT;
BEGIN
  SELECT COUNT(*) INTO v_default_count FROM canvases WHERE is_default = true;
  
  IF v_default_count = 0 THEN
    SELECT id INTO v_ahlan_id FROM people WHERE full_name ILIKE '%Ahlan%' LIMIT 1;
    
    INSERT INTO canvases (title, description, root_person_id, is_default)
    VALUES (
      'Silsilah Zuriat Ahlan & Hj. Siti Maskah',
      'Pohon silsilah silsilah zuriat keluarga besar Ahlan & Hj. Siti Maskah beserta leluhur dan seluruh keturunan.',
      v_ahlan_id,
      true
    );
  END IF;
END $$;
