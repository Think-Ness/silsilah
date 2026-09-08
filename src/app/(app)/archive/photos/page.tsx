import { getAllMedia } from "@/lib/genealogy/media";
import { getMediaUrl } from "@/lib/genealogy/media";
import Link from "next/link";

export const metadata = {
  title: "Arsip Foto | Silsilah Keluarga",
};

export default async function PhotosPage() {
  const photos = await getAllMedia({ media_type: "photo" });

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Arsip Foto</h1>
        <p className="page-subtitle">{photos.length} foto dalam arsip keluarga</p>
      </div>

      {photos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">Belum ada foto</div>
          <p className="empty-state-description">
            Foto dapat ditambahkan melalui profil anggota keluarga.
          </p>
          <Link
            href="/people"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              fontSize: "13px",
              textDecoration: "none",
              color: "var(--foreground)",
            }}
          >
            Lihat Anggota
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "12px",
          }}
          className="sm:grid-cols-2 md:grid-cols-3"
        >
          {photos.map((photo) => (
            <div
              key={photo.id}
              style={{
                background: "var(--subtle)",
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
                border: "1px solid var(--border)",
                aspectRatio: "1 / 1",
                position: "relative",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getMediaUrl(photo.storage_path)}
                alt={photo.title || "Foto keluarga"}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
                loading="lazy"
              />
              {photo.title && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "linear-gradient(to top, rgba(0,0,0,0.5), transparent)",
                    padding: "12px 10px 8px",
                  }}
                >
                  <p style={{ fontSize: "12px", color: "#fff", margin: 0 }}>{photo.title}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
