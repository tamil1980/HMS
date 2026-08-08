import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Form, Input, Select, Button, DatePicker, message, Typography, Row, Col, Divider, InputNumber, Space, Table, Switch, Tag, Alert } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { patientAPI, pharmacyAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

const returnReasons = ['Damage', 'Expired', 'Not Required', 'Other'];
const refundModes = ['Cash', 'UPI', 'Debit Card', 'Credit Card', 'Adjust in Next Bill'];

export default function PharmacyReturnForm() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [bills, setBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [billMeds, setBillMeds] = useState([]);
  const [returnedMap, setReturnedMap] = useState({});
  const [items, setItems] = useState([]);
  const [reason, setReason] = useState('Other');
  const [refunded, setRefunded] = useState(false);
  const [refundMode, setRefundMode] = useState('Cash');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const qBill = params.get('bill');

  useEffect(() => {
    patientAPI.getAll({ limit: 50 }).then(res => setPatients(res.data.patients));
    pharmacyAPI.getMedicines({ active: 'true' }).then(res => setMedicines(res.data)).catch(() => {});
    pharmacyAPI.getBills({ limit: 30 }).then(res => setBills(res.data.bills)).catch(() => {});
  }, []);

  useEffect(() => {
    if (qBill) loadBill(qBill);
  }, [qBill]);

  const loadBill = async (billId) => {
    if (!billId) { setSelectedBill(null); setBillMeds([]); setReturnedMap({}); setItems([]); return; }
    try {
      const res = await pharmacyAPI.getBillById(billId);
      const d = res.data;
      setSelectedBill(d);
      form.setFieldValue('patient', d.patient?._id);

      const meds = (d.items || []).filter(it => it.medicine).map(it => ({
        medicine: it.medicine?._id || it.medicine,
        name: it.name,
        soldQty: Number(it.quantity) || 0,
        salePrice: Number(it.salePrice) || 0,
        gstRate: Number(it.gstRate) || 0,
      }));
      setBillMeds(meds);
      setItems([]);

      const retRes = await pharmacyAPI.getReturns({ bill: billId, limit: 100 });
      const map = {};
      (retRes.data.returns || []).forEach(r => {
        (r.items || []).forEach(it => {
          const mid = it.medicine?._id || it.medicine;
          if (mid) map[mid] = (map[mid] || 0) + (Number(it.quantity) || 0);
        });
      });
      setReturnedMap(map);
      message.success(`Bill ${d.billId} loaded. Select medicines to return.`);
    } catch { message.error('Failed to load bill'); }
  };

  const usedQty = (medId, excludeIdx) =>
    items.reduce((s, it, idx) => (it.medicine === medId && idx !== excludeIdx ? s + (it.quantity || 0) : s), 0);

  const remainingQty = (medId) => {
    const bm = billMeds.find(m => m.medicine === medId);
    if (!bm) return Infinity;
    return Math.max(0, bm.soldQty - (returnedMap[medId] || 0));
  };

  const medicineOptions = () => {
    if (selectedBill) {
      return billMeds.map(m => ({
        value: m.medicine,
        label: `${m.name} (Sold: ${m.soldQty}, Returnable: ${remainingQty(m.medicine)})`,
        med: m,
      }));
    }
    return medicines.map(m => ({ value: m._id, label: m.name, med: m }));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    if (field === 'quantity' || field === 'salePrice') {
      newItems[index].amount = (newItems[index].quantity || 0) * (newItems[index].salePrice || 0);
    }
    setItems(newItems);
  };

  const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

  const addItem = () => {
    setItems([...items, { key: Date.now() + Math.random(), name: '', quantity: 1, salePrice: 0, gstRate: 0, amount: 0 }]);
  };

  const handleMedicineSelect = (index, medicineId) => {
    const opt = medicineOptions().find(o => o.value === medicineId);
    if (opt) {
      const newItems = [...items];
      newItems[index].medicine = medicineId;
      newItems[index].name = opt.med.name;
      newItems[index].salePrice = opt.med.salePrice || 0;
      newItems[index].gstRate = opt.med.gstRate || 0;
      newItems[index].quantity = 1;
      newItems[index].amount = newItems[index].salePrice;
      setItems(newItems);
    }
  };

  const totals = (() => {
    const subtotal = items.reduce((sum, it) => sum + (it.amount || 0), 0);
    const tax = items.reduce((sum, it) => sum + ((it.amount || 0) * ((it.gstRate || 0) / 2) / 100) * 2, 0);
    const qty = items.reduce((sum, it) => sum + (it.quantity || 0), 0);
    return { subtotal, tax, grandTotal: subtotal + tax, qty };
  })();

  const onFinish = async (values) => {
    const validItems = items.filter(it => it.medicine && it.quantity > 0);
    if (!validItems.length) { message.warning('Select at least one medicine with quantity'); return; }
    setLoading(true);
    try {
      const payload = {
        bill: values.bill,
        patient: values.patient,
        returnDate: values.returnDate?.toISOString(),
        items: validItems.map(({ key, ...it }) => it),
        reason,
        refundMode,
        refunded,
        notes: values.notes,
      };
      await pharmacyAPI.createReturn(payload);
      message.success('Return saved. Quantity added back to stock and sales reduced.');
      navigate('/pharmacy/returns');
    } catch (err) { message.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const itemColumns = [
    { title: 'S.No', key: 'idx', width: 45, render: (_, __, i) => i + 1 },
    {
      title: 'Medicine', dataIndex: 'name', key: 'name', width: 320,
      render: (_, __, i) => {
        const it = items[i];
        if (it.name) return (
          <Space>
            <strong>{it.name}</strong>
            {selectedBill && <Tag color="blue">Sold: {(billMeds.find(m => m.medicine === it.medicine) || {}).soldQty}</Tag>}
          </Space>
        );
        return (
          <Select value={it.medicine || undefined} onChange={(v) => handleMedicineSelect(i, v)} showSearch placeholder={selectedBill ? 'Select medicine from this bill' : 'Select medicine'} allowClear style={{ width: '100%' }}
            filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
            {medicineOptions().map(o => <Option key={o.value} value={o.value}>{o.label}</Option>)}
          </Select>
        );
      },
    },
    {
      title: 'Qty to Return', key: 'qty', width: 120,
      render: (_, __, i) => {
        const it = items[i];
        let max = undefined;
        if (selectedBill && it.medicine) {
          max = remainingQty(it.medicine) - usedQty(it.medicine, i);
          if (max < 0) max = 0;
        }
        return <InputNumber min={0} max={max} value={it.quantity} onChange={v => updateItem(i, 'quantity', v)} style={{ width: 100 }} />;
      },
    },
    { title: 'Rate (₹)', key: 'rate', width: 110, render: (_, __, i) => <InputNumber min={0} value={items[i].salePrice} onChange={v => updateItem(i, 'salePrice', v)} style={{ width: 95 }} /> },
    { title: 'GST', key: 'gst', width: 60, render: (_, __, i) => (items[i].gstRate ? `${items[i].gstRate}%` : '-') },
    { title: 'Amount', key: 'amt', width: 100, render: (_, __, i) => <strong>₹{(items[i].amount || 0).toFixed(2)}</strong> },
    { title: '', key: 'del', width: 35, render: (_, __, i) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeItem(i)} /> },
  ];

  return (
    <Card style={{ borderRadius: 10, maxWidth: 1100, margin: '0 auto' }}>
      <Title level={4}>New Pharmacy Sales Return</Title>
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ returnDate: dayjs() }}>
        <Row gutter={16}>
          <Col xs={24} md={10}>
            <Form.Item name="bill" label="From Bill (optional)">
              <Select showSearch allowClear placeholder="Search bill..." onChange={loadBill}
                filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
                {bills.map(b => <Option key={b._id} value={b._id}>{b.billId} - {b.patient?.name || 'Walk-in'}</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="patient" label="Patient">
              <Select showSearch allowClear placeholder="Search patient..."
                filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
                {patients.map(p => <Option key={p._id} value={p._id}>{p.name} - {p.patientId}</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={12} md={3}>
            <Form.Item name="returnDate" label="Return Date"><DatePicker style={{ width: '100%' }} /></Form.Item>
          </Col>
          <Col xs={12} md={3}>
            <Form.Item label="Reason">
              <Select value={reason} onChange={setReason} options={returnReasons.map(r => ({ value: r, label: r }))} />
            </Form.Item>
          </Col>
        </Row>

        {selectedBill && (
          <Alert
            style={{ marginBottom: 12 }}
            type="info"
            showIcon
            message={<strong>Bill No: {selectedBill.billId}</strong>}
            description={[
              selectedBill.patient?.name ? `Patient: ${selectedBill.patient.name}` : null,
              selectedBill.doctor?.name ? `Doctor: ${selectedBill.doctor.name}` : null,
              selectedBill.grandTotal ? `Bill Total: ₹${selectedBill.grandTotal}` : null,
            ].filter(Boolean).join('   |   ')}
          />
        )}

        <Divider>Return Items <small style={{ fontWeight: 400 }}>(returned quantity is added back to stock and reduced from sales)</small></Divider>
        <Table dataSource={items} columns={itemColumns} rowKey="key" pagination={false} size="small" bordered scroll={{ x: 800 }} />
        <Button type="dashed" onClick={addItem} icon={<PlusOutlined />} block style={{ marginTop: 8 }}>
          {selectedBill ? 'Add Medicine from this Bill' : 'Add Medicine'}
        </Button>
        {selectedBill && !billMeds.length && (
          <div style={{ marginTop: 8 }}><Tag color="orange">No medicines found on this bill</Tag></div>
        )}

        <Divider />
        <Row gutter={16}>
          <Col xs={24} md={14}>
            <Form.Item name="notes" label="Notes"><Input.TextArea rows={4} placeholder="Reason for return, remarks..." /></Form.Item>
          </Col>
          <Col xs={24} md={10}>
            <Card size="small" style={{ background: '#f9fafb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span>Total Qty Returning:</span><strong>{totals.qty}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span>Subtotal:</span><strong>₹{totals.subtotal.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span>Tax:</span><strong>₹{totals.tax.toFixed(2)}</strong>
              </div>
              <Divider style={{ margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, color: '#DC2626' }}>
                <strong>Return Amount:</strong><strong>₹{totals.grandTotal.toFixed(2)}</strong>
              </div>
            </Card>
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><Tag color="green">Refunded</Tag></span>
              <Switch checked={refunded} onChange={setRefunded} />
            </div>
            {refunded && (
              <div style={{ marginTop: 8 }}>
                <Select value={refundMode} onChange={setRefundMode} style={{ width: '100%' }}
                  options={refundModes.map(m => ({ value: m, label: m }))} placeholder="Refund Mode" />
              </div>
            )}
          </Col>
        </Row>

        <Divider />
        <Space>
          <Button type="primary" htmlType="submit" loading={loading} size="large" danger>Save Return</Button>
          <Button onClick={() => navigate('/pharmacy/returns')} size="large">Cancel</Button>
        </Space>
      </Form>
    </Card>
  );
}
