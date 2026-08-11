import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu, Button, Avatar, Dropdown, Typography, Modal, Form, Input, message, Drawer } from 'antd';
import {
  DashboardOutlined, UserOutlined, TeamOutlined, CalendarOutlined,
  FileTextOutlined, DollarOutlined, FundOutlined, AppstoreOutlined,
  SettingOutlined, LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
  MenuOutlined, MedicineBoxOutlined, ExperimentOutlined, ShopOutlined,
  FileDoneOutlined, InboxOutlined, DatabaseOutlined, HomeOutlined,
  HeartOutlined, FilePdfOutlined, AuditOutlined, IdcardOutlined,
  InsuranceOutlined, CreditCardOutlined, BarChartOutlined, BankOutlined,
  SolutionOutlined, PartitionOutlined, UserAddOutlined,
  EditOutlined, SearchOutlined, FileSearchOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

const { Header, Sider, Content } = AntLayout;
const { Text } = Typography;

const ROLE = {
  all: ['admin', 'doctor', 'nurse', 'receptionist', 'lab', 'pharmacy', 'accountant', 'staff'],
  admin: ['admin'],
  adminStaff: ['admin', 'staff'],
  front: ['admin', 'receptionist', 'staff'],
  clinical: ['admin', 'doctor', 'staff'],
  nursing: ['admin', 'nurse', 'staff'],
  lab: ['admin', 'lab', 'staff'],
  pharmacy: ['admin', 'pharmacy', 'staff'],
  account: ['admin', 'accountant', 'staff'],
  billing: ['admin', 'accountant', 'receptionist', 'staff'],
};

const allMenuItems = [
  { key: '/dashboard', icon: <DashboardOutlined style={{ color: '#2563EB' }} />, label: 'Dashboard', roles: ROLE.all },

  {
    key: '/op', icon: <SolutionOutlined style={{ color: '#0891B2' }} />, label: 'OP (Outpatient)',
    children: [
      { key: '/op-registration', icon: <UserOutlined />, label: 'OP Registration', roles: ROLE.front },
      { key: '/case-sheets', icon: <FileTextOutlined />, label: 'Consultation & Prescription', roles: ROLE.clinical },
      { key: '/op-patient/edit', icon: <EditOutlined />, label: 'Edit Patient', roles: ROLE.front },
      { key: '/op-patient/search', icon: <SearchOutlined />, label: 'Search Patient', roles: ROLE.front },
      { key: '/op-patient/history', icon: <FileSearchOutlined />, label: 'Patient History', roles: ROLE.front },
    ],
  },

  { key: '/appointments', icon: <CalendarOutlined style={{ color: '#D97706' }} />, label: 'Appointment', roles: ROLE.front },

  {
    key: '/ip', icon: <HomeOutlined style={{ color: '#DC2626' }} />, label: 'IP (Inpatient)',
    children: [
      { key: '/ip/admissions', icon: <UserOutlined />, label: 'Admissions', roles: ROLE.nursing },
      { key: '/ip/admissions/new', icon: <UserAddOutlined />, label: 'New Admission', roles: ROLE.nursing },
      { key: '/ip/components', icon: <AuditOutlined />, label: 'Billing Components', roles: ROLE.adminStaff },
      { key: '/ip/bills', icon: <DollarOutlined />, label: 'IP Billing', roles: ROLE.billing },
      { key: '/ip/case-sheets', icon: <FileTextOutlined />, label: 'IP Case Sheets', roles: ROLE.clinical },
      { key: '/ip/monitoring', icon: <HeartOutlined />, label: 'Patient Monitoring', roles: ROLE.nursing },
      { key: '/ip/pharmacy', icon: <MedicineBoxOutlined />, label: 'IP Pharmacy', roles: ROLE.pharmacy },
      { key: '/ip/discharge', icon: <FilePdfOutlined />, label: 'Discharge Summary', roles: ROLE.clinical },
    ],
  },

  {
    key: '/doctors', icon: <MedicineBoxOutlined style={{ color: '#7C3AED' }} />, label: 'Doctor Management',
    children: [
      { key: '/consultants', icon: <IdcardOutlined />, label: 'Doctor Details', roles: ROLE.adminStaff },
      { key: '/consultants/new', icon: <UserAddOutlined />, label: 'Add Doctor', roles: ROLE.admin },
      { key: '/leaves', icon: <CalendarOutlined />, label: 'Doctor Leave', roles: ROLE.adminStaff },
    ],
  },

  {
    key: '/nurses', icon: <HeartOutlined style={{ color: '#DB2777' }} />, label: 'Nurse Management',
    children: [
      { key: '/nurses', icon: <TeamOutlined />, label: 'Nurse Details', roles: ROLE.adminStaff },
      { key: '/nurses/duty', icon: <CalendarOutlined />, label: 'Duty Schedule', roles: ROLE.adminStaff },
    ],
  },

  {
    key: '/wards', icon: <PartitionOutlined style={{ color: '#0D9488' }} />, label: 'Ward/Room',
    children: [
      { key: '/wards', icon: <BankOutlined />, label: 'Wards, Rooms & Beds', roles: ROLE.nursing },
      { key: '/wards/availability', icon: <DatabaseOutlined />, label: 'Bed Availability', roles: ROLE.nursing },
    ],
  },

  {
    key: '/pharmacy', icon: <ShopOutlined style={{ color: '#D97706' }} />, label: 'Pharmacy',
    children: [
      { key: '/pharmacy/medicines', icon: <MedicineBoxOutlined />, label: 'Medicines', roles: ROLE.pharmacy },
      { key: '/pharmacy/bills', icon: <DollarOutlined />, label: 'Sales (Bills)', roles: ROLE.billing },
      { key: '/pharmacy/grns', icon: <InboxOutlined />, label: 'Purchase (GRN)', roles: ROLE.pharmacy },
      { key: '/pharmacy/returns', icon: <RollbackOutlined />, label: 'Sales Returns', roles: ROLE.pharmacy },
      { key: '/pharmacy/stock-report', icon: <DatabaseOutlined />, label: 'Stock & Expiry', roles: ROLE.pharmacy },
      { key: '/pharmacy/collection-report', icon: <FundOutlined />, label: 'Collection Report', roles: ROLE.account },
      { key: '/pharmacy/returns/report', icon: <RollbackOutlined />, label: 'Returns Report', roles: ROLE.account },
    ],
  },

  {
    key: '/lab', icon: <ExperimentOutlined style={{ color: '#0891B2' }} />, label: 'Laboratory',
    children: [
      { key: '/lab/tests', icon: <ExperimentOutlined />, label: 'Test Catalog', roles: ROLE.lab },
      { key: '/lab/bills', icon: <DollarOutlined />, label: 'Test Booking (Bills)', roles: ROLE.billing },
      { key: '/lab/results', icon: <FileDoneOutlined />, label: 'Sample & Reports', roles: ROLE.lab },
      { key: '/lab/collection-report', icon: <FundOutlined />, label: 'Collection Report', roles: ROLE.account },
    ],
  },

  {
    key: '/radiology', icon: <FilePdfOutlined style={{ color: '#6366F1' }} />, label: 'Radiology',
    children: [
      { key: '/radiology/tests', icon: <ExperimentOutlined />, label: 'X-Ray / CT / MRI / USG', roles: ROLE.lab },
      { key: '/radiology/bills', icon: <DollarOutlined />, label: 'Booking (Bills)', roles: ROLE.billing },
      { key: '/radiology/reports', icon: <FileDoneOutlined />, label: 'Reports', roles: ROLE.lab },
    ],
  },

  {
    key: '/billing', icon: <CreditCardOutlined style={{ color: '#DC2626' }} />, label: 'Billing',
    children: [
      { key: '/invoices', icon: <FileTextOutlined />, label: 'OP Bill', roles: ROLE.billing },
      { key: '/ip/bills', icon: <HomeOutlined />, label: 'IP Bill', roles: ROLE.billing },
      { key: '/lab/bills', icon: <ExperimentOutlined />, label: 'Lab Bill', roles: ROLE.billing },
      { key: '/pharmacy/bills', icon: <MedicineBoxOutlined />, label: 'Pharmacy Bill', roles: ROLE.billing },
      { key: '/radiology/bills', icon: <FilePdfOutlined />, label: 'Radiology Bill', roles: ROLE.billing },
    ],
  },

  { key: '/payments', icon: <DollarOutlined style={{ color: '#16A34A' }} />, label: 'Payment', roles: ROLE.billing },

  {
    key: '/insurance', icon: <InsuranceOutlined style={{ color: '#0D9488' }} />, label: 'Insurance',
    children: [
      { key: '/insurance/companies', icon: <BankOutlined />, label: 'Insurance Company', roles: ROLE.account },
      { key: '/insurance/claims', icon: <FileDoneOutlined />, label: 'Claims', roles: ROLE.account },
    ],
  },

  {
    key: '/inventory', icon: <InboxOutlined style={{ color: '#B45309' }} />, label: 'Inventory',
    children: [
      { key: '/pharmacy/suppliers', icon: <TeamOutlined />, label: 'Suppliers', roles: ROLE.pharmacy },
      { key: '/pharmacy/grns', icon: <InboxOutlined />, label: 'Purchase (GRN)', roles: ROLE.pharmacy },
      { key: '/pharmacy/stock-report', icon: <DatabaseOutlined />, label: 'Stock', roles: ROLE.pharmacy },
    ],
  },

  {
    key: '/employees', icon: <TeamOutlined style={{ color: '#7C3AED' }} />, label: 'Employee',
    children: [
      { key: '/employees', icon: <IdcardOutlined />, label: 'Staff Details', roles: ROLE.account },
      { key: '/attendance', icon: <CalendarOutlined />, label: 'Attendance', roles: ROLE.account },
      { key: '/salaries', icon: <DollarOutlined />, label: 'Salary', roles: ROLE.account },
    ],
  },

  { key: '/reports', icon: <BarChartOutlined style={{ color: '#0891B2' }} />, label: 'Reports', roles: ROLE.account },

  { key: '/masters', icon: <AppstoreOutlined style={{ color: '#0891B2' }} />, label: 'Masters', roles: ROLE.adminStaff },
  { key: '/users', icon: <AuditOutlined style={{ color: '#D97706' }} />, label: 'User Management', roles: ROLE.admin },
  { key: '/settings', icon: <SettingOutlined style={{ color: '#6B7280' }} />, label: 'Settings', roles: ROLE.admin },
];

const filterMenu = (items, role) => {
  return items.reduce((acc, item) => {
    if (item.children) {
      const children = filterMenu(item.children, role);
      if (children.length > 0) {
        const { roles, ...rest } = item;
        acc.push({ ...rest, children });
      }
      return acc;
    }
    if ((item.roles || []).includes(role)) {
      const { roles, ...rest } = item;
      acc.push(rest);
    }
    return acc;
  }, []);
};

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = filterMenu(allMenuItems, user?.role);

  const segments = location.pathname.split('/').filter(Boolean);
  const selectedKey = '/' + segments.slice(0, 2).join('/');
  const group = segments[0] === 'op-patient' ? 'op' : segments[0];
  const openKey = segments.length > 1 && segments[0] !== 'dashboard'
    ? '/' + group : undefined;

  const userMenu = {
    items: [
      { key: 'profile', label: `${user?.name} (${user?.role})`, disabled: true },
      { type: 'divider' },
      { key: 'profile-edit', icon: <UserOutlined />, label: 'Profile / Change Password', onClick: () => setProfileOpen(true) },
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Logout', onClick: handleLogout },
    ],
  };

  const menu = (
    <Menu theme={isMobile ? 'light' : 'dark'} mode="inline" selectedKeys={[selectedKey]}
      defaultOpenKeys={openKey ? [openKey] : []}
      items={menuItems}
      onClick={({ key }) => {
        navigate(key);
        if (isMobile) setDrawerOpen(false);
      }} />
  );

  return (
    <AntLayout style={{ minHeight: '100vh', width: '100%', overflowX: 'hidden' }}>
      {!isMobile && (
        <Sider trigger={null} collapsible collapsed={collapsed} theme="dark"
          style={{ boxShadow: '2px 0 8px rgba(0,0,0,0.05)' }}>
          <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            {!collapsed && (
              <svg width="22" height="22" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="48" fill="#2563EB" />
                <circle cx="50" cy="50" r="38" fill="#fff" />
                <rect x="42" y="20" width="16" height="60" rx="4" fill="#ef4444" />
                <rect x="20" y="42" width="60" height="16" rx="4" fill="#ef4444" />
              </svg>
            )}
            <Text strong style={{ color: '#fff', fontSize: collapsed ? 14 : 16, whiteSpace: 'nowrap' }}>
              {collapsed ? 'VJ' : 'VJS Soft Systems'}
            </Text>
          </div>
          {menu}
        </Sider>
      )}
      <AntLayout style={{ minWidth: 0 }}>
        <Header style={{ background: '#fff', padding: isMobile ? '0 8px' : '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', gap: 8 }}>
          <Button type="text" icon={isMobile ? <MenuOutlined /> : (collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />)}
            onClick={isMobile ? () => setDrawerOpen(true) : () => setCollapsed(!collapsed)} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'center', minWidth: 0, padding: '0 4px' }}>
            {!isMobile && (
              <svg width="30" height="30" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="48" fill="#2563EB" />
                <circle cx="50" cy="50" r="38" fill="#fff" />
                <rect x="42" y="20" width="16" height="60" rx="4" fill="#ef4444" />
                <rect x="20" y="42" width="60" height="16" rx="4" fill="#ef4444" />
              </svg>
            )}
            <Text strong style={{ fontSize: isMobile ? 14 : 18, color: '#2563EB', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {isMobile ? 'VJS HMS' : 'Hospital Management Solution'}
            </Text>
          </div>
          <Dropdown menu={userMenu} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#2563EB', flexShrink: 0 }} />
              {!isMobile && <Text style={{ whiteSpace: 'nowrap' }}>{user?.name}</Text>}
              {!isMobile && <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>({user?.role})</Text>}
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: isMobile ? 12 : 24, minHeight: 280, minWidth: 0 }}>
          <Outlet />
        </Content>
      </AntLayout>

      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="22" height="22" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="48" fill="#2563EB" />
              <circle cx="50" cy="50" r="38" fill="#fff" />
              <rect x="42" y="20" width="16" height="60" rx="4" fill="#ef4444" />
              <rect x="20" y="42" width="60" height="16" rx="4" fill="#ef4444" />
            </svg>
            <Text strong>VJS Soft Systems</Text>
          </div>
        }
        placement="left"
        width={280}
        open={isMobile && drawerOpen}
        onClose={() => setDrawerOpen(false)}
        styles={{ body: { padding: 0 } }}
      >
        {menu}
      </Drawer>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </AntLayout>
  );
}

function ProfileModal({ open, onClose }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (open && user) form.setFieldsValue({ name: user.name, email: user.email, phone: user.phone });
  }, [open, user]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await authAPI.updateProfile({ name: values.name, email: values.email, phone: values.phone });
      if (values.newPassword) {
        await authAPI.changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      }
      message.success('Profile updated');
      if (values.newPassword) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        message.info('Password changed. Please sign in again.');
        setTimeout(() => { window.location.href = '/login'; }, 800);
      } else {
        const me = await authAPI.getMe();
        localStorage.setItem('user', JSON.stringify(me.data));
        onClose();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Profile & Change Password" open={open} onCancel={onClose} footer={null}>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="email" label="Email" rules={[{ required: true }, { type: 'email' }]}><Input /></Form.Item>
        <Form.Item name="phone" label="Phone"><Input /></Form.Item>
        <Form.Item name="currentPassword" label="Current Password (required to change password)">
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item name="newPassword" label="New Password (leave blank to keep)">
          <Input.Password />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>Save</Button>
      </Form>
    </Modal>
  );
}
