import { useState, useEffect } from 'react';
import { Card, Button, Table, Form, Input, Select, Modal, Space, message, Popconfirm, Tooltip, Tag, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { pharmacyAPI } from '../services/api';

const { Title } = Typography;

export default function Suppliers() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await pharmacyAPI.getSuppliers({});
      setData(res.data);
    } catch { message.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (values) => {
    try {
      if (editing) {
        await pharmacyAPI.updateSupplier(editing._id, values);
        message.success('Updated');
      } else {
        await pharmacyAPI.createSupplier(values);
        message.success('Created');
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      fetchData();
    } catch (err) { message.error(err.response?.data?.message || 'Failed'); }
  };

  const handleEdit = (record) => {
    setEditing(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await pharmacyAPI.removeSupplier(id);
      message.success('Deleted');
      fetchData();
    } catch { message.error('Delete failed'); }
  };

  const columns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'sno', width: 55, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{i + 1}</div> },
    { title: 'Supplier ID', dataIndex: 'supplierId', key: 'id', width: 100 },
    { title: 'Company', dataIndex: 'company', key: 'company', render: (c) => c || '-' },
    { title: 'Contact', dataIndex: 'name', key: 'name', width: 150 },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', render: (p) => p || '-' },
    { title: 'Email', dataIndex: 'email', key: 'email', render: (e) => e || '-' },
    { title: 'GST No', dataIndex: 'gstNumber', key: 'gst', render: (g) => g || '-' },
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Title level={4} style={{ margin: 0 }}>Suppliers</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>
          Add Supplier
        </Button>
      </div>
      <Table dataSource={data} columns={columns} rowKey="_id" loading={loading} scroll={{ x: 900 }} />

      <Modal title={editing ? 'Edit Supplier' : 'Add Supplier'} open={modalOpen} onCancel={() => { setModalOpen(false); setEditing(null); }} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ isActive: true }}>
          <Form.Item name="company" label="Company Name"><Input /></Form.Item>
          <Form.Item name="name" label="Contact Person" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="phone" label="Phone"><Input /></Form.Item>
          <Form.Item name="email" label="Email"><Input type="email" /></Form.Item>
          <Form.Item name="address" label="Address"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="gstNumber" label="GST Number"><Input /></Form.Item>
          <Form.Item name="isActive" label="Active">
            <Select options={[{ value: true, label: 'Active' }, { value: false, label: 'Inactive' }]} />
          </Form.Item>
          <Space><Button type="primary" htmlType="submit">{editing ? 'Update' : 'Create'}</Button></Space>
        </Form>
      </Modal>
    </Card>
  );
}
