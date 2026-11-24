# RideOps Resolution OS — Evaluator Test Guide

These scenarios demonstrate the product's central claim: better evidence quality and first-time routing can reduce avoidable Engineering handoffs, duplicate work, and reopened tickets without automating consequential decisions.

## Before you start

1. Open the product.
2. Use **Ticket queue** to search for the ticket ID in each scenario.
3. Select **Assess** to open the investigation.
4. Use **Change ticket** between scenarios. Each newly selected ticket starts with a clean investigation form.
5. Click **Analyse this ticket** only after entering the inputs specified below. Gemini may improve the writing, but deterministic rules retain control of evidence requirements, confidence, and routing.
6. Keep **Operations** open in another browser tab if you want to watch the evaluator dashboard change after each action. It contains only live test-session events, not static case-study KPIs.

The three core scenarios take approximately 8–10 minutes in total.

---

## Scenario 1 — Stop a premature Engineering escalation

**Ticket:** `SUP-11391`  
**Issue:** Employee app shows the cab 3 km away while the cab is at the gate  
**Historical context:** This ticket already has three handoffs and was previously returned for insufficient information.

### Steps

1. Search for `SUP-11391` in **Ticket queue** and select **Assess**.
2. Leave the investigation fields and checklist incomplete.
3. Click **Analyse this ticket**.

### Expected result

- Readiness remains very low (approximately 9%).
- The route is **Continue L1** with approximately **45% confidence**.
- The Copilot identifies eight required gaps, including expected-versus-actual behaviour, stable identifiers, business impact, reproducibility, logs, and the three required GPS checks.
- The client update says that support is still collecting evidence; it does not invent Engineering progress or an ETA.

### Test the escalation guard

1. Manually select **Engineering**.
2. Select **Approve and record route** without entering an override reason.

Expected: the product refuses to record the early escalation and asks for an override reason. This keeps the human decision while making exceptions explicit and measurable.

Open **Operations**. **Tickets analysed** and **Premature handoffs stopped** should now show `1`, and the two actions should appear in the evaluator activity feed.

### What this proves

The product prevents the exact failure described by Engineering: incomplete tickets disappearing into an investigation queue and returning to L1 after avoidable delay.

---

## Scenario 2 — Link duplicate work to a known issue

**Ticket:** `SUP-11258`  
**Issue:** Driver app GPS jumping between locations  
**Known issue expected:** `KI-204` — Driver app location stream stalls after network transition

### Enter this investigation context

| Field | Test value |
| --- | --- |
| Expected versus actual | `Expected: the vehicle marker stays on the assigned route. Actual: the marker jumps 2–3 km every few minutes.` |
| Affected ID | `TRP-48291 / DRV-207` |
| Business impact | `Multiple employees affected` |
| Reproducibility | `Reproduced consistently` |
| First observed | Keep the ticket's prefilled timestamp |

Complete all five GPS diagnostic checks.

**Relevant IDs and logs**

```text
Trip TRP-48291; driver DRV-207; server pings at 17:22, 17:25 and 17:28; location permission enabled; network online.
```

**Observations and evidence**

```text
Issue reproduced on the assigned driver device. A second active trip at the same site tracked normally. Restart produced a fresh ping but the original trip continued to jump.
```

Click **Analyse this ticket**.

### Expected result

- Readiness reaches **100%**.
- There are **zero required evidence gaps**.
- The recommended route is **Known issue** with approximately **92% confidence**.
- The generated packet links the symptoms to `KI-204` rather than asking Engineering to investigate the same problem again.
- Similar historical cases are shown with their actual outcomes.
- The client update communicates progress without claiming that the issue is fixed.

Select **Approve and record route**. The decision should appear in the workflow trail and be saved with a timestamp.

Open **Operations**. **Known issues reused** and **Decisions recorded** should each increase immediately.

### What this proves

The product reduces duplicate Engineering work while giving L1 a safe, verified workaround and a client-ready update.

---

## Scenario 3 — Create a justified Engineering handoff

**Ticket:** `SUP-11267`  
**Issue:** OTP shown as invalid on the driver app  
**Expected route:** Engineering — there is no matching seeded known issue for this category.

### Enter this investigation context

| Field | Test value |
| --- | --- |
| Expected versus actual | `Expected: the current OTP boards employee EMP-771. Actual: the driver app rejects the current OTP as invalid.` |
| Affected ID | `TRP-90021 / EMP-771 / DRV-118` |
| Business impact | `Safety or boarding blocked` |
| Reproducibility | `Reproduced consistently` |
| First observed | Keep the ticket's prefilled timestamp |

Complete all four diagnostic checks.

**Relevant IDs and logs**

```text
Trip TRP-90021; employee EMP-771; driver DRV-118; OTP generated at 08:10 and rejected at 08:12; employee and driver mappings verified.
```

**Observations and evidence**

```text
The current OTP failed twice and a newly generated OTP also failed. Another employee on the same trip boarded successfully. Permissions, trip assignment and device connectivity were verified.
```

Click **Analyse this ticket**.

### Expected result

- Readiness reaches **100%**.
- The recommended route is **Engineering** with approximately **88% confidence**.
- The packet contains stable IDs, reproduction details, timestamps, comparisons, completed checks and evidence.
- No override is required because the handoff meets the readiness threshold.
- The client update explicitly avoids promising an Engineering ETA.

Select **Approve and record route**.

Expected: the approved Engineering route appears in the workflow trail with a timestamp. In **Operations**, **Ready Engineering handoffs** and **Decisions recorded** increase immediately, and the action appears in the evaluator activity feed.

### What this proves

The product does not block valid escalations. It improves their first-time quality so Engineering can begin diagnosis without first reconstructing the support investigation.

---

## Optional Scenario 4 — Prove that AI cannot close a ticket

Continue from any fully investigated ticket:

1. Open **Closure review**.
2. Observe that **Mark ready for human closure** is disabled while the resolution summary and client verification are missing.
3. Enter a verifiable resolution summary.
4. Set client verification to **Confirmed resolved**.
5. Run **Analyse this ticket** again.
6. Select **Mark ready for human closure**.

Expected: the product records that the ticket is ready for human closure. It does not close the ticket automatically.

### What this proves

The AI drafts and checks evidence, while a human remains responsible for routing and closure.

---

## Optional Scenario 5 — Test with a fresh ticket CSV

This verifies that the product is not limited to the 30 September snapshot.

1. Open **Ticket queue**.
2. Select **Download template**.
3. Open the downloaded CSV and keep the example row, or add more rows using the same columns. At minimum, each row needs `ticket_id`, `category`, and `description`.
4. Select **Import new tickets** and choose the CSV.
5. Confirm that the new ticket appears in the queue with a green **New data** badge.
6. Select **Assess** and run the same investigation workflow used for a historical ticket.
7. Open **Operations** and confirm that **Fresh tickets loaded** and the activity feed updated.

The importer also accepts the original RideOps dataset schema, including fields such as `client_name`, `client_tier`, `assigned_agent`, `escalated_to_eng`, `eng_handoffs`, `eng_outcome`, `reopen_count`, and `csat_score`.

### Data behaviour

- The supplied 1,444-ticket dataset remains the fixed diagnostic baseline as of 30 September 2026.
- Imported rows are a clearly labelled evaluator test layer and do not overwrite the baseline file.
- If an imported row uses an existing ticket ID, the imported version replaces that ticket in the current browser's test layer.
- Imported tickets and evaluator dashboard events persist for the browser session. Use **Reset activity** in Operations to clear dashboard events; imported test tickets remain available in the queue.

---

## What to inspect after the scenarios

- **Knowledge:** seeded known issues and verified workarounds.
- **Operations:** live counts and timestamped actions produced by the evaluator's own test—analyses, prevented handoffs, known-issue reuse, justified Engineering packets, recorded decisions, and fresh-data imports.

Together, the scenarios show the intended causal chain:

```text
better evidence → fewer premature escalations → fewer returns and handoffs
               → known-issue reuse → less duplicate Engineering work
               → faster justified handoffs → lower open backlog
```

