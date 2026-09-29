const PENGUIN_KEY = "trinkets-penguin-v1";

const PENGUINS = [
  { id: "classic", name: "Classic", price: 0, body: "#1e2a3a", belly: "#fff8ea", beak: "#ff9f2e", foot: "#ff9f2e", eye: "#0f1320", hat: null, scarf: null, desc: "The original. Reliable." },
  { id: "berry", name: "Berry", price: 20, body: "#c94a6a", belly: "#ffe8ef", beak: "#ff9f2e", foot: "#ff6b6b", eye: "#2b0e1a", hat: "berry", scarf: "#fffaf0", desc: "Sweet and speedy" },
  { id: "emperor", name: "Emperor", price: 35, body: "#1f314f", belly: "#fff0a0", beak: "#f6c445", foot: "#f6c445", eye: "#0f1320", hat: "crown", scarf: "#f6c445", desc: "Golden belly, royal glide" },
  { id: "ninja", name: "Ninja", price: 50, body: "#1a1e24", belly: "#cbd6e6", beak: "#3a3a3a", foot: "#3a3a3a", eye: "#ff2d2d", hat: "headband", scarf: "#ff6b6b", desc: "Silent flaps" },
  { id: "astro", name: "Astro", price: 65, body: "#eaf2ff", belly: "#d6ecff", beak: "#ff9f2e", foot: "#4f8fcf", eye: "#0f1320", hat: "helmet", scarf: null, desc: "Low-gravity trained" },
  { id: "viking", name: "Viking", price: 80, body: "#6b4a2f", belly: "#fff8ea", beak: "#ff9f2e", foot: "#ff9f2e", eye: "#0f1320", hat: "viking", scarf: "#4f8fcf", desc: "Horns help with headbutts" }
];

function penguinById(id) {
  return PENGUINS.find(function(p){ return p.id===id; }) || PENGUINS[0];
}

function loadPenguinData() {
  try {
    var raw = JSON.parse(localStorage.getItem(PENGUIN_KEY));
    if (raw && typeof raw === "object") {
      var coins = typeof raw.coins === "number" ? raw.coins : 0;
      var unlocked = Array.isArray(raw.unlocked) ? raw.unlocked.filter(function(id){ return PENGUINS.some(function(p){ return p.id===id; }); }) : ["classic"];
      if (unlocked.indexOf("classic")===-1) unlocked.unshift("classic");
      var selected = typeof raw.selected === "string" && unlocked.indexOf(raw.selected)!==-1 ? raw.selected : unlocked[0];
      var bestLevel = typeof raw.bestLevel === "number" ? raw.bestLevel : 0;
      var bestCoins = typeof raw.bestCoins === "number" ? raw.bestCoins : coins;
      return { coins: coins, unlocked: unlocked, selected: selected, bestLevel: bestLevel, bestCoins: bestCoins };
    }
  } catch(e){}
  return { coins: 0, unlocked: ["classic"], selected: "classic", bestLevel: 0, bestCoins: 0 };
}
function savePenguinData(d) {
  try { localStorage.setItem(PENGUIN_KEY, JSON.stringify(d)); } catch(e){}
}

// Hand-crafted 5 levels then procedural after
const PENGUIN_LEVELS = [
  // Level 1 - Tutorial Meadows
  {
    width: 1800, height: 480,
    start: { x: 80, y: 360 },
    platforms: [
      { x: 0, y: 440, w: 1800, h: 40, type: "normal" },
      { x: 180, y: 350, w: 160, h: 16, type: "normal" },
      { x: 400, y: 300, w: 140, h: 16, type: "normal" },
      { x: 610, y: 260, w: 140, h: 16, type: "normal" },
      { x: 820, y: 310, w: 160, h: 16, type: "normal" },
      { x: 1060, y: 270, w: 140, h: 16, type: "normal" },
      { x: 1280, y: 330, w: 160, h: 16, type: "normal" }
    ],
    coins: [
      { x: 260, y: 310 }, { x: 470, y: 260 }, { x: 680, y: 220 }, { x: 900, y: 270 }, { x: 1130, y: 230 }, { x: 1360, y: 290 }
    ],
    flag: { x: 1640, y: 440 }
  },
  // Level 2 - Icy Heights
  {
    width: 2000, height: 480,
    start: { x: 80, y: 360 },
    platforms: [
      { x: 0, y: 440, w: 2000, h: 40, type: "normal" },
      { x: 160, y: 360, w: 140, h: 16, type: "normal" },
      { x: 360, y: 310, w: 120, h: 16, type: "ice" },
      { x: 560, y: 260, w: 140, h: 16, type: "ice" },
      { x: 780, y: 300, w: 100, h: 16, type: "normal" },
      { x: 960, y: 240, w: 160, h: 16, type: "ice" },
      { x: 1200, y: 320, w: 120, h: 16, type: "normal" },
      { x: 1400, y: 270, w: 140, h: 16, type: "ice" },
      { x: 1620, y: 340, w: 130, h: 16, type: "normal" }
    ],
    coins: [
      { x: 230, y: 320 }, { x: 420, y: 270 }, { x: 630, y: 220 }, { x: 830, y: 260 }, { x: 1040, y: 200 }, { x: 1260, y: 280 }, { x: 1470, y: 230 }, { x: 1680, y: 300 }
    ],
    flag: { x: 1860, y: 440 }
  },
  // Level 3 - Bouncy Bay
  {
    width: 2200, height: 480,
    start: { x: 80, y: 360 },
    platforms: [
      { x: 0, y: 440, w: 2200, h: 40, type: "normal" },
      { x: 170, y: 360, w: 110, h: 16, type: "bouncy" },
      { x: 360, y: 310, w: 120, h: 16, type: "normal" },
      { x: 560, y: 340, w: 100, h: 16, type: "bouncy" },
      { x: 760, y: 280, w: 140, h: 16, type: "normal" },
      { x: 1000, y: 330, w: 110, h: 16, type: "bouncy" },
      { x: 1180, y: 260, w: 160, h: 16, type: "normal" },
      { x: 1420, y: 320, w: 100, h: 16, type: "bouncy" },
      { x: 1620, y: 270, w: 140, h: 16, type: "normal" },
      { x: 1840, y: 340, w: 140, h: 16, type: "normal" }
    ],
    coins: [
      { x: 225, y: 315 }, { x: 420, y: 270 }, { x: 610, y: 300 }, { x: 830, y: 240 }, { x: 1055, y: 285 }, { x: 1260, y: 220 }, { x: 1470, y: 275 }, { x: 1690, y: 230 }, { x: 1910, y: 300 }
    ],
    flag: { x: 2060, y: 440 }
  },
  // Level 4 - Crumble Canyon
  {
    width: 2300, height: 480,
    start: { x: 80, y: 360 },
    platforms: [
      { x: 0, y: 440, w: 2300, h: 40, type: "normal" },
      { x: 180, y: 360, w: 140, h: 16, type: "crumble" },
      { x: 380, y: 310, w: 120, h: 16, type: "normal" },
      { x: 580, y: 270, w: 100, h: 16, type: "crumble" },
      { x: 760, y: 320, w: 140, h: 16, type: "normal" },
      { x: 980, y: 260, w: 120, h: 16, type: "crumble" },
      { x: 1180, y: 300, w: 140, h: 16, type: "normal" },
      { x: 1400, y: 340, w: 100, h: 16, type: "crumble" },
      { x: 1580, y: 280, w: 140, h: 16, type: "normal" },
      { x: 1800, y: 330, w: 120, h: 16, type: "crumble" },
      { x: 2020, y: 300, w: 140, h: 16, type: "normal" }
    ],
    coins: [
      { x: 250, y: 320 }, { x: 440, y: 270 }, { x: 630, y: 235 }, { x: 830, y: 280 }, { x: 1040, y: 220 }, { x: 1250, y: 260 }, { x: 1450, y: 295 }, { x: 1650, y: 240 }, { x: 1860, y: 285 }, { x: 2090, y: 260 }
    ],
    flag: { x: 2180, y: 440 }
  },
  // Level 5 - Sky Peak (mix + moving)
  {
    width: 2500, height: 480,
    start: { x: 80, y: 360 },
    platforms: [
      { x: 0, y: 440, w: 2500, h: 40, type: "normal" },
      { x: 150, y: 360, w: 120, h: 16, type: "moving", move: { min: 150, max: 350, speed: 55 } },
      { x: 480, y: 310, w: 110, h: 16, type: "ice" },
      { x: 680, y: 260, w: 120, h: 16, type: "bouncy" },
      { x: 900, y: 330, w: 100, h: 16, type: "crumble" },
      { x: 1080, y: 280, w: 140, h: 16, type: "normal" },
      { x: 1300, y: 240, w: 140, h: 16, type: "moving", move: { min: 1300, max: 1500, speed: 70 } },
      { x: 1550, y: 310, w: 110, h: 16, type: "ice" },
      { x: 1720, y: 270, w: 120, h: 16, type: "bouncy" },
      { x: 1920, y: 340, w: 100, h: 16, type: "crumble" },
      { x: 2100, y: 300, w: 140, h: 16, type: "normal" },
      { x: 2260, y: 260, w: 120, h: 16, type: "moving", move: { min: 2260, max: 2380, speed: 45 } }
    ],
    coins: [
      { x: 210, y: 320 }, { x: 535, y: 270 }, { x: 740, y: 220 }, { x: 950, y: 290 }, { x: 1150, y: 240 }, { x: 1400, y: 200 }, { x: 1605, y: 270 }, { x: 1780, y: 230 }, { x: 1970, y: 300 }, { x: 2170, y: 260 }, { x: 2320, y: 220 }
    ],
    flag: { x: 2400, y: 440 }
  }
];

function genProcLevel(index) {
  // index is zero-based level number beyond handcrafted length
  var procIdx = index - PENGUIN_LEVELS.length;
  var width = 1600 + procIdx * 220 + Math.floor(Math.random()*120);
  var start = { x: 80, y: 360 };
  var platforms = [{ x: 0, y: 440, w: width, h: 40, type: "normal" }];
  var count = 8 + Math.floor(procIdx * 0.7);
  var lastX = 140;
  for (var i=0;i<count;i++) {
    var w = 90 + Math.random()*70;
    var gap = 110 + Math.random()*100 + Math.min(60, procIdx*4);
    var x = lastX + gap;
    if (x + w > width - 140) { x = width - 140 - w; }
    var y = 240 + Math.random()*130;
    // force reachable steps: if vertical diff > 90 need closer gap
    if (i>0) {
      var prevY = platforms[platforms.length-1].y;
      if (Math.abs(y - prevY) > 80) y = prevY + (Math.random()<0.5? -55: 55);
      y = Math.max(210, Math.min(380, y));
    }
    var r = Math.random();
    var type = "normal";
    if (procIdx > 1 && r < 0.22) type = "ice";
    else if (procIdx > 2 && r < 0.32) type = "bouncy";
    else if (procIdx > 3 && r < 0.42) type = "crumble";
    else if (procIdx > 4 && r < 0.48) type = "moving";
    var p = { x: x, y: y, w: w, h: 16, type: type };
    if (type==="moving") {
      var range = 60 + Math.random()*80;
      p.move = { min: Math.max(0, x - range/2), max: Math.min(width- w, x + range/2), speed: 40 + Math.random()*40 };
    }
    platforms.push(p);
    lastX = x + w;
    if (lastX > width - 200) break;
  }
  // coins
  var coins = [];
  for (var j=1;j<platforms.length;j++) {
    if (Math.random()<0.8) {
      var pl = platforms[j];
      coins.push({ x: pl.x + pl.w/2, y: pl.y - 26 });
      if (Math.random()<0.25) coins.push({ x: pl.x + pl.w*0.2, y: pl.y - 46 });
    }
  }
  // thin to 7-11
  while (coins.length > 11) coins.splice(Math.floor(Math.random()*coins.length),1);
  while (coins.length < 7) coins.push({ x: 300 + Math.random()*(width-500), y: 200 + Math.random()*80 });
  var flag = { x: width - 100, y: 440 };
  return { width: width, height: 480, start: start, platforms: platforms, coins: coins, flag: flag };
}

function getPenguinLevel(n) {
  // n is zero-based index
  if (n < PENGUIN_LEVELS.length) {
    var src = PENGUIN_LEVELS[n];
    // deep copy to allow mutation (crumble timers, moving positions)
    return JSON.parse(JSON.stringify(src));
  }
  return genProcLevel(n);
}

function startPenguinParkour() {
  openGame(
    "Penguin Parkour",
    "Arcade",
    '<div class="game-layout">' +
      '<div class="game-topline">' +
        '<span class="game-stat" id="pengLevel">Level 1</span>' +
        '<span class="game-stat" id="pengCoins">Coins: 0</span>' +
        '<span class="game-stat" id="pengLevelCoins">This level: 0/0</span>' +
        '<span class="game-stat" id="pengBest">Best: 0</span>' +
      '</div>' +
      '<p class="game-message" id="pengMsg">Arrow keys / A D to move, Space / W / Up to jump. Grab coins, waddle to the flag!</p>' +
      '<div class="penguin-stage" id="penguinStage">' +
        '<canvas class="penguin-canvas" id="penguinCanvas" width="720" height="480"></canvas>' +
        '<div class="penguin-touch" id="penguinTouch">' +
          '<button class="penguin-touch-btn" data-touch="left" aria-label="Move left"><span class="material-symbols-outlined">arrow_back</span></button>' +
          '<button class="penguin-touch-btn" data-touch="jump" aria-label="Jump"><span class="material-symbols-outlined">arrow_upward</span></button>' +
          '<button class="penguin-touch-btn" data-touch="right" aria-label="Move right"><span class="material-symbols-outlined">arrow_forward</span></button>' +
        '</div>' +
        '<div class="penguin-shop-overlay" id="penguinShop" hidden>' +
          '<div class="penguin-shop-panel">' +
            '<div class="penguin-shop-header">' +
              '<strong>Penguin Shop</strong>' +
              '<button class="game-action" id="penguinShopClose" type="button">Close</button>' +
            '</div>' +
            '<p class="penguin-shop-coins">Your fish-coins: <strong id="penguinShopCoins">0</strong> <span style="opacity:0.7">— collect coins in levels to buy new penguins!</span></p>' +
            '<div class="penguin-shop-grid" id="penguinShopGrid"></div>' +
            '<p class="penguin-shop-hint">Tip: Coins stay with you forever, even if you fall. Replay levels to farm!</p>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="game-actions">' +
        '<button class="game-action" id="penguinShopBtn" type="button">Shop / Change penguin</button>' +
        '<button class="game-action" id="penguinRestart" type="button">Restart level</button>' +
        '<button class="game-action" id="penguinNext" type="button" hidden>Next level →</button>' +
      '</div>' +
    '</div>'
  );

  var canvas = document.querySelector("#penguinCanvas");
  var ctx = canvas.getContext("2d");
  var W = canvas.width;
  var H = canvas.height;
  var msg = document.querySelector("#pengMsg");
  var levelEl = document.querySelector("#pengLevel");
  var coinsEl = document.querySelector("#pengCoins");
  var lvlCoinsEl = document.querySelector("#pengLevelCoins");
  var bestEl = document.querySelector("#pengBest");
  var shopOverlay = document.querySelector("#penguinShop");
  var shopCoinsEl = document.querySelector("#penguinShopCoins");
  var shopGrid = document.querySelector("#penguinShopGrid");

  var data = loadPenguinData();
  var bestLevel = data.bestLevel;
  try { var hs = readScores().penguin; if (typeof hs==="number") bestLevel = Math.max(bestLevel, hs); } catch(e){}
  bestEl.textContent = "Best: " + bestLevel;

  var levelIndex = 0; // zero-based
  var level = null;
  var platforms = [];
  var coins = [];
  var flag = null;
  var levelWidth = 1800;
  var camX = 0;
  var particles = [];
  var popups = [];
  var won = false;
  var dead = false;
  var deadTimer = 0;
  var levelCoinsCollected = 0;
  var totalCoinsDisplay = data.coins;
  var shake = 0;

  // player
  var PW = 24;
  var PH = 28;
  var player = { x: 80, y: 360, vx: 0, vy: 0, onGround: false, facing: 1, coyote: 0, buffer: 0, squish: 0 };
  var startPos = { x:80, y:360 };

  var keys = new Set();
  var touchLeft = false, touchRight = false, touchJump = false;

  var GRAV = 2250;
  var MOVE = 260;
  var JUMP = 680;
  var BOUNCE = 1050;
  var MAX_FALL = 950;
  var COYOTE_TIME = 0.13;
  var BUFFER_TIME = 0.14;

  var selectedPenguin = penguinById(data.selected);

  var raf = 0;
  var last = performance.now();

  function buildLevel(n) {
    level = getPenguinLevel(n);
    levelWidth = level.width;
    platforms = level.platforms.map(function(p){
      var np = { x: p.x, y: p.y, w: p.w, h: p.h, type: p.type, origX: p.x, alive:true, crumbleT:0 };
      if (p.move) { np.move = { min:p.move.min, max:p.move.max, speed:p.move.speed, dir: 1 }; np.x = (p.move.min + p.move.max)/2; }
      return np;
    });
    coins = level.coins.map(function(c){ return { x:c.x, y:c.y, r:11, taken:false, phase: Math.random()*Math.PI*2 }; });
    flag = { x: level.flag.x, y: level.flag.y, w: 26, h: 70 };
    startPos = { x: level.start.x, y: level.start.y };
    player.x = startPos.x;
    player.y = startPos.y;
    player.vx = 0; player.vy = 0; player.onGround=false; player.coyote=0; player.buffer=0; player.squish=0;
    won=false; dead=false; deadTimer=0; levelCoinsCollected=0; camX=0;
    particles=[]; popups=[]; shake=0;
    // reset crumble timers
    levelIndex = n;
    updateUI();
    msg.textContent = levelLabel(n) + " — grab all the fish-coins!";
    document.querySelector("#penguinNext").hidden = true;
  }

  function levelLabel(n) {
    if (n < 5) {
      var names = ["Tutorial Meadows","Icy Heights","Bouncy Bay","Crumble Canyon","Sky Peak"];
      return "Level " + (n+1) + " · " + names[n];
    }
    return "Level " + (n+1) + " · Endless " + (n-4);
  }

  function updateUI() {
    levelEl.textContent = "Level " + (levelIndex+1);
    coinsEl.textContent = "Coins: " + data.coins;
    lvlCoinsEl.textContent = "This level: " + levelCoinsCollected + "/" + coins.length;
    shopCoinsEl.textContent = data.coins;
    // snapshot
    setSnapshot({
      mode: won ? "won" : dead ? "dead" : "playing",
      game: "Penguin Parkour",
      level: levelIndex+1,
      coins: data.coins,
      levelCoins: levelCoinsCollected + "/" + coins.length,
      selected: data.selected,
      won: won
    });
  }

  function saveData() {
    data.selected = selectedPenguin.id;
    savePenguinData(data);
    // also use global highscore for stats band
    try { recordScore("penguin", Math.max(data.bestLevel, levelIndex + (won?1:0)), "high"); } catch(e){}
    updateUI();
  }

  function spawnCoinParticles(x,y) {
    for (var i=0;i<7;i++) {
      var a = Math.random()*Math.PI*2;
      var sp = 50 + Math.random()*140;
      particles.push({ x:x, y:y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp - 80, life:0.5+Math.random()*0.3, max:0.5+Math.random()*0.3, r: 2+Math.random()*3, color:"#f6c445", type:"star" });
    }
    popups.push({ x:x, y:y-18, vy:-42, life:0.7, max:0.7, text:"+1" });
  }
  function spawnLandParticles(x,y) {
    for (var i=0;i<4;i++) {
      particles.push({ x:x + (Math.random()-0.5)*12, y:y, vx:(Math.random()-0.5)*70, vy:-20 -Math.random()*50, life:0.25, max:0.25, r:2, color:"rgba(255,255,255,0.85)", type:"puff"});
    }
  }

  function tryJump() {
    if (won || dead) return;
    if (shopOverlay && !shopOverlay.hidden) return;
    if (player.onGround || player.coyote > 0) {
      player.vy = -JUMP;
      player.onGround = false;
      player.coyote = 0;
      player.buffer = 0;
      player.squish = -0.18;
      // small jump puff
      spawnLandParticles(player.x, player.y + PH/2);
    } else {
      player.buffer = BUFFER_TIME;
    }
  }

  function rectOverlap(ax,ay,aw,ah,bx,by,bw,bh) {
    return ax - aw/2 < bx + bw/2 && ax + aw/2 > bx - bw/2 && ay - ah/2 < by + bh/2 && ay + ah/2 > by - bh/2;
  }
  // platform rect helper: platforms have x,y as top-left? our platforms are top-left.
  // Convert to center for overlap? easier treat platform as at (x+w/2, y+h/2)
  function platformOverlap(px,py,pw,ph, plat) {
    var pcx = plat.x + plat.w/2;
    var pcy = plat.y + plat.h/2;
    return rectOverlap(px, py, pw, ph, pcx, pcy, plat.w, plat.h);
  }

  function update(dt) {
    if (shopOverlay && !shopOverlay.hidden) {
      // pause game while shop open
      return;
    }
    if (won) {
      // win idle, just animate particles
      shake *= 0.88;
      particles = particles.filter(function(p){ return p.life>0; });
      for (var i=0;i<particles.length;i++) { var p=particles[i]; p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+= 500*dt; p.life-=dt; }
      popups = popups.filter(function(p){return p.life>0;});
      for (var j=0;j<popups.length;j++) { var pp=popups[j]; pp.y+=pp.vy*dt; pp.life-=dt; }
      return;
    }
    if (dead) {
      deadTimer -= dt;
      shake *= 0.88;
      if (deadTimer <= 0) {
        // respawn
        player.x = startPos.x;
        player.y = startPos.y;
        player.vx=0; player.vy=0; player.onGround=false; dead=false; shake=0;
        // reset crumbling platforms that were destroyed
        for (var k=0;k<platforms.length;k++) { var pl=platforms[k]; if (pl.type==="crumble" && !pl.alive) { pl.alive=true; pl.crumbleT=0; } }
        // coins stay taken (generous), but we keep total coins already awarded
      }
      // still update particles
      particles = particles.filter(function(p){ return p.life>0; });
      for (var ii=0;ii<particles.length;ii++) { var pp2=particles[ii]; pp2.x+=pp2.vx*dt; pp2.y+=pp2.vy*dt; pp2.vy+=500*dt; pp2.life-=dt; }
      return;
    }

    // update moving platforms first
    for (var mi=0;mi<platforms.length;mi++) {
      var mp = platforms[mi];
      if (mp.move && mp.alive) {
        mp.x += mp.move.dir * mp.move.speed * dt;
        if (mp.x <= mp.move.min) { mp.x = mp.move.min; mp.move.dir = 1; }
        if (mp.x + mp.w >= mp.move.max) { mp.x = mp.move.max - mp.w; mp.move.dir = -1; }
      }
    }

    // input
    var want = 0;
    if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A") || touchLeft) want -= 1;
    if (keys.has("ArrowRight") || keys.has("d") || keys.has("D") || touchRight) want += 1;

    // check if on ice before move
    var onIce = false;
    var onMoving = null;
    // we need to know what platform we're standing on from previous frame's onGround detection
    // Do a tiny probe below feet
    var probeY = player.y + PH/2 + 1;
    for (var pi=0; pi<platforms.length; pi++) {
      var pr = platforms[pi];
      if (!pr.alive) continue;
      if (pr.type==="ice" || pr.type==="moving") {
        // check if feet overlapping horizontally and just above
        var footLeft = player.x - PW/2 + 2;
        var footRight = player.x + PW/2 - 2;
        var platLeft = pr.x;
        var platRight = pr.x + pr.w;
        if (footRight > platLeft && footLeft < platRight && Math.abs(probeY - pr.y) < 3 && player.vy >= -10) {
          if (pr.type==="ice") onIce = true;
          if (pr.type==="moving") onMoving = pr;
        }
      } else if (pr.type==="normal" || pr.type==="bouncy" || pr.type==="crumble") {
        var fl2 = player.x - PW/2 + 2;
        var fr2 = player.x + PW/2 - 2;
        var pl2 = pr.x, pr2 = pr.x+pr.w;
        if (fr2 > pl2 && fl2 < pr2 && Math.abs(probeY - pr.y) < 3 && player.vy >= -10) {
          if (pr.move) onMoving = pr;
        }
      }
    }

    // if on moving platform, carry player
    if (onMoving && player.onGround) {
      player.x += onMoving.move.dir * onMoving.move.speed * dt;
      // clamp so player stays on platform if carried off edge? allow slide off naturally
    }

    // horizontal accel
    var targetVx = want * MOVE;
    var accel = player.onGround ? (onIce ? 0.09 : 0.26) : 0.13;
    // lerp
    player.vx += (targetVx - player.vx) * accel;
    // small deadzone
    if (Math.abs(want) < 0.1 && player.onGround && !onIce) {
      player.vx *= Math.pow(0.12, dt*60); // friction
      if (Math.abs(player.vx) < 3) player.vx = 0;
    }
    if (onIce && Math.abs(want) < 0.1 && player.onGround) {
      player.vx *= Math.pow(0.985, dt*60);
    }

    // facing
    if (want !== 0) player.facing = want > 0 ? 1 : -1;

    // apply jump buffer + coyote
    if (player.buffer > 0) {
      player.buffer -= dt;
      if ((player.onGround || player.coyote > 0) && player.buffer > 0) {
        tryJump();
      }
    }
    if (player.coyote > 0) player.coyote -= dt;

    // horizontal move + collide
    var prevX = player.x;
    player.x += player.vx * dt;
    // clamp to level bounds
    if (player.x - PW/2 < 0) { player.x = PW/2; player.vx = 0; }
    if (player.x + PW/2 > levelWidth) { player.x = levelWidth - PW/2; player.vx = 0; }

    for (var ci=0; ci<platforms.length; ci++) {
      var plat = platforms[ci];
      if (!plat.alive) continue;
      if (platformOverlap(player.x, player.y, PW, PH, plat)) {
        // check if overlap is more horizontal or vertical? For horizontal move we resolve X
        // compute overlap amounts
        var overlapX = Math.min(player.x + PW/2 - plat.x, plat.x+plat.w - (player.x - PW/2));
        var overlapY = Math.min(player.y + PH/2 - plat.y, plat.y+plat.h - (player.y - PH/2));
        // if moving horizontally, X overlap is smaller => resolve X
        // but for side walls, we want to push out horizontally
        // Only resolve if player was not overlapping before in Y? simplify: if previous Y was not overlapping heavily, resolve X
        // Use prevX check
        // if player was outside in X previous frame, then it's a side collision
        var wasOutsideX = prevX + PW/2 <= plat.x || prevX - PW/2 >= plat.x+plat.w;
        if (wasOutsideX || overlapX < overlapY) {
          if (player.x < plat.x + plat.w/2) player.x = plat.x - PW/2 - 0.1;
          else player.x = plat.x + plat.w + PW/2 + 0.1;
          player.vx = 0;
        }
      }
    }

    // gravity
    player.vy += GRAV * dt;
    if (player.vy > MAX_FALL) player.vy = MAX_FALL;
    var prevY = player.y;
    player.y += player.vy * dt;

    var wasOnGround = player.onGround;
    player.onGround = false;

    for (var vi=0; vi<platforms.length; vi++) {
      var pp = platforms[vi];
      if (!pp.alive) continue;
      if (!platformOverlap(player.x, player.y, PW, PH, pp)) continue;
      var ovX = Math.min(player.x + PW/2 - pp.x, pp.x+pp.w - (player.x - PW/2));
      var ovY = Math.min(player.y + PH/2 - pp.y, pp.y+pp.h - (player.y - PH/2));
      // determine if landing from above
      var comingDown = player.vy > 0 && prevY + PH/2 <= pp.y + 6;
      var comingUp = player.vy < 0 && prevY - PH/2 >= pp.y+pp.h - 6;
      if (comingDown) {
        // land
        player.y = pp.y - PH/2;
        if (pp.type === "bouncy") {
          player.vy = -BOUNCE;
          player.onGround = false;
          player.squish = 0.22;
          shake = 4;
          // particles
          spawnLandParticles(player.x, pp.y);
          // bounce coin? not needed
        } else {
          player.vy = 0;
          player.onGround = true;
          player.coyote = COYOTE_TIME;
          if (!wasOnGround) {
            player.squish = -0.14;
            shake = Math.min(shake+2, 6);
            spawnLandParticles(player.x, pp.y);
          }
          if (pp.type === "crumble") {
            if (pp.crumbleT === 0) pp.crumbleT = 0.01; // start crumbling
          }
        }
        // prevent further checks this frame for vertical?
        // but continue to allow other platforms? we already resolved main.
      } else if (comingUp) {
        player.y = pp.y + pp.h + PH/2;
        player.vy = 0;
      } else {
        // side overlap already handled, but vertical remaining: resolve smallest
        if (ovX < ovY) {
          if (player.x < pp.x + pp.w/2) player.x = pp.x - PW/2 -0.1;
          else player.x = pp.x + pp.w + PW/2 +0.1;
          player.vx = 0;
        } else {
          if (player.y < pp.y + pp.h/2) { player.y = pp.y - PH/2; if (player.vy>0) player.vy=0; player.onGround=true; player.coyote=COYOTE_TIME; }
          else { player.y = pp.y + pp.h + PH/2; if (player.vy<0) player.vy=0; }
        }
      }
    }

    // crumble update
    for (var cr=0; cr<platforms.length; cr++) {
      var cpl = platforms[cr];
      if (cpl.type==="crumble" && cpl.crumbleT>0 && cpl.alive) {
        cpl.crumbleT += dt;
        if (cpl.crumbleT > 0.55) {
          cpl.alive = false;
          // dust
          for (var d=0; d<6; d++) particles.push({ x: cpl.x+cpl.w/2 + (Math.random()-0.5)*cpl.w*0.6, y: cpl.y+4, vx:(Math.random()-0.5)*70, vy: -10 -Math.random()*40, life:0.45, max:0.45, r:2, color:"#8a6d4b", type:"puff"});
          shake = 5;
        }
      }
    }

    // coin collection + float
    for (var coi=0; coi<coins.length; coi++) {
      var cc = coins[coi];
      if (cc.taken) continue;
      cc.phase += dt*2.2;
      // distance check - include small bob offset? ignore
      var ddx = player.x - cc.x;
      var ddy = (player.y) - (cc.y - 4);
      var dist = Math.hypot(ddx, ddy);
      if (dist < 18 + PW/3) {
        cc.taken = true;
        levelCoinsCollected++;
        data.coins++;
        if (data.coins > data.bestCoins) data.bestCoins = data.coins;
        spawnCoinParticles(cc.x, cc.y);
        saveData();
        // coin sound would go here
        updateUI();
      }
    }

    // flag check
    if (!won) {
      var fx = flag.x + flag.w/2;
      var fy = flag.y - flag.h/2;
      var fdist = Math.hypot(player.x - fx, player.y - fy);
      // simpler AABB: player overlapping flag pole area
      var flagLeft = flag.x - 6;
      var flagRight = flag.x + 18;
      var flagTop = flag.y - flag.h;
      var flagBottom = flag.y;
      var prLeft = player.x - PW/2, prRight = player.x+PW/2, prTop = player.y - PH/2, prBottom = player.y+PH/2;
      if (prRight > flagLeft && prLeft < flagRight && prBottom > flagTop && prTop < flagBottom) {
        won = true;
        // bonus for collecting all?
        var bonus = 0;
        if (levelCoinsCollected === coins.length) bonus = coins.length * 2;
        if (bonus>0) { data.coins += bonus; for(var b=0;b<bonus;b++) popups.push({ x: flag.x, y: flag.y- 90 - b*7, vy:-18, life:0.9, max:0.9, text:"+"+bonus+" perfect!" }); saveData(); }
        data.bestLevel = Math.max(data.bestLevel, levelIndex+1);
        savePenguinData(data);
        try { recordScore("penguin", data.bestLevel, "high"); } catch(e){}
        bestEl.textContent = "Best: " + data.bestLevel;
        msg.textContent = "Flag reached! " + levelCoinsCollected + "/" + coins.length + " coins. " + (bonus?"Perfect bonus!":"");
        document.querySelector("#penguinNext").hidden = false;
        // burst
        for (var bi=0; bi<14; bi++) {
          var ang = Math.random()*Math.PI*2;
          var sp2 = 60 + Math.random()*180;
          particles.push({ x: flag.x, y: flag.y - flag.h/2, vx: Math.cos(ang)*sp2, vy: Math.sin(ang)*sp2 - 40, life:0.7, max:0.7, r:3+Math.random()*3, color: ["#f6c445","#ff6b6b","#43c6ac","#4f8fcf"][Math.floor(Math.random()*4)], type:"star"});
        }
        shake = 8;
        updateUI();
      }
    }

    // fall death
    if (player.y - PH/2 > H + 140) {
      dead = true;
      deadTimer = 0.55;
      shake = 10;
      // penalty? lose half of level coins? we keep already earned total, but levelCoins reset visually? we keep taken flags so coins don't respawn; just respawn position.
      msg.textContent = "Splash! The ice is thin there. Respawning…";
      // penalty puff
      for (var di=0; di<10; di++) particles.push({ x: player.x, y: H-30, vx:(Math.random()-0.5)*120, vy:-80 -Math.random()*120, life:0.6, max:0.6, r:3, color:"#4f8fcf", type:"puff"});
    }

    // camera follow
    var targetCam = player.x - W/2;
    targetCam = Math.max(0, Math.min(levelWidth - W, targetCam));
    camX += (targetCam - camX) * 0.14;
    if (Math.abs(targetCam - camX) < 0.5) camX = targetCam;
    shake *= Math.pow(0.85, dt*60);
    if (shake < 0.1) shake=0;

    // squish spring
    player.squish += (0 - player.squish) * 0.22;
    if (Math.abs(player.squish) < 0.01) player.squish = 0;

    // particles
    particles = particles.filter(function(p){ return p.life>0; });
    for (var ip=0; ip<particles.length; ip++) { var pp3=particles[ip]; pp3.x+=pp3.vx*dt; pp3.y+=pp3.vy*dt; pp3.vy+= 700*dt * (pp3.type==="star"?0.6:1); pp3.life-=dt; }
    popups = popups.filter(function(p){return p.life>0;});
    for (var jp=0;jp<popups.length;jp++) { var pop=popups[jp]; pop.y+=pop.vy*dt; pop.life-=dt; }

    // update UI occasionally? already via coin collect
  }

  function render() {
    // shake
    ctx.save();
    var sx = (Math.random()-0.5)*shake;
    var sy = (Math.random()-0.5)*shake;
    ctx.translate(sx, sy);

    // sky
    var sky = ctx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0, "#8ecae6");
    sky.addColorStop(0.55, "#cfe9f7");
    sky.addColorStop(1, "#fff8ea");
    ctx.fillStyle = sky;
    ctx.fillRect(-10,-10,W+20,H+20);

    // distant mountains parallax
    ctx.fillStyle = "#a0bfd6";
    ctx.beginPath();
    ctx.moveTo(- camX*0.15 - 80, H-110);
    for (var mx= -200; mx< levelWidth+400; mx+= 220) {
      var hx = mx - camX*0.15;
      ctx.lineTo(hx + 80, 190 + Math.sin(mx*0.01)*14);
      ctx.lineTo(hx + 160, H-110);
    }
    ctx.lineTo(W+120, H-110);
    ctx.lineTo(W+120, H);
    ctx.lineTo(-120, H);
    ctx.fill();
    // nearer snowy hills
    ctx.fillStyle = "#eaf4fb";
    ctx.beginPath();
    ctx.moveTo(- camX*0.35 - 100, H-70);
    for (var nx= -200; nx< levelWidth+500; nx+= 160) {
      var nhx = nx - camX*0.35;
      ctx.lineTo(nhx + 40, 320 + Math.cos(nx*0.018)*10);
      ctx.lineTo(nhx + 120, H-70);
    }
    ctx.lineTo(W+120, H-70);
    ctx.lineTo(W+120, H);
    ctx.lineTo(-120,H);
    ctx.fill();

    // clouds
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (var ci=0; ci<5; ci++) {
      var cx = (ci*420 + 120 - camX*0.5) % (levelWidth + 300) - 100;
      var cy = 70 + ci*18 + Math.sin(performance.now()*0.0003 + ci)*6;
      // wrap
      if (cx < -120) cx += levelWidth+300;
      if (cx > W+40) cx -= levelWidth+300;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 42, 18, 0, 0, Math.PI*2);
      ctx.ellipse(cx+28, cy+6, 34, 14, 0,0,Math.PI*2);
      ctx.ellipse(cx-24, cy+7, 28, 12, 0,0,Math.PI*2);
      ctx.fill();
    }

    // ground base (snow)
    ctx.fillStyle = "#fffdf6";
    ctx.fillRect(-10, H-10, W+20, 20);

    // helper to draw world entities with camera offset
    function worldX(x) { return x - camX; }

    // platforms
    for (var pli=0; pli<platforms.length; pli++) {
      var pl = platforms[pli];
      if (!pl.alive) continue;
      // culling
      if (pl.x + pl.w < camX - 40 || pl.x > camX + W + 40) continue;
      var wx = worldX(pl.x);
      var wy = pl.y;
      // shadow
      // platform body
      var isCrumbling = pl.type==="crumble" && pl.crumbleT>0;
      var shakeY = isCrumbling ? Math.sin(performance.now()*0.06 + pli)* (pl.crumbleT* 8) : 0;
      ctx.save();
      ctx.translate(0, shakeY);
      if (pl.type==="normal") {
        ctx.fillStyle = "#eef3f7";
        ctx.strokeStyle = "#2a3442";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        // rounded top?
        ctx.roundRect(wx, wy, pl.w, pl.h, 6);
        ctx.fill(); ctx.stroke();
        // top snow
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(wx+2, wy, pl.w-4, 5);
        // texture dots
        ctx.fillStyle = "rgba(42,52,66,0.08)";
        ctx.fillRect(wx+8, wy+8, pl.w-16, 2);
      } else if (pl.type==="ice") {
        ctx.fillStyle = "#cfeeff";
        ctx.strokeStyle = "#4f8fcf";
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.roundRect(wx, wy, pl.w, pl.h, 6); ctx.fill(); ctx.stroke();
        // shine
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fillRect(wx+3, wy, pl.w-6, 4);
        // ice cracks
        ctx.strokeStyle = "rgba(79,143,207,0.35)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(wx+ pl.w*0.3, wy+5); ctx.lineTo(wx+ pl.w*0.45, wy+ pl.h-2);
        ctx.moveTo(wx+ pl.w*0.65, wy+4); ctx.lineTo(wx+ pl.w*0.55, wy+ pl.h-3);
        ctx.stroke();
      } else if (pl.type==="bouncy") {
        ctx.fillStyle = "#ffb3d1";
        ctx.strokeStyle = "#d93d7d";
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.roundRect(wx, wy, pl.w, pl.h, 6); ctx.fill(); ctx.stroke();
        // bounce pattern
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.fillRect(wx+4, wy, pl.w-8, 4);
        ctx.fillStyle = "#d93d7d";
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline="middle";
        ctx.fillText("BOING", wx+pl.w/2, wy+pl.h/2+0.5);
      } else if (pl.type==="crumble") {
        var alpha = isCrumbling ? Math.max(0, 1 - pl.crumbleT*0.9) : 1;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#d9b896";
        ctx.strokeStyle = "#6b4a2f";
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.roundRect(wx, wy, pl.w, pl.h, 6); ctx.fill(); ctx.stroke();
        // cracks
        ctx.strokeStyle = "rgba(107,74,47,0.5)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        if (isCrumbling) {
          ctx.moveTo(wx+6, wy+4); ctx.lineTo(wx+pl.w/2, wy+pl.h/2); ctx.lineTo(wx+pl.w-6, wy+4);
          ctx.moveTo(wx+pl.w*0.4, wy+pl.h-2); ctx.lineTo(wx+pl.w*0.6, wy+pl.h-2);
        } else {
          ctx.moveTo(wx+ pl.w*0.35, wy+6); ctx.lineTo(wx+pl.w*0.5, wy+pl.h-4);
          ctx.moveTo(wx+ pl.w*0.6, wy+5); ctx.lineTo(wx+pl.w*0.45, wy+pl.h-3);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (pl.type==="moving") {
        ctx.fillStyle = "#ffe7a0";
        ctx.strokeStyle = "#b58a1e";
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.roundRect(wx, wy, pl.w, pl.h, 6); ctx.fill(); ctx.stroke();
        // track dots
        ctx.fillStyle = "rgba(181,138,30,0.28)";
        var tLeft = worldX(pl.move.min);
        var tRight = worldX(pl.move.max - pl.w);
        // draw rail faintly?
        // arrows
        ctx.fillStyle = "#b58a1e";
        ctx.font = "bold 9px monospace";
        ctx.textAlign="center";
        ctx.fillText("◀ ▶", wx+pl.w/2, wy+pl.h/2+0.5);
      }
      // side shadow
      ctx.fillStyle = "rgba(42,52,66,0.12)";
      ctx.fillRect(wx+2, wy+pl.h-2, pl.w-4, 2);
      ctx.restore();
    }

    // coins
    for (var coi=0; coi<coins.length; coi++) {
      var co = coins[coi];
      if (co.taken) continue;
      if (co.x < camX - 30 || co.x > camX + W + 30) continue;
      var cwx = worldX(co.x);
      var bob = Math.sin(co.phase) * 4;
      var cwy = co.y + bob;
      // shadow
      ctx.fillStyle = "rgba(42,52,66,0.14)";
      ctx.beginPath(); ctx.ellipse(cwx, co.y+14, 10, 3, 0,0,Math.PI*2); ctx.fill();
      // coin body
      ctx.save();
      ctx.translate(cwx, cwy);
      var spin = (Math.sin(co.phase*0.9) * 0.18 + 1);
      ctx.scale(spin, 1);
      ctx.fillStyle = "#f6c445";
      ctx.strokeStyle = "#7a4a0a";
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(0,0, co.r, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      // inner
      ctx.fillStyle = "#ffe9a0";
      ctx.beginPath(); ctx.arc(0,0, co.r-4,0,Math.PI*2); ctx.fill();
      // shine
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath(); ctx.arc(-3, -3, 3.2,0,Math.PI*2); ctx.fill();
      // fish icon - simple
      ctx.fillStyle = "#7a4a0a";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText("¢", 0, 0.5);
      ctx.restore();
    }

    // flag / goal
    if (flag) {
      if (flag.x >= camX - 60 && flag.x <= camX + W + 60) {
        var fwx = worldX(flag.x);
        var fy = flag.y;
        // pole
        ctx.fillStyle = "#2a3442";
        ctx.fillRect(fwx-3, fy - flag.h, 6, flag.h);
        // flag cloth
        ctx.fillStyle = won ? "#43c6ac" : "#ff6b6b";
        ctx.strokeStyle = "#2a3442";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(fwx+3, fy - flag.h);
        ctx.lineTo(fwx+36, fy - flag.h + 11);
        ctx.lineTo(fwx+3, fy - flag.h + 22);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        // check pattern when won
        if (won) {
          ctx.fillStyle = "#fff";
          ctx.fillRect(fwx+10, fy - flag.h + 6, 8, 8);
          ctx.fillRect(fwx+22, fy - flag.h + 9, 8, 8);
        }
        // base
        ctx.fillStyle = "#6b4a2f";
        ctx.fillRect(fwx-14, fy-4, 28, 7);
        // glow when near
        var near = Math.abs(player.x - flag.x) < 120 && !won;
        if (near) {
          ctx.fillStyle = "rgba(246,196,69,"+(0.22+ Math.sin(performance.now()*0.008)*0.12)+")";
          ctx.beginPath(); ctx.arc(fwx+8, fy - flag.h/2, 32,0,Math.PI*2); ctx.fill();
        }
      }
    }

    // particles
    for (var pi2=0; pi2<particles.length; pi2++) {
      var prt = particles[pi2];
      var prx = worldX(prt.x);
      var a = Math.max(0, prt.life / prt.max);
      ctx.globalAlpha = a;
      if (prt.type==="star") {
        ctx.fillStyle = prt.color;
        ctx.beginPath(); ctx.arc(prx, prt.y, prt.r*a, 0, Math.PI*2); ctx.fill();
        // sparkle
        ctx.fillStyle = "rgba(255,255,255,"+(a*0.9)+")";
        ctx.beginPath(); ctx.arc(prx - prt.r*0.25, prt.y - prt.r*0.25, prt.r*0.35*a, 0, Math.PI*2); ctx.fill();
      } else {
        ctx.fillStyle = prt.color;
        ctx.globalAlpha = a*0.6;
        ctx.beginPath(); ctx.arc(prx, prt.y, prt.r*a,0,Math.PI*2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    // popups
    ctx.font = "bold 16px monospace";
    ctx.textAlign="center";
    for (var ui=0; ui<popups.length; ui++) {
      var popp = popups[ui];
      var ppx = worldX(popp.x);
      var pa = Math.max(0, popp.life/popp.max);
      ctx.globalAlpha = pa;
      ctx.fillStyle = "#ff6b6b";
      ctx.strokeStyle = "rgba(42,52,66,0.9)";
      ctx.lineWidth = 3;
      ctx.strokeText(popp.text, ppx, popp.y);
      ctx.fillStyle = "#fff8ea";
      ctx.fillText(popp.text, ppx, popp.y);
    }
    ctx.globalAlpha = 1;

    // penguin
    var px = worldX(player.x);
    var py = player.y;
    // clamp to visible? still draw if near edge
    ctx.save();
    ctx.translate(px, py);
    // squish
    var s = player.squish;
    ctx.scale(1 - s*0.35, 1 + s*0.65);
    // shadow under feet if onGround near ground
    // flip based on facing
    ctx.scale(player.facing, 1);

    drawPenguinModel(ctx, selectedPenguin, player);

    ctx.restore();

    // vignette when dead
    if (dead) {
      ctx.fillStyle = "rgba(79,143,207,"+(0.18 + (0.55 - deadTimer)*0.2)+")";
      ctx.fillRect(0,0,W,H);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 28px monospace";
      ctx.textAlign="center";
      ctx.textBaseline="middle";
      ctx.fillText("BRR! Respawning…", W/2, H/2);
    }
    if (won) {
      ctx.fillStyle = "rgba(255,255,255,0.82)";
      ctx.fillRect(0,0,W,H);
      ctx.fillStyle = "#1e2a3a";
      ctx.font = "bold 36px sans-serif";
      ctx.textAlign="center";
      ctx.fillText("Level complete!", W/2, H/2 - 10);
      ctx.font = "bold 16px monospace";
      ctx.fillStyle = "#394354";
      ctx.fillText(levelCoinsCollected + "/" + coins.length + " coins · Total: " + data.coins, W/2, H/2 + 22);
    }

    ctx.restore();
  }

  function drawPenguinModel(c, skin, stateObj) {
    // c already translated to player center and scaled for facing/squish
    // draw order: feet, body, belly, flippers, head, beak, eyes, hat/scarf
    var t = performance.now() * 0.006;
    var isMoving = Math.abs(stateObj.vx) > 20 && stateObj.onGround;
    var waddle = isMoving ? Math.sin(t*1.35)*0.14 : Math.sin(t*0.45)*0.04;
    var flipperSwing = isMoving ? Math.sin(t*2.2)*0.6 : Math.sin(t*0.9)*0.15;
    // feet
    c.fillStyle = skin.foot;
    c.strokeStyle = "rgba(0,0,0,0.2)";
    c.lineWidth = 1.2;
    c.beginPath();
    c.ellipse(-6, 13, 7, 3.2, 0,0,Math.PI*2); c.fill(); c.stroke();
    c.beginPath();
    c.ellipse(6, 13, 7, 3.2, 0,0,Math.PI*2); c.fill(); c.stroke();
    // body main
    c.fillStyle = skin.body;
    c.strokeStyle = "#1a2632";
    c.lineWidth = 2;
    c.beginPath();
    // body ellipse
    c.ellipse(0, 2, 12, 15, waddle, 0, Math.PI*2);
    c.fill(); c.stroke();
    // belly
    c.fillStyle = skin.belly;
    c.strokeStyle = "rgba(0,0,0,0.12)";
    c.lineWidth = 1;
    c.beginPath();
    c.ellipse(0, 4.5, 7.5, 10, waddle, 0, Math.PI*2);
    c.fill(); c.stroke();
    // flippers
    c.fillStyle = skin.body;
    c.strokeStyle = "#1a2632";
    c.lineWidth = 1.4;
    // left flipper
    c.save();
    c.translate(-11, 0);
    c.rotate(flipperSwing * 0.7);
    c.beginPath(); c.ellipse(0, 0, 4.2, 9, -0.2, 0, Math.PI*2); c.fill(); c.stroke();
    c.restore();
    // right flipper
    c.save();
    c.translate(11, 0);
    c.rotate(-flipperSwing * 0.7);
    c.beginPath(); c.ellipse(0, 0, 4.2, 9, 0.2, 0, Math.PI*2); c.fill(); c.stroke();
    c.restore();
    // head
    c.fillStyle = skin.body;
    c.beginPath();
    c.ellipse(0, -11, 11, 10, waddle*0.6, 0, Math.PI*2);
    c.fill(); c.stroke();
    // face white mask
    c.fillStyle = "#fff";
    c.beginPath();
    c.ellipse(0, -9, 8.5, 7, 0, 0, Math.PI*2);
    c.fill();
    // eyes
    c.fillStyle = skin.eye;
    c.beginPath();
    c.arc(-4.2, -11, 2.1, 0, Math.PI*2); c.fill();
    c.beginPath();
    c.arc(4.2, -11, 2.1, 0, Math.PI*2); c.fill();
    // eye shine
    c.fillStyle = "#fff";
    c.beginPath(); c.arc(-3.2, -12, 0.9, 0, Math.PI*2); c.fill();
    c.beginPath(); c.arc(5.2, -12, 0.9, 0, Math.PI*2); c.fill();
    // beak
    c.fillStyle = skin.beak;
    c.strokeStyle = "#6b3a0a";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(-5, -6.5); c.lineTo(5, -6.5); c.lineTo(0, -1.5); c.closePath();
    c.fill(); c.stroke();
    // nostrils? small line
    c.strokeStyle = "rgba(0,0,0,0.2)";
    c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(-1, -5.5); c.lineTo(1, -5.5); c.stroke();
    // hat / accessories per skin
    if (skin.hat === "berry") {
      // small berry hat
      c.fillStyle = "#c94a6a";
      c.beginPath(); c.ellipse(0, -20, 7, 5, 0,0,Math.PI*2); c.fill();
      c.fillStyle = "#7ac74f";
      c.beginPath(); c.ellipse(0, -23, 3, 2.2, 0,0,Math.PI*2); c.fill();
      c.strokeStyle = "#2b0e1a"; c.lineWidth=1; c.stroke();
    } else if (skin.hat === "crown") {
      c.fillStyle = "#f6c445";
      c.strokeStyle = "#7a4a0a"; c.lineWidth=1.2;
      c.beginPath();
      c.moveTo(-7, -18); c.lineTo(-4, -24); c.lineTo(0, -19); c.lineTo(4, -24); c.lineTo(7, -18); c.closePath();
      c.fill(); c.stroke();
      c.fillStyle = "#ff6b6b"; c.beginPath(); c.arc(0, -19.5, 1.6,0,Math.PI*2); c.fill();
    } else if (skin.hat === "headband") {
      c.fillStyle = "#ff6b6b";
      c.fillRect(-11, -16, 22, 4);
      c.strokeStyle = "#7a0f0f"; c.lineWidth=1; c.strokeRect(-11, -16, 22, 4);
      c.fillStyle = "#fff"; c.font = "bold 6px monospace"; c.textAlign="center"; c.fillText("忍", 0, -12.5);
    } else if (skin.hat === "helmet") {
      c.fillStyle = "rgba(234,242,255,0.92)";
      c.strokeStyle = "#4f8fcf"; c.lineWidth=1.4;
      c.beginPath(); c.arc(0, -11, 12.5, Math.PI*0.92, Math.PI*0.08); c.stroke();
      // glass shine
      c.fillStyle = "rgba(255,255,255,0.9)";
      c.beginPath(); c.ellipse(3, -15, 4, 2.2, -0.5,0,Math.PI*2); c.fill();
      // helmet rim
      c.fillStyle = "#4f8fcf";
      c.fillRect(-12, -5, 24, 2);
    } else if (skin.hat === "viking") {
      c.fillStyle = "#8a7a5a";
      c.strokeStyle = "#3d2f1b"; c.lineWidth=1.2;
      // helmet dome
      c.beginPath(); c.ellipse(0, -18, 10, 7, 0,0,Math.PI*2); c.fill(); c.stroke();
      // horns
      c.fillStyle = "#fff8ea";
      c.strokeStyle = "#3d2f1b";
      c.beginPath(); c.moveTo(-9, -18); c.quadraticCurveTo(-16, -26, -13, -30); c.lineTo(-8, -26); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(9, -18); c.quadraticCurveTo(16, -26, 13, -30); c.lineTo(8, -26); c.closePath(); c.fill(); c.stroke();
    }
    // scarf
    if (skin.scarf) {
      c.fillStyle = skin.scarf;
      c.strokeStyle = "rgba(0,0,0,0.18)"; c.lineWidth=1;
      c.fillRect(-9, -2, 18, 5);
      c.strokeRect(-9, -2, 18, 5);
      // tail
      c.fillRect(4, 2, 4, 8);
      c.strokeRect(4, 2, 4, 8);
      // stripes if berry
      if (skin.id==="berry") {
        c.fillStyle = "#ff6b6b";
        c.fillRect(-9, 0, 18, 1.2);
      }
      if (skin.id==="viking") {
        c.fillStyle = "#fff";
        c.fillRect(-9, 1, 18, 1);
      }
    }
    // airborne wobble shadow on body when jumping?
  }

  // shop rendering
  function renderShop() {
    shopGrid.innerHTML = "";
    shopCoinsEl.textContent = data.coins;
    PENGUINS.forEach(function(p){
      var owned = data.unlocked.indexOf(p.id)!==-1;
      var isSelected = data.selected===p.id;
      var card = document.createElement("div");
      card.className = "penguin-shop-card" + (owned?" owned":"") + (isSelected?" selected":"");
      // tiny preview canvas
      var preview = '<div class="penguin-shop-preview" style="background:' + (p.id==="classic" ? "#eaf4fb" : p.id==="astro" ? "#0f1320" : "#fff8ea") + '"><canvas width="72" height="72" data-preview="' + p.id + '"></canvas></div>';
      card.innerHTML = preview +
        '<div class="penguin-shop-info"><strong>' + p.name + '</strong><span>' + p.desc + '</span></div>' +
        '<div class="penguin-shop-action">' +
          (owned ? (isSelected ? '<span class="penguin-badge equipped">Equipped</span>' : '<button class="game-action" data-equip="' + p.id + '" type="button">Equip</button>') : '<button class="game-action" data-buy="' + p.id + '" type="button">Buy ' + p.price + '¢</button>' ) +
        '</div>';
      shopGrid.append(card);
      // draw preview after append
      var cv = card.querySelector('canvas[data-preview="'+p.id+'"]');
      if (cv) {
        var pc = cv.getContext("2d");
        pc.clearRect(0,0,72,72);
        pc.save();
        pc.translate(36, 38);
        // draw mini penguin (scale 1.2)
        pc.scale(1.25,1.25);
        var fakeState = { vx:0, vy:0, onGround:true, facing:1, squish:0 };
        // reuse draw func but need to mock selected skin locally
        // inline mini draw without calling full model scale issues
        // create temporary skin reference
        (function(c2, skin2){
          // feet
          c2.fillStyle = skin2.foot;
          c2.beginPath(); c2.ellipse(-5, 12, 6, 2.8, 0,0,Math.PI*2); c2.fill();
          c2.beginPath(); c2.ellipse(5, 12, 6, 2.8, 0,0,Math.PI*2); c2.fill();
          // body
          c2.fillStyle = skin2.body; c2.strokeStyle = "#1a2632"; c2.lineWidth=1.3;
          c2.beginPath(); c2.ellipse(0,2,10,13,0,0,Math.PI*2); c2.fill(); c2.stroke();
          c2.fillStyle = skin2.belly; c2.beginPath(); c2.ellipse(0,4,6.5,8.5,0,0,Math.PI*2); c2.fill();
          c2.fillStyle = skin2.body; c2.beginPath(); c2.ellipse(0,-10,9.5,8.5,0,0,Math.PI*2); c2.fill(); c2.stroke();
          c2.fillStyle = "#fff"; c2.beginPath(); c2.ellipse(0,-8,7.2,6,0,0,Math.PI*2); c2.fill();
          c2.fillStyle = skin2.eye; c2.beginPath(); c2.arc(-3.6,-10,1.7,0,Math.PI*2); c2.fill(); c2.beginPath(); c2.arc(3.6,-10,1.7,0,Math.PI*2); c2.fill();
          c2.fillStyle = "#fff"; c2.beginPath(); c2.arc(-2.9,-11,0.7,0,Math.PI*2); c2.fill(); c2.beginPath(); c2.arc(4.3,-11,0.7,0,Math.PI*2); c2.fill();
          c2.fillStyle = skin2.beak; c2.beginPath(); c2.moveTo(-4,-5.5); c2.lineTo(4,-5.5); c2.lineTo(0,-1.2); c2.closePath(); c2.fill();
          if (skin2.hat==="berry") { c2.fillStyle="#c94a6a"; c2.beginPath(); c2.ellipse(0,-18,6,4,0,0,Math.PI*2); c2.fill(); c2.fillStyle="#7ac74f"; c2.beginPath(); c2.ellipse(0,-21,2.4,1.7,0,0,Math.PI*2); c2.fill(); }
          else if(skin2.hat==="crown"){ c2.fillStyle="#f6c445"; c2.beginPath(); c2.moveTo(-6,-16); c2.lineTo(-3,-21); c2.lineTo(0,-16); c2.lineTo(3,-21); c2.lineTo(6,-16); c2.closePath(); c2.fill(); }
          else if(skin2.hat==="headband"){ c2.fillStyle="#ff6b6b"; c2.fillRect(-9,-14,18,3); }
          else if(skin2.hat==="helmet"){ c2.strokeStyle="#4f8fcf"; c2.lineWidth=1; c2.beginPath(); c2.arc(0,-10,10, Math.PI*0.92, Math.PI*0.08); c2.stroke(); }
          else if(skin2.hat==="viking"){ c2.fillStyle="#8a7a5a"; c2.beginPath(); c2.ellipse(0,-16,8,6,0,0,Math.PI*2); c2.fill(); c2.fillStyle="#fff8ea"; c2.beginPath(); c2.moveTo(-7,-16); c2.quadraticCurveTo(-12,-22,-10,-25); c2.lineTo(-6,-22); c2.closePath(); c2.fill(); c2.beginPath(); c2.moveTo(7,-16); c2.quadraticCurveTo(12,-22,10,-25); c2.lineTo(6,-22); c2.closePath(); c2.fill(); }
          if(skin2.scarf){ c2.fillStyle=skin2.scarf; c2.fillRect(-7,-1,14,4); c2.fillRect(3,2,3,6); }
        })(pc, p);
        pc.restore();
      }
    });
    // attach buy/equip handlers
    shopGrid.querySelectorAll("[data-buy]").forEach(function(btn){
      btn.addEventListener("click", function(){
        var id = btn.getAttribute("data-buy");
        var peng = penguinById(id);
        if (data.coins >= peng.price) {
          data.coins -= peng.price;
          data.unlocked.push(id);
          data.selected = id;
          selectedPenguin = peng;
          saveData();
          renderShop();
          updateUI();
          msg.textContent = "New penguin unlocked: " + peng.name + "! Equipped.";
        } else {
          msg.textContent = "Not enough coins for " + peng.name + ". Need " + peng.price + "¢, you have " + data.coins + "¢.";
          // shake shop coins
          shopCoinsEl.animate([{transform:"translateX(0)"},{transform:"translateX(-4px)"},{transform:"translateX(4px)"},{transform:"translateX(0)"}], {duration:240});
        }
      });
    });
    shopGrid.querySelectorAll("[data-equip]").forEach(function(btn){
      btn.addEventListener("click", function(){
        var id = btn.getAttribute("data-equip");
        data.selected = id;
        selectedPenguin = penguinById(id);
        saveData();
        renderShop();
        updateUI();
        msg.textContent = "Equipped " + selectedPenguin.name + ". Much waddle. Very slide.";
      });
    });
  }

  function openShop() {
    renderShop();
    shopOverlay.hidden = false;
    shopOverlay.style.display = "flex";
  }
  function closeShop() {
    shopOverlay.hidden = true;
    shopOverlay.style.display = "none";
  }

  // input handling
  function keydown(e) {
    if (shopOverlay && !shopOverlay.hidden && e.key==="Escape") { closeShop(); return; }
    if (document.activeElement && (document.activeElement.tagName==="INPUT" || document.activeElement.tagName==="TEXTAREA")) return;
    var k = e.key.toLowerCase();
    if (k===" " || e.code==="Space") {
      // don't trigger if focused on button
      if (e.target && e.target.tagName==="BUTTON" && e.target.id!=="penguinCanvas") { /* allow */ } else { e.preventDefault(); }
      if (!keys.has(" ")) tryJump();
      keys.add(" ");
      // also buffer
      if (player.buffer<=0) player.buffer = BUFFER_TIME;
    } else {
      keys.add(e.key);
      if (k==="w" || e.key==="ArrowUp") {
        if (!e.repeat) tryJump();
      }
    }
  }
  function keyup(e) {
    keys.delete(e.key);
    keys.delete(" ");
    if (e.key===" " || e.code==="Space") keys.delete(" ");
  }

  // touch controls
  function bindTouch() {
    var touchWrap = document.querySelector("#penguinTouch");
    if (!touchWrap) return;
    var leftBtn = touchWrap.querySelector('[data-touch="left"]');
    var rightBtn = touchWrap.querySelector('[data-touch="right"]');
    var jumpBtn = touchWrap.querySelector('[data-touch="jump"]');
    function addHold(el, onDown, onUp) {
      el.addEventListener("pointerdown", function(ev){ ev.preventDefault(); el.setPointerCapture(ev.pointerId); onDown(); });
      el.addEventListener("pointerup", function(ev){ ev.preventDefault(); onUp(); });
      el.addEventListener("pointercancel", onUp);
      el.addEventListener("pointerleave", onUp);
    }
    addHold(leftBtn, function(){ touchLeft=true; }, function(){ touchLeft=false; });
    addHold(rightBtn, function(){ touchRight=true; }, function(){ touchRight=false; });
    addHold(jumpBtn, function(){ if(!touchJump){ touchJump=true; tryJump(); }}, function(){ touchJump=false; });
    // also allow canvas tap to jump
    canvas.addEventListener("pointerdown", function(ev){
      var rect = canvas.getBoundingClientRect();
      var x = ev.clientX - rect.left;
      // if tap on right half -> jump, else move?
      // For simplicity: tap anywhere jumps if not on touch buttons
      if (ev.target === canvas) {
        // small deadzone near touch controls? ignore
        tryJump();
      }
    });
  }

  document.addEventListener("keydown", keydown);
  document.addEventListener("keyup", keyup);
  document.querySelector("#penguinShopBtn").addEventListener("click", openShop);
  document.querySelector("#penguinShopClose").addEventListener("click", closeShop);
  shopOverlay.addEventListener("click", function(ev){ if(ev.target===shopOverlay) closeShop(); });
  document.querySelector("#penguinRestart").addEventListener("click", function(){ buildLevel(levelIndex); });
  document.querySelector("#penguinNext").addEventListener("click", function(){
    var next = levelIndex + 1;
    if (next >= 30) next = 0; // loop after 30? keep endless
    buildLevel(next);
  });

  bindTouch();

  // init
  selectedPenguin = penguinById(data.selected);
  buildLevel(0);
  renderShop();
  closeShop();

  function tick(now) {
    var dt = Math.min(0.033, (now - last)/1000);
    last = now;
    update(dt);
    render();
    raf = requestAnimationFrame(tick);
  }
  last = performance.now();
  raf = requestAnimationFrame(tick);

  // expose for embed snapshots already via setSnapshot
  activeCleanup = function() {
    cancelAnimationFrame(raf);
    document.removeEventListener("keydown", keydown);
    document.removeEventListener("keyup", keyup);
  };
  // allow external advance
  activeAdvance = function(ms){
    var steps = Math.max(1, Math.round(ms/16));
    for (var i=0;i<steps;i++) update(1/60);
    render();
  };
}

Object.assign(gameStarters, {
  penguin: startPenguinParkour
});
