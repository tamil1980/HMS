import { useState, useEffect } from 'react';
import { Card, DatePicker, Button, Table, Typography, Space, Statistic, Row, Col, message } from 'antd';
import { SearchOutlined, FilePdfOutlined, FileExcelOutlined } from '@ant-design/icons';
import { labAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

export default function LabCollectionReport() {
  const [dates, setDates] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async (start, end) => {
    setLoading(true);
    try {
      const params = { fromDate: start.format('YYYY-MM-DD'), toDate: end.format('YYYY-MM-DD') };
      const res = await labAPI.collectionReport(params);
      setData(res.data.bills);
      setSummary(res.data.summary);
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
      const res = await labAPI.collectionReportFile(params);
      const ext = format === 'excel' ? 'xlsx' : 'pdf';
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `LabCollectionReport_${params.fromDate}_to_${params.toDate}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch { message.error('Download failed'); }
  };

  const columns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'sno', width: 55, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{i + 1}</div> },
    { title: 'Bill', dataIndex: 'billId', key: 'id' },
    { title: 'Patient', dataIndex: ['patient', 'name'], key: 'patient', render: (t) => t || '-' },
    { title: 'Date', dataIndex: 'billDate', key: 'date', render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
    { title: 'Total', dataIndex: 'grandTotal', key: 'total', render: (t) => (t || 0) },
    { title: 'Tax', dataIndex: 'tax', key: 'tax', render: (t) => (t || 0) },
    { title: 'Paid', dataIndex: 'amountPaid', key: 'paid', render: (t) => (t || 0) },
    { title: 'Due', dataIndex: 'amountDue', key: 'due', render: (t) => (t || 0) },
    { title: 'Payment Mode', dataIndex: 'paymentMode', key: 'paymentMode', render: (m) => (m || '-') },
  ];

  return (
    <div>
      <Title level={4}>Laboratory Collection Report</Title>
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
          <Col xs={12} sm={6}><Card size="small"><Statistic title="Total Bills" value={summary.totalBills} /></Card></Col>
          <Col xs={12} sm={6}><Card size="small"><Statistic title="Total Amount" value={summary.totalAmount} precision={2} prefix="₹" valueStyle={{ color: '#2563EB' }} /></Card></Col>
          <Col xs={12} sm={6}><Card size="small"><Statistic title="Total Collected" value={summary.totalPaid} precision={2} prefix="₹" valueStyle={{ color: '#059669' }} /></Card></Col>
          <Col xs={12} sm={6}><Card size="small"><Statistic title="Total Due" value={summary.totalDue} precision={2} prefix="₹" valueStyle={{ color: '#DC2626' }} /></Card></Col>
        </Row>
      )}

      <Card style={{ borderRadius: 10 }}>
        <Table dataSource={data} columns={columns} rowKey="_id" loading={loading}
          pagination={{ pageSize: 20 }} scroll={{ x: 700 }} />
      </Card>
    </div>
  );
}
