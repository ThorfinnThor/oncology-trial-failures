const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const repoRoot = path.join(__dirname, '..', '..');
const basePath = path.join(repoRoot, 'docs', 'classification_audit.md');
const sectionPath = path.join(repoRoot, 'docs', '.classification_audit_batch17.tmp.md');
const outPath = path.join(__dirname, '..', 'public', 'batch17-final-audit.md');
const baseCommit = '6d8192d08907ba99e943ba97c8629172aa4c0505';
const expectedBlob = '563848be99b187c7031e971605f204a24c5512be';

const base = fs.readFileSync(basePath, 'utf8');
const section = fs.readFileSync(sectionPath, 'utf8');
const separator = base.endsWith('\n') ? '\n' : '\n\n';
const combined = base + separator + section;
const body = Buffer.from(combined, 'utf8');
const header = Buffer.from(`blob ${body.length}\0`, 'utf8');
const gitBlobSha = crypto.createHash('sha1').update(header).update(body).digest('hex');
if (gitBlobSha !== expectedBlob) throw new Error(`Unexpected final blob ${gitBlobSha}`);
fs.writeFileSync(outPath, combined, 'utf8');
console.log(`[BATCH17-FINAL] bytes=${body.length} git_blob_sha=${gitBlobSha}`);

const tmp = '/tmp/classification_audit_batch17_final.md';
fs.writeFileSync(tmp, combined, 'utf8');
execSync(`git reset --hard ${baseCommit}`, { cwd: repoRoot, stdio: 'inherit' });
fs.copyFileSync(tmp, path.join(repoRoot, 'docs', 'classification_audit.md'));
const checked = execSync('git hash-object docs/classification_audit.md', { cwd: repoRoot, encoding: 'utf8' }).trim();
if (checked !== expectedBlob) throw new Error(`Post-reset blob mismatch ${checked}`);
execSync('git add -- docs/classification_audit.md', { cwd: repoRoot, stdio: 'inherit' });
const changed = execSync('git diff --cached --name-only', { cwd: repoRoot, encoding: 'utf8' }).trim();
if (changed !== 'docs/classification_audit.md') throw new Error(`Unexpected staged files: ${changed}`);
execSync('git diff --cached --check', { cwd: repoRoot, stdio: 'inherit' });
execSync("git config user.name 'github-actions[bot]'", { cwd: repoRoot });
execSync("git config user.email '41898282+github-actions[bot]@users.noreply.github.com'", { cwd: repoRoot });
execSync("git commit -m 'docs: add classification audit batch 17'", { cwd: repoRoot, stdio: 'inherit' });
console.log(`[BATCH17-FINAL] commit=${execSync('git rev-parse HEAD', { cwd: repoRoot, encoding: 'utf8' }).trim()}`);
execSync('git push origin HEAD:audit/batch-17', { cwd: repoRoot, stdio: 'inherit' });
console.log('[BATCH17-FINAL] push=success');
