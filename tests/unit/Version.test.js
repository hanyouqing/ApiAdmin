import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';

// Mock fs
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  },
}));

describe('Version Utils', () => {
  let getVersionInfo, getVersionInfoFormatted;
  
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset module cache to clear versionInfo
    vi.resetModules();
    // Re-import after reset
    const versionModule = await import('../../Server/Utils/version.js');
    getVersionInfo = versionModule.getVersionInfo;
    getVersionInfoFormatted = versionModule.getVersionInfoFormatted;
  });

  describe('getVersionInfo', () => {
    it('should return default info when version file does not exist', () => {
      fs.existsSync.mockReturnValue(false);
      
      const info = getVersionInfo();
      
      expect(info).toBeDefined();
      expect(info.app_version).toBe('1.0.0');
      expect(info.node_version).toBe(process.version);
    });

    it('should parse version file when it exists', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('app_version=2.0.0\nbuild_time=2024-01-01\nbuild_commit=abc123');
      
      const info = getVersionInfo();
      
      expect(info.app_version).toBe('2.0.0');
      expect(info.build_time).toBe('2024-01-01');
      expect(info.build_commit).toBe('abc123');
    });

    it('should handle malformed version file', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('invalid content');
      
      const info = getVersionInfo();
      
      expect(info).toBeDefined();
      expect(info.app_version).toBe('1.0.0');
    });

    it('should handle file read errors', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });
      
      const info = getVersionInfo();
      
      expect(info).toBeDefined();
      expect(info.app_version).toBe('1.0.0');
    });
  });

  describe('getVersionInfoFormatted', () => {
    it('should return formatted version info', () => {
      fs.existsSync.mockReturnValue(false);
      
      const info = getVersionInfoFormatted();
      
      expect(info).toBeDefined();
      expect(info.appVersion).toBe('1.0.0');
      expect(info.nodeVersion).toBe(process.version);
      expect(info.buildTime).toBe('unknown');
    });

    it('should format parsed version file data', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('app_version=2.0.0\nbuild_time=2024-01-01');
      
      const info = getVersionInfoFormatted();
      
      expect(info.appVersion).toBe('2.0.0');
      expect(info.buildTime).toBe('2024-01-01');
    });
  });
});

