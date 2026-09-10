export interface BankInfo {
  code: string;
  name: string;
  shortName: string;
  color: string;
}

export const TURKISH_BANKS: Record<string, BankInfo> = {
  '0046': { code: '0046', name: 'Akbank T.A.Ş.', shortName: 'Akbank', color: 'bg-red-600 text-white' },
  '0062': { code: '0062', name: 'Garanti BBVA A.Ş.', shortName: 'Garanti BBVA', color: 'bg-emerald-600 text-white' },
  '0064': { code: '0064', name: 'Türkiye İş Bankası A.Ş.', shortName: 'İş Bankası', color: 'bg-blue-700 text-white' },
  '0067': { code: '0067', name: 'Yapı ve Kredi Bankası A.Ş.', shortName: 'Yapı Kredi', color: 'bg-blue-600 text-white' },
  '0010': { code: '0010', name: 'T.C. Ziraat Bankası A.Ş.', shortName: 'Ziraat', color: 'bg-red-700 text-white' },
  '0012': { code: '0012', name: 'Türkiye Halk Bankası A.Ş.', shortName: 'Halkbank', color: 'bg-sky-600 text-white' },
  '0015': { code: '0015', name: 'Türkiye Vakıflar Bankası T.A.O.', shortName: 'Vakıfbank', color: 'bg-amber-600 text-white' },
  '0111': { code: '0111', name: 'QNB Finansbank A.Ş.', shortName: 'QNB Finansbank', color: 'bg-purple-700 text-white' },
  '0032': { code: '0032', name: 'Türk Ekonomi Bankası A.Ş. (TEB)', shortName: 'TEB', color: 'bg-emerald-700 text-white' },
  '0134': { code: '0134', name: 'Denizbank A.Ş.', shortName: 'Denizbank', color: 'bg-blue-500 text-white' },
  '0099': { code: '0099', name: 'ING Bank A.Ş.', shortName: 'ING', color: 'bg-orange-600 text-white' },
  '0124': { code: '0124', name: 'Şekerbank T.A.Ş.', shortName: 'Şekerbank', color: 'bg-green-600 text-white' },
  '0123': { code: '0123', name: 'HSBC Bank A.Ş.', shortName: 'HSBC', color: 'bg-red-800 text-white' },
  '0205': { code: '0205', name: 'Kuveyt Türk Katılım Bankası A.Ş.', shortName: 'Kuveyt Türk', color: 'bg-teal-700 text-white' },
  '0206': { code: '0206', name: 'Türkiye Finans Katılım Bankası A.Ş.', shortName: 'Türkiye Finans', color: 'bg-amber-700 text-white' },
  '0203': { code: '0203', name: 'Albaraka Türk Katılım Bankası A.Ş.', shortName: 'Albaraka Türk', color: 'bg-rose-700 text-white' },
  '0210': { code: '0210', name: 'Vakıf Katılım Bankası A.Ş.', shortName: 'Vakıf Katılım', color: 'bg-amber-800 text-white' },
  '0211': { code: '0211', name: 'Ziraat Katılım Bankası A.Ş.', shortName: 'Ziraat Katılım', color: 'bg-red-900 text-white' },
  '0212': { code: '0212', name: 'Türkiye Emlak Katılım Bankası A.Ş.', shortName: 'Emlak Katılım', color: 'bg-emerald-800 text-white' },
  '0100': { code: '0100', name: 'Alternatifbank A.Ş.', shortName: 'Alternatif Bank', color: 'bg-red-600 text-white' },
  '0146': { code: '0146', name: 'Odea Bank A.Ş.', shortName: 'Odeabank', color: 'bg-purple-600 text-white' },
  '0135': { code: '0135', name: 'Anadolubank A.Ş.', shortName: 'Anadolubank', color: 'bg-blue-800 text-white' },
  '0029': { code: '0029', name: 'Birleşik Fon Bankası A.Ş.', shortName: 'Birleşik Fon', color: 'bg-gray-700 text-white' }
};

export function getBankInfo(code: string): BankInfo {
  const normalized = code.padStart(4, '0');
  if (TURKISH_BANKS[normalized]) {
    return TURKISH_BANKS[normalized];
  }
  return {
    code: normalized,
    name: `Banka (${normalized})`,
    shortName: `Banka ${normalized}`,
    color: 'bg-gray-700 text-white'
  };
}
