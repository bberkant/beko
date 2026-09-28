/**
 * Sayısal para tutarını Türkçe metin dökümüne ("YALNIZ ... TÜRK LİRASI ... KURUŞ") çevirir.
 * Resmi e-Fatura / e-Arşiv fatura standartlarına uygundur.
 */
export function numberToTurkishWords(amount: number): string {
  if (amount == null || isNaN(amount)) return 'SIFIR TÜRK LİRASI';

  const birler = ['', 'BİR', 'İKİ', 'ÜÇ', 'DÖRT', 'BEŞ', 'ALTI', 'YEDİ', 'SEKİZ', 'DOKUZ'];
  const onlar = ['', 'ON', 'YİRMİ', 'OTUZ', 'KIRK', 'ELLİ', 'ALTMIŞ', 'YETMİŞ', 'SEKSEN', 'DOKSAN'];
  const basamaklar = ['', 'BİN', 'MİLYON', 'MİLYAR', 'TRİLYON'];

  function ucBasamak(n: number): string {
    const yuz = Math.floor(n / 100);
    const on = Math.floor((n % 100) / 10);
    const bir = n % 10;
    let res = '';

    if (yuz === 1) {
      res += 'YÜZ ';
    } else if (yuz > 1) {
      res += birler[yuz] + ' YÜZ ';
    }

    if (on > 0) {
      res += onlar[on] + ' ';
    }

    if (bir > 0) {
      res += birler[bir] + ' ';
    }

    return res.trim();
  }

  const sign = amount < 0 ? 'EKSİ ' : '';
  const positive = Math.abs(amount);
  const tamKisim = Math.floor(positive);
  const kurusKisim = Math.round((positive - tamKisim) * 100);

  if (tamKisim === 0 && kurusKisim === 0) {
    return 'SIFIR TÜRK LİRASI';
  }

  let text = '';
  let kalan = tamKisim;
  let basamakIdx = 0;

  if (tamKisim === 0) {
    text = '';
  } else {
    while (kalan > 0) {
      const grup = kalan % 1000;
      if (grup > 0) {
        let grupText = ucBasamak(grup);
        // Türkçe dil kuralı: 1000 için "Bir Bin" denmez, sadece "Bin" denir
        if (basamakIdx === 1 && grup === 1) {
          grupText = '';
        }
        const ek = basamaklar[basamakIdx] ? ' ' + basamaklar[basamakIdx] : '';
        text = (grupText + ek + ' ' + text).trim();
      }
      kalan = Math.floor(kalan / 1000);
      basamakIdx++;
    }
  }

  let sonuc = sign + (text ? text + ' TÜRK LİRASI' : '');

  if (kurusKisim > 0) {
    const kurusText = ucBasamak(kurusKisim);
    sonuc += (sonuc ? ' ' : '') + kurusText + ' KURUŞ';
  }

  return sonuc.trim();
}
