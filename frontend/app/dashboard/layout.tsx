"use client";

import type { ReactNode } from "react";
import { DashboardUserProvider } from "@/app/dashboard/hooks/useCurrentUser";
import { DashboardLayout } from "@/app/components/DashboardLayout";

export default function DashboardLayoutPage({ children }: { children: ReactNode }) {
  return (
    <DashboardUserProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </DashboardUserProvider>
  );
}
