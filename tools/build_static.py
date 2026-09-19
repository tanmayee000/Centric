#!/usr/bin/env python3
"""Build a single self-contained HTML console.

Runs the engine across a grid of policy settings, embeds the results, and
inlines every stylesheet and script into one file that opens with a double
click — no Python, no server, no network.

    python3 tools/build_static.py
    -> centric-console.html
"""

from __future__ import annotations

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, ROOT)

from centric import load_portfolio                      # noqa: E402
from centric.portfolio import analyse, replay           # noqa: E402

WEB = os.path.join(ROOT, "web")
OUT = os.path.join(ROOT, "centric-console.html")

# The two dials worth exploring without a server.
CAPS = [1.00, 1.05, 1.08, 1.15, 1.30, 1.50]
GRACES = [0, 1, 2, 3]
DEFAULTS = {"utilisation": 0.9, "max_extension": 6, "npv_floor": 0.95}


def read(name: str) -> str:
    with open(os.path.join(WEB, name), encoding="utf-8") as fh:
        return fh.read()


def build_books() -> dict:
    borrowers = load_portfolio()
    books = {}
    total = len(CAPS) * len(GRACES)
    done = 0
    for cap in CAPS:
        for grace in GRACES:
            kw = dict(DEFAULTS, interest_cap=cap, grace_months=grace)
            book = replay(borrowers, **kw)
            book["borrowers"] = {b.id: analyse(b, **kw) for b in borrowers}
            books[f"{cap:.2f}|{grace}"] = book
            done += 1
            print(f"  [{done:>2}/{total}] cap={cap:.2f} grace={grace}m", flush=True)
    return books


STATIC_APP = r"""
/* Static router. Same views, but reading a baked-in snapshot instead of an API. */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const State = {
  view: "landing",
  borrower: null,
  step: 0,
  demoId: "B006",
  pages: { about: 0, how: 0, modules: 0, invest: 0 },
  domain: "",
  earn: "student",
  dials: { utilisation: 0.9, max_extension: 6, grace: 0, interest_cap: 1.08, npv_floor: 0.95 },
};

const TITLES = {
  landing:   ["CENTRIC", "Money that moves with you"],
  about:     ["What is <em>CENTRIC</em>?", "Money that moves with you"],
  learn:     ["Micro-<em>lessons</em>", "How money works, in five minutes at a time"],
  invest:    ["<em>Investing</em>, from zero", "The order of operations, and what the options are"],
  earn:      ["Earn <em>more</em>", "Because you cannot save your way out of a shortfall"],
  overview:  ["The <em>overview</em>", "What the engine achieves on the demo book"],
  demo:      ["Guided <em>demo</em>", "One borrower, five steps, start to finish"],
  how:       ["How it <em>works</em>", "From consented transactions to a defensible schedule"],
  modules:   ["What it <em>does</em>", "One engine, eight modules, two audiences"],
  portfolio: ["Loan <em>book</em>", "Twelve borrowers replayed under both schedules"],
  lab:       ["Policy <em>lab</em>", "The dials a lender controls, and what they cost"],
  borrower:  ["Borrower <em>detail</em>", "Cash flow, diagnosis, plan and evidence"],
};

const nearest = (v, list) =>
  list.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));

function book() {
  const cap = nearest(State.dials.interest_cap, DATA.caps);
  const grace = nearest(State.dials.grace, DATA.graces);
  return DATA.books[cap.toFixed(2) + "|" + grace];
}

function enrich(data) {
  const m = data.metrics;
  const count = (v) => data.rows.filter((r) => r.verdict === v).length;
  m.__total = data.rows.length;
  m.__mix = [
    { value: count("stable"), color: "#6fd6a4" },
    { value: count("seasonal_dip"), color: "#e6b87a" },
    { value: count("structural_decline"), color: "#e8798a" },
  ].filter((s) => s.value > 0);
  m.__bars = data.rows
    .filter((r) => r.fixed_breaches > 0)
    .sort((a, b) => b.fixed_breaches - a.fixed_breaches)
    .map((r) => ({ label: r.name.split(" ")[0], before: r.fixed_breaches, after: r.plan_breaches }));
  return data;
}

function wirePages() {
  $$(".pg-next").forEach((b) => b.onclick = () => { State.pages[b.dataset.key]++; render(); });
  $$(".pg-prev").forEach((b) => b.onclick = () => {
    State.pages[b.dataset.key] = Math.max(0, State.pages[b.dataset.key] - 1); render(); });
  $$("[data-pgdot]").forEach((d) => d.onclick = () => {
    State.pages[d.dataset.pgdot] = +d.dataset.step; render(); });
}
function wireLearn() {
  $$("[data-domain]").forEach((el) => el.onclick = () => { State.domain = el.dataset.domain; render(); });
}
function wireEarn() {
  $$("[data-earn]").forEach((el) => el.onclick = () => { State.earn = el.dataset.earn; render(); });
}
function wireChat() {
  const box = $("#chat");
  if (!box || !window.__chat) return;
  $$("#chat-qs .chip").forEach((btn) => {
    btn.onclick = () => {
      const item = window.__chat[+btn.dataset.q];
      box.insertAdjacentHTML("beforeend", `<div class="bubble me">${item.q}</div>`);
      box.scrollTop = box.scrollHeight;
      const wait = document.createElement("div");
      wait.className = "bubble bot typing";
      wait.textContent = "thinking\u2026";
      box.appendChild(wait);
      box.scrollTop = box.scrollHeight;
      setTimeout(() => { wait.classList.remove("typing"); wait.innerHTML = item.a;
                         box.scrollTop = box.scrollHeight; }, 420);
      btn.classList.add("on");
    };
  });
}

function wireDemo() {
  const next = $("#demo-next"), prev = $("#demo-prev");
  if (next) next.onclick = () => { State.step++; render(); };
  if (prev) prev.onclick = () => { State.step = Math.max(0, State.step - 1); render(); };
  $$(".dot-step").forEach((d) => { d.onclick = () => { State.step = +d.dataset.step; render(); }; });
}

function setChrome() {
  document.body.classList.toggle("landing-mode", State.view === "landing");
  const [t, s] = TITLES[State.view] || TITLES.about;
  $("#page-title").innerHTML = t;
  $("#page-sub").textContent = s;
  $$("#nav li").forEach((li) => li.classList.toggle("active", li.dataset.view === State.view));
  $$("#quick-tabs button").forEach((b) => b.classList.toggle("on", b.dataset.view === State.view));
}

function sweep() {
  const grace = nearest(State.dials.grace, DATA.graces);
  return DATA.caps.map((cap) => {
    const m = DATA.books[cap.toFixed(2) + "|" + grace].metrics;
    return { cap, rescued: m.borrowers_rescued, referred: m.referrals.length,
             npv: m.weighted_npv_ratio };
  });
}

const DIAL_FMT = {
  utilisation: (v) => Math.round(v * 100) + "%",
  max_extension: (v) => v + "m",
  grace: (v) => v + "m",
  interest_cap: (v) => Math.round(v * 100) + "%",
  npv_floor: (v) => Math.round(v * 100) + "%",
};
const LIVE = ["interest_cap", "grace"];

function wireDials() {
  Object.keys(State.dials).forEach((id) => {
    const el = $("#" + id);
    if (!el) return;
    const out = $("#" + id + "-out");
    const live = LIVE.includes(id);
    if (!live) {
      el.disabled = true;
      el.closest(".dial").style.opacity = ".45";
      el.closest(".dial").title = "Baked at its default in the offline build — "
        + "run the Python engine to explore this dial.";
    }
    const paint = () => { out.textContent = DIAL_FMT[id](+el.value); };
    paint();
    let t;
    el.addEventListener("input", () => {
      State.dials[id] = +el.value;
      paint();
      clearTimeout(t);
      t = setTimeout(() => render(true), 160);
    });
  });
}

function wireChartHover() {
  const box = $("#chartbox");
  if (!box || !window.__chartData) return;
  const { labels, afford, fx, pl, geom } = window.__chartData;
  const svg = box.querySelector("svg");
  const rail = svg.querySelector(".rail"), dot = svg.querySelector(".raildot");
  const tip = $("#tooltip");
  const hide = () => { tip.hidden = true; rail.setAttribute("opacity", "0");
                       dot.setAttribute("opacity", "0"); };
  $$(".hit", svg).forEach((hit) => {
    hit.addEventListener("mouseenter", () => {
      const i = +hit.dataset.i, cx = geom.x(i), cy = geom.y(pl[i]);
      rail.setAttribute("x1", cx); rail.setAttribute("x2", cx);
      rail.setAttribute("opacity", ".55");
      dot.setAttribute("cx", cx); dot.setAttribute("cy", cy);
      dot.setAttribute("opacity", "1");
      const over = fx[i] > afford[i];
      tip.innerHTML = `<div class="tt-h">${labels[i]}</div>
        <div class="tt-r"><span class="muted">Affordable</span><b>${Chart.money(afford[i])}</b></div>
        <div class="tt-r"><span class="muted">Contracted</span>
          <b style="color:${over ? "#e8798a" : "#f2ecef"}">${Chart.money(fx[i])}</b></div>
        <div class="tt-r"><span class="muted">CENTRIC</span>
          <b style="color:#d9a7c7">${Chart.money(pl[i])}</b></div>
        ${over ? '<div class="tt-r" style="margin-top:6px;color:#e8798a">EMI exceeds available cash</div>' : ""}`;
      tip.hidden = false;
    });
    hit.addEventListener("mousemove", (e) => {
      const pad = 16; let x = e.clientX + pad, y = e.clientY + pad;
      const r = tip.getBoundingClientRect();
      if (x + r.width > innerWidth - 8) x = e.clientX - r.width - pad;
      if (y + r.height > innerHeight - 8) y = e.clientY - r.height - pad;
      tip.style.left = x + "px"; tip.style.top = y + "px";
    });
  });
  box.addEventListener("mouseleave", hide);
}

function render(keepScroll) {
  const host = $("#view");
  setChrome();
  if (!keepScroll) window.scrollTo({ top: 0 });
  const b = book();

  if (State.view === "landing") { host.innerHTML = Views.landing(); return; }
  if (State.view === "about") { host.innerHTML = Views.about(State.pages.about); wirePages(); return; }
  if (State.view === "how") { host.innerHTML = Views.how(State.pages.how); wirePages(); return; }
  if (State.view === "learn") { host.innerHTML = Views.learn(State.domain); wireLearn(); return; }
  if (State.view === "invest") { host.innerHTML = Views.invest(State.pages.invest); wirePages(); return; }
  if (State.view === "earn") { host.innerHTML = Views.earn(State.earn); wireEarn(); return; }
  if (State.view === "modules") { host.innerHTML = Views.modules(State.pages.modules); wirePages(); return; }

  if (State.view === "demo") {
    State.step = Math.max(0, Math.min(State.step, Views.DEMO_STEPS.length - 1));
    host.innerHTML = Views.demo(b.borrowers[State.demoId], State.step);
    wireDemo();
    return;
  }

  if (State.view === "borrower" && State.borrower) {
    host.innerHTML = Views.borrower(b.borrowers[State.borrower]);
    wireChartHover();
    wireChat();
    return;
  }
  if (State.view === "lab") {
    host.innerHTML = Views.lab(sweep(), State.dials);
    wireDials();
    return;
  }

  enrich(b);
  host.innerHTML = State.view === "overview" ? Views.overview(b.metrics) : Views.portfolio(b);
  $$("#book tbody tr").forEach((tr) => {
    tr.onclick = () => { State.borrower = tr.dataset.id; State.view = "borrower"; render(); };
  });
}

document.addEventListener("click", (e) => {
  const nav = e.target.closest("[data-view]");
  if (nav) {
    const v = nav.dataset.view;
    if (v === "demo" && State.view !== "demo") State.step = 0;
    if (v === "learn" && State.view !== "learn") State.domain = "";
    if (v in State.pages && State.view !== v) State.pages[v] = 0;
    State.view = nav.dataset.view; render(); return;
  }
  const go = e.target.closest("[data-go]");
  if (go) {
    if (go.dataset.go === "demo") State.step = 0;
    State.view = go.dataset.go; render();
  }
});

$("#conn").textContent = "offline snapshot";
render();
"""

BANNER = """
    <div class="card" style="border-color:rgba(217,167,199,.3)">
      <h3>Offline snapshot</h3>
      <p class="small muted" style="margin:0">
        This file is fully self-contained — every number below was produced by the CENTRIC
        engine and baked in at build time. The <b>interest cap</b> and <b>grace</b> dials in
        the Policy lab are live across a pre-computed grid; the rest are fixed at their
        defaults. Run <code>python3 -m centric.server</code> for the fully interactive console.
      </p>
    </div>"""


def main() -> int:
    print("Running the engine across the policy grid…")
    books = build_books()

    data = {"caps": CAPS, "graces": GRACES, "books": books}
    payload = json.dumps(data, separators=(",", ":"))

    shell = read("index.html")
    # strip the external asset links — everything goes inline
    shell = shell.replace('<link rel="stylesheet" href="styles.css">',
                          "<style>\n" + read("styles.css") + "\n</style>")
    for tag in ('<script src="charts.js"></script>',
                '<script src="views.js"></script>',
                '<script src="app.js"></script>'):
        shell = shell.replace(tag, "")

    # inject the offline banner at the top of the view container
    shell = shell.replace('<div id="view" class="view"></div>',
                          '<div id="view" class="view"></div>')

    scripts = (
        "<script>const DATA=" + payload + ";</script>\n"
        + "<script>\n" + read("charts.js") + "\n</script>\n"
        + "<script>\n" + read("views.js") + "\n</script>\n"
        + "<script>\n" + STATIC_APP + "\n</script>\n"
    )
    shell = shell.replace("</body>", scripts + "</body>")
    shell = shell.replace("<title>CENTRIC — Repayment Intelligence</title>",
                          "<title>CENTRIC — Repayment Intelligence (offline)</title>")

    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write(shell)

    kb = os.path.getsize(OUT) // 1024
    print(f"\nWrote {os.path.relpath(OUT, ROOT)}  ({kb} KB)")
    print("Open it by double-clicking. No server required.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
