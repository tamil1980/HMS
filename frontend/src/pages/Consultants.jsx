import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Space, Card, Popconfirm, message, Tooltip, Tag, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PhoneOutlined, MailOutlined } from '@ant-design/icons';
import { consultantAPI } from '../services/api';

const { Title } = Typography;

export default function Consultants() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    consultantAPI.getAll().then(res => setData(res.data)).catch(() => message.error('Failed to load')).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    try {
      await consultantAPI.remove(id);
      message.success('Deleted');
      setData(prev => prev.filter(c => c._id !== id));
    } catch { message.error('Delete failed'); }
  };

  const columns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'sno', width: 55, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{i + 1}</div> },
    { title: 'Name', dataIndex: 'name', key: 'name', render: (text, rec) => <a onClick={() => navigate(`/consultants/${rec._id}/edit`)}>{text}</a> },
    { title: 'Department', dataIndex: 'department', key: 'department', render: (d) => d ? <Tag color="purple">{d}</Tag> : '-' },
    { title: 'Specialization', dataIndex: 'specialization', key: 'specialization', render: (s) => <Tag color="blue">{s}</Tag> },
    { title: 'Qualification', dataIndex: 'qualification', key: 'qualification' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', render: (p) => <><PhoneOutlined /> {p}</> },
    { title: 'Fee', dataIndex: 'consultationFee', key: 'fee', render: (f) => f || 0 },
    { title: 'Status', dataIndex: 'isActive', key: 'status', render: (a) => <Tag color={a ? 'green' : 'red'}>{a ? 'Active' : 'Inactive'}</Tag> },
    {
      title: 'Actions', key: 'actions', width: 100,
      render: (_, rec) => (
        <Space>
          <Tooltip title="Edit"><Button type="text" icon={<EditOutlined />} onClick={() => navigate(`/consultants/${rec._id}/edit`)} /></Tooltip>
          <Popconfirm title="Delete?" onConfirm={() => handleDelete(rec._id)}>
            <Tooltip title="Delete"><Button type="text" danger icon={<DeleteOutlined />} /></Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card style={{ borderRadius: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Consultants</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/consultants/new')}>Add Consultant</Button>
      </div>
      <Table dataSource={data} columns={columns} rowKey="_id" loading={loading} scroll={{ x: 700 }} />
    </Card>
  );
}
