import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Table, Button, Select, Form, Input, DatePicker, Modal, Space, message, Tooltip, Popconfirm, Tag, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { ipAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;

const vitalFields = ['temperature', 'pulse', 'respiration', 'bloodPressure', 'spo2', 'weight', 'urineOutput', 'fluidIntake', 'glucose', 'notes'];

export default function IPMonitoring() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [admissions, setAdmissions] = useState([]);
  const [admission, setAdmission] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const [params] = useSearchParams();

  useEffect(() => {
    ipAPI.getAdmissions({ limit: 100 }).then(res => setAdmissions(res.data.admissions)).catch(() => {});
    const qAdmission = params.get('admission');
    if (qAdmission) setAdmission(qAdmission);
  }, []);

  const fetchData = async (admId) => {
    if (!admId) { setData([]); return; }
    setLoading(true);
    try {
      const res = await ipAPI.getMonitoring({ admission: admId });
      setData(res.data);
    } catch { message.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(admission); }, [admission]);

  const handleSubmit = async (values) => {
    try {
      const payload = { ...values, admission, recordedAt: values.recordedAt?.toISOString(), recordedBy: values.recordedBy || 'Admin' };
      if (editing) { await ipAPI.updateMonitoring(editing._id, payload); message.success('Updated'); }
      else { await ipAPI.createMonitoring(payload); message.success('Record added'); }
      setModalOpen(false); setEditing(null); form.resetFields(); fetchData(admission);
    } catch (err) { message.error(err.response?.data?.message || 'Failed'); }
  };

  const handleEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({ ...record, recordedAt: record.recordedAt ? dayjs(record.recordedAt) : dayjs() });
    setModalOpen(true);
  };

  const openAdd = () => {
    if (!admission) {
      if (!admissions.length) message.warning('No admissions yet. Create an admission first.');
      else message.warning('Select an admission before adding a reading.');
      return;
    }
    setEditing(null);
    form.resetFields();
    form.setFieldValue('recordedAt', dayjs());
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    try { await ipAPI.removeMonitoring(id); message.success('Deleted'); fetchData(admission); }
    catch { message.error('Delete failed'); }
  };

  const columns = [
    { title: 'S.No', key: 'sno', width: 55, align: 'center', render: (t, r, i) => i + 1 },
    { title: 'Recorded At', dataIndex: 'recordedAt', key: 'at', width: 155, align: 'center', render: (d) => dayjs(d).format('DD/MM/YYYY hh:mm A') },
    { title: 'Temp', dataIndex: 'temperature', key: 'temp', width: 75, align: 'center', render: (v) => v || '-' },
    { title: 'Pulse', dataIndex: 'pulse', key: 'pulse', width: 75, align: 'center', render: (v) => v || '-' },
    { title: 'Resp', dataIndex: 'respiration', key: 'resp', width: 75, align: 'center', render: (v) => v || '-' },
    { title: 'BP', dataIndex: 'bloodPressure', key: 'bp', width: 95, align: 'center', render: (v) => v || '-' },
    { title: 'SpO2', dataIndex: 'spo2', key: 'spo2', width: 75, align: 'center', render: (v) => v || '-' },
    { title: 'Weight', dataIndex: 'weight', key: 'weight', width: 80, align: 'center', render: (v) => v || '-' },
    { title: 'Urine', dataIndex: 'urineOutput', key: 'urine', width: 80, align: 'center', render: (v) => v || '-' },
    { title: 'Intake', dataIndex: 'fluidIntake', key: 'intake', width: 80, align: 'center', render: (v) => v || '-' },
    { title: 'Sugar', dataIndex: 'glucose', key: 'glucose', width: 80, align: 'center', render: (v) => v || '-' },
    { title: 'Notes', dataIndex: 'notes', key: 'notes', ellipsis: true },
    { title: 'By', dataIndex: 'recordedBy', key: 'by', width: 90, align: 'center', render: (v) => <Tag>{v || '-'}</Tag> },
    {
      title: 'Actions', key: 'actions', width: 95, align: 'center',
      render: (_, rec) => (
        <Space size={0}>
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
        <Title level={4} style={{ margin: 0 }}>Patient Monitoring</Title>
        <Space>
          <Select value={admission} onChange={setAdmission} placeholder="Select admission..." style={{ width: 300 }} showSearch
            filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
            {admissions.map(a => <Select.Option key={a._id} value={a._id}>{a.admissionId} - {a.patient?.name} ({a.roomType || 'General'})</Select.Option>)}
          </Select>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Add Reading</Button>
        </Space>
      </div>
      <Table dataSource={data} columns={columns} rowKey="_id" loading={loading} size="middle" scroll={{ x: 1050 }} />

      <Modal title={editing ? 'Edit Reading' : 'Add Reading'} open={modalOpen} onCancel={() => { setModalOpen(false); setEditing(null); }} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ recordedAt: dayjs() }}>
          <Form.Item name="recordedAt" label="Recorded At"><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
          <Space size={8} wrap>
            {vitalFields.slice(0, 6).map(f => (
              <Form.Item key={f} name={f} label={f.charAt(0).toUpperCase() + f.slice(1)} style={{ marginBottom: 12, width: 140 }}>
                <Input placeholder={f} />
              </Form.Item>
            ))}
          </Space>
          <Space size={8} wrap>
            {vitalFields.slice(6, 9).map(f => (
              <Form.Item key={f} name={f} label={f.charAt(0).toUpperCase() + f.slice(1)} style={{ marginBottom: 12, width: 140 }}>
                <Input placeholder={f} />
              </Form.Item>
            ))}
            <Form.Item name="recordedBy" label="Recorded By" style={{ marginBottom: 12, width: 140 }}><Input /></Form.Item>
          </Space>
          <Form.Item name="notes" label="Notes"><Input.TextArea rows={2} /></Form.Item>
          <Space><Button type="primary" htmlType="submit">{editing ? 'Update' : 'Save'}</Button></Space>
        </Form>
      </Modal>
    </Card>
  );
}
