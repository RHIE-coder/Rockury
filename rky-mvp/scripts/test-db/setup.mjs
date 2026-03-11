import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import chalk from 'chalk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, 'data');
const SQLITE_PATH = resolve(DATA_DIR, 'testdb.sqlite');

const tag = chalk.cyan('[test-db]');
const log = (msg) => console.log(`${tag} ${msg}`);
const ok = (msg) => console.log(`${tag} ${chalk.green('✔')} ${msg}`);
const warn = (msg) => console.log(`${tag} ${chalk.yellow('⚠')} ${msg}`);
const fail = (msg) => console.error(`${tag} ${chalk.red('✖')} ${msg}`);

function sleep(ms) {
  execSync(`node -e "setTimeout(()=>{},${ms})"`, { stdio: 'ignore' });
}

// 1. Start Docker containers
log(`Starting Docker containers...`);
try {
  execSync('docker compose up -d', { cwd: __dirname, stdio: 'inherit' });
} catch {
  fail('Failed to start Docker containers. Is Docker running?');
  process.exit(1);
}

// 2. Create SQLite test DB via node:sqlite
if (existsSync(SQLITE_PATH)) {
  warn(`SQLite DB already exists. Run ${chalk.bold('npm run db:down')} first to reset.`);
} else {
  log('Creating SQLite test database...');
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  const db = new DatabaseSync(SQLITE_PATH);
  const initSql = readFileSync(resolve(__dirname, 'init/sqlite/init.sql'), 'utf-8');
  db.exec(initSql);
  db.close();
  ok(`SQLite DB created at: ${chalk.dim(SQLITE_PATH)}`);
}

// 3. Wait for healthchecks
log('Waiting for containers to be healthy...');
const services = ['rky-test-mysql', 'rky-test-mariadb', 'rky-test-postgresql'];
const MAX_WAIT = 60_000;
const POLL = 2_000;

for (const name of services) {
  const start = Date.now();
  let healthy = false;

  while (Date.now() - start < MAX_WAIT) {
    try {
      const status = execSync(
        `docker inspect --format='{{.State.Health.Status}}' ${name}`,
        { encoding: 'utf-8' },
      ).trim();

      if (status === 'healthy') {
        healthy = true;
        break;
      }
    } catch {
      // container not ready yet
    }
    sleep(POLL);
  }

  if (healthy) {
    ok(name);
  } else {
    warn(`${name} did not become healthy within ${MAX_WAIT / 1000}s`);
  }
}

// 4. Print connection info
console.log('');
console.log(chalk.bold('  ╭──────────────────────────────────────────────────────────────╮'));
console.log(chalk.bold('  │           Test Database Connection Info                       │'));
console.log(chalk.bold('  ├──────────────────────────────────────────────────────────────┤'));
console.log(`  │  ${chalk.blue('MySQL')}       localhost:${chalk.yellow('13306')}  DB: testdb  User: test  Pass: test │`);
console.log(`  │  ${chalk.blue('MariaDB')}     localhost:${chalk.yellow('13307')}  DB: testdb  User: test  Pass: test │`);
console.log(`  │  ${chalk.blue('PostgreSQL')}  localhost:${chalk.yellow('15432')}  DB: testdb  User: test  Pass: test │`);
console.log(`  │  ${chalk.blue('SQLite')}      ${chalk.dim(SQLITE_PATH)}  │`);
console.log(chalk.bold('  ╰──────────────────────────────────────────────────────────────╯'));
console.log('');
ok(chalk.green.bold('Ready!'));
