import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, InputNumber, Space, message, Popconfirm, Typography, Tag, Row, Col } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, ExperimentOutlined } from '@ant-design/icons';
import { radiologyAPI } from '../services/api';

const { Title } = Typography;

export default function RadiologyTests() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const fetchTests = async () => {
    setLoading(true);
    try {
      const res = await radiologyAPI.getTests();
      setData(res.data);
    } catch { message.error('Failed to load tests'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTests(); }, []);

  const handleSave = async (values) => {
    try {
      if (editing) { await radiologyAPI.updateTest(editing._id, values); message.success('Test updated'); }
      else { await radiologyAPI.createTest(values); message.success('Test created'); }
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
      fetchTests();
    } catch (err) { message.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    try {
      await radiologyAPI.removeTest(id);
      message.success('Test deleted');
      fetchTests();
    } catch { message.error('Delete failed'); }
  };

  const openModal = (rec) => {
    setEditing(rec || null);
    form.resetFields();
    if (rec) form.setFieldsValue(rec);
    setModalOpen(true);
  };

  const columns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'sno', width: 55, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{i + 1}</div> },
    { title: 'Test ID', dataIndex: 'testId', render: (t) => <Tag color="indigo">{t || '—'}</Tag> },
    { title: 'Name', dataIndex: 'name', render: (t) => <><ExperimentOutlined /> {t}</> },
    {
      title: 'Category', dataIndex: 'category',
      render: (c) => {
        const color = { 'X-Ray': 'blue', 'CT Scan': 'purple', 'MRI': 'magenta', 'Ultrasound': 'cyan', 'Other': 'default' }[c] || 'default';
        return <Tag color={color}>{c}</Tag>;
      },
    },
    { title: 'Price', dataIndex: 'price', render: (t) => `₹${t}` },
    { title: 'GST %', dataIndex: 'gstRate' },
    { title: 'Preparation', dataIndex: 'preparation' },
    {
      title: 'Actions', key: 'actions', width: 120,
      render: (_, rec) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => openModal(rec)} />
          <Popconfirm title="Delete this test?" onConfirm={() => handleDelete(rec._id)}>
            <Button danger type="text" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card style={{ borderRadius: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Radiology Test Catalog</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal(null)}>Add Test</Button>
      </div>
      <Table dataSource={data} columns={columns} rowKey="_id" loading={loading} />

      <Modal title={editing ? 'Edit Test' : 'Add Test'} open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); setEditing(null); }} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="name" label="Test Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="category" label="Category" rules={[{ required: true }]}>
                <Select options={['X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'Other'].map((c) => ({ value: c, label: c }))} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="price" label="Price" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} addonBefore="₹" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="gstRate" label="GST %">
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="preparation" label="Preparation Instructions"><Input.TextArea rows={2} /></Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">Save</Button>
            <Button onClick={() => { setModalOpen(false); form.resetFields(); setEditing(null); }}>Cancel</Button>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
}
