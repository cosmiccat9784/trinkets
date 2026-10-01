function startMagnetMayhem() {
  openGame(
    "Magnet Mayhem",
    "Arcade",
    `
      <div class="game-layout">
        <div class="game-topline">
          <span class="game-stat" id="mmP1">P1 ❤❤❤ · ★0</span>
          <span class="game-stat" id="mmTime">60</span>
          <span class="game-stat" id="mmRound">Round 1 · First to 5</span>
          <span class="game-stat" id="mmP2">P2 ❤❤❤ · ★0</span>
        </div>
        <div class="tag-row" role="group" aria-label="Opponent">
          <span class="tag-label">Opponent</span>
          <button class="game-action tag-pick on" id="mmHuman" type="button" title="Two humans, one keyboard: P1 WASD, P2 Arrows">2 Players</button>
          <button class="game-action tag-pick" id="mmBot" type="button" title="Practice against a bot (P1 is you)">vs Bot</button>
        </div>
        <canvas class="mayhem-canvas" id="mmCanvas" width="720" height="480"></canvas>
        <p class="game-message" id="mmMsg">P1: WASD · P2: Arrow keys. Magnets pull together, then CLACK apart — shove your rival into spikes, bumpers and holes!</p>
        <div class="game-actions">
          <button class="game-action one-press" id="mmStart" type="button">START — BE THE STRONGER MAGNET</button>
          <button class="game-action" id="mmRestart" type="button">Restart match</button>
        </div>
      </div>
    `
  );

  const canvas = document.querySelector("#mmCanvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const PR = 16;

  const p1El = document.querySelector("#mmP1");
  const p2El = document.querySelector("#mmP2");
  const timeEl = document.querySelector("#mmTime");
  const roundEl = document.querySelector("#mmRound");
  const message = document.querySelector("#mmMsg");
  const humanBtn = document.querySelector("#mmHuman");
  const botBtn = document.querySelector("#mmBot");

  // ---------- arena ----------
  const AX0 = 60;
  const AY0 = 78;
  const AX1 = 660;
  const AY1 = 402;
  const GAP_CX = 360;
  const GAP_W = 96;
  const GAP_X0 = GAP_CX - GAP_W / 2;
  const GAP_X1 = GAP_CX + GAP_W / 2;
  const ROUND_TIME = 60;
  const WIN_SCORE = 5;

  const holes = [
    { x: 260, y: 140, r: 19 },
    { x: 460, y: 340, r: 19 }
  ];
  const bumpers = [
    { x: 360, y: 240, r: 22, pulse: 0 },
    { x: 140, y: 140, r: 15, pulse: 0 },
    { x: 580, y: 340, r: 15, pulse: 0 }
  ];
  const spikes = [
    { x: 360, y: 140, r: 15 },
    { x: 360, y: 340, r: 15 },
    { x: 260, y: 340, r: 15 },
    { x: 460, y: 140, r: 15 }
  ];

  const QUIPS = [
    "MAGNET HAS LEFT THE CHAT.",
    "CLACKED clean out of existence.",
    "Sent to the fridge door in the sky.",
    "Demagnetized. Embarrassing.",
    "Attracted to the void. Fatal."
  ];

  // ---------- state ----------
  let vsBot = false;
  let phase = "ready"; // ready | playing | roundEnd | matchEnd
  let round = 1;
  let wins = [0, 0];
  let timeLeft = ROUND_TIME;
  let time = 0;
  let clackCd = 0;
  let shake = 0;
  let flash = 0;
  let particles = [];
  let popups = [];
  let confetti = [];
  let roundEndT = 0;
  let roundWinner = -1;
  let roundReason = "";
  let matchWinner = -1;
  let banner = null;
  let lastBlink = 0;

  const keys = new Set();
  let touch = { active: false, x: 0, y: 0 };

  function makePlayer(name, color, dark, x, y) {
    return {
      name, color, dark,
      x, y, vx: 0, vy: 0,
      hearts: 3, alive: true,
      inv: 0, bumpCd: 0,
      falling: -1, fallT: 0,
      squash: 0, mood: 0, moodKind: "happy",
      faceX: 0, faceY: 0,
      spawnX: x, spawnY: y
    };
  }
  let players = [
    makePlayer("P1", "#43c6ac", "#1f7a6b", 150, 240),
    makePlayer("P2", "#ff8fab", "#b23a6b", 570, 240)
  ];

  humanBtn.addEventListener("click", () => {
    vsBot = false;
    humanBtn.classList.add("on");
    botBtn.classList.remove("on");
    message.textContent = "P1: WASD · P2: Arrow keys. First to 5 rounds takes the match!";
  });
  botBtn.addEventListener("click", () => {
    vsBot = true;
    botBtn.classList.add("on");
    humanBtn.classList.remove("on");
    message.textContent = "You are P1 (WASD / drag). The bot is P2. Good luck, little magnet.";
  });

  // ---------- audio (tiny synth, no assets) ----------
  let actx = null;
  function ensureAudio() {
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx && actx.state === "suspended") actx.resume();
    } catch (err) {}
  }
  function tone(f0, f1, dur, type, vol) {
    if (!actx) return;
    try {
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = type || "square";
      o.frequency.setValueAtTime(Math.max(30, f0), actx.currentTime);
      o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), actx.currentTime + dur);
      g.gain.setValueAtTime(vol || 0.12, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
      o.connect(g);
      g.connect(actx.destination);
      o.start();
      o.stop(actx.currentTime + dur + 0.02);
    } catch (err) {}
  }
  function sfxClack(power) {
    tone(2100, 700, 0.07, "square", 0.10);
    setTimeout(() => tone(1500, 500, 0.08, "square", 0.08 * (power || 1)), 45);
  }
  function sfxBoing() { tone(180, 560, 0.18, "sine", 0.14); }
  function sfxOuch() { tone(330, 110, 0.22, "sawtooth", 0.12); }
  function sfxHole() { tone(520, 70, 0.5, "sine", 0.14); }
  function sfxWall() { tone(220, 140, 0.08, "triangle", 0.08); }
  function sfxWin() {
    tone(523, 523, 0.12, "square", 0.10);
    setTimeout(() => tone(659, 659, 0.12, "square", 0.10), 120);
    setTimeout(() => tone(784, 784, 0.2, "square", 0.12), 240);
  }

  // ---------- helpers ----------
  function heartsStr(n) {
    return "❤".repeat(Math.max(0, n)) + "🤍".repeat(Math.max(0, 3 - n));
  }
  function burst(x, y, n, color, spread) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * (spread || 220);
      particles.push({
        x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0.5 + Math.random() * 0.3, max: 0.8,
        color, size: 2 + Math.random() * 3
      });
    }
  }
  function ring(x, y, color) {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      particles.push({ x, y, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190, life: 0.4, max: 0.4, color, size: 3 });
    }
  }
  function popup(x, y, text, color) {
    popups.push({ x, y, text, color, life: 1.0, max: 1.0 });
  }
  function poof(x, y, color) {
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 220;
      confetti.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120,
        life: 1.4 + Math.random(), max: 2,
        color: ["#ff6b6b", "#f6c445", "#43c6ac", "#74c0fc", "#b197fc", color][i % 6],
        size: 3 + Math.random() * 3, rot: Math.random() * 6
      });
    }
  }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  let hudT = 0;
  function syncHudThrottled() {
    hudT += 1;
    if (hudT % 8 === 0) syncHud();
  }

  function syncHud() {
    p1El.textContent = `P1 ${heartsStr(players[0].hearts)} · ★${wins[0]}`;
    p2El.textContent = `P2 ${heartsStr(players[1].hearts)} · ★${wins[1]}`;
    timeEl.textContent = `${Math.ceil(Math.max(0, timeLeft))}s`;
    roundEl.textContent = `Round ${round} · First to ${WIN_SCORE}`;
    setSnapshot({
      mode: phase === "playing" ? "playing" : phase === "ready" ? "ready" : "ended",
      game: "Magnet Mayhem",
      round, p1wins: wins[0], p2wins: wins[1],
      p1hearts: players[0].hearts, p2hearts: players[1].hearts,
      time: Math.ceil(Math.max(0, timeLeft)),
      score: wins[0] * 100 + wins[1]
    });
  }

  function resetPositions() {
    players[0].x = 150; players[0].y = 240;
    players[1].x = 570; players[1].y = 240;
    for (const p of players) {
      p.vx = 0; p.vy = 0;
      p.hearts = 3; p.alive = true;
      p.inv = 0; p.bumpCd = 0;
      p.falling = -1; p.fallT = 0;
      p.squash = 0; p.mood = 0; p.moodKind = "happy";
    }
    particles = [];
    popups = [];
    timeLeft = ROUND_TIME;
    clackCd = 0;
    shake = 0;
    flash = 0;
  }

  function startMatch() {
    ensureAudio();
    wins = [0, 0];
    round = 1;
    matchWinner = -1;
    resetPositions();
    phase = "playing";
    message.textContent = "Push. Bounce. Dodge. Survive. First to 5 rounds!";
    banner = { text: `ROUND 1 · ${vsBot ? "YOU vs BOT" : "P1 vs P2"}`, t: 1.8 };
    syncHud();
  }

  function eliminate(idx, reason) {
    if (phase !== "playing" || !players[idx].alive) return;
    const p = players[idx];
    p.alive = false;
    const other = idx === 0 ? 1 : 0;
    roundWinner = other;
    roundReason = reason;
    wins[other] += 1;
    roundEndT = 0;
    shake = Math.max(shake, 13);
    flash = 0.3;
    poof(p.x, p.y, p.color);
    burst(p.x, p.y, 18, "#fff8ea", 260);
    popup(p.x, p.y - 30, QUIPS[Math.floor(Math.random() * QUIPS.length)], "#ff6b6b");
    const wname = other === 0 ? (vsBot ? "YOU (P1)" : "P1") : (vsBot ? "BOT (P2)" : "P2");
    if (wins[other] >= WIN_SCORE) {
      phase = "matchEnd";
      matchWinner = other;
      sfxWin();
      poof(players[other].x, players[other].y, "#f6c445");
      message.textContent = `${wname} wins the match ${wins[other]}–${wins[idx]}! I'm the stronger magnet. 🧲😎`;
      try {
        recordScore("mayhem", wins[other], "high");
      } catch (err) {}
    } else {
      phase = "roundEnd";
      const how = reason === "hole" ? "swallowed by a hole"
        : reason === "out" ? "knocked out of the arena"
        : reason === "spikes" ? "shredded by spikes"
        : reason === "time" ? "ahead when time ran out" : "eliminated";
      message.textContent = `${wname} takes round ${round} — ${players[idx].name} ${how}! ${QUIPS[0]}`;
    }
    syncHud();
  }

  function botDir(out) {
    const me = players[1];
    const foe = players[0];
    let dx = foe.x - me.x;
    let dy = foe.y - me.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    dx /= d; dy /= d;
    // avoid hazards
    let ax = 0, ay = 0;
    for (const h of holes) {
      const hx = me.x - h.x, hy = me.y - h.y;
      const hd = Math.max(1, Math.hypot(hx, hy));
      if (hd < 120) { const w = (1 - hd / 120) * 1.6; ax += (hx / hd) * w; ay += (hy / hd) * w; }
    }
    for (const s of spikes) {
      const hx = me.x - s.x, hy = me.y - s.y;
      const hd = Math.max(1, Math.hypot(hx, hy));
      if (hd < 100) { const w = (1 - hd / 100) * 1.1; ax += (hx / hd) * w; ay += (hy / hd) * w; }
    }
    // stay inside: steer away from edges (but allow shoves near gaps)
    const m = 70;
    if (me.x < AX0 + m) ax += 1.2;
    if (me.x > AX1 - m) ax -= 1.2;
    if (me.y < AY0 + m) ay += 1.0;
    if (me.y > AY1 - m) ay -= 1.0;
    // wobble so it feels alive + aggression when behind
    const behind = wins[0] > wins[1] ? 0.35 : 0;
    const wob = Math.sin(time * 2.3) * 0.35;
    let fx = dx * (1 + behind) + ax - dy * wob;
    let fy = dy * (1 + behind) + ay + dx * wob;
    const fm = Math.max(1, Math.hypot(fx, fy));
    out.x = fx / fm; out.y = fy / fm;
  }

  const _bot = { x: 0, y: 0 };

  function update(dt) {
    time += dt;
    if (shake > 0) shake = Math.max(0, shake - dt * 30);
    if (flash > 0) flash -= dt;
    if (clackCd > 0) clackCd -= dt;
    for (const b of bumpers) if (b.pulse > 0) b.pulse -= dt;

    for (const p of particles) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.94; p.vy *= 0.94;
      p.life -= dt;
    }
    particles = particles.filter((p) => p.life > 0);
    for (const p of popups) { p.y -= 42 * dt; p.life -= dt; }
    popups = popups.filter((p) => p.life > 0);
    for (const c of confetti) {
      c.x += c.vx * dt; c.y += c.vy * dt;
      c.vy += 520 * dt; c.rot += dt * 6; c.life -= dt;
    }
    confetti = confetti.filter((c) => c.life > 0);
    if (banner) { banner.t -= dt; if (banner.t <= 0) banner = null; }
    for (const p of players) {
      if (p.squash > 0) p.squash = Math.max(0, p.squash - dt * 3);
      if (p.inv > 0) p.inv -= dt;
      if (p.bumpCd > 0) p.bumpCd -= dt;
      if (p.mood > 0) { p.mood -= dt; if (p.mood <= 0) p.moodKind = "happy"; }
    }

    if (phase === "ready") {
      // idle bob behind menu
      players[0].x = 150 + Math.sin(time * 1.4) * 8;
      players[1].x = 570 + Math.cos(time * 1.4) * 8;
      return;
    }
    if (phase === "roundEnd") {
      roundEndT += dt;
      if (roundEndT > 2.6) {
        round += 1;
        resetPositions();
        phase = "playing";
        banner = { text: `ROUND ${round}`, t: 1.6 };
        message.textContent = `Round ${round} — ${wins[0]}–${wins[1]}. Push them into something rude.`;
        syncHud();
      }
      // let particles settle
      for (const p of players) {
        if (!p.alive) continue;
        p.vx *= 0.95; p.vy *= 0.95;
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
      return;
    }
    if (phase === "matchEnd") {
      // victory wiggle for winner
      const w = players[matchWinner];
      if (w) {
        w.x += Math.sin(time * 6) * 20 * dt;
        w.y += Math.cos(time * 5) * 14 * dt;
        if (Math.random() < 0.12) burst(w.x, w.y - 20, 4, "#f6c445", 200);
      }
      return;
    }
    if (phase !== "playing") return;

    // timer
    timeLeft -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0;
      const h0 = players[0].alive ? players[0].hearts : -1;
      const h1 = players[1].alive ? players[1].hearts : -1;
      if (h0 === h1) {
        // draw: no point awarded, replay next round
        phase = "roundEnd";
        roundWinner = -1;
        roundReason = "time-draw";
        roundEndT = 1.4;
        message.textContent = `Time! ${h0}–${h1} hearts — nobody blinks. Replay!`;
        syncHud();
      } else {
        eliminate(h0 < h1 ? 0 : 1, "time");
      }
      return;
    }

    // ---------- input dirs ----------
    let d1 = { x: 0, y: 0 };
    if (keys.has("w")) d1.y -= 1;
    if (keys.has("s")) d1.y += 1;
    if (keys.has("a")) d1.x -= 1;
    if (keys.has("d")) d1.x += 1;
    if (touch.active && players[0].alive && players[0].falling < 0) {
      const dx = touch.x - players[0].x, dy = touch.y - players[0].y;
      if (Math.hypot(dx, dy) > 16) {
        const m = Math.hypot(dx, dy);
        d1 = { x: dx / m, y: dy / m };
      }
    }
    let d2 = { x: 0, y: 0 };
    if (vsBot) {
      botDir(_bot);
      d2 = { x: _bot.x, y: _bot.y };
    } else {
      if (keys.has("arrowup")) d2.y -= 1;
      if (keys.has("arrowdown")) d2.y += 1;
      if (keys.has("arrowleft")) d2.x -= 1;
      if (keys.has("arrowright")) d2.x += 1;
    }

    const dirs = [d1, d2];
    const BASE = 235;

    for (let i = 0; i < 2; i++) {
      const p = players[i];
      if (!p.alive || p.falling >= 0) continue;
      let dir = dirs[i];
      const m = Math.hypot(dir.x, dir.y);
      if (m > 1) { dir = { x: dir.x / m, y: dir.y / m }; }
      const slide = 11;
      const k = Math.min(1, dt * slide);
      p.vx += (dir.x * BASE - p.vx) * k;
      p.vy += (dir.y * BASE - p.vy) * k;
    }

    // ---------- magnet force: pull at range, CLACK up close ----------
    const a = players[0], b = players[1];
    if (a.alive && b.alive && a.falling < 0 && b.falling < 0) {
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.max(1, Math.hypot(dx, dy));
      const nx = dx / d, ny = dy / d;
      if (d < 240) {
        const F = 330 * (1 - d / 240);
        a.vx += nx * F * dt; a.vy += ny * F * dt;
        b.vx -= nx * F * dt; b.vy -= ny * F * dt;
      }
      if (d < 120) {
        const R = 1150 * (1 - d / 120);
        a.vx -= nx * R * dt; a.vy -= ny * R * dt;
        b.vx += nx * R * dt; b.vy += ny * R * dt;
      }
      // cap speed
      for (const p of [a, b]) {
        const sp = Math.hypot(p.vx, p.vy);
        if (sp > 430) { p.vx = (p.vx / sp) * 430; p.vy = (p.vy / sp) * 430; }
      }
    }

    // integrate
    for (const p of players) {
      if (!p.alive) continue;
      if (p.falling >= 0) {
        p.fallT += dt;
        if (p.fallT > 0.65) {
          p.falling = -1;
          eliminate(players.indexOf(p), "hole");
          return;
        }
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // face look
      const sp = Math.hypot(p.vx, p.vy);
      if (sp > 30) { p.faceX = p.vx / sp; p.faceY = p.vy / sp; }
    }

    // ---------- player vs player CLACK ----------
    if (a.alive && b.alive && a.falling < 0 && b.falling < 0) {
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.max(0.01, Math.hypot(dx, dy));
      const min = PR * 2;
      if (d < min) {
        const nx = dx / d, ny = dy / d;
        const overlap = min - d;
        a.x -= nx * overlap * 0.5; a.y -= ny * overlap * 0.5;
        b.x += nx * overlap * 0.5; b.y += ny * overlap * 0.5;
        const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
        const vn = rvx * nx + rvy * ny;
        if (vn < 0) {
          const j = -(1 + 1.12) * vn / 2;
          a.vx -= j * nx; a.vy -= j * ny;
          b.vx += j * nx; b.vy += j * ny;
        }
        const impact = Math.abs(vn);
        if (clackCd <= 0 && (impact > 90 || d < min - 2)) {
          clackCd = 0.35;
          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          const power = Math.min(1.4, 0.7 + impact / 300);
          sfxClack(power);
          popup(mx, my - 30, "CLACK!", "#f6c445");
          burst(mx, my, 12, "#fff8ea", 260);
          burst(mx, my, 6, "#f6c445", 180);
          shake = Math.max(shake, 5 + impact / 60);
          a.squash = 1; b.squash = 1;
        }
      }
    }

    // ---------- walls / gaps / out ----------
    for (let i = 0; i < 2; i++) {
      const p = players[i];
      if (!p.alive || p.falling >= 0) continue;
      const inGapX = p.x > GAP_X0 + 8 && p.x < GAP_X1 - 8;
      // left / right always bounce
      if (p.x - PR < AX0) { p.x = AX0 + PR; if (p.vx < 0) { if (Math.abs(p.vx) > 200) { sfxWall(); burst(p.x - 10, p.y, 4, "#fff", 120); } p.vx = Math.abs(p.vx) * 0.86; p.squash = Math.max(p.squash, 0.5); } }
      if (p.x + PR > AX1) { p.x = AX1 - PR; if (p.vx > 0) { if (Math.abs(p.vx) > 200) { sfxWall(); burst(p.x + 10, p.y, 4, "#fff", 120); } p.vx = -Math.abs(p.vx) * 0.86; p.squash = Math.max(p.squash, 0.5); } }
      // top
      if (p.y - PR < AY0) {
        if (inGapX) {
          if (p.y < AY0 - 22) { eliminate(i, "out"); return; }
        } else {
          p.y = AY0 + PR;
          if (p.vy < 0) { if (Math.abs(p.vy) > 200) { sfxWall(); burst(p.x, p.y - 10, 4, "#fff", 120); } p.vy = Math.abs(p.vy) * 0.86; p.squash = Math.max(p.squash, 0.5); }
        }
      }
      // bottom
      if (p.y + PR > AY1) {
        if (inGapX) {
          if (p.y > AY1 + 22) { eliminate(i, "out"); return; }
        } else {
          p.y = AY1 - PR;
          if (p.vy > 0) { if (Math.abs(p.vy) > 200) { sfxWall(); burst(p.x, p.y + 10, 4, "#fff", 120); } p.vy = -Math.abs(p.vy) * 0.86; p.squash = Math.max(p.squash, 0.5); }
        }
      }
      // safety net: fully escaped somehow
      if (p.x < AX0 - 30 || p.x > AX1 + 30 || p.y < AY0 - 34 || p.y > AY1 + 34) {
        eliminate(i, "out");
        return;
      }
    }

    // ---------- bumpers ----------
    for (const bp of bumpers) {
      for (let i = 0; i < 2; i++) {
        const p = players[i];
        if (!p.alive || p.falling >= 0 || p.bumpCd > 0) continue;
        const dx = p.x - bp.x, dy = p.y - bp.y;
        const d = Math.max(0.01, Math.hypot(dx, dy));
        if (d < PR + bp.r) {
          const nx = dx / d, ny = dy / d;
          p.x = bp.x + nx * (PR + bp.r + 1);
          p.y = bp.y + ny * (PR + bp.r + 1);
          const keep = 0.3;
          const tx = -ny, ty = nx;
          const tv = p.vx * tx + p.vy * ty;
          p.vx = nx * 640 + tx * tv * keep;
          p.vy = ny * 640 + ty * tv * keep;
          p.bumpCd = 0.3;
          p.squash = 1;
          bp.pulse = 0.3;
          sfxBoing();
          ring(bp.x, bp.y, "#f6c445");
          popup(bp.x, bp.y - bp.r - 18, "BOING!", "#74c0fc");
          shake = Math.max(shake, 5);
        }
      }
    }

    // ---------- spikes ----------
    for (const s of spikes) {
      for (let i = 0; i < 2; i++) {
        const p = players[i];
        if (!p.alive || p.falling >= 0 || p.inv > 0) continue;
        if (Math.hypot(p.x - s.x, p.y - s.y) < PR + s.r - 5) {
          p.hearts -= 1;
          p.inv = 1.5;
          p.mood = 1.2; p.moodKind = "ouch";
          const dx = p.x - s.x, dy = p.y - s.y;
          const d = Math.max(1, Math.hypot(dx, dy));
          p.vx = (dx / d) * 430;
          p.vy = (dy / d) * 430;
          p.squash = 1;
          sfxOuch();
          burst(p.x, p.y, 12, "#ff6b6b", 240);
          popup(p.x, p.y - 30, "-1 ❤", "#ff6b6b");
          shake = Math.max(shake, 9);
          flash = 0.18;
          syncHud();
          if (p.hearts <= 0) {
            eliminate(i, "spikes");
            return;
          } else {
            message.textContent = `${p.name} kissed a spike! ${heartsStr(p.hearts)} left.`;
          }
        }
      }
    }

    // ---------- holes ----------
    for (const h of holes) {
      for (let i = 0; i < 2; i++) {
        const p = players[i];
        if (!p.alive || p.falling >= 0) continue;
        if (Math.hypot(p.x - h.x, p.y - h.y) < h.r - 1) {
          p.falling = i;
          p.fallT = 0;
          p.vx = 0; p.vy = 0;
          sfxHole();
          popup(h.x, h.y - 30, "UH OH…", "#b197fc");
          shake = Math.max(shake, 4);
        }
      }
    }

    syncHudThrottled();
  }

  // ---------- draw ----------
  function drawMagnet(p) {
    const squash = p.squash;
    const sx = 1 + squash * 0.22;
    const sy = 1 - squash * 0.22;
    let alpha = 1;
    if (p.inv > 0 && p.alive && p.falling < 0) alpha = 0.55 + Math.sin(time * 18) * 0.3;
    let scale = 1;
    if (p.falling >= 0) {
      const f = Math.min(1, p.fallT / 0.65);
      scale = 1 - f * 0.85;
      alpha = 1 - f * 0.6;
    }
    ctx.save();
    ctx.globalAlpha = Math.max(0.05, alpha);
    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + PR - 1, PR * 0.95 * scale, PR * 0.36 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(p.x, p.y);
    const tilt = Math.max(-0.35, Math.min(0.35, p.vx * 0.0009));
    ctx.rotate(tilt);
    ctx.scale(sx * scale, sy * scale);
    // body
    ctx.fillStyle = p.color;
    ctx.strokeStyle = "#10151d";
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-17, -16, 34, 24, 9);
    else ctx.rect(-17, -16, 34, 24);
    ctx.fill();
    ctx.stroke();
    // poles
    ctx.fillStyle = "#fffdf6";
    ctx.strokeStyle = "#10151d";
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(-17, 4, 14, 13, 3); }
    else ctx.rect(-17, 4, 14, 13);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(3, 4, 14, 13, 3); }
    else ctx.rect(3, 4, 14, 13);
    ctx.fill(); ctx.stroke();
    // pole tips
    ctx.fillStyle = "#e64949";
    ctx.fillRect(-15, 12, 10, 3);
    ctx.fillStyle = "#4f8fcf";
    ctx.fillRect(5, 12, 10, 3);
    // shine
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.beginPath();
    ctx.arc(-8, -9, 4, 0, Math.PI * 2);
    ctx.fill();
    // face
    const lx = (p.faceX || 0) * 2, ly = (p.faceY || 0) * 2;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-6 + lx, -5 + ly, 4.4, 0, Math.PI * 2);
    ctx.arc(6 + lx, -5 + ly, 4.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#10151d";
    if (p.moodKind === "ouch") {
      // X eyes
      ctx.strokeStyle = "#10151d";
      ctx.lineWidth = 2;
      for (const ex of [-6, 6]) {
        ctx.beginPath();
        ctx.moveTo(ex + lx - 2.5, -5 + ly - 2.5);
        ctx.lineTo(ex + lx + 2.5, -5 + ly + 2.5);
        ctx.moveTo(ex + lx + 2.5, -5 + ly - 2.5);
        ctx.lineTo(ex + lx - 2.5, -5 + ly + 2.5);
        ctx.stroke();
      }
    } else {
      ctx.beginPath();
      ctx.arc(-6 + lx * 1.6, -5 + ly * 1.6, 2, 0, Math.PI * 2);
      ctx.arc(6 + lx * 1.6, -5 + ly * 1.6, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // mouth
    ctx.strokeStyle = "#10151d";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (p.moodKind === "ouch") {
      ctx.arc(0, 8, 3.5, Math.PI, 0);
    } else {
      ctx.arc(0, 2, 4.5, 0.25 * Math.PI, 0.75 * Math.PI);
    }
    ctx.stroke();
    // blush
    ctx.fillStyle = "rgba(255,120,150,0.5)";
    ctx.beginPath();
    ctx.arc(-11, 0, 2.4, 0, Math.PI * 2);
    ctx.arc(11, 0, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // name + hearts
    if (p.alive && p.falling < 0) {
      ctx.save();
      ctx.textAlign = "center";
      ctx.font = "bold 12px sans-serif";
      ctx.fillStyle = "#27313f";
      ctx.fillText(p.name, p.x, p.y - PR - 20);
      ctx.font = "11px sans-serif";
      ctx.fillText(heartsStr(p.hearts), p.x, p.y - PR - 8);
      ctx.restore();
    }
  }

  function drawSpike(s) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(0, s.r - 2, s.r * 0.9, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // base
    ctx.fillStyle = "#3b2d2d";
    ctx.strokeStyle = "#10151d";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, s.r + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 3 spikes
    ctx.fillStyle = "#ff6b6b";
    ctx.strokeStyle = "#10151d";
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i - 1) * 0.7;
      const tx = Math.cos(a) * (s.r + 2);
      const ty = Math.sin(a) * (s.r + 2);
      const bx1 = Math.cos(a + 0.42) * s.r * 0.55;
      const by1 = Math.sin(a + 0.42) * s.r * 0.55;
      const bx2 = Math.cos(a - 0.42) * s.r * 0.55;
      const by2 = Math.sin(a - 0.42) * s.r * 0.55;
      ctx.beginPath();
      ctx.moveTo(bx1, by1);
      ctx.lineTo(tx, ty);
      ctx.lineTo(bx2, by2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // angry eyes
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-4, 1, 3, 0, Math.PI * 2);
    ctx.arc(4, 1, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#10151d";
    ctx.beginPath();
    ctx.arc(-4, 1.8, 1.4, 0, Math.PI * 2);
    ctx.arc(4, 1.8, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBumper(bp) {
    const pulse = bp.pulse > 0 ? 1 + bp.pulse * 1.2 : 1 + Math.sin(time * 3 + bp.x) * 0.04;
    ctx.save();
    ctx.translate(bp.x, bp.y);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(0, bp.r - 1, bp.r * 0.95, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    if (bp.pulse > 0) {
      ctx.strokeStyle = `rgba(246,196,69,${Math.max(0, bp.pulse * 2)})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, (bp.r + 8) * pulse, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.scale(pulse, pulse);
    ctx.fillStyle = "#ff8fab";
    ctx.strokeStyle = "#10151d";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, bp.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#f6c445";
    ctx.beginPath();
    ctx.arc(0, 0, bp.r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#10151d";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = "#10151d";
    ctx.beginPath();
    ctx.arc(-4, -2, 2, 0, Math.PI * 2);
    ctx.arc(4, -2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#10151d";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0, 2, 5, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.arc(-bp.r * 0.35, -bp.r * 0.4, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawHole(h) {
    ctx.save();
    const wob = 1 + Math.sin(time * 2 + h.x) * 0.03;
    ctx.translate(h.x, h.y);
    ctx.scale(wob, wob);
    ctx.fillStyle = "#b197fc";
    ctx.beginPath();
    ctx.arc(0, 0, h.r + 5, 0, Math.PI * 2);
    ctx.fill();
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, h.r);
    g.addColorStop(0, "#000000");
    g.addColorStop(0.75, "#0c0a18");
    g.addColorStop(1, "#2b2350");
    ctx.fillStyle = g;
    ctx.strokeStyle = "#10151d";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, h.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(177,151,252,0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, h.r - 6, time * 0.8, time * 0.8 + Math.PI * 1.3);
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // table
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#2b3a67");
    sky.addColorStop(0.5, "#3b2d7a");
    sky.addColorStop(1, "#232c4e");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

    // dots
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    for (let gx = 24; gx < W; gx += 44) {
      for (let gy = 24; gy < H; gy += 44) {
        ctx.fillRect(gx, gy, 2.5, 2.5);
      }
    }

    // arena floor
    ctx.fillStyle = "#fff8ea";
    ctx.strokeStyle = "#10151d";
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(AX0, AY0, AX1 - AX0, AY1 - AY0, 14);
    else ctx.rect(AX0, AY0, AX1 - AX0, AY1 - AY0);
    ctx.fill();
    ctx.stroke();
    // floor grid
    ctx.strokeStyle = "rgba(25,33,43,0.07)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let gx = AX0 + 40; gx < AX1; gx += 40) { ctx.moveTo(gx, AY0 + 6); ctx.lineTo(gx, AY1 - 6); }
    for (let gy = AY0 + 40; gy < AY1; gy += 40) { ctx.moveTo(AX0 + 6, gy); ctx.lineTo(AX1 - 6, gy); }
    ctx.stroke();

    for (const h of holes) drawHole(h);
    for (const s of spikes) drawSpike(s);
    for (const bp of bumpers) drawBumper(bp);

    // walls (draw over floor edges, with gaps top/bottom)
    const WT = 12;
    ctx.fillStyle = "#27313f";
    ctx.strokeStyle = "#10151d";
    ctx.lineWidth = 3;
    function wallRect(x, y, w, h) {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, 6);
      else ctx.rect(x, y, w, h);
      ctx.fill();
      ctx.stroke();
    }
    // left / right full
    wallRect(AX0 - WT, AY0 - WT, WT, (AY1 - AY0) + WT * 2);
    wallRect(AX1, AY0 - WT, WT, (AY1 - AY0) + WT * 2);
    // top split by gap
    wallRect(AX0 - WT, AY0 - WT, (GAP_X0 - (AX0 - WT)), WT);
    wallRect(GAP_X1, AY0 - WT, ((AX1 + WT) - GAP_X1), WT);
    // bottom split by gap
    wallRect(AX0 - WT, AY1, (GAP_X0 - (AX0 - WT)), WT);
    wallRect(GAP_X1, AY1, ((AX1 + WT) - GAP_X1), WT);
    // gold trim on inner edge
    ctx.fillStyle = "#f6c445";
    ctx.fillRect(AX0, AY0 - 3, GAP_X0 - AX0, 4);
    ctx.fillRect(GAP_X1, AY0 - 3, AX1 - GAP_X1, 4);
    ctx.fillRect(AX0, AY1 - 1, GAP_X0 - AX0, 4);
    ctx.fillRect(GAP_X1, AY1 - 1, AX1 - GAP_X1, 4);
    ctx.fillRect(AX0 - 3, AY0, 4, AY1 - AY0);
    ctx.fillRect(AX1 - 1, AY0, 4, AY1 - AY0);
    // gap danger markers
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "bold 13px sans-serif";
    ctx.fillStyle = "#ff6b6b";
    const blink = 0.6 + Math.sin(time * 5) * 0.4;
    ctx.globalAlpha = blink;
    ctx.fillText("▼ OUT ▼", GAP_CX, AY0 - 16);
    ctx.fillText("▲ OUT ▲", GAP_CX, AY1 + 26);
    ctx.restore();

    // magnet link line when pulling
    if (phase === "playing" && players[0].alive && players[1].alive) {
      const d = dist(players[0], players[1]);
      if (d < 240) {
        ctx.save();
        ctx.globalAlpha = 0.25 * (1 - d / 240) + 0.08;
        ctx.strokeStyle = d < 120 ? "#ff6b6b" : "#74c0fc";
        ctx.lineWidth = d < 120 ? 4 : 2;
        ctx.setLineDash([8, 8]);
        ctx.lineDashOffset = -time * 40;
        ctx.beginPath();
        ctx.moveTo(players[0].x, players[0].y);
        ctx.lineTo(players[1].x, players[1].y);
        ctx.stroke();
        ctx.restore();
      }
    }

    for (const p of players) {
      if (!p.alive && phase !== "roundEnd" && phase !== "matchEnd") continue;
      if (!p.alive) continue;
      drawMagnet(p);
    }

    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const c of confetti) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.globalAlpha = Math.max(0, Math.min(1, c.life));
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.6);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "center";
    for (const p of popups) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.font = "bold 22px sans-serif";
      ctx.lineWidth = 5;
      ctx.strokeStyle = "rgba(16,21,29,0.9)";
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;

    // timer bar
    const bw = 220;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(W / 2 - bw / 2, 12, bw, 12, 6);
    else ctx.rect(W / 2 - bw / 2, 12, bw, 12);
    ctx.fill();
    const frac = Math.max(0, timeLeft / ROUND_TIME);
    ctx.fillStyle = frac > 0.5 ? "#43c6ac" : frac > 0.25 ? "#f6c445" : "#ff6b6b";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(W / 2 - bw / 2, 12, bw * frac, 12, 6);
    else ctx.rect(W / 2 - bw / 2, 12, bw * frac, 12);
    ctx.fill();

    if (banner) {
      ctx.font = "bold 24px sans-serif";
      const tw = ctx.measureText(banner.text).width + 48;
      ctx.fillStyle = "rgba(12,10,24,0.85)";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(W / 2 - tw / 2, 44, tw, 42, 12);
      else ctx.rect(W / 2 - tw / 2, 44, tw, 42);
      ctx.fill();
      ctx.fillStyle = "#f6c445";
      ctx.textBaseline = "middle";
      ctx.fillText(banner.text, W / 2, 66);
      ctx.textBaseline = "alphabetic";
    }

    // overlays
    if (phase === "ready") {
      ctx.fillStyle = "rgba(10,10,24,0.66)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff8ea";
      ctx.font = "bold 52px sans-serif";
      ctx.fillText("MAGNET MAYHEM", W / 2, H / 2 - 72);
      ctx.font = "bold 18px sans-serif";
      ctx.fillStyle = "#f6c445";
      ctx.fillText("Push. Bounce. Dodge. Survive.", W / 2, H / 2 - 36);
      ctx.fillStyle = "#fff8ea";
      ctx.font = "15px sans-serif";
      ctx.fillText(vsBot ? "YOU (P1): WASD or drag · BOT is P2" : "P1: WASD · P2: Arrow keys", W / 2, H / 2 - 8);
      ctx.fillText("3 ❤ each · spikes hurt · holes & gaps eliminate · first to ★5", W / 2, H / 2 + 16);
      ctx.fillText("Close magnets PULL, then CLACK apart. Use it!", W / 2, H / 2 + 40);
      ctx.fillStyle = "#69db7c";
      ctx.font = "bold 17px sans-serif";
      ctx.fillText("— press START —", W / 2, H / 2 + 70);
    }
    if (phase === "roundEnd") {
      ctx.fillStyle = "rgba(10,8,16,0.45)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.fillStyle = "#f6c445";
      ctx.font = "bold 40px sans-serif";
      const wname = roundWinner === 0 ? (vsBot ? "YOU" : "P1") : (vsBot ? "BOT" : "P2");
      if (roundWinner >= 0) ctx.fillText(`${wname} TAKES ROUND ${round}!`, W / 2, H / 2 - 6);
      else ctx.fillText("DRAW!", W / 2, H / 2 - 6);
      ctx.fillStyle = "#fff8ea";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText("MAGNET HAS LEFT THE CHAT. 😂", W / 2, H / 2 + 24);
    }
    if (phase === "matchEnd") {
      ctx.fillStyle = "rgba(10,8,16,0.55)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.fillStyle = "#f6c445";
      ctx.font = "bold 38px sans-serif";
      const wname = matchWinner === 0 ? (vsBot ? "YOU WIN!" : "P1 WINS!") : (vsBot ? "BOT WINS!" : "P2 WINS!");
      ctx.fillText(`🏆 ${wname}`, W / 2, H / 2 - 16);
      ctx.fillStyle = "#fff8ea";
      ctx.font = "bold 17px sans-serif";
      ctx.fillText("I'm the stronger magnet. 🧲😎", W / 2, H / 2 + 16);
      ctx.font = "15px sans-serif";
      ctx.fillText(`Final ${wins[0]}–${wins[1]} · press Restart for revenge`, W / 2, H / 2 + 42);
    }

    ctx.restore();

    if (flash > 0) {
      ctx.fillStyle = `rgba(255,107,107,${Math.min(0.35, flash).toFixed(2)})`;
      ctx.fillRect(0, 0, W, H);
    }

    p1El.textContent = `P1 ${heartsStr(players[0].hearts)} · ★${wins[0]}`;
    p2El.textContent = `P2 ${heartsStr(players[1].hearts)} · ★${wins[1]}`;
    timeEl.textContent = `${Math.ceil(Math.max(0, timeLeft))}s`;
    roundEl.textContent = `Round ${round} · First to ${WIN_SCORE}`;
  }

  let raf = 0;
  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    raf = requestAnimationFrame(tick);
  }

  // ---------- input ----------
  function keydown(e) {
    const k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
    ensureAudio();
    keys.add(k);
    if (e.repeat) return;
    if ((k === "enter" || k === " ") && phase !== "playing") {
      if (phase === "matchEnd" || phase === "ready") startPressed();
      else if (phase === "roundEnd") { /* let it auto-advance */ }
    }
  }
  function keyup(e) {
    keys.delete(e.key.toLowerCase());
  }
  function blurClear() { keys.clear(); touch.active = false; }
  function canvasPos(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * W,
      y: ((e.clientY - r.top) / r.height) * H
    };
  }
  function pointerdown(e) {
    ensureAudio();
    const p = canvasPos(e);
    touch = { active: true, x: p.x, y: p.y };
    if (phase !== "playing") startPressed();
  }
  function pointermove(e) {
    if (!touch.active) return;
    if (e.buttons === 0 && e.type === "mousemove") return;
    const p = canvasPos(e);
    touch.x = p.x; touch.y = p.y;
  }
  function pointerup() { touch.active = false; }

  function startPressed() {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (phase === "matchEnd" || phase === "ready") startMatch();
    else if (phase === "playing") { /* already going */ }
  }

  document.querySelector("#mmStart").addEventListener("click", () => {
    ensureAudio();
    if (phase === "ready" || phase === "matchEnd") startMatch();
    else if (phase === "playing") message.textContent = "Already wobbling! Shove them into something rude.";
  });
  document.querySelector("#mmRestart").addEventListener("click", () => {
    ensureAudio();
    startMatch();
  });
  document.addEventListener("keydown", keydown);
  document.addEventListener("keyup", keyup);
  window.addEventListener("blur", blurClear);
  canvas.addEventListener("pointerdown", pointerdown);
  canvas.addEventListener("pointermove", pointermove);
  window.addEventListener("pointerup", pointerup);
  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    const t = e.touches[0];
    if (t) {
      const r = canvas.getBoundingClientRect();
      touch = { active: true, x: ((t.clientX - r.left) / r.width) * W, y: ((t.clientY - r.top) / r.height) * H };
    }
  }, { passive: false });
  canvas.addEventListener("touchend", pointerup);

  syncHud();
  draw();
  activeAdvance = (ms) => {
    const steps = Math.max(1, Math.round(ms / 16));
    for (let i = 0; i < steps; i++) update(1 / 60);
    draw();
  };
  activeCleanup = () => {
    cancelAnimationFrame(raf);
    document.removeEventListener("keydown", keydown);
    document.removeEventListener("keyup", keyup);
    window.removeEventListener("blur", blurClear);
    window.removeEventListener("pointerup", pointerup);
  };
  last = performance.now();
  raf = requestAnimationFrame(tick);
}

Object.assign(gameStarters, { mayhem: startMagnetMayhem });
