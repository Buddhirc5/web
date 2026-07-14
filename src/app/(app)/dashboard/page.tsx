"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useReconStore } from "@/store/recon-store";
import { RagDot, StatusPill } from "@/components/ui/Status";
import { canAccessAccount, isBranchScoped } from "@/lib/access";
import { formatCurrency, ragForRecon } from "@/lib/utils";

export default function DashboardPage() {
  const currentUser = useReconStore((s) => s.currentUser);
  const reconciliations = useReconStore((s) => s.reconciliations);
  const accounts = useReconStore((s) => s.accounts);
  const branches = useReconStore((s) => s.branches);
  const transactions = useReconStore((s) => s.transactions);
  const period = useReconStore((s) => s.period);

  const stats = useMemo(() => {
    const visibleAccounts = accounts.filter((a) => canAccessAccount(currentUser, a));
    const visibleAccIds = new Set(visibleAccounts.map((a) => a.id));
    const visibleRecs = reconciliations.filter((r) => visibleAccIds.has(r.accountId));
    const visibleTx = transactions.filter((t) => visibleAccIds.has(t.accountId));

    const closed = visibleRecs.filter((r) => r.status === "closed").length;
    const pending = visibleRecs.filter((r) => r.status !== "closed").length;
    const overdue = visibleRecs.filter((r) => r.overdue).length;
    const escalated = visibleRecs.filter(
      (r) => r.status === "query" || r.overdue
    ).length;
    const compliance =
      visibleRecs.length === 0
        ? 100
        : Math.round((closed / visibleRecs.length) * 100);

    const byBranch = branches
      .map((b) => {
        const accIds = visibleAccounts.filter((a) => a.branchId === b.id).map((a) => a.id);
        const recs = visibleRecs.filter((r) => accIds.includes(r.accountId));
        if (recs.length === 0) return null;
        const done = recs.filter((r) => r.status === "closed").length;
        const pct = recs.length ? Math.round((done / recs.length) * 100) : 100;
        const rag =
          pct === 100 ? ("green" as const) : pct >= 50 ? ("amber" as const) : ("red" as const);
        return { ...b, total: recs.length, done, pct, rag };
      })
      .filter(Boolean) as Array<{
      id: string;
      code: string;
      name: string;
      district?: string;
      total: number;
      done: number;
      pct: number;
      rag: "green" | "amber" | "red";
    }>;

    const outstanding = visibleTx.filter((t) => !t.matched);
    const aging = {
      "0-30": outstanding.filter((t) => t.agingBucket === "0-30").length,
      "31-60": outstanding.filter((t) => t.agingBucket === "31-60").length,
      "61-90": outstanding.filter((t) => t.agingBucket === "61-90").length,
      "90+": outstanding.filter((t) => t.agingBucket === "90+").length,
    };
    const outstandingBalance = outstanding.reduce(
      (sum, t) => sum + (t.side === "debit" ? t.amount : -t.amount),
      0
    );

    const needsAttention = visibleRecs
      .filter((r) => r.status !== "closed")
      .sort((a, b) => Number(b.overdue) - Number(a.overdue))
      .slice(0, 6);

    const topAccounts = visibleAccounts
      .map((a) => {
        const fromTx = visibleTx
          .filter((t) => t.accountId === a.id && !t.matched)
          .reduce((s, t) => s + t.amount, 0);
        const bal = fromTx || Math.abs(a.scheduleBalance ?? a.glBalance ?? 0);
        return { ...a, outstandingAmt: a.zeroBalance ? 0 : bal };
      })
      .sort((a, b) => b.outstandingAmt - a.outstandingAmt)
      .slice(0, 5);

    return {
      closed,
      pending,
      overdue,
      escalated,
      compliance,
      byBranch,
      aging,
      outstandingBalance,
      outstandingCount: outstanding.length,
      needsAttention,
      topAccounts,
      scoped: currentUser ? isBranchScoped(currentUser.role) : false,
    };
  }, [reconciliations, accounts, branches, transactions, currentUser]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--ink-tertiary)]">
          {period.label}
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-outfit)] text-[28px] font-semibold tracking-tight text-ink">
          Reconciliation health
        </h1>
        <p className="mt-1 text-[15px] text-[var(--ink-secondary)]">
          {stats.scoped
            ? "Your branch reconciliation health."
            : "Bank-wide status at a glance. Drill into anything that needs attention."}
        </p>
      </div>

      {/* Hero composition */}
      <section className="relative overflow-hidden rounded-[24px] border border-[var(--hairline)] bg-white p-8 shadow-[var(--shadow-soft)]">
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-40"
          style={{
            background: "radial-gradient(circle, #fce8e9 0%, transparent 70%)",
          }}
        />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-8">
            <div className="relative flex h-36 w-36 items-center justify-center">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="#e8e8ed"
                  strokeWidth="10"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="var(--pab-red)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(stats.compliance / 100) * 327} 327`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-[family-name:var(--font-outfit)] text-3xl font-semibold tracking-tight">
                  {stats.compliance}%
                </span>
                <span className="text-[11px] text-[var(--ink-tertiary)]">compliant</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-[var(--ink-secondary)]">Overall completion</p>
              <div className="mt-4 flex flex-wrap gap-6">
                <Metric label="Closed" value={stats.closed} />
                <Metric label="Pending" value={stats.pending} />
                <Metric label="Overdue" value={stats.overdue} accent />
                <Metric label="Escalated" value={stats.escalated} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl bg-[var(--surface-secondary)] px-5 py-4">
            <div className="flex items-center gap-2">
              <RagDot status="green" />
              <span className="text-xs text-[var(--ink-secondary)]">On track</span>
            </div>
            <div className="flex items-center gap-2">
              <RagDot status="amber" />
              <span className="text-xs text-[var(--ink-secondary)]">In progress</span>
            </div>
            <div className="flex items-center gap-2">
              <RagDot status="red" />
              <span className="text-xs text-[var(--ink-secondary)]">At risk</span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3 rounded-[20px] border border-[var(--hairline)] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-outfit)] text-lg font-semibold tracking-tight">
              Needs attention
            </h2>
            <Link href="/recon" className="text-xs font-medium text-[var(--pab-red)]">
              View all
            </Link>
          </div>
          <ul className="divide-y divide-[var(--hairline)]">
            {stats.needsAttention.map((r) => {
              const acc = accounts.find((a) => a.id === r.accountId)!;
              const branch = branches.find((b) => b.id === acc.branchId);
              return (
                <li key={r.id}>
                  <Link
                    href={`/recon/${r.id}`}
                    className="flex items-center gap-3 py-3 transition hover:bg-black/[0.015]"
                  >
                    <RagDot status={ragForRecon(r.status, r.overdue)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{acc.name}</p>
                  <p className="truncate text-xs text-[var(--ink-tertiary)]">
                        {branch?.name}
                        {branch?.district ? ` · ${branch.district}` : ""} · {acc.number}
                      </p>
                    </div>
                    <StatusPill status={r.status} />
                  </Link>
                </li>
              );
            })}
            {stats.needsAttention.length === 0 && (
              <li className="py-8 text-center text-sm text-[var(--ink-tertiary)]">
                Everything is closed for this period.
              </li>
            )}
          </ul>
        </section>

        <section className="lg:col-span-2 space-y-6">
          <div className="rounded-[20px] border border-[var(--hairline)] bg-white p-5">
            <h2 className="font-[family-name:var(--font-outfit)] text-lg font-semibold tracking-tight">
              Aging
            </h2>
            <p className="mt-1 text-xs text-[var(--ink-tertiary)]">
              {stats.outstandingCount} items · {formatCurrency(Math.abs(stats.outstandingBalance))}
            </p>
            <div className="mt-4 space-y-3">
              {(
                [
                  ["0-30", stats.aging["0-30"], "green"],
                  ["31-60", stats.aging["31-60"], "amber"],
                  ["61-90", stats.aging["61-90"], "amber"],
                  ["90+", stats.aging["90+"], "red"],
                ] as const
              ).map(([label, count, tone]) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="w-12 text-xs text-[var(--ink-tertiary)]">{label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-secondary)]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, count * 12)}%`,
                        background:
                          tone === "green"
                            ? "var(--green)"
                            : tone === "amber"
                              ? "var(--amber)"
                              : "var(--red-rag)",
                      }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[20px] border border-[var(--hairline)] bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-[family-name:var(--font-outfit)] text-lg font-semibold tracking-tight">
                Branch RAG
              </h2>
              <Link href="/branches" className="text-xs font-medium text-[var(--pab-red)]">
                Full network
              </Link>
            </div>
            <ul className="mt-3 max-h-64 space-y-2 overflow-auto scrollbar-thin">
              {stats.byBranch.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between rounded-xl px-2 py-2 hover:bg-black/[0.02]"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <RagDot status={b.rag} />
                    <div className="min-w-0">
                      <span className="block truncate text-sm">{b.name}</span>
                      <span className="text-[10px] text-[var(--ink-tertiary)]">
                        {b.code}
                        {b.district ? ` · ${b.district}` : ""}
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-[var(--ink-secondary)]">
                    {b.pct}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <section className="rounded-[20px] border border-[var(--hairline)] bg-white p-5">
        <h2 className="font-[family-name:var(--font-outfit)] text-lg font-semibold tracking-tight">
          Top accounts with outstanding
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--hairline)] text-xs text-[var(--ink-tertiary)]">
                <th className="pb-2 font-medium">Account</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium text-right">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {stats.topAccounts.map((a) => {
                const recon = reconciliations.find((r) => r.accountId === a.id);
                return (
                  <tr key={a.id} className="border-b border-[var(--hairline)] last:border-0">
                    <td className="py-3">
                      {recon ? (
                        <Link
                          href={`/recon/${recon.id}`}
                          className="font-medium text-ink hover:text-[var(--pab-red)]"
                        >
                          {a.name}
                        </Link>
                      ) : (
                        a.name
                      )}
                      <p className="text-xs text-[var(--ink-tertiary)]">{a.number}</p>
                    </td>
                    <td className="py-3 text-[var(--ink-secondary)]">{a.type}</td>
                    <td className="py-3 text-right font-medium tabular-nums">
                      {formatCurrency(a.outstandingAmt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-[var(--ink-tertiary)]">{label}</p>
      <p
        className={`font-[family-name:var(--font-outfit)] text-2xl font-semibold tabular-nums ${
          accent ? "text-[var(--pab-red)]" : "text-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
