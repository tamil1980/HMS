import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Space, message, Popconfirm, Typography, Tag, Switch } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, UserOutlined } from '@ant-design/icons';
import { authAPI } from '../services/api';

const { Title } = Typography;

const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'lab', label: 'Lab Staff' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'staff', label: 'Staff' },
];

const roleColors = {
  admin: 'red', doctor: 'purple', nurse: 'magenta', receptionist: 'cyan',
  lab: 'geekblue', pharmacy: 'orange', accountant: 'gold', staff: 'blue',
};

export default function Users() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await authAPI.getUsers();
      setData(res.data);
    } catch { message.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    if (modalOpen) {
      if (editing) {
        form.setFieldsValue({
          name: editing.name,
          email: editing.email,
          phone: editing.phone,
          role: editing.role,
          isActive: editing.isActive !== false,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ role: 'staff', isActive: true });
      }
    }
  }, [modalOpen, editing]);

  const openCreate = () => { setEditing(null); setModalOpen(true); };

  const openEdit = (user) => { setEditing(user); setModalOpen(true); };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      const payload = {
        name: values.name,
        email: values.email,
        phone: values.phone,
        role: values.role,
        isActive: values.isActive,
      };
      if (values.password) payload.password = values.password;
      if (editing) {
        await authAPI.updateUser(editing._id, payload);
        message.success('User updated');
      } else {
        await authAPI.createStaff(payload);
        message.success('Staff user created');
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      fetchUsers();
    } catch (err) { message.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await authAPI.deleteUser(id);
      message.success('User deleted');
      fetchUsers();
    } catch { message.error('Delete failed'); }
  };

  const columns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'sno', width: 55, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{i + 1}</div> },
    { title: 'Name', dataIndex: 'name', key: 'name', render: (t) => <><UserOutlined /> {t}</> },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', render: (t) => t || '—' },
    {
      title: 'Role', dataIndex: 'role', key: 'role',
      render: (r) => <Tag color={roleColors[r] || 'blue'}>{r}</Tag>,
    },
    {
      title: 'Active', dataIndex: 'isActive',
      render: (v) => <Tag color={v !== false ? 'green' : 'default'}>{v !== false ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Actions', key: 'actions', width: 110,
      render: (_, rec) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(rec)} />
          <Popconfirm title="Delete this user?" onConfirm={() => handleDelete(rec._id)}>
            <Button danger type="text" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card style={{ borderRadius: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>User Management</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Staff</Button>
      </div>
      <Table dataSource={data} columns={columns} rowKey="_id" loading={loading} scroll={{ x: 800 }} />

      <Modal
        title={editing ? `Edit User - ${editing.name}` : 'Add Staff User'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null); form.resetFields(); }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true }, { type: 'email' }]}><Input /></Form.Item>
          <Form.Item name="phone" label="Phone" rules={[{ pattern: /^[0-9+\-\s]{10,15}$/, message: 'Invalid phone' }]}><Input /></Form.Item>
          {!editing && (
            <Form.Item name="password" label="Password" rules={[{ required: true }, { min: 6 }]}><Input.Password /></Form.Item>
          )}
          {editing && (
            <Form.Item name="password" label="New Password (leave blank to keep current)">
              <Input.Password autoComplete="new-password" />
            </Form.Item>
          )}
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select options={roleOptions} />
          </Form.Item>
          <Form.Item name="isActive" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={saving}>{editing ? 'Update User' : 'Create Staff'}</Button>
            <Button onClick={() => { setModalOpen(false); setEditing(null); form.resetFields(); }}>Cancel</Button>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
}
