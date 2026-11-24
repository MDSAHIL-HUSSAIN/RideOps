import type { Dispatch, SetStateAction } from "react";
import type {
  CopilotResult,
  Ticket,
} from "../../../shared/support/support-types";
import type {
  DraftTab,
  InvestigationContext,
  InvestigationEvidence,
  WorkflowTrailItem,
} from "../../domain/workspace";

export type InvestigationViewProps = {
  ticket: Ticket;
  checks: string[];
  completedChecks: string[];
  setCompletedChecks: Dispatch<SetStateAction<string[]>>;
  context: InvestigationContext;
  setContext: Dispatch<SetStateAction<InvestigationContext>>;
  evidence: InvestigationEvidence;
  setEvidence: Dispatch<SetStateAction<InvestigationEvidence>>;
  resolution: string;
  setResolution: (value: string) => void;
  readiness: number;
  result: CopilotResult | null;
  providerStatus: string;
  isAnalysing: boolean;
  onAnalyse: () => void;
  route: string;
  setRoute: (value: string) => void;
  overrideReason: string;
  setOverrideReason: (value: string) => void;
  onRecordWorkflow: (status: string, event: string, detail: string) => void;
  onCopy: (value: string) => void;
  draftTab: DraftTab;
  setDraftTab: (tab: DraftTab) => void;
  trail: WorkflowTrailItem[];
  onChangeTicket: () => void;
};
