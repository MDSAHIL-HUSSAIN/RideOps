import type { Ticket } from "../../shared/support/support-types";

function parseCsvRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const character = text[i];
    if (character === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export function parseTicketCsv(text: string): Ticket[] {
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ""));
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => header.toLowerCase().trim());
  const index = (...names: string[]) =>
    headers.findIndex((header) => names.includes(header));
  const get = (row: string[], ...names: string[]) => {
    const position = index(...names);
    return position >= 0 ? (row[position] ?? "").trim() : "";
  };
  const idIndex = index("ticket_id", "id");
  if (idIndex < 0) throw new Error("Missing ticket_id column");

  return rows
    .slice(1)
    .map((row) => {
      const id = (row[idIndex] ?? "").trim();
      const description = get(row, "description", "issue", "summary");
      const category = get(row, "category");
      if (!id || !description || !category) return null;
      const csat = get(row, "csat_score", "csat");
      return {
        id,
        description,
        category,
        createdAt:
          get(row, "created_at", "createdat", "created") ||
          new Date().toISOString().slice(0, 16).replace("T", " "),
        client: get(row, "client_name", "client") || "Unspecified client",
        tier: get(row, "client_tier", "tier") || "Unspecified",
        priority: get(row, "priority") || "P3",
        agent: get(row, "assigned_agent", "agent", "owner") || "Unassigned",
        escalated: /^(yes|true|1)$/i.test(
          get(row, "escalated_to_eng", "escalated"),
        ),
        handoffs: Number(get(row, "eng_handoffs", "handoffs")) || 0,
        outcome: get(row, "eng_outcome", "outcome"),
        status: get(row, "status") || "Open - with L1",
        reopens: Number(get(row, "reopen_count", "reopens")) || 0,
        csat: csat ? Number(csat) : null,
      } satisfies Ticket;
    })
    .filter((ticket): ticket is Ticket => Boolean(ticket));
}

export function downloadTicketTemplate() {
  const csv =
    "ticket_id,created_at,client_name,client_tier,category,priority,description,assigned_agent,escalated_to_eng,eng_handoffs,eng_outcome,status,reopen_count,csat_score\nSUP-NEW-001,2026-10-01 09:30,Evaluator Client,Enterprise,Live tracking / GPS incorrect,P2,Vehicle marker is frozen for an active trip,Test Agent,No,0,,Open - with L1,0,";
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  link.download = "rideops_new_ticket_template.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}
