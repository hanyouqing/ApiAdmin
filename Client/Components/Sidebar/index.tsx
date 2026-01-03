import React from 'react';
import { Layout, Menu, Spin } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import type { RootState } from '../../Reducer/Create';
import {
  FolderOutlined,
  SettingOutlined,
  HomeOutlined,
  ProjectOutlined,
  ApiOutlined,
  EnvironmentOutlined,
  ImportOutlined,
  ExperimentOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import Logo from '../Logo';

const { Sider } = Layout;

interface SidebarProps {
  collapsed?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const user = useSelector((state: RootState) => state.user.user);
  const testPipelineRunning = useSelector((state: RootState) => state.ui.testPipelineRunning);
  
  // 根据当前路径确定打开的菜单项
  const getOpenKeys = () => {
    const keys: string[] = [];
    if (location.pathname.startsWith('/admin')) {
      keys.push('/admin');
    }
    if (
      location.pathname.startsWith('/admin/code') || 
      location.pathname === '/project' || 
      location.pathname === '/project/list' ||
      location.pathname.startsWith('/project/') ||
      location.pathname === '/interface' ||
      location.pathname.startsWith('/interface/') ||
      location.pathname === '/environment' ||
      location.pathname.startsWith('/environment/') ||
      location.pathname === '/swagger-import' ||
      location.pathname.startsWith('/swagger-import/') ||
      location.pathname === '/postman-import' ||
      location.pathname.startsWith('/postman-import/') ||
      location.pathname === '/test-pipeline' ||
      location.pathname.startsWith('/test-pipeline/')
    ) {
      keys.push('/project');
    }
    return keys;
  };
  
  const [openKeys, setOpenKeys] = React.useState<string[]>(getOpenKeys());
  
  // 当路径变化时更新打开的菜单项
  React.useEffect(() => {
    setOpenKeys(getOpenKeys());
  }, [location.pathname]);

  // 调试：记录用户信息和角色（仅在开发环境）
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      if (user) {
        console.log('Sidebar - User info:', {
          userId: user._id,
          username: user.username,
          role: user.role,
          isSuperAdmin: user.role === 'super_admin',
        });
      } else {
        // 用户未登录时，这是正常情况，不需要警告
        // console.warn('Sidebar - User is null or undefined');
      }
    }
  }, [user]);
  
  // 构建系统管理子菜单项
  const adminMenuItems = [
    {
      key: '/admin/user',
      label: t('sidebar.adminUser'),
    },
    {
      key: '/admin/sso',
      label: t('sidebar.adminSSO'),
    },
    {
      key: '/admin/third-party-auth',
      label: t('sidebar.adminThirdPartyAuth'),
    },
    {
      key: '/admin/whitelist',
      label: t('sidebar.adminWhitelist'),
    },
    {
      key: '/admin/email',
      label: t('sidebar.adminEmail'),
    },
    {
      key: '/admin/ai',
      label: t('sidebar.adminAI'),
    },
    {
      key: '/admin/test',
      label: t('sidebar.adminTest'),
    },
    {
      key: '/admin/plugin',
      label: t('sidebar.adminPlugin'),
    },
    {
      key: '/admin/operation-log',
      label: t('sidebar.adminOperationLog'),
    },
    {
      key: '/admin/login-log',
      label: t('sidebar.adminLoginLog'),
    },
  ];

  // 检查用户是否有权限查看系统管理菜单
  const isSuperAdmin = user?.role === 'super_admin';
  
  const menuItems: MenuProps['items'] = [
    {
      key: '/group',
      icon: <FolderOutlined />,
      label: t('sidebar.group'),
    },
    {
      key: '/project',
      icon: <ProjectOutlined />,
      label: t('sidebar.project'),
      children: [
        {
          key: '/project/list',
          icon: <ProjectOutlined />,
          label: t('sidebar.projectManagement'),
        },
        {
          key: '/interface',
          icon: <ApiOutlined />,
          label: t('sidebar.interface'),
        },
        {
          key: '/environment',
          icon: <EnvironmentOutlined />,
          label: t('sidebar.environment'),
        },
        {
          key: '/swagger-import',
          icon: <ImportOutlined />,
          label: t('sidebar.swaggerImport'),
        },
        {
          key: '/postman-import',
          icon: <ImportOutlined />,
          label: t('sidebar.postmanImport'),
        },
        {
          key: '/test-pipeline',
          icon: <ExperimentOutlined />,
          label: (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {testPipelineRunning && (
                <Spin 
                  size="small" 
                  style={{ 
                    display: 'inline-block',
                  }}
                />
              )}
              {t('sidebar.testPipeline')}
            </span>
          ),
        },
        {
          key: '/admin/code',
          icon: <CodeOutlined />,
          label: t('sidebar.codeManagement'),
        },
      ],
    },
    // 系统管理菜单：只有超级管理员可见
    ...(isSuperAdmin
      ? [
          {
            key: '/admin',
            icon: <SettingOutlined />,
            label: t('sidebar.admin'),
            children: adminMenuItems,
          },
        ]
      : []),
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  return (
    <Sider
      width={200}
      collapsed={collapsed}
      collapsedWidth={80}
      style={{
        overflow: 'hidden',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        onClick={() => navigate('/')}
        style={{
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          color: '#fff',
          fontSize: collapsed ? '14px' : '18px',
          fontWeight: 'bold',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          cursor: 'pointer',
          gap: '12px',
          padding: collapsed ? '0' : '0 16px',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <Logo size={collapsed ? 32 : 28} collapsed={collapsed} />
        {!collapsed && (
          <span style={{ 
            fontSize: '18px',
            fontWeight: 600,
            letterSpacing: '0.5px',
          }}>
            ApiAdmin
          </span>
        )}
      </div>
      <div 
        style={{ 
          flex: 1, 
          overflowY: 'auto',
          overflowX: 'hidden',
          minHeight: 0,
          maxHeight: 'calc(100vh - 64px)',
        }}
      >
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          openKeys={openKeys}
          onOpenChange={setOpenKeys}
          items={menuItems}
          onClick={handleMenuClick}
          style={{
            height: '100%',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        />
      </div>
    </Sider>
  );
};

export default Sidebar;

