const ExcelJS = require('exceljs');

const generateCollectionReportExcel = async (data, hospital, fromDate, toDate, title = 'Collection Report', idKey = 'invoiceId', dateKey = 'invoiceDate', idHeader = 'Bill No') => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Collection Report');

  sheet.mergeCells('A1:H1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = hospital.hospitalName || 'Hospital';
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: 'center' };

  sheet.mergeCells('A2:H2');
  sheet.getCell('A2').value = `${title || 'Collection Report'}: ${fromDate} to ${toDate}`;
  sheet.getCell('A2').alignment = { horizontal: 'center' };
  sheet.getCell('A2').font = { bold: true, size: 12 };

  sheet.addRow([]);

  sheet.columns = [
    { header: idHeader, key: 'id', width: 18 },
    { header: 'Patient Name', key: 'patientName', width: 25 },
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Grand Total', key: 'grandTotal', width: 15 },
    { header: 'Amount Paid', key: 'amountPaid', width: 15 },
    { header: 'Amount Due', key: 'amountDue', width: 15 },
    { header: 'Payment Mode', key: 'paymentMode', width: 14 },
    { header: 'Status', key: 'status', width: 12 },
  ];

  const headerRow = sheet.getRow(4);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };

  let totalGrand = 0, totalPaid = 0, totalDue = 0;

  data.forEach(bill => {
    sheet.addRow({
      id: bill[idKey],
      patientName: bill.patient?.name || '',
      date: new Date(bill[dateKey]).toLocaleDateString(),
      grandTotal: bill.grandTotal,
      amountPaid: bill.amountPaid,
      amountDue: bill.amountDue,
      paymentMode: bill.paymentMode || bill.payments?.[0]?.mode || '',
      status: bill.status,
    });
    totalGrand += bill.grandTotal;
    totalPaid += bill.amountPaid;
    totalDue += bill.amountDue;
  });

  const totalRow = sheet.addRow({ id: 'TOTAL', grandTotal: totalGrand, amountPaid: totalPaid, amountDue: totalDue });
  totalRow.font = { bold: true };

  sheet.addRow([]);
  const countRow = sheet.addRow({ id: `Total Bills: ${data.length}` });
  countRow.font = { italic: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

const generateLabCollectionReportExcel = async (data, hospital, fromDate, toDate) =>
  generateCollectionReportExcel(data, hospital, fromDate, toDate, 'Lab Collection Report', 'billId', 'billDate');

const generatePharmacyCollectionReportExcel = async (data, hospital, fromDate, toDate, returns = []) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Collection Report');

  sheet.mergeCells('A1:H1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = hospital.hospitalName || 'Hospital';
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: 'center' };

  sheet.mergeCells('A2:H2');
  sheet.getCell('A2').value = `Pharmacy Collection Report: ${fromDate} to ${toDate}`;
  sheet.getCell('A2').alignment = { horizontal: 'center' };
  sheet.getCell('A2').font = { bold: true, size: 12 };

  sheet.addRow([]);

  sheet.columns = [
    { header: 'Bill No', key: 'id', width: 18 },
    { header: 'Patient Name', key: 'patientName', width: 25 },
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Grand Total', key: 'grandTotal', width: 15 },
    { header: 'Amount Paid', key: 'amountPaid', width: 15 },
    { header: 'Amount Due', key: 'amountDue', width: 15 },
    { header: 'Payment Mode', key: 'paymentMode', width: 14 },
    { header: 'Status', key: 'status', width: 12 },
  ];

  const headerRow = sheet.getRow(4);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };

  let totalGrand = 0, totalPaid = 0, totalDue = 0;

  data.forEach(bill => {
    sheet.addRow({
      id: bill.billId,
      patientName: bill.patient?.name || '',
      date: new Date(bill.billDate).toLocaleDateString(),
      grandTotal: bill.grandTotal,
      amountPaid: bill.amountPaid,
      amountDue: bill.amountDue,
      paymentMode: bill.paymentMode || bill.payments?.[0]?.mode || '',
      status: bill.status,
    });
    totalGrand += bill.grandTotal;
    totalPaid += bill.amountPaid;
    totalDue += bill.amountDue;
  });

  const totalRow = sheet.addRow({ id: 'TOTAL', grandTotal: totalGrand, amountPaid: totalPaid, amountDue: totalDue });
  totalRow.font = { bold: true };

  sheet.addRow([]);
  const countRow = sheet.addRow({ id: `Total Bills: ${data.length}` });
  countRow.font = { italic: true };

  // ---- Returns section ----
  if (returns && returns.length) {
    sheet.addRow([]);
    const retTitleRow = sheet.lastRow.number + 1;
    sheet.mergeCells(`A${retTitleRow}:H${retTitleRow}`);
    const retTitle = sheet.getCell(`A${retTitleRow}`);
    retTitle.value = 'RETURNS (Sales Return Report)';
    retTitle.font = { bold: true, size: 12 };

    const retHeaderRow = sheet.addRow(['Return No', 'Bill No', 'Patient Name', 'Date', 'Reason', 'Qty', 'Return Amount', 'Refunded']);
    retHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    retHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };

    let retTotal = 0, retQty = 0;
    returns.forEach(r => {
      const qty = (r.items || []).reduce((s, it) => s + (Number(it.quantity) || 0), 0);
      retTotal += Number(r.totalAmount) || 0;
      retQty += qty;
      sheet.addRow({
        id: r.returnId,
        patientName: r.patient?.name || '',
        date: new Date(r.returnDate).toLocaleDateString(),
        grandTotal: r.totalAmount,
        amountPaid: qty,
        amountDue: r.reason || '',
        paymentMode: r.refundMode || '',
        status: r.refunded ? 'Refunded' : 'Not Refunded',
      });
    });
    const retTotalRow = sheet.addRow({ id: 'RETURN TOTAL', grandTotal: retTotal, amountPaid: retQty });
    retTotalRow.font = { bold: true };
    sheet.addRow({ id: `Total Returns: ${returns.length}` }).font = { italic: true };
    sheet.addRow({ id: `NET SALES (Gross ${totalGrand} - Returns ${retTotal}): ${Math.round((totalGrand - retTotal) * 100) / 100}` }).font = { bold: true };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

const generatePharmacyReturnsReportExcel = async (returns, hospital, fromDate, toDate) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Returns Report');

  sheet.mergeCells('A1:H1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = hospital.hospitalName || 'Hospital';
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: 'center' };

  sheet.mergeCells('A2:H2');
  sheet.getCell('A2').value = `Pharmacy Sales Return Report: ${fromDate} to ${toDate}`;
  sheet.getCell('A2').alignment = { horizontal: 'center' };
  sheet.getCell('A2').font = { bold: true, size: 12 };

  sheet.addRow([]);

  sheet.columns = [
    { header: 'Return No', key: 'returnId', width: 18 },
    { header: 'Bill No', key: 'billId', width: 18 },
    { header: 'Patient Name', key: 'patientName', width: 25 },
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Reason', key: 'reason', width: 16 },
    { header: 'Items', key: 'items', width: 30 },
    { header: 'Return Amount', key: 'totalAmount', width: 15 },
    { header: 'Refund', key: 'refund', width: 14 },
  ];

  const headerRow = sheet.getRow(4);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };

  let totalAmount = 0, totalQty = 0;
  returns.forEach(r => {
    const itemText = (r.items || []).map(it => `${it.name} x${it.quantity}`).join(', ');
    const qty = (r.items || []).reduce((s, it) => s + (Number(it.quantity) || 0), 0);
    totalAmount += Number(r.totalAmount) || 0;
    totalQty += qty;
    sheet.addRow({
      returnId: r.returnId,
      billId: r.bill?.billId || r.billId || '',
      patientName: r.patient?.name || '',
      date: new Date(r.returnDate).toLocaleDateString(),
      reason: r.reason || 'Other',
      items: itemText,
      totalAmount: r.totalAmount,
      refund: r.refunded ? (r.refundMode || 'Refunded') : 'Not Refunded',
    });
  });

  const totalRow = sheet.addRow({ returnId: 'TOTAL', items: `Qty: ${totalQty}`, totalAmount });
  totalRow.font = { bold: true };

  sheet.addRow({ returnId: `Total Returns: ${returns.length}` }).font = { italic: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

const generateStockReportExcel = async (report, hospital) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Stock Report');

  sheet.mergeCells('A1:J1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = hospital.hospitalName || 'Hospital';
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: 'center' };

  sheet.mergeCells('A2:J2');
  sheet.getCell('A2').value = 'Stock Report';
  sheet.getCell('A2').alignment = { horizontal: 'center' };
  sheet.getCell('A2').font = { bold: true, size: 12 };

  sheet.addRow([]);

  sheet.columns = [
    { header: 'Code', key: 'medicineId', width: 14 },
    { header: 'Medicine', key: 'name', width: 28 },
    { header: 'Category', key: 'category', width: 15 },
    { header: 'Purchase Price', key: 'purchasePrice', width: 15 },
    { header: 'Sale Price', key: 'salePrice', width: 15 },
    { header: 'Qty', key: 'quantity', width: 10 },
    { header: 'Reorder Level', key: 'reorderLevel', width: 13 },
    { header: 'Expiry Date', key: 'expiryDate', width: 14 },
    { header: 'Stock Value', key: 'stockValue', width: 14 },
    { header: 'Alert', key: 'alert', width: 10 },
  ];

  const headerRow = sheet.getRow(4);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };

  report.forEach(m => {
    sheet.addRow({
      medicineId: m.medicineId,
      name: m.name,
      category: m.category,
      purchasePrice: m.purchasePrice,
      salePrice: m.salePrice,
      quantity: m.quantity,
      reorderLevel: m.reorderLevel,
      expiryDate: m.expiryDate ? new Date(m.expiryDate).toLocaleDateString() : '',
      stockValue: m.stockValue,
      alert: m.isLow ? 'LOW' : '',
    });
  });

  const totalValue = report.reduce((s, m) => s + (m.stockValue || 0), 0);
  const totalQty = report.reduce((s, m) => s + (m.quantity || 0), 0);
  const totalRow = sheet.addRow({ name: 'TOTAL', quantity: totalQty, stockValue: totalValue });
  totalRow.font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

const generateLabTestsExcel = async (tests, hospital) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Lab Tests');

  sheet.mergeCells('A1:J1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = hospital.hospitalName || 'Hospital';
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: 'center' };

  sheet.mergeCells('A2:J2');
  sheet.getCell('A2').value = 'Lab Test Catalog';
  sheet.getCell('A2').alignment = { horizontal: 'center' };
  sheet.getCell('A2').font = { bold: true, size: 12 };

  sheet.addRow([]);

  sheet.columns = [
    { header: 'Test Name', key: 'name', width: 28 },
    { header: 'Category', key: 'category', width: 16 },
    { header: 'Department', key: 'department', width: 18 },
    { header: 'Amount', key: 'price', width: 12 },
    { header: 'GST Rate %', key: 'gstRate', width: 12 },
    { header: 'Sample Type', key: 'sampleType', width: 16 },
    { header: 'Unit', key: 'unit', width: 14 },
    { header: 'Reference Range', key: 'referenceRange', width: 22 },
    { header: 'Default Result', key: 'defaultResult', width: 22 },
    { header: 'Turnaround Time', key: 'turnaroundTime', width: 18 },
  ];

  const headerRow = sheet.getRow(4);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };

  tests.forEach(t => {
    sheet.addRow({
      name: t.name,
      category: t.category || '',
      department: t.department || '',
      price: t.price || 0,
      gstRate: t.gstRate || 0,
      sampleType: t.sampleType || '',
      unit: t.unit || '',
      referenceRange: t.referenceRange || '',
      defaultResult: t.defaultResult || '',
      turnaroundTime: t.turnaroundTime || '',
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

const generateMedicinesExcel = async (medicines, hospital) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Medicines');

  sheet.mergeCells('A1:K1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = hospital.hospitalName || 'Hospital';
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: 'center' };

  sheet.mergeCells('A2:K2');
  sheet.getCell('A2').value = 'Medicine Catalog / Import Template';
  sheet.getCell('A2').alignment = { horizontal: 'center' };
  sheet.getCell('A2').font = { bold: true, size: 12 };

  sheet.addRow([]);

  sheet.columns = [
    { header: 'Code', key: 'code', width: 14 },
    { header: 'Medicine Name', key: 'name', width: 30 },
    { header: 'Generic Name', key: 'genericName', width: 22 },
    { header: 'Category', key: 'category', width: 16 },
    { header: 'Unit', key: 'unit', width: 10 },
    { header: 'Purchase Price', key: 'purchasePrice', width: 14 },
    { header: 'Sale Price', key: 'salePrice', width: 14 },
    { header: 'GST Rate %', key: 'gstRate', width: 12 },
    { header: 'Quantity', key: 'quantity', width: 12 },
    { header: 'Reorder Level', key: 'reorderLevel', width: 14 },
    { header: 'Expiry Date', key: 'expiryDate', width: 16 },
  ];

  const headerRow = sheet.getRow(4);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };

  (medicines || []).forEach(m => {
    sheet.addRow({
      code: m.code || m.medicineId || '',
      name: m.name,
      genericName: m.genericName || '',
      category: m.category || '',
      unit: m.unit || '',
      purchasePrice: m.purchasePrice || 0,
      salePrice: m.salePrice || 0,
      gstRate: m.gstRate || 0,
      quantity: m.quantity || 0,
      reorderLevel: m.reorderLevel || 0,
      expiryDate: m.expiryDate ? new Date(m.expiryDate).toLocaleDateString() : '',
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

const generateGRNTemplateExcel = async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('GRN Items');

  sheet.mergeCells('A1:D1');
  sheet.getCell('A1').value = 'GRN Entry Template';
  sheet.getCell('A1').font = { bold: true, size: 14 };
  sheet.getCell('A1').alignment = { horizontal: 'center' };

  sheet.addRow([]);

  sheet.columns = [
    { header: 'Medicine Name', key: 'medicine', width: 30 },
    { header: 'Quantity', key: 'quantity', width: 12 },
    { header: 'Purchase Rate', key: 'purchasePrice', width: 16 },
    { header: 'GST Rate %', key: 'gstRate', width: 12 },
  ];

  const headerRow = sheet.getRow(3);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };

  sheet.addRow({ medicine: 'Example Medicine', quantity: 10, purchasePrice: 50, gstRate: 12 });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

module.exports = { generateCollectionReportExcel, generateLabCollectionReportExcel, generatePharmacyCollectionReportExcel, generatePharmacyReturnsReportExcel, generateStockReportExcel, generateLabTestsExcel, generateMedicinesExcel, generateGRNTemplateExcel };
