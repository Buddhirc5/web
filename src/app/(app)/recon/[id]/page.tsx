"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge, StatusPill } from "@/components/ui/Status";
import { useReconStore } from "@/store/recon-store";
import type { Transaction } from "@/lib/types";
import {
  cn,
  formatCurrency,
  formatDate,
  formatDateTime,
  roleLabel,
} from "@/lib/utils";

export default function ReconDetailPage() {
  const params = useParams<{ id: string }>();
  const reconId = params.id;

  const reconciliations = useReconStore((s) => s.reconciliations);
  const accounts = useReconStore((s) => s.accounts);
  const branches = useReconStore((s) => s.branches);
  const transactions = useReconStore((s) => s.transactions);
  const matches = useReconStore((s) => s.matches);
  const outstanding = useReconStore((s) => s.outstanding);
  const exhibits = useReconStore((s) => s.exhibits);
  const users = useReconStore((s) => s.users);
  const currentUser = useReconStore((s) => s.currentUser);
  const period = useReconStore((s) => s.period);
  const canEdit = useReconStore((s) => s.canEdit);
  const isReadOnlyRole = useReconStore((s) => s.isReadOnlyRole);
  const confirmSuggestedMatch = useReconStore((s) => s.confirmSuggestedMatch);
  const createManualMatch = useReconStore((s) => s.createManualMatch);
  const unmatch = useReconStore((s) => s.unmatch);
  const saveOutstanding = useReconStore((s) => s.saveOutstanding);
  const uploadExhibit = useReconStore((s) => s.uploadExhibit);
  const submitRecon = useReconStore((s) => s.submitRecon);
  const requestFreezeOverride = useReconStore((s) => s.requestFreezeOverride);

  const recon = reconciliations.find((r) => r.id === reconId);
  const account = accounts.find((a) => a.id === recon?.accountId);

  const [selDebit, setSelDebit] = useState<string | null>(null);
  const [selCredit, setSelCredit] = useState<string | null>(null);
  const [manualComment, setManualComment] = useState("");
  const [submitComment, setSubmitComment] = useState("");
  const [outComment, setOutComment] = useState<Record<string, string>>({});
  const [outAction, setOutAction] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"match" | "matched" | "outstanding" | "workflow">(
    "match"
  );
  const [matchFlash, setMatchFlash] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  const editable =
    canEdit() &&
    !isReadOnlyRole() &&
    recon &&
    (recon.status === "draft" || recon.status === "rejected" || recon.status === "query") &&
    (currentUser?.role === "inputter" || currentUser?.role === "admin");

  const frozenBlocked = period.freezeStatus === "frozen" && !canEdit();

  const txs = useMemo(
    () => transactions.filter((t) => t.accountId === account?.id),
    [transactions, account?.id]
  );

  const unmatchedDebits = txs.filter((t) => !t.matched && t.side === "debit");
  const unmatchedCredits = txs.filter((t) => !t.matched && t.side === "credit");
  const accountMatches = matches.filter((m) => m.accountId === account?.id);
  const accountOutstanding = outstanding.filter((o) => o.accountId === account?.id);
  const accountExhibits = exhibits.filter(
    (e) => e.accountId === account?.id || e.reconciliationId === reconId
  );

  const suggested = useMemo(() => {
    const pairs: Array<{ debit: Transaction; credit: Transaction; reason: string }> = [];
    for (const d of unmatchedDebits) {
      const byRef = unmatchedCredits.find(
        (c) => c.refNo === d.refNo && c.amount === d.amount
      );
      if (byRef) {
        pairs.push({ debit: d, credit: byRef, reason: "Same Ref No + amount" });
        continue;
      }
      const byAmt = unmatchedCredits.find(
        (c) =>
          c.amount === d.amount &&
          Math.abs(
            new Date(c.valueDate).getTime() - new Date(d.valueDate).getTime()
          ) <=
            3 * 86400000
      );
      if (byAmt) {
        pairs.push({ debit: d, credit: byAmt, reason: "Amount + date proximity" });
      }
    }
    // unique by debit
    const seen = new Set<string>();
    return pairs.filter((p) => {
      if (seen.has(p.debit.id)) return false;
      seen.add(p.debit.id);
      return true;
    });
  }, [unmatchedDebits, unmatchedCredits]);

  const matchedTotal = accountMatches.reduce((s, m) => s + m.amount, 0);
  const outstandingSum = txs
    .filter((t) => !t.matched)
    .reduce((s, t) => s + (t.side === "debit" ? t.amount : -t.amount), 0);
  const exhibitTotal = Math.abs(outstandingSum);
  const validationDelta = account ? account.glBalance - exhibitTotal : 0;
  const glOk = account ? Math.abs(validationDelta) < 1 : false;

  if (!recon || !account) {
    return (
      <div className="mx-auto max-w-3xl py-20 text-center">
        <p className="text-[var(--ink-secondary)]">Reconciliation not found.</p>
        <Link href="/recon" className="mt-4 inline-block text-[var(--pab-red)]">
          Back to list
        </Link>
      </div>
    );
  }

  const branch = branches.find((b) => b.id === account.branchId);

  async function onConfirmSuggested(d: string, c: string) {
    await confirmSuggestedMatch(account!.id, d, c);
    setMatchFlash(true);
    setTimeout(() => setMatchFlash(false), 600);
    setSelDebit(null);
    setSelCredit(null);
  }

  async function onManualMatch() {
    if (!selDebit || !selCredit) return;
    await createManualMatch(account!.id, selDebit, selCredit, manualComment);
    setManualComment("");
    setSelDebit(null);
    setSelCredit(null);
    setMatchFlash(true);
    setTimeout(() => setMatchFlash(false), 600);
  }

  function onUpload(file: File | null) {
    if (!file) return;
    void uploadExhibit({
      accountId: account!.id,
      reconciliationId: reconId,
      name: file.name,
      size: file.size,
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/recon"
            className="text-xs font-medium text-[var(--ink-tertiary)] hover:text-[var(--pab-red)]"
          >
            ← Reconciliations
          </Link>
          <h1 className="mt-1 font-[family-name:var(--font-outfit)] text-[26px] font-semibold tracking-tight">
            {account.name}
          </h1>
          <p className="text-sm text-[var(--ink-secondary)]">
            {account.number} · {branch?.name} · GL {account.glCode}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusPill status={recon.status} />
            <Badge tone="red">{account.type}</Badge>
            {recon.overdue && <Badge tone="amber">Overdue</Badge>}
          </div>
        </div>
        {editable && (
          <div className="flex flex-col gap-2 sm:items-end">
            <textarea
              value={submitComment}
              onChange={(e) => setSubmitComment(e.target.value)}
              placeholder="Submission comment…"
              className="h-20 w-full min-w-[260px] rounded-xl border border-[var(--hairline)] bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--pab-red)] sm:w-72"
            />
            <Button onClick={() => void submitRecon(reconId, submitComment)}>
              Submit to Approver
            </Button>
          </div>
        )}
        {frozenBlocked && (
          <div className="rounded-2xl border border-[#ffccc7] bg-[#fff2f0] p-4 sm:max-w-xs">
            <p className="text-sm font-medium text-[#b42318]">Period frozen</p>
            <p className="mt-1 text-xs text-[var(--ink-secondary)]">
              Request a Finance override to amend.
            </p>
            <textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              className="mt-2 h-16 w-full rounded-lg border border-[var(--hairline)] p-2 text-xs"
              placeholder="Reason…"
            />
            <Button
              size="sm"
              className="mt-2"
              onClick={() => void requestFreezeOverride(reconId, overrideReason)}
            >
              Request override
            </Button>
          </div>
        )}
      </div>

      {/* Balance validation strip */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-6 rounded-2xl border px-5 py-4",
          glOk
            ? "border-[#b7ebc6] bg-[#f6ffed]"
            : "border-[#ffe58f] bg-[#fffbe6]",
          matchFlash && "animate-match-ok"
        )}
      >
        <div>
          <p className="text-[11px] uppercase tracking-wide text-[var(--ink-tertiary)]">
            GL balance
          </p>
          <p className="font-[family-name:var(--font-outfit)] text-lg font-semibold tabular-nums">
            {formatCurrency(account.glBalance)}
          </p>
        </div>
        <div className="text-[var(--ink-tertiary)]">vs</div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-[var(--ink-tertiary)]">
            Outstanding exhibit
          </p>
          <p className="font-[family-name:var(--font-outfit)] text-lg font-semibold tabular-nums">
            {formatCurrency(exhibitTotal)}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-[var(--ink-tertiary)]">
            Matched value
          </p>
          <p className="font-[family-name:var(--font-outfit)] text-lg font-semibold tabular-nums">
            {formatCurrency(matchedTotal)}
          </p>
        </div>
        <div className="ml-auto">
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              glOk ? "bg-[#e5f8ea] text-[#0e7a32]" : "bg-[#fff4e0] text-[#9a6700]"
            )}
          >
            {glOk ? "Validated" : "Review variance"}
          </span>
          {!glOk && (
            <p className="mt-1 text-right text-[11px] text-[var(--ink-tertiary)]">
              Δ {formatCurrency(Math.abs(validationDelta))}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-1 border-b border-[var(--hairline)]">
        {(
          [
            ["match", "Match canvas"],
            ["matched", `Matched (${accountMatches.length})`],
            ["outstanding", `Outstanding (${unmatchedDebits.length + unmatchedCredits.length})`],
            ["workflow", "Workflow"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition",
              tab === id
                ? "border-b-2 border-[var(--pab-red)] text-ink"
                : "text-[var(--ink-tertiary)] hover:text-ink"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "match" && (
        <div className="space-y-5">
          {suggested.length > 0 && (
            <section className="rounded-[20px] border border-[var(--hairline)] bg-white p-5">
              <h2 className="font-[family-name:var(--font-outfit)] text-base font-semibold">
                Suggested matches
              </h2>
              <ul className="mt-3 space-y-2">
                {suggested.map((s) => (
                  <li
                    key={s.debit.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--surface-secondary)] px-4 py-3"
                  >
                    <div className="text-sm">
                      <span className="font-medium">{s.debit.refNo}</span>
                      <span className="mx-2 text-[var(--ink-tertiary)]">↔</span>
                      <span className="font-medium">{s.credit.refNo}</span>
                      <span className="ml-3 tabular-nums">
                        {formatCurrency(s.debit.amount)}
                      </span>
                      <p className="text-xs text-[var(--ink-tertiary)]">{s.reason}</p>
                    </div>
                    {editable && (
                      <Button
                        size="sm"
                        onClick={() => void onConfirmSuggested(s.debit.id, s.credit.id)}
                      >
                        Confirm
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
            <TxColumn
              title="Unmatched debits"
              items={unmatchedDebits}
              selected={selDebit}
              onSelect={setSelDebit}
              side="debit"
            />
            <div className="flex flex-col items-center justify-center gap-3 py-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--ink-tertiary)]">
                Manual match
              </p>
              {editable ? (
                <>
                  <textarea
                    value={manualComment}
                    onChange={(e) => setManualComment(e.target.value)}
                    placeholder="Justification (required)…"
                    className="h-24 w-44 rounded-xl border border-[var(--hairline)] bg-white p-2 text-xs outline-none focus:ring-2 focus:ring-[var(--pab-red)]"
                  />
                  <Button
                    size="sm"
                    disabled={!selDebit || !selCredit}
                    onClick={() => void onManualMatch()}
                  >
                    Match selected
                  </Button>
                </>
              ) : (
                <p className="max-w-[140px] text-center text-xs text-[var(--ink-tertiary)]">
                  View only
                </p>
              )}
            </div>
            <TxColumn
              title="Unmatched credits"
              items={unmatchedCredits}
              selected={selCredit}
              onSelect={setSelCredit}
              side="credit"
            />
          </div>
        </div>
      )}

      {tab === "matched" && (
        <div className="overflow-hidden rounded-[20px] border border-[var(--hairline)] bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--hairline)] text-xs text-[var(--ink-tertiary)]">
                <th className="px-4 py-3 font-medium">URR</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {accountMatches.map((m) => (
                <tr key={m.id} className="border-b border-[var(--hairline)] last:border-0">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-[var(--pab-red)]">
                    {m.urr}
                  </td>
                  <td className="px-4 py-3 capitalize">
                    <Badge tone={m.method === "manual" ? "amber" : "green"}>
                      {m.method}
                    </Badge>
                    {m.comment && (
                      <p className="mt-1 text-xs text-[var(--ink-tertiary)]">{m.comment}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{formatCurrency(m.amount)}</td>
                  <td className="px-4 py-3 text-[var(--ink-secondary)]">
                    {formatDateTime(m.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editable && m.method !== "auto" && (
                      <Button variant="ghost" size="sm" onClick={() => void unmatch(m.id)}>
                        Unmatch
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {accountMatches.length === 0 && (
            <p className="py-10 text-center text-sm text-[var(--ink-tertiary)]">
              No matches yet.
            </p>
          )}
        </div>
      )}

      {tab === "outstanding" && (
        <div className="space-y-4">
          {[...unmatchedDebits, ...unmatchedCredits].map((t) => {
            const existing = accountOutstanding.find((o) => o.transactionId === t.id);
            return (
              <div
                key={t.id}
                className="rounded-[20px] border border-[var(--hairline)] bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {t.refNo}{" "}
                      <span className="font-normal capitalize text-[var(--ink-tertiary)]">
                        · {t.side}
                      </span>
                    </p>
                    <p className="text-xs text-[var(--ink-secondary)]">{t.narrative}</p>
                    <p className="mt-1 text-sm tabular-nums font-medium">
                      {formatCurrency(t.amount)} · aged {t.agingDays}d ({t.agingBucket})
                    </p>
                  </div>
                  <Badge
                    tone={
                      t.agingBucket === "90+"
                        ? "red"
                        : t.agingBucket === "0-30"
                          ? "green"
                          : "amber"
                    }
                  >
                    {t.agingBucket} days
                  </Badge>
                </div>
                {editable ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <textarea
                      defaultValue={existing?.comment ?? outComment[t.id] ?? ""}
                      onChange={(e) =>
                        setOutComment((prev) => ({ ...prev, [t.id]: e.target.value }))
                      }
                      placeholder="Mandatory comment…"
                      className="h-20 rounded-xl border border-[var(--hairline)] p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--pab-red)]"
                    />
                    <textarea
                      defaultValue={existing?.actionTaken ?? outAction[t.id] ?? ""}
                      onChange={(e) =>
                        setOutAction((prev) => ({ ...prev, [t.id]: e.target.value }))
                      }
                      placeholder="Action taken…"
                      className="h-20 rounded-xl border border-[var(--hairline)] p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--pab-red)]"
                    />
                    <Button
                      size="sm"
                      className="sm:col-span-2 sm:w-fit"
                      onClick={() =>
                        void saveOutstanding(
                          account.id,
                          t.id,
                          outComment[t.id] ?? existing?.comment ?? "",
                          outAction[t.id] ?? existing?.actionTaken ?? ""
                        )
                      }
                    >
                      Save outstanding
                    </Button>
                  </div>
                ) : (
                  existing && (
                    <div className="mt-3 rounded-xl bg-[var(--surface-secondary)] p-3 text-sm">
                      <p>{existing.comment}</p>
                      <p className="mt-1 text-xs text-[var(--ink-tertiary)]">
                        Action: {existing.actionTaken}
                      </p>
                    </div>
                  )
                )}
              </div>
            );
          })}
          {unmatchedDebits.length + unmatchedCredits.length === 0 && (
            <p className="py-10 text-center text-sm text-[var(--ink-tertiary)]">
              No outstanding items — fully matched.
            </p>
          )}

          <div className="rounded-[20px] border border-[var(--hairline)] bg-white p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-[family-name:var(--font-outfit)] font-semibold">
                Exhibits
              </h3>
              {editable && (
                <label className="cursor-pointer">
                  <span className="rounded-full bg-[var(--pab-red-soft)] px-3 py-1.5 text-xs font-medium text-[var(--pab-red-deep)]">
                    Upload
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => onUpload(e.target.files?.[0] ?? null)}
                  />
                </label>
              )}
            </div>
            <ul className="mt-3 divide-y divide-[var(--hairline)]">
              {accountExhibits.map((e) => (
                <li key={e.id} className="flex justify-between py-2 text-sm">
                  <span>{e.name}</span>
                  <span className="text-xs text-[var(--ink-tertiary)]">
                    {formatDate(e.uploadedAt)}
                  </span>
                </li>
              ))}
              {accountExhibits.length === 0 && (
                <li className="py-4 text-sm text-[var(--ink-tertiary)]">No exhibits yet.</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {tab === "workflow" && (
        <div className="rounded-[20px] border border-[var(--hairline)] bg-white p-5">
          <h2 className="font-[family-name:var(--font-outfit)] font-semibold">
            Workflow timeline
          </h2>
          <ol className="mt-4 space-y-4">
            {recon.comments.length === 0 && (
              <li className="text-sm text-[var(--ink-tertiary)]">No workflow actions yet.</li>
            )}
            {recon.comments.map((c) => {
              const u = users.find((x) => x.id === c.userId);
              return (
                <li key={c.id} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--pab-red)]" />
                  <div>
                    <p className="text-sm font-medium">
                      {c.action} · {u?.name ?? c.userId}{" "}
                      <span className="font-normal text-[var(--ink-tertiary)]">
                        ({roleLabel(c.role)})
                      </span>
                    </p>
                    <p className="text-sm text-[var(--ink-secondary)]">{c.text}</p>
                    <p className="text-[11px] text-[var(--ink-tertiary)]">
                      {formatDateTime(c.createdAt)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}

function TxColumn({
  title,
  items,
  selected,
  onSelect,
  side,
}: {
  title: string;
  items: Transaction[];
  selected: string | null;
  onSelect: (id: string) => void;
  side: "debit" | "credit";
}) {
  return (
    <div className="rounded-[20px] border border-[var(--hairline)] bg-white">
      <div className="border-b border-[var(--hairline)] px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-[11px] text-[var(--ink-tertiary)]">{items.length} items</p>
      </div>
      <ul className="scrollbar-thin max-h-[420px] overflow-auto p-2">
        {items.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => onSelect(t.id)}
              className={cn(
                "mb-1 w-full rounded-xl px-3 py-2.5 text-left transition",
                selected === t.id
                  ? "bg-[var(--pab-red-soft)] ring-1 ring-[var(--pab-red)]/30"
                  : "hover:bg-[var(--surface-secondary)]"
              )}
            >
              <div className="flex justify-between gap-2">
                <span className="text-sm font-medium">{t.refNo}</span>
                <span
                  className={cn(
                    "text-sm tabular-nums font-semibold",
                    side === "debit" ? "text-ink" : "text-[var(--ink-secondary)]"
                  )}
                >
                  {formatCurrency(t.amount)}
                </span>
              </div>
              <p className="truncate text-xs text-[var(--ink-tertiary)]">{t.narrative}</p>
              <p className="text-[10px] text-[var(--ink-tertiary)]">
                {formatDate(t.valueDate)} · {t.agingDays}d
              </p>
            </button>
          </li>
        ))}
        {items.length === 0 && (
          <li className="py-8 text-center text-xs text-[var(--ink-tertiary)]">None</li>
        )}
      </ul>
    </div>
  );
}
