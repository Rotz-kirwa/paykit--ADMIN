import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings — Paykit Admin" }] }),
});

function SettingsPage() {
  const { email } = useAuth();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your workspace preferences.</p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-base font-semibold">Account</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Email" value={email ?? ""} />
          <Field label="Role" value="Administrator" />
          <Field label="Workspace" value="Paykit" />
          <Field label="Currency" value="KES (Kenyan Shilling)" />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-base font-semibold">M-Pesa integration</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect Safaricom Daraja to start accepting STK Push payments.
        </p>
        <div className="mt-4 rounded-lg border border-dashed border-border bg-secondary/50 p-4 text-sm text-muted-foreground">
          Enable Lovable Cloud and add your Daraja credentials to activate live M-Pesa payments and a callback endpoint.
        </div>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
