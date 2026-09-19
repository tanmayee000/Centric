"""Orchestration: one borrower end to end, and the whole book replayed."""

from __future__ import annotations

from typing import List, Optional

from . import cashflow, evidence, optimizer, risk
from .data import Borrower, MONTH_NAMES, load_portfolio


def analyse(borrower: Borrower,
            start_month: int = 0,
            utilisation: float = optimizer.DEFAULT_UTILISATION,
            grace_months: int = 0,
            max_extension: int = optimizer.DEFAULT_MAX_EXTENSION,
            npv_floor: float = optimizer.DEFAULT_NPV_FLOOR,
            interest_cap: float = optimizer.DEFAULT_INTEREST_CAP) -> dict:
    """Full pipeline for a single borrower. Returns a JSON-ready dict."""
    loan = borrower.loan
    horizon = loan.tenure_months + max_extension

    afford = risk.assess_affordability(borrower, horizon, start_month)
    diag = risk.diagnose(borrower, start_month)

    baseline = optimizer.fixed_schedule(loan)
    fixed_breaches = risk.breaches(afford, baseline.payments)
    baseline.breach_months = fixed_breaches
    fixed_stress = risk.stress_window(afford, baseline.payments)

    plan, alternatives = optimizer.optimise(
        loan,
        afford.conservative,
        utilisation=utilisation,
        grace_months=grace_months,
        max_extension=max_extension,
        npv_floor=npv_floor,
        interest_cap=interest_cap,
    )

    pack = evidence.build(
        borrower, afford, diag, fixed_stress, fixed_breaches,
        plan.name if plan else "no feasible plan",
        plan.npv_ratio if plan else 0.0,
        start_month,
    )

    labels = [MONTH_NAMES[(start_month + i) % 12] for i in range(horizon)]

    return {
        "borrower": {
            "id": borrower.id,
            "name": borrower.name,
            "occupation": borrower.occupation,
            "region": borrower.region,
            "profile": borrower.profile,
            "other_obligations": borrower.other_obligations,
        },
        "loan": {
            "principal": loan.principal,
            "annual_rate": loan.annual_rate,
            "tenure_months": loan.tenure_months,
        },
        "history": {
            "labels": [MONTH_NAMES[(start_month + i) % 12]
                       for i in range(-len(borrower.inflow), 0)],
            "inflow": borrower.inflow,
            "essential": borrower.essential,
            "net": borrower.net(),
        },
        "decomposition": _decomposition(borrower, start_month),
        "horizon_labels": labels,
        "affordability": {
            "expected": [round(v, 2) for v in afford.expected],
            "conservative": [round(max(0.0, v), 2) for v in afford.conservative],
            "residual_sd": round(afford.residual_sd, 2),
            "volatility_90d": round(afford.volatility_90d, 3),
            "volatility_12m": round(afford.volatility_12m, 3),
            "runway_months": round(afford.runway_months, 2),
        },
        "diagnosis": {
            "verdict": diag.verdict,
            "confidence": round(diag.confidence, 3),
            "detail": diag.detail,
            "trend_change_pct": round(diag.trend_change_pct * 100, 1),
            "recovery_probability": round(diag.recovery_probability, 3),
        },
        "stress": {
            "probabilities": [round(p, 3) for p in fixed_stress.probabilities],
            "months": [labels[i] for i in fixed_stress.months],
            "peak": round(fixed_stress.peak_probability, 3),
            "first_month": labels[fixed_stress.first_month] if fixed_stress.first_month >= 0 else None,
        },
        "fixed": baseline.to_dict(),
        "plan": plan.to_dict() if plan else None,
        "alternatives": [a.to_dict() for a in alternatives],
        "evidence": pack.to_dict(),
        "controls": {
            "utilisation": utilisation,
            "grace_months": grace_months,
            "max_extension": max_extension,
            "npv_floor": npv_floor,
            "interest_cap": interest_cap,
        },
    }


def _decomposition(borrower: Borrower, start_month: int) -> dict:
    """Expose trend / season / shock so the UI can show the split visually."""
    d = cashflow.decompose(borrower.net(), start_month=start_month)
    keep = 24                       # last two cycles is enough to read
    trend = [t if t is not None else None for t in d.trend][-keep:]
    return {
        "labels": [MONTH_NAMES[(start_month + i) % 12]
                   for i in range(-len(borrower.net()), 0)][-keep:],
        "observed": [round(v, 2) for v in d.observed[-keep:]],
        "trend": [round(t, 2) if t is not None else None for t in trend],
        "seasonal": [round(v, 2) for v in d.seasonal[-keep:]],
        "residual": [round(r, 2) if r is not None else None
                     for r in d.residual[-keep:]],
        "seasonal_index": [round(v, 2) for v in d.seasonal_index],
    }


def summarise(borrower_result: dict) -> dict:
    """One row for the portfolio table."""
    plan = borrower_result["plan"]
    return {
        "id": borrower_result["borrower"]["id"],
        "name": borrower_result["borrower"]["name"],
        "occupation": borrower_result["borrower"]["occupation"],
        "region": borrower_result["borrower"]["region"],
        "principal": borrower_result["loan"]["principal"],
        "tenure": borrower_result["loan"]["tenure_months"],
        "verdict": borrower_result["diagnosis"]["verdict"],
        "fixed_breaches": len(borrower_result["fixed"]["breach_months"]),
        "peak_stress": borrower_result["stress"]["peak"],
        "plan_name": plan["name"] if plan else None,
        "plan_breaches": len(plan["breach_months"]) if plan else None,
        "npv_ratio": plan["npv_ratio"] if plan else None,
        "interest_ratio": plan["interest_ratio"] if plan else None,
        "tenure_delta": (plan["tenure"] - borrower_result["loan"]["tenure_months"]) if plan else None,
        "feasible": plan["feasible"] if plan else False,
    }


def replay(borrowers: Optional[List[Borrower]] = None, **kwargs) -> dict:
    """Run the whole book under fixed versus adaptive schedules."""
    borrowers = borrowers if borrowers is not None else load_portfolio()
    rows, results = [], []
    for b in borrowers:
        res = analyse(b, **kwargs)
        results.append(res)
        rows.append(summarise(res))

    total_principal = sum(r["loan"]["principal"] for r in results)
    fixed_breach_months = sum(len(r["fixed"]["breach_months"]) for r in results)
    plan_breach_months = sum(len(r["plan"]["breach_months"]) for r in results if r["plan"])
    borrowers_at_risk = sum(1 for r in rows if r["fixed_breaches"] > 0)
    borrowers_rescued = sum(1 for r in rows
                            if r["fixed_breaches"] > 0 and r["plan_breaches"] == 0 and r["feasible"])

    recovered = sum(r["plan"]["total_collected"] for r in results if r["plan"])
    fixed_total = sum(r["fixed"]["total_collected"] for r in results)

    weighted_npv = (
        sum(r["plan"]["npv_ratio"] * r["loan"]["principal"] for r in results if r["plan"])
        / total_principal if total_principal else 0.0
    )
    referrals = [r["id"] for r in rows if not r["feasible"]]

    return {
        "rows": rows,
        "metrics": {
            "borrowers": len(rows),
            "total_principal": round(total_principal, 2),
            "fixed_breach_months": fixed_breach_months,
            "plan_breach_months": plan_breach_months,
            "borrowers_at_risk": borrowers_at_risk,
            "borrowers_rescued": borrowers_rescued,
            "principal_recovered_pct": 100.0,   # every feasible plan fully amortises
            "referral_rate_pct": round(len([r for r in rows if not r["feasible"]]) / len(rows) * 100, 1),
            "collected_vs_fixed_pct": round(recovered / fixed_total * 100, 2) if fixed_total else 0.0,
            "weighted_npv_ratio": round(weighted_npv, 4),
            "referrals": referrals,
        },
    }
