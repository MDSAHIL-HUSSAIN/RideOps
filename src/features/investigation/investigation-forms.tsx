import type { InvestigationViewProps } from "./types";
import { FormField, SectionHeader } from "../../components/ui/form";

export function InvestigationContextCard({
  ticket,
  context,
  setContext,
}: Pick<InvestigationViewProps, "ticket" | "context" | "setContext">) {
  return (
    <section className="panel p-5">
      <SectionHeader
        eyebrow="Investigation context"
        title="Turn the report into a reproducible problem"
        badge="Human-editable"
      />
      <div className="mt-5 grid grid-cols-2 gap-4 max-md:grid-cols-1">
        <FormField label="Reported issue" wide>
          <textarea value={ticket.description} readOnly rows={2} />
        </FormField>
        <FormField label="Expected versus actual" wide>
          <textarea
            value={context.expectedActual}
            onChange={(event) =>
              setContext({ ...context, expectedActual: event.target.value })
            }
            rows={3}
            placeholder="Expected: … Actual: …"
          />
        </FormField>
        <FormField label="Affected trip / employee / shift ID">
          <input
            value={context.entityId}
            onChange={(event) =>
              setContext({ ...context, entityId: event.target.value })
            }
            placeholder="e.g. TRP-48291"
          />
        </FormField>
        <FormField label="First observed">
          <input
            type="datetime-local"
            value={context.occurrenceTime}
            onChange={(event) =>
              setContext({ ...context, occurrenceTime: event.target.value })
            }
          />
        </FormField>
        <FormField label="Business impact">
          <select
            value={context.impact}
            onChange={(event) =>
              setContext({ ...context, impact: event.target.value })
            }
          >
            <option value="">Select impact</option>
            <option>Single employee affected</option>
            <option>Multiple employees affected</option>
            <option>Entire shift or site affected</option>
            <option>Safety or boarding blocked</option>
          </select>
        </FormField>
        <FormField label="Reproducibility">
          <select
            value={context.reproducibility}
            onChange={(event) =>
              setContext({ ...context, reproducibility: event.target.value })
            }
          >
            <option value="">Select status</option>
            <option>Reproduced consistently</option>
            <option>Intermittent</option>
            <option>Unable to reproduce</option>
          </select>
        </FormField>
      </div>
    </section>
  );
}

export function DiagnosticChecklistCard({
  checks,
  completedChecks,
  setCompletedChecks,
  evidence,
  setEvidence,
}: Pick<
  InvestigationViewProps,
  | "checks"
  | "completedChecks"
  | "setCompletedChecks"
  | "evidence"
  | "setEvidence"
>) {
  return (
    <section className="panel p-5">
      <SectionHeader
        eyebrow="Adaptive diagnostic plan"
        title="Perform and record category-specific checks"
        badge={`${completedChecks.length}/${checks.length} complete`}
      />
      <div className="mt-4 space-y-2">
        {checks.map((check, index) => (
          <label
            key={check}
            className={`check-row ${completedChecks.includes(check) ? "check-done" : ""}`}
          >
            <input
              type="checkbox"
              checked={completedChecks.includes(check)}
              onChange={(event) =>
                setCompletedChecks(
                  event.target.checked
                    ? [...completedChecks, check]
                    : completedChecks.filter((item) => item !== check),
                )
              }
            />
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
              {index + 1}
            </span>
            <span className="text-sm font-semibold">{check}</span>
            {index < 3 && (
              <span className="ml-auto text-[10px] font-bold uppercase text-amber-600">
                Required
              </span>
            )}
          </label>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 max-md:grid-cols-1">
        <FormField label="Relevant IDs and logs">
          <textarea
            rows={4}
            value={evidence.logs}
            onChange={(event) =>
              setEvidence({ ...evidence, logs: event.target.value })
            }
            placeholder="Trip ID, roster batch, last ping, timestamps…"
          />
        </FormField>
        <FormField label="Observations and evidence">
          <textarea
            rows={4}
            value={evidence.notes}
            onChange={(event) =>
              setEvidence({ ...evidence, notes: event.target.value })
            }
            placeholder="What did each check prove or rule out?"
          />
        </FormField>
      </div>
    </section>
  );
}
