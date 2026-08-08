import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Button, Input, Space, message, Tag, Typography, Tooltip, Popconfirm } from 'antd';
import { EditOutlined, FileSearchOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { patientAPI } from '../services/api';

const { Title } = Typography;

export default function PatientSearch() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const navigate = useNavigate();

  const fetchData = async (page = 1, term = search) => {
    setLoading(true);
    try {
      const params = { page, limit: pagination.pageSize };
      if (term) params.search = term;
      const res = await patientAPI.getAll(params);
      setData(res.data.patients);
      setPagination(prev => ({ ...prev, current: page, total: res.data.total }));
    } catch { message.error('Failed to load patients'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (rec) => {
    try {
      await patientAPI.remove(rec._id);
      message.success('Patient deleted');
      fetchData(pagination.current);
    } catch (err) { message.error(err.response?.data?.message || 'Delete failed'); }
  };

  const genderColors = { Male: 'blue', Female: 'magenta', Other: 'default' };

  const columns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'sno', width: 55, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{((pagination.current - 1) * pagination.pageSize) + i + 1}</div> },
    { title: 'Patient ID', dataIndex: 'patientId', width: 110, render: (t) => <Tag color="geekblue">{t || '—'}</Tag> },
    { title: 'Name', dataIndex: 'name', render: (t) => <strong>{t}</strong> },
    { title: 'Phone', dataIndex: 'phone', render: (t) => t || '—' },
    { title: 'Age', dataIndex: 'age', width: 60, render: (t) => t || '—' },
    { title: 'Gender', dataIndex: 'gender', width: 90, render: (t) => <Tag color={genderColors[t]}>{t}</Tag> },
    { title: 'Blood Group', dataIndex: 'bloodGroup', width: 110, render: (t) => t ? <Tag color="red">{t}</Tag> : '—' },
    {
      title: 'Actions', key: 'actions', width: 160,
      render: (_, rec) => (
        <Space>
          <Tooltip title="Edit Patient"><Button type="text" icon={<EditOutlined />} onClick={() => navigate(`/op-patient/edit?id=${rec._id}`)} /></Tooltip>
          <Tooltip title="Patient History"><Button type="text" icon={<FileSearchOutlined />} onClick={() => navigate(`/op-patient/history?patient=${rec._id}`)} /></Tooltip>
          <Popconfirm title="Delete this patient?" onConfirm={() => handleDelete(rec)}>
            <Tooltip title="Delete"><Button danger type="text" icon={<DeleteOutlined />} /></Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card style={{ borderRadius: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Title level={4} style={{ margin: 0 }}>Search Patient</Title>
        <Space>
          <Input.Search
            placeholder="Search by name / phone / patient id"
            prefix={<SearchOutlined />}
            allowClear
            style={{ width: 280 }}
            onSearch={(v) => { setSearch(v); fetchData(1, v); }}
            onChange={(e) => { if (!e.target.value) { setSearch(''); fetchData(1, ''); } }}
          />
        </Space>
      </div>
      <Table dataSource={data} columns={columns} rowKey="_id" loading={loading}
        pagination={{ ...pagination, onChange: (page) => fetchData(page), showSizeChanger: false }}
        scroll={{ x: 900 }} />
    </Card>
  );
}
