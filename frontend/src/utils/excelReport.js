import ExcelJS from 'exceljs';
import { formatDate } from './format';

const NAVY_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
const ORANGE_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF97316' } };
const SOFT_ORANGE_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7ED' } };
const ZEBRA_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
const BORDER_THIN = {
  top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
};
const IDR_FORMAT = '"Rp "#,##0';

const styleTitleBanner = (ws, maxCol, title, subtitle) => {
  ws.mergeCells(1, 1, 1, maxCol);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = NAVY_FILL;
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(1).height = 30;

  ws.mergeCells(2, 1, 2, maxCol);
  const subCell = ws.getCell(2, 1);
  subCell.value = subtitle;
  subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FFFFFFFF' } };
  subCell.fill = ORANGE_FILL;
  subCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(2).height = 22;
};

const styleTableHeader = (row) => {
  row.height = 24;
  row.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = NAVY_FILL;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = BORDER_THIN;
  });
};

const styleDataRow = (row, idx, currencyCols = [], centerCols = []) => {
  row.height = 21;
  row.eachCell((cell, colNumber) => {
    cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } };
    if (idx % 2 === 1) cell.fill = ZEBRA_FILL;
    cell.border = BORDER_THIN;
    if (currencyCols.includes(colNumber)) {
      cell.numFmt = IDR_FORMAT;
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
    } else if (centerCols.includes(colNumber)) {
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    } else {
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    }
  });
};

const downloadWorkbook = async (wb, fileName) => {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export async function exportSellerReportExcel(report, startDate, endDate) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'FerryMarket';
  wb.created = new Date();

  const storeName = report?.storeName || 'Toko Seller';
  const s = report?.summary || {};
  const generatedLabel = `Periode: ${startDate} s/d ${endDate}  |  Dicetak: ${formatDate(new Date())}`;

  // ==================== SHEET 1: RINGKASAN & HARIAN ====================
  const ws1 = wb.addWorksheet('Ringkasan & Harian', { views: [{ showGridLines: true }] });
  styleTitleBanner(ws1, 5, `LAPORAN PENJUALAN TOKO — ${storeName.toUpperCase()}`, generatedLabel);

  ws1.addRow([]);
  const kpiHeader = ws1.addRow(['RINGKASAN KINERJA PENJUALAN', 'NILAI']);
  ws1.mergeCells(4, 2, 4, 5);
  kpiHeader.eachCell((c) => {
    c.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = NAVY_FILL;
    c.border = BORDER_THIN;
  });
  kpiHeader.height = 24;

  const kpiRows = [
    ['Total Pesanan Masuk', s.totalOrders || 0, '#,##0'],
    ['Pesanan Terbayar / Diproses', s.paidOrdersCount || 0, '#,##0'],
    ['Total Unit Produk Terjual', s.totalUnitsSold || 0, '#,##0'],
    ['Total Pendapatan Kotor (Subtotal)', Number(s.grossRevenue || 0), IDR_FORMAT],
    ['Total Komisi Layanan Platform', Number(s.totalCommission || 0), IDR_FORMAT],
    ['Estimasi Payout Bersih Seller', Number(s.netPayout || 0), IDR_FORMAT],
  ];

  kpiRows.forEach(([label, val, fmt], idx) => {
    const r = ws1.addRow([label, val]);
    ws1.mergeCells(r.number, 2, r.number, 5);
    r.height = 21;
    r.getCell(1).font = { name: 'Calibri', size: 10, bold: idx === 5 };
    r.getCell(2).font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: idx === 5 ? 'FF059669' : 'FF0F172A' },
    };
    r.getCell(2).numFmt = fmt;
    r.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
    r.eachCell((c) => {
      c.border = BORDER_THIN;
      if (idx === 5) c.fill = SOFT_ORANGE_FILL;
    });
  });

  ws1.addRow([]);
  const dailyHead = ws1.addRow([
    'No',
    'Tanggal (WIB)',
    'Jumlah Pesanan',
    'Pendapatan Kotor',
    'Payout Bersih',
  ]);
  styleTableHeader(dailyHead);

  const daily = report?.dailySeries || [];
  let sumOrders = 0;
  let sumRev = 0;
  let sumPayout = 0;

  daily.forEach((d, idx) => {
    sumOrders += Number(d.orders || 0);
    sumRev += Number(d.revenue || 0);
    sumPayout += Number(d.payout || 0);
    const r = ws1.addRow([idx + 1, d.date, d.orders || 0, Number(d.revenue || 0), Number(d.payout || 0)]);
    styleDataRow(r, idx, [4, 5], [1, 2, 3]);
  });

  const totRow = ws1.addRow(['', 'TOTAL PERIODE', sumOrders, sumRev, sumPayout]);
  totRow.height = 24;
  totRow.eachCell((cell, col) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    cell.fill = SOFT_ORANGE_FILL;
    cell.border = BORDER_THIN;
    if ([4, 5].includes(col)) {
      cell.numFmt = IDR_FORMAT;
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    } else {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
  });

  ws1.columns = [
    { width: 34 },
    { width: 20 },
    { width: 18 },
    { width: 24 },
    { width: 24 },
  ];

  // ==================== SHEET 2: DETAIL PESANAN ====================
  const ws2 = wb.addWorksheet('Detail Pesanan');
  styleTitleBanner(ws2, 12, `RINCIAN TRANSAKSI PESANAN — ${storeName.toUpperCase()}`, generatedLabel);
  ws2.addRow([]);

  const ordHead = ws2.addRow([
    'No',
    'Tanggal',
    'No. Sub-Pesanan',
    'Pembeli',
    'Produk & Qty',
    'Kurir & Resi',
    'Pembayaran',
    'Status',
    'Subtotal',
    'Ongkir',
    'Komisi',
    'Payout Seller',
  ]);
  styleTableHeader(ordHead);

  (report?.orders || []).forEach((o, idx) => {
    const r = ws2.addRow([
      idx + 1,
      formatDate(o.createdAt),
      o.subOrderNumber,
      `${o.buyerName}${o.buyerPhone && o.buyerPhone !== '-' ? ` (${o.buyerPhone})` : ''}`,
      o.itemsSummary,
      `${o.courier} / ${o.trackingNumber}`,
      o.paymentStatus,
      o.status,
      o.subtotal,
      o.shippingCost,
      o.serviceFee,
      o.sellerPayout,
    ]);
    styleDataRow(r, idx, [9, 10, 11, 12], [1, 7, 8]);
  });

  ws2.columns = [
    { width: 6 },
    { width: 19 },
    { width: 22 },
    { width: 24 },
    { width: 32 },
    { width: 22 },
    { width: 18 },
    { width: 18 },
    { width: 16 },
    { width: 15 },
    { width: 14 },
    { width: 17 },
  ];

  // ==================== SHEET 3: PRODUK TERLARIS ====================
  const ws3 = wb.addWorksheet('Produk Terlaris');
  styleTitleBanner(ws3, 6, `PRODUK TERLARIS — ${storeName.toUpperCase()}`, generatedLabel);
  ws3.addRow([]);

  const prodHead = ws3.addRow(['No', 'Nama Produk', 'Harga Jual', 'Stok Sisa', 'Terjual', 'Rating']);
  styleTableHeader(prodHead);

  (report?.topProducts || []).forEach((p, idx) => {
    const r = ws3.addRow([
      idx + 1,
      p.name,
      Number(p.price || 0),
      p.stock || 0,
      p.soldCount || 0,
      `${Number(p.ratingAvg || 0).toFixed(1)} ★`,
    ]);
    styleDataRow(r, idx, [3], [1, 4, 5, 6]);
  });

  ws3.columns = [
    { width: 6 },
    { width: 38 },
    { width: 18 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
  ];

  await downloadWorkbook(wb, `Laporan-Penjualan-${storeName.replace(/\s+/g, '-')}-${startDate}-sd-${endDate}.xlsx`);
}

export async function exportAdminReportExcel(report, startDate, endDate) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'FerryMarket Admin';
  wb.created = new Date();

  const s = report?.summary || {};
  const generatedLabel = `Periode: ${startDate} s/d ${endDate}  |  Dicetak: ${formatDate(new Date())}`;

  // SHEET 1: RINGKASAN MARKETPLACE
  const ws1 = wb.addWorksheet('Ringkasan Marketplace');
  styleTitleBanner(ws1, 4, 'LAPORAN PENJUALAN MARKETPLACE — FERRYMARKET', generatedLabel);
  ws1.addRow([]);

  const kpiHead = ws1.addRow(['INDIKATOR KINERJA MARKETPLACE', 'NILAI']);
  ws1.mergeCells(4, 2, 4, 4);
  kpiHead.eachCell((c) => {
    c.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = NAVY_FILL;
    c.border = BORDER_THIN;
  });

  [
    ['Total Pesanan', s.totalOrders || 0, '#,##0'],
    ['Pesanan Terbayar', s.paidOrdersCount || 0, '#,##0'],
    ['Total GMV Marketplace', Number(s.totalGMV || 0), IDR_FORMAT],
    ['Pendapatan Biaya Layanan', Number(s.totalServiceFee || 0), IDR_FORMAT],
    ['Rata-Rata Nilai Pesanan (AOV)', Number(s.avgOrderValue || 0), IDR_FORMAT],
  ].forEach(([label, val, fmt], idx) => {
    const r = ws1.addRow([label, val]);
    ws1.mergeCells(r.number, 2, r.number, 4);
    r.height = 21;
    r.getCell(1).font = { name: 'Calibri', size: 10, bold: idx === 2 };
    r.getCell(2).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    r.getCell(2).numFmt = fmt;
    r.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
    r.eachCell((c) => {
      c.border = BORDER_THIN;
      if (idx === 2) c.fill = SOFT_ORANGE_FILL;
    });
  });

  ws1.addRow([]);
  const dailyHead = ws1.addRow(['No', 'Tanggal (WIB)', 'Jumlah Pesanan', 'GMV Terbayar']);
  styleTableHeader(dailyHead);

  let totOrders = 0;
  let totGmv = 0;
  (report?.dailySeries || []).forEach((d, idx) => {
    totOrders += Number(d.orders || 0);
    totGmv += Number(d.revenue || 0);
    const r = ws1.addRow([idx + 1, d.date, d.orders || 0, Number(d.revenue || 0)]);
    styleDataRow(r, idx, [4], [1, 2, 3]);
  });

  const totRow = ws1.addRow(['', 'TOTAL PERIODE', totOrders, totGmv]);
  totRow.height = 24;
  totRow.eachCell((cell, col) => {
    cell.font = { name: 'Calibri', size: 11, bold: true };
    cell.fill = SOFT_ORANGE_FILL;
    cell.border = BORDER_THIN;
    if (col === 4) {
      cell.numFmt = IDR_FORMAT;
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    } else {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
  });

  ws1.columns = [{ width: 34 }, { width: 20 }, { width: 18 }, { width: 24 }];

  // SHEET 2: DETAIL TRANSAKSI
  const ws2 = wb.addWorksheet('Detail Transaksi');
  styleTitleBanner(ws2, 11, 'RINCIAN TRANSAKSI MARKETPLACE — FERRYMARKET', generatedLabel);
  ws2.addRow([]);

  const ordHead = ws2.addRow([
    'No',
    'Tanggal',
    'No. Pesanan',
    'Pembeli',
    'Toko Seller',
    'Metode Bayar',
    'Status Bayar',
    'Status Order',
    'Subtotal',
    'Ongkir',
    'Grand Total',
  ]);
  styleTableHeader(ordHead);

  (report?.orders || []).forEach((o, idx) => {
    const r = ws2.addRow([
      idx + 1,
      formatDate(o.createdAt),
      o.orderNumber,
      o.buyerName,
      o.sellers,
      o.paymentMethod,
      o.paymentStatus,
      o.status,
      o.subtotal,
      o.shippingTotal,
      o.grandTotal,
    ]);
    styleDataRow(r, idx, [9, 10, 11], [1, 7, 8]);
  });

  ws2.columns = [
    { width: 6 },
    { width: 19 },
    { width: 22 },
    { width: 22 },
    { width: 24 },
    { width: 22 },
    { width: 18 },
    { width: 18 },
    { width: 16 },
    { width: 15 },
    { width: 18 },
  ];

  // SHEET 3: TOP PRODUK & SELLER
  const ws3 = wb.addWorksheet('Top Produk & Seller');
  styleTitleBanner(ws3, 5, 'TOP PRODUK & SELLER — FERRYMARKET', generatedLabel);
  ws3.addRow([]);

  const prodHead = ws3.addRow(['No', 'Nama Produk', 'Toko Seller', 'Harga', 'Terjual']);
  styleTableHeader(prodHead);
  (report?.topProducts || []).forEach((p, idx) => {
    const r = ws3.addRow([idx + 1, p.name, p.seller?.storeName || '-', Number(p.price || 0), p.soldCount || 0]);
    styleDataRow(r, idx, [4], [1, 5]);
  });

  ws3.addRow([]);
  const sellerHead = ws3.addRow(['No', 'Nama Toko Seller', 'Kota', 'Rating', 'Total Unit Terjual']);
  styleTableHeader(sellerHead);
  (report?.topSellers || []).forEach((sl, idx) => {
    const r = ws3.addRow([
      idx + 1,
      sl.storeName,
      sl.city || '-',
      `${Number(sl.ratingAvg || 0).toFixed(1)} ★`,
      sl.totalSales || 0,
    ]);
    styleDataRow(r, idx, [], [1, 4, 5]);
  });

  ws3.columns = [{ width: 6 }, { width: 34 }, { width: 24 }, { width: 18 }, { width: 18 }];

  await downloadWorkbook(wb, `Laporan-Marketplace-FerryMarket-${startDate}-sd-${endDate}.xlsx`);
}
