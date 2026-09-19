-- Recreate the SELECT policy on activity_logs to support super_admin and correct emails
DROP POLICY IF EXISTS activity_logs_admin_select ON public.activity_logs;
CREATE POLICY activity_logs_admin_select ON public.activity_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = activity_logs.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('admin', 'super_admin')
    )
    OR auth.email() IN ('admin@dars.local', 'admin@ets360.local', 'admin@ops360.local')
  );

-- Helper check function
CREATE OR REPLACE FUNCTION public.is_admin_or_super_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = check_user_id 
      AND active = true 
      AND role IN ('admin', 'super_admin')
  );
END;
$$;

-- Admin Create User
CREATE OR REPLACE FUNCTION public.admin_create_user(
  invite_email text,
  invite_password text,
  invite_full_name text,
  invite_role text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_org_id uuid;
  new_user_id uuid := gen_random_uuid();
BEGIN
  -- Check if caller is admin or super_admin and get their organization_id
  SELECT organization_id INTO caller_org_id FROM public.organization_members
  WHERE user_id = auth.uid() AND active AND role IN ('admin', 'super_admin') LIMIT 1;

  IF caller_org_id IS NULL AND auth.email() NOT IN ('admin@dars.local', 'admin@ets360.local') THEN
    RAISE EXCEPTION 'Yalnızca yöneticiler kullanıcı ekleyebilir';
  END IF;

  -- Default to first org if global admin
  IF caller_org_id IS NULL THEN
    SELECT id INTO caller_org_id FROM public.organizations LIMIT 1;
  END IF;

  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(trim(invite_email))) THEN
    RAISE EXCEPTION 'Bu e-posta adresi zaten kullanımda';
  END IF;

  -- Create user in auth.users
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role
  ) VALUES (
    new_user_id,
    lower(trim(invite_email)),
    crypt(invite_password, gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    json_build_object('full_name', trim(invite_full_name)),
    'authenticated',
    'authenticated'
  );

  -- Create member in public.organization_members
  INSERT INTO public.organization_members (organization_id, user_id, role, active)
  VALUES (caller_org_id, new_user_id, invite_role, true);

  RETURN new_user_id;
END;
$$;

-- Admin Update User
CREATE OR REPLACE FUNCTION public.admin_update_user(
  target_user_id uuid,
  new_full_name text,
  new_password text,
  new_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_org_id uuid;
  target_org_id uuid;
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

  -- Update full_name in public.profiles and auth.users raw_user_meta_data
  UPDATE public.profiles SET full_name = trim(new_full_name) WHERE id = target_user_id;
  
  UPDATE auth.users 
  SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('full_name', trim(new_full_name))
  WHERE id = target_user_id;

  -- Update password in auth.users if provided
  IF new_password IS NOT NULL AND trim(new_password) <> '' THEN
    UPDATE auth.users 
    SET encrypted_password = crypt(new_password, gen_salt('bf'))
    WHERE id = target_user_id;
  END IF;

  -- Update role in public.organization_members
  IF new_role IS NOT NULL AND new_role IN ('admin', 'super_admin', 'muhasebe', 'finans', 'goruntuleyici') THEN
    UPDATE public.organization_members 
    SET role = new_role
    WHERE organization_id = caller_org_id AND user_id = target_user_id;
  END IF;
END;
$$;

-- Permissions
REVOKE ALL ON FUNCTION public.admin_create_user(text, text, text, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.admin_update_user(uuid, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_user(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user(uuid, text, text, text) TO authenticated;
