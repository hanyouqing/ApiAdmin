import React from 'react';
import { Layout } from 'antd';
import { versionInfo } from '../../Utils/version';

const { Footer: AntFooter } = Layout;

const Footer: React.FC = () => {
  return (
    <AntFooter
      style={{
        textAlign: 'center',
        background: '#fff',
        borderTop: '1px solid #f0f0f0',
        padding: '16px 24px',
        fontSize: '12px',
        color: '#8c8c8c',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <span>
          ApiAdmin v{versionInfo.version}
        </span>
        {versionInfo.commitId !== 'unknown' && (
          <span>
            Commit: <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: '3px' }}>{versionInfo.commitId}</code>
          </span>
        )}
        {versionInfo.buildTime && (
          <span>
            Build: {versionInfo.buildTime}
          </span>
        )}
      </div>
    </AntFooter>
  );
};

export default Footer;

