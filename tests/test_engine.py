"""Invariant tests for the CENTRIC engine.

These are the claims the deck makes. If one of them breaks, the claim is wrong,
not the test.

    python -m unittest discover -s tests -v
"""

import math
import unittest

from centric import optimizer, risk
from centric.cashflow import decompose, project
from centric.data import PROFILES, load_portfolio, emi, principal_for_emi
from centric.portfolio import analyse, replay


class TestData(unittest.TestCase):
    def test_portfolio_is_deterministic(self):
        a = load_portfolio()
        b = load_portfolio()
        self.assertEqual([x.inflow for x in a], [x.inflow for x in b])

    def test_seasonal_profiles_are_normalised(self):
        for name, prof in PROFILES.items():
            self.assertEqual(len(prof), 12, name)
            self.assertAlmostEqual(sum(prof) / 12, 1.0, delta=0.03, msg=name)

    def test_annuity_round_trips(self):
        p = principal_for_emi(3000.0, 0.02, 12)
        self.assertAlmostEqual(emi(p, 0.02, 12), 3000.0, places=4)


class TestCashflow(unittest.TestCase):
    def test_decomposition_reconstructs_the_series(self):
        series = [100 + 20 * math.sin(i * math.pi / 6) + (i % 3) for i in range(48)]
        d = decompose(series)
        for i, (obs, tr) in enumerate(zip(d.observed, d.trend)):
            if tr is not None:
                self.assertAlmostEqual(obs, tr + d.seasonal[i] + d.residual[i], places=6)

    def test_seasonal_index_is_centred(self):
        d = decompose([100 + 30 * math.sin(i * math.pi / 6) for i in range(48)])
        self.assertAlmostEqual(sum(d.seasonal_index) / 12, 0.0, places=6)

    def test_projection_tracks_a_known_cycle(self):
        series = [100 + 30 * math.sin(i * math.pi / 6) for i in range(48)]
        d = decompose(series)
        fc = project(d, 12, start_month=0)
        self.assertEqual(len(fc), 12)
        # A pure cycle should be forecast within a reasonable band of its amplitude.
        self.assertLess(max(fc) - min(fc), 90)
        self.assertGreater(max(fc) - min(fc), 30)


class TestOptimiser(unittest.TestCase):
    def setUp(self):
        self.results = [analyse(b) for b in load_portfolio()]

    def test_every_plan_fully_amortises(self):
        """The lender gets all of the principal back. No haircut, ever."""
        for r in self.results:
            plan = r["plan"]
            loan = r["loan"]
            balances = optimizer.amortise(
                loan["principal"], loan["annual_rate"] / 12.0, plan["payments"])
            self.assertAlmostEqual(balances[-1], 0.0, delta=1.0, msg=r["borrower"]["id"])
            self.assertGreaterEqual(plan["total_collected"], loan["principal"])

    def test_no_negative_payments(self):
        for r in self.results:
            for p in r["plan"]["payments"]:
                self.assertGreaterEqual(p, -1e-9, r["borrower"]["id"])

    def test_feasible_plans_never_breach_affordability(self):
        """The headline claim: a feasible plan is payable in every single month."""
        for r in self.results:
            if r["plan"]["feasible"]:
                self.assertEqual(r["plan"]["breach_months"], [], r["borrower"]["id"])

    def test_feasible_plans_hold_the_policy_band(self):
        for r in self.results:
            plan, ctl = r["plan"], r["controls"]
            if plan["feasible"]:
                self.assertGreaterEqual(plan["npv_ratio"], ctl["npv_floor"] - 1e-9)
                self.assertLessEqual(plan["interest_ratio"], ctl["interest_cap"] + 1e-9)

    def test_tenure_extension_respects_policy(self):
        for r in self.results:
            delta = r["plan"]["tenure"] - r["loan"]["tenure_months"]
            self.assertLessEqual(delta, r["controls"]["max_extension"])
            self.assertGreaterEqual(delta, 0)

    def test_infeasible_plans_are_flagged_not_hidden(self):
        """When the engine cannot help, it must say so rather than invent a plan."""
        for r in self.results:
            plan = r["plan"]
            if not plan["feasible"]:
                self.assertTrue(plan["note"], r["borrower"]["id"])

    def test_grace_period_defers_payment(self):
        borrower = load_portfolio()[1]
        plan = analyse(borrower, grace_months=2, interest_cap=2.0)["plan"]
        self.assertEqual(plan["payments"][0], 0.0)
        self.assertEqual(plan["payments"][1], 0.0)

    def test_looser_interest_cap_never_rescues_fewer(self):
        tight = replay(interest_cap=1.05)["metrics"]["borrowers_rescued"]
        loose = replay(interest_cap=1.50)["metrics"]["borrowers_rescued"]
        self.assertGreaterEqual(loose, tight)


class TestRisk(unittest.TestCase):
    def test_conservative_band_sits_below_expectation(self):
        b = load_portfolio()[0]
        a = risk.assess_affordability(b, 12)
        for exp, cons in zip(a.expected, a.conservative):
            self.assertLessEqual(cons, exp + 1e-9)

    def test_stress_probability_is_bounded(self):
        b = load_portfolio()[0]
        a = risk.assess_affordability(b, 12)
        sw = risk.stress_window(a, [9e9] * 12)      # absurd instalment
        self.assertTrue(all(0.0 <= p <= 1.0 for p in sw.probabilities))
        self.assertGreater(sw.peak_probability, 0.95)
        # With nothing to pay, only months whose expected surplus is already
        # negative should register as stressed.
        sw2 = risk.stress_window(a, [0.0] * 12)
        for i, p in enumerate(sw2.probabilities):
            if a.expected[i] > 0:
                self.assertLess(p, 0.5, f"month {i}")

    def test_seasonal_trough_is_not_called_a_decline(self):
        """The core requirement: a repeating dip must not read as deterioration."""
        for r in [analyse(b) for b in load_portfolio()]:
            if r["borrower"]["id"] in ("B008",):        # the one true decliner
                continue
            self.assertNotEqual(r["diagnosis"]["verdict"], "structural_decline",
                                f"{r['borrower']['id']} misread as declining")


class TestPortfolio(unittest.TestCase):
    def test_replay_beats_fixed_on_breaches(self):
        m = replay()["metrics"]
        self.assertLess(m["plan_breach_months"], m["fixed_breach_months"])

    def test_replay_shape(self):
        result = replay()
        self.assertEqual(len(result["rows"]), 12)
        for key in ("borrowers", "weighted_npv_ratio", "referrals"):
            self.assertIn(key, result["metrics"])


if __name__ == "__main__":
    unittest.main()
