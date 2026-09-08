// Utility kompresi gambar di sisi klien (Browser HTML5 Canvas)
// Mengoptimalkan foto profil sebelum diunggah ke Supabase Storage

export interface CompressedImageResult {
  file: File;
  previewUrl: string;
  originalSize: number;
  compressedSize: number;
  savedPercentage: number;
  width: number;
  height: number;
}

export interface CompressOptions {
  maxDimension?: number; // Default 1200px (Sangat cukup & tajam untuk portrait silsilah)
  targetMaxSizeBytes?: number; // Target maksimal ~1MB (1024 * 1024)
  initialQuality?: number; // Default 0.85
  mimeType?: "image/jpeg" | "image/webp";
}

/** Format ukuran bytes ke label yang mudah dibaca (KB / MB) */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Kompres file gambar secara otomatis di browser menggunakan HTML5 Canvas
 * @param file File gambar mentah dari input pengguna
 * @param options Opsi resolusi dan batas ukuran
 */
export async function compressImage(
  file: File,
  options?: CompressOptions
): Promise<CompressedImageResult> {
  const maxDimension = options?.maxDimension || 1200;
  const targetMaxSizeBytes = options?.targetMaxSizeBytes || 1024 * 1024; // 1 MB
  let quality = options?.initialQuality ?? 0.85;
  const mimeType = options?.mimeType || "image/jpeg";

  return new Promise((resolve, reject) => {
    // 1. Baca file gambar menggunakan Image element
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // 2. Skala proporsional jika resolusi melebihi batas maksimum
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      // 3. Render ke Canvas dengan high quality smoothing
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Gagal menginisialisasi Canvas rendering context"));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Gambar background putih jika PNG transparan diubah ke JPEG
      if (mimeType === "image/jpeg") {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(img, 0, 0, width, height);

      // 4. Konversi ke Blob dengan iterasi kualitas jika masih > targetMaxSizeBytes
      const getBlobAtQuality = (q: number): Promise<Blob | null> => {
        return new Promise((res) => {
          canvas.toBlob((b) => res(b), mimeType, q);
        });
      };

      let blob = await getBlobAtQuality(quality);
      if (!blob) {
        reject(new Error("Gagal mengompres gambar"));
        return;
      }

      // Jika ukuran masih di atas target 1MB, turunkan kualitas secara bertahap
      while (blob.size > targetMaxSizeBytes && quality > 0.5) {
        quality -= 0.1;
        const smallerBlob = await getBlobAtQuality(quality);
        if (smallerBlob) {
          blob = smallerBlob;
        } else {
          break;
        }
      }

      // 5. Buat File baru dari hasil kompresi
      const fileExt = mimeType === "image/webp" ? "webp" : "jpg";
      const cleanBaseName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
      const compressedFileName = `${cleanBaseName || "foto"}_compressed.${fileExt}`;

      const compressedFile = new File([blob], compressedFileName, {
        type: mimeType,
        lastModified: Date.now(),
      });

      const previewUrl = URL.createObjectURL(blob);
      const savedPercentage = Math.max(
        0,
        Math.round(((file.size - blob.size) / file.size) * 100)
      );

      resolve({
        file: compressedFile,
        previewUrl,
        originalSize: file.size,
        compressedSize: blob.size,
        savedPercentage,
        width,
        height,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Format gambar tidak didukung atau file rusak"));
    };

    img.src = objectUrl;
  });
}
