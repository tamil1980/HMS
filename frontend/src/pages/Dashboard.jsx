import { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Tag, Spin, Typography, List, Avatar } from 'antd';
import {
  UserOutlined, MedicineBoxOutlined, CalendarOutlined,
  DollarOutlined, RiseOutlined, FallOutlined,
  TeamOutlined, CheckCircleOutlined, ClockCircleOutlined,
  WarningOutlined, ExperimentOutlined, ShoppingCartOutlined, HomeOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  AreaChart, Area,
} from 'recharts';
import { dashboardAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const PIE_COLORS = ['#3b82f6', '#22c55e', '#ef4444', '#f97316', '#8b5cf6'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const cardStyle = { borderRadius: 12, border: 'none' };

const StatCard = ({ title, value, icon, color, bg, sub, onClick }) => (
  <Card hoverable={!!onClick} onClick={onClick} style={{ ...cardStyle, background: bg }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <Text style={{ color: '#ffffffb3', fontSize: 13 }}>{title}</Text>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', marginTop: 4 }}>{value}</div>
        {sub && <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 4 }}>{sub}</div>}
      </div>
      <Avatar size={48} icon={icon} style={{ backgroundColor: 'rgba(255,255,255,0.2)', fontSize: 22 }} />
    </div>
  </Card>
);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    dashboardAPI.getStats().then(res => {
      setStats(res.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;

  const statusColors = { Scheduled: '#3b82f6', Completed: '#22c55e', Cancelled: '#ef4444', 'No-Show': '#f97316' };

  const pieData = stats.statusCounts?.filter(s => s.count > 0).map(s => ({ name: s._id, value: s.count })) || [];

  const columns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'sno', width: 45, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{i + 1}</div> },
    { title: 'Patient', dataIndex: ['patient', 'name'], key: 'patient', render: (text) => <span style={{ fontWeight: 500 }}>{text}</span> },
    { title: 'Doctor', dataIndex: ['consultant', 'name'], key: 'consultant' },
    { title: 'Date', dataIndex: 'appointmentDate', key: 'date', render: (d) => dayjs(d).format('DD/MM/YYYY') },
    { title: 'Time', dataIndex: 'appointmentTime', key: 'time' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={statusColors[s]} style={{ border: 'none', fontWeight: 500 }}>{s}</Tag> },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>Dashboard</Title>
        <Text type="secondary">{dayjs().format('dddd, DD MMM YYYY')}</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <StatCard title="Total Patients" value={stats.totalPatients} icon={<TeamOutlined />} color="#2563EB" bg="linear-gradient(135deg,#2563EB,#1d4ed8)" onClick={() => navigate('/op-registration')} />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard title="Consultants" value={stats.totalConsultants} icon={<MedicineBoxOutlined />} color="#7C3AED" bg="linear-gradient(135deg,#7C3AED,#6d28d9)" onClick={() => navigate('/consultants')} />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard title="Today's Appointments" value={stats.todayAppointments} icon={<CalendarOutlined />} color="#059669" bg="linear-gradient(135deg,#059669,#047857)" onClick={() => navigate('/appointments')} />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard title="Today's Revenue" value={stats.todayRevenue} icon={<DollarOutlined />} color="#D97706" bg="linear-gradient(135deg,#D97706,#b45309)" />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <StatCard title="Lab Bills (Today)" value={stats.labBillsToday} icon={<ExperimentOutlined />} color="#DB2777" bg="linear-gradient(135deg,#DB2777,#be185d)" onClick={() => navigate('/lab/bills')} />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard title="Lab Revenue (Today)" value={stats.labRevenueToday} icon={<DollarOutlined />} color="#E11D48" bg="linear-gradient(135deg,#E11D48,#be123c)" />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard title="Pharmacy Bills (Today)" value={stats.pharmacyBillsToday} icon={<ShoppingCartOutlined />} color="#059669" bg="linear-gradient(135deg,#059669,#047857)" onClick={() => navigate('/pharmacy/bills')} />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard title="Pharmacy Revenue (Today)" value={stats.pharmacyRevenueToday} icon={<MedicineBoxOutlined />} color="#16A34A" bg="linear-gradient(135deg,#16A34A,#15803d)" sub={stats.pharmacyReturnsToday ? `Returns: -₹${stats.pharmacyReturnsToday}` : undefined} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <StatCard title="IP Patients (Admitted)" value={stats.activeAdmissions} icon={<HomeOutlined />} color="#DC2626" bg="linear-gradient(135deg,#DC2626,#b91c1c)" onClick={() => navigate('/ip/admissions')} />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard title="IP Revenue (Today)" value={stats.todayIP} icon={<DollarOutlined />} color="#0D9488" bg="linear-gradient(135deg,#0D9488,#0f766e)" />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard title="IP Revenue (Month)" value={stats.ipRevenueMonth} icon={<RiseOutlined />} color="#9333EA" bg="linear-gradient(135deg,#9333EA,#7e22ce)" />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24}>
          <Card title={<span><DollarOutlined style={{ marginRight: 6 }} />Monthly Revenue</span>} style={cardStyle}
            extra={<Tag color="blue">This Month: ₹{stats.monthlyRevenue}</Tag>}>
            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
              <Col xs={24} sm={12} md={4} lg={4}>
                <div style={{ background: '#eff6ff', borderRadius: 10, padding: '12px 16px' }}>
                  <Text type="secondary">Consultation</Text>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#2563EB' }}>₹{stats.monthlyRevenue}</div>
                </div>
              </Col>
              <Col xs={24} sm={12} md={4} lg={4}>
                <div style={{ background: '#fdf2f8', borderRadius: 10, padding: '12px 16px' }}>
                  <Text type="secondary">Lab</Text>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#DB2777' }}>₹{stats.labRevenueMonth}</div>
                </div>
              </Col>
              <Col xs={24} sm={12} md={4} lg={4}>
                <div style={{ background: '#ecfdf5', borderRadius: 10, padding: '12px 16px' }}>
                  <Text type="secondary">Pharmacy</Text>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#059669' }}>₹{stats.pharmacyRevenueMonth}</div>
                  {stats.pharmacyReturnsMonth ? <Text type="secondary" style={{ fontSize: 12 }}>Returns -₹{stats.pharmacyReturnsMonth}</Text> : null}
                </div>
              </Col>
              <Col xs={24} sm={12} md={4} lg={4}>
                <div style={{ background: '#eef2ff', borderRadius: 10, padding: '12px 16px' }}>
                  <Text type="secondary">Radiology</Text>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#6366F1' }}>₹{stats.radiologyRevenueMonth}</div>
                </div>
              </Col>
              <Col xs={24} sm={12} md={4} lg={4}>
                <div style={{ background: '#fef2f2', borderRadius: 10, padding: '12px 16px' }}>
                  <Text type="secondary">IP</Text>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#DC2626' }}>₹{stats.ipRevenueMonth}</div>
                </div>
              </Col>
            </Row>
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Text strong>Revenue by Department (This Month)</Text>
                <div style={{ marginTop: 12, height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Consultation', revenue: stats.monthlyRevenue },
                      { name: 'Lab', revenue: stats.labRevenueMonth },
                      { name: 'Pharmacy', revenue: stats.pharmacyRevenueMonth },
                      { name: 'Radiology', revenue: stats.radiologyRevenueMonth },
                      { name: 'IP', revenue: stats.ipRevenueMonth },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                        {[
                          { name: 'Consultation', c: '#2563EB' }, { name: 'Lab', c: '#DB2777' },
                          { name: 'Pharmacy', c: '#059669' }, { name: 'Radiology', c: '#6366F1' }, { name: 'IP', c: '#DC2626' },
                        ].map(e => <Cell key={e.name} fill={e.c} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Col>
              <Col xs={24} lg={12}>
                <Text strong>Collection Trend (This Year)</Text>
                <div style={{ marginTop: 12, height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.monthlyData.map(m => ({ name: MONTHS[m._id - 1] || m._id, revenue: m.total }))}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563EB" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} fill="url(#revGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card title={<span><RiseOutlined style={{ marginRight: 6 }} />Appointment Status (Today)</span>} style={cardStyle}>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} lg={10}>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {stats.statusCounts?.filter(s => s.count > 0).map(s => (
                    <div key={s._id} style={{ flex: 1, minWidth: 120, background: statusColors[s._id] + '18', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: statusColors[s._id] }}>{s.count}</div>
                      <Tag color={statusColors[s._id]} style={{ border: 'none', marginTop: 4 }}>{s._id}</Tag>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16, background: '#fff7ed', borderRadius: 10, padding: '14px 16px' }}>
                  <Text type="secondary">Scheduled (remaining today)</Text>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#f97316' }}>{stats.todayAppointments - stats.todayCompleted}</div>
                </div>
              </Col>
              <Col xs={24} lg={14}>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={105} dataKey="value" stroke="none">
                      {pieData.map((e, i) => <Cell key={e.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card title={<span><CalendarOutlined style={{ marginRight: 6 }} />Upcoming Appointments</span>} style={cardStyle}>
            <Table dataSource={stats.recentAppointments} columns={columns} rowKey="_id" pagination={false} size="small" />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title={<span><WarningOutlined style={{ marginRight: 6 }} />Quick Actions</span>} style={cardStyle}>
            <List size="small" dataSource={[
              { icon: <UserOutlined />, text: 'OP Registration', color: '#2563EB', link: '/op-registration' },
              { icon: <CalendarOutlined />, text: 'New Appointment', color: '#059669', link: '/appointments/new' },
              { icon: <MedicineBoxOutlined />, text: 'New Case Sheet', color: '#7C3AED', link: '/case-sheets/new' },
              { icon: <DollarOutlined />, text: 'New Invoice', color: '#D97706', link: '/invoices/new' },
              { icon: <ExperimentOutlined />, text: 'New Lab Bill', color: '#DB2777', link: '/lab/bills/new' },
              { icon: <ShoppingCartOutlined />, text: 'New Pharmacy Bill', color: '#059669', link: '/pharmacy/bills/new' },
            ]} renderItem={item => (
              <List.Item onClick={() => navigate(item.link)} style={{ cursor: 'pointer', borderRadius: 8, padding: '8px 12px' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <Avatar icon={item.icon} style={{ backgroundColor: item.color + '20', color: item.color }} />
                <Text style={{ marginLeft: 12, fontWeight: 500 }}>{item.text}</Text>
              </List.Item>
            )} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
