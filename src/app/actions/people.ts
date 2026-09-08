"use server";

import { createClient } from "@/lib/supabase/server";
import { updatePerson } from "@/lib/genealogy/people";
import type { CreatePersonInput } from "@/types/genealogy";

export async function updatePersonServerAction(id: string, input: Partial<CreatePersonInput>) {
  const sb = await createClient();
  return updatePerson(id, input, sb);
}
