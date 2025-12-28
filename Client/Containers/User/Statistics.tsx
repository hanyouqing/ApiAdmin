import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import { ProjectOutlined, ApiOutlined, CheckCircleOutlined, EditOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { api } from '../../Utils/api';

interface UserStatistics {
  projects: number;
  interfaces: number;
  testCases: number;
  operations: number;
}

const Statistics: React.FC = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<UserStatistics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const response = await api.get('/user/statistics');
      setStats(response.data.data || {});
    } catch (error: any) {
      // Ignore if endpoint doesn't exist yet
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={t('user.statistics.title')} loading={loading}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('user.statistics.projects')}
              value={stats?.projects || 0}
              prefix={<ProjectOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('user.statistics.interfaces')}
              value={stats?.interfaces || 0}
              prefix={<ApiOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('user.statistics.testCases')}
              value={stats?.testCases || 0}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('user.statistics.operations')}
              value={stats?.operations || 0}
              prefix={<EditOutlined />}
            />
          </Card>
        </Col>
      </Row>
    </Card>
  );
};

export default Statistics;

