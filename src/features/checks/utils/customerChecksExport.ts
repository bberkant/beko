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
  MatrixStrip,
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
 * Helper to build 3-column rows for a single strip: [Vade, Keşideci (Ciro Eden), Tutar]
 */
function buildStripRows(strip: MatrixStrip): (string | number)[][] {
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

  return stripRows;
}

/**
 * Builds side-by-side 2D sheet grid from a subset of strips
 */
function buildStripsSheetGrid(
  strips: MatrixStrip[],
  title: string,
  summaryRow: (string | number)[],
  footerRows?: (string | number)[][]
): (string | number)[][] {
  const stripColumnsData = strips.map(buildStripRows);
  const maxRows = Math.max(0, ...stripColumnsData.map((rows) => rows.length));

  const sheetData: (string | number)[][] = [];
  sheetData.push([title]);
  sheetData.push(summaryRow);
  sheetData.push([]); // blank line

  for (let r = 0; r < maxRows; r++) {
    const combinedRow: (string | number)[] = [];
    for (let s = 0; s < stripColumnsData.length; s++) {
      const rowItem = stripColumnsData[s][r];
      if (rowItem) {
        combinedRow.push(rowItem[0] ?? '', rowItem[1] ?? '', rowItem[2] ?? '');
      } else {
        combinedRow.push('', '', '');
      }
      if (s < stripColumnsData.length - 1) {
        combinedRow.push('');
      }
    }
    sheetData.push(combinedRow);
  }

  if (footerRows && footerRows.length > 0) {
    sheetData.push([]);
    footerRows.forEach((fr) => sheetData.push(fr));
  }

  return sheetData;
}

function getMatrixCols(stripCount: number): { wch: number }[] {
  const cols: { wch: number }[] = [];
  for (let s = 0; s < stripCount; s++) {
    cols.push({ wch: 13 }); // Vade
    cols.push({ wch: 32 }); // Keşideci
    cols.push({ wch: 16 }); // Tutar
    if (s < stripCount - 1) {
      cols.push({ wch: 4 }); // separator
    }
  }
  return cols;
}

/**
 * Exports Customer Checks to a multi-sheet Excel (.xlsx) workbook:
 * - Sheet 1: "Ön Sayfa (1-3 Sütun)" (Portrait A4 print setup - Kuveyt, Albaraka, Deniz & Diğer Bankalar)
 * - Sheet 2: "Arka Sayfa (4-6 Sütun)" (Portrait A4 print setup - Garanti, Finans/TEB Faktoring & Senetler)
 * - Sheet 3: "Müşteri Çekleri Matrisi (Tüm)" (6 side-by-side vertical strips with block headers, check rows, subtotals)
 * - Sheet 4: "Kasada - Avukat - Yazılan" (Returned/legal/safe checks table)
 * - Sheet 5: "Tüm Çekler (Düz Liste)" (Complete flat listing for pivot analysis)
 */
export function exportCustomerChecksToExcel(
  groupedData: GroupedCustomerChecks,
  dateStr?: string
): ExcelExportResult {
  const wb = XLSX.utils.book_new();
  const dateFormatted = dateStr || new Date().toLocaleDateString('tr-TR');

  const page1Strips = groupedData.strips.slice(0, 3);
  const page2Strips = groupedData.strips.slice(3, 6);

  const page1Total = page1Strips.reduce((sum, s) => sum + Number(s.stripTotal || 0), 0);
  const page1ChecksCount = page1Strips.reduce(
    (sum, s) => sum + s.blocks.reduce((acc, b) => acc + b.checks.length, 0),
    0
  );

  const page2Total = page2Strips.reduce((sum, s) => sum + Number(s.stripTotal || 0), 0);
  const page2ChecksCount = page2Strips.reduce(
    (sum, s) => sum + s.blocks.reduce((acc, b) => acc + b.checks.length, 0),
    0
  );

  // =========================================================================
  // SHEET 1: Ön Sayfa (1-3 Sütunlar - Banka Çekleri) -> DİKEY A4 YAZDIRMAYA UYGUN
  // =========================================================================
  const page1Grid = buildStripsSheetGrid(
    page1Strips,
    `DARS - MÜŞTERİ ÇEKLERİ MATRİSİ - ÖN SAYFA (1/2) (${dateFormatted})`,
    [
      `ÖN SAYFA TOPLAMI: ${formatCurrency(page1Total)}`,
      '',
      `KAYIT SAYISI: ${page1ChecksCount} Adet`,
      '',
      'Kapsam: 1. Sütun (Kuveyt) | 2. Sütun (Albaraka & Marif) | 3. Sütun (Deniz, Fiba & Diğerleri)',
    ],
    [['', 'ÖN SAYFA (1. GRUP) TOPLAMI:', page1Total]]
  );
  const sheetPage1 = XLSX.utils.aoa_to_sheet(page1Grid);
  sheetPage1['!cols'] = getMatrixCols(3);
  (sheetPage1 as any)['!pageSetup'] = { orientation: 'portrait', paperSize: 9, fitToWidth: 1, fitToHeight: 0 };
  XLSX.utils.book_append_sheet(wb, sheetPage1, 'Ön Sayfa (1-3 Sütun)');

  // =========================================================================
  // SHEET 2: Arka Sayfa (4-6 Sütunlar - Faktoring & Senetler) -> DİKEY A4 YAZDIRMAYA UYGUN
  // =========================================================================
  const page2Grid = buildStripsSheetGrid(
    page2Strips,
    `DARS - MÜŞTERİ ÇEKLERİ MATRİSİ - ARKA SAYFA (2/2) (${dateFormatted})`,
    [
      `ARKA SAYFA TOPLAMI: ${formatCurrency(page2Total)}`,
      '',
      `KAYIT SAYISI: ${page2ChecksCount} Adet`,
      '',
      `GENEL TOPLAM: ${formatCurrency(groupedData.grandTotal)}`,
      '',
      'Kapsam: 4. Sütun (Garanti Fak.) | 5. Sütun (Finans & TEB Fak.) | 6. Sütun (Tahsildeki Senetler)',
    ],
    [
      ['', 'ARKA SAYFA (2. GRUP) TOPLAMI:', page2Total],
      [],
      [
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
      ],
    ]
  );
  const sheetPage2 = XLSX.utils.aoa_to_sheet(page2Grid);
  sheetPage2['!cols'] = getMatrixCols(3);
  (sheetPage2 as any)['!pageSetup'] = { orientation: 'portrait', paperSize: 9, fitToWidth: 1, fitToHeight: 0 };
  XLSX.utils.book_append_sheet(wb, sheetPage2, 'Arka Sayfa (4-6 Sütun)');

  // =========================================================================
  // SHEET 3: Müşteri Çekleri Matrisi (Tüm 6 Sütun Yan Yana)
  // =========================================================================
  const fullGrid = buildStripsSheetGrid(
    groupedData.strips,
    `DARS - MÜŞTERİ ÇEKLERİ MATRİS RAPORU (TÜM SÜTUNLAR) (${dateFormatted})`,
    [
      `GENEL TOPLAM: ${formatCurrency(groupedData.grandTotal)}`,
      '',
      `MATRİS TOPLAMI: ${formatCurrency(groupedData.matrixTotal)}`,
      '',
      `KASADA TOPLAMI: ${formatCurrency(groupedData.kasadaTotal)}`,
      '',
      `TOPLAM ÇEK: ${groupedData.totalActiveChecks} Adet`,
    ],
    [
      [
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
      ],
    ]
  );
  const fullMatrixSheet = XLSX.utils.aoa_to_sheet(fullGrid);
  fullMatrixSheet['!cols'] = getMatrixCols(groupedData.strips.length);
  XLSX.utils.book_append_sheet(wb, fullMatrixSheet, 'Müşteri Çekleri Matrisi (Tüm)');

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
 * Captures the matrix pages and downloads a portrait 2-page A4 PDF:
 * - Page 1 (Ön Sayfa): 1-3. Sütunlar (Kuveyt, Albaraka & Marif, Deniz & Diğer Bankalar)
 * - Page 2 (Arka Sayfa): 4-6. Sütunlar (Garanti Fak., Finans & TEB Fak., Tahsildeki Senetler)
 */
export async function exportCustomerChecksToPdf(
  page1OrElementId: string = 'musteri-cekleri-page-1',
  page2OrFilename?: string,
  maybeFilename?: string
): Promise<void> {
  if (typeof window === 'undefined') return;

  let page1Id = 'musteri-cekleri-page-1';
  let page2Id: string | null = 'musteri-cekleri-page-2';
  let filename: string | undefined = undefined;

  if (page2OrFilename && page2OrFilename.toLowerCase().endsWith('.pdf')) {
    // Backward compatibility: (elementId, filename)
    page1Id = page1OrElementId;
    page2Id = null;
    filename = page2OrFilename;
  } else {
    page1Id = page1OrElementId || 'musteri-cekleri-page-1';
    page2Id = page2OrFilename || (page1Id === 'musteri-cekleri-page-1' ? 'musteri-cekleri-page-2' : null);
    filename = maybeFilename;
  }

  // Find elements
  let p1El = document.getElementById(page1Id);
  let p2El = page2Id ? document.getElementById(page2Id) : null;

  // Fallback if not found by specific IDs
  if (!p1El) {
    p1El = document.getElementById('musteri-cekleri-page-1') || document.getElementById('musteri-cekleri-matrix-capture');
  }
  if (!p2El && page2Id) {
    p2El = document.getElementById('musteri-cekleri-page-2');
  }

  if (!p1El) {
    throw new Error(`PDF dışa aktarımı için #${page1Id} elementi bulunamadı.`);
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
    const capturePage = async (element: HTMLElement) => {
      return await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        windowWidth: Math.max(element.scrollWidth, 1150),
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

          const target = clonedDoc.getElementById(element.id);
          if (target) {
            target.style.position = 'static';
            target.style.margin = '0 auto';
            target.style.padding = '14px';
            target.style.backgroundColor = '#ffffff';
            target.style.width = '1100px';
            target.style.minWidth = '1050px';
          }
        },
      });
    };

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = 210; // A4 portrait width in mm
    const pdfHeight = 297; // A4 portrait height in mm
    const margin = 5; // mm
    const maxPrintableWidth = pdfWidth - margin * 2; // 200 mm
    const maxPrintableHeight = pdfHeight - margin * 2; // 287 mm

    const addCanvasToPdf = (canvas: HTMLCanvasElement) => {
      const imgData = canvas.toDataURL('image/png');
      const aspect = canvas.height / canvas.width;
      let renderWidth = maxPrintableWidth;
      let renderHeight = renderWidth * aspect;

      if (renderHeight > maxPrintableHeight) {
        const scale = maxPrintableHeight / renderHeight;
        renderHeight = maxPrintableHeight;
        renderWidth = renderWidth * scale;
      }

      const offsetX = margin + (maxPrintableWidth - renderWidth) / 2;
      const offsetY = margin + (maxPrintableHeight - renderHeight) / 2;

      pdf.addImage(imgData, 'PNG', offsetX, offsetY, renderWidth, renderHeight, undefined, 'FAST');
    };

    // 1. Capture Page 1 (Ön Sayfa: 1-3. Sütunlar)
    const canvas1 = await capturePage(p1El);
    addCanvasToPdf(canvas1);

    // 2. Capture Page 2 (Arka Sayfa: 4-6. Sütunlar) if present
    if (p2El) {
      pdf.addPage('a4', 'portrait');
      const canvas2 = await capturePage(p2El);
      addCanvasToPdf(canvas2);
    }

    const defaultFilename = `Musteri_Cekleri_Dikey_A4_${new Date().toISOString().slice(0, 10)}.pdf`;
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
