import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Form, Input, InputNumber, Select, Button, DatePicker, message, Typography, Row, Col, Divider, Space, AutoComplete } from 'antd';
import { patientAPI, consultantAPI, appointmentAPI, caseSheetAPI, pharmacyAPI, labAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const formatTime = (t) => {
  if (!t) return '-';
  const m = String(t).match(/^(\d{1,2}):(\d{2})$/);
  if (m) {
    let h = parseInt(m[1], 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m[2]} ${ampm}`;
  }
  return t;
};

export default function CaseSheetForm() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [consultants, setConsultants] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [labTests, setLabTests] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  useEffect(() => {
    consultantAPI.getAll({ active: true }).then(res => setConsultants(res.data));
    patientAPI.getAll({ limit: 50 }).then(res => setPatients(res.data.patients));
    pharmacyAPI.getMedicines({ active: true }).then(res => setMedicines(res.data)).catch(() => {});
    labAPI.getTests({ active: true }).then(res => setLabTests(res.data)).catch(() => {});

    if (isEdit) {
      caseSheetAPI.getById(id).then(res => {
        const d = res.data;
        form.setFieldsValue({
          ...d,
          patient: d.patient?._id,
          consultant: d.consultant?._id,
          appointment: d.appointment?._id,
          date: d.date ? dayjs(d.date) : dayjs(),
          nextVisit: d.nextVisit ? dayjs(d.nextVisit) : null,
          prescriptions: d.prescriptions || [],
          investigations: d.investigations || [],
        });
        setSelectedPatient(d.patient);
        loadAppointments(d.patient?._id);
      }).catch(() => message.error('Failed to load'));
    } else {
      form.setFieldValue('date', dayjs());
    }
  }, [id]);

  const loadAppointments = async (patientId) => {
    if (patientId) {
      try {
        const res = await appointmentAPI.getByPatient(patientId);
        setAppointments(res.data);
      } catch { setAppointments([]); }
    }
  };

  const handlePatientChange = (value) => {
    form.setFieldValue('patient', value);
    setSelectedPatient(patients.find(p => p._id === value));
    loadAppointments(value);
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        date: values.date ? values.date.toISOString() : new Date().toISOString(),
        nextVisit: values.nextVisit ? values.nextVisit.toISOString() : null,
      };
      if (isEdit) { await caseSheetAPI.update(id, payload); message.success('Updated'); }
      else { await caseSheetAPI.create(payload); message.success('Case sheet created'); }
      navigate('/case-sheets');
    } catch (err) { message.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <Card style={{ borderRadius: 10, maxWidth: 900, margin: '0 auto' }}>
      <Title level={4}>{isEdit ? 'Edit Case Sheet' : 'New OP Case Sheet'}</Title>
      <Form form={form} layout="vertical" onFinish={onFinish}
        initialValues={{ date: dayjs(), prescriptions: [], investigations: [], vitals: {} }}>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="patient" label="Patient" rules={[{ required: true }]}>
              <Select showSearch placeholder="Search patient..." filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
                onChange={handlePatientChange}>
                {patients.map(p => <Option key={p._id} value={p._id}>{p.name} - {p.patientId}</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="consultant" label="Consultant" rules={[{ required: true }]}>
              <Select placeholder="Select consultant">
                {consultants.map(c => <Option key={c._id} value={c._id}>{c.name}</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="date" label="Date"><DatePicker style={{ width: '100%' }} /></Form.Item>
          </Col>
          <Col xs={24} sm={16}>
            <Form.Item name="appointment" label="Appointment (with timing)">
              <Select placeholder="Link appointment" allowClear
                onChange={(val) => {
                  const apt = appointments.find(a => a._id === val);
                  if (apt) {
                    form.setFieldValue('consultant', apt.consultant?._id);
                  }
                }}>
                {appointments.map(a => <Option key={a._id} value={a._id}>
                  {formatTime(a.appointmentTime)} • {dayjs(a.appointmentDate).format('DD/MM/YYYY')} • {a.consultant?.name || 'No doctor'}
                </Option>)}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Divider>Vitals</Divider>
        <Row gutter={8}>
          {['temperature', 'pulse', 'bp', 'respiration', 'spo2', 'weight', 'height'].map(f => (
            <Col xs={12} sm={8} md={3} key={f}>
              <Form.Item name={['vitals', f]} label={f.charAt(0).toUpperCase() + f.slice(1)}>
                <Input size="small" />
              </Form.Item>
            </Col>
          ))}
        </Row>

        <Divider>Clinical Details</Divider>
        <Row gutter={16}>
          <Col span={12}><Form.Item name="complaints" label="Complaints"><TextArea rows={3} /></Form.Item></Col>
          <Col span={12}><Form.Item name="history" label="History"><TextArea rows={3} /></Form.Item></Col>
          <Col span={12}><Form.Item name="examination" label="Examination"><TextArea rows={3} /></Form.Item></Col>
          <Col span={12}><Form.Item name="diagnosis" label="Diagnosis"><TextArea rows={3} /></Form.Item></Col>
        </Row>

        <Divider>Investigations</Divider>
        <Form.List name="investigations">
          {(fields, { add, remove }) => (<>
            {fields.map(({ key, name, ...rest }) => (
              <Row gutter={8} key={key} style={{ marginBottom: 8 }}>
                <Col span={8}><Form.Item {...rest} name={[name, 'name']}>
                  <AutoComplete
                    placeholder="Test name"
                    options={labTests.map(t => ({ value: t.name, label: t.name }))}
                    filterOption={(input, option) => option.value.toLowerCase().includes(input.toLowerCase())}
                  />
                </Form.Item></Col>
                <Col span={6}><Form.Item {...rest} name={[name, 'result']}><Input placeholder="Result" /></Form.Item></Col>
                <Col span={8}><Form.Item {...rest} name={[name, 'notes']}><Input placeholder="Notes" /></Form.Item></Col>
                <Col span={2}><Button danger onClick={() => remove(name)} style={{ marginTop: 4 }}>X</Button></Col>
              </Row>
            ))}
            <Button type="dashed" onClick={() => add()} block>+ Add Investigation</Button>
          </>)}
        </Form.List>

        <Divider>Prescription</Divider>
        <Form.List name="prescriptions">
          {(fields, { add, remove }) => (<>
            {fields.map(({ key, name, ...rest }) => (
              <Card key={key} size="small" style={{ marginBottom: 8 }}>
                <Row gutter={8}>
                  <Col span={6}><Form.Item {...rest} name={[name, 'medicine']} label="Medicine" rules={[{ required: true }]}>
                    <Select showSearch placeholder="Select medicine" filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
                      onChange={(val) => {
                        const med = medicines.find(m => m.name === val);
                        if (med) message.info(`In stock: ${med.quantity || 0}`);
                      }}>
                      {medicines.map(m => <Option key={m._id} value={m.name}>{m.name} {m.quantity != null ? `[Qty: ${m.quantity}]` : ''}</Option>)}
                    </Select>
                  </Form.Item></Col>
                  <Col span={3}><Form.Item {...rest} name={[name, 'dosage']} label="Dosage" rules={[{ required: true }]}><Input placeholder="e.g. 500mg" /></Form.Item></Col>
                  <Col span={3}><Form.Item {...rest} name={[name, 'frequency']} label="Frequency" rules={[{ required: true }]}><Input placeholder="e.g. 1-0-1" /></Form.Item></Col>
                  <Col span={2}><Form.Item {...rest} name={[name, 'duration']} label="Duration" rules={[{ required: true }]}><Input placeholder="5 days" /></Form.Item></Col>
                  <Col span={2}><Form.Item {...rest} name={[name, 'quantity']} label="Qty"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
                  <Col span={5}><Form.Item {...rest} name={[name, 'instructions']} label="Instructions"><Input /></Form.Item></Col>
                  <Col span={2}><Button danger onClick={() => remove(name)} style={{ marginTop: 24 }}>X</Button></Col>
                </Row>
              </Card>
            ))}
            <Button type="dashed" onClick={() => add({ route: 'Oral' })} block>+ Add Medicine</Button>
          </>)}
        </Form.List>

        <Divider />
        <Row gutter={16}>
          <Col span={12}><Form.Item name="advice" label="Advice"><TextArea rows={2} /></Form.Item></Col>
          <Col span={6}><Form.Item name="nextVisit" label="Next Visit"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
        </Row>

        <Divider />
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>{isEdit ? 'Update' : 'Create'}</Button>
          <Button onClick={() => navigate('/case-sheets')}>Cancel</Button>
        </Space>
      </Form>
    </Card>
  );
}
