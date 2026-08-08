import { useState, useEffect } from 'react';
import { Card, Table, Row, Col, Statistic, Tag, Typography, DatePicker, Select, Tabs, Empty, Spin } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { reportAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const COLORS = ['#3b82f6', '#22c55e', '#ef4444', '#f97316', '#8b5cf6'];

const SummaryCards = ({ summary }) => (
  <Row gutter={16} style={{ marginBottom: 20 }}>
    <Col xs={12} md={4}><Card size="small"><Statistic title="Bills" value={summary.totalBills} /></Card></Col>
    <Col xs={12} md={4}><Card size="small"><Statistic title="Billed" value={summary.totalBilled} prefix="₹" /></Card></Col>
    <Col xs={12} md={4}><Card size="small"><Statistic title="Collected" value={summary.totalCollected} prefix="₹" valueStyle={{ color: '#16a34a' }} /></Card></Col>
    <Col xs={12} md={4}><Card size="small"><Statistic title="Appointments" value={summary.appointments} /></Card></Col>
    <Col xs={6} md={4}><Card size="small"><Statistic title="New Patients" value={summary.newPatients} /></Card></Col>
    <Col xs={6} md={4}><Card size="small"><Statistic title="Admissions" value={summary.admissions} /></Card></Col>
  </Row>
);

const TypeBreakdown = ({ data }) => {
  const columns = [
    { title: 'Bill Type', dataIndex: '_id', render: (t) => <Tag color="blue">{t}</Tag> },
    { title: 'Bills', dataIndex: 'bills' },
    { title: 'Billed (₹)', dataIndex: 'billed' },
    { title: 'Collected (₹)', dataIndex: 'collected', render: (t) => <strong>₹{t}</strong> },
  ];
  return (
    <Card size="small" title="Revenue by Type" style={{ borderRadius: 10 }}>
      <Table dataSource={data} columns={columns} rowKey="_id" pagination={false} size="small" />
    </Card>
  );
};

const TrendChart = ({ data, dataKey, label }) => (
  <Card size="small" title={label} style={{ borderRadius: 10 }}>
    {data?.length ? (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="_id" />
          <YAxis />
          <Tooltip formatter={(v) => `₹${v}`} />
          <Bar dataKey={dataKey} fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    ) : <Empty description="No data" />}
  </Card>
);

const ModeSummary = ({ data }) => (
  <Card size="small" title="Collections by Mode" style={{ borderRadius: 10 }}>
    {data?.length ? (
      <Row gutter={[12, 12]}>
        {data.map(m => (
          <Col key={m._id} xs={12} md={8}>
            <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12 }}>
              <Tag color="geekblue">{m._id}</Tag>
              <div style={{ fontSize: 18, fontWeight: 700 }}>₹{m.amount || 0}</div>
              <Text type="secondary">{m.count || 0} payments</Text>
            </div>
          </Col>
        ))}
      </Row>
    ) : <Empty description="No data" />}
  </Card>
);

export default function Reports() {
  const [tab, setTab] = useState('daily');
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(dayjs());
  const [month, setMonth] = useState(dayjs().month() + 1);
  const [year, setYear] = useState(dayjs().year());
  const [data, setData] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      let res;
      if (tab === 'daily') res = await reportAPI.daily({ date: date.format('YYYY-MM-DD') });
      else if (tab === 'monthly') res = await reportAPI.monthly({ month, year });
      else res = await reportAPI.yearly({ year });
      setData(res.data);
    } catch { setData(null); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [tab, date, month, year]);

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: dayjs().month(i).format('MMMM') }));

  return (
    <Card style={{ borderRadius: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Title level={4} style={{ margin: 0 }}>Reports & Analytics</Title>
        {tab === 'daily' && <DatePicker value={date} onChange={setDate} allowClear={false} />}
        {tab === 'monthly' && (
          <div>
            <Select value={month} onChange={setMonth} options={monthOptions} style={{ width: 120, marginRight: 8 }} />
            <Select value={year} onChange={setYear} options={[dayjs().year() - 1, dayjs().year(), dayjs().year() + 1].map(y => ({ value: y, label: y }))} style={{ width: 90 }} />
          </div>
        )}
        {tab === 'yearly' && (
          <Select value={year} onChange={setYear} options={[dayjs().year() - 1, dayjs().year(), dayjs().year() + 1].map(y => ({ value: y, label: y }))} style={{ width: 90 }} />
        )}
      </div>

      <Tabs activeKey={tab} onChange={setTab} items={[
        { key: 'daily', label: 'Daily Report' },
        { key: 'monthly', label: 'Monthly Report' },
        { key: 'yearly', label: 'Yearly Report' },
      ]} />

      <Spin spinning={loading}>
        {data && (
          <>
            <SummaryCards summary={data} />
            <Row gutter={16}>
              <Col xs={24} lg={12}>
                <TypeBreakdown data={data.byType || []} />
              </Col>
              <Col xs={24} lg={12}>
                <ModeSummary data={data.byMode || []} />
              </Col>
            </Row>
            {tab === 'monthly' && (
              <div style={{ marginTop: 16 }}>
                <TrendChart data={data.daily || []} dataKey="total" label="Daily Collection Trend" />
              </div>
            )}
            {tab === 'yearly' && (
              <div style={{ marginTop: 16 }}>
                <TrendChart data={data.monthly || []} dataKey="total" label="Monthly Collection Trend" />
              </div>
            )}
          </>
        )}
      </Spin>
    </Card>
  );
}
