import type { Metadata, Viewport } from "next";
import "./globals.css";
import ThemeStylesheetLoader from "@/components/public/ThemeStylesheetLoader";
import PwaInstallPrompt from "@/components/public/PwaInstallPrompt";

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Cine Teatro Xilotzin | Cartelera y Boletos",
  description: "Consulta la cartelera actual, pre-ordena tus boletos y conoce más sobre el histórico Cine Teatro Xilotzin.",
  manifest: "/manifest.json",
  applicationName: "Cine Xilotzin",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Cine Xilotzin",
  },
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link
          id="theme-stylesheet"
          rel="stylesheet"
          href="/css/themes/classic.min.css"
        />
      </head>
      <body className="antialiased">
        <ThemeStylesheetLoader />
        {children}
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
