// ============================================================
// Supabase Types — Family Genealogy & Archive System
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ============================================================
// ENUM TYPES
// ============================================================

export type Gender = "male" | "female" | "unknown";
export type LifeStatus = "living" | "deceased" | "unknown";
export type DatePrecision = "exact" | "year" | "month" | "unknown";
export type Visibility = "public" | "family" | "private";

export type UnionRelationshipType =
  | "marriage"
  | "partner"
  | "engagement"
  | "historical_union"
  | "unknown";
export type UnionStatus = "active" | "ended" | "widowed" | "divorced" | "unknown";
export type UnionMemberRole = "spouse" | "partner";

export type RelationshipType = "parent" | "guardian";
export type BiologicalStatus = "biological" | "adoptive" | "step" | "unknown";

export type MediaType = "photo" | "document" | "video" | "other";
export type PersonMediaRole =
  | "portrait"
  | "family_photo"
  | "historical_photo"
  | "document"
  | "other";

export type CanvasDisplayMode = "full" | "branch" | "ancestors" | "descendants";

// ============================================================
// CORE ENTITIES
// ============================================================

export interface Person {
  id: string;
  full_name: string;
  display_name: string | null;
  nickname: string | null;
  prefix_title: string | null;
  suffix_title: string | null;

  gender: Gender;

  birth_date: string | null;
  birth_date_precision: DatePrecision;
  birth_place: string | null;

  death_date: string | null;
  death_date_precision: DatePrecision;
  death_place: string | null;

  life_status: LifeStatus;

  biography: string | null;
  occupation: string | null;
  education: string | null;
  notes: string | null;

  portrait_media_id: string | null;

  visibility: Visibility;

  archived_at: string | null;
  archived_by: string | null;

  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface Union {
  id: string;
  relationship_type: UnionRelationshipType;

  start_date: string | null;
  start_date_precision: DatePrecision;
  end_date: string | null;
  end_date_precision: DatePrecision;

  status: UnionStatus;
  notes: string | null;

  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface UnionMember {
  id: string;
  union_id: string;
  person_id: string;
  role: UnionMemberRole;
  created_at: string;
}

export interface ParentChildRelationship {
  id: string;
  parent_id: string;
  child_id: string;
  union_id: string | null;
  relationship_type: RelationshipType;
  biological_status: BiologicalStatus;
  sort_order?: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface Address {
  id: string;
  person_id: string;
  label: string;
  address_line: string | null;
  village: string | null;
  district: string | null;
  city_regency: string | null;
  province: string | null;
  country: string;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  is_current: boolean;
  visibility: Visibility;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  person_id: string;
  contact_type: string;
  label: string | null;
  value: string;
  is_primary: boolean;
  is_public: boolean;
  visibility: Visibility;
  created_at: string;
}

export interface Media {
  id: string;
  title: string | null;
  description: string | null;
  storage_path: string;
  storage_bucket: string;
  media_type: MediaType;
  mime_type: string | null;
  file_size_bytes: number | null;
  width_px: number | null;
  height_px: number | null;
  taken_at: string | null;
  visibility: Visibility;
  uploaded_by: string | null;
  created_at: string;
}

export interface PersonMedia {
  id: string;
  person_id: string;
  media_id: string;
  role: PersonMediaRole;
  is_primary_portrait: boolean;
  created_at: string;
}

export interface CanvasLayout {
  id: string;
  name: string;
  root_person_id: string | null;
  viewport: { x: number; y: number; zoom: number };
  display_mode: CanvasDisplayMode;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface NodePosition {
  id: string;
  layout_id: string;
  person_id: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  old_data: Json | null;
  new_data: Json | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ============================================================
// COMPOSED/ENRICHED TYPES (untuk domain layer)
// ============================================================

/** Person dengan data portrait media */
export interface PersonWithPortrait extends Person {
  portrait?: Media | null;
}

/** Person dengan semua relasi — untuk profile page */
export interface PersonProfile extends PersonWithPortrait {
  parents: PersonWithPortrait[];
  spouses: Array<{
    person: PersonWithPortrait;
    union: Union;
  }>;
  children: PersonWithPortrait[];
  addresses: Address[];
  contacts: Contact[];
  media: PersonMedia[];
}

/** Data yang diperlukan untuk canvas node */
export interface CanvasPersonNode {
  person: PersonWithPortrait;
  spouses: PersonWithPortrait[];
  childrenCount: number;
}

/** Data yang diperlukan untuk canvas graph */
export interface CanvasGraph {
  nodes: CanvasPersonNode[];
  unionLinks: Array<{
    union: Union;
    memberIds: string[];
  }>;
  parentChildLinks: ParentChildRelationship[];
}

// ============================================================
// FORM TYPES
// ============================================================

export interface CreatePersonInput {
  full_name: string;
  display_name?: string;
  nickname?: string;
  prefix_title?: string;
  suffix_title?: string;
  gender: Gender;
  birth_date?: string;
  birth_date_precision?: DatePrecision;
  birth_place?: string;
  death_date?: string;
  death_date_precision?: DatePrecision;
  death_place?: string;
  life_status: LifeStatus;
  biography?: string;
  occupation?: string;
  education?: string;
  notes?: string;
  portrait_media_id?: string | null;
  visibility: Visibility;
}

export type UpdatePersonInput = Partial<
  Omit<
    CreatePersonInput,
    | "display_name"
    | "nickname"
    | "prefix_title"
    | "suffix_title"
    | "birth_date"
    | "birth_place"
    | "death_date"
    | "death_place"
    | "biography"
    | "occupation"
    | "education"
    | "notes"
    | "portrait_media_id"
  >
> & {
  display_name?: string | null;
  nickname?: string | null;
  prefix_title?: string | null;
  suffix_title?: string | null;
  birth_date?: string | null;
  birth_place?: string | null;
  death_date?: string | null;
  death_place?: string | null;
  biography?: string | null;
  occupation?: string | null;
  education?: string | null;
  notes?: string | null;
  portrait_media_id?: string | null;
};

export interface CreateUnionInput {
  relationship_type: UnionRelationshipType;
  person_a_id: string;
  person_b_id: string;
  start_date?: string;
  start_date_precision?: DatePrecision;
  end_date?: string;
  end_date_precision?: DatePrecision;
  status?: UnionStatus;
  notes?: string;
}

export interface CreateParentChildInput {
  parent_id: string;
  child_id: string;
  union_id?: string;
  relationship_type?: RelationshipType;
  biological_status?: BiologicalStatus;
  notes?: string;
}

export interface CanvasShare {
  id: string;
  canvas_id: string;
  user_id: string;
  permission: "view" | "edit";
  shared_by?: string | null;
  created_at: string;
  user_profile?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email?: string | null;
  } | null;
}

export interface Canvas {
  id: string;
  title: string;
  slug?: string | null;
  description?: string | null;
  root_person_id?: string | null;
  root_person?: PersonWithPortrait | null;
  included_person_ids?: string[] | null;
  custom_positions?: Record<string, { x: number; y: number }> | null;
  settings?: {
    displayMode?: "full" | "branch" | "ancestors" | "descendants";
    theme?: string;
    [key: string]: any;
  } | null;
  is_default: boolean;
  owner_id?: string | null;
  is_public?: boolean;
  user_permission?: "owner" | "edit" | "view";
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

export interface CreateCanvasInput {
  title: string;
  description?: string | null;
  root_person_id?: string | null;
  included_person_ids?: string[] | null;
  is_default?: boolean;
  is_public?: boolean;
  settings?: Record<string, any>;
}

export interface UpdateCanvasInput {
  title?: string;
  description?: string | null;
  root_person_id?: string | null;
  included_person_ids?: string[] | null;
  custom_positions?: Record<string, { x: number; y: number }> | null;
  settings?: Record<string, any>;
  is_default?: boolean;
  is_public?: boolean;
}


