import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, message, Space, Tabs, Select, Alert } from 'antd';
import { UserOutlined, LockOutlined, MedicineBoxOutlined, MailOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

const { Title, Text } = Typography;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [amcLock, setAmcLock] = useState(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
      message.success('Login successful');
      navigate('/dashboard');
    } catch (err) {
      const data = err.response?.data;
      if (data?.amcLocked) setAmcLock(data.message);
      else message.error(data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)' }}>
      <Card style={{ width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', borderRadius: 12 }}>
        <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
          <div>
            <svg width="90" height="90" viewBox="0 0 100 100" style={{ display: 'block', margin: '0 auto' }}>
              <circle cx="50" cy="50" r="48" fill="#2563EB" />
              <circle cx="50" cy="50" r="38" fill="#fff" />
              <rect x="42" y="20" width="16" height="60" rx="4" fill="#ef4444" />
              <rect x="20" y="42" width="60" height="16" rx="4" fill="#ef4444" />
            </svg>
            <Title level={3} style={{ margin: '12px 0 0' }}>VJS Soft Systems Hospital HMS</Title>
            <Text type="secondary">Sign in to your account</Text>
          </div>

          {amcLock && (
            <Alert
              type="error"
              showIcon
              icon={<LockOutlined />}
              message={amcLock}
              style={{ textAlign: 'left' }}
            />
          )}

          <Tabs
            centered
            items={[
              {
                key: 'login',
                label: 'Sign In',
                children: (
                  <Form name="login" onFinish={onFinish} layout="vertical" requiredMark={false}>
                    <Form.Item name="email" rules={[{ required: true, message: 'Please enter email' }]}>
                      <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
                    </Form.Item>
                    <Form.Item name="password" rules={[{ required: true, message: 'Please enter password' }]}>
                      <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
                    </Form.Item>
                    <Form.Item>
                      <Button type="primary" htmlType="submit" loading={loading} block size="large">
                        Sign In
                      </Button>
                    </Form.Item>
                  </Form>
                ),
              },
              {
                key: 'signup',
                label: 'Sign Up',
                children: <SignupForm onSuccess={() => navigate('/login')} />,
              },
            ]}
          />
        </Space>
      </Card>
    </div>
  );
}

function SignupForm({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleSignup = async (values) => {
    setLoading(true);
    try {
      await authAPI.register(values);
      message.success('Registration successful! Please sign in.');
      form.resetFields();
      onSuccess();
    } catch (err) {
      message.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form form={form} onFinish={handleSignup} layout="vertical" requiredMark={false}>
      <Form.Item name="name" rules={[{ required: true, message: 'Please enter name' }]}>
        <Input prefix={<UserOutlined />} placeholder="Full Name" size="large" />
      </Form.Item>
      <Form.Item name="email" rules={[{ required: true, message: 'Please enter email' }]}>
        <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
      </Form.Item>
      <Form.Item name="password" rules={[{ required: true, message: 'Please enter password' }, { min: 6 }]}>
        <Input.Password prefix={<LockOutlined />} placeholder="Password (min 6 chars)" size="large" />
      </Form.Item>
      <Form.Item name="role" rules={[{ required: true, message: 'Please select role' }]}>
        <Select placeholder="Select Role" size="large">
          <Select.Option value="admin">Admin</Select.Option>
          <Select.Option value="staff">Staff</Select.Option>
        </Select>
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block size="large">
          Register
        </Button>
      </Form.Item>
    </Form>
  );
}
