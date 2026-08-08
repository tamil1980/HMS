import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Space, Card, message, Typography, Tag, Select, Tooltip, Popconfirm, Modal, Descriptions } from 'antd';
import { PlusOutlined, EyeOutlined, DeleteOutlined, FilePdfOutlined, PrinterOutlined } from '@ant-design/icons';
import { pharmacyAPI } from '../services/api';
import { downloadBlob, printPDF } from '../utils/pdf';
import dayjs from 'dayjs';

const { Title } = Typography;

const reasonColors = { Damage: 'red', Expired: 'orange', 'Not Required': 'blue', Other: 'default' };

export default function PharmacyReturns() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [viewItem, setViewItem] = useState(null);
  const navigate = useNavigate();

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: pagination.pageSize };
      if (statusFilter) params.status = statusFilter;
      const res = await pharmacyAPI.getReturns(params);
      setData(res.data.returns);
      setPagination(prev => ({ ...prev, current: page, total: res.data.total }));
    } catch { message.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [statusFilter]);

  const handleDelete = async (id) => {
    try {
      await pharmacyAPI.removeReturn(id);
      message.success('Deleted and stock adjusted');
      fetchData();
    } catch { message.error('Delete failed'); }
  };

  const downloadPDF = async (rec) => {
    try {
      const res = await pharmacyAPI.getReturnPDF(rec._id, true);
      downloadBlob(res, `PharmacyReturn_${rec.returnId}_${rec.patient?.name || 'Unknown'}.pdf`);
    } catch { message.error('Download failed'); }
  };

  const print = async (rec) => {
    try {
      const res = await pharmacyAPI.getReturnPDF(rec._id);
      printPDF(res);
    } catch { message.error('Print failed'); }
  };

  const itemCount = (r) => (r.items || []).reduce((s, it) => s + (Number(it.quantity) || 0), 0);

  const columns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'sno', width: 55, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{((pagination.current - 1) * pagination.pageSize) + i + 1}</div> },
    { title: 'Return No', dataIndex: 'returnId', key: 'id' },
    { title: 'Bill No', key: 'bill', render: (_, r) => r.bill?.billId || '-' },
    { title: 'Patient', dataIndex: ['patient', 'name'], key: 'patient', render: (t) => t || '-' },
    { title: 'Date', dataIndex: 'returnDate', key: 'date', render: (d) => dayjs(d).format('DD/MM/YYYY') },
    { title: 'Reason', dataIndex: 'reason', key: 'reason', render: (t) => <Tag color={reasonColors[t] || 'default'}>{t || 'Other'}</Tag> },
    { title: 'Qty', key: 'qty', render: (_, r) => itemCount(r) },
    { title: 'Return Amount', dataIndex: 'totalAmount', key: 'amount', render: (t) => (t || 0) },
    { title: 'Refund', dataIndex: 'refunded', key: 'refund', render: (t, r) => t ? <Tag color="green">{r.refundMode || 'Refunded'}</Tag> : <Tag>Not Refunded</Tag> },
    {
      title: 'Actions', key: 'actions', width: 130,
      render: (_, rec) => (
        <Space>
          <Tooltip title="View"><Button type="text" icon={<EyeOutlined />} onClick={() => setViewItem(rec)} /></Tooltip>
          <Tooltip title="Print"><Button type="text" icon={<PrinterOutlined />} onClick={() => print(rec)} /></Tooltip>
          <Tooltip title="Download PDF"><Button type="text" icon={<FilePdfOutlined />} onClick={() => downloadPDF(rec)} /></Tooltip>
          <Popconfirm title="Delete? (stock adjusted)" onConfirm={() => handleDelete(rec._id)}>
            <Tooltip title="Delete"><Button type="text" danger icon={<DeleteOutlined />} /></Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const itemColumns = [
    { title: 'S.No', key: 'idx', width: 45, render: (_, __, i) => i + 1 },
    { title: 'Medicine', dataIndex: 'name', key: 'name' },
    { title: 'Qty', dataIndex: 'quantity', key: 'qty', width: 80 },
    { title: 'Rate', dataIndex: 'salePrice', key: 'rate', width: 100, render: (t) => `₹${(t || 0).toFixed(2)}` },
    { title: 'GST', dataIndex: 'gstRate', key: 'gst', width: 70, render: (t) => (t ? `${t}%` : '-') },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', width: 100, render: (t) => `₹${(t || 0).toFixed(2)}` },
  ];

  return (
    <Card style={{ borderRadius: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Title level={4} style={{ margin: 0 }}>Pharmacy Sales Returns</Title>
        <Space>
          <Select value={statusFilter} onChange={setStatusFilter} allowClear placeholder="Filter refund" style={{ width: 140 }}
            options={[{ value: 'refunded', label: 'Refunded' }, { value: 'not-refunded', label: 'Not Refunded' }]} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/pharmacy/returns/new')}>New Return</Button>
        </Space>
      </div>
      <Table dataSource={data} columns={columns} rowKey="_id" loading={loading}
        pagination={{ ...pagination, onChange: (page) => fetchData(page), showSizeChanger: false }}
        scroll={{ x: 1000 }} />

      <Modal title={`Return ${viewItem?.returnId || ''}`} open={!!viewItem} onCancel={() => setViewItem(null)} footer={null} width={680}>
        {viewItem && (
          <>
            <Descriptions size="small" column={2} style={{ marginBottom: 12 }}>
              <Descriptions.Item label="Bill No">{viewItem.bill?.billId || '-'}</Descriptions.Item>
              <Descriptions.Item label="Patient">{viewItem.patient?.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Date">{dayjs(viewItem.returnDate).format('DD/MM/YYYY')}</Descriptions.Item>
              <Descriptions.Item label="Reason">{viewItem.reason}</Descriptions.Item>
              <Descriptions.Item label="Return Amount">₹{(viewItem.totalAmount || 0).toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="Refund">{viewItem.refunded ? (viewItem.refundMode || 'Refunded') : 'Not Refunded'}</Descriptions.Item>
              {viewItem.notes && <Descriptions.Item label="Notes" span={2}>{viewItem.notes}</Descriptions.Item>}
            </Descriptions>
            <Table dataSource={viewItem.items || []} columns={itemColumns} rowKey={(_, i) => i} pagination={false} size="small" bordered />
          </>
        )}
      </Modal>
    </Card>
  );
}
