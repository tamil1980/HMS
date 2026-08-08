export const downloadBlob = (res, filename) => {
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const printPDF = (res) => {
  const blob = new Blob([res.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const w = window.open('', '_blank');
  if (w) {
    w.document.write(`<embed src="${url}" type="application/pdf" width="100%" height="100%" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none">`);
    w.document.close();
  }
};
