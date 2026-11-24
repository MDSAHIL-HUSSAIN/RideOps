import type { Request, Response } from "express";
import { z } from "zod";
import { knownIssueSeeds } from "../shared/support/support-analysis-engine";

const issueSchema = z.object({
  title: z.string().min(4),
  category: z.string(),
  status: z.string(),
  engineeringRef: z.string(),
  symptoms: z.string().min(3),
  workaround: z.string(),
});

export default function knownIssues(req: Request, res: Response) {
  if (req.method === "GET") return res.json({ items: knownIssueSeeds });
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });
  const parsed = issueSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Invalid known issue" });
  const item = {
    id: `KI-${Math.floor(300 + Math.random() * 699)}`,
    ...parsed.data,
  };
  return res.json({ ok: true, item });
}
