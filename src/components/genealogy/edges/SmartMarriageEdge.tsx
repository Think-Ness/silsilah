"use client";

import { memo } from "react";
import {
  type EdgeProps,
  BaseEdge,
  getSmoothStepPath,
  Position,
} from "@xyflow/react";

export const SmartMarriageEdge = memo(function SmartMarriageEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
}: EdgeProps) {
  // Hitung arah relatif secara cerdas jika node digeser / ditukar posisi
  let effectiveSourcePos = sourcePosition;
  let effectiveTargetPos = targetPosition;

  // Jika source (orang) berada di sebelah kiri target (union)
  if (sourceX + 20 < targetX) {
    effectiveSourcePos = Position.Right;
    effectiveTargetPos = Position.Left;
  } else if (sourceX - 20 > targetX) {
    // Jika source (orang) berada di sebelah kanan target (union)
    effectiveSourcePos = Position.Left;
    effectiveTargetPos = Position.Right;
  } else {
    // Jika hampir segaris vertikal
    if (sourceY < targetY) {
      effectiveSourcePos = Position.Bottom;
      effectiveTargetPos = Position.Top;
    } else {
      effectiveSourcePos = Position.Top;
      effectiveTargetPos = Position.Bottom;
    }
  }

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition: effectiveSourcePos,
    targetX,
    targetY,
    targetPosition: effectiveTargetPos,
    borderRadius: 14,
    offset: 16,
  });

  const isHighlighted = selected;

  return (
    <g className="smart-marriage-edge group">
      {/* Invisible wider stroke for easy clicking/hovering */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={14}
        className="cursor-pointer"
      />
      {/* Outer subtle glow on hover/select */}
      <path
        d={edgePath}
        fill="none"
        stroke={isHighlighted ? "rgba(217, 119, 6, 0.4)" : "transparent"}
        strokeWidth={6}
        className="transition-all duration-200"
      />
      {/* Main Marriage Connection Line */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: isHighlighted ? "#B45309" : "#D97706",
          strokeWidth: isHighlighted ? 2.5 : 2,
          transition: "stroke 200ms ease, stroke-width 200ms ease",
          ...style,
        }}
      />
    </g>
  );
});
