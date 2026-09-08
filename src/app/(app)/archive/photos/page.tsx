import { createClient } from "@/lib/supabase/server";
import { getAllMediaWithPeople } from "@/lib/genealogy/media";
import { getAllPeople } from "@/lib/genealogy/people";
import { PhotosArchiveClient } from "./PhotosArchiveClient";

export const metadata = {
  title: "Arsip Foto | Silsilah Keluarga",
};

export default async function PhotosPage() {
  const supabase = await createClient();
  const [photos, people] = await Promise.all([
    getAllMediaWithPeople({ media_type: "photo" }, supabase),
    getAllPeople(undefined, supabase),
  ]);

  return <PhotosArchiveClient initialPhotos={photos} people={people} />;
}
