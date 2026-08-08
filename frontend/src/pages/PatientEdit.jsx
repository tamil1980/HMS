import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, Table, Button, Input, Space, message, Tag, Typography, Spin, Result, Tooltip } from 'antd';
import { ArrowLeftOutlined, SearchOutlined, EditOutlined } from '@ant-design/icons';
import { patientAPI } from '../services/api';
import PatientForm from '../components/PatientForm';

const { Title } = Typography;

export default function PatientEdit() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const id = searchParams.get('id');

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [data, setData] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });

  const fetchPatient = async (pid) => {
    setLoading(true);
    setNotFound(false);
    try {
      const res = await patientAPI.getById(pid);
      setPatient(res.data);
    } catch { setNotFound(true); setPatient(null); }
    finally { setLoading(false); }
  };

  const fetchList = async (page = 1, term = '') => {
    setListLoading(true);
    try {
      const params = { page, limit: pagination.pageSize };
      if (term) params.search = term;
      const res = await patientAPI.getAll(params);
      setData(res.data.patients);
      setPagination(prev => ({ ...prev, current: page, total: res.data.total }));
    } catch { message.error('Failed to load patients'); }
    finally { setListLoading(false); }
  };

  useEffect(() => {
    if (id) fetchPatient(id);
    else { setPatient(null); setNotFound(false); fetchList(); }
  }, [id]);

  const select = (rec) => {
    setPatient(rec);
    navigate(`/op-patient/edit?id=${rec._id}`);
  };

  const columns = [
    { title: <div style={{ textAlign: 'center' }}>S.No</div>, key: 'sno', width: 55, align: 'center', render: (t, r, i) => <div style={{ textAlign: 'center' }}>{((pagination.current - 1) * pagination.pageSize) + i + 1}</div> },
    { title: 'Patient ID', dataIndex: 'patientId', width: 110, render: (t) => <Tag color="geekblue">{t || '—'}</Tag> },
    { title: 'Name', dataIndex: 'name', render: (t) => <strong>{t}</strong> },
    { title: 'Phone', dataIndex: 'phone', render: (t) => t || '—' },
    { title: 'Age', dataIndex: 'age', width: 60 },
    { title: 'Gender', dataIndex: 'gender', width: 90 },
    {
      title: '', key: 'action', width: 90,
      render: (_, rec) => (
        <Button type="link" icon={<EditOutlined />} onClick={() => select(rec)}>Edit</Button>
      ),
    },
  ];

  if (loading) return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;

  return (
    <Card style={{ borderRadius: 10, maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>{patient ? `Edit Patient — ${patient.name}` : 'Edit Patient'}</Title>
        {patient && (
          <Button icon={<ArrowLeftOutlined />} onClick={() => { setPatient(null); navigate('/op-patient/edit'); }}>
            Change Patient
          </Button>
        )}
      </div>

      {notFound ? (
        <Result status="404" title="Patient not found" extra={
          <Button type="primary" onClick={() => { setNotFound(false); navigate('/op-patient/edit'); }}>Back to list</Button>
        } />
      ) : patient ? (
        <PatientForm key={patient._id} initial={patient}
          onSaved={(p) => { setPatient(p); message.success('Saved'); }}
        />
      ) : (
        <>
          <Input.Search
            placeholder="Search patient to edit..."
            prefix={<SearchOutlined />}
            allowClear
            style={{ maxWidth: 380, marginBottom: 16 }}
            onSearch={(v) => fetchList(1, v)}
            onChange={(e) => { if (!e.target.value) fetchList(1, ''); }}
          />
          <Table dataSource={data} columns={columns} rowKey="_id" loading={listLoading}
            pagination={{ ...pagination, onChange: (page) => fetchList(page), showSizeChanger: false }}
            scroll={{ x: 800 }} />
        </>
      )}
    </Card>
  );
}
