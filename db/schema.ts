import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const workflows = sqliteTable("workflows", {
  id: text("id").primaryKey(),
  ticketId: text("ticket_id").notNull(),
  ownerUserId: text("owner_user_id").notNull(),
  ownerName: text("owner_name").notNull(),
  actorRole: text("actor_role").notNull(),
  status: text("status").notNull().default("draft"),
  route: text("route").notNull().default("unassigned"),
  readiness: integer("readiness").notNull().default(0),
  category: text("category").notNull(),
  priority: text("priority").notNull(),
  summary: text("summary").notNull().default(""),
  contextJson: text("context_json").notNull().default("{}"),
  checksJson: text("checks_json").notNull().default("[]"),
  evidenceJson: text("evidence_json").notNull().default("{}"),
  aiMode: text("ai_mode").notNull().default("deterministic"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const workflowEvents = sqliteTable("workflow_events", {
  id: text("id").primaryKey(),
  workflowId: text("workflow_id").notNull(),
  ticketId: text("ticket_id").notNull(),
  actorUserId: text("actor_user_id").notNull(),
  actorName: text("actor_name").notNull(),
  actorRole: text("actor_role").notNull(),
  eventType: text("event_type").notNull(),
  detail: text("detail").notNull().default(""),
  metadataJson: text("metadata_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const knownIssues = sqliteTable("known_issues", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull().default("investigating"),
  engineeringRef: text("engineering_ref").notNull().default(""),
  symptoms: text("symptoms").notNull().default(""),
  workaround: text("workaround").notNull().default(""),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const clientDrafts = sqliteTable("client_drafts", {
  id: text("id").primaryKey(),
  workflowId: text("workflow_id").notNull(),
  ticketId: text("ticket_id").notNull(),
  draftType: text("draft_type").notNull(),
  content: text("content").notNull(),
  approved: integer("approved", { mode: "boolean" }).notNull().default(false),
  approvedBy: text("approved_by"),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
