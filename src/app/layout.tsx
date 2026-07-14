import type { Metadata } from "next";
import { Manrope, Outfit } from "next/font/google";
import { ToastHost } from "@/components/ui/Toast";
import { LoadingBar } from "@/components/ui/LoadingBar";
import { StoreHydration } from "@/components/layout/StoreHydration";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Recon & Exhibit | Pan Asia Bank",
  description: "Pan Asia Banking Corporation — Reconciliation & Exhibit Platform POC",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${outfit.variable} h-full`}>
      <body className="min-h-full font-sans antialiased">
        <StoreHydration />
        <LoadingBar />
        {children}
        <ToastHost />
      </body>
    </html>
  );
}
