import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Space, Card, message, Typography, Tag, Select, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, FilePdfOutlined, DeleteOutlined } from '@ant-design/icons';
import { labAPI } from '../services/api';
import { downloadBlob } from '../utils/pdf';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function LabResults() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (statusFilter) params.status = statusFilter;
      const res = await labAPI.getResults(params);
      setData(res.data.results);
    } catch { message.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [statusFilter]);

  const downloadPDF = async (rec) => {
    try {
      const res = await labAPI.getResultPDF(rec._id, true);
      downloadBlob(res, `LabReport_${rec.resultId}_${rec.patient?.name || 'Unknown'}.pdf`);
    } catch { message.error('Download failed'); }
  };

  const handleDelete = async (id) => {
    try {
      await labAPI.removeResult(id);
      message.success('Deleted');
      fetchData();
    } catch { message.error('Delete failed'); }
  };

  const statusColors = { Pending: 'orange', Completed: 'green', Abnormal: 'red' };

  const columns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'sno', width: 55, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{i + 1}</div> },
    { title: 'Report No', dataIndex: 'resultId', key: 'id' },
    { title: 'Patient', dataIndex: ['patient', 'name'], key: 'patient', render: (t) => t || '-' },
    { title: 'Date', dataIndex: 'resultDate', key: 'date', render: (d) => dayjs(d).format('DD/MM/YYYY') },
    { title: 'Tests', key: 'tests', render: (_, rec) => (rec.tests?.length || 0) },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={statusColors[s]}>{s}</Tag> },
    {
      title: 'Actions', key: 'actions', width: 140,
      render: (_, rec) => (
        <Space>
          <Tooltip title="Edit"><Button type="text" icon={<EditOutlined />} onClick={() => navigate(`/lab/results/${rec._id}/edit`)} /></Tooltip>
          <Tooltip title="Download PDF"><Button type="text" icon={<FilePdfOutlined />} onClick={() => downloadPDF(rec)} /></Tooltip>
          <Tooltip title="Delete"><Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(rec._id)} /></Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Card style={{ borderRadius: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Title level={4} style={{ margin: 0 }}>Test Results</Title>
        <Space>
          <Select value={statusFilter} onChange={setStatusFilter} allowClear placeholder="Filter status" style={{ width: 130 }}
            options={['Pending', 'Completed', 'Abnormal'].map(s => ({ value: s, label: s }))} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/lab/results/new')}>New Result</Button>
        </Space>
      </div>
      <Table dataSource={data} columns={columns} rowKey="_id" loading={loading}
        pagination={{ pageSize: 20 }} scroll={{ x: 700 }} />
    </Card>
  );
}
