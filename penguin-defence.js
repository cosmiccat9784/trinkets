/* Penguin Defence — Tower Defence
   Protect the colony! Seals, foxes, owls, bears — and when it's REALLY cold, the PENGUIN arrives. */
function startPenguinDefence() {
  openGame(
    "Penguin Defence",
    "Arcade",
    '<div class="game-layout">' +
      '<div class="game-topline">' +
        '<span class="game-stat" id="defWave">Wave 1</span>' +
        '<span class="game-stat" id="defLives">\u2764 20</span>' +
        '<span class="game-stat" id="defMoney">\uD83D\uDC1F 120</span>' +
        '<span class="game-stat" id="defScore">Score 0</span>' +
      '</div>' +
      '<p class="game-message" id="defMsg">Place seals, owls, bears &amp; foxes to defend the colony. Survive the waves!</p>' +
      '<div class="defence-main" id="defMain">' +
        '<div class="defence-stage" id="defStage">' +
          '<canvas class="defence-canvas" id="defenceCanvas" width="720" height="432"></canvas>' +
          '<div class="defence-cold-banner" id="defColdBanner" hidden><span class="def-cold-icon">\u2744\uFE0F</span><span id="defColdText">THE ICE IS THICKENING...</span><span class="def-cold-icon">\u2744\uFE0F</span></div>' +
        '</div>' +
        '<div class="defence-sidebar" id="defSidebar">' +
          '<div class="defence-shop" id="defShop"></div>' +
          '<div class="defence-info" id="defInfo" hidden></div>' +
        '</div>' +
      '</div>' +
      '<div class="game-actions">' +
        '<button class="game-action" id="defNextWave" type="button">Start wave</button>' +
        '<button class="game-action" id="defSpeed" type="button" title="Toggle speed">\u23E9 1\u00D7</button>' +
        '<button class="game-action" id="defRestart" type="button">Restart</button>' +
      '</div>' +
    '</div>'
  );

  var canvas = document.querySelector("#defenceCanvas");
  var ctx = canvas.getContext("2d");
  var W = canvas.width;
  var H = canvas.height;
  var msgEl = document.querySelector("#defMsg");
  var waveEl = document.querySelector("#defWave");
  var livesEl = document.querySelector("#defLives");
  var moneyEl = document.querySelector("#defMoney");
  var scoreEl = document.querySelector("#defScore");
  var shopEl = document.querySelector("#defShop");
  var infoEl = document.querySelector("#defInfo");
  var nextBtn = document.querySelector("#defNextWave");
  var speedBtn = document.querySelector("#defSpeed");
  var bannerEl = document.querySelector("#defColdBanner");
  var bannerText = document.querySelector("#defColdText");

  // ---- config ----
  var COLS = 12;
  var ROWS = 8;
  var CELL_W = W / COLS;
  var CELL_H = H / ROWS;
  var PATH_W = 38;
  var START_MONEY = 170;
  var START_LIVES = 25;

  var TOWER_DEFS = {
    // Seal intentionally worse now — clumsier, shorter reach, slower clap (as requested)
    seal:  { id:"seal",  name:"Seal",       cost:42,  dmg:11, range:82,  rate:0.68, projSpeed:420, color:"#b8a99a", accent:"#e8ddd0", bullet:"#6ddcff", desc:"Clumsy splash", emoji:"\uD83E\uDDAD" },
    fox:   { id:"fox",   name:"Arctic Fox", cost:45,  dmg:13, range:104, rate:1.28, projSpeed:540, color:"#d98a42", accent:"#ffe2c0", bullet:"#ff8a65", desc:"Speedster", emoji:"\uD83E\uDD8A" },
    owl:   { id:"owl",   name:"Snowy Owl",  cost:78,  dmg:30, range:172, rate:0.66, projSpeed:620, color:"#f0f0f0", accent:"#cde6ff", bullet:"#ffffff", desc:"Long-range", emoji:"\uD83E\uDD89" },
    bear:  { id:"bear",  name:"Polar Bear", cost:120, dmg:52, range:102, rate:0.52, projSpeed:420, color:"#fdfdfd", accent:"#d0e8ff", bullet:"#ffd54f", desc:"Heavy paw", emoji:"\uD83D\uDC3B" },
    penguin:{id:"penguin",name:"PENGUIN",   cost:310, dmg:108,range:146, rate:0.96, projSpeed:680, color:"#1e2a3a", accent:"#fff8ea", bullet:"#ffd700", desc:"THE MENACE \u2744\uFE0F", emoji:"\uD83D\uDC27", limit:3, unlockWave:7, aoe:64 }
  };
  var TOWER_ORDER = ["seal","fox","owl","bear","penguin"];

  var ENEMY_DEFS = {
    crab:    { hp:28,  speed:70, reward:10, radius:12, color:"#ff6b35", stroke:"#7a2b00", eye:"#fff", name:"Crab" },
    wolf:    { hp:22,  speed:84, reward:11, radius:10, color:"#a4b0bc", stroke:"#2b3440", eye:"#ffd166", name:"Wolf" },
    // people — more humans invading the colony!
    hunter:  { hp:46,  speed:68, reward:14, radius:12, color:"#6b7cff", stroke:"#232a6a", eye:"#fff", name:"Hunter" },
    poacher: { hp:38,  speed:72, reward:13, radius:11, color:"#8a5a2b", stroke:"#4a2e0a", eye:"#fff8c0", name:"Poacher" },
    skier:   { hp:30,  speed:86, reward:12, radius:11, color:"#43c6ac", stroke:"#1a4a3f", eye:"#0f2a1a", name:"Skier" },
    explorer:{ hp:42,  speed:66, reward:15, radius:12, color:"#ff9f43", stroke:"#7a3a0a", eye:"#fff", name:"Explorer" },
    yeti:    { hp:108, speed:48, reward:26, radius:16, color:"#eef4ff", stroke:"#6e7d9a", eye:"#ff4757", name:"Yeti" },
    boss:    { hp:380, speed:36, reward:82, radius:23, color:"#8a0f1f", stroke:"#1a0408", eye:"#ffd700", name:"BOSS" }
  };

  // waypoints — aligned to grid cell centers so path sits cleanly inside tiles
  // COLS=12 (60px), ROWS=8 (54px), center = c*60+30, r*54+27
  var WAYPOINTS = [
    { x:-30, y: 81 },   // off-screen left, row 1
    { x:150, y: 81 },   // (2,1)
    { x:150, y:297 },   // (2,5)
    { x:390, y:297 },   // (6,5)
    { x:390, y: 81 },   // (6,1)
    { x:570, y: 81 },   // (9,1)
    { x:570, y:297 },   // (9,5)
    { x:750, y:297 }    // off-screen right, row 5
  ];

  // colony (igloo) just before exit — sits on its own ice tile
  var COLONY = { x: 690, y:297, r:34 };

  // state
  var money = START_MONEY;
  var lives = START_LIVES;
  var wave = 1;
  var score = 0;
  var towers = [];
  var enemies = [];
  var projectiles = [];
  var particles = [];
  var popups = [];
  var spawnQueue = [];
  var spawnTimer = 0;
  var waveActive = false;
  var waveCooldown = 0;
  var gameOver = false;
  var won = false;
  var selectedBuild = null;
  var selectedTower = null;
  var hoverCell = null;
  var mousePos = { x:0, y:0 };
  var gameSpeed = 1;
  var shake = 0;
  var penguinUnlocked = false;
  var penguinBannerShown = false;
  var penguinCount = 0;
  var coldLevel = 0;
  var bestWave = 0;
  try { bestWave = readScores().defence || 0; } catch(e){}
  var waveLeaks = 0;
  var totalKills = 0;
  var perfectWaves = 0;
  var raf = 0;
  var last = performance.now();
  var snow = [];
  var tutorialShown = false;
  try { tutorialShown = localStorage.getItem("trinkets-defence-tut")==="1"; } catch(e){}
  // --- local save / resume (don't lose game on X) ---
  var SAVE_KEY = "trinkets-penguin-defence-save-v1";
  function saveDefence(){
    try{
      // don't save mid-wave enemies/projectiles — save between-wave building state so resume is clean
      var saveTowers = towers.map(function(t){ return {c:t.c,r:t.r,id:t.id,level:t.level,totalCost:t.totalCost,kills:t.kills}; });
      var payload = {
        v:1,
        money: money, lives: lives, wave: wave, score: score,
        towers: saveTowers,
        coldLevel: coldLevel, penguinUnlocked: penguinUnlocked, penguinCount: penguinCount,
        perfectWaves: perfectWaves, totalKills: totalKills, waveLeaks: waveLeaks,
        gameOver: gameOver, won: won
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    }catch(e){}
  }
  function loadDefence(){
    try{
      var raw = localStorage.getItem(SAVE_KEY);
      if(!raw) return null;
      var d = JSON.parse(raw);
      if(!d || typeof d!=="object" || !Array.isArray(d.towers)) return null;
      if(typeof d.money!=="number" || typeof d.wave!=="number") return null;
      // validate towers are within grid and defs exist
      d.towers = d.towers.filter(function(t){ return typeof t.c==="number" && typeof t.r==="number" && TOWER_DEFS[t.id]; });
      return d;
    }catch(e){ return null; }
  }
  function clearDefenceSave(){ try{ localStorage.removeItem(SAVE_KEY); }catch(e){} }
  function requestFit(){ try{ if(typeof fitGameShell==="function") requestAnimationFrame(function(){ requestAnimationFrame(function(){ fitGameShell(); }); }); }catch(e){} }
  // audio
  var audioCtx = null;
  function beep(freq, dur, vol, type){
    try{
      if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
      var o = audioCtx.createOscillator(), g=audioCtx.createGain();
      o.type = type||"sine"; o.frequency.value=freq;
      g.gain.value=vol||0.18;
      o.connect(g); g.connect(audioCtx.destination);
      o.start(); g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime+dur);
      o.stop(audioCtx.currentTime+dur+0.02);
    }catch(e){}
  }

  // build grid occupancy — only path cells are blocked, no fuzzy overlap
  var blocked = [];
  function buildBlocked() {
    blocked = [];
    for (var r=0;r<ROWS;r++) for (var c=0;c<COLS;c++) {
      var cx = c*CELL_W + CELL_W/2;
      var cy = r*CELL_H + CELL_H/2;
      // tight threshold so only cells whose centre is near the road are blocked → no "path in middle of tile" bleed
      var isBlocked = pointToPathDist(cx, cy) < (PATH_W/2 + 7);
      // colony pad is reserved — block its 2×2 footprint
      if (Math.hypot(cx - COLONY.x, cy - COLONY.y) < 36) isBlocked = true;
      blocked.push(isBlocked);
    }
  }

  function pointToPathDist(px, py) {
    var min = 1e9;
    for (var i=0;i<WAYPOINTS.length-1;i++) {
      var a = WAYPOINTS[i], b = WAYPOINTS[i+1];
      var d = distToSegment(px, py, a.x, a.y, b.x, b.y);
      if (d < min) min = d;
    }
    return min;
  }
  function distToSegment(px, py, x1,y1, x2,y2) {
    var l2 = (x2-x1)*(x2-x1)+(y2-y1)*(y2-y1);
    if (l2===0) return Math.hypot(px-x1, py-y1);
    var t = Math.max(0, Math.min(1, ((px-x1)*(x2-x1)+(py-y1)*(y2-y1))/l2));
    var projx = x1 + t*(x2-x1);
    var projy = y1 + t*(y2-y1);
    return Math.hypot(px-projx, py-projy);
  }
  function cellIndex(c,r){ return r*COLS + c; }
  function cellCenter(c,r){ return { x: c*CELL_W + CELL_W/2, y: r*CELL_H + CELL_H/2 }; }
  function isBlockedCell(c,r){
    if(c<0||c>=COLS||r<0||r>=ROWS) return true;
    return blocked[cellIndex(c,r)];
  }
  function towerAtCell(c,r){
    for(var i=0;i<towers.length;i++) if(towers[i].c===c && towers[i].r===r) return towers[i];
    return null;
  }

  // snow init
  for(var si=0; si<28; si++) snow.push({ x: Math.random()*W, y: Math.random()*H, r: 1+Math.random()*2.2, speed: 18+Math.random()*28, drift: Math.random()*Math.PI*2, driftSpeed: 0.6+Math.random()*0.9, alpha: 0.35+Math.random()*0.5 });

  function getWaveList(w) {
    var base = 8 + Math.floor(w * 2.0);
    if (w > 15) base = Math.min(44, base);
    var types = [];
    // more people as game goes on — easier but busier!
    if (w < 3) types = ["crab","poacher"];
    else if (w < 5) types = ["crab","wolf","poacher","skier"];
    else if (w < 7) types = ["crab","wolf","hunter","poacher","skier"];
    else if (w < 10) types = ["hunter","poacher","skier","explorer","wolf","crab"];
    else if (w < 13) types = ["hunter","poacher","skier","explorer","yeti","wolf"];
    else types = ["hunter","poacher","skier","explorer","yeti","wolf","crab"];
    var list = [];
    for (var i=0;i<base;i++) {
      var t = types[Math.floor(Math.random()*types.length)];
      // inject tougher but keep mostly people — game easier, more bodies
      if (w >= 7 && Math.random() < 0.09) t = "yeti";
      if (w >= 4 && Math.random() < 0.14) t = ["hunter","poacher","explorer","skier"][Math.floor(Math.random()*4)];
      list.push(t);
    }
    // boss every 5 waves
    if (w % 5 === 0) {
      // replace last few with stronger
      for (var k=0;k< Math.min(2, Math.floor(w/5)); k++) list[list.length-1-k] = "boss";
      if (list.indexOf("boss")===-1) list.push("boss");
    }
    // ensure boss wave has at least boss
    return list;
  }

  function queueWave(w) {
    var list = getWaveList(w);
    spawnQueue = list.map(function(t, idx){
      return { type:t, delay: idx===0? 0.4 : 0.55 + Math.random()*0.35 - (Math.min(0.22, (w-1)*0.015)) };
    });
    spawnTimer = 0;
    waveActive = true;
    waveCooldown = 0;
    waveLeaks = 0;
    updateNextBtn();
    msgEl.textContent = "Wave " + w + " incoming! " + list.length + " invaders. Hold the line!";
    beep(220,0.12,0.12,"square"); beep(330,0.12,0.12,"square");
    // cold progression
    coldLevel = Math.min(0.46, (w-1)*0.038);
    if (w >= TOWER_DEFS.penguin.unlockWave && !penguinUnlocked) {
      penguinUnlocked = true;
      triggerPenguinBanner();
    }
    // show tutorial on first wave if not shown
    if(w===1 && !tutorialShown){
      setTimeout(function(){
        msgEl.textContent = "💡 Tip: Seals are cheap & quick — place 2-3 near the first bend, then hit Start wave!";
        tutorialShown=true;
        try{ localStorage.setItem("trinkets-defence-tut","1"); }catch(e){}
      }, 1800);
    }
  }

  function triggerPenguinBanner() {
    if (penguinBannerShown) return;
    penguinBannerShown = true;
    bannerText.textContent = "\u2744\uFE0F THE PENGUIN HAS ARRIVED \u2744\uFE0F";
    bannerEl.hidden = false;
    bannerEl.classList.add("show");
    shake = 18;
    msgEl.textContent = "\u2744\uFE0F Something stirs beneath the ice... THE PENGUIN is now available! \u2744\uFE0F";
    // burst
    for(var i=0;i<18;i++){
      var a=Math.random()*Math.PI*2; var sp=60+Math.random()*140;
      particles.push({ x:W/2 + (Math.random()-0.5)*120, y:H/2, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp - 20, life:0.9, max:0.9, r:3+Math.random()*3, color:"#ffd700", type:"star"});
    }
    setTimeout(function(){
      bannerEl.classList.remove("show");
      setTimeout(function(){ bannerEl.hidden = true; }, 450);
    }, 2600);
    renderShop();
  }

  function coldBannerForWave(w){
    if(w===5 || w===7){
      bannerText.textContent = w===5 ? "\u2744\uFE0F THE WIND HOWLS \u2744\uFE0F" : "\u2744\uFE0F ICE CRACKS LOUDER... \u2744\uFE0F";
      bannerEl.hidden=false;
      bannerEl.classList.add("show");
      setTimeout(function(){ bannerEl.classList.remove("show"); setTimeout(function(){bannerEl.hidden=true;},420);},1500);
    }
  }

  function updateNextBtn(){
    if(gameOver || won) { nextBtn.textContent = "Game over"; nextBtn.disabled=true; return; }
    if(waveActive) {
      var remaining = spawnQueue.length + enemies.length;
      if(remaining===0){
        nextBtn.textContent = "Next wave ("+wave+")";
        nextBtn.disabled=false;
      } else {
        nextBtn.textContent = spawnQueue.length>0? "Wave "+wave+" ("+remaining+" left)" : "Defend! ("+remaining+" left)";
        nextBtn.disabled=false;
      }
    } else {
      nextBtn.textContent = wave===1?"Start wave":"Next wave \u2192";
      nextBtn.disabled=false;
    }
  }

  function startNextWaveNow(){
    if(gameOver || won) return;
    if(waveActive && enemies.length===0 && spawnQueue.length===0){
      // already finished, advance
      wave++;
      queueWave(wave);
      coldBannerForWave(wave);
      updateUI();
      return;
    }
    if(!waveActive){
      queueWave(wave);
      updateUI();
      return;
    }
    // early start bonus if wave still active but queue empty? Actually allow early next wave for bonus
    // If currently waveActive but player clicks to rush next wave early (needs queue empty and enemies present) give bonus
    if(waveActive){
      // if enemies still alive, accelerating next wave means spawning next wave alongside current -> chaotic for bonus
      // give 15 coins per wave for rushing
      money += Math.max(8, Math.floor(wave*2.2));
      popups.push({ x:W/2, y:40, vy:-30, life:0.9, max:0.9, text:"Rush bonus! +"+Math.max(8, Math.floor(wave*2.2))+" \uD83D\uDC1F" });
      spawnQueue = spawnQueue.concat(getWaveList(wave+1).map(function(t){return {type:t, delay:0.35+Math.random()*0.25};}));
      wave++;
      coldLevel = Math.min(0.42, (wave-1)*0.038);
      if(wave>=TOWER_DEFS.penguin.unlockWave && !penguinUnlocked) penguinUnlocked=true, triggerPenguinBanner();
      else coldBannerForWave(wave);
      updateUI();
      renderShop();
    }
  }

  function placeTower(c,r){
    if(isBlockedCell(c,r)) {
      msgEl.textContent = "Can't build on the path or colony ice!";
      shake = 6;
      return false;
    }
    if(towerAtCell(c,r)) { msgEl.textContent = "Already a defender there!"; return false; }
    if(!selectedBuild) return false;
    var def = TOWER_DEFS[selectedBuild];
    if(!def) return false;
    if(def.id==="penguin" && !penguinUnlocked){
      msgEl.textContent = "The Penguin hasn't arrived yet... survive until wave " + def.unlockWave + "!";
      return false;
    }
    if(def.limit && penguinCount >= def.limit){
      msgEl.textContent = "Max " + def.limit + " Penguins on the ice! (you have " + penguinCount + ")";
      return false;
    }
    if(money < def.cost){
      msgEl.textContent = "Not enough fish! Need " + def.cost + " \uD83D\uDC1F";
      var btn = shopEl.querySelector('[data-tower="'+def.id+'"]');
      if(btn) btn.animate([{transform:"translateX(0)"},{transform:"translateX(-4px)"},{transform:"translateX(4px)"},{transform:"translateX(0)"}],{duration:220});
      return false;
    }
    money -= def.cost;
    var cen = cellCenter(c,r);
    var tower = {
      c:c, r:r, x:cen.x, y:cen.y, id:def.id, def:def,
      level:1, dmg:def.dmg, range:def.range, rate:def.rate,
      cooldown:0, kills:0, totalCost:def.cost,
      angle: -Math.PI/2
    };
    towers.push(tower);
    if(def.id==="penguin"){ penguinCount++; tower.blizzardCd = 9 + Math.random()*1.5; }
    selectedTower = tower;
    // keep building same type if money left, else clear?
    if(money < def.cost) selectedBuild = null;
    msgEl.textContent = def.name + " deployed! " + def.desc;
    beep(440,0.09,0.14,"triangle"); beep(660,0.09,0.14,"triangle");
    // burst
    for(var i=0;i<6;i++) particles.push({x:cen.x, y:cen.y, vx:(Math.random()-0.5)*70, vy:-20 -Math.random()*40, life:0.4, max:0.4, r:2, color:"#fff", type:"puff"});
    score += 5;
    updateUI();
    renderShop();
    renderInfo();
    return true;
  }

  function upgradeTower(t){
    if(!t || t.level >= 3) return;
    var cost = Math.round(t.def.cost * (0.78 + t.level * 0.62));
    if(money < cost){
      msgEl.textContent = "Need " + cost + " \uD83D\uDC1F to upgrade " + t.def.name + "!";
      return;
    }
    money -= cost;
    t.totalCost += cost;
    t.level++;
    // scale formulas
    if(t.level===2){
      t.dmg = Math.round(t.def.dmg * 1.75);
      t.range = t.def.range + 14;
      t.rate = t.def.rate * 1.18;
    } else if(t.level===3){
      t.dmg = Math.round(t.def.dmg * 2.9);
      t.range = t.def.range + 26;
      t.rate = t.def.rate * 1.38;
    }
    msgEl.textContent = t.def.name + " upgraded to level " + t.level + "! \u2B50";
    beep(520,0.1,0.15,"triangle"); beep(770,0.14,0.15,"triangle");
    for(var i=0;i<10;i++){
      var ang=Math.random()*Math.PI*2; var sp=40+Math.random()*90;
      particles.push({x:t.x, y:t.y, vx:Math.cos(ang)*sp, vy:Math.sin(ang)*sp, life:0.5, max:0.5, r:2.5, color:"#ffd700", type:"star"});
    }
    popups.push({x:t.x, y:t.y-28, vy:-36, life:0.8, max:0.8, text:"Lv."+t.level+"!"});
    shake = 5;
    updateUI();
    renderInfo();
    renderShop();
  }
  function sellTower(t){
    if(!t) return;
    var idx = towers.indexOf(t);
    if(idx===-1) return;
    var refund = Math.round(t.totalCost * 0.68);
    money += refund;
    if(t.id==="penguin") penguinCount = Math.max(0, penguinCount-1);
    towers.splice(idx,1);
    if(selectedTower===t) selectedTower=null;
    msgEl.textContent = t.def.name + " returned to the colony. +"+refund+" \uD83D\uDC1F";
    for(var i=0;i<8;i++) particles.push({x:t.x, y:t.y, vx:(Math.random()-0.5)*80, vy:-30 -Math.random()*30, life:0.45, max:0.45, r:2, color:"rgba(180,190,200,0.9)", type:"puff"});
    updateUI();
    renderShop();
    renderInfo();
  }

  function enemyStatForWave(type, waveNum){
    var base = ENEMY_DEFS[type];
    // easier curve — less HP ramp, slower speed ramp
    var hpScale = 1 + (waveNum-1)*0.24 + Math.max(0, waveNum-10)*0.045;
    if(type==="boss") hpScale = 1 + (waveNum-1)*0.20;
    var hp = Math.round(base.hp * hpScale);
    var speed = base.speed * (1 + Math.min(0.26, (waveNum-1)*0.012));
    return { hp:hp, maxHp:hp, speed:speed, reward:base.reward + Math.floor((waveNum-1)*0.6), radius:base.radius, color:base.color, stroke:base.stroke, eye:base.eye, name:base.name };
  }

  function spawnEnemy(type){
    var st = enemyStatForWave(type, wave);
    var e = {
      type:type, x:WAYPOINTS[0].x, y:WAYPOINTS[0].y,
      hp:st.hp, maxHp:st.maxHp, speed:st.speed, reward:st.reward,
      radius:st.radius, color:st.color, stroke:st.stroke, eye:st.eye, name:st.name,
      wp:1, // next waypoint idx
      progress:0, // 0-1 between waypoints? for target priority
      slow:0, // slow timer
      phase: Math.random()*Math.PI*2
    };
    enemies.push(e);
  }

  function findTarget(tower){
    var best = null;
    var bestProg = -1;
    var bestDist = 1e9;
    for(var i=0;i<enemies.length;i++){
      var e = enemies[i];
      var dx = e.x - tower.x, dy = e.y - tower.y;
      var d2 = dx*dx + dy*dy;
      if(d2 > tower.range*tower.range) continue;
      // progress metric: waypoint index + fraction
      var prog = e.wp + Math.min(1, Math.hypot(e.x - WAYPOINTS[e.wp-1].x, e.y - WAYPOINTS[e.wp-1].y) / Math.max(1, Math.hypot(WAYPOINTS[e.wp].x - WAYPOINTS[e.wp-1].x, WAYPOINTS[e.wp].y - WAYPOINTS[e.wp-1].y)))*0.9;
      // Prefer furthest along path (closest to colony)
      if(prog > bestProg || (prog===bestProg && d2 < bestDist)){
        best = e; bestProg = prog; bestDist = d2;
      }
    }
    return best;
  }

  function fireProjectile(tower, target){
    var dx = target.x - tower.x, dy = target.y - tower.y;
    var ang = Math.atan2(dy, dx);
    tower.angle = ang;
    var def = tower.def;
    var proj = {
      x: tower.x + Math.cos(ang)*16,
      y: tower.y + Math.sin(ang)*16,
      vx: Math.cos(ang)*def.projSpeed,
      vy: Math.sin(ang)*def.projSpeed,
      dmg: tower.dmg,
      aoe: def.aoe || 0,
      color: def.bullet,
      owner: tower,
      target: target,
      life: 1.8,
      type: def.id
    };
    projectiles.push(proj);
    // muzzle puff
    particles.push({x:proj.x, y:proj.y, vx:Math.cos(ang)*30 + (Math.random()-0.5)*10, vy:Math.sin(ang)*30 + (Math.random()-0.5)*10, life:0.16, max:0.16, r:3, color:def.bullet, type:"puff"});
    // special for penguin: extra frost puff
    if(def.id==="penguin"){
      for(var i=0;i<3;i++) particles.push({x:tower.x, y:tower.y, vx:(Math.random()-0.5)*40, vy:(Math.random()-0.5)*40, life:0.35, max:0.35, r:2, color:"rgba(160,220,255,0.9)", type:"puff"});
    }
  }

  // UI rendering
  function renderShop(){
    shopEl.innerHTML = "";
    TOWER_ORDER.forEach(function(id){
      var def = TOWER_DEFS[id];
      var isPenguin = id==="penguin";
      var locked = isPenguin && !penguinUnlocked;
      var canAfford = money >= def.cost;
      var atLimit = def.limit && penguinCount >= def.limit;
      var btn = document.createElement("button");
      btn.type="button";
      btn.className = "def-shop-btn" + (selectedBuild===id?" selected":"") + (locked || !canAfford || atLimit ? " disabled":"") + (isPenguin?" penguin":"");
      btn.setAttribute("data-tower", id);
      if(locked){
        btn.innerHTML = '<span class="def-btn-icon">\uD83D\uDD12</span><span class="def-btn-name">'+def.name+'</span><span class="def-btn-cost">Wave '+def.unlockWave+'</span><span class="def-btn-desc">'+def.desc+'</span>';
        btn.disabled = true;
        btn.title = "Unlocks at wave " + def.unlockWave;
      } else if(atLimit){
        btn.innerHTML = '<span class="def-btn-icon">'+def.emoji+'</span><span class="def-btn-name">'+def.name+'</span><span class="def-btn-cost">'+def.cost+' \uD83D\uDC1F</span><span class="def-btn-desc">MAX '+def.limit+' ('+penguinCount+'/'+def.limit+')</span>';
        btn.disabled = true;
      } else {
        // show count for penguin when some already placed
        var desc = def.desc;
        if(isPenguin && penguinCount>0) desc = penguinCount + "/" + def.limit + " placed · " + desc;
        btn.innerHTML = '<span class="def-btn-icon">'+def.emoji+'</span><span class="def-btn-name">'+def.name+'</span><span class="def-btn-cost">'+def.cost+' \uD83D\uDC1F</span><span class="def-btn-desc">'+desc+'</span>';
        btn.disabled = !canAfford;
        if(!canAfford) btn.title = "Not enough fish";
      }
      if(!locked && !atLimit){
        btn.addEventListener("click", function(){
          if(selectedBuild===id) selectedBuild=null;
          else selectedBuild = id;
          selectedTower = null;
          renderShop();
          renderInfo();
          msgEl.textContent = selectedBuild ? "Placing " + def.name + ". Click a snow tile to build!" : "Select a defender to place.";
        });
      }
      shopEl.appendChild(btn);
    });
    // hint for no selection
    if(!selectedBuild && !selectedTower){
      // nothing
    }
  }
  function renderInfo(){
    if(!selectedTower){
      infoEl.hidden = true;
      infoEl.innerHTML="";
      return;
    }
    var t = selectedTower;
    var isMax = t.level >= 3;
    var upCost = isMax ? 0 : Math.round(t.def.cost * (0.78 + t.level * 0.62));
    var canUp = !isMax && money >= upCost;
    var sellVal = Math.round(t.totalCost * 0.68);
    infoEl.hidden = false;
    infoEl.innerHTML =
      '<div class="def-info-main">' +
        '<div class="def-info-icon">'+t.def.emoji+'</div>' +
        '<div class="def-info-text">' +
          '<strong>'+t.def.name+' <span class="def-lvl">Lv.'+t.level+'</span></strong>' +
          '<span>Dmg '+t.dmg+' \u00B7 Range '+t.range+' \u00B7 '+(t.rate*60).toFixed(0)+' /min</span>' +
          '<span>Kills: '+t.kills+'</span>' +
        '</div>' +
        '<button class="game-action def-mini" id="defDeselect" type="button">\u2715</button>' +
      '</div>' +
      '<div class="def-info-actions">' +
        (isMax ? '<span class="def-badge">MAX LEVEL \u2B50\u2B50\u2B50</span>' : '<button class="game-action" id="defUpgrade" type="button" '+(canUp?"":"disabled")+'>Upgrade '+upCost+' \uD83D\uDC1F</button>') +
        '<button class="game-action" id="defSell" type="button">Sell +'+sellVal+' \uD83D\uDC1F</button>' +
      '</div>';
    var upBtn = infoEl.querySelector("#defUpgrade");
    if(upBtn) upBtn.addEventListener("click", function(){ upgradeTower(t); });
    infoEl.querySelector("#defSell").addEventListener("click", function(){ sellTower(t); });
    infoEl.querySelector("#defDeselect").addEventListener("click", function(){ selectedTower=null; renderInfo(); });
  }

  function updateUI(){
    waveEl.textContent = "Wave " + wave + (waveActive && spawnQueue.length===0 && enemies.length===0 ? " \u2713" : "");
    livesEl.textContent = "\u2764 " + lives;
    livesEl.style.color = lives <= 6 ? "#ff4757" : lives <= 12 ? "#ffa502" : "";
    moneyEl.textContent = "\uD83D\uDC1F " + money;
    scoreEl.textContent = "Score " + score;
    updateNextBtn();
    // sync snapshot for embed
    setSnapshot({
      mode: gameOver ? "gameover" : waveActive ? "waving" : "building",
      game: "Penguin Defence",
      wave: wave,
      lives: lives,
      money: money,
      score: score,
      towers: towers.length,
      enemies: enemies.length,
      selected: selectedBuild || (selectedTower?selectedTower.def.id:"none"),
      penguin: penguinUnlocked
    });
    // record best wave
    if(wave > bestWave){
      bestWave = wave;
      try { recordScore("defence", bestWave, "high"); } catch(e){}
    }
    // autosave (keep colony on X close) — clear on gameover/win so next open is fresh
    if(!gameOver && !won) saveDefence();
    else clearDefenceSave();
  }

  // canvas pointer mapping
  function canvasPos(ev){
    var rect = canvas.getBoundingClientRect();
    var scaleX = W / rect.width;
    var scaleY = H / rect.height;
    var cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
    var cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
    var x = (cx - rect.left) * scaleX;
    var y = (cy - rect.top) * scaleY;
    return { x:x, y:y };
  }
  function cellFromPos(x,y){
    var c = Math.floor(x / CELL_W);
    var r = Math.floor(y / CELL_H);
    if(c<0||c>=COLS||r<0||r>=ROWS) return null;
    return { c:c, r:r };
  }

  function handleCanvasClick(ev){
    if(gameOver || won) return;
    var p = canvasPos(ev);
    var cell = cellFromPos(p.x, p.y);
    // check if clicking on existing tower
    if(cell){
      var t = towerAtCell(cell.c, cell.r);
      if(t){
        if(selectedBuild){
          // if placing mode but clicked on tower, select tower instead?
          selectedBuild = null;
          selectedTower = t;
          renderShop();
          renderInfo();
          return;
        }
        selectedTower = (selectedTower===t ? null : t);
        selectedBuild = null;
        renderShop();
        renderInfo();
        return;
      }
    }
    if(selectedBuild){
      if(cell){
        var ok = placeTower(cell.c, cell.r);
        // if placed, keep selection or deselect? keep for rapid building
      } else {
        msgEl.textContent = "Click inside the snowy grid to build!";
      }
    } else if(cell){
      // clicking empty buildable without selection gives hint
      if(isBlockedCell(cell.c, cell.r)){
        msgEl.textContent = "The path is blocked — defenders can't stand on ice roads!";
      } else {
        msgEl.textContent = "Select a defender from the shop, then place it here.";
      }
    }
    // clear hover
  }

  function handleCanvasMove(ev){
    var p = canvasPos(ev);
    mousePos = p;
    var cell = cellFromPos(p.x, p.y);
    hoverCell = cell;
  }

  // update
  function update(dt){
    var spd = gameSpeed;
    dt *= spd;
    if(gameOver || won) {
      // still update particles
      for(var i=0;i<particles.length;i++){ var pr=particles[i]; pr.x+=pr.vx*dt; pr.y+=pr.vy*dt; pr.vy+= 380*dt*(pr.type==="star"?0.5:1); pr.life-=dt; }
      particles=particles.filter(function(p){return p.life>0;});
      for(var j=0;j<popups.length;j++){ var pp=popups[j]; pp.y+=pp.vy*dt; pp.life-=dt; }
      popups=popups.filter(function(p){return p.life>0;});
      shake *= Math.pow(0.84, dt*60);
      return;
    }
    // snow drift
    for(var s=0;s<snow.length;s++){
      var sn=snow[s];
      sn.y += sn.speed*dt;
      sn.drift += sn.driftSpeed*dt;
      sn.x += Math.cos(sn.drift)*0.6*dt*60;
      if(sn.y > H+6){ sn.y = -6; sn.x = Math.random()*W; }
      if(sn.x < -6) sn.x = W+6;
      if(sn.x > W+6) sn.x = -6;
    }
    // wave spawning
    if(waveActive && spawnQueue.length>0){
      spawnTimer -= dt;
      if(spawnTimer <= 0){
        var nxt = spawnQueue.shift();
        spawnEnemy(nxt.type);
        spawnTimer = nxt.delay;
        if(spawnQueue.length===0){
          // will wait until enemies cleared
        }
      }
    }
    // check wave completion
    if(waveActive && spawnQueue.length===0 && enemies.length===0){
      waveActive = false;
      waveCooldown = 3.5;
      var baseReward = 28 + Math.floor(wave*2.8);
      var baseScore = wave*12 + 30;
      // perfect wave bonus — no leaks!
      if(waveLeaks===0){
        var perfectBonus = 18 + Math.floor(wave*1.6);
        var perfectScore = 40 + wave*6;
        baseReward += perfectBonus;
        baseScore += perfectScore;
        perfectWaves++;
        popups.push({x:W/2, y:36, vy:-30, life:1.2, max:1.2, text:"PERFECT! +"+perfectBonus+" 🐟 +" + perfectScore + " score ❄️"});
        for(var pr=0; pr<14; pr++){ var a=Math.random()*Math.PI*2, sp2=70+Math.random()*130; particles.push({x:W/2, y:46, vx:Math.cos(a)*sp2, vy:Math.sin(a)*sp2 -30, life:0.7, max:0.7, r:2+Math.random()*3, color:"#a0e7ff", type:"star"}); }
        shake = 8;
        beep(660,0.09,0.18,"triangle"); beep(880,0.09,0.18,"triangle"); beep(1100,0.18,0.18,"triangle");
        msgEl.textContent = "PERFECT WAVE " + wave + "! ❄️ Flawless defence! +" + perfectBonus + " 🐟";
      } else {
        msgEl.textContent = "Wave " + wave + " cleared! 🎉 Next wave ready. You earned fish!";
        beep(440,0.12,0.14,"sine"); beep(550,0.12,0.14,"sine");
      }
      score += baseScore;
      money += baseReward;
      popups.push({x:W/2, y:56, vy:-28, life:1.0, max:1.0, text:"Wave "+wave+" cleared! +"+baseReward+" 🐟"});
      if(wave >= 30){
        won = true;
        msgEl.textContent = "LEGEND! 30 waves survived! Colony eternal! Score: " + score + " 🏆❄️🐧";
        for(var wi=0;wi<28;wi++){ var ang=Math.random()*Math.PI*2; var sp=80+Math.random()*260; particles.push({x:COLONY.x, y:COLONY.y, vx:Math.cos(ang)*sp, vy:Math.sin(ang)*sp -40, life:1.0, max:1.0, r:3+Math.random()*4, color:["#ffd700","#ff6b35","#43c6ac","#a0e7ff","#1e2a3a"][Math.floor(Math.random()*5)], type:"star"}); }
        try{ recordScore("defence", wave, "high"); }catch(e){}
      } else if(wave == 20){
        // LEGENDARY milestone — not final, but epic celebration and continue endless
        wave++;
        msgEl.textContent = "COLONY SAVED! 20 waves! But the tundra stirs... Endless begins! 🏆❄️";
        for(var wi2=0;wi2<24;wi2++){ var ang2=Math.random()*Math.PI*2; var sp2=70+Math.random()*200; particles.push({x:COLONY.x, y:COLONY.y, vx:Math.cos(ang2)*sp2, vy:Math.sin(ang2)*sp2 -30, life:0.9, max:0.9, r:3+Math.random()*4, color:["#ffd700","#43c6ac","#a0e7ff"][Math.floor(Math.random()*3)], type:"star"}); }
        try{ recordScore("defence", 20, "high"); }catch(e){}
        // bonus fish for legendary
        money += 40; popups.push({x:W/2, y:76, vy:-28, life:1.1, max:1.1, text:"LEGENDARY BONUS +40 🐟!"});
        beep(523,0.12,0.18,"triangle"); beep(659,0.12,0.18,"triangle"); beep(784,0.22,0.18,"triangle");
      } else {
        wave++;
      }
      updateUI();
      renderShop();
      updateNextBtn();
    } else if(!waveActive && !won && !gameOver){
      if(waveCooldown>0){
        waveCooldown -= dt;
        // countdown text?
        if(waveCooldown<=0){
          // don't auto start, keep button enabled; but update btn to show ready
        }
      }
    }

    // towers — including Penguin's legendary blizzard pulse
    for(var ti=0; ti<towers.length; ti++){
      var tw = towers[ti];
      tw.cooldown -= dt;
      // PENGUIN periodic blizzard (every ~9s, scales with level)
      if(tw.id==="penguin"){
        if(tw.blizzardCd===undefined) tw.blizzardCd = 8.5 + Math.random()*1.2;
        tw.blizzardCd -= dt;
        if(tw.blizzardCd<=0){
          tw.blizzardCd = 9.5 - (tw.level-1)*1.1; // faster at higher level
          // BLIZZARD!
          shake = Math.max(shake, 12);
          beep(90,0.4,0.22,"sawtooth"); beep(140,0.5,0.2,"sawtooth");
          msgEl.textContent = "🐧 BLIZZARD! The Penguin freezes the tundra! ❄️";
          for(var bi=0; bi<enemies.length; bi++){
            var be=enemies[bi];
            if(Math.hypot(be.x - tw.x, be.y - tw.y) < tw.range + 42){
              be.slow = 2.4; // freeze longer
              be.hp -= Math.round(tw.dmg * 0.85);
              // ice shards
              for(var ic=0; ic<3; ic++) particles.push({x:be.x, y:be.y, vx:(Math.random()-0.5)*60, vy:-30 -Math.random()*40, life:0.45, max:0.45, r:2, color:"#a0e7ff", type:"star"});
              if(be.hp<=0){
                // will be handled next frame but give immediate removal if still dead?
              }
              be.flash = 0.35;
            }
          }
          // visual ice ring
          particles.push({x:tw.x, y:tw.y, vx:0, vy:0, life:0.55, max:0.55, r: tw.range+10, color:"rgba(160,220,255,0.55)", type:"ring"});
          for(var ri2=0; ri2<18; ri2++){ var a2=Math.random()*Math.PI*2, sp2=90+Math.random()*120; particles.push({x:tw.x, y:tw.y, vx:Math.cos(a2)*sp2, vy:Math.sin(a2)*sp2, life:0.6, max:0.6, r:2.5, color:"#fff", type:"star"}); }
          // snow gust
          for(var sg=0; sg<10; sg++) snow.push({x: tw.x + (Math.random()-0.5)*40, y: tw.y - 10, r: 1.5+Math.random()*2, speed: 60+Math.random()*40, drift: Math.random()*Math.PI*2, driftSpeed: 1.5, alpha: 0.8 });
        }
      }
      if(tw.cooldown <= 0){
        var tgt = findTarget(tw);
        if(tgt){
          fireProjectile(tw, tgt);
          tw.cooldown = 1 / tw.rate;
          if(tw.id!=="penguin") beep(tw.id==="owl"? 720: tw.id==="bear"? 180: tw.id==="fox"? 520: 360, 0.06, 0.08, "square");
          else beep(320,0.07,0.1,"triangle");
        }
      }
    }
    // projectiles
    for(var pi=projectiles.length-1; pi>=0; pi--){
      var pr = projectiles[pi];
      pr.life -= dt;
      if(pr.life <=0){ projectiles.splice(pi,1); continue; }
      // homing: steer toward current target position slightly
      if(pr.target && enemies.indexOf(pr.target)!==-1){
        var dx = pr.target.x - pr.x, dy = pr.target.y - pr.y;
        var dist = Math.hypot(dx, dy);
        if(dist>1){
          var desiredVx = (dx/dist)*pr.owner.def.projSpeed;
          var desiredVy = (dy/dist)*pr.owner.def.projSpeed;
          // lerp velocity toward desired (homing)
          var steer = 7.5;
          pr.vx += (desiredVx - pr.vx) * steer * dt;
          pr.vy += (desiredVy - pr.vy) * steer * dt;
        }
      }
      pr.x += pr.vx*dt;
      pr.y += pr.vy*dt;
      // check hit
      var hit = null;
      var hitIdx = -1;
      for(var ei=0; ei<enemies.length; ei++){
        var en = enemies[ei];
        var ddx = en.x - pr.x, ddy = en.y - pr.y;
        if(Math.hypot(ddx,ddy) < en.radius + 6){
          hit = en; hitIdx = ei; break;
        }
      }
      if(hit){
        // damage
        hit.hp -= pr.dmg;
        // penguin aoe
        if(pr.aoe>0){
          for(var aj=enemies.length-1; aj>=0; aj--){
            var aoeEn = enemies[aj];
            if(aoeEn===hit) continue;
            if(Math.hypot(aoeEn.x - hit.x, aoeEn.y - hit.y) < pr.aoe){
              aoeEn.hp -= Math.round(pr.dmg * 0.62);
              // small knock
              if(aoeEn.hp <=0){
                // will be handled below but need to collect reward?
              }
            }
          }
          // aoe blast particles
          for(var ab=0; ab<10; ab++){
            var aang=Math.random()*Math.PI*2, asp=50+Math.random()*120;
            particles.push({x:hit.x, y:hit.y, vx:Math.cos(aang)*asp, vy:Math.sin(aang)*asp, life:0.45, max:0.45, r:2+Math.random()*2, color:"#a0e7ff", type:"star"});
          }
          shake = Math.max(shake, 7);
        }
        // hit flash particles
        for(var hp2=0; hp2<5; hp2++){
          particles.push({x:hit.x, y:hit.y, vx:(Math.random()-0.5)*80, vy:(Math.random()-0.5)*80, life:0.28, max:0.28, r:2, color: pr.color, type:"star"});
        }
        // remove projectile
        projectiles.splice(pi,1);
        if(hit.hp <= 0){
          // death
          money += hit.reward;
          score += hit.reward*2 + (hit.type==="boss"? 80:0);
          totalKills++;
          beep(hit.type==="boss"? 300: 500, 0.08, 0.12, "triangle");
          // find tower that killed for stats? attribute to owner
          if(pr.owner) pr.owner.kills++;
          // death burst
          for(var db=0; db< (hit.type==="boss"? 18:8); db++){
            var dang=Math.random()*Math.PI*2; var dss=30+Math.random()*110;
            particles.push({x:hit.x, y:hit.y, vx:Math.cos(dang)*dss, vy:Math.sin(dang)*dss -20, life:0.55, max:0.55, r: (hit.type==="boss"?4:2.5)+Math.random()*2, color:hit.color, type:"star"});
          }
          for(var db2=0; db2<4; db2++) particles.push({x:hit.x, y:hit.y, vx:(Math.random()-0.5)*60, vy:-30 -Math.random()*40, life:0.4, max:0.4, r:3, color:"rgba(80,80,90,0.5)", type:"puff"});
          popups.push({x:hit.x, y:hit.y-18, vy:-42, life:0.7, max:0.7, text:"+"+hit.reward+" \uD83D\uDC1F"});
          enemies.splice(hitIdx,1);
          updateUI();
          renderShop();
        } else {
          // hit flash on enemy? we could set brief flash flag
          hit.flash = 0.12;
        }
        continue;
      }
      // if projectile goes off screen, remove
      if(pr.x < -20 || pr.x > W+20 || pr.y < -20 || pr.y > H+20){
        projectiles.splice(pi,1);
      }
    }

    // enemies movement — also handle blizzard/aoe kills
    for(var ei2=enemies.length-1; ei2>=0; ei2--){
      var en2 = enemies[ei2];
      if(en2.hp <= 0){
        money += en2.reward;
        score += en2.reward*2 + (en2.type==="boss"?80:0);
        totalKills++;
        beep(520,0.08,0.12,"triangle");
        for(var dk=0; dk<7; dk++){ var a3=Math.random()*Math.PI*2, s3=40+Math.random()*90; particles.push({x:en2.x, y:en2.y, vx:Math.cos(a3)*s3, vy:Math.sin(a3)*s3 -20, life:0.5, max:0.5, r:2.5, color:en2.color, type:"star"}); }
        popups.push({x:en2.x, y:en2.y-18, vy:-38, life:0.7, max:0.7, text:"+"+en2.reward+" 🐟"});
        enemies.splice(ei2,1);
        updateUI(); continue;
      }
      if(en2.flash && en2.flash>0) en2.flash -= dt;
      en2.phase += dt*2.2;
      if(en2.wp >= WAYPOINTS.length){
        // reached colony
        waveLeaks++;
        totalKills = Math.max(0, totalKills);
        lives -= (en2.type==="boss"? 3 : 1);
        shake = en2.type==="boss"? 16: 8;
        beep(en2.type==="boss"? 120:180, 0.22, 0.2, "sawtooth");
        msgEl.textContent = en2.name + " breached the colony! ❤ " + lives + " left!";
        for(var bl=0; bl<12; bl++){
          var bang=Math.random()*Math.PI*2; var bsp=40+Math.random()*130;
          particles.push({x:COLONY.x, y:COLONY.y, vx:Math.cos(bang)*bsp, vy:Math.sin(bang)*bsp -40, life:0.6, max:0.6, r:3, color:en2.color, type:"star"});
        }
        enemies.splice(ei2,1);
        if(lives <= 0){
          lives = 0;
          gameOver = true;
          msgEl.textContent = "Colony overrun! Wave "+wave+" — Score "+score+". Press Restart. The Penguin remembers...";
          // burst
          for(var go=0; go<24; go++){ var gang=Math.random()*Math.PI*2; var gsp=60+Math.random()*180; particles.push({x:COLONY.x, y:COLONY.y, vx:Math.cos(gang)*gsp, vy:Math.sin(gang)*gsp, life:0.9, max:0.9, r:4, color:"#ff4757", type:"star"}); }
          shake = 22;
          updateUI();
          updateNextBtn();
          try{ recordScore("defence", wave, "high"); }catch(e){}
        } else {
          updateUI();
        }
        continue;
      }
      var target = WAYPOINTS[en2.wp];
      var dx = target.x - en2.x, dy = target.y - en2.y;
      var dist = Math.hypot(dx, dy);
      var mv = en2.speed * dt * (en2.slow>0?0.45:1);
      if(dist <= mv){
        en2.x = target.x; en2.y = target.y;
        en2.wp++;
      } else {
        en2.x += (dx/dist)*mv;
        en2.y += (dy/dist)*mv;
      }
      if(en2.slow>0) en2.slow -= dt;
    }

    // particles
    for(var i3=0;i3<particles.length;i3++){ var pp3=particles[i3]; pp3.x+=pp3.vx*dt; pp3.y+=pp3.vy*dt; pp3.vy+= 520*dt*(pp3.type==="star"?0.55:1); pp3.life-=dt; }
    particles=particles.filter(function(p){return p.life>0;});
    for(var j2=0;j2<popups.length;j2++){ var pop=popups[j2]; pop.y+=pop.vy*dt; pop.life-=dt; }
    popups=popups.filter(function(p){return p.life>0;});

    shake *= Math.pow(0.86, dt*60);
    if(shake<0.12) shake=0;

    updateNextBtn();
  }

  function render(){
    // shake
    ctx.save();
    var sx = (Math.random()-0.5)*shake;
    var sy = (Math.random()-0.5)*shake;
    ctx.translate(sx, sy);

    // sky gradient
    var sky = ctx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0, coldLevel>0.25? "#7fb9e6" : "#8ecae6");
    sky.addColorStop(0.5, coldLevel>0.25? "#b8d9f0" : "#cfe9f7");
    sky.addColorStop(1, coldLevel>0.2? "#e6f3ff" : "#fff8ea");
    ctx.fillStyle = sky;
    ctx.fillRect(-10,-10,W+20,H+20);

    // distant mountains parallax
    ctx.fillStyle = coldLevel>0.3 ? "#9ab8d4" : "#a0bfd6";
    ctx.beginPath();
    ctx.moveTo(-80, H-110);
    for(var mx=-200; mx<W+400; mx+=220){
      var hx = mx - (Date.now()*0.00005*0)%10; // subtle? keep static
      ctx.lineTo(mx+80, 180 + Math.sin(mx*0.01)*14);
      ctx.lineTo(mx+160, H-110);
    }
    ctx.lineTo(W+120, H-110); ctx.lineTo(W+120,H); ctx.lineTo(-120,H); ctx.fill();
    // nearer snowy hills
    ctx.fillStyle = "rgba(234,244,251,0.95)";
    ctx.beginPath();
    ctx.moveTo(-100, H-70);
    for(var nx=-200; nx<W+500; nx+=160){
      ctx.lineTo(nx+40, 300 + Math.cos(nx*0.018)*10);
      ctx.lineTo(nx+120, H-70);
    }
    ctx.lineTo(W+120,H-70); ctx.lineTo(W+120,H); ctx.lineTo(-120,H); ctx.fill();

    // snow ground base
    ctx.fillStyle = "#eef6ff";
    ctx.fillRect(0,0,W,H);

    // grid faint lines & buildable hint
    ctx.strokeStyle = "rgba(42,52,66,0.06)";
    ctx.lineWidth = 1;
    for(var gx=1; gx<COLS; gx++){ ctx.beginPath(); ctx.moveTo(gx*CELL_W,0); ctx.lineTo(gx*CELL_W,H); ctx.stroke(); }
    for(var gy=1; gy<ROWS; gy++){ ctx.beginPath(); ctx.moveTo(0,gy*CELL_H); ctx.lineTo(W,gy*CELL_H); ctx.stroke(); }

    // building pads: draw buildable cells as slightly darker snow with subtle border
    for(var r=0;r<ROWS;r++) for(var c=0;c<COLS;c++){
      if(isBlockedCell(c,r)) continue;
      var cen = cellCenter(c,r);
      // highlight hover
      var isHover = hoverCell && hoverCell.c===c && hoverCell.r===r;
      var isSelectedCell = selectedTower && selectedTower.c===c && selectedTower.r===r;
      ctx.fillStyle = isSelectedCell ? "rgba(67,198,172,0.18)" : isHover && selectedBuild ? "rgba(246,196,69,0.22)" : "rgba(0,0,0,0.015)";
      ctx.fillRect(c*CELL_W+2, r*CELL_H+2, CELL_W-4, CELL_H-4);
      // small snow pile top highlight
      if(!isHover){
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.fillRect(c*CELL_W+4, r*CELL_H+3, CELL_W-8, 3);
      }
    }

    // path - draw thick ice road
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // shadow under path
    ctx.strokeStyle = "rgba(42,52,66,0.14)";
    ctx.lineWidth = PATH_W + 10;
    ctx.beginPath();
    ctx.moveTo(WAYPOINTS[0].x, WAYPOINTS[0].y);
    for(var wi=1; wi<WAYPOINTS.length; wi++) ctx.lineTo(WAYPOINTS[wi].x, WAYPOINTS[wi].y);
    ctx.stroke();
    // main ice
    ctx.strokeStyle = "#d0e6ff";
    ctx.lineWidth = PATH_W;
    ctx.beginPath();
    ctx.moveTo(WAYPOINTS[0].x, WAYPOINTS[0].y);
    for(var wi2=1; wi2<WAYPOINTS.length; wi2++) ctx.lineTo(WAYPOINTS[wi2].x, WAYPOINTS[wi2].y);
    ctx.stroke();
    // inner snow path
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = PATH_W - 8;
    ctx.beginPath();
    ctx.moveTo(WAYPOINTS[0].x, WAYPOINTS[0].y);
    for(var wi3=1; wi3<WAYPOINTS.length; wi3++) ctx.lineTo(WAYPOINTS[wi3].x, WAYPOINTS[wi3].y);
    ctx.stroke();
    // ice cracks
    ctx.strokeStyle = "rgba(79,143,207,0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(var wi4=0; wi4<WAYPOINTS.length-1; wi4++){
      var a=WAYPOINTS[wi4], b=WAYPOINTS[wi4+1];
      var midx = (a.x+b.x)/2, midy=(a.y+b.y)/2;
      ctx.moveTo(midx + (Math.sin(wi4*1.7)*6), midy + (Math.cos(wi4*2.1)*6));
      ctx.lineTo(midx + (Math.sin(wi4*1.7+1)*10), midy + (Math.cos(wi4*2.1+1)*10));
    }
    ctx.stroke();
    // path border ice shine
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(WAYPOINTS[0].x, WAYPOINTS[0].y);
    for(var wi5=1; wi5<WAYPOINTS.length; wi5++) ctx.lineTo(WAYPOINTS[wi5].x, WAYPOINTS[wi5].y);
    ctx.stroke();
    // entrance/exit glows
    // entrance arrow
    ctx.fillStyle = "rgba(67,198,172,0.9)";
    ctx.beginPath(); ctx.moveTo(WAYPOINTS[0].x+12, WAYPOINTS[0].y-10); ctx.lineTo(WAYPOINTS[0].x+22, WAYPOINTS[0].y); ctx.lineTo(WAYPOINTS[0].x+12, WAYPOINTS[0].y+10); ctx.fill();
    ctx.fillStyle = "rgba(67,198,172,0.2)";
    ctx.beginPath(); ctx.arc(WAYPOINTS[0].x+8, WAYPOINTS[0].y, 18,0,Math.PI*2); ctx.fill();

    // colony igloo
    (function drawColony(){
      var cx = COLONY.x, cy = COLONY.y;
      // shadow
      ctx.fillStyle = "rgba(42,52,66,0.18)";
      ctx.beginPath(); ctx.ellipse(cx, cy+18, 38, 10, 0,0,Math.PI*2); ctx.fill();
      // igloo base
      ctx.fillStyle = "#fffdf6";
      ctx.strokeStyle = "#2a3442";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy+6, 28, Math.PI, 0);
      ctx.lineTo(cx+28, cy+18);
      ctx.lineTo(cx-28, cy+18);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      // igloo lines (blocks)
      ctx.strokeStyle = "rgba(42,52,66,0.18)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy+6, 28, Math.PI, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx-14, cy-2); ctx.lineTo(cx-14, cy+14); ctx.moveTo(cx+14, cy-2); ctx.lineTo(cx+14, cy+14); ctx.stroke();
      // entrance
      ctx.fillStyle = "#2a3442";
      ctx.beginPath(); ctx.ellipse(cx, cy+12, 10, 9, 0, Math.PI, 0); ctx.fill();
      // flag
      var poleX = cx+22;
      ctx.fillStyle = "#2a3442";
      ctx.fillRect(poleX-2, cy-24, 4, 30);
      var flagFlutter = Math.sin(Date.now()*0.008)*3;
      ctx.fillStyle = gameOver ? "#ff6b6b" : won ? "#43c6ac" : lives <=6 ? "#ff4757" : "#4f8fcf";
      ctx.beginPath();
      ctx.moveTo(poleX+2, cy-24);
      ctx.lineTo(poleX+26, cy-18+flagFlutter);
      ctx.lineTo(poleX+2, cy-12);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#2a3442"; ctx.lineWidth=1.5; ctx.stroke();
      // hearts above if low?
      if(lives>0 && !won){
        ctx.fillStyle = lives<=6? "#ff4757" : "#ff9f43";
        ctx.font="bold 12px monospace";
        ctx.textAlign="center";
        ctx.fillText("\u2764 "+lives, cx, cy-18);
      }
      if(won){
        // celebration glow
        ctx.fillStyle = "rgba(255,215,0,"+(0.25+Math.sin(Date.now()*0.007)*0.12)+")";
        ctx.beginPath(); ctx.arc(cx, cy, 52,0,Math.PI*2); ctx.fill();
      }
    })();

    // range circle for selected or placing
    if(selectedTower){
      ctx.fillStyle = "rgba(67,198,172,0.10)";
      ctx.strokeStyle = "rgba(67,198,172,0.55)";
      ctx.lineWidth = 1.8;
      ctx.setLineDash([6,6]);
      ctx.beginPath(); ctx.arc(selectedTower.x, selectedTower.y, selectedTower.range,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.setLineDash([]);
    } else if(selectedBuild && hoverCell && !isBlockedCell(hoverCell.c, hoverCell.r) && !towerAtCell(hoverCell.c, hoverCell.r)){
      var def = TOWER_DEFS[selectedBuild];
      if(def){
        var cen2 = cellCenter(hoverCell.c, hoverCell.r);
        var canPlace = money >= def.cost && !(def.limit && penguinCount>=def.limit);
        ctx.fillStyle = canPlace ? "rgba(246,196,69,0.14)" : "rgba(255,71,87,0.14)";
        ctx.strokeStyle = canPlace ? "rgba(246,196,69,0.7)" : "rgba(255,71,87,0.7)";
        ctx.lineWidth = 1.6;
        ctx.setLineDash([5,5]);
        ctx.beginPath(); ctx.arc(cen2.x, cen2.y, def.range,0,Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // towers
    for(var ti2=0; ti2<towers.length; ti2++){
      var tw2 = towers[ti2];
      var isSel = selectedTower && selectedTower===tw2;
      // base pad shadow
      ctx.fillStyle = "rgba(42,52,66,0.18)";
      ctx.beginPath(); ctx.ellipse(tw2.x, tw2.y+16, 22, 7,0,0,Math.PI*2); ctx.fill();
      // platform
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = isSel ? "#43c6ac" : "#2a3442";
      ctx.lineWidth = isSel? 3:2.2;
      ctx.beginPath(); ctx.roundRect(tw2.x-22, tw2.y-4, 44, 14, 6); ctx.fill(); ctx.stroke();
      // inner shine
      ctx.fillStyle = "rgba(255,255,255,1)";
      ctx.fillRect(tw2.x-20, tw2.y-4, 40, 4);
      // draw critter on pad
      ctx.save();
      ctx.translate(tw2.x, tw2.y-8);
      // scale by level
      var lvlScale = 1 + (tw2.level-1)*0.12;
      ctx.scale(lvlScale, lvlScale);
      // rotation for turret-like aim?
      drawTowerCritter(ctx, tw2);
      ctx.restore();
      // level stars
      if(tw2.level>1){
        ctx.fillStyle = "#ffd700";
        ctx.strokeStyle = "#7a4a0a";
        ctx.lineWidth=1;
        ctx.font = "bold 9px monospace";
        ctx.textAlign="center";
        var stars = "\u2605".repeat(tw2.level);
        ctx.strokeText(stars, tw2.x, tw2.y-26);
        ctx.fillText(stars, tw2.x, tw2.y-26);
      }
      // selection ring
      if(isSel){
        ctx.strokeStyle = "rgba(67,198,172,0.9)";
        ctx.lineWidth=2.4;
        ctx.setLineDash([4,4]);
        ctx.strokeRect(tw2.x-24, tw2.y-24, 48, 34);
        ctx.setLineDash([]);
      }
      // cooldown pie?
      if(tw2.cooldown>0){
        var pct = Math.max(0, tw2.cooldown * tw2.rate);
        ctx.fillStyle = "rgba(42,52,66,0.75)";
        ctx.fillRect(tw2.x-16, tw2.y+10, 32, 3);
        ctx.fillStyle = "#ffd700";
        ctx.fillRect(tw2.x-16, tw2.y+10, 32*(1-pct), 3);
      }
    }
    // ghost preview when placing
    if(selectedBuild && hoverCell && !isBlockedCell(hoverCell.c, hoverCell.r) && !towerAtCell(hoverCell.c, hoverCell.r)){
      var def2 = TOWER_DEFS[selectedBuild];
      var cen3 = cellCenter(hoverCell.c, hoverCell.r);
      var canAfford2 = money >= def2.cost && !(def2.limit && penguinCount>=def2.limit);
      ctx.globalAlpha = 0.62;
      ctx.fillStyle = canAfford2? "#fff" : "#ffb3b3";
      ctx.strokeStyle = canAfford2? "#43c6ac" : "#ff4757";
      ctx.lineWidth=2;
      ctx.beginPath(); ctx.roundRect(cen3.x-22, cen3.y-4, 44,14,6); ctx.fill(); ctx.stroke();
      ctx.save();
      ctx.translate(cen3.x, cen3.y-8);
      ctx.globalAlpha= canAfford2? 0.85:0.45;
      drawTowerCritter(ctx, {id:def2.id, def:def2, angle: -Math.PI/2, level:1});
      ctx.restore();
      ctx.globalAlpha=1;
      // cost label if can't afford
      if(!canAfford2){
        ctx.fillStyle="rgba(255,71,87,0.9)";
        ctx.font="bold 10px monospace";
        ctx.textAlign="center";
        ctx.fillText("Need "+def2.cost, cen3.x, cen3.y+28);
      }
    }

    // enemies
    for(var ei3=0; ei3<enemies.length; ei3++){
      var en3 = enemies[ei3];
      // shadow
      ctx.fillStyle = "rgba(0,0,0,0.16)";
      ctx.beginPath(); ctx.ellipse(en3.x, en3.y+en3.radius+4, en3.radius*1.1, en3.radius*0.45,0,0,Math.PI*2); ctx.fill();
      // body
      ctx.save();
      ctx.translate(en3.x, en3.y);
      // wobble
      var wob = Math.sin(en3.phase)* (en3.type==="boss"? 1.5:2.2);
      ctx.rotate(wob*0.04);
      // boss larger scale
      if(en3.type==="boss") ctx.scale(1.15,1.15);
      // flash when hit
      var flashAlpha = en3.flash>0 ? Math.min(1, en3.flash*6) : 0;
      // outer circle
      ctx.fillStyle = flashAlpha>0? "#fff" : en3.color;
      ctx.strokeStyle = flashAlpha>0? "#fff" : en3.stroke;
      ctx.lineWidth=2.2;
      ctx.beginPath(); ctx.arc(0,0,en3.radius,0,Math.PI*2); ctx.fill(); ctx.stroke();
      // inner belly highlight
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.beginPath(); ctx.arc(-en3.radius*0.22, -en3.radius*0.22, en3.radius*0.42,0,Math.PI*2); ctx.fill();
      // eyes
      var eyeOff = en3.radius*0.38;
      ctx.fillStyle = en3.eye;
      // eye white
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(-eyeOff*0.5, -en3.radius*0.22, en3.radius*0.24,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc( eyeOff*0.5, -en3.radius*0.22, en3.radius*0.24,0,Math.PI*2); ctx.fill();
      // pupils
      ctx.fillStyle = "#1e2a3a";
      ctx.beginPath(); ctx.arc(-eyeOff*0.5 + (en3.type==="boss"?1:0), -en3.radius*0.22, en3.radius*0.13,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc( eyeOff*0.5 + (en3.type==="boss"?1:0), -en3.radius*0.22, en3.radius*0.13,0,Math.PI*2); ctx.fill();
      // shine
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(-eyeOff*0.5+1, -en3.radius*0.32, en3.radius*0.06,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc( eyeOff*0.5+1, -en3.radius*0.32, en3.radius*0.06,0,Math.PI*2); ctx.fill();
      // type icon: each enemy now has distinct silhouette
      if(en3.type==="crab"){
        ctx.fillStyle = "#c0392b"; ctx.strokeStyle="#7a1a0a"; ctx.lineWidth=1.1;
        ctx.beginPath(); ctx.ellipse(-en3.radius*0.78, 1.8, 5.2,3.2, -0.38,0,Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse( en3.radius*0.78, 1.8, 5.2,3.2, 0.38,0,Math.PI*2); ctx.fill(); ctx.stroke();
        // legs
        ctx.strokeStyle="#7a1a0a"; ctx.lineWidth=1; for(var leg=-1; leg<=1; leg+=2){ ctx.beginPath(); ctx.moveTo(leg*en3.radius*0.42, 3); ctx.lineTo(leg*en3.radius*0.92, 6); ctx.stroke(); }
      } else if(en3.type==="wolf"){
        ctx.fillStyle = en3.stroke;
        ctx.beginPath(); ctx.moveTo(-en3.radius*0.48, -en3.radius*0.88); ctx.lineTo(-en3.radius*0.18, -en3.radius*0.38); ctx.lineTo(-en3.radius*0.72, -en3.radius*0.42); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo( en3.radius*0.48, -en3.radius*0.88); ctx.lineTo( en3.radius*0.18, -en3.radius*0.38); ctx.lineTo( en3.radius*0.72, -en3.radius*0.42); ctx.closePath(); ctx.fill();
        // snout
        ctx.fillStyle="#dfe6ec"; ctx.beginPath(); ctx.ellipse(0,1.8,3.2,2.1,0,0,Math.PI*2); ctx.fill();
      } else if(en3.type==="hunter"){
        // parka hood with fur
        ctx.fillStyle="#2a3a7a"; ctx.beginPath(); ctx.arc(0,-en3.radius*0.72, en3.radius*0.62, Math.PI,0); ctx.fill();
        ctx.fillStyle="#e8ddd0"; ctx.strokeStyle="#2a3a7a"; ctx.lineWidth=0.9;
        ctx.beginPath(); ctx.arc(0,-en3.radius*0.72, en3.radius*0.62, Math.PI,0); ctx.stroke();
        // goggles
        ctx.fillStyle="#a0e7ff"; ctx.strokeStyle="#0f1a2a"; ctx.lineWidth=0.9;
        ctx.beginPath(); ctx.roundRect(-en3.radius*0.52,-en3.radius*0.38, en3.radius*1.04, 3.2,1.2); ctx.fill(); ctx.stroke();
        ctx.fillRect(-1, -en3.radius*0.38, 2, 3.2);
      } else if(en3.type==="poacher"){
        // brown trapper hat + rifle sling
        ctx.fillStyle="#5a3a12"; ctx.beginPath(); ctx.ellipse(0,-en3.radius*0.78, en3.radius*0.58, en3.radius*0.42,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle="#8a5a2b"; ctx.fillRect(-en3.radius*0.58,-en3.radius*0.95, en3.radius*1.16, 3.2);
        ctx.strokeStyle="#1a0f05"; ctx.lineWidth=0.9; ctx.beginPath(); ctx.moveTo(-en3.radius*0.42,0.8); ctx.lineTo(en3.radius*0.42,2.2); ctx.stroke();
        ctx.fillStyle="#2a1a0a"; ctx.beginPath(); ctx.arc(en3.radius*0.42,1.2,1.1,0,Math.PI*2); ctx.fill();
      } else if(en3.type==="skier"){
        // goggles + skis
        ctx.fillStyle="#ffffff"; ctx.beginPath(); ctx.ellipse(0,-en3.radius*0.62, en3.radius*0.55, en3.radius*0.35,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle="#ff4d4d"; ctx.strokeStyle="#7a0a0a"; ctx.lineWidth=0.9;
        ctx.beginPath(); ctx.roundRect(-en3.radius*0.52,-en3.radius*0.42, en3.radius*1.04, 2.8,1); ctx.fill(); ctx.stroke();
        // skis
        ctx.fillStyle="#2a3a4a"; ctx.fillRect(-en3.radius*0.82, en3.radius*0.52, en3.radius*1.64, 1.4);
        ctx.fillStyle="#43c6ac"; ctx.fillRect(-en3.radius*0.72, en3.radius*0.82, en3.radius*1.44, 0.9);
      } else if(en3.type==="explorer"){
        // orange explorer parka + backpack
        ctx.fillStyle="#ff6b35"; ctx.beginPath(); ctx.roundRect(-en3.radius*0.62,-en3.radius*0.78, en3.radius*1.24, en3.radius*0.78,3); ctx.fill();
        ctx.fillStyle="#ffd166"; ctx.fillRect(-en3.radius*0.22,-en3.radius*0.92, en3.radius*0.44, en3.radius*0.18);
        ctx.fillStyle="#2a3a4a"; ctx.beginPath(); ctx.ellipse(en3.radius*0.42,0.2,2.6,3.8,0.22,0,Math.PI*2); ctx.fill();
        ctx.fillStyle="#7a3a0a"; ctx.beginPath(); ctx.arc(0,-en3.radius*0.32,1.1,0,Math.PI*2); ctx.fill();
      } else if(en3.type==="yeti"){
        // shaggy yeti — fur tufts
        ctx.fillStyle="rgba(255,255,255,0.92)"; for(var yf=0; yf<3; yf++){ ctx.beginPath(); ctx.ellipse((yf-1)*en3.radius*0.42, -en3.radius*0.42, en3.radius*0.22, en3.radius*0.32,0,0,Math.PI*2); ctx.fill(); }
        ctx.fillStyle="#cbd6e6"; ctx.beginPath(); ctx.arc(0,-en3.radius*0.18, en3.radius*0.22,0,Math.PI*2); ctx.fill();
      } else if(en3.type==="boss"){
        // horns/spikes
        ctx.fillStyle = en3.stroke;
        ctx.beginPath(); ctx.moveTo(-en3.radius*0.9, -4); ctx.lineTo(-en3.radius*1.15, -10); ctx.lineTo(-en3.radius*0.7, -8); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo( en3.radius*0.9, -4); ctx.lineTo( en3.radius*1.15, -10); ctx.lineTo( en3.radius*0.7, -8); ctx.closePath(); ctx.fill();
        ctx.fillStyle="#ffd700"; ctx.strokeStyle="#7a4a0a"; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(-8,-en3.radius+2); ctx.lineTo(-4,-en3.radius-4); ctx.lineTo(0,-en3.radius+2); ctx.lineTo(4,-en3.radius-4); ctx.lineTo(8,-en3.radius+2); ctx.closePath(); ctx.fill(); ctx.stroke();
        // scar
        ctx.strokeStyle="rgba(0,0,0,0.22)"; ctx.lineWidth=0.9; ctx.beginPath(); ctx.moveTo(-4,2); ctx.lineTo(4,4); ctx.stroke();
      }
      ctx.restore();
      // health bar
      var barW = en3.radius*2.4;
      var barH = 4;
      var pct2 = Math.max(0, en3.hp / en3.maxHp);
      // bg
      ctx.fillStyle = "rgba(42,52,66,0.85)";
      ctx.fillRect(en3.x - barW/2 -1, en3.y - en3.radius - 12 -1, barW+2, barH+2);
      // fg
      var col = pct2>0.55? "#43c6ac" : pct2>0.25? "#f6c445" : "#ff4757";
      ctx.fillStyle = col;
      ctx.fillRect(en3.x - barW/2, en3.y - en3.radius -12, barW*pct2, barH);
      // name small
      if(en3.type==="boss"){
        ctx.fillStyle="#1e2a3a";
        ctx.font="bold 8px monospace";
        ctx.textAlign="center";
        ctx.fillText("BOSS", en3.x, en3.y - en3.radius -18);
      }
    }

    // projectiles
    for(var pi2=0; pi2<projectiles.length; pi2++){
      var pr2 = projectiles[pi2];
      ctx.save();
      ctx.translate(pr2.x, pr2.y);
      var ang2 = Math.atan2(pr2.vy, pr2.vx);
      ctx.rotate(ang2);
      // glow
      ctx.fillStyle = pr2.color;
      ctx.shadowColor = pr2.color;
      ctx.shadowBlur = pr2.type==="penguin"? 10:6;
      if(pr2.type==="owl"){
        // feather
        ctx.beginPath(); ctx.ellipse(0,0,10,3.5,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle="#fff";
        ctx.beginPath(); ctx.ellipse(2,0,4,1.2,0,0,Math.PI*2); ctx.fill();
      } else if(pr2.type==="bear"){
        // paw chunk
        ctx.beginPath(); ctx.arc(0,0,6,0,Math.PI*2); ctx.fill();
        ctx.fillStyle="rgba(0,0,0,0.18)";
        ctx.beginPath(); ctx.arc(1,1,2,0,Math.PI*2); ctx.fill();
      } else if(pr2.type==="penguin"){
        // fish
        ctx.fillStyle="#ffd700";
        ctx.beginPath(); ctx.ellipse(0,0,8,4.5,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle="#ff9f2e";
        ctx.beginPath(); ctx.moveTo(8,0); ctx.lineTo(12, -3.5); ctx.lineTo(12,3.5); ctx.closePath(); ctx.fill();
        ctx.fillStyle="#1e2a3a";
        ctx.beginPath(); ctx.arc(-3, -1.2, 1.2,0,Math.PI*2); ctx.fill();
      } else {
        // seal/fox generic snowball
        ctx.beginPath(); ctx.arc(0,0,5.5,0,Math.PI*2); ctx.fill();
        ctx.fillStyle="rgba(255,255,255,0.85)";
        ctx.beginPath(); ctx.arc(-1.5,-1.5,1.8,0,Math.PI*2); ctx.fill();
      }
      ctx.shadowBlur=0;
      ctx.restore();
      // trail for penguin fish
      if(pr2.type==="penguin"){
        ctx.fillStyle="rgba(255,215,0,0.35)";
        ctx.beginPath(); ctx.arc(pr2.x - Math.cos(ang2)*8, pr2.y - Math.sin(ang2)*8, 3,0,Math.PI*2); ctx.fill();
      }
    }

    // snow particles
    ctx.fillStyle="rgba(255,255,255,0.85)";
    for(var sn2=0; sn2<snow.length; sn2++){
      var s2=snow[sn2];
      ctx.globalAlpha = s2.alpha * (coldLevel>0.2? 0.9:0.65);
      ctx.beginPath(); ctx.arc(s2.x, s2.y, s2.r,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1;

    // particles
    for(var pa=0; pa<particles.length; pa++){
      var prt=particles[pa];
      var a = Math.max(0, prt.life/prt.max);
      ctx.globalAlpha = a;
      if(prt.type==="star"){
        ctx.fillStyle=prt.color;
        ctx.beginPath(); ctx.arc(prt.x, prt.y, prt.r*a,0,Math.PI*2); ctx.fill();
        ctx.fillStyle="rgba(255,255,255,"+(a*0.7)+")";
        ctx.beginPath(); ctx.arc(prt.x - prt.r*0.25, prt.y - prt.r*0.25, prt.r*0.35*a,0,Math.PI*2); ctx.fill();
      } else {
        ctx.fillStyle=prt.color;
        ctx.globalAlpha=a*0.55;
        ctx.beginPath(); ctx.arc(prt.x, prt.y, prt.r*a,0,Math.PI*2); ctx.fill();
      }
    }
    ctx.globalAlpha=1;
    // popups
    ctx.font="bold 13px monospace";
    ctx.textAlign="center";
    for(var ui=0; ui<popups.length; ui++){
      var popp=popups[ui];
      var pa2=Math.max(0, popp.life/popp.max);
      ctx.globalAlpha=pa2;
      ctx.fillStyle = popp.text.indexOf("+")!==-1? "#1e2a3a" : "#ff4757";
      ctx.strokeStyle="rgba(255,255,255,0.95)";
      ctx.lineWidth=3;
      ctx.strokeText(popp.text, popp.x, popp.y);
      ctx.fillText(popp.text, popp.x, popp.y);
    }
    ctx.globalAlpha=1;

    // frost vignette when cold
    if(coldLevel>0.08){
      var frostAlpha = Math.min(0.28, coldLevel*0.62);
      ctx.fillStyle="rgba(160,210,255,"+frostAlpha+")";
      ctx.fillRect(0,0,W,H);
      // frost edges
      var grad = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.45, W/2, H/2, Math.max(W,H)*0.9);
      grad.addColorStop(0,"rgba(255,255,255,0)");
      grad.addColorStop(1,"rgba(180,220,255,0.18)");
      ctx.fillStyle=grad;
      ctx.fillRect(0,0,W,H);
      // ice cracks overlay
      ctx.strokeStyle="rgba(255,255,255,"+(0.12+coldLevel*0.25)+")";
      ctx.lineWidth=1;
      ctx.beginPath();
      ctx.moveTo(0, H*0.18); ctx.lineTo(W*0.12, H*0.26); ctx.lineTo(W*0.28, H*0.12);
      ctx.moveTo(W*0.58, 0); ctx.lineTo(W*0.66, H*0.16); ctx.lineTo(W*0.82, H*0.08);
      ctx.moveTo(0, H*0.82); ctx.lineTo(W*0.18, H*0.74); ctx.lineTo(W*0.08, H*0.95);
      ctx.stroke();
    }
    // game over overlay
    if(gameOver){
      ctx.fillStyle="rgba(25,33,43,0.78)";
      ctx.fillRect(0,0,W,H);
      ctx.fillStyle="#fff";
      ctx.textAlign="center";
      ctx.font="bold 34px sans-serif";
      ctx.fillText("COLONY FALLEN!", W/2, H/2 -18);
      ctx.font="bold 14px monospace";
      ctx.fillStyle="#d0d8e8";
      ctx.fillText("Wave "+wave+" \u00B7 Score "+score+" \u00B7 Towers "+towers.length, W/2, H/2 +12);
      ctx.font="800 12px monospace";
      ctx.fillStyle="#ffd700";
      ctx.fillText("The penguin will remember this...", W/2, H/2 +32);
    } else if(won){
      ctx.fillStyle="rgba(255,255,255,0.86)";
      ctx.fillRect(0,0,W,H);
      ctx.fillStyle="#1e2a3a";
      ctx.textAlign="center";
      ctx.font="bold 36px sans-serif";
      ctx.fillText("COLONY SAVED! \uD83C\uDFC6", W/2, H/2 -14);
      ctx.font="bold 16px monospace";
      ctx.fillStyle="#2a3442";
      ctx.fillText("Survived 20 waves \u00B7 Score "+score, W/2, H/2 +16);
      ctx.font="800 12px monospace";
      ctx.fillStyle="#43c6ac";
      ctx.fillText("The Penguin nods approvingly. \uD83D\uDC27", W/2, H/2 +36);
    } else if(!waveActive && spawnQueue.length===0 && enemies.length===0 && wave===1){
      // initial hint pulse on first buildable cells
      var tPulse = (Math.sin(Date.now()*0.006)+1)/2;
      ctx.strokeStyle="rgba(246,196,69,"+(0.25+ tPulse*0.35)+")";
      ctx.lineWidth=2;
      ctx.setLineDash([4,4]);
      for(var r2=0;r2<ROWS;r2++) for(var c2=0;c2<COLS;c2++) if(!isBlockedCell(c2,r2) && !towerAtCell(c2,r2)){
        // only highlight a few near path start for hint
        if((c2===2 && r2===2)||(c2===1 && r2===4)||(c2===4 && r2===1)){
          var cenH=cellCenter(c2,r2);
          ctx.strokeRect(cenH.x-22, cenH.y-16,44,32);
        }
      }
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  function drawTowerCritter(c, tower){
    var id = tower.id;
    var ang = tower.angle || -Math.PI/2;
    var lvl = tower.level || 1;
    var t = performance.now()*0.004;
    // subtle idle wobble / breathing
    var breathe = Math.sin(t*1.8 + (tower.x||0)*0.01)*0.45;
    var bob = Math.sin(t*1.1 + (tower.y||0)*0.008)*0.6;
    c.translate(0, bob*0.35);

    if(id==="owl"){
      // --- SNOWY OWL: fluffy, long-range sentinel ---
      // perch snow
      c.fillStyle="rgba(207,232,255,0.95)";
      c.beginPath(); c.ellipse(0,10.5,9,2.8,0,0,Math.PI*2); c.fill();
      // body fluffy gradient
      var gradO = c.createRadialGradient(-2,-2,2,0,1,12);
      gradO.addColorStop(0,"#ffffff");
      gradO.addColorStop(1,"#e6eef7");
      c.fillStyle=gradO; c.strokeStyle="#3a3a4a"; c.lineWidth=1.4;
      c.beginPath(); c.ellipse(0,1,10.2,12.5,0,0,Math.PI*2); c.fill(); c.stroke();
      // belly soft
      c.fillStyle="#fff8ea";
      c.beginPath(); c.ellipse(0,4.8,6.4,7.6,0,0,Math.PI*2); c.fill();
      c.fillStyle="rgba(58,58,74,0.09)";
      for(var i=0;i<3;i++){ c.beginPath(); c.ellipse(-1.5+i*1.5, 5+i*0.4, 0.9,0.7,0,0,Math.PI*2); c.fill(); }
      // wings — slightly lifted when aiming
      var wingBreathe = Math.sin(t*2.2)*0.07;
      c.fillStyle="#f0e8d8"; c.strokeStyle="#3a3a4a"; c.lineWidth=1.15;
      // left
      c.save(); c.translate(-9.2,0.5); c.rotate(-0.32 + wingBreathe); c.beginPath(); c.ellipse(0,0,4.1,8.2,0,0,Math.PI*2); c.fill(); c.stroke();
      // feather lines
      c.strokeStyle="rgba(58,58,74,0.18)"; c.lineWidth=0.7;
      for(var f=0; f<3; f++){ c.beginPath(); c.moveTo(-1, -4+f*2.5); c.lineTo(1, -3.2+f*2.5); c.stroke(); }
      c.restore();
      c.save(); c.translate(9.2,0.5); c.rotate(0.32 - wingBreathe); c.fillStyle="#f0e8d8"; c.strokeStyle="#3a3a4a"; c.lineWidth=1.15;
      c.beginPath(); c.ellipse(0,0,4.1,8.2,0,0,Math.PI*2); c.fill(); c.stroke();
      c.strokeStyle="rgba(58,58,74,0.18)"; c.lineWidth=0.7;
      for(var f2=0; f2<3; f2++){ c.beginPath(); c.moveTo(-1, -4+f2*2.5); c.lineTo(1, -3.2+f2*2.5); c.stroke(); }
      c.restore();
      // head — slight turn toward target
      var headTurn = Math.max(-0.18, Math.min(0.18, Math.sin(ang)*0.14));
      c.save(); c.translate(headTurn*6, 0);
      c.fillStyle="#ffffff"; c.strokeStyle="#3a3a4a"; c.lineWidth=1.3;
      c.beginPath(); c.ellipse(0,-5.5,8.6,7.8,0,0,Math.PI*2); c.fill(); c.stroke();
      // face disk
      c.fillStyle="#fafaf5"; c.beginPath(); c.ellipse(0,-5.5,7.2,6.4,0,0,Math.PI*2); c.fill();
      // ear tufts
      c.fillStyle="#3a3a4a"; c.beginPath(); c.moveTo(-6.2,-11); c.lineTo(-7.2,-14.2); c.lineTo(-4.2,-12); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(6.2,-11); c.lineTo(7.2,-14.2); c.lineTo(4.2,-12); c.closePath(); c.fill();
      c.fillStyle="#f7f0d8"; c.beginPath(); c.moveTo(-6.2,-11); c.lineTo(-6.6,-12.6); c.lineTo(-4.8,-11.2); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(6.2,-11); c.lineTo(6.6,-12.6); c.lineTo(4.8,-11.2); c.closePath(); c.fill();
      // eyes — gold with shrinking pupil when aiming long range
      var blink = (Math.sin(t*0.9 + headTurn*10) > 0.985) ? 0.2 : 1;
      c.fillStyle="#ffd166"; c.strokeStyle="#2a2a30"; c.lineWidth=1.1;
      c.beginPath(); c.ellipse(-4,-5.5,3.6*blink,3.5,0,0,Math.PI*2); c.fill(); c.stroke();
      c.beginPath(); c.ellipse(4,-5.5,3.6*blink,3.5,0,0,Math.PI*2); c.fill(); c.stroke();
      if(blink>0.5){
        c.fillStyle="#0f1320";
        var pupilShift = headTurn*1.2;
        c.beginPath(); c.arc(-4 + pupilShift,-5.5,1.55,0,Math.PI*2); c.fill();
        c.beginPath(); c.arc(4 + pupilShift,-5.5,1.55,0,Math.PI*2); c.fill();
        c.fillStyle="#fff"; c.beginPath(); c.arc(-4 + pupilShift+0.6,-6.2,0.7,0,Math.PI*2); c.fill();
        c.beginPath(); c.arc(4 + pupilShift+0.6,-6.2,0.7,0,Math.PI*2); c.fill();
      }
      // beak tiny diamond
      c.fillStyle="#ff9f2e"; c.strokeStyle="#6b3a0a"; c.lineWidth=0.9;
      c.beginPath(); c.moveTo(-1.6,-2.2); c.lineTo(1.6,-2.2); c.lineTo(0,1.1); c.closePath(); c.fill(); c.stroke();
      c.restore();
      // weapon — frost feather volley (rotates to target)
      c.save(); c.rotate(ang);
      // bow?
      c.strokeStyle="rgba(58,58,74,0.85)"; c.lineWidth=1.2;
      c.beginPath(); c.moveTo(7,-3.2); c.lineTo(13,0); c.lineTo(7,3.2); c.stroke();
      c.fillStyle="#a0e7ff"; c.strokeStyle="#2a5a7a"; c.lineWidth=1;
      c.beginPath(); c.ellipse(11,0,3.2,2.1,0,0,Math.PI*2); c.fill(); c.stroke();
      c.fillStyle="rgba(255,255,255,0.9)"; c.beginPath(); c.ellipse(10.2,-0.8,0.9,0.6,0,0,Math.PI*2); c.fill();
      c.restore();
      // level chevrons on perch
      if(lvl>=2){ c.fillStyle=lvl>=3?"#ffd700":"#cfeeff"; c.strokeStyle="#2a3442"; c.lineWidth=0.9;
        for(var lv=0; lv<lvl-1; lv++){ c.beginPath(); c.moveTo(-6+lv*6, 9.2); c.lineTo(-3+lv*6, 11); c.lineTo(0+lv*6, 9.2); c.stroke(); c.fill(); } }

    } else if(id==="bear"){
      // --- POLAR BEAR: big cuddly tank with ice slam ---
      // icy platform shine
      c.fillStyle="rgba(174,215,255,0.22)";
      c.beginPath(); c.ellipse(0,11,10,2.6,0,0,Math.PI*2); c.fill();
      // body — big fluffy
      var grdB = c.createRadialGradient(-3,-4,2,0,0,14);
      grdB.addColorStop(0,"#ffffff");
      grdB.addColorStop(0.55,"#f5fbff");
      grdB.addColorStop(1,"#dbe9f7");
      c.fillStyle=grdB; c.strokeStyle="#2a3a4a"; c.lineWidth=1.6;
      c.beginPath(); c.ellipse(0,0.5,12.4,11.2,0,0,Math.PI*2); c.fill(); c.stroke();
      // belly — warm cream
      c.fillStyle="#fff3d6";
      c.beginPath(); c.ellipse(0,4.6,7.8,6.4,0,0,Math.PI*2); c.fill();
      c.fillStyle="rgba(0,0,0,0.04)"; c.beginPath(); c.ellipse(0,6.2,7.8,1.4,0,0,Math.PI*2); c.fill();
      // arms
      c.fillStyle="#ffffff"; c.strokeStyle="#2a3a4a"; c.lineWidth=1.2;
      c.beginPath(); c.ellipse(-8,2,4.6,7.2,-0.18,0,Math.PI*2); c.fill(); c.stroke();
      c.beginPath(); c.ellipse(8,2,4.6,7.2,0.18,0,Math.PI*2); c.fill(); c.stroke();
      // paw pads
      c.fillStyle="#2a3a4a"; c.beginPath(); c.arc(-8,5.2,1.4,0,Math.PI*2); c.fill();
      c.beginPath(); c.arc(-6.6,7,0.8,0,Math.PI*2); c.fill(); c.beginPath(); c.arc(-9.2,6.6,0.7,0,Math.PI*2); c.fill();
      c.beginPath(); c.arc(8,5.2,1.4,0,Math.PI*2); c.fill();
      c.beginPath(); c.arc(6.6,7,0.8,0,Math.PI*2); c.fill(); c.beginPath(); c.arc(9.2,6.6,0.7,0,Math.PI*2); c.fill();
      // head
      c.fillStyle="#ffffff"; c.strokeStyle="#2a3a4a"; c.lineWidth=1.4;
      c.beginPath(); c.ellipse(0,-9.8,10,9,0,0,Math.PI*2); c.fill(); c.stroke();
      // muzzle
      c.fillStyle="#fff3d6"; c.strokeStyle="rgba(0,0,0,0.12)"; c.lineWidth=0.9;
      c.beginPath(); c.ellipse(0,-5.2,5.4,4.2,0,0,Math.PI*2); c.fill(); c.stroke();
      c.fillStyle="#1a2632"; c.beginPath(); c.ellipse(0,-4.2,2.2,1.6,0,0,Math.PI*2); c.fill();
      c.fillStyle="#fff"; c.beginPath(); c.ellipse(-0.7,-4.7,0.7,0.5,0,0,Math.PI*2); c.fill();
      // eyes — small friendly, squint when about to slam
      var squint = (tower.cooldown && tower.cooldown<0.12) ? 0.45 : 1;
      c.fillStyle="#1a2632";
      c.beginPath(); c.ellipse(-4.8,-10.2,1.9,1.9*squint,0,0,Math.PI*2); c.fill();
      c.beginPath(); c.ellipse(4.8,-10.2,1.9,1.9*squint,0,0,Math.PI*2); c.fill();
      c.fillStyle="#fff"; c.beginPath(); c.arc(-4.2,-11,0.6,0,Math.PI*2); c.fill(); c.beginPath(); c.arc(5.4,-11,0.6,0,Math.PI*2); c.fill();
      // brows
      c.strokeStyle="#2a3a4a"; c.lineWidth=0.9; c.beginPath(); c.moveTo(-7.2,-12.2); c.lineTo(-3.2,-11.4); c.moveTo(7.2,-12.2); c.lineTo(3.2,-11.4); c.stroke();
      // ears
      c.fillStyle="#ffffff"; c.strokeStyle="#2a3a4a"; c.lineWidth=1.1;
      c.beginPath(); c.arc(-7.6,-17,3.3,0,Math.PI*2); c.fill(); c.stroke();
      c.beginPath(); c.arc(7.6,-17,3.3,0,Math.PI*2); c.fill(); c.stroke();
      c.fillStyle="#ffb3c1"; c.beginPath(); c.arc(-7.6,-17,1.5,0,Math.PI*2); c.fill();
      c.beginPath(); c.arc(7.6,-17,1.5,0,Math.PI*2); c.fill();
      c.fillStyle="#ffffff"; c.beginPath(); c.arc(-7,-18.2,0.9,0,Math.PI*2); c.fill(); c.beginPath(); c.arc(8.2,-18,0.9,0,Math.PI*2); c.fill();
      // ice gauntlet weapon
      c.save(); c.rotate(ang);
      // frost hammer
      c.fillStyle="#e6f4ff"; c.strokeStyle="#2a5a7a"; c.lineWidth=1.2;
      c.beginPath(); c.roundRect(9,-4.2,10,8.4,3); c.fill(); c.stroke();
      c.fillStyle="rgba(160,220,255,0.9)"; c.fillRect(10,-2.8,8,1.2);
      c.fillStyle="#a0e7ff"; c.beginPath(); c.moveTo(19,-3.2); c.lineTo(22,0); c.lineTo(19,3.2); c.closePath(); c.fill(); c.stroke();
      // snow puff when slamming — scale with cooldown
      if(tower.cooldown && tower.cooldown<0.15){
        c.fillStyle="rgba(255,255,255,0.85)"; c.beginPath(); c.ellipse(22,0,3.2,2.2,0,0,Math.PI*2); c.fill();
      }
      c.restore();
      // little breath cloud
      c.fillStyle="rgba(255,255,255,0.55)"; c.beginPath(); c.ellipse(3,-1,2.2,1.4,0,0,Math.PI*2); c.fill();

    } else if(id==="seal"){
      // --- SEAL: bouncy, whiskered, snowball juggler ---
      // puddle
      c.fillStyle="rgba(42,85,120,0.18)";
      c.beginPath(); c.ellipse(0,11,11,3,0,0,Math.PI*2); c.fill();
      // body — chubby
      var grdS = c.createRadialGradient(-3,-1,2,0,2,11);
      grdS.addColorStop(0,"#8fb7d6");
      grdS.addColorStop(1,"#5a8ab5");
      c.fillStyle=grdS; c.strokeStyle="#1d3d5c"; c.lineWidth=1.45;
      c.beginPath(); c.ellipse(0,2.4,10.6,8.4,0,0,Math.PI*2); c.fill(); c.stroke();
      // belly — big white with water spots
      c.fillStyle="#fff8ea"; c.beginPath(); c.ellipse(0,4.8,6.6,4.9,0,0,Math.PI*2); c.fill();
      c.fillStyle="rgba(91,138,181,0.12)"; c.beginPath(); c.ellipse(-1.5,6,1.2,0.8,0,0,Math.PI*2); c.fill(); c.beginPath(); c.ellipse(1.8,5.2,0.9,0.6,0,0,Math.PI*2); c.fill();
      // flippers — animated flap toward target
      var flap = Math.sin(t*3.2 + lvl*0.5)*0.18;
      c.fillStyle="#6d9bc4"; c.strokeStyle="#1d3d5c"; c.lineWidth=1.1;
      c.save(); c.translate(-8.6,2.2); c.rotate(-0.42 + flap); c.beginPath(); c.ellipse(0,0,4.2,7.4,0,0,Math.PI*2); c.fill(); c.stroke();
      // flipper lines
      c.strokeStyle="rgba(29,61,92,0.22)"; c.lineWidth=0.7; for(var ff=0; ff<2; ff++){ c.beginPath(); c.moveTo(-1,-3+ff*3); c.lineTo(1,-2+ff*3); c.stroke(); } c.restore();
      c.save(); c.translate(8.6,2.2); c.rotate(0.42 - flap);
      // aiming flipper holds snowball
      c.fillStyle="#6d9bc4"; c.strokeStyle="#1d3d5c"; c.lineWidth=1.1;
      c.beginPath(); c.ellipse(0,0,4.2,7.4,0,0,Math.PI*2); c.fill(); c.stroke();
      c.restore();
      // head
      c.fillStyle="#8fb7d6"; c.strokeStyle="#1d3d5c"; c.lineWidth=1.25;
      c.beginPath(); c.ellipse(0,-6.2,7.3,6.2,0,0,Math.PI*2); c.fill(); c.stroke();
      // cheeks puff
      c.fillStyle="#5a8ab5"; c.beginPath(); c.ellipse(-4.2,-6.8,1.2,0.9,0,0,Math.PI*2); c.fill(); c.beginPath(); c.ellipse(4.2,-6.8,1.2,0.9,0,0,Math.PI*2); c.fill();
      // eyes — big glossy but tired/droopy (worse seal!)
      c.fillStyle="#0f1f2f";
      c.beginPath(); c.arc(-3.2,-7,1.9,0,Math.PI*2); c.fill(); c.beginPath(); c.arc(3.2,-7,1.9,0,Math.PI*2); c.fill();
      c.fillStyle="#fff"; c.beginPath(); c.arc(-2.4,-8.1,0.85,0,Math.PI*2); c.fill(); c.beginPath(); c.arc(4,-8.1,0.85,0,Math.PI*2); c.fill();
      c.fillStyle="#6ddcff"; c.beginPath(); c.arc(-3.2,-6.7,0.45,0,Math.PI*2); c.fill(); c.beginPath(); c.arc(3.2,-6.7,0.45,0,Math.PI*2); c.fill();
      // droopy lids — makes seal look clumsy/tired
      c.strokeStyle="rgba(29,61,92,0.96)"; c.lineWidth=1.05; c.lineCap="round";
      c.beginPath(); c.moveTo(-5.4,-7.9); c.lineTo(-1.0,-7.1); c.stroke();
      c.beginPath(); c.moveTo(1.0,-7.1); c.lineTo(5.4,-7.9); c.stroke();
      // sweat drop (clumsy)
      c.fillStyle="rgba(109,220,255,0.92)"; c.strokeStyle="#1d3d5c"; c.lineWidth=0.7;
      c.beginPath(); c.ellipse(5.1,-5.4,1.1,1.6,0.32,0,Math.PI*2); c.fill(); c.stroke();
      c.fillStyle="#fff"; c.beginPath(); c.ellipse(4.8,-6,0.42,0.55,0.32,0,Math.PI*2); c.fill();
      // nose + whiskers (dots)
      c.fillStyle="#1d3d5c"; c.beginPath(); c.ellipse(0,-4.6,1.7,1.2,0,0,Math.PI*2); c.fill();
      c.fillStyle="rgba(255,255,255,0.9)"; c.beginPath(); c.arc(-0.5,-5,0.45,0,Math.PI*2); c.fill();
      c.strokeStyle="#1d3d5c"; c.lineWidth=0.65;
      for(var wh=-1; wh<=1; wh++){ c.beginPath(); c.moveTo(-3.2, -4.2+wh*0.9); c.lineTo(-6.6, -4.4+wh*1.1); c.stroke(); c.beginPath(); c.moveTo(3.2, -4.2+wh*0.9); c.lineTo(6.6, -4.4+wh*1.1); c.stroke(); }
      // whisker pads
      c.fillStyle="#1d3d5c"; c.beginPath(); c.arc(-5.6,-4.1,0.5,0,Math.PI*2); c.fill(); c.beginPath(); c.arc(5.6,-4.1,0.5,0,Math.PI*2); c.fill();
      // snowball in aiming flipper
      c.save(); c.rotate(ang);
      var ballBob = Math.sin(t*4)*0.4;
      c.translate(10.2+ballBob, 0);
      c.fillStyle="#ffffff"; c.strokeStyle="#1d3d5c"; c.lineWidth=1;
      c.beginPath(); c.arc(0,0,3.6,0,Math.PI*2); c.fill(); c.stroke();
      c.fillStyle="rgba(160,220,255,0.65)"; c.beginPath(); c.arc(0.7,0.7,1.1,0,Math.PI*2); c.fill();
      c.fillStyle="#fff"; c.beginPath(); c.arc(-0.9,-0.9,0.9,0,Math.PI*2); c.fill();
      // tiny sparkle
      c.fillStyle="rgba(255,255,255,1)"; c.beginPath(); c.moveTo(1.2,-1.2); c.lineTo(1.6,-0.4); c.lineTo(0.8,0); c.lineTo(1.6,0.4); c.lineTo(1.2,1.2); c.lineTo(0.4,0.4); c.lineTo(0,0); c.lineTo(0.4,-0.4); c.closePath(); c.fill();
      c.restore();

    } else if(id==="fox"){
      // --- ARCTIC FOX: agile rusher with ember tail ---
      // shadow
      c.fillStyle="rgba(42,30,10,0.14)"; c.beginPath(); c.ellipse(0,11,9,2.6,0,0,Math.PI*2); c.fill();
      // body — orange gradient
      var grdF = c.createRadialGradient(-2,-3,2,0,0,11);
      grdF.addColorStop(0,"#ffca7a");
      grdF.addColorStop(0.6,"#d98a42");
      grdF.addColorStop(1,"#b5652a");
      c.fillStyle=grdF; c.strokeStyle="#5a2e0a"; c.lineWidth=1.35;
      c.beginPath(); c.ellipse(0,0.2,10.4,8.2,0,0,Math.PI*2); c.fill(); c.stroke();
      // chest white w/ fur tuft
      c.fillStyle="#fffef8"; c.beginPath(); c.ellipse(0,3.6,5.4,4.6,0,0,Math.PI*2); c.fill();
      c.strokeStyle="rgba(90,46,10,0.14)"; c.lineWidth=0.7; c.beginPath(); c.moveTo(-2.2,1.2); c.lineTo(-0.6,3.4); c.moveTo(2.2,1.2); c.lineTo(0.6,3.4); c.stroke();
      // head — triangular
      c.fillStyle="#d98a42"; c.strokeStyle="#5a2e0a"; c.lineWidth=1.25;
      c.beginPath(); c.moveTo(-7,-3.8); c.lineTo(7,-3.8); c.lineTo(0,-13.8); c.closePath(); c.fill(); c.stroke();
      // muzzle white
      c.fillStyle="#fffef8"; c.beginPath(); c.ellipse(0,-5.8,3.2,2.2,0,0,Math.PI*2); c.fill();
      // ears — pink inside, ear flick
      var earFlick = Math.sin(t*2.8)*0.04;
      c.fillStyle="#5a2e0a"; c.beginPath(); c.moveTo(-6.6,-8.2); c.lineTo(-4.2,-13.2 + earFlick*4); c.lineTo(-2.4,-8.4); c.closePath(); c.fill();
      c.fillStyle="#ffb3c1"; c.beginPath(); c.moveTo(-5.8,-9); c.lineTo(-4.4,-11.2); c.lineTo(-3.2,-8.8); c.closePath(); c.fill();
      c.fillStyle="#5a2e0a"; c.beginPath(); c.moveTo(6.6,-8.2); c.lineTo(4.2,-13.2 - earFlick*4); c.lineTo(2.4,-8.4); c.closePath(); c.fill();
      c.fillStyle="#ffb3c1"; c.beginPath(); c.moveTo(5.8,-9); c.lineTo(4.4,-11.2); c.lineTo(3.2,-8.8); c.closePath(); c.fill();
      // eyes — amber, slightly narrowed when targeting
      var foxSquint = (tower.cooldown && tower.cooldown<0.18) ? 0.6 : 1;
      c.fillStyle="#1e140a"; c.beginPath(); c.ellipse(-3.2,-7,1.5,1.6*foxSquint,0,0,Math.PI*2); c.fill(); c.beginPath(); c.ellipse(3.2,-7,1.5,1.6*foxSquint,0,0,Math.PI*2); c.fill();
      c.fillStyle="#ff8a1a"; c.beginPath(); c.arc(-3.2,-7,0.5,0,Math.PI*2); c.fill(); c.beginPath(); c.arc(3.2,-7,0.5,0,Math.PI*2); c.fill();
      c.fillStyle="#fff"; c.beginPath(); c.arc(-2.6,-7.8,0.45,0,Math.PI*2); c.fill(); c.beginPath(); c.arc(3.8,-7.8,0.45,0,Math.PI*2); c.fill();
      // nose — heart
      c.fillStyle="#1a0f05"; c.beginPath(); c.arc(0,-4.4,1.05,0,Math.PI*2); c.fill(); c.fillStyle="#fff"; c.beginPath(); c.arc(-0.4,-4.8,0.35,0,Math.PI*2); c.fill();
      // tail — big fluffy, wag when idle
      var wag = Math.sin(t*4.2)*0.5;
      c.save(); c.translate(8.2,4.8); c.rotate(0.62 + wag*0.14);
      var grdTail = c.createLinearGradient(-6,0,6,0);
      grdTail.addColorStop(0,"#d98a42"); grdTail.addColorStop(0.55,"#ffca7a"); grdTail.addColorStop(1,"#ffffff");
      c.fillStyle=grdTail; c.strokeStyle="#5a2e0a"; c.lineWidth=1.05;
      c.beginPath(); c.ellipse(0,0,7.2,4.6,0,0,Math.PI*2); c.fill(); c.stroke();
      c.fillStyle="#fff"; c.beginPath(); c.ellipse(4.2,0.6,2.4,2.1,0,0,Math.PI*2); c.fill();
      // tail tip flicker ember when shooting
      if(tower.cooldown && tower.cooldown<0.2){
        c.fillStyle="rgba(255,138,101,0.85)"; c.beginPath(); c.ellipse(5.2,0,1.2,0.9,0,0,Math.PI*2); c.fill();
      }
      c.restore();
      // weapon — ember dart along angle
      c.save(); c.rotate(ang);
      c.fillStyle="#ff8a65"; c.strokeStyle="#5a2e0a"; c.lineWidth=1;
      c.beginPath(); c.moveTo(7,-1.1); c.lineTo(13,0); c.lineTo(7,1.1); c.closePath(); c.fill(); c.stroke();
      c.fillStyle="#fff"; c.beginPath(); c.arc(9.2,0,0.6,0,Math.PI*2); c.fill();
      // trail ember
      if(tower.cooldown && tower.cooldown<0.25){
        c.fillStyle="rgba(255,138,101,0.42)"; c.beginPath(); c.arc(5.2,0,1.4,0,Math.PI*2); c.fill();
      }
      c.restore();

    } else if(id==="penguin"){
      // --- THE PENGUIN: absolute menace, frost lord ---
      // dark ice puddle
      c.fillStyle="rgba(10,24,42,0.22)"; c.beginPath(); c.ellipse(0,11.5,12,3.2,0,0,Math.PI*2); c.fill();
      // frost aura — pulsing ring
      var pulse = 0.55 + Math.sin(t*2.6)*0.25;
      c.strokeStyle="rgba(160,220,255,"+(0.42 + pulse*0.18)+")"; c.lineWidth=1.2 + pulse*0.6;
      c.beginPath(); c.arc(0,-1,15 + pulse*2,0,Math.PI*2); c.stroke();
      // inner frost
      c.strokeStyle="rgba(255,255,255,"+(0.18 + pulse*0.12)+")"; c.lineWidth=0.8; c.beginPath(); c.arc(0,-1,10.5,0,Math.PI*2); c.stroke();
      // snowflakes around aura
      for(var sf=0; sf<3; sf++){
        var a = t*0.9 + sf*2.09; var r = 13.5 + Math.sin(t*1.7+sf)*1.2;
        c.fillStyle="rgba(255,255,255,0.92)"; c.beginPath();
        // tiny star
        var sx = Math.cos(a)*r, sy = Math.sin(a)*r -1;
        c.translate(sx,sy); c.rotate(a);
        c.fillRect(-1.1,-0.22,2.2,0.44); c.fillRect(-0.22,-1.1,0.44,2.2);
        c.rotate(-a); c.translate(-sx,-sy);
      }
      // body — tuxedo with belly gradient + shine
      var grdP = c.createRadialGradient(-2,-4,1,0,0,12);
      grdP.addColorStop(0,"#2e4460");
      grdP.addColorStop(0.58,"#1e2a3a");
      grdP.addColorStop(1,"#0f1a2a");
      c.fillStyle=grdP; c.strokeStyle="#0a1320"; c.lineWidth=1.5;
      c.beginPath(); c.ellipse(0,1.8,9.4,11.4,0,0,Math.PI*2); c.fill(); c.stroke();
      // belly — warm gold-white with speckles
      var grdBelly = c.createRadialGradient(-1,2,0,0,3,8);
      grdBelly.addColorStop(0,"#ffffff");
      grdBelly.addColorStop(0.62,"#fff8ea");
      grdBelly.addColorStop(1,"#ffd66e");
      c.fillStyle=grdBelly; c.beginPath(); c.ellipse(0,3.6,5.9,7.4,0,0,Math.PI*2); c.fill();
      c.fillStyle="rgba(30,42,58,0.07)"; for(var b=0;b<2;b++){ c.beginPath(); c.ellipse(-0.8+b*1.6, 4.2+b*0.9, 0.7,0.5,0,0,Math.PI*2); c.fill(); }
      // chest highlight
      c.fillStyle="rgba(255,255,255,0.72)"; c.beginPath(); c.ellipse(-1.8,0.2,2.2,3.2, -0.22,0,Math.PI*2); c.fill();
      // scarf? — tiny frost scarf flutter
      var scarfFlutter = Math.sin(t*3.4)*0.9;
      c.fillStyle="#a0e7ff"; c.strokeStyle="#0f3860"; c.lineWidth=0.9;
      c.beginPath(); c.roundRect(-5.2, -1.2, 10.4,3.2,1.2); c.fill(); c.stroke();
      c.save(); c.translate(4.2,2.2); c.rotate(scarfFlutter*0.08); c.fillStyle="#a0e7ff"; c.strokeStyle="#0f3860"; c.lineWidth=0.8;
      c.beginPath(); c.roundRect(-1.6,-0.6,3.2,6.2,1); c.fill(); c.stroke();
      c.fillStyle="rgba(255,255,255,0.9)"; c.fillRect(-1.6,1.2,3.2,0.9); c.restore();
      // head
      c.fillStyle="#0f1a2a"; c.strokeStyle="#0a1320"; c.lineWidth=1.4;
      c.beginPath(); c.ellipse(0,-8.4,8.4,7.4,0,0,Math.PI*2); c.fill(); c.stroke();
      // face white mask — heart-shaped
      c.fillStyle="#ffffff"; c.beginPath();
      c.moveTo(0,-12.2); c.bezierCurveTo(3.2,-12.5,6.2,-9.8,5.2,-6.2); c.bezierCurveTo(4.2,-4.2,2.2,-3.2,0,-3.2);
      c.bezierCurveTo(-2.2,-3.2,-4.2,-4.2,-5.2,-6.2); c.bezierCurveTo(-6.2,-9.8,-3.2,-12.5,0,-12.2); c.closePath(); c.fill();
      // beak — orange with nostril line
      c.fillStyle="#ff9f2e"; c.strokeStyle="#7a3a0a"; c.lineWidth=0.9;
      c.beginPath(); c.moveTo(-3.2,-3.2); c.lineTo(3.2,-3.2); c.lineTo(0,0.4); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle="rgba(122,58,10,0.35)"; c.lineWidth=0.6; c.beginPath(); c.moveTo(-1.2,-2.2); c.lineTo(1.2,-2.2); c.stroke();
      c.fillStyle="rgba(255,255,255,0.55)"; c.beginPath(); c.ellipse(-1.2,-1.8,0.7,0.4,0,0,Math.PI*2); c.fill();
      // eyes — menacing red, with white highlight and brow that lowers when firing
      var penguinAngry = (tower.cooldown && tower.cooldown<0.25) ? 0.22 : 0;
      c.save(); c.translate(0, -0.6*penguinAngry);
      c.fillStyle="#ff2e3a"; c.strokeStyle="#7a0a12"; c.lineWidth=0.8;
      c.beginPath(); c.ellipse(-3.1,-8.6,2.1,1.9,0,0,Math.PI*2); c.fill(); c.stroke();
      c.beginPath(); c.ellipse(3.1,-8.6,2.1,1.9,0,0,Math.PI*2); c.fill(); c.stroke();
      // pupils — narrow vertical slits
      c.fillStyle="#0a1320"; c.beginPath(); c.ellipse(-3.1,-8.6,0.75,1.25,0,0,Math.PI*2); c.fill(); c.beginPath(); c.ellipse(3.1,-8.6,0.75,1.25,0,0,Math.PI*2); c.fill();
      c.fillStyle="#fff"; c.beginPath(); c.arc(-2.6,-9.4,0.55,0,Math.PI*2); c.fill(); c.beginPath(); c.arc(3.6,-9.4,0.55,0,Math.PI*2); c.fill();
      // angry brows — sharp
      c.strokeStyle="#ff2e3a"; c.lineWidth=1.05; c.lineCap="round";
      c.beginPath(); c.moveTo(-5.4,-10.8); c.lineTo(-1.2,-9.4 + penguinAngry*1.2); c.stroke();
      c.beginPath(); c.moveTo(5.4,-10.8); c.lineTo(1.2,-9.4 + penguinAngry*1.2); c.stroke();
      c.restore();
      // flippers — penguin waddle when idle, raised when blizzard ready
      var flapP = Math.sin(t*2 + (tower.x||0)*0.02)*0.12;
      var blizzardReady = (tower.blizzardCd!==undefined && tower.blizzardCd<2.2) ? 0.22 : 0;
      c.fillStyle="#0f1a2a"; c.strokeStyle="#0a1320"; c.lineWidth=1.1;
      c.save(); c.translate(-8.2,0.2); c.rotate(-0.18 + flapP - blizzardReady*0.4);
      c.beginPath(); c.ellipse(0,0,3.4,7.2,0,0,Math.PI*2); c.fill(); c.stroke();
      // flipper shine
      c.fillStyle="rgba(255,255,255,0.14)"; c.beginPath(); c.ellipse(-0.7,-2.2,1.1,2,0,0,Math.PI*2); c.fill();
      c.restore();
      c.save(); c.translate(8.2,0.2); c.rotate(0.18 - flapP + blizzardReady*0.4);
      c.beginPath(); c.ellipse(0,0,3.4,7.2,0,0,Math.PI*2); c.fill(); c.stroke();
      c.fillStyle="rgba(255,255,255,0.14)"; c.beginPath(); c.ellipse(0.7,-2.2,1.1,2,0,0,Math.PI*2); c.fill();
      c.restore();
      // feet — orange with toe line
      c.fillStyle="#ff9f2e"; c.strokeStyle="#7a3a0a"; c.lineWidth=0.9;
      c.beginPath(); c.ellipse(-4.2,11.2,3.6,1.9,0,0,Math.PI*2); c.fill(); c.stroke();
      c.beginPath(); c.ellipse(4.2,11.2,3.6,1.9,0,0,Math.PI*2); c.fill(); c.stroke();
      c.strokeStyle="#7a3a0a"; c.lineWidth=0.6; for(var toe=0; toe<2; toe++){ c.beginPath(); c.moveTo(-5+toe*1.4,11); c.lineTo(-5+toe*1.4,12.2); c.stroke(); c.beginPath(); c.moveTo(3+toe*1.4,11); c.lineTo(3+toe*1.4,12.2); c.stroke(); }
      // weapon — ice shard / frost sceptre pointing at target
      c.save(); c.rotate(ang);
      // handle wood
      c.fillStyle="#5a3a1e"; c.strokeStyle="#2a1a0a"; c.lineWidth=0.9;
      c.beginPath(); c.roundRect(7,-1,7,2,1); c.fill(); c.stroke();
      // shard
      var shardPulse = 0.85 + Math.sin(t*6)*0.15 + (tower.cooldown && tower.cooldown<0.18 ? 0.25 : 0);
      c.fillStyle="rgba(160,231,255,"+shardPulse+")"; c.strokeStyle="#0f3860"; c.lineWidth=1.05;
      c.beginPath(); c.moveTo(14,-3.2); c.lineTo(20,0); c.lineTo(14,3.2); c.closePath(); c.fill(); c.stroke();
      // inner frost core
      c.fillStyle="rgba(255,255,255,0.95)"; c.beginPath(); c.moveTo(15,-1.1); c.lineTo(17.8,0); c.lineTo(15,1.1); c.closePath(); c.fill();
      // glow when blizzard ready
      if(blizzardReady>0){
        c.fillStyle="rgba(160,231,255,"+(0.22+Math.sin(t*7)*0.12)+")"; c.beginPath(); c.arc(17,0,3.2,0,Math.PI*2); c.fill();
      }
      c.restore();
      // level crown for penguin — small icy crown
      if(lvl>=2){
        c.fillStyle="#a0e7ff"; c.strokeStyle="#0f3860"; c.lineWidth=0.9;
        c.beginPath(); c.moveTo(-5.2,-15.2); c.lineTo(-2.6,-18.2); c.lineTo(0,-15.2); c.lineTo(2.6,-18.2); c.lineTo(5.2,-15.2); c.closePath(); c.fill(); c.stroke();
        c.fillStyle="#fff"; c.beginPath(); c.arc(0,-15.6,0.7,0,Math.PI*2); c.fill();
        if(lvl>=3){ c.fillStyle="#ffd700"; c.beginPath(); c.arc(-2.6,-16.6,0.55,0,Math.PI*2); c.fill(); c.beginPath(); c.arc(2.6,-16.6,0.55,0,Math.PI*2); c.fill(); }
      }
    }
  }

  function resetGame(){
    clearDefenceSave();
    money = START_MONEY;
    lives = START_LIVES;
    wave = 1;
    score = 0;
    towers = [];
    enemies = [];
    projectiles = [];
    particles = [];
    popups = [];
    spawnQueue = [];
    spawnTimer = 0;
    waveActive = false;
    waveCooldown = 0;
    gameOver = false;
    won = false;
    selectedBuild = null;
    selectedTower = null;
    hoverCell = null;
    shake = 0;
    penguinUnlocked = false;
    penguinBannerShown = false;
    penguinCount = 0;
    coldLevel = 0;
    msgEl.textContent = "Place seals, owls, bears & foxes to defend the colony. Survive the waves!";
    buildBlocked();
    updateUI();
    renderShop();
    renderInfo();
    updateNextBtn();
  }

  // events
  canvas.addEventListener("click", handleCanvasClick);
  canvas.addEventListener("mousemove", handleCanvasMove);
  canvas.addEventListener("touchstart", function(ev){ ev.preventDefault(); handleCanvasMove(ev); handleCanvasClick(ev); }, {passive:false});
  canvas.addEventListener("touchmove", function(ev){ ev.preventDefault(); handleCanvasMove(ev); }, {passive:false});
  // prevent context menu on long press?
  canvas.addEventListener("contextmenu", function(ev){ ev.preventDefault(); });

  nextBtn.addEventListener("click", startNextWaveNow);
  speedBtn.addEventListener("click", function(){
    gameSpeed = gameSpeed===1 ? 2 : gameSpeed===2 ? 3 : 1;
    speedBtn.textContent = "\u23E9 " + gameSpeed + "\u00D7";
  });
  document.querySelector("#defRestart").addEventListener("click", function(){
    resetGame();
  });

  // keyboard: 1-5 select towers, Esc deselect, Space start wave
  function keydown(e){
    if(e.target && (e.target.tagName==="INPUT" || e.target.tagName==="TEXTAREA")) return;
    var k=e.key.toLowerCase();
    if(k===" "){ e.preventDefault(); startNextWaveNow(); }
    if(k==="escape"){ selectedBuild=null; selectedTower=null; renderShop(); renderInfo(); }
    if(k>="1" && k<="5"){
      var idx = parseInt(k,10)-1;
      var id = TOWER_ORDER[idx];
      if(id){
        var def = TOWER_DEFS[id];
        if(def.id==="penguin" && !penguinUnlocked) { msgEl.textContent="Penguin not yet arrived!"; return; }
        if(def.limit && penguinCount>=def.limit) { msgEl.textContent="Penguin limit reached!"; return; }
        selectedBuild = selectedBuild===id? null : id;
        selectedTower=null;
        renderShop(); renderInfo();
      }
    }
    if(k==="r" && (e.ctrlKey||e.metaKey)) return; // allow refresh
    if(k==="r") { resetGame(); }
  }
  document.addEventListener("keydown", keydown);

  // init — try resume saved colony (so X close doesn't lose game)
  buildBlocked();
  var saved = loadDefence();
  if(saved && (saved.towers.length>0 || saved.wave>1) && !saved.gameOver && !saved.won){
    money = saved.money; lives = saved.lives; wave = saved.wave; score = saved.score;
    coldLevel = typeof saved.coldLevel==="number" ? saved.coldLevel : 0;
    penguinUnlocked = !!saved.penguinUnlocked;
    penguinCount = 0; // will recompute
    perfectWaves = saved.perfectWaves||0; totalKills = saved.totalKills||0; waveLeaks = saved.waveLeaks||0;
    towers = [];
    for(var si=0; si<saved.towers.length; si++){
      var st = saved.towers[si];
      var def = TOWER_DEFS[st.id];
      if(!def) continue;
      if(isBlockedCell(st.c, st.r)) continue;
      if(towerAtCell(st.c, st.r)) continue;
      var cen2 = cellCenter(st.c, st.r);
      var lvl = st.level||1; lvl = Math.max(1, Math.min(3, lvl));
      var dmg = lvl===1? def.dmg : lvl===2? Math.round(def.dmg*1.75) : Math.round(def.dmg*2.9);
      var range = lvl===1? def.range : lvl===2? def.range+14 : def.range+26;
      var rate = lvl===1? def.rate : lvl===2? def.rate*1.18 : def.rate*1.38;
      towers.push({c:st.c,r:st.r,x:cen2.x,y:cen2.y,id:def.id,def:def,level:lvl,dmg:dmg,range:range,rate:rate,cooldown:0,kills:st.kills||0,totalCost:st.totalCost||def.cost,angle:-Math.PI/2, blizzardCd: def.id==="penguin"? 8+Math.random()*1.2 : undefined});
    }
    penguinCount = towers.filter(function(t){return t.id==="penguin";}).length;
    if(penguinUnlocked) penguinBannerShown = true;
    msgEl.textContent = "❄️ Colony restored! Wave "+wave+" \u00B7 "+towers.length+" defenders \u00B7 Welcome back!";
    bannerText.textContent = "\u2744\uFE0F COLONY RESTORED — WAVE "+wave+" \u2744\uFE0F";
    bannerEl.hidden=false; bannerEl.classList.add("show");
    setTimeout(function(){ bannerEl.classList.remove("show"); setTimeout(function(){bannerEl.hidden=true;},420); }, 1800);
  } else {
    if(saved && (saved.gameOver||saved.won)) clearDefenceSave();
  }
  renderShop();
  updateUI();
  // snow init already

  function tick(now){
    var dt = Math.min(0.033, (now - last)/1000);
    last = now;
    update(dt);
    render();
    raf = requestAnimationFrame(tick);
  }
  last = performance.now();
  raf = requestAnimationFrame(tick);

  activeCleanup = function(){
    try{ if(!gameOver && !won) saveDefence(); }catch(e){}
    cancelAnimationFrame(raf);
    document.removeEventListener("keydown", keydown);
  };
  activeAdvance = function(ms){
    var steps = Math.max(1, Math.round(ms/16));
    for(var i=0;i<steps;i++) update(1/60);
    render();
  };
}
Object.assign(gameStarters, { defence: startPenguinDefence, penguin_defence: startPenguinDefence, penguinDefence: startPenguinDefence });

