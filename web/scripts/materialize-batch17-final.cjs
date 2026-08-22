const fs = require('fs');
const path = require('path');

const basePath = path.join(__dirname, '..', '..', 'docs', 'classification_audit.md');
const sectionPath = path.join(__dirname, '..', '..', 'docs', '.classification_audit_batch17.tmp.md');
const outPath = path.join(__dirname, '..', 'public', 'batch17-final-audit.md');

const base = fs.readFileSync(basePath, 'utf8');
const section = fs.readFileSync(sectionPath, 'utf8');
const separator = base.endsWith('\n') ? '\n' : '\n\n';
const combined = base + separator + section;
fs.writeFileSync(outPath, combined, 'utf8');
console.log(`[BATCH17-MATERIALIZE] bytes=${Buffer.byteLength(combined, 'utf8')}`);
