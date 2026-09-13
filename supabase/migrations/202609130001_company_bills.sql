-- Company Bills & Invoices Tables
CREATE TABLE IF NOT EXISTS public.company_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subscriber_no TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'elektrik',
    company TEXT NOT NULL DEFAULT 'ETİK',
    auto_payment BOOLEAN NOT NULL DEFAULT false,
    current_amount NUMERIC NOT NULL DEFAULT 0,
    due_date DATE,
    bill_status TEXT NOT NULL DEFAULT 'odenecek',
    last_paid_at DATE,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.company_bill_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES public.company_bills(id) ON DELETE CASCADE,
    period TEXT NOT NULL,
    invoice_no TEXT DEFAULT '',
    invoice_date DATE,
    due_date DATE NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    paid_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'odenecek',
    paid_at DATE,
    payment_method TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_company_bills_status ON public.company_bills(bill_status);
CREATE INDEX IF NOT EXISTS idx_company_bills_due_date ON public.company_bills(due_date);
CREATE INDEX IF NOT EXISTS idx_company_bill_invoices_bill_id ON public.company_bill_invoices(bill_id);
CREATE INDEX IF NOT EXISTS idx_company_bill_invoices_due_date ON public.company_bill_invoices(due_date);

-- Enable RLS
ALTER TABLE public.company_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_bill_invoices ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated/anon for now
DROP POLICY IF EXISTS "company_bills_all" ON public.company_bills;
CREATE POLICY "company_bills_all" ON public.company_bills FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "company_bill_invoices_all" ON public.company_bill_invoices;
CREATE POLICY "company_bill_invoices_all" ON public.company_bill_invoices FOR ALL USING (true) WITH CHECK (true);
