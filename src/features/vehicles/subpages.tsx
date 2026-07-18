import { useState } from "react";
import { Plus, Search, Trash2, Upload, Users } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { ModuleFileActions } from "../../components/ui/ModuleFileActions";
import { useToast } from "../../lib/toast";
import { useVehicles } from "./store";
import type { DriverInput, TrafficFineInput } from "./types";
const money = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(
    n,
  );
const status: any = {
  aktif: "bg-emerald-50 text-emerald-700",
  izinli: "bg-amber-50 text-amber-700",
  pasif: "bg-gray-100 text-gray-600",
  odenmedi: "bg-red-50 text-red-700",
  odendi: "bg-emerald-50 text-emerald-700",
  itiraz: "bg-amber-50 text-amber-700",
};
export function DriversPage() {
  const { drivers, vehicles, saveDriver, deleteDriver } = useVehicles();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [x, setX] = useState<DriverInput>({
    fullName: "",
    phone: "",
    email: "",
    identityNumber: "",
    licenseClass: "B",
    licenseNumber: "",
    status: "aktif",
  });
  const list = drivers.filter((d) =>
    `${d.fullName} ${d.phone} ${d.licenseNumber}`
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Şoförler"
        description="Şoför bilgilerini, ehliyet sürelerini ve araç atamalarını yönetin."
        actions={<><ModuleFileActions module="drivers" exportName="soforler" rows={drivers.map(d=>({"Ad Soyad":d.fullName,Telefon:d.phone,"E-posta":d.email,"Ehliyet Sınıfı":d.licenseClass,"Ehliyet No":d.licenseNumber,"Ehliyet Bitiş":d.licenseExpiryDate,"Atanan Araç":vehicles.find(v=>v.id===d.assignedVehicleId)?.plate,Durum:d.status}))}/><button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} />Yeni Şoför</button></>}
      />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <K v={String(drivers.length)} l="Toplam Şoför" />
        <K
          v={String(drivers.filter((d) => d.status === "aktif").length)}
          l="Aktif Şoför"
        />
        <K
          v={String(drivers.filter((d) => d.assignedVehicleId).length)}
          l="Araca Atanmış"
        />
      </div>
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-3 text-gray-400" size={16} />
        <input
          className="input pl-9"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Şoför, telefon veya ehliyet ara..."
        />
      </div>
      <div className="card overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="table-th">Şoför</th>
              <th className="table-th">İletişim</th>
              <th className="table-th">Ehliyet</th>
              <th className="table-th">Bitiş</th>
              <th className="table-th">Atanan Araç</th>
              <th className="table-th">Durum</th>
              <th className="table-th"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((d) => (
              <tr className="border-t" key={d.id}>
                <td className="table-td font-semibold">{d.fullName}</td>
                <td className="table-td">
                  {d.phone}
                  <span className="block text-xs text-gray-400">{d.email}</span>
                </td>
                <td className="table-td">
                  {d.licenseClass} · {d.licenseNumber}
                </td>
                <td className="table-td">{d.licenseExpiryDate || "—"}</td>
                <td className="table-td">
                  {vehicles.find((v) => v.id === d.assignedVehicleId)?.plate ||
                    "—"}
                </td>
                <td className="table-td">
                  <Badge className={status[d.status]}>{d.status}</Badge>
                </td>
                <td className="table-td">
                  <button
                    className="text-red-500"
                    onClick={async () => {
                      if (confirm("Şoför silinsin mi?"))
                        try {
                          await deleteDriver(d.id);
                        } catch (e) {
                          notify(
                            e instanceof Error ? e.message : "Silinemedi",
                            "error",
                          );
                        }
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Yeni Şoför">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["Ad Soyad", "fullName"],
            ["Telefon", "phone"],
            ["E-posta", "email"],
            ["T.C. Kimlik No", "identityNumber"],
            ["Ehliyet Sınıfı", "licenseClass"],
            ["Ehliyet No", "licenseNumber"],
          ].map(([l, k]) => (
            <label key={k}>
              <span className="label">{l}</span>
              <input
                className="input"
                value={(x as any)[k] ?? ""}
                onChange={(e) => setX({ ...x, [k]: e.target.value })}
              />
            </label>
          ))}
          <label>
            <span className="label">Ehliyet Bitiş</span>
            <input
              type="date"
              className="input"
              onChange={(e) =>
                setX({ ...x, licenseExpiryDate: e.target.value })
              }
            />
          </label>
          <label>
            <span className="label">Araç Ataması</span>
            <select
              className="input"
              onChange={(e) =>
                setX({ ...x, assignedVehicleId: e.target.value || undefined })
              }
            >
              <option value="">Atama yok</option>
              {vehicles.map((v) => (
                <option value={v.id} key={v.id}>
                  {v.plate}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Durum</span>
            <select
              className="input"
              value={x.status}
              onChange={(e) => setX({ ...x, status: e.target.value as any })}
            >
              <option value="aktif">Aktif</option>
              <option value="izinli">İzinli</option>
              <option value="pasif">Pasif</option>
            </select>
          </label>
          <button
            className="btn-primary sm:col-span-2"
            onClick={async () => {
              try {
                await saveDriver(x);
                notify("Şoför eklendi.", "success");
                setOpen(false);
              } catch (e) {
                notify(e instanceof Error ? e.message : "Eklenemedi", "error");
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
export function TrafficFinesPage() {
  const { fines, vehicles, drivers, saveFine, updateFineStatus } =
    useVehicles();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [x, setX] = useState<TrafficFineInput>({
    vehicleId: "",
    fineDate: new Date().toISOString().slice(0, 10),
    fineNumber: "",
    violationType: "",
    location: "",
    amount: 0,
    paymentStatus: "odenmedi",
  });
  const unpaid = fines
    .filter((f) => f.paymentStatus === "odenmedi")
    .reduce((s, f) => s + f.amount, 0);
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Trafik Cezaları"
        description="Araç ve şoför bazında trafik cezalarını ve ödeme durumlarını takip edin."
        actions={<><ModuleFileActions module="traffic_fines" exportName="trafik-cezalari" rows={fines.map(f=>({Tarih:f.fineDate,Araç:vehicles.find(v=>v.id===f.vehicleId)?.plate,Şoför:drivers.find(d=>d.id===f.driverId)?.fullName,"Ceza No":f.fineNumber,İhlal:f.violationType,Konum:f.location,Tutar:f.amount,Durum:f.paymentStatus}))}/><button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} />Ceza Ekle</button></>}
      />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <K v={String(fines.length)} l="Toplam Ceza" />
        <K v={money(unpaid)} l="Ödenmemiş Tutar" />
        <K
          v={String(fines.filter((f) => f.paymentStatus === "itiraz").length)}
          l="İtirazdaki Ceza"
        />
      </div>
      <div className="card overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="table-th">Tarih</th>
              <th className="table-th">Araç</th>
              <th className="table-th">Şoför</th>
              <th className="table-th">İhlal</th>
              <th className="table-th">Tutar</th>
              <th className="table-th">Durum</th>
              <th className="table-th">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {fines.map((f) => (
              <tr className="border-t" key={f.id}>
                <td className="table-td">{f.fineDate}</td>
                <td className="table-td font-semibold">
                  {vehicles.find((v) => v.id === f.vehicleId)?.plate || "—"}
                </td>
                <td className="table-td">
                  {drivers.find((d) => d.id === f.driverId)?.fullName || "—"}
                </td>
                <td className="table-td">
                  {f.violationType}
                  <span className="block text-xs text-gray-400">
                    {f.location}
                  </span>
                </td>
                <td className="table-td font-semibold">{money(f.amount)}</td>
                <td className="table-td">
                  <Badge className={status[f.paymentStatus]}>
                    {f.paymentStatus}
                  </Badge>
                </td>
                <td className="table-td">
                  <select
                    className="input !py-1"
                    value={f.paymentStatus}
                    onChange={async (e) => {
                      try {
                        await updateFineStatus(f.id, e.target.value as any);
                      } catch (x) {
                        notify(
                          x instanceof Error ? x.message : "Güncellenemedi",
                          "error",
                        );
                      }
                    }}
                  >
                    <option value="odenmedi">Ödenmedi</option>
                    <option value="odendi">Ödendi</option>
                    <option value="itiraz">İtiraz</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Trafik Cezası Ekle"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="label">Araç</span>
            <select
              className="input"
              value={x.vehicleId}
              onChange={(e) => setX({ ...x, vehicleId: e.target.value })}
            >
              <option value="">Seçin</option>
              {vehicles.map((v) => (
                <option value={v.id} key={v.id}>
                  {v.plate}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Şoför</span>
            <select
              className="input"
              onChange={(e) =>
                setX({ ...x, driverId: e.target.value || undefined })
              }
            >
              <option value="">Bilinmiyor</option>
              {drivers.map((d) => (
                <option value={d.id} key={d.id}>
                  {d.fullName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Ceza Tarihi</span>
            <input
              type="date"
              className="input"
              value={x.fineDate}
              onChange={(e) => setX({ ...x, fineDate: e.target.value })}
            />
          </label>
          <label>
            <span className="label">Ceza No</span>
            <input
              className="input"
              onChange={(e) => setX({ ...x, fineNumber: e.target.value })}
            />
          </label>
          <label>
            <span className="label">İhlal Türü</span>
            <input
              className="input"
              onChange={(e) => setX({ ...x, violationType: e.target.value })}
            />
          </label>
          <label>
            <span className="label">Konum</span>
            <input
              className="input"
              onChange={(e) => setX({ ...x, location: e.target.value })}
            />
          </label>
          <label>
            <span className="label">Tutar</span>
            <input
              type="number"
              className="input"
              onChange={(e) => setX({ ...x, amount: Number(e.target.value) })}
            />
          </label>
          <label className="btn-secondary cursor-pointer self-end">
            <Upload size={16} />
            Ceza Belgesi
            <input
              hidden
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setX({ ...x, file: e.target.files?.[0] })}
            />
          </label>
          <button
            className="btn-primary sm:col-span-2"
            onClick={async () => {
              try {
                await saveFine(x);
                notify("Ceza eklendi.", "success");
                setOpen(false);
              } catch (e) {
                notify(e instanceof Error ? e.message : "Eklenemedi", "error");
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
function K({ v, l }: { v: string; l: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-gray-400">
        <Users size={15} />
        <span className="text-xs">{l}</span>
      </div>
      <p className="mt-2 text-xl font-semibold">{v}</p>
    </div>
  );
}
