function startSpider() {
  openGame(
    "Spider",
    "Arcade",
    `
      <div class="game-layout">
        <div class="game-topline">
          <span class="game-stat" id="spDist">0 m</span>
          <span class="game-stat" id="spP2Dist" style="display:none">P2: 0 m</span>
          <span class="game-stat" id="spScore">Score: 0</span>
          <span class="game-stat" id="spCombo">Combo x0</span>
          <span class="game-stat" id="spBest">Best: 0 m</span>
        </div>
        <div class="tag-row" role="group" aria-label="Players">
          <span class="tag-label">Players</span>
          <button class="game-action tag-pick on" id="sp1P" type="button">1 Player</button>
          <button class="game-action tag-pick" id="sp2P" type="button" title="P1: SPACE/W · P2: ArrowUp — last spider standing wins">2 Players</button>
        </div>
        <canvas class="spider-canvas" id="spCanvas" width="720" height="480"></canvas>
        <p class="game-message" id="spMsg">SPACE / TAP to teleport between floor and ceiling. Dodge everything.</p>
        <div class="game-actions">
          <button class="game-action one-press" id="spBtn" type="button">TELEPORT (P1)</button>
          <button class="game-action one-press" id="spBtn2" type="button" style="display:none">TELEPORT (P2)</button>
          <button class="game-action" id="spRetry" type="button">Restart</button>
        </div>
      </div>
    `
  );

  const canvas = document.querySelector("#spCanvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const FLOOR = H - 64;
  const CEIL = 64;
  const PX = 170;
  const PR = 13;

  const distEl = document.querySelector("#spDist");
  const p2DistEl = document.querySelector("#spP2Dist");
  const scoreEl = document.querySelector("#spScore");
  const comboEl = document.querySelector("#spCombo");
  const bestEl = document.querySelector("#spBest");
  const message = document.querySelector("#spMsg");
  const teleportBtn = document.querySelector("#spBtn");
  const teleportBtn2 = document.querySelector("#spBtn2");

  // --- 2P: last spider standing. Two spiders share the same hurtling world. ---
  let twoP = false;
  let alive1 = true;
  let alive2 = false;
  let lane2 = 0;
  let teleFlash2 = 0;
  let zap2 = null;
  let distAtDeath1 = 0;
  let distAtDeath2 = 0;
  let PX2 = 250;
  const PX1 = 150;

  function setTwoP(on) {
    twoP = on;
    document.querySelector("#sp1P").classList.toggle("on", !on);
    document.querySelector("#sp2P").classList.toggle("on", on);
    p2DistEl.style.display = on ? "" : "none";
    teleportBtn.textContent = on ? "TELEPORT (P1)" : "TELEPORT";
    teleportBtn2.style.display = on ? "" : "none";
    resetRun(true);
    message.textContent = on
      ? "P1: SPACE/W or tap LEFT half · P2: ↑ or tap RIGHT half. Last spider wins!"
      : "SPACE / TAP to teleport between floor and ceiling. Dodge everything.";
    syncHud();
  }
  document.querySelector("#sp1P").addEventListener("click", () => setTwoP(false));
  document.querySelector("#sp2P").addEventListener("click", () => setTwoP(true));

  const QUIPS = [
    "SPLAT. The ceiling sends regards.",
    "Spider flattened. Ouch.",
    "Mistimed. The spikes saw it coming.",
    "So close. Then so flat.",
    "Gravity always wins. Except it teleports here.",
    "That wall was load-bearing. For you."
  ];
  const BEST_KEY = "trinkets-spider-extra";

  let best = 0;
  let bestCombo = 0;
  let bestScore = 0;
  try {
    best = Number((readScores() || {}).spider) || 0;
    const extra = JSON.parse(localStorage.getItem(BEST_KEY));
    if (extra && typeof extra === "object") {
      bestCombo = Number(extra.combo) || 0;
      bestScore = Number(extra.score) || 0;
    }
  } catch (err) {}

  let raf = 0;
  let last = performance.now();
  let mode = "ready"; // ready | playing | dead
  let time = 0;
  let distPx = 0;
  let speed = 300;
  let lane = 0; // 0 = floor, 1 = ceiling
  let obstacles = [];
  let particles = [];
  let popups = [];
  let zap = null;
  let shake = 0;
  let flash = 0;
  let nextSpawn = 520;
  let spawnCount = 0;
  let score = 0;
  let combo = 0;
  let perfects = 0;
  let goods = 0;
  let dodged = 0;
  let deadT = 0;
  let banner = null;
  let shown = {};
  let teleportFlash = 0;

  function pxFor(idx) { return idx === 1 ? PX2 : (twoP ? PX1 : PX); }
  function laneY(l) {
    return l === 0 ? FLOOR - PR - 2 : CEIL + PR + 2;
  }

  function saveExtra() {
    try {
      localStorage.setItem(BEST_KEY, JSON.stringify({ combo: bestCombo, score: bestScore }));
    } catch (err) {}
  }

  function showBanner(text) {
    banner = { text, t: 2.2 };
  }

  function burst(x, y, n, color, up) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 220;
      particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp + (up || 0),
        life: 0.6 + Math.random() * 0.3,
        max: 0.9,
        color,
        size: 2 + Math.random() * 3
      });
    }
  }

  function popup(x, y, text, color) {
    popups.push({ x, y, text, color, life: 1.1, max: 1.1 });
  }

  function distM() {
    return Math.floor(distPx / 50);
  }

  function syncHud() {
    const d = distM();
    if (twoP) {
      distEl.textContent = `P1: ${alive1 ? d : distAtDeath1} m`;
      p2DistEl.textContent = `P2: ${alive2 ? d : distAtDeath2} m`;
    } else {
      distEl.textContent = `${d} m`;
    }
    scoreEl.textContent = `Score: ${score}`;
    comboEl.textContent = `Combo x${combo}`;
    bestEl.textContent = `Best: ${Math.max(best, d)} m`;
    setSnapshot({
      mode: mode === "playing" ? "playing" : mode === "dead" ? "ended" : "ready",
      game: "Spider",
      dist: d,
      best: Math.max(best, d),
      score,
      combo,
      perfects,
      twoP,
      p1Alive: alive1,
      p2Alive: twoP ? alive2 : undefined
    });
  }

  function resetRun(toReady) {
    distPx = 0;
    speed = 300;
    lane = 0;
    lane2 = 0;
    alive1 = true;
    alive2 = twoP;
    distAtDeath1 = 0;
    distAtDeath2 = 0;
    obstacles = [];
    particles = [];
    popups = [];
    zap = null;
    zap2 = null;
    shake = 0;
    flash = 0;
    nextSpawn = 560;
    spawnCount = 0;
    score = 0;
    combo = 0;
    perfects = 0;
    goods = 0;
    dodged = 0;
    banner = null;
    shown = {};
    teleportFlash = 0;
    teleFlash2 = 0;
    mode = toReady ? "ready" : "playing";
    deadT = 0;
    if (toReady) message.textContent = twoP
      ? "P1: SPACE/W or tap LEFT half · P2: ↑ or tap RIGHT half. Last spider wins!"
      : "SPACE / TAP to teleport between floor and ceiling. Dodge everything.";
    syncHud();
  }

  function finishMatch2P() {
    mode = "dead";
    deadT = 1.7;
    const d1 = distAtDeath1 || distM();
    const d2 = distAtDeath2 || distM();
    let title;
    if (d1 > d2) title = "P1 WINS!";
    else if (d2 > d1) title = "P2 WINS!";
    else title = "DRAW!";
    shake = 14;
    flash = 0.45;
    message.textContent = `${title} P1 ${d1} m · P2 ${d2} m · Combo x${combo} · Score ${score}.`;
    syncHud();
  }

  function die(reason, idx) {
    if (mode !== "playing") return;
    if (twoP && (idx === 0 || idx === 1)) {
      const d = distM();
      if (idx === 1) {
        if (!alive2) return;
        alive2 = false;
        distAtDeath2 = d;
        burst(PX2, laneY(lane2), 22, "#74c0fc", -120);
        popup(PX2, laneY(lane2) - 24, "P2 OUT!", "#74c0fc");
        if (alive1) { message.textContent = "P2 splatted! P1 still running…"; syncHud(); return; }
      } else {
        if (!alive1) return;
        alive1 = false;
        distAtDeath1 = d;
        burst(PX1, laneY(lane), 22, "#ff6b6b", -120);
        popup(PX1, laneY(lane) - 24, "P1 OUT!", "#ff6b6b");
        if (alive2) { message.textContent = "P1 splatted! P2 still running…"; syncHud(); return; }
      }
      finishMatch2P();
      return;
    }
    mode = "dead";
    deadT = 1.7;
    const d = distM();
    const result = recordScore("spider", d, "high");
    best = Math.max(best, result.best, d);
    if (combo > bestCombo) bestCombo = combo;
    if (score > bestScore) bestScore = score;
    saveExtra();
    burst(pxFor(0), laneY(lane), 22, "#ff6b6b", -120);
    burst(pxFor(0), laneY(lane), 10, "#fff8ea", -60);
    shake = 14;
    flash = 0.45;
    message.textContent = `${reason || QUIPS[Math.floor(Math.random() * QUIPS.length)]}` +
      (result.isNew && d > 0 ? ` New best: ${d} m!` : ` Best: ${best} m.`) +
      ` Combo x${combo} · Perfects ${perfects} · Score ${score}.`;
    syncHud();
  }

  // --- procedural patterns ---
  function addSpike(side, x, w, fake) {
    obstacles.push({ kind: fake ? "fake" : "spike", side, x, w: w || 34 });
  }

  function addGate(x, w) {
    obstacles.push({ kind: "gate", x, w: w || 30, top: CEIL + 46, bot: FLOOR - 46 });
  }

  function spawnPattern() {
    const d = distM();
    const X = W + 40;
    const opts = [];
    // early game: gentle singles
    if (spawnCount < 2) {
      if (spawnCount === 0) addSpike(1, X);
      else addSpike(-1, X);
      spawnCount += 1;
      return;
    }
    opts.push("single", "single", "pair");
    if (d > 150) opts.push("pair", "triple");
    if (d > 320) opts.push("triple", "trap", "tight");
    if (d > 480) opts.push("gate", "trap", "tight");
    if (d > 700) opts.push("fake", "tight", "gate", "trap");
    if (d > 1100) opts.push("tight", "trap", "gate", "fake");
    const pick = opts[Math.floor(Math.random() * opts.length)];
    spawnCount += 1;

    if (pick === "single") {
      addSpike(Math.random() < 0.5 ? 1 : -1, X, 30 + Math.random() * 10);
    } else if (pick === "pair") {
      const first = Math.random() < 0.5 ? 1 : -1;
      addSpike(first, X, 32);
      addSpike(first === 1 ? -1 : 1, X + 230, 32);
    } else if (pick === "triple") {
      let side = Math.random() < 0.5 ? 1 : -1;
      for (let i = 0; i < 3; i++) {
        addSpike(side, X + i * 200, 30);
        side = side === 1 ? -1 : 1;
      }
    } else if (pick === "tight") {
      let side = Math.random() < 0.5 ? 1 : -1;
      const n = 3 + Math.floor(Math.random() * 2);
      for (let i = 0; i < n; i++) {
        addSpike(side, X + i * 150, 28);
        side = side === 1 ? -1 : 1;
      }
    } else if (pick === "trap") {
      // fake safety: an early teleport lands in the second spike
      const first = Math.random() < 0.5 ? 1 : -1;
      addSpike(first, X, 32);
      addSpike(first === 1 ? -1 : 1, X + 115, 32);
      if (d > 600 && Math.random() < 0.5) addSpike(first, X + 260, 30);
    } else if (pick === "gate") {
      addGate(X + 140, 28 + Math.random() * 12);
      if (Math.random() < 0.6) addSpike(Math.random() < 0.5 ? 1 : -1, X, 30);
      else addSpike(Math.random() < 0.5 ? 1 : -1, X + 280, 30);
    } else if (pick === "fake") {
      addSpike(1, X, 32, true);
      addSpike(-1, X + 170, 32);
      if (Math.random() < 0.5) addSpike(1, X + 330, 30);
    }
  }

  function gateAtPlayer(idx) {
    const px = pxFor(idx);
    for (const o of obstacles) {
      if (o.kind !== "gate") continue;
      if (px + 10 > o.x && px - 10 < o.x + o.w) return o;
    }
    return null;
  }

  function nearestThreatOn(laneSide) {
    // laneSide 0 = floor (side 1), 1 = ceiling (side -1)
    const want = laneSide === 0 ? 1 : -1;
    let bestObs = null;
    for (const o of obstacles) {
      if (o.kind !== "spike") continue;
      if (o.side !== want) continue;
      if (o.x + o.w < PX - 24) continue;
      if (!bestObs || o.x < bestObs.x) bestObs = o;
    }
    return bestObs;
  }

  function teleport(idx) {
    if (mode !== "playing") return;
    const who = idx === 1 ? 1 : 0;
    if (twoP && !(who === 0 ? alive1 : alive2)) return;
    if (gateAtPlayer(who)) {
      die("Bonk. Can't teleport through a wall.", who);
      return;
    }
    const oldLane = who === 1 ? lane2 : lane;
    const threat = nearestThreatOn(oldLane);
    const px = pxFor(who);
    if (who === 1) lane2 = oldLane === 0 ? 1 : 0;
    else lane = oldLane === 0 ? 1 : 0;
    const newLane = who === 1 ? lane2 : lane;
    const fromY = laneY(oldLane);
    const toY = laneY(newLane);
    combo += 1;
    if (who === 1) { teleFlash2 = 0.15; zap2 = { x: px, y1: fromY, y2: toY, t: 0.16 }; }
    else { teleportFlash = 0.15; zap = { x: px, y1: fromY, y2: toY, t: 0.16 }; }
    burst(px, fromY, 8, "#43c6ac", 0);
    burst(px, toY, 10, "#fff8ea", 0);

    if (threat) {
      const dx = threat.x - px;
      if (dx >= -24 && dx <= 85) {
        score += 100;
        perfects += 1;
        popup(px + 30, (fromY + toY) / 2, "PERFECT +100", "#f6c445");
        shake = Math.max(shake, 4);
      } else if (dx > 85 && dx <= 180) {
        score += 25;
        goods += 1;
        popup(px + 30, toY - 24, "GOOD +25", "#43c6ac");
      } else if (dx > 180 && dx <= 330) {
        score += 10;
        popup(px + 30, toY - 24, "+10", "#fff8ea");
      }
    }
    if (combo > bestCombo) bestCombo = combo;
    if (score > bestScore) bestScore = score;
    syncHud();
  }

  function primaryAction(idx) {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    const who = idx === 1 ? 1 : 0;
    if (mode === "ready") {
      resetRun(false);
      message.textContent = "Go! Teleport before the spikes.";
      showBanner("FLOOR → CEILING → FLOOR");
      syncHud();
      return;
    }
    if (mode === "playing") {
      teleport(who);
      return;
    }
    if (mode === "dead" && deadT < 1.0) {
      resetRun(false);
      message.textContent = "Go! Teleport before the spikes.";
      syncHud();
    }
  }

  function milestone(d) {
    const marks = [
      [120, "SPEED UP"],
      [300, "TIGHT GAPS"],
      [480, "WALLS BLOCK TELEPORTS"],
      [700, "SOME SPIKES ARE FAKE"],
      [1100, "IMPOSSIBLE SPEED"]
    ];
    for (const [at, text] of marks) {
      if (d >= at && !shown[at]) {
        shown[at] = true;
        showBanner(text);
      }
    }
  }

  function update(dt) {
    time += dt;
    if (banner) {
      banner.t -= dt;
      if (banner.t <= 0) banner = null;
    }
    if (teleportFlash > 0) teleportFlash -= dt;
    if (teleFlash2 > 0) teleFlash2 -= dt;
    if (zap) {
      zap.t -= dt;
      if (zap.t <= 0) zap = null;
    }
    if (zap2) {
      zap2.t -= dt;
      if (zap2.t <= 0) zap2 = null;
    }
    shake = Math.max(0, shake - dt * 30);
    if (flash > 0) flash -= dt;

    // particles + popups always animate
    particles = particles.filter((p) => p.life > 0);
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 900 * dt;
      p.life -= dt;
    }
    popups = popups.filter((p) => p.life > 0);
    for (const p of popups) {
      p.y -= 46 * dt;
      p.life -= dt;
    }

    if (mode === "ready") return;

    if (mode === "dead") {
      deadT -= dt;
      if (deadT <= 0) resetRun(true);
      return;
    }

    // playing
    const d = distM();
    milestone(d);
    speed = Math.min(680, 300 + d * 1.05);
    distPx += speed * dt;

    nextSpawn -= speed * dt;
    if (nextSpawn <= 0) {
      spawnPattern();
      const gap = Math.max(150, 320 - d * 0.16) + Math.random() * 120;
      nextSpawn = gap;
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.x -= speed * dt;
      if (o.x + (o.w || 40) < -60) {
        if ((o.kind === "spike") && !o.counted) {
          o.counted = true;
          const safeSide = o.side === 1 ? 0 : 1;
          if (!twoP) { if (lane === safeSide) dodged += 1; }
          else {
            if (alive1 && lane === safeSide) dodged += 1;
            if (alive2 && lane2 === safeSide) dodged += 1;
          }
        }
        obstacles.splice(i, 1);
        continue;
      }
      if (o.kind === "spike") {
        const top = o.side === 1 ? FLOOR - 30 : CEIL;
        if (twoP) {
          let killedAny = false;
          if (alive1 && pxFor(0) + PR - 4 > o.x + 4 && pxFor(0) - PR + 4 < o.x + o.w - 4 &&
              laneY(lane) + PR > top && laneY(lane) - PR < top + 30) {
            die(undefined, 0);
            killedAny = true;
            if (!alive1 && !alive2) return;
          }
          if (alive2 && pxFor(1) + PR - 4 > o.x + 4 && pxFor(1) - PR + 4 < o.x + o.w - 4 &&
              laneY(lane2) + PR > top && laneY(lane2) - PR < top + 30) {
            die(undefined, 1);
            killedAny = true;
            if (!alive1 && !alive2) return;
          }
          if (killedAny && !alive1 && !alive2) return;
        } else {
          if (PX + PR - 4 > o.x + 4 && PX - PR + 4 < o.x + o.w - 4 &&
              laneY(lane) + PR > top && laneY(lane) - PR < top + 30) {
            die();
            return;
          }
        }
      }
    }
    syncHudThrottled();
  }

  let hudT = 0;
  function syncHudThrottled() {
    hudT += 1;
    if (hudT % 6 === 0) syncHud();
    else {
      const d = distM();
      distEl.textContent = `${d} m`;
      scoreEl.textContent = `Score: ${score}`;
      comboEl.textContent = `Combo x${combo}`;
    }
  }

  function spikePath(o) {
    const h = 30;
    const y0 = o.side === 1 ? FLOOR : CEIL;
    const dir = o.side === 1 ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(o.x, y0);
    ctx.lineTo(o.x + o.w / 2, y0 + dir * h);
    ctx.lineTo(o.x + o.w, y0);
    ctx.closePath();
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#1b2340");
    sky.addColorStop(0.5, "#2b3a67");
    sky.addColorStop(1, "#1b2340");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    const shx = (Math.random() - 0.5) * shake;
    const shy = (Math.random() - 0.5) * shake;
    ctx.save();
    ctx.translate(shx, shy);

    // grid dots
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    const off = distPx % 60;
    for (let gx = -off; gx < W; gx += 60) {
      for (let gy = 100; gy < H - 90; gy += 60) {
        ctx.fillRect(gx, gy, 2, 2);
      }
    }
    // speed lines at high speed
    if (speed > 480 && mode === "playing") {
      ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.25, (speed - 480) / 900).toFixed(2)})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const y = 110 + ((i * 53 + time * 700) % (H - 220));
        const x = (i * 211 + 40) % W;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 46, y);
        ctx.stroke();
      }
    }

    // surfaces
    ctx.fillStyle = "#10142a";
    ctx.fillRect(0, 0, W, CEIL);
    ctx.fillRect(0, FLOOR, W, H - FLOOR);
    ctx.fillStyle = "#f6c445";
    ctx.fillRect(0, CEIL, W, 4);
    ctx.fillRect(0, FLOOR - 4, W, 4);
    ctx.fillStyle = "rgba(246,196,69,0.25)";
    ctx.fillRect(0, CEIL + 4, W, 3);
    ctx.fillRect(0, FLOOR - 7, W, 3);

    // obstacles
    for (const o of obstacles) {
      if (o.kind === "spike" || o.kind === "fake") {
        if (o.kind === "fake") ctx.globalAlpha = 0.35;
        spikePath(o);
        ctx.fillStyle = "#ff6b6b";
        ctx.fill();
        ctx.strokeStyle = "#0f1320";
        ctx.lineWidth = 3;
        ctx.stroke();
        // shine
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.beginPath();
        if (o.side === 1) ctx.arc(o.x + o.w / 2, FLOOR - 9, 3, 0, Math.PI * 2);
        else ctx.arc(o.x + o.w / 2, CEIL + 9, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (o.kind === "gate") {
        const gh = o.bot - o.top;
        ctx.fillStyle = "#6a4c93";
        ctx.strokeStyle = "#0f1320";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(o.x, o.top, o.w, gh, 6);
        ctx.fill();
        ctx.stroke();
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(o.x, o.top, o.w, gh, 6);
        ctx.clip();
        ctx.strokeStyle = "rgba(246,196,69,0.8)";
        ctx.lineWidth = 4;
        for (let sy = o.top - gh; sy < o.bot + 8; sy += 18) {
          ctx.beginPath();
          ctx.moveTo(o.x - 4, sy);
          ctx.lineTo(o.x + o.w + 4, sy + 12);
          ctx.stroke();
        }
        ctx.restore();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 15px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("✕", o.x + o.w / 2, o.top + 22);
      }
    }

    // teleport zaps
    function drawZap(z) {
      if (!z) return;
      const a = Math.max(0, z.t / 0.16);
      const grad = ctx.createLinearGradient(0, z.y1, 0, z.y2);
      grad.addColorStop(0, `rgba(67,198,172,${(0.9 * a).toFixed(2)})`);
      grad.addColorStop(1, `rgba(246,196,69,${(0.9 * a).toFixed(2)})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(z.x, z.y1);
      ctx.lineTo(z.x, z.y2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${(0.8 * a).toFixed(2)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(z.x, z.y1);
      ctx.lineTo(z.x, z.y2);
      ctx.stroke();
    }
    drawZap(zap);
    drawZap(zap2);

    // spider(s)
    function drawSpider(px, laneVal, flashVal, isP2) {
      const y = laneY(laneVal);
      const flip = laneVal === 1 ? -1 : 1;
      ctx.save();
      ctx.translate(px, y);
      ctx.scale(1, flip);
      if (flashVal > 0) ctx.globalAlpha = 0.6 + Math.random() * 0.4;
      ctx.strokeStyle = "#0f1320";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      const sc = Math.sin(time * 22 + (isP2 ? 1.1 : 0)) * 4;
      for (let l = -1; l <= 1; l++) {
        ctx.beginPath();
        ctx.moveTo(-6 + l * 7, 2);
        ctx.lineTo(-11 + l * 7, 10 + (l % 2 === 0 ? sc : -sc));
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(6 - l * 1 + l * 6 * 0.2, 2);
        ctx.lineTo(11 + l * 2, 10 + (l % 2 === 0 ? -sc : sc));
        ctx.stroke();
      }
      const bodyGrad = ctx.createRadialGradient(-4, -5, 2, 0, 0, PR + 3);
      if (isP2) { bodyGrad.addColorStop(0, "#a5d8ff"); bodyGrad.addColorStop(1, "#1971c2"); }
      else { bodyGrad.addColorStop(0, "#ff8f8f"); bodyGrad.addColorStop(1, "#e14b4b"); }
      ctx.fillStyle = bodyGrad;
      ctx.strokeStyle = "#0f1320";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, PR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(3, -4, 4.6, 0, Math.PI * 2);
      ctx.arc(10, -3, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0f1320";
      ctx.beginPath();
      ctx.arc(4.5, -4, 2, 0, Math.PI * 2);
      ctx.arc(11, -3, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (twoP) {
        ctx.save();
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = isP2 ? "#1971c2" : "#e14b4b";
        ctx.fillText(isP2 ? "P2" : "P1", px, y - PR - 10);
        ctx.restore();
      }
    }

    if (!(mode === "dead")) {
      if (twoP) {
        if (alive1) drawSpider(PX1, lane, teleportFlash, false);
        if (alive2) drawSpider(PX2, lane2, teleFlash2, true);
        // leg dust per alive spider
        if (mode === "playing") {
          if (alive1 && Math.random() < 0.35) particles.push({ x: PX1 - 12, y: laneY(lane) + (lane === 0 ? 12 : -12), vx: -speed * 0.25, vy: (Math.random() - 0.5) * 40, life: 0.35, max: 0.35, color: "rgba(255,255,255,0.5)", size: 2 });
          if (alive2 && Math.random() < 0.35) particles.push({ x: PX2 - 12, y: laneY(lane2) + (lane2 === 0 ? 12 : -12), vx: -speed * 0.25, vy: (Math.random() - 0.5) * 40, life: 0.35, max: 0.35, color: "rgba(255,255,255,0.5)", size: 2 });
        }
      } else {
      const y = laneY(lane);
      const flip = lane === 1 ? -1 : 1;
      ctx.save();
      ctx.translate(PX, y);
      ctx.scale(1, flip);
      if (teleportFlash > 0) ctx.globalAlpha = 0.6 + Math.random() * 0.4;
      // legs (scuttle)
      ctx.strokeStyle = "#0f1320";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      const sc = Math.sin(time * 22) * 4;
      for (let l = -1; l <= 1; l++) {
        ctx.beginPath();
        ctx.moveTo(-6 + l * 7, 2);
        ctx.lineTo(-11 + l * 7, 10 + (l % 2 === 0 ? sc : -sc));
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(6 - l * 1 + l * 6 * 0.2, 2);
        ctx.lineTo(11 + l * 2, 10 + (l % 2 === 0 ? -sc : sc));
        ctx.stroke();
      }
      // body
      const bodyGrad = ctx.createRadialGradient(-4, -5, 2, 0, 0, PR + 3);
      bodyGrad.addColorStop(0, "#ff8f8f");
      bodyGrad.addColorStop(1, "#e14b4b");
      ctx.fillStyle = bodyGrad;
      ctx.strokeStyle = "#0f1320";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, PR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // eyes look forward
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(3, -4, 4.6, 0, Math.PI * 2);
      ctx.arc(10, -3, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0f1320";
      ctx.beginPath();
      ctx.arc(4.5, -4, 2, 0, Math.PI * 2);
      ctx.arc(11, -3, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
      // running dust
      if (mode === "playing" && Math.random() < 0.35) {
        particles.push({
          x: PX - 12, y: laneY(lane) + (lane === 0 ? 12 : -12),
          vx: -speed * 0.25, vy: (Math.random() - 0.5) * 40,
          life: 0.35, max: 0.35, color: "rgba(255,255,255,0.5)", size: 2
        });
      }
      }
    }

    // particles
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // popups
    ctx.textAlign = "center";
    for (const p of popups) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.font = "bold 20px monospace";
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillText(p.text, p.x + 2, p.y + 2);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;

    // banner
    if (banner) {
      ctx.font = "bold 24px sans-serif";
      const tw = ctx.measureText(banner.text).width + 48;
      ctx.fillStyle = "rgba(12,10,20,0.82)";
      ctx.beginPath();
      ctx.roundRect(W / 2 - tw / 2, 24, tw, 44, 12);
      ctx.fill();
      ctx.fillStyle = "#f6c445";
      ctx.textBaseline = "middle";
      ctx.fillText(banner.text, W / 2, 47);
      ctx.textBaseline = "alphabetic";
    }

    // overlays
    if (mode === "ready") {
      ctx.fillStyle = "rgba(10,12,24,0.62)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#fff8ea";
      ctx.font = "bold 52px sans-serif";
      ctx.fillText("SPIDER", W / 2, H / 2 - 44);
      ctx.font = "bold 19px sans-serif";
      ctx.fillStyle = "#f6c445";
      ctx.fillText("You don't jump. You teleport.", W / 2, H / 2 - 8);
      ctx.fillStyle = "#fff8ea";
      ctx.font = "16px sans-serif";
      if (twoP) {
        ctx.fillText("P1: SPACE/W or tap LEFT · P2: ↑ or tap RIGHT", W / 2, H / 2 + 22);
      } else {
        ctx.fillText("SPACE · CLICK · TAP — switch floor / ceiling", W / 2, H / 2 + 22);
      }
      ctx.fillText("Gold timing = PERFECT +100. Walls block teleports.", W / 2, H / 2 + 46);
      ctx.fillStyle = "#43c6ac";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("— press anything to start —", W / 2, H / 2 + 78);
      // demo spiders
      if (twoP) {
        ctx.fillStyle = "#ff6b6b"; ctx.beginPath(); ctx.arc(PX1, FLOOR - PR - 2, PR, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#0f1320"; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = "#74c0fc"; ctx.beginPath(); ctx.arc(PX2, FLOOR - PR - 2, PR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      } else {
        ctx.fillStyle = "#ff6b6b";
        ctx.strokeStyle = "#0f1320";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(pxFor(0), FLOOR - PR - 2, PR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    if (mode === "dead") {
      ctx.fillStyle = "rgba(10,8,16,0.45)";
      ctx.fillRect(0, 0, W, H);
      if (twoP) {
        const d1 = distAtDeath1 || distM();
        const d2 = distAtDeath2 || distM();
        const title = d1 > d2 ? "P1 WINS!" : d2 > d1 ? "P2 WINS!" : "DRAW!";
        ctx.fillStyle = d1 > d2 ? "#ff8f8f" : d2 > d1 ? "#74c0fc" : "#ffe066";
        ctx.font = "bold 42px sans-serif";
        ctx.fillText(title, W / 2, H / 2 - 10);
        ctx.fillStyle = "#fff8ea";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText(`P1 ${d1} m · P2 ${d2} m · Score ${score}`, W / 2, H / 2 + 24);
      } else {
        ctx.fillStyle = "#ff6b6b";
        ctx.font = "bold 54px sans-serif";
        ctx.fillText("SPLAT", W / 2, H / 2 - 10);
        ctx.fillStyle = "#fff8ea";
        ctx.font = "bold 18px sans-serif";
        ctx.fillText(`${distM()} m · Combo x${combo} · Score ${score}`, W / 2, H / 2 + 24);
      }
    }

    ctx.restore();

    if (flash > 0) {
      ctx.fillStyle = `rgba(255,80,80,${Math.min(0.4, flash).toFixed(2)})`;
      ctx.fillRect(0, 0, W, H);
    }

    // DOM hud (cheap part every frame)
    const d = distM();
    if (twoP) {
      distEl.textContent = `P1: ${alive1 ? d : distAtDeath1} m`;
      p2DistEl.textContent = `P2: ${alive2 ? d : distAtDeath2} m`;
    } else {
      distEl.textContent = `${d} m`;
    }
    scoreEl.textContent = `Score: ${score}`;
    comboEl.textContent = `Combo x${combo}`;
  }

  function tick(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    raf = requestAnimationFrame(tick);
  }

  function keydown(e) {
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (twoP) {
      if (e.code === "Space" || e.code === "KeyW") {
        e.preventDefault();
        if (e.repeat) return;
        primaryAction(0);
        return;
      }
      if (e.code === "ArrowUp") {
        e.preventDefault();
        if (e.repeat) return;
        primaryAction(1);
        return;
      }
    } else {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        if (e.repeat) return;
        primaryAction(0);
        return;
      }
    }
    if (e.code === "Enter" && mode !== "playing") {
      e.preventDefault();
      primaryAction(0);
    }
  }

  function tapWhich(e) {
    const rect = canvas.getBoundingClientRect();
    return (e.clientX - rect.left) > rect.width / 2 ? 1 : 0;
  }

  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (twoP) primaryAction(tapWhich(e));
    else primaryAction(0);
  });
  teleportBtn.addEventListener("click", (e) => {
    e.preventDefault();
    primaryAction(0);
  });
  teleportBtn2.addEventListener("click", (e) => {
    e.preventDefault();
    primaryAction(1);
  });
  document.querySelector("#spRetry").addEventListener("click", () => {
    resetRun(false);
    message.textContent = "Go! Teleport before the spikes.";
    showBanner("FLOOR → CEILING → FLOOR");
    syncHud();
  });
  document.addEventListener("keydown", keydown);

  setSnapshot({ mode: "ready", game: "Spider", dist: 0, best, score: 0, combo: 0, perfects: 0 });
  activeAdvance = (ms) => {
    const steps = Math.max(1, Math.round(ms / 16));
    for (let i = 0; i < steps; i++) update(1 / 60);
    draw();
  };
  activeCleanup = () => {
    cancelAnimationFrame(raf);
    document.removeEventListener("keydown", keydown);
  };
  bestEl.textContent = `Best: ${best} m`;
  last = performance.now();
  raf = requestAnimationFrame(tick);
}

Object.assign(gameStarters, { spider: startSpider });
