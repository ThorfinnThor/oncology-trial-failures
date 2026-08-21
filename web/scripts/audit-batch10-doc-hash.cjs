const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '../../docs/classification_audit.md');
const data = fs.readFileSync(file);
const blockSize = 4096;
const gitHeader = Buffer.from(`blob ${data.length}\0`, 'utf8');

console.log(
  `AUDIT_DOC_META\t${JSON.stringify({
    bytes: data.length,
    sha256: crypto.createHash('sha256').update(data).digest('hex'),
    gitBlobSha1: crypto.createHash('sha1').update(gitHeader).update(data).digest('hex'),
    blockSize,
    blockCount: Math.ceil(data.length / blockSize),
  })}`,
);

for (let offset = 0, index = 0; offset < data.length; offset += blockSize, index += 1) {
  const block = data.subarray(offset, Math.min(offset + blockSize, data.length));
  console.log(
    `AUDIT_DOC_HASH\t${index}\t${crypto.createHash('sha256').update(block).digest('hex')}`,
  );
}
