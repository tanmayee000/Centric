/* CENTRIC — hand-rolled SVG charts. No library, no build. */

const Chart = (() => {
  const NS = "http://www.w3.org/2000/svg";
  const money = (v) => "\u20b9" + Math.round(v).toLocaleString("en-IN");
  const uid = () => "g" + Math.random().toString(36).slice(2, 8);

  function frame(w, h) {
    return {
      w, h, parts: [],
      add(s) { this.parts.push(s); return this; },
      done(extra = "") {
        return `<svg class="chart" viewBox="0 0 ${this.w} ${this.h}"
          preserveAspectRatio="none" ${extra}>${this.parts.join("")}</svg>`;
      },
    };
  }

  /* Area + lines, with a hover rail. Used for the borrower cash-flow view. */
  function cashflow(labels, afford, fixed, plan, breaches) {
    const W = 860, H = 300, P = { t: 22, r: 18, b: 34, l: 54 };
    const iw = W - P.l - P.r, ih = H - P.t - P.b;
    const n = labels.length;
    const max = Math.max(...afford, ...fixed, ...plan, 1) * 1.14;
    const x = (i) => P.l + (n === 1 ? iw / 2 : (i * iw) / (n - 1));
    const y = (v) => P.t + ih - (v / max) * ih;
    const g = uid();
    const f = frame(W, H);

    f.add(`<defs>
      <linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#d9a7c7" stop-opacity=".30"/>
        <stop offset="100%" stop-color="#d9a7c7" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="${g}l" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#d9a7c7"/>
        <stop offset="100%" stop-color="#b57fa5"/>
      </linearGradient>
    </defs>`);

    // gridlines
    for (let k = 0; k <= 4; k++) {
      const v = (max / 4) * k, yy = y(v);
      f.add(`<line x1="${P.l}" y1="${yy}" x2="${W - P.r}" y2="${yy}"
        stroke="#2a2027" stroke-width="1"/>`);
      f.add(`<text x="${P.l - 10}" y="${yy + 4}" fill="#6d616a" font-size="10"
        text-anchor="end">${v >= 1000 ? Math.round(v / 1000) + "k" : Math.round(v)}</text>`);
    }

    // breach bands
    breaches.forEach((i) => {
      if (i >= n) return;
      const half = n > 1 ? iw / (n - 1) / 2 : iw / 2;
      f.add(`<rect x="${x(i) - half}" y="${P.t}" width="${half * 2}" height="${ih}"
        fill="#e8798a" opacity=".07"/>`);
    });

    // affordability area
    const area = afford.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ")
      + ` L${x(n - 1)},${P.t + ih} L${x(0)},${P.t + ih} Z`;
    f.add(`<path d="${area}" fill="url(#${g})"/>`);
    f.add(`<path d="${afford.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ")}"
      fill="none" stroke="#8d5f80" stroke-width="1.6" stroke-opacity=".85"/>`);

    // fixed EMI (dashed) and the plan (solid)
    f.add(`<path d="${fixed.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ")}"
      fill="none" stroke="#e8798a" stroke-width="2" stroke-dasharray="7 5"/>`);
    f.add(`<path d="${plan.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ")}"
      fill="none" stroke="url(#${g}l)" stroke-width="2.6" stroke-linejoin="round"/>`);
    plan.forEach((v, i) => f.add(`<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="#d9a7c7"/>`));

    // month labels
    labels.forEach((l, i) => {
      if (n > 14 && i % 2) return;
      f.add(`<text x="${x(i)}" y="${H - 12}" fill="#6d616a" font-size="10"
        text-anchor="middle">${l}</text>`);
    });

    // invisible hover targets
    const step = n > 1 ? iw / (n - 1) : iw;
    labels.forEach((l, i) => {
      f.add(`<rect class="hit" data-i="${i}" x="${x(i) - step / 2}" y="${P.t}"
        width="${step}" height="${ih}" fill="transparent"/>`);
    });
    f.add(`<line class="rail" x1="0" y1="${P.t}" x2="0" y2="${P.t + ih}"
      stroke="#d9a7c7" stroke-width="1" stroke-dasharray="3 3" opacity="0"/>`);
    f.add(`<circle class="raildot" r="5" fill="#d9a7c7" opacity="0"/>`);

    return { svg: f.done('style="width:100%;height:auto"'), x, y };
  }

  /* Small sparkline for stat cards and table rows. */
  function spark(values, w = 104, h = 32, color = "#d9a7c7") {
    if (!values.length) return "";
    const min = Math.min(...values), max = Math.max(...values);
    const rng = max - min || 1;
    const x = (i) => (i * w) / Math.max(values.length - 1, 1);
    const y = (v) => h - 3 - ((v - min) / rng) * (h - 8);
    const line = values.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
    const g = uid();
    return `<svg viewBox="0 0 ${w} ${h}" class="chart" style="width:${w}px;height:${h}px">
      <defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity=".35"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient></defs>
      <path d="${line} L${w},${h} L0,${h} Z" fill="url(#${g})"/>
      <path d="${line}" fill="none" stroke="${color}" stroke-width="1.5"/>
    </svg>`;
  }

  /* Progress ring — diagnosis confidence, recovery probability. */
  function ring(pct, label, sub, color = "#d9a7c7", size = 132) {
    const r = size / 2 - 12, c = 2 * Math.PI * r, o = c * (1 - Math.max(0, Math.min(1, pct)));
    return `<svg viewBox="0 0 ${size} ${size}" class="chart"
        style="width:${size}px;height:${size}px">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#2a2027" stroke-width="9"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}"
        stroke-width="9" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${o}"
        transform="rotate(-90 ${size / 2} ${size / 2})"/>
      <text x="${size / 2}" y="${size / 2 + 2}" text-anchor="middle" fill="#f2ecef"
        font-size="23" font-weight="600">${label}</text>
      <text x="${size / 2}" y="${size / 2 + 20}" text-anchor="middle" fill="#6d616a"
        font-size="10">${sub}</text>
    </svg>`;
  }

  /* Paired bars — used in the policy lab for rescued vs referred. */
  function bars(labels, seriesA, seriesB, nameA, nameB) {
    const W = 560, H = 230, P = { t: 18, r: 14, b: 40, l: 34 };
    const iw = W - P.l - P.r, ih = H - P.t - P.b;
    const max = Math.max(...seriesA, ...seriesB, 1) * 1.2;
    const slot = iw / labels.length, bw = Math.min(20, slot / 3);
    const y = (v) => P.t + ih - (v / max) * ih;
    const f = frame(W, H);

    for (let k = 0; k <= 3; k++) {
      const yy = y((max / 3) * k);
      f.add(`<line x1="${P.l}" y1="${yy}" x2="${W - P.r}" y2="${yy}" stroke="#2a2027"/>`);
      f.add(`<text x="${P.l - 8}" y="${yy + 4}" fill="#6d616a" font-size="9"
        text-anchor="end">${Math.round((max / 3) * k)}</text>`);
    }
    labels.forEach((l, i) => {
      const cx = P.l + slot * i + slot / 2;
      const a = seriesA[i], b = seriesB[i];
      f.add(`<rect x="${cx - bw - 2}" y="${y(a)}" width="${bw}" height="${P.t + ih - y(a)}"
        rx="3" fill="#d9a7c7"/>`);
      f.add(`<rect x="${cx + 2}" y="${y(b)}" width="${bw}" height="${P.t + ih - y(b)}"
        rx="3" fill="#e8798a" opacity=".75"/>`);
      f.add(`<text x="${cx}" y="${H - 22}" fill="#a2949c" font-size="10"
        text-anchor="middle">${l}</text>`);
      f.add(`<text x="${cx}" y="${H - 9}" fill="#6d616a" font-size="8.5"
        text-anchor="middle">cap</text>`);
    });
    return f.done('style="width:100%;height:auto"');
  }


  /* Layered cash-flow frame for the guided demo. `step` reveals more each time. */
  function demo(labels, afford, fixed, plan, breaches, step) {
    const W = 860, H = 320, P = { t: 26, r: 18, b: 38, l: 56 };
    const iw = W - P.l - P.r, ih = H - P.t - P.b;
    const n = labels.length;
    const max = Math.max(...afford, ...fixed, ...plan, 1) * 1.16;
    const x = (i) => P.l + (n === 1 ? iw / 2 : (i * iw) / (n - 1));
    const y = (v) => P.t + ih - (v / max) * ih;
    const g = uid();
    const f = frame(W, H);

    f.add(`<defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#d9a7c7" stop-opacity=".30"/>
      <stop offset="100%" stop-color="#d9a7c7" stop-opacity="0"/></linearGradient></defs>`);

    for (let k = 0; k <= 4; k++) {
      const v = (max / 4) * k, yy = y(v);
      f.add(`<line x1="${P.l}" y1="${yy}" x2="${W - P.r}" y2="${yy}" stroke="#2a2027"/>`);
      f.add(`<text x="${P.l - 10}" y="${yy + 4}" fill="#6d616a" font-size="10"
        text-anchor="end">${v >= 1000 ? Math.round(v / 1000) + "k" : Math.round(v)}</text>`);
    }

    // step 0+ : the borrower's income as bars
    const slot = iw / n, bw = Math.min(26, slot * 0.55);
    afford.forEach((v, i) => {
      const hgt = Math.max(0, P.t + ih - y(v));
      const hot = step >= 2 && breaches.includes(i);
      f.add(`<rect class="g-bar" style="--d:${i * 0.035}s;--oy:${P.t + ih}px"
        x="${x(i) - bw / 2}" y="${y(v)}" width="${bw}" height="${hgt}" rx="3"
        fill="${hot ? "rgba(232,121,138,.32)" : "rgba(141,95,128,.34)"}"
        stroke="${hot ? "#e8798a" : "#8d5f80"}" stroke-width="1"/>`);
    });

    // step 1+ : the flat contracted EMI
    if (step >= 1) {
      f.add(`<path class="g-flat" d="${fixed.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ")}"
        fill="none" stroke="#e8798a" stroke-width="2.4" stroke-dasharray="7 5"/>`);
      f.add(`<text x="${W - P.r}" y="${y(fixed[0]) - 9}" fill="#e8798a" font-size="10"
        text-anchor="end">contracted EMI</text>`);
    }

    // step 2 : shade and count the months where it does not fit
    if (step >= 2) {
      breaches.forEach((i) => {
        if (i >= n) return;
        f.add(`<rect x="${x(i) - slot / 2}" y="${P.t}" width="${slot}" height="${ih}"
          fill="#e8798a" opacity=".08"/>`);
        f.add(`<text class="g-mark" style="--d:${0.06 * i}s" x="${x(i)}" y="${P.t - 8}"
          fill="#e8798a" font-size="11" text-anchor="middle">\u2715</text>`);
      });
    }

    // step 3+ : the affordability ceiling
    if (step >= 3) {
      const area = afford.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ")
        + ` L${x(n - 1)},${P.t + ih} L${x(0)},${P.t + ih} Z`;
      f.add(`<path d="${area}" fill="url(#${g})"/>`);
      f.add(`<path class="g-ceiling" d="${afford.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ")}"
        fill="none" stroke="#8d5f80" stroke-width="1.8" stroke-dasharray="2 3"/>`);
    }

    // step 4+ : the plan that fits underneath it
    if (step >= 4) {
      f.add(`<path class="g-plan" d="${plan.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ")}"
        fill="none" stroke="#d9a7c7" stroke-width="3" stroke-linejoin="round"/>`);
      plan.forEach((v, i) => f.add(`<circle class="g-dot" style="--d:${0.5 + i * 0.045}s"
        cx="${x(i)}" cy="${y(v)}" r="3.4" fill="#d9a7c7"/>`));
      plan.forEach((v, i) => f.add(`<text class="g-mark" style="--d:${0.6 + 0.05 * i}s"
        x="${x(i)}" y="${P.t - 8}" fill="#6fd6a4" font-size="11" text-anchor="middle">\u2713</text>`));
    }

    labels.forEach((l, i) => {
      if (n > 14 && i % 2) return;
      f.add(`<text x="${x(i)}" y="${H - 14}" fill="#6d616a" font-size="10"
        text-anchor="middle">${l}</text>`);
    });
    return f.done('style="width:100%;height:auto"');
  }

  /* Three stacked mini-charts: observed = trend + season + shock. */
  function split(labels, observed, trend, seasonal, residual) {
    const rows = [
      ["What we see", observed, "#d9a7c7", false],
      ["Trend", trend, "#6fd6a4", false],
      ["Season", seasonal, "#e6b87a", true],
      ["Shock", residual, "#e8798a", true],
    ];
    const W = 760, rowH = 62, gap = 8, P = { l: 84, r: 14 };
    const H = rows.length * (rowH + gap);
    const iw = W - P.l - P.r;
    const f = frame(W, H);

    rows.forEach(([name, vals, col, centred], ri) => {
      const top = ri * (rowH + gap);
      const clean = vals.filter((v) => v !== null && v !== undefined);
      if (!clean.length) return;
      const lo = centred ? -Math.max(...clean.map(Math.abs)) : Math.min(...clean, 0);
      const hi = centred ? Math.max(...clean.map(Math.abs)) : Math.max(...clean);
      const rng = hi - lo || 1;
      const x = (i) => P.l + (i * iw) / Math.max(vals.length - 1, 1);
      const y = (v) => top + rowH - 8 - ((v - lo) / rng) * (rowH - 16);

      f.add(`<text x="0" y="${top + rowH / 2 + 3}" fill="#a2949c" font-size="10.5">${name}</text>`);
      f.add(`<line x1="${P.l}" y1="${y(centred ? 0 : lo)}" x2="${W - P.r}"
        y2="${y(centred ? 0 : lo)}" stroke="#2a2027"/>`);

      if (centred) {
        const bw = Math.max(2, iw / vals.length - 2);
        vals.forEach((v, i) => {
          if (v === null) return;
          const zero = y(0), yy = y(v);
          f.add(`<rect x="${x(i) - bw / 2}" y="${Math.min(zero, yy)}" width="${bw}"
            height="${Math.abs(zero - yy)}" fill="${col}" opacity=".75" rx="1"/>`);
        });
      } else {
        let d = "", pen = false;
        vals.forEach((v, i) => {
          if (v === null || v === undefined) { pen = false; return; }
          d += `${pen ? "L" : "M"}${x(i)},${y(v)} `;
          pen = true;
        });
        f.add(`<path d="${d}" fill="none" stroke="${col}" stroke-width="2"/>`);
      }
    });
    return f.done('style="width:100%;height:auto"');
  }

  /* Donut with a centre label — diagnosis mix across the book. */
  function donut(segments, centre, sub, size = 168) {
    const total = segments.reduce((a, s) => a + s.value, 0) || 1;
    const r = size / 2 - 16, c = 2 * Math.PI * r;
    let off = 0;
    const f = frame(size, size);
    f.add(`<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none"
      stroke="#2a2027" stroke-width="15"/>`);
    segments.forEach((s) => {
      const len = (s.value / total) * c;
      f.add(`<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${s.color}"
        stroke-width="15" stroke-dasharray="${len - 2} ${c - len + 2}"
        stroke-dashoffset="${-off}" transform="rotate(-90 ${size / 2} ${size / 2})"/>`);
      off += len;
    });
    f.add(`<text x="${size / 2}" y="${size / 2 + 2}" text-anchor="middle" fill="#f2ecef"
      font-size="25" font-weight="600">${centre}</text>`);
    f.add(`<text x="${size / 2}" y="${size / 2 + 20}" text-anchor="middle" fill="#6d616a"
      font-size="10">${sub}</text>`);
    return f.done(`style="width:${size}px;height:${size}px"`);
  }

  /* Horizontal before/after bars — breach-months per borrower. */
  function hbars(items) {
    const rowH = 26, W = 560, P = { l: 128, r: 40 };
    const H = items.length * rowH + 8;
    const iw = W - P.l - P.r;
    const max = Math.max(...items.map((i) => i.before), 1);
    const f = frame(W, H);
    items.forEach((it, i) => {
      const yy = i * rowH + 6;
      f.add(`<text x="0" y="${yy + 11}" fill="#a2949c" font-size="11">${it.label}</text>`);
      f.add(`<rect x="${P.l}" y="${yy + 1}" width="${(it.before / max) * iw}" height="7" rx="3.5"
        fill="#e8798a" opacity=".8"/>`);
      f.add(`<rect x="${P.l}" y="${yy + 11}" width="${Math.max((it.after / max) * iw, 2)}"
        height="7" rx="3.5" fill="${it.after ? "#e6b87a" : "#6fd6a4"}"/>`);
      f.add(`<text x="${W - P.r + 6}" y="${yy + 13}" fill="#6d616a" font-size="10">
        ${it.before}\u2192${it.after}</text>`);
    });
    return f.done('style="width:100%;height:auto"');
  }


  /* Hero illustration: wavy income against a flat instalment. Decorative but honest. */
  function mismatch(w = 560, h = 190) {
    const P = { t: 20, r: 16, b: 20, l: 16 };
    const iw = w - P.l - P.r, ih = h - P.t - P.b;
    const n = 48;
    const inc = [];
    for (let i = 0; i < n; i++) {
      const t = (i / (n - 1)) * Math.PI * 4;
      inc.push(0.52 + 0.40 * Math.sin(t - 1.1) + 0.06 * Math.sin(t * 3.1));
    }
    const emi = 0.46;
    const x = (i) => P.l + (i * iw) / (n - 1);
    const y = (v) => P.t + ih - v * ih;
    const g = uid();
    const f = frame(w, h);

    f.add(`<defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#d9a7c7" stop-opacity=".34"/>
      <stop offset="100%" stop-color="#d9a7c7" stop-opacity="0"/></linearGradient>
      <linearGradient id="${g}s" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e8798a" stop-opacity=".26"/>
      <stop offset="100%" stop-color="#e8798a" stop-opacity="0"/></linearGradient></defs>`);

    // shortfall pockets — where the flat line sits above the curve
    let run = [];
    const flush = () => {
      if (run.length > 1) {
        const top = run.map((i) => `${i === run[0] ? "M" : "L"}${x(i)},${y(emi)}`).join(" ");
        const back = [...run].reverse().map((i) => `L${x(i)},${y(inc[i])}`).join(" ");
        f.add(`<path d="${top} ${back} Z" fill="url(#${g}s)"/>`);
      }
      run = [];
    };
    inc.forEach((v, i) => { if (v < emi) run.push(i); else flush(); });
    flush();

    const line = inc.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
    f.add(`<path d="${line} L${x(n - 1)},${P.t + ih} L${x(0)},${P.t + ih} Z" fill="url(#${g})"/>`);
    f.add(`<path d="${line}" fill="none" stroke="#d9a7c7" stroke-width="2.2"/>`);
    f.add(`<line x1="${P.l}" y1="${y(emi)}" x2="${w - P.r}" y2="${y(emi)}"
      stroke="#e8798a" stroke-width="2" stroke-dasharray="7 5"/>`);
    f.add(`<text x="${P.l + 2}" y="${y(emi) - 9}" fill="#e8798a" font-size="10.5">fixed instalment</text>`);
    f.add(`<text x="${P.l + 2}" y="${P.t + 11}" fill="#d9a7c7" font-size="10.5">what they actually earn</text>`);
    return f.done('style="width:100%;height:auto"');
  }

  /* Two surfaces, one engine. */
  function bridge(w = 720, h = 210) {
    const f = frame(w, h);
    const box = (bx, by, bw, bh, title, lines, accent) => {
      f.add(`<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="14"
        fill="${accent ? "rgba(217,167,199,.10)" : "rgba(255,255,255,.025)"}"
        stroke="${accent ? "rgba(217,167,199,.45)" : "#2a2027"}" stroke-width="1"/>`);
      f.add(`<text x="${bx + bw / 2}" y="${by + 26}" text-anchor="middle"
        fill="${accent ? "#d9a7c7" : "#f2ecef"}" font-size="13" font-weight="600">${title}</text>`);
      lines.forEach((t, i) => f.add(`<text x="${bx + bw / 2}" y="${by + 48 + i * 15}"
        text-anchor="middle" fill="#a2949c" font-size="10.5">${t}</text>`));
    };
    const cw = 212, ch = 108, cy = (h - ch) / 2;
    box(0, cy, cw, ch, "Borrower app",
        ["sees a schedule", "they can actually keep", "in plain language"], false);
    box((w - cw) / 2, cy - 12, cw, ch + 24, "Cash-flow engine",
        ["volatility · seasonality", "affordability band", "plan optimiser"], true);
    box(w - cw, cy, cw, ch, "Lender console",
        ["sees why it still", "recovers, with the", "evidence attached"], false);

    [[cw, (w - cw) / 2], [(w + cw) / 2, w - cw]].forEach(([x1, x2], k) => {
      const mid = h / 2;
      f.add(`<line x1="${x1 + 8}" y1="${mid}" x2="${x2 - 8}" y2="${mid}"
        stroke="#8d5f80" stroke-width="1.4" stroke-dasharray="4 4"/>`);
      const tip = k === 0 ? x2 - 8 : x1 + 8;
      const dir = k === 0 ? -1 : 1;
      f.add(`<path d="M${tip},${mid} l${dir * 7},-4 l0,8 Z" fill="#8d5f80"/>`);
    });
    return f.done('style="width:100%;height:auto"');
  }

  /* Eight modules orbiting the engine. */
  function orbit(names, size = 360) {
    const c = size / 2, R = c - 52;
    const f = frame(size, size);
    f.add(`<circle cx="${c}" cy="${c}" r="${R}" fill="none" stroke="#2a2027"
      stroke-dasharray="3 5"/>`);
    names.forEach((n, i) => {
      const a = (i / names.length) * Math.PI * 2 - Math.PI / 2;
      const px = c + Math.cos(a) * R, py = c + Math.sin(a) * R;
      f.add(`<line x1="${c}" y1="${c}" x2="${px}" y2="${py}" stroke="#2a2027"/>`);
      f.add(`<circle cx="${px}" cy="${py}" r="25" fill="#1c1519" stroke="#3a2d35"/>`);
      const words = n.split(" ");
      words.forEach((wd, k) => f.add(`<text x="${px}" y="${py + 3 - (words.length - 1) * 5 + k * 10}"
        text-anchor="middle" fill="#a2949c" font-size="8.5">${wd}</text>`));
    });
    f.add(`<circle cx="${c}" cy="${c}" r="46" fill="rgba(217,167,199,.13)"
      stroke="rgba(217,167,199,.5)" stroke-width="1.5"/>`);
    f.add(`<text x="${c}" y="${c - 4}" text-anchor="middle" fill="#d9a7c7"
      font-size="11.5" font-weight="600">Cash-flow</text>`);
    f.add(`<text x="${c}" y="${c + 9}" text-anchor="middle" fill="#d9a7c7"
      font-size="11.5" font-weight="600">engine</text>`);
    return f.done(`style="width:100%;max-width:${size}px;height:auto"`);
  }


  /* Animated hero backdrop: seasonal income drifting under a flat instalment.
     Each wave path is drawn twice the width and slid left, so the loop seams. */
  function hero(w = 1400, h = 460) {
    const f = frame(w, h);
    const g = uid();
    f.add(`<defs>
      <linearGradient id="${g}a" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#d9a7c7" stop-opacity=".26"/>
        <stop offset="100%" stop-color="#d9a7c7" stop-opacity="0"/></linearGradient>
      <linearGradient id="${g}b" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#b57fa5" stop-opacity=".18"/>
        <stop offset="100%" stop-color="#b57fa5" stop-opacity="0"/></linearGradient>
    </defs>`);

    const wave = (amp, base, freq, phase) => {
      let d = "";
      for (let i = 0; i <= 240; i++) {
        const x = (i / 120) * w;               // two screen-widths of path
        const t = (i / 120) * Math.PI * freq + phase;
        const y = base + Math.sin(t) * amp + Math.sin(t * 2.7 + 1.4) * amp * 0.28;
        d += `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)} `;
      }
      return d;
    };

    const w1 = wave(66, h * 0.60, 4, 0);
    const w2 = wave(48, h * 0.72, 5.4, 2.1);

    f.add(`<g class="hw hw-1">
      <path d="${w1} L${w * 2},${h} L0,${h} Z" fill="url(#${g}a)"/>
      <path d="${w1}" fill="none" stroke="#d9a7c7" stroke-width="2.2" stroke-opacity=".85"/>
    </g>`);
    f.add(`<g class="hw hw-2">
      <path d="${w2} L${w * 2},${h} L0,${h} Z" fill="url(#${g}b)"/>
      <path d="${w2}" fill="none" stroke="#b57fa5" stroke-width="1.6" stroke-opacity=".55"/>
    </g>`);


    // drifting motes
    [[0.12, 0.30, 3], [0.31, 0.22, 2], [0.62, 0.34, 2.6], [0.80, 0.24, 2],
     [0.46, 0.44, 1.8], [0.91, 0.40, 2.4]].forEach(([px, py, r], i) => {
      f.add(`<circle class="mote m${i % 3}" cx="${w * px}" cy="${h * py}" r="${r}"
        fill="#d9a7c7" opacity=".55"/>`);
    });
    return f.done('preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%"');
  }


  /* Risk vs return scatter — the investing section. */
  function riskReturn(items) {
    const W = 560, H = 300, P = { t: 18, r: 18, b: 44, l: 52 };
    const iw = W - P.l - P.r, ih = H - P.t - P.b;
    const x = (v) => P.l + (v / 10) * iw;
    const y = (v) => P.t + ih - (v / 16) * ih;
    const f = frame(W, H);
    for (let k = 0; k <= 4; k++) {
      const yy = P.t + (ih / 4) * k, xx = P.l + (iw / 4) * k;
      f.add(`<line x1="${P.l}" y1="${yy}" x2="${W - P.r}" y2="${yy}" stroke="#2a2027"/>`);
      f.add(`<line x1="${xx}" y1="${P.t}" x2="${xx}" y2="${P.t + ih}" stroke="#2a2027"/>`);
    }
    f.add(`<text x="${P.l}" y="${H - 10}" fill="#6d616a" font-size="10">safer →</text>`);
    f.add(`<text x="${W - P.r}" y="${H - 10}" fill="#6d616a" font-size="10"
      text-anchor="end">← riskier</text>`);
    f.add(`<text x="12" y="${P.t + 8}" fill="#6d616a" font-size="10">higher return</text>`);
    items.forEach((it, i) => {
      f.add(`<circle class="rr-dot" style="--d:${i * 0.08}s" cx="${x(it.risk)}" cy="${y(it.ret)}"
        r="${8 + it.ret * 0.5}" fill="${it.color}" opacity=".24"/>`);
      f.add(`<circle class="rr-dot" style="--d:${i * 0.08 + 0.05}s" cx="${x(it.risk)}"
        cy="${y(it.ret)}" r="4.5" fill="${it.color}"/>`);
      f.add(`<text class="rr-lbl" style="--d:${i * 0.08 + 0.12}s" x="${x(it.risk)}"
        y="${y(it.ret) - 15}" fill="#a2949c" font-size="10"
        text-anchor="middle">${it.name}</text>`);
    });
    return f.done('style="width:100%;height:auto"');
  }

  /* Compounding curve — what a small monthly amount becomes. */
  function compound(monthly, rate, years) {
    const W = 560, H = 230, P = { t: 18, r: 16, b: 30, l: 56 };
    const iw = W - P.l - P.r, ih = H - P.t - P.b;
    const pts = [], flat = [];
    let bal = 0;
    for (let m = 0; m <= years * 12; m++) {
      pts.push(bal);
      flat.push(monthly * m);
      bal = bal * (1 + rate / 12) + monthly;
    }
    const max = Math.max(...pts) * 1.1 || 1;
    const x = (i) => P.l + (i * iw) / (pts.length - 1);
    const y = (v) => P.t + ih - (v / max) * ih;
    const g = uid();
    const f = frame(W, H);
    f.add(`<defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#6fd6a4" stop-opacity=".28"/>
      <stop offset="100%" stop-color="#6fd6a4" stop-opacity="0"/></linearGradient></defs>`);
    for (let k = 0; k <= 3; k++) {
      const v = (max / 3) * k, yy = y(v);
      f.add(`<line x1="${P.l}" y1="${yy}" x2="${W - P.r}" y2="${yy}" stroke="#2a2027"/>`);
      f.add(`<text x="${P.l - 8}" y="${yy + 4}" fill="#6d616a" font-size="9.5"
        text-anchor="end">\u20b9${Math.round(v / 1000)}k</text>`);
    }
    const line = pts.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
    f.add(`<path d="${line} L${x(pts.length - 1)},${P.t + ih} L${P.l},${P.t + ih} Z"
      fill="url(#${g})"/>`);
    f.add(`<path class="g-plan" d="${flat.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ")}"
      fill="none" stroke="#6d616a" stroke-width="1.6" stroke-dasharray="5 4"/>`);
    f.add(`<path class="g-plan" d="${line}" fill="none" stroke="#6fd6a4" stroke-width="2.6"/>`);
    for (let yr = 1; yr <= years; yr++) {
      const i = yr * 12;
      f.add(`<text x="${x(i)}" y="${H - 10}" fill="#6d616a" font-size="9.5"
        text-anchor="middle">${yr}y</text>`);
    }
    f.add(`<text x="${x(pts.length - 1)}" y="${y(pts[pts.length - 1]) - 10}" fill="#6fd6a4"
      font-size="11" text-anchor="end">with growth</text>`);
    f.add(`<text x="${x(pts.length - 1)}" y="${y(flat[flat.length - 1]) + 16}" fill="#6d616a"
      font-size="10.5" text-anchor="end">just saved</text>`);
    return f.done('style="width:100%;height:auto"');
  }

  /* Priority ladder — where the next ₹500 should go. */
  function ladder(rungs) {
    const W = 560, rowH = 58, P = { l: 46, r: 14 };
    const H = rungs.length * rowH + 10;
    const f = frame(W, H);
    rungs.forEach((r, i) => {
      const yy = i * rowH + 6;
      f.add(`<rect class="rung" style="--d:${i * 0.09}s" x="${P.l}" y="${yy}"
        width="${W - P.l - P.r}" height="${rowH - 12}" rx="11"
        fill="${i === 0 ? "rgba(217,167,199,.13)" : "rgba(255,255,255,.025)"}"
        stroke="${i === 0 ? "rgba(217,167,199,.45)" : "#2a2027"}"/>`);
      f.add(`<circle class="rung" style="--d:${i * 0.09}s" cx="${P.l / 2 + 4}"
        cy="${yy + (rowH - 12) / 2}" r="13" fill="#1c1519" stroke="#3a2d35"/>`);
      f.add(`<text class="rung" style="--d:${i * 0.09}s" x="${P.l / 2 + 4}"
        y="${yy + (rowH - 12) / 2 + 4}" text-anchor="middle" fill="#d9a7c7"
        font-size="11" font-weight="600">${i + 1}</text>`);
      f.add(`<text class="rung" style="--d:${i * 0.09}s" x="${P.l + 16}" y="${yy + 19}"
        fill="#f2ecef" font-size="12.5" font-weight="600">${r.title}</text>`);
      f.add(`<text class="rung" style="--d:${i * 0.09}s" x="${P.l + 16}" y="${yy + 35}"
        fill="#a2949c" font-size="10.5">${r.why}</text>`);
    });
    return f.done('style="width:100%;height:auto"');
  }

  return { cashflow, demo, split, donut, hbars, mismatch, bridge, orbit, hero,
           riskReturn, compound, ladder,
           spark, ring, bars, money };
})();
