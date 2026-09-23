export type PosDeviceStatus = 'aktif' | 'pasif' | 'arizali';

export interface PosDevice {
  id: string;
  merchantNo: string;      // İşyeri No
  terminalNo: string;      // Pos No/Terminal No
  location: string;        // Nerede (Merkez, Atakum, Depo vb.)
  bank: string;            // Banka
  deviceModel?: string;    // Cihaz Modeli (Yazarkasa POS, Android POS vb.)
  serialNo?: string;       // Cihaz Seri No
  status: PosDeviceStatus; // Durum
  notes?: string;          // Notlar
  createdAt?: string;
  updatedAt?: string;
}

export type PosDeviceFormInput = Omit<PosDevice, 'id' | 'createdAt' | 'updatedAt'>;

export interface PosDeviceKPIs {
  totalCount: number;
  activeCount: number;
  bankCount: number;
  locationCount: number;
  merkezCount: number;
  subeCount: number;
}
