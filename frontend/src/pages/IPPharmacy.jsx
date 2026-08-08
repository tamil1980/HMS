import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Table, Button, Select, Space, message, Typography, Tag, Tooltip, Popconfirm } from 'antd';
import { PlusOutlined, EyeOutlined, FilePdfOutlined, PrinterOutlined, DeleteOutlined } from '@ant-design/icons';
import { ipAPI, pharmacyAPI } from '../services/api';
import { downloadBlob, printPDF } from '../utils/pdf';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function IPPharmacy() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [admissions, setAdmissions] = useState([]);
  const [admission, setAdmission] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    ipAPI.getAdmissions({ limit: 100 }).then(res => setAdmissions(res.data.admissions)).catch(() => {});
    const qAdmission = params.get('admission');
    if (qAdmission) setAdmission(qAdmission);
  }, []);

  const fetchData = async (page = 1) => {
    if (!admission) { setData([]); return; }
    setLoading(true);
    try {
      const res = await pharmacyAPI.getBills({ admission, page, limit: pagination.pageSize });
      setData(res.data.bills);
      setPagination(prev => ({ ...prev, current: page, total: res.data.total }));
    } catch { message.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [admission]);

  const downloadPDF = async (rec) => {
    try {
      const res = await pharmacyAPI.getBillPDF(rec._id, true);
      downloadBlob(res, `PharmacyBill_${rec.billId}_${rec.patient?.name || 'Unknown'}.pdf`);
    } catch { message.error('Download failed'); }
  };

  const print = async (rec) => {
    try { const res = await pharmacyAPI.getBillPDF(rec._id); printPDF(res); }
    catch { message.error('Print failed'); }
  };

  const handleDelete = async (id) => {
    try { await pharmacyAPI.removeBill(id); message.success('Deleted, stock restored'); fetchData(); }
    catch { message.error('Delete failed'); }
  };

  const columns = [
    { title: 'S.No', key: 'sno', width: 55, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{((pagination.current - 1) * pagination.pageSize) + i + 1}</div> },
    { title: 'Bill No', dataIndex: 'billId', key: 'id' },
    { title: 'Patient', dataIndex: ['patient', 'name'], key: 'patient', render: (t) => t || '-' },
    { title: 'Date', dataIndex: 'billDate', key: 'date', render: (d) => dayjs(d).format('DD/MM/YYYY') },
    { title: 'Total', dataIndex: 'grandTotal', key: 'total', render: (t) => t || 0 },
    { title: 'Paid', dataIndex: 'amountPaid', key: 'paid', render: (t) => t || 0 },
    { title: 'Due', dataIndex: 'amountDue', key: 'due', render: (t) => t || 0 },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={s === 'Paid' ? 'green' : s === 'Partial' ? 'orange' : s === 'Unpaid' ? 'red' : 'default'}>{s}</Tag> },
    {
      title: 'Actions', key: 'actions', width: 160,
      render: (_, rec) => (
        <Space>
          <Tooltip title="View"><Button type="text" icon={<EyeOutlined />} onClick={() => navigate(`/pharmacy/bills/${rec._id}/edit`)} /></Tooltip>
          <Tooltip title="Print"><Button type="text" icon={<PrinterOutlined />} onClick={() => print(rec)} /></Tooltip>
          <Tooltip title="Download PDF"><Button type="text" icon={<FilePdfOutlined />} onClick={() => downloadPDF(rec)} /></Tooltip>
          <Popconfirm title="Delete? (stock restored)" onConfirm={() => handleDelete(rec._id)}>
            <Tooltip title="Delete"><Button type="text" danger icon={<DeleteOutlined />} /></Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card style={{ borderRadius: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Title level={4} style={{ margin: 0 }}>IP Pharmacy</Title>
        <Space>
          <Select value={admission} onChange={setAdmission} placeholder="Select admission..." style={{ width: 300 }} showSearch
            filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
            {admissions.map(a => <Select.Option key={a._id} value={a._id}>{a.admissionId} - {a.patient?.name} ({a.roomType || 'General'})</Select.Option>)}
          </Select>
          <Button type="primary" icon={<PlusOutlined />} disabled={!admission}
            onClick={() => navigate(`/pharmacy/bills/new?admission=${admission}`)}>New Pharmacy Bill</Button>
        </Space>
      </div>
      <Table dataSource={data} columns={columns} rowKey="_id" loading={loading}
        pagination={{ ...pagination, onChange: (page) => fetchData(page), showSizeChanger: false }}
        scroll={{ x: 800 }} />
    </Card>
  );
}
