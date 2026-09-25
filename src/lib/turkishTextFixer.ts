/**
 * Turkish Text Corruption Repair Utility
 * Repairs garbled / misencoded Turkish characters originating from legacy Firebird / EBS databases.
 */

export const CORRUPTED_TURKISH_WORDS: Record<string, string> = {
  // Common prefixes & entities
  'ıEK': 'ÇEK',
  'ıEKLER': 'ÇEKLER',
  'ıEKER': 'ŞEKER',
  'ıEKERBANK': 'ŞEKERBANK',
  'ıELİK': 'ÇELİK',
  'ıEN': 'ŞEN',
  'ıENGİL': 'ŞENGİL',
  'ıENOL': 'ŞENOL',
  'ıEREF': 'ŞEREF',
  'ıETİN': 'ÇETİN',
  'ıHSAN': 'İHSAN',
  'ıHTİYAı': 'İHTİYAÇ',
  'ıINAR': 'ÇINAR',
  'ıKLİM': 'İKLİM',
  'ıLHAMı': 'İLHAMİ',
  'ıLHAN': 'İLHAN',
  'ıLKADIM': 'İLKADIM',
  'ıLKADIı': 'İLKADIM',
  'ıLKER': 'İLKER',
  'ıLKNUR': 'İLKNUR',
  'ıLKİN': 'İLKİN',
  'ıMECE': 'İMECE',
  'ıMER': 'ÖMER',
  'ıMİR': 'ÖMÜR',
  'ıMİT': 'ÜMİT',
  'ıNAL': 'ÜNAL',
  'ıNAN': 'İNAN',
  'ıNANı': 'İNANÇ',
  'ıNCE': 'İNCE',
  'ıNCİLER': 'İNCİLER',
  'ıNDER': 'ÖNDER',
  'ıNSAL': 'ÜNSAL',
  'ıNİAAT': 'İNŞAAT',
  'ıOBAN': 'ÇOBAN',
  'ıORUM': 'ÇORUM',
  'ıPEK': 'İPEK',
  'ıRETİM': 'ÜRETİM',
  'ıRFAN': 'İRFAN',
  'ıRİNLERı': 'ÜRÜNLERİ',
  'ıSA': 'İSA',
  'ıSKONTO': 'İSKONTO',
  'ıSMAİL': 'İSMAİL',
  'ıSMAİLOİLU': 'İSMAİLOĞLU',
  'ıUBE': 'ŞUBE',
  'ıZ': 'ÖZ',
  'ıZAYDIN': 'ÖZAYDIN',
  'ıZCAN': 'ÖZCAN',
  'ıZDEMİR': 'ÖZDEMİR',
  'ıZDOİAN': 'ÖZDOĞAN',
  'ıZDOıAN': 'ÖZDOĞAN',
  'ıZEL': 'ÖZEL',
  'ıZEN': 'ÖZEN',
  'ıZER': 'ÖZER',
  'ıZKAN': 'ÖZKAN',
  'ıZTİRK': 'ÖZTÜRK',
  'ıZİELİK': 'ÖZÇELİK',
  'ııKRı': 'ŞÜKRÜ',
  'ııMÇEK': 'ŞİMŞEK',
  'ıABAN': 'ŞABAN',
  'ıAFAK': 'ŞAFAK',
  'ıAHİN': 'ŞAHİN',
  'ıAHİNER': 'ŞAHİNER',
  'ıAKIR': 'ŞAKİR',
  'ıALIİKAN': 'ÇALIŞKAN',
  'ıAMPİYON': 'ŞAMPİYON',
  'ıANLI': 'ŞANLI',
  'ıATIR': 'ŞATIR',
  'ıAİLAR': 'ÇAĞLAR',
  'ıAİLAYAN': 'ÇAĞLAYAN',
  'ıBRAHİM': 'İBRAHİM',
  'ıDEME': 'ÖDEME',
  'ıDEYECEK': 'ÖDEYECEK',
  'ıDRİS': 'İDRİS',
  'ıEFİKA': 'ŞEFİKA',
  'ıEHİR': 'ŞEHİR',
  'ıTı': 'ŞTİ',
  'CARı': 'CARİ',
  'SANAYı': 'SANAYİ',
  'TİCARETı': 'TİCARETİ',
  'GARANTı': 'GARANTİ',
  'KREDı': 'KREDİ',
  'YAPIKREDı': 'YAPIKREDİ',
  'KAYIı': 'KAYIŞ',
  'ATEı': 'ATEŞ',
  'ALPTUı': 'ALPTUĞ',
  'BAııUVAN': 'BAŞÇIVAN',
  'CANDAı': 'CANDAŞ',
  'BARIı': 'BARIŞ',
  'BEKTAı': 'BEKTAŞ',
  'AYTAı': 'AYTAŞ',
  'AKTAı': 'AKTAŞ',
  'AKKOı': 'AKKOÇ',
  'ARAı': 'ARAÇ',
  'ARGIı': 'ARGIÇ',
  'ALTINTAı': 'ALTINTAŞ',
  'AYBİMAı': 'AYBİMAŞ',
  'AYPAı': 'AYPAŞ',
  'DEMİRBAı': 'DEMİRBAŞ',
  'DURMUı': 'DURMUŞ',
  'ERKOı': 'ERKOÇ',
  'KARADAı': 'KARADAŞ',
  'KARAKOı': 'KARAKOÇ',
  'KARAKUı': 'KARAKUŞ',
  'KARATAı': 'KARATAŞ',
  'KILIı': 'KILIÇ',
  'KOı': 'KOÇ',
  'SARITAı': 'SARITAŞ',
  'SATIı': 'SATIŞ',
  'SAVAı': 'SAVAŞ',
  'SEVİNı': 'SEVİNÇ',
  'TAı': 'TAŞ',
  'USTABAı': 'USTABAŞ',
  'YEııL': 'YEŞİL',
  'YEııLKAMIı': 'YEŞİLKAMIŞ',
  'YEııLTEPE': 'YEŞİLTEPE',
  'YEııLYURT': 'YEŞİLYURT',
  'DİNER': 'DÖNER',
  'DİRT': 'DÖRT',
  'DİVE': 'DÜVE',
  'GİLER': 'GÜLER',
  'GİNEK': 'GÖNEK',
  'GİKMEN': 'GÖKMEN',
  'GİKOVA': 'GÖKOVA',
  'GİKSU': 'GÖKSU',
  'GİKYER': 'GÖKYER',
  'GİLENLER': 'GÜLENLER',
  'GİNAYDIN': 'GÜNAYDIN',
  'GİNER': 'GÜNER',
  'GİNEı': 'GÜNEŞ',
  'GİRBİZ': 'GÜRBÜZ',
  'GİRKAN': 'GÜRKAN',
  'GİRıııM': 'GİRİŞİM',
  'GİVEN': 'GÜVEN',
  'HİSEYİN': 'HÜSEYİN',
  'ERTİRK': 'ERTÜRK',
  'KİFTECı': 'KÖFTECİ',
  'KİFTEHANEM': 'KÖFTEHANEM',
  'KİKSAL': 'KÖKSAL',
  'KİTAHYA': 'KÜTAHYA',
  'TİRKOİLU': 'TÜRKOĞLU',
  'TİRKİYE': 'TÜRKİYE',
  'TİTİNCİOİLU': 'TÜTÜNCÜOĞLU',
  'BALIKİI': 'BALIKÇI',
  'BALIKİILIK': 'BALIKÇILIK',
  'DEııRMENCı': 'DEĞİRMENCİ',
  'GııYETMEZ': 'GÜÇYETMEZ',
  'SUDEDOıAN': 'SUDEDOĞAN',
  'SUDEDOİAN': 'SUDEDOĞAN',
  'KAMBEROİLU': 'KAMBEROĞLU',
  'KAMBEROİULLARI': 'KAMBEROĞULLARI',
  'POLATOİLU': 'POLATOĞLU',
  'ERDOİAN': 'ERDOĞAN',
  'YALİIN': 'YALÇIN',
  'ALIİVERıı': 'ALIŞVERİŞİ',
  'ALİıVERıı': 'ALIŞVERİŞİ',
  'GENİOİULLARI': 'GENÇOĞULLARI',
  'ııBANK': 'İŞBANK'
};

/**
 * Repairs corrupted Turkish text strings.
 */
export function fixCorruptedTurkishText(str: string | null | undefined): string {
  if (!str) return '';

  let s = str;

  // 1. Compound fixes
  s = s.replace(/LTD\.?ıTı/gi, 'LTD.ŞTİ');
  s = s.replace(/BOYABAT\s+ıZEN\s+GIDA/gi, 'BOYABAT ÖZEN GIDA');
  s = s.replace(/ıNCİLER\s+AL[Iİı]+VER[Iİı]+/gi, 'İNCİLER ALIŞVERİŞİ');
  s = s.replace(/AYNUR\s+GııYETMEZ/gi, 'AYNUR GÜÇYETMEZ');
  s = s.replace(/ııKRı\s+GııYETMEZ/gi, 'ŞÜKRÜ GÜÇYETMEZ');
  s = s.replace(/SUDEDO[Iİı]AN\s+BAHARAT/gi, 'SUDEDOĞAN BAHARAT');
  s = s.replace(/T[Iİ]RK[Iİ]YE\s+[Iİı][Iİı]\s+BANKASI/gi, 'TÜRKİYE İŞ BANKASI');
  s = s.replace(/[Iİı][Iİı]\s+BANKASI/gi, 'İŞ BANKASI');
  s = s.replace(/[Iİı][Iİı]BANK/gi, 'İŞBANK');

  // 2. Generic UTF-8 double-encoding artifacts
  s = s
    .replace(/Ã–/g, 'Ö')
    .replace(/Ãœ/g, 'Ü')
    .replace(/Ä°/g, 'İ')
    .replace(/Ã‡/g, 'Ç')
    .replace(/Ãž/g, 'Ş')
    .replace(/Äž/g, 'Ğ')
    .replace(/Ä±/g, 'ı')
    .replace(/Ã¶/g, 'ö')
    .replace(/ã¶/g, 'ö')
    .replace(/ã–/g, 'ö')
    .replace(/ãœ/g, 'ü')
    .replace(/ã¼/g, 'ü')
    .replace(/ä°/g, 'i')
    .replace(/ä±/g, 'ı')
    .replace(/ã§/g, 'ç')
    .replace(/ãŸ/g, 'ş')
    .replace(/äÿ/g, 'ğ')
    .replace(/ã°/g, 'ı');

  // 3. Token-based dictionary lookup
  s = s.replace(/([A-ZÇĞİÖŞÜa-zçğıöşü]+)/g, (match) => {
    if (CORRUPTED_TURKISH_WORDS[match]) {
      return CORRUPTED_TURKISH_WORDS[match];
    }
    // Suffix rules for Turkish family/company names
    if (match.endsWith('OİLU')) return match.slice(0, -4) + 'OĞLU';
    if (match.endsWith('OİULLARI')) return match.slice(0, -8) + 'OĞULLARI';
    if (match.endsWith('OıLU')) return match.slice(0, -4) + 'OĞLU';
    if (match.endsWith('OıULLARI')) return match.slice(0, -8) + 'OĞULLARI';
    if (match.endsWith('ıTı')) return match.slice(0, -3) + 'ŞTİ';
    return match;
  });

  return s;
}
