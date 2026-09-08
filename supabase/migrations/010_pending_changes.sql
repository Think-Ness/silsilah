-- ============================================================
-- Phase 2B: Pending Changes (Approval Workflow)
-- ============================================================
-- Adds:
--   pending_changes — stores proposed edits from family_member
--   RLS: family_member can insert own, super_admin manages all
-- ============================================================

CREATE TABLE IF NOT EXISTS pending_changes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- What changed
  entity_type     TEXT NOT NULL CHECK (entity_type IN ('person', 'union', 'relationship', 'media')),
  entity_id       UUID,           -- NULL for new records
  action          TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'archive')),

  -- Data
  proposed_data   JSONB NOT NULL DEFAULT '{}',
  current_data    JSONB,          -- snapshot of current data at submit time

  -- Description for the reviewer
  change_summary  TEXT,

  -- Status
  status          TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'))
                  DEFAULT 'pending',

  -- Who submitted
  submitted_by    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Who reviewed
  reviewed_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at     TIMESTAMPTZ,
  review_note     TEXT,

  -- Applied (after approval)
  applied_at      TIMESTAMPTZ,

  -- Audit
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pending_changes_status     ON pending_changes(status);
CREATE INDEX IF NOT EXISTS idx_pending_changes_submitted  ON pending_changes(submitted_by);
CREATE INDEX IF NOT EXISTS idx_pending_changes_entity     ON pending_changes(entity_type, entity_id);

-- ============================================================
-- RLS on pending_changes
-- ============================================================
ALTER TABLE pending_changes ENABLE ROW LEVEL SECURITY;

-- Family member can see their own pending changes
CREATE POLICY "pending_select_own" ON pending_changes
  FOR SELECT
  USING (submitted_by = auth.uid() OR public.is_super_admin());

-- Family member can insert
CREATE POLICY "pending_insert_family" ON pending_changes
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.is_family_member_or_above()
    AND submitted_by = auth.uid()
  );

-- Only submitter can cancel their own pending change
CREATE POLICY "pending_update_cancel_own" ON pending_changes
  FOR UPDATE
  USING (
    (submitted_by = auth.uid() AND status = 'pending')
    OR public.is_super_admin()
  );

-- Super admin can delete
CREATE POLICY "pending_delete_admin" ON pending_changes
  FOR DELETE
  USING (public.is_super_admin());

-- ============================================================
-- Enable Realtime for pending_changes
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE pending_changes;

-- ============================================================
-- FUNCTION: apply_pending_change
-- Called by super_admin to apply an approved change
-- ============================================================
CREATE OR REPLACE FUNCTION public.apply_pending_change(change_id UUID)
RETURNS VOID AS $$
DECLARE
  v_change pending_changes%ROWTYPE;
BEGIN
  -- Only super admin can apply
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super_admin can apply pending changes';
  END IF;

  SELECT * INTO v_change FROM pending_changes WHERE id = change_id AND status = 'approved';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending change not found or not approved: %', change_id;
  END IF;

  -- Apply based on entity_type and action
  IF v_change.entity_type = 'person' THEN
    IF v_change.action = 'update' AND v_change.entity_id IS NOT NULL THEN
      UPDATE people SET
        full_name             = COALESCE((v_change.proposed_data->>'full_name'), full_name),
        display_name          = COALESCE((v_change.proposed_data->>'display_name'), display_name),
        nickname              = COALESCE((v_change.proposed_data->>'nickname'), nickname),
        prefix_title          = COALESCE((v_change.proposed_data->>'prefix_title'), prefix_title),
        suffix_title          = COALESCE((v_change.proposed_data->>'suffix_title'), suffix_title),
        gender                = COALESCE((v_change.proposed_data->>'gender')::TEXT, gender),
        birth_date            = COALESCE((v_change.proposed_data->>'birth_date')::DATE, birth_date),
        birth_place           = COALESCE((v_change.proposed_data->>'birth_place'), birth_place),
        death_date            = COALESCE((v_change.proposed_data->>'death_date')::DATE, death_date),
        death_place           = COALESCE((v_change.proposed_data->>'death_place'), death_place),
        life_status           = COALESCE((v_change.proposed_data->>'life_status')::TEXT, life_status),
        biography             = COALESCE((v_change.proposed_data->>'biography'), biography),
        occupation            = COALESCE((v_change.proposed_data->>'occupation'), occupation),
        education             = COALESCE((v_change.proposed_data->>'education'), education),
        notes                 = COALESCE((v_change.proposed_data->>'notes'), notes),
        updated_at            = NOW(),
        updated_by            = auth.uid()
      WHERE id = v_change.entity_id;
    ELSIF v_change.action = 'archive' AND v_change.entity_id IS NOT NULL THEN
      UPDATE people SET
        archived_at = NOW(),
        archived_by = auth.uid()
      WHERE id = v_change.entity_id;
    END IF;
  END IF;

  -- Mark as applied
  UPDATE pending_changes SET
    applied_at = NOW(),
    updated_at = NOW()
  WHERE id = change_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
