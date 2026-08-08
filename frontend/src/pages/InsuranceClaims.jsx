import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, Space, message, Tag, Typography, Popconfirm, Row, Col } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, FileProtectOutlined } from '@ant-design/icons';
import { insuranceAPI, patientAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

const claimStatuses = ['Submitted', 'Under Review', 'Approved', 'Rejected', 'Settled'];
const billTypes = ['OP', 'IP', 'Pharmacy', 'Lab', 'Radiology'];

export default function InsuranceClaims() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [patients, setPatients] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await insuranceAPI.getClaims(params);
      setData(res.data);
    } catch { message.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    insuranceAPI.getCompanies().then(res => setCompanies(res.data)).catch(() => {});
    patientAPI.getAll({ limit: 50 }).then(res => setPatients(res.data.patients)).catch(() => {});
  }, [statusFilter]);

  const handleSave = async (values) => {
    try {
      if (editing) { await insuranceAPI.updateClaim(editing._id, values); message.success('Claim updated'); }
      else { await insuranceAPI.createClaim(values); message.success('Claim filed'); }
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
      fetchData();
    } catch (err) { message.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    try {
      await insuranceAPI.deleteClaim(id);
      message.success('Claim deleted');
      fetchData();
    } catch { message.error('Delete failed'); }
  };

  const openModal = (rec) => {
    setEditing(rec || null);
    form.resetFields();
    if (rec) form.setFieldsValue(rec);
    setModalOpen(true);
  };

  const statusColors = {
    Submitted: 'default', 'Under Review': 'blue', Approved: 'green', Rejected: 'red', Settled: 'purple',
  };

  const columns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'sno', width: 55, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{i + 1}</div> },
    { title: 'Claim ID', dataIndex: 'claimId', render: (t) => <Tag color="indigo"><FileProtectOutlined /> {t}</Tag> },
    { title: 'Patient', dataIndex: ['patient', 'name'], render: (t) => t || '-' },
    { title: 'Company', dataIndex: ['company', 'name'], render: (t) => t || '-' },
    { title: 'Bill Type', dataIndex: 'billType', render: (t) => <Tag>{t || '-'}</Tag> },
    { title: 'Policy No', dataIndex: 'policyNumber', render: (t) => t || '—' },
    { title: 'Claim Amount', dataIndex: 'claimAmount', render: (t) => `₹${t || 0}` },
    { title: 'Approved', dataIndex: 'approvedAmount', render: (t) => t ? `₹${t}` : '—' },
    { title: 'Filed On', dataIndex: 'filedAt', render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
    { title: 'Status', dataIndex: 'status', render: (s) => <Tag color={statusColors[s]}>{s}</Tag> },
    {
      title: 'Actions', key: 'actions', width: 100,
      render: (_, rec) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => openModal(rec)} />
          <Popconfirm title="Delete claim?" onConfirm={() => handleDelete(rec._id)}>
            <Button danger type="text" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card style={{ borderRadius: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Title level={4} style={{ margin: 0 }}>Insurance Claims</Title>
        <Space>
          <Select value={statusFilter} onChange={setStatusFilter} allowClear placeholder="Filter status" style={{ width: 150 }}
            options={claimStatuses.map(s => ({ value: s, label: s }))} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal(null)}>File Claim</Button>
        </Space>
      </div>
      <Table dataSource={data} columns={columns} rowKey="_id" loading={loading} scroll={{ x: 1100 }} />

      <Modal title={editing ? 'Update Claim' : 'File Insurance Claim'} open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); setEditing(null); }}
        footer={null} width={560}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
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
              <Form.Item name="companyId" label="Insurance Company" rules={[{ required: true }]}>
                <Select placeholder="Select company">
                  {companies.map(c => <Option key={c._id} value={c._id}>{c.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="billType" label="Bill Type" rules={[{ required: true }]}>
                <Select options={billTypes.map(b => ({ value: b, label: b }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="policyNumber" label="Policy Number" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="claimAmount" label="Claim Amount" rules={[{ required: true }]}>
                <InputNumber min={0} prefix="₹" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Status">
                <Select options={claimStatuses.map(s => ({ value: s, label: s }))} />
              </Form.Item>
            </Col>
          </Row>
          {editing && (
            <Form.Item name="approvedAmount" label="Approved Amount">
              <InputNumber min={0} prefix="₹" style={{ width: '100%' }} />
            </Form.Item>
          )}
          <Form.Item name="notes" label="Notes"><Input.TextArea rows={2} /></Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">{editing ? 'Update' : 'File Claim'}</Button>
            <Button onClick={() => { setModalOpen(false); form.resetFields(); setEditing(null); }}>Cancel</Button>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
}
