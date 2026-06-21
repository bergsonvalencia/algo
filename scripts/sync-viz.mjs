// Copies the visualizer RUNTIME (vanilla-JS player + pre-built frames) from the reviewer's
// _viz app into viz/, which build.mjs publishes at dist/viz/. The reviewer repo stays the
// single source of truth; viz/ is committed so the GitHub Actions build runs without it
// (same pattern as content/). Only runtime files are copied — not the authoring scripts or
// the algorithm sources (those run at build time in _viz, never in the browser).
import { rmSync, mkdirSync, cpSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Override with REVIEWER_VIZ_SRC=... if your reviewer repo lives elsewhere.
const SRC = process.env.REVIEWER_VIZ_SRC || 'C:/r/reviewer/algorithms/_viz';
const DEST = join(ROOT, 'viz');

if (!existsSync(SRC)) {
  console.error(`Visualizer source not found: ${SRC}\nSet REVIEWER_VIZ_SRC to your _viz path.`);
  process.exit(1);
}
if (!existsSync(join(SRC, 'data', 'manifest.json'))) {
  console.error(`No built frames at ${join(SRC, 'data', 'manifest.json')}.\nRun "node scripts/build.mjs" inside _viz first.`);
  process.exit(1);
}

rmSync(DEST, { recursive: true, force: true });
mkdirSync(join(DEST, 'src'), { recursive: true });
copyFileSync(join(SRC, 'index.html'), join(DEST, 'index.html'));
copyFileSync(join(SRC, 'src', 'schema.mjs'), join(DEST, 'src', 'schema.mjs'));   // imported by the player
cpSync(join(SRC, 'src', 'player'), join(DEST, 'src', 'player'), { recursive: true });
cpSync(join(SRC, 'data'), join(DEST, 'data'), { recursive: true });

console.log('Synced visualizer runtime -> viz/ (player + built frames; reviewer source untouched)');
