import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../db";
import { knownIssues } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { knownIssueSeeds } from "../../../lib/support-engine";

const issueSchema=z.object({title:z.string().min(4),category:z.string(),status:z.string(),engineeringRef:z.string(),symptoms:z.string().min(3),workaround:z.string()});
export async function GET(){const user=await getChatGPTUser();if(!user)return NextResponse.json({error:"Sign-in required"},{status:401});const saved=await getDb().select().from(knownIssues).orderBy(desc(knownIssues.updatedAt)).limit(100);return NextResponse.json({items:[...saved,...knownIssueSeeds.filter(seed=>!saved.some(x=>x.id===seed.id))]});}
export async function POST(request:Request){const user=await getChatGPTUser();if(!user)return NextResponse.json({error:"Sign-in required"},{status:401});const parsed=issueSchema.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:"Invalid known issue"},{status:400});const now=new Date().toISOString(),id=`KI-${Math.floor(300+Math.random()*699)}`;await getDb().insert(knownIssues).values({id,...parsed.data,createdBy:user.userId,createdAt:now,updatedAt:now});return NextResponse.json({ok:true,id});}
