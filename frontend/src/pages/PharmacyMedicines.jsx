import { useState, useEffect } from 'react';
import { Card, Button, Table, Form, Input, InputNumber, Select, DatePicker, Modal, Space, message, Popconfirm, Tooltip, Tag, Typography, Upload } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, MinusOutlined, PlusSquareOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { pharmacyAPI } from '../services/api';
import { downloadBlob } from '../utils/pdf';
import dayjs from 'dayjs';

const { Title } = Typography;

const gstRates = [0, 2, 5, 12, 18];

export default function PharmacyMedicines() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [stockModal, setStockModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [stockForm] = Form.useForm();
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await pharmacyAPI.getMedicines({});
      setData(res.data);
    } catch { message.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleExcelUpload = async (file) => {
    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await pharmacyAPI.importMedicinesExcel(formData);
      message.success(res.data.message || 'Imported');
      fetchData();
    } catch (err) { message.error(err.response?.data?.message || 'Import failed'); }
    finally { setImporting(false); }
    return false;
  };

  const handleTemplate = async () => {
    try {
      const res = await pharmacyAPI.exportMedicinesExcel({});
      downloadBlob(res, 'Medicines_Template.xlsx');
    } catch { message.error('Download failed'); }
  };

  const handleSubmit = async (values) => {
    try {
      const payload = { ...values, expiryDate: values.expiryDate ? values.expiryDate.toISOString() : undefined };
      if (editing) {
        await pharmacyAPI.updateMedicine(editing._id, payload);
        message.success('Updated');
      } else {
        await pharmacyAPI.createMedicine(payload);
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
      await pharmacyAPI.removeMedicine(id);
      message.success('Deleted');
      fetchData();
    } catch { message.error('Delete failed'); }
  };

  const openStock = (record) => {
    setEditing(record);
    stockForm.setFieldsValue({ medicineId: record.medicineId, current: record.quantity, adjustment: 0 });
    setStockModal(true);
  };

  const adjustStock = async (values) => {
    try {
      await pharmacyAPI.adjustStock(editing._id, { quantity: Number(values.adjustment) });
      message.success('Stock adjusted');
      setStockModal(false);
      fetchData();
    } catch { message.error('Adjust failed'); }
  };

  const columns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'sno', width: 50, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{i + 1}</div> },
    { title: 'Code', dataIndex: 'medicineId', key: 'code', width: 90 },
    { title: 'Name', dataIndex: 'name', key: 'name', width: 180 },
    { title: 'Category', dataIndex: 'category', key: 'category', width: 100, render: (c) => c || '-' },
    { title: 'P.Price', dataIndex: 'purchasePrice', key: 'pp', width: 90, render: (p) => `₹${p || 0}` },
    { title: 'S.Price', dataIndex: 'salePrice', key: 'sp', width: 90, render: (p) => `₹${p || 0}` },
    { title: 'GST', dataIndex: 'gstRate', key: 'gst', width: 70, render: (g) => (g ? `${g}%` : '-') },
    {
      title: 'Qty', dataIndex: 'quantity', key: 'qty', width: 100,
      render: (q, rec) => {
        const low = q <= (rec.reorderLevel || 0);
        return <span style={{ color: low ? '#DC2626' : '#059669', fontWeight: 600 }}>{q} {low && <Tag color="red" style={{ marginLeft: 4 }}>Low</Tag>}</span>;
      },
    },
    { title: 'Reorder', dataIndex: 'reorderLevel', key: 'reorder', width: 80, render: (r) => r || 0 },
    { title: 'Expiry', dataIndex: 'expiryDate', key: 'expiry', width: 100, render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
    { title: 'Status', dataIndex: 'isActive', key: 'status', width: 85, render: (a) => <Tag color={a ? 'green' : 'red'}>{a ? 'Active' : 'Inactive'}</Tag> },
    {
      title: 'Actions', width: 130,
      render: (_, rec) => (
        <Space>
          <Tooltip title="Adjust Stock"><Button type="text" icon={<PlusSquareOutlined style={{ color: '#2563EB' }} />} onClick={() => openStock(rec)} /></Tooltip>
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
        <Title level={4} style={{ margin: 0 }}>Pharmacy Medicines</Title>
        <Space wrap>
          <Upload beforeUpload={handleExcelUpload} showUploadList={false} accept=".xlsx,.xls">
            <Button icon={<UploadOutlined />} loading={importing}>Upload Excel</Button>
          </Upload>
          <Button icon={<DownloadOutlined />} onClick={handleTemplate}>Download Template</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>
            Add Medicine
          </Button>
        </Space>
      </div>
      <Table dataSource={data} columns={columns} rowKey="_id" loading={loading} scroll={{ x: 1100 }} />

      <Modal title={editing ? 'Edit Medicine' : 'Add Medicine'} open={modalOpen} onCancel={() => { setModalOpen(false); setEditing(null); }} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ gstRate: 0, quantity: 0, reorderLevel: 0, purchasePrice: 0, salePrice: 0, unit: 'Strip', isActive: true }}>
          <Form.Item name="name" label="Medicine Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="code" label="Code"><Input /></Form.Item>
          <Form.Item name="genericName" label="Generic Name"><Input /></Form.Item>
          <Form.Item name="category" label="Category"><Input /></Form.Item>
          <Form.Item name="unit" label="Unit"><Input /></Form.Item>
          <Form.Item name="purchasePrice" label="Purchase Price (₹)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="salePrice" label="Sale Price (₹)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="gstRate" label="GST Rate (%)">
            <Select options={gstRates.map(g => ({ value: g, label: `${g}%` }))} />
          </Form.Item>
          <Form.Item name="quantity" label="Opening Quantity"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="reorderLevel" label="Reorder Level"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="expiryDate" label="Expiry Date"><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="isActive" label="Active">
            <Select options={[{ value: true, label: 'Active' }, { value: false, label: 'Inactive' }]} />
          </Form.Item>
          <Space><Button type="primary" htmlType="submit">{editing ? 'Update' : 'Create'}</Button></Space>
        </Form>
      </Modal>

      <Modal title={`Adjust Stock - ${editing?.name || ''}`} open={stockModal} onCancel={() => setStockModal(false)} footer={null}>
        <Form form={stockForm} layout="vertical" onFinish={adjustStock}>
          <Form.Item name="medicineId" label="Medicine"><Input disabled /></Form.Item>
          <Form.Item name="current" label="Current Quantity"><InputNumber disabled style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="adjustment" label="Adjustment (+ add, - remove)" rules={[{ required: true }]}>
            <InputNumber prefix={<MinusOutlined style={{ fontSize: 12 }} />} style={{ width: '100%' }} />
          </Form.Item>
          <Space><Button type="primary" htmlType="submit">Apply</Button></Space>
        </Form>
      </Modal>
    </Card>
  );
}
