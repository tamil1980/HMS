import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, DatePicker, Space, message, Tag, Typography, Popconfirm, Row, Col, Switch } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, TeamOutlined } from '@ant-design/icons';
import { employeeAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

const departments = ['Administration', 'Front Desk', 'Nursing', 'Pharmacy', 'Laboratory', 'Radiology', 'Housekeeping', 'Accounts', 'IT Support', 'Security'];

export default function Employees() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await employeeAPI.getEmployees();
      setData(res.data);
    } catch { message.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (values) => {
    try {
      if (values.joinDate) values.joinDate = values.joinDate.toISOString();
      if (editing) { await employeeAPI.update(editing._id, values); message.success('Employee updated'); }
      else { await employeeAPI.create(values); message.success('Employee added'); }
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
      fetchData();
    } catch (err) { message.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    try {
      await employeeAPI.remove(id);
      message.success('Employee deleted');
      fetchData();
    } catch { message.error('Delete failed'); }
  };

  const openModal = (rec) => {
    setEditing(rec || null);
    form.resetFields();
    if (rec) form.setFieldsValue({ ...rec, joinDate: rec.joinDate ? dayjs(rec.joinDate) : undefined });
    setModalOpen(true);
  };

  const columns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'sno', width: 55, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{i + 1}</div> },
    { title: 'Emp ID', dataIndex: 'employeeId', render: (t) => <Tag color="geekblue">{t}</Tag> },
    { title: 'Name', dataIndex: 'name', render: (t) => <><TeamOutlined /> {t}</> },
    { title: 'Designation', dataIndex: 'designation' },
    { title: 'Department', dataIndex: 'department', render: (t) => t ? <Tag>{t}</Tag> : '—' },
    { title: 'Phone', dataIndex: 'phone', render: (t) => t || '—' },
    { title: 'Salary', dataIndex: 'salary', render: (t) => `₹${t || 0}` },
    { title: 'Joining', dataIndex: 'joinDate', render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '—' },
    {
      title: 'Active', dataIndex: 'isActive',
      render: (v, rec) => (
        <Switch checked={v !== false} onChange={async (c) => {
          try { await employeeAPI.update(rec._id, { isActive: c }); fetchData(); } catch { message.error('Failed'); }
        }} />
      ),
    },
    {
      title: 'Actions', key: 'actions', width: 100,
      render: (_, rec) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => openModal(rec)} />
          <Popconfirm title="Delete employee?" onConfirm={() => handleDelete(rec._id)}>
            <Button danger type="text" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card style={{ borderRadius: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Employees</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal(null)}>Add Employee</Button>
      </div>
      <Table dataSource={data} columns={columns} rowKey="_id" loading={loading} scroll={{ x: 1000 }} />

      <Modal title={editing ? 'Edit Employee' : 'Add Employee'} open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); setEditing(null); }}
        footer={null} width={640}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="name" label="Full Name" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="designation" label="Designation" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="department" label="Department">
                <Select options={departments.map(d => ({ value: d, label: d }))} allowClear />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="gender" label="Gender">
                <Select options={['Male', 'Female', 'Other'].map(g => ({ value: g, label: g }))} allowClear />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="phone" label="Phone" rules={[{ pattern: /^[0-9+\-\s]{10,15}$/, message: 'Invalid phone' }]}><Input /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Invalid email' }]}><Input /></Form.Item>
            </Col>
          </Row>
          <Form.Item name="address" label="Address"><Input.TextArea rows={2} /></Form.Item>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="salary" label="Monthly Salary"><InputNumber min={0} prefix="₹" style={{ width: '100%' }} /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="joinDate" label="Joining Date"><DatePicker style={{ width: '100%' }} /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="employeeId" label="Emp ID (auto if blank)"><Input /></Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="bankName" label="Bank Name"><Input /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="accountNumber" label="Account No"><Input /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="ifscCode" label="IFSC Code"><Input /></Form.Item>
            </Col>
          </Row>
          <Space>
            <Button type="primary" htmlType="submit">Save</Button>
            <Button onClick={() => { setModalOpen(false); form.resetFields(); setEditing(null); }}>Cancel</Button>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
}
