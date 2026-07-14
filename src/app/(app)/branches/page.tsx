"use client";

import { useMemo, useState } from "react";
import { useReconStore } from "@/store/recon-store";
import { Badge } from "@/components/ui/Status";

export default function BranchesPage() {
  const branches = useReconStore((s) => s.branches);
  const departments = useReconStore((s) => s.departments);
  const accounts = useReconStore((s) => s.accounts);
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState("all");
  const [tab, setTab] = useState<"branches" | "departments">("branches");

  const districts = useMemo(() => {
    const set = new Set(
      branches.map((b) => b.district).filter(Boolean) as string[]
    );
    return ["all", ...Array.from(set).sort()];
  }, [branches]);

  const filtered = useMemo(() => {
    return branches.filter((b) => {
      if (district !== "all" && b.district !== district) return false;
      if (!q.trim()) return true;
      const hay = `${b.name} ${b.code} ${b.address ?? ""} ${b.district ?? ""} ${b.phone ?? ""}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [branches, q, district]);

  const reconCountByBranch = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of accounts) {
      map.set(a.branchId, (map.get(a.branchId) ?? 0) + 1);
    }
    return map;
  }, [accounts]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-outfit)] text-[28px] font-semibold tracking-tight">
          Network directory
        </h1>
        <p className="mt-1 text-[15px] text-[var(--ink-secondary)]">
          Official Pan Asia Bank branch network (AR 2023) and head-office departments —
          bank code <span className="font-mono font-medium text-ink">7311</span>.
        </p>
      </div>

      <div className="flex gap-1 border-b border-[var(--hairline)]">
        {(
          [
            ["branches", `Branches (${branches.length})`],
            ["departments", `Departments (${departments.length})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-sm font-medium ${
              tab === id
                ? "border-b-2 border-[var(--pab-red)] text-ink"
                : "text-[var(--ink-tertiary)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "branches" && (
        <>
          <div className="flex flex-wrap gap-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search branch, code, district, phone…"
              className="h-11 w-full max-w-md rounded-xl border border-[var(--hairline)] bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--pab-red)]"
            />
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="h-11 rounded-xl border border-[var(--hairline)] bg-white px-3 text-sm"
            >
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d === "all" ? "All districts" : d}
                </option>
              ))}
            </select>
            <p className="flex items-center text-sm text-[var(--ink-tertiary)]">
              Showing {filtered.length}
            </p>
          </div>

          <div className="overflow-hidden rounded-[20px] border border-[var(--hairline)] bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--hairline)] bg-[var(--surface-secondary)]/60 text-xs text-[var(--ink-tertiary)]">
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Branch</th>
                  <th className="px-4 py-3 font-medium">District</th>
                  <th className="px-4 py-3 font-medium">Address</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium text-right">Recon A/Cs</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-[var(--hairline)] last:border-0 hover:bg-black/[0.015]"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-[var(--pab-red)]">
                      {b.code}
                    </td>
                    <td className="px-4 py-3 font-medium">{b.name}</td>
                    <td className="px-4 py-3 text-[var(--ink-secondary)]">{b.district}</td>
                    <td className="max-w-[280px] px-4 py-3 text-xs text-[var(--ink-secondary)]">
                      {b.address}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums">
                      {b.phone}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {reconCountByBranch.get(b.id) ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "departments" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {departments.map((d) => (
            <div
              key={d.id}
              className="rounded-[20px] border border-[var(--hairline)] bg-white p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-[family-name:var(--font-outfit)] font-semibold">
                    {d.name}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-[var(--pab-red)]">{d.code}</p>
                </div>
                <Badge
                  tone={
                    d.category === "control"
                      ? "amber"
                      : d.category === "branch"
                        ? "green"
                        : "neutral"
                  }
                >
                  {d.category === "head_office"
                    ? "Head Office"
                    : d.category === "control"
                      ? "Control"
                      : "Branch"}
                </Badge>
              </div>
              {d.description && (
                <p className="mt-3 text-sm text-[var(--ink-secondary)]">{d.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
