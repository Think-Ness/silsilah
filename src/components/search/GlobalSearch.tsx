"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, User } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { searchPeople } from "@/lib/genealogy/people";
import { getMediaUrl } from "@/lib/genealogy/media";
import type { PersonWithPortrait } from "@/types/genealogy";
import { useQuery } from "@tanstack/react-query";

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPersonSelect?: (person: PersonWithPortrait) => void;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timeoutRef = useState<ReturnType<typeof setTimeout> | null>(null);

  const setValue = useCallback(
    (newValue: T) => {
      if (timeoutRef[0]) clearTimeout(timeoutRef[0]);
      timeoutRef[1](
        setTimeout(() => {
          setDebouncedValue(newValue);
        }, delay)
      );
    },
    [delay, timeoutRef]
  );

  return debouncedValue;
}

export function GlobalSearch({ open, onOpenChange, onPersonSelect }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["search", query],
    queryFn: () => searchPeople(query),
    enabled: query.length >= 2,
    staleTime: 30 * 1000,
  });

  function handleSelect(person: PersonWithPortrait) {
    onOpenChange(false);
    setQuery("");

    if (onPersonSelect) {
      onPersonSelect(person);
    } else {
      // Default: buka profile
      router.push(`/people/${person.id}`);
    }
  }

  function getDisplayName(person: PersonWithPortrait): string {
    const parts = [];
    if (person.prefix_title) parts.push(person.prefix_title);
    parts.push(person.display_name || person.full_name);
    if (person.suffix_title) parts.push(person.suffix_title);
    return parts.join(" ");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Cari Anggota Keluarga</DialogTitle>
        </DialogHeader>
        <Command shouldFilter={false} className="border-0">
          <div className="flex items-center border-b border-[var(--border)] px-4">
            <Search className="w-4 h-4 text-[var(--muted)] mr-3 flex-shrink-0" />
            <CommandInput
              placeholder="Cari nama, gelar, atau tempat..."
              value={query}
              onValueChange={setQuery}
              className="border-0 shadow-none focus:ring-0 h-12 text-[14px] pl-0"
            />
          </div>
          <CommandList className="max-h-80">
            {query.length < 2 && (
              <div className="py-8 text-center text-[13px] text-[var(--muted)]">
                Ketik minimal 2 karakter untuk mencari
              </div>
            )}
            {query.length >= 2 && isLoading && (
              <div className="py-8 text-center text-[13px] text-[var(--muted)]">
                Mencari...
              </div>
            )}
            {query.length >= 2 && !isLoading && results.length === 0 && (
              <CommandEmpty className="py-8 text-[13px] text-[var(--muted)]">
                Tidak ditemukan untuk &ldquo;{query}&rdquo;
              </CommandEmpty>
            )}
            {results.length > 0 && (
              <CommandGroup heading="Hasil Pencarian">
                {results.map((person) => (
                  <CommandItem
                    key={person.id}
                    value={person.id}
                    onSelect={() => handleSelect(person)}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                  >
                    {/* Photo */}
                    <div className="w-9 h-9 rounded-full bg-[var(--subtle)] flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {person.portrait ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getMediaUrl(person.portrait.storage_path)}
                          alt={getDisplayName(person)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-4 h-4 text-[var(--muted)]" />
                      )}
                    </div>

                    {/* Info */}
                    <div>
                      <div className="text-[14px] font-500 text-[var(--foreground)]">
                        {getDisplayName(person)}
                      </div>
                      <div className="text-[12px] text-[var(--muted)]">
                        {person.gender === "male"
                          ? "Laki-laki"
                          : person.gender === "female"
                          ? "Perempuan"
                          : "—"}
                        {person.birth_place && ` · ${person.birth_place}`}
                        {person.occupation && ` · ${person.occupation}`}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
