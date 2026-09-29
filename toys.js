function startBubbleWrap() {
  openGame(
    "Bubble Wrap",
    "Toys",
    `
      <div class="game-layout">
        <div class="game-topline">
          <span class="game-stat" id="bwPopped">Popped: 0</span>
          <span class="game-stat" id="bwChain">Best chain: 0</span>
        </div>
        <p class="game-message" id="bwMsg">Click or drag across the sheet. The sheet is infinite. You are not.</p>
        <div class="bw-sheet" id="bwSheet"></div>
        <div class="game-actions">
          <button class="game-action" id="bwFresh" type="button">Fresh sheet</button>
          <button class="game-action" id="bwSize" type="button">Smaller bubbles</button>
        </div>
      </div>
    `
  );

  const sheet = document.querySelector("#bwSheet");
  const msg = document.querySelector("#bwMsg");
  const poppedEl = document.querySelector("#bwPopped");
  const chainEl = document.querySelector("#bwChain");
  let cols = 12;
  const rows = 8;
  let popped = 0;
  let lifetime = 0;
  let chain = 0;
  let best = 0;
  let lastPop = 0;
  let popping = false;
  let refilling = false;

  function build() {
    sheet.innerHTML = "";
    sheet.style.setProperty("--bw-cols", cols);
    for (let i = 0; i < cols * rows; i++) {
      const cell = document.createElement("div");
      cell.className = "bw-cell";
      sheet.append(cell);
    }
    popped = 0;
  }

  function popAt(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el || !el.classList.contains("bw-cell") || el.classList.contains("popped")) return;
    el.classList.add("popped");
    popped += 1;
    lifetime += 1;
    const now = performance.now();
    chain = now - lastPop < 600 ? chain + 1 : 1;
    lastPop = now;
    if (chain > best) {
      best = chain;
      chainEl.textContent = `Best chain: ${best}`;
    }
    poppedEl.textContent = `Popped: ${lifetime}`;
    if (popped === cols * rows && !refilling) {
      refilling = true;
      msg.textContent = "Sheet cleared. A fresh one, as promised.";
      sheet.classList.add("flash");
      setTimeout(() => {
        sheet.classList.remove("flash");
        build();
        refilling = false;
      }, 500);
    }
  }

  sheet.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    popping = true;
    popAt(e.clientX, e.clientY);
  });
  sheet.addEventListener("pointermove", (e) => {
    if (popping) popAt(e.clientX, e.clientY);
  });
  const stopPopping = () => { popping = false; };
  sheet.addEventListener("pointerup", stopPopping);
  sheet.addEventListener("pointercancel", stopPopping);
  sheet.addEventListener("pointerleave", stopPopping);
  sheet.addEventListener("contextmenu", (e) => e.preventDefault());

  document.querySelector("#bwFresh").addEventListener("click", () => {
    if (!refilling) {
      build();
      msg.textContent = "Fresh sheet. Go on.";
    }
  });
  document.querySelector("#bwSize").addEventListener("click", (e) => {
    cols = cols === 12 ? 18 : 12;
    e.currentTarget.textContent = cols === 12 ? "Smaller bubbles" : "Bigger bubbles";
    build();
  });

  build();
  setSnapshot({ mode: "playing", game: "Bubble Wrap", lifetime, best });
}

function startZenSand() {
  openGame(
    "Zen Sand",
    "Toys",
    `
      <div class="game-layout">
        <p class="game-message">Draw slowly for wide grooves, quickly for thin ones. Tap for ripples.</p>
        <div class="zen-stage">
          <canvas class="zen-canvas" id="zenBase" width="720" height="420"></canvas>
          <canvas class="zen-canvas zen-fx" id="zenFx" width="720" height="420"></canvas>
        </div>
        <div class="game-actions zen-actions">
          <div class="zen-swatches" id="zenSwatches"></div>
          <button class="game-action" id="zenClear" type="button">Smooth the sand</button>
        </div>
      </div>
    `
  );

  const base = document.querySelector("#zenBase");
  const fx = document.querySelector("#zenFx");
  const bctx = base.getContext("2d");
  const fctx = fx.getContext("2d");
  const W = 720;
  const H = 420;
  const palette = ["#8a6238", "#a97e4f", "#6b4a2b", "#c9a06b", "#4f8fcf"];
  let color = palette[0];
  let drawing = false;
  let lastPt = null;
  let renderPt = null;
  let curW = 9;
  let movedDist = 0;
  let ripples = [];
  let raf = 0;

  const swatches = document.querySelector("#zenSwatches");
  palette.forEach((c, i) => {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "zen-swatch" + (i === 0 ? " active" : "");
    swatch.style.background = c;
    swatch.setAttribute("aria-label", `Rake color ${i + 1}`);
    swatch.addEventListener("click", () => {
      color = c;
      swatches.querySelectorAll(".zen-swatch").forEach((el) => el.classList.remove("active"));
      swatch.classList.add("active");
    });
    swatches.append(swatch);
  });

  function paintSand() {
    bctx.fillStyle = "#efe4cd";
    bctx.fillRect(0, 0, W, H);
  }
  paintSand();

  function toCanvas(e) {
    const rect = base.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (W / rect.width),
      y: (e.clientY - rect.top) * (H / rect.height)
    };
  }

  function groove(from, to, w) {
    bctx.save();
    bctx.lineCap = "round";
    bctx.beginPath();
    bctx.moveTo(from.x, from.y);
    bctx.lineTo(to.x, to.y);
    bctx.strokeStyle = color;
    bctx.lineWidth = w;
    bctx.globalAlpha = 0.9;
    bctx.stroke();
    bctx.translate(1.5, 1.5);
    bctx.strokeStyle = "rgba(0,0,0,0.14)";
    bctx.lineWidth = Math.max(1, w * 0.5);
    bctx.stroke();
    bctx.translate(-3, -3);
    bctx.strokeStyle = "rgba(255,255,255,0.35)";
    bctx.lineWidth = Math.max(1, w * 0.3);
    bctx.stroke();
    bctx.restore();
  }

  function dot(pt, w) {
    bctx.save();
    bctx.globalAlpha = 0.9;
    bctx.fillStyle = color;
    bctx.beginPath();
    bctx.arc(pt.x, pt.y, w / 2, 0, Math.PI * 2);
    bctx.fill();
    bctx.restore();
  }

  function strokeTo(pt) {
    const dist = Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y);
    if (dist === 0) return;
    const targetW = Math.max(3, Math.min(16, 18 - dist * 0.35));
    const steps = Math.max(1, Math.ceil(dist / 5));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const next = { x: lastPt.x + (pt.x - lastPt.x) * t, y: lastPt.y + (pt.y - lastPt.y) * t };
      curW += (targetW - curW) * 0.35;
      groove(renderPt, next, curW);
      renderPt = next;
    }
    movedDist += dist;
    lastPt = pt;
  }

  base.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    base.setPointerCapture(e.pointerId);
    const p = toCanvas(e);
    drawing = true;
    movedDist = 0;
    lastPt = p;
    renderPt = p;
    curW = 9;
    dot(p, curW);
  });
  base.addEventListener("pointermove", (e) => {
    if (!drawing) return;
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of events) strokeTo(toCanvas(ev));
  });
  const stopDraw = () => { drawing = false; };
  base.addEventListener("pointerup", stopDraw);
  base.addEventListener("pointercancel", stopDraw);
  base.addEventListener("click", (e) => {
    if (movedDist >= 6) return;
    const p = toCanvas(e);
    ripples.push({ x: p.x, y: p.y, r: 4, life: 1 });
  });

  function fxTick() {
    fctx.clearRect(0, 0, W, H);
    ripples = ripples.filter((r) => r.life > 0);
    for (const r of ripples) {
      r.r += 1.6;
      r.life -= 0.02;
      fctx.beginPath();
      fctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      fctx.strokeStyle = `rgba(138,98,56,${Math.max(0, r.life) * 0.5})`;
      fctx.lineWidth = 2;
      fctx.stroke();
      if (r.r > 14) {
        fctx.beginPath();
        fctx.arc(r.x, r.y, r.r * 0.6, 0, Math.PI * 2);
        fctx.strokeStyle = `rgba(138,98,56,${Math.max(0, r.life) * 0.25})`;
        fctx.lineWidth = 1;
        fctx.stroke();
      }
    }
    raf = requestAnimationFrame(fxTick);
  }
  fxTick();

  document.querySelector("#zenClear").addEventListener("click", paintSand);
  setSnapshot({ mode: "playing", game: "Zen Sand" });
  activeCleanup = () => cancelAnimationFrame(raf);
}

function startGravityBalls() {
  openGame(
    "Gravity Balls",
    "Arcade",
    `
      <div class="game-layout">
        <div class="game-topline">
          <span class="game-stat" id="gravCount">Balls: 0</span>
          <span class="game-stat">Click empty space to drop one. Drag a ball to fling it.</span>
        </div>
        <canvas class="grav-canvas" id="gravCanvas" width="720" height="480"></canvas>
        <div class="spiro-sliders">
          <label class="spiro-slider">Size <input type="range" id="gravSize" min="8" max="36" step="1" value="18"><span id="gravSizev">18</span></label>
          <label class="spiro-slider">Speed <input type="range" id="gravSpeed" min="0.2" max="2.5" step="0.1" value="1"><span id="gravSpeedv">1.0x</span></label>
          <label class="spiro-slider">Max balls <input type="range" id="gravMax" min="5" max="80" step="1" value="36"><span id="gravMaxv">36</span></label>
        </div>
        <div class="game-actions">
          <div class="zen-swatches" id="gravSwatches"></div>
          <button class="game-action" id="gravClear" type="button">Clear</button>
        </div>
      </div>
    `
  );

  const canvas = document.querySelector("#gravCanvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const palette = ["#ff6b6b", "#43c6ac", "#f6c445", "#4f8fcf", "#6a4c93", "#fff8ea"];
  let balls = [];
  let speedScale = 1;
  let ballSize = 18;
  let maxBalls = 36;
  let spawnColor = null;
  let grab = null;
  let grabDX = 0;
  let grabDY = 0;
  let pointer = { x: 0, y: 0 };
  let lastPointerTime = 0;
  let raf = 0;
  let last = performance.now();

  function ballAt(x, y) {
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      if (Math.hypot(x - b.x, y - b.y) <= b.r + 4) return b;
    }
    return null;
  }

  function trimBalls() {
    while (balls.length > maxBalls) {
      const i = balls.findIndex((b) => b !== grab);
      if (i < 0) break;
      balls.splice(i, 1);
    }
    document.querySelector("#gravCount").textContent = `Balls: ${balls.length}`;
  }

  function spawn(x, y) {
    while (balls.length >= maxBalls) {
      const i = balls.findIndex((b) => b !== grab);
      if (i < 0) return;
      balls.splice(i, 1);
    }
    balls.push({
      x, y,
      vx: (Math.random() - 0.5) * 200,
      vy: 0,
      r: ballSize,
      color: spawnColor || palette[Math.floor(Math.random() * palette.length)]
    });
    document.querySelector("#gravCount").textContent = `Balls: ${balls.length}`;
  }

  function step(dt) {
    for (const b of balls) {
      if (b === grab) continue;
      b.vy += 1400 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y + b.r > H) {
        b.y = H - b.r;
        b.vy = -Math.abs(b.vy) * 0.82;
        b.vx *= 0.985;
        if (Math.abs(b.vy) < 40) b.vy = 0;
      }
      if (b.y - b.r < 0) { b.y = b.r; b.vy = Math.abs(b.vy) * 0.82; }
      if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx) * 0.82; }
      if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx) * 0.82; }
    }
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        if (d === 0) d = 0.01;
        const min = a.r + b.r;
        if (d >= min) continue;
        const nx = dx / d;
        const ny = dy / d;
        const overlap = min - d;
        const ma = a === grab ? Infinity : a.r * a.r;
        const mb = b === grab ? Infinity : b.r * b.r;
        const aShare = ma === Infinity ? 0 : (mb === Infinity ? 1 : mb / (ma + mb));
        const bShare = mb === Infinity ? 0 : (ma === Infinity ? 1 : ma / (ma + mb));
        a.x -= nx * overlap * aShare;
        a.y -= ny * overlap * aShare;
        b.x += nx * overlap * bShare;
        b.y += ny * overlap * bShare;
        const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (vn < 0) {
          const invA = ma === Infinity ? 0 : 1 / ma;
          const invB = mb === Infinity ? 0 : 1 / mb;
          const impulse = -(1 + 0.88) * vn / (invA + invB);
          a.vx -= impulse * nx * invA;
          a.vy -= impulse * ny * invA;
          b.vx += impulse * nx * invB;
          b.vy += impulse * ny * invB;
        }
      }
    }
  }

  function render() {
    ctx.fillStyle = "rgba(19,26,43,0.3)";
    ctx.fillRect(0, 0, W, H);
    for (const b of balls) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.35, b.r * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fill();
    }
  }

  function tick(now) {
    const dt = Math.min(0.033, (now - last) / 1000) * speedScale;
    last = now;
    step(dt);
    render();
    raf = requestAnimationFrame(tick);
  }

  function toCanvas(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (W / rect.width),
      y: (e.clientY - rect.top) * (H / rect.height)
    };
  }

  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    const p = toCanvas(e);
    const b = ballAt(p.x, p.y);
    if (b) {
      grab = b;
      grabDX = b.x - p.x;
      grabDY = b.y - p.y;
      b.vx = 0;
      b.vy = 0;
      pointer = p;
      lastPointerTime = performance.now();
    } else {
      spawn(p.x, p.y);
    }
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!grab) return;
    const p = toCanvas(e);
    const now = performance.now();
    const dt = Math.max(1, now - lastPointerTime) / 1000;
    grab.x = Math.min(W - grab.r, Math.max(grab.r, p.x + grabDX));
    grab.y = Math.min(H - grab.r, Math.max(grab.r, p.y + grabDY));
    grab.vx = (grab.x - (pointer.x + grabDX)) / dt * 0.9;
    grab.vy = (grab.y - (pointer.y + grabDY)) / dt * 0.9;
    pointer = p;
    lastPointerTime = now;
  });
  const releaseGrab = () => { grab = null; };
  canvas.addEventListener("pointerup", releaseGrab);
  canvas.addEventListener("pointercancel", releaseGrab);

  const sizeSlider = document.querySelector("#gravSize");
  const speedSlider = document.querySelector("#gravSpeed");
  const maxSlider = document.querySelector("#gravMax");
  sizeSlider.addEventListener("input", () => {
    ballSize = Number(sizeSlider.value);
    document.querySelector("#gravSizev").textContent = sizeSlider.value;
  });
  speedSlider.addEventListener("input", () => {
    speedScale = Number(speedSlider.value);
    document.querySelector("#gravSpeedv").textContent = `${speedScale.toFixed(1)}x`;
  });
  maxSlider.addEventListener("input", () => {
    maxBalls = Number(maxSlider.value);
    document.querySelector("#gravMaxv").textContent = maxSlider.value;
    trimBalls();
  });
  const swatchWrap = document.querySelector("#gravSwatches");
  const swatchDefs = [{ name: "Mix", css: "linear-gradient(135deg,#ff6b6b,#f6c445,#43c6ac,#4f8fcf)", value: null },
    ...palette.map((c) => ({ name: c, css: c, value: c }))];
  swatchDefs.forEach((def, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "zen-swatch" + (i === 0 ? " active" : "");
    btn.style.background = def.css;
    btn.title = def.name === "Mix" ? "Random colors" : def.name;
    btn.setAttribute("aria-label", def.name === "Mix" ? "Random ball colors" : `Ball color ${def.name}`);
    btn.addEventListener("click", () => {
      spawnColor = def.value;
      swatchWrap.querySelectorAll(".zen-swatch").forEach((el) => el.classList.remove("active"));
      btn.classList.add("active");
    });
    swatchWrap.append(btn);
  });
  document.querySelector("#gravClear").addEventListener("click", () => {
    balls = [];
    document.querySelector("#gravCount").textContent = "Balls: 0";
  });

  setSnapshot({ mode: "playing", game: "Gravity Balls" });
  activeCleanup = () => cancelAnimationFrame(raf);
  raf = requestAnimationFrame(tick);
}

function startSpirograph() {
  openGame(
    "Spirograph",
    "Toys",
    `
      <div class="game-layout">
        <div class="game-topline">
          <span class="game-stat" id="spiroInfo"></span>
          <span class="game-stat" id="spiroState">Drawing…</span>
        </div>
        <canvas class="spiro-canvas" id="spiroCanvas" width="520" height="520"></canvas>
        <div class="spiro-sliders">
          <label class="spiro-slider">R <input type="range" id="spiroR" min="3" max="12" step="1" value="8"><span id="spiroRv">8</span></label>
          <label class="spiro-slider">r <input type="range" id="spiroRr" min="2" max="11" step="1" value="3"><span id="spiroRrv">3</span></label>
          <label class="spiro-slider">d <input type="range" id="spiroD" min="0.5" max="10" step="0.1" value="2.4"><span id="spiroDv">2.4</span></label>
          <label class="spiro-slider">Speed <input type="range" id="spiroSpeed" min="0.5" max="3" step="0.1" value="1"><span id="spiroSpeedv">1.0x</span></label>
        </div>
        <div class="game-actions spiro-actions">
          <button class="game-action" id="spiroNew" type="button">New pattern</button>
          <button class="game-action" id="spiroPause" type="button">Pause</button>
          <button class="game-action" id="spiroClear" type="button">Clear</button>
        </div>
      </div>
    `
  );

  const canvas = document.querySelector("#spiroCanvas");
  const ctx = canvas.getContext("2d");
  const W = 520;
  const H = 520;
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  let R, r, d, hue, theta, period, scale, lastPt;
  let paused = false;
  let finished = false;
  let speed = 1;
  let raf = 0;
  let last = performance.now();

  function syncSliders() {
    document.querySelector("#spiroR").value = R;
    document.querySelector("#spiroRv").textContent = R;
    document.querySelector("#spiroRr").value = r;
    document.querySelector("#spiroRrv").textContent = r;
    document.querySelector("#spiroD").value = d;
    document.querySelector("#spiroDv").textContent = d;
  }

  function applyParams() {
    ctx.fillStyle = "#0f1320";
    ctx.fillRect(0, 0, W, H);
    theta = 0;
    period = 2 * Math.PI * r / gcd(R, r);
    scale = (W / 2 - 20) / ((R - r) + d);
    lastPt = null;
    finished = false;
    document.querySelector("#spiroInfo").textContent = `R ${R} · r ${r} · d ${d}`;
    document.querySelector("#spiroState").textContent = "Drawing…";
    document.querySelector("#spiroNew").classList.remove("finish-pulse");
  }

  function setup() {
    R = 5 + Math.floor(Math.random() * 8);
    r = 2 + Math.floor(Math.random() * (R - 2));
    d = Math.round(r * (0.4 + Math.random() * 1.1) * 10) / 10;
    hue = Math.random() * 360;
    paused = false;
    document.querySelector("#spiroPause").textContent = "Pause";
    syncSliders();
    applyParams();
  }

  function readSliders() {
    R = Number(document.querySelector("#spiroR").value);
    r = Number(document.querySelector("#spiroRr").value);
    d = Number(document.querySelector("#spiroD").value);
    if (r >= R) {
      r = R - 1;
      document.querySelector("#spiroRr").value = r;
    }
    document.querySelector("#spiroRv").textContent = R;
    document.querySelector("#spiroRrv").textContent = r;
    document.querySelector("#spiroDv").textContent = d;
    applyParams();
  }

  function point(t) {
    const k = (R - r) / r;
    return {
      x: W / 2 + ((R - r) * Math.cos(t) + d * Math.cos(k * t)) * scale,
      y: H / 2 + ((R - r) * Math.sin(t) - d * Math.sin(k * t)) * scale
    };
  }

  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!paused && !finished) {
      const steps = 4;
      for (let i = 0; i < steps; i++) {
        theta += (dt * 2.2 * speed) / steps;
        const p = point(theta);
        if (lastPt) {
          ctx.beginPath();
          ctx.moveTo(lastPt.x, lastPt.y);
          ctx.lineTo(p.x, p.y);
          ctx.strokeStyle = `hsla(${hue},85%,62%,0.9)`;
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }
        lastPt = p;
        hue = (hue + 0.25) % 360;
        if (theta >= period) {
          finished = true;
          document.querySelector("#spiroState").textContent = "Pattern complete.";
          document.querySelector("#spiroNew").classList.add("finish-pulse");
          break;
        }
      }
    }
    raf = requestAnimationFrame(tick);
  }

  document.querySelector("#spiroNew").addEventListener("click", (e) => {
    e.currentTarget.classList.remove("finish-pulse");
    setup();
  });
  ["#spiroR", "#spiroRr", "#spiroD"].forEach((sel) => {
    document.querySelector(sel).addEventListener("input", readSliders);
  });
  document.querySelector("#spiroSpeed").addEventListener("input", (e) => {
    speed = Number(e.currentTarget.value);
    document.querySelector("#spiroSpeedv").textContent = `${speed.toFixed(1)}x`;
  });
  document.querySelector("#spiroPause").addEventListener("click", (e) => {
    paused = !paused;
    e.currentTarget.textContent = paused ? "Resume" : "Pause";
  });
  document.querySelector("#spiroClear").addEventListener("click", () => {
    ctx.fillStyle = "#0f1320";
    ctx.fillRect(0, 0, W, H);
    lastPt = null;
  });

  setup();
  setSnapshot({ mode: "playing", game: "Spirograph" });
  activeCleanup = () => cancelAnimationFrame(raf);
  raf = requestAnimationFrame(tick);
}

Object.assign(gameStarters, {
  wrap: startBubbleWrap,
  zen: startZenSand,
  gravity: startGravityBalls,
  spiro: startSpirograph
});

(function initSurprise() {
  const button = document.querySelector("#surpriseBtn");
  if (!button) return;
  const DECK_KEY = "trinkets-deck-v1";
  let deck = null;
  try {
    const raw = JSON.parse(localStorage.getItem(DECK_KEY));
    if (Array.isArray(raw)) deck = raw;
  } catch (err) {
    deck = null;
  }
  let pressed = false;
  button.addEventListener("click", () => {
    const master = Object.keys(gameStarters);
    if (!deck) deck = [];
    deck = deck.filter((id) => master.includes(id));
    if (deck.length === 0) deck = shuffleArray([...master]);
    const index = Math.floor(Math.random() * Math.min(6, deck.length));
    const pick = deck.splice(index, 1)[0];
    try {
      localStorage.setItem(DECK_KEY, JSON.stringify(deck));
    } catch (err) {}
    if (!pressed) {
      button.textContent = "Surprise me again";
      pressed = true;
    }
    gameStarters[pick]();
  });
})();
