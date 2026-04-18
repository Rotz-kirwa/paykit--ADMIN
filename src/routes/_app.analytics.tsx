import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { dailySeries, KES, methodBreakdown } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/analytics")({
  component: AnalyticsPage,
  head: () => ({ meta: [{ title: "Analytics — Paykit Admin" }] }),
});

const RANGES = [
  { label: "Today", days: 1 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
] as const;

const COLORS = ["oklch(0.48 0.18 274)", "oklch(0.65 0.16 155)", "oklch(0.78 0.15 75)"];

function AnalyticsPage() {
  const [range, setRange] = useState<(typeof RANGES)[number]>(RANGES[2]);
  const data = dailySeries(range.days);
  const methods = methodBreakdown();
  const total = methods.reduce((a, b) => a + b.value, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Deep dive into revenue and payment trends.</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-card p-1 shadow-[var(--shadow-sm)]">
          {RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => setRange(r)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                range.label === r.label ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-sm)] lg:col-span-2">
          <h2 className="text-base font-semibold">Revenue over time</h2>
          <p className="mb-4 text-xs text-muted-foreground">{range.label}</p>
          <div className="h-80">
            <ResponsiveContainer>
              <LineChart data={data} margin={{ left: -12, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="oklch(0.92 0.01 260)" vertical={false} />
                <XAxis dataKey="label" stroke="oklch(0.5 0.025 260)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.5 0.025 260)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.01 260)", fontSize: 12 }}
                  formatter={(v) => KES(Number(v))}
                />
                <Line type="monotone" dataKey="revenue" stroke="oklch(0.48 0.18 274)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-sm)]">
          <h2 className="text-base font-semibold">Payment methods</h2>
          <p className="mb-4 text-xs text-muted-foreground">All time</p>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={methods} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {methods.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => KES(Number(v))} contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.01 260)", fontSize: 12 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-2">
            {methods.map((m, i) => (
              <div key={m.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="font-medium">{m.name}</span>
                </div>
                <span className="text-muted-foreground">
                  {((m.value / total) * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
