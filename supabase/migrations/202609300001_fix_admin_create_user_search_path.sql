-- ==============================================================================
-- DARS ERP / AMASYA ET - SEARCH PATH FIX FOR PGYCRYPTO EXTENSIONS
-- admin_create_user and admin_update_user functions need 'extensions' in their
-- search_path so that gen_salt('bf') and crypt() resolve properly.
-- ==============================================================================

ALTER FUNCTION public.admin_create_user(text, text, text, text) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.admin_update_user(uuid, text, text, text) SET search_path = public, extensions, pg_temp;
