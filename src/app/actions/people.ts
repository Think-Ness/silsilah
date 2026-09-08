"use server";

import { createClient } from "@/lib/supabase/server";
import { updatePerson } from "@/lib/genealogy/people";
import type { CreatePersonInput } from "@/types/genealogy";
import { revalidatePath } from "next/cache";

export async function updatePersonServerAction(id: string, input: Partial<CreatePersonInput>) {
  const sb = await createClient();
  const cleanId = decodeURIComponent(id).trim().replace(/[\s_]+/g, "-");
  const result = await updatePerson(cleanId, input, sb);

  // Invalidate Next.js cache so profile and edit pages always reflect updated data
  revalidatePath(`/people/${cleanId}`);
  revalidatePath(`/people/${cleanId}/edit`);
  revalidatePath("/people");
  revalidatePath("/tree");
  revalidatePath("/timeline");

  return result;
}
