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

type QueueRow = {
  r: ReturnType<typeof useReconStore.getState>["reconciliations"][0];
  account: ReturnType<typeof useReconStore.getState>["accounts"][0];
  branch: ReturnType<typeof useReconStore.getState>["branches"][0] | undefined;
};

export default function QueuePage() {
  const currentUser = useReconStore((s) => s.currentUser);
  const reconciliations = useReconStore((s) => s.reconciliations);
  const accounts = useReconStore((s) => s.accounts);
  const branches = useReconStore((s) => s.branches);
  const isReadOnlyRole = useReconStore((s) => s.isReadOnlyRole);
  const workflowAction = useReconStore((s) => s.workflowAction);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [branchFocus, setBranchFocus] = useState<string | null>(null);
  const [branchSearch, setBranchSearch] = useState("");
  const [glSearch, setGlSearch] = useState("");

  const role = currentUser?.role ?? "inquiry";
  const statuses = queueStatusesFor(role);
  const useBranchFirst = role === "finance" || role === "admin";

  const queue = useMemo(() => {
    return reconciliations
      .filter((r) => statuses.includes(r.status))
      .map((r) => {
        const account = accounts.find((a) => a.id === r.accountId);
        if (!account || !canAccessAccount(currentUser, account)) return null;
        const branch = branches.find((b) => b.id === account.branchId);
        return { r, account, branch };
      })
      .filter(Boolean) as QueueRow[];
  }, [reconciliations, accounts, branches, statuses, currentUser]);

  const branchGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        branchId: string;
        branchName: string;
        branchCode: string;
        items: QueueRow[];
      }
    >();
    for (const row of queue) {
      const id = row.account.branchId;
      const existing = map.get(id);
      if (existing) {
        existing.items.push(row);
      } else {
        map.set(id, {
          branchId: id,
          branchName: row.branch?.name ?? id,
          branchCode: row.branch?.code ?? "",
          items: [row],
        });
      }
    }
    return [...map.values()].sort((a, b) =>
      a.branchName.localeCompare(b.branchName)
    );
  }, [queue]);

  const filteredBranchGroups = useMemo(() => {
    const q = branchSearch.trim().toLowerCase();
    if (!q) return branchGroups;
    return branchGroups.filter((g) =>
      `${g.branchName} ${g.branchCode}`.toLowerCase().includes(q)
    );
  }, [branchGroups, branchSearch]);

  const branchItems = useMemo(() => {
    if (!branchFocus) return [];
    const group = branchGroups.find((g) => g.branchId === branchFocus);
    if (!group) return [];
    const q = glSearch.trim().toLowerCase();
    if (!q) return group.items;
    return group.items.filter((row) => {
      const hay = `${row.account.name} ${row.account.number} ${row.account.glCode}`.toLowerCase();
      return hay.includes(q);
    });
  }, [branchFocus, branchGroups, glSearch]);

  const flatList = useBranchFirst
    ? branchFocus
      ? branchItems
      : []
    : queue;

  const selected =
    flatList.find((q) => q.r.id === selectedId) ??
    (useBranchFirst ? branchItems[0] : queue[0]);
  const activeId = selected?.r.id;
  const focusedBranch = branchGroups.find((g) => g.branchId === branchFocus);

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
      <div className="mb-3">
        <h1 className="font-[family-name:var(--font-outfit)] text-xl font-semibold tracking-tight">
          Queue
        </h1>
        <p className="text-xs text-[var(--ink-secondary)]">
          {roleLabel(role)} · {queue.length} item{queue.length === 1 ? "" : "s"}
          {useBranchFirst
            ? ` across ${branchGroups.length} branch${branchGroups.length === 1 ? "" : "es"}`
            : " awaiting action"}
        </p>
      </div>

      <div className="grid h-[calc(100vh-7rem)] overflow-hidden rounded-lg border border-[var(--hairline)] bg-white lg:grid-cols-[300px_1fr]">
        <div className="flex flex-col border-r border-[var(--hairline)]">
          {useBranchFirst && !branchFocus ? (
            <>
              <div className="border-b border-[var(--hairline)] px-3 py-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--ink-tertiary)]">
                  Branches
                </p>
                <input
                  value={branchSearch}
                  onChange={(e) => setBranchSearch(e.target.value)}
                  placeholder="Search branch…"
                  className="mt-1.5 h-7 w-full rounded-md border border-[var(--hairline)] px-2 text-xs outline-none focus:ring-2 focus:ring-[var(--pab-red)]"
                />
              </div>
              <ul className="scrollbar-thin flex-1 overflow-auto">
                {filteredBranchGroups.map((g) => (
                  <li key={g.branchId}>
                    <button
                      type="button"
                      onClick={() => {
                        setBranchFocus(g.branchId);
                        setSelectedId(null);
                        setGlSearch("");
                        setComment("");
                      }}
                      className="flex w-full items-center justify-between gap-2 border-b border-[var(--hairline)] px-3 py-1.5 text-left transition hover:bg-black/[0.02]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">{g.branchName}</p>
                        <p className="truncate text-[10px] text-[var(--ink-tertiary)]">
                          {g.branchCode}
                          {g.branchCode ? " · " : ""}
                          {g.items.length} GL{g.items.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-[var(--pab-red-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--pab-red-deep)]">
                        {g.items.length}
                      </span>
                    </button>
                  </li>
                ))}
                {filteredBranchGroups.length === 0 && (
                  <li className="px-3 py-10 text-center text-xs text-[var(--ink-tertiary)]">
                    {queue.length === 0
                      ? "Your queue is empty."
                      : "No branches match your search."}
                  </li>
                )}
              </ul>
            </>
          ) : (
            <>
              <div className="border-b border-[var(--hairline)] px-3 py-2">
                {useBranchFirst && focusedBranch ? (
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setBranchFocus(null);
                        setSelectedId(null);
                        setGlSearch("");
                      }}
                      className="text-[10px] font-medium text-[var(--pab-red)] hover:underline"
                    >
                      ← All branches
                    </button>
                    <p className="text-xs font-semibold">{focusedBranch.branchName}</p>
                    <p className="text-[10px] text-[var(--ink-tertiary)]">
                      {focusedBranch.items.length} GL
                      {focusedBranch.items.length === 1 ? "" : "s"} pending
                    </p>
                    {focusedBranch.items.length > 8 && (
                      <input
                        value={glSearch}
                        onChange={(e) => setGlSearch(e.target.value)}
                        placeholder="Search GL / account…"
                        className="h-7 w-full rounded-md border border-[var(--hairline)] px-2 text-xs outline-none focus:ring-2 focus:ring-[var(--pab-red)]"
                      />
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--ink-tertiary)]">
                    Inbox
                  </p>
                )}
              </div>
              <ul className="scrollbar-thin flex-1 overflow-auto">
                {flatList.map(({ r, account, branch }) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(r.id);
                        setComment("");
                      }}
                      className={`w-full border-b border-[var(--hairline)] px-3 py-1.5 text-left transition ${
                        activeId === r.id
                          ? "bg-[var(--pab-red-soft)]/60"
                          : "hover:bg-black/[0.02]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate text-xs font-semibold">{account.name}</p>
                        <StatusPill status={r.status} />
                      </div>
                      <p className="truncate text-[10px] text-[var(--ink-tertiary)]">
                        GL {account.glCode}
                        {!useBranchFirst && branch?.name
                          ? ` · ${branch.name}`
                          : ` · ${account.number}`}
                      </p>
                    </button>
                  </li>
                ))}
                {flatList.length === 0 && (
                  <li className="px-3 py-10 text-center text-xs text-[var(--ink-tertiary)]">
                    {useBranchFirst
                      ? "No GLs in this branch match."
                      : "Your queue is empty."}
                  </li>
                )}
              </ul>
            </>
          )}
        </div>

        <div className="flex flex-col overflow-auto p-4">
          {useBranchFirst && !branchFocus ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-1.5 text-center">
              <p className="font-[family-name:var(--font-outfit)] text-sm font-semibold">
                Select a branch
              </p>
              <p className="max-w-sm text-xs text-[var(--ink-secondary)]">
                With 80+ branches, review starts at branch level. Open a branch to see its
                GLs, then act on each account.
              </p>
            </div>
          ) : !selected ? (
            <div className="flex flex-1 items-center justify-center text-xs text-[var(--ink-tertiary)]">
              Select an item to review
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-[family-name:var(--font-outfit)] text-base font-semibold">
                      {selected.account.name}
                    </h2>
                    <StatusPill status={selected.r.status} />
                  </div>
                  <p className="text-xs text-[var(--ink-secondary)]">
                    {selected.account.number} · GL {selected.account.glCode} ·{" "}
                    {selected.branch?.name}
                  </p>
                </div>
                <Link
                  href={`/recon/${selected.r.id}`}
                  className="shrink-0 text-xs font-medium text-[var(--pab-red)]"
                >
                  Open workspace →
                </Link>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
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

              <div className="mt-3 flex-1">
                <h3 className="text-[10px] font-medium uppercase tracking-wide text-[var(--ink-tertiary)]">
                  Comments
                </h3>
                <ul className="mt-1 max-h-36 space-y-1 overflow-auto">
                  {selected.r.comments.map((c) => (
                    <li
                      key={c.id}
                      className="rounded-md bg-[var(--surface-secondary)] px-2 py-1 text-xs"
                    >
                      <span className="font-medium capitalize">{c.action}</span>
                      <span className="text-[var(--ink-tertiary)]"> · {c.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {!isReadOnlyRole() && actions.length > 0 && (
                <div className="mt-3 border-t border-[var(--hairline)] pt-3">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Mandatory comment…"
                    className="h-16 w-full rounded-md border border-[var(--hairline)] p-2 text-xs outline-none focus:ring-2 focus:ring-[var(--pab-red)]"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {actions.map((a) => (
                      <Button
                        key={a.action}
                        size="sm"
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
    <div className="rounded-md bg-[var(--surface-secondary)] px-2.5 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-[var(--ink-tertiary)]">{label}</p>
      <p className="text-xs font-semibold tabular-nums">{value}</p>
    </div>
  );
}
