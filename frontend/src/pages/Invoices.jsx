import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Space, Card, message, Typography, Tag, DatePicker, Select, Tooltip } from 'antd';
import { PlusOutlined, EyeOutlined, FilePdfOutlined, PrinterOutlined, MessageOutlined } from '@ant-design/icons';
import { invoiceAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function Invoices() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: pagination.pageSize };
      if (statusFilter) params.status = statusFilter;
      const res = await invoiceAPI.getAll(params);
      setData(res.data.invoices);
      setPagination(prev => ({ ...prev, current: page, total: res.data.total }));
    } catch { message.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [statusFilter]);

  const downloadPDF = async (rec) => {
    try {
      const res = await invoiceAPI.getPDF(rec._id, true);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const name = (rec.patient?.name || 'Unknown').replace(/[^a-zA-Z0-9]/g, '_');
      link.setAttribute('download', `Invoice_${rec.invoiceId || rec._id}_${name}_${rec.patient?.patientId || ''}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch { message.error('Download failed'); }
  };

  const printPDF = async (rec) => {
    try {
      const res = await invoiceAPI.getPDF(rec._id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(`<embed src="${url}" type="application/pdf" width="100%" height="100%" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none">`);
        w.document.close();
      }
    } catch { message.error('Print failed'); }
  };

  const statusColors = { Paid: 'green', Partial: 'orange', Unpaid: 'red', Cancelled: 'default' };

  const columns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'sno', width: 55, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{((pagination.current - 1) * pagination.pageSize) + i + 1}</div> },
    { title: 'Invoice No', dataIndex: 'invoiceId', key: 'id' },
    { title: 'Patient', dataIndex: ['patient', 'name'], key: 'patient', render: (t) => t || '-' },
    { title: 'Date', dataIndex: 'invoiceDate', key: 'date', render: (d) => dayjs(d).format('DD/MM/YYYY') },
    { title: 'Total', dataIndex: 'grandTotal', key: 'total', render: (t) => t || 0 },
    { title: 'Paid', dataIndex: 'amountPaid', key: 'paid', render: (t) => t || 0 },
    { title: 'Due', dataIndex: 'amountDue', key: 'due', render: (t) => t || 0 },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={statusColors[s]}>{s}</Tag> },
    {
      title: 'Actions', key: 'actions', width: 170,
      render: (_, rec) => (
        <Space>
          <Tooltip title="WhatsApp"><Button type="text" icon={<MessageOutlined style={{ color: '#25D366' }} />} onClick={() => rec.patient?.phone && window.open(`https://wa.me/${rec.patient.phone.replace(/[^0-9]/g, '')}`, '_blank')} /></Tooltip>
          <Tooltip title="View"><Button type="text" icon={<EyeOutlined />} onClick={() => navigate(`/invoices/${rec._id}/edit`)} /></Tooltip>
          <Tooltip title="Print"><Button type="text" icon={<PrinterOutlined />} onClick={() => printPDF(rec)} /></Tooltip>
          <Tooltip title="Download PDF"><Button type="text" icon={<FilePdfOutlined />} onClick={() => downloadPDF(rec)} /></Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Card style={{ borderRadius: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Title level={4} style={{ margin: 0 }}>Invoices</Title>
        <Space>
          <Select value={statusFilter} onChange={setStatusFilter} allowClear placeholder="Filter status" style={{ width: 130 }}
            options={['Paid', 'Partial', 'Unpaid', 'Cancelled'].map(s => ({ value: s, label: s }))} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/invoices/new')}>New Invoice</Button>
        </Space>
      </div>
      <Table dataSource={data} columns={columns} rowKey="_id" loading={loading}
        pagination={{ ...pagination, onChange: (page) => fetchData(page), showSizeChanger: false }}
        scroll={{ x: 800 }} />
    </Card>
  );
}
