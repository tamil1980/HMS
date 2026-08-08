import { useState, useEffect } from 'react';
import { Card, Table, Tabs, Button, Modal, Form, Input, Select, InputNumber, Space, message, Popconfirm, Typography, Tag, Row, Col } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, BankOutlined, HomeOutlined, AppstoreOutlined } from '@ant-design/icons';
import { wardAPI } from '../services/api';

const { Title } = Typography;

export default function Wards() {
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [modalType, setModalType] = useState('ward');
  const [editing, setEditing] = useState(null);
  const [selectedWard, setSelectedWard] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const fetchWards = async () => {
    setLoading(true);
    try {
      const res = await wardAPI.getAllWards();
      setWards(res.data);
    } catch { message.error('Failed to load wards'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchWards(); }, []);

  const openModal = (type, rec) => {
    setModalType(type);
    setEditing(rec || null);
    form.resetFields();
    if (rec) form.setFieldsValue(rec);
    setModalOpen(true);
  };

  const handleSave = async (values) => {
    try {
      if (modalType === 'ward') {
        if (editing) { await wardAPI.updateWard(editing._id, values); message.success('Ward updated'); }
        else { await wardAPI.createWard(values); message.success('Ward created'); }
      } else if (modalType === 'room') {
        values.wardId = values.wardId || selectedWard;
        if (editing) { await wardAPI.updateRoom(editing._id, values); message.success('Room updated'); }
        else { await wardAPI.createRoom(values); message.success('Room created'); }
      } else {
        values.roomId = values.roomId || selectedRoom;
        if (editing) { await wardAPI.updateBed(editing._id, values); message.success('Bed updated'); }
        else { await wardAPI.createBed(values); message.success('Bed created'); }
      }
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
      fetchWards();
    } catch (err) { message.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (type, id) => {
    try {
      if (type === 'ward') await wardAPI.deleteWard(id);
      else if (type === 'room') await wardAPI.deleteRoom(id);
      else await wardAPI.deleteBed(id);
      message.success('Deleted');
      fetchWards();
    } catch (err) { message.error(err.response?.data?.message || 'Delete failed'); }
  };

  const wardColumns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'sno', width: 55, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{i + 1}</div> },
    { title: 'Ward Name', dataIndex: 'name', render: (t) => <><BankOutlined /> {t}</> },
    { title: 'Type', dataIndex: 'type', render: (t) => <Tag color="blue">{t}</Tag> },
    { title: 'Floor', dataIndex: 'floor' },
    { title: 'Rooms', key: 'rooms', render: (t, r) => r.rooms?.length || 0 },
    {
      title: 'Actions', key: 'actions', width: 200,
      render: (_, rec) => (
        <Space>
          <Button type="link" size="small" onClick={() => setSelectedWard(rec._id)}>View Rooms</Button>
          <Button type="text" icon={<EditOutlined />} onClick={() => openModal('ward', rec)} />
          <Popconfirm title="Delete this ward?" onConfirm={() => handleDelete('ward', rec._id)}>
            <Button danger type="text" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const rooms = selectedWard ? wards.find((w) => w._id === selectedWard)?.rooms || [] : [];

  const roomColumns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'sno', width: 55, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{i + 1}</div> },
    { title: 'Room Number', dataIndex: 'roomNumber', render: (t) => <><HomeOutlined /> {t}</> },
    { title: 'Type', dataIndex: 'type' },
    { title: 'Rate', dataIndex: 'rate', render: (t) => `₹${t}` },
    { title: 'Capacity', dataIndex: 'capacity' },
    {
      title: 'Actions', key: 'actions', width: 200,
      render: (_, rec) => (
        <Space>
          <Button type="link" size="small" onClick={() => setSelectedRoom(rec._id)}>View Beds</Button>
          <Button type="text" icon={<EditOutlined />} onClick={() => openModal('room', rec)} />
          <Popconfirm title="Delete this room?" onConfirm={() => handleDelete('room', rec._id)}>
            <Button danger type="text" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const beds = selectedRoom ? rooms.find((r) => r._id === selectedRoom)?.beds || [] : [];

  const bedColumns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'sno', width: 55, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{i + 1}</div> },
    { title: 'Bed Number', dataIndex: 'bedNumber', render: (t) => <><AppstoreOutlined /> {t}</> },
    {
      title: 'Status', dataIndex: 'status',
      render: (s) => {
        const color = { Available: 'green', Occupied: 'red', Maintenance: 'orange' }[s] || 'default';
        return <Tag color={color}>{s}</Tag>;
      },
    },
    {
      title: 'Actions', key: 'actions', width: 160,
      render: (_, rec) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => openModal('bed', rec)} />
          <Popconfirm title="Delete this bed?" onConfirm={() => handleDelete('bed', rec._id)}>
            <Button danger type="text" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card style={{ borderRadius: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Ward / Room / Bed Management</Title>
        <Space>
          <Button icon={<PlusOutlined />} onClick={() => openModal('ward', null)}>Add Ward</Button>
          {selectedWard && <Button icon={<PlusOutlined />} onClick={() => openModal('room', null)}>Add Room</Button>}
          {selectedRoom && <Button icon={<PlusOutlined />} onClick={() => openModal('bed', null)}>Add Bed</Button>}
        </Space>
      </div>

      <Tabs
        activeKey={selectedWard ? 'rooms' : 'wards'}
        onChange={(k) => {
          if (k === 'wards') { setSelectedWard(null); setSelectedRoom(null); }
        }}
        items={[
          {
            key: 'wards', label: 'Wards',
            children: <Table dataSource={wards} columns={wardColumns} rowKey="_id" loading={loading} />,
          },
          {
            key: 'rooms', label: 'Rooms', disabled: !selectedWard,
            children: (
              <>
                <Button type="link" onClick={() => { setSelectedWard(null); setSelectedRoom(null); }} style={{ marginBottom: 8 }}>
                  ← Back to wards
                </Button>
                <Table dataSource={rooms} columns={roomColumns} rowKey="_id" loading={loading} />
              </>
            ),
          },
          {
            key: 'beds', label: 'Beds', disabled: !selectedRoom,
            children: (
              <>
                <Button type="link" onClick={() => setSelectedRoom(null)} style={{ marginBottom: 8 }}>← Back to rooms</Button>
                <Table dataSource={beds} columns={bedColumns} rowKey="_id" loading={loading} />
              </>
            ),
          },
        ]}
      />

      <Modal
        title={`${editing ? 'Edit' : 'Add'} ${modalType === 'ward' ? 'Ward' : modalType === 'room' ? 'Room' : 'Bed'}`}
        open={modalOpen} onCancel={() => { setModalOpen(false); form.resetFields(); setEditing(null); }} footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          {modalType === 'ward' && (
            <Row gutter={12}>
              <Col span={12}><Form.Item name="name" label="Ward Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
              <Col span={12}>
                <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                  <Select options={['General', 'Semi-Private', 'Private', 'ICU', 'Emergency', 'Other'].map((t) => ({ value: t, label: t }))} />
                </Form.Item>
              </Col>
              <Col span={12}><Form.Item name="floor" label="Floor"><Input /></Form.Item></Col>
            </Row>
          )}
          {modalType === 'room' && (
            <>
              <Form.Item name="wardId" label="Ward" hidden={!!selectedWard} rules={[{ required: true }]}>
                <Select options={wards.map((w) => ({ value: w._id, label: w.name }))} />
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}><Form.Item name="roomNumber" label="Room Number" rules={[{ required: true }]}><Input /></Form.Item></Col>
                <Col span={12}>
                  <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                    <Select options={['General', 'Semi-Private', 'Private', 'ICU', 'Other'].map((t) => ({ value: t, label: t }))} />
                  </Form.Item>
                </Col>
                <Col span={12}><Form.Item name="rate" label="Rate / Day"><InputNumber min={0} style={{ width: '100%' }} addonBefore="₹" /></Form.Item></Col>
                <Col span={12}><Form.Item name="capacity" label="Capacity"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
              </Row>
            </>
          )}
          {modalType === 'bed' && (
            <>
              <Form.Item name="roomId" label="Room" hidden={!!selectedRoom} rules={[{ required: true }]}>
                <Select options={rooms.map((r) => ({ value: r._id, label: r.roomNumber }))} />
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}><Form.Item name="bedNumber" label="Bed Number" rules={[{ required: true }]}><Input /></Form.Item></Col>
                <Col span={12}>
                  <Form.Item name="status" label="Status" initialValue="Available">
                    <Select options={['Available', 'Occupied', 'Maintenance'].map((s) => ({ value: s, label: s }))} />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}
          <Space>
            <Button type="primary" htmlType="submit">Save</Button>
            <Button onClick={() => { setModalOpen(false); form.resetFields(); setEditing(null); }}>Cancel</Button>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
}
