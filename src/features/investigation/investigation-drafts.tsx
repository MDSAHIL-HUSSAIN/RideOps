import { AlertTriangle, Copy, FileCheck2 } from "lucide-react";
import { FormField, SectionHeader } from "../../components/ui/form";
import type { InvestigationViewProps } from "./types";

export function InvestigationDrafts(props: InvestigationViewProps) {
  return (
    <section className="panel overflow-hidden">
      <div className="flex border-b border-slate-200 bg-slate-50 px-5">
        {(["packet", "client", "closure"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => props.setDraftTab(tab)}
            className={`tab ${props.draftTab === tab ? "tab-active" : ""}`}
          >
            {tab === "packet"
              ? "Engineering packet"
              : tab === "client"
                ? "Client update"
                : "Closure review"}
          </button>
        ))}
      </div>
      <div className="p-5">
        {props.draftTab === "packet" && (
          <TextDraft
            title="Structured investigation packet"
            text={
              props.result?.escalationPacket ??
              "Run Copilot to generate a grounded Engineering packet."
            }
            onCopy={props.onCopy}
          />
        )}
        {props.draftTab === "client" && (
          <TextDraft
            title="Client-safe progress update"
            text={
              props.result?.clientUpdate ??
              "Run Copilot to draft an update without invented progress or ETAs."
            }
            onCopy={props.onCopy}
          />
        )}
        {props.draftTab === "closure" && (
          <div>
            <SectionHeader
              eyebrow="Human closure gate"
              title="Verify the original complaint is actually resolved"
              badge={
                props.result?.closureReview.ready
                  ? "Ready for review"
                  : "Not ready"
              }
            />
            <FormField label="Resolution summary">
              <textarea
                rows={4}
                value={props.resolution}
                onChange={(event) => props.setResolution(event.target.value)}
                placeholder="What changed, why it resolves the symptom, and how it was verified"
              />
            </FormField>
            <div className="mt-4">
              <FormField label="Client verification">
                <select
                  value={props.context.clientConfirmation}
                  onChange={(event) =>
                    props.setContext({
                      ...props.context,
                      clientConfirmation: event.target.value,
                    })
                  }
                >
                  <option value="">Select status</option>
                  <option>Confirmed resolved</option>
                  <option>Awaiting client verification</option>
                  <option>Client unavailable</option>
                </select>
              </FormField>
            </div>
            <div className="mt-4 space-y-2">
              {(
                props.result?.closureReview.warnings ?? [
                  "Run Copilot after entering the proposed resolution.",
                ]
              ).map((warning) => (
                <div
                  key={warning}
                  className="flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
                >
                  <AlertTriangle size={17} />
                  {warning}
                </div>
              ))}
            </div>
            <button
              onClick={() =>
                props.onRecordWorkflow(
                  "verified",
                  "resolution_verified",
                  "Resolution verified; ready for human closure",
                )
              }
              className="btn-primary mt-4"
              disabled={!props.result?.closureReview.ready}
            >
              <FileCheck2 size={16} />
              Mark ready for human closure
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function TextDraft({
  title,
  text,
  onCopy,
}: {
  title: string;
  text: string;
  onCopy: (value: string) => void;
}) {
  return (
    <div>
      <div className="section-head">
        <div>
          <p className="eyebrow">AI-assisted, human-approved</p>
          <h2>{title}</h2>
        </div>
        <button className="btn-secondary" onClick={() => onCopy(text)}>
          <Copy size={15} />
          Copy
        </button>
      </div>
      <pre className="mt-4 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-950 p-5 text-xs leading-6 text-slate-100">
        {text}
      </pre>
    </div>
  );
}
