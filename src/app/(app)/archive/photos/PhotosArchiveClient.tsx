"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  Upload,
  Image as ImageIcon,
  Search,
  Filter,
  Eye,
  Download,
  Trash2,
  X,
  User,
  Calendar,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import {
  uploadMedia,
  deleteMediaById,
  getMediaUrl,
  type MediaWithPerson,
} from "@/lib/genealogy/media";
import { compressImage, formatBytes, type CompressedImageResult } from "@/lib/utils/image-compression";
import type { PersonWithPortrait } from "@/types/genealogy";
import { toast } from "sonner";
import { useCurrentUser } from "@/context/UserRoleContext";

interface PhotosArchiveClientProps {
  initialPhotos: MediaWithPerson[];
  people: PersonWithPortrait[];
}

export function PhotosArchiveClient({
  initialPhotos,
  people,
}: PhotosArchiveClientProps) {
  const { canUpload } = useCurrentUser();
  const [photos, setPhotos] = useState<MediaWithPerson[]>(initialPhotos);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPersonFilter, setSelectedPersonFilter] = useState<string>("all");

  // Modal Upload State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [compressionResult, setCompressionResult] = useState<CompressedImageResult | null>(null);
  const [uploading, setUploading] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPersonId, setFormPersonId] = useState("");
  const [formTakenAt, setFormTakenAt] = useState("");
  const [isPrimaryPortrait, setIsPrimaryPortrait] = useState(false);

  // Lightbox State
  const [activeLightboxPhoto, setActiveLightboxPhoto] = useState<MediaWithPerson | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file select & compress
  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Hanya file gambar (JPG, PNG, WebP) yang didukung");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("Ukuran file terlalu besar (maksimal 20 MB)");
      return;
    }

    try {
      setCompressing(true);
      const result = await compressImage(file, {
        maxDimension: 1600,
        targetMaxSizeBytes: 1024 * 1024, // 1 MB
        initialQuality: 0.85,
        mimeType: "image/jpeg",
      });

      setSelectedFile(result.file);
      setPreviewUrl(result.previewUrl);
      setCompressionResult(result);

      if (!formTitle) {
        // Auto fill title from filename without extension
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ");
        setFormTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }

      toast.success(
        `Gambar dioptimalkan: ${formatBytes(result.originalSize)} → ${formatBytes(result.compressedSize)}`
      );
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal mengompres gambar");
    } finally {
      setCompressing(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Pilih file foto terlebih dahulu");
      return;
    }

    setUploading(true);
    try {
      const media = await uploadMedia(selectedFile, {
        title: formTitle.trim() || selectedFile.name,
        description: formDescription.trim() || undefined,
        mediaType: "photo",
        takenAt: formTakenAt || undefined,
        personId: formPersonId || undefined,
        role: isPrimaryPortrait ? "portrait" : "family_photo",
        isPrimaryPortrait,
      });

      // Cari relasi person jika dipilih
      const selectedPerson = people.find((p) => p.id === formPersonId);
      const newMediaItem: MediaWithPerson = {
        ...media,
        person_media: selectedPerson
          ? [
              {
                id: `temp-${Date.now()}`,
                person_id: selectedPerson.id,
                media_id: media.id,
                role: isPrimaryPortrait ? "portrait" : "family_photo",
                is_primary_portrait: isPrimaryPortrait,
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

      setPhotos((prev) => [newMediaItem, ...prev]);
      toast.success("Foto berhasil diunggah ke arsip!");
      closeUploadModal();
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err?.message || "Gagal mengunggah foto");
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photo: MediaWithPerson) => {
    if (!confirm(`Hapus foto "${photo.title || "Tanpa Judul"}" dari arsip?`)) {
      return;
    }

    setDeletingId(photo.id);
    try {
      await deleteMediaById(photo.id, photo.storage_path);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      if (activeLightboxPhoto?.id === photo.id) {
        setActiveLightboxPhoto(null);
      }
      toast.success("Foto berhasil dihapus");
    } catch (err: any) {
      console.error("Delete error:", err);
      toast.error(err?.message || "Gagal menghapus foto");
    } finally {
      setDeletingId(null);
    }
  };

  const closeUploadModal = () => {
    setIsUploadOpen(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setCompressionResult(null);
    setFormTitle("");
    setFormDescription("");
    setFormPersonId("");
    setFormTakenAt("");
    setIsPrimaryPortrait(false);
  };

  // Filtered photos
  const filteredPhotos = photos.filter((photo) => {
    const matchesSearch =
      !searchQuery ||
      photo.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      photo.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      photo.person_media?.some((pm) =>
        (pm.person?.display_name || pm.person?.full_name || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      );

    const matchesPerson =
      selectedPersonFilter === "all" ||
      photo.person_media?.some((pm) => pm.person_id === selectedPersonFilter);

    return matchesSearch && matchesPerson;
  });

  return (
    <div className="page-content">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <ImageIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Arsip Foto Keluarga
          </h1>
          <p className="page-subtitle">
            {photos.length} foto tersimpan dalam arsip silsilah keluarga
          </p>
        </div>

        {canUpload && (
          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-all duration-200 cursor-pointer active:scale-98"
          >
            <Upload className="w-4 h-4" />
            <span>Unggah Foto</span>
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
            placeholder="Cari foto berdasarkan judul, anggota keluarga..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
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

        {/* Filter per Anggota */}
        {people.length > 0 && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-[var(--muted)] flex-shrink-0" />
            <select
              value={selectedPersonFilter}
              onChange={(e) => setSelectedPersonFilter(e.target.value)}
              className="w-full sm:w-56 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--foreground)] focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
            >
              <option value="all">Semua Anggota ({photos.length})</option>
              {people.map((person) => {
                const count = photos.filter((p) =>
                  p.person_media?.some((pm) => pm.person_id === person.id)
                ).length;
                return (
                  <option key={person.id} value={person.id}>
                    {person.display_name || person.full_name} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>

      {/* Grid Foto */}
      {filteredPhotos.length === 0 ? (
        <div className="empty-state p-8 sm:p-12 text-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mx-auto mb-4 text-emerald-600 dark:text-emerald-400">
            <ImageIcon className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-[var(--foreground)] mb-1">
            {photos.length === 0 ? "Belum Ada Foto dalam Arsip" : "Tidak Ada Foto yang Cocok"}
          </h3>
          <p className="text-xs text-[var(--muted)] max-w-md mx-auto mb-6 leading-relaxed">
            {photos.length === 0
              ? "Unggah foto personel atau dokumentasi keluarga untuk mengabadikan momen silsilah zuriat."
              : "Coba ubah kata kunci pencarian atau filter anggota keluarga."}
          </p>
          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Unggah Foto Sekarang</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {filteredPhotos.map((photo) => {
            const photoUrl = getMediaUrl(photo.storage_path);
            const linkedPerson = photo.person_media?.[0]?.person;
            const isPortrait = photo.person_media?.[0]?.is_primary_portrait;

            return (
              <div
                key={photo.id}
                className="group relative rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--surface)] shadow-xs hover:shadow-md transition-all duration-300 flex flex-col"
              >
                {/* Image Container */}
                <div
                  onClick={() => setActiveLightboxPhoto(photo)}
                  className="aspect-square relative w-full overflow-hidden bg-[var(--subtle)] cursor-pointer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoUrl}
                    alt={photo.title || "Foto keluarga"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* Badges Overlay */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                    {isPortrait && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-600/90 backdrop-blur-xs text-[10px] font-semibold text-white shadow-xs">
                        Foto Profil
                      </span>
                    )}
                  </div>

                  {/* Hover Overlay Buttons */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveLightboxPhoto(photo);
                      }}
                      className="p-2 rounded-xl bg-white/90 hover:bg-white text-slate-800 shadow-sm transition-transform active:scale-95"
                      title="Lihat Pratinjau Penuh"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <a
                      href={photoUrl}
                      download={photo.title || "foto-keluarga"}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 rounded-xl bg-white/90 hover:bg-white text-slate-800 shadow-sm transition-transform active:scale-95"
                      title="Unduh Foto"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePhoto(photo);
                      }}
                      disabled={deletingId === photo.id}
                      className="p-2 rounded-xl bg-red-600/90 hover:bg-red-600 text-white shadow-sm transition-transform active:scale-95"
                      title="Hapus Foto"
                    >
                      {deletingId === photo.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Info Card */}
                <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h4
                      className="text-xs font-semibold text-[var(--foreground)] truncate"
                      title={photo.title || "Tanpa Judul"}
                    >
                      {photo.title || "Tanpa Judul"}
                    </h4>

                    {linkedPerson ? (
                      <Link
                        href={`/people/${linkedPerson.id}`}
                        className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline mt-1 truncate max-w-full font-medium"
                      >
                        <User className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">
                          {linkedPerson.display_name || linkedPerson.full_name}
                        </span>
                      </Link>
                    ) : (
                      <span className="text-[11px] text-[var(--muted)] mt-1 block">
                        Arsip Umum
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[var(--muted)] mt-2 pt-2 border-t border-[var(--border)]">
                    <span>
                      {photo.file_size_bytes ? formatBytes(photo.file_size_bytes) : "—"}
                    </span>
                    <span>
                      {new Date(photo.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ──────── MODAL UNGGAH FOTO ──────── */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--foreground)]">
                    Unggah Foto ke Arsip
                  </h3>
                  <p className="text-xs text-[var(--muted)]">
                    Otomatis dikompres ke ukuran optimal (~1 MB)
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
              {/* Dropzone / Image Picker */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                    e.target.value = "";
                  }}
                  className="hidden"
                />

                {previewUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--subtle)] aspect-video flex items-center justify-center group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Pratinjau Foto"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading || compressing}
                        className="px-3 py-1.5 rounded-xl bg-white text-slate-800 text-xs font-semibold shadow-xs"
                      >
                        Ganti Foto
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => !compressing && fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[var(--border)] hover:border-emerald-500 rounded-2xl p-6 sm:p-8 text-center cursor-pointer bg-[var(--subtle)] hover:bg-emerald-500/5 transition-all"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-[var(--foreground)] mb-1">
                      Klik untuk memilih foto
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      Mendukung file JPG, PNG, atau WebP (hingga 20 MB)
                    </p>
                  </div>
                )}

                {/* Status Kompresi */}
                {compressionResult && (
                  <div className="mt-2.5 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                    <span>
                      Dikompres: {formatBytes(compressionResult.originalSize)} →{" "}
                      {formatBytes(compressionResult.compressedSize)} (-
                      {compressionResult.savedPercentage}%)
                    </span>
                  </div>
                )}
              </div>

              {/* Input Judul */}
              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  Judul Foto *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Contoh: Foto Pernikahan Kakek dan Nenek"
                  className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--foreground)] focus:ring-2 focus:ring-emerald-500/30 focus:outline-hidden"
                />
              </div>

              {/* Hubungkan ke Anggota */}
              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  Terkait Anggota Keluarga (Opsional)
                </label>
                <select
                  value={formPersonId}
                  onChange={(e) => setFormPersonId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--foreground)] focus:ring-2 focus:ring-emerald-500/30 focus:outline-hidden cursor-pointer"
                >
                  <option value="">— Tidak terhubung ke anggota tertentu (Arsip Umum) —</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.display_name || p.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Jadikan Foto Profil Utama */}
              {formPersonId && (
                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-[var(--border)] bg-[var(--subtle)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPrimaryPortrait}
                    onChange={(e) => setIsPrimaryPortrait(e.target.checked)}
                    className="rounded border-[var(--border)] text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span className="text-xs text-[var(--foreground)] font-medium">
                    Jadikan ini sebagai Foto Profil utama anggota terpilih
                  </span>
                </label>
              )}

              {/* Tanggal & Deskripsi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                    Tanggal Foto Diambil (Opsional)
                  </label>
                  <input
                    type="date"
                    value={formTakenAt}
                    onChange={(e) => setFormTakenAt(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--foreground)] focus:ring-2 focus:ring-emerald-500/30 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                    Keterangan Singkat (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Lokasi atau catatan foto..."
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--foreground)] focus:ring-2 focus:ring-emerald-500/30 focus:outline-hidden"
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
                  disabled={uploading || compressing || !selectedFile}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Mengunggah...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Simpan ke Arsip</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────── LIGHTBOX MODAL ──────── */}
      {activeLightboxPhoto && (
        <div
          onClick={() => setActiveLightboxPhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col rounded-3xl overflow-hidden bg-[var(--surface)] border border-[var(--border)] shadow-2xl"
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)] bg-[var(--surface)]">
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)] truncate max-w-md">
                  {activeLightboxPhoto.title || "Foto Keluarga"}
                </h3>
                {activeLightboxPhoto.person_media?.[0]?.person && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    {activeLightboxPhoto.person_media[0].person.display_name ||
                      activeLightboxPhoto.person_media[0].person.full_name}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={getMediaUrl(activeLightboxPhoto.storage_path)}
                  download={activeLightboxPhoto.title || "foto"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] text-xs font-medium hover:bg-[var(--subtle)] text-[var(--foreground)] transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Unduh</span>
                </a>
                <button
                  onClick={() => setActiveLightboxPhoto(null)}
                  className="p-1.5 rounded-xl hover:bg-[var(--subtle)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Photo View */}
            <div className="flex-1 bg-black/95 flex items-center justify-center p-4 overflow-hidden min-h-[300px] max-h-[60vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getMediaUrl(activeLightboxPhoto.storage_path)}
                alt={activeLightboxPhoto.title || "Foto"}
                className="max-h-full max-w-full object-contain rounded-lg"
              />
            </div>

            {/* Description & Footer */}
            {activeLightboxPhoto.description && (
              <div className="px-5 py-3 border-t border-[var(--border)] text-xs text-[var(--muted)]">
                {activeLightboxPhoto.description}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
