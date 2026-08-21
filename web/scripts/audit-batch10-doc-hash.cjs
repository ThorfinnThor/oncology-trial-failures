const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '../../docs/classification_audit.md');
const data = fs.readFileSync(file);
const blockSize = 4096;
const logChunkSize = 700;
const gitHeader = Buffer.from(`blob ${data.length}\0`, 'utf8');

console.log(
  `AUDIT_DOC_META\t${JSON.stringify({
    bytes: data.length,
    sha256: crypto.createHash('sha256').update(data).digest('hex'),
    gitBlobSha1: crypto.createHash('sha1').update(gitHeader).update(data).digest('hex'),
    blockSize,
    blockCount: Math.ceil(data.length / blockSize),
    logChunkSize,
  })}`,
);

for (const blockIndex of [11, 13, 16]) {
  const offset = blockIndex * blockSize;
  const block = data.subarray(offset, Math.min(offset + blockSize, data.length));
  const encoded = block.toString('base64');
  for (let chunkIndex = 0; chunkIndex * logChunkSize < encoded.length; chunkIndex += 1) {
    const chunk = encoded.slice(chunkIndex * logChunkSize, (chunkIndex + 1) * logChunkSize);
    console.log(`AUDIT_DOC_CHUNK\t${blockIndex}\t${chunkIndex}\t${chunk}`);
  }
}
