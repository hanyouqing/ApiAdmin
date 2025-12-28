import React, { useEffect, useMemo } from 'react';
import { Card, Row, Col, Statistic, List, Typography } from 'antd';
import { ProjectOutlined, FolderOutlined, ApiOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchGroups } from '../../Reducer/Modules/Group';
import { fetchProjects } from '../../Reducer/Modules/Project';
import { fetchInterfaces } from '../../Reducer/Modules/Interface';
import type { AppDispatch, RootState } from '../../Reducer/Create';

const { Title } = Typography;

const Home: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { groups } = useSelector((state: RootState) => state.group);
  const { projects } = useSelector((state: RootState) => state.project);
  const { interfaces } = useSelector((state: RootState) => state.interface);

  // Ensure groups, projects, and interfaces are arrays
  const safeGroups = Array.isArray(groups) ? groups : [];
  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeInterfaces = Array.isArray(interfaces) ? interfaces : [];

  useEffect(() => {
    dispatch(fetchGroups());
    dispatch(fetchProjects());
  }, [dispatch]);

  useEffect(() => {
    // Fetch interfaces for all projects to get total count
    if (safeProjects.length > 0) {
      const projectIds = safeProjects.map((p) => p._id);
      // Fetch all interfaces in parallel, errors are handled by the thunk
      projectIds.forEach((projectId) => {
        dispatch(fetchInterfaces(projectId)).catch(() => {
          // Silently handle errors - they're already logged by the API interceptor
        });
      });
    }
  }, [dispatch, safeProjects]);

  // Calculate total interface count from all projects
  const totalInterfaceCount = useMemo(() => {
    return safeInterfaces.length;
  }, [safeInterfaces]);

  return (
    <div>
      <Title level={2}>{t('home.welcome')}</Title>
      
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title={t('home.groupCount')}
              value={safeGroups.length}
              prefix={<FolderOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title={t('home.projectCount')}
              value={safeProjects.length}
              prefix={<ProjectOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title={t('home.interfaceCount')}
              value={totalInterfaceCount}
              prefix={<ApiOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title={t('home.recentProjects')} extra={<a href="/group">{t('common.viewAll')}</a>}>
            <List
              dataSource={safeProjects.slice(0, 5)}
              renderItem={(item) => (
                <List.Item
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/project/${item._id}`)}
                >
                  <List.Item.Meta
                    title={item.project_name}
                    description={item.project_desc}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title={t('home.recentGroups')} extra={<a href="/group">{t('common.viewAll')}</a>}>
            <List
              dataSource={safeGroups.slice(0, 5)}
              renderItem={(item) => (
                <List.Item
                  key={item._id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/group/${item._id}`)}
                >
                  <List.Item.Meta
                    title={item.group_name}
                    description={item.group_desc}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Home;

