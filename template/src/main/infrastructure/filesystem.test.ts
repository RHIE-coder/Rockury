import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/mock/userData') },
}));

vi.mock('node:fs');

import { fileSystem } from './filesystem';

describe('fileSystem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDataPath', () => {
    it('should join userData path with filename', () => {
      const result = fileSystem.getDataPath('test.json');
      expect(result).toBe(path.join('/mock/userData', 'test.json'));
    });
  });

  describe('readJsonFile', () => {
    it('should return parsed JSON when file exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('{"key":"value"}');

      const result = fileSystem.readJsonFile('/test.json', {});
      expect(result).toEqual({ key: 'value' });
    });

    it('should return fallback when file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const fallback = { default: true };
      const result = fileSystem.readJsonFile('/missing.json', fallback);
      expect(result).toBe(fallback);
    });

    it('should return fallback on JSON parse error', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json');

      const fallback = [] as string[];
      const result = fileSystem.readJsonFile('/bad.json', fallback);
      expect(result).toBe(fallback);
    });
  });

  describe('writeJsonFile', () => {
    it('should write JSON data to file', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      fileSystem.writeJsonFile('/data/test.json', { hello: 'world' });

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/data/test.json',
        JSON.stringify({ hello: 'world' }, null, 2),
        'utf-8',
      );
    });

    it('should create directory if not exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      fileSystem.writeJsonFile('/new/dir/test.json', []);

      expect(fs.mkdirSync).toHaveBeenCalledWith('/new/dir', { recursive: true });
    });
  });
});
