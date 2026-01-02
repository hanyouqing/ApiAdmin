import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, App, Divider, Modal } from 'antd';
import { UserOutlined, LockOutlined, GithubOutlined, MailOutlined } from '@ant-design/icons';
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
  const [emailLoginVisible, setEmailLoginVisible] = useState(false);
  const [emailLoginLoading, setEmailLoginLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [emailForm] = Form.useForm();
  
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
    // OAuth 类型的登录（如 GitHub）直接跳转
    if (['github', 'gitlab', 'google', 'wechat'].includes(provider)) {
      window.location.href = `/api/auth/${provider}`;
    } 
    // 验证码类型的登录（如邮箱、手机号）显示模态框
    else if (provider === 'email') {
      setEmailLoginVisible(true);
      setCodeSent(false);
      emailForm.resetFields();
    }
    // 其他类型暂不支持
    else {
      message.warning(t('auth.unsupportedProvider'));
    }
  };

  const handleSendEmailCode = async () => {
    try {
      const values = await emailForm.validateFields(['email']);
      setEmailLoginLoading(true);
      const response = await api.post('/auth/email/send-code', { email: values.email });
      message.success(response.data.message || t('auth.codeSent'));
      setCodeSent(true);
    } catch (error: any) {
      message.error(error.response?.data?.message || t('auth.sendCodeFailed'));
    } finally {
      setEmailLoginLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    try {
      const values = await emailForm.validateFields();
      setEmailLoginLoading(true);
      const response = await api.post('/auth/email/login', {
        email: values.email,
        code: values.code,
      });
      
      // 保存 token
      const { token, user } = response.data.data;
      localStorage.setItem('token', token);
      
      message.success(t('auth.loginSuccess'));
      setEmailLoginVisible(false);
      emailForm.resetFields();
      setCodeSent(false);
      
      // 刷新页面以更新用户状态
      window.location.href = '/';
    } catch (error: any) {
      message.error(error.response?.data?.message || t('auth.loginFailed'));
    } finally {
      setEmailLoginLoading(false);
    }
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
              <Divider>{t('auth.or')}</Divider>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {thirdPartyProviders.map((provider) => (
                  <Button
                    key={provider.provider}
                    icon={
                      provider.provider === 'github' ? <GithubOutlined /> :
                      provider.provider === 'email' ? <MailOutlined /> :
                      undefined
                    }
                    onClick={() => handleThirdPartyLogin(provider.provider)}
                    block
                  >
                    {t('auth.loginWith')} {provider.name} {t('auth.login')}
                  </Button>
                ))}
              </div>
            </>
          )}
        </Form>
      </Card>

      <Modal
        title={t('auth.emailLogin')}
        open={emailLoginVisible}
        onCancel={() => {
          setEmailLoginVisible(false);
          setCodeSent(false);
          emailForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={emailForm}
          layout="vertical"
          onFinish={codeSent ? handleEmailLogin : handleSendEmailCode}
        >
          <Form.Item
            name="email"
            label={t('auth.email')}
            rules={[
              { required: true, message: t('auth.emailRequired') },
              { type: 'email', message: t('auth.emailInvalid') },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder={t('auth.email')}
              disabled={codeSent}
            />
          </Form.Item>

          {codeSent && (
            <Form.Item
              name="code"
              label={t('auth.verificationCode')}
              rules={[
                { required: true, message: t('auth.codeRequired') },
                { len: 6, message: t('auth.codeLength') },
              ]}
            >
              <Input
                placeholder={t('auth.verificationCode')}
                maxLength={6}
              />
            </Form.Item>
          )}

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={emailLoginLoading}
            >
              {codeSent ? t('auth.login') : t('auth.sendCode')}
            </Button>
          </Form.Item>

          {codeSent && (
            <div style={{ textAlign: 'center' }}>
              <Button
                type="link"
                onClick={handleSendEmailCode}
                loading={emailLoginLoading}
              >
                {t('auth.resendCode')}
              </Button>
            </div>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default Login;

