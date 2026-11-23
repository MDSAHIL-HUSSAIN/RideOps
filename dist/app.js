const DATA = window.RIDEOPS_DATA;
if (!DATA) document.body.innerHTML = '<p style="padding:40px">RideOps data failed to load.</p>';

const targetCategories = DATA.targetCategories;
const categoryChecks = {
  'Roster / booking not syncing': [
    {id:'roster_scope', label:'Confirm the affected roster, date and shift', help:'Record the roster batch and at least one employee or trip ID.', critical:true},
    {id:'roster_publish', label:'Verify the roster was published successfully', help:'Check publish status, timestamp and any validation warning.', critical:true},
    {id:'roster_mapping', label:'Validate employee, route and shift mapping', help:'Look for inactive employees, route mismatch or missing shift mapping.', critical:true},
    {id:'roster_retry', label:'Re-run sync after correcting validation errors', help:'Capture the retry time and whether the issue persists.', critical:false},
    {id:'roster_compare', label:'Compare one working and one failing record', help:'This helps isolate data/configuration from platform behaviour.', critical:false},
  ],
  'Live tracking / GPS incorrect': [
    {id:'gps_trip', label:'Confirm active trip and assigned vehicle', help:'Record trip ID, vehicle ID, driver and shift window.', critical:true},
    {id:'gps_device', label:'Check driver device connectivity and location permission', help:'Confirm app online state, GPS permission and battery saver status.', critical:true},
    {id:'gps_timestamp', label:'Compare last ping time with reported incident', help:'Capture the last valid coordinate and server timestamp.', critical:true},
    {id:'gps_other', label:'Check another device or trip on the same site', help:'Distinguish a single-device issue from a wider service issue.', critical:false},
    {id:'gps_refresh', label:'Restart app and verify a fresh location ping', help:'Record whether tracking recovers after the controlled check.', critical:false},
  ],
  default: [
    {id:'generic_repro', label:'Reproduce the reported behaviour', help:'Record exact steps and the observed result.', critical:true},
    {id:'generic_config', label:'Check relevant configuration and permissions', help:'Capture values that could explain the issue.', critical:true},
    {id:'generic_compare', label:'Compare with a known-working example', help:'Identify what differs between working and failing cases.', critical:false},
    {id:'generic_known', label:'Search known issues and recent changes', help:'Link any matching incident or release.', critical:false},
  ],
};
const closureChecks = [
  {id:'fix_verified', label:'Fix verified against the original symptom', help:'Repeat the same user path or operational check.'},
  {id:'scope_verified', label:'Affected employees / trips verified', help:'Confirm recovery across the stated impact scope.'},
  {id:'cause_explained', label:'Cause and action explained in plain language', help:'Give L1 a client-safe explanation.'},
  {id:'next_steps', label:'Monitoring or prevention steps recorded', help:'Document what to do if the symptom returns.'},
];

const el = id => document.getElementById(id);
const $all = s => [...document.querySelectorAll(s)];
const state = {
  ticket:null, step:'intake', checks:{}, closure:{}, route:'', timeline:[], assessmentStartedAt:null,
};
const fieldIds = ['category','priority','description','expected-actual','entity-id','observed-at','impact','reproducibility','evidence-url','log-notes','checks-notes','override-reason','resolution-summary','client-confirmation'];

function toast(message){const node=el('toast');node.textContent=message;node.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>node.classList.remove('show'),2200)}
function formatDate(value){if(!value)return '—';return new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value.replace(' ','T')+'+05:30'))}
function pct(n,d){return d?Math.round(n/d*1000)/10:0}
function unique(list){return [...new Set(list)].sort()}
function localKey(){return state.ticket?`rideops-assessment-${state.ticket.ticket_id}`:null}
function logEvent(title, detail=''){state.timeline.unshift({title,detail,at:new Date().toISOString()});state.timeline=state.timeline.slice(0,12);renderTimeline();persist()}
function renderTimeline(){el('timeline').innerHTML=state.timeline.length?state.timeline.map(x=>`<li><strong>${escapeHtml(x.title)}</strong>${escapeHtml(x.detail)}<small>${new Date(x.at).toLocaleString('en-IN',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'})}</small></li>`).join(''):'<li><strong>Assessment not started</strong>Select a ticket to begin.</li>'}
function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

function getForm(){return Object.fromEntries(fieldIds.map(id=>[id,el(id)?.value||'']))}
function persist(){if(!localKey())return;const payload={checks:state.checks,closure:state.closure,route:state.route,timeline:state.timeline,assessmentStartedAt:state.assessmentStartedAt,form:getForm()};localStorage.setItem(localKey(),JSON.stringify(payload));el('save-state').textContent='Saved locally'}
function restore(){const saved=JSON.parse(localStorage.getItem(localKey())||'null');if(!saved)return;state.checks=saved.checks||{};state.closure=saved.closure||{};state.route=saved.route||'';state.timeline=saved.timeline||[];state.assessmentStartedAt=saved.assessmentStartedAt||null;Object.entries(saved.form||{}).forEach(([id,value])=>{if(el(id))el(id).value=value});}

function readiness(){
  if(!state.ticket)return {score:0,missing:['ticket context'],critical:3,checked:0,total:0};
  const f=getForm();
  const fields=[['expected-actual','expected vs actual'],['entity-id','affected trip / shift ID'],['observed-at','occurrence time'],['impact','business impact'],['reproducibility','reproducibility'],['log-notes','relevant IDs or logs']];
  const required=fields.map(([id,label])=>({done:Boolean(f[id].trim()),label,weight:id==='expected-actual'||id==='entity-id'?12:8}));
  const checks=checksForCategory();
  const checked=checks.filter(c=>state.checks[c.id]).length;
  const criticalMissing=checks.filter(c=>c.critical&&!state.checks[c.id]).map(c=>c.label);
  const fieldScore=required.reduce((n,x)=>n+(x.done?x.weight:0),0);
  const checkScore=checks.length?Math.round(40*checked/checks.length):0;
  const evidenceScore=(f['evidence-url'].trim()?6:0)+(f['checks-notes'].trim()?6:0);
  const max=required.reduce((n,x)=>n+x.weight,0)+40+12;
  return {score:Math.min(100,Math.round((fieldScore+checkScore+evidenceScore)/max*100)),missing:[...required.filter(x=>!x.done).map(x=>x.label),...criticalMissing],critical:criticalMissing.length,checked,total:checks.length};
}
function checksForCategory(){return categoryChecks[el('category').value]||categoryChecks.default}
function renderChecklist(){const checks=checksForCategory();el('diagnosis-title').textContent=targetCategories.includes(el('category').value)?`${el('category').value} checks`:'Guided diagnosis';el('checklist').innerHTML=checks.map(c=>`<label class="check-item ${state.checks[c.id]?'checked':''}"><input type="checkbox" data-check="${c.id}" ${state.checks[c.id]?'checked':''}><span><strong>${escapeHtml(c.label)}${c.critical?'<small class="critical-tag">Required</small>':''}</strong><small>${escapeHtml(c.help)}</small></span></label>`).join('');$all('[data-check]').forEach(x=>x.addEventListener('change',()=>{state.checks[x.dataset.check]=x.checked;x.closest('.check-item').classList.toggle('checked',x.checked);updateReadiness();persist()}))}
function renderClosure(){el('closure-checklist').innerHTML=closureChecks.map(c=>`<label class="check-item ${state.closure[c.id]?'checked':''}"><input type="checkbox" data-close-check="${c.id}" ${state.closure[c.id]?'checked':''}><span><strong>${escapeHtml(c.label)}</strong><small>${escapeHtml(c.help)}</small></span></label>`).join('');$all('[data-close-check]').forEach(x=>x.addEventListener('change',()=>{state.closure[x.dataset.closeCheck]=x.checked;x.closest('.check-item').classList.toggle('checked',x.checked);persist()}))}
function updateReadiness(){const r=readiness();el('readiness-score').textContent=r.score;el('context-score').textContent=`${r.score}%`;el('score-ring').style.setProperty('--score',r.score);const label=r.score>=80&&r.critical===0?'Engineering-ready':r.score>=55?'Evidence incomplete':'Needs context';el('readiness-label').textContent=label;el('readiness-help').textContent=r.missing.length?`Next: ${r.missing[0]}.`:'Required evidence is complete. Review the recommended route.';renderRecommendation();renderPacket()}

function outcomeProfile(category){const esc=DATA.tickets.filter(t=>t.category===category&&t.escalated_to_eng==='Yes');const returned=esc.filter(t=>['Insufficient info - returned to L1','Config issue - returned to L1'].includes(t.eng_outcome)).length;const fixed=esc.filter(t=>t.eng_outcome==='Fixed').length;return {total:esc.length,returned,fixed,returnedRate:pct(returned,esc.length),fixedRate:pct(fixed,esc.length)}}
function renderRecommendation(){if(!state.ticket)return;const r=readiness();const profile=outcomeProfile(el('category').value);const good=r.score>=80&&r.critical===0;el('route-recommendation').className=`recommendation ${good?'good':'warn'}`;el('route-recommendation').innerHTML=`<div class="rec-head"><span class="rec-icon">${good?'✓':'!'}</span><div><h3>${good?'Evidence supports an engineering review':'Continue diagnosis before escalation'}</h3><p>${good?'Required checks are complete. If the issue still reproduces, create a structured engineering handoff.':`${r.missing.length} evidence item${r.missing.length===1?'':'s'} remain. Escalating now would require an override reason.`}</p></div></div><div class="rec-evidence"><span><strong>${profile.returnedRate}%</strong> returned/config outcome in this category</span><span><strong>${profile.fixedRate}%</strong> fixed by engineering</span><span><strong>${profile.total}</strong> historical escalations</span></div>`;const eng=document.querySelector('input[name="route"][value="engineering"]');el('override-wrap').classList.toggle('hidden',!(eng.checked&&!good))}

function packetText(){if(!state.ticket)return 'Select a ticket to generate a packet.';const f=getForm(),r=readiness(),checked=checksForCategory().filter(c=>state.checks[c.id]).map(c=>`• ${c.label}`),route=state.route||'Not selected';return `RIDEOPS ACTION PACKET\n${state.ticket.ticket_id} · ${f.priority} · ${f.category}\n\nCLIENT\n${state.ticket.client_name} (${state.ticket.client_tier})\n\nREPORTED ISSUE\n${f.description||'Not recorded'}\n\nEXPECTED VS ACTUAL\n${f['expected-actual']||'Not recorded'}\n\nSCOPE & IMPACT\nAffected ID: ${f['entity-id']||'Not recorded'}\nFirst observed: ${f['observed-at']||'Not recorded'}\nImpact: ${f.impact||'Not recorded'}\nReproducibility: ${f.reproducibility||'Not recorded'}\n\nCHECKS COMPLETED\n${checked.length?checked.join('\n'):'No checks recorded'}\n\nEVIDENCE\nLink: ${f['evidence-url']||'Not supplied'}\nIDs / logs: ${f['log-notes']||'Not supplied'}\nObservations: ${f['checks-notes']||'Not supplied'}\n\nDECISION\nRoute: ${route}\nReadiness: ${r.score}%\n${f['override-reason']?`Override reason: ${f['override-reason']}\n`:''}\nTIMESTAMPS\nPrepared: ${new Date().toLocaleString('en-IN')}\nOriginal ticket created: ${formatDate(state.ticket.created_at)}`}
function renderPacket(){el('packet-preview').textContent=packetText()}

function loadTicket(ticket){state.ticket=ticket;state.step='intake';state.checks={};state.closure={};state.route='';state.timeline=[];state.assessmentStartedAt=new Date().toISOString();fieldIds.forEach(id=>{if(el(id))el(id).value='' });el('ticket-id').value=ticket.ticket_id;el('client-name').value=ticket.client_name;el('category').value=ticket.category;el('priority').value=ticket.priority;el('description').value=ticket.description;const created=new Date(ticket.created_at.replace(' ','T')+'+05:30');const local=new Date(created.getTime()-created.getTimezoneOffset()*60000).toISOString().slice(0,16);el('observed-at').value=local;restore();document.querySelectorAll('input[name="route"]').forEach(x=>x.checked=x.value===state.route);el('context-id').textContent=ticket.ticket_id;el('context-client').textContent=ticket.client_name;el('context-priority').textContent=ticket.priority;renderChecklist();renderClosure();renderTimeline();showStep('intake');updateReadiness();showView('workbench');if(!state.timeline.length)logEvent('Assessment started',`${ticket.category} · ${ticket.priority}`);toast(`${ticket.ticket_id} loaded`)}
function showStep(step){state.step=step;$all('.step-panel').forEach(x=>x.classList.toggle('active',x.id===`step-${step}`));const order=['intake','diagnosis','route','packet','closure'],idx=order.indexOf(step);$all('.step').forEach((x,i)=>{x.classList.toggle('active',x.dataset.step===step);x.classList.toggle('done',i<idx)});if(step==='route')renderRecommendation();if(step==='packet')renderPacket()}
function showView(view){$all('.view').forEach(x=>x.classList.toggle('active',x.id===`${view}-view`));$all('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.view===view));el('page-title').textContent={workbench:'Escalation workbench',queue:'Ticket queue',insights:'Operations outcomes'}[view]}

function populateSelectors(){const cats=unique(DATA.tickets.map(t=>t.category));el('category').innerHTML=cats.map(c=>`<option>${escapeHtml(c)}</option>`).join('');el('queue-category').insertAdjacentHTML('beforeend',cats.map(c=>`<option>${escapeHtml(c)}</option>`).join(''))}
function renderQueue(){const q=el('queue-search').value.toLowerCase(),cat=el('queue-category').value,status=el('queue-status').value;const isOpen=t=>t.status.startsWith('Open');const rows=DATA.tickets.filter(t=>(cat==='all'||t.category===cat)&&(status==='all'||(status==='open'&&isOpen(t))||(status==='closed'&&!isOpen(t)))&&(!q||`${t.ticket_id} ${t.client_name} ${t.description}`.toLowerCase().includes(q))).sort((a,b)=>{if(isOpen(a)!==isOpen(b))return isOpen(a)?-1:1;return b.created_at.localeCompare(a.created_at)}).slice(0,250);el('ticket-table').innerHTML=rows.map(t=>`<tr><td><strong>${t.ticket_id}</strong><small>${formatDate(t.created_at)}</small></td><td>${escapeHtml(t.client_name)}<small>${escapeHtml(t.client_tier)}</small></td><td class="issue">${escapeHtml(t.category)}<small>${escapeHtml(t.description)}</small></td><td>${t.priority}</td><td>${t.escalated_to_eng==='Yes'?'<span class="badge eng">Escalated</span>':'L1 only'}</td><td>${t.eng_handoffs}</td><td><span class="badge ${isOpen(t)?'open':'closed'}">${escapeHtml(t.status)}</span></td><td><button class="open-ticket" data-ticket="${t.ticket_id}">Assess</button></td></tr>`).join('');el('table-empty').classList.toggle('hidden',rows.length>0);$all('.open-ticket').forEach(x=>x.addEventListener('click',()=>loadTicket(DATA.tickets.find(t=>t.ticket_id===x.dataset.ticket))))}
function renderInsights(){const m=DATA.metrics,closed=DATA.tickets.filter(t=>t.status==='Closed').length;const cards=[['Open backlog',m.open,'48 at data pull'],['Escalated tickets',`${pct(m.escalated,m.total)}%`,'486 of 1,444'],['Returned to L1',`${pct(m.returned,m.escalated)}%`,'information or configuration'],['Target-category open',`${m.targetOpen}/${m.open}`,'62.5% of open backlog']];el('metric-grid').innerHTML=cards.map(([l,v,s])=>`<div class="card metric-card"><span>${l}</span><strong>${v}</strong><small>${s}</small></div>`).join('');const funnel=[['All tickets',m.total],['Escalated',m.escalated],['2+ handoffs',m.multiHandoff],['Open now',m.open]];el('funnel').innerHTML=funnel.map(([l,v])=>`<div class="funnel-row"><span>${l}</span><div class="bar-track"><div class="bar-fill" style="width:${v/m.total*100}%"></div></div><strong>${v}</strong></div>`).join('')}

function validateBefore(next){if(next==='diagnosis'&&(!el('expected-actual').value.trim()||!el('entity-id').value.trim())){toast('Add expected vs actual behaviour and an affected ID first');return false}if(next==='packet'){if(!state.route){toast('Choose a route before creating the packet');return false}const r=readiness();if(state.route==='engineering'&&r.score<80&&!el('override-reason').value.trim()){el('override-wrap').classList.remove('hidden');toast('Explain the early escalation override');return false}}return true}

populateSelectors();renderQueue();renderInsights();renderClosure();
$all('.nav-item').forEach(x=>x.addEventListener('click',()=>showView(x.dataset.view)));
$all('.step').forEach(x=>x.addEventListener('click',()=>state.ticket&&showStep(x.dataset.step)));
$all('.next-step').forEach(x=>x.addEventListener('click',()=>{if(validateBefore(x.dataset.next))showStep(x.dataset.next)}));
$all('.back-step').forEach(x=>x.addEventListener('click',()=>showStep(x.dataset.back)));
fieldIds.forEach(id=>el(id)?.addEventListener('input',()=>{if(id==='category'){state.checks={};renderChecklist()}el('save-state').textContent='Saving…';updateReadiness();clearTimeout(persist.timer);persist.timer=setTimeout(persist,250)}));
document.querySelectorAll('input[name="route"]').forEach(x=>x.addEventListener('change',()=>{state.route=x.value;renderRecommendation();renderPacket();persist()}));
el('mark-all').addEventListener('click',()=>{checksForCategory().forEach(c=>state.checks[c.id]=true);renderChecklist();updateReadiness();persist();toast('Checks marked complete')});
el('copy-packet').addEventListener('click',async()=>{await navigator.clipboard.writeText(packetText());toast('Action packet copied')});
el('submit-action').addEventListener('click',()=>{const r=readiness();logEvent(state.route==='engineering'?'Escalation packet recorded':'L1 action recorded',`${r.score}% readiness · ${state.route}`);showStep('closure');toast('Action recorded with workflow timestamp')});
el('verify-close').addEventListener('click',()=>{const complete=closureChecks.every(c=>state.closure[c.id]);if(!complete||!el('resolution-summary').value.trim()||!el('client-confirmation').value){toast('Complete every verification item first');return}el('closure-status').textContent='Resolution verified — ready for human closure';el('closure-status').style.color='var(--green)';logEvent('Resolution verified',el('client-confirmation').value);toast('Verified. Ticket is ready for human closure.')});
el('clear-trail').addEventListener('click',()=>{state.timeline=[];renderTimeline();persist()});
el('open-queue').addEventListener('click',()=>showView('queue'));
el('queue-search').addEventListener('input',renderQueue);el('queue-category').addEventListener('change',renderQueue);el('queue-status').addEventListener('change',renderQueue);
el('global-search').addEventListener('input',e=>{el('queue-search').value=e.target.value;if(e.target.value){renderQueue();showView('queue')}});
el('new-assessment').addEventListener('click',()=>showView('queue'));
el('reset-demo').addEventListener('click',()=>{Object.keys(localStorage).filter(k=>k.startsWith('rideops-assessment-')).forEach(k=>localStorage.removeItem(k));location.reload()});

const initial=DATA.tickets.find(t=>t.status.startsWith('Open')&&targetCategories.includes(t.category))||DATA.tickets[0];
loadTicket(initial);
