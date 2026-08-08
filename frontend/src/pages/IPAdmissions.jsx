import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Space, Card, message, Typography, Tag, Select, Tooltip, Popconfirm, Modal, Form, DatePicker, InputNumber } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined, SendOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { ipAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function IPAdmissions() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [dischargeModal, setDischargeModal] = useState(false);
  const [dischargeRec, setDischargeRec] = useState(null);
  const [dischargeForm] = Form.useForm();
  const navigate = useNavigate();

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: pagination.pageSize };
      if (statusFilter) params.status = statusFilter;
      const res = await ipAPI.getAdmissions(params);
      setData(res.data.admissions);
      setPagination(prev => ({ ...prev, current: page, total: res.data.total }));
    } catch { message.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [statusFilter]);

  const handleDelete = async (id) => {
    try {
      await ipAPI.removeAdmission(id);
      message.success('Deleted');
      fetchData();
    } catch { message.error('Delete failed'); }
  };

  const handleDischarge = async (values) => {
    try {
      await ipAPI.dischargeAdmission(dischargeRec._id, {
        dischargeDate: values.dischargeDate.toISOString(),
        dischargeType: values.dischargeType,
      });
      message.success('Patient discharged');
      setDischargeModal(false);
      fetchData();
    } catch { message.error('Discharge failed'); }
  };

  const openDischarge = (rec) => {
    setDischargeRec(rec);
    dischargeForm.setFieldsValue({ dischargeDate: dayjs(), dischargeType: 'Recovered' });
    setDischargeModal(true);
  };

  const columns = [
    { title: <div style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>S.No</div>, key: 'sno', width: 60, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{((pagination.current - 1) * pagination.pageSize) + i + 1}</div> },
    { title: 'Admission ID', dataIndex: 'admissionId', key: 'id' },
    { title: 'Patient', dataIndex: ['patient', 'name'], key: 'patient', render: (t, r) => <span>{t || '-'}<br /><small>{r.patient?.patientId || ''}</small></span> },
    { title: 'Doctor', dataIndex: ['consultant', 'name'], key: 'consultant', render: (t) => t || '-' },
    { title: 'Admitted On', dataIndex: 'admissionDate', key: 'date', render: (d) => dayjs(d).format('DD/MM/YYYY') },
    { title: 'Type', dataIndex: 'admissionType', key: 'type', render: (t) => t || 'General' },
    { title: 'Room Type', dataIndex: 'roomType', key: 'room', render: (t, r) => <span>{t || '-'}<br /><small>Rs.{r.roomRate || 0}/day</small></span> },
    { title: 'Diagnosis', dataIndex: 'provisionalDiagnosis', key: 'diag', ellipsis: true },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={s === 'Admitted' ? 'green' : 'blue'}>{s}</Tag> },
    {
      title: 'Actions', key: 'actions', width: 250,
      render: (_, rec) => (
        <Space size={2}>
          <Tooltip title="View / Records"><Button type="text" icon={<EyeOutlined />} onClick={() => navigate(`/ip/admissions/${rec._id}`)} /></Tooltip>
          <Tooltip title="Edit"><Button type="text" icon={<EditOutlined />} onClick={() => navigate(`/ip/admissions/${rec._id}/edit`)} /></Tooltip>
          <Tooltip title="Discharge"><Button type="text" icon={<SendOutlined style={{ color: '#2563EB' }} />} onClick={() => openDischarge(rec)} /></Tooltip>
          <Popconfirm title="Delete admission?" onConfirm={() => handleDelete(rec._id)}>
            <Tooltip title="Delete"><Button type="text" danger icon={<DeleteOutlined />} /></Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card style={{ borderRadius: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Title level={4} style={{ margin: 0 }}>IP Admissions</Title>
        <Space>
          <Select value={statusFilter} onChange={setStatusFilter} allowClear placeholder="Filter status" style={{ width: 140 }}
            options={['Admitted', 'Discharged'].map(s => ({ value: s, label: s }))} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/ip/admissions/new')}>Admit Patient</Button>
        </Space>
      </div>
      <Table dataSource={data} columns={columns} rowKey="_id" loading={loading}
        pagination={{ ...pagination, onChange: (page) => fetchData(page), showSizeChanger: false }}
        scroll={{ x: 1000 }} />

      <Modal title={`Discharge ${dischargeRec?.patient?.name || ''}`} open={dischargeModal} onCancel={() => setDischargeModal(false)} footer={null}>
        <Form form={dischargeForm} layout="vertical" onFinish={handleDischarge}>
          <Form.Item name="dischargeDate" label="Discharge Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="dischargeType" label="Discharge Type" rules={[{ required: true }]}>
            <Select options={['Recovered', 'Improved', 'Referred', 'AMA', 'Expired', 'Other'].map(t => ({ value: t, label: t }))} />
          </Form.Item>
          <Space><Button type="primary" htmlType="submit">Confirm Discharge</Button></Space>
        </Form>
      </Modal>
    </Card>
  );
}
