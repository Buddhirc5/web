"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useReconStore } from "@/store/recon-store";
import { formatDate, formatDateTime } from "@/lib/utils";

export default function FreezePage() {
  const period = useReconStore((s) => s.period);
  const freezeOverrides = useReconStore((s) => s.freezeOverrides);
  const reconciliations = useReconStore((s) => s.reconciliations);
  const accounts = useReconStore((s) => s.accounts);
  const users = useReconStore((s) => s.users);
  const currentUser = useReconStore((s) => s.currentUser);
  const simulateFreeze = useReconStore((s) => s.simulateFreeze);
  const unfreeze = useReconStore((s) => s.unfreeze);
  const requestFreezeOverride = useReconStore((s) => s.requestFreezeOverride);
  const reviewFreezeOverride = useReconStore((s) => s.reviewFreezeOverride);

  const [reconId, setReconId] = useState(reconciliations[0]?.id ?? "");
  const [reason, setReason] = useState("");

  const isFinance =
    currentUser?.role === "finance" || currentUser?.role === "admin";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-outfit)] text-[28px] font-semibold tracking-tight">
          Freeze controls
        </h1>
        <p className="mt-1 text-[15px] text-[var(--ink-secondary)]">
          After the 10th calendar day, the period enters Total Freeze. Amendments need
          Finance approval.
        </p>
      </div>

      <section className="rounded-[24px] border border-[var(--hairline)] bg-white p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--ink-tertiary)]">
              Current period
            </p>
            <p className="font-[family-name:var(--font-outfit)] text-2xl font-semibold">
              {period.label}
            </p>
            <p className="mt-1 text-sm text-[var(--ink-secondary)]">
              Due {formatDate(period.dueDate)}
            </p>
          </div>
          <span
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              period.freezeStatus === "frozen"
                ? "bg-[#ffe8e6] text-[#b42318]"
                : "bg-[#e5f8ea] text-[#0e7a32]"
            }`}
          >
            {period.freezeStatus === "frozen" ? "Total Freeze" : "Open"}
          </span>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {period.freezeStatus === "open" ? (
            <Button onClick={() => void simulateFreeze()}>Simulate freeze</Button>
          ) : (
            (currentUser?.role === "admin" || isFinance) && (
              <Button variant="secondary" onClick={() => void unfreeze()}>
                Lift freeze (demo)
              </Button>
            )
          )}
        </div>
      </section>

      <section className="rounded-[20px] border border-[var(--hairline)] bg-white p-6">
        <h2 className="font-[family-name:var(--font-outfit)] text-lg font-semibold">
          Request freeze override
        </h2>
        <p className="mt-1 text-sm text-[var(--ink-secondary)]">
          Available when the period is frozen.
        </p>
        <div className="mt-4 space-y-3">
          <select
            value={reconId}
            onChange={(e) => setReconId(e.target.value)}
            className="h-11 w-full rounded-xl border border-[var(--hairline)] bg-[var(--surface-secondary)] px-3 text-sm"
            disabled={period.freezeStatus !== "frozen"}
          >
            {reconciliations.map((r) => {
              const a = accounts.find((x) => x.id === r.accountId);
              return (
                <option key={r.id} value={r.id}>
                  {a?.name} ({r.status})
                </option>
              );
            })}
          </select>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={period.freezeStatus !== "frozen"}
            placeholder="Business justification…"
            className="h-24 w-full rounded-xl border border-[var(--hairline)] p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--pab-red)] disabled:opacity-50"
          />
          <Button
            disabled={period.freezeStatus !== "frozen"}
            onClick={() => void requestFreezeOverride(reconId, reason)}
          >
            Submit request
          </Button>
        </div>
      </section>

      <section className="rounded-[20px] border border-[var(--hairline)] bg-white p-6">
        <h2 className="font-[family-name:var(--font-outfit)] text-lg font-semibold">
          Override requests
        </h2>
        <ul className="mt-4 divide-y divide-[var(--hairline)]">
          {freezeOverrides.length === 0 && (
            <li className="py-6 text-sm text-[var(--ink-tertiary)]">No requests yet.</li>
          )}
          {freezeOverrides.map((f) => {
            const requester = users.find((u) => u.id === f.requestedBy);
            const recon = reconciliations.find((r) => r.id === f.reconId);
            const acc = accounts.find((a) => a.id === recon?.accountId);
            return (
              <li key={f.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div>
                  <p className="text-sm font-medium">{acc?.name ?? f.reconId}</p>
                  <p className="text-xs text-[var(--ink-secondary)]">
                    {requester?.name} · {formatDateTime(f.createdAt)}
                  </p>
                  <p className="mt-1 text-sm">{f.reason}</p>
                  <p className="mt-1 text-xs font-medium capitalize text-[var(--ink-tertiary)]">
                    {f.status}
                  </p>
                </div>
                {isFinance && f.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => void reviewFreezeOverride(f.id, "approved")}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void reviewFreezeOverride(f.id, "rejected")}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
