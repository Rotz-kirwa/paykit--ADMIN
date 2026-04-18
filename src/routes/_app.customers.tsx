import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { customers, KES } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/customers")({
  component: CustomersPage,
  head: () => ({ meta: [{ title: "Customers — Paykit Admin" }] }),
});

function CustomersPage() {
  const [query, setQuery] = useState("");
  const list = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">{customers.length} total customers</p>
        </div>
      </header>

      <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-sm)]">
        <div className="border-b border-border p-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search customers…"
              className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-4 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-3 font-medium">Customer</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Phone</th>
                <th className="px-6 py-3 font-medium text-right">Payments</th>
                <th className="px-6 py-3 font-medium text-right">Total</th>
                <th className="px-6 py-3 font-medium">Last Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.slice(0, 50).map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-secondary/40">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--gradient-primary)] text-xs font-semibold text-primary-foreground">
                        {c.name.split(" ").map((s) => s[0]).join("").slice(0, 2)}
                      </div>
                      <span className="font-medium">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-muted-foreground">{c.email}</td>
                  <td className="px-6 py-3.5 text-muted-foreground">{c.phone}</td>
                  <td className="px-6 py-3.5 text-right">{c.payment_count}</td>
                  <td className="px-6 py-3.5 text-right font-semibold">{KES(c.total_payments)}</td>
                  <td className="px-6 py-3.5 text-muted-foreground">
                    {new Date(c.last_payment_date).toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
