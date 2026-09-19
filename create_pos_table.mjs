import { execSync } from 'child_process';

process.env.SUPABASE_ACCESS_TOKEN = 'sbp_06914e53d784b70c455ff2be8fcee686b4850954';

const sql = `
CREATE TABLE IF NOT EXISTS pos_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  date DATE NOT NULL,
  left_table JSONB NOT NULL DEFAULT '[]'::jsonb,
  right_table JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(organization_id, date)
);

-- Enable RLS
ALTER TABLE pos_reports ENABLE ROW LEVEL SECURITY;

-- Create basic policies (allow all authenticated operations for simplicity, similar to other tables)
DROP POLICY IF EXISTS select_pos_reports ON pos_reports;
CREATE POLICY select_pos_reports ON pos_reports FOR SELECT USING (true);

DROP POLICY IF EXISTS insert_pos_reports ON pos_reports;
CREATE POLICY insert_pos_reports ON pos_reports FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS update_pos_reports ON pos_reports;
CREATE POLICY update_pos_reports ON pos_reports FOR UPDATE USING (true);

DROP POLICY IF EXISTS delete_pos_reports ON pos_reports;
CREATE POLICY delete_pos_reports ON pos_reports FOR DELETE USING (true);
`;

try {
  const output = execSync(`npx supabase db query --linked "${sql.replace(/\n/g, ' ')}"`, { encoding: 'utf-8' });
  console.log('Success:', output);
} catch (error) {
  console.error('Error:', error);
}
