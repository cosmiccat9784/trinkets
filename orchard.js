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

function tryGenOrchard(rand) {
  const inBounds = (x, y) => x >= 1 && x <= 5 && y >= 1 && y <= 5;
  const horiz = rand() < 0.5;
  const linePos = 1 + Math.floor(rand() * 5);
  const lineStart = 1 + Math.floor(rand() * 3);
  const lineCells = [0, 1, 2].map((k) => (horiz ? { x: lineStart + k, y: linePos } : { x: linePos, y: lineStart + k }));
  const reserved = new Set(lineCells.map((c) => orchKey(c.x, c.y)));

  const walls = new Set();
  const wallCount = 2 + Math.floor(rand() * 4);
  let guard = 0;
  while (walls.size < wallCount && guard++ < 200) {
    const x = 1 + Math.floor(rand() * 5);
    const y = 1 + Math.floor(rand() * 5);
    const k = orchKey(x, y);
    if (reserved.has(k) || walls.has(k)) continue;
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
    if (taken.has(k) || walls.has(k)) continue;
    taken.add(k);
    xTiles.push({ x, y });
  }
  if (xTiles.length < 4) return null;
  if (findOrchardLine(xTiles)) return null;

  const atTile = (x, y) =>
    oTiles.concat(xTiles).find((t) => t.x === x && t.y === y) || null;
  const oCells = () => [{ ...player }, ...oTiles.map((t) => ({ ...t }))];

  const solution = [];
  let pulls = 0;
  const steps = 40 + Math.floor(rand() * 30);
  for (let s = 0; s < steps; s++) {
    const options = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => {
      const nx = player.x + dx;
      const ny = player.y + dy;
      return inBounds(nx, ny) && !walls.has(orchKey(nx, ny)) && !atTile(nx, ny);
    });
    if (options.length === 0) return null;
    const [dx, dy] = options[Math.floor(rand() * options.length)];
    const px = player.x;
    const py = player.y;
    const behind = atTile(px - dx, py - dy);
    player.x = px + dx;
    player.y = py + dy;
    if (behind) {
      behind.x = px;
      behind.y = py;
      pulls += 1;
    }
    if (findOrchardLine(xTiles)) {
      if (behind) {
        behind.x = px - dx;
        behind.y = py - dy;
        pulls -= 1;
      }
      player.x = px;
      player.y = py;
      continue;
    }
    solution.push([dx, dy]);
  }
  if (pulls < 6) return null;
  if (findOrchardLine(oCells())) return null;
  if (findOrchardLine(xTiles)) return null;
  return {
    walls: [...walls],
    player: { ...player },
    oTiles: oTiles.map((t) => ({ ...t })),
    xTiles: xTiles.map((t) => ({ ...t })),
    solution: solution.reverse().map(([dx, dy]) => [-dx, -dy])
  };
}

function genOrchardLevel(rand) {
  for (let attempt = 0; attempt < 80; attempt++) {
    const level = tryGenOrchard(rand);
    if (level) return level;
  }
  return {
    walls: [],
    player: { x: 3, y: 2 },
    oTiles: [{ x: 2, y: 3 }, { x: 4, y: 3 }],
    xTiles: [{ x: 1, y: 1 }, { x: 5, y: 1 }, { x: 3, y: 5 }, { x: 1, y: 5 }],
    solution: [[0, 1]]
  };
}

function startOrchardGo() {
  openGame(
    "Orchard Go",
    "Puzzle",
    `
      <div class="game-layout">
        <div class="game-topline">
          <span class="game-stat" id="orchBoard">Board: 1/12</span>
          <span class="game-stat" id="orchMoves">Moves: 0</span>
        </div>
        <p class="game-message" id="orchMsg">Shove oranges into a line of three. Crabapples must never line up.</p>
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
        </div>
      </div>
    `
  );

  const ORCH_COUNT = 40;
  const today = new Date().toISOString().slice(0, 10);
  let levels = [];
  let orchIndex = 0;
  let walls = new Set();
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

  function loadLevel(index) {
    const level = levels[index];
    walls = new Set(level.walls);
    player = { ...level.player };
    oTiles = level.oTiles.map((t) => ({ ...t }));
    xTiles = level.xTiles.map((t) => ({ ...t }));
    moves = 0;
    won = false;
    lost = false;
    winCells = [];
    doomCells = [];
    history = [];
    document.querySelector("#orchBoard").textContent = `Board: ${index + 1}/${levels.length}`;
    message.textContent = index === 0
      ? "Today's board first, then fresh ones. Shove oranges into a line of three."
      : "Shove oranges into a line of three. Crabapples must never line up.";
    render();
  }

  function tileAt(x, y) {
    return oTiles.concat(xTiles).find((t) => t.x === x && t.y === y) || null;
  }

  function floorFree(x, y) {
    if (x < 0 || x > 6 || y < 0 || y > 6) return false;
    if (walls.has(orchKey(x, y))) return false;
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
      const tile = nx >= 0 && nx <= 6 && ny >= 0 && ny <= 6 && !walls.has(orchKey(nx, ny)) ? tileAt(nx, ny) : null;
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
        cell.className = "orch-cell f";
        const k = orchKey(x, y);
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
