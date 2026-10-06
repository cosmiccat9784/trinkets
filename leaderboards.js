/* Trinkets Arcade — leaderboards (v2).
 * Trial games post to a shared online board (Google Sheets via the same
 * Apps Script URL as the feedback inbox — see feedback-server.gs).
 * Non-trial games keep local-only Top-10 boards in localStorage.
 * Every game already reports via global recordScore() in script.js,
 * so we wrap that one function. No backend needed on the static host.
 */
(function () {
  "use strict";

  var LB_KEY = "trinkets-leaderboards-v1";
  var NAME_KEY = "trinkets-player-name";
  var PENDING_KEY = "trinkets-pending-scores";
  var OLD_KEY = "trinkets-highscores";
  var MAX_ENTRIES = 10;
  var MAX_PENDING = 20;

  // Online trial set: high-traffic arcade games. All are high-wins, which
  // keeps server sorting simple (biggest first). Add low-wins games later
  // with matching ascending sort in feedback-server.gs doGet.
  var ONLINE_GAMES = ["comet", "bash", "thousand", "flappy", "tinyblocks"];

  function isOnline(game) {
    return ONLINE_GAMES.indexOf(game) !== -1;
  }

  // Same Web-app URL as the anonymous feedback inbox (script.js).
  function sheetURL() {
    try {
      if (typeof FEEDBACK_SHEET_URL === "string" && FEEDBACK_SHEET_URL) return FEEDBACK_SHEET_URL;
    } catch (err) {}
    return "";
  }

  // Online board cache: game -> { rows, at } | { error, at }. Refetch when stale.
  var onlineCache = {};
  var onlinePending = {};
  var ONLINE_TTL = 60 * 1000;
  var lastSubmitAt = {};

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

  /* ── Online boards (Google Sheets trial) ── */

  function postScore(game, name, value) {
    var url = sheetURL();
    if (!url) return;
    try {
      fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          action: "score",
          game: game,
          name: name,
          score: value,
          page: location.href
        })
      });
    } catch (err) {}
  }

  function pendingScores() {
    try {
      var parsed = JSON.parse(localStorage.getItem(PENDING_KEY));
      if (Array.isArray(parsed)) return parsed;
    } catch (err) {}
    return [];
  }

  function queuePending(game, value) {
    var pend = pendingScores().filter(function (q) {
      return q && isOnline(q.g) && typeof q.s === "number" && q.s > 0;
    });
    pend.push({ g: game, s: value, d: Date.now() });
    while (pend.length > MAX_PENDING) pend.shift();
    try {
      localStorage.setItem(PENDING_KEY, JSON.stringify(pend));
    } catch (err) {}
  }

  function flushPending() {
    var name = getName();
    var pend = pendingScores();
    if (!name || !pend.length) return;
    try {
      localStorage.removeItem(PENDING_KEY);
    } catch (err) {}
    pend.forEach(function (q) {
      if (!q || !isOnline(q.g) || !(q.s > 0)) return;
      lastSubmitAt[q.g] = Date.now();
      postScore(q.g, name, q.s);
    });
    ONLINE_GAMES.forEach(function (g) {
      delete onlineCache[g];
      fetchOnline(g, true);
    });
  }

  function submitOnline(game, value) {
    var url = sheetURL();
    if (!url || !isOnline(game)) return;
    var name = getName();
    if (!name) {
      // Name is required to post: queue it, flush when one is set.
      queuePending(game, value);
      scheduleRefresh();
      return;
    }
    // Cheap spam throttle: one submit per game per 5s (2048 renders often).
    var now = Date.now();
    if (lastSubmitAt[game] && now - lastSubmitAt[game] < 5000) return;
    lastSubmitAt[game] = now;
    postScore(game, name, value);
    // Fire-and-forget (no-cors is opaque): invalidate cache and refetch so
    // the new row appears once Sheets has it.
    delete onlineCache[game];
    setTimeout(function () { fetchOnline(game); }, 2500);
  }

  function fetchOnline(game, force) {
    if (!isOnline(game)) return;
    var now = Date.now();
    var cached = onlineCache[game];
    if (!force && cached && cached.rows && now - cached.at < ONLINE_TTL) return;
    if (!force && cached && cached.error && now - cached.at < 15000) return;
    if (onlinePending[game]) return;
    var url = sheetURL();
    if (!url) {
      onlineCache[game] = { error: "nourl", at: now };
      scheduleRefresh();
      return;
    }
    onlinePending[game] = true;
    scheduleRefresh();
    fetch(url + "?action=scores&game=" + encodeURIComponent(game))
      .then(function (resp) { return resp.json(); })
      .then(function (data) {
        var rows = (data && Array.isArray(data.scores) ? data.scores : [])
          .filter(function (e) { return e && typeof e.s === "number" && e.s > 0; })
          .slice(0, MAX_ENTRIES)
          .map(function (e) {
            return { n: String(e.n || "You").slice(0, 12), s: e.s, d: Number(e.d) || 0 };
          });
        onlineCache[game] = { rows: rows, at: Date.now() };
        onlinePending[game] = false;
        renderAll();
      })
      .catch(function () {
        onlineCache[game] = { error: "fetch", at: Date.now() };
        onlinePending[game] = false;
        renderAll();
      });
  }

  function onlineTop(game) {
    var c = onlineCache[game];
    return c && c.rows ? c.rows : null;
  }

  /* ── Anonymous arcade stats (one beacon per page view / game opened) ── */
  var VISITOR_KEY = "trinkets-visitor-id";
  var STATS_TTL = 5 * 60 * 1000;
  var statsCache = null;
  var statsPending = false;

  function visitorId() {
    try {
      var v = localStorage.getItem(VISITOR_KEY);
      if (!v) {
        v = "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
        localStorage.setItem(VISITOR_KEY, v);
      }
      return v;
    } catch (err) {
      return "";
    }
  }

  // Coarse buckets only — no raw user-agent strings ever leave the device.
  function clientInfo() {
    var ua = "";
    try {
      ua = navigator.userAgent || "";
    } catch (err) {}
    var device = "Desktop";
    if (/iPad|Tablet/i.test(ua)) device = "Tablet";
    else if (/Android|iPhone|iPod|Mobile/i.test(ua)) device = "Mobile";
    var browser = "Other";
    if (/Edg\//.test(ua)) browser = "Edge";
    else if (/OPR\//.test(ua)) browser = "Opera";
    else if (/Chrome\//.test(ua)) browser = "Chrome";
    else if (/Firefox\//.test(ua)) browser = "Firefox";
    else if (/Safari\//.test(ua)) browser = "Safari";
    return { device: device, browser: browser };
  }

  function isEmbedView() {
    try {
      return !!(document.body && document.body.classList.contains("embed"));
    } catch (err) {
      return false;
    }
  }

  function logVisit(game) {
    var url = sheetURL();
    if (!url || isEmbedView()) return;
    var id = String(game || "_shelf").toLowerCase().slice(0, 32);
    var info = clientInfo();
    try {
      fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          action: "visit",
          game: id,
          visitor: visitorId(),
          device: info.device,
          browser: info.browser,
          page: location.href
        })
      });
    } catch (err) {}
  }

  function wrapShowGame() {
    if (typeof window.showGame !== "function" || window.showGame.__lbStats) return;
    try {
      var orig = window.showGame;
      var wrapped = function (id) {
        var r = orig(id);
        try {
          if (r !== false && id) logVisit(id);
        } catch (err) {}
        return r;
      };
      wrapped.__lbStats = true;
      window.showGame = wrapped;
      try {
        showGame = wrapped;
      } catch (err2) {}
    } catch (err3) {}
  }

  function fetchStats(force) {
    var now = Date.now();
    if (!force && statsCache && now - statsCache.at < STATS_TTL) return;
    if (statsPending) return;
    var url = sheetURL();
    if (!url) return;
    statsPending = true;
    fetch(url + "?action=stats")
      .then(function (resp) { return resp.json(); })
      .then(function (data) {
        statsCache = { data: data && data.stats ? data.stats : null, at: Date.now() };
        statsPending = false;
        renderAll();
      })
      .catch(function () {
        statsCache = null;
        statsPending = false;
        renderAll();
      });
  }

  // "_shelf" page views count toward totals, never toward most-played.
  function gameTitle(id) {
    if (id === "_shelf") return "Front page";
    if (GAME_META[id]) return GAME_META[id].title;
    try {
      var card = document.querySelector('.game-card[data-game="' + id + '"] h3');
      if (card && card.textContent) return card.textContent.trim();
    } catch (err) {}
    return String(id || "?").replace(/_/g, " ");
  }

  function topEntry(counts) {
    var key = "";
    var n = 0;
    Object.keys(counts || {}).forEach(function (k) {
      if (counts[k] > n) {
        n = counts[k];
        key = k;
      }
    });
    return { key: key, n: n };
  }

  function renderStats() {
    var box = document.querySelector("#lbStats");
    if (!box) return;
    if (!sheetURL()) {
      box.innerHTML = "";
      return;
    }
    fetchStats();
    if (!statsCache || !statsCache.data) {
      box.innerHTML = "";
      var loading = document.createElement("p");
      loading.className = "lb-stats-line";
      loading.textContent = statsPending
        ? "📊 Loading arcade stats…"
        : "📊 Arcade stats need a connection — check back online.";
      box.append(loading);
      return;
    }
    var s = statsCache.data;
    var total = Number(s.visits) || 0;
    var visitors = Number(s.visitors) || 0;
    var plays = {};
    Object.keys(s.games || {}).forEach(function (g) {
      if (g.charAt(0) !== "_") plays[g] = s.games[g];
    });
    var champ = topEntry(plays);
    var dev = topEntry(s.devices);
    var bro = topEntry(s.browsers);
    function pct(n) {
      return total > 0 ? Math.round((n / total) * 100) + "%" : "—";
    }
    box.innerHTML = "";
    function line(icon, label, value) {
      var p = document.createElement("p");
      p.className = "lb-stats-line";
      var b = document.createElement("strong");
      b.textContent = icon + " " + label + " ";
      var span = document.createElement("span");
      span.textContent = value;
      p.append(b);
      p.append(span);
      box.append(p);
    }
    line("🎮", "Most played:", champ.key ? gameTitle(champ.key) + " · " + champ.n + " plays" : "no plays yet");
    line("👥", "Visitors (approx):", total ? String(visitors) + " across " + total + " visits" : "—");
    line("📱", "Top device:", dev.key ? dev.key + " · " + pct(dev.n) : "—");
    line("🌐", "Top browser:", bro.key ? bro.key + " · " + pct(bro.n) : "—");
    var foot = document.createElement("p");
    foot.className = "lb-stats-foot";
    foot.textContent = "Anonymous, coarse stats only." + (s.since ? " Counting since " + fmtDate(s.since) + "." : "");
    box.append(foot);
  }

  /* ── Leaderboard popup ── */
  var lbOpener = null;

  function isLbOpen() {
    var pop = document.querySelector("#leaderboards");
    return !!(pop && !pop.hidden);
  }

  function openLbPopup(opener) {
    var pop = document.querySelector("#leaderboards");
    if (!pop) return;
    lbOpener = opener || null;
    pop.hidden = false;
    document.body.classList.add("modal-open");
    renderAll();
    var close = document.querySelector("#lbClose");
    if (close) close.focus();
  }

  function closeLbPopup() {
    var pop = document.querySelector("#leaderboards");
    if (!pop || pop.hidden) return;
    pop.hidden = true;
    if (!document.querySelector("#gameModal.open")) {
      document.body.classList.remove("modal-open");
    }
    if (lbOpener && lbOpener.focus) {
      try { lbOpener.focus(); } catch (err) {}
    }
    lbOpener = null;
  }

  // Expose a tiny API for debugging / future games.
  window.TrinketsBoards = {
    meta: GAME_META,
    onlineGames: ONLINE_GAMES,
    isOnline: isOnline,
    fetchOnline: fetchOnline,
    open: openLbPopup,
    close: closeLbPopup,
    flushPending: flushPending,
    fetchStats: fetchStats,
    logVisit: logVisit,
    pendingCount: function () { return pendingScores().length; },
    getBoard: getBoard,
    getBest: getBest,
    addScore: addScore,
    formatScore: formatScore,
    getName: getName,
    setName: setName,
    clear: clearBoards,
    totalRuns: totalRuns
  };

  /* ── Wrap the existing global scorer so every game feeds the boards ── */
  function wrapScorers() {
    if (typeof window.recordScore === "function" && !window.recordScore.__lbWrapped) {
      var orig = window.recordScore;
      var wrapped = function (game, value, mode) {
        var result = orig(game, value, mode);
        try {
          if (GAME_META[game] && typeof value === "number" && value > 0) {
            // 2048 calls recordScore on every render: only log improvements.
            if (game === "thousand" && !result.isNew) return result;
            if (isOnline(game)) {
              // Online-only display for trial games: submit globally,
              // skip the local board (legacy stats band still updates above).
              submitOnline(game, value);
            } else {
              var added = addScore(game, value);
              if (added.rank >= 0) {
                result.lbRank = added.rank;
                result.lbBest = added.best;
              }
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
      btn.innerHTML = "";
      var t = document.createElement("span");
      t.className = "lb-tab-title";
      t.textContent = (isOnline(game) ? "🌍 " : "") + meta.title;
      var b = document.createElement("span");
      b.className = "lb-tab-best";
      if (isOnline(game)) {
        var top = onlineTop(game);
        b.textContent = top && top.length
          ? "global best " + formatScore(game, top[0].s)
          : (onlinePending[game] ? "loading global board…" : "global board");
        fetchOnline(game);
      } else {
        var best = getBest(game);
        b.textContent = best === null ? "no score yet" : "best " + formatScore(game, best);
      }
      btn.append(t);
      btn.append(b);
      btn.addEventListener("click", function () {
        selectedGame = game;
        if (isOnline(game)) fetchOnline(game, true);
        renderAll();
      });
      wrap.append(btn);
    });
  }

  function renderRows(list, game) {
    var out = [];
    list.forEach(function (entry, i) {
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
      s.textContent = formatScore(game, entry.s);
      var d = document.createElement("span");
      d.className = "lb-date";
      d.textContent = entry.d ? fmtDate(entry.d) : "";
      li.append(m);
      li.append(n);
      li.append(s);
      li.append(d);
      out.push(li);
    });
    return out;
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
    list.innerHTML = "";
    if (isOnline(selectedGame)) {
      title.textContent = "🌍 " + meta.title + " — Global Top " + MAX_ENTRIES;
      if (metaEl) metaEl.textContent = "Most " + meta.unit + " wins · across all players";
      fetchOnline(selectedGame);
      var cached = onlineCache[selectedGame];
      var rows = onlineTop(selectedGame);
      if (rows && rows.length) {
        renderRows(rows, selectedGame).forEach(function (li) { list.append(li); });
        if (empty) empty.textContent = "";
      } else if (cached && cached.error) {
        if (empty) {
          empty.textContent = cached.error === "nourl"
            ? "Online board isn't wired up yet — the sheet URL is missing."
            : "Couldn't reach the global board. Check your connection, then re-pick this game to retry.";
        }
      } else {
        if (empty) empty.textContent = "Loading global scores…";
      }
      return;
    }
    var board = getBoard(selectedGame);
    title.textContent = meta.title + " — Top " + MAX_ENTRIES;
    var direction = meta.mode === "low" ? "Fewest " + meta.unit + " wins" : "Most " + meta.unit + " wins";
    if (metaEl) metaEl.textContent = direction + " · on this device";
    renderRows(board, selectedGame).forEach(function (li) { list.append(li); });
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
    // Local champs plus online trial games with a loaded global top.
    var ranked = Object.keys(GAME_META).filter(function (g) {
      if (isOnline(g)) return !!(onlineTop(g) && onlineTop(g).length);
      return boards[g] && boards[g].length;
    });
    ONLINE_GAMES.forEach(function (g) { fetchOnline(g); });
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
      var da = isOnline(a)
        ? ((onlineTop(a) || [])[0] || {}).d || 0
        : (boards[a][0] || {}).d || 0;
      var db = isOnline(b)
        ? ((onlineTop(b) || [])[0] || {}).d || 0
        : (boards[b][0] || {}).d || 0;
      return db - da;
    });
    ranked.slice(0, 12).forEach(function (game) {
      var meta = GAME_META[game];
      var top = isOnline(game) ? onlineTop(game)[0] : boards[game][0];
      if (!top) return;
      var card = document.createElement("button");
      card.type = "button";
      card.className = "lb-hall-card";
      var e = document.createElement("span");
      e.className = "lb-hall-eyebrow";
      e.textContent = (isOnline(game) ? "🌍 " : "👑 ") + meta.title;
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
      var badge = card.querySelector(".best-badge");
      if (isOnline(lbId)) {
        // Online-only display: global #1 once loaded, else no badge yet.
        var top = onlineTop(lbId);
        if (!top || !top.length) {
          if (badge) badge.hidden = true;
          fetchOnline(lbId);
          return;
        }
        if (!badge) {
          badge = document.createElement("p");
          badge.className = "best-badge";
          var acts = card.querySelector(".card-actions");
          if (acts) acts.before(badge);
          else card.append(badge);
        }
        badge.hidden = false;
        badge.textContent = "🌍 Global best: " + (top[0].n || "You") + " · " + formatScore(lbId, top[0].s);
        return;
      }
      var best = getBest(lbId);
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
    renderStats();
    updateNameHint();
  }

  function updateNameHint() {
    var hint = document.querySelector("#lbNameHint");
    if (!hint) return;
    var pend = pendingScores().length;
    var hasName = !!getName();
    if (!hasName && pend > 0) {
      hint.hidden = false;
      hint.textContent = pend + " global score" + (pend === 1 ? "" : "s") +
        " waiting — set your name to post " + (pend === 1 ? "it" : "them") + ".";
    } else if (!hasName) {
      hint.hidden = false;
      hint.textContent = "Set your name — it's required to post 🌍 global scores.";
    } else if (pend > 0) {
      hint.hidden = false;
      hint.textContent = "Posting " + pend + " waiting score" + (pend === 1 ? "" : "s") + "…";
    } else {
      hint.hidden = true;
      hint.textContent = "";
    }
  }

  function initUI() {
    var section = document.querySelector("#leaderboards");
    // Beta-gated: beta.js strips [data-beta] for normal visitors, so when
    // the popup is gone we stay invisible (no badges, no buttons either)
    // but keep recording scores underneath.
    if (!section) {
      return;
    }
    var closeBtn = document.querySelector("#lbClose");
    if (closeBtn) {
      closeBtn.addEventListener("click", function () { closeLbPopup(); });
    }
    section.addEventListener("click", function (e) {
      if (e.target === section) closeLbPopup();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isLbOpen() && !document.querySelector("#gameModal.open")) {
        closeLbPopup();
      }
    });
    var heroBtn = document.querySelector("#lbOpenHero");
    if (heroBtn) {
      heroBtn.addEventListener("click", function () { openLbPopup(heroBtn); });
    }
    document.querySelectorAll('a[href="#leaderboards"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        openLbPopup(a);
      });
    });
    var nameInput = document.querySelector("#lbName");
    if (nameInput) {
      nameInput.value = getName();
      nameInput.addEventListener("change", function () {
        var v = nameInput.value.trim().slice(0, 12);
        if (!v) {
          // Name is required: refuse empties, keep the stored one.
          nameInput.value = getName();
          updateNameHint();
          return;
        }
        setName(v);
        nameInput.value = v;
        flushPending();
        renderAll();
      });
    }
    var clearBtn = document.querySelector("#lbClear");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        if (!confirm("Clear local leaderboard scores on this device? (Global scores stay.)")) return;
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
    flushPending();
    window.addEventListener("storage", function (e) {
      if (e.key === NAME_KEY) flushPending();
      if (e.key === LB_KEY || e.key === OLD_KEY || e.key === NAME_KEY) renderAll();
    });
  }

  // Modal shortcut: a 🏆 button that closes the game and jumps to the boards.
  // Beta-gated with the shelf section.
  function initModalButton() {
    if (!document.querySelector("#leaderboards")) return;
    var header = document.querySelector(".modal-buttons");
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
      setTimeout(function () { openLbPopup(btn); }, 60);
    });
    header.insertBefore(btn, header.firstChild);
  }

  migrateOldScores();
  wrapScorers();
  // Visit tracking runs for everyone (not just beta): one beacon per load.
  wrapShowGame();
  logVisit("_shelf");

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      wrapScorers();
      wrapShowGame();
      initUI();
      initModalButton();
    });
  } else {
    wrapShowGame();
    initUI();
    initModalButton();
  }
})();
