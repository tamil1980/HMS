import { useState, useEffect } from 'react';
import { Card, Form, Input, Select, DatePicker, Button, Row, Col, Divider, message, Typography, Table, Avatar } from 'antd';
import { UserOutlined, CalendarOutlined, SaveOutlined, SearchOutlined } from '@ant-design/icons';
import { patientAPI, appointmentAPI, consultantAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function OPRegistration() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [newPatient, setNewPatient] = useState(false);

  useEffect(() => {
    consultantAPI.getAll({ active: true }).then((res) => setDoctors(res.data)).catch(() => {});
  }, []);

  const handleSearch = async (value) => {
    setSearch(value);
    if (!value) { setPatients([]); return; }
    try {
      const res = await patientAPI.getAll({ search: value, limit: 10 });
      setPatients(res.data.patients || res.data);
    } catch { setPatients([]); }
  };

  const onFinish = async (values) => {
    setSaving(true);
    try {
      let patientId = selectedPatient?._id;
      if (!patientId && newPatient) {
        const created = await patientAPI.create({
          name: values.name,
          phone: values.phone,
          email: values.email,
          age: values.age,
          gender: values.gender,
          address: values.address,
          bloodGroup: values.bloodGroup,
        });
        patientId = created.data._id;
      }
      if (!patientId) return message.warning('Select an existing patient or register a new one');

      await appointmentAPI.create({
        patient: patientId,
        consultant: values.consultant,
        appointmentDate: values.appointmentDate.format('YYYY-MM-DD'),
        appointmentTime: values.appointmentTime,
        type: values.type || 'New',
        notes: values.notes,
      });
      message.success('OP registered & appointment booked');
      form.resetFields();
      setSelectedPatient(null);
      setNewPatient(false);
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name' },
    { title: 'Phone', dataIndex: 'phone' },
    { title: 'Age', dataIndex: 'age' },
    { title: 'Gender', dataIndex: 'gender' },
    {
      title: '', key: 'action', width: 60,
      render: (_, rec) => (
        <Button type="link" onClick={() => {
          setSelectedPatient(rec);
          setNewPatient(false);
          message.success(`Selected ${rec.name}`);
        }}>Select</Button>
      ),
    },
  ];

  return (
    <Card style={{ borderRadius: 10 }}>
      <Title level={4}>OP Registration</Title>
      <Row gutter={16}>
        <Col xs={24} lg={10}>
          <Divider orientation="left"><SearchOutlined /> Existing Patient</Divider>
          <Input.Search placeholder="Search by name / phone / patient id" onSearch={handleSearch} onChange={(e) => handleSearch(e.target.value)} />
          {patients.length > 0 && (
            <Table size="small" dataSource={patients} columns={columns} rowKey="_id" pagination={false} style={{ marginTop: 12 }} />
          )}
          {selectedPatient && (
            <div style={{ marginTop: 16, background: '#f0fdf4', borderRadius: 8, padding: 12 }}>
              <Text strong>Selected Patient</Text>
              <div><UserOutlined /> {selectedPatient.name} ({selectedPatient.patientId || '—'})</div>
              <div>{selectedPatient.phone} • Age {selectedPatient.age} • {selectedPatient.gender}</div>
              <Button size="small" type="link" onClick={() => { setSelectedPatient(null); setNewPatient(true); }}>
                Register a new patient instead
              </Button>
            </div>
          )}
          {!selectedPatient && (
            <Button size="small" type="link" onClick={() => setNewPatient(true)} style={{ marginTop: 8 }}>
              + Register New Patient
            </Button>
          )}
        </Col>
        <Col xs={24} lg={14}>
          <Divider orientation="left"><CalendarOutlined /> Book Appointment</Divider>
          <Form form={form} layout="vertical" onFinish={onFinish}>
            {newPatient && !selectedPatient && (
              <>
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="name" label="Patient Name" rules={[{ required: true, message: 'Name is required' }]}><Input /></Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="phone" label="Phone" rules={[{ required: true, message: 'Phone is required' }]}><Input /></Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="age" label="Age" rules={[{ required: true }]}><Input type="number" /></Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="gender" label="Gender" rules={[{ required: true }]}>
                      <Select options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' }]} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="bloodGroup" label="Blood Group">
                      <Select options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => ({ value: b, label: b }))} allowClear />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item name="email" label="Email"><Input type="email" /></Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item name="address" label="Address"><Input.TextArea rows={2} /></Form.Item>
                  </Col>
                </Row>
                <Divider />
              </>
            )}
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="consultant" label="Doctor" rules={[{ required: true }]}>
                  <Select showSearch optionFilterProp="label" options={doctors.map((d) => ({ value: d._id, label: `${d.name} (${d.specialization})` }))} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="appointmentDate" label="Date" rules={[{ required: true }]}>
                  <DatePicker style={{ width: '100%' }} disabledDate={(d) => d && d.isBefore(dayjs(), 'day')} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="appointmentTime" label="Time" rules={[{ required: true }]}>
                  <Select options={Array.from({ length: 24 }, (_, h) => Array.from({ length: 2 }, (_, m) =>
                    `${String(h).padStart(2, '0')}:${String(m * 30).padStart(2, '0')}`)).flat().map((t) => ({ value: t, label: t }))} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="type" label="Visit Type" initialValue="New">
                  <Select options={[{ value: 'New', label: 'New' }, { value: 'Follow-up', label: 'Follow-up' }]} />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="notes" label="Notes"><Input.TextArea rows={2} /></Form.Item>
              </Col>
            </Row>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving} size="large" block>
              Register OP & Book Appointment
            </Button>
          </Form>
        </Col>
      </Row>
    </Card>
  );
}
