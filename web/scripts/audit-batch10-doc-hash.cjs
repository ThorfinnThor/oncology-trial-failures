const { spawnSync } = require('child_process');

const result = spawnSync(
  'git',
  ['push', '--dry-run', 'origin', 'HEAD:refs/heads/tmp/audit-batch10-vercel-probe'],
  { encoding: 'utf8' },
);

const sanitize = (value) =>
  String(value || '')
    .replace(/https?:\/\/[^\s]+/g, '<redacted-url>')
    .replace(/github_pat_[A-Za-z0-9_]+/g, '<redacted-token>')
    .trim();

console.log(
  `AUDIT_GIT_PUSH_PROBE\t${JSON.stringify({
    status: result.status,
    signal: result.signal,
    stdout: sanitize(result.stdout),
    stderr: sanitize(result.stderr),
  })}`,
);
