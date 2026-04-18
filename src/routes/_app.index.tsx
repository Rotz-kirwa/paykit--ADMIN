import { createFileRoute } from "@tanstack/react-router";
import {
  Wallet,
  TrendingUp,
  CalendarDays,
  CalendarRange,
  Calendar,
  Users as UsersIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { StatCard } from "@/components/StatCard";
import { dailySeries, getStats, KES, monthlySeries, payments } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Dashboard — Paykit Admin" },
      { name: "description", content: "Track payments, revenue and customers in real time." },
    ],
  }),
});

function DashboardPage() {
  const stats = getStats();
  const daily = dailySeries(30);
  const monthly = monthlySeries();
  const recent = [...payments]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 6);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back. Here's what's happening with your business today.
          </p>
        </div>
        <span className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
          Updated just now
        </span>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Revenue" value={KES(stats.totalRevenue)} icon={Wallet} accent="primary" />
        <StatCard label="Today" value={KES(stats.todayRevenue)} change={stats.todayChange} icon={TrendingUp} accent="success" />
        <StatCard label="Yesterday" value={KES(stats.yesterdayRevenue)} icon={CalendarDays} accent="muted" />
        <StatCard label="This Month" value={KES(stats.monthRevenue)} change={stats.monthChange} icon={CalendarRange} accent="primary" />
        <StatCard label="This Year" value={KES(stats.yearRevenue)} change={stats.yearChange} icon={Calendar} accent="warning" />
        <StatCard label="Customers" value={stats.totalCustomers.toLocaleString()} change={stats.customerChange} icon={UsersIcon} accent="success" />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-sm)] lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Revenue trend</h2>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </div>
            <span className="text-sm font-medium text-success">
              {KES(daily.reduce((a, b) => a + b.revenue, 0))}
            </span>
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <AreaChart data={daily} margin={{ left: -12, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.62 0.19 280)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.62 0.19 280)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(0.92 0.01 260)" vertical={false} />
                <XAxis dataKey="label" stroke="oklch(0.5 0.025 260)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.5 0.025 260)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.01 260)", fontSize: 12 }}
                  formatter={(v: number) => KES(v)}
                />
                <Area type="monotone" dataKey="revenue" stroke="oklch(0.48 0.18 274)" strokeWidth={2.5} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-sm)]">
          <div className="mb-4">
            <h2 className="text-base font-semibold">Monthly revenue</h2>
            <p className="text-xs text-muted-foreground">Last 12 months</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={monthly} margin={{ left: -16, right: 4, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="oklch(0.92 0.01 260)" vertical={false} />
                <XAxis dataKey="month" stroke="oklch(0.5 0.025 260)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.5 0.025 260)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.01 260)", fontSize: 12 }}
                  formatter={(v: number) => KES(v)}
                />
                <Bar dataKey="revenue" fill="oklch(0.48 0.18 274)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold">Recent payments</h2>
          <a href="/payments" className="text-sm font-medium text-primary hover:underline">
            View all →
          </a>
        </div>
        <div className="divide-y divide-border">
          {recent.map((p) => (
            <div key={p.id} className="flex items-center gap-4 px-6 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
                {p.customer_name.split(" ").map((s) => s[0]).join("").slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.customer_name}</p>
                <p className="truncate text-xs text-muted-foreground">{p.method} · {p.transaction_code}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{KES(p.amount)}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString("en-KE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
