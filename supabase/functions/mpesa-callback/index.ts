import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface CallbackItem {
  Name: string;
  Value?: string | number;
}

interface MpesaCallback {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: { Item: CallbackItem[] };
    };
  };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body: MpesaCallback;
  try {
    body = (await req.json()) as MpesaCallback;
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const cb = body?.Body?.stkCallback;
  if (!cb) return new Response("Bad Request", { status: 400 });

  const items = cb.CallbackMetadata?.Item ?? [];
  const get = (name: string) => items.find((i) => i.Name === name)?.Value;

  const status: "Success" | "Cancelled" | "Failed" =
    cb.ResultCode === 0 ? "Success" : cb.ResultCode === 1032 ? "Cancelled" : "Failed";

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  await supabase
    .from("mpesa_payments")
    .update({
      status,
      result_code: cb.ResultCode,
      result_desc: cb.ResultDesc,
      mpesa_receipt: (get("MpesaReceiptNumber") as string) ?? null,
      raw_callback: body as unknown,
    })
    .eq("checkout_request_id", cb.CheckoutRequestID);

  return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
