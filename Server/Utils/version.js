import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const versionFilePath = path.join(rootDir, 'version');

let versionInfo = null;

const parseVersionFile = () => {
  if (versionInfo !== null) {
    return versionInfo;
  }

  const defaultInfo = {
    build_time: 'unknown',
    build_branch: 'unknown',
    build_commit: 'unknown',
    node_version: process.version,
    npm_version: 'unknown',
    app_version: '0.0.1',
  };

  try {
    if (fs.existsSync(versionFilePath)) {
      const content = fs.readFileSync(versionFilePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      versionInfo = { ...defaultInfo };
      
      for (const line of lines) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          versionInfo[key.trim()] = valueParts.join('=').trim();
        }
      }
    } else {
      versionInfo = defaultInfo;
    }
  } catch (error) {
    versionInfo = defaultInfo;
  }

  return versionInfo;
};

export const getVersionInfo = () => {
  return parseVersionFile();
};

export const getVersionInfoFormatted = () => {
  const info = parseVersionFile();
  return {
    buildTime: info.build_time || 'unknown',
    buildBranch: info.build_branch || 'unknown',
    buildCommit: info.build_commit || 'unknown',
    nodeVersion: info.node_version || process.version,
    npmVersion: info.npm_version || 'unknown',
    appVersion: info.app_version || process.env.APP_VERSION || '0.0.1',
  };
};

