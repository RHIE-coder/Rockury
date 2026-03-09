import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, 'data');

const tag = chalk.cyan('[test-db]');
const log = (msg) => console.log(`${tag} ${msg}`);
const ok = (msg) => console.log(`${tag} ${chalk.green('✔')} ${msg}`);
const warn = (msg) => console.log(`${tag} ${chalk.yellow('⚠')} ${msg}`);

// 1. Stop and remove Docker containers + volumes
log('Stopping Docker containers...');
try {
  execSync('docker compose down -v', { cwd: __dirname, stdio: 'inherit' });
  ok('Docker containers removed');
} catch {
  warn('docker compose down failed (containers may not exist)');
}

// 2. Remove SQLite test DB
if (existsSync(DATA_DIR)) {
  rmSync(DATA_DIR, { recursive: true, force: true });
  ok('Removed SQLite test data');
} else {
  log('No SQLite data to remove');
}

ok(chalk.green.bold('Cleanup complete'));
