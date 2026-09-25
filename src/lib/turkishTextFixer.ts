/**
 * Turkish Text Corruption Repair Utility
 * Repairs garbled / misencoded Turkish characters originating from legacy Firebird / EBS databases
 * (Windows-1254 / CP857 -> UTF-8 decoding anomalies).
 */

export const CORRUPTED_TURKISH_WORDS: Record<string, string> = {
  // Cities, Districts & Locations
  'ıSTANBUL': 'İSTANBUL',
  'ıZMİR': 'İZMİR',
  'ıZMİT': 'İZMİT',
  'ıZZMİR': 'İZMİR',
  'ıNYE': 'ÜNYE',
  'ELAZIı': 'ELAZIĞ',
  'ELMADAı': 'ELMADAĞ',
  'GİMııHANE': 'GÜMÜŞHANE',
  'ıARİAMBA': 'ÇARŞAMBA',
  'ıARİAMBALI': 'ÇARŞAMBALI',
  'ıANKAYA': 'ÇANKAYA',
  'ıANKIRI': 'ÇANKIRI',
  'DEııRMENDERE': 'DEĞİRMENDERE',
  'ıSTOı': 'İSTOÇ',
  'DİKİLı': 'DİKİLİ',
  'GİNEYSU': 'GÜNEYSU',
  'KİTAHYA': 'KÜTAHYA',
  'ıMİTKİY': 'ÜMİTKÖY',
  'ıSKENDERUN': 'İSKENDERUN',
  'ıORUM': 'ÇORUM',
  'ıUBUK': 'ÇUBUK',
  'ESKııEHİR': 'ESKİŞEHİR',
  'YENııEHİR': 'YENİŞEHİR',
  'KEıııREN': 'KEÇİÖREN',
  'KOCAELı': 'KOCAELİ',
  'TEKİRDAı': 'TEKİRDAĞ',
  'ıIRNAK': 'ŞIRNAK',
  'ıAYYOLU': 'ÇAYYOLU',
  'ıAYIROVA': 'ÇAYIROVA',
  'ıATALCA': 'ÇATALCA',
  'ıSCEHİSAR': 'İSCEHİSAR',
  'ıNEGİL': 'İNEGÖL',
  'MECİTİZı': 'MECİTÖZÜ',
  'ıUKURAMBAR': 'ÇUKURAMBAR',
  'ıMRANİYE': 'ÜMRANİYE',
  'ERENKİY': 'ERENKÖY',
  'TEKKEKİY': 'TEKKEKÖY',
  'FİRUZKİY': 'FİRUZKÖY',
  'ıLYASKİY': 'İLYASKÖY',
  'MECİDİYEKİY': 'MECİDİYEKÖY',
  'ALİBEYKİY': 'ALİBEYKÖY',
  'DİZKİY': 'DÜZKÖY',
  'KAYSERı': 'KAYSERİ',
  'DENİZLı': 'DENİZLİ',
  'SULTANBEYLı': 'SULTANBEYLİ',
  'SUTANBEYLı': 'SULTANBEYLİ',
  'ıKİTELLı': 'İKİTELLİ',
  'KıııKYALI': 'KÜÇÜKYALI',
  'KıııKESAT': 'KÜÇÜKESAT',
  'NııANTAİI': 'NİŞANTAŞI',
  'NııDE': 'NİĞDE',
  'EREİLı': 'EREĞLİ',
  'EREİLİSı': 'EREĞLİSİ',
  'ıAYELı': 'ÇAYELİ',
  'HALFETı': 'HALFETİ',
  'BOİAZııı': 'BOĞAZİÇİ',
  'ııRİNEVLER': 'ŞİRİNEVLER',
  'YEııLKENT': 'YEŞİLKENT',
  'YEııLBAYRI': 'YEŞİLBAYIR',
  'YEııLYURT': 'YEŞİLYURT',
  'ıVEDİK': 'İVEDİK',
  'ıSKİTLER': 'İSKİTLER',
  'PAZARYERı': 'PAZARYERİ',
  'ıNİNı': 'İNÖNÜ',
  'ULUDAı': 'ULUDAĞ',
  'ıSTASYON': 'İSTASYON',
  'ıSTAT': 'İSTAT',
  'YENİDOİAN': 'YENİDOĞAN',
  'MUMHANEİNı': 'MUMHANEÖNÜ',
  'TANDOİAN': 'TANDOĞAN',
  'HİSEYİNGAZı': 'HÜSEYİNGAZİ',
  'ıNCİRLı': 'İNCİRLİ',

  // Banking, Accounting & Commercial Terms
  'KRı': 'KREDİ',
  'BORı': 'BORÇ',
  'ıı': 'İÇ',
  'DIı': 'DIŞ',
  'ıEK': 'ÇEK',
  'ıEKı': 'ÇEKİ',
  'ıEKLER': 'ÇEKLER',
  'ıEKMECEDE': 'ÇEKMECEDE',
  'ıADE': 'İADE',
  'ıDEME': 'ÖDEME',
  'ıDEDı': 'ÖDEDİ',
  'ıDEYECEK': 'ÖDEYECEK',
  'ıCRA': 'İCRA',
  'ıCRADA': 'İCRADA',
  'SANAYı': 'SANAYİ',
  'TİCARı': 'TİCARİ',
  'TEKNOLOJı': 'TEKNOLOJİ',
  'SİTESı': 'SİTESİ',
  'SİMETRı': 'SİMETRİ',
  'KREDı': 'KREDİ',
  'GARANTı': 'GARANTİ',
  'ıUBE': 'ŞUBE',
  'ıUBESı': 'ŞUBESİ',
  'ıNİVERSİTESı': 'ÜNİVERSİTESİ',
  'MAHALLESı': 'MAHALLESİ',
  'CADDESı': 'CADDESİ',
  'SAYDAMCADDESı': 'SAYDAM CADDESİ',
  'KALESı': 'KALESİ',
  'TESİSLERı': 'TESİSLERİ',
  'MADDELERı': 'MADDELERİ',
  'ııLETMELER': 'İŞLETMELER',
  'EııTİM': 'EĞİTİM',
  'ıNİAAT': 'İNŞAAT',
  'MARKETııLİK': 'MARKETÇİLİK',
  'YEMEKııLİK': 'YEMEKÇİLİK',
  'YEMEKHANECı': 'YEMEKHANECİ',
  'KEMİKıı': 'KEMİKÇİ',
  'KEMİKLı': 'KEMİKLİ',
  'DERİCı': 'DERİCİ',
  'SEMERCı': 'SEMERCİ',
  'DEMİRCı': 'DEMİRCİ',
  'CEBECı': 'CEBECİ',
  'ETıı': 'ETÇİ',
  'ETı': 'ETİ',
  'DERı': 'DERİ',
  'BESı': 'BESİ',
  'ENERJı': 'ENERJİ',
  'AKADEMı': 'AKADEMİ',
  'SEVGı': 'SEVGİ',
  'BİLGı': 'BİLGİ',
  'BİLGİLı': 'BİLGİLİ',
  'GERı': 'GERİ',
  'YENı': 'YENİ',
  'YEDı': 'YEDİ',
  'KENDı': 'KENDİ',
  'KENDİSı': 'KENDİSİ',
  'KISMı': 'KISMI',
  'ıEKERBANK': 'ŞEKERBANK',
  'ıEKERBENK': 'ŞEKERBANK',
  'ıEKERPINAR': 'ŞEKERPINAR',
  'ııFTLİK': 'ÇİFTLİK',
  'ııFTLııı': 'ÇİFTLİĞİ',
  'ıZOLASYAON': 'İZOLASYON',
  'DİNıııM': 'DÖNÜŞÜM',
  'DEııııM': 'DEĞİŞİM',
  'ıARİI': 'ÇARŞI',
  'ıARİIBAİI': 'ÇARŞIBAŞI',
  'tarım': 'TARIM',
  'ilkadım': 'İLKADIM',
  'ııBANK': 'İŞBANK',

  // Names, Surnames & Company Entities
  'PEİE': 'PEÇE',
  'ALı': 'ALİ',
  'TERMELı': 'TERMELİ',
  'DOİAN': 'DOĞAN',
  'ıYİK': 'ÖYÜK',
  'ııNKA': 'ÇINKA',
  'NAZMı': 'NAZMİ',
  'ıAİDAı': 'ÇAĞDAŞ',
  'ıAMLIDAı': 'ÇAMLIDAĞ',
  'ZİRAı': 'ZİRAAT',
  'YARDİBı': 'YARDİBİ',
  'SASı': 'SASİ',
  'ERDı': 'ERDİ',
  'ıRER': 'ÜRER',
  'ABı': 'ABİ',
  'YıııT': 'YİĞİT',
  'SADı': 'SADİ',
  'CııER': 'CİĞER',
  'PERKTAı': 'PEKTAŞ',
  'ıBRAHİM': 'İBRAHİM',
  'ıLKADIM': 'İLKADIM',
  'ıOTA': 'ÇOTA',
  'GİLDOİAN': 'GÜLDOĞAN',
  'BAYİAı': 'BAYTAŞ',
  'ıALIKUİU': 'ÇALIKUŞU',
  'HADı': 'HADİ',
  'ıKE': 'ÖKE',
  'GAZı': 'GAZİ',
  'HİNERLı': 'HÜNERLİ',
  'ıZNUR': 'ÖZNUR',
  'ıZNIR': 'ÖZNUR',
  'KAYIı': 'KAYIŞ',
  'GİMııOĞLU': 'GÜMÜŞOĞLU',
  'SıııT': 'SÖĞÜT',
  'SıııTTEN': 'SÜTTEN',
  'ııKALE': 'İÇKALE',
  'GİRGİLı': 'GÜRGÜLÜ',
  'OFTAı': 'OFTAŞ',
  'ESKı': 'ESKİ',
  'TAııI': 'TAŞÇI',
  'NİYAZı': 'NİYAZİ',
  'ARKADAı': 'ARKADAŞ',
  'ZEKı': 'ZEKİ',
  'ııEL': 'İÇEL',
  'KALEBAı': 'KALEBAŞ',
  'NİKTAı': 'NİKTAŞ',
  'GİNEİLı': 'GÜNEŞLİ',
  'RAMı': 'RAMİ',
  'DETAı': 'DETAY',
  'ıZKAR': 'ÖZKAR',
  'AKDAı': 'AKDAĞ',
  'DURMUı': 'DURMUŞ',
  'ıZKOı': 'ÖZKOÇ',
  'ıNCı': 'İNCİ',
  'ıZİMAİI': 'ÖZÇİMAĞI',
  'ıııMANLAR': 'ŞİŞMANLAR',
  'ıZKADRı': 'ÖZKADRİ',
  'HİLMı': 'HİLMİ',
  'ATEı': 'ATEŞ',
  'ıPEKCİOİLU': 'İPEKÇİOĞLU',
  'ıAİMAZ': 'ÇAĞMAZ',
  'GııLı': 'GÜÇLÜ',
  'Pıııı': 'PÖÇÜ',
  'Pıı': 'PÖÇÜ',
  'PııCı': 'PİŞİCİ',
  'ıATAN': 'ÇATAN',
  'ıETAı': 'ÇETAŞ',
  'ıBF': 'İBF',
  'ıKSİZ': 'ÖKSÜZ',
  'ıZGAZİANTEP': 'ÖZGAZİANTEP',
  'AKKUı': 'AKKUŞ',
  'ıMİT': 'ÜMİT',
  'ııKRı': 'ŞÜKRÜ',
  'GııYETMEZ': 'GÜÇYETMEZ',
  'ıZTAı': 'ÖZTAŞ',
  'ıZYILDIRIM': 'ÖZYILDIRIM',
  'BİPAı': 'BİPAŞ',
  'HARBı': 'HARBİ',
  'ıHSAN': 'İHSAN',
  'ASı': 'ASİ',
  'KURTULUı': 'KURTULUŞ',
  'VEHBı': 'VEHBİ',
  'ıKKEı': 'ÖKKEŞ',
  'DURALı': 'DURALİ',
  'RİZELı': 'RİZELİ',
  'GİMıı': 'GÜMÜŞ',
  'TATKİPı': 'TATKÜPÜ',
  'ıZEDEF': 'ÖZEDEF',
  'KELESı': 'KELEŞİ',
  'GİNPAı': 'GÜNPAŞ',
  'ıZOZAN': 'ÖZOZAN',
  'SAFAı': 'ŞAFAK',
  'ALııEN': 'ALİŞEN',
  'GEMı': 'GEMİ',
  'ıAKIR': 'ŞAKİR',
  'ıAKİR': 'ŞAKİR',
  'ıNDER': 'ÖNDER',
  'ıZPA': 'ÖZPA',
  'ATALMIı': 'ATALMIŞ',
  'MARı': 'MARİ',
  'ııMıı': 'GÜMÜŞ',
  'KARı': 'KARI',
  'DELı': 'DELİ',
  'BETAı': 'BETAŞ',
  'ıZKAHRAMAN': 'ÖZKAHRAMAN',
  'ıETİN': 'ÇETİN',
  'EMEı': 'EMEÇ',
  'ıııZ': 'ÜÇÜZ',
  'GİZDAı': 'GÖZDAĞ',
  'ıRSYUM': 'ÖRSYÜM',
  'ıAVUNDURLUOĞLU': 'ÇAVUNDURLUOĞLU',
  'ıLKİN': 'İLKİN',
  'ıRFAN': 'İRFAN',
  'ıEN': 'ŞEN',
  'ıZHAN': 'ÖZHAN',
  'BAı': 'BAŞ',
  'ıMER': 'ÖMER',
  'ıZCAN': 'ÖZCAN',
  'SİTııOĞLU': 'SÜTÇÜOĞLU',
  'KAHRAYAı': 'KAHRAYAŞ',
  'SEVııLER': 'SEVİÇLER',
  'TUNALIHİLMı': 'TUNALI HİLMİ',
  'ıIKIı': 'ÇIKIŞ',
  'ıSTİNDAı': 'ÜSTÜNDAĞ',
  'ıAKIROĞLU': 'ŞAKİROĞLU',
  'ıAHİN': 'ŞAHİN',
  'KAPTANOİLU': 'KAPTANOĞLU',
  'ıZYURTSEVEN': 'ÖZYURTSEVEN',
  'ıELİKEL': 'ÇELİKEL',
  'DıııN': 'DÜĞÜN',
  'KILı': 'KILIÇ',
  'ıZBEN': 'ÖZBEN',
  'NURı': 'NURİ',
  'TİMUııN': 'TİMURÇİN',
  'ıSTİN': 'ÜSTÜN',
  'GİMAı': 'GÜMAŞ',
  'KııK': 'KÖŞK',
  'ıZKILIı': 'ÖZKILIÇ',
  'ıZOİUL': 'ÖZOĞUL',
  'MUı': 'MUŞ',
  'KıııK': 'KÜÇÜK',
  'TAİBAı': 'TAŞBAŞ',
  'ıIHLAR': 'ÇIHLAR',
  'ıAKIRYILDIZ': 'ŞAKİRYILDIZ',
  'KEMEıı': 'KEMEÇİ',
  'ıMZ': 'ÖZ',
  'ıZ': 'ÖZ',
  'ıANKAı': 'ÇANKAYA',
  'ESER ıANKAı': 'ESER ÇANKAYA',
  'COı': 'COŞ',
  'Sı': 'Sİ',
  'ıZİELİKKAYALAR': 'ÖZÇELİKKAYALAR',
  'GİLLı': 'GÜLLÜ',
  'ıN': 'ÖN',
  'YAİAR': 'YAŞAR',
  'KARDEİLER': 'KARDEŞLER',
  'ıENGİL': 'ŞENGİL',
  'ıENOL': 'ŞENOL',
  'ıEREF': 'ŞEREF',
  'ıHTİYAı': 'İHTİYAÇ',
  'ıINAR': 'ÇINAR',
  'ıKLİM': 'İKLİM',
  'ıLHAMı': 'İLHAMİ',
  'ıLHAN': 'İLHAN',
  'ıLKADIı': 'İLKADIM',
  'ıLKER': 'İLKER',
  'ıLKNUR': 'İLKNUR',
  'ıMECE': 'İMECE',
  'ıMİR': 'ÖMÜR',
  'ıNAL': 'ÜNAL',
  'ıNAN': 'İNAN',
  'ıNANı': 'İNANÇ',
  'ıNCE': 'İNCE',
  'ıNCİLER': 'İNCİLER',
  'ıNSAL': 'ÜNSAL',
  'ıOBAN': 'ÇOBAN',
  'ıPEK': 'İPEK',
  'ıRETİM': 'ÜRETİM',
  'ıRİNLERı': 'ÜRÜNLERİ',
  'ıSA': 'İSA',
  'ıSKONTO': 'İSKONTO',
  'ıSMAİL': 'İSMAİL',
  'ıSMAİLOİLU': 'İSMAİLOĞLU',
  'ıZAYDIN': 'ÖZAYDIN',
  'ıZDEMİR': 'ÖZDEMİR',
  'ıZDOİAN': 'ÖZDOĞAN',
  'ıZDOıAN': 'ÖZDOĞAN',
  'ıZEL': 'ÖZEL',
  'ıZEN': 'ÖZEN',
  'ıZER': 'ÖZER',
  'ıZKAN': 'ÖZKAN',
  'ıZTİRK': 'ÖZTÜRK',
  'ıZİELİK': 'ÖZÇELİK',
  'ııMÇEK': 'ŞİMŞEK',
  'ıABAN': 'ŞABAN',
  'ıAFAK': 'ŞAFAK',
  'ıAHİNER': 'ŞAHİNER',
  'ıALIİKAN': 'ÇALIŞKAN',
  'ıAMPİYON': 'ŞAMPİYON',
  'ıANLI': 'ŞANLI',
  'ıATIR': 'ŞATIR',
  'ıAİLAR': 'ÇAĞLAR',
  'ıAİLAYAN': 'ÇAĞLAYAN',
  'ıDRİS': 'İDRİS',
  'ıEFİKA': 'ŞEFİKA',
  'ıEHİR': 'ŞEHİR',
  'CARı': 'CARİ',
  'TİCARETı': 'TİCARETİ',
  'YAPIKREDı': 'YAPIKREDİ',
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
  'TİRKOİLU': 'TÜRKOĞLU',
  'TİRKİYE': 'TÜRKİYE',
  'TİTİNCİOİLU': 'TÜTÜNCÜOĞLU',
  'BALIKİI': 'BALIKÇI',
  'BALIKİILIK': 'BALIKÇILIK',
  'DEııRMENCı': 'DEĞİRMENCİ',
  'SUDEDOıAN': 'SUDEDOĞAN',
  'SUDEDOİAN': 'SUDEDOĞAN',
  'KAMBEROİLU': 'KAMBEROĞLU',
  'KAMBEROİULLARI': 'KAMBEROĞULLARI',
  'POLATOİLU': 'POLATOĞLU',
  'ERDOİAN': 'ERDOĞAN',
  'YALİIN': 'YALÇIN',
  'ALIİVERıı': 'ALIŞVERİŞİ',
  'ALİıVERıı': 'ALIŞVERİŞİ',
  'GENİOİULLARI': 'GENÇOĞULLARI'
};

/**
 * Repairs corrupted Turkish text strings originating from legacy Firebird / EBS databases.
 */
export function fixCorruptedTurkishText(str: string | null | undefined, fieldName?: string): string {
  if (!str) return '';

  let s = str.trim();

  // 1. Bank Name Specific Checks
  if (fieldName === 'bank_name') {
    if (/^(ıı|İİ|II)$/i.test(s)) return 'İŞ BANKASI';
    if (/^[Iİı][Iİı]\s*BANKASI$/i.test(s)) return 'İŞ BANKASI';
  }

  // 2. Multi-word Compound Expressions
  s = s.replace(/\bT[Iİ]RK[Iİ]YE\s+[Iİı][Iİı]\b/gi, 'TÜRKİYE İŞ BANKASI');
  s = s.replace(/\bT[Iİ]RK[Iİ]YE\s+[Iİı][Iİı]\s+BANKASI\b/gi, 'TÜRKİYE İŞ BANKASI');
  s = s.replace(/PSL\s+[Iİı][Iİı]\s+VE\s+D[Iİı][Iİı]\s+TİCARET/gi, 'PSL İÇ VE DIŞ TİCARET');
  s = s.replace(/PSL\s+[Iİı][Iİı]\s+VE\s+DIı\s+TİCARET/gi, 'PSL İÇ VE DIŞ TİCARET');
  s = s.replace(/PSL\s+İÇ\s+VE\s+D[Iİı][Iİı]\s+TİCARET/gi, 'PSL İÇ VE DIŞ TİCARET');
  s = s.replace(/PSL\s+İİ\s+VE\s+Dİİ\s+TİCARET/gi, 'PSL İÇ VE DIŞ TİCARET');
  s = s.replace(/PSL\s+II\s+VE\s+DII\s+TICARET/gi, 'PSL İÇ VE DIŞ TİCARET');
  s = s.replace(/\b[Iİı][Iİı]\s+VE\s+D[Iİı][Iİı]\s+TİCARET\b/gi, 'İÇ VE DIŞ TİCARET');
  s = s.replace(/\b[Iİı][Iİı]\s+VE\s+DIı\s+TİCARET\b/gi, 'İÇ VE DIŞ TİCARET');
  s = s.replace(/\bDI[Iİı]\s+TİCARET\b/gi, 'DIŞ TİCARET');
  s = s.replace(/\bD[Iİı][Iİı]\s+TİCARET\b/gi, 'DIŞ TİCARET');
  s = s.replace(/\b[Iİı][Iİı]\s+TİCARET\b/gi, 'İÇ TİCARET');
  s = s.replace(/YAVUZ\s+SELİM\s+PE[Iİı]E/gi, 'YAVUZ SELİM PEÇE');
  s = s.replace(/\bPE[Iİı]E\b/g, 'PEÇE');
  s = s.replace(/\bLTD\.?\s*ıTı\b/gi, 'LTD.ŞTİ');
  s = s.replace(/\bA\.?\s*ı\.?\b/gi, 'A.Ş.');
  s = s.replace(/KARDE[Iİı]LER/gi, 'KARDEŞLER');
  s = s.replace(/TOPTANCILAR\s+SİTES[Iİı]/gi, 'TOPTANCILAR SİTESİ');
  s = s.replace(/SANAY[Iİı]\s+SİTES[Iİı]/gi, 'SANAYİ SİTESİ');
  s = s.replace(/TOPKAPI\s+SANAY[Iİı]/gi, 'TOPKAPI SANAYİ');
  s = s.replace(/YENİBOSNA\s+TİCAR[Iİı]/gi, 'YENİBOSNA TİCARİ');
  s = s.replace(/TUNALI\s+HİLM[Iİı]/gi, 'TUNALI HİLMİ');
  s = s.replace(/TUNALIHİLM[Iİı]/gi, 'TUNALI HİLMİ');
  s = s.replace(/MUMHANE[Iİı]N[Iİı]/gi, 'MUMHANEÖNÜ');
  s = s.replace(/BOYABAT\s+ıZEN\s+GIDA/gi, 'BOYABAT ÖZEN GIDA');
  s = s.replace(/ıNCİLER\s+AL[Iİı]+VER[Iİı]+/gi, 'İNCİLER ALIŞVERİŞİ');
  s = s.replace(/AYNUR\s+GııYETMEZ/gi, 'AYNUR GÜÇYETMEZ');
  s = s.replace(/ııKRı\s+GııYETMEZ/gi, 'ŞÜKRÜ GÜÇYETMEZ');
  s = s.replace(/SUDEDO[Iİı]AN\s+BAHARAT/gi, 'SUDEDOĞAN BAHARAT');
  s = s.replace(/[Iİı][Iİı]\s+BANKASI/gi, 'İŞ BANKASI');
  s = s.replace(/[Iİı][Iİı]BANK/gi, 'İŞBANK');

  // 3. Generic UTF-8 double-encoding artifacts
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

  // 4. Token-based dictionary lookup & Morphological rules
  s = s.replace(/([A-ZÇĞİÖŞÜa-zçğıöşü]+)/g, (match) => {
    if (CORRUPTED_TURKISH_WORDS[match]) {
      return CORRUPTED_TURKISH_WORDS[match];
    }
    
    // Dynamic suffix / prefix rules
    if (match.endsWith('OİLU') || match.endsWith('OıLU')) return match.slice(0, -4) + 'OĞLU';
    if (match.endsWith('OİULLARI') || match.endsWith('OıULLARI')) return match.slice(0, -8) + 'OĞULLARI';
    if (match.endsWith('ıTı')) return match.slice(0, -3) + 'ŞTİ';
    if (match.endsWith('KİY') && match.length > 3) return match.slice(0, -3) + 'KÖY';
    if (match.endsWith('DAı') && match.length > 3) return match.slice(0, -3) + 'DAĞ';
    if (match.endsWith('DOİAN')) return match.slice(0, -5) + 'DOĞAN';
    if (match.endsWith('EİLı')) return match.slice(0, -4) + 'EĞLİ';
    if (match.endsWith('Cıı')) return match.slice(0, -3) + 'Çİ';
    if (match.endsWith('SİTESı')) return match.slice(0, -6) + 'SİTESİ';
    if (match.endsWith('UBESı')) return match.slice(0, -5) + 'UBESİ';
    if (match.startsWith('ıZ') && match.length > 2) return 'ÖZ' + match.slice(2);
    if (match.startsWith('ıSTANBUL')) return 'İSTANBUL' + match.slice(8);
    if (match.startsWith('ıZMİR')) return 'İZMİR' + match.slice(5);
    if (match.startsWith('ıZMİT')) return 'İZMİT' + match.slice(5);
    if (match.startsWith('ıSKENDERUN')) return 'İSKENDERUN' + match.slice(10);

    return match;
  });

  return s;
}
