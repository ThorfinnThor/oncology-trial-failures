const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'public', 'data', 'all_oncology_stopped_trials.json');
const rows = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const batch = rows.slice(2400, 2600);

if (batch.length !== 200) {
  throw new Error(`Expected 200 Batch 13 rows, got ${batch.length}`);
}

for (let i = 0; i < batch.length; i += 1) {
  const row = batch[i];
  console.log('[AUDIT13]', JSON.stringify({
    record: 2401 + i,
    nct_id: row.nct_id,
    why_stopped: row.why_stopped,
    classification_label: row.classification_label,
    classification_reason: row.classification_reason,
    classification_confidence: row.classification_confidence,
  }));
}
