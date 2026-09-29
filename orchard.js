const ORCH_N = 7;

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function orchKey(x, y) {
  return y * ORCH_N + x;
}

function findOrchardLine(cells) {
  const set = new Set(cells.map((c) => orchKey(c.x, c.y)));
  for (let y = 0; y < ORCH_N; y++) {
    for (let x = 0; x <= ORCH_N - 3; x++) {
      if (set.has(orchKey(x, y)) && set.has(orchKey(x + 1, y)) && set.has(orchKey(x + 2, y))) {
        return [{ x, y }, { x: x + 1, y }, { x: x + 2, y }];
      }
    }
  }
  for (let x = 0; x < ORCH_N; x++) {
    for (let y = 0; y <= ORCH_N - 3; y++) {
      if (set.has(orchKey(x, y)) && set.has(orchKey(x, y + 1)) && set.has(orchKey(x, y + 2))) {
        return [{ x, y }, { x, y: y + 1 }, { x, y: y + 2 }];
      }
    }
  }
  return null;
}

const ORCH_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function orchardStateKey(p, o, x) {
  const s = (t) => t.x + "," + t.y;
  return s(p) + "|" + o.map(s).sort().join(";") + "|" + x.map(s).sort().join(";");
}

function minWinDepth(level) {
  const blocked = new Set([...level.walls, ...(level.voids || [])]);
  const blockedAt = (x, y) => x < 1 || x > 5 || y < 1 || y > 5 || blocked.has(orchKey(x, y));
  const start = {
    p: { ...level.player },
    o: level.oTiles.map((t) => ({ ...t })),
    x: level.xTiles.map((t) => ({ ...t })),
    d: 0
  };
  const oCellsOf = (s) => [{ ...s.p }, ...s.o.map((t) => ({ ...t }))];
  if (findOrchardLine(oCellsOf(start))) return 0;
  const seen = new Set([orchardStateKey(start.p, start.o, start.x)]);
  const queue = [start];
  let expanded = 0;
  while (queue.length && expanded < 30000) {
    const s = queue.shift();
    if (s.d >= 6) continue;
    expanded++;
    for (const [dx, dy] of ORCH_DIRS) {
      const nx = s.p.x + dx;
      const ny = s.p.y + dy;
      let np;
      let no;
      let nxTiles;
      const hit = s.o.concat(s.x).find((t) => t.x === nx && t.y === ny) || null;
      if (!hit) {
        if (blockedAt(nx, ny)) continue;
        np = { x: nx, y: ny };
        no = s.o;
        nxTiles = s.x;
      } else {
        const bx = nx + dx;
        const by = ny + dy;
        if (blockedAt(bx, by)) continue;
        if (s.o.concat(s.x).some((t) => t.x === bx && t.y === by)) continue;
        np = { x: nx, y: ny };
        const moved = { x: bx, y: by };
        if (s.o.includes(hit)) {
          no = s.o.map((t) => (t === hit ? moved : { ...t }));
          nxTiles = s.x;
        } else {
          no = s.o;
          nxTiles = s.x.map((t) => (t === hit ? moved : { ...t }));
        }
      }
      if (findOrchardLine(nxTiles)) continue;
      if (findOrchardLine([{ ...np }, ...no.map((t) => ({ ...t }))])) return s.d + 1;
      const k = orchardStateKey(np, no, nxTiles);
      if (seen.has(k)) continue;
      seen.add(k);
      queue.push({ p: np, o: no, x: nxTiles, d: s.d + 1 });
    }
  }
  return Infinity;
}

function tryGenOrchard(rand) {
  const inBounds = (x, y) => x >= 1 && x <= 5 && y >= 1 && y <= 5;
  const horiz = rand() < 0.5;
  const linePos = 1 + Math.floor(rand() * 5);
  const lineStart = 1 + Math.floor(rand() * 3);
  const lineCells = [0, 1, 2].map((k) => (horiz ? { x: lineStart + k, y: linePos } : { x: linePos, y: lineStart + k }));
  const reserved = new Set(lineCells.map((c) => orchKey(c.x, c.y)));

  const voids = new Set();
  const voidCount = 3 + Math.floor(rand() * 3);
  let vx = 1 + Math.floor(rand() * 5);
  let vy = 1 + Math.floor(rand() * 5);
  let guard = 0;
  while (voids.size < voidCount && guard++ < 300) {
    const k = orchKey(vx, vy);
    if (!reserved.has(k) && !voids.has(k)) voids.add(k);
    const step = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(rand() * 4)];
    vx = Math.min(5, Math.max(1, vx + step[0]));
    vy = Math.min(5, Math.max(1, vy + step[1]));
  }

  const walls = new Set();
  const wallCount = 2 + Math.floor(rand() * 2);
  guard = 0;
  while (walls.size < wallCount && guard++ < 200) {
    const x = 1 + Math.floor(rand() * 5);
    const y = 1 + Math.floor(rand() * 5);
    const k = orchKey(x, y);
    if (reserved.has(k) || walls.has(k) || voids.has(k)) continue;
    walls.add(k);
  }

  const player = { x: lineCells[1].x, y: lineCells[1].y };
  const oTiles = [{ x: lineCells[0].x, y: lineCells[0].y }, { x: lineCells[2].x, y: lineCells[2].y }];
  const taken = new Set(reserved);
  const xTiles = [];
  guard = 0;
  while (xTiles.length < 4 && guard++ < 300) {
    const x = 1 + Math.floor(rand() * 5);
    const y = 1 + Math.floor(rand() * 5);
    const k = orchKey(x, y);
    if (taken.has(k) || walls.has(k) || voids.has(k)) continue;
    taken.add(k);
    xTiles.push({ x, y });
  }
  if (xTiles.length < 4) return null;
  if (findOrchardLine(xTiles)) return null;

  const atTile = (x, y) =>
    oTiles.concat(xTiles).find((t) => t.x === x && t.y === y) || null;
  const blockedGen = (x, y) => walls.has(orchKey(x, y)) || voids.has(orchKey(x, y));
  const oCells = () => [{ ...player }, ...oTiles.map((t) => ({ ...t }))];

  const seenFloor = new Set([orchKey(player.x, player.y)]);
  const queue = [{ ...player }];
  while (queue.length) {
    const cell = queue.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cell.x + dx;
      const ny = cell.y + dy;
      const k = orchKey(nx, ny);
      if (nx < 1 || nx > 5 || ny < 1 || ny > 5 || blockedGen(nx, ny) || seenFloor.has(k)) continue;
      seenFloor.add(k);
      queue.push({ x: nx, y: ny });
    }
  }
  if (!oTiles.concat(xTiles).every((t) => seenFloor.has(orchKey(t.x, t.y)))) return null;

  const solution = [];
  let lastDx = 0;
  let lastDy = 0;
  const steps = 60 + Math.floor(rand() * 40);
  for (let s = 0; s < steps; s++) {
    const options = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => {
      const nx = player.x + dx;
      const ny = player.y + dy;
      return inBounds(nx, ny) && !blockedGen(nx, ny) && !atTile(nx, ny);
    });
    if (options.length === 0) return null;
    const fresh = options.filter(([dx, dy]) => !(dx === -lastDx && dy === -lastDy));
    const pool = fresh.length > 0 ? fresh : options;
    const [dx, dy] = pool[Math.floor(rand() * pool.length)];
    lastDx = dx;
    lastDy = dy;
    const px = player.x;
    const py = player.y;
    const behind = atTile(px - dx, py - dy);
    player.x = px + dx;
    player.y = py + dy;
    if (behind) {
      behind.x = px;
      behind.y = py;
    }
    if (findOrchardLine(xTiles)) {
      if (behind) {
        behind.x = px - dx;
        behind.y = py - dy;
      }
      player.x = px;
      player.y = py;
      continue;
    }
    solution.push([dx, dy]);
  }
  if (findOrchardLine(oCells())) return null;
  if (findOrchardLine(xTiles)) return null;
  const level = {
    walls: [...walls],
    voids: [...voids],
    player: { ...player },
    oTiles: oTiles.map((t) => ({ ...t })),
    xTiles: xTiles.map((t) => ({ ...t })),
    solution: solution.reverse().map(([dx, dy]) => [-dx, -dy])
  };
  if (minWinDepth(level) < 6) return null;
  return level;
}

function genOrchardLevel(rand) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const level = tryGenOrchard(rand);
    if (level) return level;
  }
  return {
    walls: [],
    voids: [],
    player: { x: 3, y: 2 },
    oTiles: [{ x: 2, y: 3 }, { x: 4, y: 3 }],
    xTiles: [{ x: 1, y: 1 }, { x: 5, y: 1 }, { x: 3, y: 5 }, { x: 1, y: 5 }],
    solution: [[0, 1]]
  };
}

const ORCH_NAMES = [
  "Windfall Row", "The Potting Shed", "Cider Press", "Scarecrow Corner",
  "Blossom Gate", "Compost Heap", "Wishing Tree", "Seedling Bed",
  "Harvest Moon", "Orchard Wall", "Duck Pond", "Beekeeper's Rest",
  "Crabapple Corner", "Wheelbarrow Run", "Greenhouse", "Sunrise Row",
  "Foxglove Patch", "Rain Barrel", "Honeycrisp Hill", "Old Gatehouse"
];

function startOrchardGo() {  openGame(
    "Orchard Go",
    "Puzzle",
    `
      <div class="game-layout">
        <div class="game-topline">
          <span class="game-stat" id="orchBoard">Board: 1/12</span>
          <span class="game-stat" id="orchMoves">Moves: 0</span>
        </div>
        <p class="game-message" id="orchMsg">Shove oranges into a line of three. Crabapples must never line up.</p>
        <div class="orch-rules" id="orchRules" hidden>
          <strong>How to play</strong>
          <p>You are the orange with eyes. Move with arrows, WASD, swipe, or the pad. Bumping a fruit shoves it one square, but only if the square behind is free — one at a time, never into walls or other fruit.</p>
          <p>Line up three oranges in a row (you count!) to win. If three crabapples line up first, you lose. Undo is infinite. Fewest moves wins.</p>
        </div>
        <div class="orch-grid" id="orchGrid" aria-label="Orchard board"></div>
        <div class="t-pad" aria-label="Move">
          <button class="game-action t-pad-button" type="button" data-step="up" aria-label="Move up">↑</button>
          <button class="game-action t-pad-button" type="button" data-step="left" aria-label="Move left">←</button>
          <button class="game-action t-pad-button" type="button" data-step="down" aria-label="Move down">↓</button>
          <button class="game-action t-pad-button" type="button" data-step="right" aria-label="Move right">→</button>
        </div>
        <div class="game-actions">
          <button class="game-action" id="orchUndo" type="button">Undo</button>
          <button class="game-action" id="orchReset" type="button">Reset</button>
          <button class="game-action" id="orchNext" type="button">Next board</button>
          <button class="game-action" id="orchRulesBtn" type="button">Rules</button>
        </div>
      </div>
    `
  );

  const ORCH_COUNT = 40;
  const today = new Date().toISOString().slice(0, 10);
  let levels = [];
  let orchIndex = 0;
  let walls = new Set();
  let voids = new Set();
  const dayOfYear = Math.floor(Date.now() / 86400000);
  let player = { x: 3, y: 3 };
  let oTiles = [];
  let xTiles = [];
  let moves = 0;
  let won = false;
  let lost = false;
  let winCells = [];
  let doomCells = [];
  let history = [];
  const grid = document.querySelector("#orchGrid");
  const message = document.querySelector("#orchMsg");

  function buildLevels(daily) {
    levels = [];
    for (let i = 0; i < ORCH_COUNT; i++) {
      const rand = daily && i === 0 ? mulberry32(hashStr("orchard-" + today)) : Math.random;
      const level = genOrchardLevel(rand);
      levels.push(JSON.parse(JSON.stringify(level)));
    }
  }

  function boardName(index) {
    return ORCH_NAMES[(index * 3 + dayOfYear) % ORCH_NAMES.length];
  }

  function loadLevel(index) {
    const level = levels[index];
    walls = new Set(level.walls);
    voids = new Set(level.voids || []);
    player = { ...level.player };
    oTiles = level.oTiles.map((t) => ({ ...t }));
    xTiles = level.xTiles.map((t) => ({ ...t }));
    moves = 0;
    won = false;
    lost = false;
    winCells = [];
    doomCells = [];
    history = [];
    document.querySelector("#orchBoard").textContent = `Board ${index + 1}/${levels.length} · ${boardName(index)}`;
    message.textContent = index === 0
      ? "Today's board first, then fresh ones. Shove oranges into a line of three."
      : "Shove oranges into a line of three. Crabapples must never line up.";
    render();
  }

  function tileAt(x, y) {
    return oTiles.concat(xTiles).find((t) => t.x === x && t.y === y) || null;
  }

  function floorFree(x, y) {
    if (x < 1 || x > 5 || y < 1 || y > 5) return false;
    if (walls.has(orchKey(x, y)) || voids.has(orchKey(x, y))) return false;
    if (tileAt(x, y)) return false;
    return true;
  }

  function snapshot() {
    return {
      p: { ...player },
      o: oTiles.map((t) => ({ ...t })),
      x: xTiles.map((t) => ({ ...t })),
      m: moves
    };
  }

  function restore(snap) {
    player = { ...snap.p };
    oTiles = snap.o.map((t) => ({ ...t }));
    xTiles = snap.x.map((t) => ({ ...t }));
    moves = snap.m;
    won = false;
    lost = false;
    winCells = [];
    doomCells = [];
  }

  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  function tryStep(dx, dy) {
    if (won || lost) return;
    const nx = player.x + dx;
    const ny = player.y + dy;
    if (!floorFree(nx, ny)) {
      const tile = tileAt(nx, ny);
      if (!tile) return;
      const bx = nx + dx;
      const by = ny + dy;
      if (!floorFree(bx, by)) return;
      history.push(snapshot());
      if (history.length > 1000) history.shift();
      tile.x = bx;
      tile.y = by;
      player = { x: nx, y: ny };
    } else {
      history.push(snapshot());
      if (history.length > 1000) history.shift();
      player = { x: nx, y: ny };
    }
    moves += 1;
    afterMove();
  }

  function afterMove() {
    const oLine = findOrchardLine([{ ...player }, ...oTiles.map((t) => ({ ...t }))]);
    if (oLine) {
      won = true;
      winCells = oLine;
      const result = recordScore("orchard", moves, "low");
      message.textContent = `Orchard complete in ${moves} moves!` + (result.isNew ? " New best!" : ` Best: ${result.best}.`);
      render();
      return;
    }
    const xLine = findOrchardLine(xTiles);
    if (xLine) {
      lost = true;
      doomCells = xLine;
      message.textContent = "Three crabapples lined up! Undo or reset to keep picking.";
      render();
      return;
    }
    message.textContent = "Shove oranges into a line of three. Crabapples must never line up.";
    render();
  }

  function render() {
    grid.innerHTML = "";
    const winKeys = new Set(winCells.map((c) => orchKey(c.x, c.y)));
    const doomKeys = new Set(doomCells.map((c) => orchKey(c.x, c.y)));
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const cell = document.createElement("div");
        const k = orchKey(x, y);
        if (x < 1 || x > 5 || y < 1 || y > 5 || voids.has(k)) {
          cell.className = "orch-void";
          grid.append(cell);
          continue;
        }
        cell.className = "orch-cell f";
        if (walls.has(k)) {
          cell.classList.remove("f");
          cell.classList.add("w");
        } else if (player.x === x && player.y === y) {
          cell.classList.remove("f");
          cell.classList.add("p");
        } else if (oTiles.some((t) => t.x === x && t.y === y)) {
          cell.classList.remove("f");
          cell.classList.add("o");
        } else if (xTiles.some((t) => t.x === x && t.y === y)) {
          cell.classList.remove("f");
          cell.classList.add("x");
        }
        if (winKeys.has(k)) cell.classList.add("win");
        if (doomKeys.has(k)) cell.classList.add("doomed");
        grid.append(cell);
      }
    }
    document.querySelector("#orchMoves").textContent = `Moves: ${moves}`;
    setSnapshot({
      mode: won ? "won" : lost ? "lost" : "playing",
      game: "Orchard Go",
      board: orchIndex + 1,
      moves,
      player
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
      const [dx, dy] = DIRS[map[event.key]];
      tryStep(dx, dy);
    } else if (event.key === "z" || event.key === "Z") {
      doUndo();
    }
  }

  function doUndo() {
    const snap = history.pop();
    if (!snap) {
      message.textContent = "Nothing to undo.";
      return;
    }
    restore(snap);
    message.textContent = "Undone. The orchard forgives.";
    render();
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
    if (Math.abs(dx) > Math.abs(dy)) tryStep(dx > 0 ? 1 : -1, 0);
    else tryStep(0, dy > 0 ? 1 : -1);
  }, { passive: true });

  document.querySelectorAll("[data-step]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const [dx, dy] = DIRS[btn.dataset.step];
      tryStep(dx, dy);
    });
  });
  document.querySelector("#orchUndo").addEventListener("click", doUndo);
  document.querySelector("#orchRulesBtn").addEventListener("click", () => {
    const panel = document.querySelector("#orchRules");
    panel.hidden = !panel.hidden;
    fitGameShell();
  });
  document.querySelector("#orchReset").addEventListener("click", () => {
    loadLevel(orchIndex);
    message.textContent = "Board reset. Fresh start, same fruit.";
    render();
  });
  document.querySelector("#orchNext").addEventListener("click", () => {
    if (orchIndex + 1 >= levels.length) {
      buildLevels(false);
      orchIndex = 0;
      loadLevel(0);
      message.textContent = "A fresh orchard grew. Keep picking.";
      render();
      return;
    }
    orchIndex += 1;
    loadLevel(orchIndex);
  });
  document.addEventListener("keydown", keydown);
  activeCleanup = () => {
    document.removeEventListener("keydown", keydown);
  };
  buildLevels(true);
  loadLevel(0);
}

gameStarters.orchard = startOrchardGo;
