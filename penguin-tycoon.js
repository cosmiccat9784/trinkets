/* Penguin Park Tycoon — RollerCoaster Tycoon + penguins + tiny-game simplicity.
   Scene runs on tile-engine.js (isometric tiles, auto-joining ice walls,
   layered objects). Economy, shops, HUD and bubble events live here. */

var TYCOON_KEY = "trinkets-tycoon-v1";

var TYCOON_TYPES = [
  { id: "normal",  name: "Normal Penguin",  emoji: "🐧", cost: 50,    income: 2,   scarf: null,      desc: "+$2/sec · reliable" },
  { id: "baby",    name: "Baby Penguin",    emoji: "🐤", cost: 150,   income: 5,   scarf: "#ff8fb1", desc: "+$5/sec · tiny & loud" },
  { id: "emperor", name: "Emperor Penguin", emoji: "👑", cost: 500,   income: 15,  scarf: "#ffffff", desc: "+$15/sec · royal glide" },
  { id: "golden",  name: "Golden Penguin",  emoji: "✨", cost: 2500,  income: 75,  scarf: "#ffd93d", desc: "+$75/sec · extremely shiny" },
  { id: "mystery", name: "??? Penguin",     emoji: "🌀", cost: 10000, income: 300, scarf: "#8a7dff", desc: "+$300/sec · do not ask" }
];

var TYCOON_BUILD = [
  { id: "enclosure", name: "Bigger Enclosure", emoji: "🏔️", base: 80,   scale: 1.7, max: 5, cap: 6,  bonus: 0.05, desc: "+6 visitors · enclosure grows" },
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

// The tile engine auto-creates a full-page canvas on DOMContentLoaded when it
// has no canvas. All Trinkets scripts load on the shelf page, long before any
// game opens — so park the engine on a detached canvas here. The starter below
// points it at the real canvas with init().
try {
  if (typeof TileEngine !== "undefined" && TileEngine && !TileEngine._tycoonParked) {
    TileEngine.init({ canvas: document.createElement("canvas") });
    TileEngine._tycoonParked = true;
  }
} catch (e) {}

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
        '<canvas class="pty-canvas" id="ptyTiles" width="720" height="440"></canvas>' +
        '<canvas class="pty-ghost" id="ptyGhost" width="720" height="440"></canvas>' +
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

  var tilesEl = document.querySelector("#ptyTiles");
  var ghost = document.querySelector("#ptyGhost");
  var gtx = ghost.getContext("2d");
  var GW = ghost.width, GH = ghost.height;
  var coinsEl = document.querySelector("#ptyCoins");
  var visEl = document.querySelector("#ptyVis");
  var lvlEl = document.querySelector("#ptyLvl");
  var fillEl = document.querySelector("#ptyFill");
  var msgEl = document.querySelector("#ptyMsg");
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
  var penguins = []; // {type,x,y,t,step,opts,pet,swim,si}
  var visitors = []; // {x,y,tx,ty,t,step,look,state,opts}
  var popups = [];   // {tx,ty,text,t,dur,col} — tile-anchored, drawn on overlay
  var flakes = [];
  var popupTimer = 0;
  var quipTimer = 14;
  var time = 0;
  var soundOn = true;
  var sheetTab = null;
  var eventTimer = 45;
  var fx = null; // {kind,label,mult,t,dur}
  var escaped = null; // {x,y,t,hop,flip}
  var raf = 0;
  var last = performance.now();
  var rafActive = true;

  var N = 12; // tile grid size
  var occTiles = {};     // "x,y" -> static object tile (blocks movement)
  var pondTiles = [];    // swimmer circuit
  var pondRect = null;   // {x0,y0,x1,y1} — swimmers circle its middle
  var attractionTiles = {}; // build id -> {x,y} (for buy popups)
  var stallTiles = {};      // upgrade id -> {x,y}
  var gateTile = { x: 6, y: 7 };
  var enterTile = { x: 6, y: 11 };

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

  /* ——— tile-engine setup: custom attraction tiles ——— */
  function registerCustomTiles() {
    try {
      TileEngine.register("slide", { layer: "object", draw: function (T) {
        T.shadow(0.9, 0.5);
        T.box(-0.34, -0.3, -0.22, 0.3, 26, ["#8a93a1", "#6b7280", "#565d68"]);
        T.box(0.1, -0.3, 0.22, 0.3, 26, ["#8a93a1", "#6b7280", "#565d68"]);
        T.poly([T.P(-0.28, -0.3, 26), T.P(0.16, -0.3, 26), T.P(0.44, 0.34, 4), T.P(0.0, 0.34, 4)], "#ff7f6e");
        T.poly([T.P(-0.28, -0.3, 26), T.P(-0.06, -0.3, 26), T.P(0.22, 0.34, 4), T.P(0.0, 0.34, 4)], "#ffffff");
      }});
      TileEngine.register("iceberg", { layer: "object", draw: function (T) {
        T.shadow(0.9, 0.5);
        T.poly([T.P(-0.36, 0.2), T.P(-0.1, -0.38), T.P(0.08, -0.1), T.P(0.34, -0.3), T.P(0.38, 0.2)], "#dff2ff");
        T.poly([T.P(-0.1, -0.38), T.P(-0.02, -0.22), T.P(-0.16, -0.2)], "#ffffff");
      }});
      TileEngine.register("snowmaker", { layer: "object", draw: function (T) {
        T.shadow(0.6, 0.4);
        T.box(-0.2, -0.2, 0.2, 0.2, 14, ["#c7cfdb", "#8a93a1", "#565d68"]);
        T.poly([T.P(-0.2, -0.2, 14), T.P(-0.32, -0.32, 26), T.P(-0.08, -0.32, 26), T.P(0.04, -0.2, 14)], "#6b7280");
        T.poly([T.P(-0.3, -0.3, 26), T.P(-0.1, -0.3, 26), T.P(-0.2, -0.42, 26)], "#ffffff");
      }});
    } catch (e) {}
  }

  /* ——— smooth critters: glide between tiles instead of hopping ———
     The engine draws objects per-tile, so we override the penguin / visitor /
     swimmer painters with versions drawn at a fractional tile offset. Each
     entity keeps a float position (fx, fy); its grid tile only flips when it
     crosses a boundary, so painter-order depth stays exactly correct. */
  function spHelper(T, dx, dy, bobFrac) {
    var k = T.k;
    var ox = (dx - dy) * 32 * k, oy = (dx + dy) * 16 * k - (bobFrac || 0) * k;
    function pt(u, v) { return [T.cx + ox + (u - v) * 32 * k, T.cy + oy + (u + v) * 16 * k]; }
    function ell(cu, cv, ru, rv, rot, n) {
      var pts = [], i, a, ex, ey, cr = Math.cos(rot || 0), sr = Math.sin(rot || 0);
      n = n || 12;
      for (i = 0; i < n; i++) {
        a = i / n * 6.2832;
        ex = Math.cos(a) * ru; ey = Math.sin(a) * rv;
        pts.push(pt(cu + ex * cr - ey * sr, cv + ex * sr + ey * cr));
      }
      return pts;
    }
    function poly(pts, f, s, w) { T.poly(pts, f, s === undefined ? "#2a3f66" : s, w === undefined ? 1.8 : w); }
    return { pt: pt, ell: ell, poly: poly };
  }
  function drawGlidePenguin(T, o, e) {
    var H = spHelper(T, e.fx - e.x, e.fy - e.y, T.bob());
    var Sh = spHelper(T, e.fx - e.x, e.fy - e.y, 0);
    var flip = o.flip ? -1 : 1;
    Sh.poly(Sh.ell(0.02, 0.03, 0.19, 0.07), "rgba(47,84,134,.2)", null);
    H.poly(H.ell(-0.07 * flip, 0.0, 0.07, 0.035), "#ff9f43");
    H.poly(H.ell(0.08 * flip, 0.0, 0.07, 0.035), "#ff9f43");
    H.poly(H.ell(-0.18 * flip, -0.2, 0.05, 0.12, 0.3 * flip), "#1f3358");
    H.poly(H.ell(0.18 * flip, -0.2, 0.05, 0.12, -0.3 * flip), "#1f3358");
    H.poly(H.ell(0, -0.22, 0.17, 0.23), "#27406b");
    H.poly(H.ell(0.02 * flip, -0.18, 0.11, 0.17), "#ffffff", null);
    H.poly(H.ell(-0.055 * flip, -0.33, 0.04, 0.04), "#ffffff", null);
    H.poly(H.ell(0.06 * flip, -0.33, 0.04, 0.04), "#ffffff", null);
    H.poly(H.ell(-0.05 * flip, -0.33, 0.018, 0.018), "#2a3f66", null);
    H.poly(H.ell(0.065 * flip, -0.33, 0.018, 0.018), "#2a3f66", null);
    H.poly(H.ell(-0.1 * flip, -0.27, 0.028, 0.028), "rgba(255,154,168,.85)", null);
    H.poly(H.ell(0.11 * flip, -0.27, 0.028, 0.028), "rgba(255,154,168,.85)", null);
    H.poly([H.pt(-0.02 * flip, -0.30), H.pt(0.1 * flip, -0.28), H.pt(-0.02 * flip, -0.24)], "#ffb02e");
    if (o.scarf) {
      H.poly([H.pt(-0.15 * flip, -0.21), H.pt(0.15 * flip, -0.21), H.pt(0.15 * flip, -0.15), H.pt(-0.15 * flip, -0.15)], o.scarf);
      H.poly([H.pt(0.06 * flip, -0.15), H.pt(0.12 * flip, -0.15), H.pt(0.12 * flip, -0.04), H.pt(0.06 * flip, -0.04)], o.scarf);
    }
  }
  function drawGlideVisitor(T, o, e) {
    var H = spHelper(T, e.fx - e.x, e.fy - e.y, T.bob());
    var Sh = spHelper(T, e.fx - e.x, e.fy - e.y, 0);
    var coat = o.coat || "#6c8cff", hat = o.hat || "#ffffff";
    Sh.poly(Sh.ell(0, 0.05, 0.16, 0.06), "rgba(47,84,134,.2)", null);
    H.poly([H.pt(-0.09, -0.03), H.pt(-0.03, -0.03), H.pt(-0.03, 0.05), H.pt(-0.09, 0.05)], "#2e3f66");
    H.poly([H.pt(0.03, -0.03), H.pt(0.09, -0.03), H.pt(0.09, 0.05), H.pt(0.03, 0.05)], "#2e3f66");
    H.poly(H.ell(-0.13, -0.2, 0.04, 0.09, 0.15), coat);
    H.poly(H.ell(0.13, -0.2, 0.04, 0.09, -0.15), coat);
    H.poly([H.pt(-0.12, -0.38), H.pt(0.12, -0.38), H.pt(0.12, -0.1), H.pt(-0.12, -0.1)], coat);
    H.poly(H.ell(0, -0.46, 0.1, 0.1), "#ffd3b0");
    H.poly(H.ell(-0.035, -0.46, 0.015, 0.015), "#2a3f66", null);
    H.poly(H.ell(0.035, -0.46, 0.015, 0.015), "#2a3f66", null);
    var hatPts = [], i, a;
    for (i = 0; i <= 8; i++) { a = Math.PI + i / 8 * Math.PI; hatPts.push(H.pt(Math.cos(a) * 0.105, -0.47 + Math.sin(a) * 0.105)); }
    H.poly(hatPts, hat);
    H.poly(H.ell(0, -0.6, 0.042, 0.042), "#ffffff", null);
  }
  function drawGlideSwimmer(T, o, e) {
    var H = spHelper(T, e.fx - e.x, e.fy - e.y, T.bob() * 0.5);
    var flip = o.flip ? -1 : 1;
    H.poly(H.ell(0, 0.03, 0.44, 0.16, 0, 18), null, "rgba(255,255,255,.85)", 2);
    H.poly(H.ell(0, 0.045, 0.32, 0.1, 0, 16), "#9fdcf3", "#ffffff", 2);
    H.poly(H.ell(-0.22 * flip, -0.02, 0.07, 0.03), "#1f3358");
    H.poly(H.ell(-0.05 * flip, -0.05, 0.2, 0.1), "#27406b");
    H.poly(H.ell(0.13 * flip, -0.13, 0.115, 0.115), "#27406b");
    H.poly(H.ell(0.17 * flip, -0.15, 0.035, 0.035), "#ffffff", null);
    H.poly(H.ell(0.175 * flip, -0.15, 0.016, 0.016), "#2a3f66", null);
    H.poly([H.pt(0.21 * flip, -0.12), H.pt(0.33 * flip, -0.09), H.pt(0.21 * flip, -0.06)], "#ffb02e");
  }
  function registerSmoothCritters() {
    try {
      TileEngine.register("penguin", { layer: "object", draw: function (T, o) {
        var hit = entityAt(T.x, T.y);
        if (hit && hit.kind !== "visitor") drawGlidePenguin(T, o, hit.ref);
      }});
      TileEngine.register("visitor", { layer: "object", draw: function (T, o) {
        var hit = entityAt(T.x, T.y);
        if (hit && hit.kind === "visitor") drawGlideVisitor(T, o, hit.ref);
      }});
      TileEngine.register("swimmer", { layer: "object", draw: function (T, o) {
        var hit = entityAt(T.x, T.y);
        if (hit && hit.kind !== "visitor") drawGlideSwimmer(T, o, hit.ref);
      }});
    } catch (err) {}
  }

  /* ——— map: enclosure rect grows with Bigger Enclosure ——— */
  function encInset() { return 4 - Math.min(2, Math.floor((data.enclosure || 0) / 2)); }
  function insideRect(x, y) {
    var m = encInset();
    return x >= m && x <= N - 1 - m && y >= m && y <= N - 1 - m;
  }
  function inBounds(x, y) { return x >= 0 && y >= 0 && x < N && y < N; }

  function pondCX() { return pondRect ? (pondRect.x0 + pondRect.x1) / 2 : 0; }
  function pondCY() { return pondRect ? (pondRect.y0 + pondRect.y1) / 2 : 0; }
  function pondRX() { return pondRect ? (pondRect.x1 - pondRect.x0 + 1) / 2 - 0.35 : 0; }
  function pondRY() { return pondRect ? (pondRect.y1 - pondRect.y0 + 1) / 2 - 0.3 : 0; }

  function staticAt(x, y, type, opts) {
    set_tile(x, y, type, opts);
    occTiles[x + "," + y] = type;
  }

  function buildParkStatics() {
    clear_all();
    occTiles = {};
    pondTiles = [];
    attractionTiles = {};
    stallTiles = {};
    var m = encInset(), hi = N - 1 - m;
    // enclosure block with auto ice walls on its outer sides
    fill_tiles(m, m, hi, hi, "enclosure");
    gateTile = { x: 6, y: hi };
    set_tile(6, hi, "gate");
    // entrance path: gate down to the bottom + plaza row
    fill_tiles(6, hi + 1, 6, N - 1, "path");
    fill_tiles(3, N - 1, 9, N - 1, "path");
    enterTile = { x: 6, y: N - 1 };
    // pond: a wide sheet tucked at the back of the pen (snowy rim is automatic)
    var px = m + 1, py = m;
    if (px + 2 > hi) px = hi - 2;
    fill_tiles(px, py, px + 2, py + 1, "pond");
    pondRect = { x0: px, y0: py, x1: px + 2, y1: py + 1 };
    pondTiles = [];
    for (var pyy = py; pyy <= py + 1; pyy++) for (var pxx = px; pxx <= px + 2; pxx++) {
      pondTiles.push({ x: pxx, y: pyy });
      occTiles[pxx + "," + pyy] = "pond";
    }
    // attractions settle on the nearest free interior tile to their anchor
    function freeTile(sx, sy) {
      var best = null, bd = 1e9;
      for (var yy = m; yy <= hi; yy++) for (var xx = m; xx <= hi; xx++) {
        if (xx === gateTile.x && yy === gateTile.y) continue;
        if (occTiles[xx + "," + yy]) continue;
        var d = Math.abs(xx - sx) + Math.abs(yy - sy);
        if (d < bd) { bd = d; best = { x: xx, y: yy }; }
      }
      return best;
    }
    function placeNear(sx, sy, type, opts) {
      var t = freeTile(sx, sy);
      if (t) { staticAt(t.x, t.y, type, opts); }
      return t;
    }
    // two adjacent platforms so the timber frame joins up like the reference
    function placePair(sx, sy, type, opts) {
      var a = freeTile(sx, sy);
      if (!a) return null;
      var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (var i = 0; i < 4; i++) {
        var bx = a.x + dirs[i][0], by = a.y + dirs[i][1];
        if (bx < m || bx > hi || by < m || by > hi) continue;
        if (bx === gateTile.x && by === gateTile.y) continue;
        if (occTiles[bx + "," + by]) continue;
        staticAt(a.x, a.y, type, opts);
        staticAt(bx, by, type, opts);
        return [{ x: a.x, y: a.y }, { x: bx, y: by }];
      }
      staticAt(a.x, a.y, type, opts);
      return [{ x: a.x, y: a.y }];
    }
    var t;
    if (data.build.slide) { t = placeNear(m, hi - 1, "slide"); if (t) attractionTiles.slide = t; }
    if (data.build.iceberg) { t = placeNear(hi, m, "iceberg"); if (t) attractionTiles.iceberg = t; }
    if (data.build.snow) { t = placeNear(m, m, "snowmaker"); if (t) attractionTiles.snow = t; }
    if (data.build.cave) {
      t = placeNear(hi - 2, m, "crystal");
      if (t) {
        attractionTiles.cave = t;
        placeNear(t.x, t.y, "crystal"); // cluster of two, like the reference
      }
    }
    if (data.build.climb) { t = placePair(hi, hi - 1, "platform"); if (t) attractionTiles.climb = t[0]; }
    // plaza stalls (outside the walls, facing the path)
    if (data.up.food) { staticAt(4, 10, "icecream"); stallTiles.food = { x: 4, y: 10 }; }
    if (data.up.gift) { staticAt(8, 10, "icecream"); stallTiles.gift = { x: 8, y: 10 }; }
    if (data.up.plush) { staticAt(3, 11, "icecream"); stallTiles.plush = { x: 3, y: 11 }; }
    if (data.up.toilets) { staticAt(9, 11, "sign", { text: "WC" }); stallTiles.toilets = { x: 9, y: 11 }; }
    if (data.up.bench) {
      staticAt(5, 10, "bench"); staticAt(7, 10, "bench", { flip: 1 });
      stallTiles.bench = { x: 5, y: 10 };
    }
    if (data.up.info) { staticAt(5, 11, "sign", { text: "INFO" }); stallTiles.info = { x: 5, y: 11 }; }
    // scenery: PARK sign + pennants up front, snowy pines / rocks / crystals
    staticAt(1, 10, "sign", { text: "PENGUIN PARK" });
    staticAt(0, 10, "flag", { color: "#8a7dff" });
    staticAt(10, 0, "flag", { color: "#ff6b6b" });
    staticAt(0, 3, "pine"); staticAt(11, 2, "pine");
    staticAt(1, 5, "pine"); staticAt(10, 8, "pine");
    staticAt(4, 1, "pine"); staticAt(8, 1, "pine");
    staticAt(4, 0, "rock"); staticAt(11, 5, "rock"); staticAt(0, 8, "rock");
    staticAt(9, 1, "crystal");
    staticAt(11, 11, "flag", { color: "#ffd93d" });
  }

  /* ——— entities live as tile objects on top of the ground ——— */
  function entityAt(x, y, ignore) {
    var i;
    for (i = 0; i < penguins.length; i++) {
      if (penguins[i] !== ignore && penguins[i].x === x && penguins[i].y === y) return { kind: "penguin", ref: penguins[i] };
    }
    for (i = 0; i < visitors.length; i++) {
      if (visitors[i] !== ignore && visitors[i].x === x && visitors[i].y === y) return { kind: "visitor", ref: visitors[i] };
    }
    if (escaped && escaped !== ignore && escaped.x === x && escaped.y === y) return { kind: "escaped", ref: escaped };
    return null;
  }
  function penguinOpts(type) {
    var scarf = tycoonType(type).scarf;
    var o = { flip: Math.random() < 0.5 ? 1 : 0 };
    if (scarf) o.scarf = scarf;
    return o;
  }
  var COATS = ["#ff6b6b", "#4f8fcf", "#43c6ac", "#f6c445", "#6a4c93", "#e8913a", "#74c0fc"];
  var HATS = ["#c0392b", "#2c3e50", "#f6c445", "#43c6ac", "#ffffff", "#6a4c93"];
  function visitorOpts() {
    return {
      coat: COATS[Math.floor(Math.random() * COATS.length)],
      hat: HATS[Math.floor(Math.random() * HATS.length)]
    };
  }
  function moveEntity(e, type, nx, ny) {
    remove_object(e.x, e.y);
    e.x = nx; e.y = ny; e.fx = nx; e.fy = ny; e.tx = nx; e.ty = ny;
    e.pause = 0.2;
    set_tile(nx, ny, type, e.opts);
  }
  // Glide a float position toward its target; flip the grid tile only when
  // a tile boundary is crossed. Returns true on arrival.
  function glideToward(e, dt) {
    var dx = e.tx - e.fx, dy = e.ty - e.fy;
    var d = Math.hypot(dx, dy);
    var step = e.speed * dt;
    if (d <= step + 0.001) { e.fx = e.tx; e.fy = e.ty; }
    else { e.fx += dx / d * step; e.fy += dy / d * step; }
    var nx = Math.round(e.fx), ny = Math.round(e.fy);
    if (nx !== e.x || ny !== e.y) {
      remove_object(e.x, e.y);
      e.x = nx; e.y = ny;
      set_tile(nx, ny, e.tile, e.opts);
    }
    return e.fx === e.tx && e.fy === e.ty;
  }
  function freePenguinTile() {
    var m = encInset(), hi = N - 1 - m;
    for (var tries = 0; tries < 60; tries++) {
      var x = m + Math.floor(Math.random() * (hi - m + 1));
      var y = m + Math.floor(Math.random() * (hi - m + 1));
      if (x === gateTile.x && y === gateTile.y) continue;
      if (occTiles[x + "," + y]) continue;
      if (entityAt(x, y)) continue;
      return { x: x, y: y };
    }
    return null;
  }
  function spawnPenguinVisual(typeId) {
    var t = freePenguinTile();
    if (!t) return null;
    var p = {
      type: typeId, x: t.x, y: t.y, fx: t.x, fy: t.y, tx: t.x, ty: t.y,
      speed: 1.7, pause: Math.random() * 0.6, tile: "penguin",
      opts: penguinOpts(typeId), pet: 0, swim: false, si: 0, st: 0, sa: 0
    };
    set_tile(t.x, t.y, "penguin", p.opts);
    return p;
  }
  function rebuildPenguins() {
    penguins = [];
    var keys = Object.keys(data.counts);
    for (var i = 0; i < keys.length && penguins.length < 10; i++) {
      var n = Math.min(data.counts[keys[i]] || 0, 8);
      for (var j = 0; j < n && penguins.length < 10; j++) {
        var p = spawnPenguinVisual(keys[i]);
        if (p) penguins.push(p);
      }
    }
    if (penguins.length === 0) {
      var solo = spawnPenguinVisual("normal");
      if (solo) penguins.push(solo);
    }
    assignSwimmers();
  }
  function assignSwimmers() {
    var n = 0;
    for (var i = 0; i < penguins.length; i++) {
      var p = penguins[i];
      if (data.build.pool && n < 2 && pondTiles.length) {
        p.swim = true;
        p.tile = "swimmer";
        var pt = pondTiles[n % pondTiles.length];
        p.si = n % pondTiles.length;
        p.sa = p.si * 1.6;
        p.st = 0;
        p.opts.flip = n % 2;
        moveEntity(p, "swimmer", pt.x, pt.y);
        n++;
      } else if (p.swim) {
        p.swim = false;
        p.tile = "penguin";
        var t = freePenguinTile();
        if (t) moveEntity(p, "penguin", t.x, t.y);
        else remove_object(p.x, p.y);
      }
    }
  }
  function relocateEntities() {
    // after a map rebuild the grid was wiped: settle everyone on fresh tiles
    var i, t;
    for (i = penguins.length - 1; i >= 0; i--) {
      var p = penguins[i];
      if (data.build.pool && i < 2 && pondTiles.length) {
        p.swim = true; p.tile = "swimmer";
        var pt = pondTiles[i % pondTiles.length];
        p.si = i % pondTiles.length; p.sa = p.si * 1.6; p.st = 0;
        p.opts.flip = i % 2;
        p.x = pt.x; p.y = pt.y; p.fx = pt.x; p.fy = pt.y; p.tx = pt.x; p.ty = pt.y;
        set_tile(pt.x, pt.y, "swimmer", p.opts);
      } else {
        p.swim = false; p.tile = "penguin";
        t = freePenguinTile();
        if (!t) { penguins.splice(i, 1); continue; }
        p.x = t.x; p.y = t.y; p.fx = t.x; p.fy = t.y; p.tx = t.x; p.ty = t.y;
        p.pause = Math.random() * 0.5;
        set_tile(t.x, t.y, "penguin", p.opts);
      }
    }
    for (i = visitors.length - 1; i >= 0; i--) {
      var v = visitors[i];
      if (!inBounds(v.x, v.y) || insideRect(v.x, v.y) || occTiles[v.x + "," + v.y] || entityAt(v.x, v.y, v)) {
        visitors.splice(i, 1);
      } else {
        v.fx = v.x; v.fy = v.y;
        set_tile(v.x, v.y, "visitor", v.opts);
      }
    }
  }

  /* ——— visitor waypoints: fence viewpoints + stall fronts + plaza ——— */
  function tycoonSpots() {
    var spots = [];
    var m = encInset(), hi = N - 1 - m;
    var y, x;
    for (y = m; y <= hi; y++) spots.push({ x: hi + 1, y: y });
    for (x = m; x <= hi; x++) spots.push({ x: x, y: hi + 1 });
    if (data.up.food) spots.push({ x: 4, y: 11 });
    if (data.up.gift) spots.push({ x: 8, y: 11 });
    if (data.up.plush) spots.push({ x: 3, y: 10 });
    if (data.up.toilets) spots.push({ x: 9, y: 10 });
    if (data.up.bench) { spots.push({ x: 5, y: 11 }); spots.push({ x: 7, y: 11 }); }
    if (data.up.info) spots.push({ x: 5, y: 10 });
    if (data.build.pool) { spots.push({ x: hi + 1, y: m }); spots.push({ x: hi + 1, y: m + 1 }); }
    spots.push({ x: 6, y: 11 });
    return spots.filter(function (p) { return inBounds(p.x, p.y) && !insideRect(p.x, p.y) && !occTiles[p.x + "," + p.y]; });
  }
  function spawnVisitor() {
    var spots = tycoonSpots();
    if (!spots.length) return;
    var pick = spots[Math.floor(Math.random() * spots.length)];
    var sx = enterTile.x, sy = enterTile.y;
    if (entityAt(sx, sy) || occTiles[sx + "," + sy]) {
      var alt = tycoonSpots().filter(function (p) { return !entityAt(p.x, p.y); });
      if (!alt.length) return;
      var a = alt[Math.floor(Math.random() * alt.length)];
      sx = a.x; sy = a.y;
      pick = a;
    }
    var v = {
      x: sx, y: sy, fx: sx, fy: sy, tx: sx, ty: sy, wx: pick.x, wy: pick.y,
      speed: 2.3, pause: 0, tile: "visitor",
      look: 2 + Math.random() * 3,
      state: "walk", opts: visitorOpts()
    };
    set_tile(sx, sy, "visitor", v.opts);
    visitors.push(v);
  }

  for (var fi = 0; fi < 70; fi++) flakes.push({ x: Math.random() * GW, y: Math.random() * GH, r: 1 + Math.random() * 2.2, sp: 12 + Math.random() * 30, ph: Math.random() * 6.28 });

  /* ——— overlay projection: replicate the engine's iso math ——— */
  function tileMetrics() {
    var r = tilesEl.getBoundingClientRect();
    var tw = Math.max(8, Math.min(r.width / N * 0.95, r.height * 0.8 / (N / 2)));
    var th = tw / 2, k = tw / 64;
    return { tw: tw, th: th, ox: r.width / 2, oy: (r.height - N * th) / 2 + th / 2 + 8 * k, rw: r.width, rh: r.height };
  }
  function tileScreen(x, y) {
    // engine works in CSS px; the ghost canvas is GW x GH backing pixels
    var M = tileMetrics();
    return { x: (M.ox + (x - y) * M.tw / 2) / M.rw * GW, y: (M.oy + (x + y) * M.th / 2) / M.rh * GH };
  }

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
    } else if (escaped) {
      fxEl.hidden = false;
      fxEl.textContent = "🐧 ESCAPED! Tap its tile! " + Math.ceil(escaped.t) + "s";
    } else { fxEl.hidden = true; }
    try {
      setSnapshot({ mode: escaped ? "event" : "playing", game: "Penguin Park Tycoon", coins: Math.floor(data.coins), visitors: visitors.length, level: lvl + 1, penguins: totalTycoonPenguins(data), income: Math.round(incomePerSec() * 10) / 10 });
    } catch (e) {}
  }

  function fmt(n) { return "$" + n; }
  function addPopup(tx, ty, text, col, dur) {
    popups.push({ tx: tx, ty: ty, text: text, t: 0, dur: dur || 1.1, col: col || "#8a5f14" });
  }

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
      sheetSub.textContent = " — the tile map rebuilds as you buy";
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
    var vis = penguins.length;
    var p = vis < 10 ? spawnPenguinVisual(t.id) : null;
    if (p) {
      penguins.push(p);
      assignSwimmers();
      addPopup(p.x, p.y, t.emoji + " new friend!", "#1e4a7a", 1.4);
    }
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
    buildParkStatics();
    relocateEntities();
    var at = attractionTiles[b.id] || gateTile;
    addPopup(at.x, at.y, b.emoji + " " + b.name + "!", "#1e7a4a", 1.6);
    msgEl.textContent = b.name + " built! The tile map grows. 🛠️";
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
    buildParkStatics();
    relocateEntities();
    var at = stallTiles[u.id] || enterTile;
    addPopup(at.x, at.y, u.emoji + " " + u.name + "!", "#7a4a1e", 1.6);
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
        addPopup(gateTile.x, gateTile.y, "⭐ " + TYCOON_LEVELS[nl].name + "!", "#8a5f14", 2);
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

  function freeOutsideTile() {
    for (var tries = 0; tries < 60; tries++) {
      var x = Math.floor(Math.random() * N), y = Math.floor(Math.random() * N);
      if (insideRect(x, y)) continue;
      if (occTiles[x + "," + y]) continue;
      if (entityAt(x, y)) continue;
      return { x: x, y: y };
    }
    return null;
  }
  function spawnEscaped() {
    var t = freeOutsideTile();
    if (!t) return;
    escaped = {
      x: t.x, y: t.y, fx: t.x, fy: t.y, tx: t.x, ty: t.y,
      speed: 3.6, pause: 0, tile: "penguin",
      opts: { scarf: "#ff6b6b", flip: 0 }, t: 20
    };
    set_tile(t.x, t.y, "penguin", escaped.opts);
    msgEl.textContent = "🐧💨 An escaped penguin is loose OUTSIDE the walls! Tap its tile! (20s)";
  }

  function triggerEvent() {
    if (!bubbles.hidden) return;
    var ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    if (totalTycoonPenguins(data) < 1) ev = EVENTS[1];
    if (ev.kind === "escape") {
      showBubble({
        emoji: ev.emoji, title: ev.title, sub: ev.sub, body: ev.body, btn: ev.btn, kind: "escape",
        fn: spawnEscaped
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
          addPopup(gateTile.x, gateTile.y, "+$150 famous visit!", "#8a5f14", 1.8);
        }
      });
    }
    refreshHUD();
  }

  /* ——— overlay: snow + tile-anchored popups on the ghost canvas ——— */
  function renderOverlay() {
    gtx.clearRect(0, 0, GW, GH);
    // falling snow
    var big = fx && fx.kind === "snow";
    gtx.fillStyle = "rgba(255,255,255,0.9)";
    for (var i = 0; i < flakes.length; i++) {
      var f = flakes[i];
      gtx.globalAlpha = 0.35 + 0.5 * Math.abs(Math.sin(f.ph));
      gtx.beginPath();
      gtx.arc(f.x, f.y, f.r * (big ? 2 : 1), 0, 6.29);
      gtx.fill();
    }
    gtx.globalAlpha = 1;
    // popups
    gtx.textAlign = "center";
    for (var pi = popups.length - 1; pi >= 0; pi--) {
      var pp = popups[pi];
      var a = 1 - pp.t / pp.dur;
      var s = tileScreen(pp.tx, pp.ty);
      var ppy = s.y - 34 - pp.t * 30;
      gtx.globalAlpha = Math.max(0, a);
      gtx.font = "bold 13px sans-serif";
      var tw = gtx.measureText(pp.text).width + 18;
      gtx.fillStyle = "#ffffff";
      gtx.strokeStyle = "#2b3a4d";
      gtx.lineWidth = 3;
      gtx.beginPath();
      if (gtx.roundRect) gtx.roundRect(s.x - tw / 2, ppy - 16, tw, 22, 8);
      else gtx.rect(s.x - tw / 2, ppy - 16, tw, 22);
      gtx.fill(); gtx.stroke();
      gtx.fillStyle = pp.col || "#8a5f14";
      gtx.fillText(pp.text, s.x, ppy);
      gtx.globalAlpha = 1;
    }
    // viral confetti
    if (fx && fx.kind === "viral") {
      gtx.font = "14px sans-serif"; gtx.textAlign = "left";
      for (var c = 0; c < 8; c++) {
        var ccx = (c * 173 + time * 60) % GW, ccy = 30 + (c * 67 % 60) + Math.sin(time * 3 + c) * 6;
        gtx.fillText(["📸", "💰", "🐧", "⭐"][c % 4], ccx, ccy);
      }
    }
  }

  /* ——— simulation ——— */
  function pickPenguinTarget(p) {
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    var opts = [];
    for (var i = 0; i < 4; i++) {
      var nx = p.x + dirs[i][0], ny = p.y + dirs[i][1];
      if (!inBounds(nx, ny) || !insideRect(nx, ny)) continue;
      if (nx === gateTile.x && ny === gateTile.y) continue;
      if (occTiles[nx + "," + ny]) continue;
      if (entityAt(nx, ny, p)) continue;
      opts.push({ x: nx, y: ny });
    }
    if (!opts.length) {
      p.pause = 0.4 + Math.random() * 0.5;
      return;
    }
    var pick = opts[Math.floor(Math.random() * opts.length)];
    p.tx = pick.x; p.ty = pick.y;
    if (pick.x !== p.x) p.opts.flip = pick.x > p.x ? 1 : 0;
  }
  function stepPenguin(p, dt) {
    if (p.pet > 0) p.pet -= dt;
    if (p.swim && pondTiles.length) {
      // lazy circuit around the middle of the pond
      p.st += dt;
      if (p.st > 0.12) {
        p.st = 0;
        p.sa += 0.3;
        p.tx = pondCX() + Math.cos(p.sa) * pondRX();
        p.ty = pondCY() + Math.sin(p.sa) * pondRY();
        var nf = Math.cos(p.sa) > 0 ? 1 : 0;
        if (nf !== p.opts.flip) { p.opts.flip = nf; set_tile(p.x, p.y, "swimmer", p.opts); }
      }
      p.speed = 1.1;
      glideToward(p, dt);
      return;
    }
    p.speed = 1.7;
    if (p.pause > 0) { p.pause -= dt; return; }
    if (glideToward(p, dt)) {
      // arrived: idle a beat, maybe turn, otherwise waddle on
      if (Math.random() < 0.45) {
        p.pause = 0.25 + Math.random() * 0.7;
        if (Math.random() < 0.5) { p.opts.flip = p.opts.flip ? 0 : 1; set_tile(p.x, p.y, "penguin", p.opts); }
      } else {
        pickPenguinTarget(p);
      }
    }
  }

  // Visitors hold a far waypoint (wx, wy) but glide one neighbouring tile at
  // a time (tx, ty), so crowds flow around walls, stalls and each other.
  function stepVisitor(v, dt) {
    if (v.state === "look") {
      v.look -= dt;
      if (v.look <= 0) {
        var ns, pick;
        if (Math.random() < 0.10) {
          v.state = "leave";
          v.wx = enterTile.x; v.wy = enterTile.y;
        } else {
          ns = tycoonSpots();
          pick = ns[Math.floor(Math.random() * ns.length)];
          v.wx = pick.x; v.wy = pick.y;
          v.state = "walk";
        }
        v.tx = v.x; v.ty = v.y; // arrived: next frame picks the first step
      }
      return;
    }
    if (v.pause > 0) { v.pause -= dt; return; }
    if (!glideToward(v, dt)) return; // still gliding to the step target
    if (v.tx === v.wx && v.ty === v.wy) {
      if (v.state === "leave") {
        remove_object(v.x, v.y);
        visitors.splice(visitors.indexOf(v), 1);
        return;
      }
      v.state = "look";
      v.look = 1.5 + Math.random() * 3;
      return;
    }
    var dx = v.wx - v.fx, dy = v.wy - v.fy;
    var cands = [];
    if (Math.abs(dx) >= Math.abs(dy)) {
      if (dx !== 0) cands.push({ x: v.x + (dx > 0 ? 1 : -1), y: v.y });
      if (dy !== 0) cands.push({ x: v.x, y: v.y + (dy > 0 ? 1 : -1) });
    } else {
      if (dy !== 0) cands.push({ x: v.x, y: v.y + (dy > 0 ? 1 : -1) });
      if (dx !== 0) cands.push({ x: v.x + (dx > 0 ? 1 : -1), y: v.y });
    }
    var ok = [];
    for (var i = 0; i < cands.length; i++) {
      var c = cands[i];
      if (!inBounds(c.x, c.y) || insideRect(c.x, c.y)) continue;
      if (occTiles[c.x + "," + c.y]) continue;
      if (entityAt(c.x, c.y, v)) continue;
      ok.push(c);
    }
    if (!ok.length) { v.pause = 0.25 + Math.random() * 0.2; return; }
    var step = (Math.random() < 0.12 && ok.length > 1) ? ok[1] : ok[0];
    v.tx = step.x; v.ty = step.y;
  }

  function update(dt) {
    time += dt;
    // overlay snowflakes
    var wind = (fx && fx.kind === "snow") ? 40 : 8;
    for (var i = 0; i < flakes.length; i++) {
      var f = flakes[i];
      f.y += (f.sp * ((fx && fx.kind === "snow") ? 2.4 : 1)) * dt;
      f.x += Math.sin(time + f.ph) * wind * dt;
      if (f.y > GH) { f.y = -6; f.x = Math.random() * GW; }
    }
    // income
    var ips = incomePerSec();
    if (ips > 0) {
      data.coins += ips * dt;
      data.earned += ips * dt;
      popupTimer += dt;
      if (popupTimer > 2.2 && visitors.length > 0) {
        popupTimer = 0;
        var chunk = Math.max(1, Math.round(ips * 2.2));
        var v = visitors[Math.floor(Math.random() * visitors.length)];
        if (v) addPopup(v.x, v.y, "+$" + chunk);
      }
    }
    // visitors toward cap
    var cap = tycoonCap(data) * ((fx && fx.kind === "viral") ? 1.6 : 1);
    cap = Math.min(60, cap);
    var want = Math.min(16, Math.round(cap));
    if (visitors.length < want && Math.random() < dt * 2.2) spawnVisitor();
    if (visitors.length > want && Math.random() < dt * 1.2) {
      for (var mi = 0; mi < visitors.length; mi++) {
        if (visitors[mi].state !== "leave") {
          visitors[mi].state = "leave";
          visitors[mi].wx = enterTile.x; visitors[mi].wy = enterTile.y;
          visitors[mi].tx = visitors[mi].x; visitors[mi].ty = visitors[mi].y;
          break;
        }
      }
    }
    for (var vi = visitors.length - 1; vi >= 0; vi--) {
      if (visitors[vi]) stepVisitor(visitors[vi], dt);
    }
    for (var pi = 0; pi < penguins.length; pi++) stepPenguin(penguins[pi], dt);
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
    // escaped penguin dashes between outside tiles (smooth glide + flip)
    if (escaped) {
      escaped.t -= dt;
      if (glideToward(escaped, dt)) {
        escaped.opts.flip = escaped.opts.flip ? 0 : 1;
        var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        var opts = [];
        for (var ei = 0; ei < 4; ei++) {
          var ex = escaped.x + dirs[ei][0], ey = escaped.y + dirs[ei][1];
          if (!inBounds(ex, ey) || insideRect(ex, ey)) continue;
          if (occTiles[ex + "," + ey]) continue;
          if (entityAt(ex, ey, escaped)) continue;
          opts.push({ x: ex, y: ey });
        }
        if (opts.length) {
          var pk = opts[Math.floor(Math.random() * opts.length)];
          escaped.tx = pk.x; escaped.ty = pk.y;
        } else {
          escaped.pause = 0.2;
          set_tile(escaped.x, escaped.y, "penguin", escaped.opts);
        }
      }
      if (escaped.t <= 0) {
        remove_object(escaped.x, escaped.y);
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
    update(dt);
    renderOverlay();
    raf = requestAnimationFrame(tick);
  }

  /* ——— tile clicks: pet penguins, catch the escapee ——— */
  function onTileClick(x, y) {
    if (escaped && escaped.x === x && escaped.y === y) {
      remove_object(x, y);
      escaped = null;
      data.coins += 50; data.earned += 50;
      addPopup(x, y, "FOUND! +$50", "#1e7a4a", 1.6);
      msgEl.textContent = "🐧 PENGUIN FOUND! +$50 bonus. Crisis averted.";
      blip(780, 0.15, "triangle"); setTimeout(function () { blip(1040, 0.2, "triangle"); }, 110);
      eventTimer = 55 + Math.random() * 25;
      tycoonSave(data); refreshHUD();
      return;
    }
    for (var i = 0; i < penguins.length; i++) {
      var p = penguins[i];
      if (!p.swim && p.x === x && p.y === y && p.pet <= 0) {
        p.pet = 1.2;
        data.coins += 1; data.earned += 1;
        addPopup(x, y, "+$1 ❤", "#c94a6a", 0.9);
        blip(900 + Math.random() * 200, 0.07, "sine");
        try { recordScore("tycoon", Math.floor(data.earned), "high"); } catch (err) {}
        refreshHUD();
        return;
      }
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
    if (escaped) { try { remove_object(escaped.x, escaped.y); } catch (e) {} escaped = null; }
    buildParkStatics();
    rebuildPenguins();
    visitors = []; popups = []; fx = null; eventTimer = 45;
    sheet.hidden = true; sheetTab = null;
    msgEl.textContent = "Fresh ice. One penguin. Infinite dreams.";
    tycoonSave(data); refreshHUD();
  });

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
    renderOverlay();
  };
  activeCleanup = function () {
    rafActive = false;
    cancelAnimationFrame(raf);
    document.removeEventListener("keydown", keydown);
    try { TileEngine.animate(false); } catch (e) {}
    try { TileEngine.on("click", undefined); TileEngine.on("hover", undefined); } catch (e) {}
    try { tycoonSave(data); } catch (e) {}
  };

  /* ——— boot the tile scene ——— */
  registerCustomTiles();
  registerSmoothCritters();
  try {
    TileEngine.init({ canvas: "#ptyTiles", size: N });
    TileEngine.animate(true);
    TileEngine.on("click", onTileClick);
  } catch (e) {}
  buildParkStatics();
  rebuildPenguins();
  msgEl.textContent = totalTycoonPenguins(data) > 1
    ? "Welcome back! " + totalTycoonPenguins(data) + " penguins missed you. Tap a penguin to pet it (+$1)."
    : "One penguin. One dream. Tap it to pet it (+$1). Save $50 for penguin #2!";
  refreshHUD();
  last = performance.now();
  raf = requestAnimationFrame(tick);
  try { if (window.fitGameShell) requestAnimationFrame(function () { requestAnimationFrame(window.fitGameShell); }); } catch (e) {}
  try { requestAnimationFrame(function () { try { TileEngine.resize(); } catch (e) {} }); } catch (e) {}
}

Object.assign(gameStarters, { tycoon: startPenguinTycoon, parktycoon: startPenguinTycoon, penguinTycoon: startPenguinTycoon });
