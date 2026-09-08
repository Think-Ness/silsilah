"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  Upload,
  FileText,
  Search,
  Filter,
  Eye,
  Download,
  Trash2,
  X,
  User,
  Calendar,
  FileCheck2,
  Loader2,
  ExternalLink,
  FileCode,
  FileSpreadsheet,
  FileImage,
  FileQuestion,
} from "lucide-react";
import {
  uploadMedia,
  deleteMediaById,
  getMediaUrl,
  type MediaWithPerson,
} from "@/lib/genealogy/media";
import { formatBytes } from "@/lib/utils/image-compression";
import type { PersonWithPortrait } from "@/types/genealogy";
import { toast } from "sonner";
import { useCurrentUser } from "@/context/UserRoleContext";

interface DocumentsArchiveClientProps {
  initialDocuments: MediaWithPerson[];
  people: PersonWithPortrait[];
}

const DOCUMENT_CATEGORIES = [
  "Semua Kategori",
  "Akta Kelahiran",
  "Buku / Surat Nikah",
  "Kartu Keluarga (KK)",
  "KTP / Identitas",
  "Ijazah & Pendidikan",
  "Sertifikat Tanah & Properti",
  "Surat Kematian",
  "Dokumen Historis / Surat",
  "Lainnya",
] as const;

export function DocumentsArchiveClient({
  initialDocuments,
  people,
}: DocumentsArchiveClientProps) {
  const { canUpload } = useCurrentUser();
  const [documents, setDocuments] = useState<MediaWithPerson[]>(initialDocuments);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua Kategori");
  const [selectedPersonFilter, setSelectedPersonFilter] = useState<string>("all");

  // Modal Upload State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("Akta Kelahiran");
  const [formDescription, setFormDescription] = useState("");
  const [formPersonId, setFormPersonId] = useState("");
  const [formTakenAt, setFormTakenAt] = useState("");

  // Preview / Lightbox State
  const [activePreviewDoc, setActivePreviewDoc] = useState<MediaWithPerson | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    // Max 30 MB
    if (file.size > 30 * 1024 * 1024) {
      toast.error("Ukuran file dokumen terlalu besar (maksimal 30 MB)");
      return;
    }

    setSelectedFile(file);
    if (!formTitle) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ");
      setFormTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Pilih file dokumen terlebih dahulu");
      return;
    }

    setUploading(true);
    try {
      // Simpan kategori di awal deskripsi atau title
      const fullDescription = formCategory && formCategory !== "Lainnya"
        ? `[Kategori: ${formCategory}] ${formDescription}`.trim()
        : formDescription.trim();

      const media = await uploadMedia(selectedFile, {
        title: formTitle.trim() || selectedFile.name,
        description: fullDescription || undefined,
        mediaType: "document",
        takenAt: formTakenAt || undefined,
        personId: formPersonId || undefined,
        role: "document",
      });

      const selectedPerson = people.find((p) => p.id === formPersonId);
      const newDocItem: MediaWithPerson = {
        ...media,
        person_media: selectedPerson
          ? [
              {
                id: `temp-${Date.now()}`,
                person_id: selectedPerson.id,
                media_id: media.id,
                role: "document",
                is_primary_portrait: false,
                created_at: new Date().toISOString(),
                person: {
                  id: selectedPerson.id,
                  full_name: selectedPerson.full_name,
                  display_name: selectedPerson.display_name,
                  gender: selectedPerson.gender,
                },
              },
            ]
          : [],
      };

      setDocuments((prev) => [newDocItem, ...prev]);
      toast.success("Dokumen berhasil disimpan ke arsip!");
      closeUploadModal();
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err?.message || "Gagal mengunggah dokumen");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (doc: MediaWithPerson) => {
    if (!confirm(`Hapus dokumen "${doc.title || "Tanpa Judul"}" dari arsip?`)) {
      return;
    }

    setDeletingId(doc.id);
    try {
      await deleteMediaById(doc.id, doc.storage_path);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      if (activePreviewDoc?.id === doc.id) {
        setActivePreviewDoc(null);
      }
      toast.success("Dokumen berhasil dihapus");
    } catch (err: any) {
      console.error("Delete error:", err);
      toast.error(err?.message || "Gagal menghapus dokumen");
    } finally {
      setDeletingId(null);
    }
  };

  const closeUploadModal = () => {
    setIsUploadOpen(false);
    setSelectedFile(null);
    setFormTitle("");
    setFormCategory("Akta Kelahiran");
    setFormDescription("");
    setFormPersonId("");
    setFormTakenAt("");
  };

  // Helper file icon & badge
  const getFileBadge = (mimeType: string | null, storagePath: string) => {
    const ext = storagePath.split(".").pop()?.toLowerCase() || "";
    if (ext === "pdf" || mimeType?.includes("pdf")) {
      return {
        label: "PDF",
        icon: FileText,
        colorClass: "bg-red-500/10 text-red-600 border-red-500/20",
      };
    }
    if (["doc", "docx"].includes(ext) || mimeType?.includes("word")) {
      return {
        label: "DOC",
        icon: FileText,
        colorClass: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      };
    }
    if (["xls", "xlsx", "csv"].includes(ext) || mimeType?.includes("sheet")) {
      return {
        label: "XLS",
        icon: FileSpreadsheet,
        colorClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      };
    }
    if (["jpg", "jpeg", "png", "webp"].includes(ext) || mimeType?.startsWith("image/")) {
      return {
        label: "GAMBAR",
        icon: FileImage,
        colorClass: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      };
    }
    return {
      label: ext.toUpperCase() || "FILE",
      icon: FileCode,
      colorClass: "bg-violet-500/10 text-violet-600 border-violet-500/20",
    };
  };

  // Filtered documents
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      !searchQuery ||
      doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.person_media?.some((pm) =>
        (pm.person?.display_name || pm.person?.full_name || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      );

    const matchesCategory =
      selectedCategory === "Semua Kategori" ||
      doc.description?.toLowerCase().includes(selectedCategory.toLowerCase()) ||
      doc.title?.toLowerCase().includes(selectedCategory.toLowerCase());

    const matchesPerson =
      selectedPersonFilter === "all" ||
      doc.person_media?.some((pm) => pm.person_id === selectedPersonFilter);

    return matchesSearch && matchesCategory && matchesPerson;
  });

  return (
    <div className="page-content">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <FileCheck2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Arsip Dokumen Keluarga
          </h1>
          <p className="page-subtitle">
            {documents.length} dokumen tersimpan (Akta, Surat Nikah, KK, Ijazah, & Dokumen Legal)
          </p>
        </div>

        {canUpload && (
          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-all duration-200 cursor-pointer active:scale-98"
          >
            <Upload className="w-4 h-4" />
            <span>Unggah Dokumen</span>
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari dokumen berdasarkan nama, jenis, atau anggota keluarga..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown Filter Kategori */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-[var(--muted)] flex-shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--foreground)] focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
          >
            {DOCUMENT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Filter per Anggota */}
          {people.length > 0 && (
            <select
              value={selectedPersonFilter}
              onChange={(e) => setSelectedPersonFilter(e.target.value)}
              className="w-full sm:w-48 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--foreground)] focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
            >
              <option value="all">Semua Anggota</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.display_name || person.full_name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Dokumen Cards / Grid */}
      {filteredDocuments.length === 0 ? (
        <div className="empty-state p-8 sm:p-12 text-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center mx-auto mb-4 text-blue-600 dark:text-blue-400">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-[var(--foreground)] mb-1">
            {documents.length === 0 ? "Belum Ada Dokumen dalam Arsip" : "Tidak Ada Dokumen yang Cocok"}
          </h3>
          <p className="text-xs text-[var(--muted)] max-w-md mx-auto mb-6 leading-relaxed">
            {documents.length === 0
              ? "Unggah berkas silsilah seperti Akta Lahir, Surat Nikah, Kartu Keluarga (KK), atau ijazah keluarga agar terdata rapi."
              : "Coba ubah kata kunci pencarian atau filter kategori dokumen."}
          </p>
          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Unggah Dokumen Sekarang</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => {
            const docUrl = getMediaUrl(doc.storage_path);
            const linkedPerson = doc.person_media?.[0]?.person;
            const badge = getFileBadge(doc.mime_type, doc.storage_path);
            const BadgeIcon = badge.icon;
            const isImage = doc.mime_type?.startsWith("image/") || ["jpg", "png", "webp"].some((ext) => doc.storage_path.endsWith(ext));
            const isPdf = doc.mime_type?.includes("pdf") || doc.storage_path.endsWith(".pdf");

            return (
              <div
                key={doc.id}
                className="group p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${badge.colorClass}`}>
                        <BadgeIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase border ${badge.colorClass}`}>
                          {badge.label}
                        </span>
                        <div className="text-[11px] text-[var(--muted)] mt-0.5">
                          {doc.file_size_bytes ? formatBytes(doc.file_size_bytes) : "—"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      {(isPdf || isImage) && (
                        <button
                          type="button"
                          onClick={() => setActivePreviewDoc(doc)}
                          className="p-1.5 rounded-lg hover:bg-[var(--subtle)] text-[var(--muted)] hover:text-blue-600 transition-colors"
                          title="Pratinjau Dokumen"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <a
                        href={docUrl}
                        download={doc.title || "dokumen"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-[var(--subtle)] text-[var(--muted)] hover:text-blue-600 transition-colors"
                        title="Unduh Berkas"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteDocument(doc)}
                        disabled={deletingId === doc.id}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-[var(--muted)] hover:text-red-600 transition-colors"
                        title="Hapus Dokumen"
                      >
                        {deletingId === doc.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <h3
                    className="text-sm font-semibold text-[var(--foreground)] line-clamp-1 mb-1"
                    title={doc.title || "Tanpa Judul"}
                  >
                    {doc.title || "Tanpa Judul"}
                  </h3>

                  {doc.description && (
                    <p className="text-xs text-[var(--muted)] line-clamp-2 mb-3 leading-relaxed">
                      {doc.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-[11px]">
                  {linkedPerson ? (
                    <Link
                      href={`/people/${linkedPerson.id}`}
                      className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline font-medium truncate max-w-[70%]"
                    >
                      <User className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">
                        {linkedPerson.display_name || linkedPerson.full_name}
                      </span>
                    </Link>
                  ) : (
                    <span className="text-[var(--muted)]">Dokumen Keluarga</span>
                  )}

                  <span className="text-[var(--muted)] flex-shrink-0">
                    {new Date(doc.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ──────── MODAL UNGGAH DOKUMEN ──────── */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--foreground)]">
                    Unggah Dokumen ke Arsip
                  </h3>
                  <p className="text-xs text-[var(--muted)]">
                    Mendukung PDF, Word, Excel, scan Akta, KK, dll
                  </p>
                </div>
              </div>
              <button
                onClick={closeUploadModal}
                disabled={uploading}
                className="p-1.5 rounded-xl hover:bg-[var(--subtle)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Dropzone File Dokumen */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                    e.target.value = "";
                  }}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-500/5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <FileCheck2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[var(--foreground)] truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-[11px] text-[var(--muted)]">
                          {formatBytes(selectedFile.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold hover:bg-[var(--subtle)] text-[var(--foreground)] flex-shrink-0"
                    >
                      Ganti Berkas
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[var(--border)] hover:border-blue-500 rounded-2xl p-6 sm:p-8 text-center cursor-pointer bg-[var(--subtle)] hover:bg-blue-500/5 transition-all"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center mx-auto mb-3">
                      <FileText className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-[var(--foreground)] mb-1">
                      Klik untuk memilih file dokumen
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      PDF, DOCX, XLSX, atau scan foto Akta/KK (hingga 30 MB)
                    </p>
                  </div>
                )}
              </div>

              {/* Input Judul Dokumen */}
              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  Judul Dokumen *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Contoh: Akta Kelahiran Ahmad Dahlan"
                  className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--foreground)] focus:ring-2 focus:ring-blue-500/30 focus:outline-hidden"
                />
              </div>

              {/* Pilihan Kategori */}
              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  Jenis / Kategori Dokumen
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--foreground)] focus:ring-2 focus:ring-blue-500/30 focus:outline-hidden cursor-pointer"
                >
                  {DOCUMENT_CATEGORIES.filter((c) => c !== "Semua Kategori").map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Hubungkan ke Anggota */}
              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  Terkait Anggota Keluarga (Opsional)
                </label>
                <select
                  value={formPersonId}
                  onChange={(e) => setFormPersonId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--foreground)] focus:ring-2 focus:ring-blue-500/30 focus:outline-hidden cursor-pointer"
                >
                  <option value="">— Dokumen Umum Keluarga —</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.display_name || p.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tanggal & Deskripsi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                    Tanggal Dokumen / Penerbitan
                  </label>
                  <input
                    type="date"
                    value={formTakenAt}
                    onChange={(e) => setFormTakenAt(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--foreground)] focus:ring-2 focus:ring-blue-500/30 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                    Nomor Surat / Keterangan
                  </label>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Contoh: No. 123/DISDUK/2005..."
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--foreground)] focus:ring-2 focus:ring-blue-500/30 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Tombol Aksi Modal */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={closeUploadModal}
                  disabled={uploading}
                  className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-medium text-[var(--foreground)] hover:bg-[var(--subtle)] transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Mengunggah...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Simpan Dokumen</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────── MODAL PRATINJAU DOKUMEN (PDF & GAMBAR) ──────── */}
      {activePreviewDoc && (
        <div
          onClick={() => setActivePreviewDoc(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full h-[85vh] flex flex-col rounded-3xl overflow-hidden bg-[var(--surface)] border border-[var(--border)] shadow-2xl"
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)] bg-[var(--surface)]">
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)] truncate max-w-md">
                  {activePreviewDoc.title || "Dokumen"}
                </h3>
                {activePreviewDoc.person_media?.[0]?.person && (
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    {activePreviewDoc.person_media[0].person.display_name ||
                      activeLightboxPerson(activePreviewDoc)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={getMediaUrl(activePreviewDoc.storage_path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] text-xs font-medium hover:bg-[var(--subtle)] text-[var(--foreground)] transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Tab Baru</span>
                </a>
                <a
                  href={getMediaUrl(activePreviewDoc.storage_path)}
                  download={activePreviewDoc.title || "dokumen"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh</span>
                </a>
                <button
                  onClick={() => setActivePreviewDoc(null)}
                  className="p-1.5 rounded-xl hover:bg-[var(--subtle)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Frame */}
            <div className="flex-1 bg-slate-900 flex items-center justify-center overflow-hidden">
              {activePreviewDoc.mime_type?.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getMediaUrl(activePreviewDoc.storage_path)}
                  alt="Dokumen"
                  className="max-h-full max-w-full object-contain p-4"
                />
              ) : (
                <iframe
                  src={getMediaUrl(activePreviewDoc.storage_path)}
                  className="w-full h-full border-none"
                  title="Pratinjau Dokumen"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function activeLightboxPerson(doc: MediaWithPerson): string {
  return doc.person_media?.[0]?.person?.full_name || "";
}
