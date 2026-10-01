function startGravityBall() {
  openGame(
    "Gravity Ball",
    "Arcade",
    `
      <div class="game-layout">
        <div class="game-topline">
          <span class="game-stat" id="gbDist">0 m</span>
          <span class="game-stat" id="gbScore">Score: 0</span>
          <span class="game-stat" id="gbStage">Stage 1 · Gravity</span>
          <span class="game-stat" id="gbBest">Best: 0 m</span>
        </div>
        <canvas class="gravball-canvas" id="gbCanvas" width="720" height="480"></canvas>
        <p class="game-message" id="gbMsg">You move on your own. CLICK / TAP / SPACE flips gravity. Ride the floor &amp; ceiling — thread the gates.</p>
        <div class="game-actions">
          <button class="game-action one-press" id="gbFlip" type="button">⇅ FLIP GRAVITY</button>
          <button class="game-action" id="gbRetry" type="button">Restart</button>
        </div>
      </div>
    `
  );

  const canvas = document.querySelector("#gbCanvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const PX = 180;
  const PR = 12;
  const MID = H / 2;

  const distEl = document.querySelector("#gbDist");
  const scoreEl = document.querySelector("#gbScore");
  const stageEl = document.querySelector("#gbStage");
  const bestEl = document.querySelector("#gbBest");
  const message = document.querySelector("#gbMsg");
  const flipBtn = document.querySelector("#gbFlip");

  const QUIPS = [
    "PANCAKE. Gravity sends regards.",
    "Flat as a coin. Ouch.",
    "Wrong side. The wall noticed.",
    "So round. Then so flat.",
    "That gate was load-bearing. For you.",
    "Gravity always wins. Eventually."
  ];
  const EXTRA_KEY = "trinkets-gravityball-extra";

  let best = 0;
  let bestScore = 0;
  let bestFlips = 0;
  try {
    best = Number((readScores() || {}).gravityball) || 0;
    const extra = JSON.parse(localStorage.getItem(EXTRA_KEY));
    if (extra && typeof extra === "object") {
      bestScore = Number(extra.score) || 0;
      bestFlips = Number(extra.flips) || 0;
    }
  } catch (err) {}

  const GRAV = 2300;
  const MAXFALL = 680;
  const KICK = 170; // small kick opposite old fall so flips feel snappy

  let raf = 0;
  let last = performance.now();
  let mode = "ready"; // ready | playing | dead
  let time = 0;
  let worldX = 0;
  let playerY = MID;
  let vy = 0;
  let grav = 1; // 1 = falls down, -1 = falls up
  let gScale = 1;
  let speed = 265;
  let score = 0;
  let flips = 0;
  let coinsGot = 0;
  let grazes = 0;
  let grazeAcc = 0;
  let grounded = false;
  let segs = [];
  let pillars = []; // {wx,w,gapY,gapH,moveAmp,moveFreq,phase,fake}
  let coins = [];
  let particles = [];
  let popups = [];
  let trail = [];
  let genX = 0;
  let stageIdx = 0;
  let playerSegIdx = -1;
  let shake = 0;
  let chaosShake = 0;
  let flash = 0;
  let flipFlash = 0;
  let deadAge = 0;
  let banner = null;
  let shown = {};
  let squash = 0; // pancake anim timer on death
  let dustT = 0;

  function distM() {
    return Math.floor(worldX / 50);
  }

  function stageFor(d) {
    if (d < 150) return 0;
    if (d < 350) return 1;
    if (d < 600) return 2;
    if (d < 900) return 3;
    if (d < 1300) return 4;
    return 5;
  }

  const STAGE_NAMES = ["Gravity", "Tight Gaps", "Gravity Traps", "Moving Walls", "Speed", "Chaos"];

  function saveExtra() {
    try {
      localStorage.setItem(EXTRA_KEY, JSON.stringify({ score: bestScore, flips: bestFlips }));
    } catch (err) {}
  }

  function showBanner(text) {
    banner = { text, t: 1.9 };
  }

  function burst(x, y, n, color, spread) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * (spread || 220);
      particles.push({
        x, y,
        vx: Math.cos(a) * sp - speed * 0.3,
        vy: Math.sin(a) * sp,
        life: 0.55 + Math.random() * 0.3,
        max: 0.85,
        color,
        size: 2 + Math.random() * 3
      });
    }
  }

  function popup(x, y, text, color) {
    popups.push({ x, y, text, color, life: 1.1, max: 1.1 });
  }

  // ---------- corridor segments (safe to ride) ----------
  function shapeOff(seg, dx) {
    if (!seg.shape) return 0;
    if (seg.shape.type === "sine") return seg.shape.amp * Math.sin((dx / seg.shape.period) * Math.PI * 2);
    if (seg.shape.type === "tri") {
      const p = ((dx % seg.shape.period) + seg.shape.period) % seg.shape.period / seg.shape.period;
      const tri = p < 0.5 ? p * 4 - 1 : 3 - p * 4;
      return seg.shape.amp * tri;
    }
    return 0;
  }

  function segEndCenter(seg) {
    return seg.c + shapeOff(seg, seg.len);
  }

  function corridorCenter(seg, dx) {
    return seg.c + shapeOff(seg, Math.max(0, dx));
  }

  function pushSeg(opts) {
    const prev = segs.length ? segs[segs.length - 1] : null;
    const seg = {
      x0: genX,
      len: opts.len || 640,
      c: opts.c !== undefined ? opts.c : (prev ? segEndCenter(prev) : MID),
      h: opts.h !== undefined ? opts.h : 105,
      shape: opts.shape || null,
      moveAmp: opts.moveAmp || 0,
      moveFreq: opts.moveFreq || 2.2,
      fast: !!opts.fast,
      chaos: !!opts.chaos,
      label: opts.label || "",
      hint: opts.hint || ""
    };
    if (opts.c === undefined && prev) seg.c = MID + (segEndCenter(prev) - MID) * 0.6;
    const margin = seg.h + 34;
    seg.c = Math.max(margin, Math.min(H - margin, seg.c));
    segs.push(seg);

    const d = distM() + genX / 50;
    const st = stageFor(d);
    const gapH = opts.gapH !== undefined ? opts.gapH : gapFor(st);
    const nP = opts.pillars !== undefined ? opts.pillars : pillarsFor(st, seg.len);
    for (let i = 0; i < nP; i++) {
      const wx = seg.x0 + 190 + (i * (seg.len - 320)) / Math.max(1, nP - 1 || 1);
      const cc = corridorCenter(seg, wx - seg.x0);
      let off = opts.gapOff !== undefined ? opts.gapOff : laneOffset(st, i);
      const maxOff = Math.max(0, seg.h - gapH / 2 - 26);
      off = Math.max(-maxOff, Math.min(maxOff, off));
      const gy = cc + off;
      const moving = st >= 3 && (opts.moving || Math.random() < (st >= 5 ? 0.65 : 0.5));
      const fake = st >= 5 && Math.random() < 0.22 && !opts.noFake;
      pillars.push({
        wx, w: 26,
        gapY: gy, gapH,
        moveAmp: moving ? 26 + Math.random() * (st >= 5 ? 46 : 26) : 0,
        moveFreq: 1.8 + Math.random() * 1.6,
        phase: Math.random() * Math.PI * 2,
        fake
      });
      // gravity-trap doubles: a second pillar close behind with the gap on the other side
      if ((st === 2 || st >= 5) && opts.trap !== false && Math.random() < (st >= 5 ? 0.75 : 0.8)) {
        const wx2 = wx + 150 + Math.random() * 40;
        const cc2 = corridorCenter(seg, wx2 - seg.x0);
        const gy2 = Math.max(cc2 - seg.h + gapH / 2 + 26, Math.min(cc2 + seg.h - gapH / 2 - 26, cc2 - off * 0.9));
        pillars.push({
          wx: wx2, w: 26,
          gapY: gy2, gapH: Math.max(88, gapH - 8),
          moveAmp: st >= 5 && Math.random() < 0.5 ? 34 : 0,
          moveFreq: 2 + Math.random() * 1.4,
          phase: Math.random() * Math.PI * 2,
          fake: st >= 5 && Math.random() < 0.18
        });
        i++; // the trap pair counts as two
      }
    }

    const nCoins = opts.coins !== undefined ? opts.coins : 3;
    for (let i = 0; i < nCoins; i++) {
      const wx = seg.x0 + seg.len * ((i + 1) / (nCoins + 1));
      const y = corridorCenter(seg, wx - seg.x0);
      coins.push({ wx, y, taken: false, phase: Math.random() * Math.PI * 2, bait: false });
    }
    genX += seg.len;
    return seg;
  }

  function gapFor(st) {
    if (st === 0) return 168;
    if (st === 1) return 128;
    if (st === 2) return 122;
    if (st === 3) return 118;
    if (st === 4) return 110;
    return 100;
  }

  function pillarsFor(st, len) {
    const base = Math.max(2, Math.floor(len / 300));
    if (st === 0) return Math.min(2, base);
    if (st === 1) return Math.min(3, base);
    if (st === 4) return base + 1;
    if (st === 5) return base + 1;
    return base;
  }

  function laneOffset(st, i) {
    if (st === 0) return (i % 2 === 0 ? -34 : 34);
    if (st === 1) return (i % 2 === 0 ? -44 : 44);
    // traps: big swings that punish staying put
    if (st === 2) return (i % 2 === 0 ? -52 : 52);
    return (Math.random() < 0.5 ? -1 : 1) * (36 + Math.random() * 22);
  }

  function scriptedStage(i) {
    const B = [
      () => pushSeg({ h: 118, len: 680, gapH: 170, pillars: 2, gapOff: 0, label: "GRAVITY", hint: "Tap to flip. Ride the floor, ride the ceiling.", coins: 3, trap: false }),
      () => pushSeg({ h: 92, len: 640, gapH: 132, pillars: 3, label: "TIGHT GAPS", hint: "Smaller openings. Flip earlier than you think.", coins: 3, trap: false }),
      () => pushSeg({ h: 96, len: 720, gapH: 122, pillars: 3, label: "GRAVITY TRAPS", hint: "Looks safe… then it isn't. Be ready to flip back!", coins: 3 }),
      () => pushSeg({ h: 100, len: 720, gapH: 118, pillars: 3, moving: true, moveAmp: 22, moveFreq: 2.2, label: "MOVING WALLS", hint: "The gaps drift. Time your flips.", coins: 3 }),
      () => pushSeg({ h: 94, len: 680, gapH: 110, pillars: 4, fast: true, label: "SPEED UP", hint: "Faster. Flip almost constantly.", coins: 3 }),
      () => pushSeg({ h: 92, len: 760, gapH: 100, pillars: 4, moving: true, chaos: true, label: "CHAOS", hint: "Ghost gates! Weak & heavy gravity! Tiny gaps!", coins: 4 })
    ];
    return B[i % B.length]();
  }

  function endlessStage(d) {
    const st = stageFor(d);
    const len = 600 + Math.random() * 180;
    const roll = Math.random();
    const hBase = Math.max(84, 100 - (d - 1300) * 0.008);
    if (roll < 0.22) return pushSeg({ h: Math.max(80, hBase - 8), len, gapH: 96 + Math.random() * 10, pillars: 4, moving: true, chaos: true, label: "CHAOS", hint: "Tiny gaps. Ghost gates. Hold on.", coins: 4 });
    if (roll < 0.40) return pushSeg({ h: hBase, len, shape: { type: "sine", amp: 46 + Math.random() * 20, period: 560 }, gapH: 100 + Math.random() * 12, pillars: 3, moving: true, chaos: true, label: "WOBBLE", hint: "The corridor itself sways.", coins: 3 });
    if (roll < 0.55) return pushSeg({ h: hBase + 8, len, shape: { type: "tri", amp: 50, period: 380 }, gapH: 104, pillars: 4, chaos: true, label: "SWITCHBACKS", hint: "Flip-flip-flip!", coins: 3 });
    if (roll < 0.72) return pushSeg({ h: hBase + 10, len, moveAmp: 24, moveFreq: 2.6, gapH: 104, pillars: 3, moving: true, chaos: true, label: "MOVING WALLS", hint: "Safe gaps change while you approach.", coins: 3 });
    return pushSeg({ h: hBase, len, fast: true, chaos: st >= 5, gapH: 100, pillars: 4, moving: st >= 5, label: "SPEED UP", hint: "Reaction time: gone.", coins: 3 });
  }

  function ensureGen() {
    while (genX < worldX + W + 1000) {
      if (stageIdx === 0) {
        pushSeg({ c: MID, h: 120, len: 860, gapH: 175, pillars: 1, gapOff: 0, label: "GRAVITY", hint: "Tap to flip. Ride the floor, ride the ceiling.", coins: 2, trap: false });
      } else if (stageIdx <= 6) {
        scriptedStage(stageIdx - 1);
      } else {
        endlessStage(distM() + genX / 50);
      }
      stageIdx += 1;
    }
    const cut = worldX - 400;
    segs = segs.filter((s) => s.x0 + s.len > cut);
    pillars = pillars.filter((p) => p.wx + p.w > cut);
    coins = coins.filter((c) => c.wx > cut - 40);
  }

  function findSeg(wx) {
    for (let i = segs.length - 1; i >= 0; i--) {
      if (wx >= segs[i].x0) return { seg: segs[i], idx: i };
    }
    return { seg: segs[0], idx: 0 };
  }

  function wallsAt(wx, t) {
    const found = findSeg(wx);
    const seg = found.seg;
    const dx = Math.max(0, wx - seg.x0);
    let c = seg.c + shapeOff(seg, dx);
    let h = seg.h;
    if (dx < 90 && found.idx > 0) {
      const prev = segs[found.idx - 1];
      const s = dx / 90;
      const sm = s * s * (3 - 2 * s);
      c = segEndCenter(prev) + (c - segEndCenter(prev)) * sm;
      h = prev.h + (seg.h - prev.h) * sm;
    }
    let m = 0;
    if (seg.moveAmp) m = seg.moveAmp * Math.sin(t * seg.moveFreq + wx * 0.02);
    return { ceil: c - h + m, floor: c + h - m, c, h, seg, idx: found.idx };
  }

  function pillarGap(p, t) {
    let gy = p.gapY;
    if (p.moveAmp) gy += p.moveAmp * Math.sin(t * p.moveFreq + p.phase);
    return gy;
  }

  function circleRect(cx, cy, r, rx, ry, rw, rh) {
    const nx = Math.max(rx, Math.min(cx, rx + rw));
    const ny = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - nx;
    const dy = cy - ny;
    return dx * dx + dy * dy < r * r;
  }

  function syncHud() {
    const d = distM();
    const st = stageFor(d);
    distEl.textContent = `${d} m`;
    scoreEl.textContent = `Score: ${Math.floor(score)}`;
    stageEl.textContent = `Stage ${st + 1} · ${STAGE_NAMES[st]}`;
    bestEl.textContent = `Best: ${Math.max(best, d)} m`;
    setSnapshot({
      mode: mode === "playing" ? "playing" : mode === "dead" ? "ended" : "ready",
      game: "Gravity Ball",
      dist: d,
      score: Math.floor(score),
      flips,
      coins: coinsGot,
      stage: STAGE_NAMES[st],
      best: Math.max(best, d)
    });
  }

  function resetRun(toReady) {
    worldX = 0;
    playerY = MID;
    vy = 0;
    grav = 1;
    gScale = 1;
    speed = 265;
    score = 0;
    flips = 0;
    coinsGot = 0;
    grazes = 0;
    grazeAcc = 0;
    grounded = false;
    segs = [];
    pillars = [];
    coins = [];
    particles = [];
    popups = [];
    trail = [];
    genX = 0;
    stageIdx = 0;
    playerSegIdx = -1;
    shake = 0;
    chaosShake = 0;
    flash = 0;
    flipFlash = 0;
    squash = 0;
    banner = null;
    shown = {};
    ensureGen();
    playerSegIdx = findSeg(worldX + PX).idx;
    mode = toReady ? "ready" : "playing";
    deadAge = 0;
    if (toReady) message.textContent = "You move on your own. CLICK / TAP / SPACE flips gravity. Ride the floor & ceiling — thread the gates.";
    syncHud();
  }

  function die(reason) {
    if (mode !== "playing") return;
    mode = "dead";
    deadAge = 0;
    squash = 1;
    const d = distM();
    const s = Math.floor(score);
    const result = recordScore("gravityball", d, "high");
    best = Math.max(best, result.best, d);
    if (s > bestScore) bestScore = s;
    if (flips > bestFlips) bestFlips = flips;
    saveExtra();
    burst(PX, playerY, 26, "#b197fc", 280);
    burst(PX, playerY, 12, "#fff8ea", 180);
    shake = 15;
    flash = 0.45;
    message.textContent = `${reason || QUIPS[Math.floor(Math.random() * QUIPS.length)]}` +
      (result.isNew && d > 0 ? ` New best: ${d} m!` : ` Dist ${d} m · Score ${s} · Flips ${flips} · Coins ${coinsGot}. Best ${best} m.`);
    syncHud();
  }

  function flip() {
    if (mode === "ready") {
      resetRun(false);
      // opening flip: start falling down already, just launch
      showBanner("↓ FALL · TAP TO FLIP · FALL ↑");
      message.textContent = "Thread the gates. The floor and ceiling are safe — the gates are not.";
      syncHud();
      return;
    }
    if (mode !== "playing") return;
    grav = grav === 1 ? -1 : 1;
    flips += 1;
    // damp old momentum so rapid flips stay controllable, plus a small
    // kick toward the new fall direction so the response feels snappy
    vy = vy * 0.25 + grav * KICK * 0.4;
    flipFlash = 0.16;
    const d = distM();
    if (stageFor(d) >= 5) shake = Math.max(shake, 5);
    burst(PX, playerY, 6, grav === 1 ? "#a5d8ff" : "#ffc078", 120);
    if (flips > bestFlips) bestFlips = flips;
  }

  function milestone(d) {
    const marks = [
      [150, "STAGE 2 · TIGHT GAPS"],
      [350, "STAGE 3 · GRAVITY TRAPS"],
      [600, "STAGE 4 · MOVING WALLS"],
      [900, "STAGE 5 · SPEED"],
      [1300, "STAGE 6 · CHAOS 🟣💥"]
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
    shake = Math.max(0, shake - dt * 30);
    if (flash > 0) flash -= dt;
    if (flipFlash > 0) flipFlash -= dt;
    if (squash > 0) squash = Math.max(0, squash - dt * 1.4);

    particles = particles.filter((p) => p.life > 0);
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 500 * dt;
      p.life -= dt;
    }
    popups = popups.filter((p) => p.life > 0);
    for (const p of popups) {
      p.y -= 46 * dt;
      p.life -= dt;
    }

    if (mode === "ready") {
      ensureGen();
      const w = wallsAt(worldX + PX, time);
      playerY = w.c + Math.sin(time * 2.2) * (w.h * 0.45);
      trail.push({ x: PX, y: playerY });
      if (trail.length > 40) trail.shift();
      return;
    }

    if (mode === "dead") {
      deadAge += dt;
      worldX += speed * 0.12 * dt; // drift to a stop behind the pancake
      if (deadAge > 1.8) resetRun(true);
      return;
    }

    // playing
    const d = distM();
    milestone(d);
    ensureGen();
    const st = stageFor(d);

    const probe = wallsAt(worldX + PX, time);
    const targetSpeed = Math.min(700, 265 + d * 0.62) + (probe.seg.fast ? 120 : 0);
    speed = targetSpeed;
    worldX += speed * dt;

    // chaos gravity: strength breathes; telegraphed by HUD + tint
    if (st >= 5) {
      gScale = 1 + 0.4 * Math.sin(time * 1.6);
      chaosShake = 2.2;
    } else if (st === 4) {
      gScale += (1 - gScale) * Math.min(1, dt * 3);
      chaosShake = 0;
    } else {
      gScale = 1;
      chaosShake = 0;
    }

    const now = wallsAt(worldX + PX, time);
    if (now.idx !== playerSegIdx) {
      playerSegIdx = now.idx;
      if (now.seg.label) showBanner(st >= 5 && stageIdx > 8 ? `CHAOS · ${now.seg.label}` : (stageIdx > 8 ? `ENDLESS · ${now.seg.label}` : now.seg.label));
      if (now.seg.hint) message.textContent = now.seg.hint;
    }

    // --- gravity physics: always accelerating, never jumping ---
    vy += grav * GRAV * gScale * dt;
    if (vy > MAXFALL) vy = MAXFALL;
    if (vy < -MAXFALL) vy = -MAXFALL;
    playerY += vy * dt;

    const playerWX = worldX + PX;
    const walls = wallsAt(playerWX, time);

    // ride the corridor: floor/ceiling are SAFE, you roll along them
    grounded = false;
    if (playerY - PR < walls.ceil) {
      playerY = walls.ceil + PR;
      if (vy < 0) vy = 0;
      grounded = grav === -1;
    }
    if (playerY + PR > walls.floor) {
      playerY = walls.floor - PR;
      if (vy > 0) vy = 0;
      grounded = grav === 1;
    }

    trail.push({ x: PX, y: playerY });
    if (trail.length > 46) trail.shift();

    if (grounded && Math.random() < 0.3) {
      particles.push({
        x: PX - 12, y: playerY + (grav === 1 ? PR : -PR),
        vx: -speed * 0.25, vy: (Math.random() - 0.5) * 40,
        life: 0.3, max: 0.3, color: "rgba(255,255,255,0.5)", size: 2
      });
    }

    // --- deadly gates ---
    for (const p of pillars) {
      if (p.fake) continue;
      const sx = p.wx - worldX;
      if (sx + p.w < PX - PR - 6 || sx > PX + PR + 6) continue;
      const gy = pillarGap(p, time);
      const topB = gy - p.gapH / 2;   // bottom edge of top block
      const botT = gy + p.gapH / 2;   // top edge of bottom block
      const wTop = wallsAt(p.wx + p.w / 2, time);
      // top block: corridor ceiling -> gap top; bottom block: gap bottom -> corridor floor
      if (circleRect(playerWX, playerY, PR - 2, p.wx, wTop.ceil - 30, p.w, (topB) - (wTop.ceil - 30))) {
        die();
        return;
      }
      if (circleRect(playerWX, playerY, PR - 2, p.wx, botT, p.w, (wTop.floor + 30) - botT)) {
        die();
        return;
      }
      // clip the pillar cheeks so squeezing past the edge still counts
      if (playerWX + PR - 3 > p.wx && playerWX - PR + 3 < p.wx + p.w) {
        if (playerY - PR + 3 < topB || playerY + PR - 3 > botT) {
          die();
          return;
        }
      }
    }

    // --- coins ---
    for (const cn of coins) {
      if (cn.taken) continue;
      const sx = cn.wx - worldX;
      if (sx < -20 || sx > W + 20) continue;
      const cy = cn.y + Math.sin(time * 3 + cn.phase) * 3;
      if (Math.hypot(sx - PX, cy - playerY) < PR + 11) {
        cn.taken = true;
        coinsGot += 1;
        score += 25;
        popup(PX + 24, playerY - 26, "+25", "#f6c445");
        burst(sx, cy, 8, "#f6c445", 160);
      }
    }

    // graze bonus: fast while close to a gate edge but alive
    let nearEdge = false;
    for (const p of pillars) {
      if (p.fake) continue;
      if (Math.abs((p.wx + p.w / 2) - playerWX) > 60) continue;
      const gy = pillarGap(p, time);
      const clearance = Math.min(
        Math.abs((playerY - PR) - (gy - p.gapH / 2)),
        Math.abs((playerY + PR) - (gy + p.gapH / 2))
      );
      if (clearance < 16) { nearEdge = true; break; }
    }
    if (nearEdge) {
      grazeAcc += dt;
      if (grazeAcc >= 0.55) {
        grazeAcc = 0;
        grazes += 1;
        score += 15;
        popup(PX + 30, playerY - 24, "GRAZE +15", "#43c6ac");
      }
    } else {
      grazeAcc = Math.max(0, grazeAcc - dt * 2);
    }

    score += speed * dt * 0.06;
    syncHudThrottled();
  }

  let hudT = 0;
  function syncHudThrottled() {
    hudT += 1;
    if (hudT % 6 === 0) syncHud();
    else {
      const d = distM();
      distEl.textContent = `${d} m`;
      scoreEl.textContent = `Score: ${Math.floor(score)}`;
    }
  }

  function drawPillar(p, t) {
    const sx = p.wx - worldX;
    if (sx + p.w < -40 || sx > W + 40) return;
    const gy = pillarGap(p, t);
    const topB = gy - p.gapH / 2;
    const botT = gy + p.gapH / 2;
    const w = wallsAt(p.wx + p.w / 2, t);
    const topY0 = w.ceil - 30;
    const botY1 = w.floor + 30;
    const ghost = !!p.fake;

    ctx.save();
    if (ghost) ctx.globalAlpha = 0.32;
    const bodyGrad = ctx.createLinearGradient(sx, 0, sx + p.w, 0);
    if (ghost) {
      bodyGrad.addColorStop(0, "#868e96");
      bodyGrad.addColorStop(1, "#adb5bd");
    } else if (p.moveAmp) {
      bodyGrad.addColorStop(0, "#7048e8");
      bodyGrad.addColorStop(1, "#9775fa");
    } else {
      bodyGrad.addColorStop(0, "#e14b4b");
      bodyGrad.addColorStop(1, "#ff8787");
    }
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = "#0f1320";
    ctx.lineWidth = 3;
    // top block
    if (topB > topY0 + 2) {
      ctx.beginPath();
      ctx.roundRect(sx, topY0, p.w, topB - topY0, 5);
      ctx.fill();
      ctx.stroke();
    }
    // bottom block
    if (botY1 > botT + 2) {
      ctx.beginPath();
      ctx.roundRect(sx, botT, p.w, botY1 - botT, 5);
      ctx.fill();
      ctx.stroke();
    }
    // neon lips at the gap mouth
    ctx.fillStyle = ghost ? "rgba(255,255,255,0.7)" : "#f6c445";
    ctx.fillRect(sx - 2, topB - 3, p.w + 4, 5);
    ctx.fillRect(sx - 2, botT - 2, p.w + 4, 5);
    if (ghost) {
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.fillText("?", sx + p.w / 2, gy + 5);
    }
    ctx.restore();
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const st = stageFor(distM());
    const chaos = st >= 5 && mode === "playing";
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    if (chaos) {
      sky.addColorStop(0, "#241d4d");
      sky.addColorStop(0.5, "#3b2d7a");
      sky.addColorStop(1, "#241d4d");
    } else {
      sky.addColorStop(0, "#141a33");
      sky.addColorStop(0.5, "#1d2550");
      sky.addColorStop(1, "#141a33");
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    const shx = (Math.random() - 0.5) * (shake + chaosShake);
    const shy = (Math.random() - 0.5) * (shake + chaosShake);
    ctx.save();
    ctx.translate(shx, shy);

    // backdrop dots
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    const off = worldX % 60;
    for (let gx = -off; gx < W; gx += 60) {
      for (let gy = 30; gy < H; gy += 60) {
        ctx.fillRect(gx, gy, 2, 2);
      }
    }
    // speed lines when ripping
    if (speed > 470 && mode === "playing") {
      ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.25, (speed - 470) / 900).toFixed(2)})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const y = 40 + ((i * 67 + time * 700) % (H - 80));
        const x = (i * 211 + 40) % W;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 46, y);
        ctx.stroke();
      }
    }

    const STEP = 14;
    const edgeColor = chaos ? "#b197fc" : "#f6c445";
    const wallFill = chaos ? "#241d4d" : "#1a1440";

    // safe corridor bodies
    for (const top of [true, false]) {
      ctx.beginPath();
      ctx.moveTo(-20, top ? -20 : H + 20);
      for (let x = -20; x <= W + 20; x += STEP) {
        const w = wallsAt(worldX + x, time);
        ctx.lineTo(x, top ? w.ceil : w.floor);
      }
      ctx.lineTo(W + 20, top ? -20 : H + 20);
      ctx.closePath();
      ctx.fillStyle = wallFill;
      ctx.fill();
    }
    // neon safe edges (these you may RIDE)
    for (const top of [true, false]) {
      ctx.beginPath();
      for (let x = -20; x <= W + 20; x += STEP) {
        const w = wallsAt(worldX + x, time);
        const y = top ? w.ceil : w.floor;
        if (x === -20) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = edgeColor;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // gates (deadly) + ghosts (harmless fakes)
    for (const p of pillars) drawPillar(p, time);

    // coins
    for (const cn of coins) {
      if (cn.taken) continue;
      const sx = cn.wx - worldX;
      if (sx < -20 || sx > W + 20) continue;
      const cy = cn.y + Math.sin(time * 3 + cn.phase) * 3;
      ctx.save();
      ctx.translate(sx, cy);
      const pulse = 1 + Math.sin(time * 5 + cn.phase) * 0.08;
      ctx.scale(pulse, pulse);
      ctx.fillStyle = "#f6c445";
      ctx.strokeStyle = "#0f1320";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#92600a";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("$", 0, 1);
      ctx.textBaseline = "alphabetic";
      ctx.restore();
    }

    // trail ribbon
    if (trail.length > 1) {
      for (let i = 1; i < trail.length; i++) {
        const a = i / trail.length;
        ctx.strokeStyle = grav === 1
          ? `rgba(165,216,255,${(a * 0.55).toFixed(2)})`
          : `rgba(255,192,120,${(a * 0.55).toFixed(2)})`;
        ctx.lineWidth = 3 + a * 7;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(trail[i - 1].x - (trail.length - i) * (speed / 2400), trail[i - 1].y);
        ctx.lineTo(trail[i].x - (trail.length - 1 - i) * (speed / 2400) - 2, trail[i].y);
        ctx.stroke();
      }
    }

    // ball (squashes into a pancake on death)
    if (mode !== "dead" || squash > 0.15) {
      const flat = mode === "dead" ? (1 - squash) * 0.75 : 0;
      const wob = grounded ? 1 + Math.sin(time * 30) * 0.04 : 1;
      ctx.save();
      ctx.translate(PX, playerY + (mode === "dead" ? (1 - squash) * 8 : 0));
      ctx.scale((1 + flat) * wob, (1 - flat) / wob);
      if (flipFlash > 0) ctx.globalAlpha = 0.6 + Math.random() * 0.4;
      const g = ctx.createRadialGradient(-4, grav === 1 ? 5 : -5, 2, 0, 0, PR + 3);
      g.addColorStop(0, "#e5dbff");
      g.addColorStop(0.55, "#9775fa");
      g.addColorStop(1, "#5f3dc4");
      ctx.fillStyle = g;
      ctx.strokeStyle = "#0f1320";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, PR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // shine + gravity arrow on the ball
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.arc(-PR * 0.3, grav === 1 ? -PR * 0.35 : PR * 0.35, PR * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(grav === 1 ? "↓" : "↑", 0, 5);
      ctx.restore();
      ctx.globalAlpha = 1;
      if (mode === "playing") {
        ctx.font = "bold 15px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = grav === 1 ? "#a5d8ff" : "#ffc078";
        ctx.fillText(grav === 1 ? "▼" : "▲", PX, playerY + (grav === 1 ? 26 : -20));
      }
    }

    // flip beam
    if (flipFlash > 0) {
      const a = Math.max(0, flipFlash / 0.16);
      ctx.strokeStyle = `rgba(177,151,252,${(0.8 * a).toFixed(2)})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(PX, playerY - 34);
      ctx.lineTo(PX, playerY + 34);
      ctx.stroke();
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

    // gravity-strength tag in chaos
    if (chaos && mode === "playing") {
      ctx.font = "bold 15px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#b197fc";
      const tag = gScale > 1.15 ? "◄ HEAVY GRAVITY ►" : gScale < 0.85 ? "◄ FLOATY GRAVITY ►" : "◄ CHAOS: GRAVITY DRIFTS ►";
      ctx.fillText(tag, W / 2, H - 14);
    }

    // banner
    if (banner) {
      ctx.font = "bold 24px sans-serif";
      const tw = ctx.measureText(banner.text).width + 48;
      ctx.fillStyle = "rgba(12,10,24,0.82)";
      ctx.beginPath();
      ctx.roundRect(W / 2 - tw / 2, 24, tw, 44, 12);
      ctx.fill();
      ctx.fillStyle = "#e5dbff";
      ctx.textBaseline = "middle";
      ctx.fillText(banner.text, W / 2, 47);
      ctx.textBaseline = "alphabetic";
    }

    // overlays
    if (mode === "ready") {
      ctx.fillStyle = "rgba(10,10,24,0.62)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff8ea";
      ctx.font = "bold 52px sans-serif";
      ctx.fillText("GRAVITY BALL", W / 2, H / 2 - 66);
      ctx.font = "bold 19px sans-serif";
      ctx.fillStyle = "#e5dbff";
      ctx.fillText("You don't jump. You fall — up or down.", W / 2, H / 2 - 28);
      ctx.fillStyle = "#fff8ea";
      ctx.font = "16px sans-serif";
      ctx.fillText("AUTO-RUN · SPACE / CLICK / TAP flips gravity", W / 2, H / 2 + 2);
      ctx.fillText("Ride the gold rails. Thread the red gates.", W / 2, H / 2 + 26);
      ctx.fillText("Purple gates move. Ghost gates (?) are fake.", W / 2, H / 2 + 50);
      ctx.fillStyle = "#69db7c";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("— tap anything to fall —", W / 2, H / 2 + 82);
    }

    if (mode === "dead") {
      ctx.fillStyle = "rgba(10,8,16,0.45)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.fillStyle = "#b197fc";
      ctx.font = "bold 54px sans-serif";
      ctx.fillText("PANCAKE", W / 2, H / 2 - 10);
      ctx.fillStyle = "#fff8ea";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText(`${distM()} m · Score ${Math.floor(score)} · Flips ${flips}`, W / 2, H / 2 + 24);
    }

    ctx.restore();

    if (flash > 0) {
      ctx.fillStyle = `rgba(177,151,252,${Math.min(0.4, flash).toFixed(2)})`;
      ctx.fillRect(0, 0, W, H);
    }

    const d = distM();
    distEl.textContent = `${d} m`;
    scoreEl.textContent = `Score: ${Math.floor(score)}`;
  }

  function tick(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    raf = requestAnimationFrame(tick);
  }

  function keydown(e) {
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW" || e.code === "ArrowDown") {
      e.preventDefault();
      if (e.repeat) return;
      if (mode === "dead") return;
      flip();
    } else if (e.code === "Enter" && mode !== "playing") {
      flip();
    }
  }

  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    flip();
  });
  flipBtn.addEventListener("click", (e) => {
    e.preventDefault();
    flip();
  });
  document.querySelector("#gbRetry").addEventListener("click", () => {
    resetRun(false);
    message.textContent = "Thread the gates. The floor and ceiling are safe — the gates are not.";
    showBanner("↓ FALL · TAP TO FLIP · FALL ↑");
    syncHud();
  });
  document.addEventListener("keydown", keydown);

  setSnapshot({ mode: "ready", game: "Gravity Ball", dist: 0, score: 0, flips: 0, coins: 0, stage: STAGE_NAMES[0], best });
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

Object.assign(gameStarters, { gravityball: startGravityBall });
