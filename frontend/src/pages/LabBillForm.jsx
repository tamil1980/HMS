import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Form, Input, Select, Button, DatePicker, message, Typography, Row, Col, Divider, InputNumber, Space, Table } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { patientAPI, labAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

const gstRates = [0, 2, 5, 12, 18];
const paymentModes = ['Cash', 'UPI', 'Debit Card', 'Credit Card'];

export default function LabBillForm() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [tests, setTests] = useState([]);
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('fixed');
  const [gstRate, setGstRate] = useState(0);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  useEffect(() => {
    patientAPI.getAll({ limit: 50 }).then(res => setPatients(res.data.patients));
    labAPI.getTests({ active: 'true' }).then(res => setTests(res.data)).catch(() => {});
    if (isEdit) {
      labAPI.getBillById(id).then(res => {
        const d = res.data;
        form.setFieldsValue({
          patient: d.patient?._id,
          billDate: d.billDate ? dayjs(d.billDate) : dayjs(),
          referredBy: d.referredBy,
          status: d.status,
          notes: d.notes,
          amountPaid: d.amountPaid,
        });
        setItems(d.items?.map(it => ({ ...it, key: Date.now() + Math.random() })) || []);
        setDiscount(d.discount || 0);
        setDiscountType(d.discountType || 'fixed');
        setGstRate(d.gstRate || 0);
        const pay = d.payments?.[0];
        if (pay) {
          setPaymentMode(pay.mode);
          form.setFieldsValue({
            paymentMode: pay.mode,
            transactionId: pay.transactionId,
            cardNumber: pay.cardNumber,
            cardHolder: pay.cardHolder,
            cardExpiry: pay.cardExpiry,
          });
        }
      }).catch(() => message.error('Failed to load'));
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

  const handleTestSelect = (index, testId) => {
    const test = tests.find(t => t._id === testId);
    if (test) {
      const newItems = [...items];
      newItems[index].test = test._id;
      newItems[index].name = test.name;
      newItems[index].category = test.category;
      newItems[index].price = test.price || 0;
      newItems[index].gstRate = test.gstRate || 0;
      newItems[index].amount = (newItems[index].quantity || 1) * (test.price || 0);
      setItems(newItems);
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    if (field === 'quantity' || field === 'price') {
      newItems[index].amount = (newItems[index].quantity || 0) * (newItems[index].price || 0);
    }
    setItems(newItems);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setItems([...items, { name: '', category: 'Test', quantity: 1, price: 0, gstRate: 0, amount: 0, key: Date.now() }]);
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
      if (isEdit) { await labAPI.updateBill(id, payload); message.success('Updated'); }
      else { await labAPI.createBill(payload); message.success('Bill created'); }
      navigate('/lab/bills');
    } catch (err) { message.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const itemColumns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'idx', width: 45, align: 'center', render: (_, __, i) => i + 1 },
    {
      title: 'Test', dataIndex: 'name', key: 'name',
      render: (_, __, i) => (
        <Select
          value={items[i].test || undefined}
          onChange={(v) => handleTestSelect(i, v)}
          showSearch
          placeholder="Select test / x-ray / scan"
          allowClear
          style={{ width: '100%' }}
          filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
        >
          {tests.map(t => <Option key={t._id} value={t._id}>{t.name} ({t.category}) - ₹{t.price || 0}</Option>)}
        </Select>
      ),
    },
    { title: 'Qty', key: 'qty', width: 70, render: (_, __, i) => <InputNumber min={1} value={items[i].quantity} onChange={v => updateItem(i, 'quantity', v)} style={{ width: 55 }} /> },
    { title: 'Rate (₹)', key: 'rate', width: 100, render: (_, __, i) => <InputNumber min={0} value={items[i].price} onChange={v => updateItem(i, 'price', v)} style={{ width: 85 }} /> },
    { title: 'Amount', key: 'amt', width: 90, render: (_, __, i) => <strong>₹{(items[i].amount || 0).toFixed(2)}</strong> },
    { title: '', key: 'del', width: 35, render: (_, __, i) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeItem(i)} /> },
  ];

  return (
    <Card style={{ borderRadius: 10, maxWidth: 960, margin: '0 auto' }}>
      <Title level={4}>{isEdit ? 'Edit Lab Bill' : 'New Lab Bill'}</Title>
        <Form form={form} layout="vertical" onFinish={onFinish}
          initialValues={{ billDate: dayjs(), status: 'Unpaid', amountPaid: 0, paymentMode: 'Cash' }}>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="patient" label="Patient" rules={[{ required: true }]}>
              <Select showSearch placeholder="Search patient..."
                filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
                {patients.map(p => <Option key={p._id} value={p._id}>{p.name} - {p.patientId}</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item name="billDate" label="Date"><DatePicker style={{ width: '100%' }} /></Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item name="status" label="Status">
              <Select options={['Paid', 'Partial', 'Unpaid'].map(s => ({ value: s, label: s }))} />
            </Form.Item>
          </Col>
          <Col xs={24} md={4}>
            <Form.Item name="referredBy" label="Referred By"><Input /></Form.Item>
          </Col>
        </Row>

        <Divider>Bill Items <small style={{ fontWeight: 400 }}>(select from test catalog)</small></Divider>
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
                  <span>GST:</span>
                  <Select value={gstRate} onChange={setGstRate} style={{ width: 80 }} size="small"
                    options={gstRates.map(g => ({ value: g, label: `${g}%` }))} />
                </Space>
                <span style={{ fontSize: 12 }}>CGST ₹{totals.cgst.toFixed(2)} + SGST ₹{totals.sgst.toFixed(2)}</span>
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
            <div style={{ marginTop: 12 }}>
              <Form.Item name="paymentMode" label="Payment Mode" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                <Select value={paymentMode} onChange={setPaymentMode}
                  options={paymentModes.map(m => ({ value: m, label: m }))} />
              </Form.Item>
            </div>
            {(paymentMode === 'UPI') && (
              <div style={{ marginTop: 12 }}>
                <Form.Item name="transactionId" label="Transaction ID" rules={[{ required: true, message: 'Enter UPI transaction ID' }]} style={{ marginBottom: 0 }}>
                  <Input placeholder="e.g. 425178963214" />
                </Form.Item>
              </div>
            )}
            {(paymentMode === 'Debit Card' || paymentMode === 'Credit Card') && (
              <div style={{ marginTop: 12 }}>
                <Row gutter={8}>
                  <Col span={24}>
                    <Form.Item name="cardNumber" label="Card Number" rules={[{ required: true, message: 'Enter card number' }, { len: 16, message: '16 digits required' }]} style={{ marginBottom: 8 }}>
                      <Input maxLength={16} placeholder="Enter 16 digit card number" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="cardHolder" label="Card Holder" rules={[{ required: true, message: 'Card holder name' }]} style={{ marginBottom: 8 }}>
                      <Input placeholder="Name on card" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="cardExpiry" label="Expiry (MM/YY)" rules={[{ required: true, message: 'Expiry' }]} style={{ marginBottom: 8 }}>
                      <Input maxLength={5} placeholder="MM/YY" />
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            )}
          </Col>
        </Row>

        <Divider />
        <Space>
          <Button type="primary" htmlType="submit" loading={loading} size="large">{isEdit ? 'Update Bill' : 'Create Bill'}</Button>
          <Button onClick={() => navigate('/lab/bills')} size="large">Cancel</Button>
        </Space>
      </Form>
    </Card>
  );
}
