/* Trinkets Arcade — local leaderboards (v1).
 * Static-site friendly: all boards live in localStorage on this device.
 * Every game already reports via global recordScore()/bumpScore() in
 * script.js, so we wrap those two functions and build per-game Top-10
 * history + a shelf section + per-card best badges. No backend needed.
 */
(function () {
  "use strict";

  var LB_KEY = "trinkets-leaderboards-v1";
  var NAME_KEY = "trinkets-player-name";
  var OLD_KEY = "trinkets-highscores";
  var MAX_ENTRIES = 10;

  // gameId (recordScore key) -> metadata. mode: "high" wins bigger, "low" wins smaller.
  var GAME_META = {
    comet:       { title: "Comet Catch",          mode: "high", unit: "pts" },
    bash:        { title: "Button Bash",          mode: "high", unit: "pts" },
    thousand:    { title: "2048",                 mode: "high", unit: "pts", card: "thousand" },
    clue:        { title: "Clue Crate",           mode: "high", unit: "pts" },
    maze:        { title: "Pocket Maze",          mode: "low",  unit: "moves" },
    forge:       { title: "Four-Letter Forge",    mode: "high", unit: "levels" },
    wrap:        { title: "Bubble Wrap",          mode: "high", unit: "chain" },
    orchard:     { title: "Orchard Go",           mode: "low",  unit: "moves" },
    ice:         { title: "Ice Cube",             mode: "high", unit: "boards" },
    cheese:      { title: "Cheese Thief",         mode: "high", unit: "pts" },
    machine:     { title: "Completely Normal Machine", mode: "high", unit: "found" },
    onebutton:   { title: "One Button",           mode: "high", unit: "m" },
    penguin:     { title: "Penguin Parkour",      mode: "high", unit: "level" },
    defence:     { title: "Penguin Defence",      mode: "high", unit: "wave" },
    spider:      { title: "Spider",               mode: "high", unit: "m" },
    ikea:        { title: "Guess the IKEA Product", mode: "high", unit: "pts" },
    flappy:      { title: "Flappy Bird",          mode: "high", unit: "pts" },
    zigzag:      { title: "Zigzag",               mode: "high", unit: "pts" },
    gravityball: { title: "Gravity Ball",         mode: "high", unit: "m" },
    tinyblocks:  { title: "Tiny Blocks",          mode: "high", unit: "pts" },
    tag:         { title: "Trinkets Tag",         mode: "high", unit: "pts" },
    mayhem:      { title: "Magnet Mayhem",        mode: "high", unit: "wins" },
    tycoon:      { title: "Penguin Park Tycoon",  mode: "high", unit: "coins" }
  };

  function isLow(game) {
    return GAME_META[game] && GAME_META[game].mode === "low";
  }

  function loadBoards() {
    try {
      var parsed = JSON.parse(localStorage.getItem(LB_KEY));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch (err) {}
    return {};
  }

  function saveBoards(boards) {
    try {
      localStorage.setItem(LB_KEY, JSON.stringify(boards));
    } catch (err) {}
  }

  function getName() {
    try {
      return (localStorage.getItem(NAME_KEY) || "").slice(0, 12);
    } catch (err) {
      return "";
    }
  }

  function setName(n) {
    try {
      localStorage.setItem(NAME_KEY, String(n || "").slice(0, 12));
    } catch (err) {}
  }

  function compare(a, b, game) {
    return isLow(game) ? a - b : b - a;
  }

  function getBoard(game) {
    var boards = loadBoards();
    var list = boards[game];
    return Array.isArray(list) ? list : [];
  }

  function getBest(game) {
    var board = getBoard(game);
    if (board.length) return board[0].s;
    // Fall back to the legacy single-best store so old scores still show.
    try {
      var old = JSON.parse(localStorage.getItem(OLD_KEY));
      if (old && typeof old[game] === "number") return old[game];
    } catch (err) {}
    return null;
  }

  function formatScore(game, value) {
    var meta = GAME_META[game];
    var unit = meta ? meta.unit : "pts";
    if (value === null || value === undefined) return "—";
    return String(value) + " " + unit;
  }

  function addScore(game, value) {
    if (!GAME_META[game]) return { rank: -1, isNew: false };
    if (typeof value !== "number" || !isFinite(value)) return { rank: -1, isNew: false };
    if (value <= 0) return { rank: -1, isNew: false, best: getBest(game) };
    var boards = loadBoards();
    var list = Array.isArray(boards[game]) ? boards[game] : [];
    var name = getName() || "You";
    var entry = { n: name, s: value, d: Date.now() };
    // Avoid 2048-style spam: render() calls recordScore every move with the
    // same best. Skip exact duplicates of the latest entry.
    var last = list[list.length - 1];
    if (last && last.s === value && last.n === name && (Date.now() - last.d) < 5000) {
      return { rank: -1, isNew: false, best: list.length ? list[0].s : value };
    }
    list.push(entry);
    list.sort(function (x, y) { return compare(x.s, y.s, game); });
    list = list.slice(0, MAX_ENTRIES);
    boards[game] = list;
    saveBoards(boards);
    var rank = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i] === entry) { rank = i; break; }
    }
    // Entry made the cut (or tied its way in).
    if (rank === -1) {
      // It was pushed out by better scores; still a recorded run.
      return { rank: -1, isNew: false, best: list.length ? list[0].s : value };
    }
    return { rank: rank, isNew: true, best: list[0].s };
  }

  function migrateOldScores() {
    var boards = loadBoards();
    if (Object.keys(boards).length) return;
    var old = null;
    try {
      old = JSON.parse(localStorage.getItem(OLD_KEY));
    } catch (err) {}
    if (!old || typeof old !== "object") return;
    var name = getName() || "You";
    var now = Date.now();
    Object.keys(GAME_META).forEach(function (game) {
      var v = old[game];
      if (typeof v === "number" && isFinite(v) && v > 0) {
        boards[game] = [{ n: name, s: v, d: now }];
      }
    });
    if (Object.keys(boards).length) saveBoards(boards);
  }

  function clearBoards() {
    try {
      localStorage.removeItem(LB_KEY);
    } catch (err) {}
  }

  function totalRuns() {
    var boards = loadBoards();
    var n = 0;
    Object.keys(boards).forEach(function (g) { n += boards[g].length; });
    return n;
  }

  // Expose a tiny API for debugging / future games.
  window.TrinketsBoards = {
    meta: GAME_META,
    getBoard: getBoard,
    getBest: getBest,
    addScore: addScore,
    formatScore: formatScore,
    getName: getName,
    setName: setName,
    clear: clearBoards,
    totalRuns: totalRuns
  };

  /* ── Wrap the existing global scorers so every game feeds the boards ── */
  function wrapScorers() {
    if (typeof window.recordScore === "function" && !window.recordScore.__lbWrapped) {
      var orig = window.recordScore;
      var wrapped = function (game, value, mode) {
        var result = orig(game, value, mode);
        try {
          if (GAME_META[game] && typeof value === "number" && value > 0) {
            // 2048 calls recordScore on every render: only log improvements.
            if (game === "thousand" && !result.isNew) return result;
            var added = addScore(game, value);
            if (added.rank >= 0) {
              result.lbRank = added.rank;
              result.lbBest = added.best;
            }
            scheduleRefresh();
          }
        } catch (err) {}
        return result;
      };
      wrapped.__lbWrapped = true;
      window.recordScore = wrapped;
      // Keep bare `recordScore()` calls inside classic scripts working:
      // they resolve via scope chain, so also patch the global binding.
      try { recordScore = wrapped; } catch (err) {}
    }
  }

  /* ── Shelf UI ── */
  var selectedGame = null;
  var refreshTimer = 0;

  function scheduleRefresh() {
    if (refreshTimer) return;
    refreshTimer = setTimeout(function () {
      refreshTimer = 0;
      renderAll();
    }, 150);
  }

  function medal(i) {
    return i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : String(i + 1) + ".";
  }

  function fmtDate(ts) {
    try {
      return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch (err) {
      return "";
    }
  }

  function playedGames() {
    var boards = loadBoards();
    var ids = Object.keys(GAME_META).filter(function (g) {
      return (boards[g] && boards[g].length) || getBest(g) !== null;
    });
    // Always list every ranked game so players can discover empty boards.
    Object.keys(GAME_META).forEach(function (g) {
      if (ids.indexOf(g) === -1) ids.push(g);
    });
    return ids;
  }

  function renderTabs() {
    var wrap = document.querySelector("#lbGames");
    if (!wrap) return;
    wrap.innerHTML = "";
    playedGames().forEach(function (game) {
      var meta = GAME_META[game];
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "lb-tab" + (game === selectedGame ? " active" : "");
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", game === selectedGame ? "true" : "false");
      var best = getBest(game);
      btn.innerHTML = "";
      var t = document.createElement("span");
      t.className = "lb-tab-title";
      t.textContent = meta.title;
      var b = document.createElement("span");
      b.className = "lb-tab-best";
      b.textContent = best === null ? "no score yet" : "best " + formatScore(game, best);
      btn.append(t);
      btn.append(b);
      btn.addEventListener("click", function () {
        selectedGame = game;
        renderAll();
      });
      wrap.append(btn);
    });
  }

  function renderBoard() {
    var title = document.querySelector("#lbBoardTitle");
    var metaEl = document.querySelector("#lbBoardMeta");
    var list = document.querySelector("#lbBoard");
    var empty = document.querySelector("#lbEmpty");
    if (!title || !list) return;
    if (!selectedGame || !GAME_META[selectedGame]) {
      selectedGame = playedGames()[0] || "comet";
    }
    var meta = GAME_META[selectedGame];
    var board = getBoard(selectedGame);
    title.textContent = meta.title + " — Top " + MAX_ENTRIES;
    var direction = meta.mode === "low" ? "Fewest " + meta.unit + " wins" : "Most " + meta.unit + " wins";
    if (metaEl) metaEl.textContent = direction + " · on this device";
    list.innerHTML = "";
    board.forEach(function (entry, i) {
      var li = document.createElement("li");
      li.className = "lb-row" + (i === 0 ? " champ" : "");
      var m = document.createElement("span");
      m.className = "lb-medal";
      m.textContent = medal(i);
      var n = document.createElement("span");
      n.className = "lb-name";
      n.textContent = entry.n || "You";
      var s = document.createElement("strong");
      s.className = "lb-score";
      s.textContent = formatScore(selectedGame, entry.s);
      var d = document.createElement("span");
      d.className = "lb-date";
      d.textContent = entry.d ? fmtDate(entry.d) : "";
      li.append(m);
      li.append(n);
      li.append(s);
      li.append(d);
      list.append(li);
    });
    if (empty) {
      empty.textContent = board.length
        ? ""
        : "No scores yet — go play " + meta.title + " and be the first name up here.";
    }
  }

  function renderHall() {
    var hall = document.querySelector("#lbAll");
    if (!hall) return;
    hall.innerHTML = "";
    var boards = loadBoards();
    var ranked = Object.keys(GAME_META).filter(function (g) {
      return boards[g] && boards[g].length;
    });
    var count = document.querySelector("#lbCount");
    if (count) count.textContent = String(totalRuns());
    if (!ranked.length) {
      var p = document.createElement("p");
      p.className = "lb-hall-empty";
      p.textContent = "Play any scored game and your best runs will appear here with 🥇🥈🥉 medals.";
      hall.append(p);
      return;
    }
    ranked.sort(function (a, b) {
      return (boards[b][0].d || 0) - (boards[a][0].d || 0);
    });
    ranked.slice(0, 12).forEach(function (game) {
      var meta = GAME_META[game];
      var top = boards[game][0];
      var card = document.createElement("button");
      card.type = "button";
      card.className = "lb-hall-card";
      var e = document.createElement("span");
      e.className = "lb-hall-eyebrow";
      e.textContent = "👑 " + meta.title;
      var v = document.createElement("strong");
      v.className = "lb-hall-score";
      v.textContent = "🥇 " + (top.n || "You") + " · " + formatScore(game, top.s);
      card.append(e);
      card.append(v);
      card.addEventListener("click", function () {
        selectedGame = game;
        renderAll();
        var target = document.querySelector("#lbBoardTitle");
        if (target && target.scrollIntoView) target.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      hall.append(card);
    });
  }

  function renderBadges() {
    document.querySelectorAll(".game-card[data-game]").forEach(function (card) {
      var game = card.dataset.game;
      // Map card ids to leaderboard ids (they mostly match; thousand is 2048).
      var lbId = game;
      if (game === "thousand") lbId = "thousand";
      if (!GAME_META[lbId]) {
        // Try reverse lookup via slug table for aliases like "defence".
        return;
      }
      var best = getBest(lbId);
      var badge = card.querySelector(".best-badge");
      if (best === null) {
        if (badge) badge.hidden = true;
        return;
      }
      if (!badge) {
        badge = document.createElement("p");
        badge.className = "best-badge";
        var actions = card.querySelector(".card-actions");
        if (actions) actions.before(badge);
        else card.append(badge);
      }
      badge.hidden = false;
      badge.textContent = "🏆 Best: " + formatScore(lbId, best);
    });
  }

  function renderAll() {
    renderTabs();
    renderBoard();
    renderHall();
    renderBadges();
  }

  function initUI() {
    var section = document.querySelector("#leaderboards");
    // Beta-gated: beta.js strips [data-beta] for normal visitors, so when
    // the section is gone we stay invisible (no badges either) but keep
    // recording scores underneath.
    if (!section) {
      return;
    }
    var nameInput = document.querySelector("#lbName");
    if (nameInput) {
      nameInput.value = getName();
      nameInput.addEventListener("change", function () {
        setName(nameInput.value.trim());
        renderAll();
      });
    }
    var clearBtn = document.querySelector("#lbClear");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        if (!confirm("Clear all leaderboard scores on this device?")) return;
        clearBoards();
        renderAll();
      });
    }
    // Default selection: most recently played, else first ranked game.
    try {
      var boards = loadBoards();
      var latest = null, latestAt = 0;
      Object.keys(boards).forEach(function (g) {
        (boards[g] || []).forEach(function (e) {
          if (e.d > latestAt) { latestAt = e.d; latest = g; }
        });
      });
      selectedGame = latest || "comet";
    } catch (err) {
      selectedGame = "comet";
    }
    renderAll();
    window.addEventListener("storage", function (e) {
      if (e.key === LB_KEY || e.key === OLD_KEY || e.key === NAME_KEY) renderAll();
    });
  }

  // Modal shortcut: a 🏆 button that closes the game and jumps to the boards.
  // Beta-gated with the shelf section.
  function initModalButton() {
    if (!document.querySelector("#leaderboards")) return;    var header = document.querySelector(".modal-buttons");
    var modal = document.querySelector("#gameModal");
    if (!header || !modal || document.querySelector("#lbJump")) return;
    var btn = document.createElement("button");
    btn.className = "embed-button";
    btn.id = "lbJump";
    btn.type = "button";
    btn.title = "View leaderboards";
    btn.setAttribute("aria-label", "View leaderboards");
    btn.innerHTML = '<span class="material-symbols-outlined">trophy</span>';
    btn.addEventListener("click", function () {
      try {
        var close = document.querySelector("#closeGame");
        if (close) close.click();
      } catch (err) {}
      var target = document.querySelector("#leaderboards");
      if (target && target.scrollIntoView) {
        setTimeout(function () {
          target.scrollIntoView({ behavior: "smooth" });
        }, 60);
      } else {
        location.hash = "#leaderboards";
      }
    });
    header.insertBefore(btn, header.firstChild);
  }

  migrateOldScores();
  wrapScorers();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      wrapScorers();
      initUI();
      initModalButton();
    });
  } else {
    initUI();
    initModalButton();
  }
})();
