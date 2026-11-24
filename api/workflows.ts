import { z } from "zod";

const payload = z.object({
  id: z.string(),
  ticketId: z.string(),
  actorRole: z.string(),
  status: z.string(),
  route: z.string(),
  readiness: z.number().int().min(0).max(100),
  category: z.string(),
  priority: z.string(),
  summary: z.string(),
  context: z.record(z.string(), z.unknown()),
  checks: z.array(z.string()),
  evidence: z.record(z.string(), z.unknown()),
  aiMode: z.string(),
  event: z
    .object({
      type: z.string(),
      detail: z.string(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
});

async function handleWorkflows(request: Request) {
  if (request.method === "GET") return Response.json({ items: [] });
  if (request.method !== "POST")
    return Response.json({ error: "Method not allowed" }, { status: 405 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = payload.safeParse(body);
  if (!parsed.success)
    return Response.json(
      { error: "Invalid workflow", detail: parsed.error.flatten() },
      { status: 400 },
    );
  return Response.json({ ok: true, updatedAt: new Date().toISOString() });
}

export default { fetch: handleWorkflows };
