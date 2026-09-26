import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type OrganizationRole = 'super_admin' | 'admin' | 'developer' | 'muhasebe' | 'finans' | 'goruntuleyici';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  rawRole?: OrganizationRole | null;
  organizationId: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  signUp: (name: string, companyName: string, email: string, password: string, inviteToken?: string) => Promise<string>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const roleLabels: Record<OrganizationRole, string> = {
  super_admin: 'Süper Admin',
  admin: 'Admin',
  developer: 'Developer',
  muhasebe: 'Muhasebe',
  finans: 'Finans',
  goruntuleyici: 'Görüntüleyici',
};

export interface StaffRegistryUser {
  id: string;
  name: string;
  username: string;
  aliases: string[];
  email: string;
  role: string;
  rawRole: OrganizationRole;
  defaultPassword?: string;
}

export function cleanDisplayUsername(raw?: string | null): string {
  if (!raw) return '';
  return raw.trim().replace(/@dars\.local$/i, '').replace(/@ops360\.local$/i, '').replace(/@ets360\.local$/i, '');
}

export function isSuleymanOrMustafaDemir(user?: { email?: string; name?: string; id?: string } | null): boolean {
  if (!user) return false;
  const rawKey = (user.email || '').toLowerCase().trim().replace(/@.*$/, '');
  const rawName = (user.name || '').toLowerCase().trim();
  const rawId = user.id || '';
  
  if (rawId === '105d6beb-f701-4a68-81c1-8ce84fda2946' || rawId === 'b6d40310-38ff-48b0-a873-8332ace373ff') {
    return true;
  }
  
  if (
    rawKey === 'suleyman' ||
    rawKey === 'süleyman' ||
    rawName === 'süleyman' ||
    rawName === 'suleyman' ||
    rawName.includes('süleyman') ||
    rawName.includes('suleyman')
  ) {
    return true;
  }
  
  if (
    rawKey === 'mustafademir' ||
    rawKey === 'mustafa demir' ||
    rawName === 'mustafa demir' ||
    rawName.includes('mustafa demir')
  ) {
    return true;
  }
  
  return false;
}

export const KNOWN_STAFF_USERS: StaffRegistryUser[] = [
  {
    id: '9c242e61-e15f-41b5-b1e6-60a02baed90a',
    name: 'Berkant',
    username: 'berkant',
    aliases: ['berkant', 'berkant@dars.local', 'berkant@ops360.local'],
    email: 'berkant',
    role: 'Developer',
    rawRole: 'developer',
    defaultPassword: '123berkant_',
  },
  {
    id: '291129b0-b5be-447e-97e1-51c613446aa3',
    name: 'Admin',
    username: 'admin',
    aliases: ['admin', 'admin@ops360.local', 'admin@dars.local'],
    email: 'admin',
    role: 'Admin',
    rawRole: 'admin',
    defaultPassword: '123berkant_',
  },
  {
    id: 'c0e5fc93-e075-4351-9c50-8532a3c0cbda',
    name: 'Hasan',
    username: 'hasan',
    aliases: ['hasan', 'hasan@dars.local'],
    email: 'hasan',
    role: 'Muhasebe',
    rawRole: 'muhasebe',
    defaultPassword: '365200',
  },
  {
    id: '4508b981-bf36-4198-ab1d-7a8c4a54f1d4',
    name: 'Serdar',
    username: 'serdar',
    aliases: ['serdar', 'serdar@dars.local'],
    email: 'serdar',
    role: 'Finans',
    rawRole: 'finans',
    defaultPassword: '365200',
  },
  {
    id: 'b37be5b1-3df5-4bbc-b98e-dd5ae9dcb18a',
    name: 'Drama',
    username: 'drama',
    aliases: ['drama', 'drama@dars.local'],
    email: 'drama',
    role: 'Finans',
    rawRole: 'finans',
    defaultPassword: '365200',
  },
  {
    id: '87ea8dcc-5ede-44a7-9b0b-89ea4465e5b1',
    name: 'Burak',
    username: 'burak',
    aliases: ['burak', 'burak@dars.local'],
    email: 'burak',
    role: 'Görüntüleyici',
    rawRole: 'goruntuleyici',
    defaultPassword: '365200',
  },
  {
    id: '8a40f3fa-6a5d-489a-b8bd-cf78f9023349',
    name: 'Cem',
    username: 'cem',
    aliases: ['cem', 'cem@dars.local'],
    email: 'cem',
    role: 'Görüntüleyici',
    rawRole: 'goruntuleyici',
    defaultPassword: '365200',
  },
  {
    id: '06799b4f-b592-4504-aa13-bd531afdc4d0',
    name: 'Mert',
    username: 'mert',
    aliases: ['mert', 'mert@dars.local'],
    email: 'mert',
    role: 'Görüntüleyici',
    rawRole: 'goruntuleyici',
    defaultPassword: '365200',
  },
  {
    id: '105d6beb-f701-4a68-81c1-8ce84fda2946',
    name: 'Mustafa Demir',
    username: 'mustafademir',
    aliases: ['mustafademir', 'mustafa demir', 'mustafademir@dars.local'],
    email: 'mustafademir',
    role: 'Muhasebe',
    rawRole: 'muhasebe',
    defaultPassword: '365200',
  },
  {
    id: '6c106113-a839-46c3-8516-80cfc904ed2c',
    name: 'Önder',
    username: 'onder',
    aliases: ['onder', 'önder', 'onder@dars.local', 'önder@dars.local'],
    email: 'önder',
    role: 'Görüntüleyici',
    rawRole: 'goruntuleyici',
    defaultPassword: '365200',
  },
  {
    id: 'b6d40310-38ff-48b0-a873-8332ace373ff',
    name: 'Süleyman',
    username: 'suleyman',
    aliases: ['suleyman', 'süleyman', 'suleyman@dars.local', 'süleyman@dars.local'],
    email: 'süleyman',
    role: 'Muhasebe',
    rawRole: 'muhasebe',
    defaultPassword: '365200',
  },
];

export function normalizeUserKey(input?: string | null): string {
  if (!input) return '';
  return input
    .trim()
    .toLocaleLowerCase('tr')
    .replace(/@dars\.local$/, '')
    .replace(/@ops360\.local$/, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/\s+/g, '');
}

export function saveCustomStaffPassword(userIdOrEmail: string, password: string) {
  try {
    const raw = localStorage.getItem('dars_user_passwords') || '{}';
    const passwords = JSON.parse(raw);
    const key = normalizeUserKey(userIdOrEmail);
    if (key) passwords[key] = password;
    passwords[userIdOrEmail.trim().toLowerCase()] = password;
    localStorage.setItem('dars_user_passwords', JSON.stringify(passwords));
  } catch (err) {
    console.warn('Custom password kaydedilemedi:', err);
  }
}

export function getCustomStaffPassword(userIdOrEmail: string): string | null {
  try {
    const raw = localStorage.getItem('dars_user_passwords');
    if (!raw) return null;
    const passwords = JSON.parse(raw);
    const key = normalizeUserKey(userIdOrEmail);
    return passwords[key] || passwords[userIdOrEmail.trim().toLowerCase()] || null;
  } catch {
    return null;
  }
}

export async function ensureSupabaseBackendSession(): Promise<Session | null> {
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session) return data.session;
    const { data: signInRes } = await supabase.auth.signInWithPassword({
      email: 'berkant@dars.local',
      password: '123berkant_'
    });
    return signInRes?.session || null;
  } catch {
    return null;
  }
}

async function resolveUser(session: Session): Promise<AuthUser> {
  const authUser = session.user;
  let profileName = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Kullanıcı';
  let role: OrganizationRole | undefined = undefined;
  let organizationId: string | null = null;

  try {
    const [{ data: profile }, { data: membership }] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', authUser.id).maybeSingle(),
      supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', authUser.id)
        .eq('active', true)
        .limit(1)
        .maybeSingle(),
    ]);
    if (profile?.full_name) profileName = profile.full_name;
    if (membership?.role) role = membership.role as OrganizationRole;
    if (membership?.organization_id) organizationId = membership.organization_id;
  } catch (err) {
    console.warn('Profil/üyelik detayları yüklenirken hata oluştu, oturum korunuyor:', err);
  }

  const isBerkant = (authUser.email || '').toLowerCase().includes('berkant') || 
                    profileName.toLowerCase().includes('berkant') ||
                    (authUser.user_metadata?.full_name || '').toLowerCase().includes('berkant');
  
  if (isBerkant && (!role || role === 'super_admin' || role === 'admin')) {
    role = 'developer';
  }
  
  const cleanEmail = cleanDisplayUsername(authUser.email) || profileName;
  
  return {
    id: authUser.id,
    name: profileName,
    email: cleanEmail,
    role: role ? (roleLabels[role] || role) : (isBerkant ? 'Developer' : 'Admin'),
    rawRole: role ?? (isBerkant ? 'developer' : 'admin'),
    organizationId: organizationId || '13b8da90-27d1-440d-a8f4-eb50dadd6391',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const cached = localStorage.getItem('dars_cached_auth_user');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed) {
          if (!parsed.organizationId) {
            parsed.organizationId = '13b8da90-27d1-440d-a8f4-eb50dadd6391';
          }
          if (parsed.email) {
            parsed.email = cleanDisplayUsername(parsed.email);
          }
          return parsed;
        }
      }
    } catch {}
    return null;
  });
  const [loading, setLoading] = useState(() => {
    try {
      if (localStorage.getItem('dars_cached_auth_user')) return false;
    } catch {}
    return true;
  });

  useEffect(() => {
    let active = true;
    const applySession = async (session: Session | null) => {
      try {
        const isExplicitSignout = sessionStorage.getItem('dars_explicit_signout') === '1';
        if (isExplicitSignout) {
          if (active) {
            setUser(null);
            localStorage.removeItem('dars_cached_auth_user');
          }
          return;
        }

        const cachedRaw = localStorage.getItem('dars_cached_auth_user');
        let cachedUser: AuthUser | null = null;
        if (cachedRaw) {
          try {
            cachedUser = JSON.parse(cachedRaw);
          } catch {}
        }

        // If we have a cached user, prioritize that user so staff identity is preserved!
        if (cachedUser) {
          if (cachedUser.email) {
            cachedUser.email = cleanDisplayUsername(cachedUser.email);
          }
          if (active) {
            setUser(cachedUser);
          }
          // Ensure background Supabase session is alive for DB calls
          if (!session) {
            session = await ensureSupabaseBackendSession();
          }
          return;
        }

        // If no cached user, try to resolve from Supabase session
        if (!session) {
          const { data: refreshRes } = await supabase.auth.refreshSession().catch(() => ({ data: { session: null } }));
          session = refreshRes?.session || null;
        }

        if (!session) {
          session = await ensureSupabaseBackendSession();
        }

        if (session) {
          const next = await resolveUser(session);
          if (active) {
            setUser(next);
            try {
              localStorage.setItem('dars_cached_auth_user', JSON.stringify(next));
            } catch {}
          }
        } else {
          if (active) {
            setUser(null);
            localStorage.removeItem('dars_cached_auth_user');
          }
        }
      } catch (error) {
        console.error('Oturum bilgileri yüklenemedi:', error);
      } finally {
        if (active) setLoading(false);
      }
    };

    void supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        const isExplicitSignout = sessionStorage.getItem('dars_explicit_signout') === '1';
        if (isExplicitSignout) {
          setUser(null);
          localStorage.removeItem('dars_cached_auth_user');
        } else {
          void applySession(null);
        }
      } else {
        window.setTimeout(() => void applySession(session), 0);
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    sessionStorage.removeItem('dars_explicit_signout');
    if (!remember) {
      sessionStorage.setItem('dars_session_only', '1');
      sessionStorage.setItem('ets360_session_only', '1');
    } else {
      sessionStorage.removeItem('dars_session_only');
      sessionStorage.removeItem('ets360_session_only');
    }

    const inputKey = normalizeUserKey(email);
    const trimmedInput = email.trim();
    const cleanPass = password.trim();

    // 1. Check if it matches a known staff user
    let matchedUser = KNOWN_STAFF_USERS.find(u => {
      if (normalizeUserKey(u.username) === inputKey) return true;
      if (normalizeUserKey(u.name) === inputKey) return true;
      if (normalizeUserKey(u.email) === inputKey) return true;
      return u.aliases.some(a => normalizeUserKey(a) === inputKey);
    });

    // 2. If not in static registry, check dynamically from list_organization_users
    if (!matchedUser) {
      try {
        await ensureSupabaseBackendSession();
        const { data: dbUsers } = await supabase.rpc('list_organization_users');
        if (Array.isArray(dbUsers)) {
          const foundDbUser = dbUsers.find((u: any) => 
            normalizeUserKey(u.email) === inputKey ||
            normalizeUserKey(u.full_name) === inputKey
          );
          if (foundDbUser) {
            matchedUser = {
              id: foundDbUser.user_id,
              name: foundDbUser.full_name || foundDbUser.email,
              username: foundDbUser.email.split('@')[0],
              aliases: [foundDbUser.email, foundDbUser.full_name],
              email: cleanDisplayUsername(foundDbUser.email),
              role: roleLabels[foundDbUser.role as OrganizationRole] || foundDbUser.role,
              rawRole: foundDbUser.role as OrganizationRole,
              defaultPassword: '365200',
            };
          }
        }
      } catch (err) {
        console.warn('Dinamik kullanıcı kontrolü başarısız:', err);
      }
    }

    // 3. Authenticate staff user
    if (matchedUser) {
      const isAdminOrBerkant = matchedUser.username === 'berkant' || matchedUser.username === 'admin';
      
      // Specifically disallow 365200 for berkant and admin
      if (isAdminOrBerkant && cleanPass === '365200') {
        throw new Error('Geçersiz kullanıcı adı veya şifre.');
      }

      const customPass = getCustomStaffPassword(matchedUser.id) || 
                         getCustomStaffPassword(matchedUser.email) || 
                         getCustomStaffPassword(matchedUser.username);
      
      const isCustomMatch = customPass ? cleanPass === customPass : false;
      const isStaffDefaultMatch = !isAdminOrBerkant && cleanPass === '365200';
      const isAdminMatch = isAdminOrBerkant && cleanPass === '123berkant_';

      if (!isCustomMatch && !isStaffDefaultMatch && !isAdminMatch) {
        throw new Error('Geçersiz kullanıcı adı veya şifre.');
      }

      // Ensure Supabase backend session is connected
      await ensureSupabaseBackendSession();

      const authUser: AuthUser = {
        id: matchedUser.id,
        name: matchedUser.name,
        email: matchedUser.email,
        role: matchedUser.role,
        rawRole: matchedUser.rawRole,
        organizationId: '13b8da90-27d1-440d-a8f4-eb50dadd6391',
      };

      setUser(authUser);
      try {
        localStorage.setItem('dars_cached_auth_user', JSON.stringify(authUser));
      } catch {}
      return;
    }

    // 4. Fallback for standard Supabase Auth users
    let loginIdentity = trimmedInput.toLowerCase();
    if (!loginIdentity.includes('@')) {
      loginIdentity = `${loginIdentity}@dars.local`;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email: loginIdentity, password: cleanPass });
    if (error) throw error;
    let next = await resolveUser(data.session);
    if (!next.organizationId && data.user.user_metadata?.invitation_token) {
      const { error: invitationError } = await supabase.rpc('accept_organization_invitation', { invitation_token: data.user.user_metadata.invitation_token });
      if (invitationError) throw invitationError;
      next = await resolveUser(data.session);
    } else if (!next.organizationId && data.user.user_metadata?.company_name) {
      const { error: bootstrapError } = await supabase.rpc('bootstrap_organization', { company_name: data.user.user_metadata.company_name });
      if (bootstrapError) throw bootstrapError;
      next = await resolveUser(data.session);
    }
    setUser(next);
    try {
      localStorage.setItem('dars_cached_auth_user', JSON.stringify(next));
    } catch {}
  }, []);

  const signUp = useCallback(async (name: string, companyName: string, email: string, password: string, inviteToken?: string) => {
    sessionStorage.removeItem('dars_explicit_signout');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, company_name: inviteToken ? '' : companyName, invitation_token: inviteToken ?? '' } },
    });
    if (error) throw error;
    if (!data.session) return 'E-posta adresinize gelen doğrulama bağlantısını açın, sonra giriş yapın.';

    if (inviteToken) {
      const { error: invitationError } = await supabase.rpc('accept_organization_invitation', { invitation_token: inviteToken });
      if (invitationError) throw invitationError;
    } else {
      const { error: bootstrapError } = await supabase.rpc('bootstrap_organization', { company_name: companyName });
      if (bootstrapError) throw bootstrapError;
    }
    const next = await resolveUser(data.session);
    setUser(next);
    try {
      localStorage.setItem('dars_cached_auth_user', JSON.stringify(next));
    } catch {}
    return 'Hesabınız ve şirketiniz oluşturuldu.';
  }, []);

  const logout = useCallback(async () => {
    sessionStorage.setItem('dars_explicit_signout', '1');
    localStorage.removeItem('dars_cached_auth_user');
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Sign out hatası:', error);
    }
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: Boolean(user),
    loading,
    login,
    signUp,
    logout,
  }), [user, loading, login, signUp, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
