import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Save, ShieldCheck, Send, RotateCcw, ArrowUp, ArrowDown, Settings, GripVertical, Palette, Database } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { navItems } from '../types/navigation';

export function SettingsPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => setEmail(user?.email ?? ''), [user?.email]);

  const [sidebarTheme, setSidebarTheme] = useState<'banking' | 'classic' | 'banking_trial' | 'dia_v3' | 'one_dars_v4' | 'bulut_erp'>(() => {
    try {
      return (localStorage.getItem(`sidebar_theme_${user?.email}`) as 'banking' | 'classic' | 'banking_trial' | 'dia_v3' | 'one_dars_v4' | 'bulut_erp') || 'one_dars_v4';
    } catch {
      return 'one_dars_v4';
    }
  });

  const changeTheme = (theme: 'banking' | 'classic' | 'banking_trial' | 'dia_v3' | 'one_dars_v4' | 'bulut_erp') => {
    setSidebarTheme(theme);
    if (user?.email) {
      localStorage.setItem(`sidebar_theme_${user.email}`, theme);
      window.dispatchEvent(new Event('sidebar-theme-changed'));
      notify('Menü tasarımı güncellendi.', 'success');
    }
  };

  // Sidebar customization
  const [sidebarConfig, setSidebarConfig] = useState<{ order: string[]; hidden: string[] }>(() => {
    const defaultOrder = navItems.map(item => item.label);
    if (!user?.email) return { order: defaultOrder, hidden: [] };
    const stored = localStorage.getItem(`sidebar_custom_${user.email}`);
    if (!stored) return { order: defaultOrder, hidden: [] };
    try {
      const parsed = JSON.parse(stored);
      return {
        order: parsed.order || defaultOrder,
        hidden: parsed.hidden || []
      };
    } catch {
      return { order: defaultOrder, hidden: [] };
    }
  });

  const saveSidebarConfig = (newConfig: typeof sidebarConfig) => {
    setSidebarConfig(newConfig);
    if (user?.email) {
      localStorage.setItem(`sidebar_custom_${user.email}`, JSON.stringify(newConfig));
      window.dispatchEvent(new Event('sidebar-custom-changed'));
    }
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...sidebarConfig.order];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    
    // Swap
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    saveSidebarConfig({ ...sidebarConfig, order: newOrder });
  };

  const setVisibility = (label: string, visible: boolean) => {
    if (label === 'Ayarlar' && !visible) {
      notify('Ayarlar menüsü gizlenemez.', 'error');
      return;
    }
    let newHidden = [...sidebarConfig.hidden];
    if (visible) {
      newHidden = newHidden.filter(l => l !== label);
    } else {
      if (!newHidden.includes(label)) {
        newHidden.push(label);
      }
    }
    saveSidebarConfig({ ...sidebarConfig, hidden: newHidden });
  };

  const resetSidebarConfig = () => {
    const defaultOrder = navItems.map(item => item.label);
    saveSidebarConfig({ order: defaultOrder, hidden: [] });
    notify('Menü düzeni varsayılana sıfırlandı.', 'success');
  };

  // Drag and Drop reordering
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newOrder = [...sidebarConfig.order];
    const draggedItem = newOrder[draggedIndex];
    
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, draggedItem);
    
    setDraggedIndex(index);
    saveSidebarConfig({ ...sidebarConfig, order: newOrder });
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const updateEmail = async () => {
    const nextEmail = email.trim().toLowerCase();
    if (!nextEmail || nextEmail === user?.email.toLowerCase()) {
      notify('Farklı ve geçerli bir e-posta adresi girin.', 'error'); return;
    }
    setEmailSaving(true);
    const { error } = await supabase.auth.updateUser({ email: nextEmail });
    setEmailSaving(false);
    if (error) { notify(error.message, 'error'); return; }
    notify('Doğrulama bağlantısı gönderildi. Yeni e-posta adresinizi kontrol edin.', 'success');
  };

  const updatePassword = async () => {
    if (password.length < 8) { notify('Şifre en az 8 karakter olmalıdır.', 'error'); return; }
    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setPasswordSaving(false);
    if (error) { notify(error.message, 'error'); return; }
    setPassword(''); notify('Şifreniz başarıyla güncellendi.', 'success');
  };

  const [telegramTesting, setTelegramTesting] = useState(false);
  const [telegramRunning, setTelegramRunning] = useState(false);

  const testTelegram = async () => {
    setTelegramTesting(true);
    try {
      const res = await fetch('https://zubhjybqzcpplultpsgt.supabase.co/functions/v1/credit-card-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        notify('Telegram test mesajı başarıyla gönderildi! 📱', 'success');
      } else {
        notify(data.error || data.description || 'Telegram bağlantısı başarısız. Secret ayarlarını kontrol edin.', 'error');
      }
    } catch (err: any) {
      notify(err?.message || 'Servise ulaşılamadı. Function yayında olmayabilir.', 'error');
    } finally {
      setTelegramTesting(false);
    }
  };

  const runTelegramReminders = async () => {
    setTelegramRunning(true);
    try {
      const res = await fetch('https://zubhjybqzcpplultpsgt.supabase.co/functions/v1/credit-card-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        notify(`Hatırlatma kontrolü tamamlandı! Gönderilen: ${data.sent ?? 0}, Atlanan: ${data.skipped ?? 0}`, 'success');
      } else {
        notify(data.error || 'Hatırlatma servisi çalıştırılamadı.', 'error');
      }
    } catch (err: any) {
      notify(err?.message || 'Servise ulaşılamadı.', 'error');
    } finally {
      setTelegramRunning(false);
    }
  };

  return <div className="mx-auto max-w-4xl">
    <PageHeader 
      title="Ayarlar" 
      description="Hesap, güvenlik ve bildirim servislerinizi yönetin."
      actions={
        <Link 
          to="/ayarlar/yedekler" 
          className="btn btn-secondary flex items-center gap-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 shadow-sm"
        >
          <Database size={15} className="text-indigo-600" />
          Sistem Yedekleri & Geri Yükleme
        </Link>
      }
    />
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Sol Menü Tasarım Seçeneği */}
      <section className="card p-6 lg:col-span-2">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Palette size={19} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Sol Menü (Sidebar) Tasarımı</h2>
            <p className="mt-1 text-sm text-gray-500">Kullanmak istediğiniz sol menü görsel temasını seçin.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card for Classic Design */}
          <button
            onClick={() => changeTheme('classic')}
            className={`flex flex-col text-left p-4 rounded-xl border-2 transition-all ${
              sidebarTheme === 'classic'
                ? 'border-brand-500 bg-brand-50/20'
                : 'border-gray-250 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-3.5 h-3.5 rounded-full border-4 ${
                sidebarTheme === 'classic' ? 'border-brand-500 bg-white' : 'border-gray-300 bg-white'
              }`} />
              <span className="font-bold text-gray-900 text-sm">Klasik Sade Tasarım</span>
            </div>
            <p className="mt-2 text-xs text-gray-500 leading-normal">
              Bembeyaz temiz arka plan, ince sade gri ikonlar, standart hiyerarşik listeleme ve klasik alt çizgi hizalama düzeni (240px en).
            </p>
          </button>

          {/* Card for One Dars V4 Theme */}
          <button
            onClick={() => changeTheme('one_dars_v4')}
            className={`flex flex-col text-left p-4 rounded-xl border-2 transition-all ${
              sidebarTheme === 'one_dars_v4'
                ? 'border-brand-500 bg-brand-50/20'
                : 'border-gray-250 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-3.5 h-3.5 rounded-full border-4 ${
                sidebarTheme === 'one_dars_v4' ? 'border-brand-500 bg-white' : 'border-gray-300 bg-white'
              }`} />
              <span className="font-bold text-gray-900 text-sm">One Dars Teması</span>
            </div>
            <p className="mt-2 text-xs text-gray-500 leading-normal">
              One Dars Teması: Koyu lacivert üst bar, entegre One Dars sol profil kartı, sade beyaz kartlar, düz kenarlı tablolar ve gri arka plan tasarımı.
            </p>
          </button>

          {/* Card for Banking Design */}
          <button
            onClick={() => changeTheme('banking')}
            className={`flex flex-col text-left p-4 rounded-xl border-2 transition-all ${
              sidebarTheme === 'banking'
                ? 'border-brand-500 bg-brand-50/20'
                : 'border-gray-250 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-3.5 h-3.5 rounded-full border-4 ${
                sidebarTheme === 'banking' ? 'border-brand-500 bg-white' : 'border-gray-300 bg-white'
              }`} />
              <span className="font-bold text-gray-900 text-sm">Kurumsal Bankacılık Teması</span>
            </div>
            <p className="mt-2 text-xs text-gray-500 leading-normal">
              Yumuşak mavi-gri arka plan, pastel tonlarda renkli dairesel ikonlar, menü içi anlık arama çubuğu ve akordeon açılır menü sistemi (260px en).
            </p>
          </button>

          {/* Card for Bulut Erp Design */}
          <button
            onClick={() => changeTheme('bulut_erp')}
            className={`flex flex-col text-left p-4 rounded-xl border-2 transition-all ${
              sidebarTheme === 'bulut_erp'
                ? 'border-brand-500 bg-brand-50/20'
                : 'border-gray-250 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-3.5 h-3.5 rounded-full border-4 ${
                sidebarTheme === 'bulut_erp' ? 'border-brand-500 bg-white' : 'border-gray-300 bg-white'
              }`} />
              <span className="font-bold text-gray-900 text-sm">Bulut Erp Tema</span>
            </div>
            <p className="mt-2 text-xs text-gray-500 leading-normal">
              Detayları birazdan eklenecek olan modern Bulut ERP arayüz teması tasarımı.
            </p>
          </button>

          {/* Card for DİA V3 Theme */}
          <button
            onClick={() => changeTheme('dia_v3')}
            className={`flex flex-col text-left p-4 rounded-xl border-2 transition-all ${
              sidebarTheme === 'dia_v3'
                ? 'border-brand-500 bg-brand-50/20'
                : 'border-gray-250 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-3.5 h-3.5 rounded-full border-4 ${
                sidebarTheme === 'dia_v3' ? 'border-brand-500 bg-white' : 'border-gray-300 bg-white'
              }`} />
              <span className="font-bold text-gray-900 text-sm">Kurumsal v2 Teması</span>
            </div>
            <p className="mt-2 text-xs text-gray-500 leading-normal">
              Koyu lacivert üst bar, kurumsal turuncu aksanlar, modern yuvarlak kenarlı tablolar ve gri-mavi arka plan tasarımı.
            </p>
          </button>

          {/* Card for Banking Trial Design */}
          <button
            onClick={() => changeTheme('banking_trial')}
            className={`flex flex-col text-left p-4 rounded-xl border-2 transition-all ${
              sidebarTheme === 'banking_trial'
                ? 'border-brand-500 bg-brand-50/20'
                : 'border-gray-250 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-3.5 h-3.5 rounded-full border-4 ${
                sidebarTheme === 'banking_trial' ? 'border-brand-500 bg-white' : 'border-gray-300 bg-white'
              }`} />
              <span className="font-bold text-gray-900 text-sm">Kurumsal v3 Teması</span>
            </div>
            <p className="mt-2 text-xs text-gray-500 leading-normal">
              Sol menü ile uyumlu kurumsal bankacılık renkleri, şık beyaz tablolar, özel input odaklamaları ve bütünleşik mavi üst bar (Topbar) tasarımı.
            </p>
          </button>
        </div>
      </section>

      <section className="card p-6 lg:col-span-2">
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
              <Settings size={19} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Sol Menü (Sidebar) Düzeni</h2>
              <p className="mt-1 text-sm text-gray-500">Menüdeki başlıkların sırasını ve görünürlüğünü kendinize göre ayarlayın.</p>
            </div>
          </div>
          <button className="btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1 hover:shadow-sm transition-shadow" onClick={resetSidebarConfig}>
            <RotateCcw size={13} /> Varsayılana Sıfırla
          </button>
        </div>

        <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100 bg-gray-50/20">
          {sidebarConfig.order.map((label, index) => {
            const item = navItems.find(n => n.label === label);
            if (!item) return null;
            const isHidden = sidebarConfig.hidden.includes(label);
            const Icon = item.icon;
            const isDragging = index === draggedIndex;
            
            return (
              <div 
                key={label} 
                draggable="true"
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center justify-between px-4 py-3 bg-white transition-all select-none ${
                  isHidden ? 'opacity-65 bg-gray-50/30' : 'hover:bg-gray-50/20'
                } ${isDragging ? 'opacity-30 bg-indigo-50/40 border border-indigo-250 border-dashed rounded-lg scale-[0.98] shadow-inner' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0" size={16} />
                  <Icon size={16} className={isHidden ? 'text-gray-400' : 'text-brand-600'} />
                  <span className={`text-sm font-medium ${isHidden ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{label}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <button 
                    disabled={index === 0} 
                    onClick={() => moveItem(index, 'up')}
                    className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    title="Yukarı Taşı"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button 
                    disabled={index === sidebarConfig.order.length - 1} 
                    onClick={() => moveItem(index, 'down')}
                    className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    title="Aşağı Taşı"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <select
                    value={isHidden ? 'gizle' : 'goster'}
                    onChange={(e) => setVisibility(label, e.target.value === 'goster')}
                    className="select !py-1 !px-2.5 !text-xs w-[85px] bg-white border border-gray-200 rounded-md font-medium text-gray-700 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 cursor-pointer shrink-0"
                  >
                    <option value="goster">Göster</option>
                    <option value="gizle">Gizle</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card p-6">
        <div className="mb-5 flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Mail size={19}/></div><div><h2 className="font-semibold text-gray-900">E-posta Adresi</h2><p className="mt-1 text-sm text-gray-500">Giriş yaptığınız e-posta adresini değiştirin.</p></div></div>
        <div className="space-y-4"><div><label className="label">Mevcut e-posta</label><div className="rounded-lg bg-gray-50 px-3.5 py-2.5 text-sm text-gray-600">{user?.email}</div></div><div><label className="label">Yeni e-posta</label><input type="email" className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="yeni@sirket.com"/></div><button className="btn-primary w-full" disabled={emailSaving} onClick={()=>void updateEmail()}><Save size={16}/>{emailSaving?'Gönderiliyor...':'E-postayı Değiştir'}</button><p className="text-xs leading-5 text-gray-500">Güvenli e-posta değişikliği açıksa Supabase eski ve yeni adresin ikisine de doğrulama gönderebilir. Değişiklik bağlantılar onaylandıktan sonra tamamlanır.</p></div>
      </section>
      
      <section className="card p-6">
        <div className="mb-5 flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><ShieldCheck size={19}/></div><div><h2 className="font-semibold text-gray-900">Şifre Güvenliği</h2><p className="mt-1 text-sm text-gray-500">Hesabınız için güçlü bir şifre belirleyin.</p></div></div>
        <div className="space-y-4"><div><label className="label">Yeni şifre</label><input type="password" minLength={8} className="input" value={password} onChange={e=>setPassword(e.target.value)} placeholder="En az 8 karakter"/></div><button className="btn-secondary w-full" disabled={passwordSaving} onClick={()=>void updatePassword()}><ShieldCheck size={16}/>{passwordSaving?'Güncelleniyor...':'Şifreyi Güncelle'}</button></div>
      </section>

      {(['Admin', 'Süper Admin', 'Developer', 'Yönetici', 'Süper Yönetici'].includes(user?.role || '') || user?.email === 'admin@dars.local' || user?.email === 'admin@ets360.local') && (
        <section className="card p-6 lg:col-span-2">
          <div className="mb-5 flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Send size={19}/></div><div><h2 className="font-semibold text-gray-900">Telegram Kredi Kartı Hatırlatıcı</h2><p className="mt-1 text-sm text-gray-500">Son ödeme tarihine 2, 1 gün kalan ve son günü gelen kart ödemeleri Telegram botu üzerinden otomatik gönderilir.</p></div></div>
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn-secondary" disabled={telegramTesting} onClick={()=>void testTelegram()}>
              {telegramTesting ? 'Test Ediliyor...' : 'Telegram Test Mesajı Gönder'}
            </button>
            <button className="btn-primary" disabled={telegramRunning} onClick={()=>void runTelegramReminders()}>
              {telegramRunning ? 'Çalıştırılıyor...' : 'Hatırlatmaları Şimdi Çalıştır'}
            </button>
          </div>
        </section>
      )}
    </div>
  </div>;
}
