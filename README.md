# RideOps Escalation Readiness

A working internal tool for L1 support agents. It uses the 1,444-ticket RideOps dataset to improve the quality of escalations, reduce repeated L1–Engineering handoffs, and add the workflow timestamps missing from the source data.

## What works

- Search and assess any historical ticket, with open work shown first.
- Category-specific diagnosis for roster-sync and live-tracking issues.
- A transparent readiness score based on required context, completed checks, and evidence.
- Routing guidance backed by the selected category's historical engineering outcomes.
- A mandatory override reason when an agent escalates below the readiness threshold.
- A copyable, structured action packet for Engineering or L1.
- A resolution-verification checklist; the tool never closes a ticket automatically.
- A local workflow trail and saved in-progress assessments.
- An operations view with pilot baselines and weekly success measures.

## Run locally

From this directory:

```powershell
node .\scripts\prepare-data.mjs "C:\path\to\rideops_support_tickets.csv" .\dist\data.js
python -m http.server 4173 --directory dist
```

Then open `http://127.0.0.1:4173`.

## Product boundary

This is an evidence-backed workflow product, not a replacement ticketing system. It intentionally avoids automated closure, unexplainable prediction, and claims about engineering-stage turnaround that the source timestamps cannot support. Browser storage is used for demo assessments; production integration and durable shared storage are later steps after workflow validation.
