import { z } from "zod";
import { knownIssueSeeds } from "../shared/support/support-analysis-engine.js";

const issueSchema = z.object({
  title: z.string().min(4),
  category: z.string(),
  status: z.string(),
  engineeringRef: z.string(),
  symptoms: z.string().min(3),
  workaround: z.string(),
});

async function handleKnownIssues(request: Request) {
  if (request.method === "GET")
    return Response.json({ items: knownIssueSeeds });
  if (request.method !== "POST")
    return Response.json({ error: "Method not allowed" }, { status: 405 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = issueSchema.safeParse(body);
  if (!parsed.success)
    return Response.json({ error: "Invalid known issue" }, { status: 400 });
  const item = {
    id: `KI-${Math.floor(300 + Math.random() * 699)}`,
    ...parsed.data,
  };
  return Response.json({ ok: true, item });
}

export default { fetch: handleKnownIssues };
