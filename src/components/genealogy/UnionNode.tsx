"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { HeartHandshake } from "lucide-react";
import type { UnionNodeData } from "@/lib/genealogy/canvas";

interface UnionNodeProps extends NodeProps {
  data: UnionNodeData;
}

/** Union node — titik pernikahan antara suami dan istri */
export const UnionNode = memo(function UnionNode({ data }: UnionNodeProps) {
  const isDivorced = data.union?.status === "divorced" || data.union?.status === "ended";

  // Deteksi otomatis Duda/Janda dari status kematian pasangan
  const members = data.members || [];
  const m1Deceased = members[0] ? (members[0].life_status === "deceased" || !!members[0].death_date) : false;
  const m2Deceased = members[1] ? (members[1].life_status === "deceased" || !!members[1].death_date) : false;
  const isAutoWidowed = (m1Deceased || m2Deceased) && !(m1Deceased && m2Deceased);
  const isBothDeceased = m1Deceased && m2Deceased;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(
      new CustomEvent("silsilah:edit-union", {
        detail: {
          union: data.union,
          memberIds: data.memberIds,
        },
      })
    );
  };

  const statusLabel = isDivorced
    ? "Bercerai"
    : isAutoWidowed
    ? "Duda / Janda (Pasangan Wafat)"
    : isBothDeceased
    ? "Menikah (Keduanya Wafat)"
    : "Menikah (Aktif)";

  return (
    <div
      onClick={handleClick}
      style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: isDivorced ? "#FEF2F2" : isAutoWidowed ? "#FAF5FF" : "#FFF1F2",
        border: `2px solid ${isDivorced ? "#EF4444" : isAutoWidowed ? "#A855F7" : "#E11D48"}`,
        boxShadow: `0 2px 8px ${isDivorced ? "rgba(239, 68, 68, 0.25)" : isAutoWidowed ? "rgba(168, 85, 247, 0.25)" : "rgba(225, 29, 72, 0.25)"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        position: "relative",
        transition: "transform 150ms ease, box-shadow 150ms ease",
      }}
      className="hover:scale-125 hover:shadow-lg group nodrag"
      title={`Hubungan Pernikahan: ${statusLabel}${data.union?.start_date ? ` · Sejak ${data.union.start_date}` : ""} — Klik untuk edit detail pernikahan`}
    >
      {/* Handle dari Suami (kiri) */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ width: 6, height: 6, background: isDivorced ? "#EF4444" : isAutoWidowed ? "#A855F7" : "#E11D48", border: "none" }}
      />

      {/* HeartHandshake Icon */}
      <HeartHandshake
        className={`w-4 h-4 transition-transform group-hover:scale-110 ${
          isDivorced ? "text-red-600" : isAutoWidowed ? "text-purple-600" : "text-rose-600"
        }`}
      />

      {/* Handle ke Istri (kanan) */}
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        style={{ width: 6, height: 6, background: isDivorced ? "#EF4444" : isAutoWidowed ? "#A855F7" : "#E11D48", border: "none" }}
      />

      {/* Handle ke Anak-anak (bawah) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ width: 6, height: 6, background: "#4B5563", border: "none" }}
      />
    </div>
  );
});
