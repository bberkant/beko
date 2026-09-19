-- Update operations-documents bucket to explicitly allow PDF, Excel, and Image mime types
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('operations-documents','operations-documents',false,10485760,array[
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/jpg'
]) on conflict (id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;
