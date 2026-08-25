import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

type Trial = Record<string, unknown>;

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const source = path.join(process.cwd(), 'public', 'data', 'all_oncology_stopped_trials.json');
  const rows = JSON.parse(fs.readFileSync(source, 'utf8')) as Trial[];
  const keep = [
    'nct_id',
    'brief_title',
    'overall_status',
    'why_stopped',
    'classification_label',
    'classification_reason',
    'classification_confidence',
    'classification_evidence',
    'disease_area',
    'phases',
    'lead_sponsor',
    'conditions',
    'intervention_names',
    'last_update_post_date',
  ];
  const records = rows.slice(1200, 1400).map((row) =>
    Object.fromEntries(keep.map((key) => [key, row[key] ?? ''])),
  );

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    source: 'web/public/data/all_oncology_stopped_trials.json',
    source_record_start: 1201,
    source_record_end: 1400,
    count: records.length,
    records,
  });
}
