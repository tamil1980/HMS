import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Consultants from './pages/Consultants';
import ConsultantForm from './pages/ConsultantForm';
import Appointments from './pages/Appointments';
import AppointmentForm from './pages/AppointmentForm';
import CaseSheets from './pages/CaseSheets';
import CaseSheetForm from './pages/CaseSheetForm';
import Invoices from './pages/Invoices';
import InvoiceForm from './pages/InvoiceForm';
import CollectionReport from './pages/CollectionReport';
import Masters from './pages/Masters';
import Settings from './pages/Settings';
import Users from './pages/Users';
import LabTests from './pages/LabTests';
import LabBills from './pages/LabBills';
import LabBillForm from './pages/LabBillForm';
import LabResults from './pages/LabResults';
import LabResultForm from './pages/LabResultForm';
import LabCollectionReport from './pages/LabCollectionReport';
import PharmacyMedicines from './pages/PharmacyMedicines';
import Suppliers from './pages/Suppliers';
import GRNs from './pages/GRNs';
import GRNForm from './pages/GRNForm';
import PharmacyBills from './pages/PharmacyBills';
import PharmacyBillForm from './pages/PharmacyBillForm';
import PharmacyCollectionReport from './pages/PharmacyCollectionReport';
import PharmacyReturns from './pages/PharmacyReturns';
import PharmacyReturnForm from './pages/PharmacyReturnForm';
import PharmacyReturnsReport from './pages/PharmacyReturnsReport';
import StockReport from './pages/StockReport';
import IPAdmissions from './pages/IPAdmissions';
import IPAdmissionForm from './pages/IPAdmissionForm';
import IPAdmissionDetail from './pages/IPAdmissionDetail';
import IPBillComponents from './pages/IPBillComponents';
import IPBills from './pages/IPBills';
import IPBillForm from './pages/IPBillForm';
import IPMonitoring from './pages/IPMonitoring';
import IPCaseSheets from './pages/IPCaseSheets';
import IPCaseSheetForm from './pages/IPCaseSheetForm';
import IPDischargeSummary from './pages/IPDischargeSummary';
import IPPharmacy from './pages/IPPharmacy';
import OPRegistration from './pages/OPRegistration';
import PatientEdit from './pages/PatientEdit';
import PatientSearch from './pages/PatientSearch';
import PatientHistory from './pages/PatientHistory';
import Leaves from './pages/Leaves';
import Nurses from './pages/Nurses';
import NurseDuty from './pages/NurseDuty';
import Wards from './pages/Wards';
import WardAvailability from './pages/WardAvailability';
import RadiologyTests from './pages/RadiologyTests';
import RadiologyBills from './pages/RadiologyBills';
import RadiologyBillForm from './pages/RadiologyBillForm';
import RadiologyReports from './pages/RadiologyReports';
import InsuranceCompanies from './pages/InsuranceCompanies';
import InsuranceClaims from './pages/InsuranceClaims';
import Payments from './pages/Payments';
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import Salary from './pages/Salary';
import Reports from './pages/Reports';

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="consultants" element={<Consultants />} />
        <Route path="consultants/new" element={<ConsultantForm />} />
        <Route path="consultants/:id/edit" element={<ConsultantForm />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="appointments/new" element={<AppointmentForm />} />
        <Route path="appointments/:id/edit" element={<AppointmentForm />} />
        <Route path="case-sheets" element={<CaseSheets />} />
        <Route path="case-sheets/new" element={<CaseSheetForm />} />
        <Route path="case-sheets/:id/edit" element={<CaseSheetForm />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="invoices/new" element={<InvoiceForm />} />
        <Route path="invoices/:id/edit" element={<InvoiceForm />} />
        <Route path="collection-report" element={<CollectionReport />} />
        <Route path="masters" element={<Masters />} />
        <Route path="settings" element={<Settings />} />
        <Route path="users" element={<Users />} />
        <Route path="lab/tests" element={<LabTests />} />
        <Route path="lab/bills" element={<LabBills />} />
        <Route path="lab/bills/new" element={<LabBillForm />} />
        <Route path="lab/bills/:id/edit" element={<LabBillForm />} />
        <Route path="lab/results" element={<LabResults />} />
        <Route path="lab/results/new" element={<LabResultForm />} />
        <Route path="lab/results/:id/edit" element={<LabResultForm />} />
        <Route path="lab/collection-report" element={<LabCollectionReport />} />
        <Route path="pharmacy/medicines" element={<PharmacyMedicines />} />
        <Route path="pharmacy/suppliers" element={<Suppliers />} />
        <Route path="pharmacy/grns" element={<GRNs />} />
        <Route path="pharmacy/grns/new" element={<GRNForm />} />
        <Route path="pharmacy/grns/:id/edit" element={<GRNForm />} />
        <Route path="pharmacy/bills" element={<PharmacyBills />} />
        <Route path="pharmacy/bills/new" element={<PharmacyBillForm />} />
        <Route path="pharmacy/bills/:id/edit" element={<PharmacyBillForm />} />
        <Route path="pharmacy/collection-report" element={<PharmacyCollectionReport />} />
        <Route path="pharmacy/returns" element={<PharmacyReturns />} />
        <Route path="pharmacy/returns/new" element={<PharmacyReturnForm />} />
        <Route path="pharmacy/returns/report" element={<PharmacyReturnsReport />} />
        <Route path="pharmacy/stock-report" element={<StockReport />} />
        <Route path="ip/admissions" element={<IPAdmissions />} />
        <Route path="ip/admissions/new" element={<IPAdmissionForm />} />
        <Route path="ip/admissions/:id" element={<IPAdmissionDetail />} />
        <Route path="ip/admissions/:id/edit" element={<IPAdmissionForm />} />
        <Route path="ip/components" element={<IPBillComponents />} />
        <Route path="ip/bills" element={<IPBills />} />
        <Route path="ip/bills/new" element={<IPBillForm />} />
        <Route path="ip/bills/:id/edit" element={<IPBillForm />} />
        <Route path="ip/monitoring" element={<IPMonitoring />} />
        <Route path="ip/case-sheets" element={<IPCaseSheets />} />
        <Route path="ip/case-sheets/new" element={<IPCaseSheetForm />} />
        <Route path="ip/case-sheets/:id/edit" element={<IPCaseSheetForm />} />
        <Route path="ip/discharge" element={<IPDischargeSummary />} />
        <Route path="ip/pharmacy" element={<IPPharmacy />} />
        <Route path="op-registration" element={<OPRegistration />} />
        <Route path="op-patient/edit" element={<PatientEdit />} />
        <Route path="op-patient/search" element={<PatientSearch />} />
        <Route path="op-patient/history" element={<PatientHistory />} />
        <Route path="leaves" element={<Leaves />} />
        <Route path="nurses" element={<Nurses />} />
        <Route path="nurses/duty" element={<NurseDuty />} />
        <Route path="wards" element={<Wards />} />
        <Route path="wards/availability" element={<WardAvailability />} />
        <Route path="radiology/tests" element={<RadiologyTests />} />
        <Route path="radiology/bills" element={<RadiologyBills />} />
        <Route path="radiology/bills/new" element={<RadiologyBillForm />} />
        <Route path="radiology/bills/:id/edit" element={<RadiologyBillForm />} />
        <Route path="radiology/reports" element={<RadiologyReports />} />
        <Route path="insurance/companies" element={<InsuranceCompanies />} />
        <Route path="insurance/claims" element={<InsuranceClaims />} />
        <Route path="payments" element={<Payments />} />
        <Route path="employees" element={<Employees />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="salaries" element={<Salary />} />
        <Route path="reports" element={<Reports />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
