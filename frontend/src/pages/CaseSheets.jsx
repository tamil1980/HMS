import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Space, Card, message, Typography, Tag, DatePicker, Select, Tooltip } from 'antd';
import { PlusOutlined, EyeOutlined, FilePdfOutlined, PrinterOutlined, MessageOutlined, SearchOutlined } from '@ant-design/icons';
import { caseSheetAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

export default function CaseSheets() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [dateRange, setDateRange] = useState([]);
  const navigate = useNavigate();

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: pagination.pageSize };
      if (dateRange[0]) params.fromDate = dateRange[0].format('YYYY-MM-DD');
      if (dateRange[1]) params.toDate = dateRange[1].format('YYYY-MM-DD');
      const res = await caseSheetAPI.getAll(params);
      setData(res.data.caseSheets);
      setPagination(prev => ({ ...prev, current: page, total: res.data.total }));
    } catch { message.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [dateRange]);

  const downloadPDF = async (rec) => {
    try {
      const res = await caseSheetAPI.getPDF(rec._id, true);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const name = (rec.patient?.name || 'Unknown').replace(/[^a-zA-Z0-9]/g, '_');
      link.setAttribute('download', `CaseSheet_${rec.caseSheetId || rec._id}_${name}_${rec.patient?.patientId || ''}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch { message.error('Download failed'); }
  };

  const printPDF = async (rec) => {
    try {
      const res = await caseSheetAPI.getPDF(rec._id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(`<embed src="${url}" type="application/pdf" width="100%" height="100%" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none">`);
        w.document.close();
      }
    } catch { message.error('Print failed'); }
  };

  const columns = [
    {
      title: <div style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>S.No</div>,
      key: 'sno', width: 65, align: 'center',
      render: (t, r, i) => <div style={{ textAlign: 'center' }}>{((pagination.current - 1) * pagination.pageSize) + i + 1}</div>
    },
    { title: 'Sheet ID', dataIndex: 'caseSheetId', key: 'id' },
    { title: 'Patient', dataIndex: ['patient', 'name'], key: 'patient', render: (t) => t || '-' },
    { title: 'Doctor', dataIndex: ['consultant', 'name'], key: 'consultant', render: (t) => t || '-' },
    { title: 'Date', dataIndex: 'date', key: 'date', render: (d) => (d ? dayjs(d).format('DD/MM/YYYY') : '-') },
    { title: 'Diagnosis', dataIndex: 'diagnosis', key: 'diagnosis', ellipsis: true },
    { title: 'Investigations', dataIndex: 'investigations', key: 'investigations', ellipsis: true, render: (inv) => (inv?.length ? inv.map(i => i.name).filter(Boolean).join(', ') : '-') },
    {
      title: 'Actions', key: 'actions', width: 185,
      render: (_, rec) => (
        <Space>
          <Tooltip title="WhatsApp"><Button type="text" icon={<MessageOutlined style={{ color: '#25D366' }} />} onClick={() => rec.patient?.phone && window.open(`https://wa.me/${rec.patient.phone.replace(/[^0-9]/g, '')}`, '_blank')} /></Tooltip>
          <Tooltip title="View"><Button type="text" icon={<EyeOutlined />} onClick={() => navigate(`/case-sheets/${rec._id}/edit`)} /></Tooltip>
          <Tooltip title="Print"><Button type="text" icon={<PrinterOutlined />} onClick={() => printPDF(rec)} /></Tooltip>
          <Tooltip title="Download PDF"><Button type="text" icon={<FilePdfOutlined />} onClick={() => downloadPDF(rec)} /></Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Card style={{ borderRadius: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Title level={4} style={{ margin: 0 }}>OP Case Sheets</Title>
        <Space>
          <RangePicker value={dateRange} onChange={(d) => setDateRange(d || [])} allowClear />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/case-sheets/new')}>New Case Sheet</Button>
        </Space>
      </div>
      <Table dataSource={data} columns={columns} rowKey="_id" loading={loading}
        pagination={{ ...pagination, onChange: (page) => fetchData(page), showSizeChanger: false }}
        scroll={{ x: 700 }} />
    </Card>
  );
}
