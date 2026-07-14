"use client";

import { useMemo, useState } from "react";
import { useReconStore } from "@/store/recon-store";
import { canAccessAccount } from "@/lib/access";
import { formatBytes, formatDateTime } from "@/lib/utils";

export default function ExhibitsPage() {
  const currentUser = useReconStore((s) => s.currentUser);
  const exhibits = useReconStore((s) => s.exhibits);
  const accounts = useReconStore((s) => s.accounts);
  const users = useReconStore((s) => s.users);
  const uploadExhibit = useReconStore((s) => s.uploadExhibit);
  const canEdit = useReconStore((s) => s.canEdit);
  const isReadOnlyRole = useReconStore((s) => s.isReadOnlyRole);
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    return exhibits.filter((e) => {
      if (e.accountId) {
        const acc = accounts.find((a) => a.id === e.accountId);
        if (acc && !canAccessAccount(currentUser, acc)) return false;
      }
      if (!q.trim()) return true;
      return e.name.toLowerCase().includes(q.toLowerCase());
    });
  }, [exhibits, q, accounts, currentUser]);

  const editable = canEdit() && !isReadOnlyRole();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-outfit)] text-[28px] font-semibold tracking-tight">
          Exhibits
        </h1>
        <p className="mt-1 text-[15px] text-[var(--ink-secondary)]">
          Supporting documents for audit and regulatory retrieval.
        </p>
      </div>

      {editable && (
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-[20px] border border-dashed border-[var(--hairline)] bg-white px-6 py-10 transition hover:border-[var(--pab-red)]/40">
          <p className="text-sm font-medium">Drop or click to upload</p>
          <p className="mt-1 text-xs text-[var(--ink-tertiary)]">
            Mock upload — metadata only, no server storage
          </p>
          <input
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadExhibit({ name: f.name, size: f.size });
            }}
          />
        </label>
      )}

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search exhibits…"
        className="h-11 w-full max-w-md rounded-xl border border-[var(--hairline)] bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--pab-red)]"
      />

      <div className="overflow-hidden rounded-[20px] border border-[var(--hairline)] bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--hairline)] text-xs text-[var(--ink-tertiary)]">
              <th className="px-4 py-3 font-medium">File</th>
              <th className="px-4 py-3 font-medium">Account</th>
              <th className="px-4 py-3 font-medium">Uploaded by</th>
              <th className="px-4 py-3 font-medium">Size</th>
              <th className="px-4 py-3 font-medium">When</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => {
              const acc = accounts.find((a) => a.id === e.accountId);
              const user = users.find((u) => u.id === e.uploadedBy);
              return (
                <tr key={e.id} className="border-b border-[var(--hairline)] last:border-0">
                  <td className="px-4 py-3 font-medium">{e.name}</td>
                  <td className="px-4 py-3 text-[var(--ink-secondary)]">
                    {acc?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--ink-secondary)]">
                    {user?.name ?? e.uploadedBy}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{formatBytes(e.size)}</td>
                  <td className="px-4 py-3 text-[var(--ink-tertiary)]">
                    {formatDateTime(e.uploadedAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="py-12 text-center text-sm text-[var(--ink-tertiary)]">
            No exhibits found.
          </p>
        )}
      </div>
    </div>
  );
}
