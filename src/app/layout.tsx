import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Toaster } from "@/components/ui/sonner";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL
  : process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Silsilah Keluarga - Bagan & Pohon Zuriat Digital",
    template: "%s | Silsilah Keluarga",
  },
  description: "Dokumentasi, pengelolaan, dan visualisasi silsilah keluarga secara digital dengan bagan keturunan yang interaktif.",
  keywords: ["silsilah", "genealogi", "keluarga", "family tree", "zuriat", "pohon keluarga"],
  authors: [{ name: "Silsilah Keluarga" }],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "Silsilah Keluarga - Dokumentasi, Bagan & Silsilah Zuriat Digital",
    description: "Visualisasi dan dokumentasi silsilah keluarga digital lengkap dengan bagan zuriat dan pohon silsilah interaktif.",
    url: "/",
    siteName: "Silsilah Keluarga",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Silsilah Keluarga - Dokumentasi, Bagan & Silsilah Zuriat Digital",
        type: "image/jpeg",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Silsilah Keluarga - Bagan & Silsilah Zuriat Digital",
    description: "Visualisasi dan dokumentasi silsilah keluarga digital lengkap dengan bagan zuriat dan pohon silsilah interaktif.",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <QueryProvider>
          {children}
          <Toaster position="top-right" closeButton richColors />
        </QueryProvider>
      </body>
    </html>
  );
}
