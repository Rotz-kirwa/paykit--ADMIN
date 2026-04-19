-- Roles enum + table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- M-Pesa payments table
CREATE TYPE public.mpesa_status AS ENUM ('Pending', 'Success', 'Failed', 'Cancelled');

CREATE TABLE public.mpesa_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_request_id TEXT UNIQUE,
  merchant_request_id TEXT,
  phone TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  account_reference TEXT,
  transaction_desc TEXT,
  mpesa_receipt TEXT,
  status public.mpesa_status NOT NULL DEFAULT 'Pending',
  result_code INTEGER,
  result_desc TEXT,
  raw_callback JSONB,
  initiated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mpesa_payments_created_at ON public.mpesa_payments(created_at DESC);
CREATE INDEX idx_mpesa_payments_status ON public.mpesa_payments(status);
CREATE INDEX idx_mpesa_payments_phone ON public.mpesa_payments(phone);

ALTER TABLE public.mpesa_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all payments"
  ON public.mpesa_payments FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert payments"
  ON public.mpesa_payments FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_mpesa_payments_updated_at
  BEFORE UPDATE ON public.mpesa_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();