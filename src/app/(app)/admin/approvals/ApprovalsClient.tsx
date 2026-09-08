"use client";

import { useState, useTransition } from "react";
import type { PendingChange } from "@/lib/admin/types";
import { reviewPendingChange } from "@/lib/admin/users";
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  User,
  GitBranch,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface ApprovalsClientProps {
  pendingChanges: PendingChange[];
  approvedChanges: PendingChange[];
  rejectedChanges: PendingChange[];
  currentUserId: string;
}

const ACTION_LABELS: Record<string, string> = {
  create: "Tambah Baru",
  update: "Perbarui",
  delete: "Hapus",
  archive: "Arsipkan",
};

const ACTION_COLORS: Record<string, string> = {
  create: "#22c55e",
  update: "#3b82f6",
  delete: "#ef4444",
  archive: "#f59e0b",
};

const ENTITY_LABELS: Record<string, string> = {
  person: "Anggota",
  union: "Pernikahan",
  relationship: "Hubungan",
  media: "Foto/Dokumen",
};

export function ApprovalsClient({
  pendingChanges,
  approvedChanges,
  rejectedChanges,
  currentUserId,
}: ApprovalsClientProps) {
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});
  const [confirmReject, setConfirmReject] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  function showFeedback(msg: string, ok: boolean) {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 4000);
  }

  async function handleApprove(changeId: string) {
    startTransition(async () => {
      const { error } = await reviewPendingChange(changeId, "approved");
      if (error) showFeedback(error, false);
      else showFeedback("Perubahan berhasil disetujui dan diterapkan", true);
    });
  }

  async function handleReject(changeId: string) {
    startTransition(async () => {
      const { error } = await reviewPendingChange(changeId, "rejected", rejectNote[changeId]);
      if (error) showFeedback(error, false);
      else {
        showFeedback("Perubahan ditolak", true);
        setConfirmReject(null);
      }
    });
  }

  const tabs = [
    { key: "pending", label: "Menunggu", changes: pendingChanges, color: "#f59e0b" },
    { key: "approved", label: "Disetujui", changes: approvedChanges, color: "#22c55e" },
    { key: "rejected", label: "Ditolak", changes: rejectedChanges, color: "#ef4444" },
  ] as const;

  const activeChanges = tabs.find((t) => t.key === activeTab)?.changes ?? [];

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Persetujuan Perubahan</h1>
          <p className="page-subtitle">
            Tinjau dan setujui perubahan yang diajukan oleh anggota keluarga
          </p>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          style={{
            margin: "0 0 16px",
            padding: "12px 16px",
            borderRadius: "var(--radius-md)",
            background: feedback.ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
            border: `1px solid ${feedback.ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
            color: feedback.ok ? "#16a34a" : "#ef4444",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {feedback.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
          {feedback.msg}
        </div>
      )}

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {[
          { label: "Menunggu", count: pendingChanges.length, color: "#f59e0b", icon: Clock },
          { label: "Disetujui", count: approvedChanges.length, color: "#22c55e", icon: CheckCircle },
          { label: "Ditolak", count: rejectedChanges.length, color: "#ef4444", icon: XCircle },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "16px",
              textAlign: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 6 }}>
              <s.icon size={16} color={s.color} />
              <span style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.count}</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "1px solid var(--border)",
          marginBottom: 20,
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            id={`approval-tab-${tab.key}`}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "8px 16px",
              border: "none",
              borderBottom: `2px solid ${activeTab === tab.key ? tab.color : "transparent"}`,
              background: "transparent",
              color: activeTab === tab.key ? tab.color : "var(--muted)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {tab.label}
            {tab.changes.length > 0 && activeTab !== tab.key && (
              <span
                style={{
                  background: tab.color,
                  color: "#fff",
                  borderRadius: 999,
                  padding: "0 6px",
                  fontSize: 10,
                  fontWeight: 700,
                  minWidth: 18,
                  height: 18,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {tab.changes.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Changes list */}
      {activeChanges.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 24px",
            color: "var(--muted)",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <Clock size={32} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
          <p style={{ fontSize: 14, margin: 0 }}>
            {activeTab === "pending" ? "Tidak ada perubahan yang menunggu persetujuan" : "Belum ada riwayat"}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {activeChanges.map((change) => {
            const isExpanded = expandedId === change.id;
            const actionColor = ACTION_COLORS[change.action] ?? "#64748b";
            const isConfirmingReject = confirmReject === change.id;

            return (
              <div
                key={change.id}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  overflow: "hidden",
                  transition: "all 0.15s",
                }}
              >
                {/* Header row */}
                <div
                  style={{
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    cursor: "pointer",
                  }}
                  onClick={() => setExpandedId(isExpanded ? null : change.id)}
                >
                  {/* Action badge */}
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                      background: `${actionColor}20`,
                      color: actionColor,
                      flexShrink: 0,
                    }}
                  >
                    {ACTION_LABELS[change.action]}
                  </span>

                  {/* Entity */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
                      {ENTITY_LABELS[change.entity_type]}
                      {change.change_summary && ` — ${change.change_summary}`}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                      Diajukan {new Date(change.submitted_at).toLocaleString("id-ID")}
                      {change.submitter_name && ` oleh ${change.submitter_name}`}
                    </div>
                  </div>

                  {/* Expand icon */}
                  <div style={{ color: "var(--muted)", flexShrink: 0 }}>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div
                    style={{
                      borderTop: "1px solid var(--border)",
                      padding: "16px",
                    }}
                  >
                    {/* Diff view */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: change.current_data ? "1fr 1fr" : "1fr",
                        gap: 12,
                        marginBottom: 16,
                      }}
                    >
                      {change.current_data && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase" }}>
                            Data Saat Ini
                          </div>
                          <div
                            style={{
                              background: "rgba(239,68,68,0.05)",
                              border: "1px solid rgba(239,68,68,0.2)",
                              borderRadius: "var(--radius-sm)",
                              padding: "10px 12px",
                              fontSize: 12,
                              fontFamily: "monospace",
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-all",
                              maxHeight: 200,
                              overflowY: "auto",
                            }}
                          >
                            {JSON.stringify(change.current_data, null, 2)}
                          </div>
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase" }}>
                          Data Baru {!change.current_data && "(Tambah)"}
                        </div>
                        <div
                          style={{
                            background: "rgba(34,197,94,0.05)",
                            border: "1px solid rgba(34,197,94,0.2)",
                            borderRadius: "var(--radius-sm)",
                            padding: "10px 12px",
                            fontSize: 12,
                            fontFamily: "monospace",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-all",
                            maxHeight: 200,
                            overflowY: "auto",
                          }}
                        >
                          {JSON.stringify(change.proposed_data, null, 2)}
                        </div>
                      </div>
                    </div>

                    {/* Review note (if rejected) */}
                    {change.review_note && (
                      <div
                        style={{
                          background: "rgba(239,68,68,0.05)",
                          border: "1px solid rgba(239,68,68,0.2)",
                          borderRadius: "var(--radius-sm)",
                          padding: "10px 12px",
                          marginBottom: 12,
                          fontSize: 12,
                          color: "#ef4444",
                        }}
                      >
                        <strong>Catatan penolakan:</strong> {change.review_note}
                      </div>
                    )}

                    {/* Actions — only for pending */}
                    {activeTab === "pending" && (
                      <div>
                        {isConfirmingReject ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <textarea
                              value={rejectNote[change.id] ?? ""}
                              onChange={(e) =>
                                setRejectNote((prev) => ({ ...prev, [change.id]: e.target.value }))
                              }
                              placeholder="Alasan penolakan (opsional)..."
                              rows={2}
                              style={{
                                width: "100%",
                                padding: "8px 12px",
                                border: "1px solid rgba(239,68,68,0.4)",
                                borderRadius: "var(--radius-sm)",
                                background: "var(--background)",
                                fontSize: 12,
                                color: "var(--foreground)",
                                resize: "vertical",
                                boxSizing: "border-box",
                              }}
                            />
                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                onClick={() => setConfirmReject(null)}
                                style={{
                                  flex: 1,
                                  padding: "8px",
                                  border: "1px solid var(--border)",
                                  borderRadius: "var(--radius-sm)",
                                  background: "transparent",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  color: "var(--muted)",
                                }}
                              >
                                Batal
                              </button>
                              <button
                                id={`confirm-reject-${change.id}`}
                                onClick={() => handleReject(change.id)}
                                disabled={isPending}
                                style={{
                                  flex: 2,
                                  padding: "8px",
                                  border: "none",
                                  borderRadius: "var(--radius-sm)",
                                  background: "#ef4444",
                                  color: "#fff",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 6,
                                }}
                              >
                                <XCircle size={14} />
                                Konfirmasi Tolak
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              id={`reject-change-${change.id}`}
                              onClick={() => setConfirmReject(change.id)}
                              style={{
                                flex: 1,
                                padding: "8px",
                                border: "1px solid rgba(239,68,68,0.4)",
                                borderRadius: "var(--radius-sm)",
                                background: "rgba(239,68,68,0.05)",
                                color: "#ef4444",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 6,
                              }}
                            >
                              <XCircle size={14} />
                              Tolak
                            </button>
                            <button
                              id={`approve-change-${change.id}`}
                              onClick={() => handleApprove(change.id)}
                              disabled={isPending}
                              style={{
                                flex: 2,
                                padding: "8px",
                                border: "none",
                                borderRadius: "var(--radius-sm)",
                                background: "#22c55e",
                                color: "#fff",
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 6,
                              }}
                            >
                              <CheckCircle size={14} />
                              {isPending ? "Memproses..." : "Setujui & Terapkan"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
