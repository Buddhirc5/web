/**
 * Kollupitiya (branch 003) GL chart structure from recon workbook layout.
 * Account names + numbers only. Exhibit line particulars are fictional mock data.
 */
import type { Account, ExhibitLine, Reconciliation } from "../types";

const BRANCH = "br_003";
const DEPT = "dept_branch_ops";

type ZeroSpec = {
  id: string;
  glCode: string;
  number: string;
  name: string;
  currency: string;
  type?: Account["type"];
};

/** Zero-balance GL accounts (names/numbers from structure only). */
export const KOL_ZERO_ACCOUNTS: ZeroSpec[] = [
  { id: "kol_z_hp", glCode: "37045", number: "LK0033704517", name: "HP SUSPENSE AC", currency: "LKR" },
  // BRANCH SUSPENSE AC - LKR is the Engine 01 match playground (seeded separately)
  { id: "kol_z_mtd_eur", glCode: "26050", number: "EU0032605001", name: "MATURED TIME DEPOSITS - EUR", currency: "EUR" },
  { id: "kol_z_susp_aud", glCode: "37040", number: "AU0033704001", name: "BRANCH SUSPENSE AC-AUD", currency: "AUD", type: "Suspense" },
  { id: "kol_z_susp_gbp", glCode: "37040", number: "GB0033704001", name: "BRANCH SUSPENSE AC-GBP", currency: "GBP", type: "Suspense" },
  { id: "kol_z_short_teller", glCode: "01020", number: "LK0030102006", name: "CASH SHORTAGE-TELLER - LKR", currency: "LKR" },
  { id: "kol_z_mcd", glCode: "28040", number: "LK0032804001", name: "MATURED CD - LKR", currency: "LKR" },
  { id: "kol_z_csc", glCode: "56020", number: "LK0035602002", name: "CHEQUES SENT ON COLLECTION-SUSPEN - CONTRA", currency: "LKR" },
  { id: "kol_z_susp_eur", glCode: "37040", number: "EU0033704001", name: "BRANCH SUSPENSE AC-EUR", currency: "EUR", type: "Suspense" },
  { id: "kol_z_over_teller", glCode: "01020", number: "LK0030102007", name: "CASH OVERAGE-TELLER - LKR", currency: "LKR" },
  { id: "kol_z_susp_usd", glCode: "37040", number: "US0033704001", name: "BRANCH SUSPENSE AC-USD", currency: "USD", type: "Suspense" },
  { id: "kol_z_mtd_lkr", glCode: "25060", number: "LK0032506001", name: "MATURED TIME DEPOSITS - LKR", currency: "LKR" },
  { id: "kol_z_sammana", glCode: "18300", number: "LK0031830050", name: "SAMMANA - PENSION ADVANCE ACCT", currency: "LKR", type: "Suspense" },
  { id: "kol_z_debtors", glCode: "37010", number: "LK0031810001", name: "SUSPENSE DEBTORS ACCT", currency: "LKR", type: "Suspense" },
  { id: "kol_z_cdp_usd", glCode: "05120", number: "US0030512001", name: "CHEQUES AND DRAFT PURCHASED - FOREIGN - USD", currency: "USD" },
  { id: "kol_z_pawn_auc", glCode: "37045", number: "LK0033704505", name: "PAWNING & RAN LOAN AUCTION SUSPENSE", currency: "LKR", type: "Suspense" },
  { id: "kol_z_leasing", glCode: "37045", number: "LK0033704516", name: "LEASING SUSPENSE AC", currency: "LKR", type: "Suspense" },
  { id: "kol_z_short_crm", glCode: "01020", number: "LK0030102015", name: "CASH SHORTAGE - CRM", currency: "LKR" },
  { id: "kol_z_bg", glCode: "18010", number: "LK0031801012", name: "BANK GUARANTEE INVOCATION", currency: "LKR" },
  { id: "kol_z_susp_cad", glCode: "37040", number: "CA0033704001", name: "BRANCH SUSPENSE AC - CAD", currency: "CAD", type: "Suspense" },
  { id: "kol_z_susp_sgd", glCode: "37040", number: "SG0033704001", name: "BRANCH SUSPENSE AC - SGD", currency: "SGD", type: "Suspense" },
  { id: "kol_z_over_crm", glCode: "01020", number: "LK0030102014", name: "CASH OVERAGE - CRM", currency: "LKR" },
  { id: "kol_z_cdp_aud", glCode: "05120", number: "AU0030512001", name: "CHEQUES AND DRAFT PURCHASED - FOREIGN - AUD", currency: "AUD" },
  { id: "kol_z_mtd_usd", glCode: "26050", number: "US0032605001", name: "MATURED TIME DEPOSITS - USD", currency: "USD" },
  { id: "kol_z_swab", glCode: "18100", number: "000031810007", name: "SWABHIMANA PAY ORDER ISSUENCE A/C", currency: "LKR" },
  { id: "kol_z_mtd_aud", glCode: "26050", number: "AU0032605001", name: "MATURED TIME DEPOSITS - AUD", currency: "AUD" },
  { id: "kol_z_short_cdm", glCode: "01020", number: "LK0030102013", name: "CASH SHORTAGE - CDM", currency: "LKR" },
  { id: "kol_z_pawn_disb", glCode: "37010", number: "LK0031830509", name: "PAWNING & RAN LOAN DISBURSEMENT", currency: "LKR", type: "Suspense" },
];

type ExhibitSpec = {
  id: string;
  glCode: string;
  number: string;
  name: string;
  currency: string;
  type?: Account["type"];
  scheduleBalance: number;
  ledgerBalance: number;
  status: Reconciliation["status"];
  overdue?: boolean;
  lines: Array<{ valueDate: string; particulars: string; amount: number; refNo?: string }>;
};

/** Exhibit accounts — GL header from structure; line items are fictional. */
export const KOL_EXHIBIT_SPECS: ExhibitSpec[] = [
  {
    id: "kol_ex_gold",
    glCode: "17010",
    number: "LK0031701002",
    name: "GOLD SPECIMEN",
    currency: "LKR",
    scheduleBalance: 45000,
    ledgerBalance: 45000,
    status: "draft",
    lines: [
      { valueDate: "2026-03-12", particulars: "Demo — gold specimen valuation adj.", amount: 25000, refNo: "GS-DEMO-01" },
      { valueDate: "2026-05-20", particulars: "Demo — specimen transfer in", amount: 20000, refNo: "GS-DEMO-02" },
    ],
  },
  {
    id: "kol_ex_wht",
    glCode: "18300",
    number: "LK0033602001",
    name: "WITHHOLDING TAX RECOVERED",
    currency: "LKR",
    type: "Suspense",
    scheduleBalance: 12850.5,
    ledgerBalance: 12850.5,
    status: "pending_approver",
    lines: [
      { valueDate: "2026-06-02", particulars: "Demo customer A — WHT recovery", amount: 3200.25 },
      { valueDate: "2026-06-08", particulars: "Demo customer B — WHT recovery", amount: 4150.0 },
      { valueDate: "2026-06-15", particulars: "Demo customer C — WHT recovery", amount: 2875.15 },
      { valueDate: "2026-06-22", particulars: "Demo customer D — WHT recovery", amount: 2625.1 },
    ],
  },
  {
    id: "kol_ex_usd_po",
    glCode: "34045",
    number: "US0033404501",
    name: "US DOLLAR PAY ORDERS",
    currency: "USD",
    scheduleBalance: 8450,
    ledgerBalance: 8450,
    status: "draft",
    lines: [
      { valueDate: "2026-05-10", particulars: "Demo payee Alpha — outward PO", amount: 3200, refNo: "PO-DEMO-U1" },
      { valueDate: "2026-06-01", particulars: "Demo payee Beta — outward PO", amount: 2750, refNo: "PO-DEMO-U2" },
      { valueDate: "2026-06-18", particulars: "Demo payee Gamma — outward PO", amount: 2500, refNo: "PO-DEMO-U3" },
    ],
  },
  {
    id: "kol_ex_payorder",
    glCode: "37010",
    number: "000303404001",
    name: "PAY ORDER - CUSTOMER",
    currency: "LKR",
    type: "Suspense",
    scheduleBalance: 1250000,
    ledgerBalance: 1250000,
    status: "pending_reviewer",
    lines: [
      { valueDate: "2026-04-21", particulars: "Demo — Inland Revenue (mock)", amount: 480000, refNo: "PO-DEMO-101" },
      { valueDate: "2026-05-12", particulars: "Demo — Insurance premium (mock)", amount: 95000, refNo: "PO-DEMO-102" },
      { valueDate: "2026-05-25", particulars: "Demo — Customs duty (mock)", amount: 210000, refNo: "PO-DEMO-103" },
      { valueDate: "2026-06-04", particulars: "Demo — Customer payout A", amount: 275000, refNo: "PO-DEMO-104" },
      { valueDate: "2026-06-09", particulars: "Demo — Customer payout B", amount: 90000, refNo: "PO-DEMO-105" },
      { valueDate: "2026-06-09", particulars: "Demo — Army HQ payment (mock)", amount: 100000, refNo: "PO-DEMO-106" },
    ],
  },
  {
    id: "kol_ex_creditors",
    glCode: "37010",
    number: "LK0033701001",
    name: "SUSPENSE CREDITORS - ACCOUNTS - LKR",
    currency: "LKR",
    type: "Suspense",
    scheduleBalance: 31879.05,
    ledgerBalance: 31879.05,
    status: "draft",
    lines: [
      { valueDate: "2026-04-11", particulars: "Demo — pawning auction surplus hold", amount: 18879.05, refNo: "SC-DEMO-01" },
      { valueDate: "2026-05-30", particulars: "Demo — unclaimed credit pending claim", amount: 13000, refNo: "SC-DEMO-02" },
    ],
  },
  {
    id: "kol_ex_atm_over",
    glCode: "01020",
    number: "LK0030102010",
    name: "CASH OVERAGE ACCOUNT-ATM",
    currency: "LKR",
    scheduleBalance: 3500,
    ledgerBalance: 3500,
    status: "closed",
    lines: [
      { valueDate: "2026-01-19", particulars: "Demo — ATM cash overage", amount: 2000 },
      { valueDate: "2026-03-01", particulars: "Demo — ATM cash overage", amount: 500 },
      { valueDate: "2026-03-01", particulars: "Demo — ATM cash overage", amount: 1000 },
    ],
  },
  {
    id: "kol_ex_sampath",
    glCode: "37040",
    number: "LK0033704099",
    name: "SAMPATH BANK RECEIVABLE",
    currency: "LKR",
    scheduleBalance: 87500,
    ledgerBalance: 87500,
    status: "pending_approver",
    lines: [
      { valueDate: "2026-06-10", particulars: "Demo — clearing receivable batch A", amount: 42500, refNo: "SB-DEMO-01" },
      { valueDate: "2026-06-20", particulars: "Demo — clearing receivable batch B", amount: 45000, refNo: "SB-DEMO-02" },
    ],
  },
  {
    id: "kol_ex_cdm_over",
    glCode: "01020",
    number: "LK0030102011",
    name: "CASH OVERAGE - CDM",
    currency: "LKR",
    scheduleBalance: 6200,
    ledgerBalance: 6200,
    status: "draft",
    lines: [
      { valueDate: "2026-05-05", particulars: "Demo — CDM overage", amount: 3200 },
      { valueDate: "2026-06-14", particulars: "Demo — CDM overage", amount: 3000 },
    ],
  },
  {
    id: "kol_ex_cdp_loc",
    glCode: "05120",
    number: "LK0030512001",
    name: "CHEQUE AND DRAFT PURCHASED - LOCAL",
    currency: "LKR",
    scheduleBalance: 156000,
    ledgerBalance: 156000,
    status: "pending_finance",
    overdue: true,
    lines: [
      { valueDate: "2026-04-02", particulars: "Demo — local draft purchased", amount: 78000, refNo: "CDP-DEMO-01" },
      { valueDate: "2026-05-18", particulars: "Demo — local cheque purchased", amount: 78000, refNo: "CDP-DEMO-02" },
    ],
  },
  {
    id: "kol_ex_cdm2",
    glCode: "01020",
    number: "LK0030102012",
    name: "CASH OVERAGE - CDM 2",
    currency: "LKR",
    scheduleBalance: 1500,
    ledgerBalance: 1500,
    status: "draft",
    lines: [
      { valueDate: "2026-06-01", particulars: "Demo — secondary CDM overage", amount: 1500 },
    ],
  },
  {
    id: "kol_ex_crm_short",
    glCode: "01020",
    number: "LK0030102016",
    name: "CASH SHORTAGE - CRM",
    currency: "LKR",
    scheduleBalance: 2800,
    ledgerBalance: 2800,
    status: "query",
    lines: [
      { valueDate: "2026-05-22", particulars: "Demo — CRM shortage under investigation", amount: 2800, refNo: "CRM-DEMO-01" },
    ],
  },
  {
    id: "kol_ex_csc",
    glCode: "37040",
    number: "000033704050",
    name: "CHEQUES SENT ON COLLECTION",
    currency: "LKR",
    type: "Suspense",
    scheduleBalance: 171544,
    ledgerBalance: 171544,
    status: "pending_approver",
    lines: [
      { valueDate: "2026-06-30", particulars: "Demo — outward clearing zone batch", amount: 171544, refNo: "CLC-DEMO-01" },
    ],
  },
  {
    id: "kol_ex_atm_short",
    glCode: "01020",
    number: "LK0030102009",
    name: "CASH SHORTAGE- ATM - LKR",
    currency: "LKR",
    scheduleBalance: 4100,
    ledgerBalance: 4000,
    status: "draft",
    overdue: true,
    lines: [
      { valueDate: "2026-06-11", particulars: "Demo — ATM shortage pending reconcile", amount: 2500 },
      { valueDate: "2026-06-19", particulars: "Demo — ATM shortage pending reconcile", amount: 1600 },
    ],
  },
];

export function buildKollupitiyaAccounts(): Account[] {
  const zeros: Account[] = KOL_ZERO_ACCOUNTS.map((z) => ({
    id: z.id,
    number: z.number,
    name: z.name,
    type: z.type ?? "GL",
    glCode: z.glCode,
    branchId: BRANCH,
    departmentId: DEPT,
    glBalance: 0,
    currency: z.currency,
    zeroBalance: true,
    ledgerBalance: 0,
    scheduleBalance: 0,
  }));

  const exhibits: Account[] = KOL_EXHIBIT_SPECS.map((e) => ({
    id: e.id,
    number: e.number,
    name: e.name,
    type: e.type ?? "GL",
    glCode: e.glCode,
    branchId: BRANCH,
    departmentId: DEPT,
    glBalance: e.ledgerBalance,
    currency: e.currency,
    zeroBalance: false,
    ledgerBalance: e.ledgerBalance,
    scheduleBalance: e.scheduleBalance,
  }));

  return [...zeros, ...exhibits];
}

export function buildKollupitiyaExhibitLines(): ExhibitLine[] {
  return KOL_EXHIBIT_SPECS.flatMap((e) =>
    e.lines.map((line, i) => ({
      id: `${e.id}_line_${i}`,
      accountId: e.id,
      valueDate: line.valueDate,
      particulars: line.particulars,
      currency: e.currency,
      amount: line.amount,
      refNo: line.refNo,
    }))
  );
}

export function buildKollupitiyaReconciliations(periodId: string): Reconciliation[] {
  const zeroRecs: Reconciliation[] = KOL_ZERO_ACCOUNTS.map((z, i) => ({
    id: `rec_${z.id}`,
    accountId: z.id,
    periodId,
    status: i % 7 === 0 ? ("closed" as const) : ("draft" as const),
    engine: "detailed",
    comments: [],
    reconBalance: 0,
    overdue: false,
    ...(i % 7 === 0
      ? {
          submittedAt: "2026-07-01T10:00:00.000Z",
          submittedBy: "u_kol_inputter",
          approvedAt: "2026-07-01T12:00:00.000Z",
          approvedBy: "u_kol_approver",
          reviewedAt: "2026-07-01T14:00:00.000Z",
          reviewedBy: "u_kol_reviewer",
          closedAt: "2026-07-02T09:00:00.000Z",
          closedBy: "u_finance",
        }
      : {}),
  }));

  const exhibitRecs: Reconciliation[] = KOL_EXHIBIT_SPECS.map((e) => ({
    id: `rec_${e.id}`,
    accountId: e.id,
    periodId,
    status: e.status,
    engine: "detailed",
    comments:
      e.status === "draft"
        ? []
        : [
            {
              id: `wc_${e.id}`,
              userId: "u_kol_inputter",
              role: "inputter" as const,
              action: "submit",
              text: "Mock submission — exhibit schedule balanced for demo.",
              createdAt: "2026-07-02T09:00:00.000Z",
            },
          ],
    reconBalance: e.scheduleBalance,
    overdue: Boolean(e.overdue),
    ...(e.status !== "draft"
      ? {
          submittedAt: "2026-07-02T09:00:00.000Z",
          submittedBy: "u_kol_inputter",
        }
      : {}),
  }));

  return [...zeroRecs, ...exhibitRecs];
}
