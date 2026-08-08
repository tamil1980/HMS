const computeBillTotals = ({ items, discount = 0, discountType = 'fixed', gstRate = 0 }) => {
  const subtotal = (items || []).reduce((sum, it) => sum + (it.amount || 0), 0);
  const discountAmount = discountType === 'percentage' ? subtotal * (Number(discount) / 100) : Number(discount);
  const taxable = Math.max(0, subtotal - discountAmount);
  const cgst = taxable * (Number(gstRate) / 2) / 100;
  const sgst = taxable * (Number(gstRate) / 2) / 100;
  const tax = cgst + sgst;
  const grandTotal = Math.round((taxable + tax) * 100) / 100;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(discountAmount * 100) / 100,
    taxable: Math.round(taxable * 100) / 100,
    cgst: Math.round(cgst * 100) / 100,
    sgst: Math.round(sgst * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    grandTotal,
  };
};

const buildBillStatus = (grandTotal, amountPaid) => {
  const paid = Number(amountPaid) || 0;
  if (paid >= grandTotal) return 'Paid';
  if (paid > 0) return 'Partial';
  return 'Unpaid';
};

const dateRange = (fromDate, toDate) => {
  const range = {};
  if (fromDate) range.gte = new Date(`${fromDate}T00:00:00.000Z`);
  if (toDate) range.lte = new Date(`${toDate}T23:59:59.999Z`);
  return range;
};

module.exports = { computeBillTotals, buildBillStatus, dateRange };
