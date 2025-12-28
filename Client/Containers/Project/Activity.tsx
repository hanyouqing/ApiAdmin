import React, { useEffect, useState, useMemo } from 'react';
import { Card, List, Empty, Avatar, Tag, Typography, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import { useParams, useLocation } from 'react-router-dom';
import { api } from '../../Utils/api';
import { UserOutlined } from '@ant-design/icons';
import { getAvatarUrl } from '../../Utils/avatar';

const { Text } = Typography;

const Activity: React.FC = () => {
  const params = useParams<{ projectId?: string }>();
  const location = useLocation();
  const { t } = useTranslation();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 从路由路径中提取 projectId
  const projectId = useMemo(() => {
    const routeKeywords = ['interface', 'test', 'setting', 'activity'];
    
    if (params.projectId) {
      // 如果 params.projectId 是路由关键字，返回空
      if (routeKeywords.includes(params.projectId)) {
        return '';
      }
      return params.projectId;
    }
    
    // 从 URL 路径中提取：/project/:projectId/activity
    const pathMatch = location.pathname.match(/\/project\/([^/]+)/);
    if (pathMatch && pathMatch[1]) {
      const extractedId = pathMatch[1];
      // 排除路由关键字
      if (routeKeywords.includes(extractedId)) {
        return '';
      }
      return extractedId;
    }
    return '';
  }, [params.projectId, location.pathname]);

  useEffect(() => {
    // 确保 projectId 有效且不是路由关键字
    if (projectId && 
        projectId !== 'interface' && 
        projectId !== 'test' && 
        projectId !== 'setting' && 
        projectId !== 'activity' &&
        projectId.length > 0) {
      fetchActivities();
    }
  }, [projectId]);

  const fetchActivities = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const response = await api.get('/project/activities', {
        params: { project_id: projectId },
      });
      setActivities(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionLabel = (action: string) => {
    const actionMap: Record<string, string> = {
      'project.created': t('project.activity.projectCreated'),
      'project.updated': t('project.activity.projectUpdated'),
      'project.deleted': t('project.activity.projectDeleted'),
      'interface.created': t('project.activity.interfaceCreated'),
      'interface.updated': t('project.activity.interfaceUpdated'),
      'interface.deleted': t('project.activity.interfaceDeleted'),
      'interface.run': t('project.activity.interfaceRun'),
      'member.added': t('project.activity.memberAdded'),
      'member.removed': t('project.activity.memberRemoved'),
      'environment.added': t('project.activity.environmentAdded'),
      'environment.updated': t('project.activity.environmentUpdated'),
      'environment.deleted': t('project.activity.environmentDeleted'),
    };
    return actionMap[action] || action;
  };

  const getActionColor = (action: string) => {
    if (action.includes('created') || action.includes('added')) return 'green';
    if (action.includes('deleted') || action.includes('removed')) return 'red';
    if (action.includes('updated')) return 'blue';
    return 'default';
  };

  return (
    <Card title={t('project.tabs.activity')}>
      {activities.length === 0 ? (
        <Empty description={t('project.activity.empty')} />
      ) : (
        <List
          loading={loading}
          dataSource={activities}
          renderItem={(activity: any) => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar src={getAvatarUrl(activity.user_id?.avatar)} icon={<UserOutlined />} />}
                title={
                  <Space>
                    <Text strong>{activity.user_id?.username || 'Unknown'}</Text>
                    <Tag color={getActionColor(activity.action)}>
                      {getActionLabel(activity.action)}
                    </Tag>
                  </Space>
                }
                description={
                  <div>
                    <Text type="secondary">{activity.description}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {new Date(activity.created_at).toLocaleString()}
                    </Text>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
};

export default Activity;
