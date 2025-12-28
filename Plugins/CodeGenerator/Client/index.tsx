import React, { useState, useEffect } from 'react';
import { Button, Select, Space, Card, message } from 'antd';
import { CopyOutlined, DownloadOutlined } from '@ant-design/icons';
import CodeBlock from './Components/CodeBlock';
import { generateCode } from './Utils/api';

const { Option } = Select;

interface CodeGeneratorProps {
  interfaceData: any;
  environments?: any[];
  onClose?: () => void;
}

const CodeGenerator: React.FC<CodeGeneratorProps> = ({
  interfaceData,
  environments = [],
  onClose
}) => {
  const [language, setLanguage] = useState<string>('javascript');
  const [code, setCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedEnv, setSelectedEnv] = useState<any>(null);

  const languages = [
    { value: 'curl', label: 'cURL' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'go', label: 'Go' },
    { value: 'php', label: 'PHP' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'swift', label: 'Swift' }
  ];

  useEffect(() => {
    if (interfaceData) {
      handleGenerate();
    }
  }, [language, selectedEnv, interfaceData]);

  const handleGenerate = async () => {
    if (!interfaceData) return;

    setLoading(true);
    try {
      const response = await generateCode({
        interfaceData,
        language,
        environment: selectedEnv,
        includeComments: true
      });

      if (response.success) {
        setCode(response.data.code);
      } else {
        message.error(response.message || '代码生成失败');
      }
    } catch (error: any) {
      message.error(error.message || '代码生成失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      message.success('代码已复制到剪贴板');
    }).catch(() => {
      message.error('复制失败');
    });
  };

  const handleDownload = () => {
    const extension = getFileExtension(language);
    const filename = `${interfaceData?.name || 'code'}.${extension}`;
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    message.success('代码已下载');
  };

  const getFileExtension = (lang: string): string => {
    const extensions: Record<string, string> = {
      curl: 'sh',
      javascript: 'js',
      python: 'py',
      java: 'java',
      go: 'go',
      php: 'php',
      ruby: 'rb',
      swift: 'swift'
    };
    return extensions[lang] || 'txt';
  };

  return (
    <Card
      title="代码生成"
      extra={
        <Space>
          <Select
            value={language}
            onChange={setLanguage}
            style={{ width: 150 }}
          >
            {languages.map(lang => (
              <Option key={lang.value} value={lang.value}>
                {lang.label}
              </Option>
            ))}
          </Select>
          {environments.length > 0 && (
            <Select
              value={selectedEnv?.id}
              onChange={(id) => {
                const env = environments.find(e => e.id === id);
                setSelectedEnv(env || null);
              }}
              placeholder="选择环境"
              allowClear
              style={{ width: 150 }}
            >
              {environments.map(env => (
                <Option key={env.id} value={env.id}>
                  {env.name}
                </Option>
              ))}
            </Select>
          )}
          <Button
            icon={<CopyOutlined />}
            onClick={handleCopy}
            disabled={!code}
          >
            复制
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleDownload}
            disabled={!code}
          >
            下载
          </Button>
        </Space>
      }
    >
      <CodeBlock
        code={code}
        language={language}
        loading={loading}
      />
    </Card>
  );
};

export default CodeGenerator;

