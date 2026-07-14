"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useReconStore } from "@/store/recon-store";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useReconStore((s) => s.currentUser);
  const hydrated = useReconStore((s) => s.hydrated);

  useEffect(() => {
    if (hydrated && !user) {
      router.replace("/login");
    }
  }, [hydrated, user, router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-secondary)]">
        <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--pab-red)]/30" />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
