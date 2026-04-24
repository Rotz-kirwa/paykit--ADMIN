import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Download, ArrowUpDown, Plus, Loader2, X } from "lucide-react";
import { useLivePayments } from "@/hooks/use-live-payments";
import { cn } from "@/lib/utils";
import { fetchPaymentsFn, initiateStkPushFn, recheckPaymentStatusFn, type MpesaPayment } from "@/lib/payments";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/payments")({
  loader: () => fetchPaymentsFn(),
  component: PaymentsPage,
  head: () => ({ meta: [{ title: "Payments — Paykit Admin" }] }),
});

type MpesaStatus = MpesaPayment["status"];

const KES = (n: number | string) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(n));

const STATUS_STYLES: Record<MpesaStatus, string> = {
  Success: "bg-success/10 text-success",
  Pending: "bg-warning/10 text-warning",
  Failed: "bg-destructive/10 text-destructive",
  Cancelled: "bg-muted text-muted-foreground",
};

const PAGE_SIZE = 12;

function StkPushDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const submit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError("");
    const amt = parseFloat(amount);
    if (!phone.match(/^\+?0?[17]\d{8}$/) && !phone.match(/^254\d{9}$/)) {
      setError("Enter a valid Kenyan phone number (e.g. 0712345678)");
      return;
    }
    if (!amt || amt < 1) {
      setError("Enter a valid amount (min KES 1)");
      return;
    }
    if (!reference.trim()) {
      setError("Account reference is required");
      return;
    }
    setLoading(true);
    try {
      const result = await initiateStkPushFn({
        data: {
          phone,
          amount: amt,
          reference: reference.trim().slice(0, 12),
          description: description.trim().slice(0, 13) || undefined,
        },
      });
      setSuccessMsg(result.message ?? "STK Push sent. Ask the customer to check their phone.");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initiate payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-lg)]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Request M-Pesa Payment</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {successMsg ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-success/10 p-4 text-sm text-success">{successMsg}</div>
            <button
              onClick={onClose}
              style={{ background: "var(--gradient-primary)" }}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Phone number</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0712 345 678"
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Amount (KES)</label>
              <input
                type="number"
                min="1"
                max="150000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1000"
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                Account reference <span className="text-muted-foreground">(max 12 chars)</span>
              </label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value.slice(0, 12))}
                placeholder="INV-001"
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                Description <span className="text-muted-foreground">(optional, max 13 chars)</span>
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 13))}
                placeholder="Payment"
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              style={{ background: "var(--gradient-primary)" }}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Send STK Push
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
function StatusBadge({ payment, onRefresh }: { payment: MpesaPayment; onRefresh: () => void }) {
  const [loading, setLoading] = useState(false);

  const recheck = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const result = await recheckPaymentStatusFn({ data: payment.id });
      toast.success(`Status updated to ${result.status}`);
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to re-check status");
    } finally {
      setLoading(false);
    }
  };

  const showRefresh = payment.source === "stk_push" && payment.status !== "Success";

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
          STATUS_STYLES[payment.status],
        )}
      >
        {payment.status}
      </span>
      {showRefresh && (
        <button
          onClick={recheck}
          disabled={loading}
          className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50"
          title="Re-check status with Safaricom"
        >
          <ArrowUpDown className={cn("h-3 w-3", loading && "animate-spin")} />
        </button>
      )}
    </div>
  );
}

function PaymentsPage() {
  const loaderData = Route.useLoaderData();
  const { payments, refresh } = useLivePayments(loaderData);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | MpesaStatus>("all");
  const [sortDesc, setSortDesc] = useState(true);
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  const [page, setPage] = useState(1);
  const [showDialog, setShowDialog] = useState(false);

  const handleSuccess = async () => {
    try {
      await refresh();
    } catch {
      /* refresh on next load */
    }
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const list = payments.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (!q) return true;
      return (
        p.phone.toLowerCase().includes(q) ||
        (p.mpesaReceiptNumber?.toLowerCase().includes(q) ?? false) ||
        (p.accountReference?.toLowerCase().includes(q) ?? false) ||
        (p.checkoutRequestId?.toLowerCase().includes(q) ?? false)
      );
    });
    list.sort((a, b) => {
      const av = sortBy === "amount" ? Number(a.amount) : +new Date(a.createdAt);
      const bv = sortBy === "amount" ? Number(b.amount) : +new Date(b.createdAt);
      return sortDesc ? bv - av : av - bv;
    });
    return list;
  }, [payments, query, status, sortBy, sortDesc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const exportCsv = () => {
    const headers = ["Phone", "Amount", "Reference", "Receipt", "Status", "Date"];
    const rows = filtered.map((p) => [
      p.phone,
      p.amount,
      p.accountReference ?? "",
      p.mpesaReceiptNumber ?? "",
      p.status,
      p.createdAt,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mpesa-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSort = (key: "date" | "amount") => {
    if (sortBy === key) setSortDesc(!sortDesc);
    else {
      setSortBy(key);
      setSortDesc(true);
    }
  };

  return (
    <div className="space-y-6">
      {showDialog && (
        <StkPushDialog onClose={() => setShowDialog(false)} onSuccess={handleSuccess} />
      )}

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Payments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} transactions · refreshes every 10s
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDialog(true)}
            style={{ background: "var(--gradient-primary)" }}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-md)]"
          >
            <Plus className="h-4 w-4" /> Request Payment
          </button>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium shadow-[var(--shadow-sm)] hover:bg-secondary"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </header>

      <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search phone, receipt or reference…"
              className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-4 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-1 rounded-lg border border-border bg-secondary/50 p-1">
            {(["all", "Success", "Pending", "Failed", "Cancelled"] as const).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  status === s
                    ? "bg-card shadow-[var(--shadow-sm)]"
                    : "text-muted-foreground hover:text-foreground",
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
                <th className="px-6 py-3 font-medium">Phone</th>
                <th className="px-6 py-3 font-medium">Reference</th>
                <th className="px-6 py-3 font-medium">Receipt</th>
                <th className="px-6 py-3 font-medium">
                  <button
                    onClick={() => toggleSort("amount")}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    Amount <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">
                  <button
                    onClick={() => toggleSort("date")}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    Date <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {slice.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-secondary/40">
                  <td className="px-6 py-3.5 font-medium">{p.phone}</td>
                  <td className="px-6 py-3.5 text-muted-foreground">{p.accountReference ?? "—"}</td>
                  <td className="px-6 py-3.5 font-mono text-xs">{p.mpesaReceiptNumber ?? "—"}</td>
                  <td className="px-6 py-3.5 font-semibold">{KES(p.amount)}</td>
                  <td className="px-6 py-3.5">
                    <StatusBadge payment={p} onRefresh={refresh} />
                  </td>
                  <td className="px-6 py-3.5 text-muted-foreground">
                    {new Date(p.createdAt).toLocaleString("en-KE", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
              {slice.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-sm text-muted-foreground">
                    {payments.length === 0
                      ? 'No payments yet. Click "Request Payment" to initiate your first STK Push.'
                      : "No payments match your search."}
                  </td>
                </tr>
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
            >
              Previous
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, safePage + 1))}
              disabled={safePage === totalPages}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-secondary"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
