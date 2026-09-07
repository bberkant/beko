import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';

export interface CariRow {
  name: string;
  amount: number;
}

export interface ArkaSayfaData {
  merkez: {
    nakit: number;
    cikis: number;
    pos: number;
  };
  merzifon: {
    nakit: number;
    garanti: number;
    ziraat: number;
    akbank: number;
  };
  atakum: {
    nakit: number;
    kuveyt: number;
    halk: number;
    garanti: number;
    albaraka: number;
    ziraat: number;
  };
  ilkadim: {
    nakit: number;
    ziraat: number;
    deniz: number;
    kuveyt: number;
  };
  depo: {
    giris: number;
    cikis: number;
    devir: number;
    merzifonSubeDevir: number;
    anaKasaDevir: number;
    toplam?: number;
  };
  cariler: CariRow[];
}

export const defaultArkaSayfaData = (): ArkaSayfaData => ({
  merkez: { nakit: 0, cikis: 0, pos: 0 },
  merzifon: { nakit: 0, garanti: 0, ziraat: 0, akbank: 0 },
  atakum: { nakit: 0, kuveyt: 0, halk: 0, garanti: 0, albaraka: 0, ziraat: 0 },
  ilkadim: { nakit: 0, ziraat: 0, deniz: 0, kuveyt: 0 },
  depo: { giris: 0, cikis: 0, devir: 0, merzifonSubeDevir: 0, anaKasaDevir: 0 },
  cariler: []
});

interface Props {
  data: ArkaSayfaData;
  onChange: (data: ArkaSayfaData) => void;
  isStaff: boolean;
  selectedDate: string;
  isSaving?: boolean;
}

export function RaporArkaSayfaCard({ data, onChange, isStaff, selectedDate, isSaving }: Props) {
  const [localData, setLocalData] = useState<ArkaSayfaData>(data || defaultArkaSayfaData());

  useEffect(() => {
    if (data) {
      setLocalData(data);
    }
  }, [data]);

  const parseNumber = (val: string): number => {
    if (!val) return 0;
    const clean = val.toString().replace(/\./g, '').replace(/,/g, '.').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  const formatNumber = (num: number | null | undefined, showZero = false): string => {
    if (num === null || num === undefined || (!showZero && num === 0)) return '';
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatTotal = (num: number): string => {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num || 0);
  };

  // 1. Calculations for Branch Totals
  const merkezTotal = useMemo(() => {
    const m = localData.merkez || { nakit: 0, cikis: 0, pos: 0 };
    return (m.nakit || 0) + (m.cikis || 0) + (m.pos || 0);
  }, [localData.merkez]);

  const merzifonTotal = useMemo(() => {
    const m = localData.merzifon || { nakit: 0, garanti: 0, ziraat: 0, akbank: 0 };
    return (m.nakit || 0) + (m.garanti || 0) + (m.ziraat || 0) + (m.akbank || 0);
  }, [localData.merzifon]);

  const atakumTotal = useMemo(() => {
    const a = localData.atakum || { nakit: 0, kuveyt: 0, halk: 0, garanti: 0, albaraka: 0, ziraat: 0 };
    return (a.nakit || 0) + (a.kuveyt || 0) + (a.halk || 0) + (a.garanti || 0) + (a.albaraka || 0) + (a.ziraat || 0);
  }, [localData.atakum]);

  const ilkadimTotal = useMemo(() => {
    const i = localData.ilkadim || { nakit: 0, ziraat: 0, deniz: 0, kuveyt: 0 };
    return (i.nakit || 0) + (i.ziraat || 0) + (i.deniz || 0) + (i.kuveyt || 0);
  }, [localData.ilkadim]);

  const depo = localData.depo || { giris: 0, cikis: 0, devir: 0, merzifonSubeDevir: 0, anaKasaDevir: 0 };
  const depoKasaKalan = (depo.giris || 0) - (depo.cikis || 0) + (depo.devir || 0);
  const depoNetKalan = (depo.giris || 0) - (depo.merzifonSubeDevir || 0) - (depo.anaKasaDevir || 0);
  const depoTotal = depo.toplam !== undefined && depo.toplam !== null && depo.toplam !== 0 ? depo.toplam : (depoNetKalan || 0);

  // Grand Total of All Branches (Bottom Right: 512.422,00)
  const grandTotal = merkezTotal + merzifonTotal + atakumTotal + ilkadimTotal + depoTotal;

  // Formatted Date Title like Excel B2: "3 Eylül 2026 Perşembe"
  const formattedDateTitle = useMemo(() => {
    if (!selectedDate) return '';
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        weekday: 'long'
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // Update helpers
  const updateField = (section: keyof ArkaSayfaData, field: string, value: any) => {
    const updated = {
      ...localData,
      [section]: {
        ...(localData[section] as any),
        [field]: value
      }
    };
    setLocalData(updated);
    onChange(updated);
  };

  const updateCari = (index: number, field: 'name' | 'amount', value: any) => {
    const newCariler = [...(localData.cariler || [])];
    if (field === 'amount') {
      newCariler[index] = { ...newCariler[index], amount: parseNumber(value) };
    } else {
      newCariler[index] = { ...newCariler[index], name: value };
    }
    const updated = { ...localData, cariler: newCariler };
    setLocalData(updated);
    onChange(updated);
  };

  const addCariRow = () => {
    const newCariler = [...(localData.cariler || []), { name: '', amount: 0 }];
    const updated = { ...localData, cariler: newCariler };
    setLocalData(updated);
    onChange(updated);
  };

  const removeCariRow = (index: number) => {
    const newCariler = (localData.cariler || []).filter((_, i) => i !== index);
    const updated = { ...localData, cariler: newCariler };
    setLocalData(updated);
    onChange(updated);
  };

  const carilerList = localData.cariler || [];
  const minCariRows = 17;
  const emptyCariCount = Math.max(0, minCariRows - carilerList.length);

  return (
    <div className="flex flex-col text-gray-900 print-card animate-fadeIn w-full max-w-full" style={{ fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif' }}>
      {/* Outer Container with solid 2px black border matching Ön Yüz */}
      <div className="border-2 border-black bg-white shadow-sm overflow-hidden flex flex-col w-full">
        
        {/* Main Header Banner matching Ön Yüz */}
        <div className="border-b-2 border-black bg-[#cfd5dd] h-[40px] flex items-center justify-between px-3 text-black font-black text-[18px] tracking-widest uppercase mb-[-2px] z-10">
          <div className="flex items-center gap-2">
            <span>RAPOR ARKA SAYFA (ŞUBELER / DAĞILIM)</span>
            {selectedDate && (
              <span className="text-xs font-bold text-gray-700 hidden sm:inline">
                ({new Date(selectedDate).toLocaleDateString('tr-TR')})
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-800 bg-white/70 border border-black/30 px-2 py-0.5 rounded">
              2. SAYFA
            </span>
            {isSaving && (
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded border border-amber-300 animate-pulse">
                Kaydediliyor...
              </span>
            )}
          </div>
        </div>

        {/* Excel 3-Column Layout: Perfectly fitting 100% width with fr units and NO overflow */}
        <div className="p-2.5 bg-white w-full box-border">
          <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_1fr_1fr] gap-2.5 items-start w-full min-w-0">
            
            {/* ========================================================= */}
            {/* SÜTUN 1 (SOL): ŞUBELER ÖZETİ + CARİLER / TAHSİLATLAR      */}
            {/* ========================================================= */}
            <div className="flex flex-col w-full min-w-0">
              {/* Date Header like Excel Cell B2 */}
              <div className="h-[26px] flex items-center font-bold text-[14px] text-gray-950 pl-1">
                {formattedDateTitle}
              </div>

              {/* Tall Box (B3:C25 in Excel) with solid black border */}
              <div className="border-[1.5px] border-black bg-white flex flex-col w-full">
                
                {/* 1. ŞUBE ÖZETİ (Rows 3-7) - Clean solid lines */}
                <div className="flex flex-col text-xs">
                  
                  {/* MERKEZ */}
                  <div className="grid grid-cols-[55%_45%] h-[26px] items-center border-b border-gray-300">
                    <span className="font-bold text-gray-900 pl-2 uppercase tracking-wide text-[13px] border-r border-black h-full flex items-center">MERKEZ</span>
                    <span className="font-bold text-gray-950 pr-2 text-right text-[13px] h-full flex items-center justify-end">{formatTotal(merkezTotal)}</span>
                  </div>

                  {/* MERZİFON */}
                  <div className="grid grid-cols-[55%_45%] h-[26px] items-center border-b border-gray-300">
                    <span className="font-bold text-gray-900 pl-2 uppercase tracking-wide text-[13px] border-r border-black h-full flex items-center">MERZİFON</span>
                    <span className="font-bold text-gray-950 pr-2 text-right text-[13px] h-full flex items-center justify-end">{formatTotal(merzifonTotal)}</span>
                  </div>

                  {/* ATAKUM */}
                  <div className="grid grid-cols-[55%_45%] h-[26px] items-center border-b border-gray-300">
                    <span className="font-bold text-gray-900 pl-2 uppercase tracking-wide text-[13px] border-r border-black h-full flex items-center">ATAKUM</span>
                    <span className="font-bold text-gray-950 pr-2 text-right text-[13px] h-full flex items-center justify-end">{formatTotal(atakumTotal)}</span>
                  </div>

                  {/* İLKADIM */}
                  <div className="grid grid-cols-[55%_45%] h-[26px] items-center border-b border-gray-300">
                    <span className="font-bold text-gray-900 pl-2 uppercase tracking-wide text-[13px] border-r border-black h-full flex items-center">İLKADIM</span>
                    <span className="font-bold text-gray-950 pr-2 text-right text-[13px] h-full flex items-center justify-end">{formatTotal(ilkadimTotal)}</span>
                  </div>

                  {/* DEPO */}
                  <div className="grid grid-cols-[55%_45%] h-[26px] items-center border-b border-black">
                    <span className="font-bold text-gray-900 pl-2 uppercase tracking-wide text-[13px] border-r border-black h-full flex items-center">DEPO</span>
                    <span className="font-bold text-gray-950 pr-2 text-right text-[13px] h-full flex items-center justify-end">{formatTotal(depoTotal)}</span>
                  </div>
                </div>

                {/* Empty Divider Row (Row 8 in Excel) - Solid clean lines */}
                <div className="grid grid-cols-[55%_45%] h-[22px] border-b border-black bg-white">
                  <div className="border-r border-black h-full"></div>
                  <div className="h-full"></div>
                </div>

                {/* 2. CARİLER / TAHSİLATLAR (Rows 9-25) - Clean single solid lines */}
                <div className="flex flex-col text-xs flex-1">
                  {carilerList.map((cari, idx) => (
                    <div key={idx} className="grid grid-cols-[55%_45%] h-[26px] items-center border-b border-gray-300 group relative">
                      <div className="h-full flex items-center pl-2 border-r border-black overflow-hidden">
                        <input
                          type="text"
                          className="w-full h-full bg-transparent border-0 focus:outline-none focus:bg-blue-50/40 text-left text-[12.5px] uppercase font-bold text-gray-900 tracking-tight"
                          defaultValue={cari.name}
                          placeholder=""
                          disabled={!isStaff}
                          onBlur={(e) => updateCari(idx, 'name', e.target.value)}
                        />
                      </div>
                      <div className="h-full flex items-center justify-end pr-2 relative">
                        <input
                          type="text"
                          className="w-full h-full bg-transparent border-0 focus:outline-none focus:bg-blue-50/40 text-right text-[13px] font-bold text-gray-950 pr-1"
                          defaultValue={formatNumber(cari.amount)}
                          placeholder=""
                          disabled={!isStaff}
                          onBlur={(e) => updateCari(idx, 'amount', e.target.value)}
                        />
                        {isStaff && (
                          <button
                            type="button"
                            onClick={() => removeCariRow(idx)}
                            className="hidden group-hover:flex absolute -left-4 top-1.5 p-0.5 text-red-500 hover:text-red-700 bg-white rounded shadow-sm border border-red-200 no-print z-10"
                            title="Cari Satırını Sil"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Empty rows with clean single solid lines to fill card height matching Excel */}
                  {Array.from({ length: emptyCariCount }).map((_, i) => (
                    <div key={`empty-cari-${i}`} className="grid grid-cols-[55%_45%] h-[26px] items-center border-b border-gray-300 last:border-b-0">
                      <div className="h-full border-r border-black"></div>
                      <div className="h-full"></div>
                    </div>
                  ))}
                </div>

                {/* Add Row Button at bottom for Staff */}
                {isStaff && (
                  <div className="border-t border-gray-300 p-1 bg-gray-50 flex justify-center no-print">
                    <button
                      type="button"
                      onClick={addCariRow}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 py-0.5 px-2 rounded hover:bg-blue-50 transition"
                    >
                      <Plus size={13} /> Cari Satırı Ekle
                    </button>
                  </div>
                )}

              </div>
            </div>


            {/* ========================================================= */}
            {/* SÜTUN 2 (ORTA): MERKEZ & ATAKUM KUTULARI                  */}
            {/* ========================================================= */}
            <div className="flex flex-col gap-5 w-full min-w-0">
              {/* Spacer matching date header height */}
              <div className="h-[26px]"></div>

              {/* 1. KUTU: MERKEZ (E3:F10) */}
              <div className="border-[1.5px] border-black bg-white flex flex-col w-full">
                {/* Header */}
                <div className="border-b-[1.5px] border-black text-center py-1 font-black text-[13px] uppercase tracking-wider text-gray-950 bg-white">
                  MERKEZ
                </div>
                {/* Rows with clean solid single lines */}
                <div className="flex flex-col text-xs">
                  {/* NAKİT */}
                  <div className="grid grid-cols-[48%_52%] h-[26px] items-center border-b border-gray-300">
                    <span className="font-bold text-gray-900 pl-2 uppercase text-[12px] border-r border-black h-full flex items-center">NAKİT</span>
                    <input
                      type="text"
                      className="w-full h-full bg-transparent text-right pr-2 font-bold text-[13px] border-0 focus:outline-none focus:bg-blue-50/40 text-gray-950"
                      defaultValue={formatNumber(localData.merkez?.nakit)}
                      disabled={!isStaff}
                      onBlur={(e) => updateField('merkez', 'nakit', parseNumber(e.target.value))}
                    />
                  </div>
                  {/* ÇIKIŞ */}
                  <div className="grid grid-cols-[48%_52%] h-[26px] items-center border-b border-gray-300">
                    <span className="font-bold text-gray-900 pl-2 uppercase text-[12px] border-r border-black h-full flex items-center">ÇIKIŞ</span>
                    <input
                      type="text"
                      className="w-full h-full bg-transparent text-right pr-2 font-bold text-[13px] border-0 focus:outline-none focus:bg-blue-50/40 text-gray-950"
                      defaultValue={formatNumber(localData.merkez?.cikis)}
                      disabled={!isStaff}
                      onBlur={(e) => updateField('merkez', 'cikis', parseNumber(e.target.value))}
                    />
                  </div>
                  {/* POS */}
                  <div className="grid grid-cols-[48%_52%] h-[26px] items-center border-b border-gray-300">
                    <span className="font-bold text-gray-900 pl-2 uppercase text-[12px] border-r border-black h-full flex items-center">POS</span>
                    <input
                      type="text"
                      className="w-full h-full bg-transparent text-right pr-2 font-bold text-[13px] border-0 focus:outline-none focus:bg-blue-50/40 text-gray-950"
                      defaultValue={formatNumber(localData.merkez?.pos)}
                      disabled={!isStaff}
                      onBlur={(e) => updateField('merkez', 'pos', parseNumber(e.target.value))}
                    />
                  </div>
                  {/* Empty rows matching Excel with single solid lines */}
                  <div className="grid grid-cols-[48%_52%] h-[26px] border-b border-gray-300">
                    <div className="border-r border-black h-full"></div>
                    <div className="h-full"></div>
                  </div>
                  <div className="grid grid-cols-[48%_52%] h-[26px] border-b border-black">
                    <div className="border-r border-black h-full"></div>
                    <div className="h-full"></div>
                  </div>
                </div>
                {/* Total Box in F10 */}
                <div className="grid grid-cols-[48%_52%] h-[28px]">
                  <div></div>
                  <div className="border-l-[1.5px] border-black h-full flex items-center justify-end pr-2 font-bold text-[13px] text-gray-950 bg-white">
                    {formatTotal(merkezTotal)}
                  </div>
                </div>
              </div>

              {/* 2. KUTU: ATAKUM (E12:F19) */}
              <div className="border-[1.5px] border-black bg-white flex flex-col w-full">
                {/* Header */}
                <div className="border-b-[1.5px] border-black text-center py-1 font-black text-[13px] uppercase tracking-wider text-gray-950 bg-white">
                  ATAKUM
                </div>
                {/* Rows with clean solid single lines */}
                <div className="flex flex-col text-xs">
                  {/* ATAKUM */}
                  <div className="grid grid-cols-[48%_52%] h-[26px] items-center border-b border-gray-300">
                    <span className="font-bold text-gray-900 pl-2 uppercase text-[12px] border-r border-black h-full flex items-center">ATAKUM</span>
                    <input
                      type="text"
                      className="w-full h-full bg-transparent text-right pr-2 font-bold text-[13px] border-0 focus:outline-none focus:bg-blue-50/40 text-gray-950"
                      defaultValue={formatNumber(localData.atakum?.nakit)}
                      disabled={!isStaff}
                      onBlur={(e) => updateField('atakum', 'nakit', parseNumber(e.target.value))}
                    />
                  </div>
                  {/* KUVEYT */}
                  <div className="grid grid-cols-[48%_52%] h-[26px] items-center border-b border-gray-300">
                    <span className="font-bold text-gray-900 pl-2 uppercase text-[12px] border-r border-black h-full flex items-center">KUVEYT</span>
                    <input
                      type="text"
                      className="w-full h-full bg-transparent text-right pr-2 font-bold text-[13px] border-0 focus:outline-none focus:bg-blue-50/40 text-gray-950"
                      defaultValue={formatNumber(localData.atakum?.kuveyt)}
                      disabled={!isStaff}
                      onBlur={(e) => updateField('atakum', 'kuveyt', parseNumber(e.target.value))}
                    />
                  </div>
                  {/* HALK */}
                  <div className="grid grid-cols-[48%_52%] h-[26px] items-center border-b border-gray-300">
                    <span className="font-bold text-gray-900 pl-2 uppercase text-[12px] border-r border-black h-full flex items-center">HALK</span>
                    <input
                      type="text"
                      className="w-full h-full bg-transparent text-right pr-2 font-bold text-[13px] border-0 focus:outline-none focus:bg-blue-50/40 text-gray-950"
                      defaultValue={formatNumber(localData.atakum?.halk)}
                      disabled={!isStaff}
                      onBlur={(e) => updateField('atakum', 'halk', parseNumber(e.target.value))}
                    />
                  </div>
                  {/* GARANTİ */}
                  <div className="grid grid-cols-[48%_52%] h-[26px] items-center border-b border-gray-300">
                    <span className="font-bold text-gray-900 pl-2 uppercase text-[12px] border-r border-black h-full flex items-center">GARANTİ</span>
                    <input
                      type="text"
                      className="w-full h-full bg-transparent text-right pr-2 font-bold text-[13px] border-0 focus:outline-none focus:bg-blue-50/40 text-gray-950"
                      defaultValue={formatNumber(localData.atakum?.garanti)}
                      disabled={!isStaff}
                      onBlur={(e) => updateField('atakum', 'garanti', parseNumber(e.target.value))}
                    />
                  </div>
                  {/* ALBARAKA */}
                  <div className="grid grid-cols-[48%_52%] h-[26px] items-center border-b border-gray-300">
                    <span className="font-bold text-gray-900 pl-2 uppercase text-[12px] border-r border-black h-full flex items-center">ALBARAKA</span>
                    <input
                      type="text"
                      className="w-full h-full bg-transparent text-right pr-2 font-bold text-[13px] border-0 focus:outline-none focus:bg-blue-50/40 text-gray-950"
                      defaultValue={formatNumber(localData.atakum?.albaraka)}
                      disabled={!isStaff}
                      onBlur={(e) => updateField('atakum', 'albaraka', parseNumber(e.target.value))}
                    />
                  </div>
                  {/* ZİRAAT */}
                  <div className="grid grid-cols-[48%_52%] h-[26px] items-center border-b border-black">
                    <span className="font-bold text-gray-900 pl-2 uppercase text-[12px] border-r border-black h-full flex items-center">ZİRAAT</span>
                    <input
                      type="text"
                      className="w-full h-full bg-transparent text-right pr-2 font-bold text-[13px] border-0 focus:outline-none focus:bg-blue-50/40 text-gray-950"
                      defaultValue={formatNumber(localData.atakum?.ziraat)}
                      disabled={!isStaff}
                      onBlur={(e) => updateField('atakum', 'ziraat', parseNumber(e.target.value))}
                    />
                  </div>
                </div>
                {/* Total Box in F19 */}
                <div className="grid grid-cols-[48%_52%] h-[28px]">
                  <div></div>
                  <div className="border-l-[1.5px] border-black h-full flex items-center justify-end pr-2 font-bold text-[13px] text-gray-950 bg-white">
                    {formatTotal(atakumTotal)}
                  </div>
                </div>
              </div>

            </div>


            {/* ========================================================= */}
            {/* SÜTUN 3 (SAĞ): MERZİFON, İLKADIM & DEPO KUTULARI          */}
            {/* ========================================================= */}
            <div className="flex flex-col gap-5 w-full min-w-0">
              {/* Spacer matching date header height */}
              <div className="h-[26px]"></div>

              {/* 1. KUTU: MERZİFON (H3:I10) */}
              <div className="border-[1.5px] border-black bg-white flex flex-col w-full">
                {/* Header */}
                <div className="border-b-[1.5px] border-black text-center py-1 font-black text-[13px] uppercase tracking-wider text-gray-950 bg-white">
                  MERZİFON
                </div>
                {/* Rows with clean solid single lines */}
                <div className="flex flex-col text-xs">
                  {/* MERZİFON */}
                  <div className="grid grid-cols-[48%_52%] h-[26px] items-center border-b border-gray-300">
                    <span className="font-bold text-gray-900 pl-2 uppercase text-[12px] border-r border-black h-full flex items-center">MERZİFON</span>
                    <input
                      type="text"
                      className="w-full h-full bg-transparent text-right pr-2 font-bold text-[13px] border-0 focus:outline-none focus:bg-blue-50/40 text-gray-950"
                      defaultValue={formatNumber(localData.merzifon?.nakit)}
                      disabled={!isStaff}
                      onBlur={(e) => updateField('merzifon', 'nakit', parseNumber(e.target.value))}
                    />
                  </div>
                  {/* GARANTİ */}
                  <div className="grid grid-cols-[48%_52%] h-[26px] items-center border-b border-gray-300">
                    <span className="font-bold text-gray-900 pl-2 uppercase text-[12px] border-r border-black h-full flex items-center">GARANTİ</span>
                    <input
                      type="text"
                      className="w-full h-full bg-transparent text-right pr-2 font-bold text-[13px] border-0 focus:outline-none focus:bg-blue-50/40 text-gray-950"
                      defaultValue={formatNumber(localData.merzifon?.garanti)}
                      disabled={!isStaff}
                      onBlur={(e) => updateField('merzifon', 'garanti', parseNumber(e.target.value))}
                    />
                  </div>
                  {/* ZİRAAT */}
                  <div className="grid grid-cols-[48%_52%] h-[26px] items-center border-b border-gray-300">
                    <span className="font-bold text-gray-900 pl-2 uppercase text-[12px] border-r border-black h-full flex items-center">ZİRAAT</span>
                    <input
                      type="text"
                      className="w-full h-full bg-transparent text-right pr-2 font-bold text-[13px] border-0 focus:outline-none focus:bg-blue-50/40 text-gray-950"
                      defaultValue={formatNumber(localData.merzifon?.ziraat)}
                      disabled={!isStaff}
                      onBlur={(e) => updateField('merzifon', 'ziraat', parseNumber(e.target.value))}
                    />
                  </div>
                  {/* AKBANK */}
                  <div className="grid grid-cols-[48%_52%] h-[26px] items-center border-b border-gray-300">
                    <span className="font-bold text-gray-900 pl-2 uppercase text-[12px] border-r border-black h-full flex items-center">AKBANK</span>
                    <input
                      type="text"
                      className="w-full h-full bg-transparent text-right pr-2 font-bold text-[13px] border-0 focus:outline-none focus:bg-blue-50/40 text-gray-950"
                      defaultValue={formatNumber(localData.merzifon?.akbank)}
                      disabled={!isStaff}
                      onBlur={(e) => updateField('merzifon', 'akbank', parseNumber(e.target.value))}
                    />
                  </div>
                  {/* Empty row */}
                  <div className="grid grid-cols-[48%_52%] h-[26px] border-b border-black">
                    <div className="border-r border-black h-full"></div>
                    <div className="h-full"></div>
                  </div>
                </div>
                {/* Total Box in I10 */}
                <div className="grid grid-cols-[48%_52%] h-[28px]">
                  <div></div>
                  <div className="border-l-[1.5px] border-black h-full flex items-center justify-end pr-2 font-bold text-[13px] text-gray-950 bg-white">
                    {formatTotal(merzifonTotal)}
                  </div>
                </div>
              </div>

              {/* 2. KUTU: İLKADIM (H12:I19) */}
              <div className="border-[1.5px] border-black bg-white flex flex-col w-full">
                {/* Header */}
                <div className="border-b-[1.5px] border-black text-center py-1 font-black text-[13px] uppercase tracking-wider text-gray-950 bg-white">
                  İLKADIM
                </div>
                {/* Rows with clean solid single lines */}
                <div className="flex flex-col text-xs">
                  {/* İLKADIM */}
                  <div className="grid grid-cols-[48%_52%] h-[26px] items-center border-b border-gray-300">
                    <span className="font-bold text-gray-900 pl-2 uppercase text-[12px] border-r border-black h-full flex items-center">İLKADIM</span>
                    <input
                      type="text"
                      className="w-full h-full bg-transparent text-right pr-2 font-bold text-[13px] border-0 focus:outline-none focus:bg-blue-50/40 text-gray-950"
                      defaultValue={formatNumber(localData.ilkadim?.nakit)}
                      disabled={!isStaff}
                      onBlur={(e) => updateField('ilkadim', 'nakit', parseNumber(e.target.value))}
                    />
                  </div>
                  {/* ZİRAAT */}
                  <div className="grid grid-cols-[48%_52%] h-[26px] items-center border-b border-gray-300">
                    <span className="font-bold text-gray-900 pl-2 uppercase text-[12px] border-r border-black h-full flex items-center">ZİRAAT</span>
                    <input
                      type="text"
                      className="w-full h-full bg-transparent text-right pr-2 font-bold text-[13px] border-0 focus:outline-none focus:bg-blue-50/40 text-gray-950"
                      defaultValue={formatNumber(localData.ilkadim?.ziraat)}
                      disabled={!isStaff}
                      onBlur={(e) => updateField('ilkadim', 'ziraat', parseNumber(e.target.value))}
                    />
                  </div>
                  {/* DENİZ */}
                  <div className="grid grid-cols-[48%_52%] h-[26px] items-center border-b border-gray-300">
                    <span className="font-bold text-gray-900 pl-2 uppercase text-[12px] border-r border-black h-full flex items-center">DENİZ</span>
                    <input
                      type="text"
                      className="w-full h-full bg-transparent text-right pr-2 font-bold text-[13px] border-0 focus:outline-none focus:bg-blue-50/40 text-gray-950"
                      defaultValue={formatNumber(localData.ilkadim?.deniz)}
                      disabled={!isStaff}
                      onBlur={(e) => updateField('ilkadim', 'deniz', parseNumber(e.target.value))}
                    />
                  </div>
                  {/* KUVEYT */}
                  <div className="grid grid-cols-[48%_52%] h-[26px] items-center border-b border-gray-300">
                    <span className="font-bold text-gray-900 pl-2 uppercase text-[12px] border-r border-black h-full flex items-center">KUVEYT</span>
                    <input
                      type="text"
                      className="w-full h-full bg-transparent text-right pr-2 font-bold text-[13px] border-0 focus:outline-none focus:bg-blue-50/40 text-gray-950"
                      defaultValue={formatNumber(localData.ilkadim?.kuveyt)}
                      disabled={!isStaff}
                      onBlur={(e) => updateField('ilkadim', 'kuveyt', parseNumber(e.target.value))}
                    />
                  </div>
                  {/* Empty row */}
                  <div className="grid grid-cols-[48%_52%] h-[26px] border-b border-black">
                    <div className="border-r border-black h-full"></div>
                    <div className="h-full"></div>
                  </div>
                </div>
                {/* Total Box in I19 */}
                <div className="grid grid-cols-[48%_52%] h-[28px]">
                  <div></div>
                  <div className="border-l-[1.5px] border-black h-full flex items-center justify-end pr-2 font-bold text-[13px] text-gray-950 bg-white">
                    {formatTotal(ilkadimTotal)}
                  </div>
                </div>
              </div>

              {/* 3. KUTU: DEPO (H21:I31) */}
              <div className="border-[1.5px] border-black bg-white flex flex-col w-full">
                {/* Header */}
                <div className="border-b-[1.5px] border-black text-center py-1 font-black text-[13px] uppercase tracking-wider text-gray-950 bg-white">
                  DEPO
                </div>
                {/* Rows with clean solid single lines */}
                <div className="flex flex-col text-xs">
                  {/* GİRİŞ */}
                  <div className="grid grid-cols-[48%_52%] h-[26px] items-center border-b border-gray-300">
                    <span className="font-bold text-gray-900 pl-2 uppercase text-[12px] border-r border-black h-full flex items-center">GİRİŞ</span>
                    <input
                      type="text"
                      className="w-full h-full bg-transparent text-right pr-2 font-bold text-[13px] border-0 focus:outline-none focus:bg-blue-50/40 text-gray-950"
                      defaultValue={formatNumber(localData.depo?.giris)}
                      disabled={!isStaff}
                      onBlur={(e) => updateField('depo', 'giris', parseNumber(e.target.value))}
                    />
                  </div>
                  {/* ÇIKIŞ */}
                  <div className="grid grid-cols-[48%_52%] h-[26px] items-center border-b border-gray-300">
                    <span className="font-bold text-gray-900 pl-2 uppercase text-[12px] border-r border-black h-full flex items-center">ÇIKIŞ</span>
                    <input
                      type="text"
                      className="w-full h-full bg-transparent text-right pr-2 font-bold text-[13px] border-0 focus:outline-none focus:bg-blue-50/40 text-gray-950"
                      defaultValue={formatNumber(localData.depo?.cikis)}
                      disabled={!isStaff}
                      onBlur={(e) => updateField('depo', 'cikis', parseNumber(e.target.value))}
                    />
                  </div>
                  {/* DEVİR */}
                  <div className="grid grid-cols-[48%_52%] h-[26px] items-center border-b border-gray-300">
                    <span className="font-bold text-gray-900 pl-2 uppercase text-[12px] border-r border-black h-full flex items-center">DEVİR</span>
                    <input
                      type="text"
                      className="w-full h-full bg-transparent text-right pr-2 font-bold text-[13px] border-0 focus:outline-none focus:bg-blue-50/40 text-gray-950"
                      defaultValue={formatNumber(localData.depo?.devir)}
                      disabled={!isStaff}
                      onBlur={(e) => updateField('depo', 'devir', parseNumber(e.target.value))}
                    />
                  </div>
                  {/* 2 Empty rows */}
                  <div className="grid grid-cols-[48%_52%] h-[26px] border-b border-gray-300">
                    <div className="border-r border-black h-full"></div>
                    <div className="h-full"></div>
                  </div>
                  <div className="grid grid-cols-[48%_52%] h-[26px] border-b border-black">
                    <div className="border-r border-black h-full"></div>
                    <div className="h-full"></div>
                  </div>
                  
                  {/* KASA KALAN in Red Bold (Row 28) */}
                  <div className="grid grid-cols-[48%_52%] h-[26px] items-center border-b border-gray-300 bg-white">
                    <span className="font-black text-red-600 pl-2 uppercase text-[12px] border-r border-black h-full flex items-center">KASA KALAN</span>
                    <span className="font-bold text-gray-950 pr-2 text-right text-[13px] h-full flex items-center justify-end">{formatTotal(depoKasaKalan)}</span>
                  </div>

                  {/* MERZİFON ŞUBE DEVİR (Row 29) */}
                  <div className="grid grid-cols-[48%_52%] h-[28px] items-center border-b border-gray-300">
                    <span className="font-bold text-gray-900 text-center uppercase text-[11px] leading-tight px-1 border-r border-black h-full flex items-center justify-center">
                      MERZİFON<br/>ŞUBE DEVİR
                    </span>
                    <input
                      type="text"
                      className="w-full h-full bg-transparent text-right pr-2 font-bold text-[13px] border-0 focus:outline-none focus:bg-blue-50/40 text-gray-950"
                      defaultValue={formatNumber(localData.depo?.merzifonSubeDevir)}
                      disabled={!isStaff}
                      onBlur={(e) => updateField('depo', 'merzifonSubeDevir', parseNumber(e.target.value))}
                    />
                  </div>

                  {/* ANA KASA DEVİR (Row 30) */}
                  <div className="grid grid-cols-[48%_52%] h-[28px] items-center border-b border-black">
                    <span className="font-bold text-gray-900 text-center uppercase text-[11px] leading-tight px-1 border-r border-black h-full flex items-center justify-center">
                      ANA KASA<br/>DEVİR
                    </span>
                    <input
                      type="text"
                      className="w-full h-full bg-transparent text-right pr-2 font-bold text-[13px] border-0 focus:outline-none focus:bg-blue-50/40 text-gray-950"
                      defaultValue={formatNumber(localData.depo?.anaKasaDevir)}
                      disabled={!isStaff}
                      onBlur={(e) => updateField('depo', 'anaKasaDevir', parseNumber(e.target.value))}
                    />
                  </div>
                </div>

                {/* Total Box in I31 */}
                <div className="grid grid-cols-[48%_52%] h-[28px]">
                  <div></div>
                  <div className="border-l-[1.5px] border-black h-full flex items-center justify-end pr-2 font-bold text-[13px] text-gray-950 bg-white">
                    {formatTotal(depoTotal)}
                  </div>
                </div>
              </div>

              {/* Bottom Right Grand Total: 512.422,00 (Row 33 in Excel) */}
              <div className="flex justify-end items-center pr-1 pt-1 font-bold text-[13.5px] text-gray-950 tracking-tight">
                {formatTotal(grandTotal)}
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
