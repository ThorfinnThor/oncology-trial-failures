#!/usr/bin/env python3
"""Time to biological discontinuation, as a competing-risks cumulative incidence function.

Why this exists
---------------
The discontinuation rate (biological stops / closed trials) answers "of the trials that
reached an end, how many ended for a biological reason". It is honest but it is a ratio of
two counts, and both counts depend on how mature the cohort is. A 2015 cohort is almost
entirely closed; a 2023 cohort is mostly still running, and the trials that terminate early
close *first*, so a young cohort's closed set is enriched for terminations. Comparing a
mechanism whose trials started recently against one whose trials started a decade ago
compares maturity as much as biology.

The cumulative incidence function fixes that by using time. Every trial that enrolled enters
the risk set on its start date and contributes follow-up until it terminates for a biological
reason (the event), reaches any other end (the competing event), or is last seen in the
registry (censored). CIF(t) is then the probability that a trial has been stopped for a
biological reason by t months, accounting for the fact that a trial which completed can never
go on to be terminated. It is a proper competing-risks estimator (Aalen-Johansen), not
1 - Kaplan-Meier, which would overstate the risk by treating completion as censoring.

Definitions
-----------
  origin            the trial's registered start date
  event             TERMINATED with Classification V2 outcome BIOLOGICAL_FAILURE, or
                    MIXED_CAUSES including an efficacy, safety or unspecified biological
                    cause, at its completion date
  competing event   any other end: COMPLETED, or TERMINATED for a non-biological reason
  censored          still running, suspended, or status UNKNOWN, at the date the registry
                    record was last updated - after that date the registry tells us nothing
  excluded          WITHDRAWN (never enrolled a patient), and records with no start date

Censoring a trial at its last registry update, rather than at today's date, is the
conservative choice: a sponsor who stops updating a record stops telling us whether the
trial ended, so we stop counting follow-up. 22% of the oncology Phase 2/3 population carries
status UNKNOWN precisely because updates stopped, and assuming those trials ran healthily
until today would push the curve down for no evidential reason.

This is still not a failure rate. A trial that ran to completion and missed its primary
endpoint is a competing event here, not an event.
"""
from __future__ import annotations

import argparse
import json
import math
import random
import sys
from datetime import date, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from scripts.universe.discontinuation_rates import load, select, summarize  # noqa: E402

DAYS_PER_MONTH = 30.4375
HORIZONS = (12, 24, 36, 48, 60)
ONGOING = {"RECRUITING", "ACTIVE_NOT_RECRUITING", "ENROLLING_BY_INVITATION", "NOT_YET_RECRUITING",
           "SUSPENDED", "UNKNOWN", "NO_LONGER_AVAILABLE", "TEMPORARILY_NOT_AVAILABLE",
           "APPROVED_FOR_MARKETING", "AVAILABLE", "WITHHELD"}

EVENT_NONE = 0
EVENT_BIO = 1
EVENT_OTHER = 2

# A trial whose record says it ran for longer than this is a data error, not a trial.
MAX_MONTHS = 240


def _date(value: str | None) -> date | None:
    if not value:
        return None
    for fmt in ("%Y-%m-%d", "%Y-%m", "%Y"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


def observation(r: dict, why: dict | None = None) -> tuple[float, int] | None:
    """(months of follow-up, event code) for one trial, or None if it cannot enter the risk set.

    Pass `why` to accumulate the reason each excluded trial was left out; the counts are
    published so the risk set is auditable rather than a number that appeared from nowhere.
    """
    def out(reason: str):
        if why is not None:
            why[reason] = why.get(reason, 0) + 1
        return None

    start = _date(r.get("start_date"))
    if start is None:
        return out("no start date")
    status = r.get("overall_status")
    if status == "WITHDRAWN":  # never enrolled: no trial, no follow-up
        return out("withdrawn before enrolling")
    if status in ("COMPLETED", "TERMINATED"):
        end = _date(r.get("completion_date")) or _date(r.get("primary_completion_date")) or _date(r.get("last_update_post_date"))
        code = EVENT_BIO if r.get("_bio") else EVENT_OTHER
    elif status in ONGOING:
        end = _date(r.get("last_update_post_date"))
        code = EVENT_NONE
    else:
        return out(f"status {status}")
    if end is None:
        return out("no end or censoring date")
    months = (end - start).days / DAYS_PER_MONTH
    if months < 0:
        # The record was last touched before its registered start date, so the trial was never
        # observed to be running: no follow-up to contribute. Almost all are planned starts on
        # records that then went stale.
        return out("no observed follow-up (last update precedes start date)")
    if months > MAX_MONTHS:
        return out(f"implausible duration (over {MAX_MONTHS // 12} years)")
    # A trial terminated on its start date still occupied a moment of risk; ties at exactly 0
    # would otherwise be dropped by every estimator that starts the risk set after time 0.
    return (max(months, 0.03), code)


def risk_table(obs: list[tuple[float, int]]) -> list[dict]:
    """One row per distinct time at which something happened, in order."""
    by_time: dict[float, list[int]] = {}
    for t, code in obs:
        by_time.setdefault(round(t, 4), [0, 0, 0])[code] += 1
    n = len(obs)
    table = []
    for t in sorted(by_time):
        censored, d1, d2 = by_time[t]
        table.append({"t": t, "n_risk": n, "bio": d1, "other": d2, "censored": censored})
        n -= censored + d1 + d2
    return table


def aalen_johansen(obs: list[tuple[float, int]]) -> list[dict]:
    """Cumulative incidence of the biological event, with Aalen's variance.

    Returns one point per event time: t, cif, variance, survival before t, n at risk.
    Klein & Moeschberger (2003), section 4.7: CIF(t) = sum over event times of
    S(t-) * d1 / n, where S is the overall Kaplan-Meier of "still running and unfinished".
    """
    points = []
    surv = 1.0  # S(t-) : probability the trial has reached neither kind of end
    cif = 0.0
    # Accumulators for the variance, which needs the running CIF as well as the final one.
    steps = []
    for row in risk_table(obs):
        n, d1, d2 = row["n_risk"], row["bio"], row["other"]
        if n <= 0:
            break
        d = d1 + d2
        if d == 0:
            continue
        s_before = surv
        cif += s_before * d1 / n
        steps.append({"t": row["t"], "n": n, "d": d, "d1": d1, "s_before": s_before, "cif": cif})
        surv *= 1 - d / n
        points.append({"t": row["t"], "cif": cif, "n_risk": n, "bio": d1, "other": d2})

    # Variance of CIF(t) at every event time (Aalen). Written with running sums so the whole
    # curve costs one pass: expanding (F_t - F_i)^2 separates F_t from everything indexed by i.
    #   V(t) = F_t^2*SUM(a) - 2*F_t*SUM(F_i*a_i) + SUM(F_i^2*a_i)
    #          + SUM(b_i) - 2*F_t*SUM(c_i) + 2*SUM(F_i*c_i)
    sa = saf = saf2 = sb = sc = scf = 0.0
    for p_, s_ in zip(points, steps):
        n, d, d1, s_b, f_i = s_["n"], s_["d"], s_["d1"], s_["s_before"], s_["cif"]
        a = d / (n * (n - d)) if n > d else 0.0
        b = s_b ** 2 * ((n - d1) / n) * (d1 / n ** 2)
        c = s_b * d1 / n ** 2
        sa += a
        saf += f_i * a
        saf2 += f_i * f_i * a
        sb += b
        sc += c
        scf += f_i * c
        f_t = p_["cif"]
        v = f_t * f_t * sa - 2 * f_t * saf + saf2 + sb - 2 * f_t * sc + 2 * scf
        p_["var"] = max(v, 0.0)
    return points


def _cloglog_ci(f: float, var: float, z: float = 1.96) -> tuple[float, float]:
    """Complementary log-log interval, so the bounds stay inside (0, 1)."""
    if f <= 0 or f >= 1 or var <= 0:
        se = math.sqrt(max(var, 0.0))
        return (max(0.0, f - z * se), min(1.0, f + z * se))
    g = math.log(-math.log(1 - f))
    se_g = math.sqrt(var) / ((1 - f) * abs(math.log(1 - f)))
    lo_g, hi_g = g - z * se_g, g + z * se_g
    lo = 1 - math.exp(-math.exp(lo_g))
    hi = 1 - math.exp(-math.exp(hi_g))
    return (min(lo, hi), max(lo, hi))


def at(points: list[dict], t: float) -> dict:
    """CIF and 95% interval at time t, plus how many trials were still at risk there."""
    last = None
    n_risk = points[0]["n_risk"] if points else 0
    for p in points:
        if p["t"] > t:
            n_risk = p["n_risk"]
            break
        last = p
        n_risk = max(p["n_risk"] - p["bio"] - p["other"], 0)
    if last is None:
        return {"months": t, "cif": 0.0, "ci95": [0.0, 0.0], "n_risk": n_risk}
    lo, hi = _cloglog_ci(last["cif"], last["var"])
    return {"months": t, "cif": last["cif"], "ci95": [lo, hi], "n_risk": n_risk}


def median_followup(obs: list[tuple[float, int]]) -> float | None:
    """Reverse Kaplan-Meier: median time a trial is actually observed for."""
    flipped = [(t, EVENT_BIO if code == EVENT_NONE else EVENT_NONE) for t, code in obs]
    surv = 1.0
    for row in risk_table(flipped):
        n, d = row["n_risk"], row["bio"]
        if n <= 0:
            break
        if d:
            surv *= 1 - d / n
            if surv <= 0.5:
                return row["t"]
    return None


def bootstrap_ci(obs: list[tuple[float, int]], t: float, draws: int = 1000, seed: int = 20260920) -> tuple[float, float]:
    """Percentile bootstrap, used by the tests to check the analytic variance."""
    rng = random.Random(seed)
    n = len(obs)
    vals = []
    for _ in range(draws):
        sample = [obs[rng.randrange(n)] for _ in range(n)]
        vals.append(at(aalen_johansen(sample), t)["cif"])
    vals.sort()
    return (vals[int(0.025 * draws)], vals[int(0.975 * draws)])


def curve(rows: list[dict], horizons=HORIZONS) -> dict:
    """The whole estimate for one set of trials."""
    why: dict[str, int] = {}
    obs = [o for o in (observation(r, why) for r in rows) if o]
    n = len(obs)
    if n == 0:
        return {"trials": 0, "excluded": why}
    bio = sum(1 for _, c in obs if c == EVENT_BIO)
    other = sum(1 for _, c in obs if c == EVENT_OTHER)
    points = aalen_johansen(obs)
    naive = summarize(rows)
    return {
        "trials": n,
        "excluded": dict(sorted(why.items(), key=lambda kv: -kv[1])),
        "excluded_total": len(rows) - n,
        "events_biological": bio,
        "events_other": other,
        "censored": n - bio - other,
        "median_followup_months": median_followup(obs),
        "cif": [at(points, t) for t in horizons],
        # The naive rate alongside it, because the point of the curve is the comparison.
        "closed_rate": naive["rate"],
        "closed_trials": naive["closed"],
        "closed_share": naive["closed_share"],
    }


def monthly_points(rows, months: int = 84, step: int = 3) -> list[dict]:
    """A thinned curve for plotting: CIF every `step` months."""
    obs = [o for o in (observation(r) for r in rows) if o]
    if not obs:
        return []
    points = aalen_johansen(obs)
    return [at(points, t) for t in range(0, months + 1, step)]


def fmt(c: dict) -> str:
    if not c.get("trials"):
        return "no trials"
    parts = []
    for h in c["cif"]:
        parts.append(f"{h['months']}m {h['cif'] * 100:.1f}% ({h['ci95'][0] * 100:.1f}-{h['ci95'][1] * 100:.1f}, n={h['n_risk']})")
    return (f"{c['trials']} trials, {c['events_biological']} biological stops, {c['censored']} censored, "
            f"median follow-up {c['median_followup_months']:.0f}m | " + "; ".join(parts) +
            f" | closed-trial rate {c['closed_rate'] * 100:.1f}%")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--area", default="Oncology")
    ap.add_argument("--class", dest="klass")
    ap.add_argument("--with-class")
    ap.add_argument("--phases", default="2,3")
    ap.add_argument("--start", default="2015:2024")
    ap.add_argument("--by-start-year", action="store_true", help="show the maturity problem cohort by cohort")
    ap.add_argument("--check", action="store_true", help="compare the analytic interval with a bootstrap")
    args = ap.parse_args()
    start = tuple(int(x) for x in args.start.split(":"))
    phases = [x.strip() for x in args.phases.split(",")]
    rows = load(args.area)
    common = dict(phases=phases, start=start)
    base = select(rows, **common)
    print(f"{args.area} Phase {args.phases}, starts {start[0]}-{start[1]}")
    print("  all:", fmt(curve(base)))
    if args.klass:
        seg = select(rows, klass=args.klass, with_class=args.with_class, **common)
        print(f"  {args.klass}:", fmt(curve(seg)))
    if args.by_start_year:
        print("\n  by start year - the closed-trial rate moves with maturity, the curve should not:")
        for y in range(start[0], start[1] + 1):
            sub = select(rows, phases=phases, start=(y, y))
            c = curve(sub)
            if not c.get("trials"):
                continue
            at24 = c["cif"][1]
            print(f"    {y}: n={c['trials']:5d} closed={c['closed_share'] * 100:4.0f}% "
                  f"closed-rate={c['closed_rate'] * 100:5.2f}%  CIF@24m={at24['cif'] * 100:5.2f}% "
                  f"({at24['ci95'][0] * 100:.2f}-{at24['ci95'][1] * 100:.2f})")
    if args.check:
        obs = [o for o in (observation(r) for r in base) if o]
        for t in (24, 48):
            a = at(aalen_johansen(obs), t)
            b = bootstrap_ci(obs, t, draws=300)
            print(f"  t={t}m analytic {a['ci95'][0] * 100:.2f}-{a['ci95'][1] * 100:.2f}  "
                  f"bootstrap {b[0] * 100:.2f}-{b[1] * 100:.2f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
