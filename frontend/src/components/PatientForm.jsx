import { useState, useEffect } from 'react';
import { Form, Input, Select, DatePicker, Row, Col, Button, Space, message, Divider } from 'antd';
import { SaveOutlined, PlusOutlined, MinusCircleOutlined, UserOutlined } from '@ant-design/icons';
import { patientAPI } from '../services/api';
import dayjs from 'dayjs';

const { Option } = Select;

export default function PatientForm({ initial, onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      form.setFieldsValue({
        ...initial,
        dob: initial.dob ? dayjs(initial.dob) : undefined,
        medicalHistory: Array.isArray(initial.medicalHistory)
          ? initial.medicalHistory.map((m) => m.condition || m).join('\n')
          : '',
      });
    }
  }, [initial]);

  const handleFinish = async (values) => {
    setSaving(true);
    try {
      const payload = {
        ...values,
        dob: values.dob ? values.dob.format('YYYY-MM-DD') : undefined,
        guardians: (values.guardians || []).map((g) => ({
          name: g.name, relation: g.relation, phone: g.phone,
        })),
        medicalHistory: (values.medicalHistory || '')
          .split('\n').map((s) => s.trim()).filter(Boolean)
          .map((condition) => ({ condition })),
      };
      let res;
      if (initial) {
        res = await patientAPI.update(initial._id, payload);
        message.success('Patient updated');
      } else {
        res = await patientAPI.create(payload);
        message.success('Patient registered');
      }
      if (onSaved) onSaved(res.data);
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to save patient');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{ gender: 'Male' }}>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item name="name" label="Full Name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input prefix={<UserOutlined />} placeholder="Patient full name" />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="phone" label="Phone" rules={[{ required: true, message: 'Phone is required' }, { pattern: /^[0-9+\-\s]{10,15}$/, message: 'Invalid phone number' }]}>
            <Input placeholder="Mobile number" />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item name="age" label="Age" rules={[{ required: true, message: 'Age is required' }]}>
            <Input type="number" min={0} max={130} />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item name="gender" label="Gender" rules={[{ required: true }]}>
            <Select options={['Male', 'Female', 'Other'].map((g) => ({ value: g, label: g }))} />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item name="bloodGroup" label="Blood Group">
            <Select allowClear options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => ({ value: b, label: b }))} />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item name="dob" label="Date of Birth">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Invalid email' }]}>
            <Input placeholder="optional" />
          </Form.Item>
        </Col>
        <Col xs={24} md={24}>
          <Form.Item name="address" label="Address">
            <Input.TextArea rows={2} placeholder="Street, City, PIN" />
          </Form.Item>
        </Col>
      </Row>

      <Divider orientation="left">Guardians / Emergency Contacts</Divider>
      <Form.List name="guardians">
        {(fields, { add, remove }) => (
          <>
            {fields.map((field) => (
              <Row gutter={8} key={field.key} align="middle" style={{ marginBottom: 8 }}>
                <Col xs={24} md={8}>
                  <Form.Item name={[field.name, 'name']} rules={[{ required: true, message: 'Name' }]} style={{ marginBottom: 0 }}>
                    <Input placeholder="Guardian name" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={5}>
                  <Form.Item name={[field.name, 'relation']} rules={[{ required: true, message: 'Relation' }]} style={{ marginBottom: 0 }}>
                    <Input placeholder="Relation" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name={[field.name, 'phone']} rules={[{ required: true, message: 'Phone' }]} style={{ marginBottom: 0 }}>
                    <Input placeholder="Contact number" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={3}>
                  <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(field.name)} />
                </Col>
              </Row>
            ))}
            <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} block style={{ marginBottom: 16 }}>
              Add Guardian
            </Button>
          </>
        )}
      </Form.List>

      <Form.Item name="medicalHistory" label="Medical History">
        <Input.TextArea rows={3} placeholder="One condition per line (e.g. Diabetes since 2018&#10;Hypertension)" />
      </Form.Item>

      <Space>
        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving} size="large">
          {initial ? 'Update Patient' : 'Register Patient'}
        </Button>
        <Button size="large" onClick={() => form.resetFields()}>Reset</Button>
      </Space>
    </Form>
  );
}
