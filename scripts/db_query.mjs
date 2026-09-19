import { execSync } from 'child_process';

process.env.SUPABASE_ACCESS_TOKEN = 'sbp_06914e53d784b70c455ff2be8fcee686b4850954';

try {
  const query = `
    CREATE TABLE IF NOT EXISTS public.vega_efatura_cache (
      company TEXT PRIMARY KEY,
      invoices JSONB NOT NULL DEFAULT '[]'::jsonb,
      record_count INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_by TEXT
    );

    ALTER TABLE public.vega_efatura_cache ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "vega_efatura_cache_select_policy" ON public.vega_efatura_cache;
    CREATE POLICY "vega_efatura_cache_select_policy" ON public.vega_efatura_cache
      FOR SELECT
      USING (true);

    DROP POLICY IF EXISTS "vega_efatura_cache_insert_policy" ON public.vega_efatura_cache;
    CREATE POLICY "vega_efatura_cache_insert_policy" ON public.vega_efatura_cache
      FOR INSERT
      WITH CHECK (true);

    DROP POLICY IF EXISTS "vega_efatura_cache_update_policy" ON public.vega_efatura_cache;
    CREATE POLICY "vega_efatura_cache_update_policy" ON public.vega_efatura_cache
      FOR UPDATE
      USING (true)
      WITH CHECK (true);
  `;
  const output = execSync(`npx supabase db query --linked --output-format json "${query.replace(/\n/g, ' ')}"`, { encoding: 'utf-8' });
  console.log(output);
} catch (error) {
  console.error('Error running query:', error.message);
  if (error.stdout) console.error('Stdout:', error.stdout);
  if (error.stderr) console.error('Stderr:', error.stderr);
}
