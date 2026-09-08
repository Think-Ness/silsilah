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
import { SmartMarriageEdge } from "./edges/SmartMarriageEdge";
import { SmartParentChildEdge } from "./edges/SmartParentChildEdge";
import { CanvasControls } from "./CanvasControls";
import { EditUnionModal } from "./EditUnionModal";
import { buildCanvasGraph } from "@/lib/genealogy/canvas";
import { runElkLayout } from "@/lib/layout/elkLayout";
import { updateChildOrder } from "@/lib/genealogy/relationships";
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

const edgeTypes = {
  smartMarriage: SmartMarriageEdge,
  smartParentChild: SmartParentChildEdge,
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
  const [selectedUnion, setSelectedUnion] = useState<Union | null>(null);
  const [selectedUnionMembers, setSelectedUnionMembers] = useState<PersonWithPortrait[]>([]);
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

  // Simpan posisi setiap kali pengguna selesai menggeser card & periksa drag-to-reorder saudara
  const handleNodeDragStop = useCallback(
    (_event: any, draggedNode: Node, allNodes: Node[]) => {
      try {
        const posMap: Record<string, { x: number; y: number }> = {};
        for (const n of allNodes) {
          if (n.position && n.id) {
            posMap[n.id] = { x: Math.round(n.position.x), y: Math.round(n.position.y) };
          }
        }
        localStorage.setItem("silsilah_custom_positions_v2", JSON.stringify(posMap));

        // Deteksi apakah node yang digeser adalah anak dalam kelompok saudara kandung
        if (draggedNode && draggedNode.id && draggedNode.id.startsWith("person-")) {
          const draggedPersonId = draggedNode.id.replace("person-", "");
          const parentRels = parentChildRels.filter((r) => r.child_id === draggedPersonId);

          if (parentRels.length > 0) {
            const primaryParentId = parentRels[0].parent_id;
            const coParentId = parentRels.length > 1 ? parentRels[1].parent_id : null;

            // Cari semua saudara yang berbagi orang tua ini
            const siblingRels = parentChildRels.filter(
              (r) => r.parent_id === primaryParentId || (coParentId && r.parent_id === coParentId)
            );
            const siblingIds = Array.from(new Set(siblingRels.map((r) => r.child_id)));

            if (siblingIds.length > 1) {
              // Urutkan saudara berdasarkan posisi horizontal X terkini (dari kiri ke kanan)
              const siblingsWithX = siblingIds
                .map((cId) => {
                  const node = allNodes.find((n) => n.id === `person-${cId}`);
                  return {
                    childId: cId,
                    x: node ? node.position.x : 0,
                  };
                })
                .sort((a, b) => a.x - b.x);

              const newOrderedIds = siblingsWithX.map((s) => s.childId);

              // Cek apakah urutan berubah
              let savedOrders: Record<string, string[]> = {};
              try {
                const raw = localStorage.getItem("silsilah_child_order_v1");
                if (raw) savedOrders = JSON.parse(raw);
              } catch (e) {}

              const prevOrder = savedOrders[primaryParentId] || [];
              const isChanged =
                prevOrder.length !== newOrderedIds.length ||
                newOrderedIds.some((id, idx) => id !== prevOrder[idx]);

              if (isChanged) {
                savedOrders[primaryParentId] = newOrderedIds;
                if (coParentId) savedOrders[coParentId] = newOrderedIds;
                localStorage.setItem("silsilah_child_order_v1", JSON.stringify(savedOrders));

                // Sync ke database di background
                updateChildOrder(primaryParentId, newOrderedIds, coParentId);

                // Update label Anak ke-1, ke-2 dst secara instan pada card canvas
                setNodes((currentNodes) =>
                  currentNodes.map((cn) => {
                    if (cn.id.startsWith("person-")) {
                      const pId = cn.id.replace("person-", "");
                      const newIdx = newOrderedIds.indexOf(pId);
                      if (newIdx !== -1) {
                        return {
                          ...cn,
                          data: {
                            ...cn.data,
                            childOrderNumber: newIdx + 1,
                            childOrderLabel: `Anak ke-${newIdx + 1}`,
                          },
                        };
                      }
                    }
                    return cn;
                  })
                );
              }
            }
          }
        }
      } catch (e) {
        console.warn("Gagal menyimpan posisi custom node:", e);
      }
    },
    [parentChildRels]
  );

  // Listener saat urutan anak diperbarui dari modal dialog
  useEffect(() => {
    const handleOrderUpdated = () => {
      let customPositionsMap: Map<string, { x: number; y: number }> | undefined;
      try {
        const saved = localStorage.getItem("silsilah_custom_positions_v2");
        if (saved) {
          const parsed = JSON.parse(saved);
          customPositionsMap = new Map(Object.entries(parsed));
        }
      } catch (e) {}

      const { nodes: newNodes, edges: newEdges } = buildCanvasGraph(
        people,
        unions,
        unionMembers,
        parentChildRels,
        customPositionsMap
      );
      setNodes(newNodes);
      setEdges(newEdges);
    };

    window.addEventListener("silsilah:child-order-updated", handleOrderUpdated);
    return () => window.removeEventListener("silsilah:child-order-updated", handleOrderUpdated);
  }, [people, unions, unionMembers, parentChildRels]);

  // Listener untuk membuka modal edit status pernikahan saat icon cincin di klik
  useEffect(() => {
    const handleEditUnionEvent = (e: any) => {
      if (e.detail?.union) {
        const unionData = e.detail.union as Union;
        const memberIds = (e.detail.memberIds as string[]) || [];
        const membersList = memberIds
          .map((id) => people.find((p) => p.id === id))
          .filter((p): p is PersonWithPortrait => !!p);

        setSelectedUnion(unionData);
        setSelectedUnionMembers(membersList);
      }
    };

    window.addEventListener("silsilah:edit-union", handleEditUnionEvent);
    return () => window.removeEventListener("silsilah:edit-union", handleEditUnionEvent);
  }, [people]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.type === "personNode" && onPersonClick) {
        const personId = node.id.replace("person-", "");
        onPersonClick(personId);
      } else if (node.type === "unionNode") {
        const unionData = (node.data as any)?.union as Union | undefined;
        const memberIds = ((node.data as any)?.memberIds as string[]) || [];
        const membersList = memberIds
          .map((id) => people.find((p) => p.id === id))
          .filter((p): p is PersonWithPortrait => !!p);

        if (unionData) {
          setSelectedUnion(unionData);
          setSelectedUnionMembers(membersList);
        }
      }
    },
    [onPersonClick, people]
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

  const handlePrintCanvas = useCallback(() => {
    // Posisikan pohon keluarga di tengah dengan margin yang pas untuk halaman cetak
    fitView({ duration: 250, padding: 0.1 });
    document.body.classList.add("printing-canvas");

    setTimeout(() => {
      window.print();
    }, 300);
  }, [fitView]);

  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.classList.remove("printing-canvas");
    };
    const handlePrintEvent = () => {
      handlePrintCanvas();
    };

    window.addEventListener("afterprint", handleAfterPrint);
    window.addEventListener("silsilah:print-canvas", handlePrintEvent);
    return () => {
      window.removeEventListener("afterprint", handleAfterPrint);
      window.removeEventListener("silsilah:print-canvas", handlePrintEvent);
    };
  }, [handlePrintCanvas]);

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
        edgeTypes={edgeTypes}
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
          onPrint={handlePrintCanvas}
        />
      </ReactFlow>

      {/* Modal Edit Status & Detail Pernikahan */}
      <EditUnionModal
        open={!!selectedUnion}
        union={selectedUnion}
        members={selectedUnionMembers}
        onClose={() => setSelectedUnion(null)}
      />
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
