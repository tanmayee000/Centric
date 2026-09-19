/* CENTRIC — router, state and API access. Vanilla JS, no build step. */

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
  portfolio: null,
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

const qs = () => new URLSearchParams(State.dials).toString();

async function api(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}

function setConn(ok, text) {
  $("#conn").textContent = text;
  $(".dot").classList.toggle("bad", !ok);
}

function setChrome() {
  document.body.classList.toggle("landing-mode", State.view === "landing");
  const [t, s] = TITLES[State.view] || TITLES.about;
  $("#page-title").innerHTML = t;
  $("#page-sub").textContent = s;
  $$("#nav li").forEach((li) => li.classList.toggle("active", li.dataset.view === State.view));
  $$("#quick-tabs button").forEach((b) => {
    b.classList.toggle("on", b.dataset.view === State.view);
  });
}

/* Derive the book-wide visuals the overview needs. */
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
  $$(".pg-next").forEach((b) => b.onclick = () => {
    State.pages[b.dataset.key]++; render();
  });
  $$(".pg-prev").forEach((b) => b.onclick = () => {
    State.pages[b.dataset.key] = Math.max(0, State.pages[b.dataset.key] - 1); render();
  });
  $$("[data-pgdot]").forEach((d) => d.onclick = () => {
    State.pages[d.dataset.pgdot] = +d.dataset.step; render();
  });
}

function wireLearn() {
  $$("[data-domain]").forEach((el) => el.onclick = () => {
    State.domain = el.dataset.domain; render();
  });
}

function wireEarn() {
  $$("[data-earn]").forEach((el) => el.onclick = () => {
    State.earn = el.dataset.earn; render();
  });
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
      setTimeout(() => {
        wait.classList.remove("typing");
        wait.innerHTML = item.a;
        box.scrollTop = box.scrollHeight;
      }, 420);
      btn.classList.add("on");
    };
  });
}

function wireDemo() {
  const next = $("#demo-next"), prev = $("#demo-prev");
  if (next) next.onclick = () => { State.step++; render(); };
  if (prev) prev.onclick = () => { State.step = Math.max(0, State.step - 1); render(); };
  $$(".dot-step").forEach((d) => {
    d.onclick = () => { State.step = +d.dataset.step; render(); };
  });
}

/* ── chart hover ───────────────────────────────────────────────── */
function wireChartHover() {
  const box = $("#chartbox");
  if (!box || !window.__chartData) return;
  const { labels, afford, fx, pl, geom } = window.__chartData;
  const svg = box.querySelector("svg");
  const rail = svg.querySelector(".rail");
  const dot = svg.querySelector(".raildot");
  const tip = $("#tooltip");

  const hide = () => {
    tip.hidden = true;
    rail.setAttribute("opacity", "0");
    dot.setAttribute("opacity", "0");
  };

  $$(".hit", svg).forEach((hit) => {
    hit.addEventListener("mouseenter", (e) => {
      const i = +hit.dataset.i;
      const cx = geom.x(i), cy = geom.y(pl[i]);
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
      const pad = 16;
      let x = e.clientX + pad, y = e.clientY + pad;
      const r = tip.getBoundingClientRect();
      if (x + r.width > innerWidth - 8) x = e.clientX - r.width - pad;
      if (y + r.height > innerHeight - 8) y = e.clientY - r.height - pad;
      tip.style.left = x + "px";
      tip.style.top = y + "px";
    });
  });
  box.addEventListener("mouseleave", hide);
}

/* ── policy dials ──────────────────────────────────────────────── */
const DIAL_FMT = {
  utilisation: (v) => Math.round(v * 100) + "%",
  max_extension: (v) => v + "m",
  grace: (v) => v + "m",
  interest_cap: (v) => Math.round(v * 100) + "%",
  npv_floor: (v) => Math.round(v * 100) + "%",
};

function wireDials() {
  Object.keys(State.dials).forEach((id) => {
    const el = $("#" + id);
    if (!el) return;
    const out = $("#" + id + "-out");
    const paint = () => { out.textContent = DIAL_FMT[id](+el.value); };
    paint();
    let t;
    el.addEventListener("input", () => {
      State.dials[id] = +el.value;
      paint();
      clearTimeout(t);
      t = setTimeout(() => render(true), 260);
    });
  });
}

async function sweep() {
  const caps = [1.00, 1.05, 1.08, 1.15, 1.30, 1.50];
  const out = [];
  for (const cap of caps) {
    const p = new URLSearchParams({ ...State.dials, interest_cap: cap });
    const d = await api(`/api/portfolio?${p}`);
    out.push({
      cap,
      rescued: d.metrics.borrowers_rescued,
      referred: d.metrics.referrals.length,
      npv: d.metrics.weighted_npv_ratio,
    });
  }
  return out;
}

/* ── router ────────────────────────────────────────────────────── */
async function render(keepScroll) {
  const host = $("#view");
  setChrome();
  if (!keepScroll) window.scrollTo({ top: 0 });

  try {
    if (State.view === "landing") { host.innerHTML = Views.landing(); return; }
    if (State.view === "about") {
      host.innerHTML = Views.about(State.pages.about); wirePages(); return; }
    if (State.view === "how") {
      host.innerHTML = Views.how(State.pages.how); wirePages(); return; }
    if (State.view === "learn") {
      host.innerHTML = Views.learn(State.domain); wireLearn(); return; }
    if (State.view === "invest") {
      host.innerHTML = Views.invest(State.pages.invest); wirePages(); return; }
    if (State.view === "earn") {
      host.innerHTML = Views.earn(State.earn); wireEarn(); return; }

    if (State.view === "demo") {
      host.innerHTML = `<div class="loading">Loading the walkthrough…</div>`;
      const d = await api(`/api/borrower/${State.demoId}?${qs()}`);
      State.step = Math.max(0, Math.min(State.step, Views.DEMO_STEPS.length - 1));
      host.innerHTML = Views.demo(d, State.step);
      wireDemo();
      return;
    }
    if (State.view === "modules") {
      host.innerHTML = Views.modules(State.pages.modules); wirePages(); return; }

    if (State.view === "borrower" && State.borrower) {
      host.innerHTML = `<div class="loading">Analysing ${State.borrower}…</div>`;
      const d = await api(`/api/borrower/${State.borrower}?${qs()}`);
      host.innerHTML = Views.borrower(d);
      wireChartHover();
      wireChat();
      return;
    }

    if (State.view === "lab") {
      host.innerHTML = `<div class="loading">Sweeping policy settings…</div>`;
      const s = await sweep();
      host.innerHTML = Views.lab(s, State.dials);
      wireDials();
      return;
    }

    // overview + portfolio both need the book
    host.innerHTML = `<div class="loading">Running portfolio replay…</div>`;
    const data = enrich(await api(`/api/portfolio?${qs()}`));
    State.portfolio = data;
    setConn(true, `${data.rows.length} borrowers loaded`);
    host.innerHTML = State.view === "overview"
      ? Views.overview(data.metrics)
      : Views.portfolio(data);

    $$("#book tbody tr").forEach((tr) => {
      tr.onclick = () => { State.borrower = tr.dataset.id; State.view = "borrower"; render(); };
    });
  } catch (err) {
    setConn(false, "server unreachable");
    host.innerHTML = `<div class="card"><div class="empty">
      <p><b>Could not reach the engine.</b></p>
      <p class="small dim">${err.message}</p>
      <p class="small dim">Start it with <code>python3 -m centric.server</code>
        and reload this page.</p></div></div>`;
  }
}

/* ── global nav ────────────────────────────────────────────────── */
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

render();
