import { eq } from "drizzle-orm";
import { db } from "./db/client";
import { mpesaPayments } from "./db/schema";
import { processPaymentSms } from "./sms-automation.server";

type CallbackResult = { ResultCode: number; ResultDesc: string };
type MpesaStatus = "Pending" | "Success" | "Failed" | "Cancelled";
type UnknownRecord = Record<string, unknown>;

interface CallbackItem {
  Name: string;
  Value?: string | number | null;
}

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function parseAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatAmount(value: number): string {
  return value.toFixed(2);
}

function parseMpesaDate(value: unknown): Date | null {
  const digits = parseString(value)?.replace(/\D/g, "");
  if (!digits || digits.length !== 14) return null;
  const year = digits.slice(0, 4);
  const month = digits.slice(4, 6);
  const day = digits.slice(6, 8);
  const hour = digits.slice(8, 10);
  const minute = digits.slice(10, 12);
  const second = digits.slice(12, 14);
  const parsed = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+03:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizePhone(value: unknown): string | null {
  const digits = parseString(value)?.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.length === 9 && /^(7|1)/.test(digits)) return `254${digits}`;
  return digits;
}

function accepted(): CallbackResult {
  return { ResultCode: 0, ResultDesc: "Accepted" };
}

function getMetadataItems(value: unknown): CallbackItem[] {
  if (!isRecord(value) || !Array.isArray(value.Item)) return [];
  return value.Item.flatMap((item) => {
    if (!isRecord(item) || typeof item.Name !== "string") return [];
    return [
      {
        Name: item.Name,
        Value:
          typeof item.Value === "string" || typeof item.Value === "number" || item.Value == null
            ? item.Value
            : null,
      },
    ];
  });
}

function getStatus(resultCode: number): MpesaStatus {
  if (resultCode === 0) return "Success";
  if (resultCode === 1032) return "Cancelled";
  return "Failed";
}

export async function handleStkCallback(body: unknown): Promise<CallbackResult> {
  console.log("[handleStkCallback] Received callback:", JSON.stringify(body, null, 2));

  if (!isRecord(body) || !isRecord(body.Body) || !isRecord(body.Body.stkCallback)) {
    throw new Error("Invalid STK callback body");
  }

  const stkCallback = body.Body.stkCallback;

  const checkoutRequestId = parseString(stkCallback.CheckoutRequestID);
  const merchantRequestId = parseString(stkCallback.MerchantRequestID);
  const resultCode = parseAmount(stkCallback.ResultCode);
  const resultDesc = parseString(stkCallback.ResultDesc) ?? "Unknown callback response";

  if (!checkoutRequestId || resultCode === null) {
    throw new Error("STK callback is missing CheckoutRequestID or ResultCode");
  }

  const items = getMetadataItems(stkCallback.CallbackMetadata);
  const getItemValue = (name: string) => items.find((item) => item.Name === name)?.Value;

  const mpesaReceiptNumber = parseString(getItemValue("MpesaReceiptNumber"));
  const status = getStatus(resultCode);
  const now = new Date();
  const rawCallbackJson = isRecord(body) ? body : { payload: body };

  const transactionDate = parseMpesaDate(getItemValue("TransactionDate"));

  await db
    .update(mpesaPayments)
    .set({
      status,
      resultCode,
      resultDesc,
      merchantRequestId,
      mpesaReceiptNumber,
      rawCallbackJson,
      updatedAt: now,
      ...(status === "Success" ? { paidAt: transactionDate ?? now } : {}),
    })
    .where(eq(mpesaPayments.checkoutRequestId, checkoutRequestId));

  return accepted();
}

export async function handleC2bConfirmation(body: unknown): Promise<CallbackResult> {
  console.log("[handleC2bConfirmation] Received callback:", JSON.stringify(body, null, 2));

  if (!isRecord(body)) {
    throw new Error("Invalid C2B confirmation body");
  }

  const mpesaReceiptNumber = parseString(body.TransID);
  const phone = normalizePhone(body.MSISDN);
  const amount = parseAmount(body.TransAmount);

  if (!mpesaReceiptNumber || !phone) {
    throw new Error("C2B confirmation is missing TransID or MSISDN");
  }

  console.log(`[handleC2bConfirmation] Processing ${mpesaReceiptNumber} from ${phone} for ${amount}`);

  const now = new Date();
  const accountReference = parseString(body.BillRefNumber) ?? parseString(body.AccountReference);
  const paidAt = parseMpesaDate(body.TransTime) ?? now;
  const rawCallbackJson = body;
  // For Buy Goods: BusinessShortCode in callback = the till number; store is the parent
  const tillNumber = parseString(body.BusinessShortCode) ?? process.env.MPESA_TILL_NUMBER ?? null;
  const businessShortcode = process.env.MPESA_SHORTCODE ?? null;

  const [inserted] = await db
    .insert(mpesaPayments)
    .values({
      source: "c2b_till",
      status: "Success",
      phone,
      amount: formatAmount(amount ?? 0),
      tillNumber,
      businessShortcode,
      mpesaReceiptNumber,
      accountReference,
      resultCode: 0,
      resultDesc: "C2B Confirmed",
      rawCallbackJson,
      paidAt,
      createdAt: paidAt,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: mpesaPayments.mpesaReceiptNumber })
    .returning({ id: mpesaPayments.id });

  // Trigger SMS automation — errors must never fail the payment
  if (inserted?.id && amount != null) {
    processPaymentSms({
      paymentId: inserted.id,
      phone,
      amount,
      transactionCode: mpesaReceiptNumber,
      paidAt,
    }).catch((err) => {
      console.error("[sms-automation] Background SMS trigger failed:", err);
    });
  }

  return accepted();
}

export async function handleC2bValidation(body: unknown): Promise<CallbackResult> {
  console.log("[handleC2bValidation] Received callback:", JSON.stringify(body, null, 2));
  return accepted();
}
