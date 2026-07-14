"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/Status";
import { useReconStore } from "@/store/recon-store";
import { canAccessAccount } from "@/lib/access";
import type { ReconStatus, Role } from "@/lib/types";
import { formatCurrency, formatDateTime, roleLabel } from "@/lib/utils";

function queueStatusesFor(role: Role): ReconStatus[] {
  switch (role) {
    case "approver":
      return ["pending_approver"];
    case "reviewer":
      return ["pending_reviewer"];
    case "finance":
      return ["pending_finance", "query"];
    case "inputter":
      return ["rejected", "query", "draft"];
    case "admin":
      return [
        "pending_approver",
        "pending_reviewer",
        "pending_finance",
        "query",
        "rejected",
      ];
    default:
      return [];
  }
}

export default function QueuePage() {
  const currentUser = useReconStore((s) => s.currentUser);
  const reconciliations = useReconStore((s) => s.reconciliations);
  const accounts = useReconStore((s) => s.accounts);
  const branches = useReconStore((s) => s.branches);
  const isReadOnlyRole = useReconStore((s) => s.isReadOnlyRole);
  const workflowAction = useReconStore((s) => s.workflowAction);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  const role = currentUser?.role ?? "inquiry";
  const statuses = queueStatusesFor(role);

  const queue = useMemo(() => {
    return reconciliations
      .filter((r) => statuses.includes(r.status))
      .map((r) => {
        const account = accounts.find((a) => a.id === r.accountId);
        if (!account || !canAccessAccount(currentUser, account)) return null;
        const branch = branches.find((b) => b.id === account.branchId);
        return { r, account, branch };
      })
      .filter(Boolean) as Array<{
      r: (typeof reconciliations)[0];
      account: (typeof accounts)[0];
      branch: (typeof branches)[0] | undefined;
    }>;
  }, [reconciliations, accounts, branches, statuses, currentUser]);

  const selected = queue.find((q) => q.r.id === selectedId) ?? queue[0];
  const activeId = selected?.r.id;

  if (role === "inquiry") {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <h1 className="font-[family-name:var(--font-outfit)] text-2xl font-semibold">
          Queue unavailable
        </h1>
        <p className="mt-2 text-[var(--ink-secondary)]">
          Inquiry users have view-only access. Use Reconciliations or Audit instead.
        </p>
        <Link href="/recon" className="mt-4 inline-block text-[var(--pab-red)]">
          Browse reconciliations
        </Link>
      </div>
    );
  }

  const actions = (() => {
    if (role === "approver" || role === "admin") {
      if (selected?.r.status === "pending_approver") {
        return [
          { action: "approve" as const, label: "Approve", variant: "primary" as const },
          { action: "reject" as const, label: "Reject", variant: "danger" as const },
        ];
      }
    }
    if (role === "reviewer" || role === "admin") {
      if (selected?.r.status === "pending_reviewer") {
        return [
          { action: "review" as const, label: "Confirm & forward", variant: "primary" as const },
          { action: "return" as const, label: "Return", variant: "secondary" as const },
        ];
      }
    }
    if (role === "finance" || role === "admin") {
      if (selected?.r.status === "pending_finance" || selected?.r.status === "query") {
        return [
          {
            action: "acknowledge" as const,
            label: "Acknowledge & close",
            variant: "primary" as const,
          },
          { action: "query" as const, label: "Raise query", variant: "soft" as const },
          { action: "return" as const, label: "Return", variant: "secondary" as const },
        ];
      }
    }
    return [];
  })();

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-outfit)] text-[28px] font-semibold tracking-tight">
          Queue
        </h1>
        <p className="mt-1 text-[15px] text-[var(--ink-secondary)]">
          {roleLabel(role)} · {queue.length} item{queue.length === 1 ? "" : "s"} awaiting action
        </p>
      </div>

      <div className="grid min-h-[520px] overflow-hidden rounded-[20px] border border-[var(--hairline)] bg-white lg:grid-cols-[320px_1fr]">
        <div className="border-r border-[var(--hairline)]">
          <div className="border-b border-[var(--hairline)] px-4 py-3 text-xs font-medium uppercase tracking-wide text-[var(--ink-tertiary)]">
            Inbox
          </div>
          <ul className="scrollbar-thin max-h-[560px] overflow-auto">
            {queue.map(({ r, account, branch }) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(r.id);
                    setComment("");
                  }}
                  className={`w-full border-b border-[var(--hairline)] px-4 py-3 text-left transition ${
                    activeId === r.id ? "bg-[var(--pab-red-soft)]/60" : "hover:bg-black/[0.02]"
                  }`}
                >
                  <p className="truncate text-sm font-semibold">{account.name}</p>
                  <p className="truncate text-xs text-[var(--ink-tertiary)]">
                    {branch?.name}
                  </p>
                  <div className="mt-1.5">
                    <StatusPill status={r.status} />
                  </div>
                </button>
              </li>
            ))}
            {queue.length === 0 && (
              <li className="px-4 py-16 text-center text-sm text-[var(--ink-tertiary)]">
                Your queue is empty.
              </li>
            )}
          </ul>
        </div>

        <div className="flex flex-col p-6">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center text-sm text-[var(--ink-tertiary)]">
              Select an item to review
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-[family-name:var(--font-outfit)] text-xl font-semibold">
                    {selected.account.name}
                  </h2>
                  <p className="text-sm text-[var(--ink-secondary)]">
                    {selected.account.number} · {selected.branch?.name}
                  </p>
                  <div className="mt-2">
                    <StatusPill status={selected.r.status} />
                  </div>
                </div>
                <Link
                  href={`/recon/${selected.r.id}`}
                  className="text-sm font-medium text-[var(--pab-red)]"
                >
                  Open workspace →
                </Link>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <Stat label="Recon balance" value={formatCurrency(selected.r.reconBalance)} />
                <Stat label="GL balance" value={formatCurrency(selected.account.glBalance)} />
                <Stat
                  label="Submitted"
                  value={
                    selected.r.submittedAt
                      ? formatDateTime(selected.r.submittedAt)
                      : "—"
                  }
                />
              </div>

              <div className="mt-6 flex-1">
                <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--ink-tertiary)]">
                  Comments
                </h3>
                <ul className="mt-2 max-h-48 space-y-2 overflow-auto">
                  {selected.r.comments.map((c) => (
                    <li
                      key={c.id}
                      className="rounded-xl bg-[var(--surface-secondary)] px-3 py-2 text-sm"
                    >
                      <span className="font-medium capitalize">{c.action}</span>
                      <span className="text-[var(--ink-tertiary)]"> · {c.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {!isReadOnlyRole() && actions.length > 0 && (
                <div className="mt-6 border-t border-[var(--hairline)] pt-4">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Mandatory comment…"
                    className="h-24 w-full rounded-xl border border-[var(--hairline)] p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--pab-red)]"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {actions.map((a) => (
                      <Button
                        key={a.action}
                        variant={a.variant}
                        onClick={async () => {
                          await workflowAction(selected.r.id, a.action, comment);
                          setComment("");
                        }}
                      >
                        {a.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[var(--surface-secondary)] px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-[var(--ink-tertiary)]">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
