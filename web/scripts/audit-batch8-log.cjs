const fs = require('fs');

const rows = JSON.parse(fs.readFileSync('public/data/all_oncology_stopped_trials.json', 'utf8'));
const batch = rows.slice(1400, 1600);
if (batch.length !== 200) throw new Error(`Expected 200 records, got ${batch.length}`);

console.log(`AUDIT8_META|count=${batch.length}|first=${batch[0]?.nct_id}|last=${batch[batch.length - 1]?.nct_id}`);
const sleeper = new Int32Array(new SharedArrayBuffer(4));
for (let i = 0; i < batch.length; i++) {
  const r = batch[i];
  const out = {
    nct_id: r.nct_id || '',
    why_stopped: r.why_stopped || '',
    classification_reason: r.classification_reason || '',
    classification_confidence: r.classification_confidence || ''
  };
  console.log(`AUDIT8|${1401 + i}|${JSON.stringify(out)}`);
  Atomics.wait(sleeper, 0, 0, 120);
}
console.log('AUDIT8_DONE');
