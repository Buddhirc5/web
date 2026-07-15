"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useReconStore } from "@/store/recon-store";
import { canAccessAccount, isBranchScoped } from "@/lib/access";
import { formatDate, formatDateTime } from "@/lib/utils";

export default function FreezePage() {
  const period = useReconStore((s) => s.period);
  const freezeOverrides = useReconStore((s) => s.freezeOverrides);
  const accounts = useReconStore((s) => s.accounts);
  const branches = useReconStore((s) => s.branches);
  const users = useReconStore((s) => s.users);
  const currentUser = useReconStore((s) => s.currentUser);
  const simulateFreeze = useReconStore((s) => s.simulateFreeze);
  const unfreeze = useReconStore((s) => s.unfreeze);
  const requestFreezeOverride = useReconStore((s) => s.requestFreezeOverride);
  const reviewFreezeOverride = useReconStore((s) => s.reviewFreezeOverride);
  const isBranchUnfrozen = useReconStore((s) => s.isBranchUnfrozen);

  const scoped = currentUser ? isBranchScoped(currentUser.role) : false;

  const branchOptions = useMemo(() => {
    const ids = new Set(
      accounts
        .filter((a) => canAccessAccount(currentUser, a))
        .map((a) => a.branchId)
    );
    return branches
      .filter((b) => ids.has(b.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [accounts, branches, currentUser]);

  const defaultBranch =
    currentUser?.branchId && branchOptions.some((b) => b.id === currentUser.branchId)
      ? currentUser.branchId
      : branchOptions[0]?.id ?? "";

  const [branchId, setBranchId] = useState(defaultBranch);
  const [reason, setReason] = useState("");
  const [branchFilter, setBranchFilter] = useState("");

  const isFinance =
    currentUser?.role === "finance" || currentUser?.role === "admin";

  const selectedBranch = branches.find((b) => b.id === branchId);
  const selectedUnlocked = branchId ? isBranchUnfrozen(branchId) : false;

  const filteredOverrides = useMemo(() => {
    const q = branchFilter.trim().toLowerCase();
    return freezeOverrides.filter((f) => {
      if (!q) return true;
      const b = branches.find((x) => x.id === f.branchId);
      return `${b?.name ?? ""} ${b?.code ?? ""}`.toLowerCase().includes(q);
    });
  }, [freezeOverrides, branches, branchFilter]);

  const unlockedBranches = useMemo(
    () =>
      branches.filter(
        (b) =>
          period.freezeStatus === "frozen" &&
          isBranchUnfrozen(b.id) &&
          (!scoped || b.id === currentUser?.branchId)
      ),
    [branches, period.freezeStatus, isBranchUnfrozen, scoped, currentUser?.branchId]
  );

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-outfit)] text-[28px] font-semibold tracking-tight">
          Freeze controls
        </h1>
        <p className="mt-1 text-[15px] text-[var(--ink-secondary)]">
          After the 10th calendar day, the period enters Total Freeze. Overrides unlock a
          whole branch — not a single GL — so branches can keep working without reopening
          the bank.
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
        {unlockedBranches.length > 0 && (
          <div className="mt-4 rounded-xl bg-[#f6ffed] px-4 py-3 text-sm">
            <p className="font-medium text-[#0e7a32]">
              {unlockedBranches.length} branch
              {unlockedBranches.length === 1 ? "" : "es"} unlocked via override
            </p>
            <p className="mt-1 text-xs text-[var(--ink-secondary)]">
              {unlockedBranches.map((b) => b.name).join(" · ")}
            </p>
          </div>
        )}
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
          Request branch override
        </h2>
        <p className="mt-1 text-sm text-[var(--ink-secondary)]">
          Unlock all GLs for one branch while the period stays frozen elsewhere.
        </p>
        <div className="mt-4 space-y-3">
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="h-11 w-full rounded-xl border border-[var(--hairline)] bg-[var(--surface-secondary)] px-3 text-sm"
            disabled={period.freezeStatus !== "frozen"}
          >
            {branchOptions.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} — {b.name}
                {isBranchUnfrozen(b.id) ? " (unlocked)" : ""}
              </option>
            ))}
          </select>
          {selectedUnlocked && (
            <p className="text-xs font-medium text-[#0e7a32]">
              {selectedBranch?.name} already has an approved override.
            </p>
          )}
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={period.freezeStatus !== "frozen" || selectedUnlocked}
            placeholder="Business justification for this branch…"
            className="h-24 w-full rounded-xl border border-[var(--hairline)] p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--pab-red)] disabled:opacity-50"
          />
          <Button
            disabled={
              period.freezeStatus !== "frozen" || selectedUnlocked || !branchId
            }
            onClick={() => void requestFreezeOverride(branchId, reason)}
          >
            Submit branch request
          </Button>
        </div>
      </section>

      <section className="rounded-[20px] border border-[var(--hairline)] bg-white p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-[family-name:var(--font-outfit)] text-lg font-semibold">
            Override requests
          </h2>
          {isFinance && freezeOverrides.length > 5 && (
            <input
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              placeholder="Filter by branch…"
              className="h-9 w-full max-w-[220px] rounded-lg border border-[var(--hairline)] px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--pab-red)]"
            />
          )}
        </div>
        <ul className="mt-4 divide-y divide-[var(--hairline)]">
          {filteredOverrides.length === 0 && (
            <li className="py-6 text-sm text-[var(--ink-tertiary)]">No requests yet.</li>
          )}
          {filteredOverrides.map((f) => {
            const requester = users.find((u) => u.id === f.requestedBy);
            const branch = branches.find((b) => b.id === f.branchId);
            const glCount = accounts.filter((a) => a.branchId === f.branchId).length;
            return (
              <li key={f.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div>
                  <p className="text-sm font-medium">
                    {branch?.name ?? f.branchId}
                    {branch?.code && (
                      <span className="ml-2 font-mono text-[11px] text-[var(--ink-tertiary)]">
                        {branch.code}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-[var(--ink-secondary)]">
                    {glCount} GL{glCount === 1 ? "" : "s"} · {requester?.name} ·{" "}
                    {formatDateTime(f.createdAt)}
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
                      Approve branch
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
