CREATE TABLE IF NOT EXISTS public.whatsapp_gateway_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'disconnected', -- 'disconnected', 'qr_ready', 'connected', 'error'
    qr_code TEXT, -- Base64 data URL for display
    qr_raw TEXT, -- Raw QR string from Baileys
    phone_number TEXT,
    device_name TEXT,
    battery_level INTEGER DEFAULT 100,
    is_charging BOOLEAN DEFAULT false,
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_whatsapp_gateway_org UNIQUE (organization_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_gateway_org ON public.whatsapp_gateway_sessions(organization_id);

ALTER TABLE public.whatsapp_gateway_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read whatsapp_gateway_sessions"
    ON public.whatsapp_gateway_sessions FOR SELECT USING (true);

CREATE POLICY "Allow public insert whatsapp_gateway_sessions"
    ON public.whatsapp_gateway_sessions FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update whatsapp_gateway_sessions"
    ON public.whatsapp_gateway_sessions FOR UPDATE USING (true);

CREATE POLICY "Allow public delete whatsapp_gateway_sessions"
    ON public.whatsapp_gateway_sessions FOR DELETE USING (true);

-- Seed an initial session row for default organization
INSERT INTO public.whatsapp_gateway_sessions (
    organization_id,
    status,
    device_name,
    phone_number,
    last_heartbeat
) VALUES (
    '13b8da90-27d1-440d-a8f4-eb50dadd6391',
    'disconnected',
    'WhatsApp Web Gateway',
    NULL,
    NOW()
) ON CONFLICT (organization_id) DO NOTHING;
