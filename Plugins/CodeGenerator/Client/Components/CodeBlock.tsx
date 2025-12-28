import React from 'react';
import { Spin, Empty } from 'antd';
import './CodeBlock.scss';

interface CodeBlockProps {
  code: string;
  language: string;
  loading?: boolean;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language, loading = false }) => {
  if (loading) {
    return (
      <div className="code-block-loading">
        <Spin size="large" tip="生成代码中..." />
      </div>
    );
  }

  if (!code) {
    return (
      <Empty
        description="暂无代码"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <div className="code-block-container">
      <pre className={`code-block language-${language}`}>
        <code>{code}</code>
      </pre>
    </div>
  );
};

export default CodeBlock;

