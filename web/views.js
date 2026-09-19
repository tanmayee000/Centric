/* CENTRIC — view templates. Pure functions returning HTML strings. */

const Views = (() => {
  const money = Chart.money;
  const pct = (v, d = 1) => (v * 100).toFixed(d) + "%";




  /* Wrap a list of page-strings with Back / Next and progress dots. */
  function paged(pages, idx, key) {
    const i = Math.max(0, Math.min(idx, pages.length - 1));
    const p = pages[i];
    return `
    <div class="pager-head">
      <div>
        <span class="pill accent">${p.eyebrow || `Part ${i + 1} of ${pages.length}`}</span>
        <h2 class="sec" style="margin:12px 0 0">${p.title}</h2>
        ${p.sub ? `<p class="muted small" style="margin:6px 0 0;max-width:640px">${p.sub}</p>` : ""}
      </div>
      <div class="demo-nav">
        <button class="btn pg-prev" data-key="${key}" ${i === 0 ? "disabled" : ""}>← Back</button>
        <button class="btn solid pg-next" data-key="${key}"
          ${i === pages.length - 1 ? "disabled" : ""}>Next →</button>
      </div>
    </div>
    <div class="dots">${pages.map((_, k) =>
      `<span class="dot-step ${k === i ? "on" : ""} ${k < i ? "done" : ""}"
         data-pgdot="${key}" data-step="${k}"></span>`).join("")}</div>
    <div class="page-body reveal">${p.body}</div>`;
  }

  /* ───────────────────────── LANDING ───────────────────────── */
  function landing() {
    return `
    <section class="landing">
      <div class="landing-bg">${Chart.hero()}</div>
      <div class="landing-inner">
        <span class="landing-eyebrow">Microfinance · Cash-flow intelligence</span>
        <h1 class="landing-mark">CENTRIC</h1>
        <p class="landing-tag">Money That Moves With You.</p>
        <button class="btn solid landing-cta" data-go="about">Get to know CENTRIC →</button>
      </div>
    </section>`;
  }

  /* ───────────────────────── ABOUT ───────────────────────── */
  function about(page) {
    const pages = [
      { eyebrow: "The problem", title: "Income has seasons. Instalments do not.",
        body: `
        <div class="grid g-1-2">
          <div class="card">
            <p class="lede">Microfinance borrowers earn in bursts — a harvest, a festive quarter,
              a monsoon with no work.</p>
            <p class="small muted">Their EMI arrives on the same date every month for the same
              amount, because it was underwritten off their <em>average</em> month. Nobody's year
              is an average.</p>
            <p class="small muted">When those two things disagree the borrower defaults — not
              because they cannot repay, but because they cannot repay <b>that much, that
              month</b>.</p>
            <div class="demo-key">A missed EMI is usually a timing failure, not a character
              failure.</div>
          </div>
          <div class="card"><h3>What that looks like</h3>${Chart.mismatch()}
            <p class="tiny dim" style="margin-top:8px">The shaded pockets are months where the
              flat instalment sits above what the borrower actually earned.</p></div>
        </div>` },
      { eyebrow: "The idea", title: "One engine, two surfaces.",
        body: `
        <div class="grid g-1-2">
          <div class="card">
            <p class="lede">CENTRIC reads a borrower's real cash flow and rewrites their loan
              schedule to fit it — without changing what the lender gets back.</p>
            <p class="small muted">It is not two products. The borrower app and the lender console
              are two views onto the same cash-flow core, which is why a plan the borrower can keep
              and a plan the lender can defend turn out to be the same plan.</p>
          </div>
          <div class="card"><h3>How the pieces sit</h3>${Chart.bridge()}</div>
        </div>
        <div class="card" style="margin-top:16px">
          <h3>What it actually does, in four steps</h3>
          <div class="steps">
            ${[
              ["01", "Read", "Pull inflows, outflows and repayment history. Split the year into trend, season and one-off shock."],
              ["02", "Judge", "Forecast what is genuinely spare each month and commit only to the 25th percentile — never the average."],
              ["03", "Reshape", "Search plan shapes until one clears affordability every month while the lender keeps their principal."],
              ["04", "Prove", "Attach the evidence: which months, which factors, and what happens if income drops further."],
            ].map(([n, h, p], i) => `<div class="step reveal-i" style="--d:${i * 0.08}s">
              <div class="n">${n}</div><h4>${h}</h4><p>${p}</p>
              ${i < 3 ? '<span class="arrow">→</span>' : ""}</div>`).join("")}
          </div>
        </div>` },
      { eyebrow: "The difference", title: "Why this is not something that already exists.",
        body: `
        <div class="grid g-2-1">
          <div class="card">
            <div class="table-wrap"><table>
              <thead><tr><th>Existing tool</th><th>Question it answers</th>
                <th>What CENTRIC answers</th></tr></thead>
              <tbody>${[
                ["A credit score", "Will they repay?", "<b>When</b> can they repay, and <b>how much</b>?"],
                ["A collections tool", "They already missed — now what?", "They are <b>about to</b> miss — act now."],
                ["Manual restructuring", "What does this officer think?", "What does the <b>cash flow</b> support, auditably?"],
                ["A wealth app", "Where should spare capital go?", "There <b>is no</b> spare capital yet."],
              ].map(([a, bq, c]) => `<tr style="cursor:default"><td><b>${a}</b></td>
                <td class="muted">${bq}</td><td>${c}</td></tr>`).join("")}</tbody>
            </table></div>
            <div class="callout">The one nobody else does: every other tool reads a lean month and
              a failing borrower as the same signal. CENTRIC separates them, and refuses to act
              when it cannot tell them apart.</div>
          </div>
          <div class="card" style="display:flex;flex-direction:column;align-items:center;justify-content:center">
            <h3 style="align-self:flex-start">The wider product</h3>
            ${Chart.orbit(["Ask CENTRIC", "Micro lessons", "Earning engine", "\u20b9500 decision",
                           "Scam detector", "Simulator", "Financial levels", "Advisor network"])}
            <p class="tiny dim" style="text-align:center;margin-top:12px">Eight modules, one engine.
              <b style="color:var(--accent)">The engine is what this prototype implements.</b></p>
          </div>
        </div>
        <div class="card" style="margin-top:16px">
          <h3>Where to go next</h3>
          <div class="grid g3">
            ${[["Guided demo", "Five steps on one borrower, start to finish.", "demo"],
               ["The loan book", "Twelve borrowers replayed under both schedules.", "portfolio"],
               ["Learn", "Micro-lessons on how money actually works.", "learn"]]
              .map(([h, p, go]) => `<div class="step" data-go="${go}" style="cursor:pointer">
                <h4 style="margin-top:0">${h}</h4><p>${p}</p>
                <p class="tiny" style="color:var(--accent);margin-top:10px">Open →</p></div>`).join("")}
          </div>
        </div>` },
    ];
    return paged(pages, page, "about");
  }

  /* ───────────────────────── OVERVIEW ───────────────────────── */
  function overview(m) {
    const stat = (v, k, s, accent, sparkVals) => `
      <div class="stat">
        <div class="v ${accent ? "accent" : ""}">${v}</div>
        <div class="k">${k}</div><div class="s">${s}</div>
        ${sparkVals ? `<div class="spark">${Chart.spark(sparkVals)}</div>` : ""}
      </div>`;

    return `
    <h2 class="sec">What it achieves on the demo book
      <small>Twelve borrowers, replayed under their contracted EMI and again under CENTRIC.</small></h2>
    <div class="grid g4">
      ${stat(`${m.fixed_breach_months} → ${m.plan_breach_months}`, "breach-months",
             "months a borrower was asked for more than they had", true,
             [9, 8, 11, 6, 4, 3, 5, 8, 10, 13])}
      ${stat(`${m.borrowers_rescued}/${m.borrowers_at_risk}`, "at-risk borrowers rescued",
             "brought inside affordability every month", false, [2, 3, 4, 4, 5, 6])}
      ${stat(`${m.principal_recovered_pct.toFixed(0)}%`, "principal recovered",
             "no haircut — every feasible plan fully amortises", false)}
      ${stat(pct(m.weighted_npv_ratio, 2), "NPV vs contract",
             "principal-weighted across the book", false)}
    </div>

    <h2 class="sec">The book at a glance
      <small>Who is in trouble, and what CENTRIC does about it.</small></h2>
    <div class="grid g-1-2">
      <div class="card" style="display:flex;flex-direction:column;align-items:center;justify-content:center">
        <h3 style="align-self:flex-start">Diagnosis mix</h3>
        ${Chart.donut(m.__mix, String(m.__total), "borrowers")}
        <div class="legend" style="justify-content:center">
          <span><i style="background:#6fd6a4"></i>stable</span>
          <span><i style="background:#e6b87a"></i>seasonal dip</span>
          <span><i style="background:#e8798a"></i>structural decline</span>
        </div>
      </div>
      <div class="card">
        <h3>Breach-months, before → after</h3>
        <p class="small muted" style="margin-bottom:14px">Red is the contracted EMI. Green means
          CENTRIC found a schedule with no month the borrower cannot meet.</p>
        ${Chart.hbars(m.__bars)}
      </div>
    </div>

    <div class="card">
      <h3>Try it in sixty seconds</h3>
      <ul class="ticks">
        <li>Open <b>Portfolio</b> and click <b>Govind Patil</b> — a dairy-and-crop borrower whose
            income collapses between monsoon and harvest.</li>
        <li>Look at the shaded months. That is where his contracted EMI sits above what he has.</li>
        <li>The solid line is what CENTRIC proposes instead. It never crosses into the shading,
            and the lender still gets every rupee.</li>
        <li>Then open <b>Policy lab</b> and drag the interest cap. Watch borrowers move between
            "rescued" and "referred to a human".</li>
      </ul>
      <div class="row-btns"><button class="btn solid" data-go="portfolio">Start →</button></div>
    </div>`;
  }


  /* ───────────────────────── GUIDED DEMO ───────────────────────── */
  const DEMO_STEPS = [
    { t: "Meet one borrower",
      p: "Govind Patil runs dairy and crops in Kolhapur. Each bar is what he actually has spare in a month, after food, rent and his other obligations. Notice it is not a flat line — his money arrives with the harvest.",
      k: "Income is seasonal. Nobody's year is an average." },
    { t: "Now add his EMI",
      p: "His loan was underwritten off his <em>average</em> month, so he pays the same amount every month. The dashed line never moves, because the contract does not care what time of year it is.",
      k: "The contract is flat. His income is not." },
    { t: "Watch where it breaks",
      p: "In the shaded months the EMI sits above everything he has. He is not unwilling — he is short. This is where a default gets manufactured, and where a collections team would step in weeks too late.",
      k: "A missed EMI is a timing failure, not a character failure." },
    { t: "Work out what he can actually pay",
      p: "CENTRIC separates trend from season from one-off shock, forecasts each month ahead, and commits only to the 25th percentile — never the average. That shaded ceiling is what he can safely afford.",
      k: "Underwrite the shape of the year, not the mean." },
    { t: "Reshape the schedule to fit",
      p: "The engine searches plan shapes until one stays under that ceiling every single month — while the lender keeps all the principal, stays inside the NPV band, and the borrower pays no more than 8% extra interest.",
      k: "Same principal. Same lender economics. Zero months in breach." },
  ];

  function demo(d, step) {
    const s = DEMO_STEPS[step];
    const { plan, fixed, loan } = d;
    const n = plan ? plan.tenure : loan.tenure_months;
    const labels = d.horizon_labels.slice(0, n);
    const afford = d.affordability.conservative.slice(0, n);
    const fx = labels.map((_, i) => fixed.payments[i] || 0);
    const pl = labels.map((_, i) => (plan ? plan.payments[i] || 0 : 0));
    const last = step === DEMO_STEPS.length - 1;

    return `
    <div class="card glow">
      <div class="demo-head">
        <div>
          <span class="pill accent">Step ${step + 1} of ${DEMO_STEPS.length}</span>
          <h2 class="sec" style="margin:12px 0 8px">${s.t}</h2>
          <p class="muted" style="max-width:640px;margin:0">${s.p}</p>
        </div>
        <div class="demo-nav">
          <button class="btn" id="demo-prev" ${step === 0 ? "disabled" : ""}>← Back</button>
          ${last
            ? '<button class="btn solid" data-go="portfolio">Open the book →</button>'
            : '<button class="btn solid" id="demo-next">Next →</button>'}
        </div>
      </div>

      <div class="dots">${DEMO_STEPS.map((_, i) =>
        `<span class="dot-step ${i === step ? "on" : ""} ${i < step ? "done" : ""}"
           data-step="${i}"></span>`).join("")}</div>

      <div class="chartbox" style="margin-top:14px">
        ${Chart.demo(labels, afford, fx, pl, fixed.breach_months, step)}
      </div>

      <div class="demo-key">${s.k}</div>

      <div class="grid g4" style="margin-top:16px">
        ${[
          ["Borrower", d.borrower.name, d.borrower.occupation],
          ["Contracted EMI", Chart.money(fx[0]), `${loan.tenure_months} months at ${(loan.annual_rate * 100).toFixed(0)}%`],
          ["Months in breach", step >= 2 ? `${fixed.breach_months.length} → ${step >= 4 ? plan.breach_months.length : "?"}` : "—",
            step >= 2 ? "under the contracted schedule" : "revealed at step 3"],
          ["Principal recovered", step >= 4 ? "100%" : "—",
            step >= 4 ? `NPV ${(plan.npv_ratio * 100).toFixed(1)}% of contract` : "revealed at step 5"],
        ].map(([k, v, sub]) => `<div class="stat" style="padding:14px 16px">
          <div class="s" style="margin:0 0 4px">${k}</div>
          <div class="v" style="font-size:17px">${v}</div>
          <div class="s">${sub}</div></div>`).join("")}
      </div>
    </div>

    ${step === 3 ? `<div class="card">
      <h3>What "separating trend from season" actually means</h3>
      <p class="small muted">The same borrower's history, pulled apart. Read it as:
        <b>what we see</b> = <b>trend</b> + <b>season</b> + <b>shock</b>. A June collapse that
        happens every June is season, not decline — and that is the distinction the whole
        system rests on.</p>
      ${Chart.split(d.decomposition.labels, d.decomposition.observed, d.decomposition.trend,
                    d.decomposition.seasonal, d.decomposition.residual)}
    </div>` : ""}

    ${last ? `<div class="card">
      <h3>What just happened</h3>
      <ul class="ticks">
        <li>The lender recovered <b>every rupee of principal</b> — this is a reschedule, not a write-off.</li>
        <li>The borrower was never asked for money they did not have, in <b>any</b> month.</li>
        <li>Every number above is attached to evidence: which months, which factors, which transactions.</li>
        <li>And when no plan can satisfy the constraints, the engine <b>refuses and refers</b> the case
            to a human rather than inventing one.</li>
      </ul>
      <div class="row-btns">
        <button class="btn solid" data-go="portfolio">See all twelve borrowers →</button>
        <button class="btn" data-go="how">Read the method</button>
      </div>
    </div>` : ""}`;
  }


  /* ───────────────────────── LEARN ───────────────────────── */
  const DOMAINS = [
    { id: "everyday", name: "Everyday money", icon: "\u25d1", colour: "#d9a7c7",
      blurb: "Where your money actually goes, and how to see it before it disappears.",
      lessons: [
        ["The three buckets", "Every rupee you get is doing one of three jobs: surviving this month, protecting a future month, or growing. Most money stress comes from all of it sitting in the first bucket.", "If ₹100 comes in, try ₹70 survive, ₹20 protect, ₹10 grow. The exact split matters less than having all three."],
        ["Why your month feels short", "Income lands in lumps; spending happens daily. A month can feel short even when the year is fine — the money simply wasn't there on the day the bill was.", "Map your inflows against your fixed dates once. Most people find two predictable pinch weeks."],
        ["Pay yourself first", "If you save what's left at the end, nothing is left. Move a small amount out on the day money arrives, not the day before the next one does.", "Even ₹200 on payday beats ₹1,000 you meant to save."],
      ] },
    { id: "credit", name: "Borrowing & credit", icon: "\u25d0", colour: "#e6b87a",
      blurb: "What a loan really costs, and why the schedule matters as much as the rate.",
      lessons: [
        ["Interest, in plain terms", "Interest is rent on money. 24% a year on ₹10,000 is roughly ₹200 a month in rent while you still hold the full amount.", "Two loans can have the same rate and very different total cost, depending on how long you hold them."],
        ["Why a missed EMI hurts twice", "You pay a penalty, and your record says you are risky — which makes the next loan costlier. The second cost usually outlives the first by years.", "If you can see a hard month coming, ask before you miss. Restructuring is normal; a default is not."],
        ["Good debt, bad debt", "Debt that buys something which earns — a sewing machine, a delivery bike — can pay for itself. Debt that buys a moment cannot.", "Ask: will this rupee come back to me? If no, borrow as little as possible."],
      ] },
    { id: "safety", name: "Safety & scams", icon: "\u25c8", colour: "#e8798a",
      blurb: "The four signals that appear in almost every financial scam.",
      lessons: [
        ["Guaranteed returns", "No real investment guarantees a high return. Guarantee plus high return means the risk hasn't gone away — it has been hidden from you.", "Anything promising fixed 20%+ monthly is not an investment."],
        ["Urgency", "Real institutions let you think. Scams need you to move before you check, which is why 'offer closes tonight' is the most common line in fraud.", "Any pressure to act in minutes is itself the warning."],
        ["Pay to receive", "You are told you have won, or been approved, but must first send a processing fee. Money never has to leave before money arrives.", "Legitimate lenders deduct fees; they do not ask you to transfer first."],
        ["Unregistered apps", "Check the lender is registered with the regulator before sharing anything. A polished app is not proof of anything.", "One search on the regulator's register takes a minute and rules out most fake lenders."],
      ] },
    { id: "students", name: "For students", icon: "\u25b3", colour: "#6fd6a4",
      blurb: "Irregular pocket money, first accounts, and the habits that are cheap to start now.",
      lessons: [
        ["Your income is already seasonal", "Allowance, festival money, a stipend, a gig — it arrives unevenly, which is exactly the pattern CENTRIC is built for. You are not a special case; you are the common case.", "Track one term. You will see your own pattern within three months."],
        ["The first ₹1,000 is the hardest", "A small buffer changes behaviour more than its size suggests: it turns emergencies into inconveniences and stops you borrowing at bad rates.", "Aim for one month of your own basic costs before anything else."],
        ["Start small, start early", "A tiny amount invested at 20 beats a large amount at 35, because time does most of the work. This is the one advantage you have and cannot buy later.", "₹500 a month from now is worth more than ₹2,000 a month started in a decade."],
        ["Build a skill that pays", "The highest-return investment at your age is usually not a fund. It is a skill someone will pay for within six months.", "Pick one thing that has a market, not five that interest you."],
      ] },
  ];

  function learn(open) {
    const d = DOMAINS.find((x) => x.id === open) || null;
    if (!d) {
      return `
      <div class="card glow">
        <h3>Micro-lessons</h3>
        <p class="lede muted" style="max-width:700px;margin:0">
          Five minutes each, plain language, no jargon. Money advice usually assumes you
          already have money — these start earlier than that.</p>
      </div>
      <div class="grid g2">
        ${DOMAINS.map((x, i) => `
          <div class="card lesson-card reveal-i" style="--d:${i * 0.07}s" data-domain="${x.id}">
            <div class="lesson-ico" style="color:${x.colour}">${x.icon}</div>
            <h4 style="margin:10px 0 6px;font-size:16px">${x.name}</h4>
            <p class="small muted" style="margin:0">${x.blurb}</p>
            <p class="tiny" style="color:${x.colour};margin-top:12px">
              ${x.lessons.length} lessons · open →</p>
          </div>`).join("")}
      </div>`;
    }
    return `
    <button class="back" data-domain="">← all topics</button>
    <div class="card glow">
      <div class="lesson-ico" style="color:${d.colour};font-size:26px">${d.icon}</div>
      <h2 class="sec" style="margin:10px 0 4px">${d.name}</h2>
      <p class="muted small" style="margin:0">${d.blurb}</p>
    </div>
    ${d.lessons.map(([t, body, tip], i) => `
      <div class="card reveal-i" style="--d:${i * 0.08}s">
        <div style="display:flex;gap:14px;align-items:flex-start">
          <div class="lesson-n" style="border-color:${d.colour};color:${d.colour}">${i + 1}</div>
          <div>
            <h4 style="margin:0 0 8px;font-size:15px">${t}</h4>
            <p class="small muted" style="margin:0">${body}</p>
            <div class="tip"><b>Try this.</b> ${tip}</div>
          </div>
        </div>
      </div>`).join("")}`;
  }

  /* ───────────────────────── INVEST ───────────────────────── */
  function invest(page) {
    const pages = [
      { title: "First, the order of operations",
        sub: "Investing is the fourth thing you do with money, not the first. Doing it out of order is how people lose money they could not afford to lose.",
        body: `
        <div class="grid g-1-2">
          <div class="card">
            <h3>Where the next ₹500 should go</h3>
            ${Chart.ladder([
              { title: "A small cash buffer", why: "one month of essentials, reachable same-day" },
              { title: "Clear high-interest debt", why: "paying off 24% debt is a guaranteed 24% return" },
              { title: "A skill or tool that earns", why: "highest return available at small amounts" },
              { title: "Then invest the surplus", why: "only money you will not need for 3+ years" },
            ])}
          </div>
          <div class="card">
            <h3>Why this order</h3>
            <p class="small muted">Clearing a 24% loan earns you a guaranteed 24%. No fund can
              promise that. So paying down expensive debt is not the boring option — it is
              usually the highest-return one available to you.</p>
            <p class="small muted">And investing before you have a buffer means selling at the
              worst moment, because emergencies do not wait for markets to recover.</p>
            <div class="demo-key">Never invest money you might need within three years.</div>
          </div>
        </div>` },
      { title: "What the options actually are",
        sub: "Every option trades safety against return. Nothing gives you both — anything claiming to is a scam.",
        body: `
        <div class="grid g-2-1">
          <div class="card">
            <h3>Risk against return</h3>
            ${Chart.riskReturn([
              { name: "Savings a/c", risk: 0.6, ret: 3.2, color: "#6fd6a4" },
              { name: "Fixed deposit", risk: 1.4, ret: 6.8, color: "#6fd6a4" },
              { name: "Govt bonds", risk: 2.2, ret: 7.2, color: "#8fd0c0" },
              { name: "Debt funds", risk: 3.6, ret: 7.8, color: "#e6b87a" },
              { name: "Gold", risk: 5.4, ret: 8.5, color: "#e6b87a" },
              { name: "Index funds", risk: 7.2, ret: 12, color: "#d9a7c7" },
              { name: "Single stocks", risk: 9.2, ret: 13.5, color: "#e8798a" },
            ])}
            <p class="tiny dim" style="margin-top:10px">Indicative long-run ranges for illustration,
              not advice or a forecast. Real returns vary and can be negative.</p>
          </div>
          <div class="card">
            <h3>In one line each</h3>
            <ul class="ticks">
              <li><b>Fixed deposit</b> — you lend the bank money for a fixed time at a fixed rate. Dull and dependable.</li>
              <li><b>Bond</b> — you lend to a government or company; they pay interest, then return the amount. Safer than shares because you get paid before shareholders do.</li>
              <li><b>Debt fund</b> — a basket of bonds, managed for you. Steadier than shares, better than idle cash.</li>
              <li><b>Index fund</b> — a basket of many companies at once. You stop betting on one firm and start betting on the whole market.</li>
              <li><b>Single stock</b> — one company. Highest upside, and the only one that can go to zero.</li>
            </ul>
          </div>
        </div>` },
      { title: "Why starting small still works",
        sub: "The amount matters less than the number of years it gets to compound.",
        body: `
        <div class="grid g-2-1">
          <div class="card">
            <h3>₹500 a month, growing at 10%</h3>
            ${Chart.compound(500, 0.10, 10)}
            <p class="small muted" style="margin-top:12px">The dashed line is what you put in.
              The gap above it is what the money earned on its own — and notice it barely
              appears for the first two years, then widens fast. That gap is the entire reason
              to start early rather than start big.</p>
          </div>
          <div class="card">
            <h3>Rules that survive contact with reality</h3>
            <ul class="ticks">
              <li>Automate it on the day income arrives, not the day before the next one.</li>
              <li>Fixed amount, fixed date — decisions made monthly get skipped.</li>
              <li>Don't check daily. Watching a long-term thing on a short timescale only causes bad trades.</li>
              <li>A falling market is a discount if you are still buying, and only a loss if you sell.</li>
            </ul>
            <div class="tip"><b>Reality check.</b> This is education, not financial advice.
              Anyone promising guaranteed high returns is selling you something.</div>
          </div>
        </div>` },
    ];
    return paged(pages, page, "invest");
  }

  /* ───────────────────────── EARN ───────────────────────── */
  const EARN_PATHS = {
    student: [
      ["Tutoring what you already study", "₹300–600/hr", "Near-zero setup. One subject you are already good at, two hours a week."],
      ["Small design and formatting work", "₹500–2,000/task", "Posters, decks, CVs. Free tools; portfolio matters more than credentials."],
      ["Data entry and transcription", "₹8,000–15,000/mo", "Low skill barrier, pays for consistency rather than talent."],
      ["Campus reselling", "₹2,000–8,000/mo", "Buy in bulk, sell in ones. Learn margin and cash cycles with small money."],
    ],
    trade: [
      ["Take one repeat client off an agent", "+20–30% margin", "The margin an intermediary keeps is usually yours to win back."],
      ["Add a next-door service", "₹3,000–10,000/mo", "Tailoring adds alterations; delivery adds packing. Same tools, more revenue."],
      ["Sell in the off-season", "smooths the dip", "A second product timed to your lean months flattens the exact gap that breaks repayment."],
      ["Take one apprentice", "doubles capacity", "You get throughput, they get a trade. Pays off after roughly a month."],
    ],
    salaried: [
      ["Weekend freelancing in your day job's skill", "₹5,000–25,000/mo", "You are already paid for it; the second buyer costs you nothing new to find."],
      ["Teach it", "₹500–1,500/hr", "Whatever you do at work, someone one year behind you will pay to learn."],
      ["A certification your employer funds", "raises the base", "The cheapest raise available is usually one your company already budgets for."],
      ["Rent an idle asset", "₹2,000–9,000/mo", "A vehicle, a room, equipment sitting unused between uses."],
    ],
  };

  function earn(who) {
    const pick = who || "student";
    const labels = { student: "Student", trade: "Small business or trade", salaried: "Salaried" };
    return `
    <div class="card glow">
      <h3>Earning capacity</h3>
      <p class="lede muted" style="max-width:720px;margin:0 0 6px">
        Most money advice is about spending less. Below a certain income that advice runs out —
        there is nothing left to cut. The only lever left is earning more, so CENTRIC treats
        that as a first-class problem rather than an afterthought.</p>
      <div class="demo-key" style="margin-top:14px">You cannot save your way out of a shortfall
        that is bigger than your surplus.</div>
    </div>

    <div class="card">
      <h3>Who are you?</h3>
      <div class="chips" style="margin-top:4px">
        ${Object.keys(labels).map((k) => `
          <button class="chip ${k === pick ? "on" : ""}" data-earn="${k}">${labels[k]}</button>`).join("")}
      </div>
    </div>

    <div class="grid g2">
      ${EARN_PATHS[pick].map(([t, money, why], i) => `
        <div class="card reveal-i" style="--d:${i * 0.07}s">
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
            <h4 style="margin:0;font-size:15px">${t}</h4>
            <span class="pill accent" style="flex-shrink:0">${money}</span>
          </div>
          <p class="small muted" style="margin:10px 0 0">${why}</p>
        </div>`).join("")}
    </div>

    <div class="card">
      <h3>How CENTRIC picks these</h3>
      <p class="small muted">The engine already knows the shape of your year. It looks for paths
        whose income lands in your <b>lean</b> months rather than your strong ones — because an
        extra ₹5,000 in a month you were already fine adds far less than ₹2,000 in the month you
        were going to miss an instalment.</p>
      <ul class="ticks">
        <li>Timing beats size: earnings that fill the gap are worth more than earnings that don't.</li>
        <li>Setup cost is capped at what your buffer can absorb without creating a new problem.</li>
        <li>Anything needing more than a few hours a week is ranked lower, because it will not survive a busy month.</li>
      </ul>
      <p class="tiny dim" style="margin-bottom:0">Figures are indicative ranges for illustration,
        not guarantees of income.</p>
    </div>`;
  }

  /* ───────────────────────── HOW IT WORKS ───────────────────────── */
  function how(page) {
    const layer = (n, name, sub, items, out) => `
      <div class="layer">
        <div class="lname">${n} · ${name}<small>${sub}</small></div>
        <div class="boxes">${items.map((i) =>
          `<div class="lbox ${out ? "out" : ""}">${i}</div>`).join("")}</div>
      </div>`;

    const pages = [
      { eyebrow: "The pipeline", title: "Consented data in, a defensible schedule out.",
        body: `    <div class="card glow">
      <h3>The pipeline</h3>
      <p class="muted small" style="max-width:720px">
        Consented data in, cash-flow reasoning, a constrained plan search, and an evidence
        layer over everything the system emits. The borrower app and the lender console are
        two views onto one engine, not two products.
      </p>
      <div style="margin-top:22px">
        ${layer("01", "Sources", "consented, normalised",
          ["Account Aggregator", "UPI + SMS parsing", "Repayment ledger", "Agent cash logs"])}
        <div class="lsep">↓</div>
        ${layer("02", "Cash-flow model", "trend vs season vs shock",
          ["De-duplicate", "Seasonal decomposition", "90-day volatility", "Essential baseline"])}
        <div class="lsep">↓</div>
        ${layer("03", "Decision engine", "what can they pay, and when",
          ["Affordability band", "Stress probability", "Change-point test", "Plan optimiser"])}
        <div class="lsep">↓</div>
        ${layer("04", "Surfaces", "with the evidence attached",
          ["Lender console", "Borrower app", "Evidence + audit log"], true)}
      </div>
    </div>

` },
      { eyebrow: "The reasoning", title: "How it decides what someone can afford.",
        body: `    <div class="grid g2">
      <div class="card">
        <h3>Deciding what is affordable</h3>
        <p class="small muted">Underwriting off an average is exactly how a seasonal borrower
          ends up in default. We commit to the 25th percentile instead.</p>
        <div class="formula">affordable(t) = forecast inflow(t)<br>
          &nbsp;&nbsp;− forecast essentials(t)<br>
          &nbsp;&nbsp;− prior obligations<br>
          &nbsp;&nbsp;− 0.6745 × σ &nbsp;&nbsp;← the P25 band</div>
        <p class="small muted">σ compounds income shocks and expense shocks, because they
          are independent. A volatile borrower gets a wider safety margin automatically.</p>
      </div>

      <div class="card">
        <h3>A dip is not a decline</h3>
        <p class="small muted">The hardest requirement in the brief: do not mistake a temporary
          downturn for permanent deterioration.</p>
        <div class="formula">deseasonalise → compare last 3 months<br>
          &nbsp;&nbsp;against the prior 9<br>
          &nbsp;&nbsp;structural only if change &lt; −18%<br>
          &nbsp;&nbsp;AND t &lt; −2.2 AND no seasonal rebound due</div>
        <p class="small muted">The gap is measured against <em>that borrower's own noise</em>,
          not a fixed percentage. A farmer whose income always halves in June never trips it.
          The test is deliberately conservative: it would rather miss a slow decline than
          libel someone having a bad quarter.</p>
      </div>
    </div>

` },
      { eyebrow: "The guardrails", title: "What a plan is not allowed to do.",
        body: `    <div class="card">
      <h3>The constraints a plan must satisfy</h3>
      <div class="table-wrap"><table>
        <thead><tr><th>Constraint</th><th>Default</th><th>Why it exists</th></tr></thead>
        <tbody>
          ${[
            ["Full amortisation", "always", "the lender gets <b>all</b> the principal back — no haircut, ever"],
            ["Instalment ≤ affordable", "90% utilisation", "never claim the borrower's last rupee"],
            ["NPV vs contract", "≥ 95%", "the lender's economics have to survive the rescue"],
            ["Interest vs contract", "≤ 108%", "relief must not quietly gouge the borrower"],
            ["Tenure extension", "≤ 6 months", "a policy limit, not a model output"],
          ].map(([a, b, c]) => `<tr style="cursor:default"><td><b>${a}</b></td>
            <td class="num">${b}</td><td class="muted">${c}</td></tr>`).join("")}
        </tbody>
      </table></div>
      <div class="callout">Ranking is <b>breaches → tenure → NPV → smoothness</b>. Breaches first,
        because a plan the borrower cannot meet is not a plan. Tenure before NPV, because
        stretching a 24% loan is not free to the borrower even when it flatters the lender's
        discounted return.</div>
      <p class="small muted" style="margin-bottom:0"><b>If nothing satisfies the constraints,
        the engine refuses and refers the case to a human.</b> It does not invent a plan.</p>
    </div>` },
    ];
    return paged(pages, page, "how");
  }

  /* ───────────────────────── MODULES ───────────────────────── */
  function modules(page) {
    const mods = [
      ["01", "Ask CENTRIC", "A plain-language co-pilot. A mutual fund becomes a basket, not a prospectus."],
      ["02", "Micro-lessons", "Five-minute modules on risk, diversification and scams, with quiz gates before real money moves."],
      ["03", "Earning engine", "Turns skills, free time and location into realistic micro-income paths."],
      ["04", "₹500 decision", "Buffer, high-interest debt, upskilling or SIP — stability ranked ahead of returns."],
      ["05", "Scam detector", "Paste a loan offer or a link. It flags guaranteed returns, urgency language and fake registration."],
      ["06", "Simulator", "Virtual capital to practise a downturn before any real money is at risk."],
      ["07", "Financial levels", "Progress measured by habits mastered, not by net worth — so it works at any income."],
      ["08", "Advisor network", "Verified humans for tax, debt consolidation and micro-business finance."],
    ];
    const pages = [
      { eyebrow: "The core", title: "One engine underneath everything.",
        body: `    <div class="card glow">
      <h3>The core everything else runs on</h3>
      <div class="grid g-2-1" style="align-items:center;margin-top:6px">
        <div>
          <p class="lede" style="margin:0 0 10px"><b>Adaptive Cash-Flow &amp; Repayment Engine</b></p>
          <p class="muted small">Trailing 90-day volatility, an essential-survival baseline, dynamic
            repayment schedules that ease in lean months without hurting a credit record, and a
            Money Map that splits any surplus across essentials, emergency, debt and skills.</p>
          <p class="muted small" style="margin-bottom:0">This engine is what the lender licenses.
            It is also what every consumer module below reads from — which is why the two halves
            of CENTRIC are one product and not two.</p>
        </div>
        <div style="display:flex;justify-content:center">
          ${Chart.ring(1, "1", "engine", "#d9a7c7", 150)}
        </div>
      </div>
    </div>

` },
      { eyebrow: "The modules", title: "The eight things a borrower touches.",
        body: `    <h2 class="sec">The eight modules a borrower touches
      <small>Everything here reads from the same cash-flow core.</small></h2>
    <div class="mods">
      ${mods.map(([n, h, p], i) => `
        <div class="mod ${i === 0 ? "core" : ""}">
          <div class="n">MODULE ${n}</div><h4>${h}</h4><p>${p}</p>
          ${i === 0 ? '<span class="tag">live in prototype</span>' : ""}
        </div>`).join("")}
    </div>

` },
      { eyebrow: "Honesty", title: "What is built, and what is only specified.",
        body: `    <div class="card">
      <h3>What is actually built in this repository</h3>
      <p class="small muted">Being precise about this matters more than claiming everything works.</p>
      <ul class="ticks">
        <li><b>Built and running:</b> the cash-flow engine, affordability band, dip-vs-decline
            diagnosis, plan optimiser, evidence pack, lender console, CLI and 19 invariant tests.</li>
        <li><b>Specified, not built:</b> the eight consumer modules above. They are the product
            roadmap, and they depend on the engine that does exist.</li>
        <li><b>Synthetic data:</b> the book is generated from a fixed seed. Swap one function
            for a database read and nothing downstream changes.</li>
      </ul>
    </div>` },
    ];
    return paged(pages, page, "modules");
  }

  /* ───────────────────────── PORTFOLIO ───────────────────────── */
  function portfolio(data) {
    const m = data.metrics;
    return `
    <div class="grid g4">
      ${[
        [`${m.fixed_breach_months} → ${m.plan_breach_months}`, "breach-months", "fixed vs CENTRIC", true],
        [`${m.borrowers_rescued}/${m.borrowers_at_risk}`, "rescued", "at-risk borrowers", false],
        [`${m.principal_recovered_pct.toFixed(0)}%`, "principal recovered", "no haircut", false],
        [pct(m.weighted_npv_ratio, 2), "NPV vs contract", "principal-weighted", false],
      ].map(([v, k, s, a]) => `<div class="stat"><div class="v ${a ? "accent" : ""}">${v}</div>
        <div class="k">${k}</div><div class="s">${s}</div></div>`).join("")}
    </div>

    <div class="card">
      <h3>Loan book <span class="dim" style="text-transform:none;letter-spacing:0">
        — click a borrower</span></h3>
      <div class="table-wrap"><table id="book">
        <thead><tr>
          <th>Borrower</th><th>Diagnosis</th><th>Recommended plan</th>
          <th class="num">Breaches</th><th class="num">NPV</th><th class="num">Interest</th>
        </tr></thead>
        <tbody>${data.rows.map((r) => `
          <tr data-id="${r.id}">
            <td><span class="who-cell"><b>${r.name}</b><span>${r.occupation} · ${r.region}</span></span></td>
            <td><span class="badge ${r.verdict}">${r.verdict.replace(/_/g, " ")}</span>
                ${r.feasible ? "" : '<span class="badge refer">refer</span>'}</td>
            <td class="muted">${r.plan_name || "—"}</td>
            <td class="num"><span class="${r.fixed_breaches ? "delta-bad" : "dim"}">${r.fixed_breaches}</span>
                <span class="dim"> → </span>
                <span class="${r.plan_breaches ? "delta-bad" : "delta-good"}">${r.plan_breaches}</span></td>
            <td class="num">${r.npv_ratio ? pct(r.npv_ratio, 1) : "—"}</td>
            <td class="num">${r.interest_ratio ? pct(r.interest_ratio, 0) : "—"}</td>
          </tr>`).join("")}</tbody>
      </table></div>
      ${m.referrals.length ? `<div class="callout">
        <b>${m.referrals.join(", ")}</b> could not be rescued inside current policy, so the engine
        refers them rather than inventing a plan. Raise the interest cap in the Policy lab to see
        what it would cost to help them.</div>` : ""}
    </div>`;
  }


  /* Plain-language explainer for one borrower. Scripted, derived from their data. */
  function chatAnswers(d) {
    const { borrower: b, loan, plan, fixed, diagnosis: dg } = d;
    const m = Chart.money;
    const worstMonth = fixed.breach_months.length
      ? d.horizon_labels[fixed.breach_months[0]] : null;
    const gap = fixed.breach_months.length
      ? m(fixed.payments[fixed.breach_months[0]] - d.affordability.conservative[fixed.breach_months[0]])
      : null;
    const verdictWord = { stable: "steady", seasonal_dip: "in a seasonal dip",
                          structural_decline: "genuinely declining" }[dg.verdict];
    return [
      { q: "Explain this person's situation simply",
        a: `${b.name} is a ${b.occupation.toLowerCase()} in ${b.region}. Their income is not the
            same every month — it follows the seasons of their work. They owe ${m(loan.principal)}
            and the bank asks for ${m(fixed.payments[0])} on the same date each month, whatever
            kind of month it is. Right now their money looks <b>${verdictWord}</b>.` },
      { q: "So what is the actual problem?",
        a: fixed.breach_months.length
          ? `In ${fixed.breach_months.length} month${fixed.breach_months.length > 1 ? "s" : ""} of the
             year, the instalment is larger than everything they have spare. In ${worstMonth} alone
             they are short by about ${gap}. They are not refusing to pay — on those days the money
             is simply not there yet.`
          : `Nothing is broken here. Their instalment fits inside what they can spare in every
             month of the year, so no change is needed.` },
      { q: "Is this a bad month or a bad borrower?",
        a: `${dg.detail} That distinction is the whole job: a farmer earns nothing in June every
            single year, and punishing them for June would be punishing the calendar. We only call
            it real trouble when the drop is big, statistically solid, and not about to be undone
            by the next season.` },
      { q: "What does CENTRIC change for them?",
        a: plan ? `We keep the loan exactly the same size and reshape <b>when</b> it is paid.
            They pay more in strong months and less in lean ones, following
            "${plan.name}". They now owe ${m(Math.min(...plan.payments.filter((p) => p > 0)))}
            in their hardest month instead of ${m(fixed.payments[0])}${
              plan.tenure > loan.tenure_months
                ? `, over ${plan.tenure - loan.tenure_months} extra month${plan.tenure - loan.tenure_months > 1 ? "s" : ""}` : ""}.`
          : `Nothing yet — no schedule satisfies the rules, so this one goes to a human.` },
      { q: "Does the lender lose money?",
        a: plan ? `No. They get back <b>100% of the principal</b> — this is a reschedule, not a
            write-off. In today's money the plan is worth ${(plan.npv_ratio * 100).toFixed(1)}% of
            the original contract, and the borrower pays ${(plan.interest_ratio * 100).toFixed(0)}%
            of the contracted interest. The lender also avoids chasing, provisioning and losing
            the customer.`
          : `That is exactly why this case is referred — we could not find a plan that protects
             the lender's economics, so we do not pretend otherwise.` },
      { q: "What if their income falls further?",
        a: d.evidence.counterfactual },
      { q: "How do I know this isn't guesswork?",
        a: `Every number is traceable. We use ${d.decomposition.observed.length} months of their
            actual transaction history, split into long-term trend, repeating season, and one-off
            shocks. The recommendation lists which factors drove it and which months triggered it,
            and a human approves before anything changes.` },
    ];
  }

  /* ───────────────────────── BORROWER DETAIL ───────────────────────── */
  function borrower(d) {
    const { borrower: b, loan, plan, fixed, diagnosis: dg, evidence: ev } = d;
    const n = plan ? plan.tenure : loan.tenure_months;
    const labels = d.horizon_labels.slice(0, n);
    const afford = d.affordability.conservative.slice(0, n);
    const fx = labels.map((_, i) => fixed.payments[i] || 0);
    const pl = labels.map((_, i) => (plan ? plan.payments[i] || 0 : 0));
    const chart = Chart.cashflow(labels, afford, fx, pl, fixed.breach_months);

    window.__chartData = { labels, afford, fx, pl, geom: chart };
    window.__chat = chatAnswers(d);

    return `
    <button class="back" data-go="portfolio">← back to the book</button>

    <div class="card glow">
      <div style="display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap">
        <div>
          <h2 class="sec" style="margin:0">${b.name}</h2>
          <p class="muted small" style="margin:6px 0 0">${b.id} · ${b.occupation} · ${b.region}
            · seasonal profile <b>${b.profile}</b></p>
        </div>
        <div style="text-align:right">
          <div style="font:600 21px var(--mono)">${money(loan.principal)}</div>
          <div class="dim small">${(loan.annual_rate * 100).toFixed(0)}% ·
            ${loan.tenure_months} months remaining</div>
        </div>
      </div>
    </div>

    <div class="grid g-2-1">
      <div class="card">
        <h3>Cash available vs instalment</h3>
        <div class="chartbox" id="chartbox">${chart.svg}</div>
        <div class="legend">
          <span><i style="background:#8d5f80"></i>affordable (P25 band)</span>
          <span><i style="background:#e8798a"></i>contracted EMI</span>
          <span><i style="background:#d9a7c7"></i>CENTRIC plan</span>
          <span style="color:var(--bad)">▊ shaded = month the EMI exceeds what they have</span>
        </div>
        ${plan ? `<div class="rec">
          <div class="t">${plan.name}${plan.feasible ? ""
            : ' <span class="badge refer">refer to officer</span>'}</div>
          <p class="small muted" style="margin:6px 0 0">${plan.note}</p>
          <div class="stats">
            <div><span>breach-months</span>${fixed.breach_months.length} → ${plan.breach_months.length}</div>
            <div><span>tenure</span>${loan.tenure_months} → ${plan.tenure}m</div>
            <div><span>NPV vs contract</span>${pct(plan.npv_ratio, 2)}</div>
            <div><span>interest</span>${pct(plan.interest_ratio, 1)}</div>
            <div><span>collected</span>${money(plan.total_collected)}</div>
          </div></div>` : '<p class="muted">No feasible plan under current policy.</p>'}
      </div>

      <div class="card">
        <h3>Diagnosis</h3>
        <div style="display:flex;justify-content:center;margin-bottom:6px">
          ${Chart.ring(dg.confidence, pct(dg.confidence, 0), "confidence",
            dg.verdict === "structural_decline" ? "#e8798a"
              : dg.verdict === "seasonal_dip" ? "#e6b87a" : "#6fd6a4")}
        </div>
        <div style="text-align:center;margin-bottom:12px">
          <span class="badge ${dg.verdict}">${dg.verdict.replace(/_/g, " ")}</span>
        </div>
        <p class="small muted">${dg.detail}</p>
        <div class="grid g2" style="gap:10px;margin-top:14px">
          <div class="stat" style="padding:12px 14px">
            <div class="v" style="font-size:19px">${dg.trend_change_pct > 0 ? "+" : ""}${dg.trend_change_pct}%</div>
            <div class="s">deseasonalised change</div></div>
          <div class="stat" style="padding:12px 14px">
            <div class="v" style="font-size:19px">${pct(dg.recovery_probability, 0)}</div>
            <div class="s">seasonal recovery odds</div></div>
        </div>
      </div>
    </div>

    <div class="card chat-card">
      <h3>Ask CENTRIC <span class="dim" style="text-transform:none;letter-spacing:0">
        — this borrower, in plain words</span></h3>
      <div class="chat" id="chat">
        <div class="bubble bot">Hello — ask me anything about ${b.name.split(" ")[0]}.
          I'll keep it jargon-free.</div>
      </div>
      <div class="chips" id="chat-qs">
        ${chatAnswers(d).map((c, i) => `<button class="chip" data-q="${i}">${c.q}</button>`).join("")}
      </div>
    </div>

    <div class="grid g2">
      <div class="card">
        <h3>Evidence</h3>
        <p class="small" style="color:var(--accent);margin-bottom:14px">${ev.headline}</p>
        ${ev.items.map((i) => `
          <div class="ev-item">
            <div class="ev-w"><b>${i.weight.toFixed(2)}</b>
              <div class="ev-bar"><i style="width:${i.weight * 100}%"></i></div></div>
            <div class="ev-txt"><b>${i.factor}</b><p>${i.finding}</p>
              <span class="src">source: ${i.source}</span></div>
          </div>`).join("")}
        <div class="cf"><b>Counterfactual.</b> ${ev.counterfactual}</div>
      </div>

      <div class="card">
        <h3>Month by month</h3>
        <div class="table-wrap"><table>
          <thead><tr><th>Month</th><th class="num">Affordable</th><th class="num">Contracted</th>
            <th class="num">CENTRIC</th><th class="num">Stress</th></tr></thead>
          <tbody>${labels.map((l, i) => {
            const br = fixed.breach_months.includes(i);
            return `<tr style="cursor:default">
              <td>${l}</td>
              <td class="num">${money(afford[i])}</td>
              <td class="num ${br ? "delta-bad" : ""}">${money(fx[i])}</td>
              <td class="num" style="color:var(--accent)">${money(pl[i])}</td>
              <td class="num ${br ? "delta-bad" : "dim"}">${((d.stress.probabilities[i] || 0) * 100).toFixed(0)}%</td>
            </tr>`; }).join("")}</tbody>
        </table></div>
      </div>
    </div>`;
  }

  /* ───────────────────────── POLICY LAB ───────────────────────── */
  function lab(sweep, dials) {
    const labels = sweep.map((s) => s.cap.toFixed(2));
    return `
    <div class="card glow">
      <h3>Policy dials</h3>
      <p class="small muted" style="max-width:720px">These are not model parameters. They are
        decisions a lending institution makes, so CENTRIC exposes them instead of burying them
        in a constant. Move one and the whole book re-runs.</p>
      <div class="dials" style="margin-top:18px">
        ${[
          ["utilisation", "Utilisation", 0.5, 1, 0.05, dials.utilisation],
          ["max_extension", "Max extension", 0, 12, 1, dials.max_extension],
          ["grace", "Grace months", 0, 6, 1, dials.grace],
          ["interest_cap", "Interest cap", 1, 1.6, 0.02, dials.interest_cap],
          ["npv_floor", "NPV floor", 0.8, 1.05, 0.01, dials.npv_floor],
        ].map(([id, label, min, max, step, val]) => `
          <div class="dial">
            <label for="${id}">${label}</label>
            <div class="row">
              <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}">
              <output id="${id}-out"></output>
            </div>
          </div>`).join("")}
      </div>
      <p class="dial-note">Utilisation is the share of spare cash we are willing to claim — at 90%
        a borrower always keeps a tenth of their surplus.</p>
    </div>

    <div class="grid g2">
      <div class="card">
        <h3>Interest cap sensitivity</h3>
        <p class="small muted">How many borrowers can be rescued, at what cost to them.</p>
        ${Chart.bars(labels, sweep.map((s) => s.rescued), sweep.map((s) => s.referred))}
        <div class="legend">
          <span><i style="background:#d9a7c7"></i>rescued inside policy</span>
          <span><i style="background:#e8798a"></i>referred to a human</span>
        </div>
      </div>
      <div class="card">
        <h3>The trade-off, stated plainly</h3>
        <div class="table-wrap"><table>
          <thead><tr><th class="num">Cap</th><th class="num">Rescued</th>
            <th class="num">Referred</th><th class="num">Book NPV</th></tr></thead>
          <tbody>${sweep.map((s) => `<tr style="cursor:default">
            <td class="num">${pct(s.cap, 0)}</td>
            <td class="num delta-good">${s.rescued}</td>
            <td class="num ${s.referred ? "delta-bad" : "dim"}">${s.referred}</td>
            <td class="num">${pct(s.npv, 2)}</td></tr>`).join("")}</tbody>
        </table></div>
        <div class="callout">Raising the cap rescues more borrowers <em>and</em> charges them more
          interest. There is no setting that is simply correct. That is the point — the model
          surfaces the choice rather than making it silently.</div>
      </div>
    </div>`;
  }

  return { paged, landing, about, overview, learn, invest, earn, DOMAINS, chatAnswers, demo, how, modules, portfolio, borrower, lab, DEMO_STEPS };
})();
