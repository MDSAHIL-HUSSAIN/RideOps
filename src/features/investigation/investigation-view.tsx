import { SummaryItem } from "../../components/ui/form";
import { CopilotSidebar } from "./copilot-sidebar";
import { InvestigationDrafts } from "./investigation-drafts";
import {
  DiagnosticChecklistCard,
  InvestigationContextCard,
} from "./investigation-forms";
import type { InvestigationViewProps } from "./types";

export function InvestigationView(props: InvestigationViewProps) {
  return (
    <section className="p-6">
      <div className="mb-5 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm max-md:block">
        <div className="flex items-center gap-6 max-md:flex-wrap">
          <SummaryItem label="Working ticket" value={props.ticket.id} />
          <SummaryItem label="Client" value={props.ticket.client} />
          <SummaryItem label="Category" value={props.ticket.category} />
          <span
            className={`badge ${props.ticket.priority === "P1" ? "badge-red" : "badge-blue"}`}
          >
            {props.ticket.priority}
          </span>
        </div>
        <div className="flex items-center gap-3 max-md:mt-3">
          <SummaryItem
            label="Readiness"
            value={`${props.readiness}%`}
            tone={props.readiness >= 80 ? "green" : "amber"}
          />
          <button className="btn-secondary" onClick={props.onChangeTicket}>
            Change ticket
          </button>
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_360px] gap-5 max-2xl:grid-cols-[minmax(0,1fr)_320px] max-lg:grid-cols-1">
        <div className="space-y-5">
          <InvestigationContextCard {...props} />
          <DiagnosticChecklistCard {...props} />
          <InvestigationDrafts {...props} />
        </div>
        <CopilotSidebar {...props} />
      </div>
    </section>
  );
}
