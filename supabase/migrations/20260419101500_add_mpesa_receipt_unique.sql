CREATE UNIQUE INDEX IF NOT EXISTS mpesa_payments_mpesa_receipt_unique
  ON public.mpesa_payments (mpesa_receipt);
