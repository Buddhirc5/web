"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useReconStore } from "@/store/recon-store";
import { Button } from "@/components/ui/Button";
import { cn, formatDate, roleLabel } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Overview", roles: ["all"] },
  { href: "/recon", label: "Reconciliations", roles: ["all"] },
  { href: "/queue", label: "Queue", roles: ["approver", "reviewer", "finance", "admin", "inputter"] },
  { href: "/bulk", label: "Bulk Engine", roles: ["all"] },
  { href: "/branches", label: "Network", roles: ["all"] },
  { href: "/exhibits", label: "Exhibits", roles: ["all"] },
  { href: "/audit", label: "Audit", roles: ["all"] },
  { href: "/reports", label: "Reports", roles: ["all"] },
  { href: "/admin/freeze", label: "Freeze", roles: ["finance", "admin", "inputter"] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useReconStore((s) => s.currentUser);
  const period = useReconStore((s) => s.period);
  const branches = useReconStore((s) => s.branches);
  const notifications = useReconStore((s) => s.notifications);
  const logout = useReconStore((s) => s.logout);
  const markRead = useReconStore((s) => s.markNotificationRead);
  const resetDemo = useReconStore((s) => s.resetDemo);
  const [openNotif, setOpenNotif] = useState(false);

  const userBranch = branches.find((b) => b.id === user?.branchId);
  const isBranchUnfrozen = useReconStore((s) => s.isBranchUnfrozen);
  const branchUnlocked =
    period.freezeStatus === "frozen" &&
    user?.branchId &&
    isBranchUnfrozen(user.branchId);

  const items = useMemo(() => {
    if (!user) return [];
    return nav.filter(
      (n) => n.roles.includes("all") || n.roles.includes(user.role)
    );
  }, [user]);

  const unread = notifications.filter((n) => !n.read).length;

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-[var(--surface-secondary)]">
      <aside className="sticky top-0 flex h-screen w-[220px] shrink-0 flex-col border-r border-[var(--hairline)] bg-white/80 backdrop-blur-xl">
        <div className="flex items-center gap-2.5 px-5 py-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/Pan_Asia_Bank_idEJs9BxkT_0.svg"
            alt="Pan Asia Bank"
            width={36}
            height={24}
          />
          <div className="min-w-0">
            <p className="truncate font-[family-name:var(--font-outfit)] text-[13px] font-semibold tracking-tight text-ink">
              Recon & Exhibit
            </p>
            <p className="truncate text-[10px] text-[var(--ink-tertiary)]">Pan Asia Bank</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-xl px-3 py-2 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-[var(--pab-red-soft)] text-[var(--pab-red-deep)]"
                    : "text-[var(--ink-secondary)] hover:bg-black/[0.03] hover:text-ink"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[var(--hairline)] p-4">
          <p className="truncate text-[13px] font-medium text-ink">{user.name}</p>
          <p className="text-[11px] text-[var(--ink-tertiary)]">{roleLabel(user.role)}</p>
          <div className="mt-3 flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => {
                logout();
                router.replace("/login");
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b border-[var(--hairline)] bg-white/70 px-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="font-[family-name:var(--font-outfit)] text-[15px] font-semibold tracking-tight">
              {period.label}
            </span>
            {userBranch && (
              <span className="rounded-full bg-black/[0.04] px-2.5 py-0.5 text-[11px] font-medium text-ink">
                {userBranch.name} · {userBranch.code}
              </span>
            )}
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                period.freezeStatus === "frozen"
                  ? branchUnlocked
                    ? "bg-[#e5f8ea] text-[#0e7a32]"
                    : "bg-[#ffe8e6] text-[#b42318]"
                  : "bg-[#e5f8ea] text-[#0e7a32]"
              )}
            >
              {period.freezeStatus === "frozen"
                ? branchUnlocked
                  ? "Freeze · branch unlocked"
                  : "Total Freeze"
                : "Open"}
            </span>
            <span className="text-[12px] text-[var(--ink-tertiary)]">
              Due {formatDate(period.dueDate)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={resetDemo}>
              Reset demo
            </Button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenNotif((v) => !v)}
                className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5"
                aria-label="Notifications"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M6 9a6 6 0 1 1 12 0c0 7 3 7 3 7H3s3 0 3-7" />
                  <path d="M10 19a2 2 0 0 0 4 0" />
                </svg>
                {unread > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--pab-red)]" />
                )}
              </button>
              {openNotif && (
                <div className="absolute right-0 top-11 w-80 overflow-hidden rounded-2xl border border-[var(--hairline)] bg-white shadow-[var(--shadow-soft)]">
                  <div className="border-b border-[var(--hairline)] px-4 py-3 text-sm font-semibold">
                    Notifications
                  </div>
                  <ul className="max-h-72 overflow-auto">
                    {notifications.length === 0 && (
                      <li className="px-4 py-6 text-center text-sm text-[var(--ink-tertiary)]">
                        All clear
                      </li>
                    )}
                    {notifications.map((n) => (
                      <li key={n.id}>
                        <button
                          type="button"
                          className="w-full px-4 py-3 text-left hover:bg-black/[0.02]"
                          onClick={() => {
                            markRead(n.id);
                            setOpenNotif(false);
                            if (n.href) router.push(n.href);
                          }}
                        >
                          <p className={cn("text-sm", !n.read && "font-semibold")}>{n.title}</p>
                          <p className="text-xs text-[var(--ink-tertiary)]">{n.body}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="animate-fade-in flex-1 px-5 py-4 pb-8">{children}</main>
        <p className="pointer-events-none fixed bottom-3 right-4 z-30 text-[10px] tracking-wide text-[var(--ink-tertiary)]/70">
          Developed by Buddhi Sandeepa
        </p>
      </div>
    </div>
  );
}
