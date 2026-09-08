"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { HeartHandshake } from "lucide-react";
import type { UnionNodeData } from "@/lib/genealogy/canvas";
import { getUnionMortalityInfo } from "@/lib/genealogy/relationships";

interface UnionNodeProps extends NodeProps {
  data: UnionNodeData;
}

/** Union node — titik pernikahan antara suami dan istri */
export const UnionNode = memo(function UnionNode({ data }: UnionNodeProps) {
  const members = data.members || [];
  const info = getUnionMortalityInfo(members, data.union);

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

  const bg = info.isDivorced
    ? "#FEF2F2"
    : info.isOneDeceased
    ? "#FAF5FF"
    : info.isBothDeceased
    ? "#F4F4F5"
    : "#FFF1F2";

  const borderColor = info.isDivorced
    ? "#EF4444"
    : info.isOneDeceased
    ? "#9333EA"
    : info.isBothDeceased
    ? "#71717A"
    : "#E11D48";

  const iconColor = info.isDivorced
    ? "text-red-600"
    : info.isOneDeceased
    ? "text-purple-600"
    : info.isBothDeceased
    ? "text-zinc-600"
    : "text-rose-600";

  const tooltipText = `Hubungan: ${info.statusLabel}${
    data.union?.start_date ? ` · Sejak ${data.union.start_date}` : ""
  }\n${info.doaText}\n(Klik untuk edit detail)`;

  return (
    <div
      onClick={handleClick}
      style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: bg,
        border: `2px solid ${borderColor}`,
        boxShadow: `0 2px 8px ${
          info.isDivorced
            ? "rgba(239, 68, 68, 0.25)"
            : info.isOneDeceased
            ? "rgba(147, 51, 234, 0.25)"
            : "rgba(225, 29, 72, 0.25)"
        }`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        position: "relative",
        transition: "transform 150ms ease, box-shadow 150ms ease",
      }}
      className="hover:scale-125 hover:shadow-lg group nodrag"
      title={tooltipText}
    >
      {/* Handle dari Suami (kiri) */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ width: 6, height: 6, background: borderColor, border: "none" }}
      />

      {/* HeartHandshake Icon */}
      <HeartHandshake className={`w-4 h-4 transition-transform group-hover:scale-110 ${iconColor}`} />

      {/* Handle ke Istri (kanan) */}
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        style={{ width: 6, height: 6, background: borderColor, border: "none" }}
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
