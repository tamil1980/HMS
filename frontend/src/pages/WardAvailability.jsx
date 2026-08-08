import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Spin, Typography, Progress, Button } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, AppstoreOutlined, HomeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { wardAPI } from '../services/api';

const { Title, Text } = Typography;

export default function WardAvailability() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await wardAPI.availability();
      setData(res.data);
    } catch { setData(null); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;

  const columns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'sno', width: 55, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{i + 1}</div> },
    { title: 'Ward', dataIndex: 'name', render: (t) => <><HomeOutlined /> {t}</> },
    { title: 'Total Beds', dataIndex: 'total' },
    {
      title: 'Available', dataIndex: 'available',
      render: (t) => <Tag color={t > 0 ? 'green' : 'red'}>{t}</Tag>,
    },
    { title: 'Occupied', dataIndex: 'occupied', render: (t) => <Tag color={t > 0 ? 'red' : 'default'}>{t}</Tag> },
    {
      title: 'Occupancy', key: 'pct',
      render: (_, rec) => {
        const pct = rec.total > 0 ? Math.round((rec.occupied / rec.total) * 100) : 0;
        return <Progress percent={pct} size="small" status={pct > 90 ? 'exception' : 'normal'} />;
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Bed Availability</Title>
        <Button type="primary" onClick={() => navigate('/ip/admissions')}>Manage Admissions</Button>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={12} md={8}>
          <Card><Statistic title="Total Beds" value={data?.totalBeds || 0} prefix={<AppstoreOutlined />} /></Card>
        </Col>
        <Col xs={12} md={8}>
          <Card><Statistic title="Available Beds" value={data?.available || 0} valueStyle={{ color: '#16a34a' }} prefix={<CheckCircleOutlined />} /></Card>
        </Col>
        <Col xs={12} md={8}>
          <Card><Statistic title="Occupied Beds" value={data?.occupied || 0} valueStyle={{ color: '#dc2626' }} prefix={<CloseCircleOutlined />} /></Card>
        </Col>
      </Row>

      <Card style={{ borderRadius: 10, marginTop: 16 }}>
        <Table dataSource={data?.byWard || []} columns={columns} rowKey="_id" pagination={false} />
        <Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
          Assign beds to patients from <a onClick={() => navigate('/ip/admissions')}>IP Admissions</a> → open an admission → "Allocate Bed".
        </Text>
      </Card>
    </div>
  );
}
