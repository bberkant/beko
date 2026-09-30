import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { 
  Users, 
  UserCheck, 
  ShieldCheck, 
  UserPlus, 
  Search, 
  RefreshCw, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Globe, 
  Laptop, 
  Smartphone, 
  Clock,
  Check,
  Copy
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { supabase } from '../../lib/supabase';
import { 
  useAuth, 
  type OrganizationRole, 
  saveCustomStaffPassword, 
  cleanDisplayUsername, 
  isStrictAdminOrBerkant,
  getAllStaffUsers,
  saveCustomStaffUser,
  updateCustomStaffUser,
  deleteCustomStaffUser,
  normalizeUserKey,
  type StaffRegistryUser
} from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { recordLoginLog } from '../../lib/loginLogger';

interface Member {
  user_id: string;
  full_name: string;
  email: string;
  role: OrganizationRole;
  active: boolean;
  joined_at: string;
  last_active_at?: string | null;
  last_ip?: string | null;
  last_device?: string | null;
}

const roleLabels: Record<OrganizationRole, string> = {
  super_admin: 'Süper Admin',
  admin: 'Admin',
  developer: 'Developer',
  muhasebe: 'Muhasebe',
  finans: 'Finans',
  goruntuleyici: 'Görüntüleyici'
};

const roleStyles: Record<OrganizationRole, string> = {
  super_admin: 'bg-purple-50 text-purple-700 border-purple-200',
  admin: 'bg-blue-50 text-blue-700 border-blue-200',
  developer: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  muhasebe: 'bg-amber-50 text-amber-700 border-amber-200',
  finans: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  goruntuleyici: 'bg-gray-50 text-gray-600 border-gray-200'
};

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return 'Giriş kaydı yok';
  try {
    const now = Date.now();
    const time = new Date(dateStr).getTime();
    const diffMs = now - time;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Az önce aktif';
    if (diffMinutes < 60) return `${diffMinutes} dk önce`;
    if (diffHours < 24) return `${diffHours} sa önce`;
    if (diffDays === 1) return 'Dün';
    if (diffDays < 7) return `${diffDays} gün önce`;
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return 'Bilinmiyor';
  }
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

export function UsersPage() {
  const { user } = useAuth();
  const { notify } = useToast();

  const hasAccess = useMemo(() => isStrictAdminOrBerkant(user), [user]);

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'passive'>('all');

  // Add User State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState<'direct' | 'invite'>('direct');
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newRole, setNewRole] = useState<OrganizationRole>('goruntuleyici');
  const [addSaving, setAddSaving] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');

  // Edit User State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editRole, setEditRole] = useState<OrganizationRole>('goruntuleyici');
  const [editActive, setEditActive] = useState(true);
  const [editSaving, setEditSaving] = useState(false);

  // Fetch Users and Login Logs
  const fetchUsers = useCallback(async () => {
    if (!hasAccess) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 0. Ensure current logged-in user is logged in user_login_logs
      if (user?.email) {
        void recordLoginLog({
          organization_id: user.organizationId,
          user_id: user.id,
          user_email: user.email,
          user_name: user.name,
          status: 'success',
          force: true
        });
      }

      // 1. Fetch organization members
      const { data: usersData, error: usersError } = await supabase.rpc('list_organization_users');
      if (usersError) throw usersError;

      // 2. Fetch recent login logs for last active status & IP
      let loginMap = new Map<string, { last_active_at: string; last_ip: string | null; last_device: string | null }>();
      try {
        const { data: logsData } = await supabase
          .from('user_login_logs')
          .select('user_email, user_id, ip_address, device_info, created_at, status')
          .eq('status', 'success')
          .order('created_at', { ascending: false })
          .limit(400);

        if (logsData) {
          logsData.forEach((log) => {
            const emailKey = (log.user_email || '').toLowerCase().trim();
            if (emailKey && !loginMap.has(emailKey)) {
              loginMap.set(emailKey, {
                last_active_at: log.created_at,
                last_ip: log.ip_address,
                last_device: log.device_info
              });
            }
            if (log.user_id && !loginMap.has(log.user_id)) {
              loginMap.set(log.user_id, {
                last_active_at: log.created_at,
                last_ip: log.ip_address,
                last_device: log.device_info
              });
            }
          });
        }
      } catch (err) {
        console.warn('Giriş logları getirilemedi:', err);
      }

      // Merge data
      const mergedList: Member[] = ((usersData as any[]) || []).map((m) => {
        const emailKey = (m.email || '').toLowerCase().trim();
        const info = loginMap.get(m.user_id) || loginMap.get(emailKey);
        const lastActive = info?.last_active_at || m.last_sign_in_at || m.joined_at || null;
        return {
          user_id: m.user_id,
          full_name: m.full_name || '',
          email: m.email || '',
          role: m.role || 'goruntuleyici',
          active: m.active ?? true,
          joined_at: m.joined_at,
          last_active_at: lastActive,
          last_ip: info?.last_ip || (lastActive === m.joined_at ? 'Kayıt Tarihi' : null),
          last_device: info?.last_device || null
        };
      });

      // Merge with staff registry & custom staff users
      const allStaff = getAllStaffUsers();
      const existingUserIds = new Set(mergedList.map((m) => m.user_id));
      const existingKeys = new Set(mergedList.map((m) => normalizeUserKey(m.email)));

      for (const staff of allStaff) {
        const staffKey = normalizeUserKey(staff.username);
        const staffEmailKey = normalizeUserKey(staff.email);
        if (!existingUserIds.has(staff.id) && !existingKeys.has(staffKey) && !existingKeys.has(staffEmailKey)) {
          const info = loginMap.get(staff.id) || loginMap.get(staffKey) || loginMap.get(staffEmailKey);
          const lastActive = info?.last_active_at || null;
          mergedList.push({
            user_id: staff.id,
            full_name: staff.name,
            email: staff.username,
            role: staff.rawRole,
            active: true,
            joined_at: new Date().toISOString(),
            last_active_at: lastActive,
            last_ip: info?.last_ip || null,
            last_device: info?.last_device || null
          });
          existingUserIds.add(staff.id);
          existingKeys.add(staffKey);
        }
      }

      setMembers(mergedList);
    } catch (error: any) {
      console.error('Kullanıcı listesi yükleme hatası:', error);
      notify('Kullanıcılar yüklenirken hata oluştu: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [hasAccess, notify]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  // Security redirect if not strictly admin or Berkant
  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = (m.full_name || '').toLowerCase().includes(q);
        const matchEmail = (m.email || '').toLowerCase().includes(q);
        const matchRole = (roleLabels[m.role] || '').toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchRole) return false;
      }
      if (roleFilter !== 'all' && m.role !== roleFilter) {
        return false;
      }
      if (statusFilter === 'active' && !m.active) return false;
      if (statusFilter === 'passive' && m.active) return false;
      return true;
    });
  }, [members, searchQuery, roleFilter, statusFilter]);

  // Open Edit Modal
  const handleOpenEdit = (m: Member) => {
    setEditingMember(m);
    setEditName(m.full_name);
    setEditEmail(m.email);
    setEditRole(m.role);
    setEditActive(m.active);
    setEditPassword('');
    setShowEditPassword(false);
    setEditModalOpen(true);
  };

  // Submit User Update
  const handleSaveUser = async () => {
    if (!editingMember) return;
    if (!editName.trim()) {
      notify('İsim alanı boş bırakılamaz.', 'error');
      return;
    }
    if (!editEmail.trim()) {
      notify('Kullanıcı adı veya e-posta boş bırakılamaz.', 'error');
      return;
    }

    setEditSaving(true);
    try {
      // 1. Save password to custom local storage if provided
      if (editPassword.trim()) {
        saveCustomStaffPassword(editingMember.user_id, editPassword.trim());
        saveCustomStaffPassword(editingMember.email, editPassword.trim());
        saveCustomStaffPassword(editEmail.trim(), editPassword.trim());
        saveCustomStaffPassword(editName.trim(), editPassword.trim());
      }

      // 2. Call admin_update_user RPC
      let updateError: any = null;
      try {
        const { error } = await supabase.rpc('admin_update_user', {
          target_user_id: editingMember.user_id,
          new_full_name: editName.trim(),
          new_password: editPassword.trim() || null,
          new_role: editRole,
          new_email: editEmail.trim()
        });
        updateError = error;
      } catch (e) {
        updateError = e;
      }

      // Fallback to 4 arguments if new_email argument is not yet recognized
      if (updateError && String(updateError.message || '').includes('new_email')) {
        const { error: fallbackErr } = await supabase.rpc('admin_update_user', {
          target_user_id: editingMember.user_id,
          new_full_name: editName.trim(),
          new_password: editPassword.trim() || null,
          new_role: editRole
        });
        if (fallbackErr) throw fallbackErr;
      } else if (updateError) {
        throw updateError;
      }

      // 3. Update active status if changed
      if (editActive !== editingMember.active) {
        try {
          await supabase.rpc('manage_organization_user', {
            target_user: editingMember.user_id,
            new_role: editRole,
            new_active: editActive
          });
        } catch (e) {
          console.warn('manage_organization_user RPC hatası:', e);
        }
      }

      // Also update custom staff registry if user exists there
      updateCustomStaffUser({
        id: editingMember.user_id,
        name: editName.trim(),
        username: cleanDisplayUsername(editEmail.trim()),
        email: cleanDisplayUsername(editEmail.trim()),
        role: roleLabels[editRole] || editRole,
        rawRole: editRole
      });

      notify('Kullanıcı bilgileri başarıyla güncellendi.', 'success');
      setEditModalOpen(false);
      setEditingMember(null);
      setEditPassword('');
      await fetchUsers();
    } catch (err: any) {
      console.error('Kullanıcı güncelleme hatası:', err);
      notify('Kullanıcı güncellenirken hata oluştu: ' + (err.message || err), 'error');
    } finally {
      setEditSaving(false);
    }
  };

  // Toggle user active status directly
  const handleToggleActive = async (m: Member) => {
    try {
      const nextActive = !m.active;
      const { error } = await supabase.rpc('manage_organization_user', {
        target_user: m.user_id,
        new_role: m.role,
        new_active: nextActive
      });
      if (error) throw error;
      notify(`Kullanıcı ${nextActive ? 'aktifleştirildi' : 'pasifleştirildi'}.`, 'success');
      await fetchUsers();
    } catch (err: any) {
      notify('Durum değiştirilemedi: ' + err.message, 'error');
    }
  };

  // Delete user
  const handleDeleteMember = async (m: Member) => {
    if (m.user_id === user?.id) {
      notify('Kendi oturum açtığınız kullanıcıyı silemezsiniz.', 'error');
      return;
    }
    if (!window.confirm(`${m.full_name || m.email} kullanıcısını sistemden tamamen silmek istediğinize emin misiniz?`)) {
      return;
    }
    try {
      deleteCustomStaffUser(m.user_id);
      deleteCustomStaffUser(m.email);

      try {
        const { error } = await supabase
          .from('organization_members')
          .delete()
          .eq('user_id', m.user_id);

        if (error) console.warn('organization_members silme uyarısı:', error.message);
      } catch (dbErr) {
        console.warn('organization_members delete catch:', dbErr);
      }

      notify('Kullanıcı başarıyla silindi.', 'success');
      await fetchUsers();
    } catch (err: any) {
      notify('Kullanıcı silinemedi: ' + err.message, 'error');
    }
  };

  // Create Direct User
  const handleCreateDirectUser = async () => {
    if (!newFullName.trim() || !newEmail.trim() || !newPassword.trim()) {
      notify('Lütfen ad soyad, kullanıcı adı/e-posta ve şifre alanlarını doldurun.', 'error');
      return;
    }
    setAddSaving(true);
    try {
      let targetEmail = newEmail.trim();
      if (!targetEmail.includes('@')) {
        targetEmail = `${targetEmail}@dars.local`;
      }

      let generatedId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'usr_' + Date.now();

      try {
        const { data: createdUserId, error } = await supabase.rpc('admin_create_user', {
          invite_email: targetEmail,
          invite_password: newPassword.trim(),
          invite_full_name: newFullName.trim(),
          invite_role: newRole
        });
        if (error) {
          console.warn('admin_create_user RPC uyarısı:', error.message);
        } else if (createdUserId) {
          generatedId = createdUserId;
        }
      } catch (rpcErr: any) {
        console.warn('admin_create_user RPC çağrısı başarısız oldu, yerel kayıt oluşturuluyor:', rpcErr);
      }

      const cleanUsername = cleanDisplayUsername(newEmail.trim());
      const customUser: StaffRegistryUser = {
        id: generatedId,
        name: newFullName.trim(),
        username: cleanUsername,
        aliases: [cleanUsername, newEmail.trim(), targetEmail, newFullName.trim()],
        email: cleanUsername,
        role: roleLabels[newRole] || newRole,
        rawRole: newRole,
        defaultPassword: newPassword.trim(),
      };
      saveCustomStaffUser(customUser);
      saveCustomStaffPassword(customUser.id, newPassword.trim());
      saveCustomStaffPassword(customUser.username, newPassword.trim());
      saveCustomStaffPassword(cleanUsername, newPassword.trim());
      saveCustomStaffPassword(targetEmail, newPassword.trim());
      saveCustomStaffPassword(newFullName.trim(), newPassword.trim());

      notify('Kullanıcı başarıyla oluşturuldu.', 'success');
      setAddModalOpen(false);
      setNewFullName('');
      setNewEmail('');
      setNewPassword('');
      await fetchUsers();
    } catch (err: any) {
      notify('Kullanıcı oluşturulurken hata: ' + err.message, 'error');
    } finally {
      setAddSaving(false);
    }
  };

  // Create Invite Link
  const handleCreateInvite = async () => {
    if (!newEmail.trim()) {
      notify('Lütfen e-posta adresini giriniz.', 'error');
      return;
    }
    setAddSaving(true);
    try {
      const { data, error } = await supabase.rpc('create_organization_invitation', {
        invite_email: newEmail.trim(),
        invite_role: newRole
      });
      if (error) throw error;
      const url = `${window.location.origin}/login?invite=${data}`;
      setInviteUrl(url);
      notify('Davet bağlantısı oluşturuldu.', 'success');
    } catch (err: any) {
      notify('Davet oluşturulamadı: ' + err.message, 'error');
    } finally {
      setAddSaving(false);
    }
  };

  // Stats calculation
  const totalCount = members.length;
  const activeCount = members.filter((m) => m.active).length;
  const adminCount = members.filter((m) => ['admin', 'super_admin', 'developer'].includes(m.role)).length;
  const active24hCount = members.filter((m) => {
    if (!m.last_active_at) return false;
    const diff = Date.now() - new Date(m.last_active_at).getTime();
    return diff < 86400000;
  }).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kullanıcı Yönetimi"
        description="Sistemdeki şirket personellerini, yetki rollerini, şifrelerini ve son aktiflik zamanlarını yönetin."
        actions={
          <button
            onClick={() => {
              setAddModalOpen(true);
              setAddMode('direct');
              setNewFullName('');
              setNewEmail('');
              setNewPassword('');
              setInviteUrl('');
            }}
            className="btn btn-primary flex items-center gap-2 shadow-sm"
          >
            <UserPlus size={16} />
            <span>Yeni Kullanıcı Ekle</span>
          </button>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-150 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Toplam Kullanıcı</span>
            <span className="rounded-lg bg-blue-50 p-2 text-brand-600">
              <Users size={20} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">{totalCount}</span>
            <span className="text-xs text-gray-400">kişi</span>
          </div>
        </div>

        <div className="rounded-xl border border-gray-150 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Aktif Personel</span>
            <span className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <UserCheck size={20} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">{activeCount}</span>
            <span className="text-xs text-gray-400">erişime açık</span>
          </div>
        </div>

        <div className="rounded-xl border border-gray-150 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Yönetici / Admin</span>
            <span className="rounded-lg bg-purple-50 p-2 text-purple-600">
              <ShieldCheck size={20} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-purple-900">{adminCount}</span>
            <span className="text-xs text-gray-400">yetkili</span>
          </div>
        </div>

        <div className="rounded-xl border border-gray-150 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Son 24 Saat Aktif</span>
            <span className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <Clock size={20} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-700">{active24hCount}</span>
            <span className="text-xs text-gray-400">giriş yaptı</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-150 bg-white p-4 shadow-sm md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
          <input
            type="text"
            placeholder="Ad soyad, kullanıcı adı veya e-posta ile ara..."
            className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-10 pr-4 text-sm focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <select
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-brand-500 focus:outline-none"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">Tüm Roller</option>
            {Object.entries(roleLabels).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-brand-500 focus:outline-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">Tüm Durumlar</option>
            <option value="active">Sadece Aktif</option>
            <option value="passive">Sadece Pasif</option>
          </select>

          <button
            onClick={fetchUsers}
            className="rounded-lg p-2 text-gray-400 border border-gray-300 hover:text-gray-700 hover:bg-gray-50 focus:outline-none"
            title="Yenile"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-xl border border-gray-150 bg-white shadow-sm">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-gray-50 text-[11.5px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 font-semibold text-left">Kullanıcı (Ad & Kullanıcı Adı)</th>
                <th className="px-4 py-3 font-semibold text-left w-[140px]">Yetki Rolü</th>
                <th className="px-4 py-3 font-semibold text-left w-[220px]">Son Aktiflik / Giriş</th>
                <th className="px-4 py-3 font-semibold text-center w-[100px]">Durum</th>
                <th className="px-4 py-3 font-semibold text-center w-[120px]">Katılım Tarihi</th>
                <th className="px-4 py-3 font-semibold text-center w-[130px]">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-gray-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-brand-500" />
                    Kullanıcılar yükleniyor...
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-gray-400">
                    Filtrelere uygun kullanıcı bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => {
                  const isCurrent = m.user_id === user?.id;
                  const relativeActive = formatRelativeTime(m.last_active_at);
                  const isMobile = (m.last_device || '').toLowerCase().includes('phone') || (m.last_device || '').toLowerCase().includes('android');
                  const DeviceIcon = isMobile ? Smartphone : Laptop;

                  return (
                    <tr key={m.user_id} className="hover:bg-gray-50/60 transition-colors">
                      {/* User Info */}
                      <td className="px-4 py-3 text-left">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 font-bold text-sm text-brand-700 border border-brand-100 flex-shrink-0">
                            {(m.full_name || m.email || 'K').charAt(0).toUpperCase()}
                          </div>
                          <div className="leading-tight">
                            <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                              <span>{m.full_name || 'İsimsiz Kullanıcı'}</span>
                              {isCurrent && (
                                <span className="rounded bg-brand-100 px-1.5 py-0.2 text-[10px] font-bold text-brand-700">
                                  Siz
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                              {cleanDisplayUsername(m.email)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3 text-left">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${roleStyles[m.role] || 'bg-gray-100 text-gray-700'}`}>
                          {roleLabels[m.role] || m.role}
                        </span>
                      </td>

                      {/* Last Active Time (Requested) */}
                      <td className="px-4 py-3 text-left">
                        {m.last_active_at ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-medium text-gray-800" title={formatDate(m.last_active_at)}>
                              <Clock size={12} className="text-gray-400 flex-shrink-0" />
                              <span>{relativeActive}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10.5px] text-gray-500">
                              {m.last_ip && (
                                <span className="inline-flex items-center gap-0.5 rounded bg-gray-100 px-1 py-0.5 font-mono text-[10px] text-gray-700">
                                  <Globe size={9} className="text-gray-400" />
                                  {m.last_ip}
                                </span>
                              )}
                              {m.last_device && (
                                <span className="inline-flex items-center gap-0.5 text-gray-500 truncate max-w-[120px]" title={m.last_device}>
                                  <DeviceIcon size={10} className="text-gray-400" />
                                  {m.last_device.split('•')[0]?.trim()}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-[10.5px] font-medium text-gray-400">
                            Giriş kaydı yok
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                          m.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}>
                          {m.active ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>

                      {/* Joined At */}
                      <td className="px-4 py-3 text-center text-gray-500 whitespace-nowrap">
                        {m.joined_at ? new Date(m.joined_at).toLocaleDateString('tr-TR') : '—'}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(m)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-brand-600 shadow-sm"
                            title="Bilgileri ve Şifreyi Düzenle"
                          >
                            <Edit size={12} />
                            Düzenle
                          </button>
                          
                          <button
                            onClick={() => handleToggleActive(m)}
                            className={`rounded-lg border px-1.5 py-1 text-xs font-medium ${
                              m.active ? 'border-amber-200 bg-amber-50/50 text-amber-700 hover:bg-amber-100' : 'border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                            title={m.active ? 'Hesabı Askıya Al' : 'Hesabı Aktifleştir'}
                          >
                            {m.active ? 'Pasif Yap' : 'Aktif Et'}
                          </button>

                          {!isCurrent && (
                            <button
                              onClick={() => handleDeleteMember(m)}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              title="Kullanıcıyı Sil"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Kullanıcı Hesabını Düzenle"
        description="Personelin adını, giriş kullanıcı adını/e-postasını, şifresini ve yetki rolünü güncelleyin."
        size="md"
      >
        {editingMember && (
          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                Ad Soyad
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Örn: Ahmet Yılmaz"
                required
              />
            </div>

            {/* Email / Username */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                Kullanıcı Adı veya E-Posta
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="Örn: ahmet veya ahmet@dars.local"
                required
              />
              <p className="mt-1 text-[11px] text-gray-400">
                Personel sisteme giriş yaparken bu kullanıcı adını veya e-postayı kullanacaktır.
              </p>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                Yeni Şifre Belirle
              </label>
              <div className="relative">
                <input
                  type={showEditPassword ? 'text' : 'password'}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Şifreyi değiştirmek istemiyorsanız boş bırakın"
                />
                <button
                  type="button"
                  onClick={() => setShowEditPassword(!showEditPassword)}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-gray-400">
                Yeni bir şifre girilirse kullanıcının şifresi anında güncellenir; boş bırakılırsa mevcut şifresi korunur.
              </p>
            </div>

            {/* Role */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                Yetki Rolü
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-brand-500 focus:outline-none"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as OrganizationRole)}
              >
                {Object.entries(roleLabels).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/50 p-3">
              <div>
                <span className="block text-xs font-semibold text-gray-900">Hesap Erişim Durumu</span>
                <span className="text-[11px] text-gray-500">Kullanıcının sisteme giriş yapabilmesini belirler.</span>
              </div>
              <button
                type="button"
                onClick={() => setEditActive(!editActive)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  editActive ? 'bg-emerald-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    editActive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                type="button"
                disabled={editSaving}
                onClick={handleSaveUser}
                className="rounded-lg bg-brand-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
              >
                {editSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add / Create User Modal */}
      <Modal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Yeni Kullanıcı Ekle veya Davet Et"
        description="Sisteme doğrudan şifre ile yeni personel tanımlayabilir veya davet bağlantısı oluşturabilirsiniz."
        size="md"
      >
        <div className="mb-4 flex border-b border-gray-200">
          <button
            className={`flex-1 pb-2.5 text-center text-xs font-bold border-b-2 transition-colors ${
              addMode === 'direct'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
            onClick={() => setAddMode('direct')}
          >
            Doğrudan Kullanıcı Tanımla
          </button>
          <button
            className={`flex-1 pb-2.5 text-center text-xs font-bold border-b-2 transition-colors ${
              addMode === 'invite'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
            onClick={() => setAddMode('invite')}
          >
            Davet Bağlantısı Oluştur
          </button>
        </div>

        {addMode === 'direct' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                Ad Soyad
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder="Örn: Ahmet Yılmaz"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                Kullanıcı Adı veya E-posta
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Örn: ahmet veya ahmet@dars.local"
                required
              />
              <p className="mt-1 text-[11px] text-gray-400">
                Tek kelime kullanıcı adı yazarsanız otomatik olarak @dars.local eklenecektir.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                Şifre
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="En az 6 karakter"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                Yetki Rolü
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-brand-500 focus:outline-none"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as OrganizationRole)}
              >
                {Object.entries(roleLabels).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                type="button"
                disabled={addSaving}
                onClick={handleCreateDirectUser}
                className="rounded-lg bg-brand-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
              >
                {addSaving ? 'Oluşturuluyor...' : 'Kullanıcıyı Kaydet'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {!inviteUrl ? (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                    Davet Edilecek E-Posta
                  </label>
                  <input
                    type="email"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="kullanici@sirket.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                    Yetki Rolü
                  </label>
                  <select
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-brand-500 focus:outline-none"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as OrganizationRole)}
                  >
                    {Object.entries(roleLabels).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setAddModalOpen(false)}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    İptal
                  </button>
                  <button
                    type="button"
                    disabled={addSaving}
                    onClick={handleCreateInvite}
                    className="rounded-lg bg-brand-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
                  >
                    {addSaving ? 'Oluşturuluyor...' : 'Davet Bağlantısı Oluştur'}
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 border border-emerald-200">
                  <Check size={18} className="text-emerald-600 flex-shrink-0" />
                  <span>Davet bağlantısı oluşturuldu. Bu bağlantıyı kullanıcı ile paylaşabilirsiniz.</span>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs font-mono break-all text-gray-700">
                  {inviteUrl}
                </div>
                <button
                  type="button"
                  className="btn btn-primary w-full flex items-center justify-center gap-2"
                  onClick={async () => {
                    await navigator.clipboard.writeText(inviteUrl);
                    notify('Bağlantı panoya kopyalandı.', 'success');
                  }}
                >
                  <Copy size={16} />
                  Bağlantıyı Kopyala
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
