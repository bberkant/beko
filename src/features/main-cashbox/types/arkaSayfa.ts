export interface CariRow {
  name: string;
  amount: number;
}

export interface ArkaSayfaData {
  merkez: {
    nakit: number;
    cikis: number;
    pos: number;
  };
  merzifon: {
    nakit: number;
    garanti: number;
    ziraat: number;
    akbank: number;
  };
  atakum: {
    nakit: number;
    kuveyt: number;
    halk: number;
    garanti: number;
    albaraka: number;
    ziraat: number;
  };
  ilkadim: {
    nakit: number;
    ziraat: number;
    deniz: number;
    kuveyt: number;
  };
  depo: {
    giris: number;
    cikis: number;
    devir: number;
    merzifonSubeDevir: number;
    anaKasaDevir: number;
    toplam?: number;
  };
  cariler: CariRow[];
}

export const defaultArkaSayfaData = (): ArkaSayfaData => ({
  merkez: { nakit: 0, cikis: 0, pos: 0 },
  merzifon: { nakit: 0, garanti: 0, ziraat: 0, akbank: 0 },
  atakum: { nakit: 0, kuveyt: 0, halk: 0, garanti: 0, albaraka: 0, ziraat: 0 },
  ilkadim: { nakit: 0, ziraat: 0, deniz: 0, kuveyt: 0 },
  depo: { giris: 0, cikis: 0, devir: 0, merzifonSubeDevir: 0, anaKasaDevir: 0, toplam: 0 },
  cariler: []
});
