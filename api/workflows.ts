import type { Request, Response } from "express";
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

export default function workflows(req: Request, res: Response) {
  if (req.method === "GET") return res.json({ items: [] });
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });
  const parsed = payload.safeParse(req.body);
  if (!parsed.success)
    return res
      .status(400)
      .json({ error: "Invalid workflow", detail: parsed.error.flatten() });
  return res.json({ ok: true, updatedAt: new Date().toISOString() });
}
