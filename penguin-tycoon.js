/* Penguin Park Tycoon — RollerCoaster Tycoon + penguins + tiny-game simplicity.
   Scene runs on tile-engine.js (isometric tiles, auto-joining ice walls,
   layered objects). Economy, shops, HUD and bubble events live here. */

var TYCOON_KEY = "trinkets-tycoon-v1";

var TYCOON_TYPES = [
  { id: "normal",  name: "Normal Penguin",  emoji: "🐧", cost: 50,    income: 2,   scarf: null,      desc: "+$2/sec · reliable" },
  { id: "baby",    name: "Baby Penguin",    emoji: "🐤", cost: 175,   income: 5,   scarf: "#ff8fb1", desc: "+$5/sec · tiny & loud" },
  { id: "emperor", name: "Emperor Penguin", emoji: "👑", cost: 600,   income: 15,  scarf: "#ffffff", desc: "+$15/sec · royal glide" },
  { id: "golden",  name: "Golden Penguin",  emoji: "✨", cost: 3000,   income: 75,  scarf: "#ffd93d", desc: "+$75/sec · extremely shiny" },
  { id: "mystery", name: "??? Penguin",     emoji: "🌀", cost: 12000,  income: 300,  scarf: "#8a7dff", desc: "+$300/sec · do not ask" },
  { id: "robot",   name: "Robot Penguin",   emoji: "🤖", cost: 30000,  income: 700,  scarf: "#6c8cff", desc: "+$700/sec · beep boop waddle" },
  { id: "diamond", name: "Diamond Penguin", emoji: "💎", cost: 75000,  income: 1600, scarf: "#9fdcf3", desc: "+$1,600/sec · dangerously shiny" },
  { id: "cosmic",  name: "Cosmic Penguin",  emoji: "🛸", cost: 200000, income: 4000, scarf: "#ff8fb1", desc: "+$4,000/sec · from beyond the ice" }
];

var TYCOON_BUILD = [
  { id: "enclosure", name: "Bigger Enclosure", emoji: "🏔️", base: 80,   scale: 1.7, max: 9, cap: 6,  bonus: 0.05, desc: "+6 visitors · a new pen every 2 buys" },
  { id: "snow",      name: "Snow Machine",     emoji: "❄️", cost: 200,  cap: 2,  bonus: 0.25, desc: "+25% income · happy flakes" },
  { id: "pool",      name: "Swimming Pool",    emoji: "🏊", cost: 350,  cap: 8,  bonus: 0.15, desc: "penguins swim in circles" },
  { id: "slide",     name: "Penguin Slide",    emoji: "🛝", cost: 450,  cap: 10, bonus: 0.20, desc: "wheee +20% income" },
  { id: "cave",      name: "Ice Cave",         emoji: "🧊", cost: 650,  cap: 12, bonus: 0.25, desc: "mysterious & cold" },
  { id: "climb",     name: "Climbing Area",    emoji: "🧗", cost: 1000, cap: 15, bonus: 0.30, desc: "tiny harnesses included" },
  { id: "iceberg",   name: "Giant Iceberg",    emoji: "🏔️", cost: 1800, cap: 20, bonus: 0.50, desc: "the centrepiece · +50%" },
  { id: "stage",     name: "Penguin Stage",    emoji: "🎤", cost: 4500,  cap: 10, bonus: 0.25, desc: "live waddle shows nightly" }
];

var TYCOON_UPGRADES = [
  { id: "bench",   name: "Benches",           emoji: "🪑", cost: 50,   cap: 3,  bonus: 0.02, desc: "sit & stare at penguins" },
  { id: "toilets", name: "Toilets 💀",        emoji: "🚻", cost: 100,  cap: 4,  bonus: 0.05, desc: "nobody asks why it helps" },
  { id: "food",    name: "Food Stand",        emoji: "🍿", cost: 150,  cap: 6,  bonus: 0.10, desc: "ice cream sells itself" },
  { id: "gift",    name: "Gift Shop",         emoji: "🎁", cost: 450,  cap: 8,  bonus: 0.15, desc: "plushies?? plushies." },
  { id: "info",    name: "Information Centre",emoji: "ℹ️", cost: 500,  cap: 6,  bonus: 0.12, desc: "penguin facts, loudly" },
  { id: "plush",   name: "Penguin Plushies",  emoji: "🧸", cost: 650,  cap: 10, bonus: 0.18, desc: "take the park home" },
  { id: "cocoa",   name: "Hot Cocoa Stand",   emoji: "🍫", cost: 1800,  cap: 6,  bonus: 0.12, desc: "warm beaks, warm hearts" },
  { id: "parade",  name: "Penguin Parade",     emoji: "🎺", cost: 3000,  cap: 8,  bonus: 0.20, desc: "marching band, waddling" },
  { id: "lights",  name: "Night Lights",      emoji: "💡", cost: 9000,  cap: 10, bonus: 0.30, desc: "the park glows after dark" },
  { id: "festival", name: "Snow Festival",     emoji: "🎆", cost: 22000, cap: 15, bonus: 0.50, desc: "the biggest night of the year" }
];

// Pure level ladder: Level 1, Level 2, Level 3... no names.
var TYCOON_LEVELS = [
  { at: 0 }, { at: 100 }, { at: 350 }, { at: 900 }, { at: 1800 },
  { at: 3500 }, { at: 7000 }, { at: 18000 }, { at: 40000 }, { at: 80000 },
  { at: 150000 }, { at: 250000 }, { at: 400000 }, { at: 650000 }, { at: 1000000 }
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
    if (typeof d.coins !== "number") d.coins = 100;
    if (!d.counts) d.counts = { normal: 1 };
    if (!d.build) d.build = {};
    if (!d.up) d.up = {};
    if (typeof d.enclosure !== "number") d.enclosure = 0;
    if (typeof d.spent !== "number") d.spent = 0;
    if (typeof d.earned !== "number") d.earned = 0;
    if (typeof d.best !== "number") d.best = 0;
    if (typeof d.seed !== "number") d.seed = Math.floor(Math.random() * 1e9);
    if (!d.counts.normal && totalTycoonPenguins(d) === 0) d.counts.normal = 1;
    return d;
  }
  return { coins: 100, counts: { normal: 1 }, build: {}, up: {}, enclosure: 0, spent: 0, earned: 0, best: 0, seed: Math.floor(Math.random() * 1e9) };
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
        '<span class="pty-pill" id="ptyCoins">🪙 $100</span>' +
        '<span class="pty-pill" id="ptyVis">👥 0 Visitors</span>' +
        '<span class="pty-pill pty-level" id="ptyLvl">⭐ Level 1' +
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
        '<button class="pty-btn build" id="ptyBuildBtn" type="button"><span aria-hidden="true">➕</span> BUILD<span class="pty-dot" id="ptyDotBuild" hidden></span></button>' +
        '<button class="pty-btn peng" id="ptyPengBtn" type="button"><span aria-hidden="true">🐧</span> PENGUINS<span class="pty-dot" id="ptyDotPeng" hidden></span></button>' +
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
  var dotPengEl = document.querySelector("#ptyDotPeng");
  var dotBuildEl = document.querySelector("#ptyDotBuild");
  var sheetRows = [];
  var lastSheetLive = -99;

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
  var pens = [];   // pen rects [{x0,y0,x1,y1}] — 1 starter pen, up to 5 in the resort era
  var gates = [];  // one gate tile per pen
  function isGate(x, y) {
    for (var gi = 0; gi < gates.length; gi++) if (gates[gi].x === x && gates[gi].y === y) return true;
    return false;
  }
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
        // tall slide tower: ladder frame ~40px high, red chute with white stripe
        T.shadow(0.9, 0.5);
        T.box(-0.4, -0.34, -0.28, 0.3, 40, ["#8a93a1", "#6b7280", "#565d68"]);
        T.box(0.08, -0.34, 0.2, 0.3, 40, ["#8a93a1", "#6b7280", "#565d68"]);
        T.box(-0.4, -0.34, 0.2, -0.24, 2, ["#8a93a1", "#6b7280", "#565d68"], 40);
        for (var r = 0; r < 4; r++) {
          T.poly([T.P(-0.4, -0.3 + r * 0.16, 6 + r * 8), T.P(0.2, -0.3 + r * 0.16, 6 + r * 8),
                  T.P(0.2, -0.24 + r * 0.16, 6 + r * 8), T.P(-0.4, -0.24 + r * 0.16, 6 + r * 8)], "#565d68");
        }
        T.poly([T.P(-0.34, -0.34, 40), T.P(0.14, -0.34, 40), T.P(0.46, 0.36, 4), T.P(-0.02, 0.36, 4)], "#ff7f6e");
        T.poly([T.P(-0.34, -0.34, 40), T.P(-0.1, -0.34, 40), T.P(0.2, 0.36, 4), T.P(-0.02, 0.36, 4)], "#ffffff");
      }});
      TileEngine.register("iceberg", { layer: "object", draw: function (T) {
        // big berg: wide base, z-lifted twin peaks, snow glints
        T.shadow(1.0, 0.55);
        T.poly([T.P(-0.46, 0.24), T.P(-0.14, -0.44), T.P(0.06, -0.14), T.P(0.3, -0.4), T.P(0.48, 0.24)], "#dff2ff");
        T.poly([T.P(-0.14, -0.44), T.P(-0.14, -0.44, 16), T.P(0.3, -0.4, 16), T.P(0.3, -0.4)], "#bfe6f7");
        T.poly([T.P(-0.14, -0.44), T.P(-0.04, -0.26), T.P(-0.2, -0.24)], "#ffffff");
        T.poly([T.P(0.3, -0.4), T.P(0.34, -0.28), T.P(0.24, -0.28)], "#ffffff");
        T.poly([T.P(-0.3, -0.05), T.P(-0.2, -0.12), T.P(-0.32, -0.16)], "#ffffff", null);
      }});
      TileEngine.register("snowmaker", { layer: "object", draw: function (T) {
        T.shadow(0.6, 0.4);
        T.box(-0.2, -0.2, 0.2, 0.2, 14, ["#c7cfdb", "#8a93a1", "#565d68"]);
        T.poly([T.P(-0.2, -0.2, 14), T.P(-0.32, -0.32, 26), T.P(-0.08, -0.32, 26), T.P(0.04, -0.2, 14)], "#6b7280");
        T.poly([T.P(-0.3, -0.3, 26), T.P(-0.1, -0.3, 26), T.P(-0.2, -0.42, 26)], "#ffffff");
      }});
      // gift shop: teal kiosk with a pressie + bow on top
      TileEngine.register("giftshop", { layer: "object", draw: function (T) {
        T.shadow(0.95, 0.85);
        T.box(-0.38, -0.3, 0.38, 0.3, 22, ["#fff6ea", "#4dd0c4", "#2f8f82"]);
        T.box(-0.3, 0.3, 0.3, 0.4, 2.5, ["#fff", "#ffe3a0", "#d9b45a"], 9);
        for (var i = 0; i < 4; i++) T.box(-0.46 + i * 0.23, -0.35, -0.46 + (i + 1) * 0.23, 0.48, 5,
          i % 2 ? ["#fff", "#e8eef7", "#c7d3e6"] : ["#4dd0c4", "#9be8da", "#2f8f82"], 24);
        T.box(-0.15, -0.08, 0.15, 0.18, 10, ["#ffe3b0", "#ff8fb1", "#d95f8f"], 29);
        T.box(-0.03, -0.08, 0.03, 0.18, 12, ["#fff", "#ffe3a0", "#d9b45a"], 29);
        T.poly([T.P(-0.13, 0.1, 39), T.P(-0.03, 0.1, 44), T.P(-0.03, 0.1, 39)], "#ff5d6e");
        T.poly([T.P(0.13, 0.1, 39), T.P(0.03, 0.1, 44), T.P(0.03, 0.1, 39)], "#ff5d6e");
      }});
      // plush stall: purple kiosk with a stack of toy boxes
      TileEngine.register("plushstall", { layer: "object", draw: function (T) {
        T.shadow(0.95, 0.85);
        T.box(-0.38, -0.3, 0.38, 0.3, 22, ["#f3e8ff", "#c4a5f5", "#6a4c93"]);
        T.box(-0.3, 0.3, 0.3, 0.4, 2.5, ["#fff", "#ffe3a0", "#d9b45a"], 9);
        for (var j = 0; j < 4; j++) T.box(-0.46 + j * 0.23, -0.35, -0.46 + (j + 1) * 0.23, 0.48, 5,
          j % 2 ? ["#fff", "#e8eef7", "#c7d3e6"] : ["#8a7dff", "#b3a5ff", "#4a3aa0"], 24);
        T.box(-0.2, -0.12, 0.02, 0.1, 8, ["#ffe3b0", "#ff8fb1", "#d95f8f"], 29);
        T.box(0.0, -0.12, 0.22, 0.1, 8, ["#fff6ea", "#ffd93d", "#c98a1b"], 29);
        T.box(-0.1, -0.12, 0.1, 0.06, 16, ["#fff6ea", "#4dd0c4", "#2f8f82"], 29);
      }});
      // cocoa stand: brown kiosk with a steaming mug on top
      TileEngine.register("cocoastand", { layer: "object", draw: function (T) {
        T.shadow(0.95, 0.85);
        T.box(-0.38, -0.3, 0.38, 0.3, 22, ["#fff6ea", "#c58a52", "#8a5a30"]);
        T.box(-0.3, 0.3, 0.3, 0.4, 2.5, ["#fff", "#ffe3a0", "#d9b45a"], 9);
        for (var k = 0; k < 4; k++) T.box(-0.46 + k * 0.23, -0.35, -0.46 + (k + 1) * 0.23, 0.48, 5,
          k % 2 ? ["#fff", "#e8eef7", "#c7d3e6"] : ["#c58a52", "#e0a866", "#8a5a30"], 24);
        T.box(-0.1, -0.04, 0.1, 0.12, 9, ["#ffffff", "#e8eef7", "#aeb9c9"], 29);
        T.poly([T.P(-0.1, -0.04, 38), T.P(0.1, -0.04, 38), T.P(0.1, 0.12, 38), T.P(-0.1, 0.12, 38)], "#6b4a2f", null);
        T.poly([T.P(-0.05, 0.12, 44), T.P(-0.02, 0.12, 48), T.P(0.0, 0.12, 44)], "#ffffff", null);
        T.poly([T.P(0.05, 0.12, 44), T.P(0.08, 0.12, 48), T.P(0.1, 0.12, 44)], "#ffffff", null);
      }});
    } catch (e) {}
  }

  /* ——— smooth critters: glide between tiles instead of hopping ———
     The engine draws objects per-tile, so we override the penguin / visitor /
     swimmer painters with versions drawn at a fractional tile offset. Each
     entity keeps a float position (fx, fy); its grid tile only flips when it
     crosses a boundary, so painter-order depth stays exactly correct. */
  // darken/lighten a #rrggbb colour for fake depth shading
  function shade(hex, f) {
    var n = parseInt(String(hex).slice(1), 16);
    if (isNaN(n)) return hex;
    var r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * f)));
    var g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * f)));
    var b = Math.min(255, Math.max(0, Math.round((n & 255) * f)));
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  // Screen-space sprite helper: critters stand UPRIGHT (billboarded, like the
  // engine's own sprites) instead of sheared into the ground plane. Units are
  // engine-local px (64 = 1 tile width); only the glide offset uses tile math.
  function spHelper(T, dx, dy, bobFrac) {
    var k = T.k;
    var ox = (dx - dy) * 32 * k, oy = (dx + dy) * 16 * k - (bobFrac || 0) * k;
    var cx = T.cx + ox, cy = T.cy + oy;
    function pt(u, v) { return [cx + u * k, cy + v * k]; }
    function ell(cu, cv, ru, rv, rot, n) {
      var pts = [], i, a, ex, ey, cr = Math.cos(rot || 0), sr = Math.sin(rot || 0);
      n = n || 14;
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
  // Every penguin type gets its own silhouette and details.
  var PENG_SPRITES = {
    normal:  { body: "#27406b", belly: "#ffffff", beak: "#ffb02e", feet: "#ff9f43", ws: 1,    hs: 1 },
    baby:    { body: "#2b3a52", belly: "#fff3d6", beak: "#ffb02e", feet: "#ff9f43", ws: 0.8,  hs: 0.74, tuft: true, bigEyes: true },
    emperor: { body: "#1f314f", belly: "#fff0a0", beak: "#f6c445", feet: "#f6c445", ws: 1.06, hs: 1.18, crown: true },
    golden:  { body: "#e8a100", belly: "#fff3bf", beak: "#c07f00", feet: "#c07f00", ws: 1.02, hs: 1.05, glints: true },
    mystery: { body: "rainbow", belly: "#e5dbff", beak: "#ff9f2e", feet: "#ff9f43", ws: 1.02, hs: 1.05, dots: true },
    robot:   { body: "#c0c8d4", belly: "#e8f0ff", beak: "#ff9f2e", feet: "#4a5a6b", ws: 1.02, hs: 1.02, robot: true },
    diamond: { body: "#bfe6f7", belly: "#ffffff", beak: "#4f8fcf", feet: "#4f8fcf", ws: 1,    hs: 1.05, facets: true },
    cosmic:  { body: "#3a2a6e", belly: "#241a4d", beak: "#ffd166", feet: "#ffd166", ws: 1.04, hs: 1.08, stars: true }
  };
  function drawGlidePenguin(T, o, e) {
    var H = spHelper(T, e.fx - e.x, e.fy - e.y, T.bob());
    var Sh = spHelper(T, e.fx - e.x, e.fy - e.y, 0);
    var flip = o.flip ? -1 : 1;
    var P = PENG_SPRITES[e.type] || PENG_SPRITES.normal;
    var ws = P.ws, hs = P.hs;
    var body = P.body === "rainbow" ? "hsl(" + Math.floor(time * 120 % 360) + ",70%,55%)" : P.body;
    var rim = P.body === "rainbow" ? "#4a3aa0" : shade(P.body, 0.55);
    var eyeR = P.bigEyes ? 3.4 : 2.5, pupR = P.bigEyes ? 1.7 : 1.2;
    Sh.poly(Sh.ell(2, 1, 12 * ws, 4), "rgba(47,84,134,.25)", null);
    // feet + flippers in type colours
    H.poly(H.ell(-4.5 * flip * ws, -1 * hs, 4.5 * ws, 2.2 * hs), P.feet);
    H.poly(H.ell(5 * flip * ws, -1 * hs, 4.5 * ws, 2.2 * hs), P.feet);
    H.poly(H.ell(-11 * flip * ws, -14 * hs, 3 * ws, 8 * hs, 0.25 * flip), rim);
    H.poly(H.ell(11 * flip * ws, -14 * hs, 3 * ws, 8 * hs, -0.25 * flip), rim);
    // body + back rim + belly
    H.poly(H.ell(0, -15 * hs, 11 * ws, 15 * hs), body);
    H.poly(H.ell(-6 * flip * ws, -15 * hs, 5 * ws, 13 * hs, -0.06 * flip), rim, null);
    H.poly(H.ell(2 * flip * ws, -12 * hs, 7 * ws, 11 * hs), P.belly, null);
    H.poly(H.ell(-7 * flip * ws, -26 * hs, 2.5 * ws, 3.5 * hs, -0.35 * flip), "rgba(255,255,255,.8)", null);
    if (P.robot) {
      // antenna + glowing visor instead of a face
      var lit = Math.floor(time * 2) % 2 === 0;
      H.poly([H.pt(-1, -40 * hs), H.pt(1, -40 * hs), H.pt(1, -33 * hs), H.pt(-1, -33 * hs)], "#4a5a6b");
      H.poly(H.ell(0, -42 * hs, 2, 2), lit ? "#ff5b5b" : "#7a1010", null);
      H.poly([H.pt(-7.5 * ws, -25.5 * hs), H.pt(7.5 * ws, -25.5 * hs), H.pt(7.5 * ws, -19 * hs), H.pt(-7.5 * ws, -19 * hs)], "#1a2330");
      H.poly(H.ell(-3.5 * ws, -22.5 * hs, 1.6, 1.6), "#00ffaa", null);
      H.poly(H.ell(3.5 * ws, -22.5 * hs, 1.6, 1.6), "#00ffaa", null);
      H.poly([H.pt(-5 * ws, -8 * hs), H.pt(5 * ws, -8 * hs), H.pt(5 * ws, -6.5 * hs), H.pt(-5 * ws, -6.5 * hs)], shade(P.body, 0.8));
    } else {
      // face
      H.poly(H.ell(0, -22 * hs, eyeR * ws, eyeR * hs), "#ffffff", null);
      H.poly(H.ell(7 * flip * ws, -22 * hs, eyeR * ws, eyeR * hs), "#ffffff", null);
      H.poly(H.ell(0.8 * flip * ws, -22 * hs, pupR, pupR), P.stars ? "#ffe066" : "#2a3f66", null);
      H.poly(H.ell(7.8 * flip * ws, -22 * hs, pupR, pupR), P.stars ? "#ffe066" : "#2a3f66", null);
      H.poly(H.ell(-2 * flip * ws, -18 * hs, 1.8 * ws, 1.8 * hs), "rgba(255,154,168,.85)", null);
      H.poly(H.ell(10 * flip * ws, -18 * hs, 1.8 * ws, 1.8 * hs), "rgba(255,154,168,.85)", null);
      H.poly([H.pt(3 * flip * ws, -19.5 * hs), H.pt(11.5 * flip * ws, -18 * hs), H.pt(3 * flip * ws, -15.5 * hs)], P.beak);
    }
    if (P.tuft) {
      H.poly([H.pt(-2.5 * flip * ws, -35 * hs), H.pt(2.5 * flip * ws, -35 * hs), H.pt(0, -43 * hs)], rim);
    }
    if (P.crown) {
      H.poly([H.pt(-7 * ws, -27 * hs), H.pt(7 * ws, -27 * hs), H.pt(7 * ws, -31 * hs), H.pt(-7 * ws, -31 * hs)], "#f6c445", "#8a5f14", 1.5);
      H.poly([H.pt(-7 * ws, -31 * hs), H.pt(-3.5 * ws, -36 * hs), H.pt(0, -31 * hs)], "#f6c445", "#8a5f14", 1.5);
      H.poly([H.pt(0, -31 * hs), H.pt(3.5 * ws, -36 * hs), H.pt(7 * ws, -31 * hs)], "#f6c445", "#8a5f14", 1.5);
      H.poly(H.ell(0, -29 * hs, 1.5, 1.5), "#ff5b5b", null);
    }
    if (P.glints) {
      H.poly([H.pt(-6 * ws, -24 * hs), H.pt(-3 * ws, -20 * hs), H.pt(-6 * ws, -16 * hs), H.pt(-9 * ws, -20 * hs)], "#ffffff", null);
      H.poly([H.pt(4 * ws, -28 * hs), H.pt(6 * ws, -25 * hs), H.pt(4 * ws, -22 * hs), H.pt(2 * ws, -25 * hs)], "#ffffff", null);
    }
    if (P.dots) {
      H.poly(H.ell(-2 * ws, -14 * hs, 1.4, 1.4), "#ffffff", null);
      H.poly(H.ell(3 * flip * ws, -11 * hs, 1.4, 1.4), "#ffffff", null);
      H.poly(H.ell(-1 * ws, -8 * hs, 1.2, 1.2), "#ffffff", null);
    }
    if (P.facets) {
      H.poly([H.pt(-8 * ws, -20 * hs), H.pt(-2 * ws, -14 * hs), H.pt(-3 * ws, -12 * hs), H.pt(-9 * ws, -18 * hs)], "#ffffff", null);
      H.poly([H.pt(2 * ws, -24 * hs), H.pt(8 * ws, -16 * hs), H.pt(7 * ws, -14 * hs), H.pt(1 * ws, -22 * hs)], "#ffffff", null);
      H.poly([H.pt(-4 * ws, -30 * hs), H.pt(-1 * ws, -26 * hs), H.pt(-4 * ws, -22 * hs), H.pt(-7 * ws, -26 * hs)], "#ffffff", null);
    }
    if (P.stars) {
      H.poly(H.ell(-2 * ws, -14 * hs, 1.2, 1.2), "#ffffff", null);
      H.poly(H.ell(3 * flip * ws, -10 * hs, 1.4, 1.4), "#ffffff", null);
      H.poly(H.ell(0, -6 * hs, 1, 1), "#ffffff", null);
    }
    if (o.scarf) {
      H.poly([H.pt(-9 * flip * ws, -16 * hs), H.pt(11 * flip * ws, -16 * hs), H.pt(11 * flip * ws, -11 * hs), H.pt(-9 * flip * ws, -11 * hs)], o.scarf);
      H.poly([H.pt(5 * flip * ws, -11 * hs), H.pt(9.5 * flip * ws, -11 * hs), H.pt(9.5 * flip * ws, -2 * hs), H.pt(5 * flip * ws, -2 * hs)], o.scarf);
    }
  }
  function drawGlideVisitor(T, o, e) {
    var H = spHelper(T, e.fx - e.x, e.fy - e.y, T.bob());
    var Sh = spHelper(T, e.fx - e.x, e.fy - e.y, 0);
    var coat = o.coat || "#6c8cff", hat = o.hat || "#ffffff";
    var dark = shade(coat, 0.72);
    Sh.poly(Sh.ell(0, 1, 11, 3.5), "rgba(47,84,134,.25)", null);
    // chunky legs
    H.poly([H.pt(-5.5, -10), H.pt(-1, -10), H.pt(-1, 0), H.pt(-5.5, 0)], "#2e3f66");
    H.poly([H.pt(1, -10), H.pt(5.5, -10), H.pt(5.5, 0), H.pt(1, 0)], "#2e3f66");
    // stubby sleeves
    H.poly(H.ell(-9, -16, 2.6, 6, 0.17), dark);
    H.poly(H.ell(9, -16, 2.6, 6, -0.17), dark);
    // coat: one body, one shaded side, done
    H.poly([H.pt(-7.5, -25), H.pt(7.5, -25), H.pt(7.5, -8), H.pt(-7.5, -8)], coat);
    H.poly([H.pt(2.5, -25), H.pt(7.5, -25), H.pt(7.5, -8), H.pt(2.5, -8)], dark);
    // head: skin + dot eyes, nothing else
    H.poly(H.ell(0, -31, 6.5, 6.5), "#ffd3b0");
    H.poly(H.ell(-2.3, -30.5, 1, 1), "#2a3f66", null);
    H.poly(H.ell(2.7, -30.5, 1, 1), "#2a3f66", null);
    // hat dome + pompom
    var hatPts = [], i, a;
    for (i = 0; i <= 8; i++) { a = Math.PI + i / 8 * Math.PI; hatPts.push(H.pt(Math.cos(a) * 6.8, -32 + Math.sin(a) * 6.8)); }
    H.poly(hatPts, hat);
    H.poly(H.ell(0, -40, 2.8, 2.8), "#ffffff", null);
  }
  function drawGlideSwimmer(T, o, e) {
    var H = spHelper(T, e.fx - e.x, e.fy - e.y, T.bob() * 0.5);
    var flip = o.flip ? -1 : 1;
    H.poly(H.ell(0, 2, 28, 10, 0, 20), null, "rgba(255,255,255,.85)", 2);
    H.poly(H.ell(0, 3, 21, 6, 0, 18), "#9fdcf3", "#ffffff", 2);
    H.poly(H.ell(-14 * flip, -2, 5, 2), "#1f3358");
    H.poly(H.ell(-4 * flip, -5, 13, 7), "#27406b");
    H.poly(H.ell(-4 * flip, -6, 8, 4, -0.1 * flip), "#16263f", null);
    H.poly(H.ell(8 * flip, -10, 7.5, 7.5), "#27406b");
    H.poly(H.ell(10.5 * flip, -11.5, 2.4, 2.4), "#ffffff", null);
    H.poly(H.ell(11.2 * flip, -11.5, 1.1, 1.1), "#2a3f66", null);
    H.poly([H.pt(14 * flip, -11), H.pt(22 * flip, -9), H.pt(14 * flip, -7)], "#ffb02e");
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
  function insideRect(x, y) {
    for (var i = 0; i < pens.length; i++) {
      var r = pens[i];
      if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) return true;
    }
    return false;
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

  // Layout templates: higher park tiers mirror/shift the composition and add
  // decor, so levelling visibly re-lays the park instead of piling objects on.
  function parkTemplate() {
    var lvl = tycoonLevel(data);
    var seed = data.seed || 0;
    var tier = lvl >= 6 ? 3 : lvl >= 4 ? 2 : lvl >= 2 ? 1 : 0;
    return {
      tier: tier,
      mirror: tier === 1 ? true : tier >= 2 ? (seed % 2 === (tier === 3 ? 0 : 1)) : false,
      pondEast: ((seed >> 1) % 2) === 1,
      lush: tier >= 2
    };
  }

  // The board grows with the park: 12 tiles, then 14, then 16 as stuff piles up.
  function gridSize() {
    var stuff = (data.enclosure || 0);
    for (var k in data.build) if (data.build[k]) stuff++;
    for (var u in data.up) if (data.up[u]) stuff++;
    if (stuff >= 12) return 16;
    if (stuff >= 6) return 14;
    return 12;
  }

  function buildParkStatics() {
    var wantN = gridSize();
    if (wantN !== N) {
      N = wantN;
      try { TileEngine.init({ canvas: "#ptyTiles", size: N }); } catch (e) {}
    }
    clear_all();
    occTiles = {};
    pondTiles = [];
    pondRect = null;
    attractionTiles = {};
    stallTiles = {};
    var tmpl = parkTemplate();
    function MX(x) { return tmpl.mirror ? N - 1 - x : x; }
    // Tier 0: bare starter park. Pen + gate + path stub + sign only —
    // every purchase visibly adds something from here.
    if (tmpl.tier === 0) {
      pens = [{ x0: 6, y0: 0, x1: 8, y1: 2 }];
      gates = [{ x: 7, y: 2 }];
      gateTile = gates[0];
      fill_tiles(6, 0, 8, 2, "enclosure");
      set_tile(7, 2, "gate");
      fill_tiles(7, 3, 7, 4, "path");
      enterTile = { x: 7, y: 4 };
      staticAt(5, 4, "sign", { text: "PARK" });
      var a;
      if (data.build.slide) { a = placeNear(8, 0, "slide"); if (a) attractionTiles.slide = a; }
      if (data.build.iceberg) { a = placeNear(6, 0, "iceberg"); if (a) attractionTiles.iceberg = a; }
      if (data.build.snow) { a = placeNear(8, 2, "snowmaker"); if (a) attractionTiles.snow = a; }
      if (data.build.cave) {
        a = placeNear(6, 1, "crystal");
        if (a) { attractionTiles.cave = a; placeNear(a.x, a.y, "crystal"); }
      }
      if (data.build.climb) { a = placePair(7, 0, "platform"); if (a) attractionTiles.climb = a[0]; }
      if (data.build.stage) { a = placeNear(8, 1, "platform"); if (a) attractionTiles.stage = a; }
      if (data.up.food) { staticAt(7, 7, "icecream"); stallTiles.food = { x: 7, y: 7 }; }
      if (data.up.bench) {
        staticAt(2, 4, "bench"); staticAt(3, 6, "bench"); staticAt(6, 7, "bench", { flip: 1 });
        stallTiles.bench = { x: 2, y: 4 };
      }
      if (data.up.gift) { staticAt(8, 7, "giftshop"); stallTiles.gift = { x: 8, y: 7 }; }
      if (data.up.plush) { staticAt(5, 8, "plushstall"); stallTiles.plush = { x: 5, y: 8 }; }
      if (data.up.toilets) { staticAt(2, 7, "sign", { text: "WC" }); stallTiles.toilets = { x: 2, y: 7 }; }
      if (data.up.info) { staticAt(6, 8, "sign", { text: "INFO" }); stallTiles.info = { x: 6, y: 8 }; }
      if (data.up.cocoa) { staticAt(9, 7, "cocoastand"); stallTiles.cocoa = { x: 9, y: 7 }; }
      if (data.up.parade) { staticAt(1, 8, "flag", { color: "#ff6b6b" }); stallTiles.parade = { x: 1, y: 8 }; }
      if (data.up.lights) { staticAt(10, 6, "crystal"); stallTiles.lights = { x: 10, y: 6 }; }
      if (data.up.festival) { staticAt(4, 6, "iceberg"); stallTiles.festival = { x: 4, y: 6 }; }
      return;
    }
    // ---- resort era: one pen per two enclosure buys, up to five ----
    var PEN_SLOTS = [
      { x0: 1, y0: 1, x1: 3, y1: 3 },
      { x0: 5, y0: 1, x1: 7, y1: 3 },
      { x0: 8, y0: 1, x1: 10, y1: 3 },
      { x0: 1, y0: 6, x1: 3, y1: 8 },
      { x0: 5, y0: 6, x1: 7, y1: 8 }
    ];
    var order = tmpl.mirror ? [2, 1, 0, 4, 3] : [0, 1, 2, 3, 4];
    var nPens = Math.min(5, 1 + Math.floor((data.enclosure || 0) / 2));
    pens = [];
    gates = [];
    for (var pi = 0; pi < nPens; pi++) {
      var pr = PEN_SLOTS[order[pi]];
      pens.push(pr);
      fill_tiles(pr.x0, pr.y0, pr.x1, pr.y1, "enclosure");
    }
    gates = pens.map(function (r) { return { x: r.x0 + 1, y: r.y1 }; });
    gates.forEach(function (g) { set_tile(g.x, g.y, "gate"); });
    gateTile = gates[0];
    // paths: plaza row + two verticals
    fill_tiles(3, N - 1, 9, N - 1, "path");
    fill_tiles(4, 8, 4, 10, "path");
    fill_tiles(8, 4, 8, 10, "path");
    enterTile = { x: 6, y: N - 1 };
    // central pond, only with the Swimming Pool
    if (data.build.pool) {
      fill_tiles(4, 4, 6, 5, "pond");
      pondRect = { x0: 4, y0: 4, x1: 6, y1: 5 };
      pondTiles = [];
      for (var qyy = 4; qyy <= 5; qyy++) for (var qxx = 4; qxx <= 6; qxx++) {
        pondTiles.push({ x: qxx, y: qyy });
        occTiles[qxx + "," + qyy] = "pond";
      }
    }
    function penCenter(i) {
      var r = pens[i] || pens[0];
      return { x: Math.round((r.x0 + r.x1) / 2), y: Math.round((r.y0 + r.y1) / 2) };
    }
    // attractions settle on the nearest free pen tile to their anchor
    function freeTile(sx, sy) {
      var best = null, bd = 1e9;
      for (var pi2 = 0; pi2 < pens.length; pi2++) {
        var R2 = pens[pi2];
        for (var yy = R2.y0; yy <= R2.y1; yy++) for (var xx = R2.x0; xx <= R2.x1; xx++) {
          if (isGate(xx, yy)) continue;
          if (occTiles[xx + "," + yy]) continue;
          var d = Math.abs(xx - sx) + Math.abs(yy - sy);
          if (d < bd) { bd = d; best = { x: xx, y: yy }; }
        }
      }
      return best;
    }
    // random free tile inside one specific pen (penguin homes)
    function freeTileInPen(ri) {
      var pen = pens[ri];
      if (!pen) return null;
      for (var tries = 0; tries < 40; tries++) {
        var x = pen.x0 + Math.floor(Math.random() * (pen.x1 - pen.x0 + 1));
        var y = pen.y0 + Math.floor(Math.random() * (pen.y1 - pen.y0 + 1));
        if (isGate(x, y)) continue;
        if (occTiles[x + "," + y]) continue;
        if (entityAt(x, y)) continue;
        return { x: x, y: y, pen: ri };
      }
      return null;
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
        if (!insideRect(bx, by)) continue;
        if (isGate(bx, by)) continue;
        if (occTiles[bx + "," + by]) continue;
        staticAt(a.x, a.y, type, opts);
        staticAt(bx, by, type, opts);
        return [{ x: a.x, y: a.y }, { x: bx, y: by }];
      }
      staticAt(a.x, a.y, type, opts);
      return [{ x: a.x, y: a.y }];
    }
    var t, c0, c1;
    c0 = penCenter(1); c1 = penCenter(0);
    if (data.build.snow) { t = placeNear(c0.x, c0.y, "snowmaker"); if (t) attractionTiles.snow = t; }
    if (data.build.slide) { t = placeNear(c1.x, c1.y, "slide"); if (t) attractionTiles.slide = t; }
    c0 = penCenter(2);
    if (data.build.iceberg) { t = placeNear(c0.x, c0.y, "iceberg"); if (t) attractionTiles.iceberg = t; }
    c0 = penCenter(3);
    if (data.build.cave) {
      t = placeNear(c0.x, c0.y, "crystal");
      if (t) {
        attractionTiles.cave = t;
        placeNear(t.x, t.y, "crystal"); // cluster of two, like the reference
      }
    }
    c0 = penCenter(4); c1 = penCenter(1);
    if (data.build.climb) { t = placePair(c0.x, c0.y, "platform"); if (t) attractionTiles.climb = t[0]; }
    if (data.build.stage) { t = placeNear(c1.x, c1.y, "platform"); if (t) attractionTiles.stage = t; }
    // arch entrance: PARK sign + pennants flanking the gate path
    function freeOutside(sx, sy) {
      var best = null, bd = 1e9;
      for (var yy = 0; yy < N; yy++) for (var xx = 0; xx < N; xx++) {
        if (insideRect(xx, yy)) continue;
        if (xx === enterTile.x && yy === enterTile.y) continue;
        if (occTiles[xx + "," + yy]) continue;
        var d = Math.abs(xx - sx) + Math.abs(yy - sy);
        if (d < bd) { bd = d; best = { x: xx, y: yy }; }
      }
      return best;
    }
    var s1 = freeOutside(MX(4), 10);
    if (s1) staticAt(s1.x, s1.y, "sign", { text: "PENGUIN PARK" });
    var f1 = freeOutside(MX(5), 10), f2 = freeOutside(MX(7), 10);
    if (f1) staticAt(f1.x, f1.y, "flag", { color: "#ff6b6b" });
    if (f2) staticAt(f2.x, f2.y, "flag", { color: "#8a7dff" });
    // plaza stalls (outside the walls, facing the path)
    if (data.up.food) { stallTiles.food = { x: MX(4), y: 10 }; staticAt(MX(4), 10, "icecream"); }
    if (data.up.gift) { stallTiles.gift = { x: MX(8), y: 10 }; staticAt(MX(8), 10, "giftshop"); }
    if (data.up.plush) { stallTiles.plush = { x: MX(3), y: 11 }; staticAt(MX(3), 11, "plushstall"); }
    if (data.up.toilets) { stallTiles.toilets = { x: MX(9), y: 11 }; staticAt(MX(9), 11, "sign", { text: "WC" }); }
    if (data.up.bench) {
      staticAt(MX(5), 10, "bench"); staticAt(MX(7), 10, "bench", { flip: 1 });
      stallTiles.bench = { x: MX(5), y: 10 };
    }
    if (data.up.info) { stallTiles.info = { x: MX(5), y: 11 }; staticAt(MX(5), 11, "sign", { text: "INFO" }); }
    // late-game plaza acts: each finds its own free tile by the crowds
    function placePlaza(ax, ay, type, opts) {
      var ft = freeOutside(MX(ax), ay);
      if (!ft) return null;
      staticAt(ft.x, ft.y, type, opts);
      return ft;
    }
    if (data.up.cocoa) { t = placePlaza(2, 11, "cocoastand"); if (t) stallTiles.cocoa = t; }
    if (data.up.parade) { t = placePlaza(10, 11, "flag", { color: "#ff6b6b" }); if (t) stallTiles.parade = t; }
    if (data.up.lights) { t = placePlaza(0, 9, "crystal"); if (t) stallTiles.lights = t; }
    if (data.up.festival) { t = placePlaza(6, 8, "iceberg"); if (t) stallTiles.festival = t; }
    // scenery: tall stuff stays on back rows (low x+y) so it never occludes.
    // decoAt skips pen tiles, so scenery never eats play space.
    function decoAt(x, y, type, opts) {
      if (insideRect(x, y)) return;
      staticAt(x, y, type, opts);
    }
    var pines = [[0, 3], [11, 2], [1, 5], [10, 8], [4, 1], [8, 0]];
    var rocks = [[4, 0], [11, 5], [0, 8]];
    if (tmpl.lush) { pines.push([11, 4], [0, 0]); rocks.push([0, 1]); }
    var di;
    for (di = 0; di < pines.length; di++) decoAt(MX(pines[di][0]), pines[di][1], "pine");
    for (di = 0; di < rocks.length; di++) decoAt(MX(rocks[di][0]), rocks[di][1], "rock");
    decoAt(MX(7), 0, "crystal");
    decoAt(MX(0), 10, "flag", { color: "#8a7dff" });
    decoAt(MX(10), 0, "flag", { color: "#ff6b6b" });
    decoAt(MX(11), 11, "flag", { color: "#ffd93d" });
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
  // Glide a float position toward its target; the grid tile flips only when a
  // boundary is crossed — and never onto an occupied tile, so critters can
  // neither share a tile nor walk the same path through each other.
  // Returns "arrived", "blocked" or "moving".
  function glideToward(e, dt) {
    var dx = e.tx - e.fx, dy = e.ty - e.fy;
    var d = Math.hypot(dx, dy);
    var step = e.speed * dt;
    if (d <= step + 0.001) { e.fx = e.tx; e.fy = e.ty; }
    else { e.fx += dx / d * step; e.fy += dy / d * step; }
    var nx = Math.round(e.fx), ny = Math.round(e.fy);
    if (nx !== e.x || ny !== e.y) {
      var solid = occTiles[nx + "," + ny] && !e.swim;
      if (!inBounds(nx, ny) || solid || entityAt(nx, ny, e)) {
        e.fx = e.x; e.fy = e.y; e.tx = e.x; e.ty = e.y;
        return "blocked";
      }
      remove_object(e.x, e.y);
      e.x = nx; e.y = ny;
      set_tile(nx, ny, e.tile, e.opts);
    }
    return (e.fx === e.tx && e.fy === e.ty) ? "arrived" : "moving";
  }
  // random free tile inside one specific pen (penguin homes)
  function freeTileInPen(ri) {
    var pen = pens[ri];
    if (!pen) return null;
    for (var tries = 0; tries < 40; tries++) {
      var x = pen.x0 + Math.floor(Math.random() * (pen.x1 - pen.x0 + 1));
      var y = pen.y0 + Math.floor(Math.random() * (pen.y1 - pen.y0 + 1));
      if (isGate(x, y)) continue;
      if (occTiles[x + "," + y]) continue;
      if (entityAt(x, y)) continue;
      return { x: x, y: y, pen: ri };
    }
    return null;
  }
  function spawnPenguinVisual(typeId) {
    // newcomers settle in the emptiest pen
    var counts = [];
    for (var ci = 0; ci < pens.length; ci++) counts.push(0);
    penguins.forEach(function (q) { if (q.pen != null && q.pen >= 0 && q.pen < counts.length) counts[q.pen]++; });
    var order = pens.map(function (_, i) { return i; }).sort(function (a, b) { return counts[a] - counts[b]; });
    var t = null;
    for (var oi = 0; oi < order.length && !t; oi++) t = freeTileInPen(order[oi]);
    if (!t) return null;
    var p = {
      type: typeId, x: t.x, y: t.y, fx: t.x, fy: t.y, tx: t.x, ty: t.y,
      speed: 1.7, pause: Math.random() * 0.6, tile: "penguin",
      opts: penguinOpts(typeId), pet: 0, swim: false, si: 0, st: 0, sa: 0,
      pen: t.pen, home: { x: t.x, y: t.y }
    };
    set_tile(t.x, t.y, "penguin", p.opts);
    return p;
  }
  // one penguin visual per 2 squares of enclosure: the pens set the crowd size
  function visualCap() {
    var total = 0;
    for (var i = 0; i < pens.length; i++) {
      var r = pens[i];
      total += Math.floor(((r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1)) / 2);
    }
    return Math.max(1, total);
  }
  function rebuildPenguins() {
    penguins = [];
    // rarest first, so a golden never loses its tile to a crowd of normals
    var keys = Object.keys(data.counts).sort(function (a, b) {
      return tycoonType(b).cost - tycoonType(a).cost;
    });
    var cap = visualCap();
    for (var i = 0; i < keys.length && penguins.length < cap; i++) {
      var n = Math.min(data.counts[keys[i]] || 0, 8);
      for (var j = 0; j < n && penguins.length < cap; j++) {
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
    // swimmers whenever the pond exists — but always keep a waddler ashore
    var n = 0;
    for (var i = 0; i < penguins.length; i++) {
      var p = penguins[i];
      if (pondTiles.length && n < 2 && (penguins.length - n) > 1) {
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
        var t = freeTileInPen(p.pen != null ? p.pen : 0) || freeTile(p.x, p.y);
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
      if (pondTiles.length && i < Math.min(2, penguins.length - 1)) {
        p.swim = true; p.tile = "swimmer";
        var pt = pondTiles[i % pondTiles.length];
        p.si = i % pondTiles.length; p.sa = p.si * 1.6; p.st = 0;
        p.opts.flip = i % 2;
        p.x = pt.x; p.y = pt.y; p.fx = pt.x; p.fy = pt.y; p.tx = pt.x; p.ty = pt.y;
        set_tile(pt.x, pt.y, "swimmer", p.opts);
      } else {
        p.swim = false; p.tile = "penguin";
        p.pen = pens.length ? (i % pens.length) : 0;
        t = freeTileInPen(p.pen) || freeTile(p.x, p.y);
        if (!t) { penguins.splice(i, 1); continue; }
        p.x = t.x; p.y = t.y; p.fx = t.x; p.fy = t.y; p.tx = t.x; p.ty = t.y;
        p.home = { x: t.x, y: t.y };
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
  // front of a stall = neighbouring tile with the biggest x+y (lowest on screen)
  function spotInFront(x, y) {
    var best = null, bs = -99;
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (var i = 0; i < 4; i++) {
      var nx = x + dirs[i][0], ny = y + dirs[i][1];
      if (!inBounds(nx, ny) || insideRect(nx, ny)) continue;
      if (occTiles[nx + "," + ny]) continue;
      if (nx + ny > bs) { bs = nx + ny; best = { x: nx, y: ny }; }
    }
    return best;
  }
  function tycoonSpots() {
    var spots = [];
    var y, x, id, f, pi;
    for (pi = 0; pi < pens.length; pi++) {
      var R = pens[pi];
      for (y = R.y0; y <= R.y1; y++) spots.push({ x: R.x1 + 1, y: y });
      for (x = R.x0; x <= R.x1; x++) spots.push({ x: x, y: R.y1 + 1 });
    }
    for (id in stallTiles) {
      if (!stallTiles.hasOwnProperty(id)) continue;
      f = spotInFront(stallTiles[id].x, stallTiles[id].y);
      if (f) spots.push(f);
    }
    if (data.build.pool && pondRect) {
      spots.push({ x: pondRect.x1 + 1, y: pondRect.y0 });
      spots.push({ x: pondRect.x1 + 1, y: pondRect.y1 });
      spots.push({ x: pondRect.x0 - 1, y: pondRect.y0 });
    }
    spots.push({ x: enterTile.x, y: enterTile.y });
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
    lvlEl.childNodes[0].textContent = "⭐ Level " + (lvl + 1);
    fillEl.style.width = Math.round(levelProgress() * 100) + "%";
    sheetCoins.textContent = Math.floor(data.coins);
    // affordable dots on every menu button, recomputed live as coins tick up
    var affordUp = false, affordPeng = false, affordBuild = false;
    var ai, aj, ab;
    for (ai = 0; ai < TYCOON_UPGRADES.length; ai++) {
      if (!data.up[TYCOON_UPGRADES[ai].id] && data.coins >= TYCOON_UPGRADES[ai].cost) affordUp = true;
    }
    for (aj = 0; aj < TYCOON_TYPES.length; aj++) {
      var pto = data.counts[TYCOON_TYPES[aj].id] || 0;
      if (data.coins >= Math.round(TYCOON_TYPES[aj].cost * Math.pow(1.18, pto))) affordPeng = true;
    }
    for (ab = 0; ab < TYCOON_BUILD.length; ab++) {
      var bb = TYCOON_BUILD[ab];
      if (bb.id === "enclosure") {
        if ((data.enclosure || 0) < bb.max && data.coins >= tycoonBuildCost(bb, data)) affordBuild = true;
      } else if (!data.build[bb.id] && data.coins >= bb.cost) affordBuild = true;
    }
    dotEl.hidden = !affordUp;
    dotPengEl.hidden = !affordPeng;
    dotBuildEl.hidden = !affordBuild;
    // live shop refresh: prices enable the moment coins cover them
    if (!sheet.hidden && sheetTab && time - lastSheetLive > 0.4) {
      lastSheetLive = time;
      refreshSheetLive();
    }
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

  function refreshSheetLive() {
    // price buttons enable the moment coins cover them — no reopen needed
    sheetCoins.textContent = Math.floor(data.coins);
    for (var i = 0; i < sheetRows.length; i++) {
      var r = sheetRows[i];
      if (r.kind === "build") {
        var maxed = r.ref.max && (data.enclosure || 0) >= r.ref.max;
        var built = r.ref.id !== "enclosure" && data.build[r.ref.id];
        if (maxed) { r.btn.textContent = "MAX"; r.btn.disabled = true; }
        else if (built) { r.btn.textContent = "OWNED"; r.btn.disabled = true; }
        else {
          var bc = tycoonBuildCost(r.ref, data);
          r.btn.textContent = fmt(bc);
          r.btn.disabled = data.coins < bc;
        }
        if (r.title && r.ref.id === "enclosure") r.title.textContent = r.ref.name + " Lv." + (data.enclosure || 0);
      } else if (r.kind === "peng") {
        var ow = data.counts[r.ref.id] || 0;
        var pc = Math.round(r.ref.cost * Math.pow(1.18, ow));
        r.btn.textContent = fmt(pc);
        r.btn.disabled = data.coins < pc;
      } else {
        if (data.up[r.ref.id]) { r.btn.textContent = "OWNED"; r.btn.disabled = true; }
        else { r.btn.textContent = fmt(r.ref.cost); r.btn.disabled = data.coins < r.ref.cost; }
      }
    }
  }

  function renderSheet() {
    if (!sheetTab) return;
    itemsEl.innerHTML = "";
    sheetRows = [];
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
        var built = b.id !== "enclosure" && data.build[b.id];
        btn.textContent = maxed ? "MAX" : built ? "OWNED" : fmt(cost);
        btn.disabled = maxed || built || data.coins < cost;
        btn.addEventListener("click", function () { buyBuild(b); });
        row.appendChild(btn);
        itemsEl.appendChild(row);
        sheetRows.push({ kind: "build", ref: b, btn: btn, title: row.querySelector("strong") });
      });
    } else if (sheetTab === "peng") {
      sheetTitle.textContent = "Penguins";
      sheetSub.textContent = " — every penguin pays you every second";
      TYCOON_TYPES.forEach(function (t) {
        var owned = data.counts[t.id] || 0;
        var cost = Math.round(t.cost * Math.pow(1.22, owned));
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
        sheetRows.push({ kind: "peng", ref: t, btn: btn });
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
        sheetRows.push({ kind: "up", ref: u, btn: btn });
      });
    }
    refreshHUD();
  }

  function buyPenguin(t) {
    var owned = data.counts[t.id] || 0;
    var cost = Math.round(t.cost * Math.pow(1.22, owned));
    if (data.coins < cost) { msgEl.textContent = "Not enough coins for " + t.name + " yet. The penguins wait."; return; }
    data.coins -= cost;
    data.spent += cost;
    data.counts[t.id] = owned + 1;
    var cap = visualCap();
    var p = null;
    if (penguins.length < cap) {
      p = spawnPenguinVisual(t.id);
    } else {
      // full house: retire the cheapest waddler to make room for the star
      var worst = -1, worstCost = Infinity, wi;
      for (wi = 0; wi < penguins.length; wi++) {
        var w = penguins[wi];
        if (w.swim) continue;
        var wc = tycoonType(w.type).cost;
        if (wc < worstCost) { worstCost = wc; worst = wi; }
      }
      if (worst >= 0 && worstCost < t.cost) {
        remove_object(penguins[worst].x, penguins[worst].y);
        penguins.splice(worst, 1);
        p = spawnPenguinVisual(t.id);
      }
    }
    if (p) {
      penguins.push(p);
      assignSwimmers();
      addPopup(p.x, p.y, t.emoji + " new friend!", "#1e4a7a", 1.4);
    } else {
      addPopup(gates[0].x, gates[0].y, t.emoji + " joined the flock!", "#1e4a7a", 1.4);
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
    var at = attractionTiles[b.id] || gates[0] || { x: 6, y: 7 };
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
    if (lvl >= TYCOON_LEVELS.length - 1 && data.best < TYCOON_LEVELS.length) {
      data.best = TYCOON_LEVELS.length;
      showBubble({
        emoji: "🏆", title: "LEVEL " + TYCOON_LEVELS.length + "!",
        sub: "The ultimate park.",
        body: "You did it. The penguins rule everything, everywhere, now.",
        btn: "👑 RULE",
        fn: function () { msgEl.textContent = "🏆 Ultimate tribute: +$2,000!"; data.coins += 2000; }
      });
      try { recordScore("tycoon", Math.floor(data.earned), "high"); } catch (e) {}
    } else {
      var nl = tycoonLevel(data);
      if (nl > (checkEmpire.last || 0)) {
        checkEmpire.last = nl;
        addPopup(gates[0].x, gates[0].y, "⭐ Level " + (nl + 1) + "!", "#8a5f14", 2);
        msgEl.textContent = "⬆️ Level " + (nl + 1) + "! The park grows.";
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
          addPopup(gates[0].x, gates[0].y, "+$150 famous visit!", "#8a5f14", 1.8);
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
  // separation: how far is the nearest other waddler from (x, y)?
  function penguinSeparation(x, y, self) {
    var bd = 99;
    for (var i = 0; i < penguins.length; i++) {
      var q = penguins[i];
      if (q === self || q.swim) continue;
      var d = Math.abs(q.x - x) + Math.abs(q.y - y);
      if (d < bd) bd = d;
    }
    return bd;
  }
  function pickPenguinTarget(p) {
    // roam inside the home pen only — pens stay declumped by design
    var pen = pens[p.pen] || pens[0];
    if (!pen) { p.pause = 0.5; return; }
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    var opts = [];
    for (var i = 0; i < 4; i++) {
      var nx = p.x + dirs[i][0], ny = p.y + dirs[i][1];
      if (nx < pen.x0 || nx > pen.x1 || ny < pen.y0 || ny > pen.y1) continue;
      if (isGate(nx, ny)) continue;
      if (occTiles[nx + "," + ny]) continue;
      if (entityAt(nx, ny, p)) continue;
      opts.push({ x: nx, y: ny });
    }
    if (!opts.length) {
      p.pause = 0.5 + Math.random() * 0.6;
      return;
    }
    // stay near home, and away from the crowd
    var home = p.home || { x: p.x, y: p.y };
    var near = opts.filter(function (o) { return Math.abs(o.x - home.x) + Math.abs(o.y - home.y) <= 3; });
    var pool = near.length ? near : opts;
    var best = null, bs = -1;
    for (var j = 0; j < pool.length; j++) {
      var s = penguinSeparation(pool[j].x, pool[j].y, p) + Math.random() * 1.5;
      if (s > bs) { bs = s; best = pool[j]; }
    }
    p.tx = best.x; p.ty = best.y;
    if (best.x !== p.x) p.opts.flip = best.x > p.x ? 1 : 0;
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
    var pg = glideToward(p, dt);
    if (pg === "moving") return;
    if (pg === "blocked") { pickPenguinTarget(p); return; }
    if (Math.random() < 0.45) {
        p.pause = 0.5 + Math.random() * 0.9;
        if (Math.random() < 0.5) { p.opts.flip = p.opts.flip ? 0 : 1; set_tile(p.x, p.y, "penguin", p.opts); }
        else if (Math.random() < 0.12) addPopup(p.x, p.y, "♪", "#4f8fcf", 0.9);
      } else {
        pickPenguinTarget(p);
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
    var vg = glideToward(v, dt);
    if (vg === "moving") return; // still gliding to the step target
    if (vg === "blocked") { v.pause = 0.3; return; } // someone stepped in
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
      var eg = glideToward(escaped, dt);
      if (eg !== "moving") {
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
