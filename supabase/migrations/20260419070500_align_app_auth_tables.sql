CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

UPDATE public.mpesa_payments
SET initiated_by = NULL
WHERE initiated_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE public.users.id = public.mpesa_payments.initiated_by
  );

ALTER TABLE public.mpesa_payments
  DROP CONSTRAINT IF EXISTS mpesa_payments_initiated_by_fkey;

ALTER TABLE public.mpesa_payments
  ADD CONSTRAINT mpesa_payments_initiated_by_fkey
  FOREIGN KEY (initiated_by) REFERENCES public.users(id) ON DELETE SET NULL;
