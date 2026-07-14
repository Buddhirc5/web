"use client";

import { useMemo } from "react";
import { useReconStore } from "@/store/recon-store";
import { canAccessAccount } from "@/lib/access";
import { formatCurrency, statusLabel } from "@/lib/utils";

export default function ReportsPage() {
  const currentUser = useReconStore((s) => s.currentUser);
  const reconciliations = useReconStore((s) => s.reconciliations);
  const accounts = useReconStore((s) => s.accounts);
  const transactions = useReconStore((s) => s.transactions);
  const branches = useReconStore((s) => s.branches);
  const period = useReconStore((s) => s.period);

  const report = useMemo(() => {
    const visibleAccounts = accounts.filter((a) => canAccessAccount(currentUser, a));
    const accIds = new Set(visibleAccounts.map((a) => a.id));
    const visibleRecs = reconciliations.filter((r) => accIds.has(r.accountId));
    const outstanding = transactions.filter(
      (t) => !t.matched && accIds.has(t.accountId)
    );
    return {
      byStatus: (["draft", "pending_approver", "pending_reviewer", "pending_finance", "query", "closed", "rejected"] as const).map(
        (s) => ({
          status: s,
          count: visibleRecs.filter((r) => r.status === s).length,
        })
      ),
      aging: {
        "0-30": outstanding.filter((t) => t.agingBucket === "0-30").length,
        "31-60": outstanding.filter((t) => t.agingBucket === "31-60").length,
        "61-90": outstanding.filter((t) => t.agingBucket === "61-90").length,
        "90+": outstanding.filter((t) => t.agingBucket === "90+").length,
      },
      branchRows: branches
        .map((b) => {
          const accs = visibleAccounts.filter((a) => a.branchId === b.id);
          if (accs.length === 0) return null;
          const recs = visibleRecs.filter((r) =>
            accs.some((a) => a.id === r.accountId)
          );
          return {
            branch: b.name,
            accounts: accs.length,
            closed: recs.filter((r) => r.status === "closed").length,
            pending: recs.filter((r) => r.status !== "closed").length,
            outstandingAmt: transactions
              .filter((t) => !t.matched && accs.some((a) => a.id === t.accountId))
              .reduce((s, t) => s + t.amount, 0),
          };
        })
        .filter(Boolean) as Array<{
        branch: string;
        accounts: number;
        closed: number;
        pending: number;
        outstandingAmt: number;
      }>,
    };
  }, [reconciliations, accounts, transactions, branches, currentUser]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-outfit)] text-[28px] font-semibold tracking-tight">
          Reports
        </h1>
        <p className="mt-1 text-[15px] text-[var(--ink-secondary)]">
          Management information for {period.label} (mock export viewers).
        </p>
      </div>

      <section className="rounded-[20px] border border-[var(--hairline)] bg-white p-6">
        <h2 className="font-[family-name:var(--font-outfit)] text-lg font-semibold">
          Status summary
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {report.byStatus.map((row) => (
            <div
              key={row.status}
              className="rounded-2xl bg-[var(--surface-secondary)] px-4 py-3"
            >
              <p className="text-[11px] text-[var(--ink-tertiary)]">
                {statusLabel(row.status)}
              </p>
              <p className="font-[family-name:var(--font-outfit)] text-2xl font-semibold tabular-nums">
                {row.count}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[20px] border border-[var(--hairline)] bg-white p-6">
        <h2 className="font-[family-name:var(--font-outfit)] text-lg font-semibold">
          Aging analysis
        </h2>
        <div className="mt-4 grid grid-cols-4 gap-3">
          {Object.entries(report.aging).map(([bucket, count]) => (
            <div key={bucket} className="rounded-2xl border border-[var(--hairline)] p-4 text-center">
              <p className="text-xs text-[var(--ink-tertiary)]">{bucket} days</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{count}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[20px] border border-[var(--hairline)] bg-white p-6">
        <h2 className="font-[family-name:var(--font-outfit)] text-lg font-semibold">
          Branch compliance
        </h2>
        <table className="mt-4 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--hairline)] text-xs text-[var(--ink-tertiary)]">
              <th className="pb-2 font-medium">Branch</th>
              <th className="pb-2 font-medium">Accounts</th>
              <th className="pb-2 font-medium">Closed</th>
              <th className="pb-2 font-medium">Pending</th>
              <th className="pb-2 font-medium text-right">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {report.branchRows.map((r) => (
              <tr key={r.branch} className="border-b border-[var(--hairline)] last:border-0">
                <td className="py-3 font-medium">{r.branch}</td>
                <td className="py-3">{r.accounts}</td>
                <td className="py-3">{r.closed}</td>
                <td className="py-3">{r.pending}</td>
                <td className="py-3 text-right tabular-nums">
                  {formatCurrency(r.outstandingAmt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
