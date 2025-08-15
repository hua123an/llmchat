#!/usr/bin/env node
// Extract a specific version section from CHANGELOG.md
// Usage: node scripts/extract-notes.cjs [CHANGELOG.md] [version] [outFile]

const fs = require('fs');

const changelogPath = process.argv[2] || 'CHANGELOG.md';
const version = process.argv[3] || '2.0.1';
const outFile = process.argv[4] || `RELEASE_NOTES_${version}.md`;

if (!fs.existsSync(changelogPath)) {
  console.error(`File not found: ${changelogPath}`);
  process.exit(1);
}

const content = fs.readFileSync(changelogPath, 'utf8');
// Match heading like: ## 2.0.1 or ## [2.0.1] - 2025-08-15
const escVersion = version.replace(/\./g, '\\.');
const re = new RegExp(
  String.raw`^##\s*\[?${escVersion}\]?[^\n]*\n([\s\S]*?)(?=^##\s*\[?\d|$)`,
  'm'
);

const match = content.match(re);
if (!match) {
  console.error(`Version section not found: ${version}`);
  process.exit(2);
}

const section = match[0].trim() + '\n';
fs.writeFileSync(outFile, section, 'utf8');
console.log(`Notes extracted to ${outFile}`);


