import type { Ticket } from "../../shared/support/support-types";

export type WorkspaceView =
  "investigation" | "queue" | "knowledge" | "operations";
export type UserRole = "L1 Agent" | "Support Lead" | "Head of Operations";
export type DraftTab = "packet" | "client" | "closure";

export type KnownIssue = {
  id: string;
  title: string;
  category: string;
  status: string;
  engineeringRef?: string;
  engineering_ref?: string;
  symptoms: string;
  workaround: string;
};

export type InvestigationContext = {
  expectedActual: string;
  entityId: string;
  impact: string;
  reproducibility: string;
  occurrenceTime: string;
  clientConfirmation: string;
};

export type InvestigationEvidence = {
  logs: string;
  notes: string;
  link: string;
};
export type WorkflowTrailItem = { label: string; at: string };

export type SessionEvent = {
  id: string;
  type:
    | "analysis"
    | "blocked_escalation"
    | "route_recorded"
    | "known_issue"
    | "ready_handoff"
    | "closure_ready"
    | "ticket_import";
  ticketId: string;
  label: string;
  at: string;
  value?: number;
};

export const preferredInvestigationCategories = [
  "Live tracking / GPS incorrect",
  "Roster / booking not syncing",
];

export const diagnosticPlans: Record<string, string[]> = {
  "Live tracking / GPS incorrect": [
    "Confirm the active trip, assigned vehicle and driver device",
    "Verify device connectivity, location permission and battery optimisation",
    "Compare the last server ping with the reported incident time",
    "Compare another active trip at the same site",
    "Restart the app and verify whether a fresh ping is received",
  ],
  "Roster / booking not syncing": [
    "Capture roster batch, date, shift and one affected employee",
    "Verify roster publication status and validation warnings",
    "Validate employee, route and shift mappings",
    "Correct validation errors, republish and record the retry result",
    "Compare one working and one failing record",
  ],
};

export const genericDiagnosticPlan = [
  "Record stable IDs for the affected object",
  "Record exact reproduction steps and observed result",
  "Verify relevant permissions and configuration",
  "Compare with a known-working example",
];

export function isOpenTicket(ticket: Ticket) {
  return ticket.status.startsWith("Open");
}

export function createEmptyContext(ticket: Ticket): InvestigationContext {
  return {
    expectedActual: "",
    entityId: "",
    impact: "",
    reproducibility: "",
    occurrenceTime: ticket.createdAt.replace(" ", "T"),
    clientConfirmation: "",
  };
}
