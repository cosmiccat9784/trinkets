function startTinyBlocks() {
  openGame(
    "Tiny Blocks",
    "Puzzle",
    `
      <div class="game-layout">
        <div class="game-topline">
          <span class="game-stat" id="tbScore">Score: 0</span>
          <span class="game-stat" id="tbLines">Lines: 0</span>
          <span class="game-stat" id="tbLevel">Level 1</span>
          <span class="game-stat" id="tbBest">Best: 0</span>
        </div>
        <canvas class="tetris-canvas" id="tbCanvas" width="360" height="600"></canvas>
        <p class="game-message" id="tbMsg">Stack tiny blocks. Clear lines. Don't let the tower touch the sky.</p>
        <div class="tetris-controls" aria-label="Tetris controls">
          <button class="tetris-btn" id="tbLeft" type="button" aria-label="Move left">&#9664;</button>
          <button class="tetris-btn" id="tbRight" type="button" aria-label="Move right">&#9654;</button>
          <button class="tetris-btn" id="tbRot" type="button" aria-label="Rotate">&#8635;</button>
          <button class="tetris-btn" id="tbDown" type="button" aria-label="Soft drop">&#9660;</button>
          <button class="tetris-btn" id="tbDrop" type="button" aria-label="Hard drop">&#9191;</button>
        </div>
        <div class="game-actions">
          <button class="game-action" id="tbRetry" type="button">Restart</button>
          <button class="game-action" id="tbPause" type="button">Pause</button>
        </div>
      </div>
    `
  );

  const canvas = document.querySelector("#tbCanvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  const scoreEl = document.querySelector("#tbScore");
  const linesEl = document.querySelector("#tbLines");
  const levelEl = document.querySelector("#tbLevel");
  const bestEl = document.querySelector("#tbBest");
  const message = document.querySelector("#tbMsg");
  const pauseBtn = document.querySelector("#tbPause");

  // Board geometry (canvas pixels)
  const COLS_MAX = 10;
  const ROWS = 20;
  const CELL = 22;
  const BX = 10;
  const BY = 14;
  const BW = COLS_MAX * CELL; // 220
  const BH = ROWS * CELL;     // 440
  const SX = BX + BW + 8;     // 238
  const SW = W - SX - 10;     // ~112

  const CHAOS_SCORE = 1500;

  let best = 0;
  try {
    best = Number((readScores() || {}).tinyblocks) || 0;
  } catch (err) {}

  // ---- shapes ----
  // Each standard piece: matrix + color + name
  const STANDARD = [
    { name: "I", color: "#4dd7f0", mats: [[1, 1, 1, 1]] },
    { name: "O", color: "#f6c445", mats: [[1, 1], [1, 1]] },
    { name: "T", color: "#b197fc", mats: [[0, 1, 0], [1, 1, 1]] },
    { name: "S", color: "#69db7c", mats: [[0, 1, 1], [1, 1, 0]] },
    { name: "Z", color: "#ff6b6b", mats: [[1, 1, 0], [0, 1, 1]] },
    { name: "J", color: "#74c0fc", mats: [[1, 0, 0], [1, 1, 1]] },
    { name: "L", color: "#ffa94d", mats: [[0, 0, 1], [1, 1, 1]] }
  ];
  const LUCKY_DEF = { name: "Lucky", color: "#ffe066", mats: [[1]] };
  const CHAOS_DEF = { name: "Chaos", color: "#e599f7", mats: [[1, 1, 0], [0, 1, 1], [0, 1, 0]] };

  let raf = 0;
  let last = performance.now();
  let mode = "ready"; // ready | playing | paused | dead
  let grid = [];
  let active = null;
  let queue = [];
  let fakeNext = null;
  let score = 0;
  let lines = 0;
  let level = 1;
  let playable = 10;
  let combo = 0;
  let dropAcc = 0;
  let softHeld = false;
  let gravityDir = 1;
  let flipT = 0;
  let eventT = 12;
  let invisibleT = 0;   // timed invisibility from events
  let invisCycle = 0;   // chaos loop timer
  let invisOn = false;
  let shake = 0;
  let flash = 0;
  let shiftT = 5;
  let shiftDir = 1;
  let rotT = 2.5;
  let banner = null;
  let particles = [];
  let popups = [];
  let time = 0;
  let lockFlash = null;
  let clearsAnim = [];

  function emptyGrid() {
    grid = [];
    for (let y = 0; y < ROWS; y++) {
      const row = [];
      for (let x = 0; x < COLS_MAX; x++) row.push(null);
      grid.push(row);
    }
  }

  function showBanner(text) {
    banner = { text, t: 2.2 };
  }

  function burstCell(cx, cy, color, n) {
    const px = BX + cx * CELL + CELL / 2;
    const py = BY + cy * CELL + CELL / 2;
    burst(px, py, n || 8, color, 160);
  }

  function burst(x, y, n, color, spread) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 50 + Math.random() * (spread || 180);
      particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 40,
        life: 0.5 + Math.random() * 0.35,
        max: 0.85,
        color,
        size: 2 + Math.random() * 3
      });
    }
  }

  function popup(x, y, text, color) {
    popups.push({ x, y, text, color, life: 1.2, max: 1.2 });
  }

  function isChaos() {
    return score >= CHAOS_SCORE;
  }

  function dropInterval() {
    const base = 0.85 * Math.pow(0.88, level - 1);
    return Math.max(0.08, base);
  }

  function updateLevel() {
    level = 1 + Math.floor(lines / 4);
    const wantPlay = Math.max(6, 10 - Math.floor(lines / 8));
    if (wantPlay < playable) {
      // shrink: explode the lost columns so it never silently eats the stack
      for (let y = 0; y < ROWS; y++) {
        for (let x = wantPlay; x < playable; x++) {
          if (grid[y][x]) {
            burstCell(x, y, grid[y][x].c || "#fff", 4);
            grid[y][x] = null;
          }
        }
      }
      playable = wantPlay;
      if (active) {
        const aw = active.mats[0].length;
        if (active.x + aw > playable) {
          active.x = Math.max(0, playable - aw);
        }
      }
      showBanner("BOARD SHRINKS! " + playable + " WIDE");
      popup(BX + BW / 2, BY + 60, "BOARD -1", "#ffa94d");
      shake = Math.max(shake, 6);
    } else {
      playable = wantPlay;
    }
  }

  function specialWeight() {
    // specials get more common as you survive
    const l = level;
    return {
      lucky: 0.10 + l * 0.022,
      chaos: 0.08 + l * 0.030,
      mystery: 0.10 + l * 0.028
    };
  }

  function drawPieceDef(def) {
    // deep copy matrix
    return def.mats.map((r) => r.slice());
  }

  function makePiece(forceKind) {
    const chaos = isChaos();
    const w = specialWeight();
    let kind = forceKind || null;
    if (!kind) {
      const r = Math.random();
      const boost = chaos ? 1.8 : 1;
      if (r < w.lucky * boost) kind = "lucky";
      else if (r < (w.lucky + w.chaos) * boost) kind = "chaos";
      else if (r < (w.lucky + w.chaos + w.mystery) * boost) kind = "mystery";
    }
    if (kind === "lucky") {
      return { kind: "lucky", name: "Lucky", color: LUCKY_DEF.color, mats: drawPieceDef(LUCKY_DEF), hidden: false };
    }
    if (kind === "chaos") {
      return { kind: "chaos", name: "Chaos", color: CHAOS_DEF.color, mats: drawPieceDef(CHAOS_DEF), hidden: false };
    }
    if (kind === "mystery") {
      const base = STANDARD[Math.floor(Math.random() * STANDARD.length)];
      return { kind: "mystery", name: base.name, color: base.color, mats: drawPieceDef(base), hidden: true };
    }
    const base = STANDARD[Math.floor(Math.random() * STANDARD.length)];
    return { kind: "std", name: base.name, color: base.color, mats: drawPieceDef(base), hidden: false };
  }

  function refreshFake() {
    // lying preview: pick a fake that differs from the real next
    const real = queue[0];
    if (!real) {
      fakeNext = null;
      return;
    }
    if (isChaos()) {
      let fake = null;
      for (let i = 0; i < 8; i++) {
        const cand = makePiece(null);
        if (cand.name !== real.name || cand.kind !== real.kind) {
          fake = cand;
          break;
        }
        fake = cand;
      }
      fakeNext = fake;
    } else {
      fakeNext = null;
    }
  }

  function refillQueue() {
    while (queue.length < 4) {
      queue.push(makePiece(null));
    }
    refreshFake();
  }

  function forceNext(kind) {
    // events overwrite the upcoming piece so the twist actually arrives
    if (!queue.length) refillQueue();
    queue[0] = makePiece(kind);
    refreshFake();
  }

  function spawnPiece() {
    refillQueue();
    const def = queue.shift();
    refillQueue();
    const mats = def.mats;
    const pw = mats[0].length;
    let x = Math.floor((playable - pw) / 2);
    if (x < 0) x = 0;
    let y;
    if (gravityDir === 1) {
      y = -2;
      // nudge down so at least partly visible for tall pieces
      if (mats.length <= 1) y = -1;
    } else {
      y = ROWS - mats.length + 1;
      if (mats.length <= 1) y = ROWS - 1;
    }
    active = {
      def,
      mats: mats.map((r) => r.slice()),
      x, y,
      color: def.color,
      kind: def.kind,
      name: def.name,
      hidden: def.hidden
    };
    // flipped spawns search upward for a fair free slot instead of
    // instantly dying inside the existing stack
    if (gravityDir === -1) {
      let guard = 0;
      while (collides(active.mats, active.x, active.y) && guard < ROWS) {
        active.y -= 1;
        guard++;
      }
    }
    dropAcc = 0;
    rotT = 2 + Math.random() * 2;
    if (collides(active.mats, active.x, active.y)) {
      active = null;
      die("The tower touched the sky.");
      return false;
    }
    return true;
  }

  function collides(mats, px, py) {
    for (let cy = 0; cy < mats.length; cy++) {
      for (let cx = 0; cx < mats[cy].length; cx++) {
        if (!mats[cy][cx]) continue;
        const bx = px + cx;
        const by = py + cy;
        if (bx < 0 || bx >= playable) return true;
        if (gravityDir === 1) {
          if (by >= ROWS) return true;
          if (by < 0) continue;
        } else {
          if (by < 0) return true;
          if (by >= ROWS) continue;
        }
        if (grid[by][bx]) return true;
      }
    }
    return false;
  }

  function rotateMats(mats) {
    const h = mats.length;
    const w = mats[0].length;
    const out = [];
    for (let x = 0; x < w; x++) {
      const row = [];
      for (let y = h - 1; y >= 0; y--) row.push(mats[y][x]);
      out.push(row);
    }
    return out;
  }

  function tryRotate() {
    if (!active || mode !== "playing") return;
    const next = rotateMats(active.mats);
    const kicks = [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, gravityDir === 1 ? -1 : 1]];
    for (const [dx, dy] of kicks) {
      if (!collides(next, active.x + dx, active.y + dy)) {
        active.mats = next;
        active.x += dx;
        active.y += dy;
        return;
      }
    }
  }

  function tryMove(dx, dy) {
    if (!active || mode !== "playing") return false;
    if (!collides(active.mats, active.x + dx, active.y + dy)) {
      active.x += dx;
      active.y += dy;
      return true;
    }
    return false;
  }

  function ghostY() {
    if (!active) return 0;
    let gy = active.y;
    const step = gravityDir === 1 ? 1 : -1;
    let guard = 0;
    while (!collides(active.mats, active.x, gy + step) && guard < ROWS + 4) {
      gy += step;
      guard++;
    }
    return gy;
  }

  function moveLeft() {
    const dir = isChaos() ? 1 : -1; // reversed in chaos
    tryMove(dir, 0);
  }

  function moveRight() {
    const dir = isChaos() ? -1 : 1;
    tryMove(dir, 0);
  }

  function hardDrop() {
    if (!active || mode !== "playing") return;
    const gy = ghostY();
    const dist = Math.abs(gy - active.y);
    active.y = gy;
    score += dist * 2;
    lockPiece();
  }

  function meltFrozen() {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < playable; x++) {
        const c = grid[y][x];
        if (c && c.f > 0) {
          c.f -= 1;
          if (c.f <= 0) {
            c.f = 0;
            burstCell(x, y, "#a5d8ff", 3);
          }
        }
      }
    }
  }

  function lockPiece() {
    if (!active) return;
    const p = active;
    let touchedSky = false;
    const lockedCells = [];
    for (let cy = 0; cy < p.mats.length; cy++) {
      for (let cx = 0; cx < p.mats[cy].length; cx++) {
        if (!p.mats[cy][cx]) continue;
        const bx = p.x + cx;
        const by = p.y + cy;
        if (bx < 0 || bx >= playable) continue;
        if (by < 0 || by >= ROWS) {
          touchedSky = true;
          continue;
        }
        grid[by][bx] = { c: p.color, f: 0, k: p.kind };
        lockedCells.push([bx, by]);
      }
    }

    const wasLucky = p.kind === "lucky";
    const wasChaos = p.kind === "chaos";
    const wasMystery = p.kind === "mystery";
    const lockX = p.x;
    const lockY = p.y;
    active = null;

    if (touchedSky) {
      syncHud();
      die("The tower touched the sky.");
      return;
    }

    // Lucky blast: clears 3x3 around the placed cell
    if (wasLucky && lockedCells.length) {
      const [lx, ly] = lockedCells[0];
      let cleared = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const bx = lx + dx;
          const by = ly + dy;
          if (bx < 0 || bx >= playable || by < 0 || by >= ROWS) continue;
          if (dx === 0 && dy === 0) continue; // keep the lucky block itself
          if (grid[by][bx]) {
            burstCell(bx, by, grid[by][bx].c, 6);
            grid[by][bx] = null;
            cleared++;
          }
        }
      }
      score += 150 + cleared * 15;
      popup(BX + lx * CELL, BY + ly * CELL, "LUCKY +" + (150 + cleared * 15), "#ffe066");
      burst(BX + lx * CELL + CELL / 2, BY + ly * CELL + CELL / 2, 22, "#ffe066", 260);
      shake = Math.max(shake, 8);
      flash = 0.25;
    }

    // Chaos morph: the weird shape changes when placed
    if (wasChaos) {
      let grown = 0;
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      const snapshot = lockedCells.slice();
      for (const [bx, by] of snapshot) {
        if (Math.random() < 0.35) {
          const [dx, dy] = dirs[Math.floor(Math.random() * dirs.length)];
          const nx = bx + dx;
          const ny = by + dy;
          if (nx >= 0 && nx < playable && ny >= 0 && ny < ROWS && !grid[ny][nx]) {
            grid[ny][nx] = { c: p.color, f: 0, k: "chaos" };
            burstCell(nx, ny, p.color, 4);
            grown++;
          }
        }
      }
      // occasionally eat one of its own cells
      if (snapshot.length > 2 && Math.random() < 0.6) {
        const [bx, by] = snapshot[Math.floor(Math.random() * snapshot.length)];
        if (grid[by] && grid[by][bx]) {
          burstCell(bx, by, p.color, 5);
          grid[by][bx] = null;
        }
      }
      score += 50 + grown * 20;
      const px = BX + lockX * CELL + CELL;
      const py = BY + Math.max(0, Math.min(ROWS - 1, lockY)) * CELL;
      popup(px, py, "CHAOS MORPH!", "#e599f7");
      shake = Math.max(shake, 5);
    }

    if (wasMystery) {
      const px = BX + lockX * CELL + 20;
      const py = BY + Math.max(0, Math.min(ROWS - 1, lockY)) * CELL;
      popup(px, py, "IT WAS " + p.name + "!", "#ced4da");
      score += 25;
    }

    // melting: every lock thaws frozen rows a little
    meltFrozen();

    const n = clearLines();
    if (n > 0) {
      combo++;
      const base = [0, 100, 300, 500, 800][Math.min(4, n)];
      const gained = base * level + combo * 20;
      score += gained;
      lines += n;
      const gy = BY + BH / 2;
      popup(BX + BW / 2, gy - 40, n === 4 ? "TETRIS +" + gained : "+" + gained, n === 4 ? "#ffe066" : "#69db7c");
      if (n === 4) {
        shake = Math.max(shake, 9);
        flash = 0.3;
        burst(BX + BW / 2, gy, 26, "#ffe066", 300);
      }
      updateLevel();
    } else {
      combo = 0;
    }

    lockFlash = { t: 0.18, cells: lockedCells };
    syncHud();
    if (mode === "playing") spawnPiece();
  }

  function rowClearable(y) {
    for (let x = 0; x < playable; x++) {
      const c = grid[y][x];
      if (!c) return false;
      if (c.f > 0) return false; // frozen rows refuse to clear
    }
    return true;
  }

  function clearLines() {
    let n = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
      if (rowClearable(y)) {
        // sparkle the whole row
        for (let x = 0; x < playable; x++) {
          burstCell(x, y, grid[y][x].c, 3);
        }
        grid.splice(y, 1);
        const fresh = [];
        for (let x = 0; x < COLS_MAX; x++) fresh.push(null);
        grid.unshift(fresh);
        n++;
        y++; // re-check the row that fell into this slot
      }
    }
    return n;
  }

  function addFrozenRow() {
    // needs an empty top row to push into
    for (let x = 0; x < playable; x++) {
      if (grid[0][x]) {
        message.textContent = "The tower shivers... but there's no room for ice.";
        return;
      }
    }
    grid.shift();
    const hole = Math.floor(Math.random() * playable);
    const row = [];
    for (let x = 0; x < COLS_MAX; x++) {
      if (x < playable && x !== hole) row.push({ c: "#a5d8ff", f: 3, k: "frozen" });
      else row.push(null);
    }
    grid.push(row);
    for (let x = 0; x < playable; x++) {
      if (x !== hole) burstCell(x, ROWS - 1, "#a5d8ff", 3);
    }
    showBanner("FROZEN ROW! MELT IT");
    message.textContent = "A frozen row appeared! Lock pieces to melt it before it clears.";
    shake = Math.max(shake, 5);
    syncHud();
  }

  function shiftBoard() {
    // chaos: the whole stack slides one column
    if (mode !== "playing") return;
    // the falling piece rides along: skip only if it would leave the field
    if (active) {
      const aw = active.mats[0].length;
      if (active.x + shiftDir < 0 || active.x + shiftDir + aw > playable) return;
    }
    // check the shift fits
    if (shiftDir > 0) {
      for (let y = 0; y < ROWS; y++) {
        if (grid[y][playable - 1]) return; // blocked, skip this cycle
      }
      for (let y = 0; y < ROWS; y++) {
        for (let x = playable - 1; x > 0; x--) grid[y][x] = grid[y][x - 1];
        grid[y][0] = null;
      }
    } else {
      for (let y = 0; y < ROWS; y++) {
        if (grid[y][0]) return;
      }
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < playable - 1; x++) grid[y][x] = grid[y][x + 1];
        grid[y][playable - 1] = null;
      }
    }
    if (active) active.x += shiftDir;
    shiftDir *= -1;
    showBanner("THE BOARD MOVES!");
    shake = Math.max(shake, 6);
  }

  function triggerEvent() {
    const roll = Math.random();
    if (roll < 0.24) {
      addFrozenRow();
    } else if (roll < 0.44) {
      flipT = 5;
      gravityDir = -1;
      showBanner("GRAVITY FLIP! 5s");
      message.textContent = "Gravity flipped! Blocks fall UP for 5 seconds. Down still pushes them along.";
      // nudge the active piece so it doesn't instantly lock
      if (active) {
        const ny = Math.min(active.y, ROWS - active.mats.length);
        if (!collides(active.mats, active.x, ny)) active.y = ny;
      }
    } else if (roll < 0.59) {
      forceNext("mystery");
      showBanner("MYSTERY PIECE!");
      message.textContent = "A mystery piece is next. You won't know it until it lands.";
    } else if (roll < 0.74) {
      forceNext("lucky");
      showBanner("LUCKY BLOCK!");
      message.textContent = "A lucky block is next. It blasts everything nearby.";
    } else if (roll < 0.89) {
      forceNext("chaos");
      showBanner("CHAOS PIECE!");
      message.textContent = "A chaos piece is next. It changes shape when placed.";
    } else {
      invisibleT = 4;
      showBanner("BLOCKS FADE!");
      message.textContent = "The stack turns invisible for a few seconds. Trust your memory.";
    }
    const chaos = isChaos();
    eventT = Math.max(5.5, 15 - level * 0.9 - (chaos ? 3 : 0)) + Math.random() * 3;
  }

  function die(reason) {
    if (mode === "dead") return;
    mode = "dead";
    softHeld = false;
    const result = recordScore("tinyblocks", score, "high");
    best = Math.max(best, result.best, score);
    message.textContent = (reason || "Topped out!") + " Score " + score + " · Lines " + lines + " · Level " + level + "." +
      (result.isNew && score > 0 ? " New best!" : " Best: " + best + ".");
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < playable; x++) {
        if (grid[y][x]) burstCell(x, y, "#ff6b6b", 4);
      }
    }
    shake = 12;
    flash = 0.4;
    syncHud();
  }

  function resetRun(toReady) {
    emptyGrid();
    score = 0;
    lines = 0;
    level = 1;
    playable = 10;
    combo = 0;
    dropAcc = 0;
    gravityDir = 1;
    flipT = 0;
    eventT = 11;
    invisibleT = 0;
    invisCycle = 0;
    invisOn = false;
    shake = 0;
    flash = 0;
    shiftT = 5;
    shiftDir = 1;
    rotT = 2.5;
    banner = null;
    particles = [];
    popups = [];
    queue = [];
    fakeNext = null;
    active = null;
    softHeld = false;
    refillQueue();
    if (toReady) {
      mode = "ready";
      message.textContent = "Stack tiny blocks. Clear lines. Don't let the tower touch the sky.";
      pauseBtn.textContent = "Pause";
    } else {
      mode = "playing";
      message.textContent = "Go! Clear lines to level up. Weird events incoming...";
      showBanner("STACK · CLEAR · SURVIVE");
      spawnPiece();
    }
    syncHud();
  }

  function syncHud() {
    const chaos = isChaos();
    scoreEl.textContent = "Score: " + score;
    linesEl.textContent = "Lines: " + lines;
    levelEl.textContent = chaos ? "Level " + level + " \u{1F300} CHAOS" : "Level " + level;
    bestEl.textContent = "Best: " + Math.max(best, score);
    setSnapshot({
      mode: mode === "playing" ? "playing" : mode === "dead" ? "ended" : "ready",
      game: "Tiny Blocks",
      score,
      lines,
      level,
      levelScore: score,
      best: Math.max(best, score),
      width: playable,
      chaos,
      flip: flipT > 0
    });
  }

  let hudT = 0;
  function syncHudThrottled() {
    hudT++;
    if (hudT % 20 === 0) syncHud();
    else {
      scoreEl.textContent = "Score: " + score;
      linesEl.textContent = "Lines: " + lines;
    }
  }

  function update(dt) {
    time += dt;
    if (banner) {
      banner.t -= dt;
      if (banner.t <= 0) banner = null;
    }
    shake = Math.max(0, shake - dt * 26);
    if (flash > 0) flash -= dt;
    if (lockFlash) {
      lockFlash.t -= dt;
      if (lockFlash.t <= 0) lockFlash = null;
    }
    // particles & popups always animate
    particles = particles.filter((p) => p.life > 0);
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 420 * dt;
      p.life -= dt;
    }
    popups = popups.filter((p) => p.life > 0);
    for (const p of popups) {
      p.y -= 42 * dt;
      p.life -= dt;
    }

    if (mode !== "playing") return;

    const chaos = isChaos();

    // gravity flip timer
    if (flipT > 0) {
      flipT -= dt;
      if (flipT <= 0) {
        flipT = 0;
        gravityDir = 1;
        showBanner("GRAVITY NORMAL");
      }
    }

    // invisibility: event-driven + chaos cycling
    if (invisibleT > 0) invisibleT -= dt;
    if (chaos) {
      invisCycle += dt;
      if (invisCycle > 6) invisCycle = 0;
      invisOn = invisCycle > 4;
    } else {
      invisOn = false;
    }
    const invisible = invisibleT > 0 || invisOn;

    // event scheduler (faster when chaotic)
    eventT -= dt;
    if (eventT <= 0) triggerEvent();

    // chaos: random auto-rotations
    if (chaos && active) {
      rotT -= dt;
      if (rotT <= 0) {
        rotT = 1.6 + Math.random() * 2.2;
        if (Math.random() < 0.75) {
          tryRotate();
          popup(BX + BW / 2, BY + 90, "SPIN!", "#e599f7");
        }
      }
      // chaos: the board slides around
      shiftT -= dt;
      if (shiftT <= 0) {
        shiftT = 4.5 + Math.random() * 2;
        shiftBoard();
      }
    }

    // falling
    if (active) {
      let interval = dropInterval();
      if (softHeld) interval *= 0.08;
      if (flipT > 0) interval *= 0.9;
      dropAcc += dt;
      let guard = 0;
      while (dropAcc >= interval && guard < 24) {
        dropAcc -= interval;
        guard++;
        if (softHeld) score += 1;
        const step = gravityDir === 1 ? 1 : -1;
        if (!collides(active.mats, active.x, active.y + step)) {
          active.y += step;
        } else {
          lockPiece();
          break;
        }
      }
    }
    syncHudThrottled();
    void invisible;
  }

  function cellColor(c) {
    return c.c || "#fff";
  }

  function drawBlock(px, py, s, color, opts) {
    opts = opts || {};
    ctx.fillStyle = color;
    ctx.fillRect(px + 1, py + 1, s - 2, s - 2);
    // glossy top
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(px + 2, py + 2, s - 4, 3);
    // frozen glaze
    if (opts.frozen) {
      ctx.fillStyle = "rgba(165,216,255,0.55)";
      ctx.fillRect(px + 1, py + 1, s - 2, s - 2);
      ctx.strokeStyle = "#e7f5ff";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px + 2.5, py + 2.5, s - 5, s - 5);
      ctx.fillStyle = "#0b7285";
      ctx.font = "bold " + Math.max(9, Math.floor(s * 0.5)) + "px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("\u2744", px + s / 2, py + s / 2 + Math.floor(s * 0.18));
    }
    if (opts.ghost) {
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(px + 1.5, py + 1.5, s - 3, s - 3);
      ctx.setLineDash([]);
    }
    if (opts.lucky) {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "bold " + Math.max(9, Math.floor(s * 0.55)) + "px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("\u2728", px + s / 2, py + s / 2 + Math.floor(s * 0.2));
    }
    if (opts.mystery) {
      ctx.fillStyle = "#fff";
      ctx.font = "bold " + Math.max(9, Math.floor(s * 0.55)) + "px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("?", px + s / 2, py + s / 2 + Math.floor(s * 0.2));
    }
    ctx.strokeStyle = "rgba(15,19,32,0.85)";
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
  }

  function drawMini(def, ox, oy, box) {
    // center a piece preview inside a box
    const mats = def.mats;
    const h = mats.length;
    const w = mats[0].length;
    const s = Math.min(20, Math.floor((box - 16) / Math.max(w, h)));
    const tw = w * s;
    const th = h * s;
    const startX = ox + (box - tw) / 2;
    const startY = oy + (box - th) / 2;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!mats[y][x]) continue;
        const hidden = def.hidden;
        drawBlock(startX + x * s, startY + y * s, s, hidden ? "#868e96" : def.color, hidden ? { mystery: true } : {});
      }
    }
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // backdrop
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    if (isChaos() && mode === "playing") {
      sky.addColorStop(0, "#2b2350");
      sky.addColorStop(0.5, "#3b2d7a");
      sky.addColorStop(1, "#241d4d");
    } else {
      sky.addColorStop(0, "#1b2340");
      sky.addColorStop(0.5, "#232c52");
      sky.addColorStop(1, "#1b2340");
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    if (shake > 0.2) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }

    // board frame
    ctx.fillStyle = "#0f1320";
    ctx.strokeStyle = "#0f1320";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(BX - 4, BY - 4, BW + 8, BH + 8, 8);
    ctx.fill();
    ctx.stroke();

    // grid dots
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < playable; x++) {
        ctx.fillRect(BX + x * CELL + CELL / 2 - 1, BY + y * CELL + CELL / 2 - 1, 2, 2);
      }
    }

    const invisible = invisibleT > 0 || invisOn;

    // locked blocks
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < playable; x++) {
        const c = grid[y][x];
        if (!c) continue;
        const px = BX + x * CELL;
        const py = BY + y * CELL;
        if (invisible) {
          ctx.globalAlpha = 0.13;
          drawBlock(px, py, CELL, cellColor(c), { frozen: c.f > 0 });
          ctx.globalAlpha = 1;
        } else {
          drawBlock(px, py, CELL, cellColor(c), { frozen: c.f > 0, lucky: c.k === "lucky" });
        }
      }
    }

    // walled-off columns (shrunk board)
    if (playable < COLS_MAX) {
      for (let y = 0; y < ROWS; y++) {
        for (let x = playable; x < COLS_MAX; x++) {
          const px = BX + x * CELL;
          const py = BY + y * CELL;
          ctx.fillStyle = (y + x) % 2 ? "#141a30" : "#10142a";
          ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
        }
      }
      ctx.fillStyle = "rgba(255,169,77,0.9)";
      ctx.fillRect(BX + playable * CELL - 2, BY, 3, BH);
    }

    // ghost + active piece
    if (active && (mode === "playing" || mode === "paused")) {
      const gy = ghostY();
      const hidden = active.hidden;
      const col = hidden ? "#868e96" : active.color;
      for (let cy = 0; cy < active.mats.length; cy++) {
        for (let cx = 0; cx < active.mats[cy].length; cx++) {
          if (!active.mats[cy][cx]) continue;
          const gx = active.x + cx;
          const gyy = gy + cy;
          if (gx < 0 || gx >= playable || gyy < 0 || gyy >= ROWS) continue;
          if (gy !== active.y) {
            ctx.globalAlpha = 0.35;
            drawBlock(BX + gx * CELL, BY + gyy * CELL, CELL, col, { ghost: true, mystery: hidden });
            ctx.globalAlpha = 1;
          }
        }
      }
      for (let cy = 0; cy < active.mats.length; cy++) {
        for (let cx = 0; cx < active.mats[cy].length; cx++) {
          if (!active.mats[cy][cx]) continue;
          const bx = active.x + cx;
          const by = active.y + cy;
          if (bx < 0 || bx >= playable || by < 0 || by >= ROWS) continue;
          drawBlock(BX + bx * CELL, BY + by * CELL, CELL, col, {
            lucky: active.kind === "lucky",
            mystery: hidden
          });
        }
      }
    }

    // lock flash
    if (lockFlash) {
      ctx.globalAlpha = Math.max(0, lockFlash.t / 0.18) * 0.5;
      ctx.fillStyle = "#fff";
      for (const [bx, by] of lockFlash.cells) {
        if (bx < 0 || bx >= playable || by < 0 || by >= ROWS) continue;
        ctx.fillRect(BX + bx * CELL, BY + by * CELL, CELL, CELL);
      }
      ctx.globalAlpha = 1;
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
      ctx.font = "bold 15px monospace";
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillText(p.text, p.x + 1, p.y + 1);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;

    // ---- sidebar ----
    const sideTop = BY;
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath();
    ctx.roundRect(SX, sideTop, SW, BH, 8);
    ctx.fill();

    ctx.fillStyle = "#fff8ea";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    const chaos = isChaos();
    ctx.fillText(chaos && mode === "playing" ? "NEXT?!" : "NEXT", SX + SW / 2, sideTop + 16);
    // next box
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(SX + 8, sideTop + 22, SW - 16, 76, 8);
    ctx.stroke();
    if (queue.length) {
      const shown = chaos && fakeNext ? fakeNext : queue[0];
      drawMini(shown, SX + 8, sideTop + 22, SW - 16);
    }

    let sy = sideTop + 118;
    ctx.textAlign = "left";
    ctx.font = "bold 11px sans-serif";
    ctx.fillStyle = "#ced4da";
    ctx.fillText("COMBO x" + combo, SX + 10, sy);
    sy += 18;
    ctx.fillText("FIELD " + playable, SX + 10, sy);
    sy += 18;
    if (flipT > 0) {
      ctx.fillStyle = "#ffa94d";
      ctx.fillText("FLIP " + flipT.toFixed(1) + "s", SX + 10, sy);
      // flip bar
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(SX + 10, sy + 4, SW - 20, 6);
      ctx.fillStyle = "#ffa94d";
      ctx.fillRect(SX + 10, sy + 4, (SW - 20) * (flipT / 5), 6);
      sy += 20;
    } else if (gravityDir === -1) {
      ctx.fillStyle = "#ffa94d";
      ctx.fillText("FLIP!", SX + 10, sy);
      sy += 18;
    }
    if (invisible) {
      ctx.fillStyle = "#868e96";
      ctx.fillText("HIDDEN!", SX + 10, sy);
      sy += 18;
    }
    if (chaos && mode === "playing") {
      ctx.fillStyle = "#e599f7";
      ctx.fillText("REVERSED", SX + 10, sy);
      sy += 18;
      ctx.fillStyle = "#ffe066";
      ctx.fillText("CHAOS LV", SX + 10, sy);
      sy += 14;
      const cl = Math.min(5, 1 + Math.floor((score - CHAOS_SCORE) / 500));
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = i < cl ? "#e599f7" : "rgba(255,255,255,0.18)";
        ctx.beginPath();
        ctx.arc(SX + 16 + i * 17, sy + 6, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      sy += 24;
    }
    // event countdown
    if (mode === "playing") {
      ctx.fillStyle = "#ced4da";
      ctx.fillText("EVENT", SX + 10, sy);
      sy += 6;
      const maxE = 16;
      const frac = Math.max(0, Math.min(1, eventT / maxE));
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(SX + 10, sy, SW - 20, 6);
      ctx.fillStyle = "#43c6ac";
      ctx.fillRect(SX + 10, sy, (SW - 20) * frac, 6);
      sy += 18;
    }
    // frozen legend
    ctx.fillStyle = "rgba(165,216,255,0.9)";
    ctx.font = "11px sans-serif";
    let frozenCount = 0;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < playable; x++) if (grid[y][x] && grid[y][x].f > 0) frozenCount++;
    if (frozenCount > 0) {
      ctx.fillStyle = "#a5d8ff";
      ctx.fillText("\u2744 " + frozenCount, SX + 10, sy);
      sy += 18;
    }
    ctx.fillStyle = "rgba(255,248,234,0.55)";
    ctx.font = "10px sans-serif";
    const hints = ["\u2B05\u2B95 move", "\u2B06 rotate", "\u2B07 soft", "SPACE drop"];
    for (const h of hints) {
      if (sy > BY + BH - 6) break;
      ctx.fillText(h, SX + 10, sy);
      sy += 14;
    }

    // gravity arrow
    if (mode === "playing" && flipT > 0) {
      ctx.fillStyle = "#ffa94d";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("\u25B2 UP!", BX + BW / 2, BY + BH + 22);
    }

    // banner
    if (banner) {
      ctx.font = "bold 17px sans-serif";
      const tw = Math.min(BW - 16, ctx.measureText(banner.text).width + 30);
      const bx = BX + BW / 2 - tw / 2;
      const byy = 46;
      ctx.fillStyle = "rgba(12,10,24,0.85)";
      ctx.beginPath();
      ctx.roundRect(bx, byy, tw, 32, 9);
      ctx.fill();
      ctx.fillStyle = "#ffe066";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(banner.text, BX + BW / 2, byy + 17);
      ctx.textBaseline = "alphabetic";
    }

    // overlays
    if (mode === "ready") {
      ctx.fillStyle = "rgba(10,10,24,0.72)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff8ea";
      ctx.font = "bold 38px sans-serif";
      ctx.fillText("TINY BLOCKS", W / 2, H / 2 - 84);
      ctx.font = "bold 14px sans-serif";
      ctx.fillStyle = "#ffe066";
      ctx.fillText("a cozy block-stacker gone wrong", W / 2, H / 2 - 58);
      ctx.fillStyle = "#fff8ea";
      ctx.font = "13px sans-serif";
      ctx.fillText("\u2B05 \u2B95 move · \u2B06 rotate", W / 2, H / 2 - 32);
      ctx.fillText("\u2B07 soft drop · SPACE slam", W / 2, H / 2 - 12);
      ctx.fillText("Clear lines. Melt frozen rows.", W / 2, H / 2 + 8);
      ctx.fillText("Beware: lucky blasts, chaos morphs,", W / 2, H / 2 + 28);
      ctx.fillText("mystery pieces, gravity flips...", W / 2, H / 2 + 48);
      ctx.fillStyle = "#69db7c";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText("— press ENTER or tap DROP to start —", W / 2, H / 2 + 78);
      if (best > 0) {
        ctx.fillStyle = "#ced4da";
        ctx.font = "12px sans-serif";
        ctx.fillText("Best " + best, W / 2, H / 2 + 100);
      }
    }

    if (mode === "paused") {
      ctx.fillStyle = "rgba(10,10,24,0.6)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff8ea";
      ctx.font = "bold 40px sans-serif";
      ctx.fillText("PAUSED", W / 2, H / 2);
    }

    if (mode === "dead") {
      ctx.fillStyle = "rgba(10,8,16,0.55)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.fillStyle = "#ff6b6b";
      ctx.font = "bold 40px sans-serif";
      ctx.fillText("TOP OUT!", W / 2, H / 2 - 30);
      ctx.fillStyle = "#fff8ea";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText("Score " + score + " · Lines " + lines, W / 2, H / 2 + 2);
      ctx.fillText("Level " + level + " · Best " + Math.max(best, score), W / 2, H / 2 + 24);
      if (score >= CHAOS_SCORE) {
        ctx.fillStyle = "#e599f7";
        ctx.fillText("you met the confused machine", W / 2, H / 2 + 46);
      }
      ctx.fillStyle = "#69db7c";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("ENTER / Restart to try again", W / 2, H / 2 + 70);
    }

    ctx.restore();

    if (flash > 0) {
      ctx.fillStyle = "rgba(255,224,102," + Math.min(0.35, flash).toFixed(2) + ")";
      ctx.fillRect(0, 0, W, H);
    }

    scoreEl.textContent = "Score: " + score;
    linesEl.textContent = "Lines: " + lines;
  }

  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    raf = requestAnimationFrame(tick);
  }

  function primaryAction() {
    if (mode === "ready" || mode === "dead") {
      resetRun(false);
      return;
    }
    if (mode === "paused") {
      mode = "playing";
      pauseBtn.textContent = "Pause";
      last = performance.now();
      return;
    }
    hardDrop();
  }

  function togglePause() {
    if (mode === "playing") {
      mode = "paused";
      pauseBtn.textContent = "Resume";
      syncHud();
    } else if (mode === "paused") {
      mode = "playing";
      pauseBtn.textContent = "Pause";
      last = performance.now();
      syncHud();
    }
  }

  function keydown(e) {
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (e.code === "ArrowLeft" || e.code === "KeyA") {
      e.preventDefault();
      if (mode === "ready" || mode === "dead") return;
      if (mode === "paused") return;
      moveLeft();
    } else if (e.code === "ArrowRight" || e.code === "KeyD") {
      e.preventDefault();
      if (mode === "ready" || mode === "dead") return;
      if (mode === "paused") return;
      moveRight();
    } else if (e.code === "ArrowUp" || e.code === "KeyW") {
      e.preventDefault();
      if (e.repeat) return;
      if (mode === "ready" || mode === "dead") { primaryAction(); return; }
      if (mode === "paused") return;
      tryRotate();
    } else if (e.code === "ArrowDown" || e.code === "KeyS") {
      e.preventDefault();
      if (mode === "playing") softHeld = true;
    } else if (e.code === "Space") {
      e.preventDefault();
      if (e.repeat) return;
      primaryAction();
    } else if (e.code === "Enter") {
      if (mode !== "playing") {
        e.preventDefault();
        primaryAction();
      }
    } else if (e.code === "KeyP") {
      e.preventDefault();
      togglePause();
    } else if (e.code === "KeyR") {
      e.preventDefault();
      resetRun(false);
    }
  }

  function keyup(e) {
    if (e.code === "ArrowDown" || e.code === "KeyS") softHeld = false;
  }

  // buttons
  const btnLeft = document.querySelector("#tbLeft");
  const btnRight = document.querySelector("#tbRight");
  const btnRot = document.querySelector("#tbRot");
  const btnDown = document.querySelector("#tbDown");
  const btnDrop = document.querySelector("#tbDrop");

  function bindHold(btn, down, up) {
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      try { btn.setPointerCapture(e.pointerId); } catch (err) {}
      down();
    });
    if (up) {
      btn.addEventListener("pointerup", (e) => { e.preventDefault(); up(); });
      btn.addEventListener("pointercancel", () => { try { up(); } catch (err) {} });
    }
    btn.addEventListener("click", (e) => {
      // keep Space/Enter for the board, not a focused button
      try { e.currentTarget.blur(); } catch (err) {}
    });
    btn.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  bindHold(btnLeft, () => {
    if (mode === "playing") moveLeft();
  });
  bindHold(btnRight, () => {
    if (mode === "playing") moveRight();
  });
  bindHold(btnRot, () => {
    if (mode === "ready" || mode === "dead") primaryAction();
    else if (mode === "playing") tryRotate();
  });
  bindHold(btnDown, () => {
    if (mode === "playing") softHeld = true;
  }, () => { softHeld = false; });
  bindHold(btnDrop, () => primaryAction());

  function tbCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (W / rect.width),
      y: (e.clientY - rect.top) * (H / rect.height)
    };
  }

  function tbInsideBoard(p) {
    return p.x >= BX && p.x < BX + BW && p.y >= BY && p.y < BY + BH;
  }

  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (mode === "ready" || mode === "dead") {
      primaryAction();
      return;
    }
    if (mode !== "playing") return;
    // The board (BX,BY,BW,BH) is only the left part of the canvas;
    // the sidebar (next preview, stats) is not playable. Ignore taps there
    // so sidebar clicks don't rotate the piece.
    const p = tbCanvasPos(e);
    if (!tbInsideBoard(p)) return;
    tryRotate();
  });

  document.querySelector("#tbRetry").addEventListener("click", (e) => {
    resetRun(false);
    try { e.currentTarget.blur(); } catch (err) {}
  });
  pauseBtn.addEventListener("click", (e) => {
    togglePause();
    try { e.currentTarget.blur(); } catch (err) {}
  });
  document.addEventListener("keydown", keydown);
  document.addEventListener("keyup", keyup);

  setSnapshot({ mode: "ready", game: "Tiny Blocks", score: 0, lines: 0, level: 1, best });
  activeAdvance = (ms) => {
    const steps = Math.max(1, Math.round(ms / 16));
    for (let i = 0; i < steps; i++) update(1 / 60);
    draw();
  };
  activeCleanup = () => {
    cancelAnimationFrame(raf);
    document.removeEventListener("keydown", keydown);
    document.removeEventListener("keyup", keyup);
  };
  bestEl.textContent = "Best: " + best;
  resetRun(true);
  draw();
  last = performance.now();
  raf = requestAnimationFrame(tick);
}

Object.assign(gameStarters, { tinyblocks: startTinyBlocks });
