const fs = require('fs');

// 1. UUID
const filesWithUuid = [
  'src/services/tokenService.ts',
  'src/services/accountAggregator.ts',
  'src/services/aadhaar.ts',
  'src/routes/reports.ts',
  'src/routes/estate.ts',
  'src/routes/auth.ts'
];
for(let f of filesWithUuid) {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/import \{ v4 as uuidv4 \} from 'uuid';?/g, "import { randomUUID } from 'crypto';");
  content = content.replace(/uuidv4\(\)/g, "randomUUID()");
  fs.writeFileSync(f, content);
}

// 2. Cron
let nw = fs.readFileSync('src/workers/netWorthSnapshotWorker.ts', 'utf8');
nw = nw.replace(/import cron from 'node-cron'\r?\n/, "");
nw = nw.replace(/cron\.schedule\('30 0 \* \* \*', async \(\) => \{/, "setInterval(async () => {");
nw = nw.replace(/  \}\)\r?\n\r?\n  console\.log\('\[NetWorthSnapshot\]/, "  }, 24 * 60 * 60 * 1000)\n\n  console.log('[NetWorthSnapshot]");
fs.writeFileSync('src/workers/netWorthSnapshotWorker.ts', nw);

let land = fs.readFileSync('src/workers/landSyncWorker.ts', 'utf8');
land = land.replace(/import cron from 'node-cron'\r?\n/, "");
land = land.replace(/cron\.schedule\('0 20 \* \* \*', async \(\) => \{/, "setInterval(async () => {");
land = land.replace(/  \}, \{\r?\n    timezone: 'Asia\/Kolkata'\r?\n  \}\)/, "  }, 24 * 60 * 60 * 1000)");
fs.writeFileSync('src/workers/landSyncWorker.ts', land);

let ast = fs.readFileSync('src/workers/assetChangeWorker.ts', 'utf8');
ast = ast.replace(/import cron from 'node-cron'\r?\n/, "");
ast = ast.replace(/cron\.schedule\('30 2 \* \* \*', async \(\) => \{/, "setInterval(async () => {");
ast = ast.replace(/  \}, \{ timezone: 'Asia\/Kolkata' \}\)/, "  }, 24 * 60 * 60 * 1000)");
fs.writeFileSync('src/workers/assetChangeWorker.ts', ast);

// 3. Dotenv
const dotenvFiles = [
  'src/index.ts',
  'test_assets.ts',
  'test_land.ts',
  'test_sandbox.ts',
  'test_webhook.ts',
  'update_enum.ts',
  'seedRichData.ts'
];
for(let f of dotenvFiles) {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/import 'dotenv\/config';\r?\n/, "");
    content = content.replace(/import dotenv from 'dotenv';\r?\n/, "");
    content = content.replace(/dotenv\.config\(\{ path: path\.resolve\(__dirname, '\.env'\) \}\);\r?\n/, "");
    fs.writeFileSync(f, content);
  }
}

// 4. Package.json scripts
let pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.scripts.dev = "ts-node-dev --env-file=.env --respawn --transpile-only src/index.ts";
pkg.scripts.start = "node --env-file=.env dist/index.js";
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));

console.log("Fixes applied successfully.");
