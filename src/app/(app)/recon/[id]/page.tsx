"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge, StatusPill } from "@/components/ui/Status";
import { useReconStore } from "@/store/recon-store";
import { canAccessAccount } from "@/lib/access";
import type { Transaction } from "@/lib/types";
import {
  cn,
  formatCurrency,
  formatDate,
  formatDateTime,
  roleLabel,
} from "@/lib/utils";

type SortKey = "date" | "amount" | "ref";

export default function ReconDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const reconId = params.id;

  const reconciliations = useReconStore((s) => s.reconciliations);
  const accounts = useReconStore((s) => s.accounts);
  const branches = useReconStore((s) => s.branches);
  const transactions = useReconStore((s) => s.transactions);
  const matches = useReconStore((s) => s.matches);
  const outstanding = useReconStore((s) => s.outstanding);
  const exhibits = useReconStore((s) => s.exhibits);
  const exhibitLines = useReconStore((s) => s.exhibitLines);
  const users = useReconStore((s) => s.users);
  const currentUser = useReconStore((s) => s.currentUser);
  const period = useReconStore((s) => s.period);
  const canEdit = useReconStore((s) => s.canEdit);
  const isBranchUnfrozen = useReconStore((s) => s.isBranchUnfrozen);
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

  const scheduleLines = useMemo(
    () => exhibitLines.filter((l) => l.accountId === account?.id),
    [exhibitLines, account?.id]
  );

  const [selDebits, setSelDebits] = useState<string[]>([]);
  const [selCredits, setSelCredits] = useState<string[]>([]);
  const [manualComment, setManualComment] = useState("");
  const [submitComment, setSubmitComment] = useState("");
  const [outComment, setOutComment] = useState<Record<string, string>>({});
  const [outAction, setOutAction] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<
    "exhibit" | "match" | "matched" | "outstanding" | "workflow"
  >("match");
  const [matchFlash, setMatchFlash] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [tabReady, setTabReady] = useState(false);
  const [txSearch, setTxSearch] = useState("");
  const [txSort, setTxSort] = useState<SortKey>("date");
  const [matchedSearch, setMatchedSearch] = useState("");

  useEffect(() => {
    if (account && currentUser && !canAccessAccount(currentUser, account)) {
      router.replace("/recon");
    }
  }, [account, currentUser, router]);

  const editable =
    canEdit(account?.id) &&
    !isReadOnlyRole() &&
    recon &&
    (recon.status === "draft" || recon.status === "rejected" || recon.status === "query") &&
    (currentUser?.role === "inputter" || currentUser?.role === "admin");

  const branchUnfrozen = account ? isBranchUnfrozen(account.branchId) : false;
  const frozenBlocked =
    period.freezeStatus === "frozen" &&
    !branchUnfrozen &&
    currentUser?.role !== "admin";

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
  const hasUnmatched = unmatchedDebits.length + unmatchedCredits.length > 0;
  const hasExhibit = scheduleLines.length > 0 || Boolean(account?.zeroBalance);
  const isMatchDemo = account?.id === "kol_match_demo";

  useEffect(() => {
    if (!account || tabReady) return;
    if (isMatchDemo || hasUnmatched) setTab("match");
    else if (hasExhibit) setTab("exhibit");
    setTabReady(true);
  }, [account, isMatchDemo, hasUnmatched, hasExhibit, tabReady]);

  const suggested = useMemo(() => {
    const pairs: Array<{
      debit: Transaction;
      credit: Transaction;
      reason: string;
    }> = [];
    const usedCredits = new Set<string>();
    for (const d of unmatchedDebits) {
      const byRef = unmatchedCredits.find(
        (c) =>
          !usedCredits.has(c.id) && c.refNo === d.refNo && c.amount === d.amount
      );
      if (byRef) {
        pairs.push({ debit: d, credit: byRef, reason: "Same Ref No + amount" });
        usedCredits.add(byRef.id);
        continue;
      }
      const byAmt = unmatchedCredits.find(
        (c) =>
          !usedCredits.has(c.id) &&
          c.amount === d.amount &&
          Math.abs(
            new Date(c.valueDate).getTime() - new Date(d.valueDate).getTime()
          ) <=
            3 * 86400000
      );
      if (byAmt) {
        pairs.push({ debit: d, credit: byAmt, reason: "Amount + date proximity" });
        usedCredits.add(byAmt.id);
      }
    }
    return pairs;
  }, [unmatchedDebits, unmatchedCredits]);

  const matchedTotal = accountMatches.reduce((s, m) => s + m.amount, 0);
  const outstandingSum = txs
    .filter((t) => !t.matched)
    .reduce((s, t) => s + (t.side === "debit" ? t.amount : -t.amount), 0);
  const scheduleBal = account?.scheduleBalance ?? scheduleLines.reduce((s, l) => s + l.amount, 0);
  const ledgerBal = account?.ledgerBalance ?? account?.glBalance ?? 0;
  const difference = scheduleBal - ledgerBal;
  const exhibitOk = Math.abs(difference) < 0.01;
  const exhibitTotal = Math.abs(outstandingSum) || Math.abs(scheduleBal);
  const validationDelta = account ? account.glBalance - exhibitTotal : 0;
  const glOk = account?.zeroBalance
    ? true
    : scheduleLines.length > 0
      ? exhibitOk
      : account
        ? Math.abs(validationDelta) < 1
        : false;

  const debitSum = useMemo(
    () =>
      selDebits.reduce(
        (s, id) => s + (txs.find((t) => t.id === id)?.amount ?? 0),
        0
      ),
    [selDebits, txs]
  );
  const creditSum = useMemo(
    () =>
      selCredits.reduce(
        (s, id) => s + (txs.find((t) => t.id === id)?.amount ?? 0),
        0
      ),
    [selCredits, txs]
  );
  const totalsBalance =
    selDebits.length > 0 &&
    selCredits.length > 0 &&
    Math.abs(debitSum - creditSum) < 0.01;
  const isMm =
    selDebits.length > 1 && selCredits.length > 1;
  const matchShapeOk =
    selDebits.length > 0 &&
    selCredits.length > 0 &&
    !isMm;
  const matchModeLabel =
    selDebits.length <= 1 && selCredits.length <= 1
      ? "1 ↔ 1"
      : selDebits.length === 1
        ? "1 ↔ M"
        : selCredits.length === 1
          ? "M ↔ 1"
          : "M ↔ M (blocked)";

  const filteredMatched = useMemo(() => {
    const q = matchedSearch.trim().toLowerCase();
    if (!q) return accountMatches;
    return accountMatches.filter((m) => {
      const legs = [...m.debitTxIds, ...m.creditTxIds]
        .map((id) => txs.find((t) => t.id === id)?.refNo ?? "")
        .join(" ");
      return `${m.urr} ${m.method} ${m.comment ?? ""} ${legs}`.toLowerCase().includes(q);
    });
  }, [accountMatches, matchedSearch, txs]);

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

  function toggleSelect(
    side: "debit" | "credit",
    id: string
  ) {
    if (side === "debit") {
      setSelDebits((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id);
        // If credits already multi, keep debit to single (avoid M:M)
        if (selCredits.length > 1) return [id];
        return [...prev, id];
      });
    } else {
      setSelCredits((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id);
        if (selDebits.length > 1) return [id];
        return [...prev, id];
      });
    }
  }

  async function onConfirmSuggested(d: string, c: string) {
    await confirmSuggestedMatch(account!.id, [d], [c]);
    setMatchFlash(true);
    setTimeout(() => setMatchFlash(false), 600);
    setSelDebits([]);
    setSelCredits([]);
  }

  async function onManualMatch() {
    if (!matchShapeOk || !totalsBalance) return;
    await createManualMatch(
      account!.id,
      selDebits,
      selCredits,
      manualComment
    );
    setManualComment("");
    setSelDebits([]);
    setSelCredits([]);
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

  function matchLegLabel(m: (typeof accountMatches)[0]) {
    const debits = m.debitTxIds
      .map((id) => txs.find((t) => t.id === id)?.refNo ?? id)
      .join(", ");
    const credits = m.creditTxIds
      .map((id) => txs.find((t) => t.id === id)?.refNo ?? id)
      .join(", ");
    const shape =
      m.debitTxIds.length === 1 && m.creditTxIds.length === 1
        ? "1↔1"
        : m.debitTxIds.length === 1
          ? "1↔M"
          : "M↔1";
    return { debits, credits, shape };
  }

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/recon"
            className="text-[11px] font-medium text-[var(--ink-tertiary)] hover:text-[var(--pab-red)]"
          >
            ← Reconciliations
          </Link>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="font-[family-name:var(--font-outfit)] text-lg font-semibold tracking-tight">
              {account.name}
            </h1>
            <StatusPill status={recon.status} />
            <Badge tone="red">{account.type}</Badge>
            {account.zeroBalance && <Badge tone="green">Zero balance</Badge>}
            {isMatchDemo && <Badge tone="amber">Match demo</Badge>}
            {recon.overdue && <Badge tone="amber">Overdue</Badge>}
            {period.freezeStatus === "frozen" && branchUnfrozen && (
              <Badge tone="green">Branch unlocked</Badge>
            )}
          </div>
          <p className="text-xs text-[var(--ink-secondary)]">
            {account.number} · GL {account.glCode}
            {account.currency ? ` · ${account.currency}` : ""} · {branch?.name}
          </p>
        </div>
        {editable && (
          <div className="flex shrink-0 items-end gap-2 sm:flex-col sm:items-end">
            <textarea
              value={submitComment}
              onChange={(e) => setSubmitComment(e.target.value)}
              placeholder="Submission comment…"
              className="h-12 w-full min-w-[200px] rounded-lg border border-[var(--hairline)] bg-white p-2 text-xs outline-none focus:ring-2 focus:ring-[var(--pab-red)] sm:w-56"
            />
            <Button size="sm" onClick={() => void submitRecon(reconId, submitComment)}>
              Submit to Approver
            </Button>
          </div>
        )}
        {frozenBlocked && (
          <div className="rounded-lg border border-[#ffccc7] bg-[#fff2f0] p-2.5 sm:max-w-xs">
            <p className="text-xs font-medium text-[#b42318]">Branch frozen</p>
            <p className="mt-0.5 text-[11px] text-[var(--ink-secondary)]">
              Request override for <strong>{branch?.name}</strong> — unlocks all GLs at this branch.
            </p>
            <textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              className="mt-1.5 h-12 w-full rounded-md border border-[var(--hairline)] p-1.5 text-[11px]"
              placeholder="Reason for branch unlock…"
            />
            <Button
              size="sm"
              className="mt-1.5"
              onClick={() =>
                void requestFreezeOverride(account.branchId, overrideReason)
              }
            >
              Request branch override
            </Button>
          </div>
        )}
      </div>

      <div
        className={cn(
          "flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-3 py-2",
          glOk
            ? "border-[#b7ebc6] bg-[#f6ffed]"
            : "border-[#ffe58f] bg-[#fffbe6]",
          matchFlash && "animate-match-ok"
        )}
      >
        <div className="flex items-baseline gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-[var(--ink-tertiary)]">
            Schedule
          </span>
          <span className="text-sm font-semibold tabular-nums">
            {formatCurrency(scheduleBal)}
          </span>
        </div>
        <span className="text-[10px] text-[var(--ink-tertiary)]">vs</span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-[var(--ink-tertiary)]">
            Ledger
          </span>
          <span className="text-sm font-semibold tabular-nums">
            {formatCurrency(ledgerBal)}
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-[var(--ink-tertiary)]">
            Diff
          </span>
          <span className="text-sm font-semibold tabular-nums">
            {formatCurrency(difference)}
          </span>
        </div>
        {matchedTotal > 0 && (
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] uppercase tracking-wide text-[var(--ink-tertiary)]">
              Matched
            </span>
            <span className="text-sm font-semibold tabular-nums">
              {formatCurrency(matchedTotal)}
            </span>
          </div>
        )}
        <div className="ml-auto">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              glOk ? "bg-[#e5f8ea] text-[#0e7a32]" : "bg-[#fff4e0] text-[#9a6700]"
            )}
          >
            {glOk ? "Validated" : "Review variance"}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-0.5 border-b border-[var(--hairline)]">
        {(
          [
            ...(hasExhibit
              ? [{ id: "exhibit" as const, label: "Exhibit schedule" }]
              : []),
            { id: "match" as const, label: "Match canvas" },
            { id: "matched" as const, label: `Matched (${accountMatches.length})` },
            {
              id: "outstanding" as const,
              label: `Outstanding (${unmatchedDebits.length + unmatchedCredits.length})`,
            },
            { id: "workflow" as const, label: "Workflow" },
          ] as Array<{
            id: "exhibit" | "match" | "matched" | "outstanding" | "workflow";
            label: string;
          }>
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition",
              tab === item.id
                ? "border-b-2 border-[var(--pab-red)] text-ink"
                : "text-[var(--ink-tertiary)] hover:text-ink"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "exhibit" && (
        <div className="space-y-4">
          <div className="rounded-[20px] border border-[var(--hairline)] bg-white p-5">
            <div className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
              <p>
                <span className="text-[var(--ink-tertiary)]">Branch </span>
                {branch?.name} ({branch?.code})
              </p>
              <p>
                <span className="text-[var(--ink-tertiary)]">GL Subhead </span>
                {account.glCode}
              </p>
              <p>
                <span className="text-[var(--ink-tertiary)]">Acct No </span>
                <span className="font-mono text-xs">{account.number}</span>
              </p>
              <p>
                <span className="text-[var(--ink-tertiary)]">Month </span>
                June 2026
              </p>
            </div>
            {account.zeroBalance ? (
              <p className="rounded-xl bg-[var(--surface-secondary)] px-4 py-8 text-center text-sm text-[var(--ink-secondary)]">
                Zero-balance account — schedule and ledger are both 0. Ready to submit.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--hairline)] text-xs text-[var(--ink-tertiary)]">
                      <th className="pb-2 font-medium">Value date</th>
                      <th className="pb-2 font-medium">Particulars (mock)</th>
                      <th className="pb-2 font-medium">Ref</th>
                      <th className="pb-2 font-medium">CCY</th>
                      <th className="pb-2 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduleLines.map((line) => (
                      <tr
                        key={line.id}
                        className="border-b border-[var(--hairline)] last:border-0"
                      >
                        <td className="py-2.5 whitespace-nowrap">
                          {formatDate(line.valueDate)}
                        </td>
                        <td className="py-2.5">{line.particulars}</td>
                        <td className="py-2.5 font-mono text-xs text-[var(--ink-tertiary)]">
                          {line.refNo ?? "—"}
                        </td>
                        <td className="py-2.5">{line.currency}</td>
                        <td className="py-2.5 text-right tabular-nums font-medium">
                          {formatCurrency(line.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-[var(--hairline)] text-sm font-semibold">
                      <td colSpan={4} className="pt-3">
                        Total as per schedule
                      </td>
                      <td className="pt-3 text-right tabular-nums">
                        {formatCurrency(scheduleBal)}
                      </td>
                    </tr>
                    <tr className="text-sm font-semibold">
                      <td colSpan={4} className="pt-1">
                        Total as per ledger
                      </td>
                      <td className="pt-1 text-right tabular-nums">
                        {formatCurrency(ledgerBal)}
                      </td>
                    </tr>
                    <tr className="text-sm font-semibold">
                      <td colSpan={4} className="pt-1 text-[var(--ink-secondary)]">
                        Difference
                      </td>
                      <td
                        className={cn(
                          "pt-1 text-right tabular-nums",
                          exhibitOk ? "text-[#0e7a32]" : "text-[var(--pab-red)]"
                        )}
                      >
                        {formatCurrency(difference)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "match" && (
        <div className="space-y-2">
          {(isMatchDemo || hasUnmatched) && (
            <p className="rounded-md border border-[var(--hairline)] bg-[var(--pab-red-soft)]/30 px-2.5 py-1.5 text-[11px] text-[var(--ink-secondary)]">
              <span className="font-medium text-ink">Rules:</span> 1↔1, 1↔M, or M↔1 only (M↔M blocked) — totals must balance. Use search/sort for large lists.
            </p>
          )}

          {suggested.length > 0 && (
            <section className="rounded-lg border border-[var(--hairline)] bg-white px-2.5 py-2">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <h2 className="text-xs font-semibold">Suggested matches</h2>
                <p className="text-[10px] text-[var(--ink-tertiary)]">
                  {Math.min(suggested.length, 12)} of {suggested.length}
                </p>
              </div>
              <ul className="mt-1.5 max-h-[140px] space-y-0.5 overflow-auto">
                {suggested.slice(0, 12).map((s) => (
                  <li
                    key={s.debit.id}
                    className="flex items-center justify-between gap-2 rounded-md bg-[var(--surface-secondary)] px-2 py-1"
                  >
                    <div className="min-w-0 truncate text-[11px]">
                      <span className="font-medium">{s.debit.refNo}</span>
                      <span className="mx-1 text-[var(--ink-tertiary)]">↔</span>
                      <span className="font-medium">{s.credit.refNo}</span>
                      <span className="ml-1.5 tabular-nums">
                        {formatCurrency(s.debit.amount)}
                      </span>
                      <span className="ml-1.5 text-[var(--ink-tertiary)]">· {s.reason}</span>
                    </div>
                    {editable && (
                      <Button
                        size="sm"
                        className="shrink-0"
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

          <div className="sticky top-14 z-20 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--hairline)] bg-white/95 px-2.5 py-1.5 shadow-[var(--shadow-soft)] backdrop-blur">
            <input
              value={txSearch}
              onChange={(e) => setTxSearch(e.target.value)}
              placeholder="Search ref, narrative, amount…"
              className="h-7 min-w-[140px] flex-1 rounded-md border border-[var(--hairline)] px-2 text-xs outline-none focus:ring-2 focus:ring-[var(--pab-red)]"
            />
            <select
              value={txSort}
              onChange={(e) => setTxSort(e.target.value as SortKey)}
              className="h-7 rounded-md border border-[var(--hairline)] bg-white px-1.5 text-xs"
            >
              <option value="date">Sort: date</option>
              <option value="amount">Sort: amount</option>
              <option value="ref">Sort: ref</option>
            </select>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="rounded-full bg-[var(--surface-secondary)] px-2 py-0.5 font-medium">
                {matchModeLabel}
              </span>
              <span className="tabular-nums text-[var(--ink-secondary)]">
                Dr {formatCurrency(debitSum)}
              </span>
              <span className="text-[var(--ink-tertiary)]">vs</span>
              <span className="tabular-nums text-[var(--ink-secondary)]">
                Cr {formatCurrency(creditSum)}
              </span>
              {(selDebits.length > 0 || selCredits.length > 0) && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-semibold",
                    isMm
                      ? "bg-[#ffe8e6] text-[#b42318]"
                      : totalsBalance
                        ? "bg-[#e5f8ea] text-[#0e7a32]"
                        : "bg-[#fff4e0] text-[#9a6700]"
                  )}
                >
                  {isMm
                    ? "M↔M blocked"
                    : totalsBalance
                      ? "Balanced"
                      : `Δ ${formatCurrency(Math.abs(debitSum - creditSum))}`}
                </span>
              )}
              {(selDebits.length > 0 || selCredits.length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelDebits([]);
                    setSelCredits([]);
                  }}
                  className="text-[var(--pab-red)] hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-2 lg:grid-cols-[1fr_auto_1fr]">
            <TxColumn
              title="Unmatched debits"
              items={unmatchedDebits}
              selected={selDebits}
              onToggle={(id) => toggleSelect("debit", id)}
              side="debit"
              search={txSearch}
              sort={txSort}
              multiHint={selCredits.length > 1 ? "single only (credits multi)" : "multi-select OK"}
            />
            <div className="flex flex-col items-center justify-center gap-1.5 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--ink-tertiary)]">
                Manual match
              </p>
              {editable ? (
                <>
                  <textarea
                    value={manualComment}
                    onChange={(e) => setManualComment(e.target.value)}
                    placeholder="Justification (required)…"
                    className="h-16 w-36 rounded-md border border-[var(--hairline)] bg-white p-1.5 text-[11px] outline-none focus:ring-2 focus:ring-[var(--pab-red)]"
                  />
                  <Button
                    size="sm"
                    disabled={!matchShapeOk || !totalsBalance || !manualComment.trim()}
                    onClick={() => void onManualMatch()}
                  >
                    Match selected
                  </Button>
                  <p className="max-w-[140px] text-center text-[10px] text-[var(--ink-tertiary)]">
                    {selDebits.length} debit{selDebits.length === 1 ? "" : "s"} ·{" "}
                    {selCredits.length} credit{selCredits.length === 1 ? "" : "s"}
                  </p>
                </>
              ) : (
                <p className="max-w-[120px] text-center text-[11px] text-[var(--ink-tertiary)]">
                  View only
                </p>
              )}
            </div>
            <TxColumn
              title="Unmatched credits"
              items={unmatchedCredits}
              selected={selCredits}
              onToggle={(id) => toggleSelect("credit", id)}
              side="credit"
              search={txSearch}
              sort={txSort}
              multiHint={selDebits.length > 1 ? "single only (debits multi)" : "multi-select OK"}
            />
          </div>
        </div>
      )}

      {tab === "matched" && (
        <div className="space-y-2">
          {accountMatches.length > 8 && (
            <input
              value={matchedSearch}
              onChange={(e) => setMatchedSearch(e.target.value)}
              placeholder="Search URR, ref, method…"
              className="h-7 w-full max-w-md rounded-md border border-[var(--hairline)] px-2 text-xs outline-none focus:ring-2 focus:ring-[var(--pab-red)]"
            />
          )}
          <div className="overflow-hidden rounded-lg border border-[var(--hairline)] bg-white">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--hairline)] text-[10px] text-[var(--ink-tertiary)]">
                  <th className="px-2 py-1.5 font-medium">URR</th>
                  <th className="px-2 py-1.5 font-medium">Shape</th>
                  <th className="px-2 py-1.5 font-medium">Legs</th>
                  <th className="px-2 py-1.5 font-medium">Method</th>
                  <th className="px-2 py-1.5 font-medium">Amount</th>
                  <th className="px-2 py-1.5 font-medium">Created</th>
                  <th className="px-2 py-1.5 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filteredMatched.map((m) => {
                  const legs = matchLegLabel(m);
                  return (
                    <tr key={m.id} className="border-b border-[var(--hairline)] last:border-0">
                      <td className="px-2 py-1.5 font-mono text-[11px] font-semibold text-[var(--pab-red)]">
                        {m.urr}
                      </td>
                      <td className="px-2 py-1.5">
                        <Badge tone={legs.shape === "1↔1" ? "green" : "amber"}>
                          {legs.shape}
                        </Badge>
                      </td>
                      <td className="px-2 py-1.5 text-[11px]">
                        <span className="text-[var(--ink-tertiary)]">Dr </span>
                        {legs.debits}
                        <span className="mx-1 text-[var(--ink-tertiary)]">·</span>
                        <span className="text-[var(--ink-tertiary)]">Cr </span>
                        {legs.credits}
                      </td>
                      <td className="px-2 py-1.5 capitalize">
                        <Badge tone={m.method === "manual" ? "amber" : "green"}>
                          {m.method}
                        </Badge>
                        {m.comment && (
                          <span className="ml-1 text-[10px] text-[var(--ink-tertiary)]">
                            {m.comment}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 tabular-nums">
                        {formatCurrency(m.amount)}
                      </td>
                      <td className="px-2 py-1.5 text-[var(--ink-secondary)]">
                        {formatDateTime(m.createdAt)}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {editable && m.method !== "auto" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void unmatch(m.id)}
                          >
                            Unmatch
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredMatched.length === 0 && (
              <p className="py-6 text-center text-xs text-[var(--ink-tertiary)]">
                {accountMatches.length === 0 ? "No matches yet." : "No matches match search."}
              </p>
            )}
          </div>
        </div>
      )}

      {tab === "outstanding" && (
        <div className="space-y-2">
          <ul className="divide-y divide-[var(--hairline)] rounded-lg border border-[var(--hairline)] bg-white">
          {[...unmatchedDebits, ...unmatchedCredits].map((t) => {
            const existing = accountOutstanding.find((o) => o.transactionId === t.id);
            return (
              <li key={t.id} className="px-2.5 py-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                    <span className="font-semibold">{t.refNo}</span>
                    <span className="capitalize text-[var(--ink-tertiary)]">{t.side}</span>
                    <span className="tabular-nums font-medium">{formatCurrency(t.amount)}</span>
                    <span className="text-[var(--ink-tertiary)]">
                      {t.agingDays}d · {t.agingBucket}
                    </span>
                    <span className="truncate text-[var(--ink-secondary)]">{t.narrative}</span>
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
                    {t.agingBucket}
                  </Badge>
                </div>
                {editable ? (
                  <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                    <textarea
                      defaultValue={existing?.comment ?? outComment[t.id] ?? ""}
                      onChange={(e) =>
                        setOutComment((prev) => ({ ...prev, [t.id]: e.target.value }))
                      }
                      placeholder="Mandatory comment…"
                      className="h-12 rounded-md border border-[var(--hairline)] p-1.5 text-[11px] outline-none focus:ring-2 focus:ring-[var(--pab-red)]"
                    />
                    <textarea
                      defaultValue={existing?.actionTaken ?? outAction[t.id] ?? ""}
                      onChange={(e) =>
                        setOutAction((prev) => ({ ...prev, [t.id]: e.target.value }))
                      }
                      placeholder="Action taken…"
                      className="h-12 rounded-md border border-[var(--hairline)] p-1.5 text-[11px] outline-none focus:ring-2 focus:ring-[var(--pab-red)]"
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
                    <div className="mt-1 rounded-md bg-[var(--surface-secondary)] px-2 py-1 text-[11px]">
                      <p>{existing.comment}</p>
                      <p className="text-[10px] text-[var(--ink-tertiary)]">
                        Action: {existing.actionTaken}
                      </p>
                    </div>
                  )
                )}
              </li>
            );
          })}
          {unmatchedDebits.length + unmatchedCredits.length === 0 && (
            <li className="py-6 text-center text-xs text-[var(--ink-tertiary)]">
              No outstanding items — fully matched.
            </li>
          )}
          </ul>

          <div className="rounded-lg border border-[var(--hairline)] bg-white px-2.5 py-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold">Exhibits</h3>
              {editable && (
                <label className="cursor-pointer">
                  <span className="rounded-full bg-[var(--pab-red-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--pab-red-deep)]">
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
            <ul className="mt-1.5 divide-y divide-[var(--hairline)]">
              {accountExhibits.map((e) => (
                <li key={e.id} className="flex justify-between py-1 text-[11px]">
                  <span>{e.name}</span>
                  <span className="text-[10px] text-[var(--ink-tertiary)]">
                    {formatDate(e.uploadedAt)}
                  </span>
                </li>
              ))}
              {accountExhibits.length === 0 && (
                <li className="py-2 text-[11px] text-[var(--ink-tertiary)]">No exhibits yet.</li>
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
  onToggle,
  side,
  search,
  sort,
  multiHint,
}: {
  title: string;
  items: Transaction[];
  selected: string[];
  onToggle: (id: string) => void;
  side: "debit" | "credit";
  search: string;
  sort: SortKey;
  multiHint: string;
}) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = items;
    if (q) {
      list = items.filter((t) => {
        const hay = `${t.refNo} ${t.narrative} ${t.amount}`.toLowerCase();
        return hay.includes(q);
      });
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sort === "amount") return b.amount - a.amount;
      if (sort === "ref") return a.refNo.localeCompare(b.refNo);
      return new Date(b.valueDate).getTime() - new Date(a.valueDate).getTime();
    });
    return sorted;
  }, [items, search, sort]);

  const selectedSum = selected.reduce(
    (s, id) => s + (items.find((t) => t.id === id)?.amount ?? 0),
    0
  );

  return (
    <div className="rounded-lg border border-[var(--hairline)] bg-white">
      <div className="border-b border-[var(--hairline)] px-2.5 py-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-xs font-semibold">{title}</h3>
          <p className="text-[10px] tabular-nums text-[var(--ink-tertiary)]">
            {filtered.length}
            {filtered.length !== items.length ? ` / ${items.length}` : ""}
          </p>
        </div>
        <p className="text-[10px] text-[var(--ink-tertiary)]">{multiHint}</p>
        {selected.length > 0 && (
          <p className="text-[10px] font-medium tabular-nums text-[var(--pab-red-deep)]">
            {selected.length} sel · {formatCurrency(selectedSum)}
          </p>
        )}
      </div>
      <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-2 border-b border-[var(--hairline)] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-[var(--ink-tertiary)]">
        <span />
        <span>Ref</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Date</span>
      </div>
      <ul className="scrollbar-thin max-h-[min(420px,calc(100vh-280px))] overflow-auto p-1">
        {filtered.map((t) => {
          const isOn = selected.includes(t.id);
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onToggle(t.id)}
                className={cn(
                  "mb-0.5 grid w-full grid-cols-[auto_1fr_auto_auto] items-center gap-x-2 rounded-md px-1.5 py-1 text-left text-[11px] transition",
                  isOn
                    ? "bg-[var(--pab-red-soft)] ring-1 ring-[var(--pab-red)]/30"
                    : "hover:bg-[var(--surface-secondary)]"
                )}
              >
                <span
                  className={cn(
                    "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border text-[9px]",
                    isOn
                      ? "border-[var(--pab-red)] bg-[var(--pab-red)] text-white"
                      : "border-[var(--hairline)]"
                  )}
                  aria-hidden
                >
                  {isOn ? "✓" : ""}
                </span>
                <span className="min-w-0 truncate font-medium">{t.refNo}</span>
                <span
                  className={cn(
                    "tabular-nums font-semibold",
                    side === "debit" ? "text-ink" : "text-[var(--ink-secondary)]"
                  )}
                >
                  {formatCurrency(t.amount)}
                </span>
                <span className="whitespace-nowrap text-[10px] text-[var(--ink-tertiary)]">
                  {formatDate(t.valueDate)}
                </span>
              </button>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="py-4 text-center text-[10px] text-[var(--ink-tertiary)]">
            {items.length === 0 ? "None" : "No rows match search"}
          </li>
        )}
      </ul>
    </div>
  );
}
