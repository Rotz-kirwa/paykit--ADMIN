// Mock payment & customer data for the demo dashboard.
// Deterministic seed so charts and totals stay stable across renders.

export type PaymentMethod = "M-Pesa" | "Card" | "Bank";
export type PaymentStatus = "Success" | "Pending" | "Failed";

export interface Payment {
  id: string;
  customer_name: string;
  phone: string;
  email: string;
  amount: number;
  method: PaymentMethod;
  transaction_code: string;
  status: PaymentStatus;
  created_at: string; // ISO
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  total_payments: number;
  payment_count: number;
  last_payment_date: string;
}

const FIRST = ["Amani", "Brian", "Cynthia", "Daudi", "Esther", "Faith", "George", "Halima", "Imani", "James", "Kavinya", "Linet", "Mwangi", "Njeri", "Otieno", "Patrick", "Quincy", "Rehema", "Salma", "Tabitha", "Uhuru", "Violet", "Wanjiru", "Xavier", "Yusuf", "Zawadi"];
const LAST = ["Kamau", "Otieno", "Wanjiku", "Mwangi", "Kiprono", "Achieng", "Hassan", "Njoroge", "Owino", "Maina", "Chebet", "Wambui", "Onyango", "Karanja", "Mutiso"];

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const rand = seeded(42);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

function makePhone() {
  return `+2547${Math.floor(10000000 + rand() * 89999999)}`;
}
function makeTxn(method: PaymentMethod) {
  const prefix = method === "M-Pesa" ? "QK" : method === "Card" ? "CH" : "BNK";
  return `${prefix}${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

const NOW = new Date();
const PAYMENT_COUNT = 240;

export const payments: Payment[] = Array.from({ length: PAYMENT_COUNT }, (_, i) => {
  const first = pick(FIRST);
  const last = pick(LAST);
  const name = `${first} ${last}`;
  const method: PaymentMethod = rand() < 0.7 ? "M-Pesa" : rand() < 0.85 ? "Card" : "Bank";
  const statusRoll = rand();
  const status: PaymentStatus = statusRoll < 0.86 ? "Success" : statusRoll < 0.94 ? "Pending" : "Failed";
  // Spread across last 365 days, weighted toward recent
  const daysAgo = Math.floor(Math.pow(rand(), 1.6) * 365);
  const date = new Date(NOW);
  date.setDate(date.getDate() - daysAgo);
  date.setHours(Math.floor(rand() * 24), Math.floor(rand() * 60));
  const amount = Math.floor(100 + rand() * 50000);
  return {
    id: `pay_${i.toString().padStart(5, "0")}`,
    customer_name: name,
    phone: makePhone(),
    email: `${first.toLowerCase()}.${last.toLowerCase()}@example.co.ke`,
    amount,
    method,
    transaction_code: makeTxn(method),
    status,
    created_at: date.toISOString(),
  };
});

// Aggregate customers from payments
const customerMap = new Map<string, Customer>();
for (const p of payments) {
  const key = p.email;
  const existing = customerMap.get(key);
  if (existing) {
    if (p.status === "Success") {
      existing.total_payments += p.amount;
      existing.payment_count += 1;
    }
    if (new Date(p.created_at) > new Date(existing.last_payment_date)) {
      existing.last_payment_date = p.created_at;
    }
  } else {
    customerMap.set(key, {
      id: `cus_${customerMap.size.toString().padStart(5, "0")}`,
      name: p.customer_name,
      phone: p.phone,
      email: p.email,
      total_payments: p.status === "Success" ? p.amount : 0,
      payment_count: p.status === "Success" ? 1 : 0,
      last_payment_date: p.created_at,
    });
  }
}
export const customers: Customer[] = Array.from(customerMap.values()).sort(
  (a, b) => b.total_payments - a.total_payments,
);

// ── Analytics helpers ───────────────────────────────────────────────
export const KES = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(n);

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function sumSuccess(list: Payment[]) {
  return list.filter((p) => p.status === "Success").reduce((a, b) => a + b.amount, 0);
}

export function getStats() {
  const today = startOfDay(NOW);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
  const yearStart = new Date(today.getFullYear(), 0, 1);
  const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
  const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59);

  const inRange = (start: Date, end?: Date) =>
    payments.filter((p) => {
      const d = new Date(p.created_at);
      return d >= start && (!end || d <= end);
    });

  const todayPayments = inRange(today);
  const yesterdayPayments = inRange(yesterday, new Date(today.getTime() - 1));
  const monthPayments = inRange(monthStart);
  const lastMonthPayments = inRange(lastMonthStart, lastMonthEnd);
  const yearPayments = inRange(yearStart);
  const lastYearPayments = inRange(lastYearStart, lastYearEnd);

  const pct = (curr: number, prev: number) =>
    prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;

  return {
    totalRevenue: sumSuccess(payments),
    todayRevenue: sumSuccess(todayPayments),
    todayChange: pct(sumSuccess(todayPayments), sumSuccess(yesterdayPayments)),
    yesterdayRevenue: sumSuccess(yesterdayPayments),
    monthRevenue: sumSuccess(monthPayments),
    monthChange: pct(sumSuccess(monthPayments), sumSuccess(lastMonthPayments)),
    yearRevenue: sumSuccess(yearPayments),
    yearChange: pct(sumSuccess(yearPayments), sumSuccess(lastYearPayments)),
    totalCustomers: customers.length,
    customerChange: 8.4,
  };
}

export function dailySeries(days: number) {
  const out: { date: string; label: string; revenue: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = startOfDay(new Date());
    d.setDate(d.getDate() - i);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const total = sumSuccess(
      payments.filter((p) => {
        const pd = new Date(p.created_at);
        return pd >= d && pd < next;
      }),
    );
    out.push({
      date: d.toISOString(),
      label: d.toLocaleDateString("en-KE", { month: "short", day: "numeric" }),
      revenue: total,
    });
  }
  return out;
}

export function monthlySeries() {
  const out: { month: string; revenue: number }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const total = sumSuccess(
      payments.filter((p) => {
        const pd = new Date(p.created_at);
        return pd >= d && pd < next;
      }),
    );
    out.push({
      month: d.toLocaleDateString("en-KE", { month: "short" }),
      revenue: total,
    });
  }
  return out;
}

export function methodBreakdown() {
  const map = new Map<PaymentMethod, number>();
  for (const p of payments) {
    if (p.status !== "Success") continue;
    map.set(p.method, (map.get(p.method) ?? 0) + p.amount);
  }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}
