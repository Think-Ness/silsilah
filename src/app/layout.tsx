import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Silsilah Keluarga",
  description: "Dokumentasi, pengelolaan, dan visualisasi silsilah keluarga secara digital.",
  keywords: ["silsilah", "genealogi", "keluarga", "family tree"],
  openGraph: {
    title: "Silsilah Keluarga",
    description: "Arsip genealogis keluarga yang terstruktur dan dapat berkembang seiring waktu.",
    type: "website",
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
          <Toaster position="bottom-right" />
        </QueryProvider>
      </body>
    </html>
  );
}
