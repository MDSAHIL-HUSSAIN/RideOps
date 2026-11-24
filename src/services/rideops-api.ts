import type { CopilotResult, Ticket } from "../../shared/support/support-types";
import type {
  InvestigationContext,
  InvestigationEvidence,
  KnownIssue,
  UserRole,
} from "../domain/workspace";

async function readJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    await response.text();
    throw new Error(
      `RideOps service is unavailable (${response.status}). Please retry after the deployment finishes.`,
    );
  }

  const data = (await response.json()) as T & { error?: string };
  if (!response.ok)
    throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

export async function fetchKnownIssues() {
  return readJson<{ items: KnownIssue[] }>(await fetch("/api/known-issues"));
}

export async function createKnownIssue(input: Omit<KnownIssue, "id">) {
  return readJson<{ ok: true; item: KnownIssue }>(
    await fetch("/api/known-issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function analyseTicket(input: {
  ticket: Ticket;
  context: InvestigationContext;
  completedChecks: string[];
  evidence: InvestigationEvidence;
  resolution: string;
}) {
  return readJson<CopilotResult & { providerStatus?: string }>(
    await fetch("/api/copilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticket: {
          id: input.ticket.id,
          description: input.ticket.description,
          category: input.ticket.category,
          priority: input.ticket.priority,
          client: input.ticket.client,
        },
        context: input.context,
        completedChecks: input.completedChecks,
        evidence: input.evidence,
        resolution: input.resolution,
      }),
    }),
  );
}

export async function saveWorkflow(input: {
  ticket: Ticket;
  role: UserRole;
  status: string;
  route: string;
  readiness: number;
  context: InvestigationContext;
  checks: string[];
  evidence: InvestigationEvidence & { overrideReason: string };
  aiMode: string;
  event: string;
  detail: string;
}) {
  return readJson<{ ok: true; updatedAt: string }>(
    await fetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: `WF-${input.ticket.id}`,
        ticketId: input.ticket.id,
        actorRole: input.role,
        status: input.status,
        route: input.route,
        readiness: input.readiness,
        category: input.ticket.category,
        priority: input.ticket.priority,
        summary: input.ticket.description,
        context: input.context,
        checks: input.checks,
        evidence: input.evidence,
        aiMode: input.aiMode,
        event: {
          type: input.event,
          detail: input.detail,
          metadata: { route: input.route, readiness: input.readiness },
        },
      }),
    }),
  );
}
