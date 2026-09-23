import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { useToast } from '../../../lib/toast';
import type { PosDevice, PosDeviceFormInput } from '../types';
import { initialSeedPosDevices } from './seedData';

interface PosDevicesContextType {
  devices: PosDevice[];
  loading: boolean;
  saving: boolean;
  refresh: () => Promise<void>;
  addDevice: (input: PosDeviceFormInput) => Promise<PosDevice | null>;
  updateDevice: (id: string, input: Partial<PosDeviceFormInput>) => Promise<void>;
  deleteDevice: (id: string) => Promise<void>;
}

const PosDevicesContext = createContext<PosDevicesContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'beko_pos_devices_cache_v2';
const DB_CONFIG_DATE = '1970-01-01'; // POS cihazları kayıt anahtarı

export const normalizeDevice = (raw: any): PosDevice | null => {
  if (!raw || typeof raw !== 'object') return null;
  // If object is empty or test record without device info
  if (!raw.merchantNo && !raw.terminalNo && !raw.bank) return null;
  return {
    id: String(raw.id || 'pos-' + Math.random().toString(36).slice(2, 9)),
    merchantNo: String(raw.merchantNo || ''),
    terminalNo: String(raw.terminalNo || ''),
    location: String(raw.location || 'MERKEZ').toUpperCase(),
    bank: String(raw.bank || 'Ziraat Bankası'),
    deviceModel: raw.deviceModel ? String(raw.deviceModel) : undefined,
    serialNo: raw.serialNo ? String(raw.serialNo) : undefined,
    status: raw.status === 'pasif' ? 'pasif' : raw.status === 'arizali' ? 'arizali' : 'aktif',
    notes: raw.notes ? String(raw.notes) : undefined,
    createdAt: raw.createdAt ? String(raw.createdAt) : new Date().toISOString(),
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : new Date().toISOString()
  };
};

export const PosDevicesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { notify } = useToast();
  const [devices, setDevices] = useState<PosDevice[]>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const valid = parsed.map(normalizeDevice).filter((d): d is PosDevice => d !== null);
          if (valid.length > 0) return valid;
        }
      }
    } catch (e) {
      console.warn('Pos devices localStorage parse error:', e);
    }
    return initialSeedPosDevices;
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Sync to localStorage
  const saveToLocal = (newDevices: PosDevice[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newDevices));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  };

  // Sync to Supabase
  const syncToCloud = async (newDevices: PosDevice[]) => {
    const orgId = user?.organizationId || '13b8da90-27d1-440d-a8f4-eb50dadd6391';
    setSaving(true);
    try {
      const { error } = await supabase
        .from('pos_reports')
        .upsert(
          {
            organization_id: orgId,
            date: DB_CONFIG_DATE,
            left_table: newDevices,
            right_table: [],
            updated_at: new Date().toISOString()
          },
          { onConflict: 'organization_id,date' }
        );

      if (error) {
        console.warn('Supabase pos devices save warning:', error);
      }
    } catch (err) {
      console.warn('Cloud sync error:', err);
    } finally {
      setSaving(false);
    }
  };

  // Load from Supabase on mount
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const orgId = user?.organizationId || '13b8da90-27d1-440d-a8f4-eb50dadd6391';
      const { data, error } = await supabase
        .from('pos_reports')
        .select('left_table')
        .eq('organization_id', orgId)
        .eq('date', DB_CONFIG_DATE)
        .maybeSingle();

      if (!error && data && Array.isArray(data.left_table)) {
        const validDevices = data.left_table
          .map(normalizeDevice)
          .filter((d): d is PosDevice => d !== null);

        if (validDevices.length > 0) {
          setDevices(validDevices);
          saveToLocal(validDevices);
        } else {
          setDevices(initialSeedPosDevices);
          saveToLocal(initialSeedPosDevices);
          void syncToCloud(initialSeedPosDevices);
        }
      } else {
        // If not in cloud, seed the cloud
        if (devices.length > 0) {
          void syncToCloud(devices);
        }
      }
    } catch (e) {
      console.warn('Load pos devices error, falling back to local/seed:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.organizationId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Add new device
  const addDevice = async (input: PosDeviceFormInput): Promise<PosDevice | null> => {
    const newDevice: PosDevice = {
      id: 'pos-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      ...input,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const nextDevices = [newDevice, ...devices];
    setDevices(nextDevices);
    saveToLocal(nextDevices);
    await syncToCloud(nextDevices);
    notify('Yeni POS cihazı başarıyla kaydedildi.', 'success');
    return newDevice;
  };

  // Update existing device
  const updateDevice = async (id: string, input: Partial<PosDeviceFormInput>) => {
    const nextDevices = devices.map(d => {
      if (d.id === id) {
        return {
          ...d,
          ...input,
          updatedAt: new Date().toISOString()
        };
      }
      return d;
    });

    setDevices(nextDevices);
    saveToLocal(nextDevices);
    await syncToCloud(nextDevices);
    notify('POS cihazı bilgileri güncellendi.', 'success');
  };

  // Delete device
  const deleteDevice = async (id: string) => {
    const nextDevices = devices.filter(d => d.id !== id);
    setDevices(nextDevices);
    saveToLocal(nextDevices);
    await syncToCloud(nextDevices);
    notify('POS cihazı listeden silindi.', 'success');
  };

  return (
    <PosDevicesContext.Provider
      value={{
        devices,
        loading,
        saving,
        refresh: loadData,
        addDevice,
        updateDevice,
        deleteDevice
      }}
    >
      {children}
    </PosDevicesContext.Provider>
  );
};

export const usePosDevices = () => {
  const context = useContext(PosDevicesContext);
  if (!context) {
    throw new Error('usePosDevices must be used within a PosDevicesProvider');
  }
  return context;
};
