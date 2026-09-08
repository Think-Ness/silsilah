"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { DeletePersonDialog } from "./DeletePersonDialog";

interface DeletePersonButtonProps {
  personId: string;
  personName: string;
}

export function DeletePersonButton({ personId, personName }: DeletePersonButtonProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "7px 14px",
          border: "1px solid rgba(220, 38, 38, 0.3)",
          borderRadius: "var(--radius-md)",
          fontSize: "13px",
          fontWeight: 500,
          color: "#DC2626",
          background: "transparent",
          cursor: "pointer",
        }}
        className="hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Hapus Anggota
      </button>

      <DeletePersonDialog
        open={open}
        personId={personId}
        personName={personName}
        onClose={() => setOpen(false)}
        onSuccess={() => {
          router.push("/people");
          router.refresh();
        }}
      />
    </>
  );
}
