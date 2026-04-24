import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { useLivePayments } from "@/hooks/use-live-payments";
import { fetchPaymentsFn, type MpesaPayment } from "@/lib/payments";

export const Route = createFileRoute("/_app/")({
  loader: () => fetchPaymentsFn(),
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Dashboard — Paykit Admin" },
      { name: "description", content: "Track payments, revenue and customers in real time." },
    ],
  }),
});

const KES = (n: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(n);

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function sumSuccess(list: MpesaPayment[]) {
  return list.filter((p) => p.status === "Success").reduce((acc, p) => acc + Number(p.amount), 0);
}

function computeStats(payments: MpesaPayment[]) {
  const now = new Date();
  const today = startOfDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
  const yearStart = new Date(today.getFullYear(), 0, 1);

  const inRange = (start: Date, end?: Date) =>
    payments.filter((p) => {
      const d = p.createdAt;
      return d >= start && (!end || d <= end);
    });

  const todayP = inRange(today);
  const yesterdayP = inRange(yesterday, new Date(today.getTime() - 1));
  const monthP = inRange(monthStart);
  const lastMonthP = inRange(lastMonthStart, lastMonthEnd);
  const yearP = inRange(yearStart);

  const pct = (curr: number, prev: number) =>
    prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;

  const phones = new Set(payments.map((p) => p.phone));

  return {
    totalRevenue: sumSuccess(payments),
    todayRevenue: sumSuccess(todayP),
    todayChange: pct(sumSuccess(todayP), sumSuccess(yesterdayP)),
    yesterdayRevenue: sumSuccess(yesterdayP),
    monthRevenue: sumSuccess(monthP),
    monthChange: pct(sumSuccess(monthP), sumSuccess(lastMonthP)),
    yearRevenue: sumSuccess(yearP),
    totalCustomers: phones.size,
  };
}

function dailySeries(payments: MpesaPayment[], days: number) {
  return Array.from({ length: days }, (_, i) => {
    const d = startOfDay(new Date());
    d.setDate(d.getDate() - (days - 1 - i));
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    return {
      label: d.toLocaleDateString("en-KE", { month: "short", day: "numeric" }),
      revenue: sumSuccess(payments.filter((p) => p.createdAt >= d && p.createdAt < next)),
    };
  });
}

function monthlySeries(payments: MpesaPayment[]) {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const next = new Date(now.getFullYear(), now.getMonth() - (11 - i) + 1, 1);
    return {
      month: d.toLocaleDateString("en-KE", { month: "short" }),
      revenue: sumSuccess(payments.filter((p) => p.createdAt >= d && p.createdAt < next)),
    };
  });
}

function DashboardPage() {
  const initialPayments = Route.useLoaderData();
  const { payments } = useLivePayments(initialPayments);
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    setChartsReady(true);
  }, []);

  const stats = computeStats(payments);
  const daily = dailySeries(payments, 30);
  const monthly = monthlySeries(payments);
  const recent = [...payments]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
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
          Live data · refreshes every 10s
        </span>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Total Revenue"
          value={KES(stats.totalRevenue)}
          icon={Wallet}
          accent="primary"
        />
        <StatCard
          label="Today"
          value={KES(stats.todayRevenue)}
          change={stats.todayChange}
          icon={TrendingUp}
          accent="success"
        />
        <StatCard
          label="Yesterday"
          value={KES(stats.yesterdayRevenue)}
          icon={CalendarDays}
          accent="muted"
        />
        <StatCard
          label="This Month"
          value={KES(stats.monthRevenue)}
          change={stats.monthChange}
          icon={CalendarRange}
          accent="primary"
        />
        <StatCard
          label="This Year"
          value={KES(stats.yearRevenue)}
          icon={Calendar}
          accent="warning"
        />
        <StatCard
          label="Customers"
          value={stats.totalCustomers.toLocaleString()}
          icon={UsersIcon}
          accent="success"
        />
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
            {chartsReady ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={daily} margin={{ left: -12, right: 8, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.62 0.19 280)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="oklch(0.62 0.19 280)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="oklch(0.92 0.01 260)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="oklch(0.5 0.025 260)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="oklch(0.5 0.025 260)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid oklch(0.92 0.01 260)",
                      fontSize: 12,
                    }}
                    formatter={(v) => KES(Number(v))}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="oklch(0.48 0.18 274)"
                    strokeWidth={2.5}
                    fill="url(#rev)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Loading chart...
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-sm)]">
          <div className="mb-4">
            <h2 className="text-base font-semibold">Monthly revenue</h2>
            <p className="text-xs text-muted-foreground">Last 12 months</p>
          </div>
          <div className="h-72">
            {chartsReady ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ left: -16, right: 4, top: 8, bottom: 0 }}>
                  <CartesianGrid stroke="oklch(0.92 0.01 260)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="oklch(0.5 0.025 260)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="oklch(0.5 0.025 260)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid oklch(0.92 0.01 260)",
                      fontSize: 12,
                    }}
                    formatter={(v) => KES(Number(v))}
                  />
                  <Bar dataKey="revenue" fill="oklch(0.48 0.18 274)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Loading chart...
              </div>
            )}
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
        {recent.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            No payments yet. Go to Payments and request your first STK Push.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recent.map((p) => (
              <div key={p.id} className="flex items-center gap-4 px-6 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
                  {p.phone.slice(-2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.phone}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.accountReference ?? "—"} ·{" "}
                    {p.mpesaReceiptNumber ?? p.checkoutRequestId?.slice(0, 16) ?? "Pending"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{KES(Number(p.amount))}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.createdAt.toLocaleDateString("en-KE", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
