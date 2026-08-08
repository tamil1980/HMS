import { useState, useEffect } from 'react';
import { Card, Button, Table, Form, Input, InputNumber, Select, Modal, Space, message, Popconfirm, Tooltip, Tag, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { ipAPI } from '../services/api';

const { Title } = Typography;

const categories = ['Room', 'Doctor', 'Nursing', 'Procedure', 'Consumable', 'Lab', 'Other'];

export default function IPBillComponents() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await ipAPI.getComponents({});

      setData(res.data);
    } catch { message.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (values) => {
    try {
      if (editing) { await ipAPI.updateComponent(editing._id, values); message.success('Updated'); }
      else { await ipAPI.createComponent(values); message.success('Created'); }
      setModalOpen(false); setEditing(null); form.resetFields(); fetchData();
    } catch (err) { message.error(err.response?.data?.message || 'Failed'); }
  };

  const handleEdit = (record) => {
    setEditing(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    try { await ipAPI.removeComponent(id); message.success('Deleted'); fetchData(); }
    catch { message.error('Delete failed'); }
  };

  const columns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'sno', width: 55, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{i + 1}</div> },
    { title: 'Code', dataIndex: 'code', key: 'code', width: 90, render: (c) => c || '-' },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Category', dataIndex: 'category', key: 'category', render: (c) => <Tag>{c}</Tag> },
    { title: 'Rate', dataIndex: 'rate', key: 'rate', width: 100, render: (r) => `₹${r || 0}` },
    { title: 'GST', dataIndex: 'gstRate', key: 'gst', width: 70, render: (g) => (g ? `${g}%` : '-') },
    { title: 'Unit', dataIndex: 'unit', key: 'unit', width: 80, render: (u) => u || 'day' },
    { title: 'Status', dataIndex: 'isActive', key: 'status', width: 90, render: (a) => <Tag color={a ? 'green' : 'red'}>{a ? 'Active' : 'Inactive'}</Tag> },
    {
      title: 'Actions', width: 90,
      render: (_, rec) => (
        <Space>
          <Tooltip title="Edit"><Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(rec)} /></Tooltip>
          <Popconfirm title="Delete?" onConfirm={() => handleDelete(rec._id)}>
            <Tooltip title="Delete"><Button type="text" danger icon={<DeleteOutlined />} /></Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card style={{ borderRadius: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>IP Billing Components</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>Add Component</Button>
      </div>
      <Table dataSource={data} columns={columns} rowKey="_id" loading={loading} scroll={{ x: 800 }} />

      <Modal title={editing ? 'Edit Component' : 'Add Component'} open={modalOpen} onCancel={() => { setModalOpen(false); setEditing(null); }} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ category: 'Room', rate: 0, gstRate: 0, unit: 'day', isActive: true }}>
          <Form.Item name="name" label="Component Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="code" label="Code"><Input /></Form.Item>
          <Form.Item name="category" label="Category">
            <Select options={categories.map(c => ({ value: c, label: c }))} />
          </Form.Item>
          <Form.Item name="rate" label="Rate (₹)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="gstRate" label="GST Rate (%)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="unit" label="Unit"><Input placeholder="day / visit / item" /></Form.Item>
          <Form.Item name="isActive" label="Active">
            <Select options={[{ value: true, label: 'Active' }, { value: false, label: 'Inactive' }]} />
          </Form.Item>
          <Space><Button type="primary" htmlType="submit">{editing ? 'Update' : 'Create'}</Button></Space>
        </Form>
      </Modal>
    </Card>
  );
}
