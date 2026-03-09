import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

vi.mock('electron', () => ({
  app: { getVersion: vi.fn(() => '1.0.0') },
}));

import { systemInfoService } from './systemInfoService';

describe('systemInfoService', () => {
  const originalVersions = { ...process.versions };

  beforeAll(() => {
    // Simulate Electron runtime versions
    Object.defineProperty(process, 'versions', {
      value: { ...originalVersions, electron: '40.1.0', chrome: '134.0.0' },
      configurable: true,
    });
  });

  afterAll(() => {
    Object.defineProperty(process, 'versions', {
      value: originalVersions,
      configurable: true,
    });
  });

  describe('getSystemInfo', () => {
    it('should return all system info fields', () => {
      const result = systemInfoService.getSystemInfo();

      expect(result).toHaveProperty('appVersion', '1.0.0');
      expect(result).toHaveProperty('electronVersion', '40.1.0');
      expect(result).toHaveProperty('nodeVersion');
      expect(result).toHaveProperty('chromeVersion', '134.0.0');
      expect(result).toHaveProperty('platform');
    });

    it('should return string values for all fields', () => {
      const result = systemInfoService.getSystemInfo();

      for (const value of Object.values(result)) {
        expect(typeof value).toBe('string');
      }
    });
  });
});
