import { Bot, History, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { FormField } from "../../components/ui/form";
import type { InvestigationViewProps } from "./types";

export function CopilotSidebar(props: InvestigationViewProps) {
  return (
    <aside className="space-y-4">
      <CopilotCard {...props} />
      {props.result && (
        <>
          <RouteCard {...props} />
          <EvidenceGaps {...props} />
          <SimilarCases {...props} />
        </>
      )}
      <WorkflowTrail {...props} />
    </aside>
  );
}

function CopilotCard({
  result,
  providerStatus,
  isAnalysing,
  onAnalyse,
}: InvestigationViewProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-[#102b5c] to-[#0a5070] text-white shadow-lg">
      <div className="p-5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-cyan-100">
            <Sparkles size={18} />
            Evidence Copilot
          </span>
          <span className="rounded-full bg-white/10 px-2 py-1 text-[10px]">
            {result?.mode ?? "Ready"}
          </span>
        </div>
        <h2 className="mt-4 text-xl font-bold">
          Find the gaps before Engineering does.
        </h2>
        <p className="mt-2 text-sm leading-6 text-blue-100">
          Extract context, retrieve similar cases, match known issues and draft
          safe actions.
        </p>
        <button
          onClick={onAnalyse}
          disabled={isAnalysing}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-blue-900 disabled:opacity-60"
        >
          {isAnalysing ? (
            <Loader2 className="animate-spin" size={17} />
          ) : (
            <Bot size={17} />
          )}
          Analyse this ticket
        </button>
      </div>
      {providerStatus && (
        <div className="border-t border-white/10 bg-black/10 px-5 py-3 text-xs leading-5 text-blue-100">
          {providerStatus}
        </div>
      )}
    </section>
  );
}

function RouteCard(props: InvestigationViewProps) {
  const result = props.result!;
  return (
    <section className="panel p-4">
      <div className="section-head">
        <h3>Recommended route</h3>
        <span className="badge badge-blue">
          {result.recommendation.confidence}% confidence
        </span>
      </div>
      <div className="mt-3 rounded-xl bg-blue-50 p-4">
        <strong className="capitalize text-blue-900">
          {result.recommendation.route.replace("_", " ")}
        </strong>
        <p className="mt-1 text-sm leading-5 text-blue-800">
          {result.recommendation.explanation}
        </p>
      </div>
      <div className="mt-3 space-y-2">
        {["continue_l1", "engineering", "known_issue"].map((option) => (
          <label
            key={option}
            className={`route-choice ${props.route === option ? "route-selected" : ""}`}
          >
            <input
              type="radio"
              checked={props.route === option}
              onChange={() => props.setRoute(option)}
            />
            <span className="capitalize">{option.replace("_", " ")}</span>
          </label>
        ))}
      </div>
      {props.route === "engineering" && props.readiness < 80 && (
        <div className="mt-3">
          <FormField label="Required override reason">
            <textarea
              value={props.overrideReason}
              onChange={(event) => props.setOverrideReason(event.target.value)}
              rows={2}
            />
          </FormField>
        </div>
      )}
      <button
        onClick={() =>
          props.onRecordWorkflow(
            props.route === "engineering"
              ? "submitted_to_engineering"
              : "action_recorded",
            props.route === "engineering"
              ? "submitted_to_engineering"
              : "route_recorded",
            `Human approved route: ${props.route}`,
          )
        }
        className="btn-primary mt-3 w-full"
      >
        <ShieldCheck size={16} />
        Approve and record route
      </button>
    </section>
  );
}

function EvidenceGaps({ result }: InvestigationViewProps) {
  const required = result!.missingEvidence.filter(
    (gap) => gap.severity === "required",
  ).length;
  return (
    <section className="panel p-4">
      <div className="section-head">
        <h3>Evidence gaps</h3>
        <span className={`badge ${required ? "badge-amber" : "badge-green"}`}>
          {required} required
        </span>
      </div>
      <div className="mt-3 max-h-[260px] space-y-2 overflow-auto">
        {result!.missingEvidence.length ? (
          result!.missingEvidence.map((gap, index) => (
            <div
              key={`${gap.field}-${index}`}
              className="rounded-lg border border-slate-200 p-3"
            >
              <strong className="text-xs">{gap.field}</strong>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {gap.reason}
              </p>
            </div>
          ))
        ) : (
          <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
            No required evidence gaps remain.
          </p>
        )}
      </div>
    </section>
  );
}

function SimilarCases({ result }: InvestigationViewProps) {
  return (
    <section className="panel p-4">
      <div className="section-head">
        <h3>Similar resolved cases</h3>
        <span className="badge badge-slate">Historical</span>
      </div>
      <div className="mt-3 space-y-2">
        {result!.similarCases.slice(0, 3).map((item) => (
          <div key={item.id} className="rounded-lg border border-slate-200 p-3">
            <div className="flex justify-between">
              <strong className="text-xs text-blue-700">{item.id}</strong>
              <span className="text-[10px] text-slate-400">
                {item.similarity}% match
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              {item.description}
            </p>
            <p className="mt-1 text-[11px] font-semibold text-slate-500">
              Outcome: {item.outcome || "L1 resolved"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function WorkflowTrail({ trail }: InvestigationViewProps) {
  return (
    <section className="panel p-4">
      <div className="section-head">
        <h3>Workflow trail</h3>
        <History size={16} />
      </div>
      <div className="mt-3 space-y-3">
        {trail.length ? (
          trail.map((item, index) => (
            <div key={`${item.at}-${index}`} className="timeline-item">
              <span />
              <div>
                <p className="text-xs font-semibold">{item.label}</p>
                <p className="text-[10px] text-slate-400">
                  {new Date(item.at).toLocaleString()}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-400">No actions recorded.</p>
        )}
      </div>
    </section>
  );
}
