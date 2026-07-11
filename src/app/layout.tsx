import type { Metadata } from "next";
import { Anton, Inter } from "next/font/google";
import "./globals.css";
import { CursorGlow } from "@/components/CursorGlow";
import { FloatingCTA } from "@/components/FloatingCTA";
import { Toaster } from "@/shared/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/shared/lib/utils";

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
      suppressHydrationWarning
      className={cn("h-full antialiased", anton.variable, inter.variable, "font-sans")}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {/* Si el visitante tiene JS desactivado, mostramos todo igual */}
        <noscript>
          <style>{`[style*="opacity:0"]{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <CursorGlow />
          {children}
          <FloatingCTA />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
