import { useMemo, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Car,
  Plus,
  Search,
  Gauge,
  Fuel,
  CalendarDays,
  Upload,
  AlertTriangle,
  Clock,
  Pencil,
  ChevronDown,
  Coins,
} from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Modal } from "../../components/ui/Modal";
import { ModuleFileActions } from "../../components/ui/ModuleFileActions";
import { useToast } from "../../lib/toast";
import { useVehicles } from "./store";
import { VehicleRowMenu } from "./components/VehicleRowMenu";
import { BulkInspectionModalBody } from "./components/BulkInspectionModalBody";
import type { VehicleInput, VehicleExpenseInput } from "./types";
const money = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(
    n,
  );

const getDaysDiff = (dateStr?: string) => {
  if (!dateStr) return Infinity;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
};

const getMinDaysRemaining = (v: any) => {
  const dates = [v.insuranceDate, v.cascoDate, v.inspectionDate];
  const diffs = dates.map(d => getDaysDiff(d));
  return Math.min(...diffs);
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

const soon = (d?: string) => {
  const diff = getDaysDiff(d);
  return diff <= 30; // true if overdue or <= 30 days
};

function ExpiryDateCell({ vehicle, onSave }: { vehicle: any; onSave: (date: string) => void }) {
  const dateStr = vehicle.inspectionDate;
  const inputRef = useRef<HTMLInputElement>(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = dateStr ? new Date(dateStr) : null;
  if (due) {
    due.setHours(0, 0, 0, 0);
  }
  const diffDays = due ? Math.round((due.getTime() - today.getTime()) / 86400000) : null;

  const isOverdue = diffDays !== null && diffDays < 0;
  const isSoon = diffDays !== null && diffDays >= 0 && diffDays <= 10;

  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    inputRef.current?.showPicker();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSave(e.target.value);
  };

  const renderContent = () => {
    if (!dateStr) {
      return (
        <span className="text-gray-400 font-medium text-sm">—</span>
      );
    }
    if (isOverdue) {
      return (
        <div className="flex flex-col items-center justify-center gap-0.5 leading-tight">
          <div className="flex items-center gap-1">
            <AlertTriangle size={13} className="text-red-600 shrink-0" />
            <span className="font-bold text-red-700 text-sm">{formatDate(dateStr)}</span>
          </div>
          <span className="text-xs text-red-600 font-extrabold tracking-tight">({Math.abs(diffDays)} gün gecikti)</span>
        </div>
      );
    }
    if (isSoon) {
      return (
        <div className="flex flex-col items-center justify-center gap-0.5 leading-tight">
          <div className="flex items-center gap-1">
            <Clock size={13} className="text-amber-600 shrink-0" />
            <span className="font-bold text-amber-800 text-sm">{formatDate(dateStr)}</span>
          </div>
          {diffDays === 0 ? (
            <span className="text-xs text-amber-700 font-extrabold tracking-tight">(bugün)</span>
          ) : (
            <span className="text-xs text-amber-700 font-extrabold tracking-tight">({diffDays} gün kaldı)</span>
          )}
        </div>
      );
    }
    return (
      <span className="text-gray-700 font-medium text-sm">
        {formatDate(dateStr)}
      </span>
    );
  };

  return (
    <td className={`table-td text-center !px-2 !py-2 ${isOverdue ? 'bg-red-50/30' : isSoon ? 'bg-amber-50/30' : ''}`}>
      <div className="flex items-center justify-center gap-2 group min-h-[36px]">
        {renderContent()}
        <div className="relative flex items-center justify-center w-6 h-6">
          <button
            onClick={handleIconClick}
            className="p-1 text-gray-400 hover:text-brand-600 hover:bg-gray-100 rounded-md transition-colors"
            title="Muayene Tarihi Gir/Düzenle"
          >
            <CalendarDays size={14} />
          </button>
          <input
            ref={inputRef}
            type="date"
            className="absolute inset-0 opacity-0 w-0 h-0 pointer-events-none"
            value={dateStr || ""}
            onChange={handleInputChange}
          />
        </div>
      </div>
    </td>
  );
}

function InlineTextCell({
  value,
  displayValue,
  onSave,
  className = "",
  inputClassName = "",
  placeholder = "—"
}: {
  value: string;
  displayValue: React.ReactNode;
  onSave: (val: string) => void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [tempVal, setTempVal] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setTempVal(value);
    setEditing(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSave(tempVal);
      setEditing(false);
    } else if (e.key === "Escape") {
      setEditing(false);
    }
  };

  const handleBlur = () => {
    onSave(tempVal);
    setEditing(false);
  };

  if (editing) {
    return (
      <td className={`table-td !px-1.5 !py-2 ${className}`}>
        <input
          ref={inputRef}
          type="text"
          className={`input !py-1 !px-1.5 !text-sm w-full ${inputClassName}`}
          value={tempVal}
          onChange={(e) => setTempVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          autoFocus
        />
      </td>
    );
  }

  return (
    <td className={`table-td !px-1.5 !py-2.5 ${className}`}>
      <div className="flex items-center justify-between gap-1 group/item truncate">
        <span className="truncate">{displayValue || <span className="text-gray-400 font-medium">{placeholder}</span>}</span>
        <button
          onClick={startEdit}
          className="p-0.5 text-gray-400 hover:text-brand-600 hover:bg-gray-100 rounded opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0"
          title="Düzenle"
        >
          <Pencil size={11} />
        </button>
      </div>
    </td>
  );
}

function InlineDateCell({
  value,
  onSave,
  className = ""
}: {
  value?: string;
  onSave: (val: string) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    inputRef.current?.showPicker();
  };

  return (
    <td className={`table-td text-center !px-1.5 !py-2 ${className}`}>
      <div className="flex items-center justify-center gap-1.5 group min-h-[30px]">
        {value ? (
          <span className="text-gray-600 font-medium text-sm">{formatDate(value)}</span>
        ) : (
          <span className="text-gray-400 font-medium text-sm">—</span>
        )}
        <div className="relative flex items-center justify-center w-6 h-6">
          <button
            onClick={handleIconClick}
            className="p-1 text-gray-400 hover:text-brand-600 hover:bg-gray-100 rounded-md transition-colors"
            title="Tarih Düzenle"
          >
            <CalendarDays size={14} />
          </button>
          <input
            ref={inputRef}
            type="date"
            className="absolute inset-0 opacity-0 w-0 h-0 pointer-events-none"
            value={value || ""}
            onChange={(e) => onSave(e.target.value)}
          />
        </div>
      </div>
    </td>
  );
}

function K({ i, v, l }: { i: any; v: string; l: string }) {
  return (
    <div className="card p-4">
      <span className="text-gray-500">{i}</span>
      <p className="mt-3 text-xl font-semibold">{v}</p>
      <p className="text-xs text-gray-500">{l}</p>
    </div>
  );
}
export function VehicleListPage() {
  const nav = useNavigate();
  const { vehicles, expenses, saveVehicle } = useVehicles();
  const { notify } = useToast();
  const [q, setQ] = useState("");
  const [bulkInspectionOpen, setBulkInspectionOpen] = useState(false);
  const [bulkInspectionSubmitting, setBulkInspectionSubmitting] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<{ vehicleId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        setSortField(null);
        setSortOrder('asc');
      }
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortHeader = ({ label, field, className = "" }: { label: string; field: string; className?: string }) => {
    const active = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className={`table-th cursor-pointer select-none hover:bg-gray-100 hover:text-gray-950 transition-colors ${className}`}
      >
        <div className={`flex items-center gap-1.5 ${className.includes('text-right') ? 'justify-end' : className.includes('text-center') ? 'justify-center' : 'justify-start'}`}>
          <span>{label}</span>
          <span className={`text-[10px] ${active ? 'text-brand-600 font-bold' : 'text-gray-300'}`}>
            {active ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
          </span>
        </div>
      </th>
    );
  };

  const handleInlineSave = async (vehicle: any, field: string, value: string) => {
    const trimmed = value.trim();
    let finalValue: any = trimmed;
    if (field === "modelYear") {
      finalValue = parseInt(trimmed, 10);
      if (isNaN(finalValue)) {
        setEditingCell(null);
        return;
      }
    } else if (field === "currentKm") {
      finalValue = parseInt(trimmed, 10) || 0;
    } else if (trimmed === "" && (field.endsWith("Date") || field === "kaskoStartDate")) {
      finalValue = undefined;
    }

    if (finalValue === vehicle[field]) {
      setEditingCell(null);
      return;
    }
    try {
      const { id, ...input } = vehicle;
      await saveVehicle({ ...input, [field]: finalValue }, vehicle.id);
      notify("Değişiklik başarıyla kaydedildi.", "success");
    } catch (e: any) {
      notify(e.message || "Güncelleme başarısız oldu.", "error");
    } finally {
      setEditingCell(null);
    }
  };

  const list = useMemo(() => {
    return vehicles
      .filter((v) =>
        `${v.plate} ${v.brand} ${v.model} ${v.assignedTo}`
          .toLowerCase()
          .includes(q.toLowerCase()),
      )
      .sort((a, b) => {
        if (!sortField) {
          const daysA = getMinDaysRemaining(a);
          const daysB = getMinDaysRemaining(b);
          if (daysA === daysB) {
            return a.plate.localeCompare(b.plate, 'tr');
          }
          return daysA - daysB;
        }

        let valA: any = a[sortField as keyof typeof a];
        let valB: any = b[sortField as keyof typeof b];

        if (valA === undefined || valA === null) valA = '';
        if (valB === undefined || valB === null) valB = '';

        let cmp = 0;
        if (typeof valA === 'string') {
          cmp = valA.localeCompare(valB, 'tr', { sensitivity: 'base' });
        } else if (typeof valA === 'number') {
          cmp = valA - valB;
        }

        return sortOrder === 'asc' ? cmp : -cmp;
      });
  }, [vehicles, q, sortField, sortOrder]);

  const handleSaveInspectionDate = async (vehicle: any, newDate: string) => {
    try {
      const { id, ...input } = vehicle;
      await saveVehicle({ ...input, inspectionDate: newDate || undefined }, vehicle.id);
      notify(`${vehicle.plate} muayene tarihi güncellendi.`, "success");
    } catch (e: any) {
      notify(e.message || "Güncelleme başarısız oldu.", "error");
    }
  };

  const handleBulkInspectionSubmit = async (dates: Record<string, string>) => {
    setBulkInspectionSubmitting(true);
    try {
      for (const [vehicleId, newDate] of Object.entries(dates)) {
        const vehicle = vehicles.find((v: any) => v.id === vehicleId);
        if (vehicle && newDate) {
          const { id, ...input } = vehicle;
          await saveVehicle({ ...input, inspectionDate: newDate }, vehicleId);
        }
      }
      notify("Seçilen araçların muayene tarihleri başarıyla güncellendi.", "success");
      setBulkInspectionOpen(false);
    } catch (e: any) {
      notify(e.message || "Güncelleme başarısız oldu.", "error");
    } finally {
      setBulkInspectionSubmitting(false);
    }
  };
  return (
    <div className="mx-auto max-w-[1600px] px-4">
      <PageHeader
        title="Araç Yönetimi"
        description="Araç filosunu, yasal tarihleri, kilometreleri ve giderleri yönetin."
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                className="btn-secondary flex items-center gap-1.5"
                onClick={() => setActionsMenuOpen(!actionsMenuOpen)}
              >
                İşlemler
                <ChevronDown size={16} className={`transition-transform duration-200 ${actionsMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {actionsMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setActionsMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-100 bg-white p-1.5 shadow-lg ring-1 ring-black/5 z-20 flex flex-col gap-0.5">
                    <ModuleFileActions
                      module="vehicles"
                      exportName="arac-listesi"
                      variant="dropdown"
                      onActionClick={() => setActionsMenuOpen(false)}
                      rows={vehicles.map((v, idx) => ({
                        SAYI: idx + 1,
                        PLAKA: v.plate,
                        Marka: v.brand,
                        Model: v.modelYear,
                        "Trafik Sigortası": v.insuranceCompany || "—",
                        "Sigorta Geçerlilik Tarihi": v.insuranceDate || "—",
                        "Kasko Sigortası": v.kaskoCompany || "—",
                        "Kasko Başlangıç": v.kaskoStartDate || "—",
                        "Kasko Bitiş": v.cascoDate || "—",
                        "DAİNİ MÜRTEHİN": v.dainiMurtehin || "—",
                        "MUAYENE SON TARİHİ": v.inspectionDate || "—",
                        Durum: v.status
                      }))}
                    />
                    <button
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left transition-colors"
                      onClick={() => {
                        setBulkInspectionOpen(true);
                        setActionsMenuOpen(false);
                      }}
                    >
                      <CalendarDays size={14} className="text-gray-400" /> Muayene Yapıldı Gir
                    </button>
                  </div>
                </>
              )}
            </div>
            
            <button className="btn-primary" onClick={() => nav("/arac-yonetimi/yeni")}>
              <Plus size={16} /> Yeni Araç
            </button>
          </div>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <K i={<Car size={16} />} v={String(vehicles.length)} l="Toplam Araç" />
        <K
          i={<Gauge size={16} />}
          v={String(vehicles.filter((v) => v.status === "aktif").length)}
          l="Aktif Araç"
        />
        <K
          i={<CalendarDays size={16} />}
          v={String(
            vehicles.filter(
              (v) => soon(v.inspectionDate) || soon(v.insuranceDate) || soon(v.cascoDate),
            ).length,
          )}
          l="Yaklaşan Belge"
        />
        <K
          i={<Fuel size={16} />}
          v={money(expenses.reduce((s, e) => s + e.amount, 0))}
          l="Toplam Gider"
        />
      </div>
      <div className="relative mb-4 max-w-md">
        <Search size={16} className="absolute left-3 top-3 text-gray-400" />
        <input
          className="input pl-9"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Plaka, marka, model veya personel ara..."
        />
      </div>
      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="table-th !text-center !px-1.5 w-10">SAYI</th>
              <SortHeader label="PLAKA" field="plate" className="w-24 whitespace-nowrap" />
              <SortHeader label="MARKA" field="brand" className="w-48 text-left" />
              <SortHeader label="MODEL" field="modelYear" className="!text-center !px-1.5 w-16" />
              <SortHeader label="TRAFİK SİGORTASI" field="insuranceCompany" className="w-32 text-left" />
              <SortHeader label="SİGORTA GEÇERLİLİK TARİHİ" field="insuranceDate" className="!text-center !px-1.5 w-28 whitespace-normal leading-tight" />
              <SortHeader label="KASKO SİGORTASI" field="kaskoCompany" className="w-32 text-left" />
              <SortHeader label="KASKO BAŞLANGIÇ" field="kaskoStartDate" className="!text-center !px-1.5 w-24 whitespace-normal leading-tight" />
              <SortHeader label="KASKO BİTİŞ" field="cascoDate" className="!text-center !px-1.5 w-28 whitespace-normal leading-tight" />
              <SortHeader label="DAİNİ MÜRTEHİN" field="dainiMurtehin" className="w-32 text-left" />
              <SortHeader label="MUAYENE SON TARİHİ" field="inspectionDate" className="!text-center !px-2 w-44 whitespace-nowrap" />
              <th className="table-th !px-1 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {list.map((v, idx) => (
              <tr key={v.id} className="border-t hover:bg-gray-50/50 transition-colors">
                <td className="table-td text-center font-medium text-gray-400 !px-1.5 !py-2.5">{idx + 1}</td>
                <td className="table-td font-bold text-brand-600 w-24 whitespace-nowrap !px-1.5 !py-2.5">
                  {editingCell && editingCell.vehicleId === v.id && editingCell.field === "plate" ? (
                    <input
                      type="text"
                      className="input !py-1 !px-1.5 !text-sm max-w-[100px] text-center"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleInlineSave(v, "plate", editValue);
                        else if (e.key === "Escape") setEditingCell(null);
                      }}
                      onBlur={() => handleInlineSave(v, "plate", editValue)}
                      autoFocus
                    />
                  ) : (
                    <div className="flex items-center justify-between gap-1 group/item">
                      <button
                        onClick={() => nav(`/arac-yonetimi/${v.id}`)}
                        className="hover:underline"
                      >
                        {v.plate}
                      </button>
                      <button
                        onClick={() => {
                          setEditingCell({ vehicleId: v.id, field: "plate" });
                          setEditValue(v.plate);
                        }}
                        className="p-0.5 text-gray-400 hover:text-brand-600 hover:bg-gray-100 rounded opacity-0 group-hover/item:opacity-100 transition-opacity"
                        title="Plakayı Düzenle"
                      >
                        <Pencil size={11} />
                      </button>
                    </div>
                  )}
                </td>
                <td className="table-td font-semibold text-gray-900 max-w-[200px] !px-1.5 !py-2.5" title={v.brand}>
                  {editingCell && editingCell.vehicleId === v.id && editingCell.field === "brand" ? (
                    <input
                      type="text"
                      className="input !py-1 !px-1.5 !text-sm w-full"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleInlineSave(v, "brand", editValue);
                        else if (e.key === "Escape") setEditingCell(null);
                      }}
                      onBlur={() => handleInlineSave(v, "brand", editValue)}
                      autoFocus
                    />
                  ) : (
                    <div className="flex items-center justify-between gap-1 group/item truncate">
                      <span className="truncate">{v.brand}</span>
                      <button
                        onClick={() => {
                          setEditingCell({ vehicleId: v.id, field: "brand" });
                          setEditValue(v.brand);
                        }}
                        className="p-0.5 text-gray-400 hover:text-brand-600 hover:bg-gray-100 rounded opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0"
                        title="Markayı Düzenle"
                      >
                        <Pencil size={11} />
                      </button>
                    </div>
                  )}
                </td>
                <InlineTextCell
                  value={String(v.modelYear)}
                  displayValue={v.modelYear}
                  onSave={(val) => handleInlineSave(v, "modelYear", val)}
                  className="text-center font-medium text-gray-600 w-16"
                  inputClassName="text-center max-w-[60px]"
                />
                <InlineTextCell
                  value={v.insuranceCompany || ""}
                  displayValue={v.insuranceCompany}
                  onSave={(val) => handleInlineSave(v, "insuranceCompany", val)}
                  className="text-gray-600 max-w-[120px]"
                />
                <InlineDateCell
                  value={v.insuranceDate}
                  onSave={(val) => handleInlineSave(v, "insuranceDate", val)}
                  className="w-28"
                />
                <InlineTextCell
                  value={v.kaskoCompany || ""}
                  displayValue={v.kaskoCompany}
                  onSave={(val) => handleInlineSave(v, "kaskoCompany", val)}
                  className="text-gray-600 max-w-[120px]"
                />
                <InlineDateCell
                  value={v.kaskoStartDate}
                  onSave={(val) => handleInlineSave(v, "kaskoStartDate", val)}
                  className="w-24"
                />
                <InlineDateCell
                  value={v.cascoDate}
                  onSave={(val) => handleInlineSave(v, "cascoDate", val)}
                  className="w-28"
                />
                <InlineTextCell
                  value={v.dainiMurtehin || ""}
                  displayValue={v.dainiMurtehin}
                  onSave={(val) => handleInlineSave(v, "dainiMurtehin", val)}
                  className="text-gray-600 max-w-[120px]"
                />
                <ExpiryDateCell vehicle={v} onSave={(date) => handleSaveInspectionDate(v, date)} />
                <td className="table-td text-center !px-1 !py-2.5">
                  <VehicleRowMenu vehicle={v} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && (
          <p className="py-12 text-center text-sm text-gray-400">
            Araç bulunamadı.
          </p>
        )}
      </div>

      {/* Bulk Inspection Modal */}
      <Modal
        open={bulkInspectionOpen}
        onClose={() => { if (!bulkInspectionSubmitting) setBulkInspectionOpen(false); }}
        title="Toplu Muayene Girişi Yap"
        description="Seçtiğiniz araçların yeni Muayene Son Tarihlerini toplu olarak güncelleyin."
        size="lg"
      >
        <BulkInspectionModalBody
          vehicles={vehicles}
          submitting={bulkInspectionSubmitting}
          onSubmit={handleBulkInspectionSubmit}
        />
      </Modal>
    </div>
  );
}
export function VehicleFormPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { getVehicle, saveVehicle } = useVehicles();
  const { notify } = useToast();
  const v = id ? getVehicle(id) : undefined;
  const [x, setX] = useState<VehicleInput>({
    plate: v?.plate ?? "",
    brand: v?.brand ?? "",
    model: v?.model ?? "",
    modelYear: v?.modelYear ?? new Date().getFullYear(),
    vehicleType: v?.vehicleType ?? "otomobil",
    fuelType: v?.fuelType ?? "dizel",
    currentKm: v?.currentKm ?? 0,
    assignedTo: v?.assignedTo ?? "",
    department: v?.department ?? "",
    purchaseDate: v?.purchaseDate,
    inspectionDate: v?.inspectionDate,
    insuranceDate: v?.insuranceDate,
    cascoDate: v?.cascoDate,
    status: v?.status ?? "aktif",
    description: v?.description,
    insuranceCompany: v?.insuranceCompany ?? "",
    kaskoCompany: v?.kaskoCompany ?? "",
    kaskoStartDate: v?.kaskoStartDate ?? "",
    dainiMurtehin: v?.dainiMurtehin ?? "",
    purchasePrice: v?.purchasePrice ?? 0,
    currentPrice: v?.currentPrice ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, val: any) => setX({ ...x, [k]: val });
  const text = [
    ["Plaka", "plate"],
    ["Marka", "brand"],
    ["Sigorta Bitiş", "insuranceDate"],
    ["Muayene Bitiş", "inspectionDate"],
  ];
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={v ? "Aracı Düzenle" : "Yeni Araç"}
        backTo="/arac-yonetimi"
      />
      <div className="card grid gap-4 p-6 sm:grid-cols-2">
        {text.map(([l, k]) => (
          <label key={k}>
            <span className="label">{l}</span>
            <input
              type={k === "inspectionDate" || k === "insuranceDate" ? "date" : "text"}
              className="input"
              value={(x as any)[k] ?? ""}
              onChange={(e) => set(k, e.target.value)}
            />
          </label>
        ))}
        <label>
          <span className="label">Model Yılı</span>
          <input
            type="number"
            className="input"
            value={x.modelYear}
            onChange={(e) => set("modelYear", Number(e.target.value))}
          />
        </label>
        <label>
          <span className="label">Kilometre</span>
          <input
            type="number"
            className="input"
            value={x.currentKm}
            onChange={(e) => set("currentKm", Number(e.target.value))}
          />
        </label>
        <label>
          <span className="label">Araç Türü</span>
          <select
            className="input"
            value={x.vehicleType}
            onChange={(e) => set("vehicleType", e.target.value)}
          >
            <option>otomobil</option>
            <option>kamyonet</option>
            <option>kamyon</option>
            <option>motosiklet</option>
          </select>
        </label>
        <label>
          <span className="label">Yakıt</span>
          <select
            className="input"
            value={x.fuelType}
            onChange={(e) => set("fuelType", e.target.value)}
          >
            <option>dizel</option>
            <option>benzin</option>
            <option>hibrit</option>
            <option>elektrik</option>
            <option>lpg</option>
          </select>
        </label>
        {[
          ["Satın Alma Tarihi", "purchaseDate"],
          ["Kasko Başlangıç", "kaskoStartDate"],
          ["Kasko Bitiş", "cascoDate"],
        ].map(([l, k]) => (
          <label key={k}>
            <span className="label">{l}</span>
            <input
              type="date"
              className="input"
              value={(x as any)[k] ?? ""}
              onChange={(e) => set(k, e.target.value)}
            />
          </label>
        ))}
        {[
          ["Trafik Sigortası", "insuranceCompany"],
          ["Kasko Sigortası", "kaskoCompany"],
          ["DAİNİ MÜRTEHİN", "dainiMurtehin"],
        ].map(([l, k]) => (
          <label key={k}>
            <span className="label">{l}</span>
            <input
              className="input"
              value={(x as any)[k] ?? ""}
              onChange={(e) => set(k, e.target.value)}
            />
          </label>
        ))}
        <label>
          <span className="label">Alış Fiyatı</span>
          <input
            type="number"
            className="input"
            value={x.purchasePrice || ""}
            onChange={(e) => set("purchasePrice", Number(e.target.value) || 0)}
          />
        </label>
        <label>
          <span className="label">Güncel Fiyatı</span>
          <input
            type="number"
            className="input"
            value={x.currentPrice || ""}
            onChange={(e) => set("currentPrice", Number(e.target.value) || 0)}
          />
        </label>
        <label>
          <span className="label">Durum</span>
          <select
            className="input"
            value={x.status}
            onChange={(e) => set("status", e.target.value)}
          >
            <option value="aktif">Aktif</option>
            <option value="bakimda">Bakımda</option>
            <option value="pasif">Pasif</option>
            <option value="satildi">Satıldı</option>
          </select>
        </label>
        <label className="sm:col-span-2">
          <span className="label">Açıklama</span>
          <textarea
            className="input"
            value={x.description ?? ""}
            onChange={(e) => set("description", e.target.value)}
          />
        </label>
        <div className="sm:col-span-2 flex justify-end">
          <button
            className="btn-primary"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await saveVehicle(x, id);
                notify("Araç kaydedildi.", "success");
                nav("/arac-yonetimi");
              } catch (e) {
                notify(
                  e instanceof Error ? e.message : "Kaydedilemedi",
                  "error",
                );
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
export function VehicleDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { getVehicle, getExpenses, addExpense } = useVehicles();
  const { notify } = useToast();
  const v = id ? getVehicle(id) : undefined;
  const [open, setOpen] = useState(false);
  const [e, setE] = useState<VehicleExpenseInput>({
    vehicleId: id ?? "",
    date: new Date().toISOString().slice(0, 10),
    type: "yakit",
    amount: 0,
    supplier: "",
    description: "",
  });
  const expenses = useMemo(
    () => (id ? getExpenses(id) : []),
    [id, getExpenses],
  );
  if (!v) return <p>Araç yükleniyor...</p>;
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={v.plate}
        description={`${v.brand} ${v.model} · ${v.modelYear}`}
        backTo="/arac-yonetimi"
        actions={
          <>
            <button
              className="btn-secondary"
              onClick={() => nav(`/arac-yonetimi/${v.id}/duzenle`)}
            >
              Düzenle
            </button>
            <button className="btn-primary" onClick={() => setOpen(true)}>
              <Plus size={16} />
              Gider Ekle
            </button>
          </>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <K
          i={<Gauge size={16} />}
          v={`${v.currentKm.toLocaleString("tr-TR")} km`}
          l="Kilometre"
        />
        <K i={<Fuel size={16} />} v={v.fuelType} l="Yakıt" />
        <K
          i={<CalendarDays size={16} />}
          v={v.inspectionDate || "—"}
          l="Muayene"
        />
        <K
          i={<Car size={16} />}
          v={money(expenses.reduce((s, x) => s + x.amount, 0))}
          l="Toplam Gider"
        />
      </div>
      <div className="card overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="table-th">Tarih</th>
              <th className="table-th">Tür</th>
              <th className="table-th">Tedarikçi</th>
              <th className="table-th">KM</th>
              <th className="table-th">Açıklama</th>
              <th className="table-th">Tutar</th>
              <th className="table-th">Belge</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((x) => (
              <tr key={x.id} className="border-t">
                <td className="table-td">{x.date}</td>
                <td className="table-td capitalize">{x.type}</td>
                <td className="table-td">{x.supplier}</td>
                <td className="table-td">
                  {x.km?.toLocaleString("tr-TR") || "—"}
                </td>
                <td className="table-td">{x.description}</td>
                <td className="table-td font-semibold">{money(x.amount)}</td>
                <td className="table-td">{x.hasDocument ? "Var" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Araç Gideri Ekle"
      >
        <div className="space-y-3">
          <input
            type="date"
            className="input"
            value={e.date}
            onChange={(x) => setE({ ...e, date: x.target.value })}
          />
          <select
            className="input"
            value={e.type}
            onChange={(x) => setE({ ...e, type: x.target.value })}
          >
            {[
              "yakit",
              "bakim",
              "onarim",
              "sigorta",
              "kasko",
              "muayene",
              "vergi",
              "otopark",
              "diger",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <input
            type="number"
            className="input"
            placeholder="Tutar"
            onChange={(x) => setE({ ...e, amount: Number(x.target.value) })}
          />
          <input
            type="number"
            className="input"
            placeholder="Kilometre"
            onChange={(x) => setE({ ...e, km: Number(x.target.value) })}
          />
          <input
            className="input"
            placeholder="Tedarikçi"
            onChange={(x) => setE({ ...e, supplier: x.target.value })}
          />
          <textarea
            className="input"
            placeholder="Açıklama"
            onChange={(x) => setE({ ...e, description: x.target.value })}
          />
          <label className="btn-secondary cursor-pointer">
            <Upload size={16} />
            Belge
            <input
              hidden
              type="file"
              accept=".pdf,.xls,.xlsx,image/*"
              onChange={(x) => setE({ ...e, file: x.target.files?.[0] })}
            />
          </label>
          <button
            className="btn-primary w-full"
            onClick={async () => {
              try {
                await addExpense(e);
                notify("Gider eklendi.", "success");
                setOpen(false);
              } catch (x) {
                notify(x instanceof Error ? x.message : "Eklenemedi", "error");
              }
            }}
          >
            Kaydet
          </button>
        </div>
      </Modal>
    </div>
  );
}

const formatNumberString = (str: string) => {
  const clean = str.replace(/\D/g, '');
  if (!clean) return '';
  return Number(clean).toLocaleString('tr-TR');
};

function InlineNumberCell({
  value,
  displayValue,
  onSave,
  className = "",
  inputClassName = ""
}: {
  value: number;
  displayValue: React.ReactNode;
  onSave: (val: number) => void;
  className?: string;
  inputClassName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [tempVal, setTempVal] = useState(String(value));

  const startEdit = () => {
    setTempVal(formatNumberString(String(value)));
    setEditing(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      const num = parseInt(tempVal.replace(/\./g, ''), 10) || 0;
      onSave(num);
      setEditing(false);
    } else if (e.key === "Escape") {
      setEditing(false);
    }
  };

  const handleBlur = () => {
    const num = parseInt(tempVal.replace(/\./g, ''), 10) || 0;
    onSave(num);
    setEditing(false);
  };

  if (editing) {
    return (
      <td className={`table-td !px-1.5 !py-2 ${className}`}>
        <input
          type="text"
          className={`input !py-1 !px-1.5 !text-sm w-full ${inputClassName}`}
          value={tempVal}
          onChange={(e) => setTempVal(formatNumberString(e.target.value))}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          autoFocus
        />
      </td>
    );
  }

  return (
    <td className={`table-td !px-1.5 !py-2.5 ${className}`}>
      <div className="flex items-center justify-end gap-1 group/item truncate">
        <span className="truncate">{displayValue}</span>
        <button
          onClick={startEdit}
          className="p-0.5 text-gray-400 hover:text-brand-600 hover:bg-gray-100 rounded opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0"
          title="Düzenle"
        >
          <Pencil size={11} />
        </button>
      </div>
    </td>
  );
}

export function VehiclePricesPage() {
  const nav = useNavigate();
  const { vehicles, saveVehicle } = useVehicles();
  const { notify } = useToast();
  const [q, setQ] = useState("");
  const [sortField, setSortField] = useState<'plate' | 'modelYear' | 'purchasePrice' | 'currentPrice'>('plate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: 'plate' | 'modelYear' | 'purchasePrice' | 'currentPrice') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleInlineSave = async (vehicle: any, field: string, value: string) => {
    const trimmed = value.trim();
    let finalValue: any = trimmed;
    if (field === "modelYear") {
      finalValue = parseInt(trimmed, 10);
      if (isNaN(finalValue)) {
        return;
      }
    } else if (field === "currentKm") {
      finalValue = parseInt(trimmed, 10) || 0;
    } else if (trimmed === "" && (field.endsWith("Date") || field === "kaskoStartDate")) {
      finalValue = undefined;
    }

    if (finalValue === vehicle[field]) {
      return;
    }
    try {
      const { id, ...input } = vehicle;
      await saveVehicle({ ...input, [field]: finalValue }, vehicle.id);
      notify("Değişiklik başarıyla kaydedildi.", "success");
    } catch (e: any) {
      notify(e.message || "Güncelleme başarısız oldu.", "error");
    }
  };

  const handleSaveNumber = async (vehicle: any, field: string, val: number) => {
    try {
      const { id, ...input } = vehicle;
      await saveVehicle({ ...input, [field]: val }, vehicle.id);
      notify("Fiyat bilgisi güncellendi.", "success");
    } catch (e: any) {
      notify(e.message || "Güncelleme başarısız oldu.", "error");
    }
  };

  const list = useMemo(() => {
    return vehicles
      .filter((v) =>
        `${v.plate} ${v.brand} ${v.model} ${v.assignedTo}`
          .toLowerCase()
          .includes(q.toLowerCase()),
      )
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        // Handle undefined or null
        if (valA === undefined || valA === null) valA = sortField === 'plate' ? '' : 0;
        if (valB === undefined || valB === null) valB = sortField === 'plate' ? '' : 0;

        let cmp = 0;
        if (typeof valA === 'string') {
          cmp = valA.localeCompare(valB, 'tr');
        } else {
          cmp = valA - valB;
        }

        return sortOrder === 'asc' ? cmp : -cmp;
      });
  }, [vehicles, q, sortField, sortOrder]);

  const stats = useMemo(() => {
    let totalPurchase = 0;
    let totalCurrent = 0;
    list.forEach(v => {
      totalPurchase += v.purchasePrice || 0;
      totalCurrent += v.currentPrice || 0;
    });
    return { totalPurchase, totalCurrent };
  }, [list]);

  const SortHeader = ({ label, field, className = "" }: { label: string; field: typeof sortField; className?: string }) => {
    const active = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className={`table-th cursor-pointer select-none hover:bg-gray-100 hover:text-gray-950 transition-colors ${className}`}
      >
        <div className={`flex items-center gap-1.5 ${className.includes('text-right') ? 'justify-end' : className.includes('text-center') ? 'justify-center' : 'justify-start'}`}>
          <span>{label}</span>
          <span className={`text-[10px] ${active ? 'text-brand-600 font-bold' : 'text-gray-300'}`}>
            {active ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
          </span>
        </div>
      </th>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Araç Fiyat Listesi"
        description="Araçların alış fiyatlarını ve güncel piyasa değerlerini takip edin."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <K i={<Car size={16} />} v={String(list.length)} l="Toplam Araç" />
        <K
          i={<Gauge size={16} />}
          v={String(list.filter((v) => v.status === "aktif").length)}
          l="Aktif Araç"
        />
        <K
          i={<Coins size={16} />}
          v={money(stats.totalPurchase)}
          l="Toplam Alış Değeri"
        />
        <K
          i={<Coins size={16} />}
          v={money(stats.totalCurrent)}
          l="Toplam Güncel Değer"
        />
      </div>

      <div className="relative mb-4 max-w-md">
        <Search size={16} className="absolute left-3 top-3 text-gray-400" />
        <input
          className="input pl-9"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Plaka, marka, model veya personel ara..."
        />
      </div>

      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="table-th !text-center !px-1.5 w-10">SAYI</th>
              <SortHeader label="PLAKA" field="plate" className="w-28 whitespace-nowrap" />
              <th className="table-th !px-1.5 w-48 text-left">Marka</th>
              <SortHeader label="Model" field="modelYear" className="!text-center !px-1.5 w-16" />
              <SortHeader label="Alış Fiyatı" field="purchasePrice" className="!text-right !px-1.5 w-36" />
              <SortHeader label="Güncel Fiyatı" field="currentPrice" className="!text-right !px-1.5 w-36" />
              <th className="table-th !px-1.5 w-48 text-left">DAİNİ MÜRTEHİN</th>
              <th className="table-th !px-1 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {list.map((v, idx) => (
              <tr key={v.id} className="border-t hover:bg-gray-50/50 transition-colors">
                <td className="table-td text-center font-medium text-gray-400 !px-1.5 !py-2.5">{idx + 1}</td>
                <td className="table-td font-bold text-brand-600 w-24 whitespace-nowrap !px-1.5 !py-2.5">
                  <div className="flex items-center justify-between gap-1 group/item">
                    <button
                      onClick={() => nav(`/arac-yonetimi/${v.id}`)}
                      className="hover:underline"
                    >
                      {v.plate}
                    </button>
                  </div>
                </td>
                <td className="table-td font-semibold text-gray-900 max-w-[200px] !px-1.5 !py-2.5" title={v.brand}>
                  {v.brand} {v.model}
                </td>
                <td className="table-td text-center font-medium text-gray-600 w-16">
                  {v.modelYear}
                </td>
                <InlineNumberCell
                  value={v.purchasePrice || 0}
                  displayValue={v.purchasePrice ? money(v.purchasePrice) : "—"}
                  onSave={(val) => handleSaveNumber(v, "purchasePrice", val)}
                  className="text-right font-semibold text-gray-800"
                />
                <InlineNumberCell
                  value={v.currentPrice || 0}
                  displayValue={v.currentPrice ? money(v.currentPrice) : "—"}
                  onSave={(val) => handleSaveNumber(v, "currentPrice", val)}
                  className="text-right font-bold text-brand-600"
                />
                <InlineTextCell
                  value={v.dainiMurtehin || ""}
                  displayValue={v.dainiMurtehin}
                  onSave={(val) => handleInlineSave(v, "dainiMurtehin", val)}
                  className="text-gray-600 w-48 text-left"
                />
                <td className="table-td text-center !px-1 !py-2.5">
                  <VehicleRowMenu vehicle={v} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
