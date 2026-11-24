import { Download, FileUp, Search } from "lucide-react";
import type { ChangeEvent } from "react";
import type { Ticket } from "../../../shared/support/support-types";
import { isOpenTicket } from "../../domain/workspace";
import { downloadTicketTemplate } from "../../utils/ticket-csv";

type Props = {
  tickets: Ticket[];
  query: string;
  onQueryChange: (value: string) => void;
  filter: string;
  onFilterChange: (value: string) => void;
  onSelect: (ticket: Ticket) => void;
  onImport: (file: File) => void;
  importedTicketIds: Set<string>;
  importedCount: number;
};

export function TicketQueueView({
  tickets,
  query,
  onQueryChange,
  filter,
  onFilterChange,
  onSelect,
  onImport,
  importedTicketIds,
  importedCount,
}: Props) {
  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void onImport(file);
    event.target.value = "";
  }
  return (
    <section className="p-6">
      <div className="panel mb-4 p-4">
        <div className="flex items-center justify-between gap-4 max-lg:block">
          <div>
            <p className="eyebrow">1,444-ticket baseline · 30 Sep 2026</p>
            <h2>Support queue</h2>
            <p className="mt-1 text-xs text-slate-500">
              Fresh CSV rows are added as a separate evaluator test layer.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 max-lg:mt-3">
            <button className="btn-secondary" onClick={downloadTicketTemplate}>
              <Download size={15} />
              Download template
            </button>
            <label className="btn-primary cursor-pointer">
              <FileUp size={16} />
              Import new tickets
              <input
                className="sr-only"
                type="file"
                accept=".csv,text/csv"
                onChange={chooseFile}
              />
            </label>
            {importedCount > 0 && (
              <span className="badge badge-green self-center">
                {importedCount} imported
              </span>
            )}
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <label className="search">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search ticket, client or issue"
            />
          </label>
          <select
            className="select max-w-[130px]"
            value={filter}
            onChange={(event) => onFilterChange(event.target.value)}
          >
            <option>Open</option>
            <option>Closed</option>
            <option>All</option>
          </select>
        </div>
      </div>
      <div className="panel overflow-auto">
        <table className="w-full min-w-[900px] text-left">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Client</th>
              <th>Issue</th>
              <th>Priority</th>
              <th>Owner</th>
              <th>Engineering</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id}>
                <td>
                  <strong className="text-blue-700">{ticket.id}</strong>
                  {importedTicketIds.has(ticket.id) && (
                    <span className="badge badge-green ml-2">New data</span>
                  )}
                  <small>{ticket.createdAt.slice(0, 10)}</small>
                </td>
                <td>
                  {ticket.client}
                  <small>{ticket.tier}</small>
                </td>
                <td className="max-w-[320px]">
                  <strong>{ticket.category}</strong>
                  <small className="line-clamp-1">{ticket.description}</small>
                </td>
                <td>
                  <span
                    className={`badge ${ticket.priority === "P1" ? "badge-red" : "badge-slate"}`}
                  >
                    {ticket.priority}
                  </span>
                </td>
                <td>{ticket.agent}</td>
                <td>
                  {ticket.escalated ? (
                    <span className="badge badge-blue">
                      {ticket.handoffs} handoff
                      {ticket.handoffs === 1 ? "" : "s"}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">L1</span>
                  )}
                </td>
                <td>
                  <span
                    className={`badge ${isOpenTicket(ticket) ? "badge-amber" : "badge-green"}`}
                  >
                    {ticket.status}
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => onSelect(ticket)}
                    className="text-sm font-bold text-blue-700"
                  >
                    Assess
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!tickets.length && (
          <div className="p-10 text-center text-sm text-slate-500">
            No tickets match this view.
          </div>
        )}
      </div>
    </section>
  );
}
