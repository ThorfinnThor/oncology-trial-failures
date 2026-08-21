const { spawnSync } = require('child_process');

const envNames = Object.keys(process.env)
  .filter((name) => /VERCEL.*(OIDC|CONNECT)|GITHUB|TOKEN/i.test(name))
  .sort();
console.log(`AUDIT_ENV_NAMES\t${JSON.stringify(envNames)}`);

const result = spawnSync('vercel', ['connect', 'list', '--format=json'], {
  encoding: 'utf8',
  env: process.env,
});

const sanitize = (value) =>
  String(value || '')
    .replace(/github_pat_[A-Za-z0-9_]+/g, '<redacted-token>')
    .replace(/gh[opsu]_[A-Za-z0-9_]+/g, '<redacted-token>')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer <redacted-token>')
    .trim();

console.log(
  `AUDIT_CONNECT_LIST\t${JSON.stringify({
    status: result.status,
    signal: result.signal,
    stdout: sanitize(result.stdout),
    stderr: sanitize(result.stderr),
  })}`,
);
