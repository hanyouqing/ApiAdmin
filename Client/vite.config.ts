import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

// 获取版本信息
const getVersionInfo = () => {
  try {
    const packageJson = JSON.parse(readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'));
    const version = packageJson.version || '0.0.1';
    
    let commitId = 'unknown';
    try {
      commitId = execSync('git rev-parse --short HEAD', { encoding: 'utf-8', cwd: path.resolve(__dirname, '..') }).trim();
    } catch {
      // Git 命令失败时使用默认值
    }
    
    const buildTime = new Date().toISOString();
    
    return {
      VITE_APP_VERSION: version,
      VITE_APP_COMMIT_ID: commitId,
      VITE_APP_BUILD_TIME: buildTime,
    };
  } catch {
    return {
      VITE_APP_VERSION: '0.0.1',
      VITE_APP_COMMIT_ID: 'unknown',
      VITE_APP_BUILD_TIME: new Date().toISOString(),
    };
  }
};

export default defineConfig(({ mode }) => {
  const versionInfo = getVersionInfo();
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@server': path.resolve(__dirname, '../Server'),
      },
    },
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(versionInfo.VITE_APP_VERSION),
      'import.meta.env.VITE_APP_COMMIT_ID': JSON.stringify(versionInfo.VITE_APP_COMMIT_ID),
      'import.meta.env.VITE_APP_BUILD_TIME': JSON.stringify(versionInfo.VITE_APP_BUILD_TIME),
    },
    server: {
      port: 3001,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
          timeout: 10000,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, res) => {
              console.error('❌ Proxy error:', err.message);
              if (err.code === 'ECONNREFUSED') {
                console.error('💡 提示: 后端服务器未运行，请先启动后端服务器:');
                console.error('   cd Server && npm run dev');
              }
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              // 可选：记录代理请求
              if (process.env.DEBUG) {
                console.log(`[Proxy] ${req.method} ${req.url} -> http://localhost:3000${req.url}`);
              }
            });
          },
        },
        '/mock': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
          timeout: 10000,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, res) => {
              console.error('❌ Mock proxy error:', err.message);
              if (err.code === 'ECONNREFUSED') {
                console.error('💡 提示: 后端服务器未运行，请先启动后端服务器:');
                console.error('   cd Server && npm run dev');
              }
            });
          },
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  };
});

