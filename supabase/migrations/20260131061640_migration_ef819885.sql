-- Create star_invoices table to track payment invoices
CREATE TABLE IF NOT EXISTS star_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL, -- references users(id) removed to avoid dependency issues if users table structure differs
  telegram_user_id BIGINT NOT NULL,
  invoice_payload TEXT NOT NULL UNIQUE,
  stars_amount INTEGER NOT NULL,
  part_key TEXT NOT NULL,
  part_name TEXT NOT NULL,
  part_level INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'expired')),
  telegram_payment_charge_id TEXT NULL,
  paid_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 hour'
);

-- Create star_transactions table for payment history
CREATE TABLE IF NOT EXISTS star_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  telegram_user_id BIGINT NOT NULL,
  invoice_id UUID NOT NULL REFERENCES star_invoices(id) ON DELETE CASCADE,
  stars_paid INTEGER NOT NULL,
  transaction_type TEXT NOT NULL DEFAULT 'speedup',
  metadata JSONB NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_star_invoices_user ON star_invoices(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_star_invoices_payload ON star_invoices(invoice_payload);
CREATE INDEX IF NOT EXISTS idx_star_transactions_user ON star_transactions(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE star_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE star_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Drop first to avoid errors on retry)
DROP POLICY IF EXISTS "Users can create their own invoices" ON star_invoices;
DROP POLICY IF EXISTS "Users can view their own invoices" ON star_invoices;
DROP POLICY IF EXISTS "Users can update their own invoices" ON star_invoices;

CREATE POLICY "Users can create their own invoices" ON star_invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own invoices" ON star_invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own invoices" ON star_invoices FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own transactions" ON star_transactions;
DROP POLICY IF EXISTS "Users can create their own transactions" ON star_transactions;

CREATE POLICY "Users can view their own transactions" ON star_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own transactions" ON star_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);