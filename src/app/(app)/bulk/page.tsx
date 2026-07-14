"use client";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Status";
import { useReconStore } from "@/store/recon-store";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function BulkPage() {
  const bulkCycles = useReconStore((s) => s.bulkCycles);
  const bulkExceptions = useReconStore((s) => s.bulkExceptions);
  const runBulkCycle = useReconStore((s) => s.runBulkCycle);
  const loading = useReconStore((s) => s.loading);
  const isReadOnlyRole = useReconStore((s) => s.isReadOnlyRole);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-outfit)] text-[28px] font-semibold tracking-tight">
          Bulk Engine 02
        </h1>
        <p className="mt-1 text-[15px] text-[var(--ink-secondary)]">
          High-volume cycle-based reconciliation across Finacle and external feeds.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        {bulkCycles.map((c) => (
          <div
            key={c.id}
            className="rounded-[20px] border border-[var(--hairline)] bg-white p-5 shadow-[var(--shadow-soft)]"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-[family-name:var(--font-outfit)] font-semibold">
                  {c.label}
                </p>
                <p className="text-xs text-[var(--ink-tertiary)]">Cut-off {c.cutOff}</p>
              </div>
              <Badge
                tone={
                  c.status === "completed"
                    ? "green"
                    : c.status === "running"
                      ? "amber"
                      : "neutral"
                }
              >
                {c.status}
              </Badge>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-[11px] text-[var(--ink-tertiary)]">Matched</p>
                <p className="font-semibold tabular-nums">{c.matched}</p>
              </div>
              <div>
                <p className="text-[11px] text-[var(--ink-tertiary)]">Exceptions</p>
                <p className="font-semibold tabular-nums">{c.exceptions}</p>
              </div>
            </div>
            {c.ranAt && (
              <p className="mt-2 text-[11px] text-[var(--ink-tertiary)]">
                Ran {formatDateTime(c.ranAt)}
              </p>
            )}
            {!isReadOnlyRole() && c.status !== "completed" && (
              <Button
                className="mt-4 w-full"
                size="sm"
                disabled={loading}
                onClick={() => void runBulkCycle(c.id)}
              >
                Run match
              </Button>
            )}
          </div>
        ))}
      </section>

      <section className="rounded-[20px] border border-[var(--hairline)] bg-white p-5">
        <h2 className="font-[family-name:var(--font-outfit)] text-lg font-semibold">
          Exceptions
        </h2>
        <p className="mt-1 text-sm text-[var(--ink-secondary)]">
          Unmatched items carry forward to subsequent cycles until resolved.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--hairline)] text-xs text-[var(--ink-tertiary)]">
                <th className="pb-2 font-medium">Ref</th>
                <th className="pb-2 font-medium">Source</th>
                <th className="pb-2 font-medium">Reason</th>
                <th className="pb-2 font-medium text-right">Amount</th>
                <th className="pb-2 font-medium">Carry-fwd</th>
              </tr>
            </thead>
            <tbody>
              {bulkExceptions.map((e) => (
                <tr key={e.id} className="border-b border-[var(--hairline)] last:border-0">
                  <td className="py-3 font-mono text-xs">{e.refNo}</td>
                  <td className="py-3">{e.sourceSystem}</td>
                  <td className="py-3 text-[var(--ink-secondary)]">{e.reason}</td>
                  <td className="py-3 text-right tabular-nums font-medium">
                    {formatCurrency(e.amount)}
                  </td>
                  <td className="py-3">
                    {e.carriedForward ? (
                      <Badge tone="amber">Yes</Badge>
                    ) : (
                      <Badge>No</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {bulkExceptions.length === 0 && (
            <p className="py-8 text-center text-sm text-[var(--ink-tertiary)]">
              No exceptions.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
