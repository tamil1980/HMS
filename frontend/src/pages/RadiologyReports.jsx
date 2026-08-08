import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Table, Button, Modal, Form, Input, Select, Space, message, Tag, Typography, Tooltip, Popconfirm, Row, Col, Divider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, FileTextOutlined } from '@ant-design/icons';
import { radiologyAPI, patientAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

export default function RadiologyReports() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [patients, setPatients] = useState([]);
  const [bills, setBills] = useState([]);
  const [form] = Form.useForm();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = {};
      const billParam = searchParams.get('bill');
      if (billParam) params.bill = billParam;
      const res = await radiologyAPI.getReports(params);
      setData(res.data);
    } catch { message.error('Failed to load reports'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchReports();
  }, [searchParams]);

  const openCreate = async () => {
    setEditing(null);
    form.resetFields();
    if (!bills.length) {
      try {
        const res = await radiologyAPI.getBills({ limit: 100, status: 'Paid' });
        setBills(res.data.bills);
      } catch {}
    }
    if (!patients.length) {
      try {
        const res = await patientAPI.getAll({ limit: 50 });
        setPatients(res.data.patients);
      } catch {}
    }
    const billParam = searchParams.get('bill');
    if (billParam) form.setFieldsValue({ billId: billParam });
    setModalOpen(true);
  };

  const openEdit = (rec) => {
    setEditing(rec);
    form.resetFields();
    form.setFieldsValue({ ...rec, billId: rec.bill?._id || rec.billId });
    setModalOpen(true);
  };

  const handleSave = async (values) => {
    try {
      if (editing) { await radiologyAPI.updateReport(editing._id, values); message.success('Report updated'); }
      else { await radiologyAPI.createReport(values); message.success('Report created'); }
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
      fetchReports();
    } catch (err) { message.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    try {
      await radiologyAPI.removeReport(id);
      message.success('Report deleted');
      fetchReports();
    } catch { message.error('Delete failed'); }
  };

  const statusColors = { Draft: 'default', Completed: 'green', Reviewed: 'blue', Abnormal: 'red' };

  const columns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'sno', width: 55, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{i + 1}</div> },
    { title: 'Report ID', dataIndex: 'reportId', render: (t) => <Tag color="indigo">{t}</Tag> },
    { title: 'Patient', dataIndex: ['patient', 'name'], render: (t) => t || '-' },
    { title: 'Test', dataIndex: 'testName', render: (t) => <><FileTextOutlined /> {t || '-'}</> },
    { title: 'Date', dataIndex: 'reportDate', render: (d) => d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '-' },
    { title: 'Radiologist', dataIndex: 'radiologist', render: (t) => t || '-' },
    { title: 'Status', dataIndex: 'status', render: (s) => <Tag color={statusColors[s]}>{s || 'Completed'}</Tag> },
    {
      title: 'Actions', key: 'actions', width: 140,
      render: (_, rec) => (
        <Space>
          <Tooltip title="View"><Button type="text" icon={<EyeOutlined />} onClick={() => setViewing(rec)} /></Tooltip>
          <Tooltip title="Edit"><Button type="text" icon={<EditOutlined />} onClick={() => openEdit(rec)} /></Tooltip>
          <Popconfirm title="Delete report?" onConfirm={() => handleDelete(rec._id)}>
            <Button danger type="text" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card style={{ borderRadius: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Radiology Reports</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Report</Button>
      </div>
      <Table dataSource={data} columns={columns} rowKey="_id" loading={loading} scroll={{ x: 900 }} />

      <Modal title={editing ? 'Edit Report' : 'Add Radiology Report'} open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); setEditing(null); }}
        onOk={() => form.submit()} width={640} okText="Save" okButtonProps={{ loading: loading }}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="billId" label="Bill" rules={[{ required: true, message: 'Select bill' }]}>
                <Select showSearch placeholder="Select radiology bill"
                  filterOption={(input, option) => (option.children || '').toLowerCase().includes(input.toLowerCase())}>
                  {bills.map(b => <Option key={b._id} value={b._id}>{b.billId} - {b.patient?.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="testName" label="Test Name" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
          </Row>
          <Form.Item name="findings" label="Findings" rules={[{ required: true, message: 'Enter findings' }]}>
            <Input.TextArea rows={5} placeholder="Describe the radiological findings" />
          </Form.Item>
          <Form.Item name="impression" label="Impression / Diagnosis">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="radiologist" label="Radiologist"><Input /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Status">
                <Select options={['Draft', 'Completed', 'Reviewed', 'Abnormal'].map(s => ({ value: s, label: s }))} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="Notes"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Radiology Report" open={!!viewing} onCancel={() => setViewing(null)} footer={null} width={640}>
        {viewing && (
          <div>
            <div style={{ borderBottom: '2px solid #f0f0f0', paddingBottom: 12, marginBottom: 12 }}>
              <Title level={4} style={{ margin: 0 }}>{viewing.testName}</Title>
              <Tag color="indigo" style={{ marginTop: 6 }}>{viewing.reportId}</Tag>
              <Tag color={statusColors[viewing.status]}>{viewing.status}</Tag>
            </div>
            <p><strong>Patient:</strong> {viewing.patient?.name} {viewing.patient?.age ? `(${viewing.patient.age} yrs)` : ''} | {viewing.patient?.gender || ''}</p>
            <p><strong>Date:</strong> {dayjs(viewing.reportDate).format('DD/MM/YYYY HH:mm')}</p>
            <p><strong>Radiologist:</strong> {viewing.radiologist || '—'}</p>
            <Divider style={{ margin: '12px 0' }} />
            <h4>Findings</h4>
            <p style={{ whiteSpace: 'pre-wrap' }}>{viewing.findings}</p>
            {viewing.impression && (
              <>
                <h4>Impression</h4>
                <p style={{ whiteSpace: 'pre-wrap' }}>{viewing.impression}</p>
              </>
            )}
            {viewing.notes && <p style={{ color: '#888' }}><em>{viewing.notes}</em></p>}
          </div>
        )}
      </Modal>
    </Card>
  );
}
