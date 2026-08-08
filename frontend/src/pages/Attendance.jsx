import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, DatePicker, Space, message, Tag, Typography, Row, Col, Popconfirm, TimePicker } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, CheckSquareOutlined } from '@ant-design/icons';
import { employeeAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

const statuses = ['Present', 'Absent', 'Leave', 'Half-Day', 'Holiday'];
const statusColors = { Present: 'green', Absent: 'red', Leave: 'orange', 'Half-Day': 'blue', Holiday: 'default' };

export default function Attendance() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [dateFilter, setDateFilter] = useState(dayjs());
  const [form] = Form.useForm();
  const [bulkForm] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await employeeAPI.getAttendance({ date: dateFilter.format('YYYY-MM-DD') });
      setData(res.data);
    } catch { message.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    employeeAPI.getEmployees().then(res => setEmployees(res.data)).catch(() => {});
  }, [dateFilter]);

  const handleSave = async (values) => {
    try {
      const payload = {
        ...values,
        date: values.date ? values.date.format('YYYY-MM-DD') : dateFilter.format('YYYY-MM-DD'),
        inTime: values.inTime ? values.inTime.format('HH:mm') : undefined,
        outTime: values.outTime ? values.outTime.format('HH:mm') : undefined,
      };
      await employeeAPI.markAttendance(payload);
      message.success('Attendance saved');
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
      fetchData();
    } catch (err) { message.error(err.response?.data?.message || 'Failed'); }
  };

  const handleBulk = async (values) => {
    try {
      const res = await employeeAPI.markBulkAttendance({
        date: values.date.format('YYYY-MM-DD'),
        status: values.status,
        employeeIds: values.employeeIds,
      });
      message.success(res.data.message || 'Saved');
      setBulkOpen(false);
      bulkForm.resetFields();
      fetchData();
    } catch (err) { message.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    try {
      await employeeAPI.deleteAttendance(id);
      message.success('Record deleted');
      fetchData();
    } catch { message.error('Delete failed'); }
  };

  const openModal = (rec) => {
    setEditing(rec || null);
    form.resetFields();
    if (rec) {
      form.setFieldsValue({
        ...rec,
        date: dayjs(rec.date),
        inTime: rec.inTime ? dayjs(`2020-01-01T${rec.inTime}`) : undefined,
        outTime: rec.outTime ? dayjs(`2020-01-01T${rec.outTime}`) : undefined,
      });
    } else {
      form.setFieldsValue({ date: dateFilter, status: 'Present' });
    }
    setModalOpen(true);
  };

  const columns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'sno', width: 55, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{i + 1}</div> },
    { title: 'Emp ID', dataIndex: ['employee', 'employeeId'], render: (t) => <Tag color="geekblue">{t || '-'}</Tag> },
    { title: 'Name', dataIndex: ['employee', 'name'], render: (t) => t || '-' },
    { title: 'Designation', dataIndex: ['employee', 'designation'], render: (t) => t || '-' },
    { title: 'Date', dataIndex: 'date', render: (d) => dayjs(d).format('DD/MM/YYYY') },
    { title: 'In Time', dataIndex: 'inTime', render: (t) => t || '—' },
    { title: 'Out Time', dataIndex: 'outTime', render: (t) => t || '—' },
    { title: 'Status', dataIndex: 'status', render: (s) => <Tag color={statusColors[s]}>{s}</Tag> },
    {
      title: 'Actions', key: 'actions', width: 120,
      render: (_, rec) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => openModal(rec)} />
          <Popconfirm title="Delete record?" onConfirm={() => handleDelete(rec._id)}>
            <Button danger type="text" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card style={{ borderRadius: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Title level={4} style={{ margin: 0 }}>Staff Attendance</Title>
        <Space>
          <DatePicker value={dateFilter} onChange={setDateFilter} allowClear={false} />
          <Button icon={<CheckSquareOutlined />} onClick={() => setBulkOpen(true)}>Bulk Mark</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal(null)}>Mark Attendance</Button>
        </Space>
      </div>
      <Table dataSource={data} columns={columns} rowKey="_id" loading={loading} scroll={{ x: 800 }} />

      <Modal title={editing ? 'Edit Attendance' : 'Mark Attendance'} open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); setEditing(null); }} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="employeeId" label="Employee" rules={[{ required: true }]}>
            <Select showSearch placeholder="Select employee"
              filterOption={(input, option) => (option.children || '').toLowerCase().includes(input.toLowerCase())}>
              {employees.map(e => <Option key={e._id} value={e._id}>{e.name} - {e.designation}</Option>)}
            </Select>
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="date" label="Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                <Select options={statuses.map(s => ({ value: s, label: s }))} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="inTime" label="In Time"><TimePicker format="HH:mm" style={{ width: '100%' }} /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="outTime" label="Out Time"><TimePicker format="HH:mm" style={{ width: '100%' }} /></Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="Notes"><Input.TextArea rows={2} /></Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">Save</Button>
            <Button onClick={() => { setModalOpen(false); form.resetFields(); setEditing(null); }}>Cancel</Button>
          </Space>
        </Form>
      </Modal>

      <Modal title="Bulk Mark Attendance" open={bulkOpen}
        onCancel={() => { setBulkOpen(false); bulkForm.resetFields(); }} footer={null}>
        <Form form={bulkForm} layout="vertical" onFinish={handleBulk}
          initialValues={{ date: dateFilter, status: 'Present' }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="date" label="Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                <Select options={statuses.map(s => ({ value: s, label: s }))} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="employeeIds" label="Select Employees" rules={[{ required: true }]}>
            <Select mode="multiple" placeholder="Select employees" showSearch
              filterOption={(input, option) => (option.children || '').toLowerCase().includes(input.toLowerCase())}>
              {employees.map(e => <Option key={e._id} value={e._id}>{e.name} - {e.designation}</Option>)}
            </Select>
          </Form.Item>
          <Button type="primary" htmlType="submit">Save All</Button>
        </Form>
      </Modal>
    </Card>
  );
}
