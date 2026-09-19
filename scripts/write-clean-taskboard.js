const fs = require('fs');
const path = require('path');

// 1. TaskBoard.tsx
const taskBoardContent = import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  User, 
  Calendar, 
  MessageSquare, 
  Truck, 
  Wrench, 
  Beef, 
  Store, 
  Receipt,
  LayoutGrid,
  List as ListIcon,
  ChevronRight,
  Trash2
} from 'lucide-react';
import type { WhatsAppTask, WhatsAppIncomingMedia } from '../types';
import { Modal } from '../../../components/ui/Modal';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../lib/toast';
import { useAuth } from '../../../lib/auth';

interface TaskBoardProps {
  tasks: WhatsAppTask[];
  onRefresh: () => void;
  mediaForNewTask?: WhatsAppIncomingMedia | null;
  onClearMediaForTask?: () => void;
}

export const TaskBoard: React.FC<TaskBoardProps> = ({
  tasks,
  onRefresh,
  mediaForNewTask,
  onClearMediaForTask
}) => {
  const { notify } = useToast();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);

  // New task form states
  const [title, setTitle] = useState('');
  const [groupName, setGroupName] = useState('Mezbaha & Kesimhane Grubu');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [category, setCategory] = useState<'sevkiyat' | 'arac_bakim' | 'kesim' | 'sube' | 'muhasebe' | 'diger'>('sevkiyat');
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [originalMessage, setOriginalMessage] = useState('');

  // Handle auto-opening new task modal when media is passed
  React.useEffect(() => {
    if (mediaForNewTask) {
      setTitle(\\ - Görev\);
      setGroupName(mediaForNewTask.group_name);
      setOriginalMessage(mediaForNewTask.caption || '');
      setDescription(mediaForNewTask.caption || '');
      setIsNewTaskModalOpen(true);
    }
  }, [mediaForNewTask]);

  const handleCloseModal = () => {
    setIsNewTaskModalOpen(false);
    if (onClearMediaForTask) onClearMediaForTask();
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      notify('Lütfen görev başlığını girin.', 'error');
      return;
    }

    try {
      const orgId = user?.organizationId || '13b8da90-27d1-440d-a8f4-eb50dadd6391';
      const { error } = await supabase
        .from('whatsapp_tasks')
        .insert({
          organization_id: orgId,
          group_name: groupName,
          title: title.trim(),
          description: description.trim() || null,
          original_message: originalMessage.trim() || null,
          sender_name: user?.name || 'Yönetim',
          assigned_to: assignedTo.trim() || null,
          priority,
          category,
          status: 'todo',
          due_date: dueDate || null,
          media_url: mediaForNewTask?.media_url || null
        });

      if (error) throw error;

      notify('Yeni grup görevi başarıyla oluşturuldu!', 'success');
      handleCloseModal();
      onRefresh();
    } catch (err: any) {
      notify(\Görev ekleme hatası: \\, 'error');
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: 'todo' | 'in_progress' | 'completed') => {
    try {
      const updatePayload: any = { status: newStatus };
      if (newStatus === 'completed') {
        updatePayload.completed_at = new Date().toISOString();
      }

      await supabase
        .from('whatsapp_tasks')
        .update(updatePayload)
        .eq('id', taskId);

      notify('Görev durumu güncellendi.', 'success');
      onRefresh();
    } catch (err: any) {
      notify(\Hata: \\, 'error');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await supabase.from('whatsapp_tasks').delete().eq('id', taskId);
      notify('Görev silindi.', 'info');
      onRefresh();
    } catch (err: any) {
      notify(\Hata: \\, 'error');
    }
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
      return true;
    });
  }, [tasks, selectedCategory]);

  const todoTasks = useMemo(() => filteredTasks.filter(t => t.status === 'todo'), [filteredTasks]);
  const inProgressTasks = useMemo(() => filteredTasks.filter(t => t.status === 'in_progress'), [filteredTasks]);
  const completedTasks = useMemo(() => filteredTasks.filter(t => t.status === 'completed'), [filteredTasks]);

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'urgent':
        return <span className=px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-extrabold text-[10px]>🚨 ACİL</span>;
      case 'high':
        return <span className=px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]>⚡ Yüksek</span>;
      case 'medium':
        return <span className=px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-medium text-[10px]>Normal</span>;
      default:
        return <span className=px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium text-[10px]>Düşük</span>;
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'sevkiyat': return <Truck size={13} className=text-blue-600 />;
      case 'arac_bakim': return <Wrench size={13} className=text-amber-600 />;
      case 'kesim': return <Beef size={13} className=text-rose-600 />;
      case 'sube': return <Store size={13} className=text-emerald-600 />;
      case 'muhasebe': return <Receipt size={13} className=text-purple-600 />;
      default: return <MessageSquare size={13} className=text-gray-600 />;
    }
  };

  return (
    <div className=space-y-4>
      {/* Action Header */}
      <div className=flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-2xs>
        {/* Category Filters */}
        <div className=flex flex-wrap items-center gap-1.5>
          <button
            onClick={() => setSelectedCategory('all')}
            className={\px-3 py-1.5 rounded-lg text-xs font-semibold transition-all \\}
          >
            Tüm Görevler ({tasks.length})
          </button>
          <button
            onClick={() => setSelectedCategory('sevkiyat')}
            className={\px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 \\}
          >
            <Truck size={13} />
            Sevkiyat
          </button>
          <button
            onClick={() => setSelectedCategory('arac_bakim')}
            className={\px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 \\}
          >
            <Wrench size={13} />
            Araç & Bakım
          </button>
          <button
            onClick={() => setSelectedCategory('kesim')}
            className={\px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 \\}
          >
            <Beef size={13} />
            Kesimhane
          </button>
          <button
            onClick={() => setSelectedCategory('sube')}
            className={\px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 \\}
          >
            <Store size={13} />
            Şubeler
          </button>
        </div>

        {/* View Toggle & New Task Button */}
        <div className=flex items-center gap-2>
          <div className=flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200>
            <button
              onClick={() => setViewMode('kanban')}
              className={\p-1.5 rounded-lg transition-all \\}
              title=Kanban Görünümü
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={\p-1.5 rounded-lg transition-all \\}
              title=Liste Görünümü
            >
              <ListIcon size={16} />
            </button>
          </div>

          <button
            onClick={() => setIsNewTaskModalOpen(true)}
            className=btn-primary px-3.5 py-2 text-xs font-bold flex items-center gap-1.5 shadow-2xs
          >
            <Plus size={15} />
            Yeni Görev Ekle
          </button>
        </div>
      </div>

      {/* Kanban Board Columns */}
      {viewMode === 'kanban' ? (
        <div className=grid grid-cols-1 md:grid-cols-3 gap-4 items-start>
          {/* 1. Yapılacaklar (Todo) */}
          <div className=bg-gray-100/70 p-3.5 rounded-2xl border border-gray-200 space-y-3>
            <div className=flex items-center justify-between px-1>
              <div className=flex items-center gap-2>
                <div className=w-2.5 h-2.5 rounded-full bg-blue-500 />
                <h3 className=font-bold text-sm text-gray-800>Yapılacaklar</h3>
              </div>
              <span className=px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold>
                {todoTasks.length}
              </span>
            </div>

            <div className=space-y-3>
              {todoTasks.map(t => (
                <TaskCard
                  key={t.id}
                  task={t}
                  getPriorityBadge={getPriorityBadge}
                  getCategoryIcon={getCategoryIcon}
                  onNextStatus={() => handleUpdateStatus(t.id, 'in_progress')}
                  onDelete={() => handleDeleteTask(t.id)}
                  nextLabel=İşleme Al
                />
              ))}
              {todoTasks.length === 0 && (
                <div className=p-8 text-center text-xs text-gray-400 bg-white/60 rounded-xl border border-dashed border-gray-300>
                  Bekleyen açık görev yok.
                </div>
              )}
            </div>
          </div>

          {/* 2. Devam Edenler (In Progress) */}
          <div className=bg-amber-50/50 p-3.5 rounded-2xl border border-amber-200/80 space-y-3>
            <div className=flex items-center justify-between px-1>
              <div className=flex items-center gap-2>
                <div className=w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse />
                <h3 className=font-bold text-sm text-gray-800>Devam Edenler</h3>
              </div>
              <span className=px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold>
                {inProgressTasks.length}
              </span>
            </div>

            <div className=space-y-3>
              {inProgressTasks.map(t => (
                <TaskCard
                  key={t.id}
                  task={t}
                  getPriorityBadge={getPriorityBadge}
                  getCategoryIcon={getCategoryIcon}
                  onNextStatus={() => handleUpdateStatus(t.id, 'completed')}
                  onDelete={() => handleDeleteTask(t.id)}
                  nextLabel=Tamamla
                />
              ))}
              {inProgressTasks.length === 0 && (
                <div className=p-8 text-center text-xs text-gray-400 bg-white/60 rounded-xl border border-dashed border-gray-300>
                  Şu an işlemde olan görev yok.
                </div>
              )}
            </div>
          </div>

          {/* 3. Tamamlananlar (Completed) */}
          <div className=bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-200/80 space-y-3>
            <div className=flex items-center justify-between px-1>
              <div className=flex items-center gap-2>
                <div className=w-2.5 h-2.5 rounded-full bg-emerald-500 />
                <h3 className=font-bold text-sm text-gray-800>Tamamlananlar</h3>
              </div>
              <span className=px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold>
                {completedTasks.length}
              </span>
            </div>

            <div className=space-y-3>
              {completedTasks.map(t => (
                <TaskCard
                  key={t.id}
                  task={t}
                  getPriorityBadge={getPriorityBadge}
                  getCategoryIcon={getCategoryIcon}
                  onDelete={() => handleDeleteTask(t.id)}
                  isCompleted
                />
              ))}
              {completedTasks.length === 0 && (
                <div className=p-8 text-center text-xs text-gray-400 bg-white/60 rounded-xl border border-dashed border-gray-300>
                  Tamamlanmış görev bulunmuyor.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* List View */
        <div className=bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden>
          <table className=w-full text-left border-collapse text-xs>
            <thead>
              <tr className=border-b border-gray-200 bg-gray-50 text-gray-700 font-bold uppercase>
                <th className=px-4 py-3>Durum</th>
                <th className=px-4 py-3>Görev Başlığı</th>
                <th className=px-4 py-3>Grup / Kaynak</th>
                <th className=px-4 py-3>Sorumlu</th>
                <th className=px-4 py-3>Öncelik</th>
                <th className=px-4 py-3>Termin Tarihi</th>
                <th className=px-4 py-3 text-right>İşlem</th>
              </tr>
            </thead>
            <tbody className=divide-y divide-gray-100 text-gray-800>
              {filteredTasks.map(t => (
                <tr key={t.id} className=hover:bg-gray-50 transition-colors>
                  <td className=px-4 py-3>
                    {t.status === 'todo' && <span className=px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold>Yapılacak</span>}
                    {t.status === 'in_progress' && <span className=px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold>İşlemde</span>}
                    {t.status === 'completed' && <span className=px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold>Tamamlandı</span>}
                  </td>
                  <td className=px-4 py-3 font-semibold text-gray-900>
                    <div className=flex items-center gap-1.5>
                      {getCategoryIcon(t.category)}
                      <span>{t.title}</span>
                    </div>
                  </td>
                  <td className=px-4 py-3 text-gray-600>{t.group_name}</td>
                  <td className=px-4 py-3 font-medium text-gray-900>{t.assigned_to || 'Atanmadı'}</td>
                  <td className=px-4 py-3>{getPriorityBadge(t.priority)}</td>
                  <td className=px-4 py-3 text-gray-500>{t.due_date ? new Date(t.due_date).toLocaleDateString('tr-TR') : '—'}</td>
                  <td className=px-4 py-3 text-right>
                    <div className=flex items-center justify-end gap-1.5>
                      {t.status === 'todo' && (
                        <button
                          onClick={() => handleUpdateStatus(t.id, 'in_progress')}
                          className=px-2 py-1 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded text-[11px] font-bold
                        >
                          İşleme Al
                        </button>
                      )}
                      {t.status === 'in_progress' && (
                        <button
                          onClick={() => handleUpdateStatus(t.id, 'completed')}
                          className=px-2 py-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded text-[11px] font-bold
                        >
                          Tamamla
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteTask(t.id)}
                        className=p-1 text-gray-400 hover:text-rose-600 rounded
                        title=Görevi Sil
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Task Modal */}
      <Modal
        open={isNewTaskModalOpen}
        onClose={handleCloseModal}
        title=Yeni WhatsApp Grup Görevi Oluştur
        size=lg
      >
        <form onSubmit={handleCreateTask} className=space-y-4>
          <div>
            <label className=block text-xs font-semibold text-gray-700 mb-1>Görev Başlığı *</label>
            <input
              type=text
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder=Örn: Merzifon Şubeye 5 Karkas Et Sevk Edilecek
              className=w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold focus:border-brand-500 focus:outline-none
            />
          </div>

          <div className=grid grid-cols-1 sm:grid-cols-2 gap-4>
            <div>
              <label className=block text-xs font-semibold text-gray-700 mb-1>WhatsApp Grubu</label>
              <select
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                className=w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none
              >
                <option value=Mezbaha & Kesimhane Grubu>Mezbaha & Kesimhane Grubu</option>
                <option value=Sanayi & Araç Bakım Grubu>Sanayi & Araç Bakım Grubu</option>
                <option value=Şoförler & Lojistik Grubu>Şoförler & Lojistik Grubu</option>
                <option value=Şubeler & Günlük Satış>Şubeler & Günlük Satış</option>
                <option value=Finans & Tahsilat Grubu>Finans & Tahsilat Grubu</option>
              </select>
            </div>

            <div>
              <label className=block text-xs font-semibold text-gray-700 mb-1>Sorumlu Kişi / Araç</label>
              <input
                type=text
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                placeholder=Örn: Ahmet Şoför (05 K 1234)
                className=w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none
              />
            </div>

            <div>
              <label className=block text-xs font-semibold text-gray-700 mb-1>Kategori</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className=w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none
              >
                <option value=sevkiyat>Sevkiyat & Lojistik</option>
                <option value=arac_bakim>Araç Bakım & Muayene</option>
                <option value=kesim>Mezbaha & Kesim</option>
                <option value=sube>Şube Operasyonu</option>
                <option value=muhasebe>Finans & Muhasebe</option>
                <option value=diger>Diğer</option>
              </select>
            </div>

            <div>
              <label className=block text-xs font-semibold text-gray-700 mb-1>Öncelik Derecesi</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as any)}
                className=w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none
              >
                <option value=urgent>🚨 Acil</option>
                <option value=high>⚡ Yüksek</option>
                <option value=medium>Normal</option>
                <option value=low>Düşük</option>
              </select>
            </div>

            <div>
              <label className=block text-xs font-semibold text-gray-700 mb-1>Termin Tarihi</label>
              <input
                type=date
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className=w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none
              />
            </div>
          </div>

          <div>
            <label className=block text-xs font-semibold text-gray-700 mb-1>Gruptaki Orijinal Mesaj / Açıklama</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder=Grupta yazılan talimat veya notlar...
              className=w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none
            />
          </div>

          <div className=flex items-center justify-end gap-3 pt-3 border-t border-gray-200>
            <button
              type=button
              onClick={handleCloseModal}
              className=btn-secondary px-4 py-2 text-xs font-semibold
            >
              İptal
            </button>
            <button
              type=submit
              className=btn-primary px-5 py-2 text-xs font-bold
            >
              Görevi Oluştur
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

interface TaskCardProps {
  task: WhatsAppTask;
  getPriorityBadge: (p: string) => React.ReactNode;
  getCategoryIcon: (cat: string) => React.ReactNode;
  onNextStatus?: () => void;
  onDelete?: () => void;
  nextLabel?: string;
  isCompleted?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  getPriorityBadge,
  getCategoryIcon,
  onNextStatus,
  onDelete,
  nextLabel,
  isCompleted
}) => {
  return (
    <div className={\p-3.5 bg-white rounded-xl border transition-all hover:shadow-md space-y-2.5 \\}>
      {/* Header tags */}
      <div className=flex items-center justify-between gap-2>
        <div className=flex items-center gap-1.5>
          {getCategoryIcon(task.category)}
          <span className=text-[11px] font-bold text-gray-700 truncate max-w-[130px]>
            {task.group_name}
          </span>
        </div>
        {getPriorityBadge(task.priority)}
      </div>

      {/* Title */}
      <h4 className={\	ext-xs font-bold leading-snug \\}>
        {task.title}
      </h4>

      {/* Description quote */}
      {task.description && (
        <p className=text-[11px] text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100 line-clamp-2 italic>
          {task.description}
        </p>
      )}

      {/* Footer Info */}
      <div className=pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500>
        <div className=flex items-center gap-1>
          <User size={12} className=text-gray-400 />
          <span className=font-semibold text-gray-700>{task.assigned_to || 'Atanmadı'}</span>
        </div>

        {task.due_date && (
          <div className=flex items-center gap-1>
            <Calendar size={12} className=text-gray-400 />
            <span>{new Date(task.due_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className=pt-1 flex items-center justify-between gap-2>
        {onDelete && (
          <button
            onClick={onDelete}
            className=p-1 text-gray-400 hover:text-rose-600 rounded transition-colors
            title=Görevi Sil
          >
            <Trash2 size={13} />
          </button>
        )}

        {onNextStatus && nextLabel && (
          <button
            onClick={onNextStatus}
            className=ml-auto px-2.5 py-1 rounded-lg bg-gray-900 hover:bg-black text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all
          >
            <span>{nextLabel}</span>
            <ChevronRight size={13} />
          </button>
        )}
      </div>
    </div>
  );
};
;

fs.writeFileSync(path.join('src', 'features', 'whatsapp-operasyon', 'components', 'TaskBoard.tsx'), taskBoardContent, 'utf8');
console.log('TaskBoard.tsx written successfully!');
