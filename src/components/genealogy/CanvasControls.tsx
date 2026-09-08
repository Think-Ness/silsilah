"use client";

import { ZoomIn, ZoomOut, Maximize2, LayoutGrid, Minimize2, Printer } from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import { useState, useCallback } from "react";

interface CanvasControlsProps {
  onAutoLayout: () => void;
  isLayoutRunning?: boolean;
  onPrint?: () => void;
}

export function CanvasControls({
  onAutoLayout,
  isLayoutRunning,
  onPrint,
}: CanvasControlsProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  return (
    <div className="canvas-controls" role="toolbar" aria-label="Kontrol canvas">
      {/* Zoom out */}
      <button
        id="canvas-zoom-out"
        className="canvas-control-btn"
        onClick={() => zoomOut({ duration: 200 })}
        aria-label="Perkecil"
        title="Perkecil"
      >
        <ZoomOut className="w-4 h-4" />
      </button>

      {/* Zoom in */}
      <button
        id="canvas-zoom-in"
        className="canvas-control-btn"
        onClick={() => zoomIn({ duration: 200 })}
        aria-label="Perbesar"
        title="Perbesar"
      >
        <ZoomIn className="w-4 h-4" />
      </button>

      <div className="canvas-control-separator" />

      {/* Fit view */}
      <button
        id="canvas-fit-view"
        className="canvas-control-btn"
        onClick={() => fitView({ duration: 400, padding: 0.1 })}
        aria-label="Sesuaikan tampilan"
        title="Sesuaikan tampilan"
      >
        <Maximize2 className="w-4 h-4" />
      </button>

      {/* Auto layout / Reset Layout */}
      <button
        id="canvas-auto-layout"
        className="canvas-control-btn"
        onClick={onAutoLayout}
        disabled={isLayoutRunning}
        aria-label="Tata ulang otomatis (Reset posisi)"
        title="Tata ulang otomatis (Reset posisi)"
        style={{ opacity: isLayoutRunning ? 0.5 : 1 }}
      >
        <LayoutGrid className="w-4 h-4" />
      </button>

      <div className="canvas-control-separator" />

      {/* Fullscreen */}
      <button
        id="canvas-fullscreen"
        className="canvas-control-btn"
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? "Keluar layar penuh" : "Layar penuh"}
        title={isFullscreen ? "Keluar layar penuh" : "Layar penuh"}
      >
        <Minimize2
          className="w-4 h-4"
          style={{ display: isFullscreen ? "block" : "none" }}
        />
        <Maximize2
          className="w-4 h-4"
          style={{ display: isFullscreen ? "none" : "block" }}
        />
      </button>

      {onPrint && (
        <>
          <div className="canvas-control-separator" />
          <button
            id="canvas-print"
            className="canvas-control-btn"
            onClick={onPrint}
            aria-label="Cetak Tampilan Kanvas"
            title="Cetak Tampilan Kanvas"
            style={{ color: "#2563EB" }}
          >
            <Printer className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
}
