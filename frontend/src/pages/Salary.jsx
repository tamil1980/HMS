import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, Space, message, Tag, Typography, Popconfirm, Row, Col, Statistic } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, ThunderboltOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { employeeAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function Salary() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [genOpen, setGenOpen] = useState(false);
  const [year, setYear] = useState(dayjs().year());
  const [month, setMonth] = useState(dayjs().month() + 1);
  const [statusFilter, setStatusFilter] = useState('');
  const [form] = Form.useForm();
  const [genForm] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { month, year };
      if (statusFilter) params.status = statusFilter;
      const res = await employeeAPI.getSalaries(params);
      setData(res.data);
    } catch { message.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [month, year, statusFilter]);

  const handleSave = async (values) => {
    try {
      const net = (values.basic || 0) + (values.allowance || 0) - (values.deduction || 0);
      await employeeAPI.updateSalary(editing._id, { ...values, netSalary: net });
      message.success('Salary updated');
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
      fetchData();
    } catch (err) { message.error(err.response?.data?.message || 'Failed'); }
  };

  const handleGenerate = async (values) => {
    try {
      const res = await employeeAPI.generateSalaries(values);
      message.success(res.data.message || 'Generated');
      setGenOpen(false);
      genForm.resetFields();
      fetchData();
    } catch (err) { message.error(err.response?.data?.message || 'Failed'); }
  };

  const markPaid = async (rec) => {
    try {
      await employeeAPI.updateSalary(rec._id, { status: 'Paid' });
      message.success('Marked as paid');
      fetchData();
    } catch { message.error('Failed'); }
  };

  const handleDelete = async (id) => {
    try {
      await employeeAPI.deleteSalary(id);
      message.success('Record deleted');
      fetchData();
    } catch { message.error('Delete failed'); }
  };

  const openModal = (rec) => {
    setEditing(rec);
    form.resetFields();
    form.setFieldsValue(rec);
    setModalOpen(true);
  };

  const totalNet = data.reduce((s, r) => s + (r.netSalary || 0), 0);
  const pendingCount = data.filter(r => r.status !== 'Paid').length;

  const columns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'sno', width: 55, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{i + 1}</div> },
    { title: 'Emp ID', dataIndex: ['employee', 'employeeId'], render: (t) => <Tag color="geekblue">{t || '-'}</Tag> },
    { title: 'Name', dataIndex: ['employee', 'name'], render: (t) => t || '-' },
    { title: 'Designation', dataIndex: ['employee', 'designation'], render: (t) => t || '-' },
    { title: 'Basic', dataIndex: 'basic', render: (t) => `₹${t || 0}` },
    { title: 'Allowance', dataIndex: 'allowance', render: (t) => `₹${t || 0}` },
    { title: 'Deduction', dataIndex: 'deduction', render: (t) => `-₹${t || 0}` },
    { title: 'Net', dataIndex: 'netSalary', render: (t) => <strong>₹{t || 0}</strong> },
    { title: 'Paid On', dataIndex: 'paidAt', render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '—' },
    { title: 'Status', dataIndex: 'status', render: (s) => <Tag color={s === 'Paid' ? 'green' : 'orange'}>{s}</Tag> },
    {
      title: 'Actions', key: 'actions', width: 140,
      render: (_, rec) => (
        <Space>
          {rec.status !== 'Paid' && (
            <Button type="text" icon={<CheckCircleOutlined />} onClick={() => markPaid(rec)} title="Mark Paid" />
          )}
          <Button type="text" icon={<EditOutlined />} onClick={() => openModal(rec)} />
          <Popconfirm title="Delete record?" onConfirm={() => handleDelete(rec._id)}>
            <Button danger type="text" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: dayjs().month(i).format('MMMM') }));

  return (
    <Card style={{ borderRadius: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Title level={4} style={{ margin: 0 }}>Salary Management</Title>
        <Space>
          <Select value={month} onChange={setMonth} options={monthOptions} style={{ width: 110 }} />
          <Select value={year} onChange={setYear} options={[dayjs().year() - 1, dayjs().year(), dayjs().year() + 1].map(y => ({ value: y, label: y }))} style={{ width: 90 }} />
          <Select value={statusFilter} onChange={setStatusFilter} allowClear placeholder="Status" style={{ width: 110 }}
            options={['Pending', 'Paid'].map(s => ({ value: s, label: s }))} />
          <Button icon={<ThunderboltOutlined />} onClick={() => setGenOpen(true)}>Generate</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}><Card size="small"><Statistic title="Total Payroll" value={totalNet} prefix="₹" valueStyle={{ color: '#2563eb' }} /></Card></Col>
        <Col span={8}><Card size="small"><Statistic title="Employees" value={data.length} /></Card></Col>
        <Col span={8}><Card size="small"><Statistic title="Pending" value={pendingCount} valueStyle={{ color: pendingCount > 0 ? '#dc2626' : '#16a34a' }} /></Card></Col>
      </Row>

      <Table dataSource={data} columns={columns} rowKey="_id" loading={loading} scroll={{ x: 1000 }} />

      <Modal title="Update Salary" open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); setEditing(null); }} footer={null}>
        {editing && (
          <p style={{ marginTop: 0 }}><strong>{editing.employee?.name}</strong> ({editing.employee?.designation})</p>
        )}
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="basic" label="Basic" rules={[{ required: true }]}>
                <InputNumber min={0} prefix="₹" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="allowance" label="Allowance">
                <InputNumber min={0} prefix="₹" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="deduction" label="Deduction">
                <InputNumber min={0} prefix="₹" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="status" label="Status">
            <Select options={['Pending', 'Paid'].map(s => ({ value: s, label: s }))} />
          </Form.Item>
          <Form.Item name="notes" label="Notes"><Input.TextArea rows={2} /></Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">Save</Button>
            <Button onClick={() => { setModalOpen(false); form.resetFields(); setEditing(null); }}>Cancel</Button>
          </Space>
        </Form>
      </Modal>

      <Modal title="Generate Salaries" open={genOpen}
        onCancel={() => { setGenOpen(false); genForm.resetFields(); }} footer={null}>
        <p style={{ color: '#888' }}>Generate salary rows for all active employees for the selected month.</p>
        <Form form={genForm} layout="vertical" onFinish={handleGenerate}
          initialValues={{ month, year }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="month" label="Month" rules={[{ required: true }]}>
                <Select options={monthOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="year" label="Year" rules={[{ required: true }]}>
                <Select options={[dayjs().year() - 1, dayjs().year(), dayjs().year() + 1].map(y => ({ value: y, label: y }))} />
              </Form.Item>
            </Col>
          </Row>
          <Button type="primary" htmlType="submit">Generate</Button>
        </Form>
      </Modal>
    </Card>
  );
}
