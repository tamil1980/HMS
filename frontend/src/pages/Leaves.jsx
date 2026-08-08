import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, DatePicker, Space, message, Popconfirm, Typography, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, CheckOutlined, CloseOutlined, SearchOutlined } from '@ant-design/icons';
import { leaveAPI, consultantAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function Leaves() {
  const [data, setData] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await leaveAPI.getLeaves();
      setData(res.data);
    } catch { message.error('Failed to load leaves'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchLeaves();
    consultantAPI.getAll({ active: true }).then((res) => setDoctors(res.data)).catch(() => {});
  }, []);

  const handleSave = async (values) => {
    try {
      const payload = {
        ...values,
        startDate: values.startDate.format('YYYY-MM-DD'),
        endDate: values.endDate ? values.endDate.format('YYYY-MM-DD') : undefined,
      };
      if (editing) {
        await leaveAPI.update(editing._id, payload);
        message.success('Leave updated');
      } else {
        await leaveAPI.create(payload);
        message.success('Leave requested');
      }
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
      fetchLeaves();
    } catch (err) { message.error(err.response?.data?.message || 'Failed'); }
  };

  const handleStatus = async (rec, status) => {
    try {
      await leaveAPI.update(rec._id, { status });
      message.success(`Leave ${status.toLowerCase()}`);
      fetchLeaves();
    } catch { message.error('Failed'); }
  };

  const handleDelete = async (id) => {
    try {
      await leaveAPI.remove(id);
      message.success('Leave deleted');
      fetchLeaves();
    } catch { message.error('Delete failed'); }
  };

  const openModal = (rec) => {
    setEditing(rec || null);
    form.resetFields();
    if (rec) form.setFieldsValue({ ...rec, startDate: dayjs(rec.startDate), endDate: rec.endDate ? dayjs(rec.endDate) : null });
    setModalOpen(true);
  };

  const columns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'sno', width: 55, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{i + 1}</div> },
    { title: 'Doctor', dataIndex: ['doctor', 'name'], render: (t, r) => <>{t} <Tag>{r.doctor?.specialization}</Tag></> },
    { title: 'From', dataIndex: 'startDate', render: (d) => dayjs(d).format('DD/MM/YYYY') },
    { title: 'To', dataIndex: 'endDate', render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '—' },
    { title: 'Reason', dataIndex: 'reason' },
    {
      title: 'Status', dataIndex: 'status',
      render: (s) => {
        const color = { Pending: 'orange', Approved: 'green', Rejected: 'red', Cancelled: 'default' }[s] || 'default';
        return <Tag color={color}>{s}</Tag>;
      },
    },
    {
      title: 'Actions', key: 'actions', width: 200,
      render: (_, rec) => (
        <Space size={0}>
          <Button type="text" icon={<EditOutlined />} onClick={() => openModal(rec)} />
          {rec.status === 'Pending' && (
            <>
              <Button type="text" icon={<CheckOutlined />} style={{ color: '#16a34a' }} onClick={() => handleStatus(rec, 'Approved')} />
              <Button type="text" icon={<CloseOutlined />} style={{ color: '#dc2626' }} onClick={() => handleStatus(rec, 'Rejected')} />
            </>
          )}
          <Popconfirm title="Delete this leave?" onConfirm={() => handleDelete(rec._id)}>
            <Button danger type="text" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card style={{ borderRadius: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Doctor Leave</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal(null)}>Request Leave</Button>
      </div>
      <Table dataSource={data} columns={columns} rowKey="_id" loading={loading} />

      <Modal title={editing ? 'Edit Leave' : 'Request Leave'} open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); setEditing(null); }} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="doctorId" label="Doctor" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={doctors.map((d) => ({ value: d._id, label: d.name }))} />
          </Form.Item>
          <Space.Compact block>
            <Form.Item name="startDate" label="From" rules={[{ required: true }]} style={{ width: '50%', marginRight: 8 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="endDate" label="To" style={{ width: '50%' }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Space.Compact>
          <Form.Item name="reason" label="Reason"><Input.TextArea rows={2} /></Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">Save</Button>
            <Button onClick={() => { setModalOpen(false); form.resetFields(); setEditing(null); }}>Cancel</Button>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
}
