-- ==============================================================================
-- DARS ERP / AMASYA ET - ENHANCE ADMIN UPDATE USER
-- Yöneticilerin kullanıcının ismini, şifresini, rolünü ve kullanıcı adını/e-postasını
-- doğrudan güncelleyebilmesini sağlar.
-- ==============================================================================

DROP FUNCTION IF EXISTS public.admin_update_user(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.admin_update_user(uuid, text, text, text, text);

CREATE OR REPLACE FUNCTION public.admin_update_user(
  target_user_id uuid,
  new_full_name text,
  new_password text,
  new_role text,
  new_email text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  caller_org_id uuid;
  target_org_id uuid;
  clean_email text;
BEGIN
  -- Find caller's organization and verify they are an admin or super_admin
  SELECT organization_id INTO caller_org_id FROM public.organization_members
  WHERE user_id = auth.uid() AND active AND role IN ('admin', 'super_admin') LIMIT 1;
  
  IF caller_org_id IS NULL AND auth.email() NOT IN ('admin@dars.local', 'admin@ets360.local') THEN
    RAISE EXCEPTION 'Yalnızca yöneticiler kullanıcıları yönetebilir';
  END IF;

  -- Default if global admin
  IF caller_org_id IS NULL THEN
    SELECT organization_id INTO caller_org_id FROM public.organization_members WHERE user_id = target_user_id LIMIT 1;
  END IF;

  -- Verify target user is in the same organization
  SELECT organization_id INTO target_org_id FROM public.organization_members
  WHERE user_id = target_user_id LIMIT 1;

  IF target_org_id IS NULL OR target_org_id <> caller_org_id THEN
    RAISE EXCEPTION 'Kullanıcı bulunamadı veya yetkisiz işlem';
  END IF;

  -- 1. Update full_name in public.profiles and auth.users raw_user_meta_data
  IF new_full_name IS NOT NULL AND trim(new_full_name) <> '' THEN
    UPDATE public.profiles SET full_name = trim(new_full_name) WHERE id = target_user_id;
    
    UPDATE auth.users 
    SET raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('full_name', trim(new_full_name))
    WHERE id = target_user_id;
  END IF;

  -- 2. Update email / username if provided
  IF new_email IS NOT NULL AND trim(new_email) <> '' THEN
    clean_email := trim(new_email);
    IF NOT clean_email LIKE '%@%' THEN
      clean_email := clean_email || '@dars.local';
    END IF;
    UPDATE auth.users SET email = clean_email WHERE id = target_user_id;
    UPDATE public.profiles SET email = clean_email WHERE id = target_user_id;
  END IF;

  -- 3. Update password in auth.users if provided
  IF new_password IS NOT NULL AND trim(new_password) <> '' THEN
    UPDATE auth.users 
    SET encrypted_password = crypt(new_password, gen_salt('bf'))
    WHERE id = target_user_id;
  END IF;

  -- 4. Update role in public.organization_members
  IF new_role IS NOT NULL AND new_role IN ('admin', 'super_admin', 'muhasebe', 'finans', 'goruntuleyici') THEN
    UPDATE public.organization_members 
    SET role = new_role
    WHERE organization_id = caller_org_id AND user_id = target_user_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_user(uuid, text, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user(uuid, text, text, text, text) TO authenticated;
