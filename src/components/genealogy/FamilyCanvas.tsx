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
import { EditUnionModal } from "./EditUnionModal";
import { buildCanvasGraph } from "@/lib/genealogy/canvas";
import { runElkLayout } from "@/lib/layout/elkLayout";
import { updateChildOrder } from "@/lib/genealogy/relationships";
import { saveCanvasIncludedPersons } from "@/lib/genealogy/canvases";
import { Search, UserPlus, X, Check, Download, Users, Plus } from "lucide-react";
import { getMediaUrl } from "@/lib/genealogy/media";
import type {
  PersonWithPortrait,
  Union,
  UnionMember,
  ParentChildRelationship,
  Canvas,
} from "@/types/genealogy";

const nodeTypes = {
  personNode: PersonNode,
  unionNode: UnionNode,
};

interface FamilyCanvasProps {
  canvasId?: string;
  rootPersonId?: string | null;
  canvasData?: Canvas | null;
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
  canvasId = "default-canvas",
  rootPersonId,
  canvasData,
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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importSearchTerm, setImportSearchTerm] = useState("");
  const { fitView } = useReactFlow();

  const isDefaultCanvas = canvasId === "default-canvas" || canvasData?.is_default === true;

  // Inisialisasi daftar person ID yang masuk ke kanvas ini
  const [includedPersonIds, setIncludedPersonIds] = useState<string[] | null>(() => {
    if (isDefaultCanvas) return null;
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`silsilah_canvas_included_${canvasId}`);
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    if (canvasData?.included_person_ids) return canvasData.included_person_ids;
    if (rootPersonId) return [rootPersonId];
    return null;
  });

  // Sync saat canvasData berubah
  useEffect(() => {
    if (isDefaultCanvas) {
      setIncludedPersonIds(null);
    } else if (canvasData?.included_person_ids) {
      setIncludedPersonIds(canvasData.included_person_ids);
    } else {
      if (typeof window !== "undefined") {
        try {
          const saved = localStorage.getItem(`silsilah_canvas_included_${canvasId}`);
          if (saved) {
            setIncludedPersonIds(JSON.parse(saved));
            return;
          }
        } catch (e) {}
      }
      if (rootPersonId) {
        setIncludedPersonIds([rootPersonId]);
      }
    }
  }, [canvasId, canvasData, rootPersonId, isDefaultCanvas]);

  // Listener untuk aksi impor snapshot & lepas anggota dari kanvas
  useEffect(() => {
    const handleImportEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ personIds: string[] }>;
      if (customEvent.detail?.personIds?.length > 0) {
        const newIds = customEvent.detail.personIds;
        setIncludedPersonIds((prev) => {
          const current = prev || (rootPersonId ? [rootPersonId] : people.map((p) => p.id));
          const combined = Array.from(new Set([...current, ...newIds]));
          saveCanvasIncludedPersons(canvasId, combined);
          return combined;
        });

        // Hapus cache posisi agar layout cerdas menyusun anggota baru secara otomatis
        localStorage.removeItem(`silsilah_canvas_positions_${canvasId}`);

        setTimeout(() => {
          fitView({ duration: 500, padding: 0.15 });
        }, 120);
      }
    };

    const handleRemoveEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ personId: string }>;
      if (customEvent.detail?.personId) {
        const removeId = customEvent.detail.personId;
        setIncludedPersonIds((prev) => {
          if (!prev) return null;
          const updated = prev.filter((id) => id !== removeId);
          saveCanvasIncludedPersons(canvasId, updated);
          return updated;
        });
      }
    };

    window.addEventListener("silsilah:import-to-canvas", handleImportEvent);
    window.addEventListener("silsilah:remove-from-canvas", handleRemoveEvent);
    return () => {
      window.removeEventListener("silsilah:import-to-canvas", handleImportEvent);
      window.removeEventListener("silsilah:remove-from-canvas", handleRemoveEvent);
    };
  }, [canvasId, rootPersonId, people, fitView]);

  // Build graph dari data (dengan memuat posisi kustom pengguna jika ada)
  useEffect(() => {
    let customPositionsMap: Map<string, { x: number; y: number }> | undefined;
    try {
      // Bersihkan cache posisi lama yang bertumpuk dari sesi sebelumnya
      localStorage.removeItem("silsilah_custom_positions");
      localStorage.removeItem("silsilah_custom_positions_v2");
      localStorage.removeItem("silsilah_custom_positions_v3");

      const saved =
        localStorage.getItem(`silsilah_canvas_positions_${canvasId}`) ||
        (canvasData?.custom_positions && Object.keys(canvasData.custom_positions).length > 0
          ? JSON.stringify(canvasData.custom_positions)
          : null);

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
      customPositionsMap,
      undefined,
      rootPersonId,
      includedPersonIds,
      canvasId,
      isDefaultCanvas
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

    // Otomatis posisikan pohon keluarga di tengah layar saat data/kanvas berganti
    setTimeout(() => {
      fitView({ duration: 400, padding: 0.15 });
    }, 80);
  }, [
    people,
    unions,
    unionMembers,
    parentChildRels,
    canvasId,
    canvasData,
    rootPersonId,
    includedPersonIds,
    isDefaultCanvas,
    fitView,
  ]);

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

        // Posisikan titik pernikahan (UnionNode) tepat di tengah kedua pasangan secara presisi
        for (const union of unions) {
          const members = unionMembers.filter((um) => um.union_id === union.id);
          if (members.length >= 2) {
            const p1Pos = posMap[`person-${members[0].person_id}`];
            const p2Pos = posMap[`person-${members[1].person_id}`];
            if (p1Pos && p2Pos) {
              const leftX = Math.min(p1Pos.x, p2Pos.x);
              const rightX = Math.max(p1Pos.x, p2Pos.x);
              const uX = Math.round(leftX + 240 + (rightX - (leftX + 240)) / 2 - 14);
              const uY = Math.round((p1Pos.y + p2Pos.y) / 2 + 115 / 2 - 14);
              posMap[`union-${union.id}`] = { x: uX, y: uY };
            }
          }
        }

        // Simpan langsung ke localStorage & Supabase database per kanvas
        localStorage.setItem(`silsilah_canvas_positions_${canvasId}`, JSON.stringify(posMap));
        saveCanvasPositions(canvasId, posMap);

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
        // Perbarui edges agar selalu presisi menghubungkan sisi kanan/kiri terdekat
        const customPosMap = new Map<string, { x: number; y: number }>(Object.entries(posMap));
        const { edges: updatedEdges } = buildCanvasGraph(
          people,
          unions,
          unionMembers,
          parentChildRels,
          customPosMap,
          undefined,
          rootPersonId,
          includedPersonIds,
          canvasId,
          isDefaultCanvas
        );
        setEdges(updatedEdges);
      } catch (e) {
        console.warn("Gagal menyimpan posisi custom node:", e);
      }
    },
    [
      parentChildRels,
      people,
      unions,
      unionMembers,
      canvasId,
      rootPersonId,
      includedPersonIds,
      isDefaultCanvas,
    ]
  );

  // Listener saat urutan anak diperbarui dari modal dialog
  useEffect(() => {
    const handleOrderUpdated = () => {
      let customPositionsMap: Map<string, { x: number; y: number }> | undefined;
      try {
        const saved =
          localStorage.getItem(`silsilah_canvas_positions_${canvasId}`) ||
          localStorage.getItem("silsilah_custom_positions_v4");
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
        customPositionsMap,
        undefined,
        rootPersonId,
        includedPersonIds,
        canvasId,
        isDefaultCanvas
      );
      setNodes(newNodes);
      setEdges(newEdges);
    };

    window.addEventListener("silsilah:child-order-updated", handleOrderUpdated);
    return () => window.removeEventListener("silsilah:child-order-updated", handleOrderUpdated);
  }, [
    people,
    unions,
    unionMembers,
    parentChildRels,
    canvasId,
    rootPersonId,
    includedPersonIds,
    isDefaultCanvas,
  ]);

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
      localStorage.removeItem(`silsilah_canvas_positions_${canvasId}`);
      localStorage.removeItem("silsilah_custom_positions_v4");
      localStorage.removeItem("silsilah_custom_positions_v3");
      localStorage.removeItem("silsilah_custom_positions_v2");
      localStorage.removeItem("silsilah_custom_positions");
      saveCanvasPositions(canvasId, {});

      const { nodes: initialNodes, edges: initialEdges } = buildCanvasGraph(
        people,
        unions,
        unionMembers,
        parentChildRels,
        undefined,
        undefined,
        rootPersonId,
        includedPersonIds,
        canvasId,
        isDefaultCanvas
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
  }, [
    people,
    unions,
    unionMembers,
    parentChildRels,
    canvasId,
    rootPersonId,
    includedPersonIds,
    isDefaultCanvas,
    fitView,
  ]);

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

  // Filter daftar anggota untuk modal impor
  const currentIncludedSet = new Set(
    includedPersonIds || (isDefaultCanvas ? people.map((p) => p.id) : rootPersonId ? [rootPersonId] : [])
  );

  const filteredImportPeople = people.filter((p) => {
    if (!importSearchTerm.trim()) return true;
    const term = importSearchTerm.toLowerCase();
    return (
      p.full_name.toLowerCase().includes(term) ||
      (p.display_name && p.display_name.toLowerCase().includes(term))
    );
  });

  const handleToggleIncludePerson = (personId: string) => {
    setIncludedPersonIds((prev) => {
      const current = prev || (rootPersonId ? [rootPersonId] : people.map((p) => p.id));
      let updated: string[];
      if (current.includes(personId)) {
        updated = current.filter((id) => id !== personId);
      } else {
        updated = [...current, personId];
      }
      saveCanvasIncludedPersons(canvasId, updated);
      return updated;
    });

    localStorage.removeItem(`silsilah_canvas_positions_${canvasId}`);
    setTimeout(() => {
      fitView({ duration: 400, padding: 0.15 });
    }, 100);
  };

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
      {/* Top Floating Action: Impor Anggota dari Database (Khusus Kanvas Cabang) */}
      {!isDefaultCanvas && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-lg shadow-black/5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-slate-800 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 text-xs font-bold transition-all hover:scale-105"
          >
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span>+ Impor Anggota dari Database ({includedPersonIds?.length || 1} di kanvas)</span>
          </button>
        </div>
      )}

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

      {/* Modal Impor Anggota dari Database */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Impor Anggota ke Kanvas
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pilih anggota dari database silsilah untuk dimasukkan ke kanvas ini
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search input */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
              <div className="relative">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama anggota keluarga..."
                  value={importSearchTerm}
                  onChange={(e) => setImportSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* People List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredImportPeople.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Tidak ditemukan anggota dengan nama tersebut.
                </div>
              ) : (
                filteredImportPeople.map((p) => {
                  const isIncluded = currentIncludedSet.has(p.id);
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0 flex items-center justify-center font-bold text-xs text-slate-600 dark:text-slate-300">
                          {p.portrait ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={getMediaUrl(p.portrait.storage_path)}
                              alt={p.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            p.full_name.charAt(0)
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {p.full_name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {p.gender === "male" ? "Laki-laki" : "Perempuan"}
                            {p.life_status === "deceased" ? " (Alm)" : ""}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleIncludePerson(p.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          isIncluded
                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            : "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-emerald-600 dark:hover:bg-emerald-400 dark:hover:text-white"
                        }`}
                      >
                        {isIncluded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Di Kanvas</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Masukkan</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
              <span className="text-xs text-slate-500">
                {currentIncludedSet.size} dari {people.length} anggota di kanvas ini
              </span>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
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
