import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Space, Card, message, Typography, Tooltip, Popconfirm } from 'antd';
import { PlusOutlined, EyeOutlined, FilePdfOutlined, PrinterOutlined, DeleteOutlined } from '@ant-design/icons';
import { pharmacyAPI } from '../services/api';
import { downloadBlob, printPDF } from '../utils/pdf';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function GRNs() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const navigate = useNavigate();

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const res = await pharmacyAPI.getGRNs({ page, limit: pagination.pageSize });
      setData(res.data.grns);
      setPagination(prev => ({ ...prev, current: page, total: res.data.total }));
    } catch { message.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const downloadPDF = async (rec) => {
    try {
      const res = await pharmacyAPI.getGRNPDF(rec._id, true);
      downloadBlob(res, `GRN_${rec.grnId}.pdf`);
    } catch { message.error('Download failed'); }
  };

  const print = async (rec) => {
    try {
      const res = await pharmacyAPI.getGRNPDF(rec._id);
      printPDF(res);
    } catch { message.error('Print failed'); }
  };

  const handleDelete = async (id) => {
    try {
      await pharmacyAPI.removeGRN(id);
      message.success('Deleted');
      fetchData();
    } catch { message.error('Delete failed'); }
  };

  const columns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'sno', width: 55, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{((pagination.current - 1) * pagination.pageSize) + i + 1}</div> },
    { title: 'GRN No', dataIndex: 'grnId', key: 'id' },
    { title: 'Supplier', dataIndex: ['supplier', 'name'], key: 'supplier', render: (t, rec) => t || rec.supplier?.company || '-' },
    { title: 'Date', dataIndex: 'grnDate', key: 'date', render: (d) => dayjs(d).format('DD/MM/YYYY') },
    { title: 'Items', key: 'items', render: (_, rec) => rec.items?.length || 0 },
    { title: 'Total', dataIndex: 'totalAmount', key: 'total', render: (t) => `₹${t || 0}` },
    {
      title: 'Actions', key: 'actions', width: 180,
      render: (_, rec) => (
        <Space>
          <Tooltip title="View"><Button type="text" icon={<EyeOutlined />} onClick={() => navigate(`/pharmacy/grns/${rec._id}/edit`)} /></Tooltip>
          <Tooltip title="Print"><Button type="text" icon={<PrinterOutlined />} onClick={() => print(rec)} /></Tooltip>
          <Tooltip title="Download PDF"><Button type="text" icon={<FilePdfOutlined />} onClick={() => downloadPDF(rec)} /></Tooltip>
          <Popconfirm title="Delete? (stock will be reduced)" onConfirm={() => handleDelete(rec._id)}>
            <Tooltip title="Delete"><Button type="text" danger icon={<DeleteOutlined />} /></Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card style={{ borderRadius: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Title level={4} style={{ margin: 0 }}>Goods Received Notes (GRN)</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/pharmacy/grns/new')}>New GRN</Button>
      </div>
      <Table dataSource={data} columns={columns} rowKey="_id" loading={loading}
        pagination={{ ...pagination, onChange: (page) => fetchData(page), showSizeChanger: false }}
        scroll={{ x: 800 }} />
    </Card>
  );
}
