import React from 'react';
import { Layout, Menu, Dropdown, Avatar, Space, Button } from 'antd';
import { UserOutlined, LogoutOutlined, SettingOutlined, GithubOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { logout } from '../../Reducer/Modules/User';
import type { RootState } from '../../Reducer/Create';
import type { MenuProps } from 'antd';
import LanguageSwitcher from '../LanguageSwitcher';
import { getAvatarUrl } from '../../Utils/avatar';

const { Header: AntHeader } = Layout;

interface HeaderProps {
  children?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ children }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useSelector((state: RootState) => state.user.user);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: t('user.personalCenter'),
      onClick: () => navigate('/user/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: t('user.settings'),
      onClick: () => navigate('/user/settings'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('auth.logout'),
      onClick: handleLogout,
    },
  ];

  return (
    <AntHeader
      style={{
        background: '#fff',
        padding: '0 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {children}
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{t('app.title')}</div>
      </div>
      <Space>
        <Button
          type="text"
          icon={<GithubOutlined />}
          onClick={() => window.open('https://github.com/hanyouqing/apiadmin', '_blank')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          GitHub
        </Button>
        <LanguageSwitcher />
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <Space style={{ cursor: 'pointer' }}>
            <Avatar icon={<UserOutlined />} src={getAvatarUrl(user?.avatar)} />
            <span>{user?.username || t('common.user')}</span>
          </Space>
        </Dropdown>
      </Space>
    </AntHeader>
  );
};

export default Header;

