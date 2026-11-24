import { WorkspaceShell } from "./components/layout/workspace-shell";
import { InvestigationView } from "./features/investigation/investigation-view";
import {
  KnowledgeBaseView,
  KnownIssueModal,
} from "./features/knowledge/knowledge-base-view";
import { OperationsDashboardView } from "./features/operations/operations-dashboard-view";
import { TicketQueueView } from "./features/tickets/ticket-queue-view";
import { useRideOpsWorkspace } from "./hooks/use-rideops-workspace";

export default function App() {
  const workspace = useRideOpsWorkspace();
  return (
    <WorkspaceShell
      view={workspace.view}
      onViewChange={workspace.setView}
      role={workspace.role}
      onRoleChange={workspace.setRole}
    >
      {workspace.view === "investigation" && (
        <InvestigationView
          ticket={workspace.ticket}
          checks={workspace.diagnosticChecks}
          completedChecks={workspace.completedChecks}
          setCompletedChecks={workspace.setCompletedChecks}
          context={workspace.context}
          setContext={workspace.setContext}
          evidence={workspace.evidence}
          setEvidence={workspace.setEvidence}
          resolution={workspace.resolution}
          setResolution={workspace.setResolution}
          readiness={workspace.readiness}
          result={workspace.copilotResult}
          providerStatus={workspace.providerStatus}
          isAnalysing={workspace.isAnalysing}
          onAnalyse={() => void workspace.runAnalysis()}
          route={workspace.route}
          setRoute={workspace.setRoute}
          overrideReason={workspace.overrideReason}
          setOverrideReason={workspace.setOverrideReason}
          onRecordWorkflow={(status, event, detail) =>
            void workspace.recordWorkflow(status, event, detail)
          }
          onCopy={(value) => void workspace.copyToClipboard(value)}
          draftTab={workspace.draftTab}
          setDraftTab={workspace.setDraftTab}
          trail={workspace.workflowTrail}
          onChangeTicket={() => workspace.setView("queue")}
        />
      )}
      {workspace.view === "queue" && (
        <TicketQueueView
          tickets={workspace.visibleTickets}
          query={workspace.query}
          onQueryChange={workspace.setQuery}
          filter={workspace.filter}
          onFilterChange={workspace.setFilter}
          onSelect={workspace.selectTicket}
          onImport={(file) => void workspace.importTickets(file)}
          importedTicketIds={workspace.importedTicketIds}
          importedCount={workspace.importedTickets.length}
        />
      )}
      {workspace.view === "knowledge" && (
        <KnowledgeBaseView
          issues={workspace.knownIssues}
          onCreate={() => workspace.setKnownIssueModalOpen(true)}
        />
      )}
      {workspace.view === "operations" && (
        <OperationsDashboardView
          events={workspace.sessionEvents}
          importedCount={workspace.importedTickets.length}
          onReset={workspace.resetActivity}
        />
      )}
      {workspace.isKnownIssueModalOpen && (
        <KnownIssueModal
          categories={[
            ...new Set(workspace.allTickets.map((ticket) => ticket.category)),
          ].sort()}
          onClose={() => workspace.setKnownIssueModalOpen(false)}
          onSaved={workspace.saveKnownIssue}
        />
      )}
      {workspace.toast && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl bg-[#10213f] px-4 py-3 text-sm font-semibold text-white shadow-xl">
          {workspace.toast}
        </div>
      )}
    </WorkspaceShell>
  );
}
