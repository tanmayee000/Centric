"""Command line interface.

    python -m centric.cli replay
    python -m centric.cli borrower B003
    python -m centric.cli policy
"""

from __future__ import annotations

import argparse
import json
import sys

from . import optimizer
from .data import get_borrower, load_portfolio
from .portfolio import analyse, replay

RUPEE = "\u20b9"


def money(x: float) -> str:
    return f"{RUPEE}{x:,.0f}"


def cmd_replay(args) -> int:
    result = replay(
        utilisation=args.utilisation,
        grace_months=args.grace,
        max_extension=args.max_extension,
        npv_floor=args.npv_floor,
        interest_cap=args.interest_cap,
    )
    rows, m = result["rows"], result["metrics"]

    head = (f"{'ID':<5}{'BORROWER':<17}{'PROFILE':<12}{'DIAGNOSIS':<20}"
            f"{'FIXED':>6}{'PLAN':>6}  {'RECOMMENDED PLAN':<24}{'NPV':>7}{'INT':>7}")
    print("\nPORTFOLIO REPLAY  —  fixed EMI vs CENTRIC adaptive schedule")
    print("=" * len(head))
    print(head)
    print("-" * len(head))
    for r in rows:
        flag = "" if r["feasible"] else "  ⚑ refer"
        print(f"{r['id']:<5}{r['name']:<17}{r['occupation'][:11]:<12}"
              f"{r['verdict']:<20}{r['fixed_breaches']:>6}{r['plan_breaches']:>6}  "
              f"{(r['plan_name'] or '-')[:23]:<24}"
              f"{r['npv_ratio']:>7.3f}{(r.get('interest_ratio') or 0):>7.3f}{flag}")
    print("-" * len(head))

    print(f"\n  Borrowers                 {m['borrowers']}")
    print(f"  Principal under management {money(m['total_principal'])}")
    print(f"  Breach-months, fixed EMI   {m['fixed_breach_months']}")
    print(f"  Breach-months, CENTRIC     {m['plan_breach_months']}")
    print(f"  Borrowers at risk          {m['borrowers_at_risk']}")
    print(f"  Rescued inside policy      {m['borrowers_rescued']}")
    print(f"  Principal recovered        {m['principal_recovered_pct']:.0f}%")
    print(f"  Weighted NPV vs contract   {m['weighted_npv_ratio'] * 100:.2f}%")
    print(f"  Referred to a human        {', '.join(m['referrals']) or 'none'}"
          f"  ({m['referral_rate_pct']}%)\n")
    return 0


def cmd_borrower(args) -> int:
    try:
        borrower = get_borrower(args.id)
    except KeyError as exc:
        print(exc, file=sys.stderr)
        return 1

    r = analyse(
        borrower,
        utilisation=args.utilisation,
        grace_months=args.grace,
        max_extension=args.max_extension,
        npv_floor=args.npv_floor,
        interest_cap=args.interest_cap,
    )
    if args.json:
        print(json.dumps(r, indent=2))
        return 0

    b, loan, plan, fixed = r["borrower"], r["loan"], r["plan"], r["fixed"]
    print(f"\n{b['name']}  ({b['id']})  —  {b['occupation']}, {b['region']}")
    print(f"Loan: {money(loan['principal'])} at {loan['annual_rate'] * 100:.0f}% "
          f"over {loan['tenure_months']} months\n")

    d = r["diagnosis"]
    print(f"DIAGNOSIS  {d['verdict'].upper()}   (confidence {d['confidence']:.0%})")
    print(f"  {d['detail']}")
    print(f"  Deseasonalised change {d['trend_change_pct']:+.1f}%  ·  "
          f"seasonal recovery probability {d['recovery_probability']:.0%}\n")

    labels = r["horizon_labels"]
    afford = r["affordability"]["conservative"]
    print(f"{'MONTH':<7}{'AFFORDABLE':>12}{'FIXED EMI':>12}{'CENTRIC':>12}   FLAG")
    print("-" * 56)
    for i, label in enumerate(labels[:plan["tenure"]]):
        f_pay = fixed["payments"][i] if i < len(fixed["payments"]) else 0.0
        p_pay = plan["payments"][i] if i < len(plan["payments"]) else 0.0
        flag = "BREACH" if i in fixed["breach_months"] else ""
        print(f"{label:<7}{money(afford[i]):>12}{money(f_pay):>12}{money(p_pay):>12}   {flag}")
    print("-" * 56)

    print(f"\nRECOMMENDATION  {plan['name']}")
    print(f"  {plan['note']}")
    print(f"  Breach-months   {len(fixed['breach_months'])} → {len(plan['breach_months'])}")
    print(f"  Tenure          {loan['tenure_months']} → {plan['tenure']} months")
    print(f"  Collected       {money(fixed['total_collected'])} → {money(plan['total_collected'])}")
    print(f"  NPV vs contract {plan['npv_ratio'] * 100:.2f}%")
    print(f"  Interest        {plan['interest_ratio'] * 100:.1f}% of contracted")

    ev = r["evidence"]
    print(f"\nEVIDENCE")
    print(f"  {ev['headline']}")
    for item in ev["items"]:
        print(f"   · [{item['weight']:.2f}] {item['factor']}: {item['finding']}")
        print(f"          source: {item['source']}")
    print(f"  Counterfactual: {ev['counterfactual']}\n")
    return 0


def cmd_policy(args) -> int:
    """Show how the recommendation set moves as the policy dials move."""
    print("\nPOLICY SENSITIVITY — how many borrowers can be rescued inside policy\n")
    print(f"{'INTEREST CAP':>13}{'RESCUED':>9}{'REFERRED':>10}{'NPV':>9}   REFERRALS")
    print("-" * 60)
    for cap in (1.00, 1.05, 1.08, 1.15, 1.30, 1.50):
        m = replay(interest_cap=cap)["metrics"]
        print(f"{cap:>13.2f}{m['borrowers_rescued']:>9}"
              f"{len(m['referrals']):>10}{m['weighted_npv_ratio']:>9.4f}   "
              f"{', '.join(m['referrals']) or '-'}")
    print("\nRaising the cap rescues more borrowers but charges them more interest.")
    print("That trade-off is a policy decision, not a model output.\n")
    return 0


def build_parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(prog="centric", description="CENTRIC repayment engine")
    sub = ap.add_subparsers(dest="command", required=True)

    def add_controls(p):
        p.add_argument("--utilisation", type=float, default=optimizer.DEFAULT_UTILISATION,
                       help="share of affordable surplus we are willing to claim")
        p.add_argument("--grace", type=int, default=0, help="months of zero payment up front")
        p.add_argument("--max-extension", dest="max_extension", type=int,
                       default=optimizer.DEFAULT_MAX_EXTENSION)
        p.add_argument("--npv-floor", dest="npv_floor", type=float,
                       default=optimizer.DEFAULT_NPV_FLOOR)
        p.add_argument("--interest-cap", dest="interest_cap", type=float,
                       default=optimizer.DEFAULT_INTEREST_CAP)

    p_replay = sub.add_parser("replay", help="run the whole book, fixed vs adaptive")
    add_controls(p_replay)
    p_replay.set_defaults(func=cmd_replay)

    p_b = sub.add_parser("borrower", help="drill into one borrower")
    p_b.add_argument("id", nargs="?", default="B003")
    p_b.add_argument("--json", action="store_true", help="dump the full analysis as JSON")
    add_controls(p_b)
    p_b.set_defaults(func=cmd_borrower)

    p_p = sub.add_parser("policy", help="policy dial sensitivity")
    p_p.set_defaults(func=cmd_policy)

    p_l = sub.add_parser("list", help="list borrower ids")
    p_l.set_defaults(func=lambda a: ([print(f"{b.id}  {b.name} — {b.occupation}")
                                      for b in load_portfolio()], 0)[1])
    return ap


def main(argv=None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
