import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card, Form, Input, InputNumber, Select, Button, DatePicker, message, Typography, Row, Col, Divider, Space, AutoComplete } from 'antd';
import { consultantAPI, ipAPI, pharmacyAPI, labAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;

export default function IPCaseSheetForm() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [admissions, setAdmissions] = useState([]);
  const [consultants, setConsultants] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [labTests, setLabTests] = useState([]);
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  useEffect(() => {
    ipAPI.getAdmissions({ limit: 100 }).then(res => setAdmissions(res.data.admissions)).catch(() => {});
    consultantAPI.getAll({ active: true }).then(res => setConsultants(res.data));
    pharmacyAPI.getMedicines({ active: true }).then(res => setMedicines(res.data)).catch(() => {});
    labAPI.getTests({ active: true }).then(res => setLabTests(res.data)).catch(() => {});

    if (isEdit) {
      ipAPI.getCaseSheetById(id).then(res => {
        const d = res.data;
        form.setFieldsValue({
          ...d,
          admission: d.admission?._id,
          consultant: d.consultant?._id,
          date: d.date ? dayjs(d.date) : dayjs(),
          prescriptions: d.prescriptions || [],
          investigations: d.investigations || [],
          vitals: d.vitals || {},
        });
      }).catch(() => message.error('Failed to load'));
    } else {
      const qAdmission = params.get('admission');
      if (qAdmission) form.setFieldValue('admission', qAdmission);
      form.setFieldValue('shift', 'Morning');
    }
  }, [id]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const payload = { ...values, date: values.date?.toISOString() };
      if (isEdit) { await ipAPI.updateCaseSheet(id, payload); message.success('Updated'); }
      else { await ipAPI.createCaseSheet(payload); message.success('Case sheet created, stock reduced'); }
      navigate('/ip/case-sheets');
    } catch (err) { message.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <Card style={{ borderRadius: 10, maxWidth: 950, margin: '0 auto' }}>
      <Title level={4}>{isEdit ? 'Edit IP Case Sheet' : 'New IP Case Sheet'}</Title>
      <Form form={form} layout="vertical" onFinish={onFinish}
        initialValues={{ date: dayjs(), shift: 'Morning', prescriptions: [], investigations: [], vitals: {} }}>
        <Row gutter={16}>
          <Col xs={24} sm={10}>
            <Form.Item name="admission" label="Admission" rules={[{ required: true }]}>
              <Select showSearch placeholder="Select admission..." filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
                {admissions.map(a => <Select.Option key={a._id} value={a._id}>{a.admissionId} - {a.patient?.name}</Select.Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={6}>
            <Form.Item name="consultant" label="Doctor">
              <Select showSearch placeholder="Select doctor..." allowClear filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
                {consultants.map(c => <Select.Option key={c._id} value={c._id}>{c.name}</Select.Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={12} sm={4}>
            <Form.Item name="date" label="Date"><DatePicker style={{ width: '100%' }} /></Form.Item>
          </Col>
          <Col xs={12} sm={4}>
            <Form.Item name="shift" label="Shift">
              <Select options={['Morning', 'Evening', 'Night'].map(s => ({ value: s, label: s }))} />
            </Form.Item>
          </Col>
        </Row>

        <Divider>Vitals</Divider>
        <Row gutter={8}>
          {['temperature', 'pulse', 'bloodPressure', 'respiration', 'spo2', 'weight'].map(f => (
            <Col span={4} key={f}>
              <Form.Item name={['vitals', f]} label={f.charAt(0).toUpperCase() + f.slice(1)}><Input size="small" /></Form.Item>
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
                  <AutoComplete placeholder="Test name"
                    options={labTests.map(t => ({ value: t.name, label: t.name }))}
                    filterOption={(input, option) => option.value.toLowerCase().includes(input.toLowerCase())} />
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
                    <Select showSearch placeholder="Select medicine" filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
                      {medicines.map(m => <Select.Option key={m._id} value={m.name}>{m.name} {m.quantity != null ? `[Qty: ${m.quantity}]` : ''}</Select.Option>)}
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
          <Col span={12}><Form.Item name="treatmentPlan" label="Treatment Plan"><TextArea rows={3} /></Form.Item></Col>
          <Col span={12}><Form.Item name="notes" label="Notes"><TextArea rows={3} /></Form.Item></Col>
        </Row>

        <Divider />
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>{isEdit ? 'Update' : 'Create'}</Button>
          <Button onClick={() => navigate('/ip/case-sheets')}>Cancel</Button>
        </Space>
      </Form>
    </Card>
  );
}
