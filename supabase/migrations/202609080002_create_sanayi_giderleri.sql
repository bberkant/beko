
-- Create vehicle maintenance / sanayi expenses table
CREATE TABLE IF NOT EXISTS public.sanayi_giderleri (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    plate TEXT NOT NULL,
    supplier TEXT NOT NULL,
    invoice_no TEXT,
    description TEXT,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    remaining_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'bekliyor',
    payment_date DATE,
    document_url TEXT,
    document_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sanayi_giderleri_org_date ON public.sanayi_giderleri(organization_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sanayi_giderleri_plate ON public.sanayi_giderleri(organization_id, plate);
CREATE INDEX IF NOT EXISTS idx_sanayi_giderleri_supplier ON public.sanayi_giderleri(organization_id, supplier);

ALTER TABLE public.sanayi_giderleri ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage sanayi_giderleri of their org" ON public.sanayi_giderleri;
CREATE POLICY "Users can manage sanayi_giderleri of their org" ON public.sanayi_giderleri
    FOR ALL
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        )
        OR auth.uid() IS NOT NULL
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        )
        OR auth.uid() IS NOT NULL
    );
