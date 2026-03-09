import { execSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SQLITE_PATH = resolve(__dirname, 'data', 'testdb.sqlite');

const tag = chalk.cyan('[test-db]');
const log = (msg) => console.log(`${tag} ${msg}`);

// Docker containers
log(chalk.bold('Docker containers:'));
try {
  const output = execSync('docker compose ps', {
    cwd: __dirname,
    encoding: 'utf-8',
  });
  if (output.trim()) {
    console.log(output);
  } else {
    log(`  ${chalk.dim('(no containers running)')}`);
  }
} catch {
  log(`  ${chalk.dim('docker compose not available or no containers')}`);
}

// SQLite
if (existsSync(SQLITE_PATH)) {
  const size = statSync(SQLITE_PATH).size;
  log(`${chalk.bold('SQLite:')} ${chalk.green('●')} ${chalk.dim(SQLITE_PATH)} ${chalk.yellow(`(${(size / 1024).toFixed(1)} KB)`)}`);
} else {
  log(`${chalk.bold('SQLite:')} ${chalk.red('●')} not created`);
}
