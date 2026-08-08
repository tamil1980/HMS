import { useState, useEffect } from 'react';
import { Card, Button, Table, Typography, Space, Statistic, Row, Col, message, Switch } from 'antd';
import { SearchOutlined, FilePdfOutlined, FileExcelOutlined } from '@ant-design/icons';
import { pharmacyAPI } from '../services/api';
import { downloadBlob } from '../utils/pdf';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function StockReport() {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lowOnly, setLowOnly] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = { lowStock: lowOnly ? 'true' : undefined };
      const res = await pharmacyAPI.stockReport(params);
      setData(res.data.report);
      setSummary(res.data.summary);
    } catch { message.error('Failed to load report'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReport(); }, [lowOnly]);

  const downloadReport = async (format) => {
    try {
      const params = { lowStock: lowOnly ? 'true' : undefined, format };
      const res = await pharmacyAPI.stockReportFile(params);
      const ext = format === 'excel' ? 'xlsx' : 'pdf';
      downloadBlob(res, `StockReport.${ext}`);
    } catch { message.error('Download failed'); }
  };

  const columns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'sno', width: 55, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{i + 1}</div> },
    { title: 'Code', dataIndex: 'medicineId', key: 'code', width: 90 },
    { title: 'Medicine', dataIndex: 'name', key: 'name', width: 200 },
    { title: 'Category', dataIndex: 'category', key: 'category', width: 110, render: (c) => c || '-' },
    { title: 'P.Price', dataIndex: 'purchasePrice', key: 'pp', width: 90, render: (p) => `₹${p || 0}` },
    { title: 'S.Price', dataIndex: 'salePrice', key: 'sp', width: 90, render: (p) => `₹${p || 0}` },
    { title: 'Qty', dataIndex: 'quantity', key: 'qty', width: 80, render: (q, rec) => <span style={{ color: rec.isLow ? '#DC2626' : '#059669', fontWeight: 600 }}>{q}</span> },
    { title: 'Reorder', dataIndex: 'reorderLevel', key: 'reorder', width: 80, render: (r) => r || 0 },
    { title: 'Expiry', dataIndex: 'expiryDate', key: 'expiry', width: 100, render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
    { title: 'Stock Value', dataIndex: 'stockValue', key: 'value', width: 100, render: (v) => `₹${(v || 0).toFixed(2)}` },
    { title: 'Alert', dataIndex: 'isLow', key: 'alert', width: 70, render: (l) => l ? <span style={{ color: '#DC2626', fontWeight: 600 }}>LOW</span> : '-' },
  ];

  return (
    <div>
      <Title level={4}>Pharmacy Stock Report</Title>
      <Card style={{ borderRadius: 10, marginBottom: 16 }}>
        <Space size="middle" wrap>
          <Space size={8}>
            <span>Low stock only</span>
            <Switch checked={lowOnly} onChange={setLowOnly} />
          </Space>
          <Button icon={<SearchOutlined />} onClick={fetchReport} loading={loading}>Refresh</Button>
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
          <Col xs={12} sm={6}><Card size="small"><Statistic title="Total Items" value={summary.totalItems} /></Card></Col>
          <Col xs={12} sm={6}><Card size="small"><Statistic title="Total Qty" value={summary.totalQty} /></Card></Col>
          <Col xs={12} sm={6}><Card size="small"><Statistic title="Stock Value" value={summary.totalValue} precision={2} prefix="₹" valueStyle={{ color: '#2563EB' }} /></Card></Col>
          <Col xs={12} sm={6}><Card size="small"><Statistic title="Low Stock Items" value={summary.lowCount} valueStyle={{ color: '#DC2626' }} /></Card></Col>
        </Row>
      )}

      <Card style={{ borderRadius: 10 }}>
        <Table dataSource={data} columns={columns} rowKey="medicineId" loading={loading}
          pagination={{ pageSize: 20 }} scroll={{ x: 900 }} />
      </Card>
    </div>
  );
}
