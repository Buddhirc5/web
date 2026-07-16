"use client";

import { cn, statusLabel } from "@/lib/utils";
import type { RagStatus, ReconStatus } from "@/lib/types";

export function RagDot({ status, size = "md" }: { status: RagStatus; size?: "sm" | "md" }) {
  const colors = {
    green: "bg-[var(--green)]",
    amber: "bg-[var(--amber)]",
    red: "bg-[var(--red-rag)]",
  };
  return (
    <span
      className={cn(
        "inline-block rounded-full",
        colors[status],
        size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5"
      )}
      aria-label={status}
    />
  );
}

export function StatusPill({ status }: { status: ReconStatus }) {
  const styles: Record<ReconStatus, string> = {
    draft: "bg-black/5 text-[var(--ink-secondary)]",
    pending_approver: "bg-[#fff4e0] text-[#9a6700]",
    pending_reviewer: "bg-[#e8f0fe] text-[#1a56c4]",
    pending_finance: "bg-[#f3e8ff] text-[#6b21a8]",
    query: "bg-[#ffe8e6] text-[#b42318]",
    closed: "bg-[#e5f8ea] text-[#0e7a32]",
    rejected: "bg-[#ffe8e6] text-[#b42318]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0 text-[10px] font-medium leading-5",
        styles[status]
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "red" | "green" | "amber";
}) {
  const tones = {
    neutral: "bg-black/5 text-[var(--ink-secondary)]",
    red: "bg-[var(--pab-red-soft)] text-[var(--pab-red-deep)]",
    green: "bg-[#e5f8ea] text-[#0e7a32]",
    amber: "bg-[#fff4e0] text-[#9a6700]",
  };
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", tones[tone])}>
      {children}
    </span>
  );
}
