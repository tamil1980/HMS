const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const renderDocumentHeader = (doc, hospital, title, opts = {}) => {
  const L = 50, pageW = 495;
  const center = L + pageW / 2;

  let y = 44;

  const logoFile = hospital.logo
    ? path.join(__dirname, '..', 'uploads', path.basename(hospital.logo))
    : null;

  if (logoFile && fs.existsSync(logoFile)) {
    try {
      const img = doc.openImage(logoFile);
      const maxW = 90, maxH = 70;
      let w = img.width, h = img.height;
      const scale = Math.min(maxW / w, maxH / h, 1);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
      doc.image(logoFile, center - w / 2, y, { width: w, height: h });
      y += h + 8;
    } catch (e) {
      doc.rect(center - 18, y, 36, 36).fill('#ef4444');
      doc.fill('#fff').fontSize(24).font('Helvetica-Bold').text('+', center - 7, y + 3);
      doc.fill('#000');
      y += 44;
    }
  }

  doc.fillColor('#1e6bb8').font('Helvetica-Bold').fontSize(20).text(hospital.hospitalName || 'Hospital', L, y, { width: pageW, align: 'center' });
  y = doc.y + 2;

  doc.fillColor('#1e6bb8').font('Helvetica-Bold').fontSize(16).text(title, L, y, { width: pageW, align: 'center' });
  y = doc.y + 1;

  if (hospital.address) {
    doc.fillColor('#000').font('Helvetica').fontSize(9).text(hospital.address, L, y, { width: pageW, align: 'center' });
    y = doc.y + 1;
  }

  const contact = [hospital.phone ? `Ph: ${hospital.phone}` : '', hospital.email ? `Email: ${hospital.email}` : ''].filter(Boolean).join(' | ');
  if (contact) {
    doc.fontSize(8).text(contact, L, y, { width: pageW, align: 'center' });
  }

  doc.fillColor('#000').moveDown(0.5);
  doc.strokeColor(opts && opts.lineColor ? opts.lineColor : '#000').lineWidth(1).moveTo(L, doc.y).lineTo(L + pageW, doc.y).stroke();
  doc.strokeColor('#000').lineWidth(1);
  doc.moveDown(opts && opts.spaceAfter != null ? opts.spaceAfter : 0.6);
};

const sectionHeading = (doc, text) => {
  doc.fillColor('#1e6bb8').font('Helvetica-Bold').text(text);
  doc.fillColor('#000').font('Helvetica');
};

const drawTable = (doc, { headers, rows, colWidths, L = 50, pageW = 495, headerColor = '#1e6bb8' }) => {
  const R = L + pageW;
  const colCount = headers.length;
  const cols = [];
  let xx = L;
  for (let i = 0; i < colCount; i++) {
    cols.push(xx);
    xx += colWidths[i];
  }

  const tableTop = doc.y;
  doc.font('Helvetica-Bold').fontSize(9).fillColor(headerColor);
  let xPos = cols[0];
  headers.forEach((h, i) => {
    doc.text(h, xPos, tableTop, { width: colWidths[i], align: 'center' });
    if (cols[i + 1] !== undefined) xPos = cols[i + 1];
  });
  doc.fillColor('#000');

  doc.font('Helvetica').fontSize(9);
  const light = '#b0b0b0';
  doc.strokeColor(light).lineWidth(0.5);

  const headTextH = doc.heightOfString(headers[0], { width: colWidths[0] });
  const headerBot = tableTop + headTextH + 5;
  doc.moveTo(L, tableTop - 4).lineTo(R, tableTop - 4).stroke();
  doc.moveTo(L, headerBot).lineTo(R, headerBot).stroke();
  for (let i = 1; i < colCount; i++) {
    doc.moveTo(cols[i], tableTop - 4).lineTo(cols[i], headerBot).stroke();
  }

  let lastRowBot = headerBot;
  rows.forEach(cells => {
    let rowH = 0;
    cells.forEach((txt, ci) => {
      rowH = Math.max(rowH, doc.heightOfString(String(txt), { width: colWidths[ci] }));
    });
    let rowY = lastRowBot + 4;
    if (rowY + rowH > 740) { doc.addPage(); rowY = doc.y; }
    cells.forEach((txt, ci) => {
      doc.text(String(txt), cols[ci], rowY, { width: colWidths[ci], align: 'center' });
    });
    lastRowBot = rowY + rowH + 2;
    doc.moveTo(L, lastRowBot).lineTo(R, lastRowBot).stroke();
  });

  if (rows.length) {
    for (let i = 1; i < colCount; i++) {
      doc.moveTo(cols[i], tableTop - 4).lineTo(cols[i], lastRowBot).stroke();
    }
    doc.moveTo(L, tableTop - 4).lineTo(L, lastRowBot).stroke();
    doc.moveTo(R, tableTop - 4).lineTo(R, lastRowBot).stroke();
  }
  doc.strokeColor('#000').lineWidth(1);
  doc.y = lastRowBot;
  return lastRowBot;
};

const renderBillTop = (doc, { numberLabel, number, date, patient, patientId, phone, leftExtra = [] }) => {
  const L = 50, pageW = 495, R = L + pageW;
  const topY = doc.y;
  const rightW = 200;
  const rightCol = R - rightW;

  doc.fontSize(9).font('Helvetica');
  doc.font('Helvetica-Bold').text(`${numberLabel}: `, L, topY, { continued: true });
  doc.font('Helvetica').text(number);
  doc.font('Helvetica-Bold').text(`Date: `, L, doc.y + 2, { continued: true });
  doc.font('Helvetica').text(date);

  leftExtra.forEach(line => {
    doc.font('Helvetica-Bold').text(`${line.label}: `, L, doc.y + 2, { continued: true });
    doc.font('Helvetica').text(line.value);
  });

  doc.fillColor('#000').font('Helvetica');
  const btY = topY;
  if (patient) {
    doc.text(`Name: ${patient.name || ''}`, rightCol, btY, { width: rightW, align: 'right' });
    doc.text(`Patient ID: ${patientId || ''}`, rightCol, btY + 14, { width: rightW, align: 'right' });
    doc.text(`Phone: ${phone || ''}`, rightCol, btY + 28, { width: rightW, align: 'right' });
  }

  doc.y = btY + 46;
  doc.strokeColor('#a0c4ee').lineWidth(1).moveTo(L, doc.y).lineTo(R, doc.y).stroke();
  doc.strokeColor('#000').lineWidth(1);
  doc.y += 14;
};

const formatRate = (r) => {
  const n = Number(r);
  return n % 1 === 0 ? String(n) : n.toFixed(2);
};

const renderPatientQR = (doc, patient, { x, size = 80 } = {}) => {
  const data = patient?.qrCode;
  if (!data) return;
  try {
    const pos = { x: x != null ? x : 50, y: doc.y };
    doc.image(data, pos.x, pos.y, { width: size, height: size });
    doc.y = pos.y + size + 8;
  } catch (e) {
    doc.font('Helvetica').fontSize(8).text('QR unavailable', pos?.x || 50, pos?.y || doc.y);
  }
};

const generatePatientQRPDF = (patient, hospital, stream) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    doc.pipe(stream);

    const W = 595;
    const center = W / 2;
    const titleW = 480;
    const titleX = center - titleW / 2;

    doc.fillColor('#1e6bb8').font('Helvetica-Bold').fontSize(20)
      .text(hospital.hospitalName || 'Hospital', titleX, 70, { width: titleW, align: 'center' });
    doc.fillColor('#000').font('Helvetica').fontSize(11)
      .text('PATIENT QR CODE  |  LAB REFERENCE', titleX, doc.y + 7, { width: titleW, align: 'center' });

    doc.y += 5;
    if (patient.qrCode) {
      try {
        doc.image(patient.qrCode, center - 105, doc.y, { width: 210, height: 210 });
      } catch (e) { /* ignore */ }
      doc.y += 7;
    }

    const boxL = 107.5, boxW = 380;
    const labelX = boxL + 3;
    const boxTop = doc.y;

    const line = (label, value) => {
      if (value === undefined || value === null || value === '') return;
      doc.font('Helvetica-Bold').fontSize(11).text(`${label}: `, labelX, doc.y + 3, { continued: true });
      doc.font('Helvetica').text(String(value));
    };

    line('Patient ID', patient.patientId);
    line('Name', patient.name);
    line('Age / Gender', `${patient.age} / ${patient.gender}`);
    line('Blood Group', patient.bloodGroup);
    line('Phone', patient.phone);
    line('Email', patient.email);
    line('Address', patient.address);
    line('DOB', patient.dob ? new Date(patient.dob).toLocaleDateString() : '');

    doc.rect(boxL, boxTop, boxW, doc.y + 12 - boxTop).strokeColor('#a0c4ee').lineWidth(1).stroke();
    doc.strokeColor('#000').lineWidth(1);

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
};

const renderBillingTotals = (doc, bill, { includePaidDue = true } = {}) => {
  const L = 50, pageW = 495;
  const colW = pageW / 5;
  const col4 = L + 3 * colW;
  const col5 = L + 4 * colW;
  const half = formatRate((bill.gstRate || 0) / 2);
  const taxable = Math.max(0, (bill.subtotal || 0) - (bill.discount || 0));
  let ty = doc.y + 12;
  doc.font('Helvetica').fontSize(10);

  doc.text(`Subtotal:`, col4, ty);
  doc.text(`${bill.subtotal}`, col5, ty, { width: colW, align: 'right' });
  if (bill.discount > 0) {
    doc.text(`Discount:`, col4, ty + 18);
    doc.text(`-${bill.discount}`, col5, ty + 18, { width: colW, align: 'right' });
  }
  doc.text(`Taxable:`, col4, ty + 36);
  doc.text(`${taxable}`, col5, ty + 36, { width: colW, align: 'right' });
  if (bill.gstRate > 0) {
    doc.text(`CGST (${half}%):`, col4, ty + 54);
    doc.text(`${bill.cgst}`, col5, ty + 54, { width: colW, align: 'right' });
    doc.text(`SGST (${half}%):`, col4, ty + 72);
    doc.text(`${bill.sgst}`, col5, ty + 72, { width: colW, align: 'right' });
  }

  const tyGrand = bill.gstRate > 0 ? ty + 94 : ty + 58;
  doc.font('Helvetica-Bold').fontSize(12);
  doc.text(`Grand Total:`, col4, tyGrand);
  doc.text(`${bill.grandTotal}`, col5, tyGrand, { width: colW, align: 'right' });

  if (includePaidDue) {
    doc.font('Helvetica').fontSize(10);
    doc.text(`Paid: ${bill.amountPaid}`, col4, tyGrand + 24);
    doc.text(`Due: ${bill.amountDue}`, col4, tyGrand + 42);
  }
  doc.y = tyGrand + 58;
};

const generateInvoicePDF = (invoice, hospital, stream) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(stream);

    const L = 50, pageW = 495, R = L + pageW;

    renderDocumentHeader(doc, hospital, 'TAX INVOICE', { lineColor: '#a0c4ee', spaceAfter: 1.2 });

    const topY = doc.y;
    const rightW = 200;
    const rightCol = R - rightW;

    doc.fontSize(9).font('Helvetica');
    doc.font('Helvetica-Bold').text(`Invoice No: `, L, topY, { continued: true });
    doc.font('Helvetica').text(invoice.invoiceId);
    doc.font('Helvetica-Bold').text(`Date: `, L, doc.y + 2, { continued: true });
    doc.font('Helvetica').text(new Date(invoice.invoiceDate).toLocaleDateString());

    doc.fillColor('#000').font('Helvetica');
    const btY = topY;
    doc.text(`Name: ${invoice.patient?.name || ''}`, rightCol, btY, { width: rightW, align: 'right' });
    doc.text(`Patient ID: ${invoice.patient?.patientId || ''}`, rightCol, btY + 14, { width: rightW, align: 'right' });
    doc.text(`Phone: ${invoice.patient?.phone || ''}`, rightCol, btY + 28, { width: rightW, align: 'right' });

    doc.y = btY + 46;
    doc.strokeColor('#a0c4ee').lineWidth(1).moveTo(L, doc.y).lineTo(R, doc.y).stroke();
    doc.strokeColor('#000').lineWidth(1);
    doc.y += 14;

    const tableTop = doc.y;
    const colCount = 5;
    const colW = pageW / colCount;
    const cols = [];
    for (let i = 0; i < colCount; i++) cols.push(L + i * colW);
    const headers = ['S.No', 'Description', 'Qty', 'Rate', 'Amount'];
    const col4 = cols[3];
    const col5 = cols[4];

    doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e6bb8');
    let xPos = cols[0];
    headers.forEach((h, i) => {
      doc.text(h, xPos, tableTop, { width: colW, align: 'center' });
      if (cols[i + 1] !== undefined) xPos = cols[i + 1];
    });
    doc.fillColor('#000');

    doc.font('Helvetica').fontSize(9);
    const light = '#b0b0b0';
    doc.strokeColor(light).lineWidth(0.5);

    const headTextH = doc.heightOfString('S.No', { width: colW });
    const headerBot = tableTop + headTextH + 5;
    doc.moveTo(L, tableTop - 4).lineTo(R, tableTop - 4).stroke();
    doc.moveTo(L, headerBot).lineTo(R, headerBot).stroke();
    for (let i = 1; i < colCount; i++) {
      doc.moveTo(cols[i], tableTop - 4).lineTo(cols[i], headerBot).stroke();
    }

    let lastRowBot = headerBot;
    invoice.items.forEach((item, i) => {
      const cells = [String(i + 1), item.description || '', String(item.quantity), `${item.rate}`, `${item.amount}`];
      let rowH = 0;
      cells.forEach(txt => {
        rowH = Math.max(rowH, doc.heightOfString(txt, { width: colW }));
      });
      let rowY = lastRowBot + 4;
      if (rowY + rowH > 700) { doc.addPage(); rowY = doc.y; }
      cells.forEach((txt, ci) => {
        doc.text(txt, cols[ci], rowY, { width: colW, align: 'center' });
      });
      lastRowBot = rowY + rowH + 2;
      doc.moveTo(L, lastRowBot).lineTo(R, lastRowBot).stroke();
    });

    if (invoice.items.length) {
      for (let i = 1; i < colCount; i++) {
        doc.moveTo(cols[i], tableTop - 4).lineTo(cols[i], lastRowBot).stroke();
      }
      doc.moveTo(L, tableTop - 4).lineTo(L, lastRowBot).stroke();
      doc.moveTo(R, tableTop - 4).lineTo(R, lastRowBot).stroke();
    }

    const totalsY = lastRowBot + 12;

    doc.font('Helvetica').fontSize(10);
    doc.text(`Subtotal:`, col4 - 20, totalsY);
    doc.text(`${invoice.subtotal}`, col5, totalsY);

    if (invoice.discount > 0) {
      doc.text(`Discount:`, col4 - 20, totalsY + 18);
      doc.text(`-${invoice.discount}`, col5, totalsY + 18);
    }
    if (invoice.tax > 0) {
      doc.text(`Tax (${invoice.taxRate}%):`, col4 - 20, totalsY + 36);
      doc.text(`${invoice.tax}`, col5, totalsY + 36);
    }

    doc.font('Helvetica-Bold').fontSize(12);
    doc.text(`Grand Total:`, col4 - 35, totalsY + 58);
    doc.text(`${invoice.grandTotal}`, col5, totalsY + 58);

    doc.font('Helvetica').fontSize(10);
    doc.text(`Paid: ${invoice.amountPaid}`, col4 - 20, totalsY + 80);
    doc.text(`Due: ${invoice.amountDue}`, col4 - 20, totalsY + 98);

    doc.moveDown(3);
    if (hospital.footer) {
      doc.moveTo(L, doc.y).lineTo(L + pageW, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(8).text(hospital.footer, { align: 'center' });
    }

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
};

const generateCaseSheetPDF = (caseSheet, patient, consultant, hospital, stream) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(stream);

    const L = 50, R = 545, pageW = 495;

    renderDocumentHeader(doc, hospital, 'OP Case Sheet');
    doc.moveDown(0.3);

    doc.fontSize(9).font('Helvetica');
    const headerY = doc.y;
    const rightW = 200;
    const rightCol = R - rightW;
    const leftW = rightCol - L - 20;

    doc.font('Helvetica-Bold').text(`Case Sheet: `, L, headerY, { continued: true });
    doc.font('Helvetica').text(caseSheet.caseSheetId);
    doc.font('Helvetica-Bold').text(`Date: `, L, doc.y + 2, { continued: true });
    doc.font('Helvetica').text(new Date(caseSheet.date).toLocaleDateString());

    doc.font('Helvetica-Bold').text(`Doctor: ${consultant.name}`, rightCol, headerY, { width: rightW, align: 'right' });
    doc.font('Helvetica').text(`Hospital: ${hospital.hospitalName || ''}`, rightCol, doc.y + 2, { width: rightW, align: 'right' });

    doc.moveDown(0.5);
    doc.moveTo(L, doc.y).lineTo(R, doc.y).stroke();
    doc.moveDown(0.3);
    const secY = doc.y;

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e6bb8');
    doc.text('PATIENT DETAILS', L, secY, { width: pageW, align: 'center' });
    doc.fillColor('#000').font('Helvetica');

    let pY = secY + 16;

    const pairs = [
      ['Name', patient.name, 'Age/Gender', `${patient.age}/${patient.gender}`],
      ['Patient ID', patient.patientId, 'Phone', patient.phone],
    ];
    pairs.forEach(([lk, lv, rk, rv]) => {
      const leftRow = `${lk}: ${lv}`;
      const rightRow = `${rk}: ${rv}`;
      doc.text(leftRow, L, pY, { width: leftW });
      doc.text(rightRow, rightCol, pY, { width: rightW, align: 'right' });
      pY += Math.max(doc.heightOfString(leftRow, { width: leftW }), doc.heightOfString(rightRow, { width: rightW })) + 3;
    });
    const addrRow = `Address: ${patient.address || 'N/A'}`;
    doc.text(addrRow, L, pY, { width: R - L - 20 });
    pY += doc.heightOfString(addrRow, { width: R - L - 20 }) + 4;

    doc.moveTo(L, pY).lineTo(R, pY).lineWidth(0.6).strokeColor('#d0d0d0').stroke();
    doc.strokeColor('#000').lineWidth(1);
    pY += 6;

    if (caseSheet.vitals) {
      const vitals = caseSheet.vitals;
      doc.font('Helvetica-Bold').fillColor('#1e6bb8').text('VITALS', L, pY);
      doc.fillColor('#000').font('Helvetica');
      const vPairs = [
        ['Temperature', vitals.temperature || '-', 'Pulse', vitals.pulse || '-'],
        ['BP', vitals.bp || '-', 'SpO2', vitals.spo2 || '-'],
        ['Weight', vitals.weight || '-', 'Height', vitals.height || '-'],
      ];
      let vY = pY + 16;
      vPairs.forEach(([lk, lv, rk, rv]) => {
        doc.text(`${lk}: ${lv}`, L, vY, { width: leftW });
        doc.text(`${rk}: ${rv}`, rightCol - 25, vY, { width: rightW, align: 'right' });
        vY += 14;
      });
      doc.y = vY;
    } else {
      doc.y = pY;
    }
    doc.x = L;
    doc.moveDown(0.4);

    sectionHeading(doc, 'Complaints:');
    doc.text(caseSheet.complaints || 'N/A');
    doc.moveDown(0.3);

    if (caseSheet.history) {
      sectionHeading(doc, 'History:');
      doc.text(caseSheet.history);
      doc.moveDown(0.3);
    }

    if (caseSheet.examination) {
      sectionHeading(doc, 'Examination:');
      doc.text(caseSheet.examination);
      doc.moveDown(0.3);
    }

    sectionHeading(doc, 'Diagnosis:');
    doc.text(caseSheet.diagnosis || 'N/A');
    doc.moveDown(0.3);

    if (caseSheet.investigations && caseSheet.investigations.length > 0) {
      sectionHeading(doc, 'Investigations:');
      caseSheet.investigations.forEach(inv => {
        doc.text(`- ${inv.name}: ${inv.result || ''} ${inv.notes ? `(${inv.notes})` : ''}`);
      });
      doc.moveDown(0.3);
    }

    if (caseSheet.prescriptions && caseSheet.prescriptions.length > 0) {
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fillColor('#1e6bb8').font('Helvetica-Bold').fontSize(12).text('Prescription', { align: 'center' });
      doc.fillColor('#000').moveDown(0.5);

      const colCount = 6;
      const colW = pageW / colCount;
      const cols = [];
      for (let i = 0; i < colCount; i++) cols.push(L + i * colW);
      const headers = ['S.No', 'Medicine', 'Dosage', 'Frequency', 'Duration', 'Qty'];

      const headY = doc.y;
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e6bb8');
      let xPos = cols[0];
      headers.forEach((h, i) => {
        doc.text(h, xPos, headY, { width: colW, align: 'center' });
        if (cols[i + 1] !== undefined) xPos = cols[i + 1];
      });
      doc.fillColor('#000');

      doc.font('Helvetica').fontSize(9);
      const light = '#b0b0b0';
      doc.strokeColor(light).lineWidth(0.5);

      const headTextH = doc.heightOfString('S.No', { width: colW });
      const headerBot = headY + headTextH + 5;
      doc.moveTo(L, headY - 4).lineTo(R, headY - 4).stroke();
      doc.moveTo(L, headerBot).lineTo(R, headerBot).stroke();
      for (let i = 1; i < colCount; i++) {
        doc.moveTo(cols[i], headY - 4).lineTo(cols[i], headerBot).stroke();
      }

      let lastRowBot = headerBot;
      caseSheet.prescriptions.forEach((med, i) => {
        const cells = [
          String(i + 1),
          med.medicine || '',
          med.dosage || '',
          med.frequency || '',
          med.duration || '',
          med.quantity ? String(med.quantity) : '1',
        ];
        let rowH = 0;
        cells.forEach(txt => {
          rowH = Math.max(rowH, doc.heightOfString(txt, { width: colW }));
        });
        let rowY = lastRowBot + 4;
        if (rowY + rowH > 770) { doc.addPage(); rowY = doc.y; }
        cells.forEach((txt, ci) => {
          doc.text(txt, cols[ci], rowY, { width: colW, align: 'center' });
        });
        lastRowBot = rowY + rowH + 2;
        doc.moveTo(L, lastRowBot).lineTo(R, lastRowBot).stroke();
      });

      if (caseSheet.prescriptions.length) {
        for (let i = 1; i < colCount; i++) {
          doc.moveTo(cols[i], headY - 4).lineTo(cols[i], lastRowBot).stroke();
        }
        doc.moveTo(L, headY - 4).lineTo(L, lastRowBot).stroke();
        doc.moveTo(R, headY - 4).lineTo(R, lastRowBot).stroke();
      }
      doc.y = lastRowBot + 4;

      doc.strokeColor('#000').lineWidth(1);
    }

    doc.moveDown(1);
    if (caseSheet.advice) {
      sectionHeading(doc, 'Advice:');
      doc.text(caseSheet.advice);
      doc.moveDown(0.5);
    }

    doc.moveDown(1.5);
    const sigY = doc.y + 35;
    if (caseSheet.nextVisit) {
      doc.fillColor('#1e6bb8').font('Helvetica-Bold').text('Next Visit: ', L, sigY, { continued: true });
      doc.fillColor('#000').font('Helvetica').text(new Date(caseSheet.nextVisit).toLocaleDateString());
    } else {
      doc.y = sigY;
    }
    doc.fillColor('#000').font('Helvetica-Bold').text('Doctor Signature:', R - 110, sigY, { width: 110, align: 'right' });
    doc.fillColor('#000').font('Helvetica');

    if (hospital.footer) {
      doc.moveDown(0.5);
      doc.fontSize(8).text(hospital.footer, { align: 'center' });
    }

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
};

const generateCollectionReportPDF = (data, hospital, fromDate, toDate, stream, title = 'Collection Report', opts = {}) => {
  const { idKey = 'invoiceId', dateKey = 'invoiceDate', returns = [] } = opts;
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(stream);

    const L = 50, pageW = 495, R = L + pageW;

    renderDocumentHeader(doc, hospital, title, { spaceAfter: 1 });

    doc.fontSize(9).font('Helvetica').text(`From: ${fromDate} To: ${toDate}`, L, doc.y, { width: pageW, align: 'center' });
    doc.moveDown(0.8);

    const totalPaid = data.reduce((sum, inv) => sum + inv.amountPaid, 0);
    const totalDue = data.reduce((sum, inv) => sum + inv.amountDue, 0);

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text(`Total Collections: ${totalPaid}`, L, doc.y, { width: pageW, align: 'right' });
    doc.text(`Total Due: ${totalDue}`, L, doc.y + 15, { width: pageW, align: 'right' });
    doc.moveDown(1.8);

    const colCount = 5;
    const colW = pageW / colCount;
    const cols = [];
    for (let i = 0; i < colCount; i++) cols.push(L + i * colW);
    const headers = ['Invoice', 'Patient', 'Date', 'Total', 'Paid'];

    const tableTop = doc.y;
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e6bb8');
    let xPos = cols[0];
    headers.forEach((h, i) => {
      doc.text(h, xPos, tableTop, { width: colW, align: 'center' });
      if (cols[i + 1] !== undefined) xPos = cols[i + 1];
    });
    doc.fillColor('#000');

    doc.font('Helvetica').fontSize(9);
    const light = '#b0b0b0';
    doc.strokeColor(light).lineWidth(0.5);

    const headTextH = doc.heightOfString('Invoice', { width: colW });
    const headerBot = tableTop + headTextH + 5;
    doc.moveTo(L, tableTop - 4).lineTo(R, tableTop - 4).stroke();
    doc.moveTo(L, headerBot).lineTo(R, headerBot).stroke();
    for (let i = 1; i < colCount; i++) {
      doc.moveTo(cols[i], tableTop - 4).lineTo(cols[i], headerBot).stroke();
    }

    let lastRowBot = headerBot;
    data.forEach(inv => {
      const cells = [
        inv[idKey],
        inv.patient?.name || '',
        new Date(inv[dateKey]).toLocaleDateString(),
        `${inv.grandTotal}`,
        `${inv.amountPaid}`,
      ];
      let rowH = 0;
      cells.forEach(txt => {
        rowH = Math.max(rowH, doc.heightOfString(txt, { width: colW }));
      });
      let rowY = lastRowBot + 4;
      if (rowY + rowH > 720) { doc.addPage(); rowY = doc.y; }
      cells.forEach((txt, ci) => {
        doc.text(txt, cols[ci], rowY, { width: colW, align: 'center' });
      });
      lastRowBot = rowY + rowH + 2;
      doc.moveTo(L, lastRowBot).lineTo(R, lastRowBot).stroke();
    });

    if (data.length) {
      for (let i = 1; i < colCount; i++) {
        doc.moveTo(cols[i], tableTop - 4).lineTo(cols[i], lastRowBot).stroke();
      }
      doc.moveTo(L, tableTop - 4).lineTo(L, lastRowBot).stroke();
      doc.moveTo(R, tableTop - 4).lineTo(R, lastRowBot).stroke();
    }

    doc.y = lastRowBot + 10;
    doc.strokeColor('#000').lineWidth(1);
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text(`Total: ${totalPaid}`, L, doc.y, { width: pageW, align: 'right' });

    if (returns && returns.length) {
      const grossSales = data.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
      const returnTotal = returns.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
      const netSales = grossSales - returnTotal;

      doc.moveDown(1);
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#dc2626').text('SALES RETURNS', L, doc.y, { width: pageW, align: 'center' });
      doc.fillColor('#000');
      doc.moveDown(0.4);
      doc.fontSize(10).font('Helvetica-Bold').text(`Gross Sales: ${grossSales}   |   Total Returns: ${returnTotal}   |   Net Sales: ${netSales}`, L, doc.y, { width: pageW, align: 'center' });
      doc.moveDown(1);

      const rColCount = 5;
      const rColW = pageW / rColCount;
      const rCols = [];
      for (let i = 0; i < rColCount; i++) rCols.push(L + i * rColW);
      const rHeaders = ['Return No', 'Patient', 'Date', 'Reason', 'Amount'];

      const rTop = doc.y;
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e6bb8');
      let rx = rCols[0];
      rHeaders.forEach((h, i) => {
        doc.text(h, rx, rTop, { width: rColW, align: 'center' });
        if (rCols[i + 1] !== undefined) rx = rCols[i + 1];
      });
      doc.fillColor('#000');
      doc.font('Helvetica').fontSize(9);
      doc.strokeColor('#b0b0b0').lineWidth(0.5);
      const rHeadH = doc.heightOfString('Return No', { width: rColW });
      const rHeaderBot = rTop + rHeadH + 5;
      doc.moveTo(L, rTop - 4).lineTo(R, rTop - 4).stroke();
      doc.moveTo(L, rHeaderBot).lineTo(R, rHeaderBot).stroke();
      for (let i = 1; i < rColCount; i++) doc.moveTo(rCols[i], rTop - 4).lineTo(rCols[i], rHeaderBot).stroke();

      let rLast = rHeaderBot;
      returns.forEach(r => {
        const cells = [
          r.returnId,
          r.patient?.name || '',
          new Date(r.returnDate).toLocaleDateString(),
          r.reason || 'Other',
          `${r.totalAmount}`,
        ];
        let rowH = 0;
        cells.forEach(txt => { rowH = Math.max(rowH, doc.heightOfString(txt, { width: rColW })); });
        let rowY = rLast + 4;
        if (rowY + rowH > 720) { doc.addPage(); rowY = doc.y; }
        cells.forEach((txt, ci) => doc.text(txt, rCols[ci], rowY, { width: rColW, align: 'center' }));
        rLast = rowY + rowH + 2;
        doc.moveTo(L, rLast).lineTo(R, rLast).stroke();
      });
      for (let i = 1; i < rColCount; i++) doc.moveTo(rCols[i], rTop - 4).lineTo(rCols[i], rLast).stroke();
      doc.moveTo(L, rTop - 4).lineTo(L, rLast).stroke();
      doc.moveTo(R, rTop - 4).lineTo(R, rLast).stroke();
      doc.y = rLast + 10;
    }

    if (hospital.footer) {
      doc.moveDown(1);
      doc.fontSize(8).font('Helvetica').text(hospital.footer, { align: 'center' });
    }

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
};

const generateReturnsReportPDF = (returns, hospital, fromDate, toDate, stream) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(stream);

    const L = 50, pageW = 495, R = L + pageW;

    renderDocumentHeader(doc, hospital, 'PHARMACY SALES RETURN REPORT', { lineColor: '#fca5a5', spaceAfter: 1 });

    doc.fontSize(9).font('Helvetica').text(`From: ${fromDate} To: ${toDate}`, L, doc.y, { width: pageW, align: 'center' });
    doc.moveDown(0.8);

    const totalAmount = returns.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0);
    const totalQty = returns.reduce((s, r) => s + (r.items || []).reduce((a, it) => a + (Number(it.quantity) || 0), 0), 0);

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text(`Total Returns: ${returns.length}  |  Total Qty: ${totalQty}  |  Return Amount: ${totalAmount}`, L, doc.y, { width: pageW, align: 'right' });
    doc.moveDown(1.8);

    const colCount = 6;
    const colW = pageW / colCount;
    const cols = [];
    for (let i = 0; i < colCount; i++) cols.push(L + i * colW);
    const headers = ['Return No', 'Bill', 'Patient', 'Date', 'Reason', 'Amount'];

    const tableTop = doc.y;
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#dc2626');
    let xPos = cols[0];
    headers.forEach((h, i) => {
      doc.text(h, xPos, tableTop, { width: colW, align: 'center' });
      if (cols[i + 1] !== undefined) xPos = cols[i + 1];
    });
    doc.fillColor('#000');

    doc.font('Helvetica').fontSize(9);
    const light = '#b0b0b0';
    doc.strokeColor(light).lineWidth(0.5);

    const headTextH = doc.heightOfString('Return No', { width: colW });
    const headerBot = tableTop + headTextH + 5;
    doc.moveTo(L, tableTop - 4).lineTo(R, tableTop - 4).stroke();
    doc.moveTo(L, headerBot).lineTo(R, headerBot).stroke();
    for (let i = 1; i < colCount; i++) {
      doc.moveTo(cols[i], tableTop - 4).lineTo(cols[i], headerBot).stroke();
    }

    let lastRowBot = headerBot;
    returns.forEach(r => {
      const cells = [
        r.returnId,
        r.bill?.billId || '',
        r.patient?.name || '',
        new Date(r.returnDate).toLocaleDateString(),
        r.reason || 'Other',
        `${r.totalAmount}`,
      ];
      let rowH = 0;
      cells.forEach(txt => { rowH = Math.max(rowH, doc.heightOfString(txt, { width: colW })); });
      let rowY = lastRowBot + 4;
      if (rowY + rowH > 720) { doc.addPage(); rowY = doc.y; }
      cells.forEach((txt, ci) => doc.text(txt, cols[ci], rowY, { width: colW, align: 'center' }));
      lastRowBot = rowY + rowH + 2;
      doc.moveTo(L, lastRowBot).lineTo(R, lastRowBot).stroke();
    });

    if (returns.length) {
      for (let i = 1; i < colCount; i++) {
        doc.moveTo(cols[i], tableTop - 4).lineTo(cols[i], lastRowBot).stroke();
      }
      doc.moveTo(L, tableTop - 4).lineTo(L, lastRowBot).stroke();
      doc.moveTo(R, tableTop - 4).lineTo(R, lastRowBot).stroke();
    }

    doc.y = lastRowBot + 10;
    doc.strokeColor('#000').lineWidth(1);
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text(`Total Return Amount: ${totalAmount}`, L, doc.y, { width: pageW, align: 'right' });

    if (hospital.footer) {
      doc.moveDown(1);
      doc.fontSize(8).font('Helvetica').text(hospital.footer, { align: 'center' });
    }

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
};

const generateLabBillPDF = (bill, hospital, stream) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(stream);

    const L = 50, pageW = 495, R = L + pageW;

    const maskCard = (n) => n && n.length >= 4 ? `**** **** **** ${n.slice(-4)}` : (n || '-');

    renderDocumentHeader(doc, hospital, 'LABORATORY TAX INVOICE', { lineColor: '#a0c4ee', spaceAfter: 1.2 });

    renderBillTop(doc, {
      numberLabel: 'Bill No',
      number: bill.billId,
      date: new Date(bill.billDate).toLocaleDateString(),
      patient: bill.patient,
      patientId: bill.patient?.patientId,
      phone: bill.patient?.phone,
      leftExtra: bill.referredBy ? [{ label: 'Referred By', value: bill.referredBy }] : [],
    });

    const rows = bill.items.map((it, i) => [
      String(i + 1),
      it.name,
      it.category || '',
      String(it.quantity),
      String(it.price),
      it.gstRate ? `${it.gstRate}%` : '-',
      String(it.amount),
    ]);
    drawTable(doc, {
      headers: ['S.No', 'Test', 'Category', 'Qty', 'Rate', 'GST', 'Amount'],
      rows,
      colWidths: [30, 165, 60, 35, 70, 45, 90],
      L, pageW,
    });

    doc.y += 2;
    renderBillingTotals(doc, bill);

    const payment = bill.payments?.[0];
    if (payment) {
      doc.moveDown(0.4);
      doc.font('Helvetica-Bold').fontSize(9);
      doc.text(`Payment Mode: ${payment.mode}`);
      doc.fillColor('#000').font('Helvetica');
      if (payment.mode === 'UPI' && payment.transactionId) {
        doc.text(`Transaction ID: ${payment.transactionId}`);
      }
      if (payment.mode === 'Debit Card' || payment.mode === 'Credit Card') {
        doc.text(`Card No: ${maskCard(payment.cardNumber)}  |  Card Holder: ${payment.cardHolder || '-'}  |  Expiry: ${payment.cardExpiry || '-'}`);
      }
      doc.text(`Amount Paid: ${bill.amountPaid}`);
    }

    renderPatientQR(doc, bill.patient, { x: R - 90 });

    if (bill.notes) {
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(8).text(`Notes: ${bill.notes}`);
    }
    if (hospital.footer) {
      doc.moveDown(1);
      doc.moveTo(L, doc.y).lineTo(R, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(8).text(hospital.footer, { align: 'center' });
    }

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
};

const generatePharmacyBillPDF = (bill, hospital, stream) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(stream);

    const L = 50, pageW = 495, R = L + pageW;

    renderDocumentHeader(doc, hospital, 'PHARMACY TAX INVOICE', { lineColor: '#a0c4ee', spaceAfter: 1.2 });

    renderBillTop(doc, {
      numberLabel: 'Bill No',
      number: bill.billId,
      date: new Date(bill.billDate).toLocaleDateString(),
      patient: bill.patient,
      patientId: bill.patient?.patientId,
      phone: bill.patient?.phone,
      leftExtra: bill.doctor?.name ? [{ label: 'Doctor', value: bill.doctor.name }] : [],
    });

    const rows = bill.items.map((it, i) => [
      String(i + 1),
      it.name,
      String(it.quantity),
      String(it.salePrice),
      it.gstRate ? `${it.gstRate}%` : '-',
      String(it.amount),
    ]);
    drawTable(doc, {
      headers: ['S.No', 'Medicine', 'Qty', 'Rate', 'GST', 'Amount'],
      rows,
      colWidths: [30, 195, 45, 80, 55, 90],
      L, pageW,
    });

    doc.y += 2;
    renderBillingTotals(doc, bill);

    const payment = bill.payments?.[0];
    if (payment) {
      const maskCard = (n) => n && n.length >= 4 ? `**** **** **** ${n.slice(-4)}` : (n || '-');
      doc.moveDown(0.4);
      doc.font('Helvetica-Bold').fontSize(9);
      doc.text(`Payment Mode: ${payment.mode}`);
      doc.fillColor('#000').font('Helvetica');
      if (payment.mode === 'UPI' && payment.transactionId) {
        doc.text(`Transaction ID: ${payment.transactionId}`);
      }
      if (payment.mode === 'Debit Card' || payment.mode === 'Credit Card') {
        doc.text(`Card No: ${maskCard(payment.cardNumber)}  |  Card Holder: ${payment.cardHolder || '-'}  |  Expiry: ${payment.cardExpiry || '-'}`);
      }
      doc.text(`Amount Paid: ${bill.amountPaid}`);
    }

    renderPatientQR(doc, bill.patient, { x: R - 90 });

    if (bill.notes) {
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(8).text(`Notes: ${bill.notes}`);
    }
    if (hospital.footer) {
      doc.moveDown(1);
      doc.moveTo(L, doc.y).lineTo(R, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(8).text(hospital.footer, { align: 'center' });
    }

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
};

const generatePharmacyReturnPDF = (ret, hospital, stream) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(stream);

    const L = 50, pageW = 495, R = L + pageW;

    renderDocumentHeader(doc, hospital, 'PHARMACY SALES RETURN BILL', { lineColor: '#fca5a5', spaceAfter: 1.2 });

    renderBillTop(doc, {
      numberLabel: 'Return Bill No',
      number: ret.returnId,
      date: new Date(ret.returnDate).toLocaleDateString(),
      patient: ret.patient,
      patientId: ret.patient?.patientId,
      phone: ret.patient?.phone,
      leftExtra: [
        { label: 'Original Bill No', value: ret.bill?.billId || '-' },
        { label: 'Reason', value: ret.reason || 'Other' },
      ],
    });

    const rows = (ret.items || []).map((it, i) => [
      String(i + 1),
      it.name,
      String(it.quantity),
      String(it.salePrice),
      it.gstRate ? `${it.gstRate}%` : '-',
      String(it.amount),
    ]);
    drawTable(doc, {
      headers: ['S.No', 'Medicine', 'Qty', 'Rate', 'GST', 'Amount'],
      rows,
      colWidths: [30, 195, 45, 80, 55, 90],
      L, pageW,
    });

    doc.y += 2;
    const taxable = ret.subtotal || 0;
    const colW = pageW / 5;
    const col4 = L + 3 * colW;
    const col5 = L + 4 * colW;
    let ty = doc.y + 12;
    doc.font('Helvetica').fontSize(10);
    doc.text(`Subtotal:`, col4, ty);
    doc.text(`${ret.subtotal}`, col5, ty, { width: colW, align: 'right' });
    doc.text(`Taxable:`, col4, ty + 18);
    doc.text(`${taxable}`, col5, ty + 18, { width: colW, align: 'right' });
    if (ret.tax > 0) {
      doc.text(`CGST:`, col4, ty + 36);
      doc.text(`${ret.cgst}`, col5, ty + 36, { width: colW, align: 'right' });
      doc.text(`SGST:`, col4, ty + 54);
      doc.text(`${ret.sgst}`, col5, ty + 54, { width: colW, align: 'right' });
    }
    const tyGrand = ret.tax > 0 ? ty + 76 : ty + 40;
    doc.font('Helvetica-Bold').fontSize(12);
    doc.text(`Return Amount:`, col4, tyGrand);
    doc.text(`${ret.totalAmount}`, col5, tyGrand, { width: colW, align: 'right' });
    doc.y = tyGrand + 28;

    doc.font('Helvetica-Bold').fontSize(9);
    doc.text(`Refund Status: ${ret.refunded ? (ret.refundMode || 'Refunded') : 'Not Refunded'}`);
    doc.fillColor('#000').font('Helvetica');

    if (ret.notes) {
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(8).text(`Notes: ${ret.notes}`);
    }

    renderPatientQR(doc, ret.patient, { x: R - 90 });

    if (hospital.footer) {
      doc.moveDown(1);
      doc.moveTo(L, doc.y).lineTo(R, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(8).text(hospital.footer, { align: 'center' });
    }

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
};

const generateGRNPDF = (grn, hospital, stream) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(stream);

    const L = 50, pageW = 495, R = L + pageW;

    renderDocumentHeader(doc, hospital, 'GOODS RECEIVED NOTE', { lineColor: '#a0c4ee', spaceAfter: 1.2 });

    renderBillTop(doc, {
      numberLabel: 'GRN No',
      number: grn.grnId,
      date: new Date(grn.grnDate).toLocaleDateString(),
      patient: null,
      leftExtra: [
        { label: 'Supplier', value: grn.supplier?.name || '' },
        ...(grn.supplier?.company ? [{ label: 'Company', value: grn.supplier.company }] : []),
        { label: 'Invoice Ref', value: grn.invoiceRef || '-' },
      ],
    });

    const rows = grn.items.map((it, i) => [
      String(i + 1),
      it.name,
      String(it.quantity),
      String(it.purchasePrice),
      String(it.amount),
    ]);
    drawTable(doc, {
      headers: ['S.No', 'Medicine', 'Qty', 'Purchase Rate', 'Amount'],
      rows,
      colWidths: [35, 235, 55, 80, 90],
      L, pageW,
    });

    doc.y += 2;
    doc.font('Helvetica-Bold').fontSize(11);
    doc.text(`Total Amount: ${grn.totalAmount}`, R - 130, doc.y, { width: 130, align: 'right' });
    doc.font('Helvetica').fontSize(9);

    if (grn.notes) {
      doc.moveDown(0.8);
      doc.text(`Notes: ${grn.notes}`);
    }
    if (hospital.footer) {
      doc.moveDown(1.2);
      doc.moveTo(L, doc.y).lineTo(R, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(8).text(hospital.footer, { align: 'center' });
    }

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
};

const generateStockReportPDF = (report, hospital, stream) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', landscape: true, margin: 40 });
    doc.pipe(stream);

    const L = 40, pageW = 775;

    renderDocumentHeader(doc, hospital, 'STOCK REPORT', { spaceAfter: 1 });
    doc.fontSize(9).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString()}`, L, doc.y, { width: pageW, align: 'center' });
    doc.moveDown(0.8);

    const rows = report.map(m => [
      m.medicineId,
      m.name,
      m.category || '',
      String(m.purchasePrice || 0),
      String(m.salePrice || 0),
      String(m.quantity),
      String(m.reorderLevel || 0),
      m.expiryDate ? new Date(m.expiryDate).toLocaleDateString() : '-',
      String(m.stockValue || 0),
      m.isLow ? 'LOW' : '',
    ]);
    drawTable(doc, {
      headers: ['Code', 'Medicine', 'Category', 'P.Price', 'S.Price', 'Qty', 'Reorder', 'Expiry', 'Stock Value', 'Alert'],
      rows,
      colWidths: [70, 165, 90, 65, 65, 60, 65, 70, 75, 50],
      L, pageW,
    });

    const totalValue = report.reduce((s, m) => s + (m.stockValue || 0), 0);
    const totalQty = report.reduce((s, m) => s + (m.quantity || 0), 0);
    const lowCount = report.filter(m => m.isLow).length;

    doc.y += 10;
    doc.strokeColor('#000').lineWidth(1);
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text(`Total Items: ${report.length}    Total Qty: ${totalQty}    Low Stock Items: ${lowCount}`, L, doc.y, { width: pageW, align: 'left' });
    doc.text(`Total Stock Value: ${totalValue}`, L, doc.y + 16, { width: pageW, align: 'left' });

    if (hospital.footer) {
      doc.moveDown(1.5);
      doc.fontSize(8).font('Helvetica').text(hospital.footer, { align: 'center' });
    }

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
};

const generateLabResultPDF = (result, hospital, stream) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(stream);

    const L = 50, pageW = 495, R = L + pageW;

    renderDocumentHeader(doc, hospital, 'LABORATORY REPORT', { lineColor: '#a0c4ee', spaceAfter: 1.2 });

    renderBillTop(doc, {
      numberLabel: 'Report No',
      number: result.resultId,
      date: new Date(result.resultDate).toLocaleDateString(),
      patient: result.patient,
      patientId: result.patient?.patientId,
      phone: result.patient?.phone,
      leftExtra: [
        ...(result.bill?.billId ? [{ label: 'Bill', value: result.bill.billId }] : []),
        ...(result.referredBy ? [{ label: 'Referred By', value: result.referredBy }] : []),
        ...(result.sampleCollectedAt ? [{ label: 'Sample On', value: new Date(result.sampleCollectedAt).toLocaleDateString() }] : []),
      ],
    });

    const rows = (result.tests || []).map((t, i) => [
      String(i + 1),
      t.name,
      t.result || 'Pending',
      t.unit || '',
      t.referenceRange || '',
      t.status || 'Pending',
    ]);
    drawTable(doc, {
      headers: ['S.No', 'Test', 'Result', 'Unit', 'Reference Range', 'Status'],
      rows,
      colWidths: [30, 120, 90, 45, 120, 90],
      L, pageW,
    });

    if (result.notes) {
      doc.moveDown(0.8);
      doc.font('Helvetica-Bold').fontSize(9).text('Remarks:');
      doc.font('Helvetica').fontSize(9).text(result.notes);
    }

    renderPatientQR(doc, result.patient, { x: R - 90 });

    doc.moveDown(2);
    const sigY = doc.y + 20;
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('Collected By', L, sigY);
    doc.text('Pathologist / Incharge', R - 130, sigY, { width: 130, align: 'right' });

    if (hospital.footer) {
      doc.moveDown(1.2);
      doc.moveTo(L, doc.y).lineTo(R, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(8).font('Helvetica').text(hospital.footer, { align: 'center' });
    }

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
};

const generateIPBillPDF = (bill, hospital, stream) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(stream);

    const L = 50, pageW = 495, R = L + pageW;

    renderDocumentHeader(doc, hospital, 'IP BILL (INPATIENT)', { lineColor: '#a0c4ee', spaceAfter: 1.2 });

    renderBillTop(doc, {
      numberLabel: 'Bill No',
      number: bill.billId,
      date: new Date(bill.billDate).toLocaleDateString(),
      patient: bill.patient,
      patientId: bill.patient?.patientId,
      phone: bill.patient?.phone,
      leftExtra: bill.admission?.admissionId ? [
        { label: 'Admission', value: bill.admission.admissionId },
        { label: 'Ward/Bed', value: `${bill.admission.ward || '-'} / ${bill.admission.bedNumber || '-'}` },
      ] : [],
    });

    const rows = bill.items.map((it, i) => [
      String(i + 1),
      it.name,
      it.category || '',
      String(it.quantity),
      String(it.rate),
      it.gstRate ? `${it.gstRate}%` : '-',
      String(it.amount),
    ]);
    drawTable(doc, {
      headers: ['S.No', 'Component', 'Category', 'Qty', 'Rate', 'GST', 'Amount'],
      rows,
      colWidths: [30, 165, 60, 35, 70, 45, 90],
      L, pageW,
    });

    doc.y += 2;
    renderBillingTotals(doc, bill);

    const payment = bill.payments?.[0];
    if (payment) {
      const maskCard = (n) => n && n.length >= 4 ? `**** **** **** ${n.slice(-4)}` : (n || '-');
      doc.moveDown(0.4);
      doc.font('Helvetica-Bold').fontSize(9);
      doc.text(`Payment Mode: ${payment.mode}`);
      doc.fillColor('#000').font('Helvetica');
      if (payment.mode === 'UPI' && payment.transactionId) {
        doc.text(`Transaction ID: ${payment.transactionId}`);
      }
      if (payment.mode === 'Debit Card' || payment.mode === 'Credit Card') {
        doc.text(`Card No: ${maskCard(payment.cardNumber)}  |  Card Holder: ${payment.cardHolder || '-'}  |  Expiry: ${payment.cardExpiry || '-'}`);
      }
      doc.text(`Amount Paid: ${bill.amountPaid}`);
    }

    renderPatientQR(doc, bill.patient, { x: R - 90 });

    if (bill.notes) {
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(8).text(`Notes: ${bill.notes}`);
    }
    if (hospital.footer) {
      doc.moveDown(1);
      doc.moveTo(L, doc.y).lineTo(R, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(8).text(hospital.footer, { align: 'center' });
    }

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
};

const generateIPCaseSheetPDF = (caseSheet, patient, consultant, admission, hospital, stream) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(stream);

    const L = 50, R = 545, pageW = 495;

    renderDocumentHeader(doc, hospital, 'IP Case Sheet');
    doc.moveDown(0.3);

    doc.fontSize(9).font('Helvetica');
    const headerY = doc.y;
    const rightW = 200;
    const rightCol = R - rightW;
    const leftW = rightCol - L - 20;

    doc.font('Helvetica-Bold').text(`Case Sheet: `, L, headerY, { continued: true });
    doc.font('Helvetica').text(caseSheet.caseSheetId);
    doc.font('Helvetica-Bold').text(`Date: `, L, doc.y + 2, { continued: true });
    doc.font('Helvetica').text(`${new Date(caseSheet.date).toLocaleDateString()} (${caseSheet.shift || ''})`);

    doc.font('Helvetica-Bold').text(`Doctor: ${consultant ? consultant.name : ''}`, rightCol, headerY, { width: rightW, align: 'right' });
    doc.font('Helvetica').text(`Admission: ${admission ? admission.admissionId : ''}`, rightCol, doc.y + 2, { width: rightW, align: 'right' });

    doc.moveDown(0.5);
    doc.moveTo(L, doc.y).lineTo(R, doc.y).stroke();
    doc.moveDown(0.3);
    const secY = doc.y;

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e6bb8');
    doc.text('PATIENT DETAILS', L, secY, { width: pageW, align: 'center' });
    doc.fillColor('#000').font('Helvetica');

    let pY = secY + 16;

    const pairs = [
      ['Name', patient.name, 'Age/Gender', `${patient.age}/${patient.gender}`],
      ['Patient ID', patient.patientId, 'Phone', patient.phone],
      ['Ward', admission ? admission.ward || '-' : '-', 'Bed', admission ? admission.bedNumber || '-' : '-'],
    ];
    pairs.forEach(([lk, lv, rk, rv]) => {
      const leftRow = `${lk}: ${lv}`;
      const rightRow = `${rk}: ${rv}`;
      doc.text(leftRow, L, pY, { width: leftW });
      doc.text(rightRow, rightCol, pY, { width: rightW, align: 'right' });
      pY += Math.max(doc.heightOfString(leftRow, { width: leftW }), doc.heightOfString(rightRow, { width: rightW })) + 3;
    });

    doc.moveTo(L, pY).lineTo(R, pY).lineWidth(0.6).strokeColor('#d0d0d0').stroke();
    doc.strokeColor('#000').lineWidth(1);
    pY += 6;

    if (caseSheet.vitals) {
      const vitals = caseSheet.vitals;
      doc.font('Helvetica-Bold').fillColor('#1e6bb8').text('VITALS', L, pY);
      doc.fillColor('#000').font('Helvetica');
      const vPairs = [
        ['Temperature', vitals.temperature || '-', 'Pulse', vitals.pulse || '-'],
        ['BP', vitals.bloodPressure || vitals.bp || '-', 'SpO2', vitals.spo2 || '-'],
        ['Respiration', vitals.respiration || '-', 'Weight', vitals.weight || '-'],
      ];
      let vY = pY + 16;
      vPairs.forEach(([lk, lv, rk, rv]) => {
        doc.text(`${lk}: ${lv}`, L, vY, { width: leftW });
        doc.text(`${rk}: ${rv}`, rightCol - 25, vY, { width: rightW, align: 'right' });
        vY += 14;
      });
      doc.y = vY;
    } else {
      doc.y = pY;
    }
    doc.x = L;
    doc.moveDown(0.4);

    sectionHeading(doc, 'Complaints:');
    doc.text(caseSheet.complaints || 'N/A');
    doc.moveDown(0.3);

    if (caseSheet.history) {
      sectionHeading(doc, 'History:');
      doc.text(caseSheet.history);
      doc.moveDown(0.3);
    }

    if (caseSheet.examination) {
      sectionHeading(doc, 'Examination:');
      doc.text(caseSheet.examination);
      doc.moveDown(0.3);
    }

    sectionHeading(doc, 'Diagnosis:');
    doc.text(caseSheet.diagnosis || 'N/A');
    doc.moveDown(0.3);

    if (caseSheet.investigations && caseSheet.investigations.length > 0) {
      sectionHeading(doc, 'Investigations:');
      caseSheet.investigations.forEach(inv => {
        doc.text(`- ${inv.name}: ${inv.result || ''} ${inv.notes ? `(${inv.notes})` : ''}`);
      });
      doc.moveDown(0.3);
    }

    if (caseSheet.treatmentPlan) {
      sectionHeading(doc, 'Treatment Plan:');
      doc.text(caseSheet.treatmentPlan);
      doc.moveDown(0.3);
    }

    if (caseSheet.prescriptions && caseSheet.prescriptions.length > 0) {
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fillColor('#1e6bb8').font('Helvetica-Bold').fontSize(12).text('Prescription', { align: 'center' });
      doc.fillColor('#000').moveDown(0.5);

      const colCount = 6;
      const colW = pageW / colCount;
      const cols = [];
      for (let i = 0; i < colCount; i++) cols.push(L + i * colW);
      const headers = ['S.No', 'Medicine', 'Dosage', 'Frequency', 'Duration', 'Qty'];

      const headY = doc.y;
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e6bb8');
      let xPos = cols[0];
      headers.forEach((h, i) => {
        doc.text(h, xPos, headY, { width: colW, align: 'center' });
        if (cols[i + 1] !== undefined) xPos = cols[i + 1];
      });
      doc.fillColor('#000');

      doc.font('Helvetica').fontSize(9);
      const light = '#b0b0b0';
      doc.strokeColor(light).lineWidth(0.5);

      const headTextH = doc.heightOfString('S.No', { width: colW });
      const headerBot = headY + headTextH + 5;
      doc.moveTo(L, headY - 4).lineTo(R, headY - 4).stroke();
      doc.moveTo(L, headerBot).lineTo(R, headerBot).stroke();
      for (let i = 1; i < colCount; i++) {
        doc.moveTo(cols[i], headY - 4).lineTo(cols[i], headerBot).stroke();
      }

      let lastRowBot = headerBot;
      caseSheet.prescriptions.forEach((med, i) => {
        const cells = [
          String(i + 1),
          med.medicine || '',
          med.dosage || '',
          med.frequency || '',
          med.duration || '',
          med.quantity ? String(med.quantity) : '1',
        ];
        let rowH = 0;
        cells.forEach(txt => {
          rowH = Math.max(rowH, doc.heightOfString(txt, { width: colW }));
        });
        let rowY = lastRowBot + 4;
        if (rowY + rowH > 770) { doc.addPage(); rowY = doc.y; }
        cells.forEach((txt, ci) => {
          doc.text(txt, cols[ci], rowY, { width: colW, align: 'center' });
        });
        lastRowBot = rowY + rowH + 2;
        doc.moveTo(L, lastRowBot).lineTo(R, lastRowBot).stroke();
      });

      if (caseSheet.prescriptions.length) {
        for (let i = 1; i < colCount; i++) {
          doc.moveTo(cols[i], headY - 4).lineTo(cols[i], lastRowBot).stroke();
        }
        doc.moveTo(L, headY - 4).lineTo(L, lastRowBot).stroke();
        doc.moveTo(R, headY - 4).lineTo(R, lastRowBot).stroke();
      }
      doc.y = lastRowBot + 4;

      doc.strokeColor('#000').lineWidth(1);
    }

    doc.moveDown(1);
    if (caseSheet.notes) {
      sectionHeading(doc, 'Notes:');
      doc.text(caseSheet.notes);
      doc.moveDown(0.5);
    }

    doc.moveDown(1.5);
    const sigY = doc.y + 35;
    doc.fillColor('#000').font('Helvetica-Bold').text('Doctor Signature:', R - 110, sigY, { width: 110, align: 'right' });
    doc.fillColor('#000').font('Helvetica');

    if (hospital.footer) {
      doc.moveDown(0.5);
      doc.fontSize(8).text(hospital.footer, { align: 'center' });
    }

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
};

const generateDischargeSummaryPDF = (summary, hospital, stream) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(stream);

    const L = 50, R = 545, pageW = 495;
    const admission = summary.admission || {};
    const patient = (admission.patient) || {};

    renderDocumentHeader(doc, hospital, 'DISCHARGE SUMMARY', { lineColor: '#a0c4ee', spaceAfter: 1.2 });
    doc.moveDown(0.3);

    const headerY = doc.y;
    const rightW = 200;
    const rightCol = R - rightW;
    const leftW = rightCol - L - 20;

    doc.fontSize(9).font('Helvetica');
    doc.font('Helvetica-Bold').text(`Summary: `, L, headerY, { continued: true });
    doc.font('Helvetica').text(summary.summaryId);
    doc.font('Helvetica-Bold').text(`Discharge Date: `, L, doc.y + 2, { continued: true });
    doc.font('Helvetica').text(new Date(summary.dischargeDate).toLocaleDateString());

    doc.font('Helvetica-Bold').text(`Admission: ${admission.admissionId || ''}`, rightCol, headerY, { width: rightW, align: 'right' });
    doc.font('Helvetica').text(`Hospital: ${hospital.hospitalName || ''}`, rightCol, doc.y + 2, { width: rightW, align: 'right' });

    doc.moveDown(0.5);
    doc.moveTo(L, doc.y).lineTo(R, doc.y).stroke();
    doc.moveDown(0.3);

    const secY = doc.y;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e6bb8');
    doc.text('PATIENT DETAILS', L, secY, { width: pageW, align: 'center' });
    doc.fillColor('#000').font('Helvetica');

    let pY = secY + 16;
    const pairs = [
      ['Name', patient.name, 'Age/Gender', `${patient.age}/${patient.gender}`],
      ['Patient ID', patient.patientId, 'Phone', patient.phone],
      ['Admitted On', admission.admissionDate ? new Date(admission.admissionDate).toLocaleDateString() : '-', 'Ward/Bed', `${admission.ward || '-'} / ${admission.bedNumber || '-'}`],
    ];
    pairs.forEach(([lk, lv, rk, rv]) => {
      const leftRow = `${lk}: ${lv}`;
      const rightRow = `${rk}: ${rv}`;
      doc.text(leftRow, L, pY, { width: leftW });
      doc.text(rightRow, rightCol, pY, { width: rightW, align: 'right' });
      pY += Math.max(doc.heightOfString(leftRow, { width: leftW }), doc.heightOfString(rightRow, { width: rightW })) + 3;
    });
    doc.y = pY;
    doc.x = L;
    doc.moveDown(0.4);

    sectionHeading(doc, 'Admitting Diagnosis:');
    doc.text(summary.admittingDiagnosis || 'N/A');
    doc.moveDown(0.3);

    sectionHeading(doc, 'Final Diagnosis:');
    doc.text(summary.finalDiagnosis || 'N/A');
    doc.moveDown(0.3);

    if (summary.conditionAtDischarge) {
      sectionHeading(doc, 'Condition at Discharge:');
      doc.text(summary.conditionAtDischarge);
      doc.moveDown(0.3);
    }

    if (summary.treatmentGiven) {
      sectionHeading(doc, 'Treatment Given:');
      doc.text(summary.treatmentGiven);
      doc.moveDown(0.3);
    }

    if (summary.investigationSummary) {
      sectionHeading(doc, 'Investigation Summary:');
      doc.text(summary.investigationSummary);
      doc.moveDown(0.3);
    }

    if (summary.procedureDone) {
      sectionHeading(doc, 'Procedures Done:');
      doc.text(summary.procedureDone);
      doc.moveDown(0.3);
    }

    if (summary.medicationsAtDischarge && summary.medicationsAtDischarge.length > 0) {
      doc.moveTo(L, doc.y).lineTo(R, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fillColor('#1e6bb8').font('Helvetica-Bold').fontSize(12).text('Medications at Discharge', { align: 'center' });
      doc.fillColor('#000').moveDown(0.5);

      const colCount = 5;
      const colW = pageW / colCount;
      const cols = [];
      for (let i = 0; i < colCount; i++) cols.push(L + i * colW);
      const headers = ['S.No', 'Medicine', 'Dosage', 'Frequency', 'Duration'];

      const headY = doc.y;
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e6bb8');
      let xPos = cols[0];
      headers.forEach((h, i) => {
        doc.text(h, xPos, headY, { width: colW, align: 'center' });
        if (cols[i + 1] !== undefined) xPos = cols[i + 1];
      });
      doc.fillColor('#000');
      doc.font('Helvetica').fontSize(9);
      const light = '#b0b0b0';
      doc.strokeColor(light).lineWidth(0.5);
      const headTextH = doc.heightOfString('S.No', { width: colW });
      const headerBot = headY + headTextH + 5;
      doc.moveTo(L, headY - 4).lineTo(R, headY - 4).stroke();
      doc.moveTo(L, headerBot).lineTo(R, headerBot).stroke();
      for (let i = 1; i < colCount; i++) {
        doc.moveTo(cols[i], headY - 4).lineTo(cols[i], headerBot).stroke();
      }
      let lastRowBot = headerBot;
      summary.medicationsAtDischarge.forEach((med, i) => {
        const cells = [String(i + 1), med.medicine || '', med.dosage || '', med.frequency || '', med.duration || ''];
        let rowH = 0;
        cells.forEach(txt => { rowH = Math.max(rowH, doc.heightOfString(txt, { width: colW })); });
        let rowY = lastRowBot + 4;
        if (rowY + rowH > 770) { doc.addPage(); rowY = doc.y; }
        cells.forEach((txt, ci) => { doc.text(txt, cols[ci], rowY, { width: colW, align: 'center' }); });
        lastRowBot = rowY + rowH + 2;
        doc.moveTo(L, lastRowBot).lineTo(R, lastRowBot).stroke();
      });
      if (summary.medicationsAtDischarge.length) {
        for (let i = 1; i < colCount; i++) {
          doc.moveTo(cols[i], headY - 4).lineTo(cols[i], lastRowBot).stroke();
        }
        doc.moveTo(L, headY - 4).lineTo(L, lastRowBot).stroke();
        doc.moveTo(R, headY - 4).lineTo(R, lastRowBot).stroke();
      }
      doc.y = lastRowBot + 4;
      doc.strokeColor('#000').lineWidth(1);
    }

    if (summary.followUpAdvice) {
      sectionHeading(doc, 'Follow-up Advice:');
      doc.text(summary.followUpAdvice);
      doc.moveDown(0.3);
    }

    if (summary.dietAdvice) {
      sectionHeading(doc, 'Diet Advice:');
      doc.text(summary.dietAdvice);
      doc.moveDown(0.3);
    }

    if (summary.dischargeInstructions) {
      sectionHeading(doc, 'Discharge Instructions:');
      doc.text(summary.dischargeInstructions);
      doc.moveDown(0.3);
    }

    if (summary.referredTo) {
      sectionHeading(doc, 'Referred To:');
      doc.text(summary.referredTo);
      doc.moveDown(0.3);
    }

    doc.moveDown(1.5);
    const sigY = doc.y + 35;
    doc.fillColor('#000').font('Helvetica-Bold').text('Doctor Signature:', R - 110, sigY, { width: 110, align: 'right' });
    doc.fillColor('#000').font('Helvetica');

    if (hospital.footer) {
      doc.moveDown(0.5);
      doc.fontSize(8).text(hospital.footer, { align: 'center' });
    }

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
};

module.exports = {
  generateInvoicePDF,
  generateCaseSheetPDF,
  generateCollectionReportPDF,
  generateReturnsReportPDF,
  generateLabBillPDF,
  generatePharmacyBillPDF,
  generatePharmacyReturnPDF,
  generateGRNPDF,
  generateStockReportPDF,
  generateLabResultPDF,
  generatePatientQRPDF,
  generateIPBillPDF,
  generateIPCaseSheetPDF,
  generateDischargeSummaryPDF,
};
