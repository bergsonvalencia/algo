// Copies the algorithms reviewer Markdown into content/ as the site's source.
// The reviewer repo is treated as the single source of truth and is NEVER written to.
import { readdirSync, copyFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Override with REVIEWER_SRC=... if your reviewer repo lives elsewhere.
const SRC = process.env.REVIEWER_SRC || 'C:/r/reviewer/algorithms';
const DEST = join(ROOT, 'content', 'algorithms');

if (!existsSync(SRC)) {
  console.error(`Source folder not found: ${SRC}\nSet REVIEWER_SRC to your reviewer/algorithms path.`);
  process.exit(1);
}

rmSync(DEST, { recursive: true, force: true });
mkdirSync(DEST, { recursive: true });

let n = 0;
for (const f of readdirSync(SRC)) {
  // .md reviewers plus standalone .html companions (e.g. the interactive flowchart).
  if (f.endsWith('.md') || f.endsWith('.html')) {
    copyFileSync(join(SRC, f), join(DEST, f));
    n++;
  }
}
console.log(`Synced ${n} files (Markdown + HTML companions) -> content/algorithms (source left untouched)`);
