// Merge + validate per-topic quiz JSON (.quizgen/*.json, written by the generation
// workflow's verifier agents) into the canonical bank quiz-data/questions.json.
//
//   node scripts/merge-quiz.mjs
//
// Validates every question, reports per-topic / per-difficulty counts, and fails
// loudly on structural problems so a bad file never silently ships.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, ".quizgen");
const OUTDIR = join(ROOT, "quiz-data");
const OUT = join(OUTDIR, "questions.json");

const DIFFS = ["easy", "medium", "hard"];

if (!existsSync(SRC)) {
  console.error(`No staging dir at ${SRC}. Run the generation workflow first.`);
  process.exit(1);
}

const files = readdirSync(SRC).filter((f) => f.endsWith(".json"));
if (!files.length) {
  console.error(`No *.json files in ${SRC}. Nothing to merge.`);
  process.exit(1);
}

const all = [];
const ids = new Set();
const problems = [];
const norm = (s) => String(s == null ? "" : s).trim();

// Deterministically permute a question's options (seeded by its id) and remap the answer index.
// Generators/verifiers tend to leave the correct option at index 0; this balances the *stored*
// bank so it isn't position-biased. It's reproducible (stable git diffs); the quiz app also
// re-shuffles at runtime, so on-screen position varies every play regardless.
function balanceOptions(q) {
  let h = 2166136261;
  for (let i = 0; i < q.id.length; i++) { h ^= q.id.charCodeAt(i); h = Math.imul(h, 16777619); }
  let seed = h >>> 0;
  const rand = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const idx = q.options.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp;
  }
  q.options = idx.map((i) => q.options[i]);
  q.answer = idx.indexOf(q.answer);
}

function validate(q, where) {
  const errs = [];
  for (const f of ["id", "topic", "slug", "difficulty", "question", "explanation"]) {
    if (!norm(q[f])) errs.push(`missing/empty "${f}"`);
  }
  if (!DIFFS.includes(q.difficulty)) errs.push(`bad difficulty "${q.difficulty}"`);
  if (!Array.isArray(q.options) || q.options.length !== 4) errs.push(`options must have exactly 4 (got ${Array.isArray(q.options) ? q.options.length : "non-array"})`);
  else if (q.options.some((o) => !norm(o))) errs.push("an option is empty");
  if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) errs.push(`answer index out of range: ${q.answer}`);
  if (q.options && new Set(q.options.map(norm)).size !== q.options.length) errs.push("duplicate option text");
  if (errs.length) problems.push(`[${where}] ${q.id || "(no id)"}: ${errs.join("; ")}`);
  return errs.length === 0;
}

const perTopic = {};
const perDiff = { easy: 0, medium: 0, hard: 0 };

for (const file of files.sort()) {
  let arr;
  try {
    arr = JSON.parse(readFileSync(join(SRC, file), "utf8"));
  } catch (e) {
    problems.push(`[${file}] JSON parse error: ${e.message}`);
    continue;
  }
  if (!Array.isArray(arr)) { problems.push(`[${file}] top-level value is not an array`); continue; }
  let kept = 0;
  for (const q of arr) {
    if (!validate(q, file)) continue;
    if (ids.has(q.id)) { problems.push(`[${file}] duplicate id "${q.id}" — skipped`); continue; }
    // normalize optional fields
    q.tags = Array.isArray(q.tags) ? q.tags.map(norm).filter(Boolean) : [];
    q.code = typeof q.code === "string" ? q.code : "";
    q.codeLang = typeof q.codeLang === "string" ? q.codeLang : "";
    balanceOptions(q);
    ids.add(q.id);
    all.push(q);
    kept++;
    perTopic[q.topic] = (perTopic[q.topic] || 0) + 1;
    perDiff[q.difficulty]++;
  }
  console.log(`  ${file.padEnd(34)} ${kept} questions`);
}

// stable order: by slug, then difficulty, then id
const dord = { easy: 0, medium: 1, hard: 2 };
all.sort((a, b) => a.slug.localeCompare(b.slug) || (dord[a.difficulty] - dord[b.difficulty]) || a.id.localeCompare(b.id));

console.log("\n— Per topic —");
for (const t of Object.keys(perTopic).sort()) console.log(`  ${t.padEnd(34)} ${perTopic[t]}`);
console.log("\n— Per difficulty —");
for (const d of DIFFS) console.log(`  ${d.padEnd(10)} ${perDiff[d]}`);
console.log(`\nTotal valid questions: ${all.length}`);

if (problems.length) {
  console.log(`\n⚠  ${problems.length} issue(s):`);
  for (const p of problems) console.log("   - " + p);
}

if (!all.length) { console.error("\nNo valid questions — aborting, not writing output."); process.exit(1); }

mkdirSync(OUTDIR, { recursive: true });
writeFileSync(OUT, JSON.stringify(all, null, 2) + "\n");
console.log(`\nWrote ${all.length} questions -> ${OUT}`);
