#!/usr/bin/env node

/**
 * Project Initializer
 *
 * Replaces template keywords and optionally removes showcase code
 * to provide a clean starting point for new projects.
 *
 * Usage: npm run init
 */

import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { readFileSync, writeFileSync, rmSync, mkdirSync, existsSync, readdirSync, unlinkSync, rmdirSync } from 'node:fs';
import { resolve, basename, dirname } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');

// ─── Helpers ───────────────────────────────────────────────

function toTitleCase(kebab) {
  return kebab
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function readFile(relPath) {
  return readFileSync(resolve(ROOT, relPath), 'utf-8');
}

function writeFile(relPath, content) {
  writeFileSync(resolve(ROOT, relPath), content, 'utf-8');
}

function removeDir(relPath) {
  const abs = resolve(ROOT, relPath);
  if (existsSync(abs)) {
    rmSync(abs, { recursive: true, force: true });
  }
}

function removeFile(relPath) {
  const abs = resolve(ROOT, relPath);
  if (existsSync(abs)) {
    unlinkSync(abs);
  }
}

function ensureGitkeep(relPath) {
  const abs = resolve(ROOT, relPath);
  if (!existsSync(abs)) {
    mkdirSync(abs, { recursive: true });
  }
  const gitkeep = resolve(abs, '.gitkeep');
  if (!existsSync(gitkeep)) {
    writeFileSync(gitkeep, '', 'utf-8');
  }
}

function getGitUserName() {
  try {
    return execSync('git config user.name', { encoding: 'utf-8' }).trim();
  } catch {
    return '';
  }
}

function isDirEmpty(relPath) {
  const abs = resolve(ROOT, relPath);
  if (!existsSync(abs)) return true;
  return readdirSync(abs).length === 0;
}

// ─── Keyword Replacement ───────────────────────────────────

function replaceKeywords({ projectName, productName, description, authorName }) {
  // package.json
  let pkg = readFile('package.json');
  pkg = pkg.replace(/"name": "rky-mvp"/, `"name": "${projectName}"`);
  pkg = pkg.replace(/"productName": "rky-mvp"/, `"productName": "${productName}"`);
  pkg = pkg.replace(
    /"description": "My Electron application description"/,
    `"description": "${description}"`,
  );
  pkg = pkg.replace(/"name": "rhie-coder"/, `"name": "${authorName}"`);
  writeFile('package.json', pkg);

  // index.html title
  let html = readFile('src/renderer/app/main-window/index.html');
  html = html.replace(/<title>Rockury<\/title>/, `<title>${productName}</title>`);
  writeFile('src/renderer/app/main-window/index.html', html);
}

// ─── Showcase Removal ──────────────────────────────────────

function removeShowcase() {
  // A. Delete showcase directories and files
  removeDir('src/renderer/pages/home');
  removeDir('src/renderer/pages/prompts');
  removeDir('src/renderer/entities/prompt');
  removeDir('src/renderer/features/prompt-crud');
  removeDir('src/renderer/features/prompt-copy');
  removeFile('src/shared/types/prompt.ts');
  removeFile('src/main/ipc/handlers/promptHandlers.ts');
  removeFile('src/main/ipc/handlers/promptHandlers.test.ts');
  removeFile('src/main/services/promptService.ts');
  removeFile('src/main/services/promptService.test.ts');
  removeDir('src/main/services/data');
  removeFile('src/main/repositories/promptRepository.ts');
  removeFile('src/main/repositories/promptRepository.test.ts');

  // B. Import/export cleanup

  // 1. src/app/main.ts
  let mainTs = readFile('src/app/main.ts');
  mainTs = mainTs.replace(/import \{ promptService \} from '#\/services';\n/, '');
  mainTs = mainTs.replace(/\n\n  \/\/ Seed default prompts if empty\n  promptService\.initialize\(\);\n/, '\n');
  writeFile('src/app/main.ts', mainTs);

  // 2. src/app/preload.ts
  let preload = readFile('src/app/preload.ts');
  preload = preload.replace(/  \/\/ Prompts\n/, '');
  preload = preload.replace(
    /  \[CHANNELS\.GET_PROMPTS\]: \(\) =>\n    ipcRenderer\.invoke\(CHANNELS\.GET_PROMPTS\),\n/,
    '',
  );
  preload = preload.replace(
    /  \[CHANNELS\.CREATE_PROMPT\]: \(args\) =>\n    ipcRenderer\.invoke\(CHANNELS\.CREATE_PROMPT, args\),\n/,
    '',
  );
  preload = preload.replace(
    /  \[CHANNELS\.UPDATE_PROMPT\]: \(args\) =>\n    ipcRenderer\.invoke\(CHANNELS\.UPDATE_PROMPT, args\),\n/,
    '',
  );
  preload = preload.replace(
    /  \[CHANNELS\.DELETE_PROMPT\]: \(args\) =>\n    ipcRenderer\.invoke\(CHANNELS\.DELETE_PROMPT, args\),\n/,
    '',
  );
  writeFile('src/app/preload.ts', preload);

  // 3. src/shared/ipc/channels.ts
  let channels = readFile('src/shared/ipc/channels.ts');
  channels = channels.replace(/  \/\/ Prompts\n/, '');
  channels = channels.replace(/  GET_PROMPTS: 'GET_PROMPTS',\n/, '');
  channels = channels.replace(/  CREATE_PROMPT: 'CREATE_PROMPT',\n/, '');
  channels = channels.replace(/  UPDATE_PROMPT: 'UPDATE_PROMPT',\n/, '');
  channels = channels.replace(/  DELETE_PROMPT: 'DELETE_PROMPT',\n/, '');
  writeFile('src/shared/ipc/channels.ts', channels);

  // 4. src/shared/ipc/events.ts
  let events = readFile('src/shared/ipc/events.ts');
  // Remove prompt-specific imports
  events = events.replace(
    /import type \{\n  IPrompt,\n  ICreatePromptRequest,\n  IUpdatePromptRequest,\n  ISystemInfo,\n\} from '~\/shared\/types';/,
    "import type { ISystemInfo } from '~/shared/types';",
  );
  // Remove prompt event mappings
  events = events.replace(/  \/\/ Prompts\n/, '');
  events = events.replace(
    /  \[CHANNELS\.GET_PROMPTS\]: \{\n    args: void;\n    response: \{ success: boolean; data: IPrompt\[\] \};\n  \};\n/,
    '',
  );
  events = events.replace(
    /  \[CHANNELS\.CREATE_PROMPT\]: \{\n    args: ICreatePromptRequest;\n    response: \{ success: boolean; data: IPrompt \};\n  \};\n/,
    '',
  );
  events = events.replace(
    /  \[CHANNELS\.UPDATE_PROMPT\]: \{\n    args: IUpdatePromptRequest;\n    response: \{ success: boolean; data: IPrompt \};\n  \};\n/,
    '',
  );
  events = events.replace(
    /  \[CHANNELS\.DELETE_PROMPT\]: \{\n    args: \{ id: string \};\n    response: \{ success: boolean \};\n  \};\n/,
    '',
  );
  writeFile('src/shared/ipc/events.ts', events);

  // 5. src/shared/types/index.ts
  let typesIndex = readFile('src/shared/types/index.ts');
  typesIndex = typesIndex.replace(
    /export type \{\n  IPrompt,\n  TPromptCategory,\n  ICreatePromptRequest,\n  IUpdatePromptRequest,\n\} from '\.\/prompt';\nexport \{ PROMPT_CATEGORY_LABELS \} from '\.\/prompt';\n/,
    '',
  );
  writeFile('src/shared/types/index.ts', typesIndex);

  // 6. src/main/ipc/handlers/index.ts
  let handlersIndex = readFile('src/main/ipc/handlers/index.ts');
  handlersIndex = handlersIndex.replace(
    /import \{ registerPromptHandlers \} from '\.\/promptHandlers';\n/,
    '',
  );
  handlersIndex = handlersIndex.replace(/  registerPromptHandlers\(\);\n/, '');
  writeFile('src/main/ipc/handlers/index.ts', handlersIndex);

  // 7. src/main/services/index.ts
  let servicesIndex = readFile('src/main/services/index.ts');
  servicesIndex = servicesIndex.replace(
    /export \{ promptService \} from '\.\/promptService';\n/,
    '',
  );
  writeFile('src/main/services/index.ts', servicesIndex);

  // 8. src/main/repositories/index.ts
  let reposIndex = readFile('src/main/repositories/index.ts');
  reposIndex = reposIndex.replace(
    /export \{ promptRepository \} from '\.\/promptRepository';\n/,
    '',
  );
  writeFile('src/main/repositories/index.ts', reposIndex);

  // 9. src/renderer/app/routes/index.tsx
  const routesContent = `import { Routes, Route } from 'react-router';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<div>Hello</div>} />
    </Routes>
  );
}
`;
  writeFile('src/renderer/app/routes/index.tsx', routesContent);

  // C. Ensure .gitkeep in empty directories
  ensureGitkeep('src/renderer/pages');
  ensureGitkeep('src/renderer/entities');
  ensureGitkeep('src/renderer/features');
}

// ─── Self Cleanup ──────────────────────────────────────────

function selfCleanup() {
  // Remove init script from package.json
  let pkg = readFile('package.json');
  pkg = pkg.replace(/    "init": "node scripts\/init.mjs",\n/, '');
  writeFile('package.json', pkg);

  // Remove init script file
  removeFile('scripts/init.mjs');

  // Remove scripts dir if empty
  if (isDirEmpty('scripts')) {
    const abs = resolve(ROOT, 'scripts');
    if (existsSync(abs)) rmdirSync(abs);
  }

  // Re-init git
  removeDir('.git');
  execSync('git init', { cwd: ROOT, stdio: 'ignore' });
  execSync('git add -A', { cwd: ROOT, stdio: 'ignore' });
  try {
    execSync('git commit -m "chore: initialize project from template"', {
      cwd: ROOT,
      stdio: 'ignore',
    });
  } catch {
    console.warn('⚠️  Git commit skipped (user.name/email may not be configured)');
    console.warn('   Run: git add -A && git commit -m "chore: initialize project"');
  }
}

// ─── Main ──────────────────────────────────────────────────

async function main() {
  const rl = createInterface({ input: stdin, output: stdout });

  console.log('\n🚀 Project Initializer\n');
  console.log('Configure your new project from the Vibe Coding Framework template.\n');

  const dirName = basename(ROOT);
  const gitUser = getGitUserName();

  const projectName =
    (await rl.question(`Project name (kebab-case) [${dirName}]: `)).trim() || dirName;
  const defaultProductName = toTitleCase(projectName);
  const productName =
    (await rl.question(`Product name [${defaultProductName}]: `)).trim() || defaultProductName;
  const description =
    (await rl.question('Description [An Electron application]: ')).trim() ||
    'An Electron application';
  const authorName =
    (await rl.question(`Author name [${gitUser}]: `)).trim() || gitUser;
  const removeAnswer =
    (await rl.question('Remove showcase code? (y/n) [n]: ')).trim().toLowerCase() || 'n';

  rl.close();

  const shouldRemoveShowcase = removeAnswer === 'y' || removeAnswer === 'yes';

  console.log('\n--- Configuration ---');
  console.log(`  Project:     ${projectName}`);
  console.log(`  Product:     ${productName}`);
  console.log(`  Description: ${description}`);
  console.log(`  Author:      ${authorName}`);
  console.log(`  Showcase:    ${shouldRemoveShowcase ? 'Remove' : 'Keep'}`);
  console.log('');

  // Step 1: Replace keywords
  console.log('Replacing keywords...');
  replaceKeywords({ projectName, productName, description, authorName });

  // Step 2: Remove showcase if requested
  if (shouldRemoveShowcase) {
    console.log('Removing showcase code...');
    removeShowcase();
  }

  // Step 3: Self cleanup
  console.log('Cleaning up init script...');
  selfCleanup();

  console.log('\n✅ Project initialized successfully!\n');
  console.log('Next steps:');
  console.log('  npm install');
  console.log('  npm start\n');
}

main().catch((err) => {
  console.error('Init failed:', err.message);
  process.exit(1);
});
