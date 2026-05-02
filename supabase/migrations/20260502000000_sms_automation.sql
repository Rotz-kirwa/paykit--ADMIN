-- SMS Automation Rules
CREATE TABLE IF NOT EXISTS sms_automation_rules (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL DEFAULT '',
  min_amount  NUMERIC(12,2) NOT NULL,
  max_amount  NUMERIC(12,2) NOT NULL,
  message_template TEXT   NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_amount_order CHECK (max_amount >= min_amount),
  CONSTRAINT chk_positive_amounts CHECK (min_amount > 0 AND max_amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_sms_rules_active ON sms_automation_rules (is_active, min_amount, max_amount);

-- SMS Send Logs
CREATE TABLE IF NOT EXISTS sms_logs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id        UUID        REFERENCES mpesa_payments(id) ON DELETE SET NULL,
  rule_id           UUID        REFERENCES sms_automation_rules(id) ON DELETE SET NULL,
  phone             TEXT        NOT NULL,
  amount            NUMERIC(12,2),
  message           TEXT        NOT NULL,
  provider_response JSONB,
  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('sent', 'failed', 'pending')),
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON sms_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_payment_id ON sms_logs (payment_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status     ON sms_logs (status);

-- Generic App Settings (key/value store)
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT        PRIMARY KEY,
  value      TEXT        NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default: SMS automation enabled
INSERT INTO app_settings (key, value)
VALUES ('sms_automation_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- Seed default rules (1-50, 51-100, 101-150, 151-200, 201-250)
INSERT INTO sms_automation_rules (name, min_amount, max_amount, message_template, is_active)
VALUES
  ('KES 1 - 50 Package',   1,   50,  'Dear {phone}, thank you for your payment of KES {amount}. Your transaction code is {transaction_code}. Date: {date}.', true),
  ('KES 51 - 100 Package', 51,  100, 'Dear {phone}, thank you for your payment of KES {amount}. Your transaction code is {transaction_code}. Date: {date}.', true),
  ('KES 101 - 150 Package',101, 150, 'Dear {phone}, thank you for your payment of KES {amount}. Your transaction code is {transaction_code}. Date: {date}.', true),
  ('KES 151 - 200 Package',151, 200, 'Dear {phone}, thank you for your payment of KES {amount}. Your transaction code is {transaction_code}. Date: {date}.', true),
  ('KES 201 - 250 Package',201, 250, 'Dear {phone}, thank you for your payment of KES {amount}. Your transaction code is {transaction_code}. Date: {date}.', true)
ON CONFLICT DO NOTHING;

-- Auto-update updated_at on rules
CREATE OR REPLACE FUNCTION update_sms_rules_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_sms_rules_updated_at ON sms_automation_rules;
CREATE TRIGGER trg_sms_rules_updated_at
  BEFORE UPDATE ON sms_automation_rules
  FOR EACH ROW EXECUTE FUNCTION update_sms_rules_updated_at();
