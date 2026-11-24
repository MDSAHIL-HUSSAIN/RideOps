import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { z } from "zod";
import { getChatGPTUser } from "../../chatgpt-auth";
import { deterministicAnalysis } from "../../../lib/support-engine";

const inputSchema=z.object({
  ticket:z.object({id:z.string(),description:z.string().min(3),category:z.string(),priority:z.string(),client:z.string().optional()}),
  context:z.record(z.string(),z.string()),completedChecks:z.array(z.string()),evidence:z.record(z.string(),z.string()),resolution:z.string().optional()
});

const enhancementSchema=z.object({
  extracted:z.record(z.string(),z.string()).optional(),
  additionalGaps:z.array(z.object({field:z.string(),reason:z.string(),severity:z.enum(["required","recommended"])})).optional(),
  improvedPacket:z.string().min(20).optional(),
  improvedClientUpdate:z.string().min(20).optional(),
});

function outputText(payload:unknown){
  const data=payload as {candidates?:Array<{content?:{parts?:Array<{text?:string}>}}>};
  return data.candidates?.[0]?.content?.parts?.map(part=>part.text??"").join("").trim()??"";
}

export async function POST(request:Request){
  const user=await getChatGPTUser(); if(!user)return NextResponse.json({error:"Sign-in required"},{status:401});
  const parsed=inputSchema.safeParse(await request.json()); if(!parsed.success)return NextResponse.json({error:"Invalid copilot request",detail:parsed.error.flatten()},{status:400});
  const fallback=deterministicAnalysis(parsed.data);
  const apiKey=(env as unknown as {GEMINI_API_KEY?:string}).GEMINI_API_KEY;
  if(!apiKey)return NextResponse.json({...fallback,providerStatus:"Model credential not configured; deterministic evidence engine used."});
  try{
    const model=(env as unknown as {GEMINI_MODEL?:string}).GEMINI_MODEL||"gemini-3.8-flash";
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),25000);
    const prompt=[
      "You are RideOps Support Copilot.",
      "Use only the supplied ticket, evidence, deterministic findings and similar cases.",
      "Never invent IDs, actions, root causes, ETAs or Engineering progress.",
      "Return JSON only with keys extracted, additionalGaps, improvedPacket, improvedClientUpdate.",
      "Keep routing human-approved. Do not contradict deterministic safety checks.",
      JSON.stringify({request:parsed.data,deterministicFindings:fallback}),
    ].join("\n\n");
    const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:"POST",signal:controller.signal,headers:{"x-goog-api-key":apiKey,"Content-Type":"application/json"},body:JSON.stringify({
      contents:[{role:"user",parts:[{text:prompt}]}],
      generationConfig:{responseMimeType:"application/json",temperature:0.15,maxOutputTokens:2400},
    })}).finally(()=>clearTimeout(timeout));
    if(!response.ok)throw new Error(`Gemini request failed: ${response.status}`);
    const raw=await response.json();
    const text=outputText(raw);
    if(!text)throw new Error("Gemini returned no usable text");
    const modelResult=enhancementSchema.parse(JSON.parse(text));
    const extraGaps=(modelResult.additionalGaps??[]).filter(g=>!fallback.missingEvidence.some(existing=>existing.field.toLowerCase()===g.field.toLowerCase()));
    return NextResponse.json({...fallback,mode:"gemini",extracted:{...fallback.extracted,...(modelResult.extracted??{})},missingEvidence:[...fallback.missingEvidence,...extraGaps],escalationPacket:modelResult.improvedPacket||fallback.escalationPacket,clientUpdate:modelResult.improvedClientUpdate||fallback.clientUpdate,providerStatus:`Enhanced by ${model}; deterministic guardrails retained.`});
  }catch(error){return NextResponse.json({...fallback,providerStatus:`Model enhancement unavailable; deterministic engine used safely. ${error instanceof Error?error.message:"Unknown error"}`});}
}
