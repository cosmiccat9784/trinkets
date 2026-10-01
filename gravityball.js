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
        <p class="game-message" id="gbMsg">Roll along the platforms. CLICK / TAP / SPACE flips gravity — land on the other side. Spikes and walls turn you into a pancake.</p>
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
  const TH = 26;          // platform block thickness
  const FLOOR_Y = H - 70; // top face of floor platforms
  const CEIL_Y = 70;      // bottom face of ceiling platforms

  const distEl = document.querySelector("#gbDist");
  const scoreEl = document.querySelector("#gbScore");
  const stageEl = document.querySelector("#gbStage");
  const bestEl = document.querySelector("#gbBest");
  const message = document.querySelector("#gbMsg");
  const flipBtn = document.querySelector("#gbFlip");

  const QUIPS = [
    "SKEWERED. The spike sends regards.",
    "PANCAKE. Gravity sends regards.",
    "Bonk. Walls are solid. You are not.",
    "Wrong side. The spike noticed.",
    "So round. Then so flat.",
    "Lost to the void. It is very dark down there."
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
  const MAXFALL = 700;
  const KICK = 170; // small kick toward the new fall direction on flip

  let raf = 0;
  let last = performance.now();
  let mode = "ready"; // ready | playing | dead
  let time = 0;
  let worldX = 0;
  let playerY = FLOOR_Y - PR;
  let vy = 0;
  let grav = 1; // 1 = falls down, -1 = falls up
  let gScale = 1;
  let grounded = null; // null | "floor" | "ceil"
  let speed = 265;
  let score = 0;
  let flips = 0;
  let coinsGot = 0;
  let closes = 0;
  let floorSegs = []; // {x0,x1,y} — y = top face
  let ceilSegs = [];  // {x0,x1,y} — y = bottom face
  let spikes = [];    // {wx,side,seg,fake}
  let coins = [];
  let particles = [];
  let popups = [];
  let trail = [];
  let genX = 0;
  let patCount = 0;
  let shake = 0;
  let chaosShake = 0;
  let flash = 0;
  let flipFlash = 0;
  let deadAge = 0;
  let banner = null;
  let shown = {};
  let squash = 0;

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

  const STAGE_NAMES = ["Gravity", "Tight Gaps", "Gravity Traps", "Moving Platforms", "Speed", "Chaos"];

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

  function circleRect(cx, cy, r, rx, ry, rw, rh) {
    const nx = Math.max(rx, Math.min(cx, rx + rw));
    const ny = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - nx;
    const dy = cy - ny;
    return dx * dx + dy * dy < r * r;
  }

  // ---------- platforms ----------
  // Global sway: in Moving/Chaos stages the WHOLE world breathes up and down
  // together. Relative geometry never changes, so no unfair step-up walls.
  let swayAmp = 0;
  let swayOff = 0;

  function surfYAt(seg, t) {
    return seg.y + swayOff;
  }

  function segAt(arr, wx) {
    for (let i = arr.length - 1; i >= 0; i--) {
      const s = arr[i];
      if (wx >= s.x0 - 8 && wx <= s.x1 + 8) return s;
    }
    return null;
  }

  function addSeg(side, x0, x1) {
    const arr = side === "floor" ? floorSegs : ceilSegs;
    const y = side === "floor" ? FLOOR_Y : CEIL_Y;
    const last = arr[arr.length - 1];
    if (last && x0 <= last.x1 + 1) {
      last.x1 = Math.max(last.x1, x1);
      return last;
    }
    const s = { x0, x1, y };
    arr.push(s);
    return s;
  }

  function spikeRow(side, seg, fromX, toX, fake) {
    for (let x = fromX; x <= toX; x += 46) {
      spikes.push({ wx: x, side, seg, fake: !!fake });
    }
  }

  // Rightmost real-spike position per side. New rows on one side are pushed
  // forward until they clear the other side's spikes: opposite-side spikes
  // must never overlap within a kill zone, especially across pattern joints.
  const lastSpike = { floor: -1e9, ceil: -1e9 };

  function safeRow(side, seg, fromX, toX, fake) {
    if (!fake) {
      const other = side === "floor" ? "ceil" : "floor";
      if (lastSpike[other] > fromX - 48) fromX = lastSpike[other] + 48;
      if (fromX > toX) return; // squeezed out: pattern just gets easier
      lastSpike[side] = Math.max(lastSpike[side], Math.floor((toX - fromX) / 46) * 46 + fromX);
    }
    spikeRow(side, seg, fromX, toX, fake);
  }

  function coinLine(x0, x1, y, n) {
    for (let i = 0; i < n; i++) {
      const wx = n === 1 ? (x0 + x1) / 2 : x0 + (i * (x1 - x0)) / (n - 1);
      coins.push({ wx, y, taken: false, phase: Math.random() * Math.PI * 2 });
    }
  }

  function coinArc(x0, x1, y0, y1) {
    for (let i = 0; i < 4; i++) {
      const f = i / 3;
      coins.push({
        wx: x0 + (x1 - x0) * f,
        y: y0 + (y1 - y0) * f - Math.sin(f * Math.PI) * 40,
        taken: false,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  function cover(c0, c1) {
    // solid platforms on both sides
    addSeg("floor", c0, c1);
    addSeg("ceil", c0, c1);
  }

  function gapLen(st) {
    if (st === 0) return 120 + Math.random() * 30;
    if (st === 1) return 150 + Math.random() * 50;
    if (st <= 3) return 180 + Math.random() * 60;
    if (st === 4) return 200 + Math.random() * 60;
    return 220 + Math.random() * 60;
  }

  // -- patterns: every pattern leaves BOTH sides covered up to genX,
  //    except the gapped side, which resumes right after its gap. --
  function pCruise(len) {
    const c = genX;
    cover(c - 60, c + len);
    coinLine(c + len * 0.3, c + len * 0.7, (FLOOR_Y + CEIL_Y) / 2, 3);
    genX = c + len;
    return "Roll easy. Breathe.";
  }

  function pGap(side, len) {
    const other = side === "floor" ? "ceil" : "floor";
    const c = genX;
    cover(c - 60, c + 120);
    const g0 = c + 120;
    const g1 = g0 + len;
    // safe side runs long: trap/tight flanks mined up to g1+175 must sit on platform
    addSeg(other, c - 60, g1 + 200);
    addSeg(side, c - 60, g0);
    addSeg(side, g1, g1 + 140);
    const safeY = side === "floor" ? CEIL_Y + 44 : FLOOR_Y - 44;
    coinLine(g0 + 10, g1 - 10, safeY, 3);
    genX = g1 + 140;
    return side === "floor" ? "Gap below! Flip UP, ride it over." : "Gap above! Flip DOWN, ride it over.";
  }

  function pGapTight(side, len) {
    // safe side is spiked except for a window around the gap
    const other = side === "floor" ? "ceil" : "floor";
    const hint = pGap(side, len);
    const g0 = genX - 140 - len;
    const g1 = genX - 140;
    const seg = segAt(other === "floor" ? floorSegs : ceilSegs, (g0 + g1) / 2);
    if (seg) {
      safeRow(other, seg, g0 - 170, g0 - 60, false);
      safeRow(other, seg, g1 + 60, g1 + 170, false);
    }
    return "Tight landing — thread the window!";
  }

  function pSpikes(side, len, fake) {
    const c = genX;
    cover(c - 60, c + len + 60);
    const seg = addSeg(side, c - 60, c + len + 60);
    safeRow(side, seg, c + 30, c + len - 30, fake);
    const safeY = side === "floor" ? CEIL_Y + 44 : FLOOR_Y - 44;
    coinLine(c + 40, c + len - 20, safeY, 3);
    genX = c + len;
    return fake ? "Ghost spikes (?) are fake. Probably." : (side === "floor" ? "Spikes below! Get UP." : "Spikes above! Get DOWN.");
  }

  function pStagger(len) {
    const c = genX;
    cover(c - 60, c + len + 60);
    const sf = addSeg("floor", c - 60, c + len + 60);
    const sc = addSeg("ceil", c - 60, c + len + 60);
    // generous unspiked handoff in the middle: flip here, both sides safe
    safeRow("floor", sf, c + 30, c + len / 2 - 70, false);
    safeRow("ceil", sc, c + len / 2 + 10, c + len - 30, false);
    coinArc(c + 40, c + len - 40, FLOOR_Y - 44, CEIL_Y + 44);
    genX = c + len;
    return "Flip halfway! Down, then up.";
  }

  function pTrap(len) {
    // a gap whose natural landing zone is mined on both edges
    const side = Math.random() < 0.5 ? "floor" : "ceil";
    const other = side === "floor" ? "ceil" : "floor";
    const c = genX;
    cover(c - 60, c + 120);
    const g0 = c + 120;
    const g1 = g0 + len;
    // safe side runs long: flank spikes up to g1+175 must sit on platform
    addSeg(other, c - 60, g1 + 200);
    addSeg(side, c - 60, g0);
    addSeg(side, g1, g1 + 140);
    const seg = segAt(other === "floor" ? floorSegs : ceilSegs, (g0 + g1) / 2);
    if (seg) {
      safeRow(other, seg, g0 - 175, g0 - 65, false);
      safeRow(other, seg, g1 + 65, g1 + 175, false);
    }
    coinLine(g0 + 20, g1 - 20, other === "ceil" ? CEIL_Y + 52 : FLOOR_Y - 52, 2);
    genX = g1 + 140;
    return "Trap! The landing looks wide. It is not.";
  }

  function pMove(len) {
    // staggered spikes while the whole world sways (sway is stage-driven)
    const hint = pStagger(len);
    return "Moving walls! " + hint;
  }

  function pChaos(len) {
    const roll = Math.random();
    const c = genX;
    if (roll < 0.3) {
      const hint = pSpikes(Math.random() < 0.5 ? "floor" : "ceil", len, false);
      // sprinkle ghost spikes on the safe side to spook
      const safe = spikes.length && spikes[spikes.length - 1].side === "floor" ? "ceil" : "floor";
      const arr = safe === "floor" ? floorSegs : ceilSegs;
      const seg = arr[arr.length - 1];
      if (seg) spikeRow(safe, seg, c + 60, c + len - 60, true);
      return hint + " Ghosts (?) can't hurt you.";
    } else if (roll < 0.55) {
      return pTrap(len * 0.8);
    } else if (roll < 0.75) {
      return pGapTight(Math.random() < 0.5 ? "floor" : "ceil", len * 0.7);
    }
    return pMove(len);
  }

  function nextPattern(dAhead) {
    const st = stageFor(dAhead);
    const opts = [];
    if (patCount < 1) return { fn: () => pCruise(560), st };
    if (patCount === 1) return { fn: () => pGap("floor", 130), st };
    if (patCount === 2) return { fn: () => pCruise(300), st };
    if (patCount === 3) return { fn: () => pSpikes("floor", 220, false), st };
    if (patCount === 4) return { fn: () => pGap("ceil", 140), st };
    if (st === 0) {
      opts.push(() => pCruise(320 + Math.random() * 120), () => pGap(Math.random() < 0.5 ? "floor" : "ceil", gapLen(st)), () => pSpikes(Math.random() < 0.5 ? "floor" : "ceil", 200, false));
    } else if (st === 1) {
      opts.push(() => pGap(Math.random() < 0.5 ? "floor" : "ceil", gapLen(st)), () => pGapTight(Math.random() < 0.5 ? "floor" : "ceil", gapLen(st)), () => pStagger(300), () => pSpikes(Math.random() < 0.5 ? "floor" : "ceil", 220, false), () => pCruise(260));
    } else if (st === 2) {
      opts.push(() => pTrap(gapLen(st)), () => pStagger(320), () => pGapTight(Math.random() < 0.5 ? "floor" : "ceil", gapLen(st)), () => pSpikes(Math.random() < 0.5 ? "floor" : "ceil", 240, false), () => pCruise(240));
    } else if (st === 3) {
      opts.push(() => pMove(420), () => pTrap(gapLen(st)), () => pStagger(320), () => pSpikes(Math.random() < 0.5 ? "floor" : "ceil", 240, false), () => pGap(Math.random() < 0.5 ? "floor" : "ceil", gapLen(st)));
    } else if (st === 4) {
      opts.push(() => pGap(Math.random() < 0.5 ? "floor" : "ceil", gapLen(st)), () => pStagger(340), () => pMove(420), () => pTrap(gapLen(st)), () => pSpikes(Math.random() < 0.5 ? "floor" : "ceil", 260, false));
    } else {
      opts.push(() => pChaos(340), () => pChaos(380), () => pMove(400), () => pStagger(340));
    }
    return { fn: opts[Math.floor(Math.random() * opts.length)], st };
  }

  function ensureGen() {
    cover(-140, 60);
    if (genX < 60) genX = 60;
    while (genX < worldX + W + 1000) {
      const dAhead = distM() + (genX - worldX) / 50;
      const { fn } = nextPattern(dAhead);
      fn();
      patCount += 1;
    }
    const cut = worldX - 400;
    floorSegs = floorSegs.filter((s) => s.x1 > cut);
    ceilSegs = ceilSegs.filter((s) => s.x1 > cut);
    spikes = spikes.filter((s) => s.wx > cut);
    coins = coins.filter((c) => c.wx > cut - 40);
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
    playerY = FLOOR_Y - PR;
    vy = 0;
    grav = 1;
    gScale = 1;
    swayAmp = 0;
    swayOff = 0;
    grounded = toReady ? null : "floor";
    speed = 265;
    score = 0;
    flips = 0;
    coinsGot = 0;
    closes = 0;
    floorSegs = [];
    ceilSegs = [];
    spikes = [];
    coins = [];
    particles = [];
    popups = [];
    trail = [];
    lastSpike.floor = -1e9;
    lastSpike.ceil = -1e9;
    genX = 0;
    patCount = 0;
    shake = 0;
    chaosShake = 0;
    flash = 0;
    flipFlash = 0;
    squash = 0;
    banner = null;
    shown = {};
    ensureGen();
    mode = toReady ? "ready" : "playing";
    deadAge = 0;
    if (toReady) message.textContent = "Roll along the platforms. CLICK / TAP / SPACE flips gravity — land on the other side. Spikes and walls turn you into a pancake.";
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
      showBanner("ROLL · TAP TO FLIP · LAND IT");
      message.textContent = "Ride the platforms. Flip before the edge!";
      syncHud();
      return;
    }
    if (mode !== "playing") return;
    grav = grav === 1 ? -1 : 1;
    flips += 1;
    grounded = null;
    // damp old momentum so rapid flips stay controllable, plus a small
    // kick toward the new fall direction so the response feels snappy
    vy = vy * 0.25 + grav * KICK * 0.4;
    flipFlash = 0.16;
    if (stageFor(distM()) >= 5) shake = Math.max(shake, 5);
    burst(PX, playerY, 6, grav === 1 ? "#a5d8ff" : "#ffc078", 120);
    if (flips > bestFlips) bestFlips = flips;
  }

  function milestone(d) {
    const marks = [
      [150, "STAGE 2 · TIGHT GAPS"],
      [350, "STAGE 3 · GRAVITY TRAPS"],
      [600, "STAGE 4 · MOVING PLATFORMS"],
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

  function spikeRect(sp, t) {
    const sy = surfYAt(sp.seg, t);
    if (sp.side === "floor") return { x: sp.wx - 10, y: sy - 26, w: 20, h: 26 };
    return { x: sp.wx - 10, y: sy, w: 20, h: 26 };
  }

  function closeCallBonus() {
    const playerWX = worldX + PX;
    for (const sp of spikes) {
      if (sp.fake) continue;
      if (Math.abs(sp.wx - playerWX) < 52) {
        closes += 1;
        score += 15;
        popup(PX + 30, playerY - 26, "CLOSE +15", "#43c6ac");
        burst(PX, playerY, 5, "#43c6ac", 120);
        return;
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
      playerY = FLOOR_Y - PR + Math.sin(time * 2.2) * 5;
      trail.push({ x: PX, y: playerY });
      if (trail.length > 40) trail.shift();
      return;
    }

    if (mode === "dead") {
      deadAge += dt;
      if (deadAge > 1.8) resetRun(true);
      return;
    }

    // playing
    const d = distM();
    milestone(d);
    ensureGen();
    const st = stageFor(d);

    const targetSpeed = Math.min(700, 265 + d * 0.62);
    speed = targetSpeed;
    worldX += speed * dt;

    // chaos gravity: strength breathes; telegraphed by HUD + tint
    if (st >= 5) {
      gScale = 1 + 0.4 * Math.sin(time * 1.6);
      chaosShake = 2.2;
    } else {
      gScale = 1;
      chaosShake = 0;
    }

    // world sway: Moving Platforms + Chaos stages breathe as one
    const swayTarget = st === 3 ? 22 : st >= 5 ? 30 : 0;
    swayAmp += (swayTarget - swayAmp) * Math.min(1, dt * 1.5);
    swayOff = swayAmp * Math.sin(time * 1.8);

    const playerWX = worldX + PX;
    const prevY = playerY;

    if (grounded === "floor" || grounded === "ceil") {
      const arr = grounded === "floor" ? floorSegs : ceilSegs;
      const seg = segAt(arr, playerWX);
      const sy = seg ? surfYAt(seg, time) : null;
      const surfaceY = grounded === "floor" ? (sy === null ? null : sy - PR) : (sy === null ? null : sy + PR);
      if (seg && surfaceY !== null && Math.abs(surfaceY - playerY) <= 8) {
        // keep rolling
        playerY = surfaceY;
        vy = 0;
        // ran into a step-up wall?
        const front = segAt(arr, playerWX + PR + 2);
        if (front) {
          const fsy = surfYAt(front, time);
          if (grounded === "floor" ? fsy < playerY + PR - 4 : fsy > playerY - PR + 4) {
            die("Bonk. Walls are solid. You are not.");
            return;
          }
        }
      } else {
        // ran off the edge (or platform moved away): airborne
        grounded = null;
        vy = 0;
      }
    }

    if (grounded === null) {
      // --- always accelerating, never jumping ---
      vy += grav * GRAV * gScale * dt;
      if (vy > MAXFALL) vy = MAXFALL;
      if (vy < -MAXFALL) vy = -MAXFALL;
      playerY += vy * dt;

      let landedSeg = null;
      if (vy >= 0) {
        const seg = segAt(floorSegs, playerWX);
        if (seg) {
          const sy = surfYAt(seg, time);
          if (prevY + PR <= sy + 10 && playerY + PR >= sy) {
            playerY = sy - PR;
            vy = 0;
            grounded = "floor";
            landedSeg = seg;
            closeCallBonus();
          }
        }
      } else {
        const seg = segAt(ceilSegs, playerWX);
        if (seg) {
          const sy = surfYAt(seg, time);
          if (prevY - PR >= sy - 10 && playerY - PR <= sy) {
            playerY = sy + PR;
            vy = 0;
            grounded = "ceil";
            landedSeg = seg;
            closeCallBonus();
          }
        }
      }

      // side-on into a block that isn't the one we just landed on
      if (grounded === null || landedSeg) {
        const lists = [floorSegs, ceilSegs];
        for (let li = 0; li < 2; li++) {
          const arr = lists[li];
          for (let i = 0; i < arr.length; i++) {
            const s = arr[i];
            if (s === landedSeg) continue;
            if (s.x1 < playerWX - 60 || s.x0 > playerWX + 60) continue;
            const sy = surfYAt(s, time);
            const r = li === 0
              ? { x: s.x0, y: sy, w: s.x1 - s.x0, h: TH }
              : { x: s.x0, y: sy - TH, w: s.x1 - s.x0, h: TH };
            if (circleRect(playerWX, playerY, PR - 2, r.x, r.y, r.w, r.h)) {
              die("Bonk. Walls are solid. You are not.");
              return;
            }
          }
        }
      }
    }

    trail.push({ x: PX, y: playerY });
    if (trail.length > 46) trail.shift();

    if (grounded !== null && Math.random() < 0.3) {
      particles.push({
        x: PX - 12,
        y: playerY + (grounded === "floor" ? PR : -PR),
        vx: -speed * 0.25, vy: (Math.random() - 0.5) * 40,
        life: 0.3, max: 0.3, color: "rgba(255,255,255,0.5)", size: 2
      });
    }

    // spikes kill rolling and flying alike (fakes don't)
    for (const sp of spikes) {
      if (sp.fake) continue;
      if (Math.abs(sp.wx - playerWX) > 40) continue;
      const r = spikeRect(sp, time);
      if (circleRect(playerWX, playerY, PR - 2, r.x, r.y, r.w, r.h)) {
        die();
        return;
      }
    }

    // lost to the void (missed a landing entirely)
    if (playerY < -60 || playerY > H + 60) {
      die("Lost to the void. It is very dark down there.");
      return;
    }

    // coins
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

  function drawSeg(s, side, t) {
    const sx0 = s.x0 - worldX;
    const sx1 = s.x1 - worldX;
    if (sx1 < -60 || sx0 > W + 60) return;
    const sy = surfYAt(s, t);
    const moving = swayAmp > 5;
    const y = side === "floor" ? sy : sy - TH;
    const w = sx1 - sx0;

    ctx.fillStyle = moving ? "#2b2350" : "#1a1440";
    ctx.strokeStyle = "#0f1320";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(sx0, y, w, TH, 5);
    ctx.fill();
    ctx.stroke();
    // block seams
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 2;
    const startTick = Math.max(sx0 + 22, Math.floor((worldX + 22) / 44) * 44 - worldX);
    ctx.beginPath();
    for (let bx = startTick; bx < sx1 - 6; bx += 44) {
      ctx.moveTo(bx, y + 5);
      ctx.lineTo(bx, y + TH - 5);
    }
    ctx.stroke();
    // neon safe edge (the face you roll on)
    const ey = side === "floor" ? sy : sy;
    ctx.fillStyle = moving ? "#b197fc" : "#f6c445";
    if (side === "floor") ctx.fillRect(sx0 - 2, ey - 3, w + 4, 5);
    else ctx.fillRect(sx0 - 2, ey - 2, w + 4, 5);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    if (side === "floor") ctx.fillRect(sx0 - 2, ey - 3, w + 4, 1.5);
    else ctx.fillRect(sx0 - 2, ey + 1.5, w + 4, 1.5);
  }

  function drawSpike(sp, t) {
    if (sp.wx - worldX < -40 || sp.wx - worldX > W + 40) return;
    const sx = sp.wx - worldX;
    const sy = surfYAt(sp.seg, t);
    const h = 26;
    const yBase = sp.side === "floor" ? sy : sy;
    const yTip = sp.side === "floor" ? sy - h : sy + h;
    ctx.save();
    if (sp.fake) ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(sx - 15, yBase);
    ctx.lineTo(sx + 15, yBase);
    ctx.lineTo(sx, yTip);
    ctx.closePath();
    ctx.fillStyle = sp.fake ? "#868e96" : "#ff6b6b";
    ctx.fill();
    ctx.strokeStyle = "#0f1320";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.stroke();
    if (!sp.fake) {
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.arc(sx, sp.side === "floor" ? sy - 7 : sy + 7, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.globalAlpha = 1;
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.fillText("?", sx, sp.side === "floor" ? sy - h - 8 : sy + h + 16);
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

    for (const s of floorSegs) drawSeg(s, "floor", time);
    for (const s of ceilSegs) drawSeg(s, "ceil", time);
    for (const sp of spikes) drawSpike(sp, time);

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
      const roll = grounded !== null ? 1 + Math.sin(time * 30) * 0.04 : 1;
      ctx.save();
      ctx.translate(PX, playerY + (mode === "dead" ? (1 - squash) * 8 : 0));
      ctx.scale((1 + flat) * roll, (1 - flat) / roll);
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
      ctx.fillText("Roll the platforms. Land on the other side.", W / 2, H / 2 + 26);
      ctx.fillText("Red spikes kill. Ghost spikes (?) are fake.", W / 2, H / 2 + 50);
      ctx.fillStyle = "#69db7c";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("— tap anything to roll —", W / 2, H / 2 + 82);
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
    message.textContent = "Ride the platforms. Flip before the edge!";
    showBanner("ROLL · TAP TO FLIP · LAND IT");
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
