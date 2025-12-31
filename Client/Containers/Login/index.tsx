import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, App, Divider } from 'antd';
import { UserOutlined, LockOutlined, GithubOutlined } from '@ant-design/icons';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { login } from '../../Reducer/Modules/User';
import type { AppDispatch } from '../../Reducer/Create';
import { darkColors, techColors, themeColor } from '../../Styles/theme';
import { api } from '../../Utils/api';
import Logo from '../../Components/Logo';

interface ThirdPartyProvider {
  provider: string;
  name: string;
}

const Login: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [thirdPartyProviders, setThirdPartyProviders] = useState<ThirdPartyProvider[]>([]);
  
  useEffect(() => {
    // 获取已启用的第三方登录提供者
    const fetchThirdPartyProviders = async () => {
      try {
        const response = await api.get('/auth/third-party/providers');
        const providers = response.data.data || [];
        setThirdPartyProviders(providers);
      } catch (error) {
        // 静默处理错误，不影响正常登录
        console.debug('Failed to fetch third-party providers:', error);
      }
    };
    fetchThirdPartyProviders();
  }, []);

  const handleForgotPassword = () => {
    message.info(t('message.featureInDevelopment'));
  };

  const handleThirdPartyLogin = (provider: string) => {
    window.location.href = `/api/auth/${provider}`;
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
              {t('auth.login')}
            </span>
          </div>
        </div>
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

          {thirdPartyProviders.length > 0 && (
            <>
              <Divider>{t('auth.or') || '或'}</Divider>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {thirdPartyProviders.map((provider) => (
                  <Button
                    key={provider.provider}
                    icon={provider.provider === 'github' ? <GithubOutlined /> : undefined}
                    onClick={() => handleThirdPartyLogin(provider.provider)}
                    block
                  >
                    {t('auth.loginWith') || '使用'} {provider.name} {t('auth.login') || '登录'}
                  </Button>
                ))}
              </div>
            </>
          )}
        </Form>
      </Card>
    </div>
  );
};

export default Login;

