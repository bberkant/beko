
-- Create vehicle fuel tracking table
CREATE TABLE IF NOT EXISTS public.vehicle_fuel_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    vehicle_id UUID,
    plate TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fuel_type TEXT DEFAULT 'Motorin',
    unit_price NUMERIC(12, 4) DEFAULT 0,
    quantity NUMERIC(12, 3) DEFAULT 0,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    station TEXT,
    city TEXT,
    fuel_card_no TEXT,
    km NUMERIC,
    driver_name TEXT,
    source_file TEXT,
    document_url TEXT,
    notes TEXT,
    raw_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_fuel_org_date ON public.vehicle_fuel_entries(organization_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_fuel_plate ON public.vehicle_fuel_entries(organization_id, plate);
CREATE INDEX IF NOT EXISTS idx_vehicle_fuel_station ON public.vehicle_fuel_entries(organization_id, station);

ALTER TABLE public.vehicle_fuel_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage vehicle_fuel_entries of their org" ON public.vehicle_fuel_entries;
CREATE POLICY "Users can manage vehicle_fuel_entries of their org" ON public.vehicle_fuel_entries
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
