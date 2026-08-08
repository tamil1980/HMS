import { useState, useEffect } from 'react';
import { Card, Table, DatePicker, Select, Button, message, Typography, Tag, Space, Input } from 'antd';
import { CalendarOutlined, DeleteOutlined } from '@ant-design/icons';
import { nurseAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function NurseDuty() {
  const [date, setDate] = useState(dayjs());
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(false);
  const [shifts, setShifts] = useState({});

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const res = await nurseAPI.getDuties({ date: date.format('YYYY-MM-DD') });
      setSchedule(res.data);
      const map = {};
      for (const row of res.data) {
        for (const d of row.duties) map[`${row.nurse._id}-${d.shift}`] = d;
      }
      setShifts(map);
    } catch { message.error('Failed to load schedule'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSchedule(); }, [date]);

  const handleShift = async (nurseId, shift) => {
    try {
      await nurseAPI.setDuty({ nurseId, date: date.format('YYYY-MM-DD'), shift, ward: 'General Ward' });
      message.success(`Duty set for ${shift} shift`);
      fetchSchedule();
    } catch (err) { message.error(err.response?.data?.message || 'Failed'); }
  };

  const handleRemove = async (nurseId, shift) => {
    try {
      await nurseAPI.removeDuty({ nurseId, date: date.format('YYYY-MM-DD'), shift });
      message.success('Duty removed');
      fetchSchedule();
    } catch (err) { message.error('Remove failed'); }
  };

  const columns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'sno', width: 55, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{i + 1}</div> },
    { title: 'Nurse', dataIndex: ['nurse', 'name'] },
    { title: 'Department', dataIndex: ['nurse', 'department'] },
    { title: 'Phone', dataIndex: ['nurse', 'phone'] },
    {
      title: 'Morning', key: 'morning',
      render: (_, rec) => (
        <ShiftCell shift={shifts[`${rec.nurse._id}-Morning`]} onSet={() => handleShift(rec.nurse._id, 'Morning')} onRemove={() => handleRemove(rec.nurse._id, 'Morning')} />
      ),
    },
    {
      title: 'Evening', key: 'evening',
      render: (_, rec) => (
        <ShiftCell shift={shifts[`${rec.nurse._id}-Evening`]} onSet={() => handleShift(rec.nurse._id, 'Evening')} onRemove={() => handleRemove(rec.nurse._id, 'Evening')} />
      ),
    },
    {
      title: 'Night', key: 'night',
      render: (_, rec) => (
        <ShiftCell shift={shifts[`${rec.nurse._id}-Night`]} onSet={() => handleShift(rec.nurse._id, 'Night')} onRemove={() => handleRemove(rec.nurse._id, 'Night')} />
      ),
    },
  ];

  return (
    <Card style={{ borderRadius: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Title level={4} style={{ margin: 0 }}>Nurse Duty Schedule</Title>
        <Space>
          <DatePicker value={date} onChange={(d) => d && setDate(d)} />
          <Button icon={<CalendarOutlined />} onClick={fetchSchedule}>Refresh</Button>
        </Space>
      </div>
      <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
        Click a shift box to assign the nurse to that shift for {date.format('DD/MM/YYYY')}.
      </Text>
      <Table dataSource={schedule} columns={columns} rowKey={(r) => r.nurse._id} loading={loading} pagination={false} />
    </Card>
  );
}

function ShiftCell({ shift, onSet, onRemove }) {
  if (shift) {
    return (
      <Space size={4}>
        <Tag color="green">Assigned</Tag>
        <Button size="small" type="text" icon={<DeleteOutlined />} onClick={onRemove} />
      </Space>
    );
  }
  return <Button size="small" onClick={onSet}>Assign</Button>;
}
