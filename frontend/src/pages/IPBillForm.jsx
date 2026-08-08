import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card, Form, Input, Select, Button, DatePicker, message, Typography, Row, Col, Divider, InputNumber, Space, Table } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { ipAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;

const gstRates = [0, 2, 5, 12, 18];
const paymentModes = ['Cash', 'UPI', 'Debit Card', 'Credit Card'];

export default function IPBillForm() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [admissions, setAdmissions] = useState([]);
  const [components, setComponents] = useState([]);
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('fixed');
  const [gstRate, setGstRate] = useState(0);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  useEffect(() => {
    ipAPI.getAdmissions({ status: 'Admitted', limit: 100 }).then(res => setAdmissions(res.data.admissions)).catch(() => {});
    ipAPI.getComponents({ active: 'true' }).then(res => setComponents(res.data)).catch(() => {});

    if (isEdit) {
      ipAPI.getBillById(id).then(res => {
        const d = res.data;
        form.setFieldsValue({
          admission: d.admission?._id,
          billDate: d.billDate ? dayjs(d.billDate) : dayjs(),
          notes: d.notes,
          amountPaid: d.amountPaid,
        });
        setItems(d.items?.map(it => ({ ...it, key: Date.now() + Math.random() })) || []);
        setDiscount(d.discount || 0);
        setDiscountType(d.discountType || 'fixed');
        setGstRate(d.gstRate || 0);
        const pay = d.payments?.[0];
        if (pay) setPaymentMode(pay.mode);
      }).catch(() => message.error('Failed to load'));
    } else {
      const qAdmission = params.get('admission');
      if (qAdmission) form.setFieldValue('admission', qAdmission);
    }
  }, [id]);

  const calcTotals = () => {
    const subtotal = items.reduce((sum, it) => sum + (it.amount || 0), 0);
    const discountAmount = discountType === 'percentage' ? subtotal * (discount / 100) : Number(discount);
    const taxable = Math.max(0, subtotal - discountAmount);
    const cgst = taxable * (gstRate / 2) / 100;
    const sgst = taxable * (gstRate / 2) / 100;
    const tax = cgst + sgst;
    return { subtotal, discount: discountAmount, taxable, cgst, sgst, tax, grandTotal: taxable + tax };
  };

  const handleComponentSelect = (index, componentId) => {
    const comp = components.find(c => c._id === componentId);
    if (comp) {
      const newItems = [...items];
      newItems[index].name = comp.name;
      newItems[index].category = comp.category;
      newItems[index].rate = comp.rate || 0;
      newItems[index].gstRate = comp.gstRate || 0;
      newItems[index].quantity = 1;
      newItems[index].amount = newItems[index].quantity * (comp.rate || 0);
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

  const addItem = () => {
    setItems([...items, { name: '', quantity: 1, rate: 0, gstRate: 0, amount: 0, key: Date.now() }]);
  };

  const totals = calcTotals();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        billDate: values.billDate?.toISOString(),
        items: items.map(({ key, ...it }) => it),
        ...totals,
        discountType,
        gstRate,
        paymentMode,
        amountDue: totals.grandTotal - (values.amountPaid || 0),
      };
      if (isEdit) { await ipAPI.updateBill(id, payload); message.success('Updated'); }
      else { await ipAPI.createBill(payload); message.success('Bill created'); }
      navigate('/ip/bills');
    } catch (err) { message.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const itemColumns = [
    { title: 'S.No', key: 'idx', width: 45, render: (_, __, i) => i + 1 },
    {
      title: 'Component', key: 'name',
      render: (_, __, i) => (
        <Select value={items[i].name ? items[i].name : undefined} onChange={(v) => handleComponentSelect(i, v)} showSearch placeholder="Select component" allowClear style={{ width: '100%' }}
          filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
          {components.map(c => <Select.Option key={c._id} value={c._id}>{c.name} ({c.category}) - ₹{c.rate}</Select.Option>)}
        </Select>
      ),
    },
    { title: 'Category', key: 'cat', width: 100, render: (_, __, i) => items[i].category || '-' },
    { title: 'Qty', key: 'qty', width: 80, render: (_, __, i) => <InputNumber min={1} value={items[i].quantity} onChange={v => updateItem(i, 'quantity', v)} style={{ width: 70 }} /> },
    { title: 'Rate', key: 'rate', width: 100, render: (_, __, i) => <InputNumber min={0} value={items[i].rate} onChange={v => updateItem(i, 'rate', v)} style={{ width: 85 }} /> },
    { title: 'GST', key: 'gst', width: 60, render: (_, __, i) => (items[i].gstRate ? `${items[i].gstRate}%` : '-') },
    { title: 'Amount', key: 'amt', width: 90, render: (_, __, i) => <strong>₹{(items[i].amount || 0).toFixed(2)}</strong> },
    { title: '', key: 'del', width: 35, render: (_, __, i) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => setItems(items.filter((_, j) => j !== i))} /> },
  ];

  return (
    <Card style={{ borderRadius: 10, maxWidth: 1100, margin: '0 auto' }}>
      <Title level={4}>{isEdit ? 'Edit IP Bill' : 'New IP Bill'}</Title>
      <Form form={form} layout="vertical" onFinish={onFinish}
        initialValues={{ billDate: dayjs(), amountPaid: 0, paymentMode: 'Cash' }}>
        <Row gutter={16}>
          <Col xs={24} md={10}>
            <Form.Item name="admission" label="Admission" rules={[{ required: true }]}>
              <Select showSearch placeholder="Select admission..." filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
                {admissions.map(a => <Select.Option key={a._id} value={a._id}>{a.admissionId} - {a.patient?.name} ({a.roomType || 'General'})</Select.Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={12} md={3}>
            <Form.Item name="billDate" label="Date"><DatePicker style={{ width: '100%' }} /></Form.Item>
          </Col>
          <Col xs={12} md={3}>
            <Form.Item name="amountPaid" label="Amount Paid"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          </Col>
          <Col xs={12} md={3}>
            <Form.Item name="paymentMode" label="Payment Mode"><Select options={paymentModes.map(m => ({ value: m, label: m }))} /></Form.Item>
          </Col>
        </Row>

        <Divider>Bill Items</Divider>
        <Table dataSource={items} columns={itemColumns} rowKey="key" pagination={false} size="small" bordered scroll={{ x: 800 }} />
        <Button type="dashed" onClick={addItem} icon={<PlusOutlined />} block style={{ marginTop: 8 }}>Add Item</Button>

        <Divider />
        <Row gutter={16}>
          <Col xs={24} md={14}>
            <Form.Item name="notes" label="Notes"><Input.TextArea rows={4} /></Form.Item>
          </Col>
          <Col xs={24} md={10}>
            <Card size="small" style={{ background: '#f9fafb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span>Subtotal:</span><strong>₹{totals.subtotal.toFixed(2)}</strong></div>
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
                  <span>GST:</span>
                  <Select value={gstRate} onChange={setGstRate} style={{ width: 80 }} size="small" options={gstRates.map(g => ({ value: g, label: `${g}%` }))} />
                </Space>
                <span style={{ fontSize: 12 }}>CGST ₹{totals.cgst.toFixed(2)} + SGST ₹{totals.sgst.toFixed(2)}</span>
              </div>
              <Divider style={{ margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, color: '#2563EB' }}>
                <strong>Grand Total:</strong><strong>₹{totals.grandTotal.toFixed(2)}</strong>
              </div>
            </Card>
          </Col>
        </Row>

        <Divider />
        <Space>
          <Button type="primary" htmlType="submit" loading={loading} size="large">{isEdit ? 'Update Bill' : 'Create Bill'}</Button>
          <Button onClick={() => navigate('/ip/bills')} size="large">Cancel</Button>
        </Space>
      </Form>
    </Card>
  );
}
