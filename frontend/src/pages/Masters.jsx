import { useState, useEffect } from 'react';
import { Card, Tabs, Button, Table, Form, Input, InputNumber, Select, DatePicker, Modal, Space, message, Popconfirm, Tooltip, Tag, Typography, Upload } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { masterAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;

const masterTypes = ['Department', 'Service', 'Medicine', 'Investigation', 'Category', 'PaymentMode', 'Other'];

export default function Masters() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeType, setActiveType] = useState('Service');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await masterAPI.getAll({ type: activeType });
      setData(res.data);
    } catch { message.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [activeType]);

  const handleSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        type: activeType,
        expiryDate: values.expiryDate ? values.expiryDate.toISOString() : undefined,
      };
      if (editing) {
        await masterAPI.update(editing._id, payload);
        message.success('Updated');
      } else {
        await masterAPI.create(payload);
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
    form.setFieldsValue({ ...record, expiryDate: record.expiryDate ? dayjs(record.expiryDate) : undefined });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await masterAPI.remove(id);
      message.success('Deleted');
      fetchData();
    } catch { message.error('Delete failed'); }
  };

  const handleExcelUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      await masterAPI.importExcel(formData);
      message.success('Imported successfully');
      fetchData();
    } catch (err) { message.error(err.response?.data?.message || 'Import failed'); }
    return false;
  };

  const columns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'sno', width: 55, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{i + 1}</div> },
    { title: 'Code', dataIndex: 'code', key: 'code', width: 100 },
    { title: 'Name', dataIndex: 'name', key: 'name', width: 180 },
    { title: 'Description', dataIndex: 'description', key: 'description', width: 200, ellipsis: true },
    ...(activeType === 'Medicine' ? [
      { title: 'Qty', dataIndex: 'quantity', key: 'quantity', width: 80, render: (q) => q ?? '-' },
      { title: 'Expiry', dataIndex: 'expiryDate', key: 'expiry', width: 110, render: (d) => {
        if (!d) return '-';
        const expired = dayjs(d).isBefore(dayjs(), 'day');
        return <span style={{ color: expired ? '#ef4444' : 'inherit', fontWeight: expired ? 600 : 'normal' }}>{dayjs(d).format('DD/MM/YYYY')}{expired && ' (Expired)'}</span>;
      } },
    ] : []),
    { title: 'Price', dataIndex: 'price', key: 'price', width: 100, render: (p) => p ? `Rs ${p}` : '-' },
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
        <Title level={4} style={{ margin: 0 }}>Master Details</Title>
        <Space>
          {activeType === 'Medicine' && (
            <Upload beforeUpload={handleExcelUpload} showUploadList={false} accept=".xlsx,.xls">
              <Button icon={<UploadOutlined />}>Upload Excel</Button>
            </Upload>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>
            Add {activeType}
          </Button>
        </Space>
      </div>

      <Tabs activeKey={activeType} onChange={setActiveType} items={masterTypes.map(t => ({ key: t, label: t }))} />

      <Table dataSource={data} columns={columns} rowKey="_id" loading={loading} scroll={{ x: 800 }} />

      <Modal title={editing ? 'Edit' : 'Add'} open={modalOpen} onCancel={() => { setModalOpen(false); setEditing(null); }} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ isActive: true, quantity: 0 }}>
          <Form.Item name="code" label="Code"><Input /></Form.Item>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="Description"><Input.TextArea rows={2} /></Form.Item>
          {activeType === 'Medicine' && (
            <>
              <Form.Item name="quantity" label="Quantity"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="expiryDate" label="Expiry Date"><DatePicker style={{ width: '100%' }} /></Form.Item>
            </>
          )}
          <Form.Item name="price" label="Price"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="isActive" label="Active" valuePropName="checked">
            <Select options={[{ value: true, label: 'Active' }, { value: false, label: 'Inactive' }]} />
          </Form.Item>
          <Space><Button type="primary" htmlType="submit">{editing ? 'Update' : 'Create'}</Button></Space>
        </Form>
      </Modal>
    </Card>
  );
}
