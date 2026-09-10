import { 
  BrowserMultiFormatReader, 
  DecodeHintType, 
  BarcodeFormat 
} from '@zxing/library';
import { ParsedCheckQR } from '../types';
import { getBankInfo } from './turkishBanks';

// Configure ZXing reader hints with DataMatrix and QR code priority
const hints = new Map<DecodeHintType, any>();
hints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.DATA_MATRIX,
  BarcodeFormat.QR_CODE,
  BarcodeFormat.CODE_128,
  BarcodeFormat.EAN_13
]);
hints.set(DecodeHintType.TRY_HARDER, true);

const reader = new BrowserMultiFormatReader(hints);

/**
 * Decodes QR or DataMatrix code from a File object (e.g. from Mobile Gallery Picker or Camera file)
 */
export async function decodeCheckFromImageFile(file: File): Promise<ParsedCheckQR> {
  return new Promise((resolve, reject) => {
    const readerObj = new FileReader();
    readerObj.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        return reject(new Error('Dosya okunamadı'));
      }
      try {
        const result = await decodeCheckFromImageUrl(dataUrl);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    readerObj.onerror = () => reject(new Error('Dosya yüklenirken hata oluştu'));
    readerObj.readAsDataURL(file);
  });
}

/**
 * Decodes QR or DataMatrix code from an Image Data URL or HTTP URL
 */
export async function decodeCheckFromImageUrl(imageUrl: string): Promise<ParsedCheckQR> {
  const img = new Image();
  img.crossOrigin = 'anonymous';

  return new Promise((resolve, reject) => {
    img.onload = async () => {
      try {
        // Attempt 1: Direct ZXing decoding from image element
        const zxingResult = await reader.decodeFromImageElement(img);
        if (zxingResult && zxingResult.getText()) {
          const parsed = parseTurkishCheckQR(zxingResult.getText());
          return resolve(parsed);
        }
      } catch (firstErr) {
        // Attempt 2: Canvas enhanced contrast preprocessing for gallery photos
        try {
          const enhancedParsed = await tryDecodeWithCanvasEnhancement(img);
          if (enhancedParsed) {
            return resolve(enhancedParsed);
          }
        } catch {
          // pass to final error
        }
        reject(new Error('Görselde okunabilir bir çek karekodu veya DataMatrix bulunamadı. Lütfen karekodun net göründüğü bir fotoğraf seçin.'));
      }
    };
    img.onerror = () => reject(new Error('Görsel yüklenemedi'));
    img.src = imageUrl;
  });
}

/**
 * Preprocesses image on canvas with grayscale and contrast boost for hard-to-read check photos
 */
async function tryDecodeWithCanvasEnhancement(img: HTMLImageElement): Promise<ParsedCheckQR | null> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;

  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;

  // Grayscale + High Contrast filter
  for (let i = 0; i < d.length; i += 4) {
    const avg = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const contrast = avg > 128 ? 255 : 0;
    d[i] = contrast;
    d[i + 1] = contrast;
    d[i + 2] = contrast;
  }
  ctx.putImageData(imgData, 0, 0);

  const enhancedDataUrl = canvas.toDataURL('image/png');
  const enhancedImg = new Image();
  enhancedImg.src = enhancedDataUrl;

  await new Promise(r => { enhancedImg.onload = r; });

  const result = await reader.decodeFromImageElement(enhancedImg);
  if (result && result.getText()) {
    return parseTurkishCheckQR(result.getText());
  }
  return null;
}

/**
 * Parses Turkish 6102 TTK compliant check QR / DataMatrix string
 */
export function parseTurkishCheckQR(rawText: string): ParsedCheckQR {
  const cleaned = rawText.trim();

  let bankCode = '';
  let branchCode = '';
  let accountNumber = '';
  let checkNumber = '';
  let drawerTcknVkn = '';

  // Format 1: 32-digit standard raw format (BBBB SSSS AAAAAAAAAAAAAAAA CCCCCCCC)
  // e.g., 0046 0123 0009876543210000 00458921
  const digitsOnly = cleaned.replace(/\D/g, '');

  if (digitsOnly.length >= 24) {
    bankCode = digitsOnly.substring(0, 4);
    branchCode = digitsOnly.substring(4, 8);
    if (digitsOnly.length >= 32) {
      accountNumber = digitsOnly.substring(8, 24).replace(/^0+/, '') || digitsOnly.substring(8, 24);
      checkNumber = digitsOnly.substring(24).replace(/^0+/, '') || digitsOnly.substring(24);
    } else {
      accountNumber = digitsOnly.substring(8, 16).replace(/^0+/, '');
      checkNumber = digitsOnly.substring(16).replace(/^0+/, '');
    }
  } else if (cleaned.includes('/') || cleaned.includes('-') || cleaned.includes(';')) {
    // Delimited format: BANKA/SUBE/HESAP/CEKNO
    const parts = cleaned.split(/[\/\-;]/).map(p => p.trim());
    if (parts.length >= 4) {
      bankCode = parts[0].padStart(4, '0');
      branchCode = parts[1].padStart(4, '0');
      accountNumber = parts[2];
      checkNumber = parts[3];
      if (parts.length >= 5) drawerTcknVkn = parts[4];
    }
  } else {
    // Fallback: extract continuous numbers
    bankCode = digitsOnly.substring(0, 4) || '0046';
    branchCode = digitsOnly.substring(4, 8) || '0001';
    accountNumber = digitsOnly.substring(8, 16) || digitsOnly || '1000001';
    checkNumber = digitsOnly.substring(16, 24) || '123456';
  }

  const bankInfo = getBankInfo(bankCode);

  return {
    raw: cleaned,
    bankCode,
    bankName: bankInfo.name,
    branchCode,
    accountNumber,
    checkNumber,
    drawerTcknVkn: drawerTcknVkn || undefined,
    isValid: !!bankCode && !!checkNumber
  };
}
