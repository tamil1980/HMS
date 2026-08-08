import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Form, Input, InputNumber, Select, Button, Switch, DatePicker, Space, message, Typography, Row, Col, Divider, TimePicker } from 'antd';
import { consultantAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const departments = [
  'General Medicine', 'General Surgery', 'Cardiology', 'Dermatology', 'Neurology',
  'Pediatrics', 'Orthopedics', 'Obstetrics & Gynecology', 'ENT (Ear, Nose, Throat)',
  'Ophthalmology', 'Psychiatry', 'Pulmonology', 'Nephrology', 'Urology',
  'Gastroenterology', 'Endocrinology', 'Hematology', 'Oncology', 'Rheumatology',
  'Anesthesiology', 'Radiology', 'Pathology', 'Emergency Medicine', 'Dentistry',
  'Physiotherapy', 'Dietetics & Nutrition', 'Geriatrics', 'Internal Medicine',
];

const specializations = [
  'General Physician', 'General Surgeon', 'Cardiologist', 'Dermatologist', 'Neurologist',
  'Pediatrician', 'Orthopedic Surgeon', 'Gynecologist', 'ENT Specialist', 'Ophthalmologist',
  'Psychiatrist', 'Pulmonologist', 'Nephrologist', 'Urologist', 'Gastroenterologist',
  'Endocrinologist', 'Hematologist', 'Oncologist', 'Rheumatologist', 'Anesthesiologist',
  'Radiologist', 'Pathologist', 'Emergency Physician', 'Dentist', 'Physiotherapist',
  'Diabetologist', 'Family Medicine', 'General Practitioner', 'Internal Medicine Physician',
];

const qualifications = [
  'MBBS', 'MD', 'MS', 'DM', 'MCh', 'DNB', 'BDS', 'MDS', 'BHMS', 'BAMS', 'BUMS',
  'BPT', 'MPT', 'FRCS', 'MRCP', 'MD (Internal Medicine)', 'MS (General Surgery)',
  'Diploma in Child Health', 'MD (Pediatrics)', 'MD (Cardiology)', 'MD (Radiology)',
  'Post Graduate Diploma', 'Fellowship',
];

export default function ConsultantForm() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  useEffect(() => {
    if (isEdit) {
      consultantAPI.getById(id).then(res => {
        const data = res.data;
        form.setFieldsValue({
          ...data,
          schedule: data.schedule?.map(s => ({
            ...s,
            startTime: s.startTime ? dayjs(s.startTime, 'HH:mm') : null,
            endTime: s.endTime ? dayjs(s.endTime, 'HH:mm') : null,
            breakStart: s.breakStart ? dayjs(s.breakStart, 'HH:mm') : null,
            breakEnd: s.breakEnd ? dayjs(s.breakEnd, 'HH:mm') : null,
          })) || [],
        });
      }).catch(() => message.error('Failed to load'));
    }
  }, [id]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        schedule: values.schedule?.map(s => ({
          ...s,
          startTime: s.startTime ? s.startTime.format('HH:mm') : null,
          endTime: s.endTime ? s.endTime.format('HH:mm') : null,
          breakStart: s.breakStart ? s.breakStart.format('HH:mm') : null,
          breakEnd: s.breakEnd ? s.breakEnd.format('HH:mm') : null,
        })) || [],
      };
      if (isEdit) { await consultantAPI.update(id, payload); message.success('Updated'); }
      else { await consultantAPI.create(payload); message.success('Created'); }
      navigate('/consultants');
    } catch (err) { message.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <Card style={{ borderRadius: 10, maxWidth: 800, margin: '0 auto' }}>
      <Title level={4}>{isEdit ? 'Edit Consultant' : 'Add Consultant'}</Title>
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ isActive: true, schedule: [], consultationFee: 0, followUpFee: 0 }}>
        <Row gutter={16}>
          <Col xs={24} sm={12}><Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
          <Col xs={24} sm={12}><Form.Item name="department" label="Department"><Select showSearch options={departments.map(d => ({ value: d, label: d }))} placeholder="Select Department" /></Form.Item></Col>
          <Col xs={24} sm={12}><Form.Item name="specialization" label="Specialization" rules={[{ required: true }]}><Select showSearch options={specializations.map(s => ({ value: s, label: s }))} placeholder="Select Specialization" /></Form.Item></Col>
          <Col xs={24} sm={12}><Form.Item name="qualification" label="Qualification"><Select showSearch allowClear options={qualifications.map(q => ({ value: q, label: q }))} placeholder="Select Qualification" /></Form.Item></Col>
          <Col xs={24} sm={12}><Form.Item name="phone" label="Phone" rules={[{ required: true }]}><Input /></Form.Item></Col>
          <Col xs={24} sm={12}><Form.Item name="email" label="Email"><Input type="email" /></Form.Item></Col>
          <Col xs={24} sm={6}><Form.Item name="consultationFee" label="Consultation Fee"><InputNumber min={0} prefix="₹" style={{ width: '100%' }} /></Form.Item></Col>
          <Col xs={24} sm={6}><Form.Item name="followUpFee" label="Follow-up Fee"><InputNumber min={0} prefix="₹" style={{ width: '100%' }} /></Form.Item></Col>
          <Col xs={24} sm={6}><Form.Item name="isActive" label="Active" valuePropName="checked"><Switch /></Form.Item></Col>
        </Row>

        <Divider>Schedule</Divider>
        <Form.List name="schedule">
          {(fields, { add, remove }) => (<>
            {fields.map(({ key, name, ...rest }) => (
              <Card key={key} size="small" style={{ marginBottom: 8 }}>
                <Row gutter={8} align="middle">
                  <Col span={4}><Form.Item {...rest} name={[name, 'day']} label="Day"><Select options={days.map(d => ({ value: d, label: d }))} /></Form.Item></Col>
                  <Col span={4}><Form.Item {...rest} name={[name, 'startTime']} label="Start"><TimePicker format="HH:mm" style={{ width: '100%' }} /></Form.Item></Col>
                  <Col span={4}><Form.Item {...rest} name={[name, 'endTime']} label="End"><TimePicker format="HH:mm" style={{ width: '100%' }} /></Form.Item></Col>
                  <Col span={3}><Form.Item {...rest} name={[name, 'maxPatients']} label="Max"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
                  <Col span={2}><Form.Item {...rest} name={[name, 'isAvailable']} label="Avail" valuePropName="checked"><Switch defaultChecked /></Form.Item></Col>
                  <Col span={2}><Button danger onClick={() => remove(name)} style={{ marginTop: 24 }}>X</Button></Col>
                </Row>
              </Card>
            ))}
            <Button type="dashed" onClick={() => add({ isAvailable: true, maxPatients: 20 })} block>+ Add Schedule</Button>
          </>)}
        </Form.List>

        <Divider />
        <Space><Button type="primary" htmlType="submit" loading={loading}>{isEdit ? 'Update' : 'Create'}</Button><Button onClick={() => navigate('/consultants')}>Cancel</Button></Space>
      </Form>
    </Card>
  );
}
