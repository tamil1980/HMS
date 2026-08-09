import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Upload, message, Typography, Row, Col, Divider, Switch, InputNumber, Space, Tag, Alert } from 'antd';
import { UploadOutlined, SaveOutlined, WhatsAppOutlined, DisconnectOutlined, ThunderboltOutlined, SendOutlined } from '@ant-design/icons';
import { settingAPI, reminderAPI, BACKEND_ORIGIN } from '../services/api';

const { Title } = Typography;

const fullUrl = (url) => (url && url.startsWith('/uploads') ? `${BACKEND_ORIGIN}${url}` : url);

export default function Settings() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [wa, setWa] = useState(null);
  const [waLoading, setWaLoading] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMsg, setTestMsg] = useState('');

  useEffect(() => {
    settingAPI.get().then(res => {
      const data = res.data;
      form.setFieldsValue(data);
      if (data.logo) setLogoUrl(fullUrl(data.logo));
    }).catch(() => message.error('Failed to load settings'));

    const loadWa = () => {
      reminderAPI.getStatus().then(res => setWa(res.data)).catch(() => {});
    };
    loadWa();
    const timer = setInterval(loadWa, 4000);
    return () => clearInterval(timer);
  }, []);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await settingAPI.update(values);
      message.success('Settings saved');
    } catch (err) { message.error(err.response?.data?.message || 'Save failed'); }
    finally { setLoading(false); }
  };

  const handleLogoUpload = async (file) => {
    const formData = new FormData();
    formData.append('logo', file);
    try {
      const res = await settingAPI.uploadLogo(formData);
      setLogoUrl(fullUrl(res.data.logo));
      message.success('Logo uploaded');
    } catch { message.error('Upload failed'); }
    return false;
  };

  const handleConnect = async () => {
    setWaLoading(true);
    try {
      const res = await reminderAPI.connect();
      setWa(res.data);
    } catch (err) { message.error(err.response?.data?.message || 'Connect failed'); }
    finally { setWaLoading(false); }
  };

  const handleDisconnect = async () => {
    setWaLoading(true);
    try {
      const res = await reminderAPI.disconnect();
      setWa(res.data);
      message.success('WhatsApp disconnected');
    } catch (err) { message.error('Disconnect failed'); }
    finally { setWaLoading(false); }
  };

  const handleRunNow = async () => {
    try {
      const res = await reminderAPI.runNow();
      message.success(`Reminder check done: ${res.data.sent} sent`);
    } catch (err) { message.error('Run failed'); }
  };

  const handleSendTest = async () => {
    if (!testPhone) return message.warning('Enter a phone number');
    try {
      await reminderAPI.sendTest({ phone: testPhone, message: testMsg || 'Test message from Hospital' });
      message.success('Test message sent');
    } catch (err) { message.error(err.response?.data?.message || 'Send failed'); }
  };

  const waStatus = wa?.whatsapp;
  const waConnected = waStatus?.connected;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Title level={4}>Hospital Settings</Title>
      <Card style={{ borderRadius: 10, marginBottom: 16 }}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Divider>Hospital Information</Divider>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="hospitalName" label="Hospital Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="registrationNumber" label="Registration Number"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="phone" label="Phone"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="alternatePhone" label="Alternate Phone"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="email" label="Email"><Input type="email" /></Form.Item></Col>
            <Col span={12}><Form.Item name="website" label="Website"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="gstNumber" label="GST Number"><Input /></Form.Item></Col>
            <Col span={24}><Form.Item name="address" label="Address"><Input.TextArea rows={3} /></Form.Item></Col>
          </Row>

          <Divider>Logo</Divider>
          <Upload beforeUpload={handleLogoUpload} showUploadList={false} accept="image/*">
            <Button icon={<UploadOutlined />}>Upload Logo</Button>
          </Upload>
          {logoUrl && (
            <img src={logoUrl} alt="Hospital Logo" style={{ maxWidth: 200, marginTop: 8, display: 'block' }} />
          )}

          <Divider>Configuration</Divider>
          <Row gutter={16}>
            <Col span={6}><Form.Item name="currencySymbol" label="Currency Symbol"><Input /></Form.Item></Col>
            <Col span={6}><Form.Item name="defaultConsultationFee" label="Default Fee"><InputNumber min={0} prefix="₹" style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={6}><Form.Item name="taxRate" label="Default Tax Rate (%)"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={6}><Form.Item name="timeZone" label="Time Zone"><Input /></Form.Item></Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}><Form.Item name="invoicePrefix" label="Invoice Prefix"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="patientPrefix" label="Patient Prefix"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="appointmentPrefix" label="Appointment Prefix"><Input /></Form.Item></Col>
          </Row>

          <Row gutter={16}>
            <Col span={6}><Form.Item name="whatsappEnabled" label="WhatsApp Enabled" valuePropName="checked"><Switch /></Form.Item></Col>
            <Col span={6}><Form.Item name="smsEnabled" label="SMS Enabled" valuePropName="checked"><Switch /></Form.Item></Col>
          </Row>

          <Divider>Appointment Reminders</Divider>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="Automatic WhatsApp reminders are sent to the patient's mobile number before their appointment time."
          />
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="appointmentReminderEnabled" label="Send Reminders" valuePropName="checked">
                <Switch checkedChildren="On" unCheckedChildren="Off" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="reminderBeforeMinutes" label="Minutes Before Appointment">
                <InputNumber min={5} max={10080} style={{ width: '100%' }} addonAfter="min" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label=" " colon={false}>
                <Space>
                  <Button icon={<ThunderboltOutlined />} onClick={handleRunNow}>Run Check Now</Button>
                  <Button onClick={onFinish} htmlType="submit" loading={loading} icon={<SaveOutlined />}>Save Settings</Button>
                </Space>
              </Form.Item>
            </Col>
          </Row>

          <Divider>WhatsApp Connection</Divider>
          {waStatus && (
            <div style={{ marginBottom: 16 }}>
              {waConnected ? (
                <Tag color="green">Connected{waStatus.phone ? ` as ${waStatus.phone}` : ''}</Tag>
              ) : waStatus.qr ? (
                <Tag color="orange">Scan the QR code below</Tag>
              ) : (
                <Tag color="red">Not connected - {waStatus.state}</Tag>
              )}
              {waStatus.lastError && <div style={{ color: '#cf1322', marginTop: 8 }}>Error: {waStatus.lastError}</div>}
            </div>
          )}
          {waStatus?.qr && (
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <img src={waStatus.qr} alt="WhatsApp QR" style={{ width: 220, height: 220, border: '1px solid #d9d9d9', borderRadius: 8 }} />
              <div style={{ marginTop: 8, color: '#888' }}>Open WhatsApp on your phone, go to Menu &gt; Linked devices &gt; Link a device and scan this code.</div>
            </div>
          )}
          <Space wrap>
            {!waConnected && (
              <Button type="primary" loading={waLoading} icon={<WhatsAppOutlined />} onClick={handleConnect}>Connect WhatsApp</Button>
            )}
            {waConnected && (
              <Button loading={waLoading} danger icon={<DisconnectOutlined />} onClick={handleDisconnect}>Disconnect</Button>
            )}
            <Space style={{ marginLeft: waConnected ? 0 : 24 }}>
              <Input placeholder="Patient phone e.g. 9876543210" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} style={{ width: 180 }} />
              <Input placeholder="Message (optional)" value={testMsg} onChange={(e) => setTestMsg(e.target.value)} style={{ width: 220 }} />
              <Button icon={<SendOutlined />} onClick={handleSendTest}>Send Test</Button>
            </Space>
          </Space>

          <Divider>Footer / Receipt Footer</Divider>
          <Form.Item name="footer" label="Footer Text"><Input.TextArea rows={3} /></Form.Item>

          <Divider />
          <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />} size="large">Save Settings</Button>
        </Form>
      </Card>
    </div>
  );
}
