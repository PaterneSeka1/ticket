"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "../components/DashboardShell";
import { getRedirectRouteForRole } from "../lib/api";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useTickets } from "@/app/dashboard/hooks/useTickets";
import type { Ticket, TicketStatus } from "@/api/types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Metric = { label: string; value: string; detail: string };

const buildMetrics = (tickets: Ticket[]) => {
  const total = tickets.length;
  const today = tickets.filter((ticket) => {
    const created = new Date(ticket.createdAt);
    const now = new Date();
    return (
      created.getFullYear() === now.getFullYear() &&
      created.getMonth() === now.getMonth() &&
      created.getDate() === now.getDate()
    );
  }).length;
  const openCount = tickets.filter((ticket) => ticket.status === "EN_COURS" || ticket.status === "OUVERT").length;
  const resolvedCount = tickets.filter((ticket) => ticket.status === "RESOLU" || ticket.status === "FERME").length;

  const metrics: Metric[] = [
    { label: "Total tickets", value: `${total}`, detail: `${today} déposés aujourd’hui` },
    { label: "Ouverts / En cours", value: `${openCount}`, detail: "Tickets à traiter" },
    { label: "Résolus", value: `${resolvedCount}`, detail: "Tickets fermés" },
  ];

  return metrics;
};

const statusDefinitions: Array<{ key: TicketStatus; label: string; color: string }> = [
  { key: "RECU", label: "Reçus", color: "#f59e0b" },
  { key: "OUVERT", label: "Ouverts", color: "#fbbf24" },
  { key: "EN_COURS", label: "En cours", color: "#1d4ed8" },
  { key: "PRIS", label: "Pris en charge", color: "#0ea5e9" },
  { key: "RESOLU", label: "Résolus", color: "#22c55e" },
  { key: "FERME", label: "Fermés", color: "#6b7280" },
  { key: "AJOURNE", label: "Ajournés", color: "#c026d3" },
  { key: "ABANDONNE", label: "Abandonnés", color: "#ef4444" },
];

export default function EmployeDashboardPage() {
  const router = useRouter();
  const { user, status } = useCurrentUser();
  const { tickets } = useTickets(status === "ready");
  const [isLargeViewport, setIsLargeViewport] = useState(false);

  useEffect(() => {
    if (status !== "ready" || !user) return;
    if (!["EMPLOYE", "READER"].includes(user.role)) {
      router.replace(getRedirectRouteForRole(user.role));
    }
  }, [status, user, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(min-width: 1024px)");
    const handleChange = () => setIsLargeViewport(media.matches);

    handleChange();
    media.addEventListener("change", handleChange);

    return () => {
      media.removeEventListener("change", handleChange);
    };
  }, []);

  const personalTickets = useMemo(() => tickets.filter((ticket) => ticket.emitter.id === user?.id), [tickets, user]);
  const metrics = useMemo(() => buildMetrics(personalTickets), [personalTickets]);
  const statusChartData = useMemo(() => {
    const buckets = statusDefinitions.map((definition) => ({ ...definition, count: 0 }));
    personalTickets.forEach((ticket) => {
      const bucket = buckets.find((item) => item.key === ticket.status);
      if (bucket) {
        bucket.count += 1;
      }
    });
    return buckets;
  }, [personalTickets]);

  const timelineChartData = useMemo(() => {
    const daysToShow = 7;
    const today = new Date();
    const window = Array.from({ length: daysToShow }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (daysToShow - 1 - index));
      const key = date.toISOString().split("T")[0];
      const label = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric" }).format(date);
      return { key, label, count: 0 };
    });

    const bucketMap = new Map(window.map((day) => [day.key, day]));
    personalTickets.forEach((ticket) => {
      const key = ticket.createdAt.split("T")[0];
      const bucket = bucketMap.get(key);
      if (bucket) {
        bucket.count += 1;
      }
    });

    return window.map(({ label, count }) => ({ label, count }));
  }, [personalTickets]);

  if (status !== "ready" || !user) {
    return (
      <div className="vdm-landing flex min-h-screen items-center justify-center px-4 text-[var(--vdm-dark)]">
        <div className="vdm-card w-full max-w-sm rounded-[32px] p-8 text-center">
          <p className="text-sm text-[var(--vdm-muted)]">Préparation de votre espace collaborateur…</p>
        </div>
      </div>
    );
  }

  const axisTickStyle = { fontSize: 12, fill: "#3c2f1e" };

  return (
    <DashboardShell
      user={user}
      title="Mon espace collaborateur"
      subtitle="Suivez vos demandes et collaborez avec les responsables"
    >
      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-[16px] border border-[#f1e0cc] bg-white/70 p-6 shadow-[0_15px_45px_rgba(0,0,0,0.08)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#b46e1e]">{metric.label}</p>
            <p className="mt-3 text-[2rem] font-semibold text-[#20160f]">{metric.value}</p>
            <p className="text-sm text-[#6b5446]">{metric.detail}</p>
          </article>
        ))}
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <article className="relative overflow-hidden rounded-[20px] border border-[#f1e0cc] bg-white/60 p-6 shadow-[0_20px_45px_rgba(0,0,0,0.07)]">
          <header>
            <p className="text-[12px] font-semibold uppercase tracking-[0.3em] text-[#b46e1e]">Tickets par statut</p>
            <p className="mt-2 text-sm text-[#5d4f3f]">Répartition de vos demandes</p>
          </header>
          <div className="mt-6 h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusChartData} margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#f3f1ed" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={isLargeViewport}
                  tick={isLargeViewport ? axisTickStyle : false}
                  interval={0}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={isLargeViewport ? axisTickStyle : false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 16,
                    borderColor: "#f1e0cc",
                    boxShadow: "0 10px 30px rgba(15,23,42,0.15)",
                  }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {isLargeViewport && (
                    <LabelList
                      dataKey="count"
                      position="top"
                      style={{ fill: "#3c2f1e", fontSize: 12, fontWeight: 600 }}
                    />
                  )}
                  {statusChartData.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="relative overflow-hidden rounded-[20px] border border-[#f1e0cc] bg-white/60 p-6 shadow-[0_20px_45px_rgba(0,0,0,0.07)]">
          <header>
            <p className="text-[12px] font-semibold uppercase tracking-[0.3em] text-[#b46e1e]">Activité récente</p>
            <p className="mt-2 text-sm text-[#5d4f3f]">Tickets déposés sur les 7 derniers jours</p>
          </header>
          <div className="mt-6 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineChartData} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#f3f1ed" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "#3c2f1e" }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "#3c2f1e" }}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 16,
                    borderColor: "#f1e0cc",
                    boxShadow: "0 10px 30px rgba(15,23,42,0.15)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#f97316"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: "#fff9f1", stroke: "#f97316" }}
                  activeDot={{ r: 6, strokeWidth: 3, stroke: "#f97316" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>
    </DashboardShell>
  );
}
