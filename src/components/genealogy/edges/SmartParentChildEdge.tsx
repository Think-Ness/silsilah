"use client";

import { memo } from "react";
import {
  type EdgeProps,
  BaseEdge,
  getSmoothStepPath,
  EdgeLabelRenderer,
  Position,
} from "@xyflow/react";

export const SmartParentChildEdge = memo(function SmartParentChildEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  selected,
}: EdgeProps) {
  // Hitung arah relatif secara cerdas (misal jika parent berada di atas atau anak digeser ke samping/atas)
  let effectiveSourcePos = sourcePosition;
  let effectiveTargetPos = targetPosition;

  const dy = targetY - sourceY;
  const dx = targetX - sourceX;

  if (Math.abs(dy) > Math.abs(dx)) {
    if (dy > 0) {
      // Normal: Orang Tua / Union di atas -> Anak di bawah
      effectiveSourcePos = Position.Bottom;
      effectiveTargetPos = Position.Top;
    } else {
      // Terbalik: Anak digeser ke atas orang tua
      effectiveSourcePos = Position.Top;
      effectiveTargetPos = Position.Bottom;
    }
  } else {
    // Posisi horizontal menyamping
    if (dx > 0) {
      effectiveSourcePos = Position.Right;
      effectiveTargetPos = Position.Left;
    } else {
      effectiveSourcePos = Position.Left;
      effectiveTargetPos = Position.Right;
    }
  }

  // Hitung radius lengkungan & offset adaptif berdasarkan jarak
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const radius = Math.min(16, Math.max(8, Math.min(absDx, absDy) / 3));
  const offset = Math.min(25, Math.max(12, absDy / 4));

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition: effectiveSourcePos,
    targetX,
    targetY,
    targetPosition: effectiveTargetPos,
    borderRadius: radius,
    offset,
  });

  const isHighlighted = selected;

  return (
    <g className="smart-lineage-edge group">
      {/* Invisible wider path for effortless hovering and selection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        className="cursor-pointer"
      />

      {/* Subtle glowing halo on hover/select */}
      <path
        d={edgePath}
        fill="none"
        stroke={isHighlighted ? "rgba(59, 130, 246, 0.35)" : "transparent"}
        strokeWidth={7}
        className="transition-all duration-200"
      />

      {/* Main Connection Line */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: isHighlighted ? "#2563EB" : (style.stroke as string) || "#4B5563",
          strokeWidth: isHighlighted ? 2.5 : 2,
          transition: "stroke 200ms ease, stroke-width 200ms ease",
          ...style,
        }}
      />

      {/* Interactive Label (Adopsi / Tiri / Hubungan Khusus) */}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
              zIndex: 10,
            }}
            className="nodrag nopan"
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "2px 8px",
                borderRadius: "9999px",
                fontSize: "10px",
                fontWeight: 600,
                background: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(4px)",
                color: "#374151",
                border: "1px solid #E5E7EB",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                whiteSpace: "nowrap",
                userSelect: "none",
              }}
            >
              {label}
            </span>
          </div>
        </EdgeLabelRenderer>
      )}
    </g>
  );
});
