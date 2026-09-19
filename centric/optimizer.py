"""Plan search: reshape the instalment schedule to fit the cash curve.

Hard constraints
  * the loan must fully amortise (principal + contractual interest recovered)
  * no instalment above the borrower's conservative affordable amount
  * tenure extension capped by policy
  * NPV must stay inside the lender's band against the fixed schedule

Everything else is preference: fewer breaches first, then NPV, then a smooth
payment path.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

from .data import Loan, emi, round_to

DEFAULT_DISCOUNT = 0.14          # lender cost of capital, annual
DEFAULT_UTILISATION = 0.90       # never ask for the borrower's last rupee
DEFAULT_NPV_FLOOR = 0.95         # plan must retain >= 95% of fixed-schedule NPV
DEFAULT_MAX_EXTENSION = 6        # months
DEFAULT_INTEREST_CAP = 1.08      # plan may not collect >8% more interest than contract


@dataclass
class Schedule:
    name: str
    payments: List[float]
    tenure: int
    total_collected: float
    interest_collected: float
    npv: float
    npv_ratio: float = 1.0
    interest_ratio: float = 1.0
    breach_months: List[int] = field(default_factory=list)
    feasible: bool = True
    note: str = ""

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "payments": [round(p, 2) for p in self.payments],
            "tenure": self.tenure,
            "total_collected": round(self.total_collected, 2),
            "interest_collected": round(self.interest_collected, 2),
            "npv": round(self.npv, 2),
            "npv_ratio": round(self.npv_ratio, 4),
            "interest_ratio": round(self.interest_ratio, 4),
            "breach_months": self.breach_months,
            "feasible": self.feasible,
            "note": self.note,
        }


def npv(payments: List[float], annual_discount: float = DEFAULT_DISCOUNT) -> float:
    d = annual_discount / 12.0
    return sum(p / ((1 + d) ** (i + 1)) for i, p in enumerate(payments))


def amortise(principal: float, monthly_rate: float, payments: List[float]) -> List[float]:
    """Run a payment stream against a balance. Returns the balance after each month."""
    balance = principal
    out = []
    for pay in payments:
        balance = balance * (1 + monthly_rate) - pay
        out.append(balance)
    return out


def fixed_schedule(loan: Loan, discount: float = DEFAULT_DISCOUNT) -> Schedule:
    instalment = round_to(emi(loan.principal, loan.monthly_rate, loan.tenure_months))
    payments = [instalment] * loan.tenure_months
    # Settle any rounding drift in the final instalment.
    balances = amortise(loan.principal, loan.monthly_rate, payments)
    payments[-1] = round(payments[-1] + balances[-1], 2)
    total = sum(payments)
    return Schedule(
        name="Fixed EMI (contract)",
        payments=payments,
        tenure=loan.tenure_months,
        total_collected=total,
        interest_collected=total - loan.principal,
        npv=npv(payments, discount),
    )


def _solve_scaled(loan: Loan, weights: List[float], caps: List[float]) -> Optional[List[float]]:
    """Find the smallest uniform scale on `weights` that clears the balance.

    Payment in month t is min(k * w[t], cap[t]). Raising k is monotone in total
    recovery, so a bisection converges. Returns None when even paying every cap
    cannot clear the loan inside this horizon.
    """
    if not weights:
        return None

    def terminal_balance(k: float) -> float:
        balance = loan.principal
        for w, cap in zip(weights, caps):
            due = balance * (1 + loan.monthly_rate)
            pay = min(k * w, cap, due)
            balance = due - pay
        return balance

    if terminal_balance(float("inf")) > 1e-6:
        return None

    lo, hi = 0.0, 1.0
    while terminal_balance(hi) > 0 and hi < 1e9:
        hi *= 2
    for _ in range(80):
        mid = (lo + hi) / 2
        if terminal_balance(mid) > 0:
            lo = mid
        else:
            hi = mid

    k = hi
    payments, balance = [], loan.principal
    for w, cap in zip(weights, caps):
        due = balance * (1 + loan.monthly_rate)
        pay = min(k * w, cap, due)
        pay = max(0.0, round(pay, 2))
        balance = due - pay
        payments.append(pay)
    if payments:
        payments[-1] = round(payments[-1] + balance, 2)
    return payments


def _extend(values: List[float], horizon: int, seasonal_tail: List[float]) -> List[float]:
    """Stretch an affordability forecast out to `horizon` using the seasonal cycle."""
    out = list(values)
    while len(out) < horizon:
        out.append(seasonal_tail[len(out) % len(seasonal_tail)] if seasonal_tail else out[-1])
    return out


def build_candidates(loan: Loan,
                     conservative: List[float],
                     utilisation: float = DEFAULT_UTILISATION,
                     grace_months: int = 0,
                     max_extension: int = DEFAULT_MAX_EXTENSION,
                     discount: float = DEFAULT_DISCOUNT) -> List[Schedule]:
    """Generate the plan shapes worth considering for this borrower."""
    base_tenure = loan.tenure_months
    seasonal_tail = conservative[-12:] if len(conservative) >= 12 else conservative

    candidates: List[Schedule] = []
    for extension in range(0, max_extension + 1):
        tenure = base_tenure + extension
        afford = _extend([max(0.0, c) for c in conservative], tenure, seasonal_tail)
        caps = [a * utilisation for a in afford[:tenure]]
        for g in range(grace_months):
            if g < len(caps):
                caps[g] = 0.0

        shapes = {
            # Pay in proportion to what is actually there each month.
            "Cash-flow matched": afford[:tenure],
            # Front-load while money is available, ease later.
            "Front-loaded": [a * (1.0 + 0.35 * (1 - i / max(tenure - 1, 1)))
                             for i, a in enumerate(afford[:tenure])],
            # Step up as the borrower's cycle recovers.
            "Step-up": [a * (0.75 + 0.5 * (i / max(tenure - 1, 1)))
                        for i, a in enumerate(afford[:tenure])],
            # Flat, but only as flat as the caps allow.
            "Level (capped)": [1.0] * tenure,
        }

        for name, weights in shapes.items():
            payments = _solve_scaled(loan, weights, caps)
            if payments is None:
                continue
            total = sum(payments)
            label = name if extension == 0 else f"{name} +{extension}m"
            if grace_months:
                label += f" · {grace_months}m grace"
            candidates.append(Schedule(
                name=label,
                payments=payments,
                tenure=tenure,
                total_collected=total,
                interest_collected=total - loan.principal,
                npv=npv(payments, discount),
            ))
        # Stop stretching once something at this tenure clears affordability.
        caps_now = caps
        if any(all(p <= c + 1e-6 for p, c in zip(cand.payments, caps_now))
               for cand in candidates if cand.tenure == tenure):
            break
    return candidates


def score(schedule: Schedule, conservative: List[float]) -> tuple:
    """Lower is better.

    Breaches first — a plan the borrower cannot meet is not a plan. Then the
    shortest tenure, because extending a 24% loan is not free to the borrower
    even when it flatters the lender's NPV. Then NPV, then smoothness.
    """
    n = len(schedule.payments)
    afford = conservative + [conservative[-1]] * max(0, n - len(conservative))
    breach = [i for i, p in enumerate(schedule.payments)
              if p > max(0.0, afford[i]) + 1e-6]
    schedule.breach_months = breach
    swing = 0.0
    for a, b in zip(schedule.payments, schedule.payments[1:]):
        swing += abs(b - a)
    swing /= max(n - 1, 1)
    return (len(breach), schedule.tenure, -schedule.npv_ratio, swing)


def optimise(loan: Loan,
             conservative: List[float],
             utilisation: float = DEFAULT_UTILISATION,
             grace_months: int = 0,
             max_extension: int = DEFAULT_MAX_EXTENSION,
             npv_floor: float = DEFAULT_NPV_FLOOR,
             interest_cap: float = DEFAULT_INTEREST_CAP,
             discount: float = DEFAULT_DISCOUNT):
    """Return (best_plan, all_ranked_candidates) under the policy constraints."""
    baseline = fixed_schedule(loan, discount)
    candidates = build_candidates(loan, conservative, utilisation,
                                  grace_months, max_extension, discount)

    for c in candidates:
        c.npv_ratio = c.npv / baseline.npv if baseline.npv else 1.0
        c.interest_ratio = (c.interest_collected / baseline.interest_collected
                            if baseline.interest_collected else 1.0)
        score(c, conservative)

    viable = [c for c in candidates
              if c.npv_ratio >= npv_floor and c.interest_ratio <= interest_cap]
    pool = viable or candidates
    pool.sort(key=lambda c: score(c, conservative))

    if not pool:
        return None, []

    best = pool[0]
    if not viable:
        best.feasible = False
        best.note = (f"No shape clears both the {npv_floor:.0%} NPV floor and the "
                     f"{interest_cap:.0%} interest cap — refer to a credit officer.")
    elif best.breach_months:
        best.feasible = False
        best.note = "Affordability cannot be met even at maximum tenure — refer for review."
    else:
        extra = (best.interest_ratio - 1.0) * 100
        cost = ("no extra interest" if extra <= 0.5
                else f"{extra:.1f}% more interest over the life of the loan")
        best.note = (f"Clears affordability in every month, holds the NPV band, and costs "
                     f"the borrower {cost}.")
    return best, pool[:6]
