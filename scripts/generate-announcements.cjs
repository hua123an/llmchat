// Simple generator: parse CHANGELOG.md and emit src/assets/announcements.ts
// Supports sections: ## [x.y.z] - YYYY-MM-DD and ### 新增/改进/修复 with - bullets
// Keeps only top N versions (default 10)
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const CHANGELOG = path.join(ROOT, 'CHANGELOG.md');
const OUTPUT = path.join(ROOT, 'src', 'assets', 'announcements.ts');
const MAX_VERSIONS = 10;

function parseChangelog(md) {
  const lines = md.split(/\r?\n/);
  const releases = [];
  let current = null;
  let currentSection = null;

  const sectionTypes = ['新增', '改进', '修复'];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Match version header: ## [2.0.1] - 2025-08-15
    const verMatch = line.match(/^##\s*\[(.+?)\]\s*-\s*(\d{4}-\d{2}-\d{2})/);
    if (verMatch) {
      if (current) releases.push(current);
      current = { version: verMatch[1], date: verMatch[2], items: [] };
      currentSection = null;
      continue;
    }
    // Section header: ### 新增/改进/修复
    const secMatch = line.match(/^###\s*(新增|改进|修复)/);
    if (secMatch && current) {
      currentSection = { type: secMatch[1], points: [] };
      current.items.push(currentSection);
      continue;
    }
    // Bullet point: - text
    if (line.startsWith('- ') && current && currentSection) {
      const text = line.slice(2).trim();
      currentSection.points.push(stripMarkdown(text));
      continue;
    }
  }
  if (current) releases.push(current);
  // filter only recognized sections and non-empty
  releases.forEach(r => {
    r.items = r.items.filter(s => sectionTypes.includes(s.type) && s.points.length > 0);
  });
  return releases.slice(0, MAX_VERSIONS);
}

function stripMarkdown(s) {
  // Remove common MD markup and emojis for concise UI
  return s
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[^\w\u4e00-\u9fa5]+/, '') // leading emoji/symbols
    .trim();
}

function emitTs(releases) {
  const header = `export interface ReleaseNoteItem {\n  type: '新增' | '改进' | '修复';\n  points: string[];\n}\n\nexport interface ReleaseNote {\n  version: string;\n  date: string;\n  items: ReleaseNoteItem[];\n}\n\nexport const releaseNotes: ReleaseNote[] = `;
  const body = JSON.stringify(releases, null, 2)
    .replace(/"type":/g, '"type":')
    .replace(/"points":/g, '"points":');
  return `${header}${body};\n`;
}

function main() {
  if (!fs.existsSync(CHANGELOG)) {
    console.error('[generate-announcements] CHANGELOG.md not found');
    process.exit(1);
  }
  const md = fs.readFileSync(CHANGELOG, 'utf8');
  const releases = parseChangelog(md);
  if (!releases.length) {
    console.warn('[generate-announcements] No releases parsed, skip emitting');
    process.exit(0);
  }
  const ts = emitTs(releases);
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, ts, 'utf8');
  console.log(`[generate-announcements] Wrote ${OUTPUT} with ${releases.length} releases`);
}

main();


