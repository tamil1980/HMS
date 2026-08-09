import axios from 'axios';

export const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? 'https://hms-lijr.onrender.com/api' : '/api');

export const BACKEND_ORIGIN = API_URL.replace(/\/api$/, '');

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  getUsers: () => api.get('/auth/users'),
  createStaff: (data) => api.post('/auth/staff', data),
  updateUser: (id, data) => api.put(`/auth/users/${id}`, data),
  deleteUser: (id) => api.delete(`/auth/users/${id}`),
};

export const patientAPI = {
  getAll: (params) => api.get('/patients', { params }),
  getById: (id) => api.get(`/patients/${id}`),
  getQRPDF: (id, download) => api.get(`/patients/${id}/qr`, { params: { download: download ? '1' : undefined }, responseType: 'blob' }),
  create: (data) => api.post('/patients', data),
  update: (id, data) => api.put(`/patients/${id}`, data),
  remove: (id) => api.delete(`/patients/${id}`),
};

export const consultantAPI = {
  getAll: (params) => api.get('/consultants', { params }),
  getById: (id) => api.get(`/consultants/${id}`),
  create: (data) => api.post('/consultants', data),
  update: (id, data) => api.put(`/consultants/${id}`, data),
  remove: (id) => api.delete(`/consultants/${id}`),
};

export const appointmentAPI = {
  getAll: (params) => api.get('/appointments', { params }),
  getToday: () => api.get('/appointments/today'),
  getByPatient: (id) => api.get(`/appointments/patient/${id}`),
  getById: (id) => api.get(`/appointments/${id}`),
  create: (data) => api.post('/appointments', data),
  update: (id, data) => api.put(`/appointments/${id}`, data),
  remove: (id) => api.delete(`/appointments/${id}`),
};

export const caseSheetAPI = {
  getAll: (params) => api.get('/case-sheets', { params }),
  getByPatient: (id) => api.get(`/case-sheets/patient/${id}`),
  getById: (id) => api.get(`/case-sheets/${id}`),
  getPDF: (id, download) => api.get(`/case-sheets/${id}/pdf`, { params: { download: download ? '1' : undefined }, responseType: 'blob' }),
  create: (data) => api.post('/case-sheets', data),
  update: (id, data) => api.put(`/case-sheets/${id}`, data),
  remove: (id) => api.delete(`/case-sheets/${id}`),
};

export const invoiceAPI = {
  getAll: (params) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  getPDF: (id, download) => api.get(`/invoices/${id}/pdf`, { params: { download: download ? '1' : undefined }, responseType: 'blob' }),
  create: (data) => api.post('/invoices', data),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  addPayment: (id, data) => api.put(`/invoices/${id}/payment`, data),
  remove: (id) => api.delete(`/invoices/${id}`),
  collectionReport: (params) => api.get('/invoices/collection-report', { params }),
  collectionReportFile: (params) => api.get('/invoices/collection-report', { params, responseType: 'blob' }),
};

export const masterAPI = {
  getAll: (params) => api.get('/masters', { params }),
  getById: (id) => api.get(`/masters/${id}`),
  create: (data) => api.post('/masters', data),
  update: (id, data) => api.put(`/masters/${id}`, data),
  remove: (id) => api.delete(`/masters/${id}`),
  importExcel: (data) => api.post('/masters/import-excel', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

export const settingAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
  uploadLogo: (data) => api.post('/settings/upload-logo', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

export const reminderAPI = {
  getStatus: () => api.get('/reminders/status'),
  connect: () => api.post('/reminders/connect'),
  disconnect: () => api.post('/reminders/disconnect'),
  runNow: () => api.post('/reminders/run'),
  sendTest: (data) => api.post('/reminders/send-test', data),
};

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

export const labAPI = {
  getTests: (params) => api.get('/lab/tests', { params }),
  getTestById: (id) => api.get(`/lab/tests/${id}`),
  createTest: (data) => api.post('/lab/tests', data),
  updateTest: (id, data) => api.put(`/lab/tests/${id}`, data),
  removeTest: (id) => api.delete(`/lab/tests/${id}`),
  exportTestsExcel: (params) => api.get('/lab/tests', { params: { ...params, format: 'excel' }, responseType: 'blob' }),
  importTestsExcel: (data) => api.post('/lab/tests/import-excel', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getBills: (params) => api.get('/lab/bills', { params }),
  getBillById: (id) => api.get(`/lab/bills/${id}`),
  getBillPDF: (id, download) => api.get(`/lab/bills/${id}/pdf`, { params: { download: download ? '1' : undefined }, responseType: 'blob' }),
  createBill: (data) => api.post('/lab/bills', data),
  updateBill: (id, data) => api.put(`/lab/bills/${id}`, data),
  addPayment: (id, data) => api.put(`/lab/bills/${id}/payment`, data),
  removeBill: (id) => api.delete(`/lab/bills/${id}`),
  collectionReport: (params) => api.get('/lab/bills/collection-report', { params }),
  collectionReportFile: (params) => api.get('/lab/bills/collection-report', { params, responseType: 'blob' }),
  getResults: (params) => api.get('/lab/results', { params }),
  getResultById: (id) => api.get(`/lab/results/${id}`),
  getResultPDF: (id, download) => api.get(`/lab/results/${id}/pdf`, { params: { download: download ? '1' : undefined }, responseType: 'blob' }),
  createResult: (data) => api.post('/lab/results', data),
  updateResult: (id, data) => api.put(`/lab/results/${id}`, data),
  removeResult: (id) => api.delete(`/lab/results/${id}`),
};

export const pharmacyAPI = {
  getMedicines: (params) => api.get('/pharmacy/medicines', { params }),
  getMedicineById: (id) => api.get(`/pharmacy/medicines/${id}`),
  createMedicine: (data) => api.post('/pharmacy/medicines', data),
  updateMedicine: (id, data) => api.put(`/pharmacy/medicines/${id}`, data),
  adjustStock: (id, data) => api.put(`/pharmacy/medicines/${id}/stock`, data),
  removeMedicine: (id) => api.delete(`/pharmacy/medicines/${id}`),
  importMedicinesExcel: (data) => api.post('/pharmacy/medicines/import-excel', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  exportMedicinesExcel: (params) => api.get('/pharmacy/medicines', { params: { ...params, format: 'excel' }, responseType: 'blob' }),
  getSuppliers: (params) => api.get('/pharmacy/suppliers', { params }),
  createSupplier: (data) => api.post('/pharmacy/suppliers', data),
  updateSupplier: (id, data) => api.put(`/pharmacy/suppliers/${id}`, data),
  removeSupplier: (id) => api.delete(`/pharmacy/suppliers/${id}`),
  getGRNs: (params) => api.get('/pharmacy/grns', { params }),
  getGRNById: (id) => api.get(`/pharmacy/grns/${id}`),
  getGRNPDF: (id, download) => api.get(`/pharmacy/grns/${id}/pdf`, { params: { download: download ? '1' : undefined }, responseType: 'blob' }),
  createGRN: (data) => api.post('/pharmacy/grns', data),
  updateGRN: (id, data) => api.put(`/pharmacy/grns/${id}`, data),
  removeGRN: (id) => api.delete(`/pharmacy/grns/${id}`),
  importGRNExcel: (data) => api.post('/pharmacy/grns/import-excel', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getGRNTemplate: () => api.get('/pharmacy/grns/template', { responseType: 'blob' }),
  getBills: (params) => api.get('/pharmacy/bills', { params }),
  getBillById: (id) => api.get(`/pharmacy/bills/${id}`),
  getBillPDF: (id, download) => api.get(`/pharmacy/bills/${id}/pdf`, { params: { download: download ? '1' : undefined }, responseType: 'blob' }),
  createBill: (data) => api.post('/pharmacy/bills', data),
  updateBill: (id, data) => api.put(`/pharmacy/bills/${id}`, data),
  addPayment: (id, data) => api.put(`/pharmacy/bills/${id}/payment`, data),
  removeBill: (id) => api.delete(`/pharmacy/bills/${id}`),
  collectionReport: (params) => api.get('/pharmacy/bills/collection-report', { params }),
  collectionReportFile: (params) => api.get('/pharmacy/bills/collection-report', { params, responseType: 'blob' }),
  getReturns: (params) => api.get('/pharmacy/returns', { params }),
  getReturnById: (id) => api.get(`/pharmacy/returns/${id}`),
  getReturnPDF: (id, download) => api.get(`/pharmacy/returns/${id}/pdf`, { params: { download: download ? '1' : undefined }, responseType: 'blob' }),
  createReturn: (data) => api.post('/pharmacy/returns', data),
  removeReturn: (id) => api.delete(`/pharmacy/returns/${id}`),
  returnsReport: (params) => api.get('/pharmacy/returns/report', { params }),
  returnsReportFile: (params) => api.get('/pharmacy/returns/report', { params, responseType: 'blob' }),
  stockReport: (params) => api.get('/pharmacy/stock-report', { params }),
  stockReportFile: (params) => api.get('/pharmacy/stock-report', { params, responseType: 'blob' }),
};

export const ipAPI = {
  getAdmissions: (params) => api.get('/ip/admissions', { params }),
  getAdmissionById: (id) => api.get(`/ip/admissions/${id}`),
  createAdmission: (data) => api.post('/ip/admissions', data),
  updateAdmission: (id, data) => api.put(`/ip/admissions/${id}`, data),
  dischargeAdmission: (id, data) => api.post(`/ip/admissions/${id}/discharge`, data),
  allocateBed: (id, data) => api.post(`/ip/admissions/${id}/allocate-bed`, data),
  transferBed: (id, data) => api.post(`/ip/admissions/${id}/transfer-bed`, data),
  releaseBed: (id) => api.post(`/ip/admissions/${id}/release-bed`),
  removeAdmission: (id) => api.delete(`/ip/admissions/${id}`),
  getComponents: (params) => api.get('/ip/components', { params }),
  createComponent: (data) => api.post('/ip/components', data),
  updateComponent: (id, data) => api.put(`/ip/components/${id}`, data),
  removeComponent: (id) => api.delete(`/ip/components/${id}`),
  getBills: (params) => api.get('/ip/bills', { params }),
  getBillById: (id) => api.get(`/ip/bills/${id}`),
  getBillPDF: (id, download) => api.get(`/ip/bills/${id}/pdf`, { params: { download: download ? '1' : undefined }, responseType: 'blob' }),
  createBill: (data) => api.post('/ip/bills', data),
  updateBill: (id, data) => api.put(`/ip/bills/${id}`, data),
  addPayment: (id, data) => api.put(`/ip/bills/${id}/payment`, data),
  removeBill: (id) => api.delete(`/ip/bills/${id}`),
  getMonitoring: (params) => api.get('/ip/monitoring', { params }),
  createMonitoring: (data) => api.post('/ip/monitoring', data),
  updateMonitoring: (id, data) => api.put(`/ip/monitoring/${id}`, data),
  removeMonitoring: (id) => api.delete(`/ip/monitoring/${id}`),
  getCaseSheets: (params) => api.get('/ip/case-sheets', { params }),
  getCaseSheetById: (id) => api.get(`/ip/case-sheets/${id}`),
  getCaseSheetPDF: (id, download) => api.get(`/ip/case-sheets/${id}/pdf`, { params: { download: download ? '1' : undefined }, responseType: 'blob' }),
  createCaseSheet: (data) => api.post('/ip/case-sheets', data),
  updateCaseSheet: (id, data) => api.put(`/ip/case-sheets/${id}`, data),
  removeCaseSheet: (id) => api.delete(`/ip/case-sheets/${id}`),
  getDischargeSummaries: (params) => api.get('/ip/discharge', { params }),
  getDischargeByAdmission: (id) => api.get(`/ip/discharge/admission/${id}`),
  getDischargeById: (id) => api.get(`/ip/discharge/${id}`),
  getDischargePDF: (id, download) => api.get(`/ip/discharge/${id}/pdf`, { params: { download: download ? '1' : undefined }, responseType: 'blob' }),
  createDischarge: (data) => api.post('/ip/discharge', data),
  updateDischarge: (id, data) => api.put(`/ip/discharge/${id}`, data),
  removeDischarge: (id) => api.delete(`/ip/discharge/${id}`),
};

// ---- Module 18: Employees, Attendance, Salary ----
export const employeeAPI = {
  getEmployees: (params) => api.get('/employees', { params }),
  getEmployee: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  remove: (id) => api.delete(`/employees/${id}`),
  getAttendance: (params) => api.get('/employees/attendance', { params }),
  markAttendance: (data) => api.post('/employees/attendance', data),
  markBulkAttendance: (data) => api.post('/employees/attendance/bulk', data),
  deleteAttendance: (id) => api.delete(`/employees/attendance/${id}`),
  getSalaries: (params) => api.get('/employees/salaries', { params }),
  generateSalaries: (data) => api.post('/employees/salaries/generate', data),
  updateSalary: (id, data) => api.put(`/employees/salaries/${id}`, data),
  deleteSalary: (id) => api.delete(`/employees/salaries/${id}`),
};

// ---- Module 9: Nurses ----
export const nurseAPI = {
  getNurses: (params) => api.get('/nurses', { params }),
  getNurse: (id) => api.get(`/nurses/${id}`),
  create: (data) => api.post('/nurses', data),
  update: (id, data) => api.put(`/nurses/${id}`, data),
  remove: (id) => api.delete(`/nurses/${id}`),
  getDuties: (params) => api.get('/nurses/duties', { params }),
  setDuty: (data) => api.post('/nurses/duties', data),
  removeDuty: (data) => api.delete('/nurses/duties', { data }),
};

// ---- Module 8: Doctor leaves ----
export const leaveAPI = {
  getLeaves: (params) => api.get('/leaves', { params }),
  create: (data) => api.post('/leaves', data),
  update: (id, data) => api.put(`/leaves/${id}`, data),
  remove: (id) => api.delete(`/leaves/${id}`),
  checkAvailability: (params) => api.get('/leaves/availability', { params }),
};

// ---- Module 10: Ward / Room / Bed ----
export const wardAPI = {
  getWards: () => api.get('/wards'),
  getAllWards: () => api.get('/wards/all'),
  availability: () => api.get('/wards/availability'),
  createWard: (data) => api.post('/wards', data),
  updateWard: (id, data) => api.put(`/wards/${id}`, data),
  deleteWard: (id) => api.delete(`/wards/${id}`),
  createRoom: (data) => api.post('/wards/rooms', data),
  updateRoom: (id, data) => api.put(`/wards/rooms/${id}`, data),
  deleteRoom: (id) => api.delete(`/wards/rooms/${id}`),
  createBed: (data) => api.post('/wards/beds', data),
  createBedsBulk: (data) => api.post('/wards/beds/bulk', data),
  updateBed: (id, data) => api.put(`/wards/beds/${id}`, data),
  deleteBed: (id) => api.delete(`/wards/beds/${id}`),
};

// ---- Module 13: Radiology ----
export const radiologyAPI = {
  getTests: (params) => api.get('/radiology/tests', { params }),
  createTest: (data) => api.post('/radiology/tests', data),
  updateTest: (id, data) => api.put(`/radiology/tests/${id}`, data),
  removeTest: (id) => api.delete(`/radiology/tests/${id}`),
  getBills: (params) => api.get('/radiology/bills', { params }),
  getBillById: (id) => api.get(`/radiology/bills/${id}`),
  createBill: (data) => api.post('/radiology/bills', data),
  updateBill: (id, data) => api.put(`/radiology/bills/${id}`, data),
  addPayment: (id, data) => api.put(`/radiology/bills/${id}/payment`, data),
  removeBill: (id) => api.delete(`/radiology/bills/${id}`),
  getReports: (params) => api.get('/radiology/reports', { params }),
  getReportById: (id) => api.get(`/radiology/reports/${id}`),
  createReport: (data) => api.post('/radiology/reports', data),
  updateReport: (id, data) => api.put(`/radiology/reports/${id}`, data),
  removeReport: (id) => api.delete(`/radiology/reports/${id}`),
};

// ---- Module 16: Insurance ----
export const insuranceAPI = {
  getCompanies: (params) => api.get('/insurance/companies', { params }),
  createCompany: (data) => api.post('/insurance/companies', data),
  updateCompany: (id, data) => api.put(`/insurance/companies/${id}`, data),
  deleteCompany: (id) => api.delete(`/insurance/companies/${id}`),
  getClaims: (params) => api.get('/insurance/claims', { params }),
  createClaim: (data) => api.post('/insurance/claims', data),
  updateClaim: (id, data) => api.put(`/insurance/claims/${id}`, data),
  deleteClaim: (id) => api.delete(`/insurance/claims/${id}`),
};

// ---- Module 15: Payments ----
export const paymentAPI = {
  getPayments: (params) => api.get('/payments', { params }),
  recordPayment: (data) => api.post('/payments', data),
  deletePayment: (id) => api.delete(`/payments/${id}`),
};

// ---- Module 19: Reports ----
export const reportAPI = {
  daily: (params) => api.get('/reports/daily', { params }),
  monthly: (params) => api.get('/reports/monthly', { params }),
  yearly: (params) => api.get('/reports/yearly', { params }),
};

export default api;
