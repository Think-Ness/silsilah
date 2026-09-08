"use client";

import { useState, useRef } from "react";
import { Camera, Trash2, Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { compressImage, formatBytes, type CompressedImageResult } from "@/lib/utils/image-compression";
import { toast } from "sonner";

export interface PhotoUploadState {
  file: File | null;
  previewUrl: string | null;
  isRemoved: boolean;
}

interface PersonPhotoUploadProps {
  currentPhotoUrl?: string | null;
  onChange: (state: PhotoUploadState) => void;
  disabled?: boolean;
}

export function PersonPhotoUpload({
  currentPhotoUrl,
  onChange,
  disabled = false,
}: PersonPhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [compressing, setCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<CompressedImageResult | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [isRemoved, setIsRemoved] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Preview aktif (foto baru > foto saat ini > null)
  const activePreview = !isRemoved ? (localPreview || currentPhotoUrl) : null;

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Hanya file gambar (JPG, PNG, WebP) yang didukung");
      return;
    }

    // Batasi file input maksimal 15MB sebelum dikompres
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Ukuran file terlalu besar (maksimal 15 MB)");
      return;
    }

    try {
      setCompressing(true);
      // Kompres otomatis ke resolusi optimal (max 1200px) dan ukuran target <= 1MB
      const result = await compressImage(file, {
        maxDimension: 1200,
        targetMaxSizeBytes: 1024 * 1024, // 1 MB
        initialQuality: 0.85,
        mimeType: "image/jpeg",
      });

      setCompressionInfo(result);
      setLocalPreview(result.previewUrl);
      setIsRemoved(false);

      onChange({
        file: result.file,
        previewUrl: result.previewUrl,
        isRemoved: false,
      });

      toast.success(
        `Foto berhasil dioptimalkan: ${formatBytes(result.originalSize)} → ${formatBytes(result.compressedSize)}`
      );
    } catch (err: any) {
      console.error("Gagal memproses gambar:", err);
      toast.error(err?.message || "Gagal mengompres gambar");
    } finally {
      setCompressing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset value agar event change bisa dipicu lagi jika memilih file sama
    e.target.value = "";
  };

  const handleRemovePhoto = () => {
    setLocalPreview(null);
    setCompressionInfo(null);
    setIsRemoved(true);
    onChange({
      file: null,
      previewUrl: null,
      isRemoved: true,
    });
    toast.info("Foto profil ditandai untuk dihapus");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !compressing) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || compressing) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
        {/* Avatar Box / Dropzone */}
        <div
          onClick={() => !disabled && !compressing && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative group w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden flex-shrink-0 cursor-pointer border-2 transition-all duration-200 ${
            isDragging
              ? "border-emerald-500 scale-105 shadow-lg ring-4 ring-emerald-500/20"
              : "border-dashed border-[var(--border)] hover:border-emerald-500/70 hover:shadow-md"
          } bg-[var(--subtle)] flex items-center justify-center`}
          title="Klik atau seret foto ke sini untuk mengunggah"
        >
          {activePreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activePreview}
              alt="Foto Profil"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-[var(--muted)] p-2 text-center">
              <Camera className="w-7 h-7 sm:w-8 sm:h-8 mb-1 text-[var(--muted)] group-hover:text-emerald-500 transition-colors" />
              <span className="text-[10px] font-medium leading-tight">Pilih Foto</span>
            </div>
          )}

          {/* Overlay Hover Saat Ada Foto */}
          {activePreview && !compressing && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-1">
              <Upload className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-medium">Ganti Foto</span>
            </div>
          )}

          {/* Loading Indicator Saat Kompresi Berlangsung */}
          {compressing && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white p-2 text-center">
              <Loader2 className="w-6 h-6 animate-spin mb-1 text-emerald-400" />
              <span className="text-[10px] font-medium">Mengompres...</span>
            </div>
          )}
        </div>

        {/* Action Controls & Keterangan */}
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-1.5">
              Foto Personel
              <span className="text-[11px] font-normal text-[var(--muted)]">(Opsional)</span>
            </h3>
            <p className="text-xs text-[var(--muted)] mt-0.5 leading-relaxed">
              Format JPG, PNG, atau WebP. Gambar otomatis dikompres ke ukuran optimal (~1 MB) agar hemat storage & cepat dimuat.
            </p>
          </div>

          {/* Status Kompresi */}
          {compressionInfo && !isRemoved && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span>
                Dikompres: {formatBytes(compressionInfo.originalSize)} → {formatBytes(compressionInfo.compressedSize)} (-{compressionInfo.savedPercentage}%)
              </span>
            </div>
          )}

          {isRemoved && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-medium animate-in fade-in">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Foto akan dihapus saat disimpan</span>
            </div>
          )}

          {/* Tombol Aksi */}
          <div className="flex items-center gap-2 pt-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              onChange={handleInputChange}
              className="hidden"
              disabled={disabled || compressing}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || compressing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--subtle)] text-xs font-medium text-[var(--foreground)] transition-colors cursor-pointer shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{activePreview ? "Ganti Foto" : "Unggah Foto"}</span>
            </button>

            {activePreview && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={disabled || compressing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-medium text-red-600 dark:text-red-400 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Foto</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
