import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Table, Tabs, Input, Button, Space, Tag, Typography, Row, Col, Statistic, Spin, Empty, message } from 'antd';
import { SearchOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import {
  patientAPI, appointmentAPI, caseSheetAPI, invoiceAPI,
  labAPI, pharmacyAPI, radiologyAPI, ipAPI, paymentAPI, insuranceAPI,
} from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;

const statusColors = { Paid: 'green', Partial: 'orange', Unpaid: 'red', Completed: 'green', Discharged: 'blue', Admitted: 'red' };

export default function PatientHistory() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const patientId = searchParams.get('patient');

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [data, setData] = useState(null);

  const [list, setList] = useState([]);
  const [listLoading, setListLoading] = useState(false);

  useEffect(() => {
    if (!patientId) { setPatient(null); setData(null); return; }
    const load = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const p = await patientAPI.getById(patientId);
        setPatient(p.data);
      } catch { setNotFound(true); setPatient(null); setData(null); setLoading(false); return; }
      try {
        const [appts, sheets, invoices, labBills, labResults, pharmaBills, radBills, admissions, payments, claims] = await Promise.allSettled([
          appointmentAPI.getByPatient(patientId),
          caseSheetAPI.getByPatient(patientId),
          invoiceAPI.getAll({ patient: patientId, limit: 100 }),
          labAPI.getBills({ patient: patientId, limit: 100 }),
          labAPI.getResults({ patient: patientId, limit: 100 }),
          pharmacyAPI.getBills({ patient: patientId, limit: 100 }),
          radiologyAPI.getBills({ patient: patientId, limit: 100 }),
          ipAPI.getAdmissions({ patient: patientId, limit: 100 }),
          paymentAPI.getPayments({ patient: patientId, limit: 100 }),
          insuranceAPI.getClaims({ patient: patientId }),
        ]);
        setData({
          appointments: appts.status === 'fulfilled' ? (appts.value.data || []) : [],
          caseSheets: sheets.status === 'fulfilled' ? (sheets.value.data || []) : [],
          invoices: invoices.status === 'fulfilled' ? (invoices.value.data.invoices || []) : [],
          labBills: labBills.status === 'fulfilled' ? (labBills.value.data.bills || []) : [],
          labResults: labResults.status === 'fulfilled' ? (labResults.value.data.results || []) : [],
          pharmacyBills: pharmaBills.status === 'fulfilled' ? (pharmaBills.value.data.bills || []) : [],
          radiologyBills: radBills.status === 'fulfilled' ? (radBills.value.data.bills || []) : [],
          admissions: admissions.status === 'fulfilled' ? (admissions.value.data.admissions || []) : [],
          payments: payments.status === 'fulfilled' ? (payments.value.data.payments || []) : [],
          claims: claims.status === 'fulfilled' ? (claims.value.data || []) : [],
        });
      } catch { message.error('Failed to load history'); }
      finally { setLoading(false); }
    };
    load();
  }, [patientId]);

  const searchPatients = async (term) => {
    setListLoading(true);
    try {
      const res = await patientAPI.getAll({ search: term, limit: 10 });
      setList(res.data.patients);
    } catch { setList([]); }
    finally { setListLoading(false); }
  };

  if (!patientId) {
    return (
      <Card style={{ borderRadius: 10, maxWidth: 820, margin: '0 auto' }}>
        <Title level={4}>Patient History</Title>
        <Input.Search
          size="large"
          placeholder="Search patient by name / phone / id"
          prefix={<SearchOutlined />}
          onSearch={searchPatients}
          onChange={(e) => { if (!e.target.value) setList([]); }}
        />
        <Table
          style={{ marginTop: 16 }}
          size="small"
          dataSource={list}
          loading={listLoading}
          rowKey="_id"
          pagination={false}
          columns={[
            { title: 'Patient ID', dataIndex: 'patientId', render: (t) => <Tag color="geekblue">{t || '—'}</Tag> },
            { title: 'Name', dataIndex: 'name', render: (t) => <strong>{t}</strong> },
            { title: 'Phone', dataIndex: 'phone' },
            { title: 'Age', dataIndex: 'age' },
            { title: 'Gender', dataIndex: 'gender' },
            {
              title: '', key: 'view', width: 90,
              render: (_, rec) => (
                <Button type="link" onClick={() => navigate(`/op-patient/history?patient=${rec._id}`)}>View History</Button>
              ),
            },
          ]}
          locale={{ emptyText: <Empty description="Search to find a patient" /> }}
        />
      </Card>
    );
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;

  if (notFound || !patient) {
    return (
      <Card style={{ borderRadius: 10 }}>
        <Empty description="Patient not found">
          <Button type="primary" onClick={() => navigate('/op-patient/history')}>Search Another Patient</Button>
        </Empty>
      </Card>
    );
  }

  const totalBilled = (data?.invoices || []).reduce((s, x) => s + (x.grandTotal || 0), 0)
    + (data?.labBills || []).reduce((s, x) => s + (x.grandTotal || 0), 0)
    + (data?.pharmacyBills || []).reduce((s, x) => s + (x.grandTotal || 0), 0)
    + (data?.radiologyBills || []).reduce((s, x) => s + (x.grandTotal || 0), 0);
  const totalPaid = (data?.payments || []).reduce((s, x) => s + (x.amount || 0), 0);

  const billColumns = [
    { title: 'Bill No', dataIndex: 'invoiceId', render: (t) => t || '-' },
    { title: 'Date', dataIndex: 'invoiceDate', render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
    { title: 'Total', dataIndex: 'grandTotal', render: (t) => `₹${t || 0}` },
    { title: 'Paid', dataIndex: 'amountPaid', render: (t) => `₹${t || 0}` },
    { title: 'Due', dataIndex: 'amountDue', render: (t) => <span style={{ color: t > 0 ? '#dc2626' : '#16a34a' }}>₹{t || 0}</span> },
    { title: 'Status', dataIndex: 'status', render: (s) => <Tag color={statusColors[s]}>{s}</Tag> },
  ];

  const itemBillColumns = [
    { title: 'Bill No', dataIndex: 'billId', render: (t) => t || '-' },
    { title: 'Date', dataIndex: 'billDate', render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
    { title: 'Total', dataIndex: 'grandTotal', render: (t) => `₹${t || 0}` },
    { title: 'Paid', dataIndex: 'amountPaid', render: (t) => `₹${t || 0}` },
    { title: 'Due', dataIndex: 'amountDue', render: (t) => <span style={{ color: t > 0 ? '#dc2626' : '#16a34a' }}>₹{t || 0}</span> },
    { title: 'Status', dataIndex: 'status', render: (s) => <Tag color={statusColors[s]}>{s}</Tag> },
  ];

  const tabs = [
    {
      key: 'appointments', label: `Appointments (${data?.appointments.length || 0})`,
      children: (
        <Table size="small" rowKey="_id" dataSource={data?.appointments || []} pagination={false}
          columns={[
            { title: 'Date', dataIndex: 'appointmentDate', render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
            { title: 'Time', dataIndex: 'appointmentTime' },
            { title: 'Doctor', dataIndex: ['consultant', 'name'], render: (t) => t || '-' },
            { title: 'Type', dataIndex: 'type' },
            { title: 'Status', dataIndex: 'status', render: (s) => <Tag color={statusColors[s]}>{s}</Tag> },
          ]} />
      ),
    },
    {
      key: 'cases', label: `Consultations (${data?.caseSheets.length || 0})`,
      children: (
        <Table size="small" rowKey="_id" dataSource={data?.caseSheets || []} pagination={false}
          columns={[
            { title: 'Date', dataIndex: 'date', render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
            { title: 'Doctor', dataIndex: ['consultant', 'name'], render: (t) => t || '-' },
            { title: 'Diagnosis', dataIndex: 'diagnosis', render: (t) => t || '—' },
            { title: 'Prescription', dataIndex: 'prescriptions', render: (t) => Array.isArray(t) ? `${t.length} item(s)` : (t || '—') },
          ]} />
      ),
    },
    {
      key: 'op', label: `OP Bills (${data?.invoices.length || 0})`,
      children: <Table size="small" rowKey="_id" dataSource={data?.invoices || []} pagination={false} columns={billColumns} />,
    },
    {
      key: 'lab', label: `Lab (${(data?.labBills.length || 0) + (data?.labResults.length || 0)})`,
      children: (
        <>
          <Title level={5}>Lab Bills</Title>
          <Table size="small" rowKey="_id" dataSource={data?.labBills || []} pagination={false} columns={itemBillColumns} />
          <Title level={5} style={{ marginTop: 16 }}>Lab Results</Title>
          <Table size="small" rowKey="_id" dataSource={data?.labResults || []} pagination={false}
            columns={[
              { title: 'Date', dataIndex: 'resultDate', render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
              { title: 'Test', dataIndex: 'testName', render: (t) => t || '-' },
              { title: 'Result', dataIndex: 'result', render: (t) => t || '—' },
              { title: 'Status', dataIndex: 'status', render: (s) => <Tag color={statusColors[s]}>{s}</Tag> },
            ]} />
        </>
      ),
    },
    {
      key: 'pharmacy', label: `Pharmacy (${data?.pharmacyBills.length || 0})`,
      children: <Table size="small" rowKey="_id" dataSource={data?.pharmacyBills || []} pagination={false} columns={itemBillColumns} />,
    },
    {
      key: 'radiology', label: `Radiology (${data?.radiologyBills.length || 0})`,
      children: <Table size="small" rowKey="_id" dataSource={data?.radiologyBills || []} pagination={false} columns={itemBillColumns} />,
    },
    {
      key: 'ip', label: `IP Admissions (${data?.admissions.length || 0})`,
      children: (
        <Table size="small" rowKey="_id" dataSource={data?.admissions || []} pagination={false}
          columns={[
            { title: 'Admission No', dataIndex: 'admissionNo', render: (t) => <Tag color="red">{t || '-'}</Tag> },
            { title: 'Admitted', dataIndex: 'admissionDate', render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
            { title: 'Room', dataIndex: 'roomType', render: (t) => t || '—' },
            { title: 'Doctor', dataIndex: ['consultant', 'name'], render: (t) => t || '-' },
            { title: 'Status', dataIndex: 'status', render: (s) => <Tag color={statusColors[s]}>{s}</Tag> },
          ]} />
      ),
    },
    {
      key: 'payments', label: `Payments (${data?.payments.length || 0})`,
      children: (
        <Table size="small" rowKey="_id" dataSource={data?.payments || []} pagination={false}
          columns={[
            { title: 'Receipt', dataIndex: 'receiptId', render: (t) => <Tag color="gold">{t}</Tag> },
            { title: 'Date', dataIndex: 'paidAt', render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
            { title: 'Type', dataIndex: 'billType', render: (t) => <Tag>{t}</Tag> },
            { title: 'Mode', dataIndex: 'mode' },
            { title: 'Amount', dataIndex: 'amount', render: (t) => <strong>₹{t || 0}</strong> },
          ]} />
      ),
    },
    {
      key: 'claims', label: `Insurance Claims (${data?.claims.length || 0})`,
      children: (
        <Table size="small" rowKey="_id" dataSource={data?.claims || []} pagination={false}
          columns={[
            { title: 'Claim', dataIndex: 'claimId', render: (t) => <Tag color="purple">{t}</Tag> },
            { title: 'Company', dataIndex: ['company', 'name'], render: (t) => t || '-' },
            { title: 'Amount', dataIndex: 'claimAmount', render: (t) => `₹${t || 0}` },
            { title: 'Approved', dataIndex: 'approvedAmount', render: (t) => t ? `₹${t}` : '—' },
            { title: 'Status', dataIndex: 'status', render: (s) => <Tag color={statusColors[s] || 'blue'}>{s}</Tag> },
          ]} />
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Patient History</Title>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/op-patient/history')}>Search Another</Button>
      </div>

      <Card style={{ borderRadius: 10, marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 4 }} size="small">
          <Descriptions.Item label="Patient ID">{patient.patientId || '—'}</Descriptions.Item>
          <Descriptions.Item label="Name">{patient.name}</Descriptions.Item>
          <Descriptions.Item label="Phone">{patient.phone}</Descriptions.Item>
          <Descriptions.Item label="Age / Gender">{patient.age} yrs • {patient.gender}</Descriptions.Item>
          <Descriptions.Item label="Blood Group">{patient.bloodGroup || '—'}</Descriptions.Item>
          <Descriptions.Item label="Email">{patient.email || '—'}</Descriptions.Item>
          <Descriptions.Item label="Address" span={2}>{patient.address || '—'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={4}><Card size="small"><Statistic title="Visits" value={data?.appointments.length || 0} /></Card></Col>
        <Col xs={12} md={5}><Card size="small"><Statistic title="Admissions" value={data?.admissions.length || 0} valueStyle={{ color: '#dc2626' }} /></Card></Col>
        <Col xs={12} md={5}><Card size="small"><Statistic title="Total Billed" value={totalBilled} prefix="₹" /></Card></Col>
        <Col xs={12} md={5}><Card size="small"><Statistic title="Total Paid" value={totalPaid} prefix="₹" valueStyle={{ color: '#16a34a' }} /></Card></Col>
        <Col xs={12} md={5}><Card size="small"><Statistic title="Open Claims" value={data?.claims.filter((c) => c.status !== 'Settled').length || 0} valueStyle={{ color: '#d97706' }} /></Card></Col>
      </Row>

      <Card style={{ borderRadius: 10 }}>
        <Tabs items={tabs} />
      </Card>
    </div>
  );
}
