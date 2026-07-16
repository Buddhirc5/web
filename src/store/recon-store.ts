"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createSeed } from "@/lib/mock/seed";
import { canAccessAccount } from "@/lib/access";
import type {
  AppState,
  Exhibit,
  FreezeOverrideRequest,
  Match,
  OutstandingItem,
  ReconStatus,
  Role,
  User,
} from "@/lib/types";
import { delay, nowIso, uid } from "@/lib/utils";

export interface Toast {
  id: string;
  message: string;
  tone?: "success" | "error" | "info";
}

interface Store extends AppState {
  currentUser: User | null;
  hydrated: boolean;
  toast: Toast | null;
  loading: boolean;
  setHydrated: (v: boolean) => void;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  setToast: (toast: Toast | null) => void;
  showToast: (message: string, tone?: Toast["tone"]) => void;
  resetDemo: () => void;
  simulateFreeze: () => Promise<void>;
  unfreeze: () => Promise<void>;
  confirmSuggestedMatch: (
    accountId: string,
    debitTxIds: string[],
    creditTxIds: string[]
  ) => Promise<void>;
  createManualMatch: (
    accountId: string,
    debitTxIds: string[],
    creditTxIds: string[],
    comment: string
  ) => Promise<void>;
  unmatch: (matchId: string) => Promise<void>;
  saveOutstanding: (
    accountId: string,
    transactionId: string,
    comment: string,
    actionTaken: string
  ) => Promise<void>;
  uploadExhibit: (meta: {
    accountId?: string;
    reconciliationId?: string;
    outstandingId?: string;
    name: string;
    size: number;
  }) => Promise<void>;
  submitRecon: (reconId: string, comment: string) => Promise<void>;
  workflowAction: (
    reconId: string,
    action: "approve" | "reject" | "review" | "return" | "acknowledge" | "query",
    comment: string
  ) => Promise<void>;
  requestFreezeOverride: (branchId: string, reason: string) => Promise<void>;
  reviewFreezeOverride: (
    requestId: string,
    decision: "approved" | "rejected"
  ) => Promise<void>;
  runBulkCycle: (cycleId: string) => Promise<void>;
  markNotificationRead: (id: string) => void;
  /** When frozen, editing is allowed only for branches with an approved override (or admin). */
  canEdit: (accountId?: string) => boolean;
  isBranchUnfrozen: (branchId: string) => boolean;
  isReadOnlyRole: () => boolean;
}

/** Validate 1:1, 1:M, or M:1 — reject empty sides and M:M. */
function validateMatchShape(
  debitTxIds: string[],
  creditTxIds: string[]
): string | null {
  if (debitTxIds.length === 0 || creditTxIds.length === 0) {
    return "Select at least one debit and one credit";
  }
  if (debitTxIds.length > 1 && creditTxIds.length > 1) {
    return "Many-to-many is not allowed — use 1↔many or many↔1";
  }
  return null;
}

function sumTxAmounts(
  transactions: AppState["transactions"],
  ids: string[]
): number {
  return ids.reduce((sum, id) => {
    const t = transactions.find((x) => x.id === id);
    return sum + (t?.amount ?? 0);
  }, 0);
}

function nextStatus(role: Role, action: string, current: ReconStatus): ReconStatus {
  if (action === "reject" || action === "return") return "draft";
  if (action === "query") return "query";
  if (action === "acknowledge") return "closed";
  if (role === "approver" && action === "approve") return "pending_reviewer";
  if (role === "reviewer" && action === "review") return "pending_finance";
  if (current === "query" && action === "approve") return "pending_finance";
  return current;
}

function pushAudit(
  state: AppState,
  partial: Omit<AppState["audit"][number], "id" | "timestamp"> & { timestamp?: string }
): AppState["audit"] {
  return [
    {
      id: uid("aud"),
      timestamp: partial.timestamp ?? nowIso(),
      ...partial,
    },
    ...state.audit,
  ];
}

function calcReconBalance(
  transactions: AppState["transactions"],
  accountId: string
): number {
  return transactions
    .filter((t) => t.accountId === accountId && !t.matched)
    .reduce((sum, t) => sum + (t.side === "debit" ? t.amount : -t.amount), 0);
}

export const useReconStore = create<Store>()(
  persist(
    (set, get) => ({
      ...createSeed(),
      currentUser: null,
      hydrated: false,
      toast: null,
      loading: false,

      setHydrated: (v) => set({ hydrated: v }),

      setToast: (toast) => set({ toast }),

      showToast: (message, tone = "success") => {
        const id = uid("toast");
        set({ toast: { id, message, tone } });
        setTimeout(() => {
          const cur = get().toast;
          if (cur?.id === id) set({ toast: null });
        }, 2800);
      },

      login: async (username, password) => {
        set({ loading: true });
        await delay(350);
        const user = get().users.find(
          (u) => u.username === username.trim().toLowerCase() && u.password === password
        );
        set({ loading: false });
        if (!user) return { ok: false, error: "Invalid username or password" };
        set({ currentUser: user });
        get().showToast(`Welcome, ${user.name}`);
        return { ok: true };
      },

      logout: () => set({ currentUser: null }),

      resetDemo: () => {
        const seed = createSeed();
        set({
          ...seed,
          currentUser: get().currentUser,
          toast: null,
          loading: false,
        });
        get().showToast("Demo data reset", "info");
      },

      isBranchUnfrozen: (branchId) => {
        const { period, freezeOverrides } = get();
        if (period.freezeStatus !== "frozen") return true;
        return freezeOverrides.some(
          (f) =>
            f.branchId === branchId &&
            f.status === "approved" &&
            f.periodId === period.id
        );
      },

      canEdit: (accountId) => {
        const { currentUser, period, accounts } = get();
        if (!currentUser) return false;
        if (currentUser.role === "inquiry") return false;
        if (period.freezeStatus !== "frozen") return true;
        if (currentUser.role === "admin") return true;
        if (!accountId) {
          // No account context: allow if user's own branch (or any) has override
          if (currentUser.branchId) {
            return get().isBranchUnfrozen(currentUser.branchId);
          }
          return false;
        }
        const account = accounts.find((a) => a.id === accountId);
        if (!account) return false;
        return get().isBranchUnfrozen(account.branchId);
      },

      isReadOnlyRole: () => get().currentUser?.role === "inquiry",

      simulateFreeze: async () => {
        set({ loading: true });
        await delay();
        const user = get().currentUser!;
        set((s) => ({
          loading: false,
          period: { ...s.period, freezeStatus: "frozen" },
          audit: pushAudit(s, {
            userId: user.id,
            username: user.username,
            role: user.role,
            activity: "Period frozen",
            remarks: "Total freeze applied after deadline simulation",
            newValue: "frozen",
            previousValue: "open",
          }),
        }));
        get().showToast("Period placed under Total Freeze", "info");
      },

      unfreeze: async () => {
        set({ loading: true });
        await delay();
        const user = get().currentUser!;
        set((s) => ({
          loading: false,
          period: { ...s.period, freezeStatus: "open" },
          audit: pushAudit(s, {
            userId: user.id,
            username: user.username,
            role: user.role,
            activity: "Period unfrozen",
            remarks: "Freeze lifted for demo",
            newValue: "open",
            previousValue: "frozen",
          }),
        }));
        get().showToast("Period reopened");
      },

      confirmSuggestedMatch: async (accountId, debitTxIds, creditTxIds) => {
        if (!get().canEdit(accountId) || get().isReadOnlyRole()) {
          get().showToast("Editing not permitted", "error");
          return;
        }
        const shapeErr = validateMatchShape(debitTxIds, creditTxIds);
        if (shapeErr) {
          get().showToast(shapeErr, "error");
          return;
        }
        const debitSum = sumTxAmounts(get().transactions, debitTxIds);
        const creditSum = sumTxAmounts(get().transactions, creditTxIds);
        if (Math.abs(debitSum - creditSum) > 0.01) {
          get().showToast("Debit and credit totals must match", "error");
          return;
        }
        set({ loading: true });
        await delay();
        const user = get().currentUser!;
        const urrNum = String(get().urrCounter).padStart(5, "0");
        const allIds = [...debitTxIds, ...creditTxIds];
        const match: Match = {
          id: uid("m"),
          urr: `URR${urrNum}`,
          accountId,
          debitTxIds,
          creditTxIds,
          method: "suggested",
          amount: debitSum,
          createdAt: nowIso(),
          createdBy: user.id,
        };
        set((s) => {
          const idSet = new Set(allIds);
          const transactions = s.transactions.map((t) =>
            idSet.has(t.id) ? { ...t, matched: true, matchId: match.id } : t
          );
          const reconciliations = s.reconciliations.map((r) =>
            r.accountId === accountId
              ? { ...r, reconBalance: calcReconBalance(transactions, accountId) }
              : r
          );
          return {
            loading: false,
            matches: [match, ...s.matches],
            transactions,
            reconciliations,
            urrCounter: s.urrCounter + 1,
            audit: pushAudit(s, {
              userId: user.id,
              username: user.username,
              role: user.role,
              activity: "Suggested match confirmed",
              urr: match.urr,
              accountNumber: s.accounts.find((a) => a.id === accountId)?.number,
              remarks: `${debitTxIds.length}D ↔ ${creditTxIds.length}C`,
              branchId: s.accounts.find((a) => a.id === accountId)?.branchId,
            }),
          };
        });
        get().showToast(`Matched — ${match.urr}`);
      },

      createManualMatch: async (accountId, debitTxIds, creditTxIds, comment) => {
        if (!get().canEdit(accountId) || get().isReadOnlyRole()) {
          get().showToast("Editing not permitted", "error");
          return;
        }
        if (!comment.trim()) {
          get().showToast("Comment required for manual match", "error");
          return;
        }
        const shapeErr = validateMatchShape(debitTxIds, creditTxIds);
        if (shapeErr) {
          get().showToast(shapeErr, "error");
          return;
        }
        const debitSum = sumTxAmounts(get().transactions, debitTxIds);
        const creditSum = sumTxAmounts(get().transactions, creditTxIds);
        if (Math.abs(debitSum - creditSum) > 0.01) {
          get().showToast(
            `Totals must balance (Dr ${debitSum.toLocaleString()} vs Cr ${creditSum.toLocaleString()})`,
            "error"
          );
          return;
        }
        set({ loading: true });
        await delay();
        const user = get().currentUser!;
        const urrNum = String(get().urrCounter).padStart(5, "0");
        const allIds = [...debitTxIds, ...creditTxIds];
        const match: Match = {
          id: uid("m"),
          urr: `URR${urrNum}`,
          accountId,
          debitTxIds,
          creditTxIds,
          method: "manual",
          amount: debitSum,
          createdAt: nowIso(),
          createdBy: user.id,
          comment,
          approved: false,
        };
        set((s) => {
          const idSet = new Set(allIds);
          const transactions = s.transactions.map((t) =>
            idSet.has(t.id) ? { ...t, matched: true, matchId: match.id } : t
          );
          const reconciliations = s.reconciliations.map((r) =>
            r.accountId === accountId
              ? { ...r, reconBalance: calcReconBalance(transactions, accountId) }
              : r
          );
          return {
            loading: false,
            matches: [match, ...s.matches],
            transactions,
            reconciliations,
            urrCounter: s.urrCounter + 1,
            audit: pushAudit(s, {
              userId: user.id,
              username: user.username,
              role: user.role,
              activity: "Manual match created",
              urr: match.urr,
              accountNumber: s.accounts.find((a) => a.id === accountId)?.number,
              remarks: comment,
              branchId: s.accounts.find((a) => a.id === accountId)?.branchId,
            }),
          };
        });
        get().showToast(`Manual match ${match.urr} logged`);
      },

      unmatch: async (matchId) => {
        const match = get().matches.find((m) => m.id === matchId);
        if (!match) return;
        if (!get().canEdit(match.accountId) || get().isReadOnlyRole()) {
          get().showToast("Editing not permitted", "error");
          return;
        }
        set({ loading: true });
        await delay(200);
        const user = get().currentUser!;
        set((s) => {
          const transactions = s.transactions.map((t) =>
            t.matchId === matchId ? { ...t, matched: false, matchId: undefined } : t
          );
          return {
            loading: false,
            matches: s.matches.filter((m) => m.id !== matchId),
            transactions,
            reconciliations: s.reconciliations.map((r) =>
              r.accountId === match.accountId
                ? { ...r, reconBalance: calcReconBalance(transactions, match.accountId) }
                : r
            ),
            audit: pushAudit(s, {
              userId: user.id,
              username: user.username,
              role: user.role,
              activity: "Match removed",
              urr: match.urr,
              remarks: "Unmatched by user",
            }),
          };
        });
        get().showToast("Match removed", "info");
      },

      saveOutstanding: async (accountId, transactionId, comment, actionTaken) => {
        if (!get().canEdit(accountId) || get().isReadOnlyRole()) {
          get().showToast("Editing not permitted", "error");
          return;
        }
        if (!comment.trim()) {
          get().showToast("Comment is mandatory for outstanding items", "error");
          return;
        }
        set({ loading: true });
        await delay();
        const user = get().currentUser!;
        const item: OutstandingItem = {
          id: uid("out"),
          transactionId,
          accountId,
          comment,
          actionTaken,
          createdAt: nowIso(),
          createdBy: user.id,
        };
        set((s) => ({
          loading: false,
          outstanding: [
            item,
            ...s.outstanding.filter((o) => o.transactionId !== transactionId),
          ],
          audit: pushAudit(s, {
            userId: user.id,
            username: user.username,
            role: user.role,
            activity: "Outstanding comment saved",
            accountNumber: s.accounts.find((a) => a.id === accountId)?.number,
            remarks: comment,
          }),
        }));
        get().showToast("Outstanding item updated");
      },

      uploadExhibit: async (meta) => {
        if (!get().canEdit(meta.accountId) || get().isReadOnlyRole()) {
          get().showToast("Editing not permitted", "error");
          return;
        }
        set({ loading: true });
        await delay(400);
        const user = get().currentUser!;
        const exhibit: Exhibit = {
          id: uid("ex"),
          ...meta,
          uploadedAt: nowIso(),
          uploadedBy: user.id,
          mimeType: "application/octet-stream",
        };
        set((s) => ({
          loading: false,
          exhibits: [exhibit, ...s.exhibits],
          audit: pushAudit(s, {
            userId: user.id,
            username: user.username,
            role: user.role,
            activity: "Exhibit uploaded",
            reconId: meta.reconciliationId,
            remarks: meta.name,
          }),
        }));
        get().showToast(`Uploaded ${meta.name}`);
      },

      submitRecon: async (reconId, comment) => {
        if (get().isReadOnlyRole()) {
          get().showToast("Editing not permitted", "error");
          return;
        }
        const recon = get().reconciliations.find((r) => r.id === reconId);
        if (!recon) return;
        if (!get().canEdit(recon.accountId)) {
          get().showToast("Branch is frozen — request a branch override", "error");
          return;
        }
        const account = get().accounts.find((a) => a.id === recon.accountId);
        if (!canAccessAccount(get().currentUser, account!)) {
          get().showToast("Not your branch", "error");
          return;
        }
        const unmatched = get().transactions.filter(
          (t) => t.accountId === recon.accountId && !t.matched
        );
        if (unmatched.length > 0) {
          const missingComments = unmatched.filter(
            (t) => !get().outstanding.some((o) => o.transactionId === t.id && o.comment.trim())
          );
          if (missingComments.length > 0) {
            get().showToast(
              `Add comments for ${missingComments.length} outstanding item(s)`,
              "error"
            );
            return;
          }
        }
        if (!comment.trim()) {
          get().showToast("Submission comment required", "error");
          return;
        }
        set({ loading: true });
        await delay();
        const user = get().currentUser!;
        set((s) => ({
          loading: false,
          reconciliations: s.reconciliations.map((r) =>
            r.id === reconId
              ? {
                  ...r,
                  status: "pending_approver" as const,
                  submittedAt: nowIso(),
                  submittedBy: user.id,
                  comments: [
                    ...r.comments,
                    {
                      id: uid("wc"),
                      userId: user.id,
                      role: user.role,
                      action: "submit",
                      text: comment,
                      createdAt: nowIso(),
                    },
                  ],
                }
              : r
          ),
          audit: pushAudit(s, {
            userId: user.id,
            username: user.username,
            role: user.role,
            activity: "Reconciliation submitted",
            reconId,
            accountNumber: s.accounts.find((a) => a.id === recon.accountId)?.number,
            previousValue: recon.status,
            newValue: "pending_approver",
            remarks: comment,
            branchId: account?.branchId,
          }),
          notifications: [
            {
              id: uid("n"),
              title: "Pending approval",
              body: "A reconciliation was submitted for approval.",
              createdAt: nowIso(),
              read: false,
              href: "/queue",
            },
            ...s.notifications,
          ],
        }));
        get().showToast("Submitted to Approver");
      },

      workflowAction: async (reconId, action, comment) => {
        if (get().isReadOnlyRole()) {
          get().showToast("View-only access", "error");
          return;
        }
        if (!comment.trim()) {
          get().showToast("Comment is mandatory", "error");
          return;
        }
        const user = get().currentUser!;
        const recon = get().reconciliations.find((r) => r.id === reconId);
        if (!recon) return;
        const account = get().accounts.find((a) => a.id === recon.accountId);
        if (account && !canAccessAccount(user, account) && user.role !== "finance" && user.role !== "admin") {
          get().showToast("Not your branch", "error");
          return;
        }

        const allowed: Record<string, ReconStatus[]> = {
          approve: ["pending_approver", "query"],
          reject: ["pending_approver"],
          review: ["pending_reviewer"],
          return: ["pending_reviewer", "pending_finance", "query"],
          acknowledge: ["pending_finance"],
          query: ["pending_finance"],
        };

        if (user.role === "approver" && !["approve", "reject"].includes(action)) {
          get().showToast("Action not allowed for your role", "error");
          return;
        }
        if (user.role === "reviewer" && !["review", "return"].includes(action)) {
          get().showToast("Action not allowed for your role", "error");
          return;
        }
        if (
          user.role === "finance" &&
          !["acknowledge", "query", "return"].includes(action)
        ) {
          get().showToast("Action not allowed for your role", "error");
          return;
        }
        if (user.role === "admin") {
          // allow
        } else if (!allowed[action]?.includes(recon.status)) {
          get().showToast("Item is not in your queue", "error");
          return;
        }

        set({ loading: true });
        await delay();
        const newStatus = nextStatus(user.role, action, recon.status);
        set((s) => ({
          loading: false,
          reconciliations: s.reconciliations.map((r) => {
            if (r.id !== reconId) return r;
            const updated = {
              ...r,
              status: newStatus,
              comments: [
                ...r.comments,
                {
                  id: uid("wc"),
                  userId: user.id,
                  role: user.role,
                  action,
                  text: comment,
                  createdAt: nowIso(),
                },
              ],
            };
            if (action === "approve") {
              updated.approvedAt = nowIso();
              updated.approvedBy = user.id;
            }
            if (action === "review") {
              updated.reviewedAt = nowIso();
              updated.reviewedBy = user.id;
            }
            if (action === "acknowledge") {
              updated.closedAt = nowIso();
              updated.closedBy = user.id;
            }
            return updated;
          }),
          audit: pushAudit(s, {
            userId: user.id,
            username: user.username,
            role: user.role,
            activity: `Workflow: ${action}`,
            reconId,
            accountNumber: s.accounts.find((a) => a.id === recon.accountId)?.number,
            previousValue: recon.status,
            newValue: newStatus,
            remarks: comment,
          }),
        }));
        get().showToast(`Action “${action}” completed`);
      },

      requestFreezeOverride: async (branchId, reason) => {
        const user = get().currentUser!;
        if (!reason.trim()) {
          get().showToast("Reason required", "error");
          return;
        }
        if (!branchId) {
          get().showToast("Select a branch", "error");
          return;
        }
        const pending = get().freezeOverrides.find(
          (f) =>
            f.branchId === branchId &&
            f.status === "pending" &&
            f.periodId === get().period.id
        );
        if (pending) {
          get().showToast("An override request is already pending for this branch", "error");
          return;
        }
        if (get().isBranchUnfrozen(branchId)) {
          get().showToast("This branch already has an approved override", "info");
          return;
        }
        set({ loading: true });
        await delay();
        const branch = get().branches.find((b) => b.id === branchId);
        const req: FreezeOverrideRequest = {
          id: uid("fo"),
          periodId: get().period.id,
          branchId,
          requestedBy: user.id,
          reason,
          status: "pending",
          createdAt: nowIso(),
        };
        set((s) => ({
          loading: false,
          freezeOverrides: [req, ...s.freezeOverrides],
          audit: pushAudit(s, {
            userId: user.id,
            username: user.username,
            role: user.role,
            activity: "Freeze override requested",
            branchId,
            remarks: `${branch?.name ?? branchId}: ${reason}`,
          }),
        }));
        get().showToast("Branch override request sent to Finance");
      },

      reviewFreezeOverride: async (requestId, decision) => {
        const user = get().currentUser!;
        if (user.role !== "finance" && user.role !== "admin") {
          get().showToast("Only Finance can review overrides", "error");
          return;
        }
        set({ loading: true });
        await delay();
        const req = get().freezeOverrides.find((f) => f.id === requestId);
        const branch = get().branches.find((b) => b.id === req?.branchId);
        set((s) => ({
          loading: false,
          freezeOverrides: s.freezeOverrides.map((f) =>
            f.id === requestId
              ? {
                  ...f,
                  status: decision,
                  reviewedBy: user.id,
                  reviewedAt: nowIso(),
                }
              : f
          ),
          // Period stays frozen — only the approved branch is unlocked
          audit: pushAudit(s, {
            userId: user.id,
            username: user.username,
            role: user.role,
            activity: `Freeze override ${decision}`,
            branchId: req?.branchId,
            remarks: `${branch?.name ?? req?.branchId}: ${decision}`,
          }),
        }));
        get().showToast(
          decision === "approved"
            ? `Override approved — ${branch?.name ?? "branch"} unlocked`
            : "Override rejected",
          decision === "approved" ? "success" : "info"
        );
      },

      runBulkCycle: async (cycleId) => {
        set({ loading: true });
        await delay(600);
        const user = get().currentUser!;
        const matched = 800 + Math.floor(Math.random() * 400);
        const exceptions = 5 + Math.floor(Math.random() * 20);
        set((s) => ({
          loading: false,
          bulkCycles: s.bulkCycles.map((c) =>
            c.id === cycleId
              ? {
                  ...c,
                  status: "completed" as const,
                  matched,
                  exceptions,
                  ranAt: nowIso(),
                }
              : c
          ),
          bulkExceptions: [
            {
              id: uid("be"),
              cycleId,
              refNo: `EXT-${Math.floor(10000 + Math.random() * 90000)}`,
              amount: Math.floor(5000 + Math.random() * 90000),
              sourceSystem: "External Feed",
              reason: "Unmatched after rule pass",
              agingDays: 0,
              carriedForward: false,
            },
            ...s.bulkExceptions,
          ],
          audit: pushAudit(s, {
            userId: user?.id ?? "system",
            username: user?.username ?? "system",
            role: user?.role ?? "admin",
            activity: "Bulk reconciliation cycle run",
            remarks: `Cycle ${cycleId}: ${matched} matched, ${exceptions} exceptions`,
          }),
        }));
        get().showToast(`Cycle complete — ${matched} matched`);
      },

      markNotificationRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),
    }),
    {
      name: "pabc-recon-poc-v6",
      partialize: (s) => {
        const {
          currentUser,
          users,
          branches,
          departments,
          period,
          accounts,
          transactions,
          matches,
          outstanding,
          exhibits,
          exhibitLines,
          reconciliations,
          audit,
          notifications,
          freezeOverrides,
          bulkCycles,
          bulkExceptions,
          urrCounter,
        } = s;
        return {
          currentUser,
          users,
          branches,
          departments,
          period,
          accounts,
          transactions,
          matches,
          outstanding,
          exhibits,
          exhibitLines,
          reconciliations,
          audit,
          notifications,
          freezeOverrides,
          bulkCycles,
          bulkExceptions,
          urrCounter,
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
