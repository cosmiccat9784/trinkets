const filters = document.querySelectorAll(".filter");
const cards = [...document.querySelectorAll(".game-card")];
const saveButtons = document.querySelectorAll(".save-button");
const playButtons = document.querySelectorAll(".play-button");
const favoriteCount = document.querySelector("#favoriteCount");
const shufflePick = document.querySelector("#shufflePick");
const puzzleButtons = document.querySelectorAll(".puzzle-board button");
const puzzleStatus = document.querySelector("#puzzleStatus");
const gameModal = document.querySelector("#gameModal");
const gameShell = document.querySelector("#gameShell");
const modalTitle = document.querySelector("#modalTitle");
const modalKicker = document.querySelector("#modalKicker");
const closeGame = document.querySelector("#closeGame");

let savedPicks = 0;
let activeCleanup = null;
let activeSnapshot = { mode: "shelf" };
let activeAdvance = null;
const colors = ["coral", "mint", "gold", "ink"];

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

const gameStarters = {
  switchback: startSwitchbackTiles,
  comet: startCometCatch,
  forge: startFourLetterForge,
  maze: startPocketMaze,
  bash: startButtonBash,
  clue: startClueCrate
};

filters.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;

    filters.forEach((item) => item.classList.remove("active"));
    filters.forEach((item) => item.setAttribute("aria-pressed", "false"));
    button.classList.add("active");
    button.setAttribute("aria-pressed", "true");

    cards.forEach((card) => {
      const shouldShow = filter === "all" || card.dataset.category === filter;
      card.classList.toggle("hidden", !shouldShow);
    });
  });
});

saveButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const isSaved = button.classList.toggle("saved");
    button.textContent = isSaved ? "Saved" : "Save pick";
    savedPicks += isSaved ? 1 : -1;
    favoriteCount.textContent = savedPicks;
  });
});

playButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const card = button.closest(".game-card");
    const starter = gameStarters[card.dataset.game];
    if (starter) {
      starter();
    }
  });
});

shufflePick.addEventListener("click", () => {
  const visibleCards = cards.filter((card) => !card.classList.contains("hidden"));
  const chosen = visibleCards[Math.floor(Math.random() * visibleCards.length)] || cards[0];

  chosen.animate(
    [
      { transform: "translateY(0)" },
      { transform: "translateY(-10px)" },
      { transform: "translateY(0)" }
    ],
    { duration: 360, easing: "ease-out" }
  );

  chosen.scrollIntoView({ behavior: "smooth", block: "center" });
});

puzzleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const currentIndex = colors.indexOf(button.dataset.color);
    const nextColor = colors[(currentIndex + 1) % colors.length];
    button.dataset.color = nextColor;
    updatePuzzleStatus();
  });
});

closeGame.addEventListener("click", closeActiveGame);
gameModal.addEventListener("click", (event) => {
  if (event.target === gameModal) {
    closeActiveGame();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && gameModal.classList.contains("open")) {
    closeActiveGame();
  }
});

function updatePuzzleStatus() {
  const cornerColors = [
    puzzleButtons[0].dataset.color,
    puzzleButtons[2].dataset.color,
    puzzleButtons[6].dataset.color,
    puzzleButtons[8].dataset.color
  ];
  const solved = cornerColors.every((color) => color === cornerColors[0]);

  puzzleStatus.textContent = solved
    ? "Corner match. That one counts."
    : "Make the four corners match.";
}

function openGame(title, kicker, html) {
  closeCurrentGameOnly();
  modalTitle.textContent = title;
  modalKicker.textContent = kicker;
  gameShell.innerHTML = html;
  gameModal.classList.add("open");
  gameModal.setAttribute("aria-hidden", "false");
  activeSnapshot = { mode: "playing", game: title };
  activeAdvance = null;
  closeGame.focus();
}

function closeActiveGame() {
  closeCurrentGameOnly();
  gameModal.classList.remove("open");
  gameModal.setAttribute("aria-hidden", "true");
  gameShell.innerHTML = "";
  activeSnapshot = { mode: "shelf" };
  activeAdvance = null;
}

function closeCurrentGameOnly() {
  if (activeCleanup) {
    activeCleanup();
    activeCleanup = null;
  }
}

function setSnapshot(payload) {
  activeSnapshot = payload;
}

window.render_game_to_text = () => JSON.stringify(activeSnapshot);
window.advanceTime = (ms) => {
  if (activeAdvance) {
    activeAdvance(ms);
  }
  return window.render_game_to_text();
};

function startSwitchbackTiles() {
  openGame(
    "Switchback Tiles",
    "Puzzle",
    `
      <div class="game-layout">
        <div class="game-topline">
          <span class="game-stat">Goal: connect <img src="assets/switchback/start.png" class="tile-img-inline" alt="Start" /> to <img src="assets/switchback/end.png" class="tile-img-inline" alt="End" /></span>
          <span class="game-stat" id="switchPuzzle">Puzzle: 1/1</span>
          <span class="game-stat" id="switchMoves">Moves: 0</span>
        </div>
        <p class="game-message" id="switchMessage">Click tiles to rotate them. Pipes must meet on both sides.</p>
        <div class="pipe-grid" id="pipeGrid" aria-label="Pipe puzzle grid"></div>
        <div class="game-actions">
          <button class="game-action" id="switchReset" type="button">Reset puzzle</button>
          <button class="game-action" id="switchNext" type="button">Next puzzle</button>
        </div>
      </div>
    `
  );

  const allPaths = [
    [0, 1, 6, 11, 12, 13, 18, 23, 24],
    [0, 5, 10, 11, 12, 7, 8, 9, 14, 19, 24],
    [0, 1, 2, 3, 8, 13, 12, 17, 22, 23, 24],
    [0, 5, 6, 7, 2, 3, 4, 9, 14, 13, 18, 19, 24],
    [0, 5, 10, 11, 6, 7, 8, 13, 14, 19, 24],
    [0, 1, 2, 7, 12, 11, 10, 15, 16, 17, 22, 23, 24],
    [0, 5, 6, 11, 12, 17, 18, 23, 24],
    [0, 1, 6, 7, 8, 9, 14, 13, 18, 19, 24],
    [0, 5, 10, 15, 14, 13, 12, 17, 22, 23, 24],
    [0, 1, 2, 3, 4, 9, 14, 19, 24],
    [0, 5, 6, 11, 16, 17, 18, 23, 24],
    [0, 1, 2, 7, 12, 13, 14, 9, 10, 15, 20, 21, 22, 23, 24]
  ];
  const fillerTiles = [
    ["corner", 0], ["line", 1], ["tee", 2], ["corner", 3], ["line", 0],
    ["corner", 1], ["tee", 0], ["line", 1], ["corner", 2], ["line", 0],
    ["corner", 2], ["line", 0], ["tee", 1], ["corner", 0], ["line", 1]
  ];
  const paths = shuffleArray([...allPaths]);
  const puzzles = paths.map((path, pathIndex) => buildSwitchbackPuzzle(path, pathIndex));
  const grid = document.querySelector("#pipeGrid");
  const message = document.querySelector("#switchMessage");
  const moveLabel = document.querySelector("#switchMoves");
  const puzzleLabel = document.querySelector("#switchPuzzle");
  let puzzleIndex = 0;
  let moves = 0;
  let tiles = [];

  function reset() {
    moves = 0;
    tiles = puzzles[puzzleIndex].map(([type, solution, offset]) => ({
      type,
      solution,
      rotation: (solution + offset) % 4
    }));
    render();
  }

  function buildSwitchbackPuzzle(path, pathIndex) {
    const required = Array.from({ length: 25 }, () => new Set());
    for (let index = 0; index < path.length - 1; index += 1) {
      const from = path[index];
      const to = path[index + 1];
      const edge = edgeBetween(from, to);
      required[from].add(edge);
      required[to].add((edge + 2) % 4);
    }

    return required.map((edges, index) => {
      const solvedTile = edges.size ? tileForEdges([...edges]) : fillerTile(index, pathIndex);
      const offset = (index * 2 + pathIndex + 1) % 4;
      if (index === 0) return ["start", 0, 0];
      if (index === 24) return ["finish", 0, 0];
      return [solvedTile.type, solvedTile.rotation, offset];
    });
  }

  function edgeBetween(from, to) {
    const delta = to - from;
    if (delta === -5) return 0;
    if (delta === 1) return 1;
    if (delta === 5) return 2;
    if (delta === -1) return 3;
    return 1;
  }

  function tileForEdges(edges) {
    const sorted = edges.sort((a, b) => a - b);
    if (sorted.length === 1) {
      return { type: "end", rotation: (sorted[0] + 3) % 4 };
    }
    if (sorted.length === 2 && (sorted[0] + 2) % 4 === sorted[1]) {
      return { type: "line", rotation: sorted.includes(1) ? 1 : 0 };
    }
    if (sorted.length === 2) {
      const key = sorted.join(",");
      const rotations = { "0,1": 0, "1,2": 1, "2,3": 2, "0,3": 3 };
      return { type: "corner", rotation: rotations[key] };
    }
    const missing = [0, 1, 2, 3].find((e) => !sorted.includes(e));
    return { type: "tee", rotation: (missing + 2) % 4 };
  }

  function fillerTile(index, pathIndex) {
    const [type, rotation] = fillerTiles[(index + pathIndex * 3) % fillerTiles.length];
    return { type, rotation };
  }

  function tileEdges(tile) {
    if (tile.type === "start" || tile.type === "finish") return [0, 1, 2, 3];
    const base = {
      end: [1],
      line: [0, 2],
      corner: [0, 1],
      tee: [0, 1, 3]
    }[tile.type];
    return base.map((edge) => (edge + tile.rotation) % 4);
  }

  function neighbor(index, edge) {
    const x = index % 5;
    const y = Math.floor(index / 5);
    const nx = x + [0, 1, 0, -1][edge];
    const ny = y + [-1, 0, 1, 0][edge];
    if (nx < 0 || nx > 4 || ny < 0 || ny > 4) {
      return -1;
    }
    return ny * 5 + nx;
  }

  function connectedSet() {
    const seen = new Set([0]);
    const queue = [0];
    while (queue.length) {
      const index = queue.shift();
      tileEdges(tiles[index]).forEach((edge) => {
        const next = neighbor(index, edge);
        if (next < 0 || seen.has(next)) {
          return;
        }
        const back = (edge + 2) % 4;
        if (tileEdges(tiles[next]).includes(back)) {
          seen.add(next);
          queue.push(next);
        }
      });
    }
    return seen;
  }

  function glyph(tile, index, isConnected) {
    const lit = isConnected ? "_lit" : "";
    if (index === 0) return '<img src="assets/switchback/start.png" class="tile-img" alt="Start" />';
    if (index === 24) return '<img src="assets/switchback/end' + lit + '.png" class="tile-img" alt="End" />';
    if (tile.type === "line") return '<img src="assets/switchback/straight' + lit + '.png" class="tile-img" style="transform:rotate(' + (tile.rotation * 90) + 'deg)" alt="Pipe" />';
    if (tile.type === "corner") return '<img src="assets/switchback/turn' + lit + '.png" class="tile-img" style="transform:rotate(' + (tile.rotation * 90) + 'deg)" alt="Pipe" />';
    if (tile.type === "tee") return '<img src="assets/switchback/junction' + lit + '.png" class="tile-img" style="transform:rotate(' + (tile.rotation * 90) + 'deg)" alt="Pipe" />';
    return ".";
  }

  function render() {
    const connected = connectedSet();
    const solved = connected.has(24);
    grid.innerHTML = "";
    tiles.forEach((tile, index) => {
      const button = document.createElement("button");
      button.className = "pipe-tile";
      if (connected.has(index)) button.classList.add("connected");
      if (index === 0) button.classList.add("start");
      if (index === 24) button.classList.add("end");
      button.type = "button";
      button.innerHTML = glyph(tile, index, connected.has(index));
      button.setAttribute("aria-label", `Rotate tile ${index + 1}`);
      button.addEventListener("click", () => {
        if (index === 0 || index === 24) return;
        tile.rotation = (tile.rotation + 1) % 4;
        moves += 1;
        render();
      });
      grid.append(button);
    });
    moveLabel.textContent = `Moves: ${moves}`;
    puzzleLabel.textContent = `Puzzle: ${puzzleIndex + 1}/${puzzles.length}`;
    message.textContent = solved ? "Connected. The switchback path is open." : "Click tiles to rotate them. Pipes must meet on both sides.";
    setSnapshot({
      mode: solved ? "won" : "playing",
      game: "Switchback Tiles",
      puzzle: puzzleIndex + 1,
      moves,
      connectedTiles: connected.size,
      solved,
      note: "5x5 grid. Start index 0, finish index 24."
    });
  }

  document.querySelector("#switchReset").addEventListener("click", reset);
  document.querySelector("#switchNext").addEventListener("click", () => {
    puzzleIndex = (puzzleIndex + 1) % puzzles.length;
    reset();
  });
  reset();
}

function startCometCatch() {
  openGame(
    "Comet Catch",
    "Arcade",
    `
      <div class="game-layout">
        <div class="game-topline">
          <span class="game-stat" id="cometScore">Score: 0</span>
          <span class="game-stat" id="cometTime">Time: 45</span>
          <span class="game-stat">Move: WASD, arrows, mouse, or touch</span>
        </div>
        <canvas class="arcade-canvas" id="cometCanvas" width="720" height="540"></canvas>
        <p class="game-message" id="cometMessage">Catch gold comets. Avoid red sparks.</p>
        <div class="game-actions">
          <button class="game-action" id="cometRestart" type="button">Restart</button>
        </div>
      </div>
    `
  );

  const canvas = document.querySelector("#cometCanvas");
  const ctx = canvas.getContext("2d");
  const scoreLabel = document.querySelector("#cometScore");
  const timeLabel = document.querySelector("#cometTime");
  const message = document.querySelector("#cometMessage");
  const keys = new Set();
  let raf = 0;
  let last = performance.now();
  let running = true;
  let state;

  function reset() {
    state = {
      player: { x: 360, y: 270, r: 18 },
      comets: makeDots(7, 12, "#f6c445"),
      sparks: makeDots(5, 14, "#ff6b6b"),
      score: 0,
      time: 45
    };
    running = true;
    message.textContent = "Catch gold comets. Avoid red sparks.";
    last = performance.now();
  }

  function makeDots(count, radius, color) {
    return Array.from({ length: count }, (_, index) => ({
      x: 80 + ((index * 113) % 560),
      y: 70 + ((index * 83) % 390),
      vx: ((index % 2 ? 1 : -1) * (55 + index * 8)),
      vy: ((index % 3 ? 1 : -1) * (42 + index * 6)),
      r: radius,
      color
    }));
  }

  function moveDot(dot, dt) {
    dot.x += dot.vx * dt;
    dot.y += dot.vy * dt;
    if (dot.x < dot.r || dot.x > canvas.width - dot.r) dot.vx *= -1;
    if (dot.y < dot.r || dot.y > canvas.height - dot.r) dot.vy *= -1;
    dot.x = Math.max(dot.r, Math.min(canvas.width - dot.r, dot.x));
    dot.y = Math.max(dot.r, Math.min(canvas.height - dot.r, dot.y));
  }

  function update(dt) {
    if (!running) return;
    const speed = 250;
    if (keys.has("ArrowLeft") || keys.has("a")) state.player.x -= speed * dt;
    if (keys.has("ArrowRight") || keys.has("d")) state.player.x += speed * dt;
    if (keys.has("ArrowUp") || keys.has("w")) state.player.y -= speed * dt;
    if (keys.has("ArrowDown") || keys.has("s")) state.player.y += speed * dt;
    state.player.x = Math.max(state.player.r, Math.min(canvas.width - state.player.r, state.player.x));
    state.player.y = Math.max(state.player.r, Math.min(canvas.height - state.player.r, state.player.y));
    state.time = Math.max(0, state.time - dt);

    state.comets.forEach((dot) => moveDot(dot, dt));
    state.sparks.forEach((dot) => moveDot(dot, dt));

    state.comets.forEach((dot) => {
      if (distance(state.player, dot) < state.player.r + dot.r) {
        state.score += 10;
        dot.x = 50 + Math.random() * 620;
        dot.y = 50 + Math.random() * 440;
      }
    });
    state.sparks.forEach((dot) => {
      if (distance(state.player, dot) < state.player.r + dot.r) {
        state.score = Math.max(0, state.score - 8);
        dot.x = 50 + Math.random() * 620;
        dot.y = 50 + Math.random() * 440;
      }
    });

    if (state.time <= 0) {
      running = false;
      message.textContent = `Time. Final score: ${state.score}.`;
    }
  }

  function render() {
    ctx.fillStyle = "#fff8ea";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, canvas.width, canvas.height);
    [...state.comets, ...state.sparks].forEach((dot) => {
      ctx.fillStyle = dot.color;
      ctx.strokeStyle = "#19212b";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    ctx.fillStyle = "#43c6ac";
    ctx.strokeStyle = "#19212b";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(state.player.x, state.player.y, state.player.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    scoreLabel.textContent = `Score: ${state.score}`;
    timeLabel.textContent = `Time: ${Math.ceil(state.time)}`;
    setSnapshot({
      mode: running ? "playing" : "ended",
      game: "Comet Catch",
      coordinateSystem: "Canvas origin top-left, x right, y down.",
      player: roundedPoint(state.player),
      comets: state.comets.map(roundedPoint),
      sparks: state.sparks.map(roundedPoint),
      score: state.score,
      time: Math.ceil(state.time)
    });
  }

  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    render();
    raf = requestAnimationFrame(tick);
  }

  function keydown(event) {
    keys.add(event.key);
  }

  function keyup(event) {
    keys.delete(event.key);
  }

  function pointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    const point = event.touches ? event.touches[0] : event;
    state.player.x = ((point.clientX - rect.left) / rect.width) * canvas.width;
    state.player.y = ((point.clientY - rect.top) / rect.height) * canvas.height;
  }

  document.addEventListener("keydown", keydown);
  document.addEventListener("keyup", keyup);
  canvas.addEventListener("mousemove", pointerMove);
  canvas.addEventListener("touchmove", pointerMove, { passive: true });
  document.querySelector("#cometRestart").addEventListener("click", reset);
  activeAdvance = (ms) => {
    const steps = Math.max(1, Math.round(ms / 16));
    for (let index = 0; index < steps; index += 1) update(1 / 60);
    render();
  };
  activeCleanup = () => {
    cancelAnimationFrame(raf);
    document.removeEventListener("keydown", keydown);
    document.removeEventListener("keyup", keyup);
  };
  reset();
  render();
  raf = requestAnimationFrame(tick);
}

function startFourLetterForge() {
  openGame(
    "Four-Letter Forge",
    "Word",
    `
      <div class="game-layout">
        <div class="game-topline">
          <span class="game-stat" id="forgeLevel">Level: 1</span>
          <span class="game-stat" id="forgeSteps">Steps: 0</span>
        </div>
        <div class="word-panel">
          <p class="game-message" id="forgeMessage">Change one letter at a time to reach the target.</p>
          <div>
            <p class="tag">Current word</p>
            <div class="word-row" id="forgeCurrent"></div>
          </div>
          <div>
            <p class="tag">Target word</p>
            <div class="word-row" id="forgeTarget"></div>
          </div>
          <form class="game-actions" id="forgeForm">
            <input class="game-input" id="forgeInput" maxlength="4" autocomplete="off" placeholder="Type a 4-letter word" />
            <button class="game-action" type="submit">Forge</button>
            <button class="game-action" id="forgeHint" type="button">Hint</button>
          </form>
          <ul class="word-history" id="forgeHistory" aria-label="Accepted words"></ul>
        </div>
      </div>
    `
  );

  const allLevels = [
    { start: "COLD", target: "WARM", path: ["CORD", "CARD", "WARD", "WARM"] },
    { start: "WIND", target: "FIRE", path: ["FIND", "FINE", "FIRE"] },
    { start: "HEAD", target: "TAIL", path: ["HEAL", "TEAL", "TELL", "TALL", "TAIL"] },
    { start: "GAME", target: "CODE", path: ["GATE", "GAVE", "CAVE", "COVE", "CODE"] },
    { start: "SAND", target: "GOLD", path: ["BAND", "BEND", "BOND", "BOLD", "GOLD"] },
    { start: "MARS", target: "MOON", path: ["MARE", "MORE", "MOOR", "MOON"] },
    { start: "DUST", target: "MIST", path: ["MUST", "MIST"] },
    { start: "BIRD", target: "WORM", path: ["BARD", "WARD", "WARM", "WORM"] },
    { start: "LOST", target: "GAIN", path: ["LOST", "LIST", "LAST", "GAST", "GAIN"] },
    { start: "STAR", target: "MOON", path: ["STAB", "SLAB", "SLOB", "MOB", "MOON"] },
    { start: "BOOK", target: "LOOK", path: ["BOOT", "LOOT", "LOOK"] },
    { start: "FISH", target: "DISH", path: ["DISH"] },
    { start: "WALK", target: "TALK", path: ["WALK", "TALK"] },
    { start: "PLAY", target: "STAY", path: ["SLAY", "STAY"] },
    { start: "RING", target: "SING", path: ["KING", "SING"] },
    { start: "FROG", target: "FROM", path: ["FLOG", "FROM"] },
    { start: "BEAR", target: "PEAR", path: ["TEAR", "PEAR"] },
    { start: "BLUE", target: "GLUE", path: ["GLUE"] },
    { start: "CAT", target: "HAT", path: ["HAT"] },
    { start: "DOG", target: "FOG", path: ["FOG"] }
  ];
  const levels = shuffleArray([...allLevels]);
  const extraWords = [
    "BAND", "BARD", "BARN", "BEND", "BIRD", "BOLD", "BOLT", "BOND", "BOOK", "BOON", "BOOT",
    "BORN", "BURN", "CARD", "CARE", "CAVE", "CODE", "COLD", "CORD", "CORE", "CORK", "COVE",
    "DARK", "DART", "DASH", "DUSK", "DUST", "FIND", "FINE", "FIRE", "FIRM", "FISH", "FIST",
    "GAME", "GATE", "GAVE", "GOLD", "HARD", "HARE", "HEAD", "HEAL", "HEAR", "HEAT", "LACE",
    "LAKE", "LAME", "LATE", "LINE", "LIVE", "LOCK", "LONG", "LOVE", "MARE", "MARS", "MART",
    "MATE", "MELT", "MIST", "MOON", "MOOR", "MORE", "MUSK", "MUST", "PLAY", "PLOT", "PORT",
    "SAND", "SOAR", "SOOT", "SOON", "STAR", "TALL", "TAIL", "TEAL", "TELL", "TOLD", "WAND",
    "WARD", "WARE", "WARM", "WIND", "WINE", "WIRE", "WORM", "BOOK", "BOOT", "BORN", "BURN",
    "CARE", "CART", "CAST", "FISH", "FIST", "FLOG", "FOIL", "FORK", "FROM", "GAIN", "GAIN",
    "HAIR", "HALF", "HAND", "HEAR", "HEAT", "HIDE", "HILL", "HINT", "HOPE", "HORN", "HUNT",
    "KING", "KISS", "KITE", "KNEE", "KNOB", "KNOT", "KNOW", "LAST", "LATE", "LAWN", "LEFT",
    "LIST", "LOOK", "LOST", "LOVE", "LUCK", "MAKE", "MALL", "MASK", "MAST", "MORE", "MUST",
    "NAIL", "NAME", "NEAT", "NEED", "NODE", "NONE", "NOON", "NORM", "NOTE", "OBEY", "ODDS",
    "ONCE", "ONLY", "OPEN", "ORAL", "OVEN", "OVER", "PAIN", "PAIR", "PALM", "PANE", "PART",
    "PASS", "PAST", "PATH", "PEAR", "PLAY", "PLOT", "PLUG", "PLUS", "PULL", "PUMP", "PURE",
    "RACE", "RAIL", "RAIN", "RANK", "RARE", "RASH", "RISK", "ROAD", "ROAM", "ROCK", "ROLE",
    "ROLL", "ROOT", "ROPE", "ROSE", "RUIN", "RULE", "SALT", "SAME", "SAVE", "SEAT", "SEED",
    "SEEN", "SELF", "SELL", "SEND", "SHED", "SHOW", "SHUT", "SICK", "SIDE", "SIGN", "SING",
    "SINK", "SIZE", "SKIN", "SLAB", "SLAM", "SLAP", "SLED", "SLID", "SLIM", "SLIP", "SLOT",
    "SLOW", "SLOB", "SLUG", "SMOG", "SNAP", "SNOW", "SOAK", "SOAR", "SOCK", "SODA", "SOFA",
    "SOFT", "SOIL", "SOLD", "SOLE", "SOON", "SOOT", "SORT", "SOUL", "SOUP", "SPAN", "SPIN",
    "SPOT", "STAB", "STAR", "STAY", "STEM", "STEP", "STEW", "STOP", "STUB", "STUD", "SUCH",
    "SUIT", "SUNG", "SURE", "SWIM", "TAIL", "TAKE", "TALE", "TALK", "TALL", "TAME", "TANK",
    "TAPE", "TART", "TEAL", "TEAR", "TELL", "TEND", "TENT", "TEST", "THEM", "THEN", "THEY",
    "THIN", "THIS", "THUS", "TIDE", "TIDY", "TIED", "TIER", "TILE", "TILL", "TIME", "TINY",
    "TOLD", "TOLL", "TOMB", "TONE", "TOOK", "TOOL", "TOPS", "TORE", "TORN", "TOSS", "TOUR",
    "TOWN", "TRAP", "TRAY", "TREE", "TRIM", "TRIO", "TRIP", "TROD", "TROT", "TRUE", "TUBE",
    "TUCK", "TUFT", "TUNE", "TURN", "TUSK", "TWIN", "TYPE", "UGLY", "UNDO", "UNIT", "UPON",
    "URGE", "USED", "USER", "VAIN", "VALE", "VARY", "VAST", "VEIL", "VEIN", "VENT", "VERY",
    "VEST", "VETO", "VIEW", "VINE", "VOID", "VOTE", "WADE", "WAGE", "WAIL", "WAIT", "WAKE",
    "WALK", "WALL", "WAND", "WANT", "WARD", "WARM", "WARN", "WARP", "WARY", "WASH", "WAVE",
    "WAVY", "WAXY", "WEAK", "WEAR", "WEED", "WEEK", "WELL", "WENT", "WERE", "WEST", "WHAT",
    "WHEN", "WHOM", "WICK", "WIDE", "WIFE", "WILD", "WILL", "WILT", "WILY", "WIND", "WINE",
    "WING", "WINK", "WIPE", "WIRE", "WISE", "WISH", "WITH", "WOKE", "WOLF", "WOOD", "WOOL",
    "WORD", "WORE", "WORK", "WORM", "WORN", "WOVE", "WRAP", "WREN", "YARD", "YARN", "YEAR",
    "YELL", "YOUR", "ZEST", "ZINC", "ZONE", "ZOOM"
  ];
  const dictionary = new Set(levels.flatMap((level) => [level.start, level.target, ...level.path]).concat(extraWords));
  let levelIndex = 0;
  let current = levels[0].start;
  let steps = 0;
  let history = [current];
  const form = document.querySelector("#forgeForm");
  const input = document.querySelector("#forgeInput");
  const message = document.querySelector("#forgeMessage");

  function render() {
    const level = levels[levelIndex];
    renderLetters("#forgeCurrent", current);
    renderLetters("#forgeTarget", level.target);
    document.querySelector("#forgeLevel").textContent = `Level: ${levelIndex + 1}`;
    document.querySelector("#forgeSteps").textContent = `Steps: ${steps}`;
    document.querySelector("#forgeHistory").innerHTML = history.map((word) => `<li>${word}</li>`).join("");
    setSnapshot({
      mode: current === level.target ? "level-complete" : "playing",
      game: "Four-Letter Forge",
      current,
      target: level.target,
      steps,
      history
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const word = input.value.trim().toUpperCase();
    const level = levels[levelIndex];
    input.value = "";
    if (word.length !== 4) {
      message.textContent = "Use exactly four letters.";
      return;
    }
    if (!dictionary.has(word)) {
      message.textContent = "That word is not in this tiny forge dictionary.";
      return;
    }
    if (history.includes(word)) {
      message.textContent = "Fresh words only.";
      return;
    }
    if (letterDifference(current, word) !== 1) {
      message.textContent = "Change exactly one letter from the current word.";
      return;
    }
    current = word;
    history.push(word);
    steps += 1;
    if (current === level.target) {
      if (levelIndex === levels.length - 1) {
        message.textContent = "All chains forged. Nicely done.";
      } else {
        message.textContent = "Target reached. A new chain is ready.";
        levelIndex += 1;
        current = levels[levelIndex].start;
        history = [current];
      }
    } else {
      message.textContent = "Good link. Keep forging.";
    }
    render();
  });

  document.querySelector("#forgeHint").addEventListener("click", () => {
    const level = levels[levelIndex];
    const next = level.path.find((word) => !history.includes(word));
    message.textContent = next ? `Try ${next}.` : "You are right at the target.";
  });

  render();
}

function startPocketMaze() {
  openGame(
    "Pocket Maze",
    "Puzzle",
    `
      <div class="game-layout">
        <div class="game-topline">
          <span class="game-stat" id="mazeNumber">Maze: 1/1</span>
          <span class="game-stat" id="mazeMoves">Moves: 0</span>
          <span class="game-stat" id="mazeKey">Key: no</span>
          <span class="game-stat">Move: arrows, WASD, or buttons</span>
        </div>
        <p class="game-message" id="mazeMessage">Collect the key, then reach the green exit.</p>
        <div class="maze-grid" id="mazeGrid" aria-label="Pocket maze"></div>
        <div class="maze-controls" aria-label="Maze movement controls">
          <button class="maze-control" type="button" data-move="up">U</button>
          <button class="maze-control" type="button" data-move="left">L</button>
          <button class="maze-control" type="button" data-move="down">D</button>
          <button class="maze-control" type="button" data-move="right">R</button>
        </div>
        <div class="game-actions">
          <button class="game-action" id="mazeReset" type="button">Reset maze</button>
          <button class="game-action" id="mazeNext" type="button">Next maze</button>
        </div>
      </div>
    `
  );

  const allMazeMaps = [
    {
      rows: [
        "#######",
        "#P..K.#",
        "#.###.#",
        "#...#.#",
        "###.#.#",
        "#.....E",
        "#######"
      ],
      shifting: [{ x: 2, y: 3 }, { x: 4, y: 5 }]
    },
    {
      rows: [
        "#######",
        "#P#...#",
        "#.#.#K#",
        "#...#.#",
        "#.###.#",
        "#....E#",
        "#######"
      ],
      shifting: [{ x: 2, y: 3 }, { x: 4, y: 1 }]
    },
    {
      rows: [
        "#######",
        "#P....#",
        "###.#.#",
        "#K..#.#",
        "#.###.#",
        "#....E#",
        "#######"
      ],
      shifting: [{ x: 3, y: 2 }, { x: 2, y: 4 }]
    },
    {
      rows: [
        "#######",
        "#P#K..#",
        "#.#.#.#",
        "#...#.#",
        "###...#",
        "#....E#",
        "#######"
      ],
      shifting: [{ x: 3, y: 3 }, { x: 5, y: 2 }]
    },
    {
      rows: [
        "########",
        "#P.....#",
        "#.####.#",
        "#.#K...#",
        "#.#.###.#",
        "#.....#E",
        "########"
      ],
      shifting: [{ x: 2, y: 2 }, { x: 4, y: 4 }]
    },
    {
      rows: [
        "#######",
        "#P.K..#",
        "#.#.#.#",
        "#...#.#",
        "#.#.#.#",
        "#...#E#",
        "#######"
      ],
      shifting: [{ x: 1, y: 3 }, { x: 5, y: 1 }]
    },
    {
      rows: [
        "########",
        "#P#....#",
        "#.#.##.#",
        "#.#K...#",
        "#.#.#..#",
        "#.....E#",
        "########"
      ],
      shifting: [{ x: 3, y: 2 }, { x: 5, y: 4 }]
    },
    {
      rows: [
        "#######",
        "#P...K#",
        "###.#.#",
        "#.....#",
        "#.#.###",
        "#....E#",
        "#######"
      ],
      shifting: [{ x: 2, y: 1 }, { x: 4, y: 3 }]
    },
    {
      rows: [
        "########",
        "#P..K..#",
        "#.###..#",
        "#..#...#",
        "#..#.###",
        "#......E",
        "########"
      ],
      shifting: [{ x: 2, y: 2 }, { x: 5, y: 3 }]
    },
    {
      rows: [
        "#######",
        "#P..#.#",
        "#.#...#",
        "#.#.#.#",
        "#.#.#K#",
        "#.....E",
        "#######"
      ],
      shifting: [{ x: 1, y: 2 }, { x: 3, y: 4 }]
    }
  ];
  const mazeMaps = shuffleArray([...allMazeMaps]);
  let mazeIndex = 0;
  let maze;
  let player;
  let hasKey;
  let moves;
  let openShift;
  let won;

  function reset() {
    const map = mazeMaps[mazeIndex];
    maze = map.rows.map((row) => row.split(""));
    player = findTile("P");
    hasKey = false;
    moves = 0;
    openShift = true;
    won = false;
    render();
  }

  function attempt(dx, dy) {
    if (won) {
      return;
    }
    const nx = player.x + dx;
    const ny = player.y + dy;
    const tile = maze[ny]?.[nx];
    if (!tile || tile === "#") {
      document.querySelector("#mazeMessage").textContent = "Bonk. Wall.";
      return;
    }
    if (tile === "E" && !hasKey) {
      document.querySelector("#mazeMessage").textContent = "The exit needs the key first.";
      return;
    }
    maze[player.y][player.x] = ".";
    player.x = nx;
    player.y = ny;
    moves += 1;
    if (tile === "K") {
      hasKey = true;
      document.querySelector("#mazeMessage").textContent = "Key collected. Find the exit.";
    } else if (tile === "E") {
      won = true;
      document.querySelector("#mazeMessage").textContent = `Escaped in ${moves} moves.`;
    } else {
      document.querySelector("#mazeMessage").textContent = moves % 5 === 0 ? "The maze shifted." : "Keep going.";
    }
    maze[player.y][player.x] = "P";
    if (moves % 5 === 0 && tile !== "E") {
      openShift = !openShift;
      mazeMaps[mazeIndex].shifting.forEach(({ x, y }) => {
        if (maze[y][x] !== "P") {
          maze[y][x] = openShift ? "." : "#";
        }
      });
    }
    render();
  }

  function render() {
    const grid = document.querySelector("#mazeGrid");
    grid.innerHTML = "";
    maze.forEach((row, y) => {
      row.forEach((tile, x) => {
        const cell = document.createElement("div");
        cell.className = "maze-cell";
        if (tile === "#") cell.classList.add("wall");
        if (tile === "P") cell.classList.add("player");
        if (tile === "K") cell.classList.add("key");
        if (tile === "E") cell.classList.add("exit");
        cell.textContent = { P: "P", K: "K", E: "E", "#": "", ".": "" }[tile];
        grid.append(cell);
      });
    });
    document.querySelector("#mazeNumber").textContent = `Maze: ${mazeIndex + 1}/${mazeMaps.length}`;
    document.querySelector("#mazeMoves").textContent = `Moves: ${moves}`;
    document.querySelector("#mazeKey").textContent = `Key: ${hasKey ? "yes" : "no"}`;
    setSnapshot({
      mode: won ? "won" : "playing",
      game: "Pocket Maze",
      maze: mazeIndex + 1,
      player,
      hasKey,
      moves,
      shiftingWallsOpen: openShift
    });
  }

  function findTile(target) {
    for (let y = 0; y < maze.length; y += 1) {
      const x = maze[y].indexOf(target);
      if (x >= 0) {
        return { x, y };
      }
    }
    return { x: 1, y: 1 };
  }

  function keydown(event) {
    const movesByKey = {
      ArrowUp: [0, -1],
      w: [0, -1],
      ArrowDown: [0, 1],
      s: [0, 1],
      ArrowLeft: [-1, 0],
      a: [-1, 0],
      ArrowRight: [1, 0],
      d: [1, 0]
    };
    if (movesByKey[event.key]) {
      event.preventDefault();
      attempt(...movesByKey[event.key]);
    }
  }

  document.querySelectorAll(".maze-control").forEach((button) => {
    const map = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    button.addEventListener("click", () => attempt(...map[button.dataset.move]));
  });
  document.querySelector("#mazeReset").addEventListener("click", reset);
  document.querySelector("#mazeNext").addEventListener("click", () => {
    mazeIndex = (mazeIndex + 1) % mazeMaps.length;
    document.querySelector("#mazeMessage").textContent = "Collect the key, then reach the green exit.";
    reset();
  });
  document.addEventListener("keydown", keydown);
  activeCleanup = () => document.removeEventListener("keydown", keydown);
  reset();
}

function startButtonBash() {
  openGame(
    "Button Bash",
    "Arcade",
    `
      <div class="game-layout">
        <div class="game-topline">
          <span class="game-stat" id="bashScore">Score: 0</span>
          <span class="game-stat" id="bashStreak">Streak: 0</span>
          <span class="game-stat" id="bashTime">Time: 20</span>
        </div>
        <p class="game-message" id="bashMessage">Press the lit button before time runs out. Number keys 1-9 work too.</p>
        <div class="bash-grid" id="bashGrid" aria-label="Reaction button grid"></div>
        <div class="game-actions">
          <button class="game-action" id="bashStart" type="button">Start round</button>
        </div>
      </div>
    `
  );

  let score = 0;
  let streak = 0;
  let time = 20;
  let target = -1;
  let timer = 0;
  let running = false;
  const grid = document.querySelector("#bashGrid");
  const buttons = [];

  for (let index = 0; index < 9; index += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "bash-button";
    button.textContent = index + 1;
    button.addEventListener("click", () => hit(index));
    buttons.push(button);
    grid.append(button);
  }

  function start() {
    clearInterval(timer);
    score = 0;
    streak = 0;
    time = 20;
    running = true;
    document.querySelector("#bashMessage").textContent = "Go.";
    chooseTarget();
    timer = setInterval(() => {
      time -= 1;
      if (time <= 0) {
        running = false;
        clearInterval(timer);
        target = -1;
        document.querySelector("#bashMessage").textContent = `Round over. Score: ${score}.`;
      }
      render();
    }, 1000);
    render();
  }

  function chooseTarget() {
    let next = Math.floor(Math.random() * buttons.length);
    if (next === target) next = (next + 1) % buttons.length;
    target = next;
  }

  function hit(index) {
    if (!running) return;
    if (index === target) {
      streak += 1;
      score += 10 + Math.min(streak, 10);
      buttons[index].classList.add("good");
      setTimeout(() => buttons[index].classList.remove("good"), 120);
      chooseTarget();
    } else {
      streak = 0;
      score = Math.max(0, score - 5);
      buttons[index].classList.add("bad");
      setTimeout(() => buttons[index].classList.remove("bad"), 120);
    }
    render();
  }

  function render() {
    buttons.forEach((button, index) => button.classList.toggle("lit", running && index === target));
    document.querySelector("#bashScore").textContent = `Score: ${score}`;
    document.querySelector("#bashStreak").textContent = `Streak: ${streak}`;
    document.querySelector("#bashTime").textContent = `Time: ${time}`;
    setSnapshot({
      mode: running ? "playing" : "ready",
      game: "Button Bash",
      score,
      streak,
      time,
      targetButton: target + 1
    });
  }

  function keydown(event) {
    const number = Number(event.key);
    if (number >= 1 && number <= 9) {
      hit(number - 1);
    }
  }

  document.querySelector("#bashStart").addEventListener("click", start);
  document.addEventListener("keydown", keydown);
  activeAdvance = (ms) => {
    if (!running) return;
    time = Math.max(0, time - Math.floor(ms / 1000));
    if (time === 0) running = false;
    render();
  };
  activeCleanup = () => {
    clearInterval(timer);
    document.removeEventListener("keydown", keydown);
  };
  render();
}

function startClueCrate() {
  openGame(
    "Clue Crate",
    "Word",
    `
      <div class="game-layout">
        <div class="game-topline">
          <span class="game-stat" id="clueScore">Score: 0</span>
          <span class="game-stat" id="clueProgress">Crate: 1/5</span>
        </div>
        <div class="clue-panel">
          <p class="game-message" id="clueQuestion"></p>
          <form class="game-actions" id="clueForm">
            <input class="game-input" id="clueInput" autocomplete="off" placeholder="One-word answer" />
            <button class="game-action" type="submit">Answer</button>
            <button class="game-action" id="clueHint" type="button">Hint</button>
          </form>
          <p class="game-message" id="clueMessage">Open every crate with a one-word answer.</p>
        </div>
      </div>
    `
  );

  const riddles = shuffleArray([
    { q: "I have keys but no locks. I can play but never run.", a: "piano", h: "It makes music." },
    { q: "I have hands but cannot clap.", a: "clock", h: "It keeps time." },
    { q: "I get wetter the more I dry.", a: "towel", h: "You use it after a shower." },
    { q: "I have pages but I am not a website.", a: "book", h: "You read it." },
    { q: "I go up and down but never move from my place.", a: "stairs", h: "You climb these." },
    { q: "I fly without wings. I cry without eyes. Wherever I go, darkness follows me.", a: "cloud", h: "You see these in the sky." },
    { q: "I have a head and a tail but no body.", a: "coin", h: "You use these for money." },
    { q: "I am taken from a mine, and shut up in a wooden case, from which I am never released, and yet I am used by everyone.", a: "pencil", h: "You write with these." },
    { q: "I have a bed but I don't sleep. I have a mouth but I don't eat. I have a head but I don't think.", a: "river", h: "You can float down these." },
    { q: "I am always ahead, but never behind. I am always right, but never left.", a: "future", h: "You plan for these." },
    { q: "I have a face but cannot see. I have hands but cannot clap. I have a voice but cannot speak.", a: "telephone", h: "You use these to call people." },
    { q: "I am lighter than air, but heavy to carry. If you drop me, you break me. If you break me, you win.", a: "egg", h: "You can eat these." }
  ]);
  let index = 0;
  let score = 0;
  const form = document.querySelector("#clueForm");
  const input = document.querySelector("#clueInput");
  const question = document.querySelector("#clueQuestion");
  const message = document.querySelector("#clueMessage");

  function render() {
    question.textContent = index < riddles.length ? riddles[index].q : "All crates opened.";
    document.querySelector("#clueScore").textContent = `Score: ${score}`;
    document.querySelector("#clueProgress").textContent = `Crate: ${Math.min(index + 1, riddles.length)}/${riddles.length}`;
    setSnapshot({
      mode: index >= riddles.length ? "won" : "playing",
      game: "Clue Crate",
      score,
      crate: Math.min(index + 1, riddles.length),
      question: question.textContent
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (index >= riddles.length) return;
    const answer = input.value.trim().toLowerCase();
    input.value = "";
    if (answer === riddles[index].a) {
      score += 10;
      index += 1;
      message.textContent = index >= riddles.length ? "Every crate is open." : "Correct. Next crate.";
    } else {
      score = Math.max(0, score - 2);
      message.textContent = "Not quite. Try another angle.";
    }
    render();
  });

  document.querySelector("#clueHint").addEventListener("click", () => {
    if (index < riddles.length) {
      message.textContent = riddles[index].h;
    }
  });

  render();
}

function renderLetters(selector, word) {
  document.querySelector(selector).innerHTML = word
    .split("")
    .map((letter) => `<span class="letter-box">${letter}</span>`)
    .join("");
}

function letterDifference(first, second) {
  return first.split("").filter((letter, index) => letter !== second[index]).length;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function roundedPoint(point) {
  return {
    x: Math.round(point.x),
    y: Math.round(point.y),
    r: point.r
  };
}

function drawGrid(ctx, width, height) {
  ctx.strokeStyle = "rgba(25, 33, 43, 0.12)";
  ctx.lineWidth = 2;
  for (let x = 0; x <= width; x += 45) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += 45) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}
