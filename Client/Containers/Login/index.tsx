import React, { useState } from 'react';
import { Form, Input, Button, Card, App } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { login } from '../../Reducer/Modules/User';
import type { AppDispatch } from '../../Reducer/Create';
import { darkColors, techColors, themeColor } from '../../Styles/theme';

const Login: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  
  const handleForgotPassword = () => {
    message.info(t('message.featureInDevelopment'));
  };

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      await dispatch(login(values)).unwrap();
      message.success(t('auth.loginSuccess'));
      navigate('/');
    } catch (error: any) {
      message.error(error.message || t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${themeColor} 0%, ${darkColors[900]} 50%, ${techColors[600]} 100%)`,
      }}
    >
      <Card
        title={`${t('app.title')} ${t('auth.login')}`}
        style={{ width: 400 }}
        styles={{ header: { textAlign: 'center', fontSize: '24px', fontWeight: 'bold' } }}
      >
        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: t('auth.emailRequired') },
              { type: 'email', message: t('auth.emailInvalid') },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder={t('auth.email')}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: t('auth.passwordRequired') }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('auth.password')}
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading} style={{ color: '#ffffff' }}>
              {t('auth.login')}
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Button type="link" onClick={() => navigate('/register')}>
              {t('auth.noAccount')}
            </Button>
            <span style={{ margin: '0 8px' }}>|</span>
            <Button type="link" onClick={handleForgotPassword}>
              {t('auth.forgotPassword')}
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Login;

