import type { Account, Role, User } from "./types";

export function isBranchScoped(role: Role): boolean {
  return role === "inputter" || role === "approver" || role === "reviewer";
}

export function canAccessAccount(user: User | null | undefined, account: Account): boolean {
  if (!user) return false;
  if (!isBranchScoped(user.role)) return true;
  return Boolean(user.branchId && account.branchId === user.branchId);
}

export function canAccessBranch(user: User | null | undefined, branchId: string): boolean {
  if (!user) return false;
  if (!isBranchScoped(user.role)) return true;
  return user.branchId === branchId;
}
