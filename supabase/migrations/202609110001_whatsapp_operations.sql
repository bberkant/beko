CREATE TABLE IF NOT EXISTS public.whatsapp_incoming_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    group_name TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    sender_phone TEXT,
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL DEFAULT 'image',
    caption TEXT,
    suggested_module TEXT DEFAULT 'sanayi',
    extracted_data JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending',
    processed_at TIMESTAMPTZ,
    processed_to_table TEXT,
    processed_record_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_media_org_status ON public.whatsapp_incoming_media(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_media_group ON public.whatsapp_incoming_media(organization_id, group_name);
CREATE INDEX IF NOT EXISTS idx_whatsapp_media_created ON public.whatsapp_incoming_media(organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.whatsapp_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    group_name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    original_message TEXT,
    sender_name TEXT,
    assigned_to TEXT,
    priority TEXT NOT NULL DEFAULT 'medium',
    category TEXT NOT NULL DEFAULT 'sevkiyat',
    status TEXT NOT NULL DEFAULT 'todo',
    due_date DATE,
    completed_at TIMESTAMPTZ,
    media_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_tasks_org_status ON public.whatsapp_tasks(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_tasks_group ON public.whatsapp_tasks(organization_id, group_name);
CREATE INDEX IF NOT EXISTS idx_whatsapp_tasks_category ON public.whatsapp_tasks(organization_id, category);
CREATE INDEX IF NOT EXISTS idx_whatsapp_tasks_due ON public.whatsapp_tasks(organization_id, due_date);

CREATE TABLE IF NOT EXISTS public.whatsapp_group_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    group_name TEXT NOT NULL,
    default_module TEXT NOT NULL DEFAULT 'sanayi',
    default_category TEXT NOT NULL DEFAULT 'arac_bakim',
    auto_ocr BOOLEAN NOT NULL DEFAULT true,
    auto_task BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_whatsapp_group_rules_group UNIQUE (organization_id, group_name)
);

ALTER TABLE public.whatsapp_incoming_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_group_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS whatsapp_incoming_media_policy ON public.whatsapp_incoming_media;
CREATE POLICY whatsapp_incoming_media_policy ON public.whatsapp_incoming_media FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS whatsapp_tasks_policy ON public.whatsapp_tasks;
CREATE POLICY whatsapp_tasks_policy ON public.whatsapp_tasks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS whatsapp_group_rules_policy ON public.whatsapp_group_rules;
CREATE POLICY whatsapp_group_rules_policy ON public.whatsapp_group_rules FOR ALL USING (true) WITH CHECK (true);
