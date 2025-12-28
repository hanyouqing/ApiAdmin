import React, { useEffect } from 'react';
import { Card, Form, Input, Button, Avatar, Upload, App, Descriptions, Tag, Space, Divider } from 'antd';
import { UserOutlined, UploadOutlined, MailOutlined, CrownOutlined, CalendarOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { updateUserInfo, getUserInfo } from '../../Reducer/Modules/User';
import { api } from '../../Utils/api';
import type { AppDispatch, RootState } from '../../Reducer/Create';
import { getAvatarUrl } from '../../Utils/avatar';

const Profile: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const { message: messageApi } = App.useApp();
  const user = useSelector((state: RootState) => state.user.user);
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  useEffect(() => {
    if (user) {
      form.setFieldsValue(user);
    }
  }, [user, form]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await dispatch(updateUserInfo(values)).unwrap();
      messageApi.success(t('user.updateSuccess'));
      dispatch(getUserInfo());
    } catch (error: any) {
      messageApi.error(error.message || t('user.updateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const response = await api.post('/upload/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (response.data.data?.avatar) {
        await dispatch(updateUserInfo({ avatar: response.data.data.avatar })).unwrap();
        messageApi.success(t('user.updateSuccess'));
        dispatch(getUserInfo());
      }
    } catch (error: any) {
      messageApi.error(error.message || t('user.updateFailed'));
    }
    return false;
  };

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      super_admin: t('user.roleLabels.superAdmin'),
      group_leader: t('user.roleLabels.groupLeader'),
      project_leader: t('user.roleLabels.projectLeader'),
      developer: t('user.roleLabels.developer'),
      guest: t('user.roleLabels.guest'),
    };
    return roleMap[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colorMap: Record<string, string> = {
      super_admin: 'red',
      group_leader: 'orange',
      project_leader: 'blue',
      developer: 'green',
      guest: 'default',
    };
    return colorMap[role] || 'default';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card title={t('user.profile')}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 用户信息展示 */}
          <Descriptions
            title={t('user.basicInfo')}
            bordered
            column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}
          >
            <Descriptions.Item label={t('user.avatar')}>
              <Space>
                <Avatar size={64} icon={<UserOutlined />} src={getAvatarUrl(user?.avatar)} />
                <Upload
                  beforeUpload={handleAvatarUpload}
                  showUploadList={false}
                  accept="image/*"
                >
                  <Button icon={<UploadOutlined />} size="small">
                    {t('user.uploadAvatar')}
                  </Button>
                </Upload>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label={t('user.username')}>
              {user?.username || '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('auth.email')} span={2}>
              <Space>
                <MailOutlined />
                {user?.email || '-'}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label={t('user.role')} span={2}>
              <Tag color={getRoleColor(user?.role || '')} icon={<CrownOutlined />}>
                {getRoleLabel(user?.role || '')}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('user.createdAt')} span={2}>
              <Space>
                <CalendarOutlined />
                {formatDate(user?.createdAt)}
              </Space>
            </Descriptions.Item>
            {user?.updatedAt && user.updatedAt !== user.createdAt && (
              <Descriptions.Item label={t('user.updatedAt')} span={2}>
                <Space>
                  <CalendarOutlined />
                  {formatDate(user.updatedAt)}
                </Space>
              </Descriptions.Item>
            )}
          </Descriptions>

          <Divider />

          {/* 编辑表单 */}
          <Form form={form} layout="vertical" onFinish={onFinish}>
            <Form.Item
              name="username"
              label={t('user.editUsername')}
              rules={[{ required: true, message: t('auth.usernameRequired') }]}
            >
              <Input />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} style={{ color: '#ffffff' }}>
                {t('common.save')}
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </Space>
  );
};

export default Profile;

