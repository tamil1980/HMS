import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Table, Button, Space, Card, message, Typography, Tag, Tooltip, Popconfirm, Select } from 'antd';
import { PlusOutlined, EyeOutlined, FilePdfOutlined, PrinterOutlined, DeleteOutlined } from '@ant-design/icons';
import { ipAPI } from '../services/api';
import { downloadBlob, printPDF } from '../utils/pdf';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function IPCaseSheets() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [admissions, setAdmissions] = useState([]);
  const [admission, setAdmission] = useState('');
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    ipAPI.getAdmissions({ limit: 100 }).then(res => setAdmissions(res.data.admissions)).catch(() => {});
    const qAdmission = params.get('admission');
    if (qAdmission) setAdmission(qAdmission);
  }, []);

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const q = { page, limit: pagination.pageSize };
      if (admission) q.admission = admission;
      const res = await ipAPI.getCaseSheets(q);
      setData(res.data.caseSheets);
      setPagination(prev => ({ ...prev, current: page, total: res.data.total }));
    } catch { message.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [admission]);

  const downloadPDF = async (rec) => {
    try {
      const res = await ipAPI.getCaseSheetPDF(rec._id, true);
      downloadBlob(res, `IPCaseSheet_${rec.caseSheetId || rec._id}_${rec.patient?.name || 'Unknown'}.pdf`);
    } catch { message.error('Download failed'); }
  };

  const print = async (rec) => {
    try { const res = await ipAPI.getCaseSheetPDF(rec._id); printPDF(res); }
    catch { message.error('Print failed'); }
  };

  const handleDelete = async (id) => {
    try { await ipAPI.removeCaseSheet(id); message.success('Deleted'); fetchData(); }
    catch { message.error('Delete failed'); }
  };

  const columns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'sno', width: 55, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{((pagination.current - 1) * pagination.pageSize) + i + 1}</div> },
    { title: 'Sheet ID', dataIndex: 'caseSheetId', key: 'id' },
    { title: 'Admission', dataIndex: ['admission', 'admissionId'], key: 'adm', render: (t) => t || '-' },
    { title: 'Patient', dataIndex: ['patient', 'name'], key: 'patient', render: (t) => t || '-' },
    { title: 'Doctor', dataIndex: ['consultant', 'name'], key: 'consultant', render: (t) => t || '-' },
    { title: 'Date', dataIndex: 'date', key: 'date', render: (d) => dayjs(d).format('DD/MM/YYYY') },
    { title: 'Shift', dataIndex: 'shift', key: 'shift', render: (s) => <Tag color="blue">{s}</Tag> },
    { title: 'Diagnosis', dataIndex: 'diagnosis', key: 'diagnosis', ellipsis: true },
    {
      title: 'Actions', key: 'actions', width: 180,
      render: (_, rec) => (
        <Space>
          <Tooltip title="View"><Button type="text" icon={<EyeOutlined />} onClick={() => navigate(`/ip/case-sheets/${rec._id}/edit`)} /></Tooltip>
          <Tooltip title="Print"><Button type="text" icon={<PrinterOutlined />} onClick={() => print(rec)} /></Tooltip>
          <Tooltip title="Download PDF"><Button type="text" icon={<FilePdfOutlined />} onClick={() => downloadPDF(rec)} /></Tooltip>
          <Popconfirm title="Delete?" onConfirm={() => handleDelete(rec._id)}>
            <Tooltip title="Delete"><Button type="text" danger icon={<DeleteOutlined />} /></Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card style={{ borderRadius: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Title level={4} style={{ margin: 0 }}>IP Case Sheets</Title>
        <Space>
          <Select value={admission} onChange={setAdmission} placeholder="Filter by admission" allowClear style={{ width: 280 }} showSearch
            filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
            {admissions.map(a => <Select.Option key={a._id} value={a._id}>{a.admissionId} - {a.patient?.name}</Select.Option>)}
          </Select>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate(admission ? `/ip/case-sheets/new?admission=${admission}` : '/ip/case-sheets/new')}>New Case Sheet</Button>
        </Space>
      </div>
      <Table dataSource={data} columns={columns} rowKey="_id" loading={loading}
        pagination={{ ...pagination, onChange: (page) => fetchData(page), showSizeChanger: false }}
        scroll={{ x: 900 }} />
    </Card>
  );
}
