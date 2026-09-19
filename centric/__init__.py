"""CENTRIC — adaptive cash-flow repayment intelligence.

A dependency-free reference implementation of the engine described in the
CENTRIC product brief: read a borrower's real cash flow, work out what they can
actually pay each month, and reshape the instalment schedule to fit — without
changing what the lender recovers.
"""

__version__ = "0.1.0"

from .data import load_portfolio, get_borrower, Borrower, Loan   # noqa: F401
from .portfolio import analyse, replay, summarise                 # noqa: F401
