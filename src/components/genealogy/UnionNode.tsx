"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { UnionNodeData } from "@/lib/genealogy/canvas";

interface UnionNodeProps extends NodeProps {
  data: UnionNodeData;
}

/** Union node — titik pernikahan antara suami dan istri */
export const UnionNode = memo(function UnionNode({ data }: UnionNodeProps) {
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: "#FFFBEB",
        border: "2px solid #D97706",
        boxShadow: "0 2px 6px rgba(217, 119, 6, 0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        position: "relative",
      }}
      title={`Hubungan Pernikahan (${data.union?.relationship_type === "marriage" ? "Menikah" : data.union?.relationship_type || "Pasangan"})`}
    >
      {/* Handle dari Suami (kiri) */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ width: 6, height: 6, background: "#D97706", border: "none" }}
      />

      {/* Ikon cincin pernikahan */}
      <span style={{ fontSize: "13px", lineHeight: 1, userSelect: "none" }}>💍</span>

      {/* Handle ke Istri (kanan) */}
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        style={{ width: 6, height: 6, background: "#D97706", border: "none" }}
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
