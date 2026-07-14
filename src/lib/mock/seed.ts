import type { Account, AppState, Match, Reconciliation, Transaction } from "../types";
import { agingBucket } from "../utils";
import { PABC_BRANCHES } from "./branches";
import { PABC_DEPARTMENTS } from "./departments";

const PASSWORD = "demo123";

function daysAgo(days: number): string {
  const d = new Date("2026-07-01T10:00:00.000Z");
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function buildTx(partial: Omit<Transaction, "agingBucket"> & { agingDays: number }): Transaction {
  return {
    ...partial,
    agingBucket: agingBucket(partial.agingDays),
  };
}

export function createSeed(): AppState {
  const branches = PABC_BRANCHES;
  const departments = PABC_DEPARTMENTS;

  // Demo users anchored to real PABC branches / HO departments
  const users = [
    {
      id: "u_inputter",
      username: "inputter",
      name: "Nimal Perera",
      role: "inputter" as const,
      branchId: "br_003", // Kollupitiya
      departmentId: "dept_branch_ops",
      password: PASSWORD,
    },
    {
      id: "u_approver",
      username: "approver",
      name: "Samanthi Jayasuriya",
      role: "approver" as const,
      branchId: "br_003",
      departmentId: "dept_branch_ops",
      password: PASSWORD,
    },
    {
      id: "u_reviewer",
      username: "reviewer",
      name: "Rohan Silva",
      role: "reviewer" as const,
      branchId: "br_003",
      departmentId: "dept_branch_ops",
      password: PASSWORD,
    },
    {
      id: "u_finance",
      username: "finance",
      name: "Dilani Fernando",
      role: "finance" as const,
      branchId: "br_999",
      departmentId: "dept_fin",
      password: PASSWORD,
    },
    {
      id: "u_inquiry",
      username: "inquiry",
      name: "Audit Viewer",
      role: "inquiry" as const,
      branchId: "br_999",
      departmentId: "dept_audit",
      password: PASSWORD,
    },
    {
      id: "u_admin",
      username: "admin",
      name: "System Admin",
      role: "admin" as const,
      branchId: "br_999",
      departmentId: "dept_tsm",
      password: PASSWORD,
    },
  ];

  const coreAccounts: Account[] = [
    {
      id: "acc_18300",
      number: "183000012345",
      name: "Suspense — Clearing",
      type: "Suspense",
      glCode: "18300",
      branchId: "br_003", // Kollupitiya
      departmentId: "dept_branch_ops",
      glBalance: 2450000,
    },
    {
      id: "acc_37040",
      number: "370400098765",
      name: "GL — Interbranch Remittance",
      type: "GL",
      glCode: "37040",
      branchId: "br_003",
      departmentId: "dept_ops",
      glBalance: 875000,
    },
    {
      id: "acc_18510",
      number: "185100055512",
      name: "Suspense — ATM Settlement",
      type: "Suspense",
      glCode: "18510",
      branchId: "br_005", // Kandy
      departmentId: "dept_branch_ops",
      glBalance: 412500,
    },
    {
      id: "acc_41020",
      number: "410200011122",
      name: "GL — Cash in Transit",
      type: "GL",
      glCode: "41020",
      branchId: "br_025", // Galle
      departmentId: "dept_branch_ops",
      glBalance: 0,
    },
    {
      id: "acc_18600",
      number: "186000077788",
      name: "Suspense — Card Acquiring",
      type: "Suspense",
      glCode: "18600",
      branchId: "br_037", // Jaffna
      departmentId: "dept_branch_ops",
      glBalance: 1567800,
    },
  ];

  // Additional suspense/GL accounts across real island-wide branches for dashboard realism
  const extraBranchSpecs: Array<{
    branchId: string;
    glCode: string;
    type: "GL" | "Suspense";
    label: string;
    balance: number;
    status: Reconciliation["status"];
    overdue?: boolean;
  }> = [
    { branchId: "br_001", glCode: "18310", type: "Suspense", label: "Suspense — WTC Clearing", balance: 320000, status: "pending_approver" },
    { branchId: "br_004", glCode: "18320", type: "Suspense", label: "Suspense — Pettah Collections", balance: 185000, status: "draft" },
    { branchId: "br_012", glCode: "37050", type: "GL", label: "GL — Kurunegala Remittance", balance: 95000, status: "pending_reviewer" },
    { branchId: "br_013", glCode: "18520", type: "Suspense", label: "Suspense — Matara ATM", balance: 64000, status: "closed" },
    { branchId: "br_032", glCode: "18330", type: "Suspense", label: "Suspense — Anuradhapura", balance: 210000, status: "pending_finance", overdue: true },
    { branchId: "br_040", glCode: "18610", type: "Suspense", label: "Suspense — Batticaloa Cards", balance: 128000, status: "draft" },
    { branchId: "br_010", glCode: "41030", type: "GL", label: "GL — Negombo CIT", balance: 0, status: "closed" },
    { branchId: "br_011", glCode: "18340", type: "Suspense", label: "Suspense — Gampaha", balance: 77500, status: "pending_approver" },
    { branchId: "br_007", glCode: "37060", type: "GL", label: "GL — Ratnapura Interbranch", balance: 156000, status: "query", overdue: true },
    { branchId: "br_073", glCode: "18530", type: "Suspense", label: "Suspense — Trincomalee ATM", balance: 44200, status: "pending_reviewer" },
    { branchId: "br_034", glCode: "18350", type: "Suspense", label: "Suspense — Vavuniya", balance: 89000, status: "draft" },
    { branchId: "br_016", glCode: "18620", type: "Suspense", label: "Suspense — Wattala Acquiring", balance: 112000, status: "pending_finance" },
    { branchId: "br_999", glCode: "39999", type: "GL", label: "GL — HO Control Account", balance: 0, status: "closed" },
  ];

  const extraAccounts: Account[] = extraBranchSpecs.map((s, i) => {
    const br = branches.find((b) => b.id === s.branchId)!;
    return {
      id: `acc_extra_${i}`,
      number: `${s.glCode}${br.code}0001`,
      name: s.label,
      type: s.type,
      glCode: s.glCode,
      branchId: s.branchId,
      departmentId: s.branchId === "br_999" ? "dept_fin" : "dept_branch_ops",
      glBalance: s.balance,
    };
  });

  const accounts = [...coreAccounts, ...extraAccounts];

  const rawTx: Array<Omit<Transaction, "agingBucket">> = [
    // Account 18300 — mix of matched and outstanding
    {
      id: "tx_d1",
      accountId: "acc_18300",
      refNo: "FT260628001",
      side: "debit",
      amount: 500000,
      valueDate: daysAgo(5),
      narrative: "Customer remittance inward",
      matched: true,
      matchId: "m_1",
      agingDays: 5,
    },
    {
      id: "tx_c1",
      accountId: "acc_18300",
      refNo: "FT260628001",
      side: "credit",
      amount: 500000,
      valueDate: daysAgo(5),
      narrative: "Clearing offset",
      matched: true,
      matchId: "m_1",
      agingDays: 5,
    },
    {
      id: "tx_d2",
      accountId: "acc_18300",
      refNo: "FT260620045",
      side: "debit",
      amount: 250000,
      valueDate: daysAgo(18),
      narrative: "Cheque collection",
      matched: true,
      matchId: "m_2",
      agingDays: 18,
    },
    {
      id: "tx_c2",
      accountId: "acc_18300",
      refNo: "FT260620045",
      side: "credit",
      amount: 250000,
      valueDate: daysAgo(18),
      narrative: "Cheque realisation",
      matched: true,
      matchId: "m_2",
      agingDays: 18,
    },
    {
      id: "tx_d3",
      accountId: "acc_18300",
      refNo: "FT260615088",
      side: "debit",
      amount: 750000,
      valueDate: daysAgo(35),
      narrative: "Unmatched debit — investigation",
      matched: false,
      agingDays: 35,
    },
    {
      id: "tx_c3",
      accountId: "acc_18300",
      refNo: "FT260615099",
      side: "credit",
      amount: 750000,
      valueDate: daysAgo(34),
      narrative: "Possible pair for suggested match",
      matched: false,
      agingDays: 34,
    },
    {
      id: "tx_d4",
      accountId: "acc_18300",
      refNo: "FT260601210",
      side: "debit",
      amount: 950000,
      valueDate: daysAgo(72),
      narrative: "Long outstanding debit",
      matched: false,
      agingDays: 72,
    },
    {
      id: "tx_c4",
      accountId: "acc_18300",
      refNo: "FT260528300",
      side: "credit",
      amount: 0,
      valueDate: daysAgo(95),
      narrative: "Placeholder credit cleared",
      matched: false,
      agingDays: 95,
    },
    // Fix c4 amount - should be outstanding credit
    {
      id: "tx_c5",
      accountId: "acc_18300",
      refNo: "FT260528301",
      side: "credit",
      amount: 200000,
      valueDate: daysAgo(95),
      narrative: "Stale credit pending reverse",
      matched: false,
      agingDays: 95,
    },
    // Account 37040
    {
      id: "tx_d10",
      accountId: "acc_37040",
      refNo: "IB260630010",
      side: "debit",
      amount: 400000,
      valueDate: daysAgo(8),
      narrative: "Interbranch debit",
      matched: true,
      matchId: "m_3",
      agingDays: 8,
    },
    {
      id: "tx_c10",
      accountId: "acc_37040",
      refNo: "IB260630010",
      side: "credit",
      amount: 400000,
      valueDate: daysAgo(8),
      narrative: "Interbranch credit",
      matched: true,
      matchId: "m_3",
      agingDays: 8,
    },
    {
      id: "tx_d11",
      accountId: "acc_37040",
      refNo: "IB260618022",
      side: "debit",
      amount: 475000,
      valueDate: daysAgo(42),
      narrative: "Pending remittance",
      matched: false,
      agingDays: 42,
    },
    // Account 18510
    {
      id: "tx_d20",
      accountId: "acc_18510",
      refNo: "ATM260629001",
      side: "debit",
      amount: 125000,
      valueDate: daysAgo(12),
      narrative: "ATM cash load",
      matched: false,
      agingDays: 12,
    },
    {
      id: "tx_c20",
      accountId: "acc_18510",
      refNo: "ATM260629001",
      side: "credit",
      amount: 125000,
      valueDate: daysAgo(12),
      narrative: "ATM settlement credit",
      matched: false,
      agingDays: 12,
    },
    {
      id: "tx_d21",
      accountId: "acc_18510",
      refNo: "ATM260610055",
      side: "debit",
      amount: 287500,
      valueDate: daysAgo(55),
      narrative: "ATM exception",
      matched: false,
      agingDays: 55,
    },
    // Account 41020 — fully reconciled (zero outstanding)
    {
      id: "tx_d30",
      accountId: "acc_41020",
      refNo: "CIT260630001",
      side: "debit",
      amount: 1500000,
      valueDate: daysAgo(3),
      narrative: "CIT dispatch",
      matched: true,
      matchId: "m_4",
      agingDays: 3,
    },
    {
      id: "tx_c30",
      accountId: "acc_41020",
      refNo: "CIT260630001",
      side: "credit",
      amount: 1500000,
      valueDate: daysAgo(3),
      narrative: "CIT receipt",
      matched: true,
      matchId: "m_4",
      agingDays: 3,
    },
    // Account 18600
    {
      id: "tx_d40",
      accountId: "acc_18600",
      refNo: "CRD260627100",
      side: "debit",
      amount: 890000,
      valueDate: daysAgo(25),
      narrative: "Acquirer settlement",
      matched: false,
      agingDays: 25,
    },
    {
      id: "tx_c40",
      accountId: "acc_18600",
      refNo: "CRD260627200",
      side: "credit",
      amount: 677800,
      valueDate: daysAgo(88),
      narrative: "Merchant payout pending",
      matched: false,
      agingDays: 88,
    },
  ];

  // Remove the bad zero-amount tx
  const transactions = rawTx
    .filter((t) => t.id !== "tx_c4")
    .map((t) => buildTx(t));

  const matches: Match[] = [
    {
      id: "m_1",
      urr: "URR00001",
      accountId: "acc_18300",
      debitTxId: "tx_d1",
      creditTxId: "tx_c1",
      method: "auto",
      amount: 500000,
      createdAt: "2026-07-02T08:00:00.000Z",
      createdBy: "system",
    },
    {
      id: "m_2",
      urr: "URR00002",
      accountId: "acc_18300",
      debitTxId: "tx_d2",
      creditTxId: "tx_c2",
      method: "auto",
      amount: 250000,
      createdAt: "2026-07-02T08:00:01.000Z",
      createdBy: "system",
    },
    {
      id: "m_3",
      urr: "URR00003",
      accountId: "acc_37040",
      debitTxId: "tx_d10",
      creditTxId: "tx_c10",
      method: "auto",
      amount: 400000,
      createdAt: "2026-07-02T08:00:02.000Z",
      createdBy: "system",
    },
    {
      id: "m_4",
      urr: "URR00004",
      accountId: "acc_41020",
      debitTxId: "tx_d30",
      creditTxId: "tx_c30",
      method: "auto",
      amount: 1500000,
      createdAt: "2026-07-02T08:00:03.000Z",
      createdBy: "system",
    },
  ];

  function outstandingBalance(accountId: string): number {
    return transactions
      .filter((t) => t.accountId === accountId && !t.matched)
      .reduce((sum, t) => sum + (t.side === "debit" ? t.amount : -t.amount), 0);
  }

  const reconciliations: Reconciliation[] = [
    {
      id: "rec_18300",
      accountId: "acc_18300",
      periodId: "per_2026_06",
      status: "draft",
      engine: "detailed",
      comments: [],
      reconBalance: outstandingBalance("acc_18300"),
      overdue: false,
    },
    {
      id: "rec_37040",
      accountId: "acc_37040",
      periodId: "per_2026_06",
      status: "pending_approver",
      engine: "detailed",
      submittedAt: "2026-07-03T09:15:00.000Z",
      submittedBy: "u_inputter",
      comments: [
        {
          id: "wc1",
          userId: "u_inputter",
          role: "inputter",
          action: "submit",
          text: "Outstanding remittance under investigation with HO.",
          createdAt: "2026-07-03T09:15:00.000Z",
        },
      ],
      reconBalance: outstandingBalance("acc_37040"),
      overdue: false,
    },
    {
      id: "rec_18510",
      accountId: "acc_18510",
      periodId: "per_2026_06",
      status: "pending_reviewer",
      engine: "detailed",
      submittedAt: "2026-07-02T11:00:00.000Z",
      submittedBy: "u_inputter",
      approvedAt: "2026-07-03T10:00:00.000Z",
      approvedBy: "u_approver",
      comments: [
        {
          id: "wc2",
          userId: "u_inputter",
          role: "inputter",
          action: "submit",
          text: "ATM exceptions logged with vendor ticket #A-9921.",
          createdAt: "2026-07-02T11:00:00.000Z",
        },
        {
          id: "wc3",
          userId: "u_approver",
          role: "approver",
          action: "approve",
          text: "Supporting ticket verified. Forwarding to BM.",
          createdAt: "2026-07-03T10:00:00.000Z",
        },
      ],
      reconBalance: outstandingBalance("acc_18510"),
      overdue: false,
    },
    {
      id: "rec_41020",
      accountId: "acc_41020",
      periodId: "per_2026_06",
      status: "closed",
      engine: "detailed",
      submittedAt: "2026-07-01T14:00:00.000Z",
      submittedBy: "u_inputter",
      approvedAt: "2026-07-01T15:00:00.000Z",
      approvedBy: "u_approver",
      reviewedAt: "2026-07-01T16:00:00.000Z",
      reviewedBy: "u_reviewer",
      closedAt: "2026-07-02T09:00:00.000Z",
      closedBy: "u_finance",
      comments: [
        {
          id: "wc4",
          userId: "u_finance",
          role: "finance",
          action: "acknowledge",
          text: "Fully reconciled. Acknowledged.",
          createdAt: "2026-07-02T09:00:00.000Z",
        },
      ],
      reconBalance: 0,
      overdue: false,
    },
    {
      id: "rec_18600",
      accountId: "acc_18600",
      periodId: "per_2026_06",
      status: "pending_finance",
      engine: "detailed",
      submittedAt: "2026-07-02T08:30:00.000Z",
      submittedBy: "u_inputter",
      approvedAt: "2026-07-02T12:00:00.000Z",
      approvedBy: "u_approver",
      reviewedAt: "2026-07-03T08:00:00.000Z",
      reviewedBy: "u_reviewer",
      comments: [
        {
          id: "wc5",
          userId: "u_reviewer",
          role: "reviewer",
          action: "review",
          text: "Aging items noted. Escalating to Finance.",
          createdAt: "2026-07-03T08:00:00.000Z",
        },
      ],
      reconBalance: outstandingBalance("acc_18600"),
      overdue: true,
    },
    ...extraBranchSpecs.map((s, i) => ({
      id: `rec_extra_${i}`,
      accountId: `acc_extra_${i}`,
      periodId: "per_2026_06",
      status: s.status,
      engine: "detailed" as const,
      comments: [] as Reconciliation["comments"],
      reconBalance: s.balance,
      overdue: Boolean(s.overdue),
      ...(s.status !== "draft"
        ? {
            submittedAt: "2026-07-02T10:00:00.000Z",
            submittedBy: "u_inputter",
          }
        : {}),
    })),
  ];

  return {
    users,
    branches,
    departments,
    period: {
      id: "per_2026_06",
      label: "June 2026",
      year: 2026,
      month: 6,
      dueDate: "2026-07-10",
      freezeStatus: "open",
    },
    accounts,
    transactions,
    matches,
    outstanding: [
      {
        id: "out_1",
        transactionId: "tx_d4",
        accountId: "acc_18300",
        comment: "Awaiting customer confirmation letter.",
        actionTaken: "Follow-up email sent to branch relationship manager.",
        createdAt: "2026-07-03T10:00:00.000Z",
        createdBy: "u_inputter",
      },
    ],
    exhibits: [
      {
        id: "ex_1",
        accountId: "acc_18300",
        reconciliationId: "rec_18300",
        outstandingId: "out_1",
        name: "Customer_Confirmation_FT260601210.pdf",
        size: 245760,
        uploadedAt: "2026-07-03T10:05:00.000Z",
        uploadedBy: "u_inputter",
        mimeType: "application/pdf",
      },
      {
        id: "ex_2",
        accountId: "acc_18510",
        reconciliationId: "rec_18510",
        name: "ATM_Vendor_Ticket_A9921.pdf",
        size: 128400,
        uploadedAt: "2026-07-02T11:05:00.000Z",
        uploadedBy: "u_inputter",
        mimeType: "application/pdf",
      },
    ],
    reconciliations,
    audit: [
      {
        id: "aud_1",
        timestamp: "2026-07-02T08:00:00.000Z",
        userId: "system",
        username: "system",
        role: "admin",
        activity: "Auto-match completed",
        accountNumber: "183000012345",
        urr: "URR00001",
        remarks: "Matched by Ref No FT260628001",
        branchId: "br_003",
      },
      {
        id: "aud_2",
        timestamp: "2026-07-03T09:15:00.000Z",
        userId: "u_inputter",
        username: "inputter",
        role: "inputter",
        activity: "Reconciliation submitted",
        accountNumber: "370400098765",
        reconId: "rec_37040",
        previousValue: "draft",
        newValue: "pending_approver",
        branchId: "br_003",
      },
      {
        id: "aud_3",
        timestamp: "2026-07-03T10:00:00.000Z",
        userId: "u_approver",
        username: "approver",
        role: "approver",
        activity: "Reconciliation approved",
        accountNumber: "185100055512",
        reconId: "rec_18510",
        previousValue: "pending_approver",
        newValue: "pending_reviewer",
        branchId: "br_005",
      },
    ],
    notifications: [
      {
        id: "n1",
        title: "Due soon",
        body: "June 2026 reconciliations due by 10 Jul 2026.",
        createdAt: "2026-07-07T08:00:00.000Z",
        read: false,
        href: "/dashboard",
      },
      {
        id: "n2",
        title: "Queue item",
        body: "Interbranch Remittance awaits your approval.",
        createdAt: "2026-07-03T09:16:00.000Z",
        read: false,
        href: "/queue",
      },
    ],
    freezeOverrides: [],
    bulkCycles: [
      {
        id: "cyc_1",
        label: "Cycle 1 — Morning",
        cutOff: "10:00",
        status: "completed",
        matched: 1240,
        exceptions: 18,
        ranAt: "2026-07-14T10:05:00.000Z",
      },
      {
        id: "cyc_2",
        label: "Cycle 2 — Midday",
        cutOff: "14:00",
        status: "pending",
        matched: 0,
        exceptions: 0,
      },
      {
        id: "cyc_3",
        label: "Cycle 3 — EOD",
        cutOff: "17:30",
        status: "pending",
        matched: 0,
        exceptions: 0,
      },
    ],
    bulkExceptions: [
      {
        id: "be_1",
        cycleId: "cyc_1",
        refNo: "EXT-77821",
        amount: 45200,
        sourceSystem: "Card Switch",
        reason: "Amount mismatch vs Finacle",
        agingDays: 1,
        carriedForward: false,
      },
      {
        id: "be_2",
        cycleId: "cyc_1",
        refNo: "EXT-77890",
        amount: 12800,
        sourceSystem: "ATM Host",
        reason: "Missing credit leg",
        agingDays: 1,
        carriedForward: true,
      },
    ],
    urrCounter: 5,
  };
}
