import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Space, message } from 'antd';
import { ProjectOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../../Utils/api';

interface Project {
  _id: string;
  project_name: string;
  project_desc: string;
  group: {
    _id: string;
    group_name: string;
  };
  role: string;
  createdAt: string;
}

const MyProjects: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await api.get('/user/projects');
      setProjects(response.data.data || []);
    } catch (error: any) {
      message.error(error.response?.data?.message || t('user.projects.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: t('project.projectName'),
      dataIndex: 'project_name',
      key: 'project_name',
      render: (text: string, record: Project) => (
        <a onClick={() => navigate(`/project/${record._id}/interface`)}>{text}</a>
      ),
    },
    {
      title: t('project.group'),
      dataIndex: 'group',
      key: 'group',
      render: (group: any) => group?.group_name || '-',
    },
    {
      title: t('user.projects.role'),
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => <Tag>{role}</Tag>,
    },
    {
      title: t('common.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => new Date(text).toLocaleString(),
    },
  ];

  return (
    <Card title={t('user.projects.title')} icon={<ProjectOutlined />}>
      <Table columns={columns} dataSource={projects} rowKey="_id" loading={loading} />
    </Card>
  );
};

export default MyProjects;

