import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Space, message, Button } from 'antd';
import { StarOutlined, StarFilled } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../../Utils/api';

interface StarredProject {
  _id: string;
  project: {
    _id: string;
    project_name: string;
    project_desc: string;
    group: {
      _id: string;
      group_name: string;
    };
  };
  createdAt: string;
}

const MyStars: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<StarredProject[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStars();
  }, []);

  const fetchStars = async () => {
    setLoading(true);
    try {
      const response = await api.get('/user/stars');
      setProjects(response.data.data || []);
    } catch (error: any) {
      message.error(error.response?.data?.message || t('user.stars.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleUnstar = async (projectId: string) => {
    try {
      await api.delete(`/user/stars/${projectId}`);
      message.success(t('user.stars.unstarSuccess'));
      fetchStars();
    } catch (error: any) {
      message.error(error.response?.data?.message || t('user.stars.operationFailed'));
    }
  };

  const columns = [
    {
      title: t('project.projectName'),
      dataIndex: 'project',
      key: 'project_name',
      render: (project: any) => (
        <a onClick={() => navigate(`/project/${project._id}/interface`)}>{project.project_name}</a>
      ),
    },
    {
      title: t('project.group'),
      dataIndex: 'project',
      key: 'group',
      render: (project: any) => project?.group?.group_name || '-',
    },
    {
      title: t('common.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: t('common.operation'),
      key: 'action',
      render: (_: any, record: StarredProject) => (
        <Button
          type="link"
          danger
          icon={<StarOutlined />}
          onClick={() => handleUnstar(record.project._id)}
        >
          {t('user.stars.unstar')}
        </Button>
      ),
    },
  ];

  return (
    <Card title={t('user.stars.title')} icon={<StarFilled />}>
      <Table columns={columns} dataSource={projects} rowKey="_id" loading={loading} />
    </Card>
  );
};

export default MyStars;

