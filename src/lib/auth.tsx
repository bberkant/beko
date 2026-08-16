import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type OrganizationRole = 'admin' | 'muhasebe' | 'finans' | 'goruntuleyici';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
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

const roleLabels: Record<OrganizationRole, string> = {
  admin: 'Yönetici',
  muhasebe: 'Muhasebe',
  finans: 'Finans',
  goruntuleyici: 'Görüntüleyici',
};

async function resolveUser(session: Session): Promise<AuthUser> {
  const authUser = session.user;
  const [{ data: profile }, { data: membership, error }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', authUser.id).maybeSingle(),
    supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', authUser.id)
      .eq('active', true)
      .limit(1)
      .maybeSingle(),
  ]);
  if (error) throw error;

  const role = membership?.role as OrganizationRole | undefined;
  
  return {
    id: authUser.id,
    name: profile?.full_name || authUser.user_metadata.full_name || authUser.email?.split('@')[0] || 'Kullanıcı',
    email: authUser.email || '',
    role: role ? roleLabels[role] : 'Kurulum Bekliyor',
    organizationId: membership?.organization_id ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const applySession = async (session: Session | null) => {
      try {
        const next = session ? await resolveUser(session) : null;
        if (active) setUser(next);
      } catch (error) {
        console.error('Oturum bilgileri yüklenemedi:', error);
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    void supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => void applySession(session), 0);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    if (!remember) {
      sessionStorage.setItem('dars_session_only', '1');
      sessionStorage.setItem('ets360_session_only', '1');
    } else {
      sessionStorage.removeItem('dars_session_only');
      sessionStorage.removeItem('ets360_session_only');
    }
    let loginIdentity = email.trim().toLowerCase();
    if (loginIdentity === 'berkant') {
      loginIdentity = 'berkantkaplan@gmail.com';
    } else if (!loginIdentity.includes('@')) {
      loginIdentity = `${loginIdentity}@dars.local`;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email: loginIdentity, password });
    if (error) throw error;
    let next = await resolveUser(data.session);
    if (!next.organizationId && data.user.user_metadata.invitation_token) {
      const { error: invitationError } = await supabase.rpc('accept_organization_invitation', { invitation_token: data.user.user_metadata.invitation_token });
      if (invitationError) throw invitationError;
      next = await resolveUser(data.session);
    } else if (!next.organizationId && data.user.user_metadata.company_name) {
      const { error: bootstrapError } = await supabase.rpc('bootstrap_organization', { company_name: data.user.user_metadata.company_name });
      if (bootstrapError) throw bootstrapError;
      next = await resolveUser(data.session);
    }
    setUser(next);
  }, []);

  const signUp = useCallback(async (name: string, companyName: string, email: string, password: string, inviteToken?: string) => {
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
    return 'Hesabınız ve şirketiniz oluşturuldu.';
  }, []);

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
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
