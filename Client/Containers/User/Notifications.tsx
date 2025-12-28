import React, { useEffect, useState } from 'react';
import { Card, List, Badge, Button, Space, Tag, Empty, message } from 'antd';
import { BellOutlined, DeleteOutlined, CheckOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { api } from '../../Utils/api';

interface Notification {
  _id: string;
  type: 'system' | 'interface' | 'project' | 'test';
  title: string;
  content: string;
  read: boolean;
  createdAt: string;
}

const Notifications: React.FC = () => {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await api.get('/user/notifications');
      setNotifications(response.data.data || []);
    } catch (error: any) {
      message.error(error.response?.data?.message || t('user.notifications.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.post(`/user/notifications/${id}/read`);
      fetchNotifications();
    } catch (error: any) {
      message.error(error.response?.data?.message || t('user.notifications.operationFailed'));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/user/notifications/${id}`);
      message.success(t('user.notifications.deleteSuccess'));
      fetchNotifications();
    } catch (error: any) {
      message.error(error.response?.data?.message || t('user.notifications.operationFailed'));
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.post('/user/notifications/read-all');
      message.success(t('user.notifications.markAllReadSuccess'));
      fetchNotifications();
    } catch (error: any) {
      message.error(error.response?.data?.message || t('user.notifications.operationFailed'));
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Card
      title={
        <Space>
          <BellOutlined />
          <span>{t('user.notifications.title')}</span>
          {unreadCount > 0 && <Badge count={unreadCount} />}
        </Space>
      }
      extra={
        unreadCount > 0 && (
          <Button onClick={handleMarkAllAsRead}>
            {t('user.notifications.markAllRead')}
          </Button>
        )
      }
      loading={loading}
    >
      {notifications.length === 0 ? (
        <Empty description={t('user.notifications.empty')} />
      ) : (
        <List
          dataSource={notifications}
          renderItem={(item) => (
            <List.Item
              style={{
                backgroundColor: item.read ? '#fff' : '#f0f9ff',
                padding: '12px 16px',
                marginBottom: 8,
                borderRadius: 4,
              }}
              actions={[
                <Button
                  type="link"
                  icon={<CheckOutlined />}
                  onClick={() => handleMarkAsRead(item._id)}
                  disabled={item.read}
                >
                  {t('user.notifications.markAsRead')}
                </Button>,
                <Button
                  type="link"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(item._id)}
                >
                  {t('common.delete')}
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <span>{item.title}</span>
                    {!item.read && <Badge status="processing" />}
                    <Tag>{item.type}</Tag>
                  </Space>
                }
                description={
                  <div>
                    <div>{item.content}</div>
                    <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                      {new Date(item.createdAt).toLocaleString()}
                    </div>
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

export default Notifications;

