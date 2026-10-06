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
  document.querySelector("#one1P").addEventListener("click", ()=>setTwoP(false));
  document.querySelector("#one2P").addEventListener("click", ()=>setTwoP(true));
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
    const p = toCanvas(e);
    // The magnet (r=26) is small compared to the 720x480 canvas.
    // Only grab when the tap starts on/near the magnet — otherwise
    // tapping empty space would yank the magnet across the board.
    if (Math.hypot(p.x - mag.x, p.y - mag.y) > mag.r + 22) return;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    grab = true;
    grabDX = mag.x - p.x;
    grabDY = mag.y - p.y;
    mag.vx = 0;
    mag.vy = 0;
    lastPX = p.x;
    lastPY = p.y;
    lastPT = performance.now();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!grab) return;
    const p = toCanvas(e);
    mag.x = Math.min(W - mag.r, Math.max(mag.r, p.x + grabDX));
    mag.y = Math.min(H - mag.r, Math.max(mag.r, p.y + grabDY));
    const now = performance.now();
    const dt = Math.max(8, now - lastPT) / 1000;
    // Velocity must be in canvas pixels/sec (physics space), not client
    // pixels/sec, so the fling stays correct when CSS scales the canvas.
    mag.vx = (p.x - lastPX) / dt;
    mag.vy = (p.y - lastPY) / dt;
    lastPX = p.x;
    lastPY = p.y;
    lastPT = now;
  });
  const releaseMag = () => { grab = false; };
  canvas.addEventListener("pointerup", releaseMag);
  canvas.addEventListener("pointercancel", releaseMag);

  function keydown(e) {
    if (e.code === "Space") {
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
  let animating = false;
  let hideCube = false;
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
    if (won || movesLeft <= 0 || animating) return;
    const [dx, dy] = DIRS[dir];
    const [nx, ny] = iceSlide(board, cx, cy, dx, dy);
    if (nx === cx && ny === cy) return;
    const ox = cx;
    const oy = cy;
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
    animateSlide(ox, oy);
  }

  function animateSlide(ox, oy) {
    animating = true;
    hideCube = true;
    render();
    const first = grid.querySelector(".ice-cell");
    const cw = first ? first.getBoundingClientRect().width : 48;
    const gap = 6;
    const dist = Math.abs(cx - ox) + Math.abs(cy - oy);
    const dur = Math.min(650, 110 + dist * 90);
    const ghost = document.createElement("div");
    ghost.className = "ice-ghost";
    const inner = document.createElement("div");
    inner.className = "ice-cube" + (won ? " landed" : "");
    const shrink = budget > 0 ? 0.55 + 0.45 * (movesLeft / budget) : 1;
    inner.style.transform = `scale(${shrink.toFixed(2)})`;
    ghost.append(inner);
    ghost.style.width = cw + "px";
    ghost.style.height = cw + "px";
    ghost.style.transition = "none";
    ghost.style.left = (ox * (cw + gap)) + "px";
    ghost.style.top = (oy * (cw + gap)) + "px";
    grid.append(ghost);
    requestAnimationFrame(() => {
      ghost.style.transition = `left ${dur}ms linear, top ${dur}ms linear`;
      ghost.style.left = (cx * (cw + gap)) + "px";
      ghost.style.top = (cy * (cw + gap)) + "px";
    });
    setTimeout(() => {
      ghost.remove();
      hideCube = false;
      animating = false;
      render();
    }, dur + 60);
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
        if (x === cx && y === cy && !hideCube) {
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
    if (animating) return;
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
    if (animating) return;
    cx = startX;
    cy = startY;
    movesLeft = budget;
    won = false;
    history = [];
    message.textContent = "Slide the cube onto the gold ring before it melts.";
    render();
  });
  document.querySelector("#iceNext").addEventListener("click", () => {
    if (animating) return;
    newBoard();
  });
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

  function coinHit(p) {
    return Math.hypot(p.x - CX, p.y - coin.y) < R + 34;
  }

  function onDown(e) {
    e.preventDefault();
    const now = performance.now();
    const p = toCanvas(e);
    // The coin (R=64 at CX) is small vs the 720x420 canvas — only taps
    // starting on the coin may flip / spin / catch / stop. Taps on empty
    // felt are ignored so they can't yank the game state.
    if (coin.mode === "spinning") {
      if (coinHit(p)) stopSpin();
      return;
    }
    if (coin.mode === "flying") {
      if (Math.hypot(p.x - CX, p.y - coin.y) < R + 30) {
        const face = Math.cos(coin.angle) >= 0 ? "H" : "T";
        coin.mode = "idle";
        coin.y = FLOOR - R;
        burst(CX, coin.y, 10);
        settle(face, "caught");
      }
      return;
    }
    if (!coinHit(p)) return;
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
          <span class="game-stat" id="cheeseLevel">Kitchen: 1/4</span>
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
      hint: "Drag to sneak. Grab cheese. Get home. Mind the sweeping light.",
      cheese: [{ x: 620, y: 90 }, { x: 620, y: 390 }, { x: 360, y: 240 }],
      hole: { x: 70, y: 410 },
      furniture: [{ x: 300, y: 180, w: 120, h: 40 }],
      lamps: [{ x: 360, y: 240, range: 210, half: 0.42, speed: 0.5, phase: 0 }],
      chefs: [],
      cat: null,
      vacuum: null,
      plates: false
    },
    {
      hint: "The cat naps. Probably. Don't wake it.",
      cheese: [{ x: 630, y: 80 }, { x: 630, y: 400 }, { x: 360, y: 120 }, { x: 200, y: 400 }],
      hole: { x: 70, y: 410 },
      furniture: [{ x: 140, y: 160, w: 120, h: 40 }, { x: 440, y: 280, w: 120, h: 40 }],
      lamps: [{ x: 360, y: 240, range: 200, half: 0.4, speed: 0.6, phase: 1 }],
      chefs: [],
      cat: { x: 360, y: 360, r: 26, wake: 86 },
      vacuum: null,
      plates: false
    },
    {
      hint: "The chef patrols. Watch the dotted path — and his eyes.",
      cheese: [{ x: 640, y: 70 }, { x: 640, y: 410 }, { x: 360, y: 240 }, { x: 120, y: 240 }],
      hole: { x: 70, y: 410 },
      furniture: [{ x: 240, y: 60, w: 40, h: 140 }, { x: 440, y: 280, w: 40, h: 140 }, { x: 300, y: 380, w: 120, h: 40 }],
      lamps: [{ x: 360, y: 240, range: 190, half: 0.38, speed: 0.55, phase: 0 }],
      chefs: [{ path: [{ x: 150, y: 120 }, { x: 570, y: 120 }, { x: 570, y: 340 }, { x: 150, y: 340 }], speed: 95, range: 150, half: 0.5 }],
      cat: null,
      vacuum: null,
      plates: false
    },
    {
      hint: "Full house. Everything is faster. Also: falling plates.",
      cheese: [{ x: 640, y: 70 }, { x: 640, y: 410 }, { x: 360, y: 120 }, { x: 360, y: 360 }, { x: 120, y: 90 }],
      hole: { x: 70, y: 410 },
      furniture: [{ x: 240, y: 60, w: 40, h: 140 }, { x: 440, y: 280, w: 40, h: 140 }],
      lamps: [{ x: 360, y: 240, range: 200, half: 0.4, speed: 0.85, phase: 0 }],
      chefs: [{ path: [{ x: 200, y: 80 }, { x: 520, y: 80 }, { x: 520, y: 400 }, { x: 200, y: 400 }], speed: 120, range: 160, half: 0.5 }],
      cat: { x: 580, y: 290, r: 26, wake: 86 },
      vacuum: { x1: 140, x2: 580, y: 240, speed: 160 },
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
  let sus = 0;
  let spotX = 0;
  let spotY = 0;
  let plateTimer = 0;
  let telegraphs = [];
  let splats = [];
  let flash = 0;
  let cleared = false;

  function startLevel(index) {
    const def = LEVELS[index];
    state = {
      player: { x: def.hole.x, y: def.hole.y - 60 },
      cheese: def.cheese.map((c) => ({ ...c, home: { ...c }, taken: false, delivered: false })),
      carried: -1,
      catAwake: 0,
      catHome: def.cat ? { ...def.cat } : null,
      catPos: def.cat ? { x: def.cat.x, y: def.cat.y } : null,
      protect: 1.5
    };
    sus = 0;
    telegraphs = [];
    splats = [];
    cleared = false;
    plateTimer = 2;
    nextBtn.hidden = true;
    for (const chef of def.chefs) {
      chef.leg = 0;
      chef.pos = { ...chef.path[0] };
      chef.face = Math.PI / 2;
    }
    if (def.vacuum) {
      def.vacuum.x = def.vacuum.x1;
      def.vacuum.dir = 1;
    }
    message.textContent = def.hint;
    render();
  }

  function levelDef() {
    return LEVELS[levelIndex];
  }

  function collideFurniture(p, r) {
    for (const f of levelDef().furniture) {
      const cx = Math.max(f.x, Math.min(p.x, f.x + f.w));
      const cy = Math.max(f.y, Math.min(p.y, f.y + f.h));
      const dx = p.x - cx;
      const dy = p.y - cy;
      const d = Math.hypot(dx, dy);
      if (d < r) {
        if (d === 0) {
          p.y = f.y - r;
        } else {
          p.x = cx + (dx / d) * r;
          p.y = cy + (dy / d) * r;
        }
      }
    }
  }

  function losClear(x1, y1, x2, y2) {
    const furniture = levelDef().furniture;
    const d = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.max(1, Math.ceil(d / 8));
    for (let i = 1; i < steps; i++) {
      const x = x1 + ((x2 - x1) * i) / steps;
      const y = y1 + ((y2 - y1) * i) / steps;
      for (const f of furniture) {
        if (x > f.x && x < f.x + f.w && y > f.y && y < f.y + f.h) return false;
      }
    }
    return true;
  }

  function inCone(px, py, ex, ey, facing, half, range) {
    const dx = px - ex;
    const dy = py - ey;
    const d = Math.hypot(dx, dy);
    if (d > range) return false;
    let a = Math.atan2(dy, dx) - facing;
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return Math.abs(a) < half;
  }

  function hurt(reason) {
    if (cleared || state.protect > 0) return false;
    catchMouse(reason);
    return true;
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
    state.protect = 1.5;
    sus = 0;
    telegraphs = [];
    if (state.catPos && state.catHome) {
      state.catPos.x = state.catHome.x;
      state.catPos.y = state.catHome.y;
      state.catAwake = 0;
    }
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
    collideFurniture(p, 14);
    if (state.protect > 0) state.protect -= dt;

    let seen = false;
    for (const lamp of def.lamps) {
      const ang = time * lamp.speed + lamp.phase;
      lamp.angle = ang;
      if (!cleared && inCone(p.x, p.y, lamp.x, lamp.y, ang, lamp.half, lamp.range) && losClear(lamp.x, lamp.y, p.x, p.y)) {
        seen = true;
        spotX = lamp.x;
        spotY = lamp.y;
      }
    }
    for (const chef of def.chefs) {
      if (!chef.leg) chef.leg = 0;
      if (!chef.pos) chef.pos = { ...chef.path[0] };
      if (!cleared) {
        const target = chef.path[Math.floor(chef.leg) % chef.path.length];
        const dx = target.x - chef.pos.x;
        const dy = target.y - chef.pos.y;
        const d = Math.hypot(dx, dy);
        if (d < 10) {
          chef.leg += 1;
        } else {
          chef.pos.x += (dx / d) * chef.speed * dt;
          chef.pos.y += (dy / d) * chef.speed * dt;
          chef.face = Math.atan2(dy, dx);
        }
        if (inCone(p.x, p.y, chef.pos.x, chef.pos.y, chef.face || 0, chef.half, chef.range) && losClear(chef.pos.x, chef.pos.y, p.x, p.y)) {
          seen = true;
          spotX = chef.pos.x;
          spotY = chef.pos.y;
        }
      }
    }
    if (seen && !cleared && state.protect <= 0) sus = Math.min(1, sus + dt * 1.4);
    else sus = Math.max(0, sus - dt * 1.1);
    if (sus >= 1 && !cleared) {
      if (hurt("Spotted!")) return;
    }

    if (def.vacuum && !cleared) {
      const v = def.vacuum;
      if (v.x === undefined) {
        v.x = v.x1;
        v.dir = 1;
      }
      v.x += v.dir * v.speed * dt;
      if (v.x > v.x2) { v.x = v.x2; v.dir = -1; }
      if (v.x < v.x1) { v.x = v.x1; v.dir = 1; }
      if (Math.hypot(p.x - v.x, p.y - v.y) < 34) {
        if (hurt("Vacuumed!")) return;
      }
    }

    if (def.cat && state.catPos && !cleared) {
      const c = def.cat;
      if (Math.hypot(p.x - state.catPos.x, p.y - state.catPos.y) < c.wake) {
        state.catAwake = 4;
      }
      if (state.catAwake > 0) {
        state.catAwake -= dt;
        const dx = p.x - state.catPos.x;
        const dy = p.y - state.catPos.y;
        const d = Math.max(1, Math.hypot(dx, dy));
        state.catPos.x += (dx / d) * 190 * dt;
        state.catPos.y += (dy / d) * 190 * dt;
        collideFurniture(state.catPos, c.r);
        if (d < c.r + 14) {
          if (hurt("The cat got you!")) return;
        }
        if (state.catAwake <= 0) {
          state.catPos.x = state.catHome.x;
          state.catPos.y = state.catHome.y;
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
            if (hurt("Plated!")) return;
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

  function drawCone(x, y, ang, half, range, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, range, ang - half, ang + half);
    ctx.closePath();
    ctx.fill();
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
    for (const f of def.furniture) {
      ctx.fillStyle = "#7a5c3e";
      ctx.strokeStyle = "#2e1f14";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(f.x, f.y, f.w, f.h, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(f.x + 8, f.y + 8, f.w - 16, 6);
    }
    if (def.chefs && def.chefs.length) {
      for (const chef of def.chefs) {
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        chef.path.forEach((wp, i) => {
          if (i === 0) ctx.moveTo(wp.x, wp.y);
          else ctx.lineTo(wp.x, wp.y);
        });
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    ctx.fillStyle = "#0c0c14";
    ctx.beginPath();
    ctx.arc(def.hole.x, def.hole.y, 24, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(def.hole.x - 24, def.hole.y - 4, 48, 8);
    for (const lamp of def.lamps) {
      const ang = lamp.angle === undefined ? lamp.phase : lamp.angle;
      drawCone(lamp.x, lamp.y, ang, lamp.half, lamp.range, "rgba(255,240,180,0.28)");
      ctx.fillStyle = "#394354";
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffe9a8";
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, 5, 0, Math.PI * 2);
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
    if (def.cat && state.catPos) {
      const c = def.cat;
      ctx.fillStyle = "#e8913a";
      ctx.strokeStyle = "#7a4a21";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(state.catPos.x, state.catPos.y, c.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(state.catAwake > 0 ? "!" : "z", state.catPos.x, state.catPos.y - c.r - 10);
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
    for (const chef of def.chefs) {
      if (!chef.pos) continue;
      drawCone(chef.pos.x, chef.pos.y, chef.face || 0, chef.half, chef.range, "rgba(255,107,107,0.18)");
      ctx.fillStyle = "#fafafa";
      ctx.strokeStyle = "#394354";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(chef.pos.x, chef.pos.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    ctx.fillStyle = "#fafafa";
    ctx.fillRect(chef.pos.x - 10, chef.pos.y - 34, 20, 12);
    ctx.strokeRect(chef.pos.x - 10, chef.pos.y - 34, 20, 12);
  }
  ctx.save();
  if (state.protect > 0) ctx.globalAlpha = 0.55;
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
    ctx.restore();
    if (sus > 0) {
      ctx.fillStyle = `rgba(255,80,80,${Math.min(1, sus + 0.2)})`;
      ctx.font = "bold 26px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(sus > 0.5 ? "!" : "?", spotX, spotY - 24);
      ctx.strokeStyle = `rgba(255,80,80,${sus})`;
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
    if (raf !== 0) raf = requestAnimationFrame(tick);
    update(dt);
    draw();
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
    collideFurniture(state.player, 14);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging || cleared) return;
    const p = toCanvas(e);
    state.player.x = Math.max(18, Math.min(W - 18, p.x));
    state.player.y = Math.max(18, Math.min(H - 18, p.y));
    collideFurniture(state.player, 14);
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
  machine: startNormalMachine,
  onebutton: startOneButton
});

function startOneButton() {
  openGame(
    "One Button",
    "Arcade",
    `
      <div class="game-layout">
        <div class="game-topline">
          <span class="game-stat" id="oneScore">0 m</span>
          <span class="game-stat" id="oneP2Score" style="display:none">P2: 0 m</span>
          <span class="game-stat" id="oneBest">Best: 0 m</span>
          <span class="game-stat" id="oneChaos">CHAOS 0%</span>
        </div>
        <div class="tag-row" role="group" aria-label="Players">
          <span class="tag-label">Players</span>
          <button class="game-action tag-pick on" id="one1P" type="button">1 Player</button>
          <button class="game-action tag-pick" id="one2P" type="button" title="P1: SPACE/W · P2: ↑ — last runner wins">2 Players</button>
        </div>
        <canvas class="one-canvas" id="oneCanvas" width="720" height="480"></canvas>
        <div class="game-actions">
          <button class="game-action one-press" id="oneBtn" type="button">PRESS (P1)</button>
          <button class="game-action one-press" id="oneBtn2" type="button" style="display:none">PRESS (P2)</button>
        </div>
        <p class="game-message" id="oneMsg">One button. Press to jump. That's the whole game. Probably.</p>
      </div>
    `
  );

  const canvas = document.querySelector("#oneCanvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const FLOOR = H - 70;
  const CEIL = 70;
  const PX = 150;
  const PW = 30;
  const PH = 38;
  const scoreLabel = document.querySelector("#oneScore");
  const bestLabel = document.querySelector("#oneBest");
  const chaosLabel = document.querySelector("#oneChaos");
  const message = document.querySelector("#oneMsg");
  const pressBtn = document.querySelector("#oneBtn");
  const pressBtn2 = document.querySelector("#oneBtn2");
  const p2ScoreEl = document.querySelector("#oneP2Score");

  // --- 2P: last runner standing. Two runners, shared chaos. ---
  let twoP = false;
  let alive1 = true;
  let alive2 = false;
  let distAtDeath1 = 0;
  let distAtDeath2 = 0;
  const PX1 = 130;
  const PX2 = 190;
  function pxFor(i){ return i===1 ? PX2 : (twoP ? PX1 : PX); }

  function setTwoP(on){
    twoP = on;
    document.querySelector("#one1P").classList.toggle("on", !on);
    document.querySelector("#one2P").classList.toggle("on", on);
    p2ScoreEl.style.display = on ? "" : "none";
    pressBtn.textContent = on ? "PRESS (P1)" : "PRESS";
    pressBtn2.style.display = on ? "" : "none";
    resetRun();
    message.textContent = on ? "P1: SPACE/W · P2: ↑ — last runner wins!" : "One button. Press to jump. That's the whole game. Probably.";
    syncHud();
  }

  const QUIPS = [
    "SPLAT.",
    "The floor sends regards.",
    "Gravity remains undefeated.",
    "Ouch. Ouch ouch ouch.",
    "That one looked expensive.",
    "Too late. Or early. One of those."
  ];
  const FLAVOR = [
    "The floor is lava. Just kidding. Unless?",
    "Have you tried jumping?",
    "The button sends its regards.",
    "SNAKES. (there are no snakes.)",
    "No refunds.",
    "Looking good. Keep jumping."
  ];

  let raf = 0;
  let last = performance.now();
  let time = 0;
  let dead = false;
  let deadT = 0;
  let dist = 0;
  let best = 0;
  try {
    best = Number(readScores().onebutton) || 0;
  } catch (err) {}
  let speed = 280;
  let g = 1;
  let gravMul = 1;
  let jumpMul = 1;
  let chaos = 0;
  let shownTiers = {};
  let player = { y: FLOOR - PH / 2, vy: 0, grounded: true, coyote: 0, buffer: 0 };
  let player2 = { y: FLOOR - PH / 2, vy: 0, grounded: true, coyote: 0, buffer: 0 };
  let obstacles = [];
  let parts = [];
  let ghosts = [];
  let ghostT = 0;
  let nextSpawn = 300;
  let banner = null;
  let flavorT = 16;
  let eventT = 9;
  let moleT = 14;
  let warnT = 0;
  let lastDodgeMsg = 0;
  let cam = { zoom: 1, zoomT: 1, rot: 0, rotT: 0, shake: 0 };
  let pressMode = "green";
  let modeT = 14;
  let holding = false;
  let holdT = 0;
  let jumpPower = 1;
  let lastTapT = 0;
  let tapCount = 0;
  let delayQueue = [];
  let delayT = 0;
  let reverseT = 0;
  let bpm = 100;
  let beatT = 0;
  let beatPulse = 0;
  let tempoMul = 1;
  let tempoT = 0;
  let lieScoreT = 0;
  let fakeScore = 0;
  let liarQueue = [];
  let liarT = 0;
  let frozen = null;
  let flipMode = 0;
  let flipT = 0;
  let decoys = [];
  let uiDanceT = 0;
  let textShakeT = 0;
  let flashWhite = 0;
  let teleportT = 8;
  let dodgeX = 0;
  let dodgeY = 0;

  function showBanner(text) {
    banner = { text, t: 2.4 };
  }

  function jumpAttempt(idx) {
    const who = idx===1 ? 1 : 0;
    const pl = who===1 ? player2 : player;
    const alive = who===1 ? alive2 : alive1;
    if (twoP && !alive) return;
    if (dead || frozen) return;
    if (pl.grounded || pl.coyote > 0) {
      pl.vy = -950 * g * jumpPower;
      jumpPower = 1;
      pl.grounded = false;
      pl.coyote = 0;
      pl.buffer = 0;
    } else {
      pl.buffer = 0.12;
    }
  }

  function pressDown(idx) {
    const who = idx===1 ? 1 : 0;
    if (twoP && !(who===0 ? alive1 : alive2)) return;
    if (dead || frozen) return;
    const now = performance.now();
    if (delayT > 0) {
      delayQueue.push({ t: now + 500, who });
      return;
    }
    if (reverseT > 0) {
      const pl = who===1 ? player2 : player;
      if (!pl.grounded) {
        pl.vy = 1400 * g;
        pl.buffer = 0;
      } else if (now - lastDodgeMsg > 2500) {
        lastDodgeMsg = now;
        message.textContent = "no. down, not up.";
      }
      return;
    }
    if (pressMode === "red") {
      const pl = who===1 ? player2 : player;
      if (!pl.grounded) {
        pl.vy *= 0.3;
        cam.shake = Math.min(14, cam.shake + 6);
      } else if (now - lastDodgeMsg > 2500) {
        lastDodgeMsg = now;
        message.textContent = "red means NO.";
      }
      return;
    }
    if (pressMode === "blue") {
      if (now - lastTapT < 350) {
        tapCount = 0;
        jumpAttempt(who);
      } else {
        tapCount = 1;
        if (now - lastDodgeMsg > 2500) {
          lastDodgeMsg = now;
          message.textContent = "twice. TWO.";
        }
      }
      lastTapT = now;
      return;
    }
    if (pressMode === "purple") {
      if (now - lastTapT > 600) tapCount = 0;
      tapCount += 1;
      lastTapT = now;
      if (tapCount >= 3) {
        tapCount = 0;
        jumpAttempt(who);
      } else if (now - lastDodgeMsg > 2500) {
        lastDodgeMsg = now;
        message.textContent = "three. THREE.";
      }
      return;
    }
    if (pressMode === "yellow") {
      holding = true;
      holdT = 0;
      return;
    }
    jumpAttempt(who);
  }

  function pressUp(idx) {
    const who = idx===1 ? 1 : 0;
    if (!holding) return;
    holding = false;
    if (pressMode !== "yellow" || dead || frozen) {
      jumpPower = 1;
      return;
    }
    jumpPower = holdT >= 0.45 ? 1.55 : 0.45;
    jumpAttempt(who);
  }

  function burst(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 80 + Math.random() * 220;
      parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, life: 0.7, max: 0.7, color });
    }
  }

  function syncHudOne(){
    const d = Math.floor(dist);
    if (twoP) {
      scoreLabel.textContent = `P1: ${alive1 ? d : distAtDeath1} m`;
      p2ScoreEl.textContent = `P2: ${alive2 ? d : distAtDeath2} m`;
    } else {
      scoreLabel.textContent = `${d} m`;
    }
    chaosLabel.textContent = chaosLabelText();
  }

  function finishMatchOne(){
    dead = true;
    deadT = 1.4;
    const d1 = distAtDeath1 || Math.floor(dist);
    const d2 = distAtDeath2 || Math.floor(dist);
    let title;
    if (d1 > d2) title = "P1 WINS!";
    else if (d2 > d1) title = "P2 WINS!";
    else title = "DRAW!";
    message.textContent = `${title} P1 ${d1} m · P2 ${d2} m · Best ${best} m.`;
    bestLabel.textContent = `Best: ${best} m`;
    burst(PX1, player.y, 12, "#f59f00");
    burst(PX2, player2.y, 12, "#74c0fc");
    setSnapshot({ mode: "ended", game: "One Button", dist: Math.max(d1,d2), best, chaos: Math.floor(chaos), twoP:true, p1:d1, p2:d2 });
  }

  function die(idx) {
    const who = (idx===1 ? 1 : 0);
    if (twoP) {
      const d = Math.floor(dist);
      if (who===1) {
        if (!alive2) return;
        alive2 = false; distAtDeath2 = d;
        burst(PX2, player2.y, 18, "#74c0fc");
        if (alive1) { message.textContent = "P2 wiped! P1 keeps running…"; syncHudOne(); return; }
      } else {
        if (!alive1) return;
        alive1 = false; distAtDeath1 = d;
        burst(PX1, player.y, 18, "#ff6b6b");
        if (alive2) { message.textContent = "P1 wiped! P2 keeps running…"; syncHudOne(); return; }
      }
      finishMatchOne();
      return;
    }
    if (dead) return;
    dead = true;
    deadT = 1.4;
    const d = Math.floor(dist);
    const result = recordScore("onebutton", d, "high");
    best = Math.max(best, result.best);
    message.textContent = QUIPS[Math.floor(Math.random() * QUIPS.length)] + (result.isNew && d > 0 ? ` New best: ${d} m!` : ` Best: ${best} m.`);
    bestLabel.textContent = `Best: ${best} m`;
    burst(PX, player.y, 18, "#ff6b6b");
    setSnapshot({ mode: "ended", game: "One Button", dist: d, best, chaos: Math.floor(chaos) });
  }

  function resetRun() {
    dead = false;
    alive1 = true;
    alive2 = twoP;
    distAtDeath1 = 0;
    distAtDeath2 = 0;
    dist = 0;
    speed = 280;
    g = 1;
    gravMul = 1;
    jumpMul = 1;
    chaos = 0;
    shownTiers = {};
    obstacles = [];
    parts = [];
    ghosts = [];
    nextSpawn = 300;
    banner = null;
    flavorT = 16;
    eventT = 9;
    moleT = 14;
    warnT = 0;
    pressMode = "green";
    modeT = 14;
    holding = false;
    jumpPower = 1;
    tapCount = 0;
    delayQueue = [];
    delayT = 0;
    reverseT = 0;
    bpm = 100;
    beatT = 0;
    tempoMul = 1;
    tempoT = 0;
    lieScoreT = 0;
    liarQueue = [];
    liarT = 0;
    frozen = null;
    flipMode = 0;
    flipT = 0;
    uiDanceT = 0;
    textShakeT = 0;
    flashWhite = 0;
    cam.zoom = 1;
    cam.zoomT = 1;
    cam.rot = 0;
    cam.rotT = 0;
    cam.shake = 0;
    clearDecoys();
    player = { y: FLOOR - PH / 2, vy: 0, grounded: true, coyote: 0, buffer: 0 };
    player2 = { y: FLOOR - PH / 2, vy: 0, grounded: true, coyote: 0, buffer: 0 };
    pressBtn.style.transform = "";
    pressBtn.style.opacity = "";
    pressBtn.style.rotate = "";
    if (pressBtn2) { pressBtn2.style.transform = ""; pressBtn2.style.opacity = ""; pressBtn2.style.rotate = ""; }
    setPressLook();
    message.classList.remove("tshake");
    message.textContent = twoP ? "P1: SPACE/W · P2: ↑ — last runner wins!" : "One button. Press to jump. That's the whole game. Probably.";
  }

  function chaosTier() {
    if (chaos >= 100) return 6;
    if (chaos >= 70) return 5;
    if (chaos >= 50) return 4;
    if (chaos >= 40) return 3;
    if (chaos >= 30) return 2;
    if (chaos >= 20) return 1;
    return 0;
  }

  function announceTier(tier) {
    if (shownTiers[tier]) return;
    shownTiers[tier] = true;
    if (tier === 1) showBanner("SOMETHING IS WRONG");
    else if (tier === 2) showBanner("DO NOT TRUST THE GAPS");
    else if (tier === 3) showBanner("GRAVITY IS NEGOTIABLE");
    else if (tier === 4) showBanner("THE CAMERA IS DRUNK");
    else if (tier === 5) showBanner("THE BUTTON IS THE ENEMY");
    else if (tier === 6) {
      showBanner("CHAOS. GOOD LUCK.");
      message.textContent = "GOOD LUCK.";
    }
  }

  function spawnPattern() {
    const tier = chaosTier();
    const ci = Math.min(chaos, 120) / 100;
    const roll = Math.random();
    const side = Math.random() < 0.75 ? g : -g;
    const micro = tier >= 5 && Math.random() < 0.3;
    if (roll < 0.24) {
      const h = micro ? 24 + Math.random() * 20 : 36 + Math.random() * 48;
      obstacles.push({ kind: "block", x: W + 40, w: 30 + Math.random() * 26, h, side });
    } else if (roll < 0.42) {
      const w = micro ? 60 + Math.random() * 40 : 90 + Math.random() * 110;
      obstacles.push({ kind: "pit", x: W + 40, w, side });
    } else if (roll < 0.56 && tier >= 1) {
      const low = Math.random() < 0.6;
      obstacles.push({ kind: "fly", x: W + 40, r: 14 + Math.random() * 5, low, side, phase: Math.random() * 6 });
    } else if (roll < 0.66 && tier >= 2) {
      obstacles.push({ kind: "fake", x: W + 40, w: 30 + Math.random() * 26, h: 36 + Math.random() * 48, side });
    } else if (roll < 0.74 && tier >= 2) {
      obstacles.push({ kind: "fakepit", x: W + 40, w: 90 + Math.random() * 90, side });
    } else if (roll < 0.84 && tier >= 1) {
      const fast = (0.5 + Math.random()) * (80 + ci * 220);
      obstacles.push({ kind: "block", x: W + 40, w: 30, h: 40 + Math.random() * 40, side, vx: -fast, sine: 14 + ci * 26, sfreq: 2 + Math.random() * 2, sphase: Math.random() * 6, flipT: 1 + Math.random() * 2 });
    } else if (roll < 0.9 && tier >= 4) {
      obstacles.push({ kind: "block", x: -60, w: 30, h: 40 + Math.random() * 40, side, vx: speed * (1.2 + ci * 0.6) });
    } else if (roll < 0.95 && tier >= 4) {
      obstacles.push({ kind: "fall", x: 200 + Math.random() * (W - 200), y: -40, w: 30, h: 30 + Math.random() * 30, vy: 260 + ci * 320 });
    } else {
      obstacles.push({ kind: "block", x: W + 40, w: 30, h: 36 + Math.random() * 40, side: -side });
    }
    if (tier >= 5 && Math.random() < 0.3) {
      const h = 30 + Math.random() * 40;
      obstacles.push({ kind: "block", x: W + 120 + Math.random() * 60, w: 28, h, side });
    }
  }

  function checkUnlocks() {
    announceTier(chaosTier());
  }

  function overFloor(x) {
    for (const o of obstacles) {
      if (o.kind !== "pit" || o.side !== g) continue;
      if (x + PW / 2 > o.x && x - PW / 2 < o.x + o.w) return false;
    }
    return true;
  }

  function flyY(o) {
    const base = o.side === 1 ? FLOOR - 60 : CEIL + 60;
    const lift = o.low ? 0 : -140 * o.side;
    return base + lift + Math.sin(time * 3 + o.phase) * 22;
  }

  function blockRect(o) {
    const ox = o.x + (o.sine ? Math.sin(time * o.sfreq + o.sphase) * o.sine : 0);
    const by = o.side === 1 ? FLOOR - o.h : CEIL;
    return { x: ox, y: by, w: o.w, h: o.h };
  }

  function collides(o, idx) {
    const who = idx === 1 ? 1 : 0;
    const px = who === 1 ? PX2 : pxFor(who);
    const pl = who === 1 ? player2 : player;
    if (o.kind === "fake" || o.kind === "fakepit") return false;
    if (o.kind === "block") {
      const r = blockRect(o);
      return px + PW / 2 > r.x && px - PW / 2 < r.x + r.w &&
        pl.y + PH / 2 > r.y && pl.y - PH / 2 < r.y + r.h;
    }
    if (o.kind === "fall") {
      return px + PW / 2 > o.x && px - PW / 2 < o.x + o.w &&
        pl.y + PH / 2 > o.y && pl.y - PH / 2 < o.y + o.h;
    }
    if (o.kind === "fly") {
      const fy = flyY(o);
      const cx = Math.max(o.x - o.r, Math.min(px, o.x + o.r));
      const cy = Math.max(fy - o.r, Math.min(pl.y, fy + o.r));
      const dx = px - cx;
      const dy = pl.y - cy;
      return dx * dx + dy * dy < (o.r + 12) * (o.r + 12) * 0.5;
    }
    return false;
  }

  function setPressLook() {
    if (pressMode === "green") {
      pressBtn.style.background = "";
      pressBtn.textContent = "PRESS";
    } else {
      const looks = {
        red: ["#ff6b6b", "DON'T"],
        blue: ["#4f8fcf", "PRESS x2"],
        yellow: ["#f6c445", "HOLD"],
        purple: ["#6a4c93", "PRESS x3"]
      };
      const look = looks[pressMode] || looks.green;
      pressBtn.style.background = look[0];
      pressBtn.textContent = look[1];
    }
  }

  function updateButtonChaos(dt, ci, tier) {
    if (tier < 4) return;
    if (tier >= 6) {
      dodgeX += (Math.random() - 0.5) * 300 * dt;
      dodgeY += (Math.random() - 0.5) * 120 * dt;
      dodgeX = Math.max(-160, Math.min(160, dodgeX));
      dodgeY = Math.max(-50, Math.min(50, dodgeY));
    }
    teleportT -= dt;
    if (teleportT <= 0) {
      teleportT = 5 + Math.random() * 5;
      if (tier >= 4 && Math.random() < 0.5) {
        pressBtn.style.transition = "none";
        dodgeX = Math.round((Math.random() - 0.5) * 280);
        dodgeY = Math.round((Math.random() - 0.5) * 80);
        void pressBtn.offsetWidth;
        pressBtn.style.transition = "";
      }
    }
    const s = Math.max(0.3, 1 - Math.max(0, chaos - 60) * 0.007);
    const o = chaos >= 75 ? Math.max(0.15, 1 - (chaos - 75) * 0.02) : 1;
    const r = tier >= 5 ? Math.sin(time * 2) * 10 : 0;
    pressBtn.style.transform = `translate(${Math.round(dodgeX)}px, ${Math.round(dodgeY)}px) rotate(${r.toFixed(1)}deg) scale(${s.toFixed(3)})`;
    pressBtn.style.opacity = o.toFixed(2);
  }

  function clearDecoys() {
    for (const d of decoys) d.el.remove();
    decoys = [];
    const pause = document.querySelector("#onePause");
    if (pause) pause.remove();
    const settings = document.querySelector("#oneSettings");
    if (settings) settings.remove();
  }

  function syncDecoys(n) {
    const actions = pressBtn.parentElement;
    while (decoys.length < n) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "game-action one-decoy";
      b.textContent = Math.random() < 0.5 ? "PRESS?" : "press";
      b.addEventListener("click", () => {
        message.textContent = "wrong button.";
        cam.shake = Math.min(14, cam.shake + 5);
      });
      actions.append(b);
      decoys.push({ el: b, wt: Math.random() });
    }
    while (decoys.length > n) {
      const d = decoys.pop();
      d.el.remove();
    }
  }

  function addFakeChrome() {
    const actions = pressBtn.parentElement;
    const pause = document.createElement("button");
    pause.type = "button";
    pause.id = "onePause";
    pause.className = "game-action toybox-mini";
    pause.textContent = "Pause";
    pause.addEventListener("click", () => {
      message.textContent = "PAUSE FAILED";
      cam.shake = Math.min(14, cam.shake + 4);
    });
    const settings = document.createElement("button");
    settings.type = "button";
    settings.id = "oneSettings";
    settings.className = "game-action toybox-mini";
    settings.textContent = "Settings";
    settings.addEventListener("click", () => {
      message.textContent = "settings are a social construct.";
    });
    actions.append(pause, settings);
  }

  function chaosLabelText() {
    if (chaos < 100) return `CHAOS ${Math.floor(chaos)}%`;
    if (chaos < 137) return "CHAOS 100%";
    if (chaos < 248) return "CHAOS 137%";
    if (chaos < 999) return "CHAOS 248%";
    if (chaos < 9999) return "CHAOS 999%";
    return Math.floor(time * 2) % 2 === 0 ? "CHAOS ?????" : "CHAOS YES";
  }

  function update(dt) {
    time += dt;
    if (banner) {
      banner.t -= dt;
      if (banner.t <= 0) banner = null;
    }
    if (dead) {
      deadT -= dt;
      updateParts(dt);
      if (deadT <= 0) resetRun();
      return;
    }
    if (frozen) {
      frozen.t -= dt;
      updateParts(dt);
      if (frozen.t <= 0) {
        if (frozen.after) showBanner(frozen.after);
        chaos += frozen.bonus;
        frozen = null;
      }
      return;
    }
    chaos += dt * (0.35 + chaos * 0.004);
    const ci = Math.min(chaos, 120) / 100;
    const tier = chaosTier();
    dist += (speed * tempoMul * dt) / 50;
    speed = (Math.min(640, 280 + dist * 0.55) + ci * 60) * tempoMul;
    checkUnlocks();
    chaosLabel.textContent = chaosLabelText();

    if (tier >= 3) {
      eventT -= dt;
      if (eventT <= 0 && warnT <= 0) {
        warnT = 2;
        showBanner("GRAVITY VOTE INCOMING");
      }
    }
    if (warnT > 0) {
      warnT -= dt;
      if (warnT <= 0) {
        g *= -1;
        player.vy = 0;
        showBanner(g === 1 ? "GRAVITY: FLOOR. boring. safe." : "REVERSED. good luck.");
        eventT = Math.max(3, (tier >= 5 ? 8 : 11) - ci * 5) + Math.random() * 4;
      }
    }
    if (tier >= 3) {
      moleT -= dt;
      if (moleT <= 0) {
        gravMul = 1;
        jumpMul = 1;
        const r = Math.random();
        if (r < 0.35) {
          gravMul = 0.45;
          showBanner("MOON GRAVITY. wheee.");
        } else if (r < 0.6) {
          gravMul = 1.8;
          showBanner("LEAD BOOTS. good luck up there.");
        } else if (r < 0.75) {
          jumpMul = 0.6 + Math.random() * 1.0;
          showBanner("LEGS: MYSTERY.");
        } else {
          showBanner("gravity: normal-ish.");
        }
        moleT = 12 + Math.random() * 6;
      }
    }
    flavorT -= dt;
    if (flavorT <= 0) {
      flavorT = 18 + Math.random() * 10;
      if (!banner) showBanner(FLAVOR[Math.floor(Math.random() * FLAVOR.length)]);
    }

    if (tier >= 5) {
      bpm = Math.max(100, 100 + Math.floor((chaos - 80) / 10) * 10);
      beatT += dt * (bpm / 60);
      if (beatT >= 1) {
        beatT -= 1;
        beatPulse = 1;
      }
      beatPulse = Math.max(0, beatPulse - dt * 3);
      tempoT -= dt;
      if (tempoT <= 0) {
        const r = Math.random();
        if (r < 0.3) {
          tempoMul = 2;
          showBanner("DOUBLE TIME.");
        } else if (r < 0.55) {
          tempoMul = 0.5;
          showBanner("half-time. breathe.");
        } else {
          tempoMul = 1;
        }
        tempoT = 5 + Math.random() * 5;
      }
      if (Math.random() < dt * 0.12) {
        bpm = 100 + Math.floor(Math.random() * 9) * 10;
        showBanner("♪ " + bpm + " BPM");
      }
    } else {
      tempoMul = 1;
      beatPulse = 0;
    }

    if (tier >= 5) {
      modeT -= dt;
      if (modeT <= 0) {
        const modes = ["green", "red", "blue", "yellow", "purple"];
        pressMode = modes[(modes.indexOf(pressMode) + 1) % modes.length];
        modeT = 11;
        setPressLook();
        if (pressMode === "red") showBanner("RED MEANS NO.");
        else if (pressMode === "blue") showBanner("BLUE MEANS TWICE.");
        else if (pressMode === "yellow") showBanner("YELLOW MEANS HOLD.");
        else if (pressMode === "purple") showBanner("PURPLE MEANS THRICE. obviously.");
        else showBanner("GREEN MEANS GO.");
      }
    }
    if (holding && pressMode === "yellow") holdT += dt;

    const nowMs = performance.now();
    while (delayQueue.length && (typeof delayQueue[0]==="number" ? delayQueue[0] <= nowMs : delayQueue[0].t <= nowMs)) {
      const item = delayQueue.shift();
      const who = typeof item==="number" ? 0 : item.who;
      jumpAttempt(who);
    }
    if (reverseT > 0) reverseT -= dt;
    if (tier >= 4 && reverseT <= 0 && Math.random() < dt * 0.05) {
      reverseT = 5;
      showBanner("INPUT REVERSAL. sorry.");
    }
    if (tier >= 5 && delayT <= 0 && Math.random() < dt * 0.06) {
      delayT = 8;
      showBanner("INPUT IS... delayed. wait for it.");
    }
    if (delayT > 0) delayT -= dt;

    if (tier >= 4 && lieScoreT <= 0 && Math.random() < dt * 0.08) {
      lieScoreT = 3;
      fakeScore = Math.floor(dist) + Math.floor((Math.random() - 0.4) * 60);
    }
    if (lieScoreT > 0) lieScoreT -= dt;

    if (tier >= 4 && liarT <= 0 && liarQueue.length === 0 && Math.random() < dt * 0.06) {
      liarQueue = ["YOU'RE DOING GREAT!", "ARE YOU SURE?", "NO."];
      liarT = 0;
    }
    if (liarQueue.length) {
      liarT -= dt;
      if (liarT <= 0) {
        message.textContent = liarQueue.shift();
        liarT = 1.5;
      }
    }
    if (tier >= 4 && !shownTiers.fakebtns) {
      shownTiers.fakebtns = true;
      addFakeChrome();
    }
    if (tier >= 4 && Math.random() < dt * 0.02) {
      frozen = { t: 1.4, bonus: 0, after: "JUST KIDDING. keep going." };
      showBanner("GAME OVER");
    }
    if (tier >= 5 && Math.random() < dt * 0.012) {
      frozen = { t: 2.2, bonus: 5, after: "Phase 2 begins." };
      showBanner("CONGRATULATIONS! YOU WIN!");
    }

    const zoomBase = tier >= 3 ? 1 + 0.08 * Math.sin(time * 0.5) : 1;
    cam.zoomT = zoomBase;
    if (tier >= 5 && Math.random() < dt * 0.1) {
      cam.zoomT = 0.8 + Math.random() * 0.45;
    }
    cam.zoom += (cam.zoomT - cam.zoom) * Math.min(1, dt * 2);
    if (tier >= 4 && Math.random() < dt * 0.08) {
      const steps = [5, 10, 15];
      cam.rotT = (steps[Math.floor(Math.random() * steps.length)] * Math.PI) / 180;
    }
    if (tier >= 5 && Math.random() < dt * 0.05) {
      const big = [90, 180, 270][Math.floor(Math.random() * 3)];
      cam.rotT = (big * Math.PI) / 180;
      showBanner("ROTATED " + big + "°. enjoy.");
    }
    if (tier >= 3 && Math.random() < dt * 0.1) cam.rotT = 0;
    cam.rot += (cam.rotT - cam.rot) * Math.min(1, dt * 1.5);
    if (tier >= 5 && flipT <= 0 && Math.random() < dt * 0.06) {
      flipMode = Math.random() < 0.6 ? 1 : 2;
      flipT = 4 + Math.random() * 2;
      showBanner(flipMode === 1 ? "MIRRORED. no reason." : "UPSIDE DOWN. it's fine.");
    }
    if (flipT > 0) {
      flipT -= dt;
      if (flipT <= 0) flipMode = 0;
    }
    cam.shake = Math.max(0, cam.shake - dt * 26);
    if (tier >= 3) cam.shake = Math.max(cam.shake, ci * 2);
    if (tier >= 4 && Math.random() < dt * 0.05) flashWhite = 0.12;
    if (flashWhite > 0) flashWhite -= dt;

    const FY = FLOOR + (tier >= 1 ? Math.sin(time * 0.8) * 10 : 0);
    function stepPlayer(pl, px){
      pl.vy += 2600 * g * gravMul * dt;
      pl.y += pl.vy * dt;
      const groundY = g === 1 ? FY : CEIL;
      const supported = overFloor(px);
      if (supported && (g === 1 ? pl.y + PH / 2 >= groundY : pl.y - PH / 2 <= groundY)) {
        pl.y = g === 1 ? groundY - PH / 2 : groundY + PH / 2;
        pl.vy = 0;
        pl.grounded = true;
        pl.coyote = 0.08;
      } else {
        pl.grounded = false;
        pl.coyote -= dt;
      }
      if (pl.buffer > 0) {
        pl.buffer -= dt;
        if (pl.grounded) {
          // need who for jumpAttempt
          const who = pl===player2 ? 1 : 0;
          jumpAttempt(who);
        }
      }
    }
    if (!twoP) {
      stepPlayer(player, PX);
    } else {
      if (alive1) stepPlayer(player, PX1);
      if (alive2) stepPlayer(player2, PX2);
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.x -= speed * dt;
      if (o.vx) o.x += o.vx * dt;
      if (o.vy) o.y += o.vy * dt;
      if (o.flipT !== undefined) {
        o.flipT -= dt;
        if (o.flipT <= 0) {
          o.flipT = 1 + Math.random() * 2;
          o.vx = -(o.vx || 0) || 80 + Math.random() * 120;
          if (Math.random() < 0.15) showBanner("SIKE.");
        }
      }
      if ((o.vx || o.vy || o.sine) && Math.random() < dt * 18) {
        const tr = o.kind === "fly" ? { x: o.x, y: flyY(o) } : blockRect(o);
        parts.push({ x: tr.x + (tr.w || 0) / 2, y: tr.y + (tr.h || 0) / 2, vx: 0, vy: 0, life: 0.3, max: 0.3, color: "rgba(160,170,200,0.5)", grav: 0 });
      }
      if (o.x < -140 || o.y > H + 80) {
        obstacles.splice(i, 1);
        continue;
      }
      if (!twoP) {
        if (collides(o, 0)) { die(0); return; }
      } else {
        let killed = false;
        if (alive1 && collides(o, 0)) { die(0); killed = true; if (!alive1 && !alive2) return; }
        if (alive2 && collides(o, 1)) { die(1); killed = true; if (!alive1 && !alive2) return; }
      }
    }
    function outOfBounds(pl){
      if (g === 1 && pl.y - PH / 2 > H + 30) return true;
      if (g === -1 && pl.y + PH / 2 < -30) return true;
      return false;
    }
    if (!twoP) {
      if (outOfBounds(player)) { die(0); return; }
    } else {
      if (alive1 && outOfBounds(player)) { die(0); if (!alive1 && !alive2) return; }
      if (alive2 && outOfBounds(player2)) { die(1); if (!alive1 && !alive2) return; }
    }
    nextSpawn -= speed * dt;
    if (nextSpawn <= 0) {
      spawnPattern();
      nextSpawn = Math.max(140, 280 + Math.random() * 260 + speed * 0.3 - ci * 120);
    }
    updateParts(dt);

    ghostT -= dt;
    if (tier >= 4 && ghostT <= 0) {
      ghostT = 0.09;
      ghosts.push({ x: PX, y: player.y, t: 0.35 });
      if (ghosts.length > 12) ghosts.shift();
    }
    for (let i = ghosts.length - 1; i >= 0; i--) {
      ghosts[i].t -= dt;
      if (ghosts[i].t <= 0) ghosts.splice(i, 1);
    }

    if (tier >= 4) {
      uiDanceT -= dt;
      if (uiDanceT <= 0) {
        uiDanceT = 6 + Math.random() * 4;
        const jx = () => Math.round((Math.random() - 0.5) * 14) + "px";
        scoreLabel.style.transform = `translate(${jx()},${jx()})`;
        bestLabel.style.transform = `translate(${jx()},${jx()})`;
        chaosLabel.style.transform = `translate(${jx()},${jx()})`;
        setTimeout(() => {
          scoreLabel.style.transform = "";
          bestLabel.style.transform = "";
          chaosLabel.style.transform = "";
        }, 900);
      }
      message.classList.add("tshake");
    }
    syncDecoys(tier >= 6 ? 4 : tier >= 5 ? 2 : 0);
    for (const d of decoys) {
      d.wt -= dt;
      if (d.wt <= 0) {
        d.wt = 0.5 + Math.random() * 1.5;
        d.el.style.transform = `translate(${Math.round((Math.random() - 0.5) * 160)}px,${Math.round((Math.random() - 0.5) * 40)}px) rotate(${Math.round((Math.random() - 0.5) * 20)}deg)`;
      }
    }
    updateButtonChaos(dt, ci, tier);
    scoreLabel.textContent = `${Math.floor(dist)} m`;
    if (lieScoreT > 0) scoreLabel.textContent = `SCORE: ${fakeScore}`;
    else if (tier >= 4) scoreLabel.textContent = `${Math.floor(dist)} m`;
    chaosLabel.textContent = chaosLabelText();
    setSnapshot({ mode: "playing", game: "One Button", dist: Math.floor(dist), best, chaos: Math.floor(chaos) });
  }

  function updateParts(dt) {
    parts = parts.filter((p) => p.life > 0);
    for (const p of parts) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.grav === undefined ? 1400 : p.grav) * dt;
      p.life -= dt;
    }
  }

  function draw() {
    const tier = chaosTier();
    const FY = FLOOR + (tier >= 1 ? Math.sin(time * 0.8) * 10 : 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#2b3a67");
    sky.addColorStop(0.6, "#6b4a6e");
    sky.addColorStop(1, "#3a2b4d");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    const drift = tier >= 4 ? time * 14 : 0;
    for (let i = 0; i < 40; i++) {
      const sx = (i * 173 + 40 + drift) % W;
      const sy = (i * 97 + 20) % 300;
      ctx.fillRect(sx, sy, 2, 2);
    }
    const shx = (Math.random() - 0.5) * cam.shake;
    const shy = (Math.random() - 0.5) * cam.shake;
    const fx = flipMode === 1 ? -1 : 1;
    const fy = flipMode === 2 ? -1 : 1;
    ctx.translate(W / 2 + shx, H / 2 + shy);
    ctx.rotate(cam.rot);
    ctx.scale(cam.zoom * fx, cam.zoom * fy);
    ctx.translate(-W / 2, -H / 2);
    ctx.fillStyle = "rgba(20,16,32,0.6)";
    ctx.beginPath();
    for (let x = 0; x <= W; x += 8) {
      const y = H - 40 + Math.sin((x + time * 40) * 0.02) * 14;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.fill();
    ctx.fillStyle = "#54402c";
    ctx.fillRect(0, FY, W, H - FY);
    ctx.fillRect(0, 0, W, CEIL);
    ctx.fillStyle = "#f6c445";
    ctx.fillRect(0, FY - 4, W, 4);
    ctx.fillRect(0, CEIL, W, 4);
    for (const o of obstacles) {
      if (o.kind === "pit" || o.kind === "fakepit") {
        const py = o.side === 1 ? FY : 0;
        const ph = o.side === 1 ? H - FY : CEIL;
        ctx.fillStyle = "#0c0a14";
        ctx.fillRect(o.x, py, o.w, ph);
        ctx.fillStyle = "#f6c445";
        for (let sx = o.x + 6; sx < o.x + o.w - 6; sx += 18) {
          ctx.fillRect(sx, py + (o.side === 1 ? -8 : ph + 2), 10, 6);
        }
      } else if (o.kind === "block" || o.kind === "fake") {
        const r = blockRect(o);
        const pu = tier >= 4 ? 1 + 0.05 * Math.sin(time * 6 + o.x * 0.02) : 1;
        const pw = r.w * pu;
        const ph = r.h * pu;
        const px2 = r.x + (r.w - pw) / 2;
        const py2 = r.y + (r.h - ph) / 2;
        if (o.kind === "fake") ctx.globalAlpha = 0.35;
        ctx.fillStyle = "#2fbf71";
        ctx.strokeStyle = "#0f1320";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(px2, py2, pw, ph, 6);
        ctx.fill();
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (o.kind === "fall") {
        ctx.fillStyle = "#2fbf71";
        ctx.strokeStyle = "#0f1320";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(o.x, o.y, o.w, o.h, 6);
        ctx.fill();
        ctx.stroke();
      } else if (o.kind === "fly") {
        const fy = flyY(o);
        const pu = tier >= 4 ? 1 + 0.05 * Math.sin(time * 6 + o.x * 0.02) : 1;
        ctx.fillStyle = "#6a4c93";
        ctx.strokeStyle = "#0f1320";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(o.x, fy, o.r * pu, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(o.x - 5, fy - 4, 3.5, 0, Math.PI * 2);
        ctx.arc(o.x + 5, fy - 4, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (const gh of ghosts) {
      ctx.globalAlpha = Math.max(0, gh.t / 0.35) * 0.4;
      ctx.fillStyle = "#ff6b6b";
      ctx.fillRect(gh.x - PW / 2, gh.y - PH / 2, PW, PH);
    }
    ctx.globalAlpha = 1;
    function drawRunner(px, pl, color, label, isDead){
      if (twoP && ((label==="P1" && !alive1) || (label==="P2" && !alive2)) && !dead) return;
      ctx.save();
      ctx.translate(px, pl.y);
      if (g === -1) ctx.rotate(Math.PI);
      if (isDead) ctx.rotate(time * 9);
      ctx.fillStyle = color;
      ctx.strokeStyle = "#0f1320";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-PW / 2, -PH / 2, PW, PH, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(-4, -4, 4.5, 0, Math.PI * 2);
      ctx.arc(8, -4, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0f1320";
      ctx.beginPath();
      ctx.arc(-3, -4, 2, 0, Math.PI * 2);
      ctx.arc(9, -4, 2, 0, Math.PI * 2);
      ctx.fill();
      if (twoP) {
        ctx.fillStyle = "#fff";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(label, 0, -PH/2 - 8);
      }
      ctx.restore();
    }
    if (!twoP) {
      drawRunner(PX, player, "#ff6b6b", "P1", dead);
    } else {
      drawRunner(PX1, player, "#ff8f8f", "P1", !alive1);
      drawRunner(PX2, player2, "#74c0fc", "P2", !alive2);
    }
    for (const p of parts) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
    }
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (beatPulse > 0 && tier >= 5) {
      ctx.strokeStyle = `rgba(246,196,69,${(beatPulse * 0.5).toFixed(2)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 60 + (1 - beatPulse) * 120, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (flashWhite > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.6, flashWhite * 4).toFixed(2)})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (frozen) {
      ctx.fillStyle = "rgba(8,6,14,0.72)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 44px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(frozen.bonus > 0 ? "CONGRATULATIONS! YOU WIN!" : "GAME OVER", W / 2, H / 2 - 16);
      ctx.font = "bold 20px sans-serif";
      ctx.fillStyle = "#f6c445";
      ctx.fillText(frozen.bonus > 0 ? "Phase 2 begins." : "JUST KIDDING.", W / 2, H / 2 + 30);
    } else if (banner) {
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      const tw = ctx.measureText(banner.text).width + 44;
      ctx.fillStyle = "rgba(12,10,20,0.82)";
      ctx.beginPath();
      ctx.roundRect(W / 2 - tw / 2, 22, tw, 44, 12);
      ctx.fill();
      ctx.fillStyle = "#f6c445";
      ctx.textBaseline = "middle";
      ctx.fillText(banner.text, W / 2, 45);
    }
  }

  function tick(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    raf = requestAnimationFrame(tick);
  }

  let lastPtr = 0;
  function keydown(e) {
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (twoP) {
      if (e.code === "Space" || e.code === "KeyW") {
        e.preventDefault();
        if (e.type === "keyup") { pressUp(0); return; }
        if (e.repeat) return;
        pressDown(0);
        return;
      }
      if (e.code === "ArrowUp") {
        e.preventDefault();
        if (e.type === "keyup") { pressUp(1); return; }
        if (e.repeat) return;
        pressDown(1);
        return;
      }
      if (e.code === "Enter" && !dead) { e.preventDefault(); pressDown(0); return; }
      return;
    }
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
      e.preventDefault();
      if (e.type === "keyup") {
        pressUp(0);
        return;
      }
      if (e.repeat) return;
      pressDown(0);
    }
  }
  function keyup(e) {
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (twoP) {
      if (e.code === "Space" || e.code === "KeyW") pressUp(0);
      if (e.code === "ArrowUp") pressUp(1);
      return;
    }
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
      pressUp(0);
    }
  }

  function tapWhichOne(e){
    const rect = canvas.getBoundingClientRect();
    return (e.clientX - rect.left) > rect.width/2 ? 1 : 0;
  }
  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    lastPtr = performance.now();
    if (twoP) pressDown(tapWhichOne(e)); else pressDown(0);
  });
  canvas.addEventListener("pointerup", (e) => {
    if (twoP) pressUp(tapWhichOne(e)); else pressUp(0);
  });
  canvas.addEventListener("pointercancel", () => { if (twoP) { pressUp(0); pressUp(1); } else pressUp(0); });
  pressBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    lastPtr = performance.now();
    if (twoP) pressDown(0); else pressDown(0);
  });
  pressBtn.addEventListener("pointerup", () => pressUp(0));
  pressBtn.addEventListener("pointercancel", () => pressUp(0));
  pressBtn2.addEventListener("pointerdown", (e) => { e.preventDefault(); lastPtr = performance.now(); pressDown(1); });
  pressBtn2.addEventListener("pointerup", () => pressUp(1));
  pressBtn2.addEventListener("pointercancel", () => pressUp(1));
  pressBtn2.addEventListener("click", () => {
    if (performance.now() - lastPtr < 600) return;
    pressDown(1);
    setTimeout(()=>pressUp(1), 120);
  });
  pressBtn.addEventListener("click", () => {
    if (performance.now() - lastPtr < 600) return;
    pressDown(0);
    setTimeout(()=>pressUp(0), 120);
  });
  pressBtn.addEventListener("pointerenter", () => {
    if (chaos < 60) return;
    if (Math.random() < 0.45) {
      dodgeX = Math.round((Math.random() - 0.5) * 280);
      dodgeY = Math.round((Math.random() - 0.5) * 80);
      const now = performance.now();
      if (now - lastDodgeMsg > 3000) {
        lastDodgeMsg = now;
        message.textContent = "The button dodges. Rude.";
      }
    }
  });
  document.addEventListener("keydown", keydown);
  document.addEventListener("keyup", keyup);
  bestLabel.textContent = `Best: ${best} m`;
  if (window.__oneButtonKonami) {
    window.__oneButtonKonami = false;
    chaos = 100;
    showBanner("KONAMI ACCEPTED. CHAOS.");
    message.textContent = "Cheater. Respect.";
  }
  setSnapshot({ mode: "playing", game: "One Button", dist: 0, best, chaos: 0 });
  activeCleanup = () => {
    cancelAnimationFrame(raf);
    document.removeEventListener("keydown", keydown);
    document.removeEventListener("keyup", keyup);
  };
  last = performance.now();
  raf = requestAnimationFrame(tick);
}
