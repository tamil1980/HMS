import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Row, Col, Typography, Tag, Button, Form, Input, Select, DatePicker, message, Divider, Space, Table, Tooltip, Popconfirm, Empty, Modal } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FilePdfOutlined, PrinterOutlined } from '@ant-design/icons';
import { ipAPI, consultantAPI } from '../services/api';
import { downloadBlob, printPDF } from '../utils/pdf';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;

const conditions = ['Recovered', 'Improved', 'Stable', 'Referred', 'AMA', 'Expired'];

export default function IPDischargeSummary() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [admissions, setAdmissions] = useState([]);
  const [consultants, setConsultants] = useState([]);
  const [admission, setAdmission] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [params] = useSearchParams();

  useEffect(() => {
    ipAPI.getAdmissions({ limit: 100 }).then(res => setAdmissions(res.data.admissions)).catch(() => {});
    consultantAPI.getAll({ active: true }).then(res => setConsultants(res.data)).catch(() => {});
    const qAdmission = params.get('admission');
    if (qAdmission) setAdmission(qAdmission);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await ipAPI.getDischargeSummaries({ limit: 100 });
      setData(res.data.summaries);
    } catch { message.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldValue('dischargeDate', dayjs());
    if (admission) form.setFieldValue('admission', admission);
    setModalOpen(true);
  };

  const openEdit = (rec) => {
    setEditing(rec);
    form.setFieldsValue({
      ...rec,
      admission: rec.admission?._id,
      consultant: rec.consultant?._id,
      dischargeDate: rec.dischargeDate ? dayjs(rec.dischargeDate) : dayjs(),
      medicationsAtDischarge: rec.medicationsAtDischarge || [],
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      const payload = { ...values, dischargeDate: values.dischargeDate?.toISOString() };
      if (editing) { await ipAPI.updateDischarge(editing._id, payload); message.success('Updated'); }
      else { await ipAPI.createDischarge(payload); message.success('Discharge summary created'); }
      setModalOpen(false); fetchData();
    } catch (err) { message.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try { await ipAPI.removeDischarge(id); message.success('Deleted'); fetchData(); }
    catch { message.error('Delete failed'); }
  };

  const downloadPDF = async (rec) => {
    try {
      const res = await ipAPI.getDischargePDF(rec._id, true);
      downloadBlob(res, `DischargeSummary_${rec.summaryId || rec._id}_${rec.admission?.patient?.name || 'Unknown'}.pdf`);
    } catch { message.error('Download failed'); }
  };

  const print = async (rec) => {
    try { const res = await ipAPI.getDischargePDF(rec._id); printPDF(res); }
    catch { message.error('Print failed'); }
  };

  const columns = [
    { title: 'S.No', key: 'sno', width: 55, align: 'center', render: (t, r, i) => i + 1 },
    { title: 'Summary ID', dataIndex: 'summaryId', key: 'id' },
    { title: 'Admission', dataIndex: ['admission', 'admissionId'], key: 'adm', render: (t) => t || '-' },
    { title: 'Patient', dataIndex: ['admission', 'patient', 'name'], key: 'patient', render: (t) => t || '-' },
    { title: 'Discharge Date', dataIndex: 'dischargeDate', key: 'date', render: (d) => dayjs(d).format('DD/MM/YYYY') },
    { title: 'Final Diagnosis', dataIndex: 'finalDiagnosis', key: 'diag', ellipsis: true },
    { title: 'Condition', dataIndex: 'conditionAtDischarge', key: 'condition', render: (c) => c ? <Tag color="blue">{c}</Tag> : '-' },
    {
      title: 'Actions', key: 'actions', width: 160,
      render: (_, rec) => (
        <Space>
          <Tooltip title="Edit"><Button type="text" icon={<EditOutlined />} onClick={() => openEdit(rec)} /></Tooltip>
          <Tooltip title="Print"><Button type="text" icon={<PrinterOutlined />} onClick={() => print(rec)} /></Tooltip>
          <Tooltip title="Download PDF"><Button type="text" icon={<FilePdfOutlined />} onClick={() => downloadPDF(rec)} /></Tooltip>
          <Popconfirm title="Delete?" onConfirm={() => handleDelete(rec._id)}>
            <Tooltip title="Delete"><Button type="text" danger icon={<DeleteOutlined />} /></Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card style={{ borderRadius: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Title level={4} style={{ margin: 0 }}>IP Discharge Summaries</Title>
        <Space>
          <Select value={admission} onChange={setAdmission} placeholder="Select admission" style={{ width: 280 }} showSearch
            filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
            {admissions.map(a => <Select.Option key={a._id} value={a._id}>{a.admissionId} - {a.patient?.name}</Select.Option>)}
          </Select>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New Discharge Summary</Button>
        </Space>
      </div>
      <Table dataSource={data} columns={columns} rowKey="_id" loading={loading} scroll={{ x: 900 }} />

      <Modal title={editing ? 'Edit Discharge Summary' : 'New Discharge Summary'} open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} width={850}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={10}>
              <Form.Item name="admission" label="Admission" rules={[{ required: true }]}>
                <Select showSearch placeholder="Select admission..." filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
                  {admissions.map(a => <Select.Option key={a._id} value={a._id}>{a.admissionId} - {a.patient?.name}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={7}>
              <Form.Item name="dischargeDate" label="Discharge Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
            </Col>
            <Col span={7}>
              <Form.Item name="consultant" label="Doctor">
                <Select showSearch allowClear placeholder="Select doctor..." filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
                  {consultants.map(c => <Select.Option key={c._id} value={c._id}>{c.name}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}><Form.Item name="admittingDiagnosis" label="Admitting Diagnosis"><TextArea rows={2} /></Form.Item></Col>
            <Col span={12}><Form.Item name="finalDiagnosis" label="Final Diagnosis"><TextArea rows={2} /></Form.Item></Col>
            <Col span={8}>
              <Form.Item name="conditionAtDischarge" label="Condition at Discharge">
                <Select options={conditions.map(c => ({ value: c, label: c }))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="referredTo" label="Referred To"><Input /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="procedureDone" label="Procedures Done"><Input /></Form.Item>
            </Col>
            <Col span={12}><Form.Item name="treatmentGiven" label="Treatment Given"><TextArea rows={3} /></Form.Item></Col>
            <Col span={12}><Form.Item name="investigationSummary" label="Investigation Summary"><TextArea rows={3} /></Form.Item></Col>
            <Col span={12}><Form.Item name="followUpAdvice" label="Follow-up Advice"><TextArea rows={2} /></Form.Item></Col>
            <Col span={12}><Form.Item name="dietAdvice" label="Diet Advice"><TextArea rows={2} /></Form.Item></Col>
            <Col span={24}><Form.Item name="dischargeInstructions" label="Discharge Instructions"><TextArea rows={2} /></Form.Item></Col>
          </Row>

          <Divider>Medications at Discharge</Divider>
          <Form.List name="medicationsAtDischarge">
            {(fields, { add, remove }) => (<>
              {fields.map(({ key, name, ...rest }) => (
                <Row gutter={8} key={key} style={{ marginBottom: 8 }}>
                  <Col span={6}><Form.Item {...rest} name={[name, 'medicine']} rules={[{ required: true }]}><Input placeholder="Medicine" /></Form.Item></Col>
                  <Col span={5}><Form.Item {...rest} name={[name, 'dosage']}><Input placeholder="Dosage" /></Form.Item></Col>
                  <Col span={5}><Form.Item {...rest} name={[name, 'frequency']}><Input placeholder="Frequency" /></Form.Item></Col>
                  <Col span={6}><Form.Item {...rest} name={[name, 'duration']}><Input placeholder="Duration" /></Form.Item></Col>
                  <Col span={2}><Button danger onClick={() => remove(name)} style={{ marginTop: 4 }}>X</Button></Col>
                </Row>
              ))}
              <Button type="dashed" onClick={() => add({})} block>+ Add Medication</Button>
            </>)}
          </Form.List>

          <Divider />
          <Space>
            <Button type="primary" htmlType="submit" loading={saving}>{editing ? 'Update' : 'Create'}</Button>
            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
}
