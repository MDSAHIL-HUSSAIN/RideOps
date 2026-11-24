import {
  Activity,
  CheckCircle2,
  FileCheck2,
  FileUp,
  History,
  Inbox,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import type { SessionEvent } from "../../domain/workspace";
import { SectionHeader } from "../../components/ui/form";

export function OperationsDashboardView({
  events,
  importedCount,
  onReset,
}: {
  events: SessionEvent[];
  importedCount: number;
  onReset: () => void;
}) {
  const uniqueAnalysed = new Set(
    events
      .filter((event) => event.type === "analysis")
      .map((event) => event.ticketId),
  ).size;
  const decisions = events.filter((event) =>
    [
      "route_recorded",
      "known_issue",
      "ready_handoff",
      "closure_ready",
    ].includes(event.type),
  ).length;
  const blocked = events.filter(
    (event) => event.type === "blocked_escalation",
  ).length;
  const reused = events.filter((event) => event.type === "known_issue").length;
  const handoffs = events.filter(
    (event) => event.type === "ready_handoff",
  ).length;
  return (
    <section className="p-6">
      <div className="mb-5 flex items-center justify-between gap-5 rounded-2xl bg-gradient-to-r from-[#0a1d3f] to-[#0c5673] p-7 text-white max-md:block">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.13em] text-cyan-200">
            Live evaluator session
          </p>
          <h2 className="mt-2 text-2xl font-bold">
            See each workflow intervention as it happens.
          </h2>
          <p className="mt-2 text-sm text-blue-100">
            Only actions produced while testing this product are shown here—not
            static September KPIs.
          </p>
        </div>
        <button
          onClick={onReset}
          className="mt-3 flex shrink-0 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold hover:bg-white/15 md:mt-0"
        >
          <RotateCcw size={16} />
          Reset activity
        </button>
      </div>
      <div className="grid grid-cols-3 gap-4 max-xl:grid-cols-2 max-md:grid-cols-1">
        <Metric
          label="Tickets analysed"
          value={uniqueAnalysed}
          note="Unique investigations run"
          icon={Activity}
        />
        <Metric
          label="Premature handoffs stopped"
          value={blocked}
          note="Missing evidence + no override"
          icon={ShieldCheck}
        />
        <Metric
          label="Known issues reused"
          value={reused}
          note="Duplicate investigation avoided"
          icon={CheckCircle2}
        />
        <Metric
          label="Ready Engineering handoffs"
          value={handoffs}
          note="Readiness at or above 80%"
          icon={FileCheck2}
        />
        <Metric
          label="Decisions recorded"
          value={decisions}
          note="Persisted human approvals"
          icon={History}
        />
        <Metric
          label="Fresh tickets loaded"
          value={importedCount}
          note="Evaluator CSV test layer"
          icon={FileUp}
        />
      </div>
      <section className="panel mt-5 p-5">
        <SectionHeader
          eyebrow="Immediate proof"
          title="Evaluator activity"
          badge={`${events.length} event${events.length === 1 ? "" : "s"}`}
        />
        <div className="mt-4 divide-y divide-slate-100">
          {events.length ? (
            events.slice(0, 12).map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${event.type === "blocked_escalation" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}
                  >
                    {event.type === "blocked_escalation" ? (
                      <ShieldCheck size={17} />
                    ) : (
                      <CheckCircle2 size={17} />
                    )}
                  </span>
                  <div>
                    <strong className="text-sm">{event.label}</strong>
                    <p className="mt-1 text-xs text-slate-400">
                      {event.ticketId === "CSV"
                        ? "Fresh data import"
                        : event.ticketId}
                    </p>
                  </div>
                </div>
                <time className="text-xs text-slate-400">
                  {new Date(event.at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
            ))
          ) : (
            <div className="py-10 text-center">
              <Activity className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-600">
                No evaluator actions yet
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Run a scenario or import a CSV and this dashboard will update
                immediately.
              </p>
            </div>
          )}
        </div>
      </section>
    </section>
  );
}

function Metric({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: number;
  note: string;
  icon: typeof Inbox;
}) {
  return (
    <div className="panel p-5">
      <div className="flex justify-between">
        <div>
          <p className="label">{label}</p>
          <strong className="mt-1 block text-3xl">{value}</strong>
          <p className="mt-1 text-xs text-slate-400">{note}</p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700">
          <Icon size={19} />
        </span>
      </div>
    </div>
  );
}
