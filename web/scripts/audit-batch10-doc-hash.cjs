const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '../..');
const base = fs.readFileSync(path.join(root, 'docs/classification_audit.md'));
const section = fs.readFileSync(path.join(root, 'docs/.classification_audit_batch10.tmp.md'));
const expected = '091a0332fd2f03d0fd98d2626d83420d21290e9c';

function gitSha(buf) {
  return crypto.createHash('sha1').update(Buffer.from(`blob ${buf.length}\0`)).update(buf).digest('hex');
}

const b = base.toString('utf8');
const s = section.toString('utf8');
const baseTrailing = (b.match(/\n+$/) || [''])[0].length;
const sectionLeading = (s.match(/^\n+/) || [''])[0].length;
console.log(`AUDIT_BOUNDARY_META\tbase=${base.length}\tsection=${section.length}\tbaseTrailingLF=${baseTrailing}\tsectionLeadingLF=${sectionLeading}\tbaseTail=${JSON.stringify(b.slice(-80))}\tsectionHead=${JSON.stringify(s.slice(0,80))}`);

const baseTrim = b.replace(/\n+$/, '');
const sectionTrim = s.replace(/^\n+/, '');
for (let n = 0; n <= 12; n++) {
  const candidate = Buffer.from(baseTrim + '\n'.repeat(n) + sectionTrim, 'utf8');
  const sha = gitSha(candidate);
  console.log(`AUDIT_BOUNDARY_VARIANT\tlf=${n}\tbytes=${candidate.length}\tsha=${sha}${sha === expected ? '\tMATCH' : ''}`);
}

const variants = {
  raw: Buffer.concat([base, section]),
  section_without_separator: Buffer.from(b + s.replace(/^\n---\n\n/, ''), 'utf8'),
  section_header_with_two_lf: Buffer.from(baseTrim + '\n\n' + s.replace(/^\n---\n\n/, ''), 'utf8'),
  normalize_crlf: Buffer.from((b + s).replace(/\r\n/g, '\n'), 'utf8'),
  trim_section_final_lf: Buffer.from(b + s.replace(/\n+$/, ''), 'utf8'),
  add_section_final_lf: Buffer.from(b + s + '\n', 'utf8'),
};
for (const [name, candidate] of Object.entries(variants)) {
  const sha = gitSha(candidate);
  console.log(`AUDIT_NAMED_VARIANT\t${name}\tbytes=${candidate.length}\tsha=${sha}${sha === expected ? '\tMATCH' : ''}`);
}
