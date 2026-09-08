"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import {
  ReactFlow,
  Background,
  MiniMap,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  type NodeMouseHandler,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { PersonNode } from "./PersonNode";
import { UnionNode } from "./UnionNode";
import { CanvasControls } from "./CanvasControls";
import { buildCanvasGraph } from "@/lib/genealogy/canvas";
import { runElkLayout } from "@/lib/layout/elkLayout";
import type {
  PersonWithPortrait,
  Union,
  UnionMember,
  ParentChildRelationship,
} from "@/types/genealogy";

const nodeTypes = {
  personNode: PersonNode,
  unionNode: UnionNode,
};

interface FamilyCanvasProps {
  people: PersonWithPortrait[];
  unions: Union[];
  unionMembers: UnionMember[];
  parentChildRels: ParentChildRelationship[];
  onPersonClick?: (personId: string) => void;
  selectedPersonId?: string | null;
  customTitle?: string;
  onTitleChange?: (title: string) => void;
}

function CanvasInner({
  people,
  unions,
  unionMembers,
  parentChildRels,
  onPersonClick,
  selectedPersonId,
  customTitle = "Silsilah Zuriat Ahlan & Hj. Siti Maskah",
  onTitleChange,
}: FamilyCanvasProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLayoutRunning, setIsLayoutRunning] = useState(false);
  const { fitView } = useReactFlow();
  const hasInitialFitRef = useRef(false);

  // Build graph dari data (dengan memuat posisi kustom pengguna jika ada)
  useEffect(() => {
    let customPositionsMap: Map<string, { x: number; y: number }> | undefined;
    try {
      const saved = localStorage.getItem("silsilah_custom_positions_v2");
      if (saved) {
        const parsed = JSON.parse(saved);
        customPositionsMap = new Map(Object.entries(parsed));
      }
    } catch (e) {
      console.warn("Gagal membaca posisi kustom tersimpan:", e);
    }

    const { nodes: initialNodes, edges: initialEdges } = buildCanvasGraph(
      people,
      unions,
      unionMembers,
      parentChildRels,
      customPositionsMap
    );

    // Mark selected node
    const markedNodes = initialNodes.map((n) => ({
      ...n,
      selected: n.id === `person-${selectedPersonId}`,
      data: {
        ...n.data,
        isHighlighted: n.id === `person-${selectedPersonId}`,
      },
    }));

    setNodes(markedNodes);
    setEdges(initialEdges);

    // Otomatis posisikan pohon keluarga di tengah layar HANYA saat data pertama kali dimuat
    if (!hasInitialFitRef.current && initialNodes.length > 0) {
      hasInitialFitRef.current = true;
      setTimeout(() => {
        fitView({ duration: 400, padding: 0.15 });
      }, 80);
    }
  }, [people, unions, unionMembers, parentChildRels]);

  // Update seleksi node secara instan tanpa rebuild seluruh graf atau reset zoom/posisi
  useEffect(() => {
    setNodes((currentNodes) =>
      currentNodes.map((n) => {
        const isSelected = n.id === `person-${selectedPersonId}`;
        if (n.selected === isSelected && n.data?.isHighlighted === isSelected) {
          return n;
        }
        return {
          ...n,
          selected: isSelected,
          data: {
            ...n.data,
            isHighlighted: isSelected,
          },
        };
      })
    );
  }, [selectedPersonId]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) =>
      setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) =>
      setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  // Simpan posisi setiap kali pengguna selesai menggeser card
  const handleNodeDragStop = useCallback(
    (_event: any, _node: Node, allNodes: Node[]) => {
      try {
        const posMap: Record<string, { x: number; y: number }> = {};
        for (const n of allNodes) {
          if (n.position && n.id) {
            posMap[n.id] = { x: Math.round(n.position.x), y: Math.round(n.position.y) };
          }
        }
        localStorage.setItem("silsilah_custom_positions_v2", JSON.stringify(posMap));
      } catch (e) {
        console.warn("Gagal menyimpan posisi custom node:", e);
      }
    },
    []
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.type === "personNode" && onPersonClick) {
        const personId = node.id.replace("person-", "");
        onPersonClick(personId);
      }
    },
    [onPersonClick]
  );

  const handleAutoLayout = useCallback(() => {
    setIsLayoutRunning(true);
    try {
      // Hapus posisi kustom agar kembali ke tata letak cerdas otomatis
      localStorage.removeItem("silsilah_custom_positions_v2");
      localStorage.removeItem("silsilah_custom_positions");

      const { nodes: initialNodes, edges: initialEdges } = buildCanvasGraph(
        people,
        unions,
        unionMembers,
        parentChildRels
      );
      setNodes(initialNodes);
      setEdges(initialEdges);
      setTimeout(() => {
        fitView({ duration: 600, padding: 0.15 });
      }, 100);
    } catch (err) {
      console.error("Layout failed:", err);
    } finally {
      setIsLayoutRunning(false);
    }
  }, [people, unions, unionMembers, parentChildRels, fitView]);

  if (people.length === 0) {
    return (
      <div className="empty-state" style={{ height: "100%" }}>
        <div className="empty-state-title">Belum ada anggota keluarga</div>
        <p className="empty-state-description">
          Mulai mendokumentasikan silsilah keluarga dengan menambahkan anggota pertama.
        </p>
        <a
          href="/people/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-500 rounded-md border border-[var(--border)] hover:bg-[var(--subtle)] transition-colors"
        >
          Tambah Anggota
        </a>
      </div>
    );
  }

  return (
    <div className="genealogy-canvas" style={{ position: "relative", width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDragStop={handleNodeDragStop}
        nodeTypes={nodeTypes}
        minZoom={0.08}
        maxZoom={2.5}
        zoomOnScroll={true}
        zoomOnPinch={true}
        panOnDrag={true}
        panOnScroll={false}
        nodesDraggable={true}
        elementsSelectable={true}
        className="genealogy-canvas"
        aria-label="Pohon silsilah keluarga"
      >
        <Background
          color="var(--border)"
          size={1}
          gap={20}
          style={{ opacity: 0.4 }}
        />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === "personNode") return "var(--accent-subtle)";
            return "var(--border)";
          }}
          maskColor="rgba(250, 250, 249, 0.7)"
          style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}
        />
        <CanvasControls
          onAutoLayout={handleAutoLayout}
          isLayoutRunning={isLayoutRunning}
        />
      </ReactFlow>
    </div>
  );
}

/** Family Canvas — harus dibungkus dalam ReactFlowProvider */
export function FamilyCanvas(props: FamilyCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
