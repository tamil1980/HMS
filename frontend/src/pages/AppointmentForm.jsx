import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Form, Input, Select, Button, DatePicker, TimePicker, message, Typography, Row, Col, Divider } from 'antd';
import { patientAPI, consultantAPI, appointmentAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

const parseTime = (t) => {
  if (!t) return null;
  const f24 = dayjs(t, 'HH:mm');
  if (f24.isValid()) return f24;
  const f12 = dayjs(t, 'h:mm A');
  return f12.isValid() ? f12 : null;
};

export default function AppointmentForm() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [consultants, setConsultants] = useState([]);
  const [searchText, setSearchText] = useState('');
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  useEffect(() => {
    consultantAPI.getAll({ active: true }).then(res => setConsultants(res.data));
    if (isEdit) {
      appointmentAPI.getById(id).then(res => {
        const d = res.data;
        form.setFieldsValue({
          patient: d.patient?._id,
          consultant: d.consultant?._id,
          appointmentDate: d.appointmentDate ? dayjs(d.appointmentDate) : null,
          appointmentTime: parseTime(d.appointmentTime),
          type: d.type,
          status: d.status,
          notes: d.notes,
        });
      }).catch(() => message.error('Failed to load'));
    }
  }, [id]);

  const searchPatients = async (text) => {
    setSearchText(text);
    if (text) {
      const res = await patientAPI.getAll({ search: text, limit: 10 });
      setPatients(res.data.patients);
    } else {
      const res = await patientAPI.getAll({ limit: 10 });
      setPatients(res.data.patients);
    }
  };

  useEffect(() => { searchPatients(''); }, []);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        appointmentDate: values.appointmentDate.toISOString(),
        appointmentTime: values.appointmentTime ? values.appointmentTime.format('HH:mm') : undefined,
      };
      if (isEdit) { await appointmentAPI.update(id, payload); message.success('Updated'); }
      else { await appointmentAPI.create(payload); message.success('Appointment created'); }
      navigate('/appointments');
    } catch (err) { message.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <Card style={{ borderRadius: 10, maxWidth: 700, margin: '0 auto' }}>
      <Title level={4}>{isEdit ? 'Edit Appointment' : 'New Appointment'}</Title>
      <Form form={form} layout="vertical" onFinish={onFinish}
        initialValues={{ type: 'New', status: 'Scheduled' }}>
        <Form.Item name="patient" label="Patient" rules={[{ required: true, message: 'Select patient' }]}>
          <Select showSearch placeholder="Search patient..."
            filterOption={false} onSearch={searchPatients} notFoundContent={null}
            onFocus={() => searchPatients(searchText)}>
            {patients.map(p => (
              <Option key={p._id} value={p._id}>{p.name} - {p.patientId} ({p.phone})</Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="consultant" label="Doctor" rules={[{ required: true }]}>
          <Select placeholder="Select doctor">
            {consultants.map(c => (
              <Option key={c._id} value={c._id}>{c.name} - {c.specialization}</Option>
            ))}
          </Select>
        </Form.Item>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="appointmentDate" label="Date" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="appointmentTime" label="Time" rules={[{ required: true }]}>
              <TimePicker format="h:mm A" use12Hours minuteStep={5} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="type" label="Type">
              <Select options={[{ value: 'New', label: 'New' }, { value: 'Follow-up', label: 'Follow-up' }]} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="status" label="Status">
              <Select options={[
                { value: 'Scheduled', label: 'Scheduled' },
                { value: 'Completed', label: 'Completed' },
                { value: 'Cancelled', label: 'Cancelled' },
                { value: 'No-Show', label: 'No-Show' },
              ]} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="notes" label="Notes"><Input.TextArea rows={3} /></Form.Item>
        <Divider />
        <Button type="primary" htmlType="submit" loading={loading}>{isEdit ? 'Update' : 'Create'}</Button>
        <Button style={{ marginLeft: 8 }} onClick={() => navigate('/appointments')}>Cancel</Button>
      </Form>
    </Card>
  );
}
