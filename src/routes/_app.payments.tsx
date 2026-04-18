import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Download, ArrowUpDown } from "lucide-react";
import { KES, payments, type PaymentStatus } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/payments")({
  component: PaymentsPage,
  head: () => ({
    meta: [{ title: "Payments — Paykit Admin" }],
  }),
});

const STATUS_STYLES: Record<PaymentStatus, string> = {
  Success: "bg-success/10 text-success",
  Pending: "bg-warning/10 text-warning",
  Failed: "bg-destructive/10 text-destructive",
};

const PAGE_SIZE = 12;

function PaymentsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | PaymentStatus>("all");
  const [sortDesc, setSortDesc] = useState(true);
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const list = payments.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (!q) return true;
      return (
        p.customer_name.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.transaction_code.toLowerCase().includes(q)
      );
    });
    list.sort((a, b) => {
      const av = sortBy === "amount" ? a.amount : +new Date(a.created_at);
      const bv = sortBy === "amount" ? b.amount : +new Date(b.created_at);
      return sortDesc ? bv - av : av - bv;
    });
    return list;
  }, [query, status, sortBy, sortDesc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const exportCsv = () => {
    const headers = ["Customer", "Phone", "Email", "Amount", "Method", "Transaction", "Status", "Date"];
    const rows = filtered.map((p) => [
      p.customer_name, p.phone, p.email, p.amount, p.method, p.transaction_code, p.status, p.created_at,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSort = (key: "date" | "amount") => {
    if (sortBy === key) setSortDesc(!sortDesc);
    else { setSortBy(key); setSortDesc(true); }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Payments</h1>
          <p className="mt-1 text-sm text-muted-foreground">{filtered.length} transactions</p>
        </div>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium shadow-[var(--shadow-sm)] transition-colors hover:bg-secondary"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </header>

      <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder="Search name, phone, email or txn code…"
              className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary"
            />
          </div>
          <div className="flex gap-1 rounded-lg border border-border bg-secondary/50 p-1">
            {(["all", "Success", "Pending", "Failed"] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setStatus(s); setPage(1); }}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  status === s ? "bg-card shadow-[var(--shadow-sm)]" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-3 font-medium">Customer</th>
                <th className="px-6 py-3 font-medium">Method</th>
                <th className="px-6 py-3 font-medium">Transaction</th>
                <th className="px-6 py-3 font-medium">
                  <button onClick={() => toggleSort("amount")} className="inline-flex items-center gap-1 hover:text-foreground">
                    Amount <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">
                  <button onClick={() => toggleSort("date")} className="inline-flex items-center gap-1 hover:text-foreground">
                    Date <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {slice.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-secondary/40">
                  <td className="px-6 py-3.5">
                    <div className="font-medium">{p.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{p.phone}</div>
                  </td>
                  <td className="px-6 py-3.5 text-muted-foreground">{p.method}</td>
                  <td className="px-6 py-3.5 font-mono text-xs">{p.transaction_code}</td>
                  <td className="px-6 py-3.5 font-semibold">{KES(p.amount)}</td>
                  <td className="px-6 py-3.5">
                    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLES[p.status])}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-muted-foreground">
                    {new Date(p.created_at).toLocaleString("en-KE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              ))}
              {slice.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">No payments found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-border px-6 py-3">
          <p className="text-xs text-muted-foreground">
            Page {safePage} of {totalPages}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(Math.max(1, safePage - 1))}
              disabled={safePage === 1}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-secondary"
            >Previous</button>
            <button
              onClick={() => setPage(Math.min(totalPages, safePage + 1))}
              disabled={safePage === totalPages}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-secondary"
            >Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
