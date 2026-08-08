import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Space, Card, message, Typography, Tag, Select, Tooltip, Modal, Form, InputNumber, Input } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, DollarOutlined, FileDoneOutlined } from '@ant-design/icons';
import { radiologyAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function RadiologyBills() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [payModal, setPayModal] = useState(null);
  const [payForm] = Form.useForm();
  const navigate = useNavigate();

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: pagination.pageSize };
      if (statusFilter) params.status = statusFilter;
      const res = await radiologyAPI.getBills(params);
      setData(res.data.bills);
      setPagination(prev => ({ ...prev, current: page, total: res.data.total }));
    } catch { message.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [statusFilter]);

  const handlePayment = async (values) => {
    try {
      await radiologyAPI.addPayment(payModal._id, values);
      message.success('Payment recorded');
      setPayModal(null);
      payForm.resetFields();
      fetchData(pagination.current);
    } catch (err) { message.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (rec) => {
    try {
      await radiologyAPI.removeBill(rec._id);
      message.success('Bill deleted');
      fetchData(pagination.current);
    } catch (err) { message.error(err.response?.data?.message || 'Delete failed'); }
  };

  const statusColors = { Paid: 'green', Partial: 'orange', Unpaid: 'red', Cancelled: 'default' };

  const columns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'sno', width: 55, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{((pagination.current - 1) * pagination.pageSize) + i + 1}</div> },
    { title: 'Bill No', dataIndex: 'billId', key: 'id' },
    { title: 'Patient', dataIndex: ['patient', 'name'], key: 'patient', render: (t) => t || '-' },
    { title: 'Date', dataIndex: 'billDate', key: 'date', render: (d) => dayjs(d).format('DD/MM/YYYY') },
    { title: 'Total', dataIndex: 'grandTotal', key: 'total', render: (t) => `₹${t || 0}` },
    { title: 'Paid', dataIndex: 'amountPaid', key: 'paid', render: (t) => `₹${t || 0}` },
    { title: 'Due', dataIndex: 'amountDue', key: 'due', render: (t) => <span style={{ color: t > 0 ? '#dc2626' : '#16a34a' }}>₹{t || 0}</span> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={statusColors[s]}>{s}</Tag> },
    {
      title: 'Actions', key: 'actions', width: 150,
      render: (_, rec) => (
        <Space>
          <Tooltip title="Edit"><Button type="text" icon={<EditOutlined />} onClick={() => navigate(`/radiology/bills/${rec._id}/edit`)} /></Tooltip>
          {rec.amountDue > 0 && (
            <Tooltip title="Receive Payment"><Button type="text" icon={<DollarOutlined />} onClick={() => setPayModal(rec)} /></Tooltip>
          )}
          <Tooltip title="Report"><Button type="text" icon={<FileDoneOutlined />} onClick={() => navigate(`/radiology/reports?bill=${rec._id}`)} /></Tooltip>
          <Tooltip title="Delete"><Button danger type="text" icon={<DeleteOutlined />} onClick={() => handleDelete(rec)} /></Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Card style={{ borderRadius: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Title level={4} style={{ margin: 0 }}>Radiology Bills</Title>
        <Space>
          <Select value={statusFilter} onChange={setStatusFilter} allowClear placeholder="Filter status" style={{ width: 130 }}
            options={['Paid', 'Partial', 'Unpaid', 'Cancelled'].map(s => ({ value: s, label: s }))} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/radiology/bills/new')}>New Bill</Button>
        </Space>
      </div>
      <Table dataSource={data} columns={columns} rowKey="_id" loading={loading}
        pagination={{ ...pagination, onChange: (page) => fetchData(page), showSizeChanger: false }}
        scroll={{ x: 900 }} />

      <Modal title={`Receive Payment - ${payModal?.billId || ''}`} open={!!payModal} onCancel={() => setPayModal(null)} footer={null}>
        {payModal && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ margin: 0 }}>Patient: <strong>{payModal.patient?.name}</strong></p>
            <p style={{ margin: 0 }}>Grand Total: <strong>₹{payModal.grandTotal}</strong> | Due: <strong style={{ color: '#dc2626' }}>₹{payModal.amountDue}</strong></p>
          </div>
        )}
        <Form form={payForm} layout="vertical" onFinish={handlePayment}
          initialValues={{ mode: 'Cash', amount: payModal?.amountDue || 0 }}>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
            <InputNumber min={1} max={payModal?.amountDue} prefix="₹" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="mode" label="Mode" rules={[{ required: true }]}>
            <Select options={['Cash', 'UPI', 'Debit Card', 'Credit Card', 'Insurance'].map(m => ({ value: m, label: m }))} />
          </Form.Item>
          <Form.Item name="reference" label="Reference (Txn / Card / Claim No)">
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit">Record Payment</Button>
        </Form>
      </Modal>
    </Card>
  );
}
