CREATE TABLE `client_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`workflow_id` text NOT NULL,
	`ticket_id` text NOT NULL,
	`draft_type` text NOT NULL,
	`content` text NOT NULL,
	`approved` integer DEFAULT false NOT NULL,
	`approved_by` text,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `known_issues` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`status` text DEFAULT 'investigating' NOT NULL,
	`engineering_ref` text DEFAULT '' NOT NULL,
	`symptoms` text DEFAULT '' NOT NULL,
	`workaround` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workflow_events` (
	`id` text PRIMARY KEY NOT NULL,
	`workflow_id` text NOT NULL,
	`ticket_id` text NOT NULL,
	`actor_user_id` text NOT NULL,
	`actor_name` text NOT NULL,
	`actor_role` text NOT NULL,
	`event_type` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workflows` (
	`id` text PRIMARY KEY NOT NULL,
	`ticket_id` text NOT NULL,
	`owner_user_id` text NOT NULL,
	`owner_name` text NOT NULL,
	`actor_role` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`route` text DEFAULT 'unassigned' NOT NULL,
	`readiness` integer DEFAULT 0 NOT NULL,
	`category` text NOT NULL,
	`priority` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`context_json` text DEFAULT '{}' NOT NULL,
	`checks_json` text DEFAULT '[]' NOT NULL,
	`evidence_json` text DEFAULT '{}' NOT NULL,
	`ai_mode` text DEFAULT 'deterministic' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
