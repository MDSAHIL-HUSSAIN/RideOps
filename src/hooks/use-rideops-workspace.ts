import { useEffect, useMemo, useState } from "react";
import { historicalTickets } from "../../shared/support/historical-ticket-data";
import type { CopilotResult, Ticket } from "../../shared/support/support-types";
import {
  analyseTicket,
  fetchKnownIssues,
  saveWorkflow,
} from "../services/rideops-api";
import {
  createEmptyContext,
  diagnosticPlans,
  genericDiagnosticPlan,
  isOpenTicket,
  preferredInvestigationCategories,
  type DraftTab,
  type InvestigationEvidence,
  type KnownIssue,
  type SessionEvent,
  type UserRole,
  type WorkflowTrailItem,
  type WorkspaceView,
} from "../domain/workspace";
import { parseTicketCsv } from "../utils/ticket-csv";

const initialTicket =
  historicalTickets.find(
    (ticket) =>
      isOpenTicket(ticket) &&
      preferredInvestigationCategories.includes(ticket.category),
  ) ?? historicalTickets[0];
const emptyEvidence: InvestigationEvidence = { logs: "", notes: "", link: "" };

export function useRideOpsWorkspace() {
  const [view, setView] = useState<WorkspaceView>("investigation");
  const [role, setRole] = useState<UserRole>("L1 Agent");
  const [ticket, setTicket] = useState(initialTicket);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Open");
  const [completedChecks, setCompletedChecks] = useState<string[]>([]);
  const [context, setContext] = useState(createEmptyContext(initialTicket));
  const [evidence, setEvidence] = useState(emptyEvidence);
  const [resolution, setResolution] = useState("");
  const [copilotResult, setCopilotResult] = useState<CopilotResult | null>(
    null,
  );
  const [providerStatus, setProviderStatus] = useState("");
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [route, setRoute] = useState("unassigned");
  const [overrideReason, setOverrideReason] = useState("");
  const [toast, setToast] = useState("");
  const [draftTab, setDraftTab] = useState<DraftTab>("packet");
  const [knownIssues, setKnownIssues] = useState<KnownIssue[]>([]);
  const [isKnownIssueModalOpen, setKnownIssueModalOpen] = useState(false);
  const [workflowTrail, setWorkflowTrail] = useState<WorkflowTrailItem[]>([]);
  const [importedTickets, setImportedTickets] = useState<Ticket[]>([]);
  const [sessionEvents, setSessionEvents] = useState<SessionEvent[]>([]);
  const [sessionReady, setSessionReady] = useState(false);

  const diagnosticChecks =
    diagnosticPlans[ticket.category] ?? genericDiagnosticPlan;
  const requiredEvidence = [
    context.expectedActual,
    context.entityId,
    context.impact,
    context.reproducibility,
    context.occurrenceTime,
    evidence.logs,
  ];
  const readiness = Math.round(
    ((requiredEvidence.filter(Boolean).length / requiredEvidence.length) *
      0.55 +
      (completedChecks.length / diagnosticChecks.length) * 0.45) *
      100,
  );

  const allTickets = useMemo(() => {
    const importedIds = new Set(importedTickets.map((item) => item.id));
    return [
      ...importedTickets,
      ...historicalTickets.filter((item) => !importedIds.has(item.id)),
    ];
  }, [importedTickets]);

  const importedTicketIds = useMemo(
    () => new Set(importedTickets.map((item) => item.id)),
    [importedTickets],
  );
  const visibleTickets = useMemo(
    () =>
      allTickets
        .filter(
          (item) =>
            filter === "All" ||
            (filter === "Open" ? isOpenTicket(item) : !isOpenTicket(item)),
        )
        .filter(
          (item) =>
            !query ||
            `${item.id} ${item.client} ${item.description} ${item.category}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        )
        .sort((a, b) =>
          isOpenTicket(a) === isOpenTicket(b)
            ? b.createdAt.localeCompare(a.createdAt)
            : isOpenTicket(a)
              ? -1
              : 1,
        )
        .slice(0, 120),
    [allTickets, filter, query],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchKnownIssues()
        .then(({ items: seeded }) => {
          let custom: KnownIssue[] = [];
          try {
            custom = JSON.parse(
              localStorage.getItem("rideops-custom-known-issues") || "[]",
            );
          } catch {
            /* Ignore malformed custom issues. */
          }
          setKnownIssues([
            ...custom,
            ...seeded.filter(
              (seed) => !custom.some((item) => item.id === seed.id),
            ),
          ]);
        })
        .catch(() =>
          setProviderStatus(
            "Known-issue service is unavailable; the investigation workflow remains usable.",
          ),
        );
      try {
        const savedEvents = sessionStorage.getItem("rideops-evaluator-session");
        const savedImports = sessionStorage.getItem("rideops-imported-tickets");
        if (savedEvents) setSessionEvents(JSON.parse(savedEvents));
        if (savedImports) setImportedTickets(JSON.parse(savedImports));
      } catch {
        /* Ignore malformed evaluator browser state. */
      } finally {
        setSessionReady(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (sessionReady)
      sessionStorage.setItem(
        "rideops-evaluator-session",
        JSON.stringify(sessionEvents),
      );
  }, [sessionEvents, sessionReady]);
  useEffect(() => {
    if (sessionReady)
      sessionStorage.setItem(
        "rideops-imported-tickets",
        JSON.stringify(importedTickets),
      );
  }, [importedTickets, sessionReady]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }
  function recordEvent(
    type: SessionEvent["type"],
    ticketId: string,
    label: string,
    value?: number,
  ) {
    setSessionEvents((current) => [
      {
        id: crypto.randomUUID(),
        type,
        ticketId,
        label,
        at: new Date().toISOString(),
        value,
      },
      ...current,
    ]);
  }

  function selectTicket(nextTicket: Ticket) {
    setTicket(nextTicket);
    setView("investigation");
    setCompletedChecks([]);
    setCopilotResult(null);
    setRoute("unassigned");
    setOverrideReason("");
    setResolution("");
    setContext(createEmptyContext(nextTicket));
    setEvidence(emptyEvidence);
    setWorkflowTrail([
      { label: "Assessment opened", at: new Date().toISOString() },
    ]);
  }

  async function runAnalysis() {
    setIsAnalysing(true);
    try {
      const result = await analyseTicket({
        ticket,
        context,
        completedChecks,
        evidence,
        resolution,
      });
      setCopilotResult(result);
      setProviderStatus(result.providerStatus || "");
      setRoute(result.recommendation.route);
      setWorkflowTrail((current) => [
        {
          label: `Evidence analysed (${result.mode})`,
          at: new Date().toISOString(),
        },
        ...current,
      ]);
      recordEvent(
        "analysis",
        ticket.id,
        `Analysed ${ticket.id} at ${readiness}% readiness`,
      );
      notify("Evidence analysis complete");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Copilot failed");
    } finally {
      setIsAnalysing(false);
    }
  }

  async function recordWorkflow(status: string, event: string, detail: string) {
    if (route === "engineering" && readiness < 80 && !overrideReason.trim()) {
      recordEvent(
        "blocked_escalation",
        ticket.id,
        `Stopped premature Engineering escalation for ${ticket.id}`,
      );
      notify("Add an override reason before early escalation");
      return;
    }
    try {
      await saveWorkflow({
        ticket,
        role,
        status,
        route,
        readiness,
        context,
        checks: completedChecks,
        evidence: { ...evidence, overrideReason },
        aiMode: copilotResult?.mode ?? "not_run",
        event,
        detail,
      });
      setWorkflowTrail((current) => [
        { label: detail, at: new Date().toISOString() },
        ...current,
      ]);
      const type: SessionEvent["type"] =
        event === "resolution_verified"
          ? "closure_ready"
          : route === "known_issue"
            ? "known_issue"
            : route === "engineering" && readiness >= 80
              ? "ready_handoff"
              : "route_recorded";
      const label =
        event === "resolution_verified"
          ? `${ticket.id} passed the human closure gate`
          : route === "known_issue"
            ? `${ticket.id} linked to a verified known issue`
            : route === "engineering"
              ? `${ticket.id} sent with an investigation-ready packet`
              : `Recorded ${route.replace("_", " ")} route for ${ticket.id}`;
      recordEvent(type, ticket.id, label);
      notify("Action saved with a workflow timestamp");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Save failed");
    }
  }

  async function importTickets(file: File) {
    try {
      const parsed = parseTicketCsv(await file.text());
      if (!parsed.length)
        throw new Error(
          "No valid ticket rows found. Use the RideOps CSV columns or download the template.",
        );
      setImportedTickets((current) => {
        const merged = new Map(current.map((item) => [item.id, item]));
        parsed.forEach((item) => merged.set(item.id, item));
        return [...merged.values()];
      });
      recordEvent(
        "ticket_import",
        "CSV",
        `Imported ${parsed.length} fresh ticket${parsed.length === 1 ? "" : "s"}`,
        parsed.length,
      );
      setQuery("");
      setFilter("Open");
      notify(
        `${parsed.length} ticket${parsed.length === 1 ? "" : "s"} imported into the queue`,
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : "CSV import failed");
    }
  }

  function saveKnownIssue(item: KnownIssue) {
    setKnownIssueModalOpen(false);
    setKnownIssues((current) => [
      item,
      ...current.filter((entry) => entry.id !== item.id),
    ]);
    let custom: KnownIssue[] = [];
    try {
      custom = JSON.parse(
        localStorage.getItem("rideops-custom-known-issues") || "[]",
      );
    } catch {
      /* Ignore malformed custom issues. */
    }
    localStorage.setItem(
      "rideops-custom-known-issues",
      JSON.stringify([item, ...custom.filter((entry) => entry.id !== item.id)]),
    );
    notify("Known issue created");
  }

  async function copyToClipboard(value: string) {
    await navigator.clipboard.writeText(value);
    notify("Copied to clipboard");
  }
  function resetActivity() {
    setSessionEvents([]);
    notify("Evaluator session dashboard reset");
  }

  return {
    view,
    setView,
    role,
    setRole,
    ticket,
    query,
    setQuery,
    filter,
    setFilter,
    completedChecks,
    setCompletedChecks,
    context,
    setContext,
    evidence,
    setEvidence,
    resolution,
    setResolution,
    copilotResult,
    providerStatus,
    isAnalysing,
    route,
    setRoute,
    overrideReason,
    setOverrideReason,
    toast,
    draftTab,
    setDraftTab,
    knownIssues,
    isKnownIssueModalOpen,
    setKnownIssueModalOpen,
    workflowTrail,
    sessionEvents,
    importedTickets,
    importedTicketIds,
    visibleTickets,
    allTickets,
    diagnosticChecks,
    readiness,
    selectTicket,
    runAnalysis,
    recordWorkflow,
    importTickets,
    saveKnownIssue,
    copyToClipboard,
    resetActivity,
  };
}
