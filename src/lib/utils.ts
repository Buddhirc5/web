import type { AgingBucket, RagStatus, ReconStatus, Role } from "./types";

export function delay(ms = 280): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function agingBucket(days: number): AgingBucket {
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

export function statusLabel(status: ReconStatus): string {
  const map: Record<ReconStatus, string> = {
    draft: "Draft",
    pending_approver: "Pending Approver",
    pending_reviewer: "Pending Reviewer",
    pending_finance: "Pending Finance",
    query: "Finance Query",
    closed: "Closed",
    rejected: "Rejected",
  };
  return map[status];
}

export function roleLabel(role: Role): string {
  const map: Record<Role, string> = {
    inputter: "Branch Inputter",
    approver: "Branch Approver",
    reviewer: "Branch Reviewer",
    finance: "Finance Reviewer",
    inquiry: "Inquiry",
    admin: "Administrator",
  };
  return map[role];
}

export function ragForRecon(status: ReconStatus, overdue: boolean): RagStatus {
  if (status === "closed") return "green";
  if (overdue || status === "rejected" || status === "query") return "red";
  return "amber";
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
