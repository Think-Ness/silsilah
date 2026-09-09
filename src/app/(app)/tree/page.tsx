"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FamilyCanvas } from "@/components/genealogy/FamilyCanvas";
import { ZuriatChartView } from "@/components/genealogy/ZuriatChartView";
import { CanvasSelector } from "@/components/genealogy/CanvasSelector";
import { CanvasDashboard } from "@/components/genealogy/CanvasDashboard";
import { CreateCanvasModal } from "@/components/genealogy/CreateCanvasModal";
import { QuickAddMemberModal, type QuickAddActionType } from "@/components/genealogy/QuickAddMemberModal";
import { ReorderChildrenModal } from "@/components/genealogy/ReorderChildrenModal";
import { DeletePersonDialog } from "@/components/people/DeletePersonDialog";
import { PersonDetailPanel } from "@/components/people/PersonDetailPanel";
import { PersonBottomSheet } from "@/components/people/PersonBottomSheet";
import { getAllPeople, getPersonProfile } from "@/lib/genealogy/people";
import { getAllUnions, getAllParentChildRelationships } from "@/lib/genealogy/relationships";
import { getAllCanvases, deleteCanvas, updateCanvas } from "@/lib/genealogy/canvases";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutGrid, Layers, Plus, Network, Edit3, Check, Users, Printer } from "lucide-react";
import type { Canvas } from "@/types/genealogy";

const supabase = createClient();

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isMobile;
}

async function getCanvasData() {
  const [people, unions, unionMembersRes, parentChildRels] = await Promise.all([
    getAllPeople(),
    getAllUnions(),
    supabase.from("union_members").select("*"),
    getAllParentChildRelationships(),
  ]);

  return {
    people,
    unions,
    unionMembers: unionMembersRes.data || [],
    parentChildRels,
  };
}

export default function FamilyTreePage() {
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  // Mode tampilan: dashboard galeri kanvas | kanvas interaktif | template bagan zuriat
  const [viewMode, setViewMode] = useState<"dashboard" | "canvas" | "zuriat">("dashboard");
  const [activeCanvasId, setActiveCanvasId] = useState<string | null>(null);
  const [createCanvasModal, setCreateCanvasModal] = useState<{
    open: boolean;
    initialRootPersonId?: string | null;
  }>({
    open: false,
    initialRootPersonId: null,
  });
  const [familyTitle, setFamilyTitle] = useState("Silsilah Zuriat Ahlan & Hj. Siti Maskah");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(familyTitle);

  const queryClient = useQueryClient();
  const [quickAddModal, setQuickAddModal] = useState<{
    open: boolean;
    actionType: QuickAddActionType | null;
    targetPerson: any;
    spouses: any[];
  }>({
    open: false,
    actionType: null,
    targetPerson: null,
    spouses: [],
  });

  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    personId: string | null;
    personName: string;
  }>({
    open: false,
    personId: null,
    personName: "",
  });

  const [reorderModal, setReorderModal] = useState<{
    open: boolean;
    parentId: string | null;
    parentName: string;
  }>({
    open: false,
    parentId: null,
    parentName: "",
  });

  const isMobile = useIsMobile();

  // Listener untuk aksi tambah cepat, hapus anggota, dan atur urutan anak dari kanvas
  useEffect(() => {
    const handleQuickAddEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{
        targetPerson: any;
        actionType: QuickAddActionType;
        spouses: any[];
      }>;
      if (customEvent.detail) {
        setQuickAddModal({
          open: true,
          actionType: customEvent.detail.actionType,
          targetPerson: customEvent.detail.targetPerson,
          spouses: customEvent.detail.spouses || [],
        });
      }
    };

    const handleDeleteEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{
        personId: string;
        personName: string;
      }>;
      if (customEvent.detail) {
        setDeleteModal({
          open: true,
          personId: customEvent.detail.personId,
          personName: customEvent.detail.personName,
        });
      }
    };

    const handleReorderEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{
        parentId: string;
        parentName: string;
      }>;
      if (customEvent.detail) {
        setReorderModal({
          open: true,
          parentId: customEvent.detail.parentId,
          parentName: customEvent.detail.parentName,
        });
      }
    };

    const handleOpenCreateCanvas = (e: Event) => {
      const customEvent = e as CustomEvent<{
        rootPersonId?: string;
        personName?: string;
      }>;
      if (customEvent.detail) {
        setCreateCanvasModal({
          open: true,
          initialRootPersonId: customEvent.detail.rootPersonId || null,
        });
      }
    };

    window.addEventListener("silsilah:quick-add", handleQuickAddEvent);
    window.addEventListener("silsilah:delete-person", handleDeleteEvent);
    window.addEventListener("silsilah:reorder-children", handleReorderEvent);
    window.addEventListener("silsilah:open-create-canvas", handleOpenCreateCanvas);
    return () => {
      window.removeEventListener("silsilah:quick-add", handleQuickAddEvent);
      window.removeEventListener("silsilah:delete-person", handleDeleteEvent);
      window.removeEventListener("silsilah:reorder-children", handleReorderEvent);
      window.removeEventListener("silsilah:open-create-canvas", handleOpenCreateCanvas);
    };
  }, []);

  // Query daftar semua kanvas
  const { data: canvasesData = [] } = useQuery({
    queryKey: ["canvases-list"],
    queryFn: () => getAllCanvases(),
    staleTime: 10 * 1000,
  });

  // Listener event update kanvas
  useEffect(() => {
    const handleCanvasesUpdated = (e: Event) => {
      queryClient.invalidateQueries({ queryKey: ["canvases-list"] });
      const customEvent = e as CustomEvent<{ canvasId?: string; deleted?: boolean }>;
      if (customEvent.detail?.canvasId && !customEvent.detail?.deleted) {
        setActiveCanvasId(customEvent.detail.canvasId);
      }
    };

    window.addEventListener("silsilah:canvases-updated", handleCanvasesUpdated);
    return () => window.removeEventListener("silsilah:canvases-updated", handleCanvasesUpdated);
  }, [queryClient]);

  // Kanvas aktif saat ini
  const activeCanvas = useMemo(() => {
    if (activeCanvasId && canvasesData.length > 0) {
      const found = canvasesData.find((c) => c.id === activeCanvasId);
      if (found) return found;
    }
    return canvasesData.find((c) => c.is_default) || canvasesData[0] || null;
  }, [activeCanvasId, canvasesData]);

  // Sync title input saat kanvas aktif berganti
  useEffect(() => {
    if (activeCanvas) {
      setFamilyTitle(activeCanvas.title);
      setTitleInput(activeCanvas.title);
    }
  }, [activeCanvas]);

  const handleQuickAddSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["canvas-data"] });
  }, [queryClient]);

  const handleDeleteSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["canvas-data"] });
    setSelectedPersonId(null);
  }, [queryClient]);

  const handleReorderSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["canvas-data"] });
  }, [queryClient]);

  const handleTitleChange = useCallback(
    async (newTitle: string) => {
      setFamilyTitle(newTitle);
      setTitleInput(newTitle);
      if (activeCanvas) {
        await updateCanvas(activeCanvas.id, { title: newTitle });
        queryClient.invalidateQueries({ queryKey: ["canvases-list"] });
      }
    },
    [activeCanvas, queryClient]
  );

  const handleSaveTitleInput = () => {
    setIsEditingTitle(false);
    if (titleInput.trim()) {
      handleTitleChange(titleInput.trim());
    }
  };

  const handleSelectCanvas = useCallback((canvas: Canvas) => {
    setActiveCanvasId(canvas.id);
    setFamilyTitle(canvas.title);
    setTitleInput(canvas.title);
  }, []);

  const handleDeleteCanvas = useCallback(
    async (canvasId: string) => {
      await deleteCanvas(canvasId);
      queryClient.invalidateQueries({ queryKey: ["canvases-list"] });
      if (activeCanvasId === canvasId) {
        setActiveCanvasId(null);
      }
    },
    [activeCanvasId, queryClient]
  );

  const handleCreateCanvasSuccess = useCallback(
    (newCanvas: Canvas) => {
      queryClient.invalidateQueries({ queryKey: ["canvases-list"] });
      setActiveCanvasId(newCanvas.id);
      setFamilyTitle(newCanvas.title);
      setTitleInput(newCanvas.title);
      setViewMode("canvas");
    },
    [queryClient]
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ["canvas-data"],
    queryFn: getCanvasData,
    staleTime: 5 * 1000, // Cepat refresh (5 detik) agar saat kembali dari form edit langsung mutakhir
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Supabase Realtime: otomatis invalidasi dan perbarui kanvas silsilah secara instan saat data anggota/relasi/foto berubah
  useEffect(() => {
    const channel = supabase
      .channel("realtime-tree-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "people" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["canvas-data"] });
          queryClient.invalidateQueries({ queryKey: ["person-profile"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "parent_child_relationships" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["canvas-data"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "unions" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["canvas-data"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "person_media" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["canvas-data"] });
          queryClient.invalidateQueries({ queryKey: ["person-profile"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "canvases" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["canvases-list"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Bangun profil instan secara synchronous dari data kanvas di memori (0ms delay)
  const instantProfile = useMemo(() => {
    if (!selectedPersonId || !data) return null;
    const person = data.people.find((p) => p.id === selectedPersonId);
    if (!person) return null;

    const parentRels = data.parentChildRels.filter((r) => r.child_id === selectedPersonId);
    const parentIds = new Set(parentRels.map((r) => r.parent_id));
    const parents = data.people.filter((p) => parentIds.has(p.id));

    const myUnionMembers = data.unionMembers.filter((um) => um.person_id === selectedPersonId);
    const myUnionIds = new Set(myUnionMembers.map((um) => um.union_id));
    const spouses: Array<{ person: any; union: any }> = [];
    for (const unionId of myUnionIds) {
      const union = data.unions.find((u) => u.id === unionId);
      if (!union) continue;
      const otherMembers = data.unionMembers.filter(
        (um) => um.union_id === unionId && um.person_id !== selectedPersonId
      );
      for (const om of otherMembers) {
        const spousePerson = data.people.find((p) => p.id === om.person_id);
        if (spousePerson) {
          spouses.push({ person: spousePerson, union });
        }
      }
    }

    const childRels = data.parentChildRels.filter((r) => r.parent_id === selectedPersonId);
    const childIds = new Set(childRels.map((r) => r.child_id));
    const children = data.people.filter((p) => childIds.has(p.id));

    // Urutkan daftar anak sesuai custom child order, sort_order DB, atau birth_date
    let customChildOrder: string[] = [];
    try {
      const raw = localStorage.getItem("silsilah_child_order_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        customChildOrder = parsed[selectedPersonId] || [];
        if (customChildOrder.length === 0 && myUnionIds.size > 0) {
          for (const uId of myUnionIds) {
            if (parsed[uId]?.length > 0) {
              customChildOrder = parsed[uId];
              break;
            }
          }
        }
      }
    } catch (e) {}

    const sortedChildren = [...children].sort((a, b) => {
      if (customChildOrder.length > 0) {
        const idxA = customChildOrder.indexOf(a.id);
        const idxB = customChildOrder.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
      }

      const relA = childRels.find((r) => r.child_id === a.id);
      const relB = childRels.find((r) => r.child_id === b.id);
      if (relA && relB && typeof relA.sort_order === "number" && typeof relB.sort_order === "number") {
        if (relA.sort_order !== relB.sort_order) return relA.sort_order - relB.sort_order;
      }

      if (a.birth_date && b.birth_date) return a.birth_date.localeCompare(b.birth_date);
      if (a.birth_date) return -1;
      if (b.birth_date) return 1;

      return a.full_name.localeCompare(b.full_name);
    });

    return {
      ...person,
      parents,
      spouses,
      children: sortedChildren,
      addresses: [],
      contacts: [],
      media: [],
    };
  }, [selectedPersonId, data]);

  const { data: serverProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["person-profile", selectedPersonId],
    queryFn: () => (selectedPersonId ? getPersonProfile(selectedPersonId) : null),
    enabled: !!selectedPersonId,
    staleTime: 60 * 1000,
  });

  const rawProfile = serverProfile || instantProfile;

  // Pastikan profile yang ditampilkan di side panel / bottom sheet mengikuti urutan anak kustom
  const selectedProfile = useMemo(() => {
    if (!rawProfile || !rawProfile.children || rawProfile.children.length <= 1) {
      return rawProfile;
    }

    let customOrder: string[] = [];
    try {
      const raw = localStorage.getItem("silsilah_child_order_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        customOrder = parsed[rawProfile.id] || [];
        if (customOrder.length === 0 && rawProfile.spouses?.length > 0) {
          for (const sp of rawProfile.spouses) {
            if (parsed[sp.person.id]?.length > 0) {
              customOrder = parsed[sp.person.id];
              break;
            }
          }
        }
      }
    } catch (e) {}

    if (customOrder.length === 0) return rawProfile;

    const sortedChildren = [...rawProfile.children].sort((a, b) => {
      const idxA = customOrder.indexOf(a.id);
      const idxB = customOrder.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return 0;
    });

    return { ...rawProfile, children: sortedChildren };
  }, [rawProfile]);

  const handlePersonClick = useCallback((personId: string) => {
    setSelectedPersonId((prev) => (prev === personId ? null : personId));
  }, []);

  const handlePanelClose = useCallback(() => {
    setSelectedPersonId(null);
  }, []);

  if (error) {
    return (
      <div className="empty-state" style={{ height: "100%" }}>
        <div className="empty-state-title">Gagal memuat pohon keluarga</div>
        <p className="empty-state-description">Periksa koneksi dan coba lagi.</p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-500 rounded-md border border-[var(--border)] hover:bg-[var(--subtle)] transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Top Toolbar / Mode Switcher */}
      <div
        className="no-print"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 18px",
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          zIndex: 15,
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        {/* Left: Mode Switcher & Back to Dashboard */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {viewMode !== "dashboard" && (
            <button
              onClick={() => setViewMode("dashboard")}
              title="Kembali ke Dashboard Galeri Kanvas"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>← Semua Kanvas</span>
            </button>
          )}

          <div
            style={{
              display: "inline-flex",
              background: "var(--subtle)",
              padding: "3px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
            }}
          >
            <button
              onClick={() => setViewMode("dashboard")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: 600,
                borderRadius: "var(--radius-xs)",
                border: "none",
                cursor: "pointer",
                background: viewMode === "dashboard" ? "var(--surface)" : "transparent",
                color: viewMode === "dashboard" ? "#059669" : "var(--muted)",
                boxShadow: viewMode === "dashboard" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              Dashboard Kanvas
            </button>
            <button
              onClick={() => setViewMode("canvas")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: 600,
                borderRadius: "var(--radius-xs)",
                border: "none",
                cursor: "pointer",
                background: viewMode === "canvas" ? "var(--surface)" : "transparent",
                color: viewMode === "canvas" ? "#2563EB" : "var(--muted)",
                boxShadow: viewMode === "canvas" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <Network className="w-3.5 h-3.5 text-blue-600" />
              Kanvas Interaktif
            </button>
            <button
              onClick={() => setViewMode("zuriat")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: 600,
                borderRadius: "var(--radius-xs)",
                border: "none",
                cursor: "pointer",
                background: viewMode === "zuriat" ? "var(--surface)" : "transparent",
                color: viewMode === "zuriat" ? "#B45309" : "var(--muted)",
                boxShadow: viewMode === "zuriat" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <Printer className="w-3.5 h-3.5 text-amber-600" />
              Bagan Zuriat
            </button>
          </div>

          {viewMode === "canvas" && (
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent("silsilah:print-canvas"));
              }}
              title="Cetak tampilan kanvas saat ini langsung ke kertas / PDF"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: 600,
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                cursor: "pointer",
                background: "var(--surface)",
                color: "var(--foreground)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                transition: "all 0.15s ease",
              }}
            >
              <Printer className="w-3.5 h-3.5 text-emerald-600" />
              Cetak Kanvas
            </button>
          )}
        </div>

        {/* Center: Canvas Selector & Title */}
        {viewMode !== "dashboard" ? (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <CanvasSelector
              canvases={canvasesData}
              activeCanvasId={activeCanvas?.id || null}
              onSelectCanvas={handleSelectCanvas}
              onCreateNewClick={() =>
                setCreateCanvasModal({ open: true, initialRootPersonId: null })
              }
              onDeleteCanvas={handleDeleteCanvas}
            />

            {isEditingTitle ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveTitleInput();
                }}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  autoFocus
                  onBlur={handleSaveTitleInput}
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    border: "1px solid var(--accent-color)",
                    borderRadius: "6px",
                    padding: "4px 10px",
                    outline: "none",
                    minWidth: "220px",
                  }}
                />
                <button
                  type="submit"
                  className="p-1 rounded hover:bg-emerald-100 text-emerald-700 transition-colors"
                  title="Simpan Judul"
                >
                  <Check className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <button
                onClick={() => setIsEditingTitle(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Ubah Nama Kanvas Ini"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {canvasesData.length} Kanvas Silsilah Tersedia
            </span>
          </div>
        )}

        {/* Right Info / Action */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {viewMode === "dashboard" ? (
            <button
              onClick={() =>
                setCreateCanvasModal({ open: true, initialRootPersonId: null })
              }
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Buat Kanvas Baru</span>
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--muted)" }}>
              <Users className="w-3.5 h-3.5" />
              <span>{data?.people?.length || 0} Anggota</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        {/* View container */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden", display: "flex" }}>
          {isLoading ? (
            <div style={{ display: "flex", gap: "16px", padding: "32px", flexWrap: "wrap" }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="w-[240px] h-[115px] rounded-lg" />
              ))}
            </div>
          ) : viewMode === "dashboard" ? (
            <CanvasDashboard
              canvases={canvasesData}
              people={data?.people || []}
              activeCanvasId={activeCanvas?.id || null}
              onSelectCanvas={(canvas, mode) => {
                setActiveCanvasId(canvas.id);
                setFamilyTitle(canvas.title);
                setTitleInput(canvas.title);
                setViewMode(mode || "canvas");
              }}
              onCreateNewClick={() =>
                setCreateCanvasModal({ open: true, initialRootPersonId: null })
              }
              onDeleteCanvas={handleDeleteCanvas}
            />
          ) : viewMode === "zuriat" ? (
            <ZuriatChartView
              people={data?.people || []}
              unions={data?.unions || []}
              unionMembers={data?.unionMembers || []}
              parentChildRels={data?.parentChildRels || []}
              onPersonClick={handlePersonClick}
              customTitle={familyTitle}
              onTitleChange={handleTitleChange}
            />
          ) : (
            <FamilyCanvas
              canvasId={activeCanvas?.id || "default-canvas"}
              rootPersonId={activeCanvas?.root_person_id || null}
              canvasData={activeCanvas}
              people={data?.people || []}
              unions={data?.unions || []}
              unionMembers={data?.unionMembers || []}
              parentChildRels={data?.parentChildRels || []}
              onPersonClick={handlePersonClick}
              selectedPersonId={selectedPersonId}
              customTitle={familyTitle}
              onTitleChange={handleTitleChange}
            />
          )}
        </div>

        {/* Detail panel — Strictly Desktop ONLY (viewport >= 1024px) */}
        {!isMobile && selectedPersonId && (
          <aside
            style={{
              width: "360px",
              maxWidth: "100vw",
              flexShrink: 0,
              height: "100%",
              borderLeft: "1px solid var(--border)",
              background: "var(--surface)",
              zIndex: 20,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {selectedProfile ? (
              <PersonDetailPanel
                profile={selectedProfile}
                onClose={handlePanelClose}
              />
            ) : profileLoading ? (
              <div className="profile-panel" style={{ padding: "20px" }}>
                <div className="space-y-3">
                  <Skeleton className="w-20 h-20 rounded-full mx-auto" />
                  <Skeleton className="h-5 w-40 mx-auto" />
                  <Skeleton className="h-4 w-24 mx-auto" />
                  <div className="mt-4 space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-4 w-full" />
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </aside>
        )}

        {/* Bottom sheet — Strictly Mobile ONLY (viewport < 1024px) */}
        {isMobile && selectedPersonId && selectedProfile && (
          <PersonBottomSheet
            profile={selectedProfile}
            onClose={handlePanelClose}
          />
        )}
      </div>

      {/* Create New Canvas Modal */}
      <CreateCanvasModal
        open={createCanvasModal.open}
        people={data?.people || []}
        initialRootPersonId={createCanvasModal.initialRootPersonId}
        onClose={() => setCreateCanvasModal({ open: false, initialRootPersonId: null })}
        onSuccess={handleCreateCanvasSuccess}
      />

      {/* Quick Add Member Modal via Canvas Hover Actions */}
      <QuickAddMemberModal
        open={quickAddModal.open}
        actionType={quickAddModal.actionType}
        targetPerson={quickAddModal.targetPerson}
        spouses={quickAddModal.spouses}
        onClose={() => setQuickAddModal((prev) => ({ ...prev, open: false }))}
        onSuccess={handleQuickAddSuccess}
      />

      {/* Delete Member Confirmation Modal */}
      <DeletePersonDialog
        open={deleteModal.open}
        personId={deleteModal.personId}
        personName={deleteModal.personName}
        onClose={() => setDeleteModal((prev) => ({ ...prev, open: false }))}
        onSuccess={handleDeleteSuccess}
      />

      {/* Reorder Children Modal via Drag & Drop */}
      <ReorderChildrenModal
        open={reorderModal.open}
        parentId={reorderModal.parentId}
        parentName={reorderModal.parentName}
        people={data?.people || []}
        parentChildRels={data?.parentChildRels || []}
        unions={data?.unions || []}
        unionMembers={data?.unionMembers || []}
        onClose={() => setReorderModal((prev) => ({ ...prev, open: false }))}
        onSuccess={handleReorderSuccess}
      />
    </div>
  );
}
