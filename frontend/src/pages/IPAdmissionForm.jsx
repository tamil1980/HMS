import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Form, Input, InputNumber, Select, Button, DatePicker, message, Typography, Row, Col, Divider, Space } from 'antd';
import { patientAPI, consultantAPI, ipAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;

export default function IPAdmissionForm() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [consultants, setConsultants] = useState([]);
  const [roomComponents, setRoomComponents] = useState([]);
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  useEffect(() => {
    patientAPI.getAll({ limit: 50 }).then(res => setPatients(res.data.patients));
    consultantAPI.getAll({ active: true }).then(res => setConsultants(res.data));
    ipAPI.getComponents({ category: 'Room', active: 'true' }).then(res => setRoomComponents(res.data)).catch(() => {});

    if (isEdit) {
      ipAPI.getAdmissionById(id).then(res => {
        const d = res.data;
        form.setFieldsValue({
          ...d,
          patient: d.patient?._id,
          consultant: d.consultant?._id,
          admissionDate: d.admissionDate ? dayjs(d.admissionDate) : dayjs(),
        });
      }).catch(() => message.error('Failed to load'));
    } else {
      form.setFieldsValue({ admissionDate: dayjs(), admissionType: 'General', insuranceType: 'Cash', roomRate: 0 });
    }
  }, [id]);

  const pickRoomComponent = (roomName) => {
    const comp = roomComponents.find(c => c.name === roomName);
    if (comp) form.setFieldValue('roomRate', comp.rate);
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        admissionDate: values.admissionDate?.toISOString(),
      };
      if (isEdit) { await ipAPI.updateAdmission(id, payload); message.success('Updated'); }
      else { await ipAPI.createAdmission(payload); message.success('Patient admitted'); }
      navigate('/ip/admissions');
    } catch (err) { message.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <Card style={{ borderRadius: 10, maxWidth: 900, margin: '0 auto' }}>
      <Title level={4}>{isEdit ? 'Edit IP Admission' : 'New IP Admission'}</Title>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="patient" label="Patient" rules={[{ required: true }]}>
              <Select showSearch placeholder="Search patient..." filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
                {patients.map(p => <Select.Option key={p._id} value={p._id}>{p.name} - {p.patientId}</Select.Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="consultant" label="Admitting Doctor">
              <Select showSearch allowClear placeholder="Select doctor..." filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
                {consultants.map(c => <Select.Option key={c._id} value={c._id}>{c.name}{c.specialization ? ` (${c.specialization})` : ''}</Select.Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="admissionDate" label="Admission Date"><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="admissionType" label="Admission Type">
              <Select options={['General', 'Emergency', 'Elective'].map(t => ({ value: t, label: t }))} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="referredBy" label="Referred By"><Input /></Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="roomType" label="Room Type" rules={[{ required: true, message: 'Select a room type' }]}>
              <Select showSearch allowClear placeholder="Select room type..." onChange={pickRoomComponent}
                filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
                {roomComponents.map(c => <Select.Option key={c._id} value={c.name}>{c.name} - Rs.{c.rate}/day</Select.Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="roomRate" label="Room Rate (Rs./day)" rules={[{ required: true, message: 'Enter room rate' }]}>
              <InputNumber min={0} step={10} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="insuranceType" label="Billing Type">
              <Select options={['Cash', 'Insurance', 'Corporate', 'Other'].map(t => ({ value: t, label: t }))} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="insuranceProvider" label="Insurance Provider"><Input /></Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="insuranceNumber" label="Insurance / Policy Number"><Input /></Form.Item>
          </Col>
        </Row>

        <Divider>Clinical</Divider>
        <Form.Item name="provisionalDiagnosis" label="Provisional Diagnosis"><TextArea rows={3} /></Form.Item>
        <Form.Item name="notes" label="Notes"><TextArea rows={2} /></Form.Item>

        <Divider />
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>{isEdit ? 'Update' : 'Admit Patient'}</Button>
          <Button onClick={() => navigate('/ip/admissions')}>Cancel</Button>
        </Space>
      </Form>
    </Card>
  );
}
