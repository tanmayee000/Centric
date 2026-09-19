"""Synthetic but structurally realistic microfinance book.

Everything is generated from a fixed seed so a demo is reproducible. Swap
`load_portfolio()` for a database read and the rest of the engine is unchanged.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass, field, asdict
from typing import List

HISTORY_MONTHS = 48
MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


@dataclass
class Loan:
    principal: float          # outstanding principal, rupees
    annual_rate: float        # contractual interest, e.g. 0.24 for 24%
    tenure_months: int        # months remaining on the contract

    @property
    def monthly_rate(self) -> float:
        return self.annual_rate / 12.0


@dataclass
class Borrower:
    id: str
    name: str
    occupation: str
    region: str
    profile: str                       # seasonality archetype
    inflow: List[float] = field(default_factory=list)      # 24 months of income
    essential: List[float] = field(default_factory=list)   # 24 months of essentials
    other_obligations: float = 0.0     # other EMIs / committed outflow per month
    loan: Loan = None

    def net(self) -> List[float]:
        """Surplus available for debt service, before this loan."""
        return [i - e - self.other_obligations for i, e in zip(self.inflow, self.essential)]

    def to_dict(self) -> dict:
        d = asdict(self)
        d["loan"] = asdict(self.loan)
        return d


# --- seasonality archetypes -------------------------------------------------
# Multipliers indexed by calendar month (0 = Jan). Mean of each is ~1.0.

PROFILES = {
    # Harvest income: two peaks, a long lean stretch before the kharif harvest.
    "agri": [0.86, 0.78, 1.04, 0.74, 0.66, 0.62, 0.72, 0.90, 1.16, 1.44, 1.36, 1.04],
    # Retail: festive quarter carries the year.
    "shop": [0.85, 0.82, 0.92, 0.88, 0.90, 0.85, 0.88, 1.05, 1.25, 1.45, 1.20, 0.95],
    # Daily wage: monsoon stops work.
    "wage": [1.06, 1.08, 1.10, 1.02, 0.96, 0.78, 0.72, 0.78, 0.92, 1.10, 1.16, 1.12],
    # Services: mild wedding-season lift, otherwise flat.
    "service": [0.95, 1.05, 1.02, 0.98, 1.00, 0.92, 0.90, 0.95, 1.02, 1.08, 1.12, 1.01],
    # Salaried with a bonus month.
    "salaried": [1.0, 1.0, 1.35, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.05, 1.0, 1.0],
}

# Force every archetype to average 1.0 so the profile changes the *shape* of the
# year, never its level. Otherwise editing a profile silently rescales income.
PROFILES = {k: [m * 12 / sum(v) for m in v] for k, v in PROFILES.items()}

_SEED_BOOK = [
    # id,   name,              occupation,           region,          profile,   base,  essentials, rate, tenure, load, trend
    # `load` = instalment as a share of mean monthly surplus. Underwriting sizes
    # the loan off the average, which is exactly why seasonal borrowers break.
    ("B001", "Lakshmi Devi",   "Smallholder farmer", "Warangal, TS",   "agri",    18000, 11000, 0.24, 14, 0.46,  0.000),
    ("B002", "Ramesh Kumar",   "Kirana shop owner",  "Nagpur, MH",     "shop",    26000, 15500, 0.22, 16, 0.52,  0.002),
    ("B003", "Sunita Bai",     "Construction labour", "Bhopal, MP",    "wage",    15000, 10000, 0.26, 12, 0.52,  0.000),
    ("B004", "Imran Sheikh",   "Auto driver",        "Hyderabad, TS",  "service", 21000, 13500, 0.24, 18, 0.50,  0.000),
    ("B005", "Meena Kumari",   "Tailoring unit",     "Surat, GJ",      "shop",    24000, 14000, 0.22, 15, 0.48,  0.003),
    ("B006", "Govind Patil",   "Dairy + crop",       "Kolhapur, MH",   "agri",    20000, 12500, 0.23, 20, 0.48,  0.000),
    ("B007", "Anjali Barman",  "Beauty parlour",     "Guwahati, AS",   "service", 19000, 12000, 0.25, 12, 0.42,  0.001),
    ("B008", "Salim Ansari",   "Loom operator",      "Bhiwandi, MH",   "wage",    17000, 11500, 0.26, 14, 0.50, -0.005),
    ("B009", "Kavitha Rao",    "School van driver",  "Vijayawada, AP", "service", 22000, 13000, 0.23, 16, 0.45,  0.000),
    ("B010", "Deepak Yadav",   "Vegetable vendor",   "Kanpur, UP",     "shop",    16500, 10500, 0.27, 10, 0.48,  0.000),
    ("B011", "Fatima Bi",      "Home catering",      "Lucknow, UP",    "service", 20000, 12500, 0.24, 18, 0.44,  0.002),
    ("B012", "Naresh Meena",   "Mason",              "Jaipur, RJ",     "wage",    18500, 12000, 0.25, 13, 0.57,  0.000),
]


def _generate(seed_row, rng: random.Random) -> Borrower:
    (bid, name, occupation, region, profile, base, essentials,
     rate, tenure, load, trend) = seed_row
    INFLATION = 1.0018   # applies to both sides, so it is not mistaken for decline

    season = PROFILES[profile]
    inflow, essential = [], []
    for t in range(HISTORY_MONTHS):
        month = t % 12
        drift = ((1.0 + trend) * INFLATION) ** t         # slow structural move
        noise = rng.gauss(1.0, 0.05)                     # month-to-month shocks
        inflow.append(round(base * season[month] * drift * noise, -1))
        # Essentials are stickier than income and creep with inflation.
        e_noise = rng.gauss(1.0, 0.03)
        essential.append(round(essentials * (INFLATION ** t) * e_noise, -1))

    obligations = round(rng.uniform(0.0, 1500.0), -1)
    recent = list(zip(inflow[-12:], essential[-12:]))
    mean_surplus = sum(i - e for i, e in recent) / len(recent) - obligations
    target_emi = max(500.0, load * mean_surplus)
    principal = principal_for_emi(target_emi, rate / 12.0, tenure)

    return Borrower(
        id=bid, name=name, occupation=occupation, region=region, profile=profile,
        inflow=inflow, essential=essential,
        other_obligations=obligations,
        loan=Loan(principal=round(principal, -2), annual_rate=rate, tenure_months=tenure),
    )


def load_portfolio(seed: int = 20260917) -> List[Borrower]:
    """Return the demo book. Deterministic for a given seed."""
    rng = random.Random(seed)
    return [_generate(row, rng) for row in _SEED_BOOK]


def get_borrower(borrower_id: str, seed: int = 20260917) -> Borrower:
    for b in load_portfolio(seed):
        if b.id == borrower_id:
            return b
    raise KeyError(f"no such borrower: {borrower_id}")


def future_month_labels(n: int, start_index: int = 0) -> List[str]:
    return [MONTH_NAMES[(start_index + i) % 12] for i in range(n)]


def emi(principal: float, monthly_rate: float, n: int) -> float:
    """Standard annuity instalment."""
    if n <= 0:
        return 0.0
    if monthly_rate <= 0:
        return principal / n
    f = (1 + monthly_rate) ** n
    return principal * monthly_rate * f / (f - 1)


def principal_for_emi(instalment: float, monthly_rate: float, n: int) -> float:
    """Inverse annuity: what principal produces this instalment?"""
    if n <= 0:
        return 0.0
    if monthly_rate <= 0:
        return instalment * n
    return instalment * (1 - (1 + monthly_rate) ** -n) / monthly_rate


def round_to(x: float, step: int = 10) -> float:
    return float(int(math.floor(x / step + 0.5)) * step)
