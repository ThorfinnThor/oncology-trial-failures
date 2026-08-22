const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..', '..');
const baseSha = '9b632fd99acc408a5b1ef439d7eaf055f3f3d674';
const targetBranch = 'audit/batch-18';
const expectedBlob = 'c1f5b32e5aeb3870067e9a8f7a197099dcad9de4';
const base = fs.readFileSync(path.join(root, 'docs', 'classification_audit.md'), 'utf8');
const append = fs.readFileSync(path.join(root, 'docs', 'batch18_append.tmp.md'), 'utf8');
const out = base.replace(/\s*$/, '') + '\n' + append;

const gitBlob = Buffer.concat([Buffer.from(`blob ${Buffer.byteLength(out)}\0`), Buffer.from(out)]);
const computedBlob = crypto.createHash('sha1').update(gitBlob).digest('hex');
if (computedBlob !== expectedBlob) throw new Error(`Unexpected final blob ${computedBlob}`);

function git(args, opts = {}) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    ...opts,
  }).trim();
}

console.log(`[BATCH18_FINAL] bytes=${Buffer.byteLength(out)} sha1=${computedBlob}`);
git(['fetch', 'origin', baseSha, '--depth=1']);
const writtenBlob = git(['hash-object', '-w', '--stdin'], { input: out });
if (writtenBlob !== expectedBlob) throw new Error(`git hash-object returned ${writtenBlob}`);

const indexFile = path.join('/tmp', `batch18-index-${process.pid}`);
const env = { ...process.env, GIT_INDEX_FILE: indexFile };
git(['read-tree', baseSha], { env });
git(['update-index', '--add', '--cacheinfo', '100644', writtenBlob, 'docs/classification_audit.md'], { env });
const treeSha = git(['write-tree'], { env });
const commitEnv = {
  ...env,
  GIT_AUTHOR_NAME: 'github-actions[bot]',
  GIT_AUTHOR_EMAIL: '41898282+github-actions[bot]@users.noreply.github.com',
  GIT_COMMITTER_NAME: 'github-actions[bot]',
  GIT_COMMITTER_EMAIL: '41898282+github-actions[bot]@users.noreply.github.com',
};
const commitSha = git(['commit-tree', treeSha, '-p', baseSha], {
  env: commitEnv,
  input: 'docs: add classification audit batch 18\n',
});

git(['push', 'origin', `${commitSha}:refs/heads/${targetBranch}`, `--force-with-lease=refs/heads/${targetBranch}:${baseSha}`]);
console.log(`[BATCH18_PUSH] commit=${commitSha} tree=${treeSha} blob=${writtenBlob}`);
