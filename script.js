const filters = document.querySelectorAll(".filter:not(#viewToggle)");
const cards = [...document.querySelectorAll(".game-card")];
const saveButtons = document.querySelectorAll(".save-button");
const playButtons = document.querySelectorAll(".play-button");
const favoriteCount = document.querySelector("#favoriteCount");

(function showBuildTag() {
  const tag = document.querySelector("#buildTag");
  if (!tag) return;
  // Deploy-stamped build number (see .github/workflows/deploy.yml).
  // Falls back to the script ?v= locally, where no stamp exists.
  const meta = document.querySelector('meta[name="trinkets-build"]');
  if (meta && meta.content && meta.content !== "dev") {
    tag.textContent = "· " + meta.content;
    return;
  }
  const script = document.querySelector('script[src*="script.js?v="]');
  if (!script) return;
  const match = /[?&]v=([^&"]+)/.exec(script.getAttribute("src") || "");
  if (match) tag.textContent = "· build " + match[1];
})();


const gameModal = document.querySelector("#gameModal");
const gameShell = document.querySelector("#gameShell");
const modalTitle = document.querySelector("#modalTitle");
const modalKicker = document.querySelector("#modalKicker");
const closeGame = document.querySelector("#closeGame");

let savedPicks = 0;
let activeCleanup = null;
let activeSnapshot = { mode: "shelf" };
let activeAdvance = null;
let activeGameId = null;
const SAVE_KEY = "trinkets-saved-picks";

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

const gameSlugs = {
  switchback: "switchback_tiles",
  comet: "comet_catch",
  forge: "four_letter_forge",
  maze: "pocket_maze",
  bash: "button_bash",
  clue: "clue_crate",
  toybox: "toybox",
  thousand: "2048",
  powder: "powder_sim",
  wrap: "bubble_wrap",
  zen: "zen_sand",
  gravity: "gravity_balls",
  spiro: "spirograph",
  facts: "useless_facts",
  orchard: "orchard_go",
  magnet: "magnet_mess",
  ice: "ice_cube",
  coin: "coin_flip",
  cheese: "cheese_thief",
  machine: "normal_machine",
  onebutton: "one_button",
  penguin: "penguin_parkour",
  penguinDefence: "penguin_defence",
  defence: "penguin_defence",
  spider: "spider",
  ikea: "ikea_guess",
  flappy: "flappy_bird",
  zigzag: "zigzag",
  gravityball: "gravity_ball"
};

function slugToGame(slug) {
  const clean = String(slug || "").toLowerCase().replace(/-/g, "_");
  if (!clean) return null;
  for (const id of Object.keys(gameSlugs)) {
    if (gameSlugs[id] === clean || id === clean) return id;
  }
  return null;
}

function showGame(id) {
  const starter = gameStarters[id];
  if (!starter) return false;
  activeGameId = id;
  starter();
  try {
    history.replaceState(null, "", "#" + (gameSlugs[id] || id));
  } catch (err) {}
  return true;
}

window.addEventListener("hashchange", () => {
  const id = slugToGame(location.hash.slice(1));
  if (id && id !== activeGameId) showGame(id);
});

const KONAMI = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
let konamiIndex = 0;
document.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || gameModal.classList.contains("open")) {
    konamiIndex = 0;
    return;
  }
  const k = e.key.toLowerCase();
  if (k === KONAMI[konamiIndex]) {
    konamiIndex += 1;
  } else {
    konamiIndex = k === KONAMI[0] ? 1 : 0;
  }
  if (konamiIndex >= KONAMI.length) {
    konamiIndex = 0;
    window.__oneButtonKonami = true;
    showGame("onebutton");
  }
});

window.addEventListener("DOMContentLoaded", () => {
  const id = slugToGame(location.hash.slice(1));
  if (id) showGame(id);
});

// "New" badges expire 7 days after the card's data-added date (YYYY-MM-DD).
// New games: add data-added="<today>" alongside "· New" in the card tag.
(function expireNewBadges() {
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  document.querySelectorAll('.game-card[data-added]').forEach((card) => {
    const added = Date.parse(card.dataset.added + "T00:00:00");
    if (Number.isNaN(added) || now - added <= WEEK_MS) return;
    const tag = card.querySelector(".tag");
    if (tag) tag.textContent = tag.textContent.replace(/ · New/i, "");
  });
})();

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

(function initShelfView() {
  const grid = document.querySelector("#gameGrid");
  const toggle = document.querySelector("#viewToggle");
  if (!grid || !toggle) return;
  const KEY = "trinkets-shelf-view";
  const icon = toggle.querySelector(".material-symbols-outlined");
  const label = toggle.querySelector(".view-toggle-label");
  function apply(view) {
    const list = view === "list";
    grid.classList.toggle("list-view", list);
    toggle.setAttribute("aria-pressed", String(list));
    if (icon) icon.textContent = list ? "grid_view" : "view_list";
    if (label) label.textContent = list ? "Grid" : "List";
    toggle.title = list ? "Switch to grid view" : "Switch to list view";
  }
  let saved = null;
  try {
    saved = localStorage.getItem(KEY);
  } catch (err) {}
  apply(saved === "list" ? "list" : "grid");
  toggle.addEventListener("click", () => {
    const next = grid.classList.contains("list-view") ? "grid" : "list";
    try {
      localStorage.setItem(KEY, next);
    } catch (err) {}
    apply(next);
  });
})();

function readSavedIds() {
  let saved = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (Array.isArray(parsed)) saved = parsed;
  } catch (err) {
    saved = [];
  }
  return saved.filter((id) => cards.some((card) => card.dataset.game === id));
}

function writeSavedIds(ids) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(ids));
  } catch (err) {}
}

function syncSavedFromStorage() {
  const saved = readSavedIds();
  cards.forEach((card) => {
    const button = card.querySelector(".save-button");
    const isSaved = saved.includes(card.dataset.game);
    button.classList.toggle("saved", isSaved);
    button.textContent = isSaved ? "Saved" : "Save pick";
  });
  savedPicks = saved.length;
  favoriteCount.textContent = savedPicks;
}

syncSavedFromStorage();

saveButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const card = button.closest(".game-card");
    const id = card.dataset.game;
    const isSaved = button.classList.toggle("saved");
    button.textContent = isSaved ? "Saved" : "Save pick";
    const saved = readSavedIds();
    const next = saved.filter((entry) => entry !== id);
    if (isSaved) next.push(id);
    writeSavedIds(next);
    savedPicks = next.length;
    favoriteCount.textContent = savedPicks;
  });
});

const statGames = document.querySelector("#statGames");
if (statGames) statGames.textContent = String(cards.length);

const SCORE_KEY = "trinkets-highscores";

function readScores() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SCORE_KEY));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  } catch (err) {}
  return {};
}

function updateStatsBand() {
  if (statGames) statGames.textContent = String(cards.length);
  const bestsEl = document.querySelector("#statBests");
  if (bestsEl) bestsEl.textContent = String(Object.keys(readScores()).length);
  const factsEl = document.querySelector("#statFacts");
  if (factsEl) {
    let seen = 0;
    try {
      seen = Number(localStorage.getItem("trinkets-facts-seen")) || 0;
    } catch (err) {}
    factsEl.textContent = String(seen);
  }
}

function recordScore(game, value, mode) {
  const scores = readScores();
  const prev = scores[game];
  let isNew = false;
  if (prev === undefined) {
    if (value > 0) {
      scores[game] = value;
      isNew = true;
    }
  } else if (mode === "low" ? value < prev : value > prev) {
    scores[game] = value;
    isNew = true;
  }
  if (isNew) {
    try {
      localStorage.setItem(SCORE_KEY, JSON.stringify(scores));
    } catch (err) {}
  }
  updateStatsBand();
  const best = scores[game];
  return { best: best === undefined ? value : best, isNew };
}

function bumpScore(game) {
  const scores = readScores();
  scores[game] = (scores[game] || 0) + 1;
  try {
    localStorage.setItem(SCORE_KEY, JSON.stringify(scores));
  } catch (err) {}
  updateStatsBand();
  return scores[game];
}

updateStatsBand();

document.querySelectorAll("[data-nav-filter]").forEach((link) => {
  link.addEventListener("click", () => {
    const target = document.querySelector(`.filter[data-filter="${link.dataset.navFilter}"]`);
    if (target && !target.classList.contains("active")) target.click();
  });
});

playButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const card = button.closest(".game-card");
    showGame(card.dataset.game);
  });
});


closeGame.addEventListener("click", closeActiveGame);

function embedSnippet() {
  const base = location.origin + location.pathname.replace(/[^/]*$/, "") + "embed.html";
  const slug = activeGameId ? (gameSlugs[activeGameId] || activeGameId) : "";
  return `<iframe src="${base}?game=${slug}" width="720" height="600" style="border:0;border-radius:12px;" loading="lazy" allowfullscreen title="Trinkets Arcade game"></iframe>`;
}

const embedButton = document.querySelector("#embedButton");
if (embedButton) {
  embedButton.addEventListener("click", async () => {
    const snippet = embedSnippet();
    let ok = false;
    try {
      await navigator.clipboard.writeText(snippet);
      ok = true;
    } catch (err) {
      try {
        const ta = document.createElement("textarea");
        ta.value = snippet;
        document.body.append(ta);
        ta.select();
        ok = document.execCommand("copy");
        ta.remove();
      } catch (err2) {}
    }
    const icon = embedButton.querySelector(".material-symbols-outlined");
    if (ok && icon) {
      const prev = icon.textContent;
      icon.textContent = "check";
      setTimeout(() => { icon.textContent = prev; }, 1200);
    } else if (!ok) {
      window.prompt("Copy your embed code:", snippet);
    }
  });
}

function embedStatText(snap) {
  if (!snap || typeof snap !== "object") return "";
  const parts = [];
  if (typeof snap.score === "number") parts.push("Score: " + snap.score);
  if (snap.game === "2048" && typeof snap.best === "number" && snap.best > 0) {
    parts.push("Best: " + snap.best);
  }
  if (typeof snap.maze === "number" && snap.game === "Pocket Maze") {
    parts.unshift("Maze " + snap.maze);
  }
  if (typeof snap.board === "number") parts.unshift("Board " + snap.board);
  if (typeof snap.moves === "number" && (snap.game === "Switchback Tiles" || snap.game === "Pocket Maze" || snap.game === "Orchard Go")) {
    parts.push("Moves: " + snap.moves);
  }
  if (typeof snap.popped === "number") parts.push("Popped: " + snap.popped);
  if (typeof snap.balls === "number") parts.push("Balls: " + snap.balls);
  if (typeof snap.drawn === "number") parts.push("Drawn: " + snap.drawn);
  if (snap.game === "Four-Letter Forge" && typeof snap.steps === "number") {
    parts.push("Steps: " + snap.steps);
  }
  if (snap.game === "Clue Crate" && typeof snap.crate === "number") {
    parts.push("Crate: " + snap.crate);
  }
  if (snap.game === "Penguin Parkour") {
    if (typeof snap.level === "number") parts.push("Level " + snap.level);
    if (typeof snap.coins === "number") parts.push("Coins " + snap.coins);
    if (typeof snap.levelCoins === "string") parts.push(snap.levelCoins);
  }
  if (snap.game === "Penguin Defence") {
    if (typeof snap.wave === "number") parts.push("Wave " + snap.wave);
    if (typeof snap.lives === "number") parts.push("Lives " + snap.lives);
    if (typeof snap.coins === "number") parts.push("Fish " + snap.coins);
    if (typeof snap.cold === "number") parts.push("Cold " + snap.cold + "%");
  }
  if (snap.game === "Spider") {
    if (typeof snap.dist === "number") parts.push(snap.dist + " m");
    if (typeof snap.combo === "number") parts.push("Combo x" + snap.combo);
    if (typeof snap.perfects === "number") parts.push("Perfects " + snap.perfects);
  }
  if (snap.game === "Guess the IKEA Product") {
    if (typeof snap.round === "number") parts.push("Round " + snap.round);
    if (typeof snap.streak === "number") parts.push("Streak " + snap.streak);
  }
  if (snap.game === "Flappy Bird") {
    if (typeof snap.best === "number") parts.push("Best " + snap.best);
  }
  if (snap.game === "Zigzag") {
    if (typeof snap.dist === "number") parts.push(snap.dist + " m");
    if (typeof snap.coins === "number") parts.push("Coins " + snap.coins);
    if (typeof snap.score === "number") parts.push("Score " + snap.score);
  }
  if (snap.game === "Gravity Ball") {
    if (typeof snap.dist === "number") parts.push(snap.dist + " m");
    if (typeof snap.flips === "number") parts.push("Flips " + snap.flips);
    if (typeof snap.score === "number") parts.push("Score " + snap.score);
  }
  return parts.join(" · ");
}
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
  document.body.classList.add("modal-open");
  gameModal.scrollTop = 0;
  activeSnapshot = { mode: "playing", game: title };
  activeAdvance = null;
  closeGame.focus();
  requestAnimationFrame(() => requestAnimationFrame(fitGameShell));
}

function closeActiveGame() {
  closeCurrentGameOnly();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  gameModal.classList.remove("open");
  gameModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  gameShell.innerHTML = "";
  document.querySelectorAll("#mazeLevelPicker,#mazeCheatPopup").forEach((el) => el.remove());
  activeSnapshot = { mode: "shelf" };
  activeAdvance = null;
  activeGameId = null;
  try {
    if (slugToGame(location.hash.slice(1))) {
      history.replaceState(null, "", location.pathname + location.search);
    }
  } catch (err) {}
}

function closeCurrentGameOnly() {
  if (activeCleanup) {
    activeCleanup();
    activeCleanup = null;
  }
}

function fitGameShell() {
  if (!gameModal.classList.contains("open")) return;
  const panel = document.querySelector(".modal-panel");
  const header = panel ? panel.querySelector(".modal-header") : null;
  const layout = gameShell.querySelector(".game-layout");
  if (!panel || !header || !layout) return;
  layout.style.transform = "";
  layout.style.marginBottom = "";
  const embedReserve = document.body.classList.contains("embed") ? 52 : 0;
  const availH = panel.clientHeight - header.offsetHeight - 44 - embedReserve;
  const availW = panel.clientWidth - 50;
  if (availH <= 0 || availW <= 0) return;
  const needH = layout.scrollHeight;
  const needW = layout.scrollWidth;
  let z = 1;
  if (needH > availH) z = Math.min(z, availH / needH);
  if (needW > availW) z = Math.min(z, availW / needW);
  z = Math.max(0.35, z);
  if (z < 1) {
    layout.style.transformOrigin = "top center";
    layout.style.transform = `scale(${z.toFixed(3)})`;
    layout.style.marginBottom = `${-Math.round(needH * (1 - z))}px`;
  }
}

window.addEventListener("resize", fitGameShell);

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
          <span class="game-stat">Goal: connect <span class="goal-dot goal-start" aria-hidden="true"></span> start to <span class="goal-dot goal-end" aria-hidden="true"></span> finish</span>
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
  let puzzles = [];
  let randomCount = 0;

  function newRandomPuzzle() {
    puzzles[0] = buildSwitchbackPuzzle(randomSwitchPath(), randomCount);
    puzzleIndex = 0;
    randomCount += 1;
    reset();
  }
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

  function randomSwitchPath() {
    for (let attempt = 0; attempt < 400; attempt += 1) {
      const visited = new Set([0]);
      const path = [0];
      let current = 0;
      let guard = 0;
      while (current !== 24 && guard < 60) {
        guard += 1;
        const x = current % 5;
        const y = Math.floor(current / 5);
        const options = [];
        if (x > 0 && !visited.has(current - 1)) options.push(current - 1);
        if (x < 4 && !visited.has(current + 1)) options.push(current + 1);
        if (y > 0 && !visited.has(current - 5)) options.push(current - 5);
        if (y < 4 && !visited.has(current + 5)) options.push(current + 5);
        if (options.length === 0) break;
        options.sort((a, b) => {
          const da = Math.abs((a % 5) - 4) + Math.abs(Math.floor(a / 5) - 4);
          const db = Math.abs((b % 5) - 4) + Math.abs(Math.floor(b / 5) - 4);
          return da - db;
        });
        const pickFrom = Math.random() < 0.7 ? options.slice(0, 2) : options;
        const next = pickFrom[Math.floor(Math.random() * pickFrom.length)];
        visited.add(next);
        path.push(next);
        current = next;
      }
      if (current === 24 && path.length >= 9) return path;
    }
    return [...allPaths[Math.floor(Math.random() * allPaths.length)]];
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
    const lit = isConnected ? " lit" : "";
    const rot = ((tile.rotation || 0) * 90) % 360;
    if (index === 0) {
      return '<svg class="tile-svg" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="14" class="s"/><circle cx="24" cy="24" r="5.5" class="s-dot"/></svg>';
    }
    if (index === 24) {
      return '<svg class="tile-svg" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="14" class="f"/><circle cx="24" cy="24" r="5.5" class="f-dot"/></svg>';
    }
    const open = `<svg class="tile-svg${lit}" viewBox="0 0 48 48" style="transform:rotate(${rot}deg)" aria-hidden="true">`;
    if (tile.type === "line") return open + '<rect class="p" x="19" y="5" width="10" height="38" rx="5"/></svg>';
    if (tile.type === "corner") return open + '<rect class="p" x="19" y="5" width="10" height="24" rx="5"/><rect class="p" x="19" y="19" width="24" height="10" rx="5"/></svg>';
    if (tile.type === "tee") return open + '<rect class="p" x="19" y="5" width="10" height="24" rx="5"/><rect class="p" x="5" y="19" width="38" height="10" rx="5"/></svg>';
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
    puzzleLabel.textContent = `Puzzle #${randomCount}`;
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
  document.querySelector("#switchNext").addEventListener("click", newRandomPuzzle);
  newRandomPuzzle();
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
      greens: Array.from({ length: 2 }, () => makeDot(10, "#4ade80")),
      sparks: Array.from({ length: 3 }, () => makeDot(13, "#ff6b6b")),
      particles: [],
      popups: [],
      score: 0,
      time: 45,
      hitFlash: 0,
      shakeX: 0,
      shakeY: 0,
      nextCometScore: 30,
      nextGreenScore: 80,
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
    state.greens.forEach((dot) => {
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
    state.greens.forEach((dot) => {
      if (distance(state.player, dot) < state.player.r + dot.r) {
        state.score += 25;
        spawnParticles(dot.x, dot.y, "#4ade80", 10);
        spawnPopup(dot.x, dot.y - 20, "+25", "#4ade80");
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
    while (state.score >= state.nextGreenScore) {
      state.greens.push(makeDot(10, "#4ade80"));
      state.nextGreenScore += 80;
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
      const result = recordScore("comet", state.score, "high");
      message.textContent = `Time! Final score: ${state.score}.` + (result.isNew && state.score > 0 ? " New best!" : ` Best: ${result.best}.`);
      state.comets.forEach((dot) => spawnParticles(dot.x, dot.y, "#f6c445", 14));
      state.greens.forEach((dot) => spawnParticles(dot.x, dot.y, "#4ade80", 12));
      state.sparks.forEach((dot) => spawnParticles(dot.x, dot.y, "#ff6b6b", 10));
      state.comets = [];
      state.greens = [];
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

    function drawGlowy(dot, r, g, b) {
      for (let t = 0; t < dot.trail.length; t++) {
        const alpha = (t / dot.trail.length) * 0.35;
        const size = dot.r * (t / dot.trail.length) * 0.7;
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
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
    }
    state.comets.forEach((dot) => drawGlowy(dot, 246, 196, 69));
    state.greens.forEach((dot) => drawGlowy(dot, 74, 222, 128));

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
      const touchMove = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      message.textContent = touchMove ? "Drag on the starfield to move" : "Move with WASD, arrows, or mouse";
    } else if (running) {
      message.textContent = "";
    }

    setSnapshot({
      mode: running ? "playing" : "ended",
      game: "Comet Catch",
      coordinateSystem: "Canvas origin top-left, x right, y down.",
      player: roundedPoint(state.player),
      comets: state.comets.map(roundedPoint),
      greens: state.greens.map(roundedPoint),
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
    })
    .catch(() => {});
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
      recordScore("forge", levelIndex + 1, "high");
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
          <span class="game-stat maze-hint-stat">Move: arrows, WASD, or buttons</span>
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
        const mazeResult = recordScore("maze", moves, "low");
        document.querySelector("#mazeMessage").textContent = `Escaped in ${moves} moves!` + (mazeResult.isNew ? " New best escape!" : " Well played.");
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
    grid.style.gridTemplateColumns = `repeat(${maze[0].length}, minmax(0, 1fr))`;
    const reserve = window.innerHeight < 700 ? 470 : 500;
    grid.style.maxWidth = Math.min(maze[0].length * 52, window.innerHeight - reserve) + "px";
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
      document.querySelector(".modal-panel").appendChild(overlay);
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
      document.querySelector(".modal-panel").appendChild(popup);
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
    const startButton = document.querySelector("#bashStart");
    score = 0;
    streak = 0;
    time = 20;
    running = true;
    startButton.disabled = true;
    document.querySelector("#bashMessage").textContent = "Go.";
    chooseTarget();
    timer = setInterval(() => {
      time -= 1;
      if (time <= 0) {
        running = false;
        clearInterval(timer);
        target = -1;
        startButton.disabled = false;
        startButton.textContent = "Play again";
        const bashResult = recordScore("bash", score, "high");
        document.querySelector("#bashMessage").textContent = `Round over. Score: ${score}.` + (bashResult.isNew && score > 0 ? " New best!" : ` Best: ${bashResult.best}.`);
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
    { q: "I am lighter than air, but heavy to carry. If you drop me, you break me. If you break me, you win.", a: "egg", h: "You can eat these." },
    { q: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind.", a: "echo", h: "Shout into a canyon." },
    { q: "The more of me you take, the more you leave behind.", a: "footsteps", h: "Think about walking away." },
    { q: "I have cities but no houses, forests but no trees, rivers but no water.", a: "map", h: "You fold it." },
    { q: "I have one eye but cannot see.", a: "needle", h: "You thread it." },
    { q: "The more you take away from me, the bigger I get.", a: "hole", h: "Dig it." },
    { q: "I am full of holes but still hold water.", a: "sponge", h: "It sits by the sink." },
    { q: "I have a neck but no head.", a: "bottle", h: "It holds wine." },
    { q: "The person who makes it doesn't need it. The buyer doesn't use it. The user never knows.", a: "coffin", h: "Think funerals." },
    { q: "I come once in a minute, twice in a moment, but never in a thousand years.", a: "m", h: "It is a letter." },
    { q: "I have thirteen hearts but no other organs.", a: "cards", h: "Think poker." },
    { q: "You can catch me but never throw me.", a: "cold", h: "Bless you." },
    { q: "I go up but never come down.", a: "age", h: "Happy birthday." },
    { q: "I am tall when young and short when old.", a: "candle", h: "Make a wish." },
    { q: "I have a thumb and four fingers but I am not alive.", a: "glove", h: "It keeps hands warm." },
    { q: "I belong to you, but others use me more than you do.", a: "name", h: "Your parents picked it." },
    { q: "I have many teeth but cannot bite.", a: "comb", h: "It fixes hair." }
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
      if (index >= riddles.length) {
        const clueResult = recordScore("clue", score, "high");
        message.textContent = "Every crate is open. " + (clueResult.isNew ? "New best!" : `Best: ${clueResult.best}.`);
      } else {
        message.textContent = "Correct. Next crate.";
      }
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
        <p class="game-message">Press, pop, spin, squish, mix, and toggle. Everything here is meant to feel good.</p>
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
    let last = performance.now();

    function resize() {
      const rect = canvas.getBoundingClientRect();
      w = canvas.width = rect.width || 260;
      h = canvas.height = rect.height || 120;
    }
    resize();
    window.addEventListener("resize", resize);

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

    function animate(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const step = dt * 60;
      ctx.clearRect(0, 0, w, h);
      bubbles.forEach((b) => {
        b.y -= b.speed * step;
        b.wobble += b.wobbleSpeed * step;
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
        p.x += p.vx * step;
        p.y += p.vy * step;
        p.vy += 0.08 * step;
        p.life -= 0.03 * step;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
        ctx.fillStyle = "hsla(" + p.hue + ", 70%, 65%, " + p.life + ")";
        ctx.fill();
      });
      raf = requestAnimationFrame(animate);
    }
    raf = requestAnimationFrame(animate);

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

    addCleanup(() => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    });
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
    let lastTX = 0, lastTY = 0, lastTT = 0;
    let raf;

    function animate() {
      const rect = area.getBoundingClientRect();
      const maxX = Math.max(0, rect.width - 50);
      const maxY = Math.max(0, rect.height - 50);
      if (!dragging) {
        vy += 0.35;
        bx += vx;
        by += vy;
        vx *= 0.985;
        if (bx < 0) { bx = 0; vx = Math.abs(vx) * 0.6; }
        if (bx > maxX) { bx = maxX; vx = -Math.abs(vx) * 0.6; }
        if (by > maxY) { by = maxY; vy = -Math.abs(vy) * 0.45; vx *= 0.94; if (Math.abs(vy) < 1) vy = 0; }
        if (by < 0) { by = 0; vy = Math.abs(vy) * 0.6; }
        const speed = Math.hypot(vx, vy);
        ball.className = "toybox-jelly" + (speed > 2
          ? (Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? " squish-left" : " squish-right") : (vy > 0 ? " squish-top" : " squish-bottom"))
          : "");
      } else {
        bx = Math.min(maxX, Math.max(0, bx));
        by = Math.min(maxY, Math.max(0, by));
        ball.className = "toybox-jelly";
      }
      ball.style.left = bx + "px";
      ball.style.top = by + "px";
      raf = requestAnimationFrame(animate);
    }
    animate();

    area.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      area.setPointerCapture(e.pointerId);
      dragging = true;
      const rect = area.getBoundingClientRect();
      dragOffX = e.clientX - rect.left - bx;
      dragOffY = e.clientY - rect.top - by;
      vx = 0;
      vy = 0;
      lastTX = e.clientX;
      lastTY = e.clientY;
      lastTT = performance.now();
    });
    area.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const rect = area.getBoundingClientRect();
      bx = e.clientX - rect.left - dragOffX;
      by = e.clientY - rect.top - dragOffY;
      const now = performance.now();
      const dt = Math.max(8, now - lastTT);
      vx = ((e.clientX - lastTX) / dt) * 16 * 0.9;
      vy = ((e.clientY - lastTY) / dt) * 16 * 0.9;
      lastTX = e.clientX;
      lastTY = e.clientY;
      lastTT = now;
    });
    const releaseJelly = () => { dragging = false; };
    area.addEventListener("pointerup", releaseJelly);
    area.addEventListener("pointercancel", releaseJelly);

    addCleanup(() => {
      cancelAnimationFrame(raf);
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
      <span class="toybox-hex" id="gradHex">#ff6b6b</span>
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

    function rgbToHsl(r, g, b) {
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const l = (max + min) / 2;
      if (max === min) return [0, 0, l];
      const d = max - min;
      const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      let h = 0;
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
      return [h, s, l];
    }
    function hslToRgb(h, s, l) {
      if (s === 0) {
        const v = Math.round(l * 255);
        return [v, v, v];
      }
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      const conv = (t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      return [Math.round(conv(h + 1 / 3) * 255), Math.round(conv(h) * 255), Math.round(conv(h - 1 / 3) * 255)];
    }
    function toHex(v) {
      return Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0");
    }
    function update() {
      r = +sR.value;
      g = +sG.value;
      b = +sB.value;
      const hsl = rgbToHsl(r, g, b);
      const second = hslToRgb(hsl[0], hsl[1], Math.max(0.08, hsl[2] * 0.35));
      box.style.background = "linear-gradient(135deg, rgb(" + r + "," + g + "," + b + "), rgb(" + second[0] + "," + second[1] + "," + second[2] + "))";
      toy.querySelector("#gradHex").textContent = "#" + toHex(r) + toHex(g) + toHex(b);
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
    let togglesHTML = '<span class="toybox-toy-label" id="toggleLabel">Toggle parade · 0/' + toggleCount + ' on</span><div class="toybox-toggles">';
    for (let i = 0; i < toggleCount; i++) {
      togglesHTML += '<div class="toybox-toggle" data-index="' + i + '"><div class="toybox-toggle-knob"></div></div>';
    }
    togglesHTML += "</div>";
    toy.innerHTML = togglesHTML;
    grid.append(toy);

    const toggleLabel = toy.querySelector("#toggleLabel");
    toy.querySelectorAll(".toybox-toggle").forEach((toggle) => {
      toggle.addEventListener("click", () => {
        toggle.classList.toggle("on");
        const on = toy.querySelectorAll(".toybox-toggle.on").length;
        toggleLabel.textContent = "Toggle parade · " + on + "/" + toggleCount + " on";
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
      <p class="toybox-cradle-hint">Drag a ball back, let go</p>
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
    const restX = (i) => W / 2 + (i - (numBalls - 1) / 2) * spacing;
    const balls = [];
    for (let i = 0; i < numBalls; i++) balls.push({ x: restX(i), vx: 0 });
    let grab = -1;
    let grabVX = 0;
    let lastGX = 0;
    let lastGT = 0;
    let raf = 0;
    let last = performance.now();

    function ballY(x, i) {
      const dx = x - restX(i);
      return anchorY + Math.sqrt(Math.max(64, stringLen * stringLen - dx * dx));
    }

    function toCanvas(e) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (W / rect.width),
        y: (e.clientY - rect.top) * (H / rect.height)
      };
    }

    function ballAt(p) {
      for (let i = 0; i < numBalls; i++) {
        if (Math.hypot(p.x - balls[i].x, p.y - ballY(balls[i].x, i)) < ballR + 5) return i;
      }
      return -1;
    }

    function physics(dt) {
      const stiffness = 110;
      const damping = 0.25;
      for (let i = 0; i < numBalls; i++) {
        if (i === grab) continue;
        const b = balls[i];
        b.vx += (-stiffness * (b.x - restX(i)) - damping * b.vx) * dt;
        b.x += b.vx * dt;
      }
      for (let i = 0; i < numBalls - 1; i++) {
        const a = balls[i], b = balls[i + 1];
        const overlap = (ballR * 2 + 0.5) - (b.x - a.x);
        if (overlap <= 0) continue;
        if (i === grab) {
          b.x += overlap;
          b.vx = Math.max(b.vx, grabVX * 0.9);
        } else if (i + 1 === grab) {
          a.x -= overlap;
          a.vx = Math.min(a.vx, grabVX * 0.9);
        } else {
          a.x -= overlap / 2;
          b.x += overlap / 2;
          if (a.vx > b.vx) {
            const t = a.vx;
            a.vx = b.vx;
            b.vx = t;
          }
        }
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#394354";
      ctx.fillRect(W / 2 - (numBalls * spacing) / 2 - 10, anchorY - 6, numBalls * spacing + 20, 6);
      for (let i = 0; i < numBalls; i++) {
        const bx = balls[i].x;
        const by = ballY(bx, i);
        ctx.beginPath();
        ctx.moveTo(restX(i), anchorY);
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

    function animate(now) {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      physics(dt);
      draw();
      raf = requestAnimationFrame(animate);
    }
    raf = requestAnimationFrame(animate);

    canvas.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      const p = toCanvas(e);
      grab = ballAt(p);
      if (grab >= 0) {
        grabVX = 0;
        lastGX = p.x;
        lastGT = performance.now();
      }
    });
    canvas.addEventListener("pointermove", (e) => {
      if (grab < 0) return;
      const p = toCanvas(e);
      const now = performance.now();
      const dt = Math.max(8, now - lastGT) / 1000;
      grabVX = ((p.x - lastGX) / dt) * 0.85;
      balls[grab].x = Math.min(restX(grab) + 46, Math.max(restX(grab) - 46, p.x));
      balls[grab].vx = 0;
      lastGX = p.x;
      lastGT = now;
    });
    canvas.addEventListener("pointerup", (e) => {
      if (grab < 0) return;
      const p = toCanvas(e);
      if (Math.abs(p.x - restX(grab)) < 5) {
        balls[grab].vx = (balls[grab].x < W / 2 ? -1 : 1) * 300;
      } else {
        balls[grab].vx = Math.max(-600, Math.min(600, grabVX));
      }
      grab = -1;
    });
    canvas.addEventListener("pointercancel", () => { grab = -1; });

    addCleanup(() => cancelAnimationFrame(raf));
  })();

  /* ── Pop Tubes ── */
  (function initPopTubes() {
    const toy = document.createElement("div");
    toy.className = "toybox-toy";
    const tubeCount = 6;
    const tubeStages = [24, 40, 56, 70];
    let html = '<span class="toybox-toy-label" id="tubeLabel">Pop tubes</span><div class="toybox-tubes">';
    for (let i = 0; i < tubeCount; i++) {
      html += '<div class="toybox-tube" data-stage="0"><div class="toybox-tube-inner"></div></div>';
    }
    html += '</div><button class="game-action toybox-mini" id="tubeReset" type="button">Collapse all</button>';
    toy.innerHTML = html;
    grid.append(toy);

    const tubeLabel = toy.querySelector("#tubeLabel");
    let tubePops = 0;
    const tubes = toy.querySelectorAll(".toybox-tube");
    tubes.forEach((tube) => {
      tube.addEventListener("click", () => {
        const stage = (Number(tube.dataset.stage) + 1) % tubeStages.length;
        tube.dataset.stage = stage;
        tube.querySelector(".toybox-tube-inner").style.height = tubeStages[stage] + "px";
        tube.classList.toggle("s2", stage === 2);
        tube.classList.toggle("s3", stage === 3);
        tubePops += 1;
        tubeLabel.textContent = "Pop tubes · " + tubePops + " pops";
      });
    });
    toy.querySelector("#tubeReset").addEventListener("click", () => {
      tubes.forEach((tube) => {
        tube.dataset.stage = 0;
        tube.querySelector(".toybox-tube-inner").style.height = tubeStages[0] + "px";
        tube.classList.remove("s2", "s3");
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
      w = canvas.width = rect.width || 360;
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
      <span class="toybox-toy-label" id="dominoLabel">Domino chain</span>
      <canvas class="toybox-domino-canvas" id="dominoCanvas"></canvas>
      <div class="toybox-domino-actions">
        <button class="game-action toybox-mini" id="dominoTip" type="button">Tip first</button>
        <button class="game-action toybox-mini" id="dominoReset" type="button">Reset</button>
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
      w = canvas.width = rect.width || 360;
      h = canvas.height = 100;
    }
    resize();

    const dominoPalette = [["#ffd9d9", "#e88"], ["#ffedbe", "#d9b64f"], ["#c9efe6", "#4fae9c"], ["#cfe0f5", "#5b84c4"], ["#ddd0f5", "#8a68c8"]];
    let lastDown = -1;
    const DOM_H = 40;
    const DOM_W = 10;

    function buildChain() {
      dominos.length = 0;
      const count = Math.floor(w / 28);
      const startX = 15;
      for (let i = 0; i < count; i++) {
        const palette = dominoPalette[i % dominoPalette.length];
        dominos.push({
          x: startX + i * 26,
          angle: 0,
          angVel: 0,
          falling: false,
          fallen: false,
          light: palette[0],
          dark: palette[1]
        });
      }
      lastDown = -1;
    }
    buildChain();

    function updateDominoLabel() {
      const down = dominos.filter((d) => d.fallen).length;
      if (down === lastDown) return;
      lastDown = down;
      toy.querySelector("#dominoLabel").textContent = "Domino chain · " + down + "/" + dominos.length + " down";
    }

    function topPoint(d) {
      return {
        x: d.x + DOM_H * Math.sin(d.angle),
        y: (h - 5) - DOM_H * Math.cos(d.angle)
      };
    }

    function physics(dt) {
      for (const d of dominos) {
        if (d.falling && !d.fallen) {
          d.angVel += 4.2 * dt;
          d.angle += d.angVel * dt;
        }
      }
      for (let pass = 0; pass < 3; pass++) {
        for (let i = 0; i < dominos.length - 1; i++) {
          const a = dominos[i];
          const b = dominos[i + 1];
          if ((!a.falling && !a.fallen) || (b.fallen && b.angle >= Math.PI / 2.2)) continue;
          const lean = Math.sin(Math.min(b.angle, 0.6)) * DOM_H * 0.15;
          const faceX = b.x - DOM_W / 2 + lean;
          const t = topPoint(a);
          if (t.x > faceX && t.y > (h - 5) - DOM_H) {
            if (!b.fallen) {
              b.falling = true;
              b.angVel = Math.max(b.angVel, a.angVel * 0.9);
            }
            const ratio = Math.max(-1, Math.min(1, (faceX - a.x) / DOM_H));
            const clamped = Math.asin(ratio);
            if (clamped < a.angle) {
              a.angle = Math.max(0, clamped);
              a.angVel *= 0.4;
            }
          }
        }
      }
      for (const d of dominos) {
        if (d.falling && !d.fallen && d.angle >= Math.PI / 2.2) {
          d.angle = Math.PI / 2.2;
          d.fallen = true;
          d.falling = false;
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
        grad.addColorStop(0, d.fallen ? d.dark : d.light);
        grad.addColorStop(1, d.fallen ? d.dark : "#ffffff");
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

    let lastTick = performance.now();
    function animate(now) {
      const dt = Math.min(0.05, (now - lastTick) / 1000);
      lastTick = now;
      physics(dt);
      draw();
      updateDominoLabel();
      raf = requestAnimationFrame(animate);
    }
    raf = requestAnimationFrame(animate);

    canvas.addEventListener("click", (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (w / rect.width);
      for (let i = 0; i < dominos.length; i++) {
        if (!dominos[i].fallen && Math.abs(dominos[i].x - mx) < 20) {
          dominos[i].falling = true;
          dominos[i].angVel = 2.0;
          break;
        }
      }
    });

    toy.querySelector("#dominoTip").addEventListener("click", () => {
      if (dominos.length && !dominos[0].fallen) {
        dominos[0].falling = true;
        dominos[0].angVel = 2.0;
      }
    });

    toy.querySelector("#dominoReset").addEventListener("click", () => {
      buildChain();
    });

    addCleanup(() => cancelAnimationFrame(raf));
  })();

  const allToys = [...grid.children];
  let toysPerPage = grid.clientWidth < 560 ? 2 : 4;
  let toyPage = 0;
  const pager = document.createElement("div");
  pager.className = "toybox-pager";
  pager.innerHTML = `<button class="game-action toybox-mini" id="toyPrev" type="button">‹ Prev</button><span class="toybox-page-label" id="toyPageLabel"></span><button class="game-action toybox-mini" id="toyNext" type="button">Next ›</button>`;
  grid.after(pager);
  const prevBtn = pager.querySelector("#toyPrev");
  const nextBtn = pager.querySelector("#toyNext");
  const pageLabel = pager.querySelector("#toyPageLabel");
  function toyPageCount() {
    return Math.max(1, Math.ceil(allToys.length / toysPerPage));
  }
  function showToyPage(n) {
    toyPage = Math.max(0, Math.min(toyPageCount() - 1, n));
    allToys.forEach((toy, i) => {
      toy.classList.toggle("toybox-hidden", Math.floor(i / toysPerPage) !== toyPage);
    });
    pageLabel.textContent = `Page ${toyPage + 1} of ${toyPageCount()}`;
    prevBtn.disabled = toyPage === 0;
    nextBtn.disabled = toyPage === toyPageCount() - 1;
    fitGameShell();
  }
  prevBtn.addEventListener("click", () => showToyPage(toyPage - 1));
  nextBtn.addEventListener("click", () => showToyPage(toyPage + 1));
  let toyResizeTimer = 0;
  function onToyResize() {
    clearTimeout(toyResizeTimer);
    toyResizeTimer = setTimeout(() => {
      if (!grid.isConnected) return;
      const want = grid.clientWidth < 560 ? 2 : 4;
      if (want === toysPerPage) return;
      const firstVisible = toyPage * toysPerPage;
      toysPerPage = want;
      showToyPage(Math.floor(firstVisible / toysPerPage));
    }, 200);
  }
  window.addEventListener("resize", onToyResize);
  cleanups.push(() => {
    window.removeEventListener("resize", onToyResize);
    clearTimeout(toyResizeTimer);
  });
  showToyPage(0);

  setSnapshot({
    mode: "playing",
    game: "Toybox",
    toys: ["push", "spinner", "bubbles", "jelly", "gradient", "toggles", "cradle", "tubes", "ripples", "dominos"]
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
        <div class="t-board-wrap">
          <div class="t-bg" id="tBg"></div>
          <div class="t-tiles" id="tTiles"></div>
        </div>
        <div class="t-pad" aria-label="Move tiles">
          <button class="game-action t-pad-button" type="button" data-dir="up" aria-label="Move up">↑</button>
          <button class="game-action t-pad-button" type="button" data-dir="left" aria-label="Move left">←</button>
          <button class="game-action t-pad-button" type="button" data-dir="down" aria-label="Move down">↓</button>
          <button class="game-action t-pad-button" type="button" data-dir="right" aria-label="Move right">→</button>
        </div>
        <div class="game-actions">
          <button class="game-action" id="tUndo" type="button">Undo</button>
          <button class="game-action" id="tRestart" type="button">Restart</button>
        </div>
      </div>
    `
  );

  const tileLayer = document.querySelector("#tTiles");
  const bgLayer = document.querySelector("#tBg");
  const msg = document.querySelector("#tMessage");
  const scoreLabel = document.querySelector("#tScore");
  const bestLabel = document.querySelector("#tBest");

  let grid, score, best, prev, won, over, tiles, nextId;

  const colors = {
    2: "#eee4da", 4: "#ede0c8", 8: "#f2b179", 16: "#f59563",
    32: "#f67c5f", 64: "#f65e3b", 128: "#edcf72", 256: "#edcc61",
    512: "#edc850", 1024: "#edc53f", 2048: "#edc22e",
    4096: "#ff9ff3", 8192: "#222831"
  };

  function buildBg() {
    bgLayer.innerHTML = "";
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++) {
        const cell = document.createElement("div");
        cell.className = "t-bg-cell";
        bgLayer.append(cell);
      }
  }

  function init() {
    grid = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
    tiles = [];
    nextId = 1;
    score = 0;
    best = readScores().thousand || 0;
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
    const val = Math.random() < 0.9 ? 2 : 4;
    grid[r][c] = val;
    tiles.push({ id: nextId++, val, r, c, merged: false, fresh: true });
  }

  function slide(row) {
    let arr = row.filter((v) => v !== 0);
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        arr[i] *= 2;
        score += arr[i];
        if (arr[i] === 2048 && !won) won = true;
        arr.splice(i + 1, 1);
      }
    }
    while (arr.length < 4) arr.push(0);
    return arr;
  }

  function processLine(oldTiles, newVals, posFn) {
    const absorbed = [];
    const survivors = [];
    let ti = 0;
    for (let i = 0; i < 4; i++) {
      if (newVals[i] === 0) continue;
      const tile = oldTiles[ti];
      ti++;
      if (ti < oldTiles.length && oldTiles[ti].val === tile.val && !tile.merged) {
        absorbed.push(oldTiles[ti]);
        tile.val = newVals[i];
        tile.merged = true;
        const pos = posFn(i);
        tile.r = pos[0];
        tile.c = pos[1];
        survivors.push(tile);
        ti++;
      } else {
        const pos = posFn(i);
        tile.r = pos[0];
        tile.c = pos[1];
        survivors.push(tile);
      }
    }
    oldTiles.forEach((t) => { if (!survivors.includes(t)) absorbed.push(t); });
    return { survivors, absorbed };
  }

  function healTiles() {
    const seen = new Set();
    let ok = true;
    for (const t of tiles) {
      const key = t.r + "," + t.c;
      if (t.r < 0 || t.r > 3 || t.c < 0 || t.c > 3 || seen.has(key) || grid[t.r][t.c] !== t.val) {
        ok = false;
        break;
      }
      seen.add(key);
    }
    if (ok) {
      for (let r = 0; r < 4 && ok; r++) {
        for (let c = 0; c < 4; c++) {
          if (grid[r][c] !== 0 && !seen.has(r + "," + c)) {
            ok = false;
            break;
          }
        }
      }
    }
    if (!ok) {
      tiles = [];
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (grid[r][c] !== 0) tiles.push({ id: nextId++, val: grid[r][c], r, c, merged: false, fresh: false });
        }
      }
    }
  }

  function move(dir) {
    healTiles();
    prev = { grid: grid.map((r) => [...r]), score, tiles: tiles.map((t) => ({ ...t })) };
    let moved = false;
    const absorbed = [];

    tiles.forEach((t) => { t.merged = false; t.fresh = false; });

    if (dir === "left" || dir === "right") {
      for (let r = 0; r < 4; r++) {
        const oldRow = [...grid[r]];
        let row = [...grid[r]];
        if (dir === "right") row.reverse();
        const sl = slide(row);
        const final = dir === "right" ? [...sl].reverse() : sl;
        if (final.some((v, i) => v !== oldRow[i])) moved = true;
        grid[r] = final;
        const rowTiles = tiles.filter((t) => t.r === r).sort((a, b) => a.c - b.c);
        if (dir === "right") rowTiles.reverse();
        const lineTiles = processLine(rowTiles, sl, (i) => [r, dir === "right" ? 3 - i : i]);
        absorbed.push(...lineTiles.absorbed);
      }
    } else {
      for (let c = 0; c < 4; c++) {
        const oldCol = [grid[0][c], grid[1][c], grid[2][c], grid[3][c]];
        let col = [...oldCol];
        if (dir === "down") col.reverse();
        const sl = slide(col);
        const final = dir === "down" ? [...sl].reverse() : sl;
        if (final.some((v, i) => v !== oldCol[i])) moved = true;
        for (let r = 0; r < 4; r++) grid[r][c] = final[r];
        const colTiles = tiles.filter((t) => t.c === c).sort((a, b) => a.r - b.r);
        if (dir === "down") colTiles.reverse();
        const lineTiles = processLine(colTiles, sl, (i) => [dir === "down" ? 3 - i : i, c]);
        absorbed.push(...lineTiles.absorbed);
      }
    }

    if (!moved) {
      prev = null;
      return;
    }

    absorbed.forEach((t) => { t.val = 0; });
    tiles = tiles.filter((t) => t.val !== 0);

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
    tiles = prev.tiles;
    prev = null;
    over = false;
    won = false;
    msg.textContent = "Use arrow keys or swipe to merge tiles.";
    render();
  }

  function render() {
    best = Math.max(best || 0, score);
    recordScore("thousand", best, "high");
    tileLayer.innerHTML = "";
    tiles.forEach((t) => {
      const el = document.createElement("div");
      el.className = "t-tile";
      el.textContent = t.val;
      el.style.width = "calc((100% - 30px) / 4)";
      el.style.height = "calc((100% - 30px) / 4)";
      el.style.left = `calc(${t.c} * ((100% - 30px) / 4 + 10px))`;
      el.style.top = `calc(${t.r} * ((100% - 30px) / 4 + 10px))`;
      el.style.background = colors[t.val] || "#3c3a32";
      el.style.color = t.val <= 4 ? "#776e65" : "white";
      if (t.val >= 100) el.style.fontSize = "1.3rem";
      if (t.val >= 1000) el.style.fontSize = "1rem";
      if (t.merged) el.classList.add("t-merged");
      if (t.fresh) el.classList.add("t-new");
      tileLayer.append(el);
    });
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
  tileLayer.closest(".t-board-wrap").addEventListener("touchstart", (e) => {
    tx = e.touches[0].clientX;
    ty = e.touches[0].clientY;
  }, { passive: true });
  tileLayer.closest(".t-board-wrap").addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - tx;
    const dy = e.changedTouches[0].clientY - ty;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (Math.max(ax, ay) < 20) return;
    if (ax > ay) move(dx > 0 ? "right" : "left");
    else move(dy > 0 ? "down" : "up");
  }, { passive: true });

  document.addEventListener("keydown", keydown);
  document.querySelectorAll(".t-pad-button").forEach((btn) => {
    btn.addEventListener("click", () => move(btn.dataset.dir));
  });
  document.querySelector("#tRestart").addEventListener("click", init);
  document.querySelector("#tUndo").addEventListener("click", undo);
  activeCleanup = () => {
    document.removeEventListener("keydown", keydown);
  };
  buildBg();
  init();
}