/* Penguin Park Tycoon — RollerCoaster Tycoon + penguins + tiny-game simplicity.
   Visitors arrive, pay you, you buy penguins & park toys, park physically grows.
   Signature: isometric park + cute bubble transitions + short chaotic events. */

var TYCOON_KEY = "trinkets-tycoon-v1";

var TYCOON_TYPES = [
  { id: "normal",  name: "Normal Penguin",  emoji: "🐧", cost: 50,    income: 2,   scale: 1.0,  body: "#22303f", belly: "#fff8ea", desc: "+$2/sec · reliable" },
  { id: "baby",    name: "Baby Penguin",    emoji: "🐤", cost: 150,   income: 5,   scale: 0.68, body: "#2b3a52", belly: "#fff3d6", desc: "+$5/sec · tiny & loud" },
  { id: "emperor", name: "Emperor Penguin", emoji: "👑", cost: 500,   income: 15,  scale: 1.22, body: "#1f314f", belly: "#fff0a0", desc: "+$15/sec · royal glide" },
  { id: "golden",  name: "Golden Penguin",  emoji: "✨", cost: 2500,  income: 75,  scale: 1.12, body: "#e8a100", belly: "#fff3bf", desc: "+$75/sec · extremely shiny" },
  { id: "mystery", name: "??? Penguin",     emoji: "🌀", cost: 10000, income: 300, scale: 1.1,  body: "#6a4cff", belly: "#e5dbff", desc: "+$300/sec · do not ask" }
];

var TYCOON_BUILD = [
  { id: "enclosure", name: "Bigger Enclosure", emoji: "🏔️", base: 80,   scale: 1.7, max: 5, cap: 6,  bonus: 0.05, desc: "+6 visitors · park physically grows" },
  { id: "snow",      name: "Snow Machine",     emoji: "❄️", cost: 150,  cap: 2,  bonus: 0.25, desc: "+25% income · happy flakes" },
  { id: "pool",      name: "Swimming Pool",    emoji: "🏊", cost: 250,  cap: 8,  bonus: 0.15, desc: "penguins swim in circles" },
  { id: "slide",     name: "Penguin Slide",    emoji: "🛝", cost: 300,  cap: 10, bonus: 0.20, desc: "wheee +20% income" },
  { id: "cave",      name: "Ice Cave",         emoji: "🧊", cost: 450,  cap: 12, bonus: 0.25, desc: "mysterious & cold" },
  { id: "climb",     name: "Climbing Area",    emoji: "🧗", cost: 700,  cap: 15, bonus: 0.30, desc: "tiny harnesses included" },
  { id: "iceberg",   name: "Giant Iceberg",    emoji: "🏔️", cost: 1200, cap: 20, bonus: 0.50, desc: "the centrepiece · +50%" }
];

var TYCOON_UPGRADES = [
  { id: "bench",   name: "Benches",           emoji: "🪑", cost: 40,  cap: 3,  bonus: 0.02, desc: "sit & stare at penguins" },
  { id: "toilets", name: "Toilets 💀",        emoji: "🚻", cost: 90,  cap: 4,  bonus: 0.05, desc: "nobody asks why it helps" },
  { id: "food",    name: "Food Stand",        emoji: "🍿", cost: 120, cap: 6,  bonus: 0.10, desc: "ice cream sells itself" },
  { id: "gift",    name: "Gift Shop",         emoji: "🎁", cost: 300, cap: 8,  bonus: 0.15, desc: "plushies?? plushies." },
  { id: "info",    name: "Information Centre",emoji: "ℹ️", cost: 350, cap: 6,  bonus: 0.12, desc: "penguin facts, loudly" },
  { id: "plush",   name: "Penguin Plushies",  emoji: "🧸", cost: 450, cap: 10, bonus: 0.18, desc: "take the park home" }
];

var TYCOON_LEVELS = [
  { at: 0,    name: "Tiny Ice" },
  { at: 150,  name: "Penguin Park" },
  { at: 400,  name: "Penguin Village" },
  { at: 800,  name: "Penguin Resort" },
  { at: 1500, name: "Penguin Kingdom" },
  { at: 3000, name: "Penguin World" },
  { at: 6000, name: "THE PENGUIN EMPIRE" }
];

var TYCOON_QUIPS = [
  "Visitors arrive → look at penguins → pay you → repeat.",
  "Do you buy 3 normals, or save for the Emperor?",
  "The toilets were, somehow, a great investment.",
  "A visitor tried to pay in fish. Accepted.",
  "Penguins unionized. Demands: more slide.",
  "Someone cried seeing the baby penguin. Same.",
  "The ??? penguin blinked. The park shivered."
];

function tycoonLoad() {
  var d = null;
  try { d = JSON.parse(localStorage.getItem(TYCOON_KEY)); } catch (e) {}
  if (d && typeof d === "object") {
    if (typeof d.coins !== "number") d.coins = 75;
    if (!d.counts) d.counts = { normal: 1 };
    if (!d.build) d.build = {};
    if (!d.up) d.up = {};
    if (typeof d.enclosure !== "number") d.enclosure = 0;
    if (typeof d.spent !== "number") d.spent = 0;
    if (typeof d.earned !== "number") d.earned = 0;
    if (typeof d.best !== "number") d.best = 0;
    if (!d.counts.normal && totalTycoonPenguins(d) === 0) d.counts.normal = 1;
    return d;
  }
  return { coins: 75, counts: { normal: 1 }, build: {}, up: {}, enclosure: 0, spent: 0, earned: 0, best: 0 };
}
function tycoonSave(d) { try { localStorage.setItem(TYCOON_KEY, JSON.stringify(d)); } catch (e) {} }
function tycoonType(id) {
  for (var i = 0; i < TYCOON_TYPES.length; i++) if (TYCOON_TYPES[i].id === id) return TYCOON_TYPES[i];
  return TYCOON_TYPES[0];
}
function totalTycoonPenguins(d) {
  var n = 0;
  for (var k in d.counts) if (d.counts[k]) n += d.counts[k];
  return n;
}
function tycoonBaseIncome(d) {
  var s = 0;
  for (var k in d.counts) s += (d.counts[k] || 0) * tycoonType(k).income;
  return s;
}
function tycoonMult(d) {
  var m = 1;
  var i, b;
  for (i = 0; i < TYCOON_BUILD.length; i++) {
    b = TYCOON_BUILD[i];
    if (b.id === "enclosure") { m += (d.enclosure || 0) * b.bonus; continue; }
    if (d.build[b.id]) m += b.bonus;
  }
  for (i = 0; i < TYCOON_UPGRADES.length; i++) { if (d.up[TYCOON_UPGRADES[i].id]) m += TYCOON_UPGRADES[i].bonus; }
  return m;
}
function tycoonCap(d) {
  var c = 8 + totalTycoonPenguins(d) * 2;
  var i, b;
  for (i = 0; i < TYCOON_BUILD.length; i++) {
    b = TYCOON_BUILD[i];
    if (b.id === "enclosure") { c += (d.enclosure || 0) * b.cap; continue; }
    if (d.build[b.id]) c += b.cap;
  }
  for (i = 0; i < TYCOON_UPGRADES.length; i++) { if (d.up[TYCOON_UPGRADES[i].id]) c += TYCOON_UPGRADES[i].cap; }
  return Math.min(60, c);
}
function tycoonLevel(d) {
  var lvl = 0;
  for (var i = 0; i < TYCOON_LEVELS.length; i++) if (d.spent >= TYCOON_LEVELS[i].at) lvl = i;
  return lvl;
}
function tycoonBuildCost(b, d) {
  if (b.id === "enclosure") return Math.round(b.base * Math.pow(b.scale, d.enclosure || 0));
  return b.cost;
}

function startPenguinTycoon() {
  openGame(
    "Penguin Park Tycoon",
    "Tycoon",
    '<div class="game-layout pty-layout">' +
      '<div class="pty-hud">' +
        '<span class="pty-pill" id="ptyCoins">🪙 $75</span>' +
        '<span class="pty-pill" id="ptyVis">👥 0 Visitors</span>' +
        '<span class="pty-pill pty-level" id="ptyLvl">⭐ Park Level 1' +
          '<span class="pty-bar"><span class="pty-fill" id="ptyFill"></span></span>' +
        '</span>' +
      '</div>' +
      '<p class="game-message" id="ptyMsg">One penguin. One dream. Visitors pay you. Buy more penguins.</p>' +
      '<div class="pty-stage" id="ptyStage">' +
        '<canvas class="pty-canvas" id="ptyCanvas" width="720" height="440"></canvas>' +
        '<div class="pty-fx" id="ptyFx" hidden></div>' +
        '<div class="pty-sheet" id="ptySheet" hidden>' +
          '<div class="pty-sheet-head"><strong id="ptySheetTitle">Build</strong><button class="game-action pty-x" id="ptyClose" type="button">Close</button></div>' +
          '<div class="pty-coins">🪙 <strong id="ptySheetCoins">0</strong><span id="ptySheetSub"></span></div>' +
          '<div class="pty-items" id="ptyItems"></div>' +
        '</div>' +
        '<div class="pty-bubbles" id="ptyBubbles" hidden><div class="pty-card" id="ptyCard"></div></div>' +
      '</div>' +
      '<div class="pty-actions">' +
        '<button class="pty-btn build" id="ptyBuildBtn" type="button"><span aria-hidden="true">➕</span> BUILD</button>' +
        '<button class="pty-btn peng" id="ptyPengBtn" type="button"><span aria-hidden="true">🐧</span> PENGUINS</button>' +
        '<button class="pty-btn up" id="ptyUpBtn" type="button"><span aria-hidden="true">⬆️</span> UPGRADES<span class="pty-dot" id="ptyDot" hidden></span></button>' +
      '</div>' +
      '<div class="game-actions pty-sub">' +
        '<button class="game-action" id="ptyMute" type="button">🔊 Sound on</button>' +
        '<button class="game-action" id="ptyReset" type="button">Reset park</button>' +
      '</div>' +
    '</div>'
  );

  var canvas = document.querySelector("#ptyCanvas");
  var ctx = canvas.getContext("2d");
  var W = canvas.width, H = canvas.height;
  var coinsEl = document.querySelector("#ptyCoins");
  var visEl = document.querySelector("#ptyVis");
  var lvlEl = document.querySelector("#ptyLvl");
  var fillEl = document.querySelector("#ptyFill");
  var msgEl = document.querySelector("#ptyMsg");
  var stage = document.querySelector("#ptyStage");
  var sheet = document.querySelector("#ptySheet");
  var itemsEl = document.querySelector("#ptyItems");
  var sheetTitle = document.querySelector("#ptySheetTitle");
  var sheetCoins = document.querySelector("#ptySheetCoins");
  var sheetSub = document.querySelector("#ptySheetSub");
  var bubbles = document.querySelector("#ptyBubbles");
  var card = document.querySelector("#ptyCard");
  var fxEl = document.querySelector("#ptyFx");
  var dotEl = document.querySelector("#ptyDot");

  var data = tycoonLoad();
  var penguins = [];
  var visitors = [];
  var popups = [];
  var flakes = [];
  var coinFrac = 0;
  var popupTimer = 0;
  var quipTimer = 14;
  var time = 0;
  var soundOn = true;
  var sheetTab = null;
  var eventTimer = 45;
  var fx = null; // {kind,label,mult,t,dur}
  var escaped = null; // {x,y,vx,vy,t}
  var claimed = 0;
  var raf = 0;
  var last = performance.now();
  var rafActive = true;

  function blip(freq, dur, type) {
    if (!soundOn) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!blip.ctx) blip.ctx = new AC();
      var c = blip.ctx;
      if (c.state === "suspended") c.resume();
      var o = c.createOscillator(), g = c.createGain();
      o.type = type || "sine";
      o.frequency.value = freq || 660;
      g.gain.setValueAtTime(0.08, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + (dur || 0.12));
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + (dur || 0.12));
    } catch (e) {}
  }

  function parkHW() { return 215 + (data.enclosure || 0) * 22; }
  function parkCX() { return W / 2; }
  function parkCY() { return H * 0.44; }
  // Fenced penguin enclosure = inset diamond. Back edges (W-N, N-E) draw
  // behind entities, front edges (E-S, S-W) draw in front for real iso depth.
  function fenceK() { return 0.62; }
  function fencePts() {
    var cx = parkCX(), cy = parkCY(), hw = parkHW(), hh = hw * 0.5, k = fenceK();
    return { N: { x: cx, y: cy - hh * k }, E: { x: cx + hw * k, y: cy }, S: { x: cx, y: cy + hh * k }, W: { x: cx - hw * k, y: cy } };
  }
  function poolPos() {
    if (!data.build.pool) return null;
    var cx = parkCX(), cy = parkCY(), hw = parkHW(), hh = hw * 0.5;
    return { x: cx + hw * 0.22, y: cy - hh * 0.30, rx: 56, ry: 27 };
  }
  // Visitor waypoints: fence viewpoints + fronts of owned stalls.
  function tycoonSpots() {
    var F = fencePts();
    var spots = [];
    [[F.E, F.S, 1], [F.S, F.W, -1]].forEach(function (pair) {
      var a = pair[0], b = pair[1], s = pair[2];
      [0.25, 0.5, 0.75].forEach(function (t) {
        spots.push({ x: a.x + (b.x - a.x) * t + s * 14, y: a.y + (b.y - a.y) * t + 26 });
      });
    });
    var cx = parkCX(), cy = parkCY(), hw = parkHW(), hh = hw * 0.5;
    if (data.up.food) spots.push({ x: cx - hw * 0.55, y: cy + hh + 70 });
    if (data.up.gift) spots.push({ x: cx + hw * 0.55, y: cy + hh + 70 });
    if (data.up.plush) spots.push({ x: cx - hw * 0.19, y: cy + hh + 82 });
    if (data.up.toilets) spots.push({ x: cx + hw * 0.19, y: cy + hh + 82 });
    return spots;
  }

  function spawnPenguinVisual(typeId) {
    var hw = parkHW();
    return {
      type: typeId,
      px: (Math.random() * 2 - 1) * hw * 0.26,
      py: (Math.random() * 2 - 1) * hw * 0.12,
      vx: (Math.random() - 0.5) * 40,
      vy: (Math.random() - 0.5) * 18,
      wob: Math.random() * 6.28,
      dir: Math.random() < 0.5 ? -1 : 1,
      pet: 0,
      swim: false,
      sa: Math.random() * 6.28
    };
  }
  function rebuildPenguins() {
    penguins = [];
    var keys = Object.keys(data.counts);
    for (var i = 0; i < keys.length; i++) {
      var n = Math.min(data.counts[keys[i]] || 0, 8);
      for (var j = 0; j < n; j++) penguins.push(spawnPenguinVisual(keys[i]));
    }
    if (penguins.length === 0) penguins.push(spawnPenguinVisual("normal"));
    assignSwimmers();
  }
  function assignSwimmers() {
    // first two penguins become pool swimmers when the pool exists
    for (var si = 0; si < penguins.length; si++) penguins[si].swim = false;
    if (data.build.pool) {
      var n = Math.min(2, penguins.length);
      for (var sj = 0; sj < n; sj++) { penguins[sj].swim = true; penguins[sj].sa = sj * 3.1; }
    }
  }
  rebuildPenguins();

  var COATS = ["#ff6b6b", "#4f8fcf", "#43c6ac", "#f6c445", "#6a4c93", "#e8913a", "#74c0fc"];
  var HATS = ["#c0392b", "#2c3e50", "#f6c445", "#43c6ac", "#fff", "#6a4c93"];
  function spawnVisitor() {
    // Visitors enter via the front path, tour viewpoints/stalls, then leave.
    var spots = tycoonSpots();
    var pick = spots[Math.floor(Math.random() * spots.length)];
    return {
      x: parkCX() - 14 + (Math.random() * 36 - 18),
      y: H + 20,
      tx: pick.x, ty: pick.y,
      state: "walk",
      sp: 40 + Math.random() * 34,
      coat: COATS[Math.floor(Math.random() * COATS.length)],
      hat: HATS[Math.floor(Math.random() * HATS.length)],
      bob: Math.random() * 6.28,
      look: 2 + Math.random() * 3,
      paid: 0
    };
  }

  var snowDots = [];
  for (var sdi = 0; sdi < 54; sdi++) {
    var srr = Math.random(), saa = Math.random() * 6.283;
    var srad = Math.sqrt(srr) * 0.92;
    snowDots.push({ fx: Math.cos(saa) * srad, fy: Math.sin(saa) * srad * 0.9, r: 1 + Math.random() * 1.8 });
  }

  for (var fi = 0; fi < 70; fi++) flakes.push({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 2.2, sp: 12 + Math.random() * 30, ph: Math.random() * 6.28 });

  function incomePerSec() {
    var m = tycoonMult(data);
    var e = fx ? fx.mult : 1;
    return tycoonBaseIncome(data) * m * e;
  }
  function levelProgress() {
    var lvl = tycoonLevel(data);
    if (lvl >= TYCOON_LEVELS.length - 1) return 1;
    var a = TYCOON_LEVELS[lvl].at, b = TYCOON_LEVELS[lvl + 1].at;
    return Math.max(0, Math.min(1, (data.spent - a) / (b - a)));
  }

  function refreshHUD() {
    coinsEl.textContent = "🪙 $" + Math.floor(data.coins);
    visEl.textContent = "👥 " + visitors.length + " Visitors";
    var lvl = tycoonLevel(data);
    lvlEl.childNodes[0].textContent = "⭐ " + TYCOON_LEVELS[lvl].name + " " + (lvl + 1);
    fillEl.style.width = Math.round(levelProgress() * 100) + "%";
    sheetCoins.textContent = Math.floor(data.coins);
    // affordable dot on UPGRADES
    var afford = false;
    for (var i = 0; i < TYCOON_UPGRADES.length; i++) {
      if (!data.up[TYCOON_UPGRADES[i].id] && data.coins >= TYCOON_UPGRADES[i].cost) afford = true;
    }
    for (var j = 0; j < TYCOON_TYPES.length; j++) {
      var t = TYCOON_TYPES[j];
      var owned = data.counts[t.id] || 0;
      var cost = Math.round(t.cost * Math.pow(1.12, owned));
      if (data.coins >= cost) afford = true;
    }
    dotEl.hidden = !afford;
    if (fx && fx.t > 0) {
      fxEl.hidden = false;
      fxEl.textContent = fx.label + " " + Math.ceil(fx.t) + "s";
    } else { fxEl.hidden = true; }
    try {
      setSnapshot({ mode: escaped ? "event" : "playing", game: "Penguin Park Tycoon", coins: Math.floor(data.coins), visitors: visitors.length, level: lvl + 1, penguins: totalTycoonPenguins(data), income: Math.round(incomePerSec() * 10) / 10 });
    } catch (e) {}
  }

  function fmt(n) { return "$" + n; }

  function openSheet(tab) {
    sheetTab = (sheet.hidden || sheetTab !== tab) ? tab : null;
    if (!sheetTab) { sheet.hidden = true; return; }
    sheet.hidden = false;
    renderSheet();
    try { if (window.fitGameShell) window.fitGameShell(); } catch (e) {}
  }

  function renderSheet() {
    if (!sheetTab) return;
    itemsEl.innerHTML = "";
    if (sheetTab === "build") {
      sheetTitle.textContent = "Build — park stuff";
      sheetSub.textContent = " — park physically grows as you buy";
      TYCOON_BUILD.forEach(function (b) {
        var owned = b.id === "enclosure" ? (data.enclosure || 0) : (data.build[b.id] ? 1 : 0);
        var cost = tycoonBuildCost(b, data);
        var maxed = b.max && owned >= b.max;
        var row = document.createElement("div");
        row.className = "pty-item";
        row.innerHTML =
          '<div class="pty-emoji">' + b.emoji + "</div>" +
          '<div class="pty-info"><strong>' + b.name + (b.id === "enclosure" && owned ? " Lv." + owned : "") + "</strong>" +
          "<span>" + b.desc + "</span></div>";
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "pty-buy";
        btn.textContent = maxed ? "MAX" : fmt(cost);
        btn.disabled = maxed || data.coins < cost;
        btn.addEventListener("click", function () { buyBuild(b); });
        row.appendChild(btn);
        itemsEl.appendChild(row);
      });
    } else if (sheetTab === "peng") {
      sheetTitle.textContent = "Penguins";
      sheetSub.textContent = " — every penguin pays you every second";
      TYCOON_TYPES.forEach(function (t) {
        var owned = data.counts[t.id] || 0;
        var cost = Math.round(t.cost * Math.pow(1.12, owned));
        var row = document.createElement("div");
        row.className = "pty-item";
        row.innerHTML =
          '<div class="pty-emoji">' + t.emoji + "</div>" +
          '<div class="pty-info"><strong>' + t.name + " ×" + owned + "</strong>" +
          "<span>" + t.desc + "</span></div>";
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "pty-buy";
        btn.textContent = fmt(cost);
        btn.disabled = data.coins < cost;
        btn.addEventListener("click", function () { buyPenguin(t); });
        row.appendChild(btn);
        itemsEl.appendChild(row);
      });
    } else {
      sheetTitle.textContent = "Upgrades — visitor stuff";
      sheetSub.textContent = " — more visitors, more money";
      TYCOON_UPGRADES.forEach(function (u) {
        var owned = !!data.up[u.id];
        var row = document.createElement("div");
        row.className = "pty-item" + (owned ? " owned" : "");
        row.innerHTML =
          '<div class="pty-emoji">' + u.emoji + "</div>" +
          '<div class="pty-info"><strong>' + u.name + "</strong>" +
          "<span>" + u.desc + "</span></div>";
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "pty-buy";
        btn.textContent = owned ? "OWNED" : fmt(u.cost);
        btn.disabled = owned || data.coins < u.cost;
        btn.addEventListener("click", function () { buyUpgrade(u); });
        row.appendChild(btn);
        itemsEl.appendChild(row);
      });
    }
    refreshHUD();
  }

  function buyPenguin(t) {
    var owned = data.counts[t.id] || 0;
    var cost = Math.round(t.cost * Math.pow(1.12, owned));
    if (data.coins < cost) { msgEl.textContent = "Not enough coins for " + t.name + " yet. The penguins wait."; return; }
    data.coins -= cost;
    data.spent += cost;
    data.counts[t.id] = owned + 1;
    penguins.push(spawnPenguinVisual(t.id));
    if (penguins.length > 40) penguins.shift();
    assignSwimmers();
    popups.push({ x: parkCX(), y: parkCY() - 90, text: t.emoji + " new friend!", t: 0, dur: 1.4, col: "#1e4a7a" });
    msgEl.textContent = t.name + " joined the park! (" + totalTycoonPenguins(data) + " penguins, +$" + t.income + "/sec)";
    blip(520 + Math.random() * 200, 0.15, "triangle");
    checkEmpire();
    tycoonSave(data);
    renderSheet(); refreshHUD();
  }
  function buyBuild(b) {
    var cost = tycoonBuildCost(b, data);
    if (b.max && (data.enclosure || 0) >= b.max) return;
    if (b.id !== "enclosure" && data.build[b.id]) return;
    if (data.coins < cost) { msgEl.textContent = "Not enough coins for " + b.name + " yet."; return; }
    data.coins -= cost;
    data.spent += cost;
    if (b.id === "enclosure") data.enclosure = (data.enclosure || 0) + 1;
    else data.build[b.id] = true;
    assignSwimmers();
    popups.push({ x: parkCX(), y: parkCY() - 110, text: b.emoji + " " + b.name + "!", t: 0, dur: 1.6, col: "#1e7a4a" });
    msgEl.textContent = b.name + " built! The park physically grows. 🛠️";
    blip(300, 0.18, "square"); setTimeout(function () { blip(450, 0.15, "square"); }, 120);
    checkEmpire();
    tycoonSave(data);
    renderSheet(); refreshHUD();
  }
  function buyUpgrade(u) {
    if (data.up[u.id]) return;
    if (data.coins < u.cost) { msgEl.textContent = "Not enough coins for " + u.name + " yet."; return; }
    data.coins -= u.cost;
    data.spent += u.cost;
    data.up[u.id] = true;
    popups.push({ x: parkCX(), y: parkCY() - 80, text: u.emoji + " " + u.name + "!", t: 0, dur: 1.6, col: "#7a4a1e" });
    msgEl.textContent = u.id === "toilets" ? "Toilets built. Visitors are thrilled. Nobody knows why. 💀" : u.name + " opened! More visitors incoming.";
    blip(700, 0.12, "triangle");
    checkEmpire();
    tycoonSave(data);
    renderSheet(); refreshHUD();
  }

  function checkEmpire() {
    var lvl = tycoonLevel(data);
    if (lvl >= TYCOON_LEVELS.length - 1 && data.best < 7) {
      data.best = 7;
      showBubble({
        emoji: "🌎", title: "THE PENGUIN EMPIRE!",
        sub: "Tiny ice patch → global empire.",
        body: "You did it. The penguins rule everything now.",
        btn: "👑 RULE",
        fn: function () { msgEl.textContent = "🌎 THE PENGUIN EMPIRE pays tribute: +$500!"; data.coins += 500; }
      });
      try { recordScore("tycoon", Math.floor(data.earned), "high"); } catch (e) {}
    } else {
      var nl = tycoonLevel(data);
      if (nl > (checkEmpire.last || 0)) {
        checkEmpire.last = nl;
        popups.push({ x: parkCX(), y: 90, text: "⭐ " + TYCOON_LEVELS[nl].name + "!", t: 0, dur: 2, col: "#8a5f14" });
        blip(880, 0.25, "sine");
      }
    }
    checkEmpire.last = tycoonLevel(data);
  }
  checkEmpire.last = tycoonLevel(data);

  /* ——— bubble events ——— */
  var EVENTS = [
    { kind: "escape", emoji: "🐧", title: "PENGUIN ESCAPE!", sub: "OH NO!", body: "One of your penguins has escaped! Find it before the visitors notice!", btn: "🔍 FIND PENGUIN" },
    { kind: "snow", emoji: "❄️", title: "MEGA SNOWSTORM!", sub: "BRRR!", body: "The park is covered in snow! Penguins are 2× happier for 30s!", btn: "❄️ COZY!" },
    { kind: "viral", emoji: "📸", title: "VIRAL PENGUIN!", sub: "TRENDING!", body: "Someone posted your penguin online! Visitors ×3 for 30 seconds!", btn: "📸 FAME!" },
    { kind: "icecream", emoji: "🍦", title: "ICE CREAM FESTIVAL!", sub: "YUM!", body: "Everyone wants something cold! Income ×2 for 30s!", btn: "🍦 SERVE!" },
    { kind: "famous", emoji: "👑", title: "FAMOUS PENGUIN VISIT!", sub: "GASP!", body: "A celebrity penguin waddles through! +$150 and 2× income for 20s!", btn: "👑 WELCOME!" }
  ];

  function showBubble(ev) {
    bubbles.hidden = false;
    bubbles.classList.remove("pop");
    bubbles.classList.add("show");
    card.innerHTML =
      '<div class="pty-card-emoji">' + ev.emoji + "</div>" +
      '<h3 class="pty-card-title">' + ev.title + "</h3>" +
      '<div class="pty-card-sub">' + ev.sub + "</div>" +
      '<p class="pty-card-body">' + ev.body + "</p>" +
      '<button class="pty-btn up pty-card-btn" type="button">' + ev.btn + "</button>";
    var btn = card.querySelector("button");
    blip(440, 0.2, "sine"); setTimeout(function () { blip(660, 0.2, "sine"); }, 150);
    var done = false;
    function dismiss() {
      if (done) return; done = true;
      bubbles.classList.remove("show");
      bubbles.classList.add("pop");
      blip(880, 0.1, "square");
      setTimeout(function () { bubbles.hidden = true; bubbles.classList.remove("pop"); }, 380);
      if (ev.fn) ev.fn();
    }
    btn.onclick = dismiss;
    if (ev.kind !== "escape") {
      setTimeout(dismiss, 5200);
    }
  }

  function triggerEvent() {
    if (!bubbles.hidden) return;
    var ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    if (totalTycoonPenguins(data) < 1) ev = EVENTS[1];
    if (ev.kind === "escape") {
      showBubble({
        emoji: ev.emoji, title: ev.title, sub: ev.sub, body: ev.body, btn: ev.btn, kind: "escape",
        fn: function () {
          var a = Math.random() * 6.28;
          escaped = { x: parkCX() + Math.cos(a) * (parkHW() + 90), y: parkCY() + Math.sin(a) * 90 + 60, vx: 90, vy: 40, t: 20, ph: 0 };
          msgEl.textContent = "🐧💨 An escaped penguin is running around OUTSIDE! Tap it! (20s)";
        }
      });
    } else if (ev.kind === "snow") {
      showBubble({
        emoji: ev.emoji, title: ev.title, sub: ev.sub, body: ev.body, btn: ev.btn, kind: "snow",
        fn: function () { fx = { kind: "snow", label: "❄️ Snowstorm ×2", mult: 2, t: 30, dur: 30 }; msgEl.textContent = "❄️ SNOWSTORM! Income ×2 for 30s!"; }
      });
    } else if (ev.kind === "viral") {
      showBubble({
        emoji: ev.emoji, title: ev.title, sub: ev.sub, body: ev.body, btn: ev.btn, kind: "viral",
        fn: function () { fx = { kind: "viral", label: "📸 Viral ×3", mult: 3, t: 30, dur: 30 }; msgEl.textContent = "📸 VIRAL! Visitors flood in! Income ×3 for 30s!"; }
      });
    } else if (ev.kind === "icecream") {
      showBubble({
        emoji: ev.emoji, title: ev.title, sub: ev.sub, body: ev.body, btn: ev.btn, kind: "icecream",
        fn: function () { fx = { kind: "icecream", label: "🍦 Festival ×2", mult: 2, t: 30, dur: 30 }; msgEl.textContent = "🍦 ICE CREAM FESTIVAL! Income ×2 for 30s!"; }
      });
    } else {
      showBubble({
        emoji: ev.emoji, title: ev.title, sub: ev.sub, body: ev.body, btn: ev.btn, kind: "famous",
        fn: function () {
          data.coins += 150; data.earned += 150;
          fx = { kind: "famous", label: "👑 Famous ×2", mult: 2, t: 20, dur: 20 };
          msgEl.textContent = "👑 A FAMOUS penguin visited! +$150! Income ×2 for 20s!";
          popups.push({ x: parkCX(), y: 120, text: "+$150 famous visit!", t: 0, dur: 1.8, col: "#8a5f14" });
        }
      });
    }
    refreshHUD();
  }

  /* ——— drawing ——— */
  function isoTop(hw, cx, cy) {
    return { hw: hw, hh: hw * 0.5, cx: cx, cy: cy };
  }
  function drawParkBase() {
    var hw = parkHW(), cx = parkCX(), cy = parkCY();
    var hh = hw * 0.5;
    // surrounding snow ground the stalls and trees sit on
    ctx.fillStyle = "#e9f2fa";
    ctx.beginPath(); ctx.ellipse(cx, cy + hh * 0.7, hw * 1.28, hh * 0.95 + 46, 0, 0, 6.29); ctx.fill();
    // entrance walkway: pavement from the front fence corner down off-screen
    var S = fencePts().S;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#aeb9c6"; ctx.lineWidth = 52;
    ctx.beginPath(); ctx.moveTo(S.x, S.y + 6); ctx.lineTo(cx - 14, H + 12); ctx.stroke();
    ctx.strokeStyle = "#ece0c9"; ctx.lineWidth = 42;
    ctx.beginPath(); ctx.moveTo(S.x, S.y + 6); ctx.lineTo(cx - 14, H + 12); ctx.stroke();
    ctx.strokeStyle = "rgba(43,58,77,0.15)"; ctx.lineWidth = 2;
    for (var di = 0; di < 5; di++) {
      var dt2 = 0.15 + di * 0.18;
      var pxx = S.x + (cx - 14 - S.x) * dt2, pyy = S.y + 6 + (H + 12 - S.y - 6) * dt2;
      ctx.beginPath(); ctx.moveTo(pxx - 19, pyy); ctx.lineTo(pxx + 19, pyy); ctx.stroke();
    }
    // shadow
    ctx.fillStyle = "rgba(30,60,90,0.20)";
    ctx.beginPath(); ctx.ellipse(cx, cy + hh + 26, hw * 1.05, 26, 0, 0, 6.29); ctx.fill();
    // chunky sides
    ctx.fillStyle = "#9db8cc";
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy); ctx.lineTo(cx, cy + hh); ctx.lineTo(cx, cy + hh + 26); ctx.lineTo(cx - hw, cy + 26); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#7d9db8";
    ctx.beginPath();
    ctx.moveTo(cx + hw, cy); ctx.lineTo(cx, cy + hh); ctx.lineTo(cx, cy + hh + 26); ctx.lineTo(cx + hw, cy + 26); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(43,58,77,0.35)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - hw, cy + 26); ctx.lineTo(cx, cy + hh + 26); ctx.lineTo(cx + hw, cy + 26); ctx.stroke();
    // top
    var g = ctx.createLinearGradient(0, cy - hh, 0, cy + hh);
    g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#dceefb");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh); ctx.lineTo(cx + hw, cy); ctx.lineTo(cx, cy + hh); ctx.lineTo(cx - hw, cy); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#2b3a4d"; ctx.lineWidth = 3; ctx.stroke();
    // snow speckle baked onto the platform
    for (var sni = 0; sni < snowDots.length; sni++) {
      var sd = snowDots[sni];
      ctx.fillStyle = "rgba(140,180,215,0.35)";
      ctx.beginPath(); ctx.arc(cx + sd.fx * hw, cy + sd.fy * hh, sd.r, 0, 6.29); ctx.fill();
    }
    // snow grid lines
    ctx.strokeStyle = "rgba(43,58,77,0.10)"; ctx.lineWidth = 1.5;
    for (var i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * hw / 4, cy - hh + Math.abs(i) * hh / 3);
      ctx.lineTo(cx + i * hw / 4, cy + hh - Math.abs(i) * hh / 3);
      ctx.stroke();
    }
  }

  function drawTree(x, y, s) {
    ctx.fillStyle = "#6b4a2f";
    ctx.fillRect(x - 3 * s, y - 6 * s, 6 * s, 10 * s);
    ctx.fillStyle = "#2f9e44";
    ctx.strokeStyle = "#1e4a2a"; ctx.lineWidth = 2;
    for (var i = 0; i < 3; i++) {
      var w = (26 - i * 6) * s, yy = y - 8 * s - i * 12 * s;
      ctx.beginPath(); ctx.moveTo(x, yy - 16 * s); ctx.lineTo(x - w / 2, yy); ctx.lineTo(x + w / 2, yy); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath(); ctx.moveTo(x, y - 8 * s - 2 * 12 * s - 16 * s); ctx.lineTo(x - 6 * s, y - 8 * s - 2 * 12 * s - 4 * s); ctx.lineTo(x + 6 * s, y - 8 * s - 2 * 12 * s - 4 * s); ctx.closePath(); ctx.fill();
  }

  function drawRock(x, y, s) {
    ctx.fillStyle = "#c7cfdb"; ctx.strokeStyle = "#2b3a4d"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y, 10 * s, 7 * s, 0, 0, 6.29); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.ellipse(x - 3 * s, y - 2 * s, 4 * s, 2.5 * s, -0.3, 0, 6.29); ctx.fill();
  }

  function drawStall(x, y, w, c1, label, sub) {
    // striped-awning stall with counter, like the reference art
    ctx.fillStyle = "rgba(30,60,90,0.15)";
    ctx.beginPath(); ctx.ellipse(x, y + 24, w * 0.62, 8, 0, 0, 6.29); ctx.fill();
    ctx.fillStyle = "#6b4a2f";
    ctx.fillRect(x - w / 2, y - 4, w, 26);
    ctx.strokeStyle = "#2b3a4d"; ctx.lineWidth = 2.5;
    ctx.strokeRect(x - w / 2, y - 4, w, 26);
    var sw = (w + 8) / 6;
    for (var s = 0; s < 6; s++) {
      ctx.fillStyle = s % 2 ? "#ffffff" : c1;
      ctx.fillRect(x - w / 2 - 4 + s * sw, y - 28, sw, 18);
    }
    ctx.strokeStyle = "#2b3a4d"; ctx.lineWidth = 2.5;
    ctx.strokeRect(x - w / 2 - 4, y - 28, w + 8, 18);
    ctx.fillStyle = "#fff8ea"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(label, x, y + 12);
    if (sub) {
      ctx.fillStyle = "#2b3a4d"; ctx.font = "bold 8px sans-serif";
      ctx.fillText(sub, x, y + 34);
    }
  }

  // Fence around the penguin enclosure. Back half draws before entities,
  // front half after — that sandwich is what sells the isometric depth.
  // Rails get fancier as the enclosure levels up: wood → candy → ice.
  function drawFence(back) {
    var F = fencePts();
    var segs = back ? [[F.W, F.N], [F.N, F.E]] : [[F.E, F.S], [F.S, F.W]];
    var enc = data.enclosure || 0;
    var rail = enc >= 4 ? "#7ab8e0" : enc >= 2 ? "#c0392b" : "#8a5f3a";
    var railHi = enc >= 4 ? "#e8f6ff" : enc >= 2 ? "#ff8f8f" : "#c9a06a";
    for (var s = 0; s < segs.length; s++) {
      var a = segs[s][0], b = segs[s][1];
      var len = Math.hypot(b.x - a.x, b.y - a.y);
      var n = Math.max(2, Math.round(len / 26));
      ctx.lineCap = "round";
      ctx.strokeStyle = "#2b3a4d"; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(a.x, a.y - 4); ctx.lineTo(b.x, b.y - 4); ctx.stroke();
      ctx.strokeStyle = rail; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(a.x, a.y - 15); ctx.lineTo(b.x, b.y - 15); ctx.stroke();
      ctx.strokeStyle = railHi; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(a.x, a.y - 16); ctx.lineTo(b.x, b.y - 16); ctx.stroke();
      ctx.fillStyle = rail; ctx.strokeStyle = "#2b3a4d"; ctx.lineWidth = 2;
      for (var i = 0; i <= n; i++) {
        var px = a.x + (b.x - a.x) * i / n, py = a.y + (b.y - a.y) * i / n;
        ctx.beginPath(); ctx.arc(px, py - 8, 3.5, 0, 6.29); ctx.fill(); ctx.stroke();
      }
    }
  }

  function drawAttractions() {
    var cx = parkCX(), cy = parkCY(), hw = parkHW(), hh = hw * 0.5;
    var F = fencePts();
    // — outside: pines & rocks framing the park —
    drawTree(cx - hw - 48, cy - 44, 1.05);
    drawTree(cx + hw + 44, cy - 58, 1.15);
    drawTree(cx + hw + 52, cy + 46, 0.9);
    drawTree(cx - hw - 46, cy + 74, 0.95);
    drawTree(cx + hw * 0.08, cy - hh - 62, 0.9);
    drawRock(cx - hw - 72, cy + 22, 1);
    drawRock(cx + hw + 68, cy - 8, 0.8);
    // — entrance sign at the west corner —
    (function () {
      var sx = F.W.x - 36, sy = F.W.y + 16;
      ctx.fillStyle = "#6b4a2f";
      ctx.fillRect(sx - 4, sy - 26, 6, 34); ctx.fillRect(sx + 62, sy - 26, 6, 34);
      ctx.fillStyle = "#fff8ea";
      ctx.strokeStyle = "#2b3a4d"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.rect(sx - 12, sy - 52, 92, 30); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#c0392b"; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("PENGUIN PARK", sx + 34, sy - 33);
    })();
    // — viewpoint pads where visitors stop to stare —
    tycoonSpots().slice(0, 6).forEach(function (sp) {
      ctx.fillStyle = "rgba(79,143,207,0.20)";
      ctx.beginPath(); ctx.ellipse(sp.x, sp.y + 8, 13, 5.5, 0, 0, 6.29); ctx.fill();
    });
    // — ice cave (back, inside) —
    if (data.build.cave) {
      var ccx = cx, ccy = cy - hh * 0.46;
      ctx.fillStyle = "rgba(160,200,230,0.4)";
      ctx.beginPath(); ctx.ellipse(ccx, ccy + 22, 44, 10, 0, 0, 6.29); ctx.fill();
      ctx.fillStyle = "#bfe0f5"; ctx.strokeStyle = "#2b3a4d"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(ccx - 42, ccy + 20); ctx.quadraticCurveTo(ccx, ccy - 36, ccx + 42, ccy + 20); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#22303f";
      ctx.beginPath(); ctx.moveTo(ccx - 19, ccy + 20); ctx.quadraticCurveTo(ccx, ccy - 10, ccx + 19, ccy + 20); ctx.closePath(); ctx.fill();
      ctx.font = "11px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("👀", ccx, ccy + 12);
    }
    // — giant iceberg (back-right, inside) with a lookout penguin —
    if (data.build.iceberg) {
      var ix = cx + hw * 0.40, iy = cy - hh * 0.36;
      ctx.fillStyle = "rgba(160,200,230,0.4)";
      ctx.beginPath(); ctx.ellipse(ix, iy + 26, 50, 12, 0, 0, 6.29); ctx.fill();
      ctx.fillStyle = "#dff2ff"; ctx.strokeStyle = "#2b3a4d"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(ix - 36, iy + 22); ctx.lineTo(ix - 12, iy - 38); ctx.lineTo(ix + 6, iy - 12); ctx.lineTo(ix + 30, iy - 30); ctx.lineTo(ix + 38, iy + 22); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath(); ctx.moveTo(ix - 12, iy - 38); ctx.lineTo(ix - 3, iy - 22); ctx.lineTo(ix - 18, iy - 20); ctx.closePath(); ctx.fill();
      drawPenguinHead(ix + 20, iy - 32, 0.8, "#22303f");
    }
    // — swimming pool (inside) —
    var PP = poolPos();
    if (PP) {
      ctx.fillStyle = "rgba(30,60,90,0.12)";
      ctx.beginPath(); ctx.ellipse(PP.x, PP.y + 4, PP.rx + 8, PP.ry + 8, 0, 0, 6.29); ctx.fill();
      ctx.fillStyle = "#7ab8e0"; ctx.strokeStyle = "#2b3a4d"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(PP.x, PP.y, PP.rx, PP.ry, 0, 0, 6.29); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#a9d8f5";
      ctx.beginPath(); ctx.ellipse(PP.x, PP.y - 2, PP.rx - 12, PP.ry - 8, 0, 0, 6.29); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(PP.x, PP.y, PP.rx - 22 + Math.sin(time * 1.6) * 3, PP.ry - 13, 0, 0, 6.29); ctx.stroke();
    }
    // — penguin slide with ladder (left, inside) —
    if (data.build.slide) {
      var sx = cx - hw * 0.36, sy = cy + hh * 0.02;
      ctx.fillStyle = "rgba(30,60,90,0.15)";
      ctx.beginPath(); ctx.ellipse(sx + 8, sy + 22, 44, 10, 0, 0, 6.29); ctx.fill();
      ctx.strokeStyle = "#2b3a4d"; ctx.lineWidth = 3; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(sx - 26, sy + 18); ctx.lineTo(sx - 26, sy - 30); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx - 14, sy + 18); ctx.lineTo(sx - 14, sy - 30); ctx.stroke();
      for (var ri = 0; ri < 4; ri++) {
        ctx.beginPath(); ctx.moveTo(sx - 26, sy + 10 - ri * 10); ctx.lineTo(sx - 14, sy + 10 - ri * 10); ctx.stroke();
      }
      ctx.fillStyle = "#ff6b6b"; ctx.strokeStyle = "#2b3a4d"; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(sx - 20, sy - 30); ctx.lineTo(sx + 18, sy - 30); ctx.lineTo(sx + 44, sy + 18); ctx.lineTo(sx + 22, sy + 18); ctx.lineTo(sx + 2, sy - 12); ctx.lineTo(sx - 20, sy - 12); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(sx - 14, sy - 28, 12, 10); ctx.fillRect(sx + 2, sy - 28, 12, 10);
    }
    // — climbing wall (right, inside) —
    if (data.build.climb) {
      var clx = cx + hw * 0.38, cly = cy + hh * 0.10;
      ctx.fillStyle = "rgba(30,60,90,0.15)";
      ctx.beginPath(); ctx.ellipse(clx, cly + 16, 34, 8, 0, 0, 6.29); ctx.fill();
      ctx.fillStyle = "#c9a06a"; ctx.strokeStyle = "#2b3a4d"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.rect(clx - 28, cly - 30, 56, 30); ctx.fill(); ctx.stroke();
      var cols = ["#ff6b6b", "#f6c445", "#43c6ac", "#4f8fcf"];
      for (var gi = 0; gi < 8; gi++) {
        ctx.fillStyle = cols[gi % 4];
        ctx.beginPath(); ctx.arc(clx - 21 + (gi % 4) * 14, cly - 22 + Math.floor(gi / 4) * 13, 4.5, 0, 6.29); ctx.fill();
        ctx.strokeStyle = "#2b3a4d"; ctx.lineWidth = 1.5; ctx.stroke();
      }
    }
    // — snow machine (back-left, inside) —
    if (data.build.snow) {
      var mx = cx - hw * 0.42, my = cy - hh * 0.32;
      ctx.fillStyle = "rgba(30,60,90,0.15)";
      ctx.beginPath(); ctx.ellipse(mx, my + 14, 22, 6, 0, 0, 6.29); ctx.fill();
      ctx.fillStyle = "#8a93a1"; ctx.strokeStyle = "#2b3a4d"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.rect(mx - 13, my - 10, 26, 20); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#565d68";
      ctx.beginPath(); ctx.moveTo(mx - 13, my - 10); ctx.lineTo(mx - 20, my - 22); ctx.lineTo(mx - 6, my - 22); ctx.lineTo(mx + 1, my - 10); ctx.closePath(); ctx.fill(); ctx.stroke();
      for (var spi = 0; spi < 4; spi++) {
        var pp2 = (time * 0.6 + spi / 4) % 1;
        ctx.fillStyle = "rgba(255,255,255," + (0.9 * (1 - pp2)).toFixed(2) + ")";
        ctx.beginPath(); ctx.arc(mx - 13 + Math.sin(spi * 5 + time) * 8, my - 24 - pp2 * 34, 3 + pp2 * 4, 0, 6.29); ctx.fill();
      }
    }
    // — plaza stall row (outside, front) —
    if (data.up.food) drawStall(cx - hw * 0.55, cy + hh + 38, 58, "#ff6b6b", "🍦 FOOD", "+6 visitors");
    if (data.up.gift) drawStall(cx + hw * 0.55, cy + hh + 38, 58, "#f6c445", "🎁 GIFTS", "+8 visitors");
    if (data.up.plush) drawStall(cx - hw * 0.19, cy + hh + 52, 48, "#4f8fcf", "🧸 PLUSH", "+10 visitors");
    // — toilets hut —
    if (data.up.toilets) {
      var tx = cx + hw * 0.19, ty = cy + hh + 52;
      ctx.fillStyle = "rgba(30,60,90,0.15)";
      ctx.beginPath(); ctx.ellipse(tx, ty + 20, 24, 7, 0, 0, 6.29); ctx.fill();
      ctx.fillStyle = "#a9d8f5"; ctx.strokeStyle = "#2b3a4d"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.rect(tx - 15, ty - 24, 30, 42); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#2b3a4d"; ctx.font = "bold 8px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("🚻 WC", tx, ty + 12);
    }
    // — benches along the plaza —
    if (data.up.bench) {
      ctx.fillStyle = "#8a5f3a"; ctx.strokeStyle = "#2b3a4d"; ctx.lineWidth = 2;
      [[cx - hw * 0.36, cy + hh + 30], [cx + hw * 0.36, cy + hh + 30]].forEach(function (bp) {
        ctx.beginPath(); ctx.rect(bp[0] - 17, bp[1], 34, 8); ctx.fill(); ctx.stroke();
        ctx.fillRect(bp[0] - 14, bp[1] + 8, 5, 8); ctx.fillRect(bp[0] + 9, bp[1] + 8, 5, 8);
      });
    }
    // — info hut by the entrance path —
    if (data.up.info) {
      var nx = cx - 64, ny = H - 44;
      ctx.fillStyle = "rgba(30,60,90,0.15)";
      ctx.beginPath(); ctx.ellipse(nx, ny + 16, 28, 7, 0, 0, 6.29); ctx.fill();
      ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#2b3a4d"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.rect(nx - 20, ny - 20, 40, 34); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#4f8fcf";
      ctx.beginPath(); ctx.arc(nx, ny - 28, 11, 0, 6.29); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#ffffff"; ctx.font = "bold 13px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("i", nx, ny - 23);
      ctx.fillStyle = "#2b3a4d"; ctx.font = "bold 7px sans-serif";
      ctx.fillText("INFO", nx, ny + 2);
    }
  }

  function drawPenguinHead(x, y, s, body) {
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.ellipse(x, y, 9 * s, 10 * s, 0, 0, 6.29); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(x - 3 * s, y - 2 * s, 2.4 * s, 0, 6.29); ctx.arc(x + 3 * s, y - 2 * s, 2.4 * s, 0, 6.29); ctx.fill();
    ctx.fillStyle = "#0f1320";
    ctx.beginPath(); ctx.arc(x - 3 * s, y - 2 * s, 1.1 * s, 0, 6.29); ctx.arc(x + 3 * s, y - 2 * s, 1.1 * s, 0, 6.29); ctx.fill();
    ctx.fillStyle = "#ff9f2e";
    ctx.beginPath(); ctx.moveTo(x - 2.5 * s, y + 1 * s); ctx.lineTo(x + 2.5 * s, y + 1 * s); ctx.lineTo(x, y + 3.5 * s); ctx.closePath(); ctx.fill();
  }

  function drawPenguin(p) {
    var t = tycoonType(p.type);
    var s = t.scale * 1.3;
    var wob = Math.sin(time * 9 + p.wob) * 0.14;
    var hop = Math.abs(Math.sin(time * 6 + p.wob)) * 2.2;
    var x = parkCX() + p.px, y = parkCY() + p.py - hop;
    var pet = p.pet > 0 ? 3 : 0;
    // shadow
    ctx.fillStyle = "rgba(30,60,90,0.20)";
    ctx.beginPath(); ctx.ellipse(parkCX() + p.px, parkCY() + p.py + 10 * s, 11 * s, 4.5 * s, 0, 0, 6.29); ctx.fill();
    if (p.swim) {
      // pool swimmer: just a bobbing head with a ripple
      ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, y + 6, 15 * s, 6 * s, 0, 0, 6.29); ctx.stroke();
      drawPenguinHead(x, y - 2, s, t.id === "mystery" ? "hsl(" + Math.floor((time * 120) % 360) + ",70%,55%)" : t.body);
      return;
    }
    ctx.save();
    ctx.translate(x, y + pet * -1);
    ctx.rotate(wob * p.dir);
    var body = t.body;
    if (t.id === "mystery") {
      var hue = Math.floor((time * 120) % 360);
      body = "hsl(" + hue + ",70%,55%)";
    }
    // feet
    ctx.fillStyle = t.id === "golden" ? "#c07f00" : "#ff9f2e";
    ctx.beginPath(); ctx.ellipse(-6 * s, 12 * s, 4.5 * s, 3 * s, 0, 0, 6.29); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6 * s, 12 * s, 4.5 * s, 3 * s, 0, 0, 6.29); ctx.fill();
    // body
    ctx.fillStyle = body;
    ctx.strokeStyle = "#1a2330"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, 11 * s, 13 * s, 0, 0, 6.29); ctx.fill(); ctx.stroke();
    // belly
    ctx.fillStyle = t.belly;
    ctx.beginPath(); ctx.ellipse(0, 3 * s, 6.5 * s, 8 * s, 0, 0, 6.29); ctx.fill();
    // flippers
    ctx.fillStyle = body;
    ctx.save(); ctx.rotate(0.5 + wob); ctx.beginPath(); ctx.ellipse(-12 * s, 1 * s, 3.4 * s, 7 * s, 0.3, 0, 6.29); ctx.fill(); ctx.restore();
    ctx.save(); ctx.rotate(-0.5 - wob); ctx.beginPath(); ctx.ellipse(12 * s, 1 * s, 3.4 * s, 7 * s, -0.3, 0, 6.29); ctx.fill(); ctx.restore();
    // face
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(-3.6 * s, -4 * s, 3 * s, 0, 6.29); ctx.arc(3.6 * s, -4 * s, 3 * s, 0, 6.29); ctx.fill();
    ctx.fillStyle = "#0f1320";
    ctx.beginPath(); ctx.arc(-3.6 * s, -4 * s, 1.4 * s, 0, 6.29); ctx.arc(3.6 * s, -4 * s, 1.4 * s, 0, 6.29); ctx.fill();
    ctx.fillStyle = "#ff9f2e";
    ctx.beginPath(); ctx.moveTo(-3 * s, -0.5 * s); ctx.lineTo(3 * s, -0.5 * s); ctx.lineTo(0, 2.5 * s); ctx.closePath(); ctx.fill();
    // hats
    if (t.id === "emperor") {
      ctx.fillStyle = "#f6c445";
      ctx.beginPath(); ctx.moveTo(-6 * s, -11 * s); ctx.lineTo(6 * s, -11 * s); ctx.lineTo(0, -19 * s); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#8a5f14"; ctx.lineWidth = 1.5; ctx.stroke();
    }
    if (t.id === "golden") {
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = (10 * s) + "px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("✦", -6 * s, -8 * s);
    }
    if (t.id === "baby") {
      ctx.fillStyle = "#ff9f2e"; ctx.font = (8 * s) + "px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("●", 0, -12 * s);
    }
    if (t.id === "mystery") {
      ctx.fillStyle = "#fff"; ctx.font = "bold " + (9 * s) + "px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("?", 0, -13 * s);
    }
    ctx.restore();
    if (p.pet > 0) {
      ctx.fillStyle = "#ff6b9d"; ctx.font = "12px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("❤", x + 12, y - 16);
    }
  }

  function drawVisitor(v) {
    var hop = Math.abs(Math.sin(time * 8 + v.bob)) * 2;
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.scale(1.3, 1.3);
    ctx.fillStyle = "rgba(30,60,90,0.18)";
    ctx.beginPath(); ctx.ellipse(0, 12, 8, 3.5, 0, 0, 6.29); ctx.fill();
    // legs
    ctx.strokeStyle = "#2b3a4d"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
    var l = Math.sin(time * 10 + v.bob) * 3;
    ctx.beginPath(); ctx.moveTo(-3, 4); ctx.lineTo(-3 + l * 0.4, 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(3, 4); ctx.lineTo(3 - l * 0.4, 12); ctx.stroke();
    // coat
    ctx.fillStyle = v.coat; ctx.strokeStyle = "#1a2330"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, -hop * 0.3, 7, 9, 0, 0, 6.29); ctx.fill(); ctx.stroke();
    // head
    ctx.fillStyle = "#ffd9b3";
    ctx.beginPath(); ctx.arc(0, -13 - hop * 0.3, 5.5, 0, 6.29); ctx.fill(); ctx.stroke();
    // hat
    ctx.fillStyle = v.hat;
    ctx.beginPath(); ctx.arc(0, -15 - hop * 0.3, 5.5, 3.2, 6.28); ctx.fill();
    ctx.fillRect(-5.5, -19 - hop * 0.3, 11, 3);
    ctx.restore();
  }

  function drawEscaped() {
    if (!escaped) return;
    var x = escaped.x, y = escaped.y;
    ctx.fillStyle = "rgba(255,80,80,0.25)";
    ctx.beginPath(); ctx.arc(x, y + 12, 16 + Math.sin(time * 10) * 2, 0, 6.29); ctx.fill();
    ctx.save();
    ctx.translate(x, y + Math.abs(Math.sin(time * 12)) * -4);
    ctx.fillStyle = "#22303f"; ctx.strokeStyle = "#1a2330"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, 12, 14, Math.sin(time * 14) * 0.2, 0, 6.29); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fff8ea";
    ctx.beginPath(); ctx.ellipse(0, 3, 7, 8.5, 0, 0, 6.29); ctx.fill();
    ctx.fillStyle = "#0f1320";
    ctx.beginPath(); ctx.arc(-3.5, -4, 1.6, 0, 6.29); ctx.arc(3.5, -4, 1.6, 0, 6.29); ctx.fill();
    ctx.fillStyle = "#ff9f2e";
    ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.lineTo(0, 3); ctx.closePath(); ctx.fill();
    ctx.restore();
    // markers
    ctx.fillStyle = "#c0392b"; ctx.font = "bold 16px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("❗", x, y - 24 + Math.sin(time * 6) * 3);
    ctx.fillStyle = "rgba(43,58,77,0.9)"; ctx.font = "bold 11px sans-serif";
    ctx.fillText(Math.ceil(escaped.t) + "s", x, y + 28);
    ctx.font = "12px sans-serif";
    ctx.fillText("💨", x - 18 + Math.sin(time * 9) * 4, y + 6);
  }

  function render() {
    // sky
    var sky = ctx.createLinearGradient(0, 0, 0, H);
    if (fx && fx.kind === "snow") { sky.addColorStop(0, "#9cc8e8"); sky.addColorStop(1, "#d8ecfa"); }
    else { sky.addColorStop(0, "#a9d4f2"); sky.addColorStop(1, "#e8f6ff"); }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    // snow
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    var sn = (fx && fx.kind === "snow") ? 2 : 1;
    for (var i = 0; i < flakes.length; i++) {
      var f = flakes[i];
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(f.ph);
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * sn, 0, 6.29); ctx.fill();
    }
    ctx.globalAlpha = 1;
    drawParkBase();
    drawAttractions();
    drawFence(true);
    // depth sort penguins + visitors
    var ents = [];
    var k;
    for (k = 0; k < penguins.length; k++) ents.push({ y: parkCY() + penguins[k].py, o: penguins[k], kind: "p" });
    for (k = 0; k < visitors.length; k++) ents.push({ y: visitors[k].y, o: visitors[k], kind: "v" });
    ents.sort(function (a, b) { return a.y - b.y; });
    for (k = 0; k < ents.length; k++) {
      if (ents[k].kind === "p") drawPenguin(ents[k].o);
      else drawVisitor(ents[k].o);
    }
    drawFence(false);
    drawEscaped();
    // popups
    ctx.textAlign = "center";
    for (var pi = popups.length - 1; pi >= 0; pi--) {
      var pp = popups[pi];
      var a = 1 - pp.t / pp.dur;
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#2b3a4d"; ctx.lineWidth = 3;
      ctx.font = "bold 13px sans-serif";
      var tw = ctx.measureText(pp.text).width + 18;
      var ppy = pp.y - pp.t * 34;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(pp.x - tw / 2, ppy - 16, tw, 22, 8);
      else ctx.rect(pp.x - tw / 2, ppy - 16, tw, 22);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = pp.col || "#1e4a7a";
      ctx.fillText(pp.text, pp.x, ppy);
      ctx.globalAlpha = 1;
    }
    // viral confetti
    if (fx && fx.kind === "viral") {
      ctx.font = "14px sans-serif"; ctx.textAlign = "left";
      for (var c = 0; c < 8; c++) {
        var ccx = (c * 173 + time * 60) % W, ccy = 30 + (c * 67 % 60) + Math.sin(time * 3 + c) * 6;
        ctx.fillText(["📸", "💰", "🐧", "⭐"][c % 4], ccx, ccy);
      }
    }
  }

  function update(dt) {
    time += dt;
    // flakes
    var wind = (fx && fx.kind === "snow") ? 40 : 8;
    for (var i = 0; i < flakes.length; i++) {
      var f = flakes[i];
      f.y += (f.sp * ((fx && fx.kind === "snow") ? 2.4 : 1)) * dt;
      f.x += Math.sin(time + f.ph) * wind * dt;
      if (f.y > H) { f.y = -6; f.x = Math.random() * W; }
    }
    // income
    var ips = incomePerSec();
    if (ips > 0) {
      data.coins += ips * dt;
      data.earned += ips * dt;
      coinFrac += ips * dt;
      popupTimer += dt;
      if (popupTimer > 2.2 && visitors.length > 0) {
        popupTimer = 0;
        var chunk = Math.max(1, Math.round(ips * 2.2));
        var v = visitors[Math.floor(Math.random() * visitors.length)];
        if (v) popups.push({ x: v.x, y: v.y - 26, text: "+$" + chunk, t: 0, dur: 1.1, col: "#8a5f14" });
        coinFrac = 0;
      }
    }
    // visitors toward cap (on-screen walkers capped so the park stays readable)
    var cap = tycoonCap(data) * ((fx && fx.kind === "viral") ? 1.6 : 1);
    cap = Math.min(60, cap);
    var want = Math.min(24, Math.round(cap));
    if (visitors.length < want && Math.random() < dt * 2.2) {
      visitors.push(spawnVisitor());
    }
    if (visitors.length > want && Math.random() < dt * 1.2) {
      for (var mi = 0; mi < visitors.length; mi++) {
        if (visitors[mi].state !== "leave") { visitors[mi].state = "leave"; break; }
      }
    }
    // visitors walk: entrance -> viewpoint/stall -> viewpoint/stall -> exit
    for (var vi = visitors.length - 1; vi >= 0; vi--) {
      var vv = visitors[vi];
      var goal = vv.state === "leave" ? { x: parkCX() - 14, y: H + 24 } : { x: vv.tx, y: vv.ty };
      var dx = goal.x - vv.x, dy = goal.y - vv.y;
      var d = Math.hypot(dx, dy);
      if (vv.state === "leave") {
        if (d < 16) { visitors.splice(vi, 1); continue; }
        vv.x += (dx / d) * vv.sp * dt;
        vv.y += (dy / d) * vv.sp * dt;
      } else if (d < 10) {
        vv.look -= dt;
        if (vv.look <= 0) {
          if (Math.random() < 0.10) { vv.state = "leave"; }
          else {
            var ns = tycoonSpots();
            var pick = ns[Math.floor(Math.random() * ns.length)];
            vv.tx = pick.x; vv.ty = pick.y;
            vv.look = 1.5 + Math.random() * 3.5;
          }
        }
      } else {
        vv.x += (dx / d) * vv.sp * dt;
        vv.y += (dy / d) * vv.sp * dt;
      }
      vv.bob += dt * 8;
    }
    // penguins wander inside the enclosure (swimmers circle the pool)
    var hw = parkHW();
    var PP = poolPos();
    for (var pi = 0; pi < penguins.length; pi++) {
      var p = penguins[pi];
      p.wob += dt * 2;
      if (p.pet > 0) p.pet -= dt;
      if (p.swim && PP) {
        p.sa += dt * 1.1;
        p.px = (PP.x - parkCX()) + Math.cos(p.sa) * PP.rx * 0.55;
        p.py = (PP.y - parkCY()) + Math.sin(p.sa) * PP.ry * 0.55;
        continue;
      }
      p.px += p.vx * dt;
      p.py += p.vy * dt;
      if (Math.abs(p.px) > hw * 0.28 || Math.random() < dt * 0.25) {
        p.vx = (Math.random() - 0.5) * 40;
        p.dir = p.vx >= 0 ? 1 : -1;
      }
      if (Math.abs(p.py) > hw * 0.13 || Math.random() < dt * 0.25) p.vy = (Math.random() - 0.5) * 18;
      p.px = Math.max(-hw * 0.30, Math.min(hw * 0.30, p.px));
      p.py = Math.max(-hw * 0.14, Math.min(hw * 0.14, p.py));
    }
    // popups
    for (var qi = popups.length - 1; qi >= 0; qi--) {
      popups[qi].t += dt;
      if (popups[qi].t > popups[qi].dur) popups.splice(qi, 1);
    }
    // fx timer
    if (fx) {
      fx.t -= dt;
      if (fx.t <= 0) {
        msgEl.textContent = "Event over. The penguins catch their breath.";
        fx = null;
      }
    }
    // escaped
    if (escaped) {
      escaped.t -= dt;
      escaped.ph += dt * 6;
      escaped.x += escaped.vx * dt;
      escaped.y += escaped.vy * dt;
      if (escaped.x < 30 || escaped.x > W - 30) escaped.vx *= -1;
      if (escaped.y < 60 || escaped.y > H - 30) escaped.vy *= -1;
      if (Math.random() < dt * 1.2) { escaped.vx = (Math.random() - 0.5) * 220; escaped.vy = (Math.random() - 0.5) * 140; }
      if (escaped.t <= 0) {
        escaped = null;
        msgEl.textContent = "The penguin waddled back on its own. Visitors noticed nothing. Probably.";
      }
    } else {
      eventTimer -= dt;
      if (eventTimer <= 0) {
        eventTimer = 50 + Math.random() * 30;
        triggerEvent();
      }
    }
    // quips
    quipTimer -= dt;
    if (quipTimer <= 0 && !fx && !escaped && bubbles.hidden) {
      quipTimer = 16 + Math.random() * 10;
      if (Math.random() < 0.6) msgEl.textContent = TYCOON_QUIPS[Math.floor(Math.random() * TYCOON_QUIPS.length)];
    }
    // autosave
    if (Math.floor(time * 2) !== Math.floor((time - dt) * 2)) tycoonSave(data);
    refreshHUD();
  }

  function tick(now) {
    if (!rafActive) return;
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (sheet.hidden && bubbles.hidden) { /* keep sim running even with sheet open for satisfaction */ }
    update(dt);
    render();
    raf = requestAnimationFrame(tick);
  }

  function toCanvas(e) {
    var r = canvas.getBoundingClientRect();
    var cx = (e.clientX - r.left) * (W / r.width);
    var cy = (e.clientY - r.top) * (H / r.height);
    return { x: cx, y: cy };
  }
  function onTap(e) {
    var pt = toCanvas(e);
    // escaped first
    if (escaped && Math.hypot(pt.x - escaped.x, pt.y - escaped.y) < 30) {
      data.coins += 50; data.earned += 50;
      popups.push({ x: escaped.x, y: escaped.y - 20, text: "FOUND! +$50", t: 0, dur: 1.6, col: "#1e7a4a" });
      msgEl.textContent = "🐧 PENGUIN FOUND! +$50 bonus. Crisis averted.";
      blip(780, 0.15, "triangle"); setTimeout(function () { blip(1040, 0.2, "triangle"); }, 110);
      escaped = null;
      eventTimer = 55 + Math.random() * 25;
      tycoonSave(data); refreshHUD();
      return;
    }
    // pet a penguin
    var best = null, bd = 1e9;
    for (var i = 0; i < penguins.length; i++) {
      var px = parkCX() + penguins[i].px, py = parkCY() + penguins[i].py;
      var d = Math.hypot(pt.x - px, pt.y - py);
      if (d < 26 && d < bd) { bd = d; best = penguins[i]; }
    }
    if (best && best.pet <= 0) {
      best.pet = 1.2;
      data.coins += 1; data.earned += 1; claimed += 1;
      popups.push({ x: parkCX() + best.px, y: parkCY() + best.py - 22, text: "+$1 ❤", t: 0, dur: 0.9, col: "#c94a6a" });
      blip(900 + Math.random() * 200, 0.07, "sine");
      try { recordScore("tycoon", Math.floor(data.earned), "high"); } catch (err) {}
      refreshHUD();
    }
  }

  document.querySelector("#ptyBuildBtn").addEventListener("click", function () { openSheet("build"); blip(500, 0.08, "square"); });
  document.querySelector("#ptyPengBtn").addEventListener("click", function () { openSheet("peng"); blip(500, 0.08, "square"); });
  document.querySelector("#ptyUpBtn").addEventListener("click", function () { openSheet("up"); blip(500, 0.08, "square"); });
  document.querySelector("#ptyClose").addEventListener("click", function () { sheet.hidden = true; sheetTab = null; });
  document.querySelector("#ptyMute").addEventListener("click", function (e) {
    soundOn = !soundOn;
    e.currentTarget.textContent = soundOn ? "🔊 Sound on" : "🔇 Muted";
  });
  document.querySelector("#ptyReset").addEventListener("click", function () {
    if (!window.confirm("Bulldoze the whole park and start over with 1 penguin?")) return;
    try { localStorage.removeItem(TYCOON_KEY); } catch (e) {}
    data = tycoonLoad();
    rebuildPenguins();
    visitors = []; popups = []; fx = null; escaped = null; eventTimer = 45;
    sheet.hidden = true; sheetTab = null;
    msgEl.textContent = "Fresh ice. One penguin. Infinite dreams.";
    tycoonSave(data); refreshHUD();
  });
  canvas.addEventListener("pointerdown", onTap);

  function keydown(e) {
    if (e.key === "1") openSheet("build");
    if (e.key === "2") openSheet("peng");
    if (e.key === "3") openSheet("up");
    if (e.key === "Escape" && !sheet.hidden) { sheet.hidden = true; sheetTab = null; }
  }
  document.addEventListener("keydown", keydown);

  activeAdvance = function (ms) {
    var steps = Math.max(1, Math.round(ms / 16));
    for (var i = 0; i < steps; i++) update(1 / 60);
    render();
  };
  activeCleanup = function () {
    rafActive = false;
    cancelAnimationFrame(raf);
    document.removeEventListener("keydown", keydown);
    try { tycoonSave(data); } catch (e) {}
  };

  msgEl.textContent = totalTycoonPenguins(data) > 1
    ? "Welcome back! " + totalTycoonPenguins(data) + " penguins missed you. Tap a penguin to pet it (+$1)."
    : "One penguin. One dream. Tap it to pet it (+$1). Save $50 for penguin #2!";
  refreshHUD();
  renderSheetBlank();
  function renderSheetBlank() { if (!sheet.hidden && sheetTab) renderSheet(); }
  last = performance.now();
  raf = requestAnimationFrame(tick);
  try { if (window.fitGameShell) requestAnimationFrame(function () { requestAnimationFrame(window.fitGameShell); }); } catch (e) {}
}

Object.assign(gameStarters, { tycoon: startPenguinTycoon, parktycoon: startPenguinTycoon, penguinTycoon: startPenguinTycoon });
