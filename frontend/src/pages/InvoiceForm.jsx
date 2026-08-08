import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Form, Input, Select, Button, DatePicker, message, Typography, Row, Col, Divider, InputNumber, Space, Table } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { patientAPI, invoiceAPI, masterAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

export default function InvoiceForm() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [masters, setMasters] = useState([]);
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('fixed');
  const [taxRate, setTaxRate] = useState(0);
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  useEffect(() => {
    patientAPI.getAll({ limit: 50 }).then(res => setPatients(res.data.patients));
    masterAPI.getAll({ type: 'Service', active: 'true' }).then(res => setMasters(res.data)).catch(() => {});
    if (isEdit) {
      invoiceAPI.getById(id).then(res => {
        const d = res.data;
        form.setFieldsValue({
          patient: d.patient?._id,
          invoiceDate: d.invoiceDate ? dayjs(d.invoiceDate) : dayjs(),
          status: d.status,
          notes: d.notes,
          amountPaid: d.amountPaid,
        });
        setItems(d.items?.map(it => ({ ...it, key: Date.now() + Math.random() })) || []);
        setDiscount(d.discount || 0);
        setDiscountType(d.discountType || 'fixed');
        setTaxRate(d.taxRate || 0);
      }).catch(() => message.error('Failed to load'));
    }
  }, [id]);

  const calcTotals = () => {
    const sub = items.reduce((sum, it) => sum + (it.amount || 0), 0);
    const disc = discountType === 'percentage' ? sub * (discount / 100) : Number(discount);
    const taxable = Math.max(0, sub - disc);
    const taxAmt = taxable * (taxRate / 100);
    return { subtotal: sub, discount: disc, tax: taxAmt, grandTotal: taxable + taxAmt };
  };

  const handleMasterSelect = (index, masterId) => {
    const master = masters.find(m => m._id === masterId);
    if (master) {
      const newItems = [...items];
      newItems[index].description = master.name;
      newItems[index].rate = master.price || 0;
      newItems[index].amount = (newItems[index].quantity || 1) * (master.price || 0);
      setItems(newItems);
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    if (field === 'quantity' || field === 'rate') {
      newItems[index].amount = (newItems[index].quantity || 0) * (newItems[index].rate || 0);
    }
    setItems(newItems);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, rate: 0, amount: 0, key: Date.now() }]);
  };

  const totals = calcTotals();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        invoiceDate: values.invoiceDate?.toISOString(),
        items: items.map(({ key, ...it }) => it),
        ...totals,
        discountType,
        taxRate,
        amountDue: totals.grandTotal - (values.amountPaid || 0),
      };
      if (isEdit) { await invoiceAPI.update(id, payload); message.success('Updated'); }
      else { await invoiceAPI.create(payload); message.success('Invoice created'); }
      navigate('/invoices');
    } catch (err) { message.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const itemColumns = [
    { title: '#', key: 'idx', width: 35, render: (_, __, i) => i + 1 },
    {
      title: 'Description', dataIndex: 'description', key: 'desc',
      render: (_, __, i) => (
        <Select
          value={items[i].description || undefined}
          onChange={(v) => handleMasterSelect(i, v)}
          onSelect={(v) => handleMasterSelect(i, v)}
          showSearch
          placeholder="Select or type service"
          allowClear
          style={{ width: '100%' }}
          filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
        >
          {masters.map(m => <Option key={m._id} value={m._id}>{m.name} - ₹{m.price || 0}</Option>)}
          <Option value="__custom__" disabled>
            <Button type="link" onClick={() => updateItem(i, 'description', prompt('Enter item name:'))}>+ Custom</Button>
          </Option>
        </Select>
      ),
    },
    { title: 'Qty', key: 'qty', width: 70, render: (_, __, i) => <InputNumber min={1} value={items[i].quantity} onChange={v => updateItem(i, 'quantity', v)} style={{ width: 55 }} /> },
    { title: 'Rate (₹)', key: 'rate', width: 100, render: (_, __, i) => <InputNumber min={0} value={items[i].rate} onChange={v => updateItem(i, 'rate', v)} style={{ width: 85 }} /> },
    { title: 'Amount', key: 'amt', width: 90, render: (_, __, i) => <strong>₹{(items[i].amount || 0).toFixed(2)}</strong> },
    { title: '', key: 'del', width: 35, render: (_, __, i) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeItem(i)} /> },
  ];

  return (
    <div style={{ padding: 0 }}>
      <Card style={{ borderRadius: 10, maxWidth: 960, margin: '0 auto' }}>
        <Title level={4}>{isEdit ? 'Edit Invoice' : 'New Invoice'}</Title>
        <Form form={form} layout="vertical" onFinish={onFinish}
          initialValues={{ invoiceDate: dayjs(), status: 'Unpaid', amountPaid: 0 }}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="patient" label="Patient" rules={[{ required: true }]}>
                <Select showSearch placeholder="Search patient..."
                  filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
                  {patients.map(p => <Option key={p._id} value={p._id}>{p.name} - {p.patientId}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name="invoiceDate" label="Date"><DatePicker style={{ width: '100%' }} /></Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name="status" label="Status">
                <Select options={['Paid', 'Partial', 'Unpaid'].map(s => ({ value: s, label: s }))} />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Invoice Items <small style={{ fontWeight: 400 }}>(select from master or type custom)</small></Divider>
          <Table dataSource={items} columns={itemColumns} rowKey="key" pagination={false} size="small" bordered />
          <Button type="dashed" onClick={addItem} icon={<PlusOutlined />} block style={{ marginTop: 8 }}>Add Item</Button>

          <Divider />
          <Row gutter={16}>
            <Col xs={24} md={14}>
              <Form.Item name="notes" label="Notes"><Input.TextArea rows={4} /></Form.Item>
            </Col>
            <Col xs={24} md={10}>
              <Card size="small" style={{ background: '#f9fafb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>Subtotal:</span><strong>₹{totals.subtotal.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Space size={4}>
                    <span>Discount:</span>
                    <InputNumber min={0} value={discount} onChange={setDiscount} style={{ width: 70 }} size="small" />
                    <Select value={discountType} onChange={setDiscountType} style={{ width: 90 }} size="small"
                      options={[{ value: 'fixed', label: 'Fixed' }, { value: 'percentage', label: '%' }]} />
                  </Space>
                  <strong style={{ color: '#dc2626' }}>-₹{totals.discount.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Space size={4}>
                    <span>Tax:</span>
                    <InputNumber min={0} max={100} value={taxRate} onChange={setTaxRate} style={{ width: 60 }} size="small" suffix="%" />
                  </Space>
                  <span>+₹{totals.tax.toFixed(2)}</span>
                </div>
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, color: '#2563EB' }}>
                  <strong>Grand Total:</strong><strong>₹{totals.grandTotal.toFixed(2)}</strong>
                </div>
              </Card>
              <div style={{ marginTop: 8 }}>
                <Form.Item name="amountPaid" label="Amount Paid" style={{ marginBottom: 0 }}>
                  <InputNumber min={0} prefix="₹" style={{ width: '100%' }} />
                </Form.Item>
              </div>
            </Col>
          </Row>

          <Divider />
          <Space>
            <Button type="primary" htmlType="submit" loading={loading} size="large">{isEdit ? 'Update Invoice' : 'Create Invoice'}</Button>
            <Button onClick={() => navigate('/invoices')} size="large">Cancel</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
