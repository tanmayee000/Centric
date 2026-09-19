"""Cash-flow reasoning: separate trend, season and shock.

This is the part that decides whether a bad month is weather or decline.
Classical additive decomposition, deliberately simple enough to explain to a
credit officer in one sentence per step.
"""

from __future__ import annotations

import statistics
from dataclasses import dataclass
from typing import List, Optional

PERIOD = 12


@dataclass
class Decomposition:
    observed: List[float]
    trend: List[Optional[float]]        # None at the un-centrable ends
    seasonal: List[float]               # per observation
    seasonal_index: List[float]         # per calendar month, length 12
    residual: List[Optional[float]]
    residual_sd: float

    def deseasonalised(self) -> List[float]:
        return [o - s for o, s in zip(self.observed, self.seasonal)]


def centered_moving_average(series: List[float], period: int = PERIOD) -> List[Optional[float]]:
    """2xN centred MA. Even periods get half weights at both ends."""
    n = len(series)
    half = period // 2
    out: List[Optional[float]] = [None] * n
    for i in range(half, n - half):
        window = series[i - half:i + half + 1]
        if period % 2 == 0:
            total = 0.5 * window[0] + 0.5 * window[-1] + sum(window[1:-1])
            out[i] = total / period
        else:
            out[i] = sum(window) / period
    return out


def decompose(series: List[float], period: int = PERIOD, start_month: int = 0) -> Decomposition:
    """Additive decomposition: observed = trend + seasonal + residual."""
    n = len(series)
    trend = centered_moving_average(series, period)

    # Seasonal index = average detrended value per calendar month, then centred.
    buckets = {m: [] for m in range(period)}
    for i, (obs, tr) in enumerate(zip(series, trend)):
        if tr is not None:
            buckets[(start_month + i) % period].append(obs - tr)
    raw = [statistics.fmean(buckets[m]) if buckets[m] else 0.0 for m in range(period)]
    offset = statistics.fmean(raw)
    seasonal_index = [r - offset for r in raw]

    seasonal = [seasonal_index[(start_month + i) % period] for i in range(n)]
    residual = [
        (series[i] - trend[i] - seasonal[i]) if trend[i] is not None else None
        for i in range(n)
    ]
    resid_vals = [r for r in residual if r is not None]
    residual_sd = statistics.pstdev(resid_vals) if len(resid_vals) > 1 else 0.0

    return Decomposition(series, trend, seasonal, seasonal_index, residual, residual_sd)


def trend_slope(trend: List[Optional[float]], lookback: int = 6) -> float:
    """Least-squares slope of the last `lookback` trend points, per month."""
    pts = [(i, v) for i, v in enumerate(trend) if v is not None][-lookback:]
    if len(pts) < 2:
        return 0.0
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    mx, my = statistics.fmean(xs), statistics.fmean(ys)
    denom = sum((x - mx) ** 2 for x in xs)
    if denom == 0:
        return 0.0
    return sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / denom


def last_trend(trend: List[Optional[float]]) -> float:
    vals = [v for v in trend if v is not None]
    return vals[-1] if vals else 0.0


def project(decomp: Decomposition, horizon: int, start_month: int,
            damping: float = 0.5) -> List[float]:
    """Forecast `horizon` months forward: damped trend + seasonal index.

    The trend is damped because extrapolating a six-month slope out a year is
    how you turn a soft patch into a fake catastrophe.
    """
    base = last_trend(decomp.trend)
    slope = trend_slope(decomp.trend) * damping
    # Distance from the last centrable trend point to "now".
    tail = sum(1 for v in decomp.trend if v is None) // 2
    out = []
    for h in range(1, horizon + 1):
        level = base + slope * (tail + h)
        out.append(level + decomp.seasonal_index[(start_month + h - 1) % PERIOD])
    return out


def volatility(series: List[float], window: int = 3) -> float:
    """Trailing coefficient of variation — the '90-day volatility' of the brief."""
    tail = series[-window:]
    mean = statistics.fmean(tail)
    if mean <= 0:
        return 1.0
    return statistics.pstdev(tail) / mean if len(tail) > 1 else 0.0


def annual_volatility(series: List[float]) -> float:
    mean = statistics.fmean(series)
    if mean <= 0:
        return 1.0
    return statistics.pstdev(series) / mean


def liquidity_runway(surplus: List[float], essentials: List[float], months: int = 3) -> float:
    """Months of essentials covered by recent accumulated surplus."""
    saved = sum(max(0.0, s) for s in surplus[-months:])
    burn = statistics.fmean(essentials[-months:])
    if burn <= 0:
        return 0.0
    return saved / burn
