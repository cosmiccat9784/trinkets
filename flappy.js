function startFlappy() {
  openGame(
    "Flappy Bird",
    "Arcade",
    `
      <div class="game-layout">
        <div class="game-topline">
          <span class="game-stat" id="flScore">Score: 0</span>
          <span class="game-stat" id="flBest">Best: 0</span>
          <span class="game-stat" id="flPoints">Points: 0</span>
        </div>
        <canvas class="flappy-canvas" id="flCanvas" width="720" height="480"></canvas>
        <p class="game-message" id="flMsg">SPACE / CLICK / TAP to flap. Pipes pay points for the bird shop.</p>
        <div class="flappy-shop" id="flShop" aria-label="Bird shop"></div>
        <div class="game-actions">
          <button class="game-action one-press" id="flBtn" type="button">FLAP</button>
          <button class="game-action" id="flRetry" type="button">Restart</button>
        </div>
      </div>
    `
  );

  const canvas = document.querySelector("#flCanvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const GROUND_H = 64;
  const FLOOR = H - GROUND_H;
  const BX = 170;
  const BR = 14;
  const GRAVITY = 2000;
  const FLAP_V = -620;
  const MAX_FALL = 980;
  const PIPE_W = 76;

  const scoreEl = document.querySelector("#flScore");
  const bestEl = document.querySelector("#flBest");
  const pointsEl = document.querySelector("#flPoints");
  const shopEl = document.querySelector("#flShop");
  const message = document.querySelector("#flMsg");
  const flapBtn = document.querySelector("#flBtn");

  const QUIPS = [
    "Bonk. The pipe sends regards.",
    "Flattened like a pancake.",
    "So close. Then so flat.",
    "Gravity always wins.",
    "That pipe was load-bearing. For you.",
    "The ground is lava. Apparently."
  ];

  let best = 0;
  try {
    best = Number((readScores() || {}).flappy) || 0;
  } catch (err) {}

  // --- bird shop: points are the currency, earned 1 per pipe ---
  const SKINS = [
    { id: "sunny", name: "Sunny", cost: 0, dot: "#f59f00", bodyHi: "#ffe066", bodyLo: "#f59f00", belly: "#fff3bf", wing: "#e67700", tail: "#f08c00", beak: "#ff6b35" },
    { id: "minty", name: "Minty", cost: 25, dot: "#2f9e44", bodyHi: "#b2f2bb", bodyLo: "#2f9e44", belly: "#ebfbee", wing: "#1e7e34", tail: "#2b8a3e", beak: "#fab005" },
    { id: "berry", name: "Berry", cost: 60, dot: "#e64980", bodyHi: "#ffc2d4", bodyLo: "#d6336c", belly: "#ffedf3", wing: "#a61e4d", tail: "#c2255c", beak: "#fab005" },
    { id: "splash", name: "Splash", cost: 120, dot: "#1971c2", bodyHi: "#a5d8ff", bodyLo: "#1971c2", belly: "#e7f5ff", wing: "#0c4a7a", tail: "#1864ab", beak: "#ff922b" },
    { id: "dusk", name: "Dusk", cost: 200, dot: "#7048e8", bodyHi: "#d0bfff", bodyLo: "#6741d9", belly: "#ede9fe", wing: "#4527a0", tail: "#5f3dc4", beak: "#ffd43b" },
    { id: "waddles", name: "Waddles 🐧", cost: 500, dot: "#22223b", bodyHi: "#4a4e69", bodyLo: "#22223b", belly: "#f8f9fa", wing: "#14141f", tail: "#14141f", beak: "#ff922b", penguin: true }
  ];
  const SHOP_KEY = "trinkets-flappy-shop-v1";
  let shop = { points: 0, owned: ["sunny"], selected: "sunny" };
  try {
    const raw = JSON.parse(localStorage.getItem(SHOP_KEY));
    if (raw && typeof raw === "object") {
      if (typeof raw.points === "number" && raw.points >= 0) shop.points = Math.floor(raw.points);
      if (Array.isArray(raw.owned)) shop.owned = raw.owned.filter((id) => SKINS.some((s) => s.id === id));
      if (typeof raw.selected === "string" && shop.owned.includes(raw.selected)) shop.selected = raw.selected;
    }
  } catch (err) {}
  if (!shop.owned.includes("sunny")) shop.owned.unshift("sunny");

  function saveShop() {
    try {
      localStorage.setItem(SHOP_KEY, JSON.stringify(shop));
    } catch (err) {}
  }

  function skin() {
    return SKINS.find((s) => s.id === shop.selected) || SKINS[0];
  }

  function renderShop() {
    if (!shopEl.isConnected) return;
    shopEl.innerHTML = "";
    for (const s of SKINS) {
      const owned = shop.owned.includes(s.id);
      const selected = shop.selected === s.id;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "fl-skin" + (selected ? " selected" : "") + (!owned && shop.points < s.cost ? " locked" : "");
      const tag = selected ? "flying" : owned ? "owned" : `${s.cost} pts`;
      btn.innerHTML = `<span class="dot" style="background:${s.dot}"></span>${s.name} · ${tag}`;
      btn.title = selected ? `${s.name} is equipped` : owned ? `Fly as ${s.name}` : `Unlock ${s.name} for ${s.cost} points`;
      btn.setAttribute("aria-label", btn.title);
      btn.addEventListener("click", () => shopAction(s.id));
      shopEl.append(btn);
    }
    pointsEl.textContent = `Points: ${shop.points}`;
  }

  function shopAction(id) {
    const s = SKINS.find((x) => x.id === id);
    if (!s) return;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (shop.selected === id) {
      message.textContent = `Already flying as ${s.name}.`;
      return;
    }
    if (shop.owned.includes(id)) {
      shop.selected = id;
      saveShop();
      renderShop();
      message.textContent = `${s.name} equipped. Looking sharp.`;
      return;
    }
    if (shop.points >= s.cost) {
      shop.points -= s.cost;
      shop.owned.push(id);
      shop.selected = id;
      saveShop();
      renderShop();
      syncHud();
      burst(BX, birdY, 16, s.dot, 200);
      showBanner(`${s.name.toUpperCase().replace(/ 🐧/, "")} UNLOCKED!`);
      message.textContent = id === "waddles"
        ? "WADDLES! The penguin has landed. Worth every single point."
        : `${s.name} unlocked and equipped!`;
    } else {
      message.textContent = `${s.name} costs ${s.cost} points — you have ${shop.points}. Thread ${s.cost - shop.points} more pipe${s.cost - shop.points === 1 ? "" : "s"}.`;
    }
  }

  let raf = 0;
  let last = performance.now();
  let mode = "ready"; // ready | playing | dead
  let time = 0;
  let birdY = H / 2;
  let birdV = 0;
  let birdRot = 0;
  let wingT = 0;
  let flapAge = 99;
  let pipes = [];
  let particles = [];
  let popups = [];
  let clouds = [];
  let score = 0;
  let speed = 230;
  let nextSpawn = 0;
  let groundX = 0;
  let shake = 0;
  let flash = 0;
  let deadAge = 0;
  let banner = null;
  let shown = {};
  let hillX = 0;

  function gapH() {
    return Math.max(142, 174 - score * 1.1);
  }

  function pipeSpeed() {
    return Math.min(390, 230 + score * 4);
  }

  function randomGapY() {
    const g = gapH();
    const margin = 96;
    const top = margin + g / 2;
    const bot = FLOOR - margin - g / 2;
    return top + Math.random() * Math.max(40, bot - top);
  }

  function addPipe(x) {
    pipes.push({ x: x === undefined ? W + 40 : x, gapY: randomGapY(), scored: false });
  }

  function burst(x, y, n, color, spread) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * (spread || 240);
      particles.push({
        x, y,
        vx: Math.cos(a) * sp - speed * 0.25,
        vy: Math.sin(a) * sp - 120,
        life: 0.6 + Math.random() * 0.35,
        max: 0.95,
        color,
        size: 2 + Math.random() * 3.5
      });
    }
  }

  function popup(x, y, text, color) {
    popups.push({ x, y, text, color, life: 1.1, max: 1.1 });
  }

  function showBanner(text) {
    banner = { text, t: 2.0 };
  }

  function syncHud() {
    scoreEl.textContent = `Score: ${score}`;
    bestEl.textContent = `Best: ${Math.max(best, score)}`;
    pointsEl.textContent = `Points: ${shop.points}`;
    setSnapshot({
      mode: mode === "playing" ? "playing" : mode === "dead" ? "ended" : "ready",
      game: "Flappy Bird",
      score,
      best: Math.max(best, score),
      points: shop.points,
      skin: shop.selected
    });
  }

  function resetRun(toReady) {
    birdY = H / 2;
    birdV = 0;
    birdRot = 0;
    wingT = 0;
    flapAge = 99;
    pipes = [];
    particles = [];
    popups = [];
    score = 0;
    speed = pipeSpeed();
    nextSpawn = W - BX + 180;
    groundX = 0;
    hillX = 0;
    shake = 0;
    flash = 0;
    banner = null;
    shown = {};
    deadAge = 0;
    mode = toReady ? "ready" : "playing";
    if (toReady) {
      message.textContent = "SPACE / CLICK / TAP to flap. Pipes pay points for the bird shop.";
      // a couple of demo pipes drifting behind the ready overlay
      addPipe(W - 60);
      addPipe(W + 300);
    } else {
      message.textContent = "Go! Flap through the gap.";
    }
    syncHud();
  }

  function die(reason) {
    if (mode !== "playing") return;
    mode = "dead";
    deadAge = 0;
    const result = recordScore("flappy", score, "high");
    best = Math.max(best, result.best, score);
    burst(BX, birdY, 22, "#f6c445", 260);
    burst(BX, birdY, 12, "#fff8ea", 180);
    shake = 14;
    flash = 0.45;
    message.textContent = `${reason || QUIPS[Math.floor(Math.random() * QUIPS.length)]}` +
      (result.isNew && score > 0 ? ` New best: ${score}!` : ` Score: ${score}. Best: ${best}.`) +
      " Press FLAP to retry.";
    syncHud();
  }

  function flap() {
    birdV = FLAP_V;
    flapAge = 0;
    wingT += 1;
    // little feather puff behind the bird
    for (let i = 0; i < 4; i++) {
      particles.push({
        x: BX - BR - 4, y: birdY + (Math.random() - 0.5) * 10,
        vx: -speed * 0.5 - Math.random() * 60,
        vy: 40 + Math.random() * 80,
        life: 0.4, max: 0.4,
        color: "rgba(255,255,255,0.7)",
        size: 2 + Math.random() * 2
      });
    }
  }

  function primaryAction() {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (mode === "ready") {
      resetRun(false);
      flap();
      showBanner("FLAP TO FLY");
    } else if (mode === "playing") {
      flap();
    } else if (mode === "dead" && deadAge > 0.6) {
      resetRun(false);
      flap();
    }
  }

  function milestone() {
    const marks = [
      [10, "NICE! 10 PIPES"],
      [20, "SMOOTH! 20 PIPES"],
      [35, "ON FIRE! 35 PIPES"],
      [50, "LEGEND! 50 PIPES"]
    ];
    for (const [at, text] of marks) {
      if (score >= at && !shown[at]) {
        shown[at] = true;
        showBanner(text);
      }
    }
  }

  function circleHitsPipe(pipe) {
    const g = gapH();
    const gapTop = pipe.gapY - g / 2;
    const gapBot = pipe.gapY + g / 2;
    const left = pipe.x;
    const right = pipe.x + PIPE_W;
    const cx = Math.max(left, Math.min(BX, right));
    // top pipe rect: 0..gapTop, bottom pipe rect: gapBot..FLOOR
    const cyTop = Math.max(0, Math.min(birdY, gapTop));
    if ((BX - cx) * (BX - cx) + (birdY - cyTop) * (birdY - cyTop) < (BR - 2) * (BR - 2)) return true;
    const cyBot = Math.max(gapBot, Math.min(birdY, FLOOR));
    if ((BX - cx) * (BX - cx) + (birdY - cyBot) * (birdY - cyBot) < (BR - 2) * (BR - 2)) return true;
    return false;
  }

  function update(dt) {
    time += dt;
    if (banner) {
      banner.t -= dt;
      if (banner.t <= 0) banner = null;
    }
    shake = Math.max(0, shake - dt * 32);
    if (flash > 0) flash -= dt;
    flapAge += dt;
    wingT += dt * (mode === "playing" ? 14 : 6);

    // clouds always drift
    for (const c of clouds) {
      c.x -= (18 + c.v) * dt;
      if (c.x + c.w < -20) {
        c.x = W + 20 + Math.random() * 160;
        c.y = 30 + Math.random() * 160;
      }
    }
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

    if (mode === "ready") {
      birdY = H / 2 - 40 + Math.sin(time * 3.2) * 12;
      birdRot += ((Math.sin(time * 3.2) * 0.12) - birdRot) * Math.min(1, dt * 8);
      speed = pipeSpeed();
      for (const p of pipes) p.x -= 120 * dt;
      if (pipes.length && pipes[0].x + PIPE_W < -60) pipes.shift();
      groundX = (groundX + 120 * dt) % 48;
      hillX = (hillX + 30 * dt) % 240;
      return;
    }

    if (mode === "dead") {
      deadAge += dt;
      // bird tumbles to the ground
      if (birdY + BR < FLOOR) {
        birdV = Math.min(MAX_FALL, birdV + GRAVITY * dt);
        birdY = Math.min(FLOOR - BR, birdY + birdV * dt);
        birdRot += (1.35 - birdRot) * Math.min(1, dt * 5);
      }
      groundX = (groundX + 0) % 48;
      return;
    }

    // playing
    speed = pipeSpeed();
    milestone();

    birdV = Math.min(MAX_FALL, birdV + GRAVITY * dt);
    birdY += birdV * dt;
    const targetRot = birdV < 0 ? -0.42 : Math.min(1.35, -0.1 + (birdV / MAX_FALL) * 1.8);
    birdRot += (targetRot - birdRot) * Math.min(1, dt * 10);

    if (birdY - BR < 0) {
      birdY = BR;
      birdV = Math.max(birdV, 0);
    }
    if (birdY + BR >= FLOOR) {
      birdY = FLOOR - BR;
      die("Face-plant. The ground sends regards.");
      return;
    }

    nextSpawn -= speed * dt;
    if (nextSpawn <= 0) {
      addPipe();
      const g = gapH();
      nextSpawn = Math.max(250, 350 - score * 1.6) + g * 0.35;
    }

    for (let i = pipes.length - 1; i >= 0; i--) {
      const p = pipes[i];
      p.x -= speed * dt;
      if (!p.scored && p.x + PIPE_W < BX - BR) {
        p.scored = true;
        score += 1;
        shop.points += 1;
        saveShop();
        popup(BX + 26, birdY - 30, "+1", "#f6c445");
        burst(BX + 20, birdY, 5, "#f6c445", 140);
        syncHud();
        renderShop();
      }
      if (p.x + PIPE_W < -80) {
        pipes.splice(i, 1);
        continue;
      }
      if (circleHitsPipe(p)) {
        die();
        return;
      }
    }

    groundX = (groundX + speed * dt) % 48;
    hillX = (hillX + speed * 0.18 * dt) % 240;
    syncHudThrottled();
  }

  let hudT = 0;
  function syncHudThrottled() {
    hudT += 1;
    if (hudT % 8 === 0) syncHud();
    else {
      scoreEl.textContent = `Score: ${score}`;
      bestEl.textContent = `Best: ${Math.max(best, score)}`;
      pointsEl.textContent = `Points: ${shop.points}`;
    }
  }

  function drawPipe(x, y, h, capDown) {
    if (h <= 0) return;
    const grad = ctx.createLinearGradient(x, 0, x + PIPE_W, 0);
    grad.addColorStop(0, "#2f9e44");
    grad.addColorStop(0.25, "#51cf66");
    grad.addColorStop(0.55, "#94d82d");
    grad.addColorStop(1, "#2b8a3e");
    ctx.fillStyle = grad;
    ctx.strokeStyle = "#1e3a24";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x, y, PIPE_W, h, 6);
    ctx.fill();
    ctx.stroke();
    // highlight stripe
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(x + 10, y + 6, 10, h - 12);
    // cap
    const capH = 26;
    const capY = capDown ? y + h - capH : y;
    const capGrad = ctx.createLinearGradient(x - 4, 0, x + PIPE_W + 4, 0);
    capGrad.addColorStop(0, "#2f9e44");
    capGrad.addColorStop(0.3, "#69db7c");
    capGrad.addColorStop(1, "#2b8a3e");
    ctx.fillStyle = capGrad;
    ctx.beginPath();
    ctx.roundRect(x - 5, capY, PIPE_W + 10, capH, 6);
    ctx.fill();
    ctx.stroke();
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // sky
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#4dabf7");
    sky.addColorStop(0.6, "#a5d8ff");
    sky.addColorStop(1, "#e7f5ff");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    const shx = (Math.random() - 0.5) * shake;
    const shy = (Math.random() - 0.5) * shake;
    ctx.save();
    ctx.translate(shx, shy);

    // sun
    ctx.fillStyle = "#fff3bf";
    ctx.strokeStyle = "#fab005";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(W - 110, 88, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,243,191,0.4)";
    ctx.beginPath();
    ctx.arc(W - 110, 88, 48, 0, Math.PI * 2);
    ctx.fill();

    // clouds
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    for (const c of clouds) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.arc(c.x + c.r * 0.9, c.y - c.r * 0.35, c.r * 0.75, 0, Math.PI * 2);
      ctx.arc(c.x + c.r * 1.8, c.y, c.r * 0.85, 0, Math.PI * 2);
      ctx.fill();
    }

    // distant hills
    ctx.fillStyle = "#b2d8b2";
    ctx.strokeStyle = "#7aa57a";
    ctx.lineWidth = 2;
    for (let hx = -hillX; hx < W + 240; hx += 240) {
      ctx.beginPath();
      ctx.arc(hx + 120, FLOOR + 40, 150, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
    }

    // pipes
    const g = gapH();
    for (const p of pipes) {
      const gapTop = p.gapY - g / 2;
      const gapBot = p.gapY + g / 2;
      drawPipe(p.x, -8, gapTop + 8, true);
      drawPipe(p.x, gapBot, FLOOR - gapBot, false);
    }

    // ground
    ctx.fillStyle = "#e9d8a6";
    ctx.fillRect(-20, FLOOR, W + 40, GROUND_H + 20);
    ctx.fillStyle = "#74c69d";
    ctx.fillRect(-20, FLOOR, W + 40, 16);
    ctx.fillStyle = "#2d6a4f";
    ctx.fillRect(-20, FLOOR + 14, W + 40, 4);
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    for (let gx = -groundX; gx < W + 48; gx += 48) {
      ctx.fillRect(gx, FLOOR + 22, 24, GROUND_H);
    }

    // big score (like the original)
    if (mode === "playing" || mode === "dead") {
      ctx.font = "bold 64px sans-serif";
      ctx.textAlign = "center";
      ctx.lineWidth = 6;
      ctx.strokeStyle = "rgba(30,58,36,0.85)";
      ctx.strokeText(String(score), W / 2, 92);
      ctx.fillStyle = "#fff";
      ctx.fillText(String(score), W / 2, 92);
    }

    // bird (hidden on full splat? keep tumbling body visible)
    const c = skin();
    const flapWing = Math.sin(wingT) * (flapAge < 0.25 ? 1 : 0.45);
    ctx.save();
    ctx.translate(BX, birdY);
    ctx.rotate(birdRot);
    // tail
    ctx.fillStyle = c.tail;
    ctx.strokeStyle = "#1e3a24";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-BR - 2, -2);
    ctx.lineTo(-BR - 12, -8);
    ctx.lineTo(-BR - 10, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // body
    const bodyGrad = ctx.createRadialGradient(-4, -6, 2, 0, 0, BR + 4);
    bodyGrad.addColorStop(0, c.bodyHi);
    bodyGrad.addColorStop(1, c.bodyLo);
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(0, 0, BR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1e3a24";
    ctx.lineWidth = 3;
    ctx.stroke();
    // belly
    ctx.fillStyle = c.belly;
    ctx.beginPath();
    ctx.ellipse(-1, 6, 8, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // wing
    ctx.save();
    ctx.translate(-4, 1);
    ctx.rotate(-0.5 - flapWing * 0.7);
    ctx.fillStyle = c.wing;
    ctx.strokeStyle = "#1e3a24";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    // penguin face patch for Waddles
    if (c.penguin) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(4.5, -3.5, 7.5, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // eye
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(5, -5, 5.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1e3a24";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#1e3a24";
    ctx.beginPath();
    ctx.arc(7, -5, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(7.8, -5.8, 0.9, 0, Math.PI * 2);
    ctx.fill();
    // beak
    ctx.fillStyle = c.beak;
    ctx.strokeStyle = "#1e3a24";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(11, -1);
    ctx.lineTo(20, 2);
    ctx.lineTo(11, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

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
      ctx.font = "bold 22px monospace";
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
      ctx.fillStyle = "rgba(20,30,24,0.82)";
      ctx.beginPath();
      ctx.roundRect(W / 2 - tw / 2, 108, tw, 44, 12);
      ctx.fill();
      ctx.fillStyle = "#ffe066";
      ctx.textBaseline = "middle";
      ctx.fillText(banner.text, W / 2, 131);
      ctx.textBaseline = "alphabetic";
    }

    // overlays
    if (mode === "ready") {
      ctx.fillStyle = "rgba(20,40,60,0.55)";
      ctx.fillRect(0, 0, W, FLOOR);
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.font = "bold 56px sans-serif";
      ctx.fillText("FLAPPY", W / 2, H / 2 - 66);
      ctx.fillStyle = "#ffe066";
      ctx.font = "bold 22px sans-serif";
      ctx.fillText("don't touch the pipes", W / 2, H / 2 - 32);
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.fillText("SPACE · CLICK · TAP — flap your wings", W / 2, H / 2 - 2);
      ctx.fillText("Each gap pays 1 point. Spend them in the shop.", W / 2, H / 2 + 22);
      ctx.fillStyle = "#69db7c";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("— press anything to start —", W / 2, H / 2 + 54);
    }

    if (mode === "dead") {
      ctx.fillStyle = "rgba(20,16,12,0.45)";
      ctx.fillRect(0, 0, W, FLOOR);
      ctx.textAlign = "center";
      ctx.fillStyle = "#ff6b6b";
      ctx.font = "bold 54px sans-serif";
      ctx.fillText("SPLAT", W / 2, H / 2 - 46);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(`Score ${score} · +${score} pts · Best ${Math.max(best, score)}`, W / 2, H / 2 - 10);
      if (deadAge > 0.6) {
        ctx.fillStyle = "#69db7c";
        ctx.font = "bold 17px sans-serif";
        ctx.fillText("— press FLAP to retry —", W / 2, H / 2 + 22);
      }
    }

    ctx.restore();

    if (flash > 0) {
      ctx.fillStyle = `rgba(255,80,80,${Math.min(0.4, flash).toFixed(2)})`;
      ctx.fillRect(0, 0, W, H);
    }

    scoreEl.textContent = `Score: ${score}`;
    bestEl.textContent = `Best: ${Math.max(best, score)}`;
    pointsEl.textContent = `Points: ${shop.points}`;
  }

  function tick(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    raf = requestAnimationFrame(tick);
  }

  function keydown(e) {
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
      e.preventDefault();
      if (e.repeat) return;
      primaryAction();
    } else if (e.code === "Enter" && mode !== "playing") {
      primaryAction();
    }
  }

  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    primaryAction();
  });
  flapBtn.addEventListener("click", (e) => {
    e.preventDefault();
    primaryAction();
  });
  document.querySelector("#flRetry").addEventListener("click", () => {
    resetRun(false);
    message.textContent = "Go! Flap through the gap.";
    showBanner("FLAP TO FLY");
    syncHud();
  });
  document.addEventListener("keydown", keydown);

  // seed clouds
  for (let i = 0; i < 5; i++) {
    clouds.push({
      x: Math.random() * W,
      y: 30 + Math.random() * 160,
      r: 16 + Math.random() * 16,
      w: 70,
      v: Math.random() * 14
    });
  }

  setSnapshot({ mode: "ready", game: "Flappy Bird", score: 0, best, points: shop.points, skin: shop.selected });
  activeAdvance = (ms) => {
    const steps = Math.max(1, Math.round(ms / 16));
    for (let i = 0; i < steps; i++) update(1 / 60);
    draw();
  };
  activeCleanup = () => {
    cancelAnimationFrame(raf);
    document.removeEventListener("keydown", keydown);
  };
  bestEl.textContent = `Best: ${best}`;
  renderShop();
  resetRun(true);
  last = performance.now();
  raf = requestAnimationFrame(tick);
}

Object.assign(gameStarters, { flappy: startFlappy });
