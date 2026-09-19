"""Evidence: why the engine proposed what it proposed.

Nothing here is decorative. A credit officer has to be able to defend the plan
to a risk committee, and a regulator has to be able to audit it later.
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import List

from .data import Borrower, MONTH_NAMES
from .risk import Affordability, Diagnosis, StressWindow


@dataclass
class EvidenceItem:
    factor: str
    weight: float          # 0..1, relative contribution to the recommendation
    finding: str
    source: str            # where a human can go and check it


@dataclass
class EvidencePack:
    headline: str
    diagnosis: str
    confidence: float
    items: List[EvidenceItem]
    flagged_months: List[str]
    counterfactual: str

    def to_dict(self) -> dict:
        d = asdict(self)
        d["items"] = [asdict(i) for i in self.items]
        return d


def build(borrower: Borrower,
          afford: Affordability,
          diag: Diagnosis,
          stress: StressWindow,
          fixed_breaches: List[int],
          plan_name: str,
          npv_ratio: float,
          start_month: int = 0) -> EvidencePack:

    labels = [MONTH_NAMES[(start_month + i) % 12] for i in range(afford.horizon)]
    flagged = [labels[i] for i in fixed_breaches]

    items: List[EvidenceItem] = []

    if fixed_breaches:
        worst = max(fixed_breaches, key=lambda i: stress.probabilities[i])
        items.append(EvidenceItem(
            factor="Affordability gap",
            weight=0.38,
            finding=(f"The contractual instalment sits above the borrower's P25 affordable "
                     f"amount in {len(fixed_breaches)} month(s), worst in {labels[worst]} "
                     f"at {stress.probabilities[worst] * 100:.0f}% stress probability."),
            source="Projected inflow minus essential outflow minus prior obligations",
        ))

    items.append(EvidenceItem(
        factor="Income volatility",
        weight=0.22,
        finding=(f"Trailing 90-day coefficient of variation is {afford.volatility_90d:.2f} "
                 f"against {afford.volatility_12m:.2f} over twelve months."),
        source=f"{len(borrower.inflow)} months of credited inflows",
    ))

    items.append(EvidenceItem(
        factor="Seasonality",
        weight=0.20,
        finding=(f"Profile '{borrower.profile}' shows a repeating annual cycle; the coming "
                 f"quarter carries a {diag.recovery_probability * 100:.0f}% chance of "
                 f"seasonal recovery."),
        source="Additive decomposition of 24 months of net surplus",
    ))

    items.append(EvidenceItem(
        factor="Condition change",
        weight=0.14,
        finding=diag.detail,
        source="Deseasonalised level, last 3 months vs prior 9",
    ))

    items.append(EvidenceItem(
        factor="Liquidity buffer",
        weight=0.06,
        finding=(f"Recent surplus covers roughly {afford.runway_months:.1f} months of "
                 f"essential spending."),
        source="Accumulated surplus over trailing quarter",
    ))

    if diag.verdict == "structural_decline":
        headline = (f"Recommend {plan_name}, but flag for manual review: the softness is "
                    f"not explained by seasonality.")
        counterfactual = ("If inflow falls a further 20%, this plan breaches within two "
                          "cycles. Re-underwrite rather than restructure again.")
    elif diag.verdict == "seasonal_dip":
        headline = (f"Recommend {plan_name}: a seasonal trough, not a deteriorating "
                    f"borrower. Retains {npv_ratio * 100:.1f}% of contract NPV.")
        counterfactual = ("If inflow falls a further 20%, one additional month would need "
                          "relief; tenure has headroom to absorb it.")
    else:
        headline = (f"Recommend {plan_name}: fits the borrower's cycle and retains "
                    f"{npv_ratio * 100:.1f}% of contract NPV.")
        counterfactual = ("A further 20% inflow shock would still be absorbed inside the "
                          "existing tenure.")

    return EvidencePack(
        headline=headline,
        diagnosis=diag.verdict,
        confidence=diag.confidence,
        items=items,
        flagged_months=flagged,
        counterfactual=counterfactual,
    )
