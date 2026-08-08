import { useState, useEffect } from 'react';
import { Card, Button, Table, Form, Input, InputNumber, Select, Modal, Space, message, Popconfirm, Tooltip, Tag, Typography, Upload } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { labAPI } from '../services/api';
import { downloadBlob } from '../utils/pdf';

const { Title } = Typography;

const gstRates = [0, 2, 5, 12, 18];
const categories = ['Test', 'Lab Test', 'X-Ray', 'Scan'];
const sampleTypes = ['Blood', 'Serum', 'Plasma', 'Urine', 'Sugar', 'Stool', 'Sputum', 'Swab', 'Saliva', 'CSF', 'Tissue'];

const toTag = (v) => (Array.isArray(v) ? (v[0] ?? '') : (v ?? ''));
const fromTag = (v) => (v ? [v] : undefined);

export default function LabTests() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [importing, setImporting] = useState(false);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await labAPI.getTests({});
      setData(res.data);
    } catch { message.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (values) => {
    const payload = {
      ...values,
      category: toTag(values.category) || 'Test',
      sampleType: toTag(values.sampleType),
    };
    try {
      if (editing) {
        await labAPI.updateTest(editing._id, payload);
        message.success('Updated');
      } else {
        await labAPI.createTest(payload);
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
    form.setFieldsValue({
      ...record,
      category: fromTag(record.category),
      sampleType: fromTag(record.sampleType),
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await labAPI.removeTest(id);
      message.success('Deleted');
      fetchData();
    } catch { message.error('Delete failed'); }
  };

  const handleExcelUpload = async (file) => {
    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await labAPI.importTestsExcel(formData);
      message.success(res.data.message || 'Imported');
      fetchData();
    } catch (err) { message.error(err.response?.data?.message || 'Import failed'); }
    finally { setImporting(false); }
    return false;
  };

  const handleTemplate = async () => {
    try {
      const res = await labAPI.exportTestsExcel({});
      downloadBlob(res, 'LabTests_Template.xlsx');
    } catch { message.error('Download failed'); }
  };

  const columns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'sno', width: 55, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{i + 1}</div> },
    { title: 'Test ID', dataIndex: 'testId', key: 'testId', width: 90 },
    { title: 'Name', dataIndex: 'name', key: 'name', width: 190 },
    { title: 'Category', dataIndex: 'category', key: 'category', width: 110, render: (c) => <Tag color={c === 'X-Ray' ? 'purple' : c === 'Scan' ? 'geekblue' : 'cyan'}>{c}</Tag> },
    { title: 'Department', dataIndex: 'department', key: 'department', width: 110, render: (d) => d || '-' },
    { title: 'Price', dataIndex: 'price', key: 'price', width: 85, render: (p) => `₹${p || 0}` },
    { title: 'GST', dataIndex: 'gstRate', key: 'gstRate', width: 70, render: (g) => (g ? `${g}%` : '-') },
    { title: 'Sample Type', dataIndex: 'sampleType', key: 'sampleType', width: 110, render: (s) => s || '-' },
    { title: 'Unit', dataIndex: 'unit', key: 'unit', width: 100, render: (u) => u || '-' },
    { title: 'Reference Range', dataIndex: 'referenceRange', key: 'referenceRange', width: 140, ellipsis: true, render: (r) => r || '-' },
    { title: 'Status', dataIndex: 'isActive', key: 'status', width: 85, render: (a) => <Tag color={a ? 'green' : 'red'}>{a ? 'Active' : 'Inactive'}</Tag> },
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
        <Title level={4} style={{ margin: 0 }}>Lab Test Catalog</Title>
        <Space wrap>
          <Upload beforeUpload={handleExcelUpload} showUploadList={false} accept=".xlsx,.xls">
            <Button icon={<UploadOutlined />} loading={importing}>Upload Excel</Button>
          </Upload>
          <Button icon={<DownloadOutlined />} onClick={handleTemplate}>Download Template</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>
            Add Test
          </Button>
        </Space>
      </div>
      <Table dataSource={data} columns={columns} rowKey="_id" loading={loading} scroll={{ x: 1200 }} />

      <Modal title={editing ? 'Edit Test' : 'Add Test'} open={modalOpen} onCancel={() => { setModalOpen(false); setEditing(null); }} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ category: ['Test'], gstRate: 0, price: 0, isActive: true }}>
          <Form.Item name="name" label="Test Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="category" label="Category" extra="Pick a category or type a new one">
            <Select mode="tags" maxCount={1} options={categories.map(c => ({ value: c, label: c }))} />
          </Form.Item>
          <Form.Item name="department" label="Department"><Input /></Form.Item>
          <Form.Item name="sampleType" label="Sample Type" extra="Blood, Urine, Sugar, etc. or type any other">
            <Select mode="tags" maxCount={1} options={sampleTypes.map(s => ({ value: s, label: s }))} />
          </Form.Item>
          <Form.Item name="price" label="Price / Amount (₹)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="gstRate" label="GST Rate (%)">
            <Select options={gstRates.map(g => ({ value: g, label: `${g}%` }))} />
          </Form.Item>
          <Form.Item name="unit" label="Unit (e.g. mg/dL, mill/cumm)"><Input /></Form.Item>
          <Form.Item name="referenceRange" label="Reference Range / Normal Values"><Input /></Form.Item>
          <Form.Item name="defaultResult" label="Default Result"><Input /></Form.Item>
          <Form.Item name="turnaroundTime" label="Turnaround Time"><Input /></Form.Item>
          <Form.Item name="isActive" label="Active">
            <Select options={[{ value: true, label: 'Active' }, { value: false, label: 'Inactive' }]} />
          </Form.Item>
          <Space><Button type="primary" htmlType="submit">{editing ? 'Update' : 'Create'}</Button></Space>
        </Form>
      </Modal>
    </Card>
  );
}
