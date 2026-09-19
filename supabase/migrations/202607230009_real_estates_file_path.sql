-- Add file_path column to public.real_estates table
begin;

ALTER TABLE public.real_estates ADD COLUMN IF NOT EXISTS file_path text;

commit;
