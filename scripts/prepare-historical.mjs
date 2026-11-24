import fs from "node:fs";
import path from "node:path";

const [source, output] = process.argv.slice(2);
if (!source || !output) throw new Error("Usage: prepare-historical.mjs <csv> <output.ts>");

function parseCsv(text) {
  const rows=[]; let row=[], cell="", quoted=false;
  for(let i=0;i<text.length;i+=1){const ch=text[i];if(quoted){if(ch==='"'&&text[i+1]==='"'){cell+='"';i+=1}else if(ch==='"')quoted=false;else cell+=ch}else if(ch==='"')quoted=true;else if(ch===','){row.push(cell);cell=""}else if(ch==='\n'){row.push(cell.replace(/\r$/, ""));rows.push(row);row=[];cell=""}else cell+=ch}
  if(cell||row.length){row.push(cell.replace(/\r$/, ""));rows.push(row)}
  const headers=rows.shift(); return rows.filter(r=>r.some(Boolean)).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??""])));
}

const tickets=parseCsv(fs.readFileSync(source,"utf8")).map(t=>({
  id:t.ticket_id,createdAt:t.created_at,client:t.client_name,tier:t.client_tier,category:t.category,
  priority:t.priority,description:t.description,agent:t.assigned_agent,escalated:t.escalated_to_eng==="Yes",
  handoffs:Number(t.eng_handoffs||0),outcome:t.eng_outcome,status:t.status,reopens:Number(t.reopen_count||0),
  csat:t.csat_score===""?null:Number(t.csat_score)
}));
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,`import type { Ticket } from "./types";\nexport const historicalTickets: Ticket[] = ${JSON.stringify(tickets)};\n`);
console.log(`Prepared ${tickets.length} historical tickets.`);
