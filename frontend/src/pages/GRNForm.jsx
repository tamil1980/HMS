import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Form, Input, Select, Button, DatePicker, message, Typography, Row, Col, Divider, InputNumber, Space, Table, Upload, Alert } from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { pharmacyAPI } from '../services/api';
import { downloadBlob } from '../utils/pdf';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

export default function GRNForm() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [items, setItems] = useState([]);
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  useEffect(() => {
    pharmacyAPI.getSuppliers({}).then(res => setSuppliers(res.data));
    pharmacyAPI.getMedicines({}).then(res => setMedicines(res.data)).catch(() => {});
    if (isEdit) {
      pharmacyAPI.getGRNById(id).then(res => {
        const d = res.data;
        form.setFieldsValue({
          supplier: d.supplier?._id,
          grnDate: d.grnDate ? dayjs(d.grnDate) : dayjs(),
          invoiceRef: d.invoiceRef,
          notes: d.notes,
        });
        setItems(d.items?.map(it => ({ ...it, key: Date.now() + Math.random() })) || []);
      }).catch(() => message.error('Failed to load'));
    }
  }, [id]);

  const handleMedicineSelect = (index, medicineId) => {
    const med = medicines.find(m => m._id === medicineId);
    if (med) {
      const newItems = [...items];
      newItems[index].medicine = med._id;
      newItems[index].name = med.name;
      newItems[index].purchasePrice = med.purchasePrice || 0;
      newItems[index].gstRate = med.gstRate || 0;
      newItems[index].amount = (newItems[index].quantity || 1) * (med.purchasePrice || 0);
      setItems(newItems);
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    if (field === 'quantity' || field === 'purchasePrice') {
      newItems[index].amount = (newItems[index].quantity || 0) * (newItems[index].purchasePrice || 0);
    }
    setItems(newItems);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setItems([...items, { name: '', quantity: 1, purchasePrice: 0, gstRate: 0, amount: 0, key: Date.now() }]);
  };

  const handleExcelUpload = async (file) => {
    setImporting(true);
    setImportMsg(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await pharmacyAPI.importGRNExcel(formData);
      const loaded = (res.data.items || []).map(it => ({ ...it, key: Date.now() + Math.random() }));
      setItems(prev => [...prev, ...loaded]);
      if (res.data.skipped?.length) {
        setImportMsg({ type: 'warning', text: `Loaded ${loaded.length} item(s). Skipped (medicine not found): ${res.data.skipped.join(', ')}` });
      } else {
        setImportMsg({ type: 'success', text: `Loaded ${loaded.length} item(s) from Excel. Review and save.` });
      }
    } catch (err) { message.error(err.response?.data?.message || 'Import failed'); }
    finally { setImporting(false); }
    return false;
  };

  const handleTemplate = async () => {
    try {
      const res = await pharmacyAPI.getGRNTemplate();
      downloadBlob(res, 'GRNTemplate.xlsx');
    } catch { message.error('Download failed'); }
  };

  const totalAmount = items.reduce((sum, it) => sum + (it.amount || 0), 0);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        grnDate: values.grnDate?.toISOString(),
        items: items.map(({ key, ...it }) => it),
        totalAmount,
      };
      if (isEdit) { await pharmacyAPI.updateGRN(id, payload); message.success('Updated'); }
      else { await pharmacyAPI.createGRN(payload); message.success('GRN created, stock updated'); }
      navigate('/pharmacy/grns');
    } catch (err) { message.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const itemColumns = [
    { title: 'S.No', key: 'idx', width: 45, render: (_, __, i) => i + 1 },
    {
      title: 'Medicine', dataIndex: 'name', key: 'name',
      render: (_, __, i) => (
        <Select value={items[i].medicine || undefined} onChange={(v) => handleMedicineSelect(i, v)} showSearch placeholder="Select medicine" allowClear style={{ width: '100%' }}
          filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
          {medicines.map(m => <Option key={m._id} value={m._id}>{m.name} (Stock: {m.quantity})</Option>)}
        </Select>
      ),
    },
    { title: 'Qty', key: 'qty', width: 90, render: (_, __, i) => <InputNumber min={1} value={items[i].quantity} onChange={v => updateItem(i, 'quantity', v)} style={{ width: 70 }} /> },
    { title: 'P. Rate (₹)', key: 'rate', width: 110, render: (_, __, i) => <InputNumber min={0} value={items[i].purchasePrice} onChange={v => updateItem(i, 'purchasePrice', v)} style={{ width: 95 }} /> },
    { title: 'Amount', key: 'amt', width: 100, render: (_, __, i) => <strong>₹{(items[i].amount || 0).toFixed(2)}</strong> },
    { title: '', key: 'del', width: 35, render: (_, __, i) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeItem(i)} /> },
  ];

  return (
    <Card style={{ borderRadius: 10, maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <Title level={4} style={{ margin: 0 }}>{isEdit ? 'Edit GRN' : 'New Goods Received Note (GRN)'}</Title>
        <Space>
          <Upload beforeUpload={handleExcelUpload} showUploadList={false} accept=".xlsx,.xls">
            <Button icon={<UploadOutlined />} loading={importing}>Upload Excel Items</Button>
          </Upload>
          <Button icon={<DownloadOutlined />} onClick={handleTemplate}>Template</Button>
        </Space>
      </div>
      {importMsg && <Alert type={importMsg.type} message={importMsg.text} showIcon closable onClose={() => setImportMsg(null)} style={{ marginBottom: 12 }} />}
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ grnDate: dayjs() }}>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="supplier" label="Supplier" rules={[{ required: true }]}>
              <Select showSearch placeholder="Select supplier"
                filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
                {suppliers.map(s => <Option key={s._id} value={s._id}>{s.company || s.name} - {s.name}</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item name="grnDate" label="GRN Date"><DatePicker style={{ width: '100%' }} /></Form.Item>
          </Col>
          <Col xs={12} md={8}>
            <Form.Item name="invoiceRef" label="Supplier Invoice Ref"><Input /></Form.Item>
          </Col>
        </Row>

        <Divider>Received Items <small style={{ fontWeight: 400 }}>(stock will be added)</small></Divider>
        <Table dataSource={items} columns={itemColumns} rowKey="key" pagination={false} size="small" bordered />
        <Button type="dashed" onClick={addItem} icon={<PlusOutlined />} block style={{ marginTop: 8 }}>Add Item</Button>

        <Divider />
        <Row gutter={16}>
          <Col xs={24} md={14}>
            <Form.Item name="notes" label="Notes"><Input.TextArea rows={3} /></Form.Item>
          </Col>
          <Col xs={24} md={10}>
            <Card size="small" style={{ background: '#f9fafb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, color: '#2563EB' }}>
                <strong>Total Amount:</strong><strong>₹{totalAmount.toFixed(2)}</strong>
              </div>
            </Card>
          </Col>
        </Row>

        <Divider />
        <Space>
          <Button type="primary" htmlType="submit" loading={loading} size="large">{isEdit ? 'Update GRN' : 'Create GRN'}</Button>
          <Button onClick={() => navigate('/pharmacy/grns')} size="large">Cancel</Button>
        </Space>
      </Form>
    </Card>
  );
}
