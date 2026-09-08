import { useState, useEffect, useMemo, useRef } from 'react';
import { Send, Bot, User, BrainCircuit, Lightbulb, TrendingUp, AlertTriangle, Download, Key, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import * as XLSX from 'xlsx';
import { resolveCardDueDate } from '../credit-cards/lib/billingDateEngine';
import { Modal } from '../../components/ui/Modal';
import { formatDate } from '../credit-cards/data/labels';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  isRich?: boolean;
  cardsData?: any[];
  exportData?: {
    filename: string;
    columns: string[];
    rows: any[][];
  };
}

export function AiAssistantPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('dars_ai_messages') || localStorage.getItem('ets360_ai_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
        }
      }
    } catch (e) {
      console.error('Failed to load chat history:', e);
    }
    return [
      {
        id: 'welcome',
        sender: 'ai',
        text: `Merhaba **Kullanıcı**! Ben Dars Yapay Zeka Asistanıyım. 🧠

Şirketinizin güncel verilerini (Araçlar, Kredi Kartları, İhaleler, Kesim Listeleri, Kasa vb.) gerçek zamanlı analiz edebilir, raporlar çıkarabilir veya sorularınızı yanıtlayabilirim.

**Bana sorabileceğiniz bazı örnekler:**
* *Kredi kartı borç durumumuz nedir?*
* *Muayenesi yaklaşan araçlarımızı listele.*
* *Bu ayki ihalelerimizin durumları nedir?*
* *Kesim listesi özetini çıkartır mısın?*`,
        timestamp: new Date()
      }
    ];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('dars_ai_messages', JSON.stringify(messages));
    } else {
      localStorage.removeItem('dars_ai_messages');
      localStorage.removeItem('ets360_ai_messages');
    }
  }, [messages]);

  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasApiKey, setHasApiKey] = useState(() => {
    return Boolean(
      import.meta.env.VITE_GEMINI_API_KEY || 
      localStorage.getItem('dars_gemini_api_key') || 
      localStorage.getItem('ets360_gemini_api_key') || 
      localStorage.getItem('ops360_gemini_api_key')
    );
  });

  useEffect(() => {
    const key = 
      localStorage.getItem('dars_gemini_api_key') || 
      localStorage.getItem('ets360_gemini_api_key') || 
      localStorage.getItem('ops360_gemini_api_key') || 
      '';
    setApiKeyInput(key);
  }, []);

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      localStorage.setItem('dars_gemini_api_key', apiKeyInput.trim());
      localStorage.removeItem('ets360_gemini_api_key');
      localStorage.removeItem('ops360_gemini_api_key');
      setHasApiKey(true);
      notify('Gemini API anahtarı başarıyla kaydedildi.', 'success');
    } else {
      localStorage.removeItem('ets360_gemini_api_key');
      localStorage.removeItem('ops360_gemini_api_key');
      setHasApiKey(false);
      notify('Gemini API anahtarı kaldırıldı.', 'error');
    }
    setApiKeyModalOpen(false);
  };

  const handleExportExcel = (data: { filename: string; columns: string[]; rows: any[][] }) => {
    try {
      const worksheet = XLSX.utils.aoa_to_sheet([data.columns, ...data.rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Harcamalar');
      XLSX.writeFile(workbook, data.filename);
      notify('Excel dosyası başarıyla indirildi.', 'success');
    } catch (err) {
      console.error(err);
      notify('Excel dışa aktarılırken hata oluştu.', 'error');
    }
  };

  // Mapped Data for real-time calculation
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [statements, setStatements] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [tenders, setTenders] = useState<any[]>([]);
  const [kesim, setKesim] = useState<any[]>([]);

  // Fetch all necessary data once to enable local smart queries
  useEffect(() => {
    async function fetchData() {
      if (!user?.organizationId) return;
      try {
        const [vRes, cRes, sRes, txRes, tRes, kRes] = await Promise.all([
          supabase.from('vehicles').select('*').eq('organization_id', user.organizationId),
          supabase.from('credit_cards').select('*').eq('organization_id', user.organizationId),
          supabase.from('statements').select('*').eq('organization_id', user.organizationId),
          supabase.from('transactions').select('*').eq('organization_id', user.organizationId),
          supabase.from('tenders').select('*').eq('organization_id', user.organizationId),
          supabase.from('kesim_listesi').select('*').eq('organization_id', user.organizationId),
        ]);

        if (vRes.data) {
          const mappedVehicles = vRes.data.map(r => ({
            id: r.id,
            plate: r.plate,
            brand: r.brand,
            model: r.model,
            status: r.status,
            inspectionDate: r.inspection_date,
            purchase_price: Number(r.purchase_price) || 0,
            current_price: Number(r.current_price) || 0,
          }));
          setVehicles(mappedVehicles);
        }
        if (cRes.data) {
          const mappedCards = cRes.data.map(r => ({
            id: r.id,
            bank: r.bank,
            cardName: r.card_name,
            last4: r.last4,
            status: r.status,
            limit: Number(r.card_limit) || 0,
            currentDebt: Number(r.current_debt) || 0,
            statementDay: r.statement_day,
            dueDay: r.due_day,
          }));
          setCards(mappedCards);
        }
        if (sRes.data) {
          const mappedStatements = sRes.data.map(r => ({
            id: r.id,
            cardId: r.card_id,
            period: r.period,
            statementDate: r.statement_date,
            dueDate: r.due_date,
            totalDebt: Number(r.total_debt) || 0,
            minPayment: Number(r.min_payment) || 0,
            hasFile: Boolean(r.file_path),
            filePath: r.file_path || undefined,
            aiStatus: r.ai_status,
            paymentStatus: r.payment_status,
          }));
          setStatements(mappedStatements);
        }
        if (txRes.data) {
          const mappedTransactions = txRes.data.map(r => ({
            id: r.id,
            cardId: r.card_id,
            statementId: r.statement_id,
            date: r.transaction_date,
            merchant: r.merchant,
            description: r.description,
            category: r.category,
            amount: Number(r.amount),
            installments: r.installments,
            spender: r.spender,
            reviewStatus: r.review_status,
            unusual: r.unusual,
          }));
          setTransactions(mappedTransactions);
        }
        if (tRes.data) setTenders(tRes.data);
        if (kRes.data) setKesim(kRes.data);
      } catch (e) {
        console.error('Error fetching data for AI Assistant:', e);
      }
    }
    void fetchData();
  }, [user?.organizationId]);

  // Dynamically update the welcome message greeting with the resolved username if chat history hasn't started yet
  useEffect(() => {
    if (messages.length === 1 && messages[0].id === 'welcome' && user?.name) {
      setMessages([
        {
          id: 'welcome',
          sender: 'ai',
          text: `Merhaba **${user.name}**! Ben Dars Yapay Zeka Asistanıyım. 🧠

Şirketinizin güncel verilerini (Araçlar, Kredi Kartları, İhaleler, Kesim Listeleri, Kasa vb.) gerçek zamanlı analiz edebilir, raporlar çıkarabilir veya sorularınızı yanıtlayabilirim.

**Bana sorabileceğiniz bazı örnekler:**
* *Kredi kartı borç durumumuz nedir?*
* *Muayenesi yaklaşan araçlarımızı listele.*
* *Bu ayki ihalelerimizin durumları nedir?*
* *Kesim listesi özetini çıkartır mısın?*`,
          timestamp: messages[0].timestamp
        }
      ]);
    }
  }, [user?.name]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const deleteMessage = (id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    notify('Mesaj silindi.', 'success');
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    // Get API key from env or localStorage
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('ets360_gemini_api_key') || localStorage.getItem('ops360_gemini_api_key');
    
    if (!apiKey) {
      notify('Lütfen asistanı kullanabilmek için bir Gemini API Key tanımlayın.', 'error');
      setApiKeyModalOpen(true);
      return;
    }

    const userMessage: Message = {
      id: Math.random().toString(),
      sender: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Programmatically compute card summaries to ensure 100% mathematical accuracy
      const computedCardSummaries = cards.map(c => {
        const cardTx = transactions.filter(t => t.cardId === c.id);
        const getMonthYear = (dateStr: string) => {
          if (!dateStr) return '';
          return dateStr.slice(0, 7); // e.g. "2026-07"
        };
        const monthlyBreakdown: Record<string, { yakit: number; yakitCount: number; odeme: number; odemeCount: number; diger: number; digerCount: number }> = {};
        cardTx.forEach(t => {
          const my = getMonthYear(t.date);
          if (!my) return;
          if (!monthlyBreakdown[my]) {
            monthlyBreakdown[my] = { yakit: 0, yakitCount: 0, odeme: 0, odemeCount: 0, diger: 0, digerCount: 0 };
          }
          const amt = Number(t.amount);
          if (t.category === 'yakit') {
            monthlyBreakdown[my].yakit += amt;
            monthlyBreakdown[my].yakitCount += 1;
          } else if (t.category === 'odeme' || amt < 0) {
            monthlyBreakdown[my].odeme += Math.abs(amt);
            monthlyBreakdown[my].odemeCount += 1;
          } else {
            monthlyBreakdown[my].diger += amt;
            monthlyBreakdown[my].digerCount += 1;
          }
        });
        let totalYakit = 0;
        let totalOdeme = 0;
        let totalDiger = 0;
        cardTx.forEach(t => {
          const amt = Number(t.amount);
          if (t.category === 'yakit') totalYakit += amt;
          else if (t.category === 'odeme' || amt < 0) totalOdeme += Math.abs(amt);
          else totalDiger += amt;
        });
        return {
          banka: c.bank,
          kartAdi: c.cardName,
          son4: c.last4,
          toplamHarcamaYakit: totalYakit,
          toplamHarcamaDiger: totalDiger,
          toplamOdeme: totalOdeme,
          aylikKirilimlar: Object.entries(monthlyBreakdown).map(([ay, veriler]) => ({
            donem: ay,
            yakitTutar: veriler.yakit,
            yakitAdet: veriler.yakitCount,
            digerTutar: veriler.diger,
            digerAdet: veriler.digerCount,
            odemeTutar: veriler.odeme,
            odemeAdet: veriler.odemeCount
          }))
        };
      });

      // Build context payload
      const contextData = {
        currentDate: new Date().toLocaleDateString('tr-TR'),
        vehiclesCount: vehicles.length,
        vehicles: vehicles.map(v => ({ plaka: v.plate, marka: v.brand, model: v.model, durum: v.status, muayene: v.inspectionDate, alis_fiyati: v.purchase_price, guncel_deger: v.current_price })),
        cards: cards.map(c => ({ banka: c.bank, kartName: c.cardName, son4: c.last4, limit: c.limit, guncelBorc: c.currentDebt, durum: c.status })),
        cardSummaries: computedCardSummaries,
        statements: statements.map(s => {
          const cardObj = cards.find(c => c.id === s.cardId);
          return { banka: cardObj?.bank, kartName: cardObj?.cardName, son4: cardObj?.last4, donem: s.period, toplamBorc: s.totalDebt, asgariOdeme: s.minPayment, sonOdemeTarihi: s.dueDate, durum: s.paymentStatus };
        }),
        transactions: transactions.map(t => {
          const cardObj = cards.find(c => c.id === t.cardId);
          return { banka: cardObj?.bank, kartName: cardObj?.cardName, son4: cardObj?.last4, tarih: formatDate(t.date), isyeri: t.merchant, aciklama: t.description, kategori: t.category, tutar: t.amount, taksit: t.installments, harcayan: t.spender };
        }),
        tendersCount: tenders.length,
        tenders: tenders.map(t => ({ baslik: t.title, kurum: t.institution, ihaleTarihi: t.deadline_at, teklifTutar: t.bid_amount, durum: t.status })),
        kesimListesiCount: kesim.length,
        kesimListesi: kesim.map(k => ({ cari: k.supplier_name, adet: k.head_count, kg: k.carcass_weight, tarih: k.slaughter_date, toplamTutar: k.total_amount, odenen: k.advance_payment, kalan: k.total_amount - k.advance_payment }))
      };

      const systemInstruction = `Sen DARS Data Analysis & Reporting System sisteminin resmi Yapay Zeka Operasyon Asistanısın (Gemini 1.5 Flash).
Şirketin güncel operasyonel ve finansal verileri sana aşağıda JSON formatında sunulmaktadır.
Sorulan sorulara bu verilere göre doğru, analitik, Türkçe ve profesyonel cevaplar ver. 

ÖNEMLİ: Eğer kullanıcı kredi kartlarının veya belirli bir kartın yakıt harcamaları, diğer harcamaları veya ödeme tutarları gibi finansal toplamlarını sorarsa, doğrudan 'cardSummaries' verisinde programatik olarak önceden hesaplanmış olan kesin tutarları kullan. Tek tek işlemleri toplayarak kendin matematik hesabı yapmaya çalışma, 'cardSummaries' alanındaki veriler %100 doğrudur.
Tutar hesaplamalarında ve filtrelemelerde son derece hassas ol. Borçları, ödemeleri, araç muayene sürelerini, ihaleleri ve kesim verilerini bu verilerden çekerek cevapla.
Eğer bir tablosal veri listeliyorsan, bunu markdown tablosu (| Tarih | İşyeri | vs.) şeklinde formatla. Cevaplarında markdown formatını (kalın yazım, listeler, emojiler) şık bir şekilde kullan.
Eğer kullanıcı bir veri listesi istiyorsa veya analiz raporu istiyorsa, cevaba ek olarak verileri Excel formatında dışa aktarması için bir indirme butonu oluşturabileceğimizi unutma.

GÜNCEL VERİLER:
${JSON.stringify(contextData, null, 2)}`;

      // 1. Resolve which model to use by querying available models
      let targetModel = 'gemini-1.5-flash'; // default fallback
      try {
        const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (listResponse.ok) {
          const listData = await listResponse.json();
          const availableModels = listData.models || [];
          const availableNames = availableModels.map((m: any) => m.name.replace('models/', ''));

          // Define priority list from newest/best active models to oldest
          const priorityList = [
            'gemini-3.6-flash',
            'gemini-3.5-flash-lite',
            'gemini-flash-latest',
            'gemini-1.5-flash-latest',
            'gemini-2.5-flash',
            'gemini-1.5-flash'
          ];

          const bestModel = priorityList.find(pModel => availableNames.includes(pModel));
          if (bestModel) {
            targetModel = bestModel;
          } else {
            // Find first model matching flash (excluding experimental or tuning models unless necessary)
            const flashModel = availableModels.find((m: any) => 
              m.name.includes('flash') && 
              m.supportedGenerationMethods?.includes('generateContent') &&
              !m.name.includes('experimental')
            );
            if (flashModel) {
              targetModel = flashModel.name.replace('models/', '');
            } else {
              // Try pro as a fallback if no flash model is found
              const proModel = availableModels.find((m: any) => 
                m.name.includes('pro') && 
                m.supportedGenerationMethods?.includes('generateContent')
              );
              if (proModel) {
                targetModel = proModel.name.replace('models/', '');
              }
            }
          }
        }
      } catch (listErr) {
        console.warn('Failed to list models, falling back to default:', listErr);
      }

      // Get the last 15 messages for history context (ensures session token context size is optimal)
      const historyMessages = messages.slice(-15);
      const chatHistory = historyMessages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));
      chatHistory.push({
        role: 'user',
        parts: [{ text: `Kullanıcı Sorusu: ${userMessage.text}` }]
      });

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: chatHistory,
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          }
        })
      });

      if (!response.ok) {
        let errMsg = 'Gemini API yanıt vermedi.';
        try {
          const errorJson = await response.json();
          if (errorJson?.error?.message) {
            errMsg = `Gemini API Hatası: ${errorJson.error.message} (Kod: ${errorJson.error.code})`;
          }
        } catch (e) {
          // ignore
        }
        throw new Error(errMsg);
      }

      const resData = await response.json();
      const aiText = resData.candidates?.[0]?.content?.parts?.[0]?.text || 'Yanıt oluşturulamadı.';

      let exportData = undefined;
      if (aiText.includes('|') && aiText.includes('\n|')) {
        try {
          const lines = aiText.trim().split('\n').filter((l: string) => l.trim().startsWith('|'));
          if (lines.length >= 3) {
            const columns = lines[0].split('|').map((c: string) => c.trim()).filter((_: string, i: number, arr: string[]) => i > 0 && i < arr.length - 1);
            const rows = lines.slice(2).map((line: string) => {
              return line.split('|').map((c: string) => c.trim()).filter((_: string, i: number, arr: string[]) => i > 0 && i < arr.length - 1);
            });
            exportData = {
              filename: 'Asistan_Raporu.xlsx',
              columns,
              rows
            };
          }
        } catch (e) {
          console.error('Table parsing error:', e);
        }
      }

      const aiMessage: Message = {
        id: Math.random().toString(),
        sender: 'ai',
        text: aiText,
        exportData,
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      console.error(err);
      notify('Gemini API ile iletişim kurulurken bir hata oluştu.', 'error');
      const errorMessage = err?.message || 'Gemini API ile iletişim kurulamadı.';
      setMessages((prev) => [...prev, {
        id: Math.random().toString(),
        sender: 'ai',
        text: `❌ **Hata Oluştu:** ${errorMessage}\n\nLütfen API anahtarınızı kontrol edip güncellemek için sağ üst köşedeki **API Ayarları** butonuna tıklayın.`,
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessageText = (text: string) => {
    if (text.includes('|') && text.includes('\n|')) {
      const parts = text.split(/(?=\n\|)/);
      return parts.map((part, index) => {
        if (part.startsWith('\n|') || part.startsWith('|')) {
          const lines = part.trim().split('\n').filter(l => l.trim().startsWith('|'));
          if (lines.length < 2) return <p key={index} className="whitespace-pre-line leading-relaxed">{part}</p>;
          
          const headerLine = lines[0];
          const headers = headerLine.split('|').map(h => h.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
          
          const rowLines = lines.slice(2);
          const rows = rowLines.map(line => {
            return line.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
          });

          return (
            <div key={index} className="my-3 overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    {headers.map((h, i) => (
                      <th key={i} className="px-3 py-2 text-left font-bold text-gray-700">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50">
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-3 py-2 text-gray-600 font-medium">
                          {cell.startsWith('**') && cell.endsWith('**') ? <strong>{cell.replace(/\*\*/g, '')}</strong> : cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return <p key={index} className="whitespace-pre-line leading-relaxed">{part}</p>;
      });
    }
    
    return <p className="whitespace-pre-line leading-relaxed">{text}</p>;
  };

  const handleChipClick = (prompt: string) => {
    setInput(prompt);
  };

  // Pre-calculated stats for the AI Insights Sidebar
  const insights = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Critical card payments (<3 days, debt > 0)
    const overdueCards = cards.filter(c => {
      if (c.status !== 'aktif' || (Number(c.currentDebt) || 0) <= 0) return false;
      const due = new Date(resolveCardDueDate(c, statements).date);
      const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
      return diff <= 3;
    }).length;

    // Critical inspections (<15 days)
    const overdueInspections = vehicles.filter(v => {
      if (v.status !== 'aktif' || !v.inspectionDate) return false;
      const diff = Math.round((new Date(v.inspectionDate).getTime() - today.getTime()) / 86400000);
      return diff <= 15;
    }).length;

    // Total active tenders
    const activeTenders = tenders.filter(t => !['kazanildi', 'kaybedildi', 'iptal'].includes(t.status)).length;

    return { overdueCards, overdueInspections, activeTenders };
  }, [cards, vehicles, tenders]);

  return (
    <div className="flex h-[calc(100vh-130px)] flex-col gap-6 md:flex-row">
      
      {/* Sidebar: AI Insights Dashboard */}
      <div className="flex flex-col gap-4 md:w-80 shrink-0">
        <div className="card p-5 space-y-4 bg-gradient-to-br from-brand-900 to-brand-950 text-white border-0 shadow-lg">
          <div className="flex items-center gap-2">
            <BrainCircuit className="text-brand-300 animate-pulse" size={24} />
            <h2 className="font-bold text-lg tracking-tight">AI Operasyon Kokpiti</h2>
          </div>
          <p className="text-xs text-brand-200">
            Yapay zeka asistanı şirketinizin güncel verilerini anlık tarayarak aşağıdaki kritik uyarıları tespit etti.
          </p>

          <div className="border-t border-brand-800 my-2 pt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-brand-200 flex items-center gap-1.5"><AlertTriangle size={14} /> Kritik Kart Ödemeleri</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${insights.overdueCards > 0 ? 'bg-red-500 text-white animate-bounce' : 'bg-brand-800 text-brand-300'}`}>
                {insights.overdueCards} Kart
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-brand-200 flex items-center gap-1.5"><AlertTriangle size={14} /> Muayenesi Yaklaşanlar</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${insights.overdueInspections > 0 ? 'bg-amber-500 text-white' : 'bg-brand-800 text-brand-300'}`}>
                {insights.overdueInspections} Araç
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-brand-200 flex items-center gap-1.5"><TrendingUp size={14} /> Aktif İhaleler</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-brand-800 text-brand-300">
                {insights.activeTenders} İhale
              </span>
            </div>
          </div>
        </div>

        {/* System suggestions */}
        <div className="card p-4 space-y-3 flex-1 flex flex-col">
          <div className="flex items-center gap-1.5 font-bold text-gray-800 text-sm">
            <Lightbulb size={16} className="text-amber-500" />
            <span>Faydalı Analiz İpuçları</span>
          </div>
          <div className="text-xs text-gray-500 space-y-2.5 flex-1">
            <div className="p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100/80 cursor-pointer transition-colors" onClick={() => handleChipClick("kredi kartı borç durumumuz nedir?")}>
              <span className="font-semibold text-brand-700 block mb-0.5">Kredi Kartları Borç Durumu</span>
              Kart limit doluluk oranları ve toplam borç durumunu tek tıkla raporlayın.
            </div>
            <div className="p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100/80 cursor-pointer transition-colors" onClick={() => handleChipClick("muayenesi yaklaşan araçlarımızı listele")}>
              <span className="font-semibold text-brand-700 block mb-0.5">Muayene ve Kasko Takibi</span>
              Son 15 gün içinde muayene vadesi gelen araçların listesini anında çekin.
            </div>
            <div className="p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100/80 cursor-pointer transition-colors" onClick={() => handleChipClick("Temmuz ayı et kesim raporunu göster")}>
              <span className="font-semibold text-brand-700 block mb-0.5">Aylık Et Kesim Analizleri</span>
              Temmuz, Ağustos veya diğer aylara ait kesim tutar ve karkas kilo özetlerini sorgulayın.
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Box */}
      <div className="flex flex-1 flex-col card overflow-hidden p-0 bg-gray-50/30 border border-gray-200 shadow-sm">
        
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 shadow-inner">
              <Bot size={22} className="animate-pulse" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 leading-tight">Yapay Zeka Operasyon Asistanı</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-green-600 font-semibold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-ping"></span>
                  Çevrimiçi · Veri Modeli Aktif
                </span>
                <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${hasApiKey ? 'bg-brand-50 text-brand-700' : 'bg-amber-50 text-amber-700'}`}>
                  {hasApiKey ? 'Gemini 1.5 Flash Aktif' : 'API Anahtarı Gerekli'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (confirm('Sohbet geçmişini temizlemek istediğinize emin misiniz?')) {
                  localStorage.removeItem('dars_ai_messages');
                  localStorage.removeItem('ets360_ai_messages');
                  setMessages([
                    {
                      id: 'welcome',
                      sender: 'ai',
                      text: `Merhaba **${user?.name || 'Kullanıcı'}**! Ben Dars Yapay Zeka Asistanıyım. 🧠

Şirketinizin güncel verilerini (Araçlar, Kredi Kartları, İhaleler, Kesim Listeleri, Kasa vb.) gerçek zamanlı analiz edebilir, raporlar çıkarabilir veya sorularınızı yanıtlayabilirim.

**Bana sorabileceğiniz bazı örnekler:**
* *Kredi kartı borç durumumuz nedir?*
* *Muayenesi yaklaşan araçlarımızı listele.*
* *Bu ayki ihalelerimizin durumları nedir?*
* *Kesim listesi özetini çıkartır mısın?*`,
                      timestamp: new Date()
                    }
                  ]);
                  notify('Sohbet geçmişi temizlendi.', 'success');
                }
              }}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 transition-colors border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white shadow-sm font-semibold"
              title="Sohbet Geçmişini Temizle"
            >
              <Trash2 size={14} className="text-gray-400 hover:text-red-500" />
              Sohbeti Temizle
            </button>

            <button
              onClick={() => setApiKeyModalOpen(true)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-600 transition-colors border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white shadow-sm font-semibold"
              title="Gemini API Anahtarı Ayarları"
            >
              <Key size={14} className={hasApiKey ? 'text-brand-500' : 'text-gray-400'} />
              API Ayarları
            </button>
          </div>
        </div>

        {/* Chat Message List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((m) => (
            <div key={m.id} className={`flex gap-3 group relative items-start ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              
              {/* AI Avatar */}
              {m.sender === 'ai' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white shadow">
                  <Bot size={16} />
                </div>
              )}

              {/* User Message Delete Button */}
              {m.sender === 'user' && (
                <button
                  onClick={() => deleteMessage(m.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 self-center"
                  title="Bu mesajı sil"
                >
                  <Trash2 size={13} />
                </button>
              )}

              {/* Message Bubble */}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                m.sender === 'user' 
                  ? 'bg-brand-600 text-white rounded-tr-none' 
                  : 'bg-white text-gray-800 border border-gray-150 rounded-tl-none leading-relaxed'
              }`}>
                {m.sender === 'user' ? m.text : renderMessageText(m.text)}
                {m.sender === 'ai' && m.exportData && (
                  <button
                    onClick={() => handleExportExcel(m.exportData!)}
                    className="btn-primary mt-3 !py-1.5 !px-3 !text-xs flex items-center gap-1.5 bg-green-600 hover:bg-green-700 active:bg-green-800 transition-colors shadow-inner"
                  >
                    <Download size={12} /> Excel Olarak İndir
                  </button>
                )}
              </div>

              {/* AI Message Delete Button */}
              {m.sender === 'ai' && (
                <button
                  onClick={() => deleteMessage(m.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 self-center"
                  title="Bu mesajı sil"
                >
                  <Trash2 size={13} />
                </button>
              )}

              {/* User Avatar */}
              {m.sender === 'user' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-200 text-gray-600 shadow-inner">
                  <User size={16} />
                </div>
              )}
            </div>
          ))}

          {/* AI Thinking Animation */}
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white shadow">
                <Bot size={16} />
              </div>
              <div className="bg-white text-gray-400 border border-gray-150 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-1.5">
                <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompt Chips */}
        <div className="bg-white px-5 pt-3 flex flex-wrap gap-2">
          <button onClick={() => handleChipClick("Kredi kartı borç durumumuz nedir?")} className="px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 border border-brand-100 text-brand-700 hover:bg-brand-100 transition-colors">
            💳 Kart Borçları
          </button>
          <button onClick={() => handleChipClick("Muayenesi yaklaşan araçlarimizi listele")} className="px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 border border-brand-100 text-brand-700 hover:bg-brand-100 transition-colors">
            🚗 Muayenesi Yaklaşanlar
          </button>
          <button onClick={() => handleChipClick("Temmuz ayı kesim listesi özetini çıkartır mısın?")} className="px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 border border-brand-100 text-brand-700 hover:bg-brand-100 transition-colors">
            🐃 Temmuz Kesimleri
          </button>
          <button onClick={() => handleChipClick("İhalelerin durumunu özetle")} className="px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 border border-brand-100 text-brand-700 hover:bg-brand-100 transition-colors">
            ⚖️ İhale Özetleri
          </button>
        </div>

        {/* Input Form */}
        <div className="bg-white p-4 border-t border-gray-150">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Asistan ile konuşun, operasyonel sorular sorun..."
              className="input flex-1 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="btn-primary !px-4 hover:shadow-md transition-shadow"
            >
              <Send size={16} />
            </button>
          </div>
        </div>

      </div>

      <Modal
        open={apiKeyModalOpen}
        onClose={() => setApiKeyModalOpen(false)}
        title="Gemini API Anahtarı Ayarları"
        description="Yapay Zeka Operasyon Asistanı'nı gerçek Gemini 1.5 Flash modeline bağlayın."
        size="sm"
        footer={
          <>
            <button
              onClick={() => {
                localStorage.removeItem('dars_gemini_api_key');
                localStorage.removeItem('ets360_gemini_api_key');
                localStorage.removeItem('ops360_gemini_api_key');
                setApiKeyInput('');
                setHasApiKey(false);
                notify('API anahtarı kaldırıldı.', 'error');
                setApiKeyModalOpen(false);
              }}
              className="text-xs text-red-600 hover:text-red-700 font-semibold px-3 py-2"
            >
              Anahtarı Sil
            </button>
            <button
              onClick={() => setApiKeyModalOpen(false)}
              className="btn-secondary !py-1.5 !px-3"
            >
              İptal
            </button>
            <button
              onClick={handleSaveApiKey}
              className="btn-primary !py-1.5 !px-3"
            >
              Kaydet
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Gemini API Key
            </label>
            <input
              type="password"
              placeholder="AIzaSy..."
              className="input w-full"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
            />
          </div>
          
          <div className="rounded-xl bg-brand-50 p-4 border border-brand-100 text-xs text-brand-800 space-y-2 leading-relaxed">
            <p className="font-bold text-brand-900 flex items-center gap-1">
              <Lightbulb size={14} /> Ücretsiz API Anahtarı Nasıl Alınır?
            </p>
            <p>
              Google AI Studio üzerinden tamamen ücretsiz bir Gemini API Anahtarı alabilirsiniz:
            </p>
            <a
              href="https://aistudio.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block font-bold text-brand-700 hover:text-brand-900 underline mt-1"
            >
              Google AI Studio'ya Git ↗
            </a>
            <p className="text-[10px] text-brand-600/80 mt-2">
              *API anahtarınız tarayıcınızın yerel depolama alanında (localStorage) güvenle saklanır, sunucuya veya üçüncü şahıslara asla aktarılmaz.
            </p>
          </div>
        </div>
      </Modal>

    </div>
  );
}
