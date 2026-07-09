const filters = document.querySelectorAll(".filter");
const cards = [...document.querySelectorAll(".game-card")];
const saveButtons = document.querySelectorAll(".save-button");
const playButtons = document.querySelectorAll(".play-button");
const favoriteCount = document.querySelector("#favoriteCount");


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
  clue: startClueCrate,
  toybox: startToybox,
  thousand: start2048
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
      if (index === 24) {
        button.classList.add("end");
        if (solved) button.classList.add("solved");
      }
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
        </div>
        <canvas class="arcade-canvas" id="cometCanvas" width="720" height="540"></canvas>
        <p class="game-message" id="cometMessage"></p>
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
  let countdown = 3.5;
  let state;

  function spawnFromEdge(dot) {
    const side = Math.floor(Math.random() * 4);
    const speed = 80 + Math.random() * 60;
    if (side === 0) {
      dot.x = -dot.r;
      dot.y = Math.random() * canvas.height;
      dot.vx = speed;
      dot.vy = (Math.random() - 0.5) * speed * 0.6;
    } else if (side === 1) {
      dot.x = canvas.width + dot.r;
      dot.y = Math.random() * canvas.height;
      dot.vx = -speed;
      dot.vy = (Math.random() - 0.5) * speed * 0.6;
    } else if (side === 2) {
      dot.x = Math.random() * canvas.width;
      dot.y = -dot.r;
      dot.vx = (Math.random() - 0.5) * speed * 0.6;
      dot.vy = speed;
    } else {
      dot.x = Math.random() * canvas.width;
      dot.y = canvas.height + dot.r;
      dot.vx = (Math.random() - 0.5) * speed * 0.6;
      dot.vy = -speed;
    }
    dot.trail = [];
  }

  function makeDot(radius, color) {
    const dot = { x: 0, y: 0, vx: 0, vy: 0, r: radius, color, trail: [] };
    spawnFromEdge(dot);
    return dot;
  }

  function reset() {
    state = {
      player: { x: 360, y: 270, r: 16 },
      comets: Array.from({ length: 5 }, () => makeDot(11, "#f6c445")),
      sparks: Array.from({ length: 3 }, () => makeDot(13, "#ff6b6b")),
      particles: [],
      popups: [],
      score: 0,
      time: 45,
      hitFlash: 0,
      shakeX: 0,
      shakeY: 0,
      nextCometScore: 30,
      nextSparkScore: 60,
      hintTimer: 3.5
    };
    running = true;
    countdown = 3.5;
    message.textContent = "";
    last = performance.now();
  }

  function moveDot(dot, dt) {
    dot.trail.push({ x: dot.x, y: dot.y });
    if (dot.trail.length > 8) dot.trail.shift();
    dot.x += dot.vx * dt;
    dot.y += dot.vy * dt;
  }

  function isOffscreen(dot) {
    return dot.x < -60 || dot.x > canvas.width + 60 ||
           dot.y < -60 || dot.y > canvas.height + 60;
  }

  function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 100;
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.5 + Math.random() * 0.3,
        r: 2 + Math.random() * 3,
        color
      });
    }
  }

  function spawnPopup(x, y, text, color) {
    state.popups.push({ x, y, text, color, life: 1.0, maxLife: 1.0 });
  }

  function update(dt) {
    if (!running) {
      state.particles.forEach((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.life -= dt;
      });
      state.particles = state.particles.filter((p) => p.life > 0);
      return;
    }

    if (countdown > 0) {
      countdown -= dt;
      return;
    }

    const speed = 260;
    if (keys.has("ArrowLeft") || keys.has("a")) state.player.x -= speed * dt;
    if (keys.has("ArrowRight") || keys.has("d")) state.player.x += speed * dt;
    if (keys.has("ArrowUp") || keys.has("w")) state.player.y -= speed * dt;
    if (keys.has("ArrowDown") || keys.has("s")) state.player.y += speed * dt;
    state.player.x = Math.max(state.player.r, Math.min(canvas.width - state.player.r, state.player.x));
    state.player.y = Math.max(state.player.r, Math.min(canvas.height - state.player.r, state.player.y));
    state.time = Math.max(0, state.time - dt);

    state.comets.forEach((dot) => {
      moveDot(dot, dt);
      if (isOffscreen(dot)) spawnFromEdge(dot);
    });
    state.sparks.forEach((dot) => {
      moveDot(dot, dt);
      if (isOffscreen(dot)) spawnFromEdge(dot);
    });

    state.comets.forEach((dot) => {
      if (distance(state.player, dot) < state.player.r + dot.r) {
        state.score += 10;
        spawnParticles(dot.x, dot.y, "#f6c445", 8);
        spawnPopup(dot.x, dot.y - 20, "+10", "#f6c445");
        spawnFromEdge(dot);
      }
    });
    state.sparks.forEach((dot) => {
      if (distance(state.player, dot) < state.player.r + dot.r) {
        state.score = Math.max(0, state.score - 8);
        spawnParticles(dot.x, dot.y, "#ff6b6b", 10);
        spawnPopup(dot.x, dot.y - 20, "-8", "#ff6b6b");
        state.hitFlash = 0.3;
        state.shakeX = (Math.random() - 0.5) * 12;
        state.shakeY = (Math.random() - 0.5) * 12;
        spawnFromEdge(dot);
      }
    });

    while (state.score >= state.nextCometScore) {
      state.comets.push(makeDot(11, "#f6c445"));
      state.nextCometScore += 30;
    }
    while (state.score >= state.nextSparkScore) {
      state.sparks.push(makeDot(13, "#ff6b6b"));
      state.nextSparkScore += 50;
    }

    state.particles.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life -= dt;
    });
    state.particles = state.particles.filter((p) => p.life > 0);

    state.popups.forEach((p) => {
      p.y -= 40 * dt;
      p.life -= dt;
    });
    state.popups = state.popups.filter((p) => p.life > 0);

    if (state.hitFlash > 0) state.hitFlash -= dt;
    state.shakeX *= 0.88;
    state.shakeY *= 0.88;

    state.hintTimer -= dt;

    if (state.time <= 0) {
      running = false;
      message.textContent = `Time! Final score: ${state.score}.`;
      state.comets.forEach((dot) => spawnParticles(dot.x, dot.y, "#f6c445", 14));
      state.sparks.forEach((dot) => spawnParticles(dot.x, dot.y, "#ff6b6b", 10));
      state.comets = [];
      state.sparks = [];
    }
  }

  function render() {
    ctx.save();
    ctx.translate(state.shakeX, state.shakeY);

    ctx.fillStyle = "#0f1729";
    ctx.fillRect(-10, -10, canvas.width + 20, canvas.height + 20);
    drawGrid(ctx, canvas.width, canvas.height);

    const barW = canvas.width - 40;
    const barH = 8;
    const barX = 20;
    const barY = 14;
    const pct = Math.max(0, state.time / 45);
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(barX, barY, barW, barH);
    const barColor = pct > 0.5 ? "#43c6ac" : pct > 0.2 ? "#f6c445" : "#ff6b6b";
    ctx.fillStyle = barColor;
    ctx.fillRect(barX, barY, barW * pct, barH);
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    for (let i = 0; i < 30; i++) {
      const sx = (i * 137 + 50) % canvas.width;
      const sy = (i * 97 + 30) % canvas.height;
      ctx.fillStyle = `rgba(255,255,255,${0.15 + (i % 3) * 0.1})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 1 + (i % 2), 0, Math.PI * 2);
      ctx.fill();
    }

    state.comets.forEach((dot) => {
      for (let t = 0; t < dot.trail.length; t++) {
        const alpha = (t / dot.trail.length) * 0.35;
        const size = dot.r * (t / dot.trail.length) * 0.7;
        ctx.fillStyle = `rgba(246,196,69,${alpha})`;
        ctx.beginPath();
        ctx.arc(dot.trail[t].x, dot.trail[t].y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = dot.color;
      ctx.strokeStyle = "#0f1729";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath();
      ctx.arc(dot.x - dot.r * 0.25, dot.y - dot.r * 0.25, dot.r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    });

    state.sparks.forEach((dot) => {
      ctx.fillStyle = dot.color;
      ctx.strokeStyle = "#0f1729";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.beginPath();
      ctx.arc(dot.x - dot.r * 0.2, dot.y - dot.r * 0.2, dot.r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    });

    state.particles.forEach((p) => {
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * alpha, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    state.popups.forEach((p) => {
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.font = "bold 18px monospace";
      ctx.textAlign = "center";
      ctx.fillText(p.text, p.x, p.y);
    });
    ctx.globalAlpha = 1;

    if (state.hitFlash > 0) {
      ctx.fillStyle = `rgba(255,107,107,${state.hitFlash * 0.3})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const pr = state.player.r;
    const px = state.player.x;
    const py = state.player.y;
    ctx.fillStyle = "#43c6ac";
    ctx.strokeStyle = "#0f1729";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.beginPath();
    ctx.arc(px - pr * 0.25, py - pr * 0.3, pr * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(67,198,172,0.2)";
    ctx.beginPath();
    ctx.arc(px, py, pr + 6, 0, Math.PI * 2);
    ctx.fill();

    if (countdown > 0) {
      const num = Math.ceil(countdown);
      const text = num > 3 ? "" : num === 0 ? "GO!" : String(num);
      if (text) {
        const frac = countdown - Math.floor(countdown);
        const scale = 1 + frac * 0.4;
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(scale, scale);
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.font = "bold 72px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, 2, 2);
        ctx.fillStyle = num === 0 ? "#43c6ac" : "#fff8ea";
        ctx.fillText(text, 0, 0);
        ctx.restore();
      }
    } else if (state.time > 0 && state.time <= 6) {
      const num = Math.ceil(state.time);
      const text = num === 0 ? "TIME!" : String(num);
      const frac = state.time - Math.floor(state.time);
      const scale = 1 + (num <= 1 ? frac * 0.5 : frac * 0.3);
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(scale, scale);
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.font = "bold 64px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 2, 2);
      ctx.fillStyle = num <= 2 ? "#ff6b6b" : "#f6c445";
      ctx.fillText(text, 0, 0);
      ctx.restore();
    } else if (state.time <= 0) {
      const scale = 1 + (performance.now() % 600) / 600 * 0.15;
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(scale, scale);
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.font = "bold 56px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("TIME!", 2, 2);
      ctx.fillStyle = "#ff6b6b";
      ctx.fillText("TIME!", 0, 0);
      ctx.restore();
    }

    ctx.restore();

    scoreLabel.textContent = `Score: ${state.score}`;
    timeLabel.textContent = `Time: ${Math.ceil(state.time)}`;

    if (state.hintTimer > 0) {
      message.textContent = "Move with WASD, arrows, or mouse";
    } else if (running) {
      message.textContent = "";
    }

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
    if (event.key === "l" && running && countdown <= 0 && state.time > 5) {
      state.time = 5;
    }
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
            <button class="game-action" type="submit" title="Forge"><span class="material-symbols-outlined">edit</span></button>
            <button class="game-action" id="forgeHint" type="button" title="Hint"><span class="material-symbols-outlined">lightbulb</span></button>
            <button class="game-action" id="forgeRestart" type="button" title="Restart"><span class="material-symbols-outlined">restart_alt</span></button>
          </form>
          <ul class="word-history" id="forgeHistory" aria-label="Accepted words"></ul>
        </div>
      </div>
    `
  );

  const allLevels = [
    { start: "COLD", target: "WARM", path: ["CORD", "CARD", "CART", "WART", "WARM"] },
    { start: "WIND", target: "FIRE", path: ["FIND", "FINE", "FIRE"] },
    { start: "HEAD", target: "TAIL", path: ["HEAL", "TEAL", "TELL", "TALL", "TAIL"] },
    { start: "GAME", target: "CODE", path: ["GAVE", "CAVE", "COVE", "CODE"] },
    { start: "SAND", target: "GOLD", path: ["BAND", "BOND", "BOLD", "GOLD"] },
    { start: "DART", target: "MOON", path: ["DARN", "BARN", "BORN", "BOON", "MOON"] },
    { start: "BIRD", target: "WORM", path: ["BARD", "BARE", "BORE", "WORE", "WORM"] },
    { start: "TOIL", target: "DELL", path: ["TOLL", "TELL", "DELL"] },
    { start: "BOOK", target: "TOOT", path: ["LOOK", "LOOT", "TOOT"] },
    { start: "TENT", target: "FALL", path: ["FENT", "FELT", "FELL", "FALL"] },
    { start: "DISH", target: "MIST", path: ["FISH", "FIST", "MIST"] },
    { start: "FROG", target: "FLAW", path: ["FLOG", "FLAG", "FLAW"] },
    { start: "PEAR", target: "POST", path: ["PEAT", "PEST", "POST"] },
    { start: "KELP", target: "MILT", path: ["KELT", "MELT", "MILT"] },
    { start: "RING", target: "WIND", path: ["KING", "KIND", "WIND"] },
    { start: "BEAR", target: "FEAT", path: ["FEAR", "FEAT"] },
    { start: "FILM", target: "WIRE", path: ["FIRM", "FIRE", "WIRE"] },
    { start: "LEND", target: "BOLD", path: ["BEND", "BOND", "BOLD"] },
  ];
  const levels = shuffleArray([...allLevels]);
  let dictionary = new Set(levels.flatMap((level) => [level.start, level.target, ...level.path]));
  fetch("assets/fourletterforge/words.txt")
    .then((r) => r.text())
    .then((text) => {
      text.split("\n").forEach((w) => { if (w.trim()) dictionary.add(w.trim().toUpperCase()); });
    });
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
      message.textContent = "That word is not in the dictionary.";
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

  document.querySelector("#forgeRestart").addEventListener("click", () => {
    const level = levels[levelIndex];
    current = level.start;
    steps = 0;
    history = [current];
    message.textContent = "Restarted. Change one letter at a time.";
    render();
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
          <button class="game-stat" id="mazeNumber" type="button" title="Skip to next maze">Maze: 1/1</button>
          <span class="game-stat" id="mazeMoves">Moves: 0</span>
          <span class="game-stat" id="mazeKey">Key: no</span>
          <span class="game-stat">Move: arrows, WASD, or buttons</span>
        </div>
        <p class="game-message" id="mazeMessage">Collect the key, then reach the exit door.</p>
        <div class="maze-grid" id="mazeGrid" aria-label="Pocket maze"></div>
        <div class="maze-controls" aria-label="Maze movement controls">
          <button class="maze-control" type="button" data-move="up" aria-label="Move up"><span class="material-symbols-outlined">arrow_upward</span></button>
          <button class="maze-control" type="button" data-move="left" aria-label="Move left"><span class="material-symbols-outlined">arrow_back</span></button>
          <button class="maze-control" type="button" data-move="down" aria-label="Move down"><span class="material-symbols-outlined">arrow_downward</span></button>
          <button class="maze-control" type="button" data-move="right" aria-label="Move right"><span class="material-symbols-outlined">arrow_forward</span></button>
        </div>
        <div class="game-actions">
          <button class="game-action" id="mazeReset" type="button">Reset maze</button>
          <button class="game-action" id="mazeNext" type="button">Next maze</button>
        </div>
      </div>
    `
  );

  const allMazeMaps = [
    { rows: ["#######","#P.K..#","#.#.#.#","#.....#","#.#.#.#","#....E#","#######"], shifting: [{ x: 2, y: 4 }, { x: 2, y: 2 }] },
    { rows: ["#######","#P....#","###.#.#","#..#K.#","###.#.#","#....E#","#######"], shifting: [{ x: 4, y: 2 }, { x: 2, y: 2 }] },
    { rows: ["#######","#P....#","###.#.#","#..#K.#","###.#.#","#....E#","#######"], shifting: [{ x: 5, y: 3 }, { x: 4, y: 2 }] },
    { rows: ["#######","#P....#","#.#.#.#","#..K#..","#.#.#.#","#....E#","#######"], shifting: [{ x: 4, y: 2 }, { x: 2, y: 2 }] },
    { rows: ["#######","#P....#","#.#.#.#","#..K#..","#.#.#.#","#....E#","#######"], shifting: [{ x: 2, y: 4 }, { x: 2, y: 2 }] },
    { rows: ["#######","#P.K..#","#.#.#.#","#.....#","#.#.#.#","#....E#","#######"], shifting: [{ x: 2, y: 4 }, { x: 4, y: 2 }] },
    { rows: ["#######","#P....#","#.#.#K#","#.....#","#.###.#","#...E##","#######"], shifting: [{ x: 2, y: 4 }, { x: 4, y: 4 }] },
    { rows: ["#######","#P..#.#","#.#.#.#","#..#K#.","###.#.#","#....E#","#######"], shifting: [{ x: 3, y: 2 }, { x: 1, y: 4 }] },
    { rows: ["#######","#P..#.#","#.#.#.#","#..#K#.","###.#.#","#....E#","#######"], shifting: [{ x: 3, y: 2 }, { x: 5, y: 2 }] },
    { rows: ["#######","#P..K.#","#.#.#.#","#.....#","#.#.#.#","#..#E#.","#######"], shifting: [{ x: 4, y: 2 }, { x: 2, y: 4 }] },
    { rows: ["#######","#P..K.#","#.#.#.#","#.....#","#.#.#.#","#..#E#.","#######"], shifting: [{ x: 2, y: 2 }, { x: 2, y: 4 }] },
    { rows: ["#######","#P....#","#.#.#K#","#.....#","#.###.#","#...E##","#######"], shifting: [{ x: 4, y: 2 }, { x: 2, y: 2 }] },
    { rows: ["#######","#P....#","###.#.#","#.K..#.","###.#.#","#....E#","#######"], shifting: [{ x: 4, y: 2 }, { x: 4, y: 3 }] },
    { rows: ["#######","#P..#.#","#.#.#K#","#..#...","###.#.#","#....E#","#######"], shifting: [{ x: 3, y: 2 }, { x: 2, y: 1 }] },
    { rows: ["#######","#P..#.#","#.#.#K#","#..#...","###.#.#","#....E#","#######"], shifting: [{ x: 3, y: 3 }, { x: 1, y: 4 }] },
    { rows: ["#######","#P....#","###.#.#","#.K..#.","###.#.#","#....E#","#######"], shifting: [{ x: 4, y: 3 }, { x: 2, y: 2 }] },
    { rows: ["#######","#P....#","###.#.#","#....K#","###.#.#","#....E#","#######"], shifting: [{ x: 2, y: 1 }, { x: 3, y: 4 }] },
    { rows: ["#######","#P....#","###.#.#","#....K#","###.#.#","#....E#","#######"], shifting: [{ x: 2, y: 2 }, { x: 2, y: 1 }] },
    { rows: ["#######","#P....#","#.#K#.#","#.....#","#.#.#.#","#....E#","#######"], shifting: [{ x: 2, y: 2 }, { x: 2, y: 4 }] },
    { rows: ["#######","#P....#","#.#K#.#","#.....#","#.#.#.#","#....E#","#######"], shifting: [{ x: 2, y: 4 }, { x: 4, y: 4 }] },
    { rows: ["#######","#P....#","###.#.#","#....K#","###.#.#","#....E#","#######"], shifting: [{ x: 3, y: 4 }, { x: 2, y: 1 }, { x: 2, y: 2 }] },
    { rows: ["#######","#P.K..#","#.#.#.#","#.....#","#.#.#.#","#....E#","#######"], shifting: [{ x: 4, y: 4 }, { x: 2, y: 2 }, { x: 4, y: 2 }] },
    { rows: ["#######","#P....#","#.#.#.#","#..K#..","#.#.#.#","#....E#","#######"], shifting: [{ x: 2, y: 2 }, { x: 2, y: 1 }, { x: 2, y: 4 }] },
    { rows: ["#######","#P..#.#","#.#.#K#","#..#...","###.#.#","#....E#","#######"], shifting: [{ x: 2, y: 1 }, { x: 3, y: 3 }, { x: 1, y: 4 }] },
    { rows: ["#######","#P....#","###.#.#","#..#K.#","###.#.#","#....E#","#######"], shifting: [{ x: 3, y: 4 }, { x: 5, y: 3 }, { x: 4, y: 2 }] },
    { rows: ["#######","#P..#.#","#.#.#.#","#..#K#.","###.#.#","#....E#","#######"], shifting: [{ x: 5, y: 2 }, { x: 2, y: 1 }, { x: 1, y: 4 }] },
    { rows: ["#######","#P....#","#.#K#.#","#.....#","#.#.#.#","#....E#","#######"], shifting: [{ x: 4, y: 4 }, { x: 4, y: 2 }, { x: 2, y: 2 }] },
    { rows: ["#######","#P....#","#.#.#K#","#.....#","#.###.#","#...E##","#######"], shifting: [{ x: 4, y: 4 }, { x: 2, y: 2 }, { x: 2, y: 4 }] },
    { rows: ["#######","#P..K.#","#.#.#.#","#.....#","#.#.#.#","#..#E#.","#######"], shifting: [{ x: 4, y: 2 }, { x: 4, y: 4 }, { x: 2, y: 4 }] },
    { rows: ["#######","#P....#","###.#.#","#.K..#.","###.#.#","#....E#","#######"], shifting: [{ x: 2, y: 2 }, { x: 2, y: 1 }, { x: 4, y: 2 }] },
    { rows: ["#########", "#P......#", "#.#.#.#.#", "#...#K..#", "#.#.#.#.#", "#......E#", "#########"], shifting: [{ x: 6, y: 2 }, { x: 4, y: 2 }] },
    { rows: ["#########", "#P......#", "#.###.###", "#...#K.##", "#.###.###", "#......E#", "#########"], shifting: [{ x: 2, y: 4 }, { x: 2, y: 2 }] },
    { rows: ["#########", "#P......#", "#.#.#.#.#", "#...#K..#", "#.#.#.#.#", "#......E#", "#########"], shifting: [{ x: 6, y: 2 }, { x: 2, y: 4 }] },
    { rows: ["#########", "#P......#", "#.###.###", "#...K...#", "#.###.###", "#......E#", "#########"], shifting: [{ x: 4, y: 4 }, { x: 2, y: 4 }] },
    { rows: ["#########", "#P......#", "#.###.###", "#...K...#", "#.###.###", "#......E#", "#########"], shifting: [{ x: 2, y: 2 }, { x: 2, y: 4 }] },
    { rows: ["#########", "#P......#", "#.#.#.#.#", "#..#K..#.", "#.#.#.#.#", "#......E#", "#########"], shifting: [{ x: 2, y: 2 }, { x: 6, y: 2 }] },
    { rows: ["#########", "#P......#", "#.#.#.#.#", "#..#K..#.", "#.#.#.#.#", "#......E#", "#########"], shifting: [{ x: 2, y: 4 }, { x: 6, y: 2 }] },
    { rows: ["#########", "#P......#", "#.##.#.##", "#...K...#", "#.##.#.##", "#......E#", "#########"], shifting: [{ x: 5, y: 4 }, { x: 2, y: 2 }] },
    { rows: ["#########", "#P......#", "#.#.#...#", "#...K...#", "#...#.#.#", "#......E#", "#########"], shifting: [{ x: 2, y: 4 }, { x: 2, y: 2 }] },
    { rows: ["#########", "#P......#", "#.###.###", "#...#K.##", "#.###.###", "#......E#", "#########"], shifting: [{ x: 2, y: 4 }, { x: 2, y: 2 }] },
    { rows: ["#########", "#P......#", "#.##.#.##", "#...K...#", "#.##.#.##", "#......E#", "#########"], shifting: [{ x: 5, y: 4 }, { x: 2, y: 4 }] },
    { rows: ["#########", "#P......#", "#.#.#...#", "#...K...#", "#...#.#.#", "#......E#", "#########"], shifting: [{ x: 2, y: 2 }, { x: 2, y: 4 }] },
    { rows: ["#########", "#P......#", "##.##.###", "#..K....#", "##.##.###", "#......E#", "#########"], shifting: [{ x: 4, y: 2 }, { x: 4, y: 4 }] },
    { rows: ["#########", "#P......#", "#.###.###", "#...K...#", "#.###.###", "#......E#", "#########"], shifting: [{ x: 2, y: 4 }, { x: 4, y: 4 }] },
    { rows: ["#########", "#P......#", "#.###.###", "#...K...#", "#.###.###", "#......E#", "#########"], shifting: [{ x: 2, y: 2 }, { x: 4, y: 4 }] },
    { rows: ["#########", "#P......#", "#.#.#.###", "#.......#", "#.#.#.###", "#..K..E##", "#########"], shifting: [{ x: 6, y: 2 }, { x: 2, y: 2 }] },
    { rows: ["#########", "#P......#", "#.#.#.###", "#.......#", "#.#.#.###", "#..K..E##", "#########"], shifting: [{ x: 2, y: 4 }, { x: 4, y: 2 }] },
    { rows: ["#########", "#P......#", "##.##.###", "#..K....#", "##.##.###", "#......E#", "#########"], shifting: [{ x: 4, y: 4 }, { x: 3, y: 4 }] },
    { rows: ["#########", "#P......#", "#.#.#.#.#", "#..K....#", "#.#.#.#.#", "#......E#", "#########"], shifting: [{ x: 2, y: 4 }, { x: 6, y: 2 }] },
    { rows: ["#########", "#P......#", "#.##.##.#", "#..K...#.", "#.##.##.#", "#......E#", "#########"], shifting: [{ x: 2, y: 2 }, { x: 5, y: 2 }] },
    { rows: ["#########", "#P......#", "#.#.#.##.", "#..#K..#.", "#.#.#.##.", "#......E#", "#########"], shifting: [{ x: 4, y: 2 }, { x: 2, y: 4 }] },
    { rows: ["#########", "#P......#", "#.#.#.##.", "#..#K..#.", "#.#.#.##.", "#......E#", "#########"], shifting: [{ x: 2, y: 4 }, { x: 2, y: 2 }] },
    { rows: ["#########", "#P......#", "#.#.#.#.#", "#..K....#", "#.#.#.#.#", "#......E#", "#########"], shifting: [{ x: 4, y: 2 }, { x: 6, y: 2 }] },
    { rows: ["#########", "#P......#", "#.##.##.#", "#..K...#.", "#.##.##.#", "#......E#", "#########"], shifting: [{ x: 2, y: 4 }, { x: 2, y: 2 }] },
    { rows: ["#########", "#P......#", "#.###..##", "#...K..##", "#.###..##", "#......E#", "#########"], shifting: [{ x: 3, y: 4 }, { x: 4, y: 4 }] },
    { rows: ["#########", "#P......#", "#.#.....#", "#..#K...#", "#...#...#", "#......E#", "#########"], shifting: [{ x: 3, y: 4 }, { x: 2, y: 2 }] },
    { rows: ["#########", "#P......#", "#.#.....#", "#..#K...#", "#...#...#", "#......E#", "#########"], shifting: [{ x: 2, y: 2 }, { x: 5, y: 3 }] },
    { rows: ["#########", "#P......#", "#..#....#", "#...K...#", "#....#..#", "#......E#", "#########"], shifting: [{ x: 2, y: 4 }, { x: 5, y: 3 }] },
    { rows: ["#########", "#P......#", "#..#....#", "#...K...#", "#....#..#", "#......E#", "#########"], shifting: [{ x: 3, y: 2 }, { x: 4, y: 4 }] },
    { rows: ["#########", "#P......#", "#..#.#..#", "#...K...#", "#..#.#..#", "#......E#", "#########"], shifting: [{ x: 5, y: 4 }, { x: 2, y: 2 }] },
    { rows: ["#########", "#P......#", "#..#.#..#", "#...K...#", "#..#.#..#", "#......E#", "#########"], shifting: [{ x: 2, y: 2 }, { x: 5, y: 2 }] },
    { rows: ["#########", "#P......#", "#..#..#.#", "#..K....#", "#.#..#..#", "#......E#", "#########"], shifting: [{ x: 4, y: 2 }, { x: 2, y: 2 }] },
    { rows: ["#########", "#P......#", "#..#..#.#", "#..K....#", "#.#..#..#", "#......E#", "#########"], shifting: [{ x: 3, y: 4 }, { x: 5, y: 4 }] },
    { rows: ["#########", "#P......#", "#.#.###.#", "#....K..#", "#.#.###.#", "#......E#", "#########"], shifting: [{ x: 2, y: 2 }, { x: 5, y: 2 }] },
    { rows: ["#########", "#P......#", "#.#.###.#", "#....K..#", "#.#.###.#", "#......E#", "#########"], shifting: [{ x: 5, y: 4 }, { x: 2, y: 4 }] },
    { rows: ["#########", "#P......#", "#.##.##.#", "#...#K..#", "#.##.##.#", "#......E#", "#########"], shifting: [{ x: 5, y: 4 }, { x: 2, y: 4 }] },
    { rows: ["#########", "#P......#", "#.##.##.#", "#...#K..#", "#.##.##.#", "#......E#", "#########"], shifting: [{ x: 5, y: 4 }, { x: 5, y: 2 }] },
    { rows: ["#########", "#P......#", "#.#.#.###", "#..#K...#", "#.#.#.###", "#......E#", "#########"], shifting: [{ x: 2, y: 4 }, { x: 2, y: 2 }] },
    { rows: ["#########", "#P......#", "#.#.#.###", "#..#K...#", "#.#.#.###", "#......E#", "#########"], shifting: [{ x: 2, y: 2 }, { x: 4, y: 2 }] },
    { rows: ["#########", "#P......#", "#.#.#.#.#", "#..#K.#.#", "#.#.#.#.#", "#......E#", "#########"], shifting: [{ x: 2, y: 1 }, { x: 4, y: 2 }] },
    { rows: ["#########", "#P......#", "#.#.#.#.#", "#..#K.#.#", "#.#.#.#.#", "#......E#", "#########"], shifting: [{ x: 2, y: 1 }, { x: 6, y: 2 }] },
    { rows: ["#########", "#P......#", "#....#..#", "#..#K...#", "#..#....#", "#......E#", "#########"], shifting: [{ x: 5, y: 4 }, { x: 5, y: 2 }] },
    { rows: ["#######","#P..#.#","###.#.#","#...K.#","#.#.#.#","#.#...#","#.#.###","#....E#","#######"], shifting: [{ x: 3, y: 2 }, { x: 5, y: 2 }] },
    { rows: ["#######","#P..#.#","###.#.#","#...K.#","#.#.#.#","#.#...#","#.#.###","#....E#","#######"], shifting: [{ x: 3, y: 2 }, { x: 5, y: 2 }] },
    { rows: ["#######","#P....#","###.#.#","#..K..#","###.#.#","#.....#","###.#.#","#....E#","#######"], shifting: [{ x: 2, y: 2 }, { x: 4, y: 2 }] },
    { rows: ["#######","#P....#","###.#.#","#..K..#","###.#.#","#.....#","###.#.#","#....E#","#######"], shifting: [{ x: 2, y: 2 }, { x: 4, y: 2 }] },
    { rows: ["#######","#P....#","#.#.###","#.#...K","#.###.#","#.....#","#.###.#","#....E#","#######"], shifting: [{ x: 2, y: 2 }, { x: 2, y: 3 }] },
    { rows: ["#######","#P....#","#.#.###","#.#...K","#.###.#","#.....#","#.###.#","#....E#","#######"], shifting: [{ x: 2, y: 2 }, { x: 2, y: 3 }] },
    { rows: ["#######","#P..#.#","###.#.#","#K..#.#","#.###.#","#.....#","#.###.#","#....E#","#######"], shifting: [{ x: 3, y: 2 }, { x: 5, y: 2 }] },
    { rows: ["#######","#P..#.#","###.#.#","#K..#.#","#.###.#","#.....#","#.###.#","#....E#","#######"], shifting: [{ x: 3, y: 2 }, { x: 5, y: 2 }] },
    { rows: ["#########", "#P......#", "#.##..###", "#..K...#.", "#.##..###", "#......E#", "#########"], shifting: [{ x: 2, y: 4 }, { x: 5, y: 2 }] },
    { rows: ["#########", "#P......#", "#.#.#.#.#", "#K......#", "#.#.#.#.#", "#......E#", "#########"], shifting: [{ x: 4, y: 2 }, { x: 6, y: 2 }] },
    { rows: ["#########", "#P......#", "#....#..#", "#..#K...#", "#..#....#", "#......E#", "#########"], shifting: [{ x: 5, y: 4 }, { x: 2, y: 3 }] },
    { rows: ["#########", "#P......#", "#.##..###", "#..K...#.", "#.##..###", "#......E#", "#########"], shifting: [{ x: 2, y: 4 }, { x: 5, y: 2 }] },
    { rows: ["#########", "#P......#", "#.#.##.##", "#...K.#.#", "#.#.##.##", "#......E#", "#########"], shifting: [{ x: 2, y: 4 }, { x: 5, y: 4 }] },
    { rows: ["#########", "#P......#", "#.#.##.##", "#...K.#.#", "#.#.##.##", "#......E#", "#########"], shifting: [{ x: 5, y: 2 }, { x: 2, y: 4 }] },
    { rows: ["#########", "#P......#", "#.#.#.#.#", "#K......#", "#.#.#.#.#", "#......E#", "#########"], shifting: [{ x: 4, y: 2 }, { x: 2, y: 2 }] },
    { rows: ["#########", "#P......#", "#.###..##", "#...K..##", "#.###..##", "#......E#", "#########"], shifting: [{ x: 3, y: 4 }, { x: 4, y: 2 }] },
    { rows: ["#########", "#P......#", "#.##.##.#", "#...K...#", "#.##.##.#", "#......E#", "#########"], shifting: [{ x: 2, y: 2 }, { x: 5, y: 2 }] },
    { rows: ["#########", "#P......#", "#.###.###", "#..K...##", "#.###.###", "#......E#", "#########"], shifting: [{ x: 4, y: 2 }, { x: 4, y: 4 }] },
    { rows: ["#########", "#P......#", "#.#.#.#.#", "#...K...#", "#.#.#.#.#", "#......E#", "#########"], shifting: [{ x: 2, y: 2 }, { x: 2, y: 4 }] },
    { rows: ["#########", "#P......#", "#.#.##.##", "#.#.K..##", "#.#.##.##", "#......E#", "#########"], shifting: [{ x: 2, y: 2 }, { x: 5, y: 2 }] },
    { rows: ["#########", "#P......#", "#.#.#.###", "#..K....#", "#.#.#.###", "#......E#", "#########"], shifting: [{ x: 2, y: 4 }, { x: 4, y: 2 }] },
    { rows: ["#########", "#P......#", "#.#.#.###", "#..K....#", "#.#.#.###", "#.....E##", "#########"], shifting: [{ x: 2, y: 4 }, { x: 3, y: 2 }] },
    { rows: ["#########", "#P......#", "#.###.###", "#..K...##", "#.###.###", "#......E#", "#########"], shifting: [{ x: 3, y: 4 }, { x: 3, y: 2 }] },
    { rows: ["#########", "#P......#", "#.##.##.#", "#...K...#", "#.##.##.#", "#......E#", "#########"], shifting: [{ x: 2, y: 4 }, { x: 5, y: 4 }] },
    { rows: ["#########", "#P......#", "#.###.###", "#..K...##", "#.###.###", "#......E#", "#########"], shifting: [{ x: 4, y: 2 }, { x: 2, y: 4 }] },
    { rows: ["#########", "#P......#", "#.#.##.##", "#.#.K..##", "#.#.##.##", "#......E#", "#########"], shifting: [{ x: 2, y: 2 }, { x: 5, y: 4 }] },
    { rows: ["#########", "#P......#", "#.#.#.###", "#..K....#", "#.#.#.###", "#......E#", "#########"], shifting: [{ x: 2, y: 2 }, { x: 4, y: 2 }] },
    { rows: ["#########", "#P......#", "#.###.###", "#...K...#", "#.###.###", "#......E#", "#########"], shifting: [{ x: 4, y: 2 }, { x: 4, y: 4 }] },
    { rows: ["#########", "#P......#", "#.##.##.#", "#..K...##", "#.##.##.#", "#......E#", "#########"], shifting: [{ x: 5, y: 2 }, { x: 2, y: 4 }] },
    { rows: ["#########", "#P......#", "#.##.##.#", "#..K...##", "#.##.##.#", "#......E#", "#########"], shifting: [{ x: 5, y: 2 }, { x: 2, y: 4 }] },
    { rows: ["#########", "#P......#", "#.###.###", "#..K...##", "#.###.###", "#......E#", "#########"], shifting: [{ x: 4, y: 4 }, { x: 4, y: 2 }] },
    { rows: ["#########", "#P......#", "#.###.###", "#...K...#", "#.###.###", "#......E#", "#########"], shifting: [{ x: 4, y: 2 }, { x: 2, y: 4 }] },
    { rows: ["#########", "#P......#", "##.#.#.##", "#...K...#", "##.#.#.##", "#......E#", "#########"], shifting: [{ x: 2, y: 4 }, { x: 2, y: 2 }] },
    { rows: ["#########", "#P......#", "##.#.#.##", "#...K...#", "##.#.#.##", "#......E#", "#########"], shifting: [{ x: 2, y: 4 }, { x: 2, y: 2 }] },
    { rows: ["#########", "#P......#", "#.#.#.###", "#..K....#", "#.#.#.###", "#.....E##", "#########"], shifting: [{ x: 4, y: 2 }, { x: 2, y: 2 }] },
    { rows: ["#########", "#P......#", "#.#.#.#.#", "#...K...#", "#.#.#.#.#", "#......E#", "#########"], shifting: [{ x: 2, y: 4 }, { x: 2, y: 2 }] },
    { rows: ["#########", "#P......#", "#.#.#.###", "#..K....#", "#.#.#.###", "#.....E##", "#########"], shifting: [{ x: 4, y: 4 }, { x: 4, y: 2 }] },
    { rows: ["#########", "#P......#", "#.#.#.###", "#..K....#", "#.#.#.###", "#.....E##", "#########"], shifting: [{ x: 3, y: 4 }, { x: 3, y: 2 }] },
    { rows: ["#########", "#P......#", "#.#.###.#", "#..K....#", "#.#.###.#", "#......E#", "#########"], shifting: [{ x: 5, y: 2 }, { x: 2, y: 4 }] },
    { rows: ["#########", "#P......#", "#.###.###", "#...K..##", "#.###.###", "#......E#", "#########"], shifting: [{ x: 2, y: 4 }, { x: 4, y: 2 }] },
    { rows: ["#########", "#P......#", "#.###.###", "#..K...##", "#.###.###", "#.....E##", "#########"], shifting: [{ x: 3, y: 2 }, { x: 4, y: 2 }] },
    { rows: ["#########", "#P......#", "#.##.#.##", "#...K#.##", "###..#.##", "#.....E##", "#########"], shifting: [{ x: 5, y: 4 }, { x: 2, y: 4 }] },
    { rows: ["#########", "#P......#", "#.####.##", "#..K...##", "#.####.##", "#......E#", "#########"], shifting: [{ x: 4, y: 2 }, { x: 4, y: 4 }] },
    { rows: ["#########", "#P......#", "#.#.###.#", "#...K.#.#", "#.#.###.#", "#......E#", "#########"], shifting: [{ x: 2, y: 4 }, { x: 2, y: 2 }] },
    { rows: ["#########", "#P......#", "#.###.###", "#...K..##", "#.###.###", "#......E#", "#########"], shifting: [{ x: 2, y: 4 }, { x: 2, y: 2 }] },
    { rows: ["#########", "#P......#", "#.####.##", "#..K...##", "#.####.##", "#......E#", "#########"], shifting: [{ x: 3, y: 4 }, { x: 3, y: 2 }] },
    { rows: ["#########", "#P......#", "#.#.###.#", "#...K.#.#", "#.#.###.#", "#......E#", "#########"], shifting: [{ x: 2, y: 1 }, { x: 2, y: 4 }] },
    { rows: ["#########", "#P......#", "#.#.#.#.#", "#..K..#.#", "#.#.#.#.#", "#......E#", "#########"], shifting: [{ x: 4, y: 2 }, { x: 6, y: 2 }] },
    { rows: ["#########", "#P......#", "#.##.#.##", "#...K#.##", "###..#.##", "#.....E##", "#########"], shifting: [{ x: 2, y: 4 }, { x: 5, y: 4 }] },
    { rows: ["#########", "#P......#", "#.#.#.#.#", "#..K..#.#", "#.#.#.#.#", "#......E#", "#########"], shifting: [{ x: 6, y: 2 }, { x: 4, y: 2 }] },
    { rows: ["#########", "#P......#", "#.#.#.###", "#..K....#", "#.#.#.###", "#......E#", "#########"], shifting: [{ x: 4, y: 4 }, { x: 2, y: 4 }] },
    { rows: ["#########", "#P......#", "#.#.#.###", "#..K....#", "#.#.#.###", "#......E#", "#########"], shifting: [{ x: 4, y: 2 }, { x: 2, y: 2 }] },
    { rows: ["#########", "#P......#", "#.#.###.#", "#..K....#", "#.#.###.#", "#......E#", "#########"], shifting: [{ x: 5, y: 4 }, { x: 5, y: 2 }] },
    { rows: ["#########", "#P......#", "#.###.###", "#..K...##", "#.###.###", "#.....E##", "#########"], shifting: [{ x: 4, y: 2 }, { x: 3, y: 4 }] },
    { rows: ["#########", "#P......#", "#.##.##.#", "#..K...#.", "#.##.##.#", "#......E#", "#########"], shifting: [{ x: 2, y: 2 }, { x: 2, y: 4 }] },
    { rows: ["#########", "#P......#", "#.##.##.#", "#..K...#.", "#.##.##.#", "#......E#", "#########"], shifting: [{ x: 5, y: 4 }, { x: 2, y: 4 }] },
    { rows: ["#########", "#P......#", "#.#.#.#.#", "#K......#", "#.#.#.#.#", "#......E#", "#########"], shifting: [{ x: 6, y: 2 }, { x: 2, y: 4 }, { x: 2, y: 2 }] },
    { rows: ["#########", "#P......#", "#.###.###", "#...K...#", "#.###.###", "#......E#", "#########"], shifting: [{ x: 2, y: 2 }, { x: 2, y: 4 }, { x: 4, y: 2 }] },
    { rows: ["#########", "#P......#", "#.#.##.##", "#.#.K..##", "#.#.##.##", "#......E#", "#########"], shifting: [{ x: 2, y: 4 }, { x: 5, y: 4 }, { x: 5, y: 2 }] },
    { rows: ["#########", "#P......#", "#.###..##", "#...K..##", "#.###..##", "#......E#", "#########"], shifting: [{ x: 4, y: 2 }, { x: 3, y: 4 }, { x: 4, y: 4 }] },
    { rows: ["#########", "#P......#", "#.##..###", "#..K...#.", "#.##..###", "#......E#", "#########"], shifting: [{ x: 2, y: 4 }, { x: 5, y: 4 }, { x: 2, y: 2 }] },
    { rows: ["#########", "#P......#", "#.##.##.#", "#...#K..#", "#.##.##.#", "#......E#", "#########"], shifting: [{ x: 5, y: 2 }, { x: 5, y: 4 }, { x: 2, y: 2 }] },
    { rows: ["#########", "#P......#", "#.###.###", "#..K...##", "#.###.###", "#.....E##", "#########"], shifting: [{ x: 3, y: 4 }, { x: 4, y: 4 }, { x: 4, y: 2 }] },
    { rows: ["#########", "#P......#", "#.#.#.###", "#..#K...#", "#.#.#.###", "#......E#", "#########"], shifting: [{ x: 2, y: 4 }, { x: 4, y: 4 }, { x: 4, y: 2 }] },
    { rows: ["#########", "#P......#", "#..#....#", "#...K...#", "#....#..#", "#......E#", "#########"], shifting: [{ x: 5, y: 3 }, { x: 3, y: 2 }, { x: 2, y: 4 }] },
    { rows: ["#########", "#P......#", "#.#.###.#", "#....K..#", "#.#.###.#", "#......E#", "#########"], shifting: [{ x: 2, y: 4 }, { x: 2, y: 2 }, { x: 5, y: 2 }] },
    { rows: ["#########", "#P......#", "#.#.###.#", "#...K.#.#", "#.#.###.#", "#......E#", "#########"], shifting: [{ x: 2, y: 2 }, { x: 2, y: 4 }, { x: 5, y: 2 }] },
    { rows: ["#########", "#P......#", "#.#.#.#.#", "#..#K.#.#", "#.#.#.#.#", "#......E#", "#########"], shifting: [{ x: 2, y: 2 }, { x: 6, y: 2 }, { x: 4, y: 2 }] },
    { rows: ["#########", "#P......#", "#.#.#.###", "#..K....#", "#.#.#.###", "#......E#", "#########"], shifting: [{ x: 4, y: 2 }, { x: 2, y: 4 }, { x: 2, y: 2 }] },
    { rows: ["#########", "#P......#", "#..#.#..#", "#...K...#", "#..#.#..#", "#......E#", "#########"], shifting: [{ x: 5, y: 4 }, { x: 2, y: 2 }, { x: 2, y: 4 }] },
    { rows: ["#########", "#P......#", "##.#.#.##", "#...K...#", "##.#.#.##", "#......E#", "#########"], shifting: [{ x: 2, y: 2 }, { x: 5, y: 2 }, { x: 5, y: 4 }] },
    { rows: ["#########", "#P......#", "#....#..#", "#..#K...#", "#..#....#", "#......E#", "#########"], shifting: [{ x: 3, y: 4 }, { x: 5, y: 2 }, { x: 5, y: 4 }] },
    { rows: ["#########", "#P......#", "#.#.....#", "#..#K...#", "#...#...#", "#......E#", "#########"], shifting: [{ x: 5, y: 3 }, { x: 3, y: 4 }, { x: 6, y: 4 }] },
    { rows: ["#########", "#P......#", "#.##.##.#", "#...K...#", "#.##.##.#", "#......E#", "#########"], shifting: [{ x: 2, y: 2 }, { x: 5, y: 2 }, { x: 5, y: 4 }] },
    { rows: ["#########", "#P......#", "#..#..#.#", "#..K....#", "#.#..#..#", "#......E#", "#########"], shifting: [{ x: 2, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 4 }] },
    { rows: ["#########", "#P......#", "#.##.#.##", "#...K#.##", "###..#.##", "#.....E##", "#########"], shifting: [{ x: 2, y: 4 }, { x: 3, y: 2 }, { x: 5, y: 4 }] },
    { rows: ["#########", "#P......#", "#.#.#.##.", "#..#K..#.", "#.#.#.##.", "#......E#", "#########"], shifting: [{ x: 2, y: 4 }, { x: 2, y: 2 }, { x: 4, y: 2 }] },
    { rows: ["#########", "#P......#", "#.###.###", "#..K...##", "#.###.###", "#......E#", "#########"], shifting: [{ x: 4, y: 4 }, { x: 2, y: 4 }, { x: 2, y: 2 }] },
    { rows: ["#########", "#P......#", "#.##.##.#", "#..K...#.", "#.##.##.#", "#......E#", "#########"], shifting: [{ x: 5, y: 4 }, { x: 2, y: 2 }, { x: 2, y: 4 }] },
    { rows: ["#########", "#P......#", "#.#.#.###", "#..K....#", "#.#.#.###", "#.....E##", "#########"], shifting: [{ x: 2, y: 4 }, { x: 3, y: 4 }, { x: 3, y: 2 }] },
    { rows: ["#########", "#P......#", "#.#.#.###", "#..K....#", "#.#.#.###", "#......E#", "#########"], shifting: [{ x: 4, y: 2 }, { x: 4, y: 4 }, { x: 2, y: 4 }] },
    { rows: ["#########", "#P......#", "#.#.#...#", "#...K...#", "#...#.#.#", "#......E#", "#########"], shifting: [{ x: 2, y: 4 }, { x: 5, y: 4 }, { x: 2, y: 2 }] },
    { rows: ["#########", "#P......#", "#.#.#.#.#", "#...#K..#", "#.#.#.#.#", "#......E#", "#########"], shifting: [{ x: 6, y: 2 }, { x: 4, y: 2 }, { x: 2, y: 4 }] },
    { rows: ["#########", "#P......#", "#.###.###", "#...#K.##", "#.###.###", "#......E#", "#########"], shifting: [{ x: 4, y: 2 }, { x: 2, y: 4 }, { x: 4, y: 4 }] },
    { rows: ["#########", "#P......#", "#.#.#.###", "#.......#", "#.#.#.###", "#..K..E##", "#########"], shifting: [{ x: 6, y: 2 }, { x: 2, y: 2 }, { x: 4, y: 2 }] },
    { rows: ["#########", "#P......#", "##.##.###", "#..K....#", "##.##.###", "#......E#", "#########"], shifting: [{ x: 4, y: 4 }, { x: 3, y: 2 }, { x: 4, y: 2 }] },
    { rows: ["#########", "#P......#", "#.###.###", "#...K..##", "#.###.###", "#......E#", "#########"], shifting: [{ x: 2, y: 2 }, { x: 2, y: 4 }, { x: 4, y: 2 }] },
    { rows: ["#########", "#P......#", "#.####.##", "#..K...##", "#.####.##", "#......E#", "#########"], shifting: [{ x: 3, y: 2 }, { x: 4, y: 4 }, { x: 4, y: 2 }] },
    { rows: ["#########", "#P......#", "#.##.##.#", "#..K...#.", "#.##.##.#", "#......E#", "#########"], shifting: [{ x: 2, y: 2 }, { x: 5, y: 4 }, { x: 5, y: 2 }] },
    { rows: ["#########", "#P......#", "#.#.#.#.#", "#..K....#", "#.#.#.#.#", "#......E#", "#########"], shifting: [{ x: 2, y: 2 }, { x: 6, y: 2 }, { x: 4, y: 2 }] },
    { rows: ["#########", "#P......#", "#.#.#.#.#", "#..K..#.#", "#.#.#.#.#", "#......E#", "#########"], shifting: [{ x: 6, y: 2 }, { x: 2, y: 2 }, { x: 4, y: 2 }] },
    { rows: ["#########", "#P......#", "#.###.###", "#...K...#", "#.###.###", "#......E#", "#########"], shifting: [{ x: 2, y: 4 }, { x: 4, y: 2 }, { x: 4, y: 4 }] },
    { rows: ["#########", "#P......#", "#.#.#.#.#", "#...K...#", "#.#.#.#.#", "#......E#", "#########"], shifting: [{ x: 2, y: 2 }, { x: 4, y: 2 }, { x: 2, y: 4 }] },
    { rows: ["#######","#P..#.#","###.#.#","#K..#.#","#.###.#","#.....#","#.###.#","#....E#","#######"], shifting: [{ x: 3, y: 2 }, { x: 5, y: 2 }, { x: 3, y: 3 }] },
    { rows: ["#########", "#P......#", "#.#.##.##", "#...K.#.#", "#.#.##.##", "#......E#", "#########"], shifting: [{ x: 5, y: 4 }, { x: 2, y: 2 }, { x: 2, y: 4 }] },
    { rows: ["#######","#P....#","###.#.#","#..K..#","###.#.#","#.....#","###.#.#","#....E#","#######"], shifting: [{ x: 2, y: 2 }, { x: 4, y: 2 }, { x: 2, y: 4 }] },
    { rows: ["#########", "#P......#", "#.#.###.#", "#..K....#", "#.#.###.#", "#......E#", "#########"], shifting: [{ x: 2, y: 2 }, { x: 2, y: 4 }, { x: 5, y: 2 }] },
    { rows: ["#######","#P..#.#","###.#.#","#...K.#","#.#.#.#","#.#...#","#.#.###","#....E#","#######"], shifting: [{ x: 3, y: 2 }, { x: 5, y: 2 }, { x: 3, y: 5 }] },
    { rows: ["#######","#P....#","#.#.###","#.#...K","#.###.#","#.....#","#.###.#","#....E#","#######"], shifting: [{ x: 2, y: 2 }, { x: 2, y: 3 }, { x: 5, y: 4 }] },
    { rows: ["#########", "#P......#", "#.#.#.#.#", "#..#K..#.", "#.#.#.#.#", "#......E#", "#########"], shifting: [{ x: 6, y: 2 }, { x: 2, y: 2 }, { x: 4, y: 2 }] },
    { rows: ["#########", "#P......#", "#.##.##.#", "#..K...##", "#.##.##.#", "#......E#", "#########"], shifting: [{ x: 5, y: 4 }, { x: 2, y: 4 }, { x: 2, y: 2 }] },
    { rows: ["#########", "#P......#", "#.##.#.##", "#...K...#", "#.##.#.##", "#......E#", "#########"], shifting: [{ x: 5, y: 4 }, { x: 2, y: 4 }, { x: 5, y: 2 }] },
    { rows: ["#########", "#P......#", "#.###.###", "#...K...#", "#.###.###", "#......E#", "#########"], shifting: [{ x: 4, y: 2 }, { x: 2, y: 2 }, { x: 4, y: 4 }] },
    { rows: ["#########", "#P......#", "#.#.#.###", "#..K....#", "#.#.#.###", "#.....E##", "#########"], shifting: [{ x: 4, y: 4 }, { x: 4, y: 2 }, { x: 2, y: 4 }] },
    { rows: ["#########", "#P......#", "#.###.###", "#..K...##", "#.###.###", "#......E#", "#########"], shifting: [{ x: 4, y: 4 }, { x: 4, y: 2 }, { x: 3, y: 2 }] },
    { rows: ["##########", "#P......##", "#.#.##.###", "#........#", "#.##.##.##", "#..K...E##", "##########"], shifting: [{ x: 2, y: 4 }, { x: 2, y: 2 }] },
    { rows: ["##########", "#P......##", "#.#.##.###", "#........#", "#.##.##.##", "#..K...E##", "##########"], shifting: [{ x: 5, y: 4 }, { x: 2, y: 4 }] },
    { rows: ["##########", "#P......##", "#.#.##.###", "#........#", "#.##.##.##", "#..K...E##", "##########"], shifting: [{ x: 5, y: 2 }, { x: 2, y: 2 }, { x: 2, y: 4 }] },
    { rows: ["########", "#P....##", "#.#.#.##", "#K.#.#.#", "#.#.#.##", "#.#...##", "#.#.####", "#...E###", "########"], shifting: [{ x: 2, y: 2 }, { x: 4, y: 2 }] },
    { rows: ["########", "#P....##", "#.#.#.##", "#K.#.#.#", "#.#.#.##", "#.#...##", "#.#.####", "#...E###", "########"], shifting: [{ x: 2, y: 2 }, { x: 4, y: 2 }] },
    { rows: ["########", "#P....##", "#.#.#.##", "#K.#.#.#", "#.#.#.##", "#.#...##", "#.#.####", "#...E###", "########"], shifting: [{ x: 2, y: 2 }, { x: 4, y: 2 }, { x: 2, y: 4 }] }
  ];
  const mazeMaps = allMazeMaps;
  let mazeIndex = 0;
  let discovered = new Set([0]);
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
    discovered.add(mazeIndex);
    document.querySelector("#mazeNext").disabled = true;
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
      document.querySelector("#mazeMessage").textContent = "The exit is locked. Find the key first.";
      return;
    }
    maze[player.y][player.x] = ".";
    player.x = nx;
    player.y = ny;
    moves += 1;
    if (tile === "K") {
      hasKey = true;
      document.querySelector("#mazeMessage").textContent = "Key collected! Find the exit door.";
    } else if (tile === "E") {
      won = true;
      discovered.add(mazeIndex + 1);
      document.querySelector("#mazeNext").disabled = false;
      if (mazeIndex + 1 >= mazeMaps.length) {
        document.querySelector("#mazeMessage").textContent = "";
        showWinScreen();
      } else {
        document.querySelector("#mazeMessage").textContent = `Escaped in ${moves} moves! Well played.`;
      }
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
    grid.style.gridTemplateColumns = `repeat(${maze[0].length}, minmax(28px, 48px))`;
    const icons = {
      P: '<span class="material-symbols-outlined maze-icon maze-icon-player">person</span>',
      K: '<span class="material-symbols-outlined maze-icon maze-icon-key">key</span>',
      E: won
        ? '<span class="material-symbols-outlined maze-icon maze-icon-exit maze-icon-open">door_front</span>'
        : '<span class="material-symbols-outlined maze-icon maze-icon-exit">logout</span>',
      "#": "",
      ".": ""
    };
    maze.forEach((row, y) => {
      row.forEach((tile, x) => {
        const cell = document.createElement("div");
        cell.className = "maze-cell";
        if (tile === "#") cell.classList.add("wall");
        if (tile === "P") cell.classList.add("player");
        if (tile === "K") cell.classList.add("key");
        if (tile === "E") cell.classList.add("exit");
        cell.innerHTML = icons[tile] || "";
        grid.append(cell);
      });
    });
    document.querySelector("#mazeNumber").textContent = `Maze: ${mazeIndex + 1}/${mazeMaps.length}`;
    document.querySelector("#mazeMoves").textContent = `Moves: ${moves}`;
    document.querySelector("#mazeKey").textContent = `Key: ${hasKey ? "yes" : "no"}`;
    if (won) {
      grid.classList.add("maze-won");
    } else {
      grid.classList.remove("maze-won");
    }
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
    if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) {
      return;
    }
    const movesByKey = {
      ArrowUp: [0, -1],
      w: [0, -1],
      W: [0, -1],
      ArrowDown: [0, 1],
      s: [0, 1],
      S: [0, 1],
      ArrowLeft: [-1, 0],
      a: [-1, 0],
      A: [-1, 0],
      ArrowRight: [1, 0],
      d: [1, 0],
      D: [1, 0]
    };
    if (movesByKey[event.key]) {
      event.preventDefault();
      attempt(...movesByKey[event.key]);
    }
  }

  function advanceMaze() {
    mazeIndex += 1;
    if (mazeIndex >= mazeMaps.length) {
      showWinScreen();
      return;
    }
    document.querySelector("#mazeMessage").textContent = "Collect the key, then reach the exit door.";
    reset();
  }

  function showWinScreen() {
    const grid = document.querySelector("#mazeGrid");
    grid.innerHTML = "";
    grid.style.gridTemplateColumns = "1fr";
    grid.classList.add("maze-won");
    grid.innerHTML = `
      <div class="maze-win">
        <div class="maze-win-icon"><span class="material-symbols-outlined" style="font-size:4rem">emoji_events</span></div>
        <div class="maze-win-title">YOU WIN!</div>
        <div class="maze-win-sub">All ${mazeMaps.length} mazes conquered</div>
        <button class="game-action maze-win-restart" type="button">Play Again</button>
      </div>
    `;
    document.querySelector("#mazeMoves").textContent = "";
    document.querySelector("#mazeKey").textContent = "";
    document.querySelector("#mazeNumber").textContent = `Maze: ${mazeMaps.length}/${mazeMaps.length}`;
    document.querySelector(".maze-win-restart").addEventListener("click", () => {
      mazeIndex = 0;
      document.querySelector("#mazeMessage").textContent = "Collect the key, then reach the exit door.";
      document.querySelector("#mazeMoves").textContent = "Moves: 0";
      document.querySelector("#mazeKey").textContent = "Key: no";
      grid.classList.remove("maze-won");
      reset();
    });
  }

  function openLevelPicker() {
    let overlay = document.querySelector("#mazeLevelPicker");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "mazeLevelPicker";
      overlay.className = "maze-level-picker-overlay";
      overlay.innerHTML = `<div class="maze-level-picker">
        <div class="maze-level-picker-header">
          <strong>Jump to Maze</strong>
          <button class="maze-level-picker-close" type="button">&times;</button>
        </div>
        <div class="maze-level-picker-grid"></div>
      </div>`;
      document.querySelector(".game-layout").appendChild(overlay);
      overlay.querySelector(".maze-level-picker-close").addEventListener("click", closeLevelPicker);
      overlay.addEventListener("click", (e) => { if (e.target === overlay) closeLevelPicker(); });
    }
    const btnGrid = overlay.querySelector(".maze-level-picker-grid");
    btnGrid.innerHTML = "";
    for (let i = 0; i < mazeMaps.length; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "maze-level-btn";
      btn.textContent = i + 1;
      if (i === mazeIndex) btn.classList.add("current");
      if (!discovered.has(i)) {
        btn.classList.add("locked");
        btn.disabled = true;
      } else {
        btn.addEventListener("click", () => { goToMaze(i); closeLevelPicker(); });
      }
      btnGrid.appendChild(btn);
    }
    overlay.classList.add("open");
  }

  function closeLevelPicker() {
    const overlay = document.querySelector("#mazeLevelPicker");
    if (overlay) overlay.classList.remove("open");
  }

  function goToMaze(idx) {
    mazeIndex = idx;
    document.querySelector("#mazeMessage").textContent = "Collect the key, then reach the exit door.";
    reset();
  }

  function handleCheatCode(e) {
    if (e.ctrlKey && e.key === "p") {
      e.preventDefault();
      openCheatPopup();
    }
  }

  function openCheatPopup() {
    let popup = document.querySelector("#mazeCheatPopup");
    if (!popup) {
      popup = document.createElement("div");
      popup.id = "mazeCheatPopup";
      popup.className = "maze-cheat-overlay";
      popup.innerHTML = `<div class="maze-cheat-box">
        <div class="maze-cheat-header">
          <span class="material-symbols-outlined" style="color:var(--gold)">lock</span>
          <strong>Secret Code</strong>
          <button class="maze-cheat-close" type="button">&times;</button>
        </div>
        <p class="maze-cheat-hint">Enter the magic words to unlock all levels...</p>
        <div class="maze-cheat-row">
          <input class="game-input maze-cheat-input" type="text" placeholder="Type cheat code" autocomplete="off" />
          <button class="game-action maze-cheat-submit" type="button">Go</button>
        </div>
        <p class="maze-cheat-feedback"></p>
      </div>`;
      document.querySelector(".game-layout").appendChild(popup);
      popup.querySelector(".maze-cheat-close").addEventListener("click", closeCheatPopup);
      popup.addEventListener("click", (ev) => { if (ev.target === popup) closeCheatPopup(); });
      const input = popup.querySelector(".maze-cheat-input");
      popup.querySelector(".maze-cheat-submit").addEventListener("click", () => tryCheatCode(input));
      input.addEventListener("keydown", (ev) => { if (ev.key === "Enter") tryCheatCode(input); });
    }
    popup.classList.add("open");
    popup.querySelector(".maze-cheat-input").value = "";
    popup.querySelector(".maze-cheat-feedback").textContent = "";
    popup.querySelector(".maze-cheat-input").focus();
  }

  function closeCheatPopup() {
    const popup = document.querySelector("#mazeCheatPopup");
    if (popup) {
      popup.classList.remove("open");
      document.activeElement.blur();
    }
  }

  function tryCheatCode(input) {
    const val = input.value.trim().toLowerCase();
    const fb = document.querySelector(".maze-cheat-feedback");
    if (val === "open sesame") {
      for (let i = 0; i < mazeMaps.length; i++) discovered.add(i);
      fb.textContent = "All levels unlocked!";
      fb.style.color = "var(--mint)";
      setTimeout(closeCheatPopup, 800);
    } else {
      fb.textContent = "Wrong code. Try again.";
      fb.style.color = "var(--coral)";
      input.value = "";
      input.focus();
    }
  }

  document.querySelectorAll(".maze-control").forEach((button) => {
    const map = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    button.addEventListener("click", () => attempt(...map[button.dataset.move]));
  });
  document.querySelector("#mazeReset").addEventListener("click", reset);
  document.querySelector("#mazeNext").addEventListener("click", advanceMaze);
  document.querySelector("#mazeNumber").addEventListener("click", openLevelPicker);
  document.addEventListener("keydown", keydown);
  document.addEventListener("keydown", handleCheatCode);
  activeCleanup = () => {
    document.removeEventListener("keydown", keydown);
    document.removeEventListener("keydown", handleCheatCode);
  };
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

function startToybox() {
  openGame(
    "Toybox",
    "Arcade",
    `
      <div class="game-layout">
        <p class="game-message">Press, pop, spin, pour, squish, and toggle. Everything here is meant to feel good.</p>
        <div class="toybox-grid" id="toyboxGrid"></div>
      </div>
    `
  );

  const grid = document.querySelector("#toyboxGrid");
  const cleanups = [];

  function addCleanup(fn) {
    cleanups.push(fn);
  }

  /* ── Push Button ── */
  (function initPushButton() {
    let count = 0;
    const toy = document.createElement("div");
    toy.className = "toybox-toy";
    toy.innerHTML = `
      <span class="toybox-toy-label">Push me</span>
      <button class="toybox-push-btn" type="button" aria-label="Push button"></button>
      <span class="toybox-push-count" id="toyboxPushCount">0</span>
    `;
    grid.append(toy);
    const btn = toy.querySelector(".toybox-push-btn");
    const countEl = toy.querySelector("#toyboxPushCount");
    btn.addEventListener("click", () => {
      count += 1;
      countEl.textContent = count;
      countEl.style.transform = "scale(1.3)";
      setTimeout(() => { countEl.style.transform = "scale(1)"; }, 100);
    });
  })();

  /* ── Fidget Spinner ── */
  (function initSpinner() {
    const toy = document.createElement("div");
    toy.className = "toybox-toy";
    toy.innerHTML = `
      <span class="toybox-toy-label">Fidget spinner</span>
      <div class="toybox-spinner-wrap" id="spinnerWrap">
        <svg class="toybox-spinner" id="spinnerSvg" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="8" fill="var(--line)"/>
          <circle cx="50" cy="18" r="12" fill="var(--coral)" stroke="var(--line)" stroke-width="2"/>
          <circle cx="77" cy="65" r="12" fill="var(--mint)" stroke="var(--line)" stroke-width="2"/>
          <circle cx="23" cy="65" r="12" fill="var(--gold)" stroke="var(--line)" stroke-width="2"/>
          <line x1="50" y1="50" x2="50" y2="18" stroke="var(--line)" stroke-width="4" stroke-linecap="round"/>
          <line x1="50" y1="50" x2="77" y2="65" stroke="var(--line)" stroke-width="4" stroke-linecap="round"/>
          <line x1="50" y1="50" x2="23" y2="65" stroke="var(--line)" stroke-width="4" stroke-linecap="round"/>
        </svg>
      </div>
    `;
    grid.append(toy);
    const svg = toy.querySelector("#spinnerSvg");
    const wrap = toy.querySelector("#spinnerWrap");
    let angle = 0;
    let velocity = 0;
    let spinning = false;
    let lastAngle = 0;
    let dragging = false;
    let dragStart = 0;

    function getAngle(e) {
      const rect = wrap.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return Math.atan2(clientY - cy, clientX - cx);
    }

    function onDown(e) {
      e.preventDefault();
      dragging = true;
      spinStart = getAngle(e);
      lastAngle = angle;
      velocity = 0;
    }

    function onMove(e) {
      if (!dragging) return;
      e.preventDefault();
      const current = getAngle(e);
      let delta = current - spinStart;
      if (delta > Math.PI) delta -= 2 * Math.PI;
      if (delta < -Math.PI) delta += 2 * Math.PI;
      angle = lastAngle + delta;
      velocity = delta * 0.3;
      svg.style.transform = "rotate(" + (angle * 180 / Math.PI) + "deg)";
    }

    function onUp() {
      if (dragging) {
        dragging = false;
        if (!spinning) {
          spinning = true;
          animate();
        }
      }
    }

    let spinStart = 0;

    function animate() {
      if (Math.abs(velocity) < 0.0005) {
        spinning = false;
        return;
      }
      angle += velocity;
      velocity *= 0.985;
      svg.style.transform = "rotate(" + (angle * 180 / Math.PI) + "deg)";
      requestAnimationFrame(animate);
    }

    wrap.addEventListener("mousedown", onDown);
    wrap.addEventListener("touchstart", onDown, { passive: false });
    document.addEventListener("mousemove", onMove);
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchend", onUp);

    addCleanup(() => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchend", onUp);
    });
  })();

  /* ── Bubble Popper ── */
  (function initBubbles() {
    const toy = document.createElement("div");
    toy.className = "toybox-toy";
    toy.innerHTML = `
      <span class="toybox-toy-label">Pop bubbles</span>
      <canvas class="toybox-bubbles-canvas" id="bubblesCanvas"></canvas>
    `;
    grid.append(toy);
    const canvas = toy.querySelector("#bubblesCanvas");
    const ctx = canvas.getContext("2d");
    let bubbles = [];
    let particles = [];
    let raf;
    let w, h;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      w = canvas.width = rect.width;
      h = canvas.height = rect.height;
    }
    resize();

    function spawnBubble() {
      const r = 10 + Math.random() * 18;
      return {
        x: r + Math.random() * (w - 2 * r),
        y: h + r,
        r,
        speed: 0.3 + Math.random() * 0.6,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.02 + Math.random() * 0.02,
        hue: 160 + Math.random() * 60
      };
    }

    for (let i = 0; i < 8; i++) {
      const b = spawnBubble();
      b.y = Math.random() * h;
      bubbles.push(b);
    }

    function spawnParticles(x, y, hue) {
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i + Math.random() * 0.5;
        particles.push({
          x, y,
          vx: Math.cos(angle) * (2 + Math.random() * 2),
          vy: Math.sin(angle) * (2 + Math.random() * 2),
          life: 1,
          r: 2 + Math.random() * 3,
          hue
        });
      }
    }

    function animate() {
      ctx.clearRect(0, 0, w, h);
      bubbles.forEach((b) => {
        b.y -= b.speed;
        b.wobble += b.wobbleSpeed;
        const wx = Math.sin(b.wobble) * 8;
        if (b.y < -b.r * 2) {
          Object.assign(b, spawnBubble());
        }
        ctx.beginPath();
        ctx.arc(b.x + wx, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = "hsla(" + b.hue + ", 70%, 80%, 0.45)";
        ctx.fill();
        ctx.strokeStyle = "hsla(" + b.hue + ", 60%, 60%, 0.7)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(b.x + wx - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.fill();
      });
      particles = particles.filter((p) => p.life > 0);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.life -= 0.03;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
        ctx.fillStyle = "hsla(" + p.hue + ", 70%, 65%, " + p.life + ")";
        ctx.fill();
      });
      raf = requestAnimationFrame(animate);
    }
    animate();

    canvas.addEventListener("click", (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (w / rect.width);
      const my = (e.clientY - rect.top) * (h / rect.height);
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        const wx = Math.sin(b.wobble) * 8;
        if (Math.hypot(mx - (b.x + wx), my - b.y) < b.r) {
          spawnParticles(b.x + wx, b.y, b.hue);
          bubbles.splice(i, 1);
          bubbles.push(spawnBubble());
          break;
        }
      }
    });

    addCleanup(() => cancelAnimationFrame(raf));
  })();

  /* ── Sand Pour ── */
  (function initSand() {
    const toy = document.createElement("div");
    toy.className = "toybox-toy";
    toy.innerHTML = `
      <span class="toybox-toy-label">Sand pour</span>
      <canvas class="toybox-sand-canvas" id="sandCanvas"></canvas>
    `;
    grid.append(toy);
    const canvas = toy.querySelector("#sandCanvas");
    const ctx = canvas.getContext("2d");
    let w, h;
    let grains = [];
    let pouring = false;
    let mouseX = 0;
    let mouseY = 0;
    let raf;
    const CELL = 4;
    let cols, rows, grid;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      w = canvas.width = rect.width;
      h = canvas.height = rect.height;
      cols = Math.ceil(w / CELL);
      rows = Math.ceil(h / CELL);
      grid = new Uint8Array(cols * rows);
    }
    resize();

    function setCell(cx, cy, val) {
      if (cx >= 0 && cx < cols && cy >= 0 && cy < rows) {
        grid[cy * cols + cx] = val;
      }
    }

    function getCell(cx, cy) {
      if (cx < 0 || cx >= cols || cy < 0 || cy >= rows) return 1;
      return grid[cy * cols + cx];
    }

    function spawnGrain(x, y) {
      grains.push({ x, y, vx: (Math.random() - 0.5) * 1.5, vy: Math.random() * 2 + 1, life: 200 + Math.random() * 100 });
    }

    function stepSand() {
      for (let y = rows - 1; y >= 0; y--) {
        for (let x = 0; x < cols; x++) {
          if (!getCell(x, y)) continue;
          if (getCell(x, y + 1) === 0) {
            setCell(x, y, 0);
            setCell(x, y + 1, 1);
          } else if (getCell(x - 1, y + 1) === 0 && getCell(x + 1, y + 1) === 0) {
            const dir = Math.random() < 0.5 ? -1 : 1;
            setCell(x, y, 0);
            setCell(x + dir, y + 1, 1);
          } else if (getCell(x - 1, y + 1) === 0) {
            setCell(x, y, 0);
            setCell(x - 1, y + 1, 1);
          } else if (getCell(x + 1, y + 1) === 0) {
            setCell(x, y, 0);
            setCell(x + 1, y + 1, 1);
          }
        }
      }
    }

    function render() {
      ctx.fillStyle = "#f5edd6";
      ctx.fillRect(0, 0, w, h);
      const colors = ["#d4a574", "#c9956a", "#deb887", "#c8956e"];
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (getCell(x, y)) {
            ctx.fillStyle = colors[(x + y) % colors.length];
            ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
          }
        }
      }
    }

    function animate() {
      if (pouring) {
        const cx = Math.floor(mouseX / CELL);
        const cy = Math.floor(mouseY / CELL);
        for (let i = 0; i < 3; i++) {
          const ox = Math.floor((Math.random() - 0.5) * 6);
          setCell(cx + ox, cy, 1);
        }
      }
      stepSand();
      render();
      raf = requestAnimationFrame(animate);
    }
    animate();

    canvas.addEventListener("mousedown", (e) => {
      pouring = true;
      const rect = canvas.getBoundingClientRect();
      mouseX = (e.clientX - rect.left) * (w / rect.width);
      mouseY = (e.clientY - rect.top) * (h / rect.height);
    });
    canvas.addEventListener("mousemove", (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = (e.clientX - rect.left) * (w / rect.width);
      mouseY = (e.clientY - rect.top) * (h / rect.height);
    });
    canvas.addEventListener("mouseup", () => { pouring = false; });
    canvas.addEventListener("mouseleave", () => { pouring = false; });
    canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      pouring = true;
      const rect = canvas.getBoundingClientRect();
      mouseX = (e.touches[0].clientX - rect.left) * (w / rect.width);
      mouseY = (e.touches[0].clientY - rect.top) * (h / rect.height);
    }, { passive: false });
    canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      mouseX = (e.touches[0].clientX - rect.left) * (w / rect.width);
      mouseY = (e.touches[0].clientY - rect.top) * (h / rect.height);
    }, { passive: false });
    canvas.addEventListener("touchend", () => { pouring = false; });

    addCleanup(() => cancelAnimationFrame(raf));
  })();

  /* ── Jelly Ball ── */
  (function initJelly() {
    const toy = document.createElement("div");
    toy.className = "toybox-toy";
    toy.innerHTML = `
      <span class="toybox-toy-label">Squish me</span>
      <div class="toybox-jelly-area" id="jellyArea">
        <div class="toybox-jelly" id="jellyBall"></div>
      </div>
    `;
    grid.append(toy);
    const area = toy.querySelector("#jellyArea");
    const ball = toy.querySelector("#jellyBall");
    let bx = 50, by = 25;
    let vx = 0, vy = 0;
    let dragging = false;
    let dragOffX = 0, dragOffY = 0;
    let raf;

    function animate() {
      if (!dragging) {
        vy += 0.3;
        bx += vx;
        by += vy;
        vx *= 0.97;
        const rect = area.getBoundingClientRect();
        const maxX = rect.width - 50;
        const maxY = rect.height - 50;
        if (bx < 0) { bx = 0; vx *= -0.6; }
        if (bx > maxX) { bx = maxX; vx *= -0.6; }
        if (by > maxY) { by = maxY; vy *= -0.5; vx *= 0.95; }
        if (by < 0) { by = 0; vy *= -0.6; }
        const speed = Math.hypot(vx, vy);
        if (speed > 1) {
          if (Math.abs(vx) > Math.abs(vy)) {
            ball.className = "toybox-jelly " + (vx > 0 ? "squish-left" : "squish-right");
          } else {
            ball.className = "toybox-jelly " + (vy > 0 ? "squish-top" : "squish-bottom");
          }
        } else {
          ball.className = "toybox-jelly";
        }
      }
      ball.style.left = bx + "px";
      ball.style.top = by + "px";
      raf = requestAnimationFrame(animate);
    }
    animate();

    area.addEventListener("mousedown", (e) => {
      dragging = true;
      const rect = area.getBoundingClientRect();
      dragOffX = e.clientX - rect.left - bx;
      dragOffY = e.clientY - rect.top - by;
      vx = 0;
      vy = 0;
    });
    document.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const rect = area.getBoundingClientRect();
      bx = e.clientX - rect.left - dragOffX;
      by = e.clientY - rect.top - dragOffY;
    });
    document.addEventListener("mouseup", () => {
      if (dragging) {
        dragging = false;
        vx = (Math.random() - 0.5) * 6;
        vy = -2 - Math.random() * 3;
      }
    });
    area.addEventListener("touchstart", (e) => {
      e.preventDefault();
      dragging = true;
      const rect = area.getBoundingClientRect();
      dragOffX = e.touches[0].clientX - rect.left - bx;
      dragOffY = e.touches[0].clientY - rect.top - by;
      vx = 0;
      vy = 0;
    }, { passive: false });
    document.addEventListener("touchmove", (e) => {
      if (!dragging) return;
      const rect = area.getBoundingClientRect();
      bx = e.touches[0].clientX - rect.left - dragOffX;
      by = e.touches[0].clientY - rect.top - dragOffY;
    }, { passive: false });
    document.addEventListener("touchend", () => {
      if (dragging) {
        dragging = false;
        vx = (Math.random() - 0.5) * 6;
        vy = -2 - Math.random() * 3;
      }
    });

    addCleanup(() => {
      cancelAnimationFrame(raf);
      document.removeEventListener("mousemove", () => {});
      document.removeEventListener("mouseup", () => {});
      document.removeEventListener("touchmove", () => {});
      document.removeEventListener("touchend", () => {});
    });
  })();

  /* ── Gradient Mixer ── */
  (function initGradient() {
    let r = 255, g = 107, b = 107;
    const toy = document.createElement("div");
    toy.className = "toybox-toy";
    toy.style.gridColumn = "span 2";
    toy.innerHTML = `
      <span class="toybox-toy-label">Gradient mixer</span>
      <div class="toybox-gradient-box" id="gradBox"></div>
      <div class="toybox-sliders">
        <input type="range" class="toybox-slider r" min="0" max="255" value="255" id="sliderR"/>
        <input type="range" class="toybox-slider g" min="0" max="255" value="107" id="sliderG"/>
        <input type="range" class="toybox-slider b" min="0" max="255" value="107" id="sliderB"/>
      </div>
    `;
    grid.append(toy);
    const box = toy.querySelector("#gradBox");
    const sR = toy.querySelector("#sliderR");
    const sG = toy.querySelector("#sliderG");
    const sB = toy.querySelector("#sliderB");

    function update() {
      r = +sR.value;
      g = +sG.value;
      b = +sB.value;
      const r2 = 255 - r, g2 = 255 - g, b2 = 255 - b;
      box.style.background = "linear-gradient(135deg, rgb(" + r + "," + g + "," + b + "), rgb(" + r2 + "," + g2 + "," + b2 + "))";
    }
    sR.addEventListener("input", update);
    sG.addEventListener("input", update);
    sB.addEventListener("input", update);
    update();
  })();

  /* ── Toggle Parade ── */
  (function initToggles() {
    const toy = document.createElement("div");
    toy.className = "toybox-toy";
    toy.style.gridColumn = "span 2";
    const toggleCount = 7;
    let togglesHTML = '<span class="toybox-toy-label">Toggle parade</span><div class="toybox-toggles">';
    for (let i = 0; i < toggleCount; i++) {
      togglesHTML += '<div class="toybox-toggle" data-index="' + i + '"><div class="toybox-toggle-knob"></div></div>';
    }
    togglesHTML += "</div>";
    toy.innerHTML = togglesHTML;
    grid.append(toy);

    toy.querySelectorAll(".toybox-toggle").forEach((toggle) => {
      toggle.addEventListener("click", () => {
        toggle.classList.toggle("on");
      });
    });
  })();

  /* ── Bubble Wrap ── */
  (function initBubbleWrap() {
    const toy = document.createElement("div");
    toy.className = "toybox-toy";
    toy.style.gridColumn = "span 2";
    const cols = 8;
    const rows = 5;
    let html = '<span class="toybox-toy-label">Bubble wrap</span><div class="toybox-wrap-grid">';
    for (let i = 0; i < cols * rows; i++) {
      html += '<div class="toybox-bubble-cell" data-i="' + i + '"></div>';
    }
    html += "</div>";
    toy.innerHTML = html;
    grid.append(toy);

    let popped = 0;
    const cells = toy.querySelectorAll(".toybox-bubble-cell");
    cells.forEach((cell) => {
      cell.addEventListener("click", () => {
        if (cell.classList.contains("popped")) return;
        cell.classList.add("popped");
        popped += 1;
        if (popped === cols * rows) {
          setTimeout(() => {
            cells.forEach((c) => c.classList.remove("popped"));
            popped = 0;
          }, 600);
        }
      });
    });
  })();

  /* ── Newton's Cradle ── */
  (function initNewtonsCradle() {
    const toy = document.createElement("div");
    toy.className = "toybox-toy";
    toy.innerHTML = `
      <span class="toybox-toy-label">Newton's cradle</span>
      <canvas class="toybox-cradle-canvas" id="cradleCanvas" width="200" height="130"></canvas>
      <p class="toybox-cradle-hint">Click a ball to push it</p>
    `;
    grid.append(toy);
    const canvas = toy.querySelector("#cradleCanvas");
    const ctx = canvas.getContext("2d");
    const W = 200, H = 130;
    const numBalls = 5;
    const ballR = 12;
    const spacing = ballR * 2 + 1;
    const anchorY = 15;
    const stringLen = 70;
    const balls = [];
    for (let i = 0; i < numBalls; i++) {
      balls.push({
        angle: 0,
        angVel: 0,
        x: W / 2 + (i - (numBalls - 1) / 2) * spacing,
        resting: true
      });
    }
    let dragging = -1;
    let raf;

    function getBallAt(mx, my) {
      for (let i = 0; i < numBalls; i++) {
        const bx = balls[i].x + Math.sin(balls[i].angle) * stringLen;
        const by = anchorY + Math.cos(balls[i].angle) * stringLen;
        if (Math.hypot(mx - bx, my - by) < ballR + 4) return i;
      }
      return -1;
    }

    function physics() {
      const g = 0.0015;
      const damping = 0.999;
      for (let i = 0; i < numBalls; i++) {
        if (dragging === i) continue;
        const acc = -g * Math.sin(balls[i].angle);
        balls[i].angVel += acc;
        balls[i].angVel *= damping;
        balls[i].angle += balls[i].angVel;
      }
      for (let i = 0; i < numBalls - 1; i++) {
        const a1 = balls[i], a2 = balls[i + 1];
        if (a1.angVel > 0.0001 && a2.angVel < -0.0001) {
          const swap = a1.angVel;
          a1.angVel = a2.angVel * 0.95;
          a2.angVel = swap * 0.95;
        }
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#394354";
      ctx.fillRect(W / 2 - (numBalls * spacing) / 2 - 10, anchorY - 6, numBalls * spacing + 20, 6);
      for (let i = 0; i < numBalls; i++) {
        const bx = balls[i].x + Math.sin(balls[i].angle) * stringLen;
        const by = anchorY + Math.cos(balls[i].angle) * stringLen;
        ctx.beginPath();
        ctx.moveTo(balls[i].x, anchorY);
        ctx.lineTo(bx, by);
        ctx.strokeStyle = "#999";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(bx, by, ballR, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(bx - 3, by - 3, 2, bx, by, ballR);
        grad.addColorStop(0, "#ddd");
        grad.addColorStop(1, "#888");
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = "#555";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    function animate() {
      physics();
      draw();
      raf = requestAnimationFrame(animate);
    }
    animate();

    canvas.addEventListener("mousedown", (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (W / rect.width);
      const my = (e.clientY - rect.top) * (H / rect.height);
      dragging = getBallAt(mx, my);
    });
    canvas.addEventListener("mousemove", (e) => {
      if (dragging < 0) return;
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (W / rect.width);
      const my = (e.clientY - rect.top) * (H / rect.height);
      balls[dragging].angle = Math.atan2(mx - balls[dragging].x, my - anchorY);
      balls[dragging].angle = Math.max(-0.8, Math.min(0.8, balls[dragging].angle));
      balls[dragging].angVel = 0;
    });
    canvas.addEventListener("mouseup", () => {
      dragging = -1;
    });

    addCleanup(() => cancelAnimationFrame(raf));
  })();

  /* ── Pop Tubes ── */
  (function initPopTubes() {
    const toy = document.createElement("div");
    toy.className = "toybox-toy";
    const tubeCount = 5;
    let html = '<span class="toybox-toy-label">Pop tubes</span><div class="toybox-tubes">';
    for (let i = 0; i < tubeCount; i++) {
      html += '<div class="toybox-tube" data-i="' + i + '"><div class="toybox-tube-inner"></div></div>';
    }
    html += "</div>";
    toy.innerHTML = html;
    grid.append(toy);

    const tubes = toy.querySelectorAll(".toybox-tube");
    tubes.forEach((tube) => {
      let expanded = false;
      tube.addEventListener("click", () => {
        expanded = !expanded;
        tube.classList.toggle("expanded", expanded);
        tube.querySelector(".toybox-tube-inner").style.height = expanded ? "60px" : "24px";
      });
    });
  })();

  /* ── Water Ripples ── */
  (function initRipples() {
    const toy = document.createElement("div");
    toy.className = "toybox-toy";
    toy.style.gridColumn = "span 2";
    toy.innerHTML = `
      <span class="toybox-toy-label">Water ripples</span>
      <canvas class="toybox-ripple-canvas" id="rippleCanvas"></canvas>
    `;
    grid.append(toy);
    const canvas = toy.querySelector("#rippleCanvas");
    const ctx = canvas.getContext("2d");
    let w, h;
    const ripples = [];
    let raf;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      w = canvas.width = rect.width;
      h = canvas.height = 140;
    }
    resize();

    function addRipple(x, y) {
      ripples.push({ x, y, r: 0, maxR: 50 + Math.random() * 30, life: 1, speed: 1.2 + Math.random() * 0.5 });
    }

    function animate() {
      ctx.fillStyle = "rgba(200, 230, 255, 0.15)";
      ctx.fillRect(0, 0, w, h);
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        rp.r += rp.speed;
        rp.life -= 0.012;
        if (rp.life <= 0) {
          ripples.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(79, 143, 207, " + rp.life * 0.6 + ")";
        ctx.lineWidth = 2;
        ctx.stroke();
        if (rp.r > 10) {
          ctx.beginPath();
          ctx.arc(rp.x, rp.y, rp.r * 0.6, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(79, 143, 207, " + rp.life * 0.3 + ")";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      raf = requestAnimationFrame(animate);
    }
    animate();

    canvas.addEventListener("click", (e) => {
      const rect = canvas.getBoundingClientRect();
      addRipple((e.clientX - rect.left) * (w / rect.width), (e.clientY - rect.top) * (h / rect.height));
    });
    canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      addRipple((e.touches[0].clientX - rect.left) * (w / rect.width), (e.touches[0].clientY - rect.top) * (h / rect.height));
    }, { passive: false });

    addCleanup(() => cancelAnimationFrame(raf));
  })();

  /* ── Falling Dominoes ── */
  (function initDominos() {
    const toy = document.createElement("div");
    toy.className = "toybox-toy";
    toy.style.gridColumn = "span 2";
    toy.innerHTML = `
      <span class="toybox-toy-label">Domino chain</span>
      <canvas class="toybox-domino-canvas" id="dominoCanvas"></canvas>
      <div class="toybox-domino-actions">
        <button class="game-action toybox-domino-reset" id="dominoReset" type="button">Reset</button>
      </div>
    `;
    grid.append(toy);
    const canvas = toy.querySelector("#dominoCanvas");
    const ctx = canvas.getContext("2d");
    let w, h;
    const dominos = [];
    let raf;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      w = canvas.width = rect.width;
      h = canvas.height = 100;
    }
    resize();

    function buildChain() {
      dominos.length = 0;
      const count = Math.floor(w / 28);
      const startX = 15;
      for (let i = 0; i < count; i++) {
        dominos.push({
          x: startX + i * 26,
          angle: 0,
          angVel: 0,
          falling: false,
          fallen: false
        });
      }
    }
    buildChain();

    function physics() {
      for (let i = 0; i < dominos.length; i++) {
        const d = dominos[i];
        if (d.falling && !d.fallen) {
          d.angVel += 0.008;
          d.angle += d.angVel;
          if (d.angle >= Math.PI / 2.2) {
            d.angle = Math.PI / 2.2;
            d.fallen = true;
            d.falling = false;
            if (i + 1 < dominos.length && !dominos[i + 1].fallen) {
              dominos[i + 1].falling = true;
              dominos[i + 1].angVel = 0.02;
            }
          }
        }
      }
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      const dominoH = 40;
      const dominoW = 10;
      dominos.forEach((d) => {
        ctx.save();
        ctx.translate(d.x, h - 5);
        ctx.rotate(d.angle);
        const grad = ctx.createLinearGradient(-dominoW / 2, 0, dominoW / 2, 0);
        grad.addColorStop(0, d.fallen ? "#e88" : "#fff");
        grad.addColorStop(1, d.fallen ? "#c66" : "#eee");
        ctx.fillStyle = grad;
        ctx.fillRect(-dominoW / 2, -dominoH, dominoW, dominoH);
        ctx.strokeStyle = "#394354";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-dominoW / 2, -dominoH, dominoW, dominoH);
        ctx.beginPath();
        ctx.arc(0, -dominoH / 2, 2, 0, Math.PI * 2);
        ctx.fillStyle = "#394354";
        ctx.fill();
        ctx.restore();
      });
    }

    function animate() {
      physics();
      draw();
      raf = requestAnimationFrame(animate);
    }
    animate();

    canvas.addEventListener("click", (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (w / rect.width);
      for (let i = 0; i < dominos.length; i++) {
        if (!dominos[i].fallen && Math.abs(dominos[i].x - mx) < 20) {
          dominos[i].falling = true;
          dominos[i].angVel = 0.03;
          break;
        }
      }
    });

    toy.querySelector("#dominoReset").addEventListener("click", () => {
      buildChain();
    });

    addCleanup(() => cancelAnimationFrame(raf));
  })();

  setSnapshot({
    mode: "playing",
    game: "Toybox",
    toys: ["push", "spinner", "bubbles", "sand", "jelly", "gradient", "toggles", "wrap", "cradle", "tubes", "ripples", "dominos"]
  });

  activeCleanup = () => {
    cleanups.forEach((fn) => fn());
  };
}

function start2048() {
  openGame(
    "2048",
    "Puzzle",
    `
      <div class="game-layout">
        <div class="game-topline">
          <span class="game-stat" id="tScore">Score: 0</span>
          <span class="game-stat" id="tBest">Best: 0</span>
        </div>
        <p class="game-message" id="tMessage">Use arrow keys or swipe to merge tiles.</p>
        <div class="t-board" id="tBoard" aria-label="2048 game board"></div>
        <div class="game-actions">
          <button class="game-action" id="tUndo" type="button">Undo</button>
          <button class="game-action" id="tRestart" type="button">Restart</button>
        </div>
      </div>
    `
  );

  const board = document.querySelector("#tBoard");
  const msg = document.querySelector("#tMessage");
  const scoreLabel = document.querySelector("#tScore");
  const bestLabel = document.querySelector("#tBest");

  let grid, score, best, prev, won, over;

  function init() {
    grid = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
    score = 0;
    won = false;
    over = false;
    prev = null;
    addRandom();
    addRandom();
    render();
  }

  function addRandom() {
    const empty = [];
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++)
        if (grid[r][c] === 0) empty.push([r, c]);
    if (empty.length === 0) return;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

  function slide(row) {
    let arr = row.filter((v) => v !== 0);
    let merged = false;
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        arr[i] *= 2;
        score += arr[i];
        if (arr[i] === 2048 && !won) won = true;
        arr.splice(i + 1, 1);
        merged = true;
      }
    }
    while (arr.length < 4) arr.push(0);
    return arr;
  }

  function move(dir) {
    prev = { grid: grid.map((r) => [...r]), score };
    let moved = false;
    if (dir === "left" || dir === "right") {
      for (let r = 0; r < 4; r++) {
        let row = [...grid[r]];
        if (dir === "right") row.reverse();
        const sl = slide(row);
        if (dir === "right") sl.reverse();
        if (sl.some((v, i) => v !== grid[r][i])) moved = true;
        grid[r] = sl;
      }
    } else {
      for (let c = 0; c < 4; c++) {
        let col = [grid[0][c], grid[1][c], grid[2][c], grid[3][c]];
        if (dir === "down") col.reverse();
        const sl = slide(col);
        if (dir === "down") sl.reverse();
        if (sl.some((v, i) => v !== grid[i][c])) moved = true;
        for (let r = 0; r < 4; r++) grid[r][c] = sl[r];
      }
    }
    if (!moved) {
      prev = null;
      return;
    }
    addRandom();
    if (won) {
      msg.textContent = "You reached 2048! Keep going or restart.";
    } else if (isGameOver()) {
      over = true;
      msg.textContent = "Game over. Try again?";
    } else {
      msg.textContent = "Use arrow keys or swipe to merge tiles.";
    }
    render();
  }

  function isGameOver() {
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++) {
        if (grid[r][c] === 0) return false;
        if (c < 3 && grid[r][c] === grid[r][c + 1]) return false;
        if (r < 3 && grid[r][c] === grid[r + 1][c]) return false;
      }
    return true;
  }

  function undo() {
    if (!prev) return;
    grid = prev.grid;
    score = prev.score;
    prev = null;
    over = false;
    won = false;
    msg.textContent = "Use arrow keys or swipe to merge tiles.";
    render();
  }

  function render() {
    best = Math.max(best || 0, score);
    board.innerHTML = "";
    const colors = {
      0: "#cdc1b4", 2: "#eee4da", 4: "#ede0c8", 8: "#f2b179",
      16: "#f59563", 32: "#f67c5f", 64: "#f65e3b", 128: "#edcf72",
      256: "#edcc61", 512: "#edc850", 1024: "#edc53f", 2048: "#edc22e"
    };
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const val = grid[r][c];
        const cell = document.createElement("div");
        cell.className = "t-cell";
        if (val) {
          cell.textContent = val;
          cell.style.background = colors[val] || "#3c3a32";
          cell.style.color = val <= 4 ? "#776e65" : "white";
          if (val >= 100) cell.style.fontSize = "0.85rem";
          if (val >= 1000) cell.style.fontSize = "0.7rem";
        }
        board.append(cell);
      }
    }
    scoreLabel.textContent = `Score: ${score}`;
    bestLabel.textContent = `Best: ${best}`;
    setSnapshot({
      mode: over ? "lost" : won ? "won" : "playing",
      game: "2048",
      score,
      best,
      maxTile: Math.max(...grid.flat()),
      moves: 0
    });
  }

  function keydown(e) {
    if (over && e.key !== "z") return;
    const map = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
    if (map[e.key]) {
      e.preventDefault();
      move(map[e.key]);
    } else if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      undo();
    }
  }

  let tx, ty;
  board.addEventListener("touchstart", (e) => {
    tx = e.touches[0].clientX;
    ty = e.touches[0].clientY;
  }, { passive: true });
  board.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - tx;
    const dy = e.changedTouches[0].clientY - ty;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (Math.max(ax, ay) < 20) return;
    if (ax > ay) move(dx > 0 ? "right" : "left");
    else move(dy > 0 ? "down" : "up");
  }, { passive: true });

  document.addEventListener("keydown", keydown);
  document.querySelector("#tRestart").addEventListener("click", init);
  document.querySelector("#tUndo").addEventListener("click", undo);
  activeCleanup = () => {
    document.removeEventListener("keydown", keydown);
  };
  init();
}
