import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Space, Card, message, Typography, Tag, Select, Tooltip, Popconfirm } from 'antd';
import { PlusOutlined, EyeOutlined, FilePdfOutlined, PrinterOutlined, DeleteOutlined, UndoOutlined } from '@ant-design/icons';
import { pharmacyAPI } from '../services/api';
import { downloadBlob, printPDF } from '../utils/pdf';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function PharmacyBills() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: pagination.pageSize };
      if (statusFilter) params.status = statusFilter;
      const res = await pharmacyAPI.getBills(params);
      setData(res.data.bills);
      setPagination(prev => ({ ...prev, current: page, total: res.data.total }));
    } catch { message.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [statusFilter]);

  const downloadPDF = async (rec) => {
    try {
      const res = await pharmacyAPI.getBillPDF(rec._id, true);
      downloadBlob(res, `PharmacyBill_${rec.billId}_${rec.patient?.name || 'Unknown'}.pdf`);
    } catch { message.error('Download failed'); }
  };

  const print = async (rec) => {
    try {
      const res = await pharmacyAPI.getBillPDF(rec._id);
      printPDF(res);
    } catch { message.error('Print failed'); }
  };

  const handleDelete = async (id) => {
    try {
      await pharmacyAPI.removeBill(id);
      message.success('Deleted and stock restored');
      fetchData();
    } catch { message.error('Delete failed'); }
  };

  const statusColors = { Paid: 'green', Partial: 'orange', Unpaid: 'red', Cancelled: 'default' };

  const columns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'sno', width: 55, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{((pagination.current - 1) * pagination.pageSize) + i + 1}</div> },
    { title: 'Bill No', dataIndex: 'billId', key: 'id' },
    { title: 'Patient', dataIndex: ['patient', 'name'], key: 'patient', render: (t) => t || '-' },
    { title: 'Doctor', dataIndex: ['doctor', 'name'], key: 'doctor', render: (t) => t || '-' },
    { title: 'Date', dataIndex: 'billDate', key: 'date', render: (d) => dayjs(d).format('DD/MM/YYYY') },
    { title: 'Total', dataIndex: 'grandTotal', key: 'total', render: (t) => t || 0 },
    { title: 'Paid', dataIndex: 'amountPaid', key: 'paid', render: (t) => t || 0 },
    { title: 'Due', dataIndex: 'amountDue', key: 'due', render: (t) => t || 0 },
    { title: 'Payment Mode', dataIndex: 'paymentMode', key: 'pmode', render: (t) => t || '-' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={statusColors[s]}>{s}</Tag> },
    {
      title: 'Actions', key: 'actions', width: 230,
      render: (_, rec) => (
        <Space>
          <Tooltip title="View"><Button type="text" icon={<EyeOutlined />} onClick={() => navigate(`/pharmacy/bills/${rec._id}/edit`)} /></Tooltip>
          <Tooltip title="Return"><Button type="text" icon={<UndoOutlined />} style={{ color: '#DC2626' }} onClick={() => navigate(`/pharmacy/returns/new?bill=${rec._id}`)} /></Tooltip>
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
        <Title level={4} style={{ margin: 0 }}>Pharmacy Bills</Title>
        <Space>
          <Select value={statusFilter} onChange={setStatusFilter} allowClear placeholder="Filter status" style={{ width: 130 }}
            options={['Paid', 'Partial', 'Unpaid', 'Cancelled'].map(s => ({ value: s, label: s }))} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/pharmacy/bills/new')}>New Bill</Button>
        </Space>
      </div>
      <Table dataSource={data} columns={columns} rowKey="_id" loading={loading}
        pagination={{ ...pagination, onChange: (page) => fetchData(page), showSizeChanger: false }}
        scroll={{ x: 800 }} />
    </Card>
  );
}
