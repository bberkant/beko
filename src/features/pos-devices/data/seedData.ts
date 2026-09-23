import type { PosDevice } from '../types';

export const initialSeedPosDevices: PosDevice[] = [
  {
    id: 'pos-101',
    merchantNo: '104829104',
    terminalNo: '84920192',
    location: 'MERKEZ',
    bank: 'Ziraat Bankası',
    deviceModel: 'Yazarkasa POS (Hugin)',
    serialNo: 'ZG9948201',
    status: 'aktif',
    notes: 'Merkez Kasa 1 Ana POS Terminali',
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-01-10T08:00:00.000Z'
  },
  {
    id: 'pos-102',
    merchantNo: '492019481',
    terminalNo: '39104821',
    location: 'MERKEZ',
    bank: 'Garanti BBVA',
    deviceModel: 'Android Akıllı POS (Beko)',
    serialNo: 'GB8839201',
    status: 'aktif',
    notes: 'Merkez Kasa 2 Temassız İşlem',
    createdAt: '2026-01-12T08:00:00.000Z',
    updatedAt: '2026-01-12T08:00:00.000Z'
  },
  {
    id: 'pos-103',
    merchantNo: '301948271',
    terminalNo: '77201948',
    location: 'ATAKUM',
    bank: 'Denizbank',
    deviceModel: 'Sabit Masaüstü POS (Ingenico)',
    serialNo: 'DZ1192837',
    status: 'aktif',
    notes: 'Atakum Şube Ana Kasa',
    createdAt: '2026-01-15T08:00:00.000Z',
    updatedAt: '2026-01-15T08:00:00.000Z'
  },
  {
    id: 'pos-104',
    merchantNo: '582019384',
    terminalNo: '19482019',
    location: 'MERKEZ',
    bank: 'Kuveyt Türk',
    deviceModel: 'Mobil Kablosuz POS (Pax)',
    serialNo: 'KT5592817',
    status: 'aktif',
    notes: 'Merkez Saha & Sevkiyat Mobil',
    createdAt: '2026-01-20T08:00:00.000Z',
    updatedAt: '2026-01-20T08:00:00.000Z'
  },
  {
    id: 'pos-105',
    merchantNo: '673920194',
    terminalNo: '55920184',
    location: 'ATAKUM',
    bank: 'Albaraka Türk',
    deviceModel: 'Android Akıllı POS',
    serialNo: 'AB7749201',
    status: 'aktif',
    notes: 'Atakum Şube 2. Terminal',
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-02-01T08:00:00.000Z'
  },
  {
    id: 'pos-106',
    merchantNo: '104829105',
    terminalNo: '84920193',
    location: 'DEPO',
    bank: 'Ö. Ziraat',
    deviceModel: 'Masaüstü Sabit POS',
    serialNo: 'OZ3392810',
    status: 'aktif',
    notes: 'Depo Sevkiyat ve Mal Kabul POS',
    createdAt: '2026-02-05T08:00:00.000Z',
    updatedAt: '2026-02-05T08:00:00.000Z'
  },
  {
    id: 'pos-107',
    merchantNo: '928301948',
    terminalNo: '66392014',
    location: 'MERKEZ',
    bank: 'Akbank',
    deviceModel: 'Yazarkasa POS (Profilo)',
    serialNo: 'AK4492819',
    status: 'aktif',
    notes: 'Merkez Muhasebe Masası POS',
    createdAt: '2026-02-10T08:00:00.000Z',
    updatedAt: '2026-02-10T08:00:00.000Z'
  },
  {
    id: 'pos-108',
    merchantNo: '401928374',
    terminalNo: '88291047',
    location: 'MERKEZ',
    bank: 'Halkbank',
    deviceModel: 'Mobil POS',
    serialNo: 'HB2281938',
    status: 'aktif',
    notes: 'Paraf Kart Kampanya POS',
    createdAt: '2026-02-15T08:00:00.000Z',
    updatedAt: '2026-02-15T08:00:00.000Z'
  },
  {
    id: 'pos-109',
    merchantNo: '512938471',
    terminalNo: '99482015',
    location: 'ATAKUM',
    bank: 'Vakıfbank',
    deviceModel: 'Yazarkasa POS',
    serialNo: 'VB6649281',
    status: 'aktif',
    notes: 'Atakum Şube Yedek Terminal',
    createdAt: '2026-03-01T08:00:00.000Z',
    updatedAt: '2026-03-01T08:00:00.000Z'
  }
];

export const POPULAR_BANKS = [
  'Ziraat Bankası',
  'Garanti BBVA',
  'Denizbank',
  'Kuveyt Türk',
  'Albaraka Türk',
  'Ö. Ziraat',
  'Akbank',
  'Halkbank',
  'Vakıfbank',
  'Yapı Kredi',
  'İş Bankası',
  'QNB Finansbank',
  'TEB'
];

export const POPULAR_LOCATIONS = [
  'MERKEZ',
  'ATAKUM',
  'DEPO',
  'FABRİKA',
  'SAHA / MOBİL'
];
