const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'public', 'data', 'all_oncology_stopped_trials.json');
const rows = JSON.parse(fs.readFileSync(file, 'utf8'));

rows.slice(3400, 3600).forEach((row, i) => {
  console.log('[AUDIT18] ' + JSON.stringify({
    record: 3401 + i,
    nct_id: row.nct_id,
    why_stopped: row.why_stopped,
    classification_label: row.classification_label,
    classification_reason: row.classification_reason,
    classification_confidence: row.classification_confidence,
  }));
});
