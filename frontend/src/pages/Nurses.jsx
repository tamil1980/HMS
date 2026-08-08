import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Space, message, Popconfirm, Typography, Tag, DatePicker, Row, Col } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, HeartOutlined } from '@ant-design/icons';
import { nurseAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function Nurses() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const fetchNurses = async () => {
    setLoading(true);
    try {
      const res = await nurseAPI.getNurses();
      setData(res.data);
    } catch { message.error('Failed to load nurses'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchNurses(); }, []);

  const handleSave = async (values) => {
    try {
      if (editing) {
        await nurseAPI.update(editing._id, values);
        message.success('Nurse updated');
      } else {
        await nurseAPI.create(values);
        message.success('Nurse created');
      }
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
      fetchNurses();
    } catch (err) { message.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    try {
      await nurseAPI.remove(id);
      message.success('Nurse deleted');
      fetchNurses();
    } catch { message.error('Delete failed'); }
  };

  const openModal = (rec) => {
    setEditing(rec || null);
    form.resetFields();
    if (rec) form.setFieldsValue({ ...rec, joinDate: rec.joinDate ? dayjs(rec.joinDate) : null });
    setModalOpen(true);
  };

  const columns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'sno', width: 55, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{i + 1}</div> },
    { title: 'Nurse ID', dataIndex: 'nurseId', render: (t) => <Tag color="magenta">{t || '—'}</Tag> },
    { title: 'Name', dataIndex: 'name', render: (t) => <><HeartOutlined /> {t}</> },
    { title: 'Code', dataIndex: 'code' },
    { title: 'Qualification', dataIndex: 'qualification' },
    { title: 'Department', dataIndex: 'department' },
    { title: 'Phone', dataIndex: 'phone' },
    {
      title: 'Actions', key: 'actions', width: 120,
      render: (_, rec) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => openModal(rec)} />
          <Popconfirm title="Delete this nurse?" onConfirm={() => handleDelete(rec._id)}>
            <Button danger type="text" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card style={{ borderRadius: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Nurse Management</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal(null)}>Add Nurse</Button>
      </div>
      <Table dataSource={data} columns={columns} rowKey="_id" loading={loading} />

      <Modal title={editing ? 'Edit Nurse' : 'Add Nurse'} open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); setEditing(null); }} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="name" label="Full Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="code" label="Staff Code"><Input /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="department" label="Department">
                <Select allowClear options={['ICU', 'General Ward', 'Emergency', 'OPD', 'Operation Theatre', 'Maternity'].map((d) => ({ value: d, label: d }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="qualification" label="Qualification"><Input /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="joinDate" label="Join Date"><DatePicker style={{ width: '100%' }} /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Phone" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Email"><Input type="email" /></Form.Item>
            </Col>
          </Row>
          <Space>
            <Button type="primary" htmlType="submit">Save</Button>
            <Button onClick={() => { setModalOpen(false); form.resetFields(); setEditing(null); }}>Cancel</Button>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
}
