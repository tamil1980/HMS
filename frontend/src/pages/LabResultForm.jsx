import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Form, Input, Select, Button, DatePicker, message, Typography, Row, Col, Divider, Space, Table, InputNumber } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { patientAPI, labAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

export default function LabResultForm() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [bills, setBills] = useState([]);
  const [tests, setTests] = useState([]);
  const [items, setItems] = useState([]);
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const patientId = Form.useWatch('patient', form);

  useEffect(() => {
    patientAPI.getAll({ limit: 50 }).then(res => setPatients(res.data.patients));
    labAPI.getTests({}).then(res => setTests(res.data)).catch(() => {});
    if (isEdit) {
      labAPI.getResultById(id).then(res => {
        const d = res.data;
        form.setFieldsValue({
          patient: d.patient?._id,
          bill: d.bill?._id,
          referredBy: d.referredBy,
          resultDate: d.resultDate ? dayjs(d.resultDate) : dayjs(),
          sampleCollectedAt: d.sampleCollectedAt ? dayjs(d.sampleCollectedAt) : undefined,
          status: d.status,
          notes: d.notes,
        });
        setItems(d.tests?.map(t => ({ ...t, key: Date.now() + Math.random() })) || []);
        if (d.patient?._id) loadBills(d.patient._id);
      }).catch(() => message.error('Failed to load'));
    }
  }, [id]);

  const loadBills = async (pid) => {
    try {
      const res = await labAPI.getBills({ patient: pid, limit: 100 });
      setBills(res.data.bills);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (patientId && !isEdit) {
      loadBills(patientId);
      setBills([]);
      form.setFieldsValue({ bill: undefined });
    }
  }, [patientId]);

  const handleBillSelect = async (billId) => {
    if (!billId) return;
    try {
      const res = await labAPI.getBillById(billId);
      const prefilled = (res.data.items || []).map(it => ({
        test: it.test || undefined,
        name: it.name,
        category: it.category,
        result: '',
        unit: '',
        referenceRange: '',
        notes: '',
        status: 'Pending',
        key: Date.now() + Math.random(),
      }));
      setItems(prefilled);
      message.success(`Loaded ${prefilled.length} test(s) from ${res.data.billId}`);
    } catch { message.error('Failed to load bill'); }
  };

  const handleTestSelect = (index, testId) => {
    const test = tests.find(t => t._id === testId);
    if (test) {
      const newItems = [...items];
      newItems[index].test = test._id;
      newItems[index].name = test.name;
      newItems[index].category = test.category;
      newItems[index].unit = test.unit || newItems[index].unit || '';
      newItems[index].referenceRange = test.referenceRange || newItems[index].referenceRange || '';
      newItems[index].result = test.defaultResult || newItems[index].result || '';
      setItems(newItems);
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setItems([...items, { name: '', category: 'Test', result: '', unit: '', referenceRange: '', notes: '', status: 'Pending', key: Date.now() }]);
  };

  const resultStatus = (items.length && items.every(t => t.status === 'Completed')) ? 'Completed'
    : (items.length && items.some(t => t.status === 'Abnormal')) ? 'Abnormal' : 'Pending';

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        resultDate: values.resultDate?.toISOString(),
        sampleCollectedAt: values.sampleCollectedAt?.toISOString(),
        tests: items.map(({ key, ...it }) => it),
        status: values.status || resultStatus,
      };
      if (isEdit) { await labAPI.updateResult(id, payload); message.success('Updated'); }
      else { await labAPI.createResult(payload); message.success('Result saved'); }
      navigate('/lab/results');
    } catch (err) { message.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const itemColumns = [
    { title: '#', key: 'idx', width: 35, render: (_, __, i) => i + 1 },
    {
      title: 'Test', dataIndex: 'name', key: 'name', width: 170,
      render: (_, __, i) => (
        <Select value={items[i].test || undefined} onChange={(v) => handleTestSelect(i, v)} showSearch placeholder="Select test" allowClear style={{ width: '100%' }}
          filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
          {tests.map(t => <Option key={t._id} value={t._id}>{t.name}</Option>)}
        </Select>
      ),
    },
    { title: 'Result', key: 'result', width: 120, render: (_, __, i) => <Input value={items[i].result} onChange={e => updateItem(i, 'result', e.target.value)} /> },
    { title: 'Unit', key: 'unit', width: 80, render: (_, __, i) => <Input value={items[i].unit} onChange={e => updateItem(i, 'unit', e.target.value)} /> },
    { title: 'Reference Range', key: 'ref', width: 130, render: (_, __, i) => <Input value={items[i].referenceRange} onChange={e => updateItem(i, 'referenceRange', e.target.value)} /> },
    {
      title: 'Status', key: 'status', width: 110,
      render: (_, __, i) => (
        <Select value={items[i].status} onChange={v => updateItem(i, 'status', v)} style={{ width: '100%' }}
          options={['Pending', 'Completed', 'Abnormal'].map(s => ({ value: s, label: s }))} />
      ),
    },
    { title: 'Notes', key: 'notes', width: 120, render: (_, __, i) => <Input value={items[i].notes} onChange={e => updateItem(i, 'notes', e.target.value)} /> },
    { title: '', key: 'del', width: 35, render: (_, __, i) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeItem(i)} /> },
  ];

  return (
    <Card style={{ borderRadius: 10, maxWidth: 1200, margin: '0 auto' }}>
      <Title level={4}>{isEdit ? 'Edit Test Result' : 'New Test Result'}</Title>
      <Form form={form} layout="vertical" onFinish={onFinish}
        initialValues={{ resultDate: dayjs(), status: 'Pending' }}>
        <Row gutter={16}>
          <Col xs={24} md={6}>
            <Form.Item name="patient" label="Patient" rules={[{ required: true }]}>
              <Select showSearch placeholder="Search patient..."
                filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
                {patients.map(p => <Option key={p._id} value={p._id}>{p.name} - {p.patientId}</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={5}>
            <Form.Item name="bill" label="Load from Lab Bill">
              <Select showSearch placeholder="Optional: pick a bill" allowClear optionFilterProp="children"
                onChange={handleBillSelect}>
                {bills.map(b => <Option key={b._id} value={b._id}>{b.billId} - {dayjs(b.billDate).format('DD/MM/YYYY')}</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={12} md={3}>
            <Form.Item name="resultDate" label="Result Date"><DatePicker style={{ width: '100%' }} /></Form.Item>
          </Col>
          <Col xs={12} md={3}>
            <Form.Item name="sampleCollectedAt" label="Sample On"><DatePicker style={{ width: '100%' }} /></Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item name="referredBy" label="Referred By"><Input /></Form.Item>
          </Col>
          <Col xs={12} md={3}>
            <Form.Item name="status" label="Status">
              <Select options={['Pending', 'Completed', 'Abnormal'].map(s => ({ value: s, label: s }))} />
            </Form.Item>
          </Col>
        </Row>

        <Divider>Test Results</Divider>
        <Table dataSource={items} columns={itemColumns} rowKey="key" pagination={false} size="small" bordered scroll={{ x: 900 }} />
        <Button type="dashed" onClick={addItem} icon={<PlusOutlined />} block style={{ marginTop: 8 }}>Add Test</Button>

        <Divider />
        <Row gutter={16}>
          <Col xs={24} md={14}>
            <Form.Item name="notes" label="Remarks"><Input.TextArea rows={3} /></Form.Item>
          </Col>
          <Col xs={24} md={10}>
            <Card size="small" style={{ background: '#f9fafb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span>Auto Status:</span>
                <strong>{resultStatus}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Test Count:</span><strong>{items.length}</strong>
              </div>
            </Card>
          </Col>
        </Row>

        <Divider />
        <Space>
          <Button type="primary" htmlType="submit" loading={loading} size="large">{isEdit ? 'Update Result' : 'Save Result'}</Button>
          <Button onClick={() => navigate('/lab/results')} size="large">Cancel</Button>
        </Space>
      </Form>
    </Card>
  );
}
