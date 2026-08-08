import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Space, Card, Popconfirm, message, Tooltip, Tag, DatePicker, Typography, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { appointmentAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;

const formatTime = (t) => {
  if (!t) return '-';
  const m = String(t).match(/^(\d{1,2}):(\d{2})$/);
  if (m) {
    let h = parseInt(m[1], 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m[2]} ${ampm}`;
  }
  return t;
};

export default function Appointments() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('Scheduled');
  const navigate = useNavigate();

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: pagination.pageSize };
      if (dateFilter) params.date = dateFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await appointmentAPI.getAll(params);
      setData(res.data.appointments || []);
      setPagination(prev => ({ ...prev, current: page, total: res.data.total || 0 }));
    } catch { message.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [dateFilter, statusFilter]);

  const handleDelete = async (id) => {
    try { await appointmentAPI.remove(id); message.success('Deleted'); fetchData(pagination.current); }
    catch { message.error('Delete failed'); }
  };

  const handleComplete = async (id) => {
    try { await appointmentAPI.update(id, { status: 'Completed' }); message.success('Marked completed'); fetchData(pagination.current); }
    catch { message.error('Failed'); }
  };

  const statusColors = { Scheduled: 'blue', Completed: 'green', Cancelled: 'red', 'No-Show': 'orange' };

  const columns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'sno', width: 55, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{((pagination.current - 1) * pagination.pageSize) + i + 1}</div> },
    { title: 'Token', dataIndex: 'tokenNumber', key: 'token', width: 55, render: (t) => t || '-' },
    { title: 'Patient', dataIndex: ['patient', 'name'], key: 'patient', render: (t) => t || '-' },
    { title: 'Patient ID', dataIndex: ['patient', 'patientId'], key: 'pid', render: (t) => t || '-' },
    { title: 'Doctor', dataIndex: ['consultant', 'name'], key: 'consultant', render: (t) => t || '-' },
    { title: 'Date', dataIndex: 'appointmentDate', key: 'date', render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
    { title: 'Time', dataIndex: 'appointmentTime', key: 'time', render: (t) => formatTime(t) },
    { title: 'Type', dataIndex: 'type', key: 'type', render: (t) => <Tag color={t === 'New' ? 'purple' : 'cyan'}>{t || 'New'}</Tag> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={statusColors[s] || 'default'}>{s || 'Scheduled'}</Tag> },
    { title: 'Reminder', dataIndex: 'reminderSentAt', key: 'reminder', render: (t, r) => r.status === 'Scheduled' ? (t ? <Tag color="green" title={dayjs(t).format('DD/MM/YYYY HH:mm')}>Sent</Tag> : <Tag>Pending</Tag>) : '-' },
    {
      title: 'Actions', key: 'actions', width: 130,
      render: (_, rec) => (
        <Space size="small">
          {rec.status === 'Scheduled' && (
            <Tooltip title="Complete"><Button type="text" size="small" icon={<CheckCircleOutlined />} style={{ color: '#52c41a' }} onClick={() => handleComplete(rec._id)} /></Tooltip>
          )}
          <Tooltip title="Edit"><Button type="text" size="small" icon={<EditOutlined />} onClick={() => navigate(`/appointments/${rec._id}/edit`)} /></Tooltip>
          <Popconfirm title="Delete this appointment?" onConfirm={() => handleDelete(rec._id)}>
            <Tooltip title="Delete"><Button type="text" size="small" danger icon={<DeleteOutlined />} /></Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card style={{ borderRadius: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Title level={4} style={{ margin: 0 }}>Appointments</Title>
        <Space>
          <DatePicker
            value={dateFilter ? dayjs(dateFilter) : null}
            onChange={(d) => setDateFilter(d ? d.format('YYYY-MM-DD') : '')}
            allowClear
            placeholder="Filter by date"
          />
          <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 130 }} allowClear placeholder="Status">
            <Select.Option value="Scheduled">Scheduled</Select.Option>
            <Select.Option value="Completed">Completed</Select.Option>
            <Select.Option value="Cancelled">Cancelled</Select.Option>
            <Select.Option value="No-Show">No-Show</Select.Option>
          </Select>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/appointments/new')}>New Appointment</Button>
        </Space>
      </div>
      <Table dataSource={data} columns={columns} rowKey="_id" loading={loading}
        pagination={{ ...pagination, onChange: (page) => fetchData(page), showSizeChanger: false }}
        scroll={{ x: 900 }} />
    </Card>
  );
}
