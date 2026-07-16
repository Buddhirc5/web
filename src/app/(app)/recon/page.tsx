"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useReconStore } from "@/store/recon-store";
import { Badge, RagDot, StatusPill } from "@/components/ui/Status";
import { canAccessAccount, isBranchScoped } from "@/lib/access";
import { formatCurrency, ragForRecon } from "@/lib/utils";

export default function ReconListPage() {
  const router = useRouter();
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

  function openGl(id: string) {
    router.push(`/recon/${id}`);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-outfit)] text-xl font-semibold tracking-tight">
            Reconciliations
          </h1>
          <p className="text-xs text-[var(--ink-secondary)]">
            {scoped
              ? "Your branch accounts"
              : branchFirst
                ? "Branch → GL · click any row to open"
                : "Click any row to open"}
            {" · "}
            {rows.length} accounts
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="h-8 w-full max-w-[220px] rounded-lg border border-[var(--hairline)] bg-white px-2.5 text-xs outline-none focus:ring-2 focus:ring-[var(--pab-red)]"
          />
          {!scoped && !branchFirst && (
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="h-8 rounded-lg border border-[var(--hairline)] bg-white px-2 text-xs"
            >
              <option value="all">All branches</option>
              {branchOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} — {b.name}
                </option>
              ))}
            </select>
          )}
          {(["all", "open", "closed"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${
                filter === f
                  ? "bg-ink text-white"
                  : "border border-[var(--hairline)] bg-white text-[var(--ink-secondary)]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {branchFirst ? (
        <div className="space-y-1.5">
          {byBranch.map((g) => {
            const open = expandedBranch === g.branchId || Boolean(q.trim());
            return (
              <div
                key={g.branchId}
                className="overflow-hidden rounded-xl border border-[var(--hairline)] bg-white"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedBranch((cur) =>
                      cur === g.branchId ? null : g.branchId
                    )
                  }
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-black/[0.02]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold">{g.name}</p>
                    <p className="text-[10px] text-[var(--ink-tertiary)]">
                      {g.code}
                      {g.code ? " · " : ""}
                      {g.rows.length} GL · {g.open} open
                    </p>
                  </div>
                  <span className="text-[10px] text-[var(--ink-tertiary)]">
                    {open ? "▴" : "▾"}
                  </span>
                </button>
                {open && (
                  <ul className="border-t border-[var(--hairline)]">
                    {g.rows.map(({ r, account }) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => openGl(r.id)}
                          className="flex w-full cursor-pointer items-center gap-2 border-t border-[var(--hairline)] px-3 py-1.5 text-left first:border-t-0 hover:bg-[var(--pab-red-soft)]/40"
                        >
                          <RagDot size="sm" status={ragForRecon(r.status, r.overdue)} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12px] font-medium">{account.name}</p>
                            <p className="truncate text-[10px] text-[var(--ink-tertiary)]">
                              {account.number} · {account.glCode}
                              {account.id === "kol_match_demo" ? " · Match demo" : ""}
                            </p>
                          </div>
                          <span className="shrink-0 text-[11px] tabular-nums font-medium">
                            {formatCurrency(r.reconBalance)}
                          </span>
                          <StatusPill status={r.status} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
          {byBranch.length === 0 && (
            <p className="py-8 text-center text-sm text-[var(--ink-tertiary)]">
              No reconciliations match your filters.
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--hairline)] bg-white">
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="border-b border-[var(--hairline)] bg-[var(--surface-secondary)]/60 text-[10px] uppercase tracking-wide text-[var(--ink-tertiary)]">
                <th className="px-3 py-1.5 font-medium w-6" />
                <th className="px-2 py-1.5 font-medium">Account</th>
                <th className="px-2 py-1.5 font-medium">Branch</th>
                <th className="px-2 py-1.5 font-medium">Engine</th>
                <th className="px-2 py-1.5 font-medium text-right">Balance</th>
                <th className="px-3 py-1.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ r, account, branch }) => (
                <tr
                  key={r.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => openGl(r.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openGl(r.id);
                    }
                  }}
                  className="cursor-pointer border-b border-[var(--hairline)] last:border-0 hover:bg-[var(--pab-red-soft)]/35"
                >
                  <td className="px-3 py-1.5">
                    <RagDot size="sm" status={ragForRecon(r.status, r.overdue)} />
                  </td>
                  <td className="px-2 py-1.5">
                    <p className="font-medium leading-tight">{account.name}</p>
                    <p className="text-[10px] text-[var(--ink-tertiary)]">
                      {account.number} · {account.glCode}
                      {account.id === "kol_match_demo" ? " · Match demo" : ""}
                    </p>
                  </td>
                  <td className="px-2 py-1.5 text-[var(--ink-secondary)]">
                    {branch?.name}
                    {branch?.code ? (
                      <span className="ml-1 font-mono text-[10px] text-[var(--ink-tertiary)]">
                        ({branch.code})
                      </span>
                    ) : null}
                  </td>
                  <td className="px-2 py-1.5">
                    <Badge>{r.engine === "detailed" ? "Detailed" : "Bulk"}</Badge>
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums font-medium">
                    {formatCurrency(r.reconBalance)}
                  </td>
                  <td className="px-3 py-1.5">
                    <StatusPill status={r.status} />
                    {r.overdue && (
                      <span className="ml-1 text-[9px] font-medium text-[var(--red-rag)]">
                        OVERDUE
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="py-8 text-center text-sm text-[var(--ink-tertiary)]">
              No reconciliations match your filters.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
