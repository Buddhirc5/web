"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createSeed } from "@/lib/mock/seed";
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
    debitTxId: string,
    creditTxId: string
  ) => Promise<void>;
  createManualMatch: (
    accountId: string,
    debitTxId: string,
    creditTxId: string,
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
  requestFreezeOverride: (reconId: string, reason: string) => Promise<void>;
  reviewFreezeOverride: (
    requestId: string,
    decision: "approved" | "rejected"
  ) => Promise<void>;
  runBulkCycle: (cycleId: string) => Promise<void>;
  markNotificationRead: (id: string) => void;
  canEdit: () => boolean;
  isReadOnlyRole: () => boolean;
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

      canEdit: () => {
        const { currentUser, period } = get();
        if (!currentUser) return false;
        if (currentUser.role === "inquiry") return false;
        if (period.freezeStatus === "frozen" && currentUser.role !== "admin") {
          return false;
        }
        return true;
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

      confirmSuggestedMatch: async (accountId, debitTxId, creditTxId) => {
        if (!get().canEdit() || get().isReadOnlyRole()) {
          get().showToast("Editing not permitted", "error");
          return;
        }
        set({ loading: true });
        await delay();
        const user = get().currentUser!;
        const debit = get().transactions.find((t) => t.id === debitTxId)!;
        const urrNum = String(get().urrCounter).padStart(5, "0");
        const match: Match = {
          id: uid("m"),
          urr: `URR${urrNum}`,
          accountId,
          debitTxId,
          creditTxId,
          method: "suggested",
          amount: debit.amount,
          createdAt: nowIso(),
          createdBy: user.id,
        };
        set((s) => {
          const transactions = s.transactions.map((t) =>
            t.id === debitTxId || t.id === creditTxId
              ? { ...t, matched: true, matchId: match.id }
              : t
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
              remarks: `Matched ${debit.refNo}`,
              branchId: s.accounts.find((a) => a.id === accountId)?.branchId,
            }),
          };
        });
        get().showToast(`Matched — ${match.urr}`);
      },

      createManualMatch: async (accountId, debitTxId, creditTxId, comment) => {
        if (!get().canEdit() || get().isReadOnlyRole()) {
          get().showToast("Editing not permitted", "error");
          return;
        }
        if (!comment.trim()) {
          get().showToast("Comment required for manual match", "error");
          return;
        }
        set({ loading: true });
        await delay();
        const user = get().currentUser!;
        const debit = get().transactions.find((t) => t.id === debitTxId)!;
        const urrNum = String(get().urrCounter).padStart(5, "0");
        const match: Match = {
          id: uid("m"),
          urr: `URR${urrNum}`,
          accountId,
          debitTxId,
          creditTxId,
          method: "manual",
          amount: debit.amount,
          createdAt: nowIso(),
          createdBy: user.id,
          comment,
          approved: false,
        };
        set((s) => {
          const transactions = s.transactions.map((t) =>
            t.id === debitTxId || t.id === creditTxId
              ? { ...t, matched: true, matchId: match.id }
              : t
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
        if (!get().canEdit() || get().isReadOnlyRole()) {
          get().showToast("Editing not permitted", "error");
          return;
        }
        set({ loading: true });
        await delay(200);
        const user = get().currentUser!;
        const match = get().matches.find((m) => m.id === matchId);
        if (!match) {
          set({ loading: false });
          return;
        }
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
        if (!get().canEdit() || get().isReadOnlyRole()) {
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
        if (!get().canEdit() || get().isReadOnlyRole()) {
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
        if (!get().canEdit() || get().isReadOnlyRole()) {
          get().showToast("Editing not permitted", "error");
          return;
        }
        const recon = get().reconciliations.find((r) => r.id === reconId);
        if (!recon) return;
        const unmatched = get().transactions.filter(
          (t) => t.accountId === recon.accountId && !t.matched
        );
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

      requestFreezeOverride: async (reconId, reason) => {
        const user = get().currentUser!;
        if (!reason.trim()) {
          get().showToast("Reason required", "error");
          return;
        }
        set({ loading: true });
        await delay();
        const req: FreezeOverrideRequest = {
          id: uid("fo"),
          periodId: get().period.id,
          reconId,
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
            reconId,
            remarks: reason,
          }),
        }));
        get().showToast("Override request sent to Finance");
      },

      reviewFreezeOverride: async (requestId, decision) => {
        const user = get().currentUser!;
        if (user.role !== "finance" && user.role !== "admin") {
          get().showToast("Only Finance can review overrides", "error");
          return;
        }
        set({ loading: true });
        await delay();
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
          period:
            decision === "approved"
              ? { ...s.period, freezeStatus: "open" as const }
              : s.period,
          audit: pushAudit(s, {
            userId: user.id,
            username: user.username,
            role: user.role,
            activity: `Freeze override ${decision}`,
            remarks: requestId,
          }),
        }));
        get().showToast(
          decision === "approved" ? "Override approved — period reopened" : "Override rejected",
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
      name: "pabc-recon-poc",
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
