import { useState, useMemo } from 'react';
import type { Vehicle } from '../types';

interface BulkInspectionModalBodyProps {
  vehicles: Vehicle[];
  submitting: boolean;
  onSubmit: (dates: Record<string, string>) => void;
}

export function BulkInspectionModalBody({ vehicles, submitting, onSubmit }: BulkInspectionModalBodyProps) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [dates, setDates] = useState<Record<string, string>>({});
  const [commonDate, setCommonDate] = useState(new Date().toISOString().slice(0, 10));

  const activeVehicles = useMemo(() => vehicles.filter(v => v.status === 'aktif'), [vehicles]);
  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);
  const allSelected = activeVehicles.length > 0 && activeVehicles.every(v => selected[v.id]);

  const toggleVehicle = (v: Vehicle) => {
    setSelected(prev => ({ ...prev, [v.id]: !prev[v.id] }));
    if (!dates[v.id]) {
      setDates(prev => ({ ...prev, [v.id]: commonDate }));
    }
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected({});
      return;
    }
    const newSelected: Record<string, boolean> = {};
    const newDates: Record<string, string> = { ...dates };
    activeVehicles.forEach(v => {
      newSelected[v.id] = true;
      if (!newDates[v.id]) {
        newDates[v.id] = commonDate;
      }
    });
    setSelected(newSelected);
    setDates(newDates);
  };

  const applyCommonDateToSelected = () => {
    const newDates = { ...dates };
    activeVehicles.forEach(v => {
      if (selected[v.id]) {
        newDates[v.id] = commonDate;
      }
    });
    setDates(newDates);
  };

  const submit = () => {
    const payload: Record<string, string> = {};
    activeVehicles.forEach(v => {
      if (selected[v.id] && dates[v.id]) {
        payload[v.id] = dates[v.id];
      }
    });
    onSubmit(payload);
  };

  return (
    <div className="space-y-4">
      {/* Set Common Date */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Toplu Tarih Doldurucu</h4>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="label">Ortak Muayene Son Tarihi</label>
            <input 
              type="date" 
              className="input" 
              value={commonDate} 
              onChange={e => setCommonDate(e.target.value)} 
            />
          </div>
          <button 
            type="button" 
            className="btn-secondary !py-2.5" 
            onClick={applyCommonDateToSelected}
            disabled={selectedCount === 0}
          >
            Seçilenlere Uygula
          </button>
        </div>
      </div>

      {/* Vehicle List */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="label !mb-0">Araçlar ve Yeni Muayene Tarihleri</label>
          <div className="flex items-center gap-3">
            <button 
              type="button" 
              className="text-xs font-semibold text-brand-600 hover:underline"
              onClick={toggleAll}
            >
              {allSelected ? 'Seçimleri Kaldır' : 'Tümünü Seç'}
            </button>
            <span className="text-xs text-gray-500">|</span>
            <span className="text-xs text-gray-500">{selectedCount} araç seçildi</span>
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
          {activeVehicles.map(v => (
            <div key={v.id} className="grid grid-cols-[auto_1fr_170px] items-center gap-3 p-3 hover:bg-gray-50/40">
              <input 
                type="checkbox" 
                checked={Boolean(selected[v.id])} 
                onChange={() => toggleVehicle(v)} 
                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" 
              />
              <button 
                type="button" 
                className="min-w-0 text-left cursor-pointer" 
                onClick={() => toggleVehicle(v)}
              >
                <span className="block truncate text-sm font-semibold text-gray-900">{v.plate}</span>
                <span className="block text-xs text-gray-500 truncate">{v.brand} {v.model}</span>
                {v.inspectionDate && (
                  <span className="block text-[11px] text-amber-600 font-medium">Mevcut son tarih: {v.inspectionDate}</span>
                )}
              </button>
              <input
                type="date"
                className="input !py-1.5"
                value={dates[v.id] ?? ''}
                onChange={e => setDates(prev => ({ ...prev, [v.id]: e.target.value }))}
                disabled={!selected[v.id]}
                required
              />
            </div>
          ))}
          {activeVehicles.length === 0 && (
            <p className="p-6 text-center text-sm text-gray-500">
              Muayene girilebilecek aktif araç bulunamadı.
            </p>
          )}
        </div>
      </div>

      {/* Action Button */}
      <button 
        className="btn-primary w-full !py-3" 
        onClick={submit} 
        disabled={submitting || selectedCount === 0}
      >
        {submitting ? 'Muayeneler Kaydediliyor...' : `${selectedCount || ''} Aracın Muayene Tarihini Güncelle`}
      </button>
    </div>
  );
}
