"use client";

import { useReconStore } from "@/store/recon-store";
import { cn } from "@/lib/utils";

export function ToastHost() {
  const toast = useReconStore((s) => s.toast);
  if (!toast) return null;
  const tone =
    toast.tone === "error"
      ? "bg-[#1c1c1e] text-white"
      : toast.tone === "info"
        ? "bg-[#1c1c1e] text-white"
        : "bg-[#1c1c1e] text-white";
  const accent =
    toast.tone === "error"
      ? "bg-[var(--red-rag)]"
      : toast.tone === "info"
        ? "bg-[var(--amber)]"
        : "bg-[var(--green)]";
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] -translate-x-1/2">
      <div
        className={cn(
          "animate-toast pointer-events-auto flex min-w-[260px] max-w-[420px] items-center gap-3 rounded-2xl px-4 py-3 shadow-[var(--shadow-soft)]",
          tone
        )}
      >
        <span className={cn("h-2 w-2 shrink-0 rounded-full", accent)} />
        <p className="text-sm font-medium tracking-tight">{toast.message}</p>
      </div>
    </div>
  );
}
