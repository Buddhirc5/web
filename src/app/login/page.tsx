"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useReconStore } from "@/store/recon-store";

const demos = [
  { user: "inputter", role: "Branch Inputter" },
  { user: "approver", role: "Approver" },
  { user: "reviewer", role: "Reviewer" },
  { user: "finance", role: "Finance" },
  { user: "inquiry", role: "Inquiry" },
  { user: "admin", role: "Admin" },
];

export default function LoginPage() {
  const router = useRouter();
  const login = useReconStore((s) => s.login);
  const user = useReconStore((s) => s.currentUser);
  const hydrated = useReconStore((s) => s.hydrated);
  const loading = useReconStore((s) => s.loading);
  const [username, setUsername] = useState("inputter");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState("");

  useEffect(() => {
    if (hydrated && user) router.replace("/dashboard");
  }, [hydrated, user, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await login(username, password);
    if (!res.ok) {
      setError(res.error ?? "Login failed");
      return;
    }
    router.replace("/dashboard");
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 20% 10%, #fce8e9 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 90% 80%, #f5f5f7 0%, transparent 50%), linear-gradient(165deg, #ffffff 0%, #f5f5f7 100%)",
        }}
      />
      <div className="relative z-10 flex w-full flex-col items-center justify-center px-6 py-16">
        <div className="animate-fade-in w-full max-w-[400px]">
          <div className="mb-10 flex flex-col items-center text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/Pan_Asia_Bank_idppX_ujG0_0.svg"
              alt="Pan Asia Bank"
              width={200}
              height={34}
              className="mb-8"
            />
            <h1 className="font-[family-name:var(--font-outfit)] text-[32px] font-semibold leading-tight tracking-tight text-ink">
              Reconciliation
              <br />
              <span className="text-[var(--pab-red)]">& Exhibit</span>
            </h1>
            <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-[var(--ink-secondary)]">
              Centralized suspense and GL reconciliation for every branch.
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            className="rounded-[20px] border border-[var(--hairline)] bg-white/90 p-6 shadow-[var(--shadow-soft)] backdrop-blur-xl"
          >
            <label className="mb-4 block">
              <span className="mb-1.5 block text-xs font-medium text-[var(--ink-secondary)]">
                Username
              </span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11 w-full rounded-xl border border-[var(--hairline)] bg-[var(--surface-secondary)] px-3 text-sm outline-none ring-[var(--pab-red)] focus:ring-2"
                autoComplete="username"
              />
            </label>
            <label className="mb-5 block">
              <span className="mb-1.5 block text-xs font-medium text-[var(--ink-secondary)]">
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-xl border border-[var(--hairline)] bg-[var(--surface-secondary)] px-3 text-sm outline-none ring-[var(--pab-red)] focus:ring-2"
                autoComplete="current-password"
              />
            </label>
            {error && (
              <p className="mb-3 text-sm text-[var(--red-rag)]">{error}</p>
            )}
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-8">
            <p className="mb-3 text-center text-[11px] font-medium uppercase tracking-wider text-[var(--ink-tertiary)]">
              Sample logins · password demo123
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {demos.map((d) => (
                <button
                  key={d.user}
                  type="button"
                  onClick={() => {
                    setUsername(d.user);
                    setPassword("demo123");
                  }}
                  className="rounded-full border border-[var(--hairline)] bg-white/70 px-3 py-1.5 text-xs font-medium text-[var(--ink-secondary)] transition hover:border-[var(--pab-red)]/40 hover:text-[var(--pab-red)]"
                >
                  {d.user}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
