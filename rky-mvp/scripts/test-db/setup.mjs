import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
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
  db.exec(`
    CREATE TABLE IF NOT EXISTS sample_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sample_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES sample_users(id),
      title TEXT NOT NULL,
      body TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const { cnt } = db.prepare('SELECT COUNT(*) AS cnt FROM sample_users').get();
  if (cnt === 0) {
    const insertUser = db.prepare('INSERT INTO sample_users (name, email) VALUES (?, ?)');
    const insertPost = db.prepare('INSERT INTO sample_posts (user_id, title, body) VALUES (?, ?, ?)');

    insertUser.run('Alice', 'alice@example.com');
    insertUser.run('Bob', 'bob@example.com');
    insertUser.run('Charlie', 'charlie@example.com');
    insertPost.run(1, 'Hello World', 'First post content');
    insertPost.run(2, 'Second Post', 'Another post content');
  }
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
