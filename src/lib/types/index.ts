export type Role =
  | "inputter"
  | "approver"
  | "reviewer"
  | "finance"
  | "inquiry"
  | "admin";

export type AccountType = "GL" | "Suspense";

export type TxSide = "debit" | "credit";

export type MatchMethod = "auto" | "suggested" | "manual";

export type ReconStatus =
  | "draft"
  | "pending_approver"
  | "pending_reviewer"
  | "pending_finance"
  | "query"
  | "closed"
  | "rejected";

export type FreezeStatus = "open" | "frozen";

export type RagStatus = "green" | "amber" | "red";

export type AgingBucket = "0-30" | "31-60" | "61-90" | "90+";

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  branchId?: string;
  departmentId?: string;
  password: string;
}

export interface Branch {
  id: string;
  code: string;
  name: string;
  address?: string;
  district?: string;
  phone?: string;
  bankCode?: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  category?: "branch" | "head_office" | "control";
  description?: string;
}

export interface ReconPeriod {
  id: string;
  label: string;
  year: number;
  month: number;
  dueDate: string;
  freezeStatus: FreezeStatus;
}

export interface Account {
  id: string;
  number: string;
  name: string;
  type: AccountType;
  glCode: string;
  branchId: string;
  departmentId: string;
  glBalance: number;
  currency?: string;
  zeroBalance?: boolean;
  ledgerBalance?: number;
  scheduleBalance?: number;
}

export interface ExhibitLine {
  id: string;
  accountId: string;
  valueDate: string;
  particulars: string;
  currency: string;
  amount: number;
  refNo?: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  refNo: string;
  side: TxSide;
  amount: number;
  valueDate: string;
  narrative: string;
  matched: boolean;
  matchId?: string;
  agingDays: number;
  agingBucket: AgingBucket;
}

/** One match group: 1↔1, 1↔M, or M↔1 — never M↔M. */
export interface Match {
  id: string;
  urr: string;
  accountId: string;
  debitTxIds: string[];
  creditTxIds: string[];
  method: MatchMethod;
  /** Sum of debit legs (must equal sum of credit legs). */
  amount: number;
  createdAt: string;
  createdBy: string;
  comment?: string;
  approved?: boolean;
}

export interface OutstandingItem {
  id: string;
  transactionId: string;
  accountId: string;
  comment: string;
  actionTaken: string;
  createdAt: string;
  createdBy: string;
}

export interface Exhibit {
  id: string;
  accountId?: string;
  reconciliationId?: string;
  outstandingId?: string;
  name: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  mimeType: string;
}

export interface Reconciliation {
  id: string;
  accountId: string;
  periodId: string;
  status: ReconStatus;
  engine: "detailed" | "bulk";
  submittedAt?: string;
  submittedBy?: string;
  approvedAt?: string;
  approvedBy?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  closedAt?: string;
  closedBy?: string;
  comments: WorkflowComment[];
  reconBalance: number;
  overdue: boolean;
}

export interface WorkflowComment {
  id: string;
  userId: string;
  role: Role;
  action: string;
  text: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  role: Role;
  activity: string;
  accountNumber?: string;
  reconId?: string;
  urr?: string;
  previousValue?: string;
  newValue?: string;
  remarks?: string;
  branchId?: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href?: string;
}

/** Freeze override is branch-scoped — not per GL. */
export interface FreezeOverrideRequest {
  id: string;
  periodId: string;
  branchId: string;
  requestedBy: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface BulkCycle {
  id: string;
  label: string;
  cutOff: string;
  status: "pending" | "running" | "completed";
  matched: number;
  exceptions: number;
  ranAt?: string;
}

export interface BulkException {
  id: string;
  cycleId: string;
  refNo: string;
  amount: number;
  sourceSystem: string;
  reason: string;
  agingDays: number;
  carriedForward: boolean;
}

export interface AppState {
  users: User[];
  branches: Branch[];
  departments: Department[];
  period: ReconPeriod;
  accounts: Account[];
  transactions: Transaction[];
  matches: Match[];
  outstanding: OutstandingItem[];
  exhibits: Exhibit[];
  exhibitLines: ExhibitLine[];
  reconciliations: Reconciliation[];
  audit: AuditEvent[];
  notifications: Notification[];
  freezeOverrides: FreezeOverrideRequest[];
  bulkCycles: BulkCycle[];
  bulkExceptions: BulkException[];
  urrCounter: number;
}
