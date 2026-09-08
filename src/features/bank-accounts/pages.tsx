import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Building2,
  Plus,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
  Upload,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
} from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { ModuleFileActions } from "../../components/ui/ModuleFileActions";
import { useToast } from "../../lib/toast";
import { useBankAccounts } from "./store";
import type { BankAccountInput, BankTransactionInput } from "./types";
const money = (n: number, c = "TRY") =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: c,
    maximumFractionDigits: 2,
  }).format(n);
const formatIban = (iban?: string) => {
  if (!iban) return "-";
  const clean = iban.replace(/\s+/g, "");
  return clean.replace(/(.{4})/g, "$1 ").trim();
};
const statusCls: any = {
  aktif: "bg-emerald-50 text-emerald-700",
  pasif: "bg-gray-100 text-gray-600",
  bloke: "bg-red-50 text-red-700",
};
export function BankAccountListPage() {
  const nav = useNavigate();
  const { accounts, deleteAccount, saveAccount } = useBankAccounts();
  const { notify } = useToast();
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<string>("bank");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [quickEditAccount, setQuickEditAccount] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<BankAccountInput | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const openQuickEdit = (a: any) => {
    setQuickEditAccount(a);
    setEditForm({
      bank: a.bank || "",
      accountName: a.accountName || "",
      accountType: a.accountType || "vadesiz",
      iban: a.iban || "",
      accountNumber: a.accountNumber || "",
      branchName: a.branchName || "",
      currency: a.currency || "TRY",
      balance: a.balance || 0,
      availableBalance: a.availableBalance || 0,
      status: a.status || "aktif",
      description: a.description,
    });
  };

  const handleSaveQuickEdit = async () => {
    if (!editForm || !quickEditAccount) return;
    setSavingEdit(true);
    try {
      await saveAccount(editForm, quickEditAccount.id);
      notify("Hesap başarıyla güncellendi.", "success");
      setQuickEditAccount(null);
    } catch (e: any) {
      notify(e.message || "Güncellenemedi", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "balance" ? "desc" : "asc");
    }
  };

  const list = useMemo(() => {
    const filtered = accounts.filter((a) =>
      `${a.bank} ${a.accountName} ${a.iban}`
        .toLowerCase()
        .includes(q.toLowerCase()),
    );

    return [...filtered].sort((a, b) => {
      let valA: any = (a as any)[sortKey] ?? "";
      let valB: any = (b as any)[sortKey] ?? "";

      if (sortKey === "balance") {
        valA = Number(a.balance) || 0;
        valB = Number(b.balance) || 0;
        return sortDir === "asc" ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLocaleLowerCase("tr-TR");
      const strB = String(valB).toLocaleLowerCase("tr-TR");
      return sortDir === "asc"
        ? strA.localeCompare(strB, "tr-TR")
        : strB.localeCompare(strA, "tr-TR");
    });
  }, [accounts, q, sortKey, sortDir]);

  const renderSortIcon = (key: string) => {
    if (sortKey !== key) {
      return (
        <ArrowUpDown
          size={13}
          className="text-gray-400 opacity-50 group-hover:opacity-100 transition-opacity shrink-0"
        />
      );
    }
    return sortDir === "asc" ? (
      <ArrowUp size={13} className="text-blue-600 font-bold shrink-0" />
    ) : (
      <ArrowDown size={13} className="text-blue-600 font-bold shrink-0" />
    );
  };

  const total = accounts
    .filter((a) => a.currency === "TRY")
    .reduce((s, a) => s + a.balance, 0);
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Banka Hesapları"
        description="Şirket banka hesaplarını, bakiyeleri ve hesap hareketlerini yönetin."
        actions={<><ModuleFileActions module="bank_accounts" exportName="banka-hesaplari" rows={accounts.map(a=>({Banka:a.bank,"Hesap Adı":a.accountName,IBAN:a.iban,"Hesap Türü":a.accountType,"Para Birimi":a.currency,Bakiye:a.balance,Durum:a.status}))}/><button className="btn-primary" onClick={() => nav("/finans/banka-hesaplari/yeni")}><Plus size={16} />Yeni Banka Hesabı</button></>}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <K
          icon={<Building2 size={16} />}
          v={String(accounts.length)}
          l="Toplam Hesap"
        />
        <K
          icon={<ArrowDownLeft size={16} />}
          v={money(total)}
          l="Toplam TRY Bakiye"
        />
        <K
          icon={<ArrowUpRight size={16} />}
          v={String(accounts.filter((a) => a.status === "aktif").length)}
          l="Aktif Hesap"
        />
      </div>
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-3 text-gray-400" size={16} />
        <input
          className="input pl-9"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Banka, hesap veya IBAN ara..."
        />
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full table-fixed">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th
                onClick={() => handleSort("bank")}
                className="table-th cursor-pointer select-none group hover:bg-gray-100 transition-colors w-[28%]"
                title="Banka Adına Göre Sırala"
              >
                <div className="flex items-center gap-1.5">
                  <span className={sortKey === "bank" ? "text-blue-600 font-bold" : ""}>
                    BANKA / HESAP
                  </span>
                  {renderSortIcon("bank")}
                </div>
              </th>
              <th
                onClick={() => handleSort("iban")}
                className="table-th cursor-pointer select-none group hover:bg-gray-100 transition-colors w-[25%]"
                title="IBAN'a Göre Sırala"
              >
                <div className="flex items-center gap-1.5">
                  <span className={sortKey === "iban" ? "text-blue-600 font-bold" : ""}>
                    IBAN
                  </span>
                  {renderSortIcon("iban")}
                </div>
              </th>
              <th
                onClick={() => handleSort("accountType")}
                className="table-th cursor-pointer select-none group hover:bg-gray-100 transition-colors w-[12%]"
                title="Hesap Türüne Göre Sırala"
              >
                <div className="flex items-center gap-1.5">
                  <span className={sortKey === "accountType" ? "text-blue-600 font-bold" : ""}>
                    TÜR
                  </span>
                  {renderSortIcon("accountType")}
                </div>
              </th>
              <th
                onClick={() => handleSort("balance")}
                className="table-th cursor-pointer select-none group hover:bg-gray-100 transition-colors w-[15%]"
                title="Bakiyeye Göre Sırala"
              >
                <div className="flex items-center gap-1.5">
                  <span className={sortKey === "balance" ? "text-blue-600 font-bold" : ""}>
                    BAKİYE
                  </span>
                  {renderSortIcon("balance")}
                </div>
              </th>
              <th
                onClick={() => handleSort("status")}
                className="table-th cursor-pointer select-none group hover:bg-gray-100 transition-colors w-[8%]"
                title="Duruma Göre Sırala"
              >
                <div className="flex items-center gap-1.5">
                  <span className={sortKey === "status" ? "text-blue-600 font-bold" : ""}>
                    DURUM
                  </span>
                  {renderSortIcon("status")}
                </div>
              </th>
              <th className="table-th w-[12%] text-right pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id} className="border-t hover:bg-gray-50/70 transition-colors">
                <td className="table-td text-left w-[28%]">
                  <button
                    className="text-left font-semibold text-blue-600 hover:text-blue-700 no-underline hover:no-underline transition-colors block w-full"
                    onClick={() => nav(`/finans/banka-hesaplari/${a.id}`)}
                  >
                    <span className="text-sm font-bold text-blue-600 hover:text-blue-700 block text-left no-underline">
                      {a.bank}
                    </span>
                    <span className="block text-xs font-normal text-gray-500 mt-0.5 text-left no-underline truncate">
                      {a.accountName}
                    </span>
                  </button>
                </td>
                <td className="table-td text-left font-segoe text-sm sm:text-[15px] font-bold text-gray-900 tracking-wide select-all w-[25%] whitespace-nowrap">
                  {formatIban(a.iban)}
                </td>
                <td className="table-td capitalize text-gray-700 w-[12%]">{a.accountType}</td>
                <td className="table-td font-bold text-base sm:text-[17px] text-gray-900 tracking-tight w-[15%]">
                  {money(a.balance, a.currency)}
                </td>
                <td className="table-td w-[8%]">
                  <Badge className={statusCls[a.status]}>{a.status}</Badge>
                </td>
                <td className="table-td text-right w-[12%] pr-4">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      className="p-1 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Hızlı Düzenle"
                      onClick={() => openQuickEdit(a)}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Hesabı Sil"
                      onClick={async () => {
                        if (confirm(`"${a.bank}" hesabı silinsin mi?`)) {
                          try {
                            await deleteAccount(a.id);
                            notify("Hesap silindi.", "success");
                          } catch (e) {
                            notify(
                              e instanceof Error ? e.message : "Silinemedi",
                              "error",
                            );
                          }
                        }
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && (
          <p className="py-12 text-center text-sm text-gray-400">
            Hesap bulunamadı.
          </p>
        )}
      </div>

      {/* Hızlı Düzenleme Modalı */}
      <Modal
        open={quickEditAccount !== null}
        onClose={() => setQuickEditAccount(null)}
        title={quickEditAccount ? `${quickEditAccount.bank} - Hesabı Düzenle` : "Hesabı Düzenle"}
        size="lg"
      >
        {editForm && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Banka Adı / Başlık</label>
                <input
                  className="input font-semibold text-blue-600"
                  value={editForm.bank}
                  onChange={(e) => setEditForm({ ...editForm, bank: e.target.value })}
                  placeholder="Örn: ETİK GARANTİ"
                />
              </div>
              <div>
                <label className="label">Hesap Sahibi / Ünvan</label>
                <input
                  className="input text-xs"
                  value={editForm.accountName}
                  onChange={(e) => setEditForm({ ...editForm, accountName: e.target.value })}
                  placeholder="Firma ünvanı"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">IBAN Numarası</label>
                <input
                  className="input font-segoe font-bold text-gray-900 tracking-wide text-sm"
                  value={editForm.iban}
                  onChange={(e) => setEditForm({ ...editForm, iban: e.target.value })}
                  placeholder="TR..."
                />
              </div>
              <div>
                <label className="label">Hesap Türü</label>
                <select
                  className="input capitalize"
                  value={editForm.accountType}
                  onChange={(e) => setEditForm({ ...editForm, accountType: e.target.value as any })}
                >
                  <option value="vadesiz">Vadesiz</option>
                  <option value="vadeli">Vadeli</option>
                  <option value="kredi">Kredi</option>
                  <option value="pos">POS</option>
                </select>
              </div>
              <div>
                <label className="label">Para Birimi</label>
                <select
                  className="input font-medium"
                  value={editForm.currency}
                  onChange={(e) => setEditForm({ ...editForm, currency: e.target.value as any })}
                >
                  <option value="TRY">TRY (₺)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
              <div>
                <label className="label">Bakiye</label>
                <input
                  type="number"
                  step="0.01"
                  className="input font-bold text-gray-900 text-base"
                  value={editForm.balance}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      balance: parseFloat(e.target.value) || 0,
                      availableBalance: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <label className="label">Hesap Durumu</label>
                <select
                  className="input font-medium"
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                >
                  <option value="aktif">Aktif</option>
                  <option value="pasif">Pasif</option>
                  <option value="bloke">Bloke</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={() => setQuickEditAccount(null)}
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={savingEdit}
                className="btn-primary text-xs font-semibold px-5"
                onClick={handleSaveQuickEdit}
              >
                {savingEdit ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
function K({ icon, v, l }: { icon: any; v: string; l: string }) {
  return (
    <div className="card p-4">
      <span className="text-gray-500">{icon}</span>
      <p className="mt-3 text-xl font-semibold">{v}</p>
      <p className="text-xs text-gray-500">{l}</p>
    </div>
  );
}
export function BankAccountFormPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { getAccount, saveAccount } = useBankAccounts();
  const { notify } = useToast();
  const a = id ? getAccount(id) : undefined;
  const [x, setX] = useState<BankAccountInput>({
    bank: a?.bank ?? "",
    accountName: a?.accountName ?? "",
    accountType: a?.accountType ?? "vadesiz",
    iban: a?.iban ?? "",
    accountNumber: a?.accountNumber ?? "",
    branchName: a?.branchName ?? "",
    currency: a?.currency ?? "TRY",
    balance: a?.balance ?? 0,
    availableBalance: a?.availableBalance ?? 0,
    status: a?.status ?? "aktif",
    description: a?.description,
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setX({ ...x, [k]: v });
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={a ? "Hesabı Düzenle" : "Yeni Banka Hesabı"}
        backTo="/finans/banka-hesaplari"
      />
      <div className="card grid gap-4 p-6 sm:grid-cols-2">
        {[
          ["Banka", "bank"],
          ["Hesap Adı", "accountName"],
          ["IBAN", "iban"],
          ["Hesap Numarası", "accountNumber"],
          ["Şube", "branchName"],
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
          <span className="label">Hesap Türü</span>
          <select
            className="input"
            value={x.accountType}
            onChange={(e) => set("accountType", e.target.value)}
          >
            <option value="vadesiz">Vadesiz</option>
            <option value="vadeli">Vadeli</option>
            <option value="kredi">Kredi</option>
            <option value="pos">POS</option>
          </select>
        </label>
        <label>
          <span className="label">Para Birimi</span>
          <select
            className="input"
            value={x.currency}
            onChange={(e) => set("currency", e.target.value)}
          >
            <option>TRY</option>
            <option>USD</option>
            <option>EUR</option>
          </select>
        </label>
        <label>
          <span className="label">Bakiye</span>
          <input
            type="number"
            className="input"
            value={x.balance}
            onChange={(e) => {
              setX({
                ...x,
                balance: Number(e.target.value),
                availableBalance: Number(e.target.value),
              });
            }}
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
            <option value="pasif">Pasif</option>
            <option value="bloke">Bloke</option>
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
            disabled={saving}
            className="btn-primary"
            onClick={async () => {
              setSaving(true);
              try {
                await saveAccount(x, id);
                notify("Hesap kaydedildi.", "success");
                nav("/finans/banka-hesaplari");
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
export function BankAccountDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { getAccount, getTransactions, addTransaction } = useBankAccounts();
  const { notify } = useToast();
  const a = id ? getAccount(id) : undefined;
  const [open, setOpen] = useState(false);
  const [t, setT] = useState<BankTransactionInput>({
    accountId: id ?? "",
    date: new Date().toISOString().slice(0, 10),
    type: "giris",
    category: "diger",
    amount: 0,
    counterparty: "",
    description: "",
  });
  const tx = useMemo(
    () => (id ? getTransactions(id) : []),
    [id, getTransactions],
  );
  if (!a) return <p>Hesap yükleniyor...</p>;
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={a.accountName}
        description={`${a.bank} · ${formatIban(a.iban)}`}
        backTo="/finans/banka-hesaplari"
        actions={
          <>
            <button
              className="btn-secondary"
              onClick={() => nav(`/finans/banka-hesaplari/${a.id}/duzenle`)}
            >
              Düzenle
            </button>
            <button className="btn-primary" onClick={() => setOpen(true)}>
              <Plus size={16} />
              Hareket Ekle
            </button>
          </>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <K
          icon={<Building2 size={16} />}
          v={money(a.balance, a.currency)}
          l="Güncel Bakiye"
        />
        <K
          icon={<ArrowDownLeft size={16} />}
          v={money(
            tx
              .filter((x) => x.type === "giris")
              .reduce((s, x) => s + x.amount, 0),
            a.currency,
          )}
          l="Toplam Giriş"
        />
        <K
          icon={<ArrowUpRight size={16} />}
          v={money(
            tx
              .filter((x) => x.type === "cikis")
              .reduce((s, x) => s + x.amount, 0),
            a.currency,
          )}
          l="Toplam Çıkış"
        />
      </div>
      <div className="card overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="table-th">Tarih</th>
              <th className="table-th">Tür</th>
              <th className="table-th">Karşı Taraf</th>
              <th className="table-th">Açıklama</th>
              <th className="table-th">Tutar</th>
              <th className="table-th">Dekont</th>
            </tr>
          </thead>
          <tbody>
            {tx.map((x) => (
              <tr className="border-t" key={x.id}>
                <td className="table-td">{x.date}</td>
                <td className="table-td">
                  {x.type === "giris" ? "Giriş" : "Çıkış"}
                </td>
                <td className="table-td">{x.counterparty}</td>
                <td className="table-td">{x.description}</td>
                <td
                  className={`table-td font-semibold ${x.type === "giris" ? "text-emerald-600" : "text-red-600"}`}
                >
                  {x.type === "giris" ? "+" : "-"}
                  {money(x.amount, a.currency)}
                </td>
                <td className="table-td">{x.hasReceipt ? "Var" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Hesap Hareketi Ekle"
      >
        <div className="space-y-3">
          <input
            type="date"
            className="input"
            value={t.date}
            onChange={(e) => setT({ ...t, date: e.target.value })}
          />
          <select
            className="input"
            value={t.type}
            onChange={(e) => setT({ ...t, type: e.target.value as any })}
          >
            <option value="giris">Para Girişi</option>
            <option value="cikis">Para Çıkışı</option>
          </select>
          <input
            className="input"
            placeholder="Karşı taraf"
            onChange={(e) => setT({ ...t, counterparty: e.target.value })}
          />
          <input
            type="number"
            className="input"
            placeholder="Tutar"
            onChange={(e) => setT({ ...t, amount: Number(e.target.value) })}
          />
          <textarea
            className="input"
            placeholder="Açıklama"
            onChange={(e) => setT({ ...t, description: e.target.value })}
          />
          <label className="btn-secondary cursor-pointer">
            <Upload size={16} />
            Dekont
            <input
              hidden
              type="file"
              accept=".pdf,.xls,.xlsx,image/*"
              onChange={(e) => setT({ ...t, file: e.target.files?.[0] })}
            />
          </label>
          <button
            className="btn-primary w-full"
            onClick={async () => {
              try {
                await addTransaction(t);
                notify("Hareket eklendi.", "success");
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
