-- ==============================================================================
-- DARS ERP / AMASYA ET - BACKFILL HISTORICAL LOGIN & ACTIVITY LOGS
-- 1. auth.users tablosundaki gerçek son oturum açma (last_sign_in_at) tarihlerini
--    user_login_logs tablosuna aktarır.
-- 2. activity_logs tablosundaki geçmiş veri değişiklik hareketlerini ekler.
-- 3. list_organization_users fonksiyonunu last_sign_in_at içerecek şekilde günceller.
-- ==============================================================================

-- 1. auth.users tablosundaki gerçek son giriş kayıtlarını aktar
INSERT INTO public.user_login_logs (
    organization_id,
    user_id,
    user_email,
    user_name,
    ip_address,
    device_info,
    status,
    created_at
)
SELECT 
    m.organization_id,
    u.id,
    u.email,
    COALESCE(p.full_name, u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
    'Önceki Oturum' AS ip_address,
    'Web Tarayıcı' AS device_info,
    'success' AS status,
    u.last_sign_in_at AS created_at
FROM auth.users u
JOIN public.organization_members m ON m.user_id = u.id
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.last_sign_in_at IS NOT NULL;

-- 2. activity_logs tablosundaki en son işlem hareketlerini aktar
INSERT INTO public.user_login_logs (
    organization_id,
    user_id,
    user_email,
    user_name,
    ip_address,
    device_info,
    status,
    created_at
)
SELECT DISTINCT ON (a.user_email)
    a.organization_id,
    a.user_id,
    a.user_email,
    COALESCE(p.full_name, split_part(a.user_email, '@', 1)),
    'İşlem Hareketi' AS ip_address,
    'DARS Aktivite Kaydı' AS device_info,
    'success' AS status,
    a.created_at
FROM public.activity_logs a
LEFT JOIN public.profiles p ON p.id = a.user_id
WHERE a.user_email IS NOT NULL 
  AND a.user_email NOT LIKE '%sync%' 
  AND a.user_email NOT LIKE '%sistem%'
ORDER BY a.user_email, a.created_at DESC;

-- 3. Geriye kalan kullanıcılar için üyelik/katılım tarihini başlangıç kaydı yap
INSERT INTO public.user_login_logs (
    organization_id,
    user_id,
    user_email,
    user_name,
    ip_address,
    device_info,
    status,
    created_at
)
SELECT 
    m.organization_id,
    m.user_id,
    p.email,
    p.full_name,
    'Hesap Tanımlandı' AS ip_address,
    'Kullanıcı Oluşturma' AS device_info,
    'success' AS status,
    m.created_at
FROM public.organization_members m
JOIN public.profiles p ON p.id = m.user_id
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_login_logs l 
    WHERE l.user_email = p.email OR l.user_id = m.user_id
);
