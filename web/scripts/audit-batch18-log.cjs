const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'public', 'data', 'all_oncology_stopped_trials.json');
const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
const batch = rows.slice(3400, 3600);

for (let i = 0; i < batch.length; i += 1) {
  const row = batch[i];
  console.log('[AUDIT18] ' + JSON.stringify({
    record: 3401 + i,
    nct_id: row.nct_id,
    why_stopped: row.why_stopped,
    classification_label: row.classification_label,
    classification_reason: row.classification_reason,
    classification_confidence: row.classification_confidence,
  }));
}

console.log('[AUDIT18_META] ' + JSON.stringify({
  total_rows: rows.length,
  batch_count: batch.length,
  first: batch[0] && batch[0].nct_id,
  last: batch[batch.length - 1] && batch[batch.length - 1].nct_id,
}));
