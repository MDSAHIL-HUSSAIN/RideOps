import fs from 'node:fs';
import path from 'node:path';

const source = process.argv[2];
const output = process.argv[3];
if (!source || !output) {
  console.error('Usage: node prepare-data.mjs <tickets.csv> <dist/data.js>');
  process.exit(1);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell.length || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
  const headers = rows.shift();
  return rows.filter(r => r.some(Boolean)).map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])));
}

const records = parseCsv(fs.readFileSync(source, 'utf8')).map((t) => ({
  ...t,
  eng_handoffs: Number(t.eng_handoffs || 0),
  reopen_count: Number(t.reopen_count || 0),
  csat_score: t.csat_score === '' ? null : Number(t.csat_score),
}));

const targetCategories = ['Roster / booking not syncing', 'Live tracking / GPS incorrect'];
const isOpen = (ticket) => ticket.status.startsWith('Open');
const metrics = {
  total: records.length,
  open: records.filter(isOpen).length,
  escalated: records.filter(t => t.escalated_to_eng === 'Yes').length,
  returned: records.filter(t => ['Insufficient info - returned to L1', 'Config issue - returned to L1'].includes(t.eng_outcome)).length,
  multiHandoff: records.filter(t => t.eng_handoffs >= 2).length,
  reopened: records.filter(t => t.reopen_count > 0).length,
  targetTickets: records.filter(t => targetCategories.includes(t.category)).length,
  targetOpen: records.filter(t => targetCategories.includes(t.category) && isOpen(t)).length,
};

const payload = { generatedAt: new Date().toISOString(), source: path.basename(source), targetCategories, metrics, tickets: records };
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `window.RIDEOPS_DATA = ${JSON.stringify(payload)};\n`);
console.log(`Prepared ${records.length} tickets at ${output}`);
