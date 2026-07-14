"use client";

import { useEffect } from "react";
import { useReconStore } from "@/store/recon-store";

export function StoreHydration() {
  useEffect(() => {
    const finish = () => useReconStore.setState({ hydrated: true });
    const unsub = useReconStore.persist.onFinishHydration(finish);
    if (useReconStore.persist.hasHydrated()) finish();
    return unsub;
  }, []);
  return null;
}
