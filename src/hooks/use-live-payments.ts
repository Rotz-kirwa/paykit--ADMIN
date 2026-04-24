import { startTransition, useEffect, useState } from "react";
import { fetchPaymentsFn, type MpesaPayment } from "@/lib/payments";

export function useLivePayments(initialPayments: MpesaPayment[], intervalMs = 10000) {
  const [payments, setPayments] = useState(initialPayments);

  useEffect(() => {
    setPayments(initialPayments);
  }, [initialPayments]);

  const refresh = async () => {
    const fresh = await fetchPaymentsFn();
    startTransition(() => {
      setPayments(fresh);
    });
    return fresh;
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refresh().catch(() => {
        // Keep the current snapshot if a background refresh fails.
      });
    }, intervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [intervalMs]);

  return { payments, refresh };
}
