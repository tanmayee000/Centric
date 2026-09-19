# CENTRIC — Adaptive Cash-Flow Repayment Intelligence

**▶ [Open the live prototype](https://tanmayee000.github.io/Centric/centric-console.html)** — runs in your browser, nothing to install.

**Team Cipher** . Tanmayee, Shourya, Gitesh, Aryaman, Kshiti

A working reference implementation of the CENTRIC repayment engine: read a
borrower's real cash flow, work out what they can actually pay each month, and
reshape the instalment schedule to fit — without changing what the lender
recovers.

> Microfinance borrowers earn irregularly but repay on fixed schedules. A missed
> EMI is usually a timing failure, not a character failure. This repository is the
> part of CENTRIC that fixes the timing.

---

## Run it

No dependencies. No build step. Python 3.9 or newer.

```bash
git clone https://github.com/tanmayee000/Centric.git
cd Centric

python -m centric.server          # lender console at http://127.0.0.1:8000
python -m centric.cli replay      # whole book, fixed EMI vs adaptive
python -m centric.cli borrower B006
python -m centric.cli policy      # how outcomes move with the policy dials
python -m unittest discover -s tests -v
```

Everything runs on the standard library. That is deliberate: a judge, a
teammate or a lender's IT team can clone this and have it running in ten
seconds, on any machine, offline.

---

## What it actually does

```
  SOURCES            CASH-FLOW MODEL        DECISION ENGINE       SURFACES
  inflows        →   trend / season /   →   affordability band →  lender console
  outflows           shock separation       stress probability    evidence pack
  repayments         volatility, runway     plan optimiser        audit trail
```

### 1. Separate trend, season and shock — `centric/cashflow.py`
Classical additive decomposition over four years of history. A harvest gap and a
failing business look identical in raw numbers; they look nothing alike once
seasonality is removed. The seasonal index is centred, so a profile changes the
*shape* of a borrower's year, never its level.

### 2. Decide what is affordable — `centric/risk.py`
```
affordable(t) = forecast inflow(t) − forecast essentials(t) − prior obligations
                − 0.6745 × σ            ← the P25 band
```
We commit to the 25th percentile, not the mean. Underwriting off an average is
precisely how a seasonal borrower ends up in default.

### 3. Tell a dip apart from a decline — `centric/risk.py::diagnose`
The deseasonalised level of the last quarter is compared against the prior nine
months, and the gap is measured **against that borrower's own noise**
(`t < −2.2`), not against a fixed percentage. A drop only counts as structural
if it is large, statistically real, and not about to be undone by seasonality.
This is the requirement the problem statement calls out explicitly, and it is
the one most easily faked.

### 4. Search for a schedule — `centric/optimizer.py`
Four plan shapes — cash-flow matched, front-loaded, step-up, level-capped —
each solved by bisection on a uniform scale against per-month affordability
caps, at every permitted tenure. Hard constraints:

| Constraint | Default | Why |
|---|---|---|
| Full amortisation | always | the lender gets **all** the principal back |
| Instalment ≤ affordable | 90% utilisation | never claim the borrower's last rupee |
| NPV vs contract | ≥ 95% | the lender's economics must survive |
| Interest vs contract | ≤ 108% | relief must not quietly gouge the borrower |
| Tenure extension | ≤ 6 months | policy limit |

Ranking is `(breaches, tenure, −NPV, smoothness)`. Breaches first, because a
plan the borrower cannot meet is not a plan. Tenure before NPV, because
extending a 24% loan is not free to the borrower even when it flatters the
lender's discounted return.

**If no shape satisfies the constraints, the engine refuses and refers the case
to a human.** It does not invent a plan.

### 5. Prove it — `centric/evidence.py`
Every recommendation ships weighted factor attributions, the months that were
flagged, the source a human can go and check, and a counterfactual ("what if
inflow falls another 20%").

---

## Result on the bundled book

```
Breach-months, fixed EMI   27
Breach-months, CENTRIC      0
Borrowers at risk           7
Rescued inside policy       6
Principal recovered       100%
Weighted NPV vs contract 100.36%
Referred to a human        B010
```

Note the last line. One borrower cannot be rescued without breaching the
interest cap, and the engine says so instead of hiding it. That is the feature,
not a shortfall.

### The policy dials are the honest part

`python -m centric.cli policy` sweeps the interest cap:

| Interest cap | Rescued | Referred |
|---|---|---|
| 1.05 | 4 | 3 |
| 1.08 | 6 | 1 |
| 1.30 | 7 | 0 |

Raising the cap rescues more borrowers and charges them more interest. That
trade-off is a **policy decision, not a model output**, so it is exposed as a
slider in the console rather than buried in a constant.

---

## Lender console

`python -m centric.server` → portfolio table with diagnoses and breach counts,
a per-borrower drill-down (cash-flow chart, month-by-month schedule, stress
probability), the full evidence pack, and five live policy dials that re-run the
whole book on every change. Hand-drawn SVG, no chart library.

---

## Layout

```
centric/
  data.py         synthetic book: seasonal archetypes, loans sized off real surplus
  cashflow.py     decomposition, volatility, liquidity runway, forecasting
  risk.py         affordability band, stress windows, dip-vs-decline diagnosis
  optimizer.py    schedule shapes, amortisation, NPV, constrained search
  evidence.py     attributions, sources, counterfactuals
  portfolio.py    one borrower end to end; whole-book replay
  server.py       stdlib HTTP API + static serving
  cli.py          replay / borrower / policy / list
web/              lender console (vanilla JS, no build)
tests/            19 invariant tests
```

## API

| Endpoint | Returns |
|---|---|
| `GET /api/health` | liveness |
| `GET /api/portfolio` | every borrower, plus book-level metrics |
| `GET /api/borrower/<id>` | full analysis, plan, alternatives, evidence |

All accept `utilisation`, `grace`, `max_extension`, `npv_floor`, `interest_cap`.

---



## Next

- Account Aggregator sandbox adapter behind the `data` interface
- Interest-freeze relief mode as a policy option
- The consumer-side modules from the product brief (Ask CENTRIC, scam detector,
  earning engine) reading from the same cash-flow core
- Persistence and an officer decision log, so overrides become training signal

## Licence
 see `LICENSE`.
