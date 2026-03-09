import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

export const fileSystem = {
  getDataPath(filename: string): string {
    return path.join(app.getPath('userData'), filename);
  },

  readJsonFile<T>(filepath: string, fallback: T): T {
    try {
      if (!fs.existsSync(filepath)) return fallback;
      const raw = fs.readFileSync(filepath, 'utf-8');
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  writeJsonFile<T>(filepath: string, data: T): void {
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
  },
};
