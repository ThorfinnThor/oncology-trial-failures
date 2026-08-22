const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..', '..');
const baseSha = '9b632fd99acc408a5b1ef439d7eaf055f3f3d674';
const expectedBlob = 'c1f5b32e5aeb3870067e9a8f7a197099dcad9de4';
const base = fs.readFileSync(path.join(root, 'docs', 'classification_audit.md'), 'utf8');
const append = fs.readFileSync(path.join(root, 'docs', 'batch18_append.tmp.md'), 'utf8');
const out = base.replace(/\s*$/, '') + '\n' + append;
const gitBlob = Buffer.concat([Buffer.from(`blob ${Buffer.byteLength(out)}\0`), Buffer.from(out)]);
const computedBlob = crypto.createHash('sha1').update(gitBlob).digest('hex');
if (computedBlob !== expectedBlob) throw new Error(`Unexpected final blob ${computedBlob}`);
console.log(`[BATCH18_FINAL] bytes=${Buffer.byteLength(out)} sha1=${computedBlob}`);
console.log('[BATCH18_ENV_NAMES] ' + Object.keys(process.env).filter(k => /GIT|GITHUB|VERCEL/i.test(k)).sort().join(','));
try {
  console.log('[BATCH18_REMOTES] ' + execFileSync('git', ['remote', '-v'], {cwd: root, encoding: 'utf8'}).replace(/\n/g, ' | '));
} catch (e) {
  console.log('[BATCH18_REMOTES] unavailable');
}
process.exit(1);
