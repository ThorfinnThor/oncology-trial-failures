const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const repoRoot = path.resolve(__dirname, '../..');
const target = path.join(repoRoot, 'docs/classification_audit.md');
const section = path.join(repoRoot, 'docs/.classification_audit_batch10.tmp.md');
const output = path.join(repoRoot, 'web/public/audit-batch10-combined.md');

const baseBytes = fs.readFileSync(target);
const sectionBytes = fs.readFileSync(section);
const combined = Buffer.concat([baseBytes, sectionBytes]);
const header = Buffer.from(`blob ${combined.length}\0`, 'utf8');
const sha = crypto.createHash('sha1').update(header).update(combined).digest('hex');

fs.writeFileSync(output, combined);
console.log(`AUDIT_BATCH10_COMBINED_SHA\t${sha}\tbytes=${combined.length}`);
