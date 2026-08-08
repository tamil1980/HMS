import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Space, message, Tag, Typography, Popconfirm, Switch, Row, Col } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, BankOutlined } from '@ant-design/icons';
import { insuranceAPI } from '../services/api';

const { Title } = Typography;

export default function InsuranceCompanies() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await insuranceAPI.getCompanies();
      setData(res.data);
    } catch { message.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (values) => {
    try {
      if (editing) { await insuranceAPI.updateCompany(editing._id, values); message.success('Company updated'); }
      else { await insuranceAPI.createCompany(values); message.success('Company added'); }
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
      fetchData();
    } catch (err) { message.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    try {
      await insuranceAPI.deleteCompany(id);
      message.success('Company deleted');
      fetchData();
    } catch { message.error('Delete failed'); }
  };

  const toggleActive = async (rec, checked) => {
    try {
      await insuranceAPI.updateCompany(rec._id, { isActive: checked });
      fetchData();
    } catch { message.error('Failed'); }
  };

  const openModal = (rec) => {
    setEditing(rec || null);
    form.resetFields();
    if (rec) form.setFieldsValue(rec);
    setModalOpen(true);
  };

  const columns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'sno', width: 55, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{i + 1}</div> },
    { title: 'Code', dataIndex: 'companyCode', render: (t) => <Tag color="blue">{t}</Tag> },
    { title: 'Name', dataIndex: 'name', render: (t) => <><BankOutlined /> {t}</> },
    { title: 'TPA', dataIndex: 'tpaName', render: (t) => t || '—' },
    { title: 'Contact Person', dataIndex: 'contactPerson', render: (t) => t || '—' },
    { title: 'Phone', dataIndex: 'phone', render: (t) => t || '—' },
    { title: 'Email', dataIndex: 'email', render: (t) => t || '—' },
    { title: 'Claims', dataIndex: ['_count', 'claims'], render: (t) => <Tag color="purple">{t || 0}</Tag> },
    {
      title: 'Active', dataIndex: 'isActive',
      render: (v, rec) => <Switch checked={v !== false} onChange={(c) => toggleActive(rec, c)} />,
    },
    {
      title: 'Actions', key: 'actions', width: 100,
      render: (_, rec) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => openModal(rec)} />
          <Popconfirm title="Delete company?" onConfirm={() => handleDelete(rec._id)}>
            <Button danger type="text" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card style={{ borderRadius: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Insurance Companies</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal(null)}>Add Company</Button>
      </div>
      <Table dataSource={data} columns={columns} rowKey="_id" loading={loading} scroll={{ x: 1000 }} />

      <Modal title={editing ? 'Edit Company' : 'Add Insurance Company'} open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); setEditing(null); }} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="name" label="Company Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="tpaName" label="TPA Name"><Input /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contactPerson" label="Contact Person"><Input /></Form.Item>
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
          <Space>
            <Button type="primary" htmlType="submit">Save</Button>
            <Button onClick={() => { setModalOpen(false); form.resetFields(); setEditing(null); }}>Cancel</Button>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
}
