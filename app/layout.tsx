import type { Metadata } from "next";
import { Anton, Inter } from "next/font/google";
import "./globals.css";
import { CursorGlow } from "@/components/CursorGlow";
import { FloatingCTA } from "@/components/FloatingCTA";

const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Flow Site · Barbería & Fragancias",
  description:
    "El Sitio Del Flow — barbería y venta de perfumes árabes en San José Obrero 993. Reservá tu turno online, lunes a lunes.",
  openGraph: {
    title: "Flow Site · Barbería & Fragancias",
    description:
      "Barbería con flow y fragancias árabes originales. Reservá tu turno online.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${anton.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-ink text-bone">
        {/* Si el visitante tiene JS desactivado, mostramos todo igual */}
        <noscript>
          <style>{`[style*="opacity:0"]{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
        <CursorGlow />
        {children}
        <FloatingCTA />
      </body>
    </html>
  );
}
