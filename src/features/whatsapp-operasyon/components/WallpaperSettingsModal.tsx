import React, { useState } from 'react';
import { 
  Palette, 
  Sparkles, 
  RotateCcw, 
  Check, 
  Image as ImageIcon, 
  Sliders, 
  Eye,
  CheckCheck
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { 
  WallpaperConfig, 
  DEFAULT_WALLPAPER_CONFIG, 
  WALLPAPER_PRESETS, 
  COLOR_SWATCHES, 
  getWallpaperStyle 
} from '../services/wallpaperPresets';

interface WallpaperSettingsModalProps {
  open: boolean;
  onClose: () => void;
  config: WallpaperConfig;
  onSaveConfig: (newConfig: WallpaperConfig) => void;
  theme: 'light' | 'dark';
}

export const WallpaperSettingsModal: React.FC<WallpaperSettingsModalProps> = ({
  open,
  onClose,
  config: initialConfig,
  onSaveConfig,
  theme
}) => {
  const isDark = theme === 'dark';
  const [draft, setDraft] = useState<WallpaperConfig>(initialConfig);
  const [customUrlInput, setCustomUrlInput] = useState(initialConfig.customImageUrl || '');

  const handlePresetSelect = (presetId: WallpaperConfig['preset']) => {
    setDraft(prev => ({
      ...prev,
      preset: presetId,
      showDoodle: presetId !== 'plain' && presetId !== 'custom',
      customColor: presetId === 'custom' ? prev.customColor : undefined,
      customImageUrl: presetId === 'custom' ? prev.customImageUrl : undefined,
    }));
  };

  const handleColorSelect = (hex: string) => {
    setDraft(prev => ({
      ...prev,
      preset: 'custom',
      customColor: hex
    }));
  };

  const handleSave = () => {
    onSaveConfig({
      ...draft,
      customImageUrl: draft.preset === 'custom' ? (customUrlInput.trim() || undefined) : undefined
    });
    onClose();
  };

  const handleReset = () => {
    setDraft(DEFAULT_WALLPAPER_CONFIG);
    setCustomUrlInput('');
  };

  const previewStyle = getWallpaperStyle({
    ...draft,
    customImageUrl: draft.preset === 'custom' ? (customUrlInput.trim() || undefined) : undefined
  }, isDark);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Sohbet Duvar Kağıdı & Arka Plan Özelleştirme"
      size="2xl"
    >
      <div className="space-y-6">
        {/* Live Interactive Preview */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Eye size={14} className="text-emerald-600" />
              <span>Canlı Önizleme</span>
            </label>
            <span className="text-[11px] text-gray-400">Seçimleriniz anında burada görünür</span>
          </div>

          <div 
            className="rounded-2xl border border-gray-300 dark:border-[#222e35] p-4 h-44 overflow-hidden relative shadow-inner flex flex-col justify-end space-y-2.5 transition-all"
            style={previewStyle}
          >
            {/* Fake incoming message */}
            <div className="flex items-start max-w-[70%]">
              <div className={`p-2.5 rounded-2xl rounded-tl-xs text-xs shadow-xs border ${
                isDark 
                  ? 'bg-[#202c33] text-[#e9edef] border-[#222e35]' 
                  : 'bg-white text-gray-900 border-gray-200/80'
              }`}>
                <span className={`block font-bold text-[10px] mb-0.5 ${
                  isDark ? 'text-[#00a884]' : 'text-emerald-700'
                }`}>
                  Ahmet Usta
                </span>
                <span>Yeni arka plan deseni nasıl görünüyor?</span>
                <span className="block text-right text-[9px] text-gray-400 mt-0.5">14:32</span>
              </div>
            </div>

            {/* Fake outgoing message */}
            <div className="flex items-end justify-end">
              <div className={`p-2.5 rounded-2xl rounded-tr-xs text-xs shadow-xs max-w-[70%] ${
                isDark 
                  ? 'bg-[#005c4b] text-[#e9edef]' 
                  : 'bg-emerald-600 text-white'
              }`}>
                <span>Harika görünüyor! WhatsApp orijinal doodle deseni çok şık.</span>
                <div className={`flex items-center justify-end gap-1 text-[9px] mt-0.5 ${
                  isDark ? 'text-[#8696a0]' : 'text-emerald-100'
                }`}>
                  <span>14:33</span>
                  <CheckCheck size={11} className={isDark ? 'text-[#53bdeb]' : 'text-emerald-200'} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preset Cards Grid */}
        <div>
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mb-3">
            <Palette size={14} className="text-emerald-600" />
            <span>Hazır Duvar Kağıdı Temaları</span>
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {WALLPAPER_PRESETS.map(preset => {
              const isSelected = draft.preset === preset.id && (!draft.customColor || preset.id === 'custom');
              return (
                <div
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset.id)}
                  className={`p-3 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between select-none relative group ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-xs'
                      : 'border-gray-200 dark:border-[#2a3942] hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-[#111b21]'
                  }`}
                >
                  {/* Miniature Thumbnail */}
                  <div 
                    className="w-full h-12 rounded-xl mb-2 border border-black/10 overflow-hidden relative flex items-center justify-center shadow-2xs"
                    style={{
                      background: preset.previewBg
                    }}
                  >
                    {preset.type === 'doodle' && (
                      <Sparkles size={16} className="text-white/60" />
                    )}
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                      {preset.name}
                    </h4>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                      {preset.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Doodle Controls & Opacity Slider */}
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#111b21] border border-gray-200 dark:border-[#222e35] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders size={16} className="text-emerald-600" />
              <div>
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                  WhatsApp Çizim & Doodle Desenleri
                </span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                  Arka plandaki simgeleri ve çizgi belirginliğini ayarlayın
                </span>
              </div>
            </div>

            {/* Toggle switch */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={draft.showDoodle}
                onChange={e => setDraft(prev => ({ ...prev, showDoodle: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
            </label>
          </div>

          {draft.showDoodle && (
            <div className="space-y-1.5 pt-2 border-t border-gray-200 dark:border-[#222e35]">
              <div className="flex justify-between text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                <span>Desen Belirginliği (Opaklık)</span>
                <span className="text-emerald-600 font-bold">{draft.doodleOpacity ?? 40}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={draft.doodleOpacity ?? 40}
                onChange={e => setDraft(prev => ({ ...prev, doodleOpacity: Number(e.target.value) }))}
                className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none"
              />
            </div>
          )}
        </div>

        {/* Color Swatches Palette */}
        <div>
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mb-2.5">
            <Palette size={14} className="text-emerald-600" />
            <span>Özel Renk Tonu Seçimi</span>
          </label>

          <div className="flex flex-wrap items-center gap-2">
            {COLOR_SWATCHES.map(swatch => {
              const isSelected = draft.customColor === swatch.hex;
              return (
                <button
                  key={swatch.hex}
                  onClick={() => handleColorSelect(swatch.hex)}
                  className={`w-9 h-9 rounded-xl border-2 transition relative flex items-center justify-center shadow-2xs hover:scale-105 active:scale-95 cursor-pointer ${
                    isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/40' : 'border-gray-200 dark:border-gray-700'
                  }`}
                  style={{ backgroundColor: swatch.hex }}
                  title={`${swatch.name} (${swatch.hex})`}
                >
                  {isSelected && (
                    <Check size={14} className="text-white drop-shadow-md" strokeWidth={3} />
                  )}
                </button>
              );
            })}

            {/* Custom Color Input */}
            <div className="relative flex items-center">
              <input
                type="color"
                value={draft.customColor || (isDark ? '#0b141a' : '#efeae2')}
                onChange={e => handleColorSelect(e.target.value)}
                className="w-9 h-9 p-0.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-transparent cursor-pointer"
                title="Renk Paletinden Seç"
              />
            </div>
          </div>
        </div>

        {/* Custom Image URL (Optional) */}
        <div>
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mb-1.5">
            <ImageIcon size={14} className="text-emerald-600" />
            <span>Özel Arka Plan Resmi (Opsiyonel URL)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="https://... (Ör: Şirket logosu, manzara resmi URL)"
              value={customUrlInput}
              onChange={e => {
                setCustomUrlInput(e.target.value);
                setDraft(prev => ({
                  ...prev,
                  preset: 'custom',
                  customImageUrl: e.target.value
                }));
              }}
              className="flex-1 px-3.5 py-2 text-xs border border-gray-200 dark:border-[#2a3942] rounded-xl bg-gray-50 dark:bg-[#202c33] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {customUrlInput && (
              <button
                onClick={() => {
                  setCustomUrlInput('');
                  setDraft(prev => ({ ...prev, customImageUrl: undefined }));
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-gray-100 dark:bg-[#2a3942] text-gray-600 dark:text-gray-300 hover:bg-gray-200"
              >
                Temizle
              </button>
            )}
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-[#222e35]">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#202c33] rounded-xl transition"
          >
            <RotateCcw size={14} />
            <span>Varsayılana Sıfırla</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#202c33] rounded-xl transition"
            >
              Vazgeç
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm transition active:scale-95 flex items-center gap-1.5"
            >
              <Check size={14} />
              <span>Kaydet & Uygula</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
