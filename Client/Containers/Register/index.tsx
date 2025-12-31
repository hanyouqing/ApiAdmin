import React, { useState } from 'react';
import { Form, Input, Button, Card, App } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { register } from '../../Reducer/Modules/User';
import type { AppDispatch } from '../../Reducer/Create';
import { darkColors, techColors, themeColor } from '../../Styles/theme';
import Logo from '../../Components/Logo';

const Register: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { email: string; password: string; username: string }) => {
    setLoading(true);
    try {
      await dispatch(register(values)).unwrap();
      message.success(t('auth.registerSuccess'));
      navigate('/login');
    } catch (error: any) {
      message.error(error.message || t('auth.registerFailed'));
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
        style={{ width: 400 }}
        styles={{ 
          body: { padding: '32px' }
        }}
      >
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          marginBottom: '32px' 
        }}>
          <Logo size={64} />
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            marginTop: '16px'
          }}>
            <h1 style={{ 
              margin: 0,
              fontSize: '24px', 
              fontWeight: 'bold',
              color: '#1a365d'
            }}>
              {t('app.title')}
            </h1>
            <span style={{ 
              fontSize: '16px',
              color: '#999',
              fontWeight: 'normal'
            }}>
              {t('auth.register')}
            </span>
          </div>
        </div>
        <Form
          name="register"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: t('auth.usernameRequired') },
              { min: 3, message: t('auth.usernameTooShort') },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder={t('auth.username')}
            />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[
              { required: true, message: t('auth.emailRequired') },
              { type: 'email', message: t('auth.emailInvalid') },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder={t('auth.email')}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: t('auth.passwordRequired') },
              { min: 6, message: t('auth.passwordTooShort') },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('auth.password')}
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: t('auth.confirmPasswordRequired') },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error(t('auth.passwordMismatch')));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('auth.confirmPassword')}
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading} style={{ color: '#ffffff' }}>
              {t('auth.register')}
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Button type="link" onClick={() => navigate('/login')}>
              {t('auth.hasAccount')}
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Register;

