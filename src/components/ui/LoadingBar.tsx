"use client";

import { useReconStore } from "@/store/recon-store";
import { cn } from "@/lib/utils";

export function LoadingBar() {
  const loading = useReconStore((s) => s.loading);
  return (
    <div
      className={cn(
        "pointer-events-none fixed left-0 right-0 top-0 z-[90] h-0.5 overflow-hidden bg-transparent transition-opacity duration-200",
        loading ? "opacity-100" : "opacity-0"
      )}
    >
      <div
        className={cn(
          "h-full bg-[var(--pab-red)] transition-transform duration-700",
          loading ? "w-full animate-pulse" : "w-0"
        )}
      />
    </div>
  );
}
