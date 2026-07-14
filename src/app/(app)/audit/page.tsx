"use client";

import { useMemo, useState } from "react";
import { useReconStore } from "@/store/recon-store";
import { formatDateTime, roleLabel } from "@/lib/utils";

export default function AuditPage() {
  const audit = useReconStore((s) => s.audit);
  const [q, setQ] = useState("");
  const [activity, setActivity] = useState("all");

  const activities = useMemo(() => {
    const set = new Set(audit.map((a) => a.activity));
    return ["all", ...Array.from(set)];
  }, [audit]);

  const rows = useMemo(() => {
    return audit.filter((a) => {
      if (activity !== "all" && a.activity !== activity) return false;
      if (!q.trim()) return true;
      const hay = `${a.username} ${a.activity} ${a.accountNumber ?? ""} ${a.urr ?? ""} ${a.remarks ?? ""}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [audit, q, activity]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-outfit)] text-[28px] font-semibold tracking-tight">
          Audit trail
        </h1>
        <p className="mt-1 text-[15px] text-[var(--ink-secondary)]">
          Immutable activity log across reconciliation, matching, and freeze controls.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search user, URR, account…"
          className="h-11 w-full max-w-sm rounded-xl border border-[var(--hairline)] bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--pab-red)]"
        />
        <select
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
          className="h-11 rounded-xl border border-[var(--hairline)] bg-white px-3 text-sm outline-none"
        >
          {activities.map((a) => (
            <option key={a} value={a}>
              {a === "all" ? "All activities" : a}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-[var(--hairline)] bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--hairline)] bg-[var(--surface-secondary)]/50 text-xs text-[var(--ink-tertiary)]">
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Activity</th>
              <th className="px-4 py-3 font-medium">Account / URR</th>
              <th className="px-4 py-3 font-medium">Change</th>
              <th className="px-4 py-3 font-medium">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-b border-[var(--hairline)] last:border-0 align-top">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--ink-tertiary)]">
                  {formatDateTime(a.timestamp)}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{a.username}</p>
                  <p className="text-[11px] text-[var(--ink-tertiary)]">
                    {roleLabel(a.role)}
                  </p>
                </td>
                <td className="px-4 py-3">{a.activity}</td>
                <td className="px-4 py-3 text-xs">
                  {a.accountNumber && <p>{a.accountNumber}</p>}
                  {a.urr && (
                    <p className="font-mono font-semibold text-[var(--pab-red)]">{a.urr}</p>
                  )}
                  {a.reconId && (
                    <p className="text-[var(--ink-tertiary)]">{a.reconId}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-[var(--ink-secondary)]">
                  {a.previousValue || a.newValue ? (
                    <>
                      {a.previousValue && <span>{a.previousValue}</span>}
                      {a.previousValue && a.newValue && <span> → </span>}
                      {a.newValue && <span className="font-medium">{a.newValue}</span>}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="max-w-[220px] px-4 py-3 text-xs text-[var(--ink-secondary)]">
                  {a.remarks ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="py-12 text-center text-sm text-[var(--ink-tertiary)]">
            No audit events match.
          </p>
        )}
      </div>
    </div>
  );
}
