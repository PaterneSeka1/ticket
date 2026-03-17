"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { fetchCurrentUser, type AuthenticatedUser } from "../lib/api";

export type FetchStatus = "idle" | "loading" | "ready" | "error";

interface DashboardUserContextValue {
  user: AuthenticatedUser | null;
  status: FetchStatus;
}

const DashboardUserContext = createContext<DashboardUserContextValue | null>(null);

export function DashboardUserProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [status, setStatus] = useState<FetchStatus>("loading");

  useEffect(() => {
    const token = sessionStorage.getItem("vdm_access_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    let cancelled = false;

    fetchCurrentUser(token)
      .then((currentUser) => {
        if (cancelled) return;
        setUser(currentUser);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
        router.replace("/login");
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <DashboardUserContext.Provider value={{ user, status }}>
      {children}
    </DashboardUserContext.Provider>
  );
}

export function useCurrentUser() {
  const context = useContext(DashboardUserContext);
  if (!context) {
    throw new Error("useCurrentUser must be used within a DashboardUserProvider");
  }
  return context;
}
