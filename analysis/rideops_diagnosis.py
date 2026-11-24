import csv
import json
import math
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from statistics import mean, median


SOURCE = Path(__file__).resolve().parents[1] / "data" / "rideops_support_tickets.csv"
OUT_DIR = Path(__file__).resolve().parent / "output"
AS_OF = datetime(2026, 9, 30, 23, 59, 59)
DATE_FIELDS = ["created_at", "first_response_at", "first_closed_at", "final_closed_at"]


def parse_dt(value):
    value = (value or "").strip()
    return datetime.strptime(value, "%Y-%m-%d %H:%M") if value else None


def percentile(values, p):
    values = sorted(values)
    if not values:
        return None
    position = (len(values) - 1) * p
    low = math.floor(position)
    high = math.ceil(position)
    if low == high:
        return values[low]
    return values[low] + (values[high] - values[low]) * (position - low)


def hours(delta):
    return delta.total_seconds() / 3600


def rate(numerator, denominator):
    return numerator / denominator if denominator else None


def round_or_none(value, digits=2):
    return round(value, digits) if value is not None else None


def monday_start(dt):
    d = dt.date() - timedelta(days=dt.weekday())
    return d.isoformat()


def summary(records):
    total = len(records)
    closed = [r for r in records if r["final_closed_at"] is not None]
    resolution_hours = [hours(r["final_closed_at"] - r["created_at"]) for r in closed]
    response_hours = [
        hours(r["first_response_at"] - r["created_at"])
        for r in records
        if r["first_response_at"] is not None
    ]
    csat = [r["csat_score"] for r in records if r["csat_score"] is not None]
    open_records = [r for r in records if r["final_closed_at"] is None]
    reopened = [r for r in records if r["reopen_count"] > 0]
    ever_closed = [r for r in records if r["first_closed_at"] is not None]
    return {
        "tickets": total,
        "closed": len(closed),
        "open": len(open_records),
        "open_rate": round_or_none(rate(len(open_records), total), 4),
        "escalated": sum(r["escalated_to_eng"] == "Yes" for r in records),
        "escalation_rate": round_or_none(
            rate(sum(r["escalated_to_eng"] == "Yes" for r in records), total), 4
        ),
        "median_resolution_hours": round_or_none(median(resolution_hours) if resolution_hours else None),
        "p75_resolution_hours": round_or_none(percentile(resolution_hours, 0.75)),
        "p90_resolution_hours": round_or_none(percentile(resolution_hours, 0.90)),
        "resolved_within_24h_rate": round_or_none(
            rate(sum(v <= 24 for v in resolution_hours), len(resolution_hours)), 4
        ),
        "resolved_within_72h_rate": round_or_none(
            rate(sum(v <= 72 for v in resolution_hours), len(resolution_hours)), 4
        ),
        "resolved_within_7d_rate": round_or_none(
            rate(sum(v <= 168 for v in resolution_hours), len(resolution_hours)), 4
        ),
        "median_first_response_hours": round_or_none(median(response_hours) if response_hours else None),
        "p90_first_response_hours": round_or_none(percentile(response_hours, 0.90)),
        "reopened_tickets": len(reopened),
        "reopen_rate": round_or_none(rate(len(reopened), len(ever_closed)), 4),
        "mean_csat": round_or_none(mean(csat) if csat else None),
        "csat_responses": len(csat),
    }


def grouped_summary(records, field):
    groups = defaultdict(list)
    for r in records:
        groups[str(r[field])].append(r)
    rows = []
    for name, group in groups.items():
        row = {field: name}
        row.update(summary(group))
        row["open_share"] = round_or_none(
            rate(row["open"], sum(x["final_closed_at"] is None for x in records)), 4
        )
        rows.append(row)
    return sorted(rows, key=lambda x: (-x["open"], -x["tickets"], str(x[field])))


def monthly_created_by_group(records, field):
    groups = defaultdict(lambda: Counter())
    for r in records:
        groups[str(r[field])][r["created_at"].strftime("%Y-%m")] += 1
    rows = []
    for name, counts in groups.items():
        july = counts["2026-07"]
        august = counts["2026-08"]
        september = counts["2026-09"]
        rows.append(
            {
                field: name,
                "2026-07": july,
                "2026-08": august,
                "2026-09": september,
                "sep_minus_jul": september - july,
                "sep_vs_jul_change_rate": round_or_none(rate(september - july, july), 4),
            }
        )
    return sorted(rows, key=lambda x: (-x["sep_minus_jul"], str(x[field])))


def escalation_diagnostics_by_category(records):
    rows = []
    for category in sorted({r["category"] for r in records}):
        group = [r for r in records if r["category"] == category]
        escalated = [r for r in group if r["escalated_to_eng"] == "Yes"]
        non_escalated = [r for r in group if r["escalated_to_eng"] == "No"]
        returned = [
            r for r in escalated if r["eng_outcome"] in {
                "Insufficient info - returned to L1",
                "Config issue - returned to L1",
            }
        ]
        non_fix = [r for r in escalated if r["eng_outcome"] != "Fixed"]
        multi = [r for r in escalated if r["eng_handoffs"] >= 2]
        esc_summary = summary(escalated)
        l1_summary = summary(non_escalated)
        rows.append(
            {
                "category": category,
                "tickets": len(group),
                "escalated": len(escalated),
                "escalation_rate": round_or_none(rate(len(escalated), len(group)), 4),
                "non_fix_escalations": len(non_fix),
                "non_fix_rate_among_escalations": round_or_none(rate(len(non_fix), len(escalated)), 4),
                "returned_to_l1": len(returned),
                "returned_rate_among_escalations": round_or_none(rate(len(returned), len(escalated)), 4),
                "multi_handoff_escalations": len(multi),
                "multi_handoff_rate": round_or_none(rate(len(multi), len(escalated)), 4),
                "median_escalated_resolution_hours": esc_summary["median_resolution_hours"],
                "median_l1_resolution_hours": l1_summary["median_resolution_hours"],
                "open_escalated": esc_summary["open"],
                "open_l1": l1_summary["open"],
            }
        )
    return sorted(rows, key=lambda x: (-x["open_escalated"], -x["non_fix_escalations"]))


def cohort_closure_by_month(records, threshold_hours):
    rows = []
    for month in ("2026-07", "2026-08", "2026-09"):
        cohort = [r for r in records if r["created_at"].strftime("%Y-%m") == month]
        eligible = [r for r in cohort if r["created_at"] <= AS_OF - timedelta(hours=threshold_hours)]
        achieved = [
            r for r in eligible
            if r["final_closed_at"] is not None
            and hours(r["final_closed_at"] - r["created_at"]) <= threshold_hours
        ]
        rows.append(
            {
                "month": month,
                "threshold_hours": threshold_hours,
                "eligible": len(eligible),
                "achieved": len(achieved),
                "rate": round_or_none(rate(len(achieved), len(eligible)), 4),
            }
        )
    return rows


def backlog_snapshot_by_group(records, field):
    snapshots = [
        datetime(2026, 7, 31, 23, 59, 59),
        datetime(2026, 8, 31, 23, 59, 59),
        AS_OF,
    ]
    rows = []
    for value in sorted({str(r[field]) for r in records}):
        group = [r for r in records if str(r[field]) == value]
        counts = []
        for snapshot in snapshots:
            counts.append(backlog_on(group, snapshot))
        rows.append(
            {
                field: value,
                "2026-07-31": counts[0],
                "2026-08-31": counts[1],
                "2026-09-30": counts[2],
                "sep_minus_jul": counts[2] - counts[0],
            }
        )
    return sorted(rows, key=lambda x: (-x["sep_minus_jul"], -x["2026-09-30"]))


def agent_adjusted_metrics(records):
    agents = sorted({r["assigned_agent"] for r in records})
    rows = []
    for agent in agents:
        own = [r for r in records if r["assigned_agent"] == agent and r["final_closed_at"] is not None]
        other = [r for r in records if r["assigned_agent"] != agent and r["final_closed_at"] is not None]
        stratum_rates = defaultdict(list)
        for r in other:
            stratum_rates[(r["category"], r["priority"])].append(1 if r["reopen_count"] > 0 else 0)
        fallback = rate(sum(r["reopen_count"] > 0 for r in other), len(other)) or 0
        expected = 0.0
        for r in own:
            values = stratum_rates.get((r["category"], r["priority"]), [])
            expected += mean(values) if values else fallback
        observed = sum(r["reopen_count"] > 0 for r in own)
        rows.append(
            {
                "assigned_agent": agent,
                "closed_tickets": len(own),
                "observed_reopened": observed,
                "observed_reopen_rate": round_or_none(rate(observed, len(own)), 4),
                "expected_reopened_from_category_priority_mix": round(expected, 2),
                "observed_to_expected_ratio": round_or_none(rate(observed, expected), 2),
                "excess_reopened_vs_expected": round(observed - expected, 2),
            }
        )
    return sorted(rows, key=lambda x: -x["excess_reopened_vs_expected"])


def monthly_operating_diagnostics(records):
    rows = []
    for month in ("2026-07", "2026-08", "2026-09"):
        cohort = [r for r in records if r["created_at"].strftime("%Y-%m") == month]
        escalated = [r for r in cohort if r["escalated_to_eng"] == "Yes"]
        returned = [
            r for r in escalated if r["eng_outcome"] in {
                "Insufficient info - returned to L1",
                "Config issue - returned to L1",
            }
        ]
        non_fix = [r for r in escalated if r["eng_outcome"] != "Fixed"]
        multi = [r for r in escalated if r["eng_handoffs"] >= 2]
        reopened = [r for r in cohort if r["reopen_count"] > 0]
        rows.append(
            {
                "month": month,
                "tickets": len(cohort),
                "escalated": len(escalated),
                "escalation_rate": round_or_none(rate(len(escalated), len(cohort)), 4),
                "non_fix_escalations": len(non_fix),
                "non_fix_rate_among_escalations": round_or_none(rate(len(non_fix), len(escalated)), 4),
                "returned_to_l1": len(returned),
                "returned_rate_among_escalations": round_or_none(rate(len(returned), len(escalated)), 4),
                "multi_handoff": len(multi),
                "multi_handoff_rate": round_or_none(rate(len(multi), len(escalated)), 4),
                "reopened": len(reopened),
                "reopened_rate": round_or_none(rate(len(reopened), len(cohort)), 4),
            }
        )
    return rows


def closure_by_age(records, threshold_hours):
    eligible = [
        r
        for r in records
        if r["created_at"] <= AS_OF - timedelta(hours=threshold_hours)
    ]
    achieved = [
        r
        for r in eligible
        if r["final_closed_at"] is not None
        and hours(r["final_closed_at"] - r["created_at"]) <= threshold_hours
    ]
    return {
        "threshold_hours": threshold_hours,
        "eligible_tickets": len(eligible),
        "closed_within_threshold": len(achieved),
        "rate": round_or_none(rate(len(achieved), len(eligible)), 4),
    }


def backlog_on(records, end_of_day):
    return sum(
        r["created_at"] <= end_of_day
        and (r["final_closed_at"] is None or r["final_closed_at"] > end_of_day)
        for r in records
    )


def write_csv(path, rows):
    if not rows:
        return
    with path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with SOURCE.open(newline="", encoding="utf-8-sig") as handle:
        raw = list(csv.DictReader(handle))

    records = []
    invalid_dates = []
    for index, row in enumerate(raw, start=2):
        item = dict(row)
        for field in DATE_FIELDS:
            try:
                item[field] = parse_dt(row[field])
            except ValueError:
                invalid_dates.append({"row": index, "field": field, "value": row[field]})
                item[field] = None
        item["eng_handoffs"] = int(row["eng_handoffs"] or 0)
        item["reopen_count"] = int(row["reopen_count"] or 0)
        item["csat_score"] = int(row["csat_score"]) if row["csat_score"] else None
        records.append(item)

    ids = [r["ticket_id"] for r in records]
    validation = {
        "rows": len(records),
        "columns": len(raw[0]) if raw else 0,
        "duplicate_ticket_ids": [k for k, v in Counter(ids).items() if v > 1],
        "invalid_dates": invalid_dates,
        "created_after_as_of": sum(r["created_at"] > AS_OF for r in records),
        "first_response_before_created": sum(
            r["first_response_at"] is not None and r["first_response_at"] < r["created_at"]
            for r in records
        ),
        "first_close_before_created": sum(
            r["first_closed_at"] is not None and r["first_closed_at"] < r["created_at"]
            for r in records
        ),
        "final_close_before_created": sum(
            r["final_closed_at"] is not None and r["final_closed_at"] < r["created_at"]
            for r in records
        ),
        "final_close_before_first_close": sum(
            r["final_closed_at"] is not None
            and r["first_closed_at"] is not None
            and r["final_closed_at"] < r["first_closed_at"]
            for r in records
        ),
        "closed_status_missing_final_close": sum(
            r["status"] == "Closed" and r["final_closed_at"] is None for r in records
        ),
        "open_status_with_final_close": sum(
            r["status"] != "Closed" and r["final_closed_at"] is not None for r in records
        ),
        "non_escalated_with_eng_ticket": sum(
            r["escalated_to_eng"] == "No" and bool(r["eng_ticket_id"].strip()) for r in records
        ),
        "non_escalated_with_eng_outcome": sum(
            r["escalated_to_eng"] == "No" and bool(r["eng_outcome"].strip()) for r in records
        ),
        "escalated_missing_eng_ticket": sum(
            r["escalated_to_eng"] == "Yes" and not r["eng_ticket_id"].strip() for r in records
        ),
        "escalated_missing_outcome": sum(
            r["escalated_to_eng"] == "Yes" and not r["eng_outcome"].strip() for r in records
        ),
        "open_count_from_status": sum(r["status"] != "Closed" for r in records),
        "open_count_from_final_close": sum(r["final_closed_at"] is None for r in records),
    }

    start_date = min(r["created_at"] for r in records).date()
    daily = []
    current = start_date
    while current <= AS_OF.date():
        eod = datetime.combine(current, datetime.max.time())
        created = sum(r["created_at"].date() == current for r in records)
        closed = sum(
            r["final_closed_at"] is not None and r["final_closed_at"].date() == current
            for r in records
        )
        daily.append(
            {
                "date": current.isoformat(),
                "created": created,
                "finally_closed": closed,
                "net_change": created - closed,
                "closing_backlog": backlog_on(records, eod),
            }
        )
        current += timedelta(days=1)

    weekly_map = defaultdict(lambda: {"created": 0, "finally_closed": 0})
    for r in records:
        weekly_map[monday_start(r["created_at"])]["created"] += 1
        if r["final_closed_at"] is not None:
            weekly_map[monday_start(r["final_closed_at"])]["finally_closed"] += 1

    weekly = []
    for week in sorted(weekly_map):
        week_start = datetime.fromisoformat(week)
        week_end = min(week_start + timedelta(days=6, hours=23, minutes=59, seconds=59), AS_OF)
        values = weekly_map[week]
        created = values["created"]
        closed = values["finally_closed"]
        weekly.append(
            {
                "week_start": week,
                "days_observed": (week_end.date() - week_start.date()).days + 1,
                "created": created,
                "finally_closed": closed,
                "net_change": created - closed,
                "closure_coverage": round_or_none(rate(closed, created), 4),
                "closing_backlog": backlog_on(records, week_end),
            }
        )

    month_ends = [datetime(2026, 7, 31, 23, 59, 59), datetime(2026, 8, 31, 23, 59, 59), AS_OF]
    monthly = []
    for month_end in month_ends:
        month_start = month_end.replace(day=1, hour=0, minute=0, second=0)
        created = sum(month_start <= r["created_at"] <= month_end for r in records)
        closed = sum(
            r["final_closed_at"] is not None and month_start <= r["final_closed_at"] <= month_end
            for r in records
        )
        monthly.append(
            {
                "month": month_start.strftime("%Y-%m"),
                "created": created,
                "finally_closed": closed,
                "net_change": created - closed,
                "closure_coverage": round_or_none(rate(closed, created), 4),
                "closing_backlog": backlog_on(records, month_end),
            }
        )

    overall = summary(records)
    overall["cohort_closure_rates"] = [closure_by_age(records, h) for h in (24, 72, 168)]

    escalated = [r for r in records if r["escalated_to_eng"] == "Yes"]
    eng_outcomes = grouped_summary(escalated, "eng_outcome")
    handoff_summary = grouped_summary(escalated, "eng_handoffs")
    escalation_summary = grouped_summary(records, "escalated_to_eng")

    open_records = [r for r in records if r["final_closed_at"] is None]
    open_age = []
    for r in open_records:
        age_hours = hours(AS_OF - r["created_at"])
        open_age.append(
            {
                "ticket_id": r["ticket_id"],
                "status": r["status"],
                "priority": r["priority"],
                "category": r["category"],
                "escalated_to_eng": r["escalated_to_eng"],
                "eng_handoffs": r["eng_handoffs"],
                "eng_outcome": r["eng_outcome"],
                "age_hours": round(age_hours, 2),
                "age_days": round(age_hours / 24, 2),
            }
        )
    open_age.sort(key=lambda x: -x["age_hours"])

    open_age_bands = Counter()
    for row in open_age:
        d = row["age_days"]
        if d < 1:
            open_age_bands["<1 day"] += 1
        elif d < 3:
            open_age_bands["1-3 days"] += 1
        elif d < 7:
            open_age_bands["3-7 days"] += 1
        elif d < 14:
            open_age_bands["7-14 days"] += 1
        else:
            open_age_bands["14+ days"] += 1

    non_fix_outcomes = {
        "Insufficient info - returned to L1",
        "Config issue - returned to L1",
        "Duplicate of known issue",
        "Not a bug - how-to",
        "Not reproducible",
    }
    escalation_quality = {
        "escalated_tickets": len(escalated),
        "fixed": sum(r["eng_outcome"] == "Fixed" for r in escalated),
        "non_fix_outcome": sum(r["eng_outcome"] in non_fix_outcomes for r in escalated),
        "non_fix_rate": round_or_none(
            rate(sum(r["eng_outcome"] in non_fix_outcomes for r in escalated), len(escalated)), 4
        ),
        "returned_to_l1": sum("returned to L1" in r["eng_outcome"] for r in escalated),
        "returned_to_l1_rate": round_or_none(
            rate(sum("returned to L1" in r["eng_outcome"] for r in escalated), len(escalated)), 4
        ),
        "two_or_more_handoffs": sum(r["eng_handoffs"] >= 2 for r in escalated),
        "two_or_more_handoffs_rate": round_or_none(
            rate(sum(r["eng_handoffs"] >= 2 for r in escalated), len(escalated)), 4
        ),
    }

    fixed_escalations = [r for r in escalated if r["eng_outcome"] == "Fixed"]
    non_fix_escalations = [r for r in escalated if r["eng_outcome"] != "Fixed"]
    returned_escalations = [
        r for r in escalated if r["eng_outcome"] in {
            "Insufficient info - returned to L1",
            "Config issue - returned to L1",
        }
    ]
    one_handoff = [r for r in escalated if r["eng_handoffs"] == 1]
    multi_handoff = [r for r in escalated if r["eng_handoffs"] >= 2]
    reopened_records = [r for r in records if r["reopen_count"] > 0]
    never_reopened_records = [r for r in records if r["reopen_count"] == 0]
    closed_reopened = [r for r in reopened_records if r["final_closed_at"] is not None]
    reopen_delay_hours = [
        hours(r["final_closed_at"] - r["first_closed_at"])
        for r in closed_reopened
        if r["first_closed_at"] is not None
    ]

    results = {
        "validation": validation,
        "overall": overall,
        "monthly": monthly,
        "weekly": weekly,
        "open_age_bands": dict(open_age_bands),
        "open_age_median_days": round_or_none(median([r["age_days"] for r in open_age])),
        "open_age_p90_days": round_or_none(percentile([r["age_days"] for r in open_age], 0.90)),
        "open_reopened_tickets": sum(r["reopen_count"] > 0 for r in open_records),
        "escalation_quality": escalation_quality,
        "combined_escalation_groups": {
            "fixed": summary(fixed_escalations),
            "non_fix": summary(non_fix_escalations),
            "returned_to_l1": summary(returned_escalations),
            "one_handoff": summary(one_handoff),
            "two_or_more_handoffs": summary(multi_handoff),
        },
        "by_escalation": escalation_summary,
        "by_eng_outcome": eng_outcomes,
        "by_eng_handoffs": handoff_summary,
        "by_category": grouped_summary(records, "category"),
        "by_priority": grouped_summary(records, "priority"),
        "by_agent": grouped_summary(records, "assigned_agent"),
        "by_channel": grouped_summary(records, "channel"),
        "by_client_tier": grouped_summary(records, "client_tier"),
        "by_reopen_status": {
            "reopened": summary(reopened_records),
            "never_reopened": summary(never_reopened_records),
            "median_hours_from_first_to_final_close_for_reopened": round_or_none(
                median(reopen_delay_hours) if reopen_delay_hours else None
            ),
            "p90_hours_from_first_to_final_close_for_reopened": round_or_none(
                percentile(reopen_delay_hours, 0.90)
            ),
        },
        "agent_adjusted_reopen_metrics": agent_adjusted_metrics(records),
        "monthly_created_by_category": monthly_created_by_group(records, "category"),
        "monthly_created_by_escalation": monthly_created_by_group(records, "escalated_to_eng"),
        "category_escalation_diagnostics": escalation_diagnostics_by_category(records),
        "cohort_72h_closure_by_month": cohort_closure_by_month(records, 72),
        "cohort_7d_closure_by_month": cohort_closure_by_month(records, 168),
        "backlog_snapshot_by_category": backlog_snapshot_by_group(records, "category"),
        "backlog_snapshot_by_escalation": backlog_snapshot_by_group(records, "escalated_to_eng"),
        "monthly_operating_diagnostics": monthly_operating_diagnostics(records),
    }

    # Independent reconciliation controls for the core stock-flow logic.
    assert len(records) == 1444
    assert sum(row["created"] for row in monthly) == len(records)
    assert sum(row["finally_closed"] for row in monthly) == sum(
        r["final_closed_at"] is not None for r in records
    )
    assert sum(row["net_change"] for row in monthly) == sum(
        r["final_closed_at"] is None for r in records
    )
    assert monthly[-1]["closing_backlog"] == sum(
        r["final_closed_at"] is None for r in records
    )

    (OUT_DIR / "diagnosis.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
    write_csv(OUT_DIR / "daily_backlog.csv", daily)
    write_csv(OUT_DIR / "weekly_backlog.csv", weekly)
    write_csv(OUT_DIR / "open_tickets.csv", open_age)
    write_csv(OUT_DIR / "category_summary.csv", results["by_category"])
    write_csv(OUT_DIR / "engineering_outcome_summary.csv", eng_outcomes)

    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
