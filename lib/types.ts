export type Ticket = {
  id: string; createdAt: string; client: string; tier: string; category: string;
  priority: string; description: string; agent: string; escalated: boolean;
  handoffs: number; outcome: string; status: string; reopens: number; csat: number | null;
};

export type SimilarCase = Pick<Ticket, "id" | "category" | "description" | "outcome" | "handoffs" | "reopens"> & { similarity: number };

export type CopilotResult = {
  mode: "gemini" | "deterministic";
  extracted: { category: string; symptom: string; affectedEntity: string; impact: string; occurrenceTime: string; reproducibility: string };
  missingEvidence: Array<{ field: string; reason: string; severity: "required" | "recommended" }>;
  nextChecks: Array<{ check: string; why: string; source: string }>;
  similarCases: SimilarCase[];
  knownIssueMatches: Array<{ id: string; title: string; reason: string }>;
  recommendation: { route: "continue_l1" | "engineering" | "known_issue"; explanation: string; confidence: number };
  escalationPacket: string;
  clientUpdate: string;
  closureReview: { ready: boolean; warnings: string[] };
};
