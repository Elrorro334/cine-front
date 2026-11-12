import type { Metadata, Viewport } from "next";
import "./globals.css";
import ThemeStylesheetLoader from "@/components/public/ThemeStylesheetLoader";

export const viewport: Viewport = {
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "Cine Teatro Xilotzin | Cartelera y Boletos",
  description: "Consulta la cartelera actual, pre-ordena tus boletos y conoce más sobre el histórico Cine Teatro Xilotzin.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
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
      </body>
    </html>
  );
}
