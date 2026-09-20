#!/usr/bin/env python3
"""Exact binomial tails and false-discovery control across many segments.

Screening 194 segments and reporting the striking ones is a selection effect. A segment at
25% against a 5% baseline is interesting; the *most extreme of two hundred* segments at 25%
against a 5% baseline is a weaker claim, and the difference has to be stated in the number
rather than in a disclaimer.

Two corrections are computed and both are published:

  Benjamini-Hochberg controls the false discovery rate when tests are independent or
  positively dependent.

  Benjamini-Yekutieli multiplies the threshold by the harmonic number, which makes it valid
  under *arbitrary* dependence. That is the one to quote here, because these segments are not
  independent at all: "PD-(L)1", "PD-(L)1 | Phase 2" and "TIGIT + PD-(L)1" share trials by
  construction, so a single large programme can move several tests at once.

A q-value is the smallest false-discovery rate at which a segment would still be called
unusual. It is not a p-value and it is not a probability that the finding is wrong.
"""
from __future__ import annotations

import math


def _betacf(a: float, b: float, x: float) -> float:
    """Continued fraction for the incomplete beta function (Lentz's method)."""
    tiny = 1e-30
    qab, qap, qam = a + b, a + 1.0, a - 1.0
    c = 1.0
    d = 1.0 - qab * x / qap
    if abs(d) < tiny:
        d = tiny
    d = 1.0 / d
    h = d
    for m in range(1, 300):
        m2 = 2 * m
        aa = m * (b - m) * x / ((qam + m2) * (a + m2))
        d = 1.0 + aa * d
        if abs(d) < tiny:
            d = tiny
        c = 1.0 + aa / c
        if abs(c) < tiny:
            c = tiny
        d = 1.0 / d
        h *= d * c
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
        d = 1.0 + aa * d
        if abs(d) < tiny:
            d = tiny
        c = 1.0 + aa / c
        if abs(c) < tiny:
            c = tiny
        d = 1.0 / d
        delta = d * c
        h *= delta
        if abs(delta - 1.0) < 3e-12:
            break
    return h


def betai(a: float, b: float, x: float) -> float:
    """Regularised incomplete beta I_x(a, b)."""
    if x <= 0.0:
        return 0.0
    if x >= 1.0:
        return 1.0
    lbeta = math.lgamma(a + b) - math.lgamma(a) - math.lgamma(b) + a * math.log(x) + b * math.log1p(-x)
    front = math.exp(lbeta)
    if x < (a + 1.0) / (a + b + 2.0):
        return front * _betacf(a, b, x) / a
    return 1.0 - math.exp(math.lgamma(a + b) - math.lgamma(a) - math.lgamma(b)
                          + b * math.log1p(-x) + a * math.log(x)) * _betacf(b, a, 1.0 - x) / b


def binom_sf(k: int, n: int, p0: float) -> float:
    """P(X >= k) for X ~ Binomial(n, p0), exact, via the beta identity.

    One-sided on purpose: the question a reader asks of a segment is whether it stops *more*
    often than its comparator, and a two-sided test would answer a question nobody asked.
    """
    if n <= 0 or k <= 0:
        return 1.0
    if k > n:
        return 0.0
    if p0 <= 0.0:
        return 0.0
    if p0 >= 1.0:
        return 1.0
    return min(1.0, max(0.0, betai(k, n - k + 1, p0)))


def _step_down(pvalues: list[float], scale: float) -> list[float]:
    m = len(pvalues)
    order = sorted(range(m), key=lambda i: pvalues[i])
    q = [1.0] * m
    running = 1.0
    for rank in range(m, 0, -1):
        i = order[rank - 1]
        running = min(running, pvalues[i] * m * scale / rank)
        q[i] = min(1.0, running)
    return q


def benjamini_hochberg(pvalues: list[float]) -> list[float]:
    """Valid under independence or positive dependence."""
    return _step_down(pvalues, 1.0)


def benjamini_yekutieli(pvalues: list[float]) -> list[float]:
    """Valid under arbitrary dependence — the right one for overlapping segments."""
    m = len(pvalues)
    if m == 0:
        return []
    harmonic = sum(1.0 / i for i in range(1, m + 1))
    return _step_down(pvalues, harmonic)


def annotate(segments: list[dict], rate_key="rate", stops_key="biological_stops",
             closed_key="closed", baseline_key="_baseline_rate") -> list[dict]:
    """Attach p and q values to segments already carrying their own comparator rate."""
    ps = [binom_sf(s[stops_key], s[closed_key], s[baseline_key]) for s in segments]
    bh = benjamini_hochberg(ps)
    by = benjamini_yekutieli(ps)
    for s, p, q1, q2 in zip(segments, ps, bh, by):
        s["p_value_vs_baseline"] = p
        s["q_value_bh"] = q1
        s["q_value_by"] = q2
        s["unusual_at_fdr_10pct"] = q2 <= 0.10
    return segments
