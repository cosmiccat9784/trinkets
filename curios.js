function startMagnetMess() {
  openGame(
    "Magnet Mess",
    "Toys",
    `
      <div class="game-layout">
        <div class="game-topline">
          <span class="game-stat" id="magMode">Attracting</span>
          <span class="game-stat">Drag the magnet. Space flips it.</span>
        </div>
        <canvas class="mag-canvas" id="magCanvas" width="720" height="480"></canvas>
        <div class="game-actions">
          <button class="game-action" id="magFlip" type="button">Flip to repel</button>
          <button class="game-action" id="magClear" type="button">Reset</button>
        </div>
      </div>
    `
  );

  const canvas = document.querySelector("#magCanvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  let attract = true;
  let parts = [];
  let links = [];
  let raf = 0;
  let last = performance.now();
  const mag = { x: W / 2, y: H / 2, vx: 0, vy: 0, r: 26 };
  let grab = false;
  let grabDX = 0;
  let grabDY = 0;
  let lastPX = 0;
  let lastPY = 0;
  let lastPT = 0;

  function build() {
    parts = [];
    links = [];
    const palette = ["#c7cfdb", "#aeb9c9", "#dbe2ec"];
    for (let i = 0; i < 6; i++) {
      parts.push({
        x: 60 + Math.random() * (W - 120),
        y: 60 + Math.random() * (H - 120),
        vx: 0, vy: 0,
        r: 10 + Math.random() * 4,
        m: 1,
        heavy: false,
        color: palette[i % palette.length],
        link: -1
      });
    }
    for (let i = 0; i < 3; i++) {
      parts.push({
        x: 80 + Math.random() * (W - 160),
        y: 80 + Math.random() * (H - 160),
        vx: 0, vy: 0,
        r: 15 + Math.random() * 5,
        m: 4,
        heavy: true,
        color: "#f6c445",
        link: -1
      });
    }
    const a = {
      x: W * 0.3, y: H * 0.6, vx: 0, vy: 0, r: 11, m: 1,
      heavy: false, color: "#c7cfdb", link: 0
    };
    const b = {
      x: W * 0.3 + 34, y: H * 0.6, vx: 0, vy: 0, r: 11, m: 1,
      heavy: false, color: "#aeb9c9", link: 0
    };
    parts.push(a, b);
    links.push({ a, b, rest: 34 });
    mag.x = W / 2;
    mag.y = H / 2;
    mag.vx = 0;
    mag.vy = 0;
  }

  function step(dt) {
    const dir = attract ? 1 : -1;
    for (const p of parts) {
      const dx = mag.x - p.x;
      const dy = mag.y - p.y;
      const d = Math.max(30, Math.hypot(dx, dy));
      if (d < 340) {
        const a = dir * 2600 * (1 - d / 340) / p.m;
        p.vx += (dx / d) * a * dt;
        p.vy += (dy / d) * a * dt;
      }
      const sp = Math.hypot(p.vx, p.vy);
      if (sp > 700) {
        p.vx = (p.vx / sp) * 700;
        p.vy = (p.vy / sp) * 700;
      }
      p.vx *= Math.max(0, 1 - 2.2 * dt);
      p.vy *= Math.max(0, 1 - 2.2 * dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x - p.r < 0) { p.x = p.r; p.vx = Math.abs(p.vx) * 0.6; }
      if (p.x + p.r > W) { p.x = W - p.r; p.vx = -Math.abs(p.vx) * 0.6; }
      if (p.y - p.r < 0) { p.y = p.r; p.vy = Math.abs(p.vy) * 0.6; }
      if (p.y + p.r > H) { p.y = H - p.r; p.vy = -Math.abs(p.vy) * 0.6; }
    }
    for (const link of links) {
      const dx = link.b.x - link.a.x;
      const dy = link.b.y - link.a.y;
      const d = Math.max(1, Math.hypot(dx, dy));
      const f = (d - link.rest) * 60;
      const nx = dx / d;
      const ny = dy / d;
      link.a.vx += nx * f * dt;
      link.a.vy += ny * f * dt;
      link.b.vx -= nx * f * dt;
      link.b.vy -= ny * f * dt;
    }
    for (let i = 0; i < parts.length; i++) {
      for (let j = i + 1; j < parts.length; j++) {
        const a = parts[i];
        const b = parts[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const min = a.r + b.r;
        const d = Math.hypot(dx, dy);
        if (d === 0 || d >= min) continue;
        const nx = dx / d;
        const ny = dy / d;
        const overlap = min - d;
        const tm = a.m + b.m;
        a.x -= nx * overlap * (b.m / tm);
        a.y -= ny * overlap * (b.m / tm);
        b.x += nx * overlap * (a.m / tm);
        b.y += ny * overlap * (a.m / tm);
        const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (vn < 0) {
          const jimp = -(1 + 0.7) * vn / (1 / a.m + 1 / b.m);
          a.vx -= jimp * nx / a.m;
          a.vy -= jimp * ny / a.m;
          b.vx += jimp * nx / b.m;
          b.vy += jimp * ny / b.m;
        }
      }
      const p = parts[i];
      const mdx = p.x - mag.x;
      const mdy = p.y - mag.y;
      const md = Math.hypot(mdx, mdy);
      const mmin = p.r + mag.r - 4;
      if (md < mmin && md > 0) {
        p.x = mag.x + (mdx / md) * mmin;
        p.y = mag.y + (mdy / md) * mmin;
      }
    }
  }

  function render() {
    ctx.fillStyle = "#20263f";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    for (let gx = 30; gx < W; gx += 60) {
      for (let gy = 30; gy < H; gy += 60) {
        ctx.beginPath();
        ctx.arc(gx, gy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 3;
    for (const link of links) {
      ctx.beginPath();
      ctx.moveTo(link.a.x, link.a.y);
      ctx.lineTo(link.b.x, link.b.y);
      ctx.stroke();
    }
    for (const p of parts) {
      ctx.beginPath();
      if (p.heavy) {
        ctx.rect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      } else {
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      }
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.strokeStyle = "#0f1320";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(p.x - p.r * 0.3, p.y - p.r * 0.35, p.r * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(mag.x, mag.y, mag.r, 0, Math.PI * 2);
    ctx.fillStyle = attract ? "#4f8fcf" : "#ff6b6b";
    ctx.fill();
    ctx.strokeStyle = "#0f1320";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 26px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(attract ? "+" : "−", mag.x, mag.y + 1);
  }

  function tick(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    step(dt);
    render();
    raf = requestAnimationFrame(tick);
  }

  function setModeLabel() {
    document.querySelector("#magMode").textContent = attract ? "Attracting" : "Repelling";
    document.querySelector("#magFlip").textContent = attract ? "Flip to repel" : "Flip to attract";
  }

  function flip() {
    attract = !attract;
    setModeLabel();
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
    grab = true;
    grabDX = mag.x - p.x;
    grabDY = mag.y - p.y;
    mag.vx = 0;
    mag.vy = 0;
    lastPX = e.clientX;
    lastPY = e.clientY;
    lastPT = performance.now();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!grab) return;
    const p = toCanvas(e);
    mag.x = Math.min(W - mag.r, Math.max(mag.r, p.x + grabDX));
    mag.y = Math.min(H - mag.r, Math.max(mag.r, p.y + grabDY));
    const now = performance.now();
    const dt = Math.max(8, now - lastPT) / 1000;
    mag.vx = (e.clientX - lastPX) / dt;
    mag.vy = (e.clientY - lastPY) / dt;
    lastPX = e.clientX;
    lastPY = e.clientY;
    lastPT = now;
  });
  const releaseMag = () => { grab = false; };
  canvas.addEventListener("pointerup", releaseMag);
  canvas.addEventListener("pointercancel", releaseMag);

  function keydown(e) {
    if (e.code === "Space") {
      if (document.activeElement && document.activeElement.tagName === "BUTTON") return;
      e.preventDefault();
      flip();
    }
  }

  document.querySelector("#magFlip").addEventListener("click", flip);
  document.querySelector("#magClear").addEventListener("click", build);
  document.addEventListener("keydown", keydown);
  setSnapshot({ mode: "playing", game: "Magnet Mess" });
  activeCleanup = () => {
    cancelAnimationFrame(raf);
    document.removeEventListener("keydown", keydown);
  };
  build();
  setModeLabel();
  raf = requestAnimationFrame(tick);
}

function iceSlide(board, x, y, dx, dy) {
  let cx = x;
  let cy = y;
  while (true) {
    const nx = cx + dx;
    const ny = cy + dy;
    if (nx < 0 || nx > 5 || ny < 0 || ny > 5 || board[ny][nx] === 1) break;
    cx = nx;
    cy = ny;
  }
  return [cx, cy];
}

function iceSolve(board, sx, sy, tx, ty) {
  const seen = new Set([sy * 6 + sx]);
  const queue = [{ x: sx, y: sy, d: 0 }];
  while (queue.length) {
    const cur = queue.shift();
    if (cur.x === tx && cur.y === ty) return cur.d;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const [nx, ny] = iceSlide(board, cur.x, cur.y, dx, dy);
      if (nx === cur.x && ny === cur.y) continue;
      const k = ny * 6 + nx;
      if (seen.has(k)) continue;
      seen.add(k);
      queue.push({ x: nx, y: ny, d: cur.d + 1 });
    }
  }
  return -1;
}

function genIceBoard(rand) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const board = Array.from({ length: 6 }, () => [0, 0, 0, 0, 0, 0]);
    const wallCount = 5 + Math.floor(rand() * 3);
    let placed = 0;
    let guard = 0;
    while (placed < wallCount && guard++ < 200) {
      const x = Math.floor(rand() * 6);
      const y = Math.floor(rand() * 6);
      if (board[y][x] === 1) continue;
      board[y][x] = 1;
      placed++;
    }
    const free = [];
    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < 6; x++) {
        if (board[y][x] === 0) free.push([x, y]);
      }
    }
    if (free.length < 10) continue;
    const si = Math.floor(rand() * free.length);
    let ti = Math.floor(rand() * free.length);
    if (ti === si) continue;
    const [sx, sy] = free[si];
    const [tx, ty] = free[ti];
    if (Math.abs(sx - tx) + Math.abs(sy - ty) < 4) continue;
    const par = iceSolve(board, sx, sy, tx, ty);
    if (par >= 4 && par <= 14) {
      return { board, sx, sy, tx, ty, par };
    }
  }
  return {
    board: Array.from({ length: 6 }, () => [0, 0, 0, 0, 0, 0]),
    sx: 0, sy: 0, tx: 5, ty: 5, par: 2
  };
}

function startIceCube() {
  openGame(
    "Ice Cube",
    "Puzzle",
    `
      <div class="game-layout">
        <div class="game-topline">
          <span class="game-stat" id="iceBoard">Board: 1</span>
          <span class="game-stat" id="iceMelt">Melt: 0</span>
        </div>
        <p class="game-message" id="iceMsg">Slide the cube onto the gold ring before it melts.</p>
        <div class="ice-grid" id="iceGrid" aria-label="Ice board"></div>
        <div class="t-pad" aria-label="Slide">
          <button class="game-action t-pad-button" type="button" data-ice="up" aria-label="Slide up">↑</button>
          <button class="game-action t-pad-button" type="button" data-ice="left" aria-label="Slide left">←</button>
          <button class="game-action t-pad-button" type="button" data-ice="down" aria-label="Slide down">↓</button>
          <button class="game-action t-pad-button" type="button" data-ice="right" aria-label="Slide right">→</button>
        </div>
        <div class="game-actions">
          <button class="game-action" id="iceUndo" type="button">Undo</button>
          <button class="game-action" id="iceReset" type="button">Reset</button>
          <button class="game-action" id="iceNext" type="button">Next board</button>
        </div>
      </div>
    `
  );

  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const grid = document.querySelector("#iceGrid");
  const message = document.querySelector("#iceMsg");
  let board = [];
  let cx = 0;
  let cy = 0;
  let startX = 0;
  let startY = 0;
  let tx = 0;
  let ty = 0;
  let movesLeft = 0;
  let budget = 0;
  let boardsCleared = 0;
  let boardNum = 0;
  let won = false;
  let history = [];

  function newBoard() {
    const gen = genIceBoard(Math.random);
    board = gen.board;
    cx = gen.sx;
    cy = gen.sy;
    startX = gen.sx;
    startY = gen.sy;
    tx = gen.tx;
    ty = gen.ty;
    budget = gen.par + 5;
    movesLeft = budget;
    won = false;
    history = [];
    boardNum += 1;
    document.querySelector("#iceBoard").textContent = `Board: ${boardNum}`;
    message.textContent = "Slide the cube onto the gold ring before it melts.";
    render();
  }

  function slide(dir) {
    if (won || movesLeft <= 0) return;
    const [dx, dy] = DIRS[dir];
    const [nx, ny] = iceSlide(board, cx, cy, dx, dy);
    if (nx === cx && ny === cy) return;
    history.push({ x: cx, y: cy, left: movesLeft });
    if (history.length > 200) history.shift();
    cx = nx;
    cy = ny;
    movesLeft -= 1;
    if (cx === tx && cy === ty) {
      won = true;
      boardsCleared += 1;
      const result = recordScore("ice", boardsCleared, "high");
      message.textContent = `Landed it with ${movesLeft} melt left!` + (result.isNew ? " New best run!" : ` Best run: ${result.best} boards.`);
    } else if (movesLeft <= 0) {
      message.textContent = "Melted into a puddle. Reset and try again.";
    }
    render();
  }

  function render() {
    grid.innerHTML = "";
    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < 6; x++) {
        const cell = document.createElement("div");
        cell.className = "ice-cell f";
        if (board[y][x] === 1) {
          cell.classList.remove("f");
          cell.classList.add("w");
        } else if (x === tx && y === ty) {
          cell.classList.remove("f");
          cell.classList.add("t");
        }
        if (x === cx && y === cy) {
          const cube = document.createElement("div");
          cube.className = "ice-cube" + (won ? " landed" : "");
          const shrink = budget > 0 ? 0.55 + 0.45 * (movesLeft / budget) : 1;
          cube.style.transform = `scale(${shrink.toFixed(2)})`;
          cell.append(cube);
        }
        grid.append(cell);
      }
    }
    document.querySelector("#iceMelt").textContent = `Melt: ${movesLeft}`;
    setSnapshot({
      mode: won ? "won" : "playing",
      game: "Ice Cube",
      board: boardNum,
      melt: movesLeft
    });
  }

  function keydown(event) {
    if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) {
      return;
    }
    const map = {
      ArrowUp: "up", w: "up", W: "up",
      ArrowDown: "down", s: "down", S: "down",
      ArrowLeft: "left", a: "left", A: "left",
      ArrowRight: "right", d: "right", D: "right"
    };
    if (map[event.key]) {
      event.preventDefault();
      slide(map[event.key]);
    }
  }

  let touchSX = 0;
  let touchSY = 0;
  grid.addEventListener("touchstart", (e) => {
    touchSX = e.touches[0].clientX;
    touchSY = e.touches[0].clientY;
  }, { passive: true });
  grid.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - touchSX;
    const dy = e.changedTouches[0].clientY - touchSY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) slide(dx > 0 ? "right" : "left");
    else slide(dy > 0 ? "down" : "up");
  }, { passive: true });

  document.querySelectorAll("[data-ice]").forEach((btn) => {
    btn.addEventListener("click", () => slide(btn.dataset.ice));
  });
  document.querySelector("#iceUndo").addEventListener("click", () => {
    const prev = history.pop();
    if (!prev) return;
    cx = prev.x;
    cy = prev.y;
    movesLeft = prev.left;
    won = false;
    message.textContent = "Undone. Still frozen.";
    render();
  });
  document.querySelector("#iceReset").addEventListener("click", () => {
    cx = startX;
    cy = startY;
    movesLeft = budget;
    won = false;
    history = [];
    message.textContent = "Slide the cube onto the gold ring before it melts.";
    render();
  });
  document.querySelector("#iceNext").addEventListener("click", newBoard);
  document.addEventListener("keydown", keydown);
  activeCleanup = () => {
    document.removeEventListener("keydown", keydown);
  };
  newBoard();
}

function startCoinFlip() {
  openGame(
    "Coin Flip",
    "Toys",
    `
      <div class="game-layout">
        <div class="game-topline">
          <span class="game-stat" id="coinResult">Heads or tails?</span>
          <span class="game-stat">Tap the coin. Catch it mid-air. Double-tap to spin.</span>
        </div>
        <canvas class="coin-canvas" id="coinCanvas" width="720" height="420"></canvas>
        <div class="word-panel coin-stats" id="coinStats"></div>
        <div class="game-actions">
          <button class="game-action" id="coinFlipBtn" type="button">Flip</button>
          <button class="game-action" id="coinSpinBtn" type="button">Spin</button>
          <button class="game-action" id="coinResetStats" type="button">Reset stats</button>
        </div>
      </div>
    `
  );

  const STATS_KEY = "trinkets-coin-stats";
  const canvas = document.querySelector("#coinCanvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const FLOOR = H - 60;
  const CX = W / 2;
  const R = 64;
  const GRAV = 2600;
  let stats = { flips: 0, heads: 0, tails: 0, caught: 0, longest: 0, standing: 0 };
  try {
    const saved = JSON.parse(localStorage.getItem(STATS_KEY));
    if (saved && typeof saved === "object") stats = { ...stats, ...saved };
  } catch (err) {}
  const coin = { y: FLOOR - R, vy: 0, angle: 0, spin: 0, mode: "idle", face: "H", bounces: 0, spinT: 0, lastTap: 0 };
  let particles = [];
  let raf = 0;
  let last = performance.now();
  const resultLabel = document.querySelector("#coinResult");

  function saveStats() {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch (err) {}
  }

  function renderStats() {
    document.querySelector("#coinStats").innerHTML =
      `<div class="coin-stat"><strong>${stats.flips}</strong><span>flipped</span></div>` +
      `<div class="coin-stat"><strong>${stats.heads}</strong><span>heads</span></div>` +
      `<div class="coin-stat"><strong>${stats.tails}</strong><span>tails</span></div>` +
      `<div class="coin-stat"><strong>${stats.caught}</strong><span>caught</span></div>` +
      `<div class="coin-stat"><strong>${stats.longest.toFixed(2)}s</strong><span>longest spin</span></div>` +
      `<div class="coin-stat"><strong>${stats.standing}</strong><span>standing</span></div>`;
  }

  function burst(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 160;
      particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: 0.6, max: 0.6 });
    }
  }

  function settle(face, how) {
    coin.mode = "landed";
    coin.face = face;
    stats.flips += 1;
    if (face === "H") stats.heads += 1;
    else stats.tails += 1;
    if (how === "caught") {
      stats.caught += 1;
      resultLabel.textContent = `Caught! ${face === "H" ? "Heads" : "Tails"}.`;
    } else if (how === "standing") {
      stats.standing += 1;
      resultLabel.textContent = "IT STANDS?! Unbelievable.";
    } else if (how === "spin") {
      resultLabel.textContent = `${face === "H" ? "Heads" : "Tails"} after ${coin.spinT.toFixed(2)}s.`;
    } else {
      resultLabel.textContent = face === "H" ? "Heads." : "Tails.";
    }
    saveStats();
    renderStats();
    setSnapshot({ mode: "playing", game: "Coin Flip", flips: stats.flips });
  }

  function flip(strength) {
    if (coin.mode === "flying" || coin.mode === "spinning") return;
    coin.mode = "flying";
    coin.y = FLOOR - R - 4;
    coin.vy = -(1050 + Math.random() * 250) * strength;
    coin.spin = (14 + Math.random() * 8) * strength * (Math.random() < 0.5 ? 1 : 1);
    coin.bounces = 0;
    coin.spinT = 0;
    resultLabel.textContent = "…";
  }

  function startSpin() {
    if (coin.mode === "flying" || coin.mode === "spinning") return;
    coin.mode = "spinning";
    coin.spinT = 0;
    resultLabel.textContent = "Spinning… tap to stop.";
  }

  function stopSpin() {
    const face = Math.random() < 0.5 ? "H" : "T";
    if (coin.spinT > stats.longest) stats.longest = Math.round(coin.spinT * 100) / 100;
    coin.mode = "idle";
    coin.y = FLOOR - R;
    settle(face, "spin");
  }

  function toCanvas(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (W / rect.width),
      y: (e.clientY - rect.top) * (H / rect.height)
    };
  }

  function onDown(e) {
    e.preventDefault();
    const now = performance.now();
    if (coin.mode === "spinning") {
      stopSpin();
      return;
    }
    if (coin.mode === "flying") {
      const p = toCanvas(e);
      if (Math.hypot(p.x - CX, p.y - coin.y) < R + 30) {
        const face = Math.cos(coin.angle) >= 0 ? "H" : "T";
        coin.mode = "idle";
        coin.y = FLOOR - R;
        burst(CX, coin.y, 10);
        settle(face, "caught");
      }
      return;
    }
    if (now - coin.lastTap < 320) {
      coin.lastTap = 0;
      startSpin();
      return;
    }
    coin.lastTap = now;
    coin.pressY = e.clientY;
    coin.pressT = now;
  }

  function onUp(e) {
    if (coin.mode !== "idle" || coin.pressY === undefined) return;
    const dy = coin.pressY - e.clientY;
    const dt = Math.max(60, performance.now() - coin.pressT) / 1000;
    const strength = Math.min(1.8, Math.max(0.7, 0.9 + (dy / 300) * (0.35 / dt)));
    delete coin.pressY;
    flip(strength);
  }

  function update(dt) {
    if (coin.mode === "flying") {
      coin.vy += GRAV * dt;
      coin.y += coin.vy * dt;
      coin.angle += coin.spin * dt;
      if (coin.y >= FLOOR - R) {
        coin.y = FLOOR - R;
        if (Math.abs(coin.vy) > 520 && coin.bounces < 2) {
          coin.vy = -coin.vy * 0.45;
          coin.spin *= 0.6;
          coin.bounces += 1;
          burst(CX, FLOOR - 4, 6);
        } else if (Math.random() < 0.03) {
          coin.angle = Math.PI / 2;
          burst(CX, coin.y, 16);
          settle(Math.random() < 0.5 ? "H" : "T", "standing");
        } else {
          const face = Math.cos(coin.angle) >= 0 ? "H" : "T";
          burst(CX, FLOOR - 4, 8);
          settle(face, "landed");
        }
      }
    } else if (coin.mode === "spinning") {
      coin.spinT += dt;
      coin.angle += 26 * dt;
    }
    particles = particles.filter((p) => p.life > 0);
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 900 * dt;
      p.life -= dt;
    }
  }

  function draw() {
    ctx.fillStyle = "#20304a";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    for (let gx = 40; gx < W; gx += 80) {
      ctx.beginPath();
      ctx.arc(gx, 60, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#101827";
    ctx.fillRect(0, FLOOR + R, W, H - FLOOR - R + 60);
    ctx.fillStyle = "rgba(246,196,69,0.25)";
    ctx.fillRect(0, FLOOR + R, W, 4);
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = "#f6c445";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const standing = coin.mode === "landed" && Math.abs(coin.angle - Math.PI / 2) < 0.05 && stats.standing > 0;
    ctx.save();
    ctx.translate(CX, coin.mode === "idle" || coin.mode === "spinning" ? coin.y + Math.sin(performance.now() / 500) * 3 : coin.y);
    if (coin.mode === "spinning") {
      const w = Math.abs(Math.cos(coin.angle)) * 0.9 + 0.1;
      ctx.scale(w, 1);
      ctx.rotate(Math.sin(coin.angle * 0.5) * 0.12);
    } else if (coin.mode === "flying") {
      ctx.scale(Math.max(0.18, Math.abs(Math.cos(coin.angle))), 1);
    } else if (standing) {
      ctx.scale(0.22, 1);
    }
    const grad = ctx.createRadialGradient(-18, -22, 8, 0, 0, R);
    grad.addColorStop(0, "#ffe9a8");
    grad.addColorStop(1, "#d9a92f");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8a5f14";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = "#8a5f14";
    ctx.font = "bold 52px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let face = coin.face;
    if (coin.mode === "flying" || coin.mode === "spinning") {
      face = Math.cos(coin.angle) >= 0 ? "H" : "T";
    }
    ctx.fillText(face, 0, 3);
    ctx.restore();
    if (coin.mode === "spinning") {
      ctx.fillStyle = "#fff";
      ctx.font = "bold 22px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(coin.spinT.toFixed(2) + "s", CX, 60);
    }
  }

  function tick(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    raf = requestAnimationFrame(tick);
  }

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", () => { delete coin.pressY; });
  document.querySelector("#coinFlipBtn").addEventListener("click", () => flip(1));
  document.querySelector("#coinSpinBtn").addEventListener("click", startSpin);
  document.querySelector("#coinResetStats").addEventListener("click", () => {
    stats = { flips: 0, heads: 0, tails: 0, caught: 0, longest: 0, standing: 0 };
    saveStats();
    renderStats();
    resultLabel.textContent = "Heads or tails?";
  });
  setSnapshot({ mode: "playing", game: "Coin Flip", flips: stats.flips });
  activeCleanup = () => {
    cancelAnimationFrame(raf);
  };
  renderStats();
  raf = requestAnimationFrame(tick);
}

function startCheeseThief() {
  openGame(
    "Cheese Thief",
    "Arcade",
    `
      <div class="game-layout">
        <div class="game-topline">
          <span class="game-stat" id="cheeseScore">Score: 0</span>
          <span class="game-stat" id="cheeseLevel">Kitchen: 1/5</span>
          <span class="game-stat" id="cheeseLives">Strikes: 0/3</span>
        </div>
        <p class="game-message" id="cheeseMsg">Drag the mouse. Grab cheese. Get home. Mind the light.</p>
        <canvas class="cheese-canvas" id="cheeseCanvas" width="720" height="480"></canvas>
        <div class="game-actions">
          <button class="game-action" id="cheeseRetry" type="button">Retry kitchen</button>
          <button class="game-action" id="cheeseNext" type="button" hidden>Next kitchen</button>
        </div>
      </div>
    `
  );

  const canvas = document.querySelector("#cheeseCanvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const scoreLabel = document.querySelector("#cheeseScore");
  const levelLabel = document.querySelector("#cheeseLevel");
  const livesLabel = document.querySelector("#cheeseLives");
  const message = document.querySelector("#cheeseMsg");
  const nextBtn = document.querySelector("#cheeseNext");
  const keys = new Set();

  const LEVELS = [
    {
      hint: "Drag the mouse. Grab cheese. Get home. Mind the light.",
      cheese: [{ x: 620, y: 90 }, { x: 620, y: 390 }, { x: 360, y: 240 }],
      hole: { x: 70, y: 410 },
      lights: [{ cx: 360, cy: 240, ax: 250, ay: 140, w: 0.45, phase: 0, r: 74 }],
      cat: null, vacuum: null, chef: null, plates: false
    },
    {
      hint: "The cat sleeps. Probably. Don't wake it.",
      cheese: [{ x: 630, y: 80 }, { x: 630, y: 400 }, { x: 360, y: 120 }, { x: 200, y: 400 }],
      hole: { x: 70, y: 410 },
      lights: [{ cx: 360, cy: 240, ax: 260, ay: 150, w: 0.55, phase: 1, r: 70 }],
      cat: { x: 590, y: 90, r: 26, wake: 86 },
      vacuum: null, chef: null, plates: false
    },
    {
      hint: "The vacuum fears nothing and sees everything.",
      cheese: [{ x: 630, y: 80 }, { x: 630, y: 400 }, { x: 360, y: 240 }, { x: 120, y: 90 }],
      hole: { x: 70, y: 410 },
      lights: [{ cx: 360, cy: 240, ax: 240, ay: 130, w: 0.6, phase: 2, r: 66 }],
      cat: null,
      vacuum: { x1: 120, x2: 600, y: 300, speed: 130 },
      chef: null, plates: false
    },
    {
      hint: "The chef patrols. His eyes are everywhere his hat points.",
      cheese: [{ x: 640, y: 70 }, { x: 640, y: 410 }, { x: 360, y: 240 }, { x: 120, y: 240 }],
      hole: { x: 70, y: 410 },
      lights: [{ cx: 360, cy: 240, ax: 220, ay: 120, w: 0.6, phase: 0, r: 62 }],
      cat: null, vacuum: null,
      chef: { path: [{ x: 120, y: 100 }, { x: 600, y: 100 }, { x: 600, y: 380 }, { x: 120, y: 380 }], speed: 95, vision: 115 },
      plates: false
    },
    {
      hint: "Everything is faster. Also: falling plates.",
      cheese: [{ x: 640, y: 70 }, { x: 640, y: 410 }, { x: 360, y: 120 }, { x: 360, y: 360 }, { x: 120, y: 90 }],
      hole: { x: 70, y: 410 },
      lights: [
        { cx: 250, cy: 240, ax: 170, ay: 160, w: 0.8, phase: 0, r: 64 },
        { cx: 480, cy: 240, ax: 170, ay: 160, w: 0.7, phase: 2.4, r: 64 }
      ],
      cat: { x: 120, y: 390, r: 26, wake: 86 },
      vacuum: { x1: 140, x2: 580, y: 240, speed: 160 },
      chef: { path: [{ x: 200, y: 80 }, { x: 520, y: 80 }, { x: 520, y: 400 }, { x: 200, y: 400 }], speed: 120, vision: 120 },
      plates: true
    }
  ];

  let levelIndex = 0;
  let score = 0;
  let scoreAtLevel = 0;
  let strikes = 0;
  let state = null;
  let raf = 0;
  let last = performance.now();
  let time = 0;
  let plateTimer = 0;
  let telegraphs = [];
  let splats = [];
  let flash = 0;
  let cleared = false;

  function startLevel(index) {
    const def = LEVELS[index];
    state = {
      player: { x: def.hole.x, y: def.hole.y - 60, vx: 0, vy: 0 },
      cheese: def.cheese.map((c) => ({ ...c, home: { ...c }, taken: false })),
      carried: -1,
      exposure: 0,
      catAwake: 0,
      chefAt: 0,
      chefPos: def.chef ? { ...def.chef.path[0] } : null
    };
    telegraphs = [];
    splats = [];
    cleared = false;
    plateTimer = 2;
    nextBtn.hidden = true;
    message.textContent = def.hint;
    render();
  }

  function levelDef() {
    return LEVELS[levelIndex];
  }

  function catchMouse(reason) {
    strikes += 1;
    flash = 0.6;
    if (state.carried >= 0) {
      const c = state.cheese[state.carried];
      c.taken = false;
      c.x = c.home.x;
      c.y = c.home.y;
      state.carried = -1;
    }
    state.player.x = levelDef().hole.x;
    state.player.y = levelDef().hole.y - 60;
    state.exposure = 0;
    if (strikes >= 3) {
      const result = recordScore("cheese", score, "high");
      message.textContent = `Caught thrice! Final score: ${score}.` + (result.isNew && score > 0 ? " New best!" : ` Best: ${result.best}.`);
      cancelAnimationFrame(raf);
      raf = 0;
      setSnapshot({ mode: "lost", game: "Cheese Thief", level: levelIndex + 1, score });
      return;
    }
    message.textContent = `${reason} Strikes: ${strikes}/3.`;
    render();
  }

  function update(dt) {
    time += dt;
    const def = levelDef();
    const p = state.player;
    const speed = 250;
    if (!cleared && raf !== 0) {
      if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) p.x -= speed * dt;
      if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) p.x += speed * dt;
      if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) p.y -= speed * dt;
      if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) p.y += speed * dt;
    }
    p.x = Math.max(18, Math.min(W - 18, p.x));
    p.y = Math.max(18, Math.min(H - 18, p.y));

    let lit = false;
    for (const l of def.lights) {
      l.lx = l.cx + Math.cos(time * l.w + l.phase) * l.ax;
      l.ly = l.cy + Math.sin(time * l.w * 1.3 + l.phase) * l.ay;
      if (!cleared && Math.hypot(p.x - l.lx, p.y - l.ly) < l.r) lit = true;
    }
    if (lit) state.exposure = Math.min(1, state.exposure + dt * 1.6);
    else state.exposure = Math.max(0, state.exposure - dt * 2.2);
    if (state.exposure >= 1 && !cleared) {
      catchMouse("Spotted!");
      return;
    }

    if (def.vacuum && !cleared) {
      const v = def.vacuum;
      v.x = v.x === undefined ? v.x1 : v.x;
      v.dir = v.dir === undefined ? 1 : v.dir;
      v.x += v.dir * v.speed * dt;
      if (v.x > v.x2) { v.x = v.x2; v.dir = -1; }
      if (v.x < v.x1) { v.x = v.x1; v.dir = 1; }
      v.y = v.y;
      if (Math.hypot(p.x - v.x, p.y - v.y) < 34) {
        catchMouse("Vacuumed!");
        return;
      }
    }

    if (def.chef && !cleared) {
      const c = def.chef;
      const target = c.path[Math.floor(state.chefAt) % c.path.length];
      const dx = target.x - state.chefPos.x;
      const dy = target.y - state.chefPos.y;
      const d = Math.hypot(dx, dy);
      if (d < 8) {
        state.chefAt += 1;
      } else {
        state.chefPos.x += (dx / d) * c.speed * dt;
        state.chefPos.y += (dy / d) * c.speed * dt;
      }
      if (Math.hypot(p.x - state.chefPos.x, p.y - state.chefPos.y) < c.vision) {
        catchMouse("The chef saw you!");
        return;
      }
    }

    if (def.cat && !cleared) {
      const c = def.cat;
      if (Math.hypot(p.x - c.x, p.y - c.y) < c.wake) state.catAwake = 3;
      if (state.catAwake > 0) {
        state.catAwake -= dt;
        const dx = p.x - c.x;
        const dy = p.y - c.y;
        const d = Math.max(1, Math.hypot(dx, dy));
        c.x += (dx / d) * 175 * dt;
        c.y += (dy / d) * 175 * dt;
        if (d < 26) {
          catchMouse("The cat got you!");
          return;
        }
      }
    }

    if (def.plates && !cleared) {
      plateTimer -= dt;
      if (plateTimer <= 0) {
        plateTimer = 2.4;
        telegraphs.push({
          x: Math.max(50, Math.min(W - 50, p.x + (Math.random() - 0.5) * 240)),
          y: Math.max(50, Math.min(H - 50, p.y + (Math.random() - 0.5) * 240)),
          r: 46,
          t: 1.0
        });
      }
      for (let i = telegraphs.length - 1; i >= 0; i--) {
        const t = telegraphs[i];
        t.t -= dt;
        if (t.t <= 0) {
          telegraphs.splice(i, 1);
          splats.push({ x: t.x, y: t.y, r: t.r, life: 0.8 });
          if (Math.hypot(p.x - t.x, p.y - t.y) < t.r) {
            catchMouse("Plated!");
            return;
          }
        }
      }
    }
    splats = splats.filter((s) => s.life > 0);
    for (const s of splats) s.life -= dt;

    if (!cleared) {
      state.cheese.forEach((c, i) => {
        if (!c.taken && state.carried < 0 && Math.hypot(p.x - c.x, p.y - c.y) < 26) {
          c.taken = true;
          state.carried = i;
        }
      });
      const hole = def.hole;
      if (state.carried >= 0 && Math.hypot(p.x - hole.x, p.y - hole.y) < 34) {
        state.cheese[state.carried].delivered = true;
        state.carried = -1;
        score += 100;
        if (state.cheese.every((c) => c.delivered)) {
          cleared = true;
          const bonus = 100 * (levelIndex + 1);
          score += bonus;
          message.textContent = `Kitchen cleared! Bonus +${bonus}.`;
          nextBtn.hidden = false;
          if (levelIndex + 1 >= LEVELS.length) {
            const result = recordScore("cheese", score, "high");
            message.textContent = `You robbed the whole kitchen! Final score: ${score}.` + (result.isNew && score > 0 ? " New best!" : ` Best: ${result.best}.`);
            nextBtn.hidden = true;
          }
        }
      }
    }

    if (flash > 0) flash -= dt;
    scoreLabel.textContent = `Score: ${score}`;
    levelLabel.textContent = `Kitchen: ${levelIndex + 1}/${LEVELS.length}`;
    livesLabel.textContent = `Strikes: ${strikes}/3`;
    setSnapshot({
      mode: cleared ? "won" : "playing",
      game: "Cheese Thief",
      level: levelIndex + 1,
      score,
      strikes
    });
  }

  function draw() {
    const def = levelDef();
    ctx.fillStyle = "#4a3524";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 2;
    for (let x = 0; x <= W; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y <= H; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.fillStyle = "#0c0c14";
    ctx.beginPath();
    ctx.arc(def.hole.x, def.hole.y, 24, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(def.hole.x - 24, def.hole.y - 4, 48, 8);
    for (const l of def.lights) {
      const grad = ctx.createRadialGradient(l.lx, l.ly, 6, l.lx, l.ly, l.r);
      grad.addColorStop(0, "rgba(255,240,180,0.85)");
      grad.addColorStop(1, "rgba(255,240,180,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(l.lx, l.ly, l.r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const t of telegraphs) {
      ctx.strokeStyle = `rgba(255,80,80,${0.4 + 0.6 * (1 - t.t)})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    for (const s of splats) {
      ctx.globalAlpha = Math.max(0, s.life);
      ctx.fillStyle = "#e8e2d4";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    state.cheese.forEach((c, i) => {
      if (c.delivered) return;
      const cx = state.carried === i ? state.player.x : c.x;
      const cy = state.carried === i ? state.player.y - 24 : c.y;
      ctx.fillStyle = "#f6c445";
      ctx.strokeStyle = "#7a4a21";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 12, cy + 8);
      ctx.lineTo(cx + 12, cy + 8);
      ctx.lineTo(cx, cy - 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
    const p = state.player;
    if (def.cat) {
      const c = def.cat;
      ctx.fillStyle = "#e8913a";
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#7a4a21";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(state.catAwake > 0 ? "!" : "z", c.x, c.y - c.r - 10);
    }
    if (def.vacuum) {
      const v = def.vacuum;
      ctx.fillStyle = "#394354";
      ctx.strokeStyle = "#0f1320";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(v.x - 22, v.y - 14, 44, 28, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ff6b6b";
      ctx.beginPath();
      ctx.arc(v.x, v.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (def.chef && state.chefPos) {
      ctx.fillStyle = "#fafafa";
      ctx.strokeStyle = "#394354";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(state.chefPos.x, state.chefPos.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fafafa";
      ctx.fillRect(state.chefPos.x - 10, state.chefPos.y - 34, 20, 12);
      ctx.strokeRect(state.chefPos.x - 10, state.chefPos.y - 34, 20, 12);
      ctx.strokeStyle = "rgba(255,107,107,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(state.chefPos.x, state.chefPos.y, def.chef.vision, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "#9aa3b2";
    ctx.strokeStyle = "#0f1320";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x - 10, p.y - 12, 7, 0, Math.PI * 2);
    ctx.arc(p.x + 10, p.y - 12, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#b9c1cf";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#7a8494";
    ctx.beginPath();
    ctx.moveTo(p.x + 12, p.y + 8);
    ctx.quadraticCurveTo(p.x + 24, p.y + 12, p.x + 20, p.y + 24);
    ctx.stroke();
    if (state.exposure > 0) {
      ctx.strokeStyle = `rgba(255,80,80,${state.exposure})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (flash > 0) {
      ctx.fillStyle = `rgba(255,60,60,${flash * 0.5})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function tick(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    if (raf !== 0) raf = requestAnimationFrame(tick);
  }

  function toCanvas(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (W / rect.width),
      y: (e.clientY - rect.top) * (H / rect.height)
    };
  }

  let dragging = false;
  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    dragging = true;
    const p = toCanvas(e);
    state.player.x = Math.max(18, Math.min(W - 18, p.x));
    state.player.y = Math.max(18, Math.min(H - 18, p.y));
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging || cleared) return;
    const p = toCanvas(e);
    state.player.x = Math.max(18, Math.min(W - 18, p.x));
    state.player.y = Math.max(18, Math.min(H - 18, p.y));
  });
  const stopDrag = () => { dragging = false; };
  canvas.addEventListener("pointerup", stopDrag);
  canvas.addEventListener("pointercancel", stopDrag);

  function keydown(e) {
    keys.add(e.key);
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
      e.preventDefault();
    }
  }

  function keyup(e) {
    keys.delete(e.key);
  }

  document.querySelector("#cheeseRetry").addEventListener("click", () => {
    score = scoreAtLevel;
    strikes = 0;
    if (raf === 0) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
    startLevel(levelIndex);
  });
  nextBtn.addEventListener("click", () => {
    if (levelIndex + 1 >= LEVELS.length) return;
    levelIndex += 1;
    scoreAtLevel = score;
    strikes = 0;
    startLevel(levelIndex);
  });
  document.addEventListener("keydown", keydown);
  document.addEventListener("keyup", keyup);
  setSnapshot({ mode: "playing", game: "Cheese Thief", level: 1, score: 0, strikes: 0 });
  activeCleanup = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    document.removeEventListener("keydown", keydown);
    document.removeEventListener("keyup", keyup);
  };
  scoreAtLevel = 0;
  startLevel(0);
  last = performance.now();
  raf = requestAnimationFrame(tick);
}

function startNormalMachine() {
  openGame(
    "Completely Normal Machine",
    "Weird",
    `
      <div class="game-layout">
        <p class="game-message" id="nmMsg">Three buttons. Two levers. One red switch. Zero explanations.</p>
        <div class="nm-panel">
          <div class="nm-readout" id="nmReadout">…ready…</div>
          <div class="nm-meter"><div class="nm-meter-fill" id="nmFill"></div></div>
          <div class="nm-controls">
            <button class="nm-btn nb-a" type="button" data-nbtn="A" aria-label="Button A">A</button>
            <button class="nm-btn nb-b" type="button" data-nbtn="B" aria-label="Button B">B</button>
            <button class="nm-btn nb-c" type="button" data-nbtn="C" aria-label="Button C">C</button>
            <button class="nm-lever" type="button" data-lever="0" aria-label="Lever one">I</button>
            <button class="nm-lever" type="button" data-lever="1" aria-label="Lever two">II</button>
            <button class="nm-switch" type="button" id="nmSwitch" aria-label="Red switch">?</button>
          </div>
          <div class="nm-topline">
            <span>Ducks: <strong id="nmDucks">0</strong></span>
            <span>Discovered: <strong id="nmFound">0/10</strong></span>
          </div>
        </div>
      </div>
    `
  );

  const DISC_KEY = "trinkets-machine-discoveries";
  const DISCOVERIES = [
    "first-ding", "jackpot", "duck1", "duck5", "error42",
    "overdrive", "triple", "zen", "flatline", "dance"
  ];
  let meter = 12;
  let levers = [false, false];
  let ducks = 0;
  let found = [];
  try {
    const saved = JSON.parse(localStorage.getItem(DISC_KEY));
    if (Array.isArray(saved)) found = saved.filter((d) => DISCOVERIES.includes(d));
  } catch (err) {}
  const readout = document.querySelector("#nmReadout");
  const fill = document.querySelector("#nmFill");
  const ducksEl = document.querySelector("#nmDucks");
  const foundEl = document.querySelector("#nmFound");
  const recentPresses = [];
  const leverFlips = { 0: [], 1: [] };
  let timer = 0;

  function saveFound() {
    try {
      localStorage.setItem(DISC_KEY, JSON.stringify(found));
    } catch (err) {}
  }

  function say(text, isError) {
    readout.textContent = text;
    readout.classList.toggle("error", !!isError);
  }

  function discover(id, text) {
    if (!found.includes(id)) {
      found.push(id);
      saveFound();
      recordScore("machine", found.length, "high");
    }
    foundEl.textContent = `${found.length}/${DISCOVERIES.length}`;
    say(`★ Discovered: ${text} (${found.length}/${DISCOVERIES.length})`, false);
  }

  function render() {
    fill.style.width = `${Math.max(0, Math.min(100, meter))}%`;
    ducksEl.textContent = ducks;
    foundEl.textContent = `${found.length}/${DISCOVERIES.length}`;
    setSnapshot({ mode: "playing", game: "Completely Normal Machine", discovered: found.length });
  }

  function pressButton(btn, name) {
    btn.classList.add("pressed");
    setTimeout(() => btn.classList.remove("pressed"), 140);
    meter = Math.min(100, meter + 4 + Math.random() * 6);
    const now = performance.now();
    recentPresses.push({ name, at: now });
    while (recentPresses.length && now - recentPresses[0].at > 2500) recentPresses.shift();
    const names = recentPresses.map((p) => p.name);
    if (names.includes("A") && names.includes("B") && names.includes("C")) {
      recentPresses.length = 0;
      ducks += 1;
      discover("triple", "Triple Press — the machine sneezed out a duck");
    } else if (Math.random() < 0.12) {
      say("DING.", false);
      discover("first-ding", "First Ding");
    } else {
      say(`${name} goes ${["clack", "thunk", "boop", "clunk"][Math.floor(Math.random() * 4)]}.`, false);
    }
    if (meter >= 100) {
      meter = 20;
      discover("jackpot", "Jackpot — the meter overflowed gloriously");
    }
    render();
  }

  document.querySelectorAll("[data-nbtn]").forEach((btn) => {
    btn.addEventListener("click", () => pressButton(btn, btn.dataset.nbtn));
  });

  document.querySelectorAll("[data-lever]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.lever);
      levers[i] = !levers[i];
      btn.classList.toggle("up", levers[i]);
      const now = performance.now();
      leverFlips[i].push(now);
      while (leverFlips[i].length && now - leverFlips[i][0] > 4000) leverFlips[i].shift();
      if (leverFlips[i].length >= 5) {
        leverFlips[i].length = 0;
        discover("dance", "Lever Dance");
      } else {
        say(`Lever ${i === 0 ? "I" : "II"} ${levers[i] ? "UP" : "DOWN"}.`, false);
      }
      if (levers[0] && levers[1]) discover("overdrive", "Overdrive — both levers up");
      render();
    });
  });

  document.querySelector("#nmSwitch").addEventListener("click", () => {
    const roll = Math.random();
    if (roll < 0.3) {
      ducks += 1;
      say("QUACK.", false);
      discover("duck1", "First Duck");
      if (ducks >= 5) discover("duck5", "Duck Plague — five ducks");
    } else if (roll < 0.5) {
      meter = Math.max(0, meter / 2);
      say("ERROR 42", true);
      discover("error42", "ERROR 42");
    } else if (roll < 0.7) {
      meter = Math.min(100, meter + 30);
      say("The machine hums with sudden purpose.", false);
    } else if (roll < 0.85) {
      levers = [Math.random() < 0.5, Math.random() < 0.5];
      document.querySelectorAll("[data-lever]").forEach((btn) => {
        btn.classList.toggle("up", levers[Number(btn.dataset.lever)]);
      });
      say("The levers rearrange themselves. Rude.", false);
    } else {
      say("…nothing happens.", false);
      discover("zen", "Zen Switch — the sound of one switch not switching");
    }
    if (meter >= 100) {
      meter = 20;
      discover("jackpot", "Jackpot — the meter overflowed gloriously");
    }
    render();
  });

  timer = setInterval(() => {
    if (levers[0] && levers[1]) meter += 6;
    else if (!levers[0] && !levers[1]) meter -= 4;
    else meter += 1;
    meter = Math.max(0, Math.min(100, meter));
    if (meter <= 0) discover("flatline", "Flatline — the meter hit zero");
    if (meter >= 100) {
      meter = 20;
      discover("jackpot", "Jackpot — the meter overflowed gloriously");
    }
    render();
  }, 400);

  render();
  activeCleanup = () => {
    clearInterval(timer);
  };
}

Object.assign(gameStarters, {
  magnet: startMagnetMess,
  ice: startIceCube,
  coin: startCoinFlip,
  cheese: startCheeseThief,
  machine: startNormalMachine
});
