const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..');
const base = fs.readFileSync(path.join(root, 'docs', 'classification_audit.md'), 'utf8');
const append = fs.readFileSync(path.join(root, 'docs', 'batch18_append.tmp.md'), 'utf8');
const out = base.replace(/\s*$/, '') + '\n' + append;
fs.writeFileSync(path.join(__dirname, '..', 'public', 'batch18-final.md'), out);
console.log('[BATCH18_FINAL] bytes=' + Buffer.byteLength(out) + ' sha1=' + require('crypto').createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${Buffer.byteLength(out)}\0`), Buffer.from(out)])).digest('hex'));
