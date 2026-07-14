import type { Department } from "../types";

/**
 * Head-office / control departments relevant to Reconciliation & Exhibit,
 * aligned with PABC org structure (AR / corporate management) and the
 * signed-off DRG roles (Branch TSM, Finance, Operations, Compliance, Audit).
 */
export const PABC_DEPARTMENTS: Department[] = [
  {
    id: "dept_ops",
    code: "OPS",
    name: "Operations & Administration",
    category: "head_office",
    description: "Branch operations oversight and administration",
  },
  {
    id: "dept_fin",
    code: "FIN",
    name: "Finance & Planning",
    category: "head_office",
    description: "Financial reporting, GL control, and reconciliation acknowledgement",
  },
  {
    id: "dept_tsm",
    code: "TSM",
    name: "Branch TSM",
    category: "control",
    description: "Branch Transaction Support / monitoring (DRG system owner department)",
  },
  {
    id: "dept_treasury",
    code: "TRY",
    name: "Treasury",
    category: "head_office",
    description: "Treasury and investment operations",
  },
  {
    id: "dept_audit",
    code: "IA",
    name: "Internal Audit",
    category: "control",
    description: "Independent assurance and inquiry access",
  },
  {
    id: "dept_compliance",
    code: "CMP",
    name: "Compliance",
    category: "control",
    description: "Regulatory compliance and inquiry access",
  },
  {
    id: "dept_risk",
    code: "RSK",
    name: "Risk Management",
    category: "control",
    description: "Enterprise and operational risk",
  },
  {
    id: "dept_credit_branch",
    code: "BCR",
    name: "Branch Credit",
    category: "head_office",
    description: "Branch credit operations",
  },
  {
    id: "dept_credit_retail",
    code: "RCR",
    name: "Retail Credit",
    category: "head_office",
    description: "Retail credit underwriting and monitoring",
  },
  {
    id: "dept_credit_corp",
    code: "CBR",
    name: "Corporate Banking",
    category: "head_office",
    description: "Corporate banking segment",
  },
  {
    id: "dept_credit_comm",
    code: "CCR",
    name: "Commercial Credit",
    category: "head_office",
    description: "Commercial credit operations",
  },
  {
    id: "dept_recoveries",
    code: "REC",
    name: "Recoveries",
    category: "head_office",
    description: "Recovery and collections",
  },
  {
    id: "dept_it",
    code: "IT",
    name: "Information Technology",
    category: "head_office",
    description: "Core banking and digital platforms (Finacle integration owner)",
  },
  {
    id: "dept_legal",
    code: "LGL",
    name: "Legal",
    category: "head_office",
    description: "Legal advisory",
  },
  {
    id: "dept_hr",
    code: "HR",
    name: "Human Resources",
    category: "head_office",
    description: "People and organisation",
  },
  {
    id: "dept_branch_ops",
    code: "BOP",
    name: "Branch Operations",
    category: "branch",
    description: "Day-to-day branch recon input / approval / review",
  },
];
