import React from 'react';

export interface WallpaperConfig {
  preset: 'doodle' | 'dark_slate' | 'midnight_blue' | 'emerald_green' | 'warm_coffee' | 'geometric' | 'plain' | 'custom';
  customColor?: string;
  customImageUrl?: string;
  showDoodle: boolean;
  doodleOpacity: number; // 0 - 100
}

export const DEFAULT_WALLPAPER_CONFIG: WallpaperConfig = {
  preset: 'doodle',
  showDoodle: true,
  doodleOpacity: 40,
};

// Official & Rich WhatsApp Doodle SVG Pattern
const getDoodleSvg = (strokeColor: string, opacity: number) => {
  const alpha = (opacity / 100).toFixed(2);
  const stroke = strokeColor;
  
  // 400x400 seamless SVG tile with authentic WhatsApp icons
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="360" height="360" viewBox="0 0 360 360" fill="none" stroke="${stroke}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" opacity="${alpha}">
    <!-- Coffee cup -->
    <path d="M40 50h24v16a12 12 0 01-12 12h0a12 12 0 01-12-12V50zM64 54h6a5 5 0 010 10h-6M36 84h32"/>
    <path d="M46 42c0-4 4-4 4-8M54 42c0-4 4-4 4-8"/>

    <!-- Speech bubble -->
    <path d="M120 40h35a8 8 0 018 8v16a8 8 0 01-8 8h-18l-10 8v-8h-7a8 8 0 01-8-8V48a8 8 0 018-8z"/>
    <path d="M130 52h16M130 58h10"/>

    <!-- Camera -->
    <path d="M220 48h8l3-6h16l3 6h8a6 6 0 016 6v20a6 6 0 01-6 6h-38a6 6 0 01-6-6V54a6 6 0 016-6z"/>
    <circle cx="239" cy="62" r="7"/>

    <!-- Music note -->
    <path d="M310 40v26a6 6 0 11-4-5.6V46l20-4v20a6 6 0 11-4-5.6V38l-12 2z"/>

    <!-- Heart -->
    <path d="M48 140c-6-8-18-4-18 6 0 10 18 22 18 22s18-12 18-22c0-10-12-14-18-6z"/>

    <!-- Clock -->
    <circle cx="140" cy="145" r="15"/>
    <path d="M140 135v10l7 4"/>

    <!-- Smiley -->
    <circle cx="235" cy="145" r="16"/>
    <circle cx="229" cy="141" r="1.5" fill="${stroke}"/>
    <circle cx="241" cy="141" r="1.5" fill="${stroke}"/>
    <path d="M228 150c2 4 12 4 14 0"/>

    <!-- Paper airplane -->
    <path d="M305 130l28 14-28 14 6-14-6-14zM311 144h18"/>

    <!-- Car / Truck -->
    <path d="M35 235h36l6 10h12v14H30v-10l5-14zM30 259h60"/>
    <circle cx="46" cy="260" r="5"/>
    <circle cx="75" cy="260" r="5"/>

    <!-- Padlock -->
    <rect x="125" y="235" width="24" height="18" rx="4"/>
    <path d="M131 235v-7a6 6 0 0112 0v7"/>
    <circle cx="137" cy="244" r="2" fill="${stroke}"/>

    <!-- Smartphone -->
    <rect x="225" y="225" width="18" height="32" rx="4"/>
    <line x1="231" y1="251" x2="237" y2="251"/>

    <!-- Star & Sparkle -->
    <path d="M320 225l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7z"/>
    <circle cx="302" cy="248" r="2" fill="${stroke}"/>

    <!-- Cloud with rain -->
    <path d="M45 320a10 10 0 0118-4 8 8 0 0112 8H40a8 8 0 015-4z"/>
    <line x1="48" y1="330" x2="46" y2="336"/>
    <line x1="58" y1="330" x2="56" y2="336"/>
    <line x1="68" y1="330" x2="66" y2="336"/>

    <!-- Shopping bag -->
    <path d="M125 320l4-15h22l4 15H125z"/>
    <path d="M132 305a4 4 0 018 0"/>

    <!-- Checkmark badge -->
    <circle cx="235" cy="320" r="14"/>
    <path d="M228 320l4 4 9-9"/>

    <!-- Headset -->
    <path d="M305 325v-8a14 14 0 0128 0v8"/>
    <rect x="303" y="322" width="4" height="8" rx="2"/>
    <rect x="331" y="322" width="4" height="8" rx="2"/>
    <path d="M331 330v4a4 4 0 01-4 4h-4"/>

    <!-- Small decorative dots & pluses -->
    <circle cx="90" cy="90" r="2" fill="${stroke}"/>
    <circle cx="185" cy="95" r="1.5" fill="${stroke}"/>
    <circle cx="280" cy="85" r="2" fill="${stroke}"/>
    <circle cx="85" cy="190" r="1.5" fill="${stroke}"/>
    <circle cx="185" cy="195" r="2" fill="${stroke}"/>
    <circle cx="280" cy="180" r="1.5" fill="${stroke}"/>
    <circle cx="95" cy="290" r="2" fill="${stroke}"/>
    <circle cx="180" cy="295" r="1.5" fill="${stroke}"/>
    <circle cx="275" cy="275" r="2" fill="${stroke}"/>
  </svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

// Geometric Grid SVG Pattern
const getGeometricSvg = (strokeColor: string, opacity: number) => {
  const alpha = (opacity / 100).toFixed(2);
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60" fill="none" stroke="${strokeColor}" stroke-width="1" opacity="${alpha}">
    <path d="M30 0l30 17.32v34.64L30 69.28 0 51.96V17.32L30 0z"/>
    <path d="M0 17.32L30 34.64 60 17.32M30 34.64v34.64"/>
  </svg>
  `.trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export interface WallpaperPresetItem {
  id: WallpaperConfig['preset'];
  name: string;
  description: string;
  darkBg: string;
  lightBg: string;
  previewBg: string;
  type: 'doodle' | 'geometric' | 'plain' | 'custom';
}

export const WALLPAPER_PRESETS: WallpaperPresetItem[] = [
  {
    id: 'doodle',
    name: 'Klasik WhatsApp Doodle',
    description: 'Orijinal zengin WhatsApp çizimleri ve simgeleri',
    darkBg: '#0b141a',
    lightBg: '#efeae2',
    previewBg: '#0b141a',
    type: 'doodle',
  },
  {
    id: 'dark_slate',
    name: 'Gece Siyahı (Deep Dark)',
    description: 'Minimalist, göz yormayan derin koyu siyah ton',
    darkBg: '#080d11',
    lightBg: '#f8fafc',
    previewBg: '#080d11',
    type: 'doodle',
  },
  {
    id: 'midnight_blue',
    name: 'Gece Mavisi (Midnight)',
    description: 'Kurumsal ve şık gece mavisi / lacivert ton',
    darkBg: '#091422',
    lightBg: '#edf2f7',
    previewBg: '#091422',
    type: 'doodle',
  },
  {
    id: 'emerald_green',
    name: 'Zümrüt Yeşili (WhatsApp Forest)',
    description: 'Derin orman ve zümrüt yeşili WhatsApp rengi',
    darkBg: '#06201b',
    lightBg: '#e6f4f1',
    previewBg: '#06201b',
    type: 'doodle',
  },
  {
    id: 'warm_coffee',
    name: 'Sıcak Moka & Kahve',
    description: 'Sıcak toprak ve kahve tonları',
    darkBg: '#1c1412',
    lightBg: '#f5eee6',
    previewBg: '#1c1412',
    type: 'doodle',
  },
  {
    id: 'geometric',
    name: 'Geometrik Tech Matrix',
    description: 'Modern hekzagonal petek & matrix deseni',
    darkBg: '#0a1017',
    lightBg: '#f1f5f9',
    previewBg: '#0a1017',
    type: 'geometric',
  },
  {
    id: 'plain',
    name: 'Düz & Desensiz Sade',
    description: 'Çizimsiz, temiz ve sade tek renk arka plan',
    darkBg: '#111b21',
    lightBg: '#f4f6f8',
    previewBg: '#111b21',
    type: 'plain',
  },
  {
    id: 'custom',
    name: 'Özel Renk veya Görsel',
    description: 'Kendi renginizi veya görsel URL adresinizi belirleyin',
    darkBg: '#0b141a',
    lightBg: '#efeae2',
    previewBg: 'linear-gradient(135deg, #0b141a 0%, #005c4b 100%)',
    type: 'custom',
  }
];

export const COLOR_SWATCHES = [
  { name: 'Orijinal Koyu', hex: '#0b141a' },
  { name: 'Gece Siyahı', hex: '#000000' },
  { name: 'Gece Mavisi', hex: '#0f172a' },
  { name: 'Zümrüt Yeşil', hex: '#062822' },
  { name: 'Antrasit', hex: '#18181b' },
  { name: 'Moka Kahve', hex: '#261c1a' },
  { name: 'Bordo Gece', hex: '#240f16' },
  { name: 'Klasik Açık', hex: '#efeae2' },
  { name: 'Açık Gri', hex: '#f1f5f9' },
  { name: 'Açık Nane', hex: '#e2ede5' },
  { name: 'Açık Mavi', hex: '#e0f2fe' },
];

export function getWallpaperStyle(config: WallpaperConfig, isDark: boolean): React.CSSProperties {
  // Custom image URL
  if (config.preset === 'custom' && config.customImageUrl) {
    return {
      backgroundImage: `url(${config.customImageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundColor: isDark ? '#0b141a' : '#efeae2',
    };
  }

  // Base background color determination
  let bgColor = isDark ? '#0b141a' : '#efeae2';

  if (config.customColor) {
    bgColor = config.customColor;
  } else {
    const presetItem = WALLPAPER_PRESETS.find(p => p.id === config.preset);
    if (presetItem) {
      bgColor = isDark ? presetItem.darkBg : presetItem.lightBg;
    }
  }

  // If plain or doodles disabled, return plain background
  if (config.preset === 'plain' || !config.showDoodle) {
    return {
      backgroundColor: bgColor,
    };
  }

  // Doodle stroke color (white in dark mode, dark slate in light mode)
  const strokeColor = isDark ? '#ffffff' : '#374151';
  const opacity = config.doodleOpacity ?? 40;

  if (config.preset === 'geometric') {
    const patternUrl = getGeometricSvg(strokeColor, opacity * 0.7);
    return {
      backgroundColor: bgColor,
      backgroundImage: `url("${patternUrl}")`,
      backgroundSize: '40px 40px',
      backgroundRepeat: 'repeat',
    };
  }

  // Standard or customized Doodle SVG pattern
  const patternUrl = getDoodleSvg(strokeColor, opacity);
  return {
    backgroundColor: bgColor,
    backgroundImage: `url("${patternUrl}")`,
    backgroundSize: '360px 360px',
    backgroundRepeat: 'repeat',
  };
}
