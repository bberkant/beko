import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, Eye, Pencil, Pause, Play, Trash2 } from 'lucide-react';
import { useToast } from '../../../lib/toast';
import { useVehicles } from '../store';
import type { Vehicle } from '../types';

interface VehicleRowMenuProps {
  vehicle: Vehicle;
}

export function VehicleRowMenu({ vehicle }: VehicleRowMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const navigate = useNavigate();
  const { notify } = useToast();
  const { saveVehicle, deleteVehicle } = useVehicles();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node) && !menuRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuWidth = 160;
      const menuHeight = 160;
      setPosition({
        left: Math.max(8, Math.min(window.innerWidth - menuWidth - 8, rect.right - menuWidth)),
        top: rect.bottom + menuHeight > window.innerHeight - 8 ? rect.top - menuHeight - 4 : rect.bottom + 4,
      });
    };
    place();
    window.addEventListener('mousedown', onClick);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  const toggleStatus = async () => {
    setOpen(false);
    const newStatus = vehicle.status === 'aktif' ? 'pasif' : 'aktif';
    try {
      const { id, ...input } = vehicle;
      await saveVehicle({ ...input, status: newStatus }, vehicle.id);
      notify(`Araç durumu güncellendi: ${newStatus.toUpperCase()}`, 'success');
    } catch (e: any) {
      notify(e.message || 'Durum güncellenemedi.', 'error');
    }
  };

  const handleDelete = async () => {
    setOpen(false);
    const confirmed = window.confirm(`Araç (${vehicle.plate}) silinsin mi?`);
    if (!confirmed) return;
    try {
      await deleteVehicle(vehicle.id);
      notify('Araç silindi.', 'success');
    } catch (e: any) {
      notify(e.message || 'Araç silinemedi.', 'error');
    }
  };

  const itemCls = 'flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50';

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        aria-label="İşlemler"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && createPortal(
        <div ref={menuRef} className="fixed z-[100] w-40 rounded-xl border border-gray-200 bg-white p-1.5 shadow-card" style={{top:position.top,left:position.left}}>
          <button className={itemCls} onClick={() => { setOpen(false); navigate(`/arac-yonetimi/${vehicle.id}`); }}>
            <Eye size={15} className="text-gray-400" /> Görüntüle
          </button>
          <button className={itemCls} onClick={() => { setOpen(false); navigate(`/arac-yonetimi/${vehicle.id}/duzenle`); }}>
            <Pencil size={15} className="text-gray-400" /> Düzenle
          </button>
          <button className={itemCls} onClick={() => { void toggleStatus(); }}>
            {vehicle.status === 'aktif' ? (
              <>
                <Pause size={15} className="text-gray-400" /> Pasife Al
              </>
            ) : (
              <>
                <Play size={15} className="text-gray-400" /> Aktife Al
              </>
            )}
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button
            className={`${itemCls} text-red-600 hover:bg-red-50`}
            onClick={() => { void handleDelete(); }}
          >
            <Trash2 size={15} /> Aracı Sil
          </button>
        </div>, document.body
      )}
    </div>
  );
}
