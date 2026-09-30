import React from 'react';
import { Link } from 'react-router-dom';
import { 
  MessageSquare, 
  Wrench, 
  ShieldAlert, 
  Lock, 
  Sparkles, 
  LayoutDashboard, 
  Bell, 
  ArrowLeft,
  Info,
  Clock
} from 'lucide-react';

interface WhatsAppOperasyonPageProps {
  initialTab?: 'chat' | 'media' | 'tasks' | 'settings';
}

export const WhatsAppOperasyonPage: React.FC<WhatsAppOperasyonPageProps> = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Navigation / Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Dashboard'a Dön</span>
        </Link>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">
          <Clock size={13} className="text-amber-500" />
          <span>Geçici Olarak Kapalı</span>
        </div>
      </div>

      {/* Hero Maintenance Card */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-150 bg-gradient-to-br from-white via-emerald-50/25 to-slate-50 p-8 sm:p-12 shadow-sm text-center">
        {/* Background Decorative Rings */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-emerald-100/40 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-teal-100/30 blur-3xl pointer-events-none" />

        {/* Big Icon with Badge */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-emerald-600 to-green-500 text-white flex items-center justify-center shadow-xl shadow-emerald-500/25">
            <MessageSquare size={44} className="sm:w-12 sm:h-12" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center border-2 border-white shadow-md">
            <Wrench size={15} />
          </div>
        </div>

        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold tracking-wide uppercase mb-4 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>Modül Geliştirilmektedir</span>
        </div>

        {/* Headline */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-3">
          WhatsApp Entegrasyonu Bakım ve Geliştirme Aşamasında
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed mb-8">
          WhatsApp modülü; çoklu kullanıcı gizlilik izolasyonu, bağımsız oturum yönetimi ve kurumsal mesajlaşma 
          standartlarına tam uyum sağlanması amacıyla geçici olarak kullanıma kapatılmıştır.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-all hover:shadow"
          >
            <LayoutDashboard size={17} />
            <span>Dashboard'a Dön</span>
          </Link>

          <Link
            to="/bildirimler"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-sm font-medium transition-all"
          >
            <Bell size={17} className="text-gray-500" />
            <span>Bildirimleri İncele</span>
          </Link>
        </div>
      </div>

      {/* Detail / Reason Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1 */}
        <div className="p-6 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex flex-col gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">
              Kullanıcı & Oturum İzolasyonu
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Her kullanıcının yalnızca kendi yetkili olduğu kurumsal sohbetleri görebilmesi için bağımsız oturum mimarisi yapılandırılmaktadır.
            </p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="p-6 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex flex-col gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <Lock size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">
              Gizlilik ve Uçtan Uca Güvenlik
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Kişisel ve kurumsal yazışmaların diğer panel kullanıcıları tarafından görüntülenmesini engelleyen tam veri izolasyonu sağlanmaktadır.
            </p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="p-6 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex flex-col gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">
              Otomatik ERP Belge Entegrasyonu
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Gelen fiş, fatura ve belgelerin yapay zeka ile filtrelenerek otomatik cari ve kasa kayıtlarına işlenmesi altyapısı güncellenmektedir.
            </p>
          </div>
        </div>
      </div>

      {/* Informational Alert Box */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs text-slate-600">
        <Info size={18} className="text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-800">
            Altyapı Çalışması Hakkında Bilgilendirme
          </p>
          <p className="text-slate-600 leading-relaxed">
            WhatsApp modülündeki altyapı ve gizlilik geliştirmeleri tamamlandığında, modül yalnızca yetkilendirilmiş personel 
            tarafından güvenle kullanılabilecek şekilde otomatik olarak yayına alınacaktır.
          </p>
        </div>
      </div>
    </div>
  );
};
