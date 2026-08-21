const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'public', 'data', 'all_oncology_stopped_trials.json');
const rows = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

for (const [offset, row] of rows.slice(1600, 1800).entries()) {
  console.log('AUDIT_BATCH9\t' + JSON.stringify({
    record: 1601 + offset,
    nct_id: row.nct_id,
    why_stopped: row.why_stopped,
    classification_label: row.classification_label,
    classification_reason: row.classification_reason,
    classification_confidence: row.classification_confidence,
  }));
}
