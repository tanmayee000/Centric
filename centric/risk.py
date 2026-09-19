"""Affordability, stress windows, and telling a dip apart from a decline."""

from __future__ import annotations

import math
import statistics
from dataclasses import dataclass
from typing import List

from . import cashflow
from .data import Borrower

# 25th percentile of a normal distribution sits 0.6745 sd below the mean.
P25_Z = 0.6745


def _logistic(x: float) -> float:
    x = max(-60.0, min(60.0, x))
    return 1.0 / (1.0 + math.exp(-x))


@dataclass
class Affordability:
    horizon: int
    start_month: int
    expected: List[float]        # central forecast of surplus available for this loan
    conservative: List[float]    # P25 band — what we are willing to commit to
    residual_sd: float
    volatility_90d: float
    volatility_12m: float
    runway_months: float


@dataclass
class Diagnosis:
    verdict: str                 # "stable" | "seasonal_dip" | "structural_decline"
    confidence: float            # 0..1
    detail: str
    trend_change_pct: float      # deseasonalised level, recent vs prior
    recovery_probability: float  # chance the next quarter recovers on seasonality alone


@dataclass
class StressWindow:
    months: List[int]            # indices into the horizon
    probabilities: List[float]   # per horizon month
    peak_probability: float
    first_month: int             # -1 when there is no stressed month


def assess_affordability(borrower: Borrower, horizon: int, start_month: int = 0) -> Affordability:
    """Forecast what the borrower can actually put toward this loan each month."""
    inflow_d = cashflow.decompose(borrower.inflow, start_month=start_month)
    essential_d = cashflow.decompose(borrower.essential, start_month=start_month)

    inflow_f = cashflow.project(inflow_d, horizon, start_month)
    essential_f = cashflow.project(essential_d, horizon, start_month)

    expected = [i - e - borrower.other_obligations for i, e in zip(inflow_f, essential_f)]

    # Uncertainty compounds: income shocks and expense shocks are independent.
    sd = math.sqrt(inflow_d.residual_sd ** 2 + essential_d.residual_sd ** 2)
    conservative = [e - P25_Z * sd for e in expected]

    net = borrower.net()
    return Affordability(
        horizon=horizon,
        start_month=start_month,
        expected=expected,
        conservative=conservative,
        residual_sd=sd,
        volatility_90d=cashflow.volatility(net, window=3),
        volatility_12m=cashflow.annual_volatility(net[-12:]),
        runway_months=cashflow.liquidity_runway(net, borrower.essential),
    )


def diagnose(borrower: Borrower, start_month: int = 0) -> Diagnosis:
    """Is the recent softness seasonal, or has the borrower's position moved?

    Compare the deseasonalised level of the last quarter against the nine months
    before it. Seasonality is removed first, so a harvest gap does not read as
    collapse.
    """
    decomp = cashflow.decompose(borrower.net(), start_month=start_month)
    des = decomp.deseasonalised()

    recent = des[-3:]
    prior = des[-12:-3]
    if not prior:
        return Diagnosis("stable", 0.3, "Not enough history to judge.", 0.0, 0.5)

    r_mean, p_mean = statistics.fmean(recent), statistics.fmean(prior)
    change = (r_mean - p_mean) / abs(p_mean) if p_mean else 0.0

    # How big is that gap against the month-to-month noise in this series?
    spread = statistics.pstdev(des[-12:]) if len(des) >= 12 else statistics.pstdev(des)
    se = spread * math.sqrt(1 / 3 + 1 / 9) if spread else 0.0
    t_stat = (r_mean - p_mean) / se if se else 0.0

    # Is the coming quarter seasonally better than the one just gone?
    idx = decomp.seasonal_index
    cur_season = statistics.fmean([idx[(start_month - 3 + i) % 12] for i in range(3)])
    next_season = statistics.fmean([idx[(start_month + i) % 12] for i in range(3)])
    lift = next_season - cur_season
    scale = max(abs(p_mean) * 0.25, 1.0)
    recovery = _logistic(lift / scale)

    # A drop only counts as structural if it clears the noise floor (t < -1.8),
    # is materially large, and seasonality does not promise a rebound.
    if change < -0.18 and t_stat < -2.2 and recovery < 0.60:
        conf = min(0.95, 0.45 + min(abs(t_stat) / 6.0, 0.4))
        return Diagnosis(
            "structural_decline", conf,
            f"Deseasonalised surplus is down {abs(change) * 100:.0f}% on the prior nine "
            f"months (t={t_stat:.1f}) and the coming quarter is not seasonally stronger.",
            change, recovery)

    if change < -0.08:
        return Diagnosis(
            "seasonal_dip", min(0.9, 0.45 + recovery / 2),
            f"Surplus is down {abs(change) * 100:.0f}%, but at t={t_stat:.1f} that sits "
            f"inside normal variation and the coming quarter is seasonally stronger.",
            change, recovery)

    return Diagnosis(
        "stable", 0.7,
        "Deseasonalised surplus is flat or improving against the prior nine months.",
        change, recovery)


def stress_window(affordability: Affordability, scheduled: List[float]) -> StressWindow:
    """Probability the scheduled instalment exceeds what is available, per month."""
    probs = []
    for i, pay in enumerate(scheduled[:affordability.horizon]):
        available = affordability.expected[i]
        sd = max(affordability.residual_sd, 1.0)
        # P(available < pay) under a normal around the central forecast.
        z = max(-40.0, min(40.0, (pay - available) / sd))
        probs.append(_logistic(1.7 * z))  # logistic approximation to Phi
    months = [i for i, p in enumerate(probs) if p >= 0.5]
    return StressWindow(
        months=months,
        probabilities=probs,
        peak_probability=max(probs) if probs else 0.0,
        first_month=months[0] if months else -1,
    )


def breaches(affordability: Affordability, scheduled: List[float]) -> List[int]:
    """Months where the instalment sits above the conservative affordable amount."""
    return [
        i for i, pay in enumerate(scheduled[:affordability.horizon])
        if pay > max(0.0, affordability.conservative[i]) + 1e-6
    ]
