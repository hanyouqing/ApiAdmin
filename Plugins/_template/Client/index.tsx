import React, { useState } from 'react';
import { Button, Card, message } from 'antd';

interface PluginProps {
  // 定义 props
}

const Plugin: React.FC<PluginProps> = (props) => {
  const [loading, setLoading] = useState<boolean>(false);

  const handleAction = async () => {
    setLoading(true);
    try {
      // 调用 API
      message.success('操作成功');
    } catch (error: any) {
      message.error(error.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="插件名称">
      <Button
        type="primary"
        loading={loading}
        onClick={handleAction}
      >
        执行操作
      </Button>
    </Card>
  );
};

export default Plugin;

