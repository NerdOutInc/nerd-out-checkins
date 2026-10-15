import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Nerd Out Check-ins" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=Atkinson+Hyperlegible:wght@400;700&family=JetBrains+Mono:wght@500&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
