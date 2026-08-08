import { useState, useEffect } from 'react';
import { Card, DatePicker, Button, Table, Typography, Space, Statistic, Row, Col, message, Tag } from 'antd';
import { SearchOutlined, FilePdfOutlined, FileExcelOutlined } from '@ant-design/icons';
import { pharmacyAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const reasonColors = { Damage: 'red', Expired: 'orange', 'Not Required': 'blue', Other: 'default' };

export default function PharmacyReturnsReport() {
  const [dates, setDates] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [byReason, setByReason] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchReport = async (start, end) => {
    setLoading(true);
    try {
      const params = { fromDate: start.format('YYYY-MM-DD'), toDate: end.format('YYYY-MM-DD') };
      const res = await pharmacyAPI.returnsReport(params);
      setData(res.data.returns);
      setSummary(res.data.summary);
      setByReason(res.data.byReason || []);
    } catch { message.error('Failed to load report'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchReport(dates[0], dates[1]);
  }, []);

  const handleSearch = () => {
    if (!dates[0] || !dates[1]) { message.warning('Please select date range'); return; }
    fetchReport(dates[0], dates[1]);
  };

  const downloadReport = async (format) => {
    if (!dates[0] || !dates[1]) { message.warning('Select date range'); return; }
    try {
      const params = { fromDate: dates[0].format('YYYY-MM-DD'), toDate: dates[1].format('YYYY-MM-DD'), format };
      const res = await pharmacyAPI.returnsReportFile(params);
      const ext = format === 'excel' ? 'xlsx' : 'pdf';
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `PharmacyReturnsReport_${params.fromDate}_to_${params.toDate}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch { message.error('Download failed'); }
  };

  const itemCount = (r) => (r.items || []).reduce((s, it) => s + (Number(it.quantity) || 0), 0);

  const columns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'sno', width: 55, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{i + 1}</div> },
    { title: 'Return No', dataIndex: 'returnId', key: 'id' },
    { title: 'Bill', key: 'bill', render: (_, r) => r.bill?.billId || '-' },
    { title: 'Patient', dataIndex: ['patient', 'name'], key: 'patient', render: (t) => t || '-' },
    { title: 'Date', dataIndex: 'returnDate', key: 'date', render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
    { title: 'Reason', dataIndex: 'reason', key: 'reason', render: (t) => <Tag color={reasonColors[t] || 'default'}>{t || 'Other'}</Tag> },
    { title: 'Qty', key: 'qty', render: (_, r) => itemCount(r) },
    { title: 'Amount', dataIndex: 'totalAmount', key: 'amount', render: (t) => (t || 0) },
    { title: 'Tax', dataIndex: 'tax', key: 'tax', render: (t) => (t || 0) },
    { title: 'Refund', dataIndex: 'refunded', key: 'refund', render: (t, r) => t ? (r.refundMode || 'Refunded') : 'No' },
  ];

  const reasonColumns = [
    { title: 'Reason', dataIndex: 'reason', key: 'reason', render: (t) => <Tag color={reasonColors[t] || 'default'}>{t}</Tag> },
    { title: 'Returns', dataIndex: 'count', key: 'count' },
    { title: 'Qty', dataIndex: 'qty', key: 'qty' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (t) => <strong>₹{t || 0}</strong> },
  ];

  return (
    <div>
      <Title level={4}>Pharmacy Sales Return Report</Title>
      <Card style={{ borderRadius: 10, marginBottom: 16 }}>
        <Space size="middle" wrap>
          <RangePicker value={dates} onChange={(d) => setDates(d || [dayjs().startOf('month'), dayjs().endOf('month')])} />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch} loading={loading}>Generate</Button>
          {summary && (
            <>
              <Button icon={<FilePdfOutlined />} onClick={() => downloadReport('pdf')}>PDF</Button>
              <Button icon={<FileExcelOutlined />} onClick={() => downloadReport('excel')}>Excel</Button>
            </>
          )}
        </Space>
      </Card>

      {summary && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}><Card size="small"><Statistic title="Total Returns" value={summary.totalReturns} /></Card></Col>
          <Col xs={12} sm={6}><Card size="small"><Statistic title="Return Amount" value={summary.totalAmount} precision={2} prefix="₹" valueStyle={{ color: '#DC2626' }} /></Card></Col>
          <Col xs={12} sm={6}><Card size="small"><Statistic title="Total Qty" value={summary.totalQty} /></Card></Col>
          <Col xs={12} sm={6}><Card size="small"><Statistic title="Tax" value={summary.totalTax} precision={2} prefix="₹" /></Card></Col>
        </Row>
      )}

      {byReason.length > 0 && (
        <Card size="small" title="Returns by Reason" style={{ borderRadius: 10, marginBottom: 16 }}>
          <Table dataSource={byReason} columns={reasonColumns} rowKey="reason" pagination={false} size="small" />
        </Card>
      )}

      <Card style={{ borderRadius: 10 }}>
        <Table dataSource={data} columns={columns} rowKey="_id" loading={loading}
          pagination={{ pageSize: 20 }} scroll={{ x: 900 }} />
      </Card>
    </div>
  );
}
