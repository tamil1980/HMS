import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, Space, message, Tag, Typography, Row, Col, Statistic, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, WalletOutlined, AccountBookOutlined } from '@ant-design/icons';
import { paymentAPI, patientAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

const billTypes = ['OP', 'IP', 'Lab', 'Pharmacy', 'Radiology'];
const paymentModes = ['Cash', 'UPI', 'Debit Card', 'Credit Card', 'Insurance', 'Cheque'];

export default function Payments() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [summary, setSummary] = useState({ modeSummary: [], typeSummary: [], totalAmount: 0 });
  const [billTypeFilter, setBillTypeFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [patients, setPatients] = useState([]);
  const [form] = Form.useForm();

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: pagination.pageSize };
      if (billTypeFilter) params.billType = billTypeFilter;
      if (modeFilter) params.mode = modeFilter;
      const res = await paymentAPI.getPayments(params);
      setData(res.data.payments);
      setPagination(prev => ({ ...prev, current: page, total: res.data.total }));
      setSummary({ modeSummary: res.data.modeSummary, typeSummary: res.data.typeSummary, totalAmount: res.data.totalAmount });
    } catch { message.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    patientAPI.getAll({ limit: 50 }).then(res => setPatients(res.data.patients)).catch(() => {});
  }, [billTypeFilter, modeFilter]);

  const handleRecord = async (values) => {
    try {
      await paymentAPI.recordPayment(values);
      message.success('Payment recorded');
      setModalOpen(false);
      form.resetFields();
      fetchData(pagination.current);
    } catch (err) { message.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (rec) => {
    try {
      await paymentAPI.deletePayment(rec._id);
      message.success('Payment deleted');
      fetchData(pagination.current);
    } catch { message.error('Delete failed'); }
  };

  const columns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'sno', width: 55, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{((pagination.current - 1) * pagination.pageSize) + i + 1}</div> },
    { title: 'Receipt No', dataIndex: 'receiptId', render: (t) => <Tag color="gold"><AccountBookOutlined /> {t}</Tag> },
    { title: 'Patient', dataIndex: ['patient', 'name'], render: (t) => t || '-' },
    { title: 'Bill Type', dataIndex: 'billType', render: (t) => <Tag color="blue">{t}</Tag> },
    { title: 'Mode', dataIndex: 'mode', render: (t) => <Tag>{t}</Tag> },
    { title: 'Amount', dataIndex: 'amount', render: (t) => <strong>₹{t || 0}</strong> },
    { title: 'Reference', dataIndex: 'reference', render: (t) => t || '—' },
    { title: 'Date', dataIndex: 'paidAt', render: (d) => dayjs(d).format('DD/MM/YYYY HH:mm') },
    { title: 'Received By', dataIndex: 'receivedBy', render: (t) => t || '—' },
    {
      title: '', key: 'del', width: 50,
      render: (_, rec) => (
        <Popconfirm title="Delete payment record?" onConfirm={() => handleDelete(rec._id)}>
          <Button danger type="text" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <Card style={{ borderRadius: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Title level={4} style={{ margin: 0 }}>Payments & Receipts</Title>
        <Space>
          <Select value={billTypeFilter} onChange={setBillTypeFilter} allowClear placeholder="Bill type" style={{ width: 120 }}
            options={billTypes.map(b => ({ value: b, label: b }))} />
          <Select value={modeFilter} onChange={setModeFilter} allowClear placeholder="Mode" style={{ width: 130 }}
            options={paymentModes.map(m => ({ value: m, label: m }))} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Record Payment</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small"><Statistic title="Total Collected" value={summary.totalAmount} prefix="₹" valueStyle={{ color: '#16a34a' }} /></Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="By Mode" value={summary.modeSummary.reduce((s, m) => s + (m.amount || 0), 0)} prefix="₹" />
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small">
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {summary.modeSummary.map(m => (
                <div key={m._id}><Tag>{m._id}</Tag> ₹{m.amount || 0} ({m.count || 0})</div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      <Table dataSource={data} columns={columns} rowKey="_id" loading={loading}
        pagination={{ ...pagination, onChange: (page) => fetchData(page), showSizeChanger: false }}
        scroll={{ x: 1000 }} />

      <Modal title="Record Payment" open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }} footer={null} width={520}>
        <Form form={form} layout="vertical" onFinish={handleRecord}
          initialValues={{ mode: 'Cash', amount: 0, paidAt: dayjs() }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="patientId" label="Patient" rules={[{ required: true }]}>
                <Select showSearch placeholder="Search patient..."
                  filterOption={(input, option) => (option.children || '').toLowerCase().includes(input.toLowerCase())}>
                  {patients.map(p => <Option key={p._id} value={p._id}>{p.name} - {p.patientId}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="billType" label="Bill Type" rules={[{ required: true }]}>
                <Select options={billTypes.map(b => ({ value: b, label: b }))} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="billId" label="Bill ID (number)" rules={[{ required: true }]}
            tooltip="Enter the numeric bill id from the bill's URL or database">
            <InputNumber min={1} style={{ width: '100%' }} placeholder="e.g. 42" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
                <InputNumber min={1} prefix="₹" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="mode" label="Mode" rules={[{ required: true }]}>
                <Select options={paymentModes.map(m => ({ value: m, label: m }))} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="reference" label="Reference (Txn / Card / Cheque No)"><Input /></Form.Item>
          <Form.Item name="notes" label="Notes"><Input.TextArea rows={2} /></Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" icon={<WalletOutlined />}>Record</Button>
            <Button onClick={() => { setModalOpen(false); form.resetFields(); }}>Cancel</Button>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
}
