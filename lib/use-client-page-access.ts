"use client";

import { useCallback, useEffect, useState } from "react";
import type { ClientPageKey } from "@/lib/module-config";

type ClientIdentity = {
  id: string;
  name: string;
  email?: string;
  logoUrl?: string | null;
  address?: string | null;
  contactNumber?: string | null;
  createdAt?: string;
};

type UseClientPageAccessOptions = {
  pageKey?: ClientPageKey;
  redirectToSignin?: boolean;
  refreshOnFocus?: boolean;
};

type UseClientPageAccessResult = {
  client: ClientIdentity | null;
  moduleEnabled: boolean | null;
  loading: boolean;
  refresh: () => Promise<boolean>;
};

export function useClientPageAccess(
  options: UseClientPageAccessOptions = {}
): UseClientPageAccessResult {
  const { pageKey, redirectToSignin = true, refreshOnFocus = false } = options;
  const [client, setClient] = useState<ClientIdentity | null>(null);
  const [moduleEnabled, setModuleEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const meRequest = fetch("/api/client/me", { cache: "no-store" });
    const accessRequest = pageKey
      ? fetch(`/api/client/modules?page=${pageKey}`, { cache: "no-store" })
      : fetch("/api/client/modules", { cache: "no-store" });

    const [meRes, accessRes] = await Promise.all([meRequest, accessRequest]);
    const meData = await meRes.json().catch(() => ({}));
    const accessData = await accessRes.json().catch(() => ({}));
    const mePayload = meData?.data ?? meData;
    const loggedIn = mePayload?.loggedIn ?? false;

    if (!loggedIn) {
      setClient(null);
      setModuleEnabled(null);
      setLoading(false);
      if (redirectToSignin && typeof window !== "undefined") {
        window.location.href = "/signin";
      }
      return false;
    }

    setClient((mePayload?.client as ClientIdentity | null) ?? null);
    setModuleEnabled(pageKey ? (accessRes.ok ? accessData?.data?.enabled !== false : true) : true);
    setLoading(false);
    return true;
  }, [pageKey, redirectToSignin]);

  useEffect(() => {
    function handleRefresh() {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }

    void refresh();

    if (refreshOnFocus) {
      window.addEventListener("focus", handleRefresh);
      document.addEventListener("visibilitychange", handleRefresh);
    }

    return () => {
      if (refreshOnFocus) {
        window.removeEventListener("focus", handleRefresh);
        document.removeEventListener("visibilitychange", handleRefresh);
      }
    };
  }, [refresh, refreshOnFocus]);

  return { client, moduleEnabled, loading, refresh };
}
