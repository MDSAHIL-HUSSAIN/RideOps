import { historicalTickets } from "./historical";
import type { CopilotResult, SimilarCase, Ticket } from "./types";

export const knownIssueSeeds = [
  { id:"KI-204", title:"Driver app location stream stalls after network transition", category:"Live tracking / GPS incorrect", status:"monitoring", engineeringRef:"ENG-482", symptoms:"frozen map last ping device online network switch", workaround:"Restart the driver app and verify a fresh server ping. Link affected trips to ENG-482." },
  { id:"KI-219", title:"Roster sync rejects inactive employee mappings", category:"Roster / booking not syncing", status:"investigating", engineeringRef:"ENG-511", symptoms:"roster sync inactive employee route mapping validation", workaround:"Remove inactive employee mappings, republish the roster, then retry sync." },
  { id:"KI-225", title:"Report export timeout for large date ranges", category:"Report export failing", status:"identified", engineeringRef:"ENG-529", symptoms:"report export timeout large date range csv", workaround:"Export in weekly date ranges while the permanent fix is prepared." },
];

const categoryRules: Record<string, Array<{ field:string; check:string; why:string; source:string; required?:boolean }>> = {
  "Live tracking / GPS incorrect": [
    {field:"entityId",check:"Confirm the active trip, assigned vehicle and driver device",why:"Engineering needs stable identifiers to trace location events.",source:"GPS diagnostic procedure",required:true},
    {field:"deviceStatus",check:"Verify device connectivity, location permission and battery optimisation",why:"These configuration conditions can stop or distort GPS updates.",source:"GPS diagnostic procedure",required:true},
    {field:"lastPing",check:"Compare the last server ping with the reported incident time",why:"This distinguishes rendering lag from missing location events.",source:"GPS diagnostic procedure",required:true},
    {field:"comparison",check:"Compare another active trip at the same site",why:"This separates one-device failures from a wider service issue.",source:"Historical escalation review"},
    {field:"controlledRetry",check:"Restart the app and verify whether a fresh ping is received",why:"A controlled retry establishes whether the failure persists.",source:"GPS diagnostic procedure"},
  ],
  "Roster / booking not syncing": [
    {field:"entityId",check:"Capture roster batch, date, shift and one affected employee",why:"The failing object must be reproducible in Engineering.",source:"Roster diagnostic procedure",required:true},
    {field:"publishStatus",check:"Verify roster publication status and validation warnings",why:"Unpublished or rejected rosters cannot sync.",source:"Roster diagnostic procedure",required:true},
    {field:"mapping",check:"Validate employee, route and shift mappings",why:"Configuration mismatches are a frequent non-fix outcome.",source:"Historical escalation review",required:true},
    {field:"controlledRetry",check:"Correct validation errors, republish and record the retry result",why:"This proves the failure remains after known L1 remedies.",source:"Roster diagnostic procedure"},
    {field:"comparison",check:"Compare one working and one failing record",why:"The difference helps isolate data from platform behaviour.",source:"Engineering handoff standard"},
  ],
};

const genericRules = [
  {field:"entityId",check:"Record stable IDs for the affected object",why:"Identifiers make the issue traceable and reproducible.",source:"Engineering handoff standard",required:true},
  {field:"reproduction",check:"Record exact reproduction steps and observed result",why:"Engineering needs a repeatable failure path.",source:"Engineering handoff standard",required:true},
  {field:"configuration",check:"Verify relevant permissions and configuration",why:"Configuration should be excluded before escalation.",source:"L1 diagnostic standard"},
  {field:"comparison",check:"Compare with a known-working example",why:"Differences narrow the investigation.",source:"L1 diagnostic standard"},
];

const tokens=(value:string)=>new Set(value.toLowerCase().replace(/[^a-z0-9 ]/g," ").split(/\s+/).filter(x=>x.length>2));
const overlap=(a:Set<string>,b:Set<string>)=>{let hit=0;for(const x of a)if(b.has(x))hit+=1;return hit/Math.max(1,new Set([...a,...b]).size)};

export function similarCases(ticket: Partial<Ticket> & {description:string;category:string}, limit=5): SimilarCase[] {
  const query=tokens(`${ticket.category} ${ticket.description}`);
  return historicalTickets.filter(t=>t.id!==ticket.id&&t.status==="Closed").map(t=>{
    const lexical=overlap(query,tokens(`${t.category} ${t.description}`));
    const category=t.category===ticket.category?.trim()?0.45:0;
    const useful=t.outcome?0.05:0;
    return {...t,similarity:Math.min(0.99,lexical+category+useful)};
  }).sort((a,b)=>b.similarity-a.similarity).slice(0,limit).map(t=>({id:t.id,category:t.category,description:t.description,outcome:t.outcome,handoffs:t.handoffs,reopens:t.reopens,similarity:Math.round(t.similarity*100)}));
}

export function matchKnownIssues(description:string, category:string, issues=knownIssueSeeds) {
  const query=tokens(description); return issues.map(issue=>{
    const score=overlap(query,tokens(`${issue.title} ${issue.symptoms}`))+(issue.category===category?0.25:0);
    return {...issue,score};
  }).filter(x=>x.score>=0.3).sort((a,b)=>b.score-a.score).slice(0,3).map(x=>({id:x.id,title:x.title,reason:`Category and symptom overlap (${Math.round(x.score*100)}% evidence match)`}));
}

export type CopilotInput = {
  ticket: Partial<Ticket> & { id:string; description:string; category:string; priority:string; client?:string };
  context: Record<string,string>;
  completedChecks: string[];
  evidence: Record<string,string>;
  resolution?: string;
};

export function deterministicAnalysis(input:CopilotInput): CopilotResult {
  const {ticket,context,evidence}=input; const rules=categoryRules[ticket.category]??genericRules;
  const missing:CopilotResult["missingEvidence"]=[];
  const requiredContext=[
    ["expectedActual","Expected versus actual behaviour","Without this, the unresolved product behaviour is ambiguous."],
    ["entityId","Affected trip, employee, vehicle, roster or shift ID","Stable IDs are required to trace the incident."],
    ["impact","Business impact","Priority and client communication require a stated impact."],
    ["reproducibility","Reproducibility","Engineering needs to know whether the failure is repeatable."],
    ["occurrenceTime","Occurrence time","Logs cannot be correlated without a time window."],
  ];
  requiredContext.forEach(([field,label,reason])=>{if(!context[field]?.trim())missing.push({field:label,reason,severity:"required"})});
  if(!evidence.logs?.trim())missing.push({field:"Relevant IDs or logs",reason:"No technical evidence is attached to the handoff.",severity:"required"});
  rules.filter(r=>r.required&&!input.completedChecks.includes(r.check)).forEach(r=>missing.push({field:r.check,reason:r.why,severity:"required"}));
  rules.filter(r=>!r.required&&!input.completedChecks.includes(r.check)).forEach(r=>missing.push({field:r.check,reason:r.why,severity:"recommended"}));
  const similar=similarCases(ticket); const known=matchKnownIssues(ticket.description,ticket.category);
  const required=missing.filter(x=>x.severity==="required").length;
  const route=known.length&&required===0?"known_issue":required===0?"engineering":"continue_l1";
  const confidence=Math.max(45,Math.min(92,88-required*9+(known.length?4:0)));
  const checks=input.completedChecks.length?input.completedChecks.map(x=>`- ${x}`).join("\n"):"- No completed diagnostic checks recorded";
  const packet=`RIDEOPS INVESTIGATION PACKET\n${ticket.id} · ${ticket.priority} · ${ticket.category}\n\nCLIENT\n${ticket.client??"Not supplied"}\n\nREPORTED ISSUE\n${ticket.description}\n\nEXPECTED VS ACTUAL\n${context.expectedActual||"Missing"}\n\nSCOPE\nAffected ID: ${context.entityId||"Missing"}\nImpact: ${context.impact||"Missing"}\nFirst observed: ${context.occurrenceTime||"Missing"}\nReproducibility: ${context.reproducibility||"Missing"}\n\nCHECKS COMPLETED\n${checks}\n\nEVIDENCE\n${evidence.logs||"No logs supplied"}\n${evidence.notes||""}\n\nRECOMMENDED ROUTE\n${route.replace("_"," ").toUpperCase()} — human approval required.`;
  const clientUpdate=`We are investigating ${ticket.id} regarding ${ticket.description.toLowerCase()}. The support team has ${input.completedChecks.length?`completed ${input.completedChecks.length} diagnostic checks`:`started the required diagnostic checks`}. ${route==="engineering"?"The evidence is ready for Engineering review; no resolution time has been promised.":route==="known_issue"?"The symptoms match an existing Engineering investigation and will be linked after agent confirmation.":"We are completing the remaining evidence checks before deciding the next owner."}`;
  const closureWarnings=[] as string[];
  if(!input.resolution?.trim())closureWarnings.push("Resolution summary is missing.");
  if(!context.clientConfirmation?.trim())closureWarnings.push("Client verification status is not recorded.");
  if(input.resolution&&context.expectedActual&&!tokens(input.resolution).size)closureWarnings.push("Resolution does not contain verifiable detail.");
  return {
    mode:"deterministic",
    extracted:{category:ticket.category,symptom:ticket.description,affectedEntity:context.entityId||"Not identified",impact:context.impact||"Not stated",occurrenceTime:context.occurrenceTime||"Not stated",reproducibility:context.reproducibility||"Not stated"},
    missingEvidence:missing,nextChecks:rules.filter(r=>!input.completedChecks.includes(r.check)).map(r=>({check:r.check,why:r.why,source:r.source})),similarCases:similar,knownIssueMatches:known,
    recommendation:{route,explanation:route==="engineering"?"All required evidence is present; escalate only if the issue still reproduces.":route==="known_issue"?"The evidence is complete and a matching known issue exists; link it instead of creating duplicate work.":`${required} required evidence item${required===1?" remains":"s remain"}; continue L1 diagnosis.`,confidence},
    escalationPacket:packet,clientUpdate,closureReview:{ready:closureWarnings.length===0,warnings:closureWarnings}
  };
}
