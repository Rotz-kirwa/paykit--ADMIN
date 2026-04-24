import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";

const checkCredentialsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { requireCurrentUser } = await import("../lib/auth.server");
  await requireCurrentUser();

  const callbackUrl = process.env.MPESA_CALLBACK_URL?.trim() ?? null;
  const c2bConfirmationUrl = callbackUrl
    ? new URL("/c2b/confirmation", callbackUrl).toString()
    : null;
  const c2bValidationUrl = callbackUrl ? new URL("/c2b/validation", callbackUrl).toString() : null;

  return {
    databaseUrl: !!process.env.DATABASE_URL,
    jwtSecret: !!process.env.JWT_SECRET,
    mpesaConsumerKey: !!process.env.MPESA_CONSUMER_KEY,
    mpesaConsumerSecret: !!process.env.MPESA_CONSUMER_SECRET,
    mpesaShortcode: !!process.env.MPESA_SHORTCODE,
    mpesaTillNumber: !!process.env.MPESA_TILL_NUMBER,
    mpesaPasskey: !!process.env.MPESA_PASSKEY,
    mpesaCallbackUrl: callbackUrl,
    c2bConfirmationUrl,
    c2bValidationUrl,
    mpesaEnvironment: process.env.MPESA_ENVIRONMENT ?? "sandbox",
  };
});

const registerC2bUrlsFn = createServerFn({ method: "POST" }).handler(async () => {
  const { requireCurrentUser } = await import("../lib/auth.server");
  const { registerC2bUrls } = await import("../lib/mpesa.server");
  await requireCurrentUser();
  return registerC2bUrls();
});

export const Route = createFileRoute("/_app/settings")({
  loader: () => checkCredentialsFn(),
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings — Paykit Admin" }] }),
});

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm">{label}</span>
      {ok ? (
        <CheckCircle2 className="h-4 w-4 text-success" />
      ) : (
        <XCircle className="h-4 w-4 text-destructive" />
      )}
    </div>
  );
}

function SettingsPage() {
  const { email } = useAuth();
  const creds = Route.useLoaderData();
  const [registering, setRegistering] = useState(false);
  const [regMsg, setRegMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const mpesaReady =
    creds.mpesaConsumerKey &&
    creds.mpesaConsumerSecret &&
    creds.mpesaShortcode &&
    creds.mpesaTillNumber &&
    creds.mpesaPasskey &&
    !!creds.mpesaCallbackUrl;

  async function handleRegister() {
    setRegistering(true);
    setRegMsg(null);
    try {
      const r = await registerC2bUrlsFn();
      setRegMsg({
        ok: true,
        text: r.alreadyRegistered
          ? `C2B URLs are already registered for ${r.shortCode}.`
          : `C2B URLs registered for ${r.shortCode}. Direct till payments will now be recorded.`,
      });
    } catch (e) {
      setRegMsg({ ok: false, text: e instanceof Error ? e.message : "Registration failed" });
    } finally {
      setRegistering(false);
    }
  }

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
          <Field label="Workspace" value="MOBOSOFT ENTERPRISE HQ" />
          <Field label="Currency" value="KES (Kenyan Shilling)" />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">M-Pesa Integration</h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${mpesaReady ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}
          >
            {mpesaReady ? `Active · ${creds.mpesaEnvironment}` : "Not configured"}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Safaricom Daraja — Store number 6270335 for Buy Goods STK Push · Till 895858 for direct
          payments
        </p>

        <div className="mt-4 divide-y divide-border rounded-lg border border-border px-4">
          <StatusRow label="MPESA_CONSUMER_KEY" ok={creds.mpesaConsumerKey} />
          <StatusRow label="MPESA_CONSUMER_SECRET" ok={creds.mpesaConsumerSecret} />
          <StatusRow
            label="MPESA_SHORTCODE (Store number — Buy Goods STK)"
            ok={creds.mpesaShortcode}
          />
          <StatusRow
            label="MPESA_TILL_NUMBER (Till receiving payments)"
            ok={creds.mpesaTillNumber}
          />
          <StatusRow label="MPESA_PASSKEY" ok={creds.mpesaPasskey} />
          <StatusRow label="MPESA_CALLBACK_URL" ok={!!creds.mpesaCallbackUrl} />
        </div>

        <div className="mt-4 rounded-lg border border-border bg-secondary/30 p-4 space-y-2 text-xs">
          <p className="font-medium text-sm">Webhook URLs (must be publicly accessible)</p>
          <UrlRow label="STK callback" value={creds.mpesaCallbackUrl} />
          <UrlRow label="C2B confirmation" value={creds.c2bConfirmationUrl} />
          <UrlRow label="C2B validation" value={creds.c2bValidationUrl} />
          <p className="text-muted-foreground pt-1">
            Click <strong>Register</strong> to tell Safaricom to send direct till payment
            notifications to this dashboard. Only needed once per tunnel URL.
          </p>
          <button
            onClick={handleRegister}
            disabled={registering || !mpesaReady}
            style={{ background: "var(--gradient-primary)" }}
            className="mt-2 inline-flex items-center rounded-lg px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
          >
            {registering ? "Registering…" : "Register Direct Till URLs"}
          </button>
          {regMsg && (
            <p className={`text-xs ${regMsg.ok ? "text-success" : "text-destructive"}`}>
              {regMsg.text}
            </p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-base font-semibold">Database</h2>
        <div className="mt-4 divide-y divide-border rounded-lg border border-border px-4">
          <StatusRow label="DATABASE_URL" ok={creds.databaseUrl} />
          <StatusRow label="JWT_SECRET" ok={creds.jwtSecret} />
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

function UrlRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-medium text-foreground">{label}</span>
      <span className="font-mono text-muted-foreground break-all">{value ?? "—"}</span>
    </div>
  );
}
