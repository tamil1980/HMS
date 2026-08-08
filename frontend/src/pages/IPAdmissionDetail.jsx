import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Typography, Tag, Button, Space, Descriptions, message, Divider, Statistic } from 'antd';
import { DollarOutlined, FileTextOutlined, HeartOutlined, ShopOutlined, SendOutlined, EditOutlined, MedicineBoxOutlined, FileDoneOutlined } from '@ant-design/icons';
import { ipAPI, pharmacyAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function IPAdmissionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [admission, setAdmission] = useState(null);
  const [counts, setCounts] = useState({ bills: 0, caseSheets: 0, monitoring: 0, pharmacy: 0 });

  useEffect(() => {
    ipAPI.getAdmissionById(id).then(res => setAdmission(res.data)).catch(() => message.error('Failed to load'));
    ipAPI.getBills({ admission: id, limit: 1 }).then(res => setCounts(c => ({ ...c, bills: res.data.total }))).catch(() => {});
    ipAPI.getCaseSheets({ admission: id, limit: 1 }).then(res => setCounts(c => ({ ...c, caseSheets: res.data.total }))).catch(() => {});
    ipAPI.getMonitoring({ admission: id }).then(res => setCounts(c => ({ ...c, monitoring: res.data.length }))).catch(() => {});
    pharmacyAPI.getBills({ admission: id, limit: 1 }).then(res => setCounts(c => ({ ...c, pharmacy: res.data.total }))).catch(() => {});
  }, [id]);

  if (!admission) return <Card loading />;

  const cardStyle = { borderRadius: 10, textAlign: 'center', cursor: 'pointer', height: '100%' };

  const sections = [
    { label: 'IP Billing', icon: <DollarOutlined style={{ fontSize: 28, color: '#2563EB' }} />, count: counts.bills, path: `/ip/bills?admission=${id}` },
    { label: 'IP Case Sheet', icon: <FileTextOutlined style={{ fontSize: 28, color: '#0891B2' }} />, count: counts.caseSheets, path: `/ip/case-sheets?admission=${id}` },
    { label: 'Monitoring', icon: <HeartOutlined style={{ fontSize: 28, color: '#DC2626' }} />, count: counts.monitoring, path: `/ip/monitoring?admission=${id}` },
    { label: 'IP Pharmacy', icon: <ShopOutlined style={{ fontSize: 28, color: '#D97706' }} />, count: counts.pharmacy, path: `/ip/pharmacy?admission=${id}` },
    { label: 'Discharge Summary', icon: <FileDoneOutlined style={{ fontSize: 28, color: '#7C3AED' }} />, count: admission.dischargeSummary ? 1 : 0, path: `/ip/discharge?admission=${id}` },
  ];

  return (
    <div>
      <Card style={{ borderRadius: 10, marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} style={{ margin: 0 }}>
              {admission.patient?.name}
              <Tag color="blue" style={{ marginLeft: 8 }}>{admission.admissionId}</Tag>
              <Tag color={admission.status === 'Admitted' ? 'green' : 'blue'}>{admission.status}</Tag>
            </Title>
            <Text type="secondary">{admission.patient?.patientId} • {admission.patient?.age} yrs • {admission.patient?.gender} • {admission.patient?.phone}</Text>
          </Col>
          <Col>
            <Space>
              <Button icon={<EditOutlined />} onClick={() => navigate(`/ip/admissions/${id}/edit`)}>Edit Admission</Button>
              {admission.status === 'Admitted' && (
                <Button type="primary" icon={<SendOutlined />} onClick={() => navigate(`/ip/discharge?admission=${id}`)}>Discharge</Button>
              )}
            </Space>
          </Col>
        </Row>
        <Divider style={{ margin: '12px 0' }} />
        <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="Admitted On">{dayjs(admission.admissionDate).format('DD/MM/YYYY hh:mm A')}</Descriptions.Item>
          <Descriptions.Item label="Type">{admission.admissionType}</Descriptions.Item>
          <Descriptions.Item label="Room Type">{admission.roomType || '-'}</Descriptions.Item>
          <Descriptions.Item label="Room Rate (Rs./day)">{admission.roomRate ? `Rs.${admission.roomRate}` : '-'}</Descriptions.Item>
          <Descriptions.Item label="Room Days">{admission.roomDays || '-'}</Descriptions.Item>
          {admission.roomCharge > 0 && (
            <Descriptions.Item label="Room Charge (incl. GST)">
              <Text strong style={{ color: '#16A34A' }}>Rs.{(admission.roomCharge).toFixed(2)}</Text>
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Doctor">{admission.consultant?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Billing Type">{admission.insuranceType}</Descriptions.Item>
          <Descriptions.Item label="Provisional Diagnosis">{admission.provisionalDiagnosis || '-'}</Descriptions.Item>
          {admission.status === 'Discharged' && (
            <Descriptions.Item label="Discharged On">{admission.dischargeDate ? dayjs(admission.dischargeDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
          )}
          {admission.status === 'Discharged' && (
            <Descriptions.Item label="Discharge Type">{admission.dischargeType || '-'}</Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Row gutter={[16, 16]}>
        {sections.map(s => (
          <Col xs={24} sm={12} md={8} lg={4} key={s.label}>
            <Card hoverable onClick={() => navigate(s.path)} style={cardStyle} bodyStyle={{ padding: 20 }}>
              {s.icon}
              <div style={{ fontSize: 18, fontWeight: 600, marginTop: 8 }}>{s.count}</div>
              <Text type="secondary">{s.label}</Text>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
