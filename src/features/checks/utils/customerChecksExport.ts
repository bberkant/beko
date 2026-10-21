/**
 * Customer Checks Export Utilities
 * Provides Excel (multi-sheet xlsx), PDF (jsPDF landscape), Print (window.print),
 * and WhatsApp Screenshot (html2canvas with baseline font-fix) capabilities.
 */

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  GroupedCustomerChecks,
  CustomerCheckItem,
} from '../types/customerChecks';
import {
  formatCurrency,
  formatDate,
  formatDrawerEndorser,
} from './customerChecksGrouping';
import { fixCorruptedTurkishText } from '../../../lib/turkishTextFixer';

export interface ExcelExportResult {
  workbook: XLSX.WorkBook;
  buffer?: Uint8Array | null;
  sizeBytes: number;
}

/**
 * Exports Customer Checks to a multi-sheet Excel (.xlsx) workbook:
 * - Sheet 1: "Müşteri Çekleri Matrisi" (6 side-by-side vertical strips with block headers, check rows, subtotals)
 * - Sheet 2: "Kasada - Avukat - Yazılan" (Returned/legal/safe checks table)
 * - Sheet 3: "Tüm Çekler (Düz Liste)" (Complete flat listing for pivot analysis)
 */
export function exportCustomerChecksToExcel(
  groupedData: GroupedCustomerChecks,
  dateStr?: string
): ExcelExportResult {
  const wb = XLSX.utils.book_new();
  const dateFormatted = dateStr || new Date().toLocaleDateString('tr-TR');

  // =========================================================================
  // SHEET 1: Müşteri Çekleri Matrisi (6-Strip Side-by-Side Layout)
  // =========================================================================
  // For each strip (0..5), construct an array of 3-column cells: [Vade, Keşideci (Ciro Eden), Tutar]
  const stripColumnsData: (string | number)[][][] = [];

  groupedData.strips.forEach((strip) => {
    const stripRows: (string | number)[][] = [];

    // Strip Header
    stripRows.push([
      `SÜTUN ${strip.stripNumber}: ${strip.title}`,
      `Toplam: ${formatCurrency(strip.stripTotal)}`,
      '',
    ]);
    stripRows.push(['', '', '']); // empty row

    // Blocks in this strip
    strip.blocks.forEach((block) => {
      stripRows.push([
        `[${block.title}] (${block.checks.length} Adet)`,
        `Ara Toplam: ${formatCurrency(block.subtotal)}`,
        '',
      ]);
      stripRows.push(['Vade Tarihi', 'Keşideci (Ciro Eden)', 'Tutar (TL)']);

      if (block.checks.length === 0) {
        stripRows.push(['-', 'Kayıt bulunamadı', 0]);
      } else {
        block.checks.forEach((c) => {
          stripRows.push([
            formatDate(c.due_date),
            formatDrawerEndorser(c.kesideci, c.creditor),
            Number(c.amount || 0),
          ]);
        });
      }

      // Block Subtotal
      stripRows.push(['', 'Ara Toplam:', Number(block.subtotal || 0)]);
      stripRows.push(['', '', '']); // spacer
    });

    // Strip Subtotal
    stripRows.push([
      '',
      `${strip.title} Toplamı:`,
      Number(strip.stripTotal || 0),
    ]);

    stripColumnsData.push(stripRows);
  });

  // Calculate maximum rows among all strips
  const maxStripRows = Math.max(
    0,
    ...stripColumnsData.map((rows) => rows.length)
  );

  // Build the unified 2D grid
  const matrixSheetData: (string | number)[][] = [];

  // Title rows
  matrixSheetData.push([
    `DARS - MÜŞTERİ ÇEKLERİ MATRİS RAPORU (${dateFormatted})`,
  ]);
  matrixSheetData.push([
    `GENEL TOPLAM: ${formatCurrency(groupedData.grandTotal)}`,
    '',
    `MATRİS TOPLAMI: ${formatCurrency(groupedData.matrixTotal)}`,
    '',
    `KASADA TOPLAMI: ${formatCurrency(groupedData.kasadaTotal)}`,
    '',
    `TOPLAM ÇEK: ${groupedData.totalActiveChecks} Adet`,
  ]);
  matrixSheetData.push([]); // blank line

  // Align side-by-side rows
  for (let r = 0; r < maxStripRows; r++) {
    const combinedRow: (string | number)[] = [];
    for (let s = 0; s < stripColumnsData.length; s++) {
      const rowItem = stripColumnsData[s][r];
      if (rowItem) {
        combinedRow.push(rowItem[0] ?? '', rowItem[1] ?? '', rowItem[2] ?? '');
      } else {
        combinedRow.push('', '', '');
      }
      // Add spacer between strips
      if (s < stripColumnsData.length - 1) {
        combinedRow.push('');
      }
    }
    matrixSheetData.push(combinedRow);
  }

  // Grand summary footer row
  matrixSheetData.push([]);
  matrixSheetData.push([
    'GENEL MATRİS TOPLAMI:',
    '',
    Number(groupedData.matrixTotal || 0),
    '',
    'KASADA TOPLAMI:',
    '',
    Number(groupedData.kasadaTotal || 0),
    '',
    'GENEL TOPLAM:',
    '',
    Number(groupedData.grandTotal || 0),
  ]);

  const matrixSheet = XLSX.utils.aoa_to_sheet(matrixSheetData);

  // Set column widths for matrix sheet
  const matrixCols: { wch: number }[] = [];
  for (let s = 0; s < groupedData.strips.length; s++) {
    matrixCols.push({ wch: 13 }); // Vade
    matrixCols.push({ wch: 32 }); // Keşideci (Ciro Eden)
    matrixCols.push({ wch: 16 }); // Tutar
    if (s < groupedData.strips.length - 1) {
      matrixCols.push({ wch: 4 }); // separator
    }
  }
  matrixSheet['!cols'] = matrixCols;
  XLSX.utils.book_append_sheet(wb, matrixSheet, 'Müşteri Çekleri Matrisi');

  // =========================================================================
  // SHEET 2: Kasada - Avukat - Yazılan
  // =========================================================================
  const kasadaRows: (string | number)[][] = [];
  kasadaRows.push(['KASADA / YAZILAN / AVUKATTAKİ ÇEKLER TABLOSU']);
  kasadaRows.push([
    `Rapor Tarihi: ${dateFormatted} | Toplam Çek Sayısı: ${groupedData.kasadaChecks.length} Adet | Toplam Tutar: ${formatCurrency(groupedData.kasadaTotal)}`,
  ]);
  kasadaRows.push([]);
  kasadaRows.push([
    'Vade Tarihi',
    'Keşideci (Ciro Eden)',
    'Tutar (TL)',
    'Ciro Edilen / Konum',
    'Banka',
    'Çek No',
    'Durum',
  ]);

  groupedData.kasadaChecks.forEach((c) => {
    kasadaRows.push([
      formatDate(c.due_date || c.issue_date),
      formatDrawerEndorser(c.kesideci, c.creditor),
      Number(c.amount || 0),
      fixCorruptedTurkishText(c.ciro_edilen || '-'),
      fixCorruptedTurkishText(c.bank_name || '-'),
      c.check_no || '-',
      fixCorruptedTurkishText(c.status || '-'),
    ]);
  });

  kasadaRows.push([]);
  kasadaRows.push(['', 'GENEL TOPLAM:', Number(groupedData.kasadaTotal || 0)]);

  const kasadaSheet = XLSX.utils.aoa_to_sheet(kasadaRows);
  kasadaSheet['!cols'] = [
    { wch: 14 }, // Vade
    { wch: 36 }, // Keşideci
    { wch: 18 }, // Tutar
    { wch: 25 }, // Ciro Edilen / Konum
    { wch: 20 }, // Banka
    { wch: 16 }, // Çek No
    { wch: 16 }, // Durum
  ];
  XLSX.utils.book_append_sheet(wb, kasadaSheet, 'Kasada - Avukat - Yazılan');

  // =========================================================================
  // SHEET 3: Tüm Çekler (Düz Liste)
  // =========================================================================
  const allChecksRows: (string | number)[][] = [];
  allChecksRows.push(['TÜM AKTİF MÜŞTERİ ÇEKLERİ VE SENETLERİ (DÜZ LİSTE)']);
  allChecksRows.push([
    `Rapor Tarihi: ${dateFormatted} | Toplam Kayıt: ${groupedData.totalActiveChecks} Adet | Genel Toplam: ${formatCurrency(groupedData.grandTotal)}`,
  ]);
  allChecksRows.push([]);
  allChecksRows.push([
    'Çek No',
    'Vade Tarihi',
    'Keşide Tarihi',
    'Keşideci',
    'Ciro Eden (Müşteri)',
    'Keşideci (Ciro Eden)',
    'Tutar (TL)',
    'Banka',
    'Şube',
    'Tahsildar Banka',
    'Durum',
    'Ciro Edilen / Konum',
    'Belge Türü',
  ]);

  // Aggregate all checks without duplicates
  const allItems: CustomerCheckItem[] = [];
  groupedData.strips.forEach((strip) => {
    strip.blocks.forEach((block) => {
      block.checks.forEach((c) => allItems.push(c));
    });
  });
  groupedData.kasadaChecks.forEach((c) => allItems.push(c));

  // Sort ascending by due date
  allItems.sort((a, b) => {
    const da = a.due_date || '';
    const db = b.due_date || '';
    return da.localeCompare(db);
  });

  allItems.forEach((c) => {
    allChecksRows.push([
      c.check_no || '-',
      formatDate(c.due_date),
      formatDate(c.issue_date),
      fixCorruptedTurkishText(c.kesideci || '-'),
      fixCorruptedTurkishText(c.creditor || '-'),
      formatDrawerEndorser(c.kesideci, c.creditor),
      Number(c.amount || 0),
      fixCorruptedTurkishText(c.bank_name || '-'),
      fixCorruptedTurkishText(c.bank_branch || '-'),
      fixCorruptedTurkishText(c.tahsildar_banka || '-'),
      fixCorruptedTurkishText(c.status || '-'),
      fixCorruptedTurkishText(c.ciro_edilen || '-'),
      c.document_type === 'senet' ? 'Senet' : 'Çek',
    ]);
  });

  allChecksRows.push([]);
  allChecksRows.push(['', '', '', '', '', 'GENEL TOPLAM:', Number(groupedData.grandTotal || 0)]);

  const allSheet = XLSX.utils.aoa_to_sheet(allChecksRows);
  allSheet['!cols'] = [
    { wch: 15 }, // Çek No
    { wch: 14 }, // Vade
    { wch: 14 }, // Keşide
    { wch: 25 }, // Keşideci
    { wch: 25 }, // Ciro Eden
    { wch: 35 }, // Keşideci (Ciro Eden)
    { wch: 18 }, // Tutar
    { wch: 20 }, // Banka
    { wch: 15 }, // Şube
    { wch: 22 }, // Tahsildar Banka
    { wch: 18 }, // Durum
    { wch: 24 }, // Ciro Edilen
    { wch: 12 }, // Belge Türü
  ];
  XLSX.utils.book_append_sheet(wb, allSheet, 'Tüm Çekler (Düz Liste)');

  // Also support fallback sheet name for reference engine test compatibility if needed
  // Note: Sheet names in wb are 'Müşteri Çekleri Matrisi', 'Kasada - Avukat - Yazılan', 'Tüm Çekler (Düz Liste)'

  const filename = `Musteri_Cekleri_Listesi_${new Date().toISOString().slice(0, 10)}.xlsx`;

  let buffer: any = null;
  let sizeBytes = 0;
  try {
    if (typeof Buffer !== 'undefined') {
      buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      sizeBytes = buffer.length;
    } else {
      const arr = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      sizeBytes = arr.byteLength;
    }
  } catch (err) {
    console.warn('Could not compute excel buffer length:', err);
  }

  // Trigger browser download if running in client environment
  if (typeof window !== 'undefined' && XLSX.writeFile) {
    XLSX.writeFile(wb, filename);
  }

  return { workbook: wb, buffer, sizeBytes };
}

/**
 * Captures the matrix container and downloads a landscape A4 PDF.
 */
export async function exportCustomerChecksToPdf(
  elementId = 'musteri-cekleri-matrix-capture',
  filename?: string
): Promise<void> {
  if (typeof window === 'undefined') return;

  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`PDF dışa aktarımı için #${elementId} elementi bulunamadı.`);
  }

  // Apply Tailwind Preflight baseline fix
  document.getElementById('html2canvas-font-fix')?.remove();
  const fixStyle = document.createElement('style');
  fixStyle.id = 'html2canvas-font-fix';
  fixStyle.textContent = `
    #html2canvas-font-fix img,
    #html2canvas-font-fix svg,
    img, svg {
      display: inline !important;
      vertical-align: baseline !important;
    }
  `;
  document.head.appendChild(fixStyle);

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      windowWidth: Math.max(element.scrollWidth, 1600),
      onclone: (clonedDoc) => {
        const cloneFix = clonedDoc.createElement('style');
        cloneFix.id = 'html2canvas-font-fix-clone';
        cloneFix.textContent = `
          img, svg {
            display: inline !important;
            vertical-align: baseline !important;
          }
        `;
        clonedDoc.head.appendChild(cloneFix);

        clonedDoc.querySelectorAll('[data-html2canvas-ignore="true"]').forEach((el) => {
          (el as HTMLElement).style.display = 'none';
        });

        const target = clonedDoc.getElementById(elementId);
        if (target) {
          target.style.position = 'static';
          target.style.margin = '0 auto';
          target.style.padding = '16px';
          target.style.backgroundColor = '#ffffff';
          target.style.width = 'max-content';
          target.style.minWidth = '100%';
        }
      },
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = 297; // A4 landscape width in mm
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    if (pdfHeight <= 210) {
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    } else {
      let position = 0;
      let heightLeft = pdfHeight;
      const pageHeight = 210;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
    }

    const defaultFilename = `Musteri_Cekleri_Listesi_${new Date().toISOString().slice(0, 10)}.pdf`;
    pdf.save(filename || defaultFilename);
  } finally {
    document.getElementById('html2canvas-font-fix')?.remove();
  }
}

/**
 * Opens browser print dialog with clean @media print landscape formatting.
 */
export function printCustomerChecks(): void {
  if (typeof window !== 'undefined') {
    window.print();
  }
}

/**
 * Captures screenshot of customer checks matrix at scale: 2 with baseline font fix.
 * Attempts clipboard copy with automatic fallback to PNG file download.
 */
export async function captureCustomerChecksScreenshot(
  elementId = 'musteri-cekleri-matrix-capture'
): Promise<{ success: boolean; clipboard: boolean; error?: string }> {
  if (typeof window === 'undefined') {
    return { success: false, clipboard: false, error: 'Window context required' };
  }

  const element = document.getElementById(elementId);
  if (!element) {
    return {
      success: false,
      clipboard: false,
      error: `Ekran görüntüsü için #${elementId} elementi bulunamadı.`,
    };
  }

  // Inject Tailwind baseline fix to prevent 6-8px text offset
  document.getElementById('html2canvas-font-fix')?.remove();
  const fixStyle = document.createElement('style');
  fixStyle.id = 'html2canvas-font-fix';
  fixStyle.textContent = `
    #html2canvas-font-fix img,
    #html2canvas-font-fix svg,
    img, svg {
      display: inline !important;
      vertical-align: baseline !important;
    }
  `;
  document.head.appendChild(fixStyle);

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      windowWidth: Math.max(element.scrollWidth, 1600),
      onclone: (clonedDoc) => {
        const cloneFix = clonedDoc.createElement('style');
        cloneFix.id = 'html2canvas-font-fix-clone';
        cloneFix.textContent = `
          img, svg {
            display: inline !important;
            vertical-align: baseline !important;
          }
        `;
        clonedDoc.head.appendChild(cloneFix);

        clonedDoc.querySelectorAll('[data-html2canvas-ignore="true"]').forEach((el) => {
          (el as HTMLElement).style.display = 'none';
        });

        const target = clonedDoc.getElementById(elementId);
        if (target) {
          target.style.position = 'static';
          target.style.margin = '0 auto';
          target.style.padding = '16px';
          target.style.backgroundColor = '#ffffff';
          target.style.width = 'max-content';
          target.style.minWidth = '100%';
        }
      },
    });

    const filename = `Musteri_Cekleri_Matrisi_${new Date().toISOString().slice(0, 10)}.png`;

    // 1. Try modern clipboard write
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      );

      if (blob && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        return { success: true, clipboard: true };
      }
    } catch (clipErr) {
      console.warn('Clipboard write failed, falling back to download:', clipErr);
    }

    // 2. Fallback to download
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();

    return { success: true, clipboard: false };
  } catch (err: any) {
    return {
      success: false,
      clipboard: false,
      error: err?.message || String(err),
    };
  } finally {
    document.getElementById('html2canvas-font-fix')?.remove();
  }
}
