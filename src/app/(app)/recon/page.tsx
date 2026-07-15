"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useReconStore } from "@/store/recon-store";
import { Badge, RagDot, StatusPill } from "@/components/ui/Status";
import { canAccessAccount, isBranchScoped } from "@/lib/access";
import { formatCurrency, ragForRecon } from "@/lib/utils";

export default function ReconListPage() {
  const currentUser = useReconStore((s) => s.currentUser);
  const reconciliations = useReconStore((s) => s.reconciliations);
  const accounts = useReconStore((s) => s.accounts);
  const branches = useReconStore((s) => s.branches);
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");
  const [q, setQ] = useState("");
  const [branchId, setBranchId] = useState("all");
  const [expandedBranch, setExpandedBranch] = useState<string | null>(null);

  const scoped = currentUser ? isBranchScoped(currentUser.role) : false;
  const branchFirst =
    !scoped &&
    (currentUser?.role === "finance" ||
      currentUser?.role === "admin" ||
      currentUser?.role === "inquiry");

  const visibleAccounts = useMemo(
    () => accounts.filter((a) => canAccessAccount(currentUser, a)),
    [accounts, currentUser]
  );

  const branchOptions = useMemo(() => {
    const ids = new Set(visibleAccounts.map((a) => a.branchId));
    return branches.filter((b) => ids.has(b.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [visibleAccounts, branches]);

  const rows = useMemo(() => {
    return reconciliations
      .map((r) => {
        const account = accounts.find((a) => a.id === r.accountId);
        if (!account || !canAccessAccount(currentUser, account)) return null;
        const branch = branches.find((b) => b.id === account.branchId);
        return { r, account, branch };
      })
      .filter(Boolean)
      .filter((row) => {
        const { r, account, branch } = row!;
        if (filter === "open" && r.status === "closed") return false;
        if (filter === "closed" && r.status !== "closed") return false;
        if (!scoped && branchId !== "all" && account.branchId !== branchId) return false;
        if (!q.trim()) return true;
        const hay = `${account.name} ${account.number} ${account.glCode} ${branch?.name ?? ""} ${branch?.code ?? ""}`.toLowerCase();
        return hay.includes(q.toLowerCase());
      }) as Array<{
      r: (typeof reconciliations)[0];
      account: (typeof accounts)[0];
      branch: (typeof branches)[0] | undefined;
    }>;
  }, [reconciliations, accounts, branches, filter, q, branchId, currentUser, scoped]);

  const byBranch = useMemo(() => {
    const map = new Map<
      string,
      {
        branchId: string;
        name: string;
        code: string;
        rows: typeof rows;
        open: number;
      }
    >();
    for (const row of rows) {
      const id = row.account.branchId;
      const existing = map.get(id);
      if (existing) {
        existing.rows.push(row);
        if (row.r.status !== "closed") existing.open += 1;
      } else {
        map.set(id, {
          branchId: id,
          name: row.branch?.name ?? id,
          code: row.branch?.code ?? "",
          rows: [row],
          open: row.r.status !== "closed" ? 1 : 0,
        });
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-outfit)] text-[28px] font-semibold tracking-tight">
            Reconciliations
          </h1>
          <p className="mt-1 text-[15px] text-[var(--ink-secondary)]">
            {scoped
              ? "Your branch accounts for the current period."
              : branchFirst
                ? "Browse by branch, then open GLs — built for 80+ branches."
                : "Detailed Engine 01 accounts for the current period."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "open", "closed"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize ${
                filter === f
                  ? "bg-ink text-white"
                  : "bg-white text-[var(--ink-secondary)] border border-[var(--hairline)]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={
            branchFirst
              ? "Search branch, account, GL code…"
              : "Search account, GL code, branch…"
          }
          className="h-11 w-full max-w-md rounded-xl border border-[var(--hairline)] bg-white px-4 text-sm outline-none ring-[var(--pab-red)] focus:ring-2"
        />
        {!scoped && !branchFirst && (
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="h-11 rounded-xl border border-[var(--hairline)] bg-white px-3 text-sm"
          >
            <option value="all">All branches with recon</option>
            {branchOptions.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} — {b.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {branchFirst ? (
        <div className="space-y-2">
          <p className="text-xs text-[var(--ink-tertiary)]">
            {byBranch.length} branch{byBranch.length === 1 ? "" : "es"} · {rows.length}{" "}
            GL{rows.length === 1 ? "" : "s"}
          </p>
          {byBranch.map((g) => {
            const open = expandedBranch === g.branchId || Boolean(q.trim());
            return (
              <div
                key={g.branchId}
                className="overflow-hidden rounded-[16px] border border-[var(--hairline)] bg-white"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedBranch((cur) =>
                      cur === g.branchId ? null : g.branchId
                    )
                  }
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-black/[0.015]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{g.name}</p>
                    <p className="text-xs text-[var(--ink-tertiary)]">
                      {g.code}
                      {g.code ? " · " : ""}
                      {g.rows.length} GL{g.rows.length === 1 ? "" : "s"}
                      {g.open > 0 ? ` · ${g.open} open` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-[var(--ink-tertiary)]">
                    {open ? "Hide" : "Show GLs"}
                  </span>
                </button>
                {open && (
                  <table className="w-full text-left text-sm">
                    <tbody>
                      {g.rows.map(({ r, account }) => (
                        <tr
                          key={r.id}
                          className="border-t border-[var(--hairline)] hover:bg-black/[0.015]"
                        >
                          <td className="px-4 py-2.5 w-8">
                            <RagDot status={ragForRecon(r.status, r.overdue)} />
                          </td>
                          <td className="px-2 py-2.5">
                            <Link
                              href={`/recon/${r.id}`}
                              className="font-medium hover:text-[var(--pab-red)]"
                            >
                              {account.name}
                            </Link>
                            <p className="text-xs text-[var(--ink-tertiary)]">
                              {account.number} · GL {account.glCode}
                              {account.id === "kol_match_demo" && (
                                <span className="ml-2 font-medium text-[var(--pab-red)]">
                                  · Match demo
                                </span>
                              )}
                            </p>
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-xs font-medium">
                            {formatCurrency(r.reconBalance)}
                          </td>
                          <td className="px-4 py-2.5">
                            <StatusPill status={r.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
          {byBranch.length === 0 && (
            <p className="py-12 text-center text-sm text-[var(--ink-tertiary)]">
              No reconciliations match your filters.
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[20px] border border-[var(--hairline)] bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--hairline)] bg-[var(--surface-secondary)]/60 text-xs text-[var(--ink-tertiary)]">
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium">Branch</th>
                <th className="px-4 py-3 font-medium">Engine</th>
                <th className="px-4 py-3 font-medium text-right">Recon balance</th>
                <th className="px-4 py-3 font-medium">Workflow</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ r, account, branch }) => (
                <tr
                  key={r.id}
                  className="border-b border-[var(--hairline)] last:border-0 hover:bg-black/[0.015]"
                >
                  <td className="px-4 py-3">
                    <RagDot status={ragForRecon(r.status, r.overdue)} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/recon/${r.id}`}
                      className="font-medium hover:text-[var(--pab-red)]"
                    >
                      {account.name}
                    </Link>
                    <p className="text-xs text-[var(--ink-tertiary)]">
                      {account.number} · GL {account.glCode}
                      {account.id === "kol_match_demo" && (
                        <span className="ml-2 font-medium text-[var(--pab-red)]">
                          · Match demo
                        </span>
                      )}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-[var(--ink-secondary)]">
                    <span>{branch?.name}</span>
                    {branch?.code && (
                      <span className="ml-1 font-mono text-[10px] text-[var(--ink-tertiary)]">
                        ({branch.code})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge>{r.engine === "detailed" ? "Detailed" : "Bulk"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    {formatCurrency(r.reconBalance)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={r.status} />
                    {r.overdue && (
                      <span className="ml-2 text-[10px] font-medium text-[var(--red-rag)]">
                        OVERDUE
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="py-12 text-center text-sm text-[var(--ink-tertiary)]">
              No reconciliations match your filters.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
