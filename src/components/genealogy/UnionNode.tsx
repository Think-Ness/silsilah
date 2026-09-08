"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { UnionNodeData } from "@/lib/genealogy/canvas";

interface UnionNodeProps extends NodeProps {
  data: UnionNodeData;
}

/** Union node — titik pernikahan antara suami dan istri */
export const UnionNode = memo(function UnionNode({ data }: UnionNodeProps) {
  const isDivorced = data.union?.status === "divorced" || data.union?.status === "ended";
  const isWidowed = data.union?.status === "widowed";

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

  return (
    <div
      onClick={handleClick}
      style={{
        width: 30,
        height: 30,
        borderRadius: "50%",
        background: isDivorced ? "#FEF2F2" : isWidowed ? "#F5F3FF" : "#FFFBEB",
        border: `2px solid ${isDivorced ? "#EF4444" : isWidowed ? "#8B5CF6" : "#D97706"}`,
        boxShadow: `0 2px 8px ${isDivorced ? "rgba(239, 68, 68, 0.25)" : isWidowed ? "rgba(139, 92, 246, 0.25)" : "rgba(217, 119, 6, 0.3)"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        position: "relative",
        transition: "transform 150ms ease, box-shadow 150ms ease",
      }}
      className="hover:scale-125 hover:shadow-lg group nodrag"
      title={`Hubungan Pernikahan (${data.union?.relationship_type === "marriage" ? "Menikah" : data.union?.relationship_type || "Pasangan"}${data.union?.start_date ? ` · Sejak ${data.union.start_date}` : ""}) — Klik untuk edit status pernikahan`}
    >
      {/* Handle dari Suami (kiri) */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ width: 6, height: 6, background: isDivorced ? "#EF4444" : "#D97706", border: "none" }}
      />

      {/* Modern Interlocking Wedding Rings SVG Icon */}
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke={isDivorced ? "#DC2626" : isWidowed ? "#7C3AED" : "#B45309"}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-transform group-hover:scale-110"
      >
        {/* Ring 1 */}
        <circle cx="8.5" cy="12" r="5.5" />
        {/* Ring 2 interlocking */}
        <circle cx="15.5" cy="12" r="5.5" />
      </svg>

      {/* Handle ke Istri (kanan) */}
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        style={{ width: 6, height: 6, background: isDivorced ? "#EF4444" : "#D97706", border: "none" }}
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
