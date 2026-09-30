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
      '<div class="defence-stage" id="defStage">' +
        '<canvas class="defence-canvas" id="defenceCanvas" width="720" height="432"></canvas>' +
        '<div class="defence-cold-banner" id="defColdBanner" hidden><span class="def-cold-icon">\u2744\uFE0F</span><span id="defColdText">THE ICE IS THICKENING...</span><span class="def-cold-icon">\u2744\uFE0F</span></div>' +
      '</div>' +
      '<div class="defence-shop" id="defShop"></div>' +
      '<div class="defence-info" id="defInfo" hidden></div>' +
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
  var START_MONEY = 130;
  var START_LIVES = 20;

  var TOWER_DEFS = {
    seal:  { id:"seal",  name:"Seal",       cost:55,  dmg:18, range:98,  rate:0.92, projSpeed:460, color:"#b8a99a", accent:"#e8ddd0", bullet:"#6ddcff", desc:"Quick slap", emoji:"\uD83E\uDDAD" },
    fox:   { id:"fox",   name:"Arctic Fox", cost:45,  dmg:12, range:86,  rate:1.25, projSpeed:500, color:"#d98a42", accent:"#ffe2c0", bullet:"#ff8a65", desc:"Speedster", emoji:"\uD83E\uDD8A" },
    owl:   { id:"owl",   name:"Snowy Owl",  cost:85,  dmg:30, range:150, rate:0.62, projSpeed:580, color:"#f0f0f0", accent:"#cde6ff", bullet:"#ffffff", desc:"Long-range", emoji:"\uD83E\uDD89" },
    bear:  { id:"bear",  name:"Polar Bear", cost:135, dmg:58, range:84,  rate:0.46, projSpeed:380, color:"#fdfdfd", accent:"#d0e8ff", bullet:"#ffd54f", desc:"Heavy paw", emoji:"\uD83D\uDC3B" },
    penguin:{id:"penguin",name:"PENGUIN",   cost:340, dmg:95, range:128, rate:0.90, projSpeed:620, color:"#1e2a3a", accent:"#fff8ea", bullet:"#ffd700", desc:"THE MENACE \u2744\uFE0F", emoji:"\uD83D\uDC27", limit:1, unlockWave:8, aoe:58 }
  };
  var TOWER_ORDER = ["seal","fox","owl","bear","penguin"];

  var ENEMY_DEFS = {
    crab:   { hp:28,  speed:70, reward:10, radius:12, color:"#ff6b35", stroke:"#7a2b00", eye:"#fff", name:"Crab" },
    wolf:   { hp:22,  speed:94, reward:11, radius:10, color:"#a4b0bc", stroke:"#2b3440", eye:"#ffd166", name:"Wolf" },
    hunter: { hp:52,  speed:74, reward:16, radius:13, color:"#6b7cff", stroke:"#232a6a", eye:"#fff", name:"Hunter" },
    yeti:   { hp:115, speed:52, reward:28, radius:16, color:"#eef4ff", stroke:"#6e7d9a", eye:"#ff4757", name:"Yeti" },
    boss:   { hp:420, speed:40, reward:85, radius:23, color:"#8a0f1f", stroke:"#1a0408", eye:"#ffd700", name:"BOSS" }
  };

  // waypoints - pixel center path
  var WAYPOINTS = [
    { x:-30, y: 96 },
    { x:132, y: 96 },
    { x:132, y:324 },
    { x:354, y:324 },
    { x:354, y:108 },
    { x:570, y:108 },
    { x:570, y:312 },
    { x:750, y:312 }
  ];

  // colony (igloo) at last waypoint
  var COLONY = { x: 682, y:312, r:34 };

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

  // build grid occupancy
  var blocked = [];
  function buildBlocked() {
    blocked = [];
    for (var r=0;r<ROWS;r++) for (var c=0;c<COLS;c++) {
      var cx = c*CELL_W + CELL_W/2;
      var cy = r*CELL_H + CELL_H/2;
      var isBlocked = pointToPathDist(cx, cy) < (PATH_W/2 + 18);
      // also block colony area
      if (Math.hypot(cx - COLONY.x, cy - COLONY.y) < 42) isBlocked = true;
      blocked.push(isBlocked);
    }
    // ensure at least some buildable cells exist: if blocked too many, relax? not needed with chosen waypoints
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
    var base = 7 + Math.floor(w * 1.85);
    if (w > 15) base = Math.min(42, base);
    var types = [];
    if (w < 3) types = ["crab"];
    else if (w < 5) types = ["crab","wolf"];
    else if (w < 8) types = ["crab","wolf","hunter"];
    else if (w < 12) types = ["crab","wolf","hunter","yeti"];
    else types = ["hunter","yeti","wolf","crab"];
    var list = [];
    for (var i=0;i<base;i++) {
      var t = types[Math.floor(Math.random()*types.length)];
      // inject tougher mixes as waves progress
      if (w >= 6 && Math.random() < 0.12) t = "yeti";
      if (w >= 4 && Math.random() < 0.18) t = "hunter";
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
      msgEl.textContent = "Only one Penguin can be on the ice at a time!";
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
    var hpScale = 1 + (waveNum-1)*0.34 + Math.max(0, waveNum-8)*0.08;
    if(type==="boss") hpScale = 1 + (waveNum-1)*0.28; // boss scales a bit less but still terrifying
    var hp = Math.round(base.hp * hpScale);
    var speed = base.speed * (1 + Math.min(0.38, (waveNum-1)*0.018));
    return { hp:hp, maxHp:hp, speed:speed, reward:base.reward + Math.floor((waveNum-1)*0.7), radius:base.radius, color:base.color, stroke:base.stroke, eye:base.eye, name:base.name };
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
        btn.innerHTML = '<span class="def-btn-icon">'+def.emoji+'</span><span class="def-btn-name">'+def.name+'</span><span class="def-btn-cost">'+def.cost+' \uD83D\uDC1F</span><span class="def-btn-desc">MAX 1</span>';
        btn.disabled = true;
      } else {
        btn.innerHTML = '<span class="def-btn-icon">'+def.emoji+'</span><span class="def-btn-name">'+def.name+'</span><span class="def-btn-cost">'+def.cost+' \uD83D\uDC1F</span><span class="def-btn-desc">'+def.desc+'</span>';
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
      // type icon: crab has pinchers, wolf has ears etc.
      if(en3.type==="crab"){
        ctx.fillStyle = en3.stroke;
        ctx.beginPath(); ctx.ellipse(-en3.radius*0.75, 2, 5,3, -0.4,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse( en3.radius*0.75, 2, 5,3, 0.4,0,Math.PI*2); ctx.fill();
      } else if(en3.type==="wolf"){
        ctx.fillStyle = en3.stroke;
        ctx.beginPath(); ctx.moveTo(-en3.radius*0.45, -en3.radius*0.85); ctx.lineTo(-en3.radius*0.18, -en3.radius*0.35); ctx.lineTo(-en3.radius*0.7, -en3.radius*0.4); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo( en3.radius*0.45, -en3.radius*0.85); ctx.lineTo( en3.radius*0.18, -en3.radius*0.35); ctx.lineTo( en3.radius*0.7, -en3.radius*0.4); ctx.closePath(); ctx.fill();
      } else if(en3.type==="hunter"){
        // little hat
        ctx.fillStyle = "#2a2a4a";
        ctx.fillRect(-en3.radius*0.6, -en3.radius*0.95, en3.radius*1.2, 4);
      } else if(en3.type==="boss"){
        // horns/spikes
        ctx.fillStyle = en3.stroke;
        ctx.beginPath(); ctx.moveTo(-en3.radius*0.9, -4); ctx.lineTo(-en3.radius*1.15, -10); ctx.lineTo(-en3.radius*0.7, -8); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo( en3.radius*0.9, -4); ctx.lineTo( en3.radius*1.15, -10); ctx.lineTo( en3.radius*0.7, -8); ctx.closePath(); ctx.fill();
        // crown?
        ctx.fillStyle="#ffd700";
        ctx.beginPath(); ctx.moveTo(-8,-en3.radius+2); ctx.lineTo(-4,-en3.radius-4); ctx.lineTo(0,-en3.radius+2); ctx.lineTo(4,-en3.radius-4); ctx.lineTo(8,-en3.radius+2); ctx.closePath(); ctx.fill();
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
    // common gun direction line faint?
    if(id==="owl"){
      // owl body
      c.fillStyle="#f5f5f5";
      c.strokeStyle="#2a3442"; c.lineWidth=1.3;
      c.beginPath(); c.ellipse(0,1,10,12,0,0,Math.PI*2); c.fill(); c.stroke();
      // belly
      c.fillStyle="#e8e0d0";
      c.beginPath(); c.ellipse(0,4,6,7,0,0,Math.PI*2); c.fill();
      // wings
      c.fillStyle="#e8e0d0";
      c.beginPath(); c.ellipse(-9,0,4,8,-0.35,0,Math.PI*2); c.fill(); c.stroke();
      c.beginPath(); c.ellipse(9,0,4,8,0.35,0,Math.PI*2); c.fill(); c.stroke();
      // eyes big yellow
      c.fillStyle="#ffd166";
      c.beginPath(); c.arc(-4.2,-4,3.2,0,Math.PI*2); c.fill();
      c.beginPath(); c.arc(4.2,-4,3.2,0,Math.PI*2); c.fill();
      c.fillStyle="#1e2a3a";
      c.beginPath(); c.arc(-4.2,-4,1.4,0,Math.PI*2); c.fill();
      c.beginPath(); c.arc(4.2,-4,1.4,0,Math.PI*2); c.fill();
      // beak
      c.fillStyle="#ff9f2e";
      c.beginPath(); c.moveTo(-2,-1); c.lineTo(2,-1); c.lineTo(0,2); c.closePath(); c.fill();
      // gun barrel direction
      c.save(); c.rotate(ang); c.fillStyle="#2a3442"; c.fillRect(6,-1.2,10,2.4); c.restore();
    } else if(id==="bear"){
      c.fillStyle="#ffffff";
      c.strokeStyle="#2a3442"; c.lineWidth=1.5;
      c.beginPath(); c.ellipse(0,0,11,10,0,0,Math.PI*2); c.fill(); c.stroke();
      // muzzle
      c.fillStyle="#e8e8e0";
      c.beginPath(); c.ellipse(0,3,5,4,0,0,Math.PI*2); c.fill();
      // nose
      c.fillStyle="#1e2a3a"; c.beginPath(); c.arc(0,1.2,1.6,0,Math.PI*2); c.fill();
      // eyes small
      c.fillStyle="#1e2a3a";
      c.beginPath(); c.arc(-4.5,-3,1.5,0,Math.PI*2); c.fill();
      c.beginPath(); c.arc(4.5,-3,1.5,0,Math.PI*2); c.fill();
      // ears
      c.fillStyle="#fff"; c.strokeStyle="#2a3442"; c.lineWidth=1.1;
      c.beginPath(); c.arc(-7,-7,3,0,Math.PI*2); c.fill(); c.stroke();
      c.beginPath(); c.arc(7,-7,3,0,Math.PI*2); c.fill(); c.stroke();
      c.fillStyle="#ffb3b3"; c.beginPath(); c.arc(-7,-7,1.4,0,Math.PI*2); c.fill();
      c.beginPath(); c.arc(7,-7,1.4,0,Math.PI*2); c.fill();
      // paw gun
      c.save(); c.rotate(ang); c.fillStyle="#d0e8ff"; c.strokeStyle="#2a3442"; c.lineWidth=1; c.beginPath(); c.ellipse(10,0,6,5,0,0,Math.PI*2); c.fill(); c.stroke(); c.restore();
    } else if(id==="seal"){
      c.fillStyle="#c8b8a0";
      c.strokeStyle="#4a3f35"; c.lineWidth=1.4;
      c.beginPath(); c.ellipse(0,2,10,8,0,0,Math.PI*2); c.fill(); c.stroke();
      // belly white
      c.fillStyle="#fff8ea"; c.beginPath(); c.ellipse(0,4,6,4.5,0,0,Math.PI*2); c.fill();
      // head
      c.fillStyle="#c8b8a0"; c.beginPath(); c.ellipse(0,-6,7,6,0,0,Math.PI*2); c.fill(); c.stroke();
      // eyes
      c.fillStyle="#1e2a3a"; c.beginPath(); c.arc(-3,-7,1.6,0,Math.PI*2); c.fill(); c.beginPath(); c.arc(3,-7,1.6,0,Math.PI*2); c.fill();
      c.fillStyle="#fff"; c.beginPath(); c.arc(-2.3,-8,0.7,0,Math.PI*2); c.fill(); c.beginPath(); c.arc(3.7,-8,0.7,0,Math.PI*2); c.fill();
      // whiskers
      c.strokeStyle="#4a3f35"; c.lineWidth=0.7; c.beginPath(); c.moveTo(-6,-5); c.lineTo(-9,-5); c.moveTo(-6,-3); c.lineTo(-9,-2.5); c.moveTo(6,-5); c.lineTo(9,-5); c.moveTo(6,-3); c.lineTo(9,-2.5); c.stroke();
      // nose
      c.fillStyle="#4a3f35"; c.beginPath(); c.arc(0,-4,1,0,Math.PI*2); c.fill();
      // flippers pointing toward angle
      c.save(); c.rotate(ang); c.fillStyle="#a89888"; c.beginPath(); c.ellipse(9,0,6,3,0,0,Math.PI*2); c.fill(); c.stroke(); c.restore();
    } else if(id==="fox"){
      c.fillStyle="#d98a42";
      c.strokeStyle="#5a2e0a"; c.lineWidth=1.4;
      c.beginPath(); c.ellipse(0,0,10,8,0,0,Math.PI*2); c.fill(); c.stroke();
      // chest white
      c.fillStyle="#fff"; c.beginPath(); c.ellipse(0,3,5,4,0,0,Math.PI*2); c.fill();
      // head
      c.fillStyle="#d98a42"; c.beginPath(); c.moveTo(-7,-4); c.lineTo(7,-4); c.lineTo(0,-13); c.closePath(); c.fill(); c.stroke();
      // ears
      c.fillStyle="#5a2e0a"; c.beginPath(); c.moveTo(-6,-8); c.lineTo(-4,-12); c.lineTo(-2,-8); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(6,-8); c.lineTo(4,-12); c.lineTo(2,-8); c.closePath(); c.fill();
      // eyes
      c.fillStyle="#1e2a3a"; c.beginPath(); c.arc(-3,-6,1.3,0,Math.PI*2); c.fill(); c.beginPath(); c.arc(3,-6,1.3,0,Math.PI*2); c.fill();
      // nose
      c.fillStyle="#1e2a3a"; c.beginPath(); c.arc(0,-3.5,1,0,Math.PI*2); c.fill();
      // tail
      c.fillStyle="#fff"; c.beginPath(); c.ellipse(8,5,4,2.5,0.7,0,Math.PI*2); c.fill();
      c.save(); c.rotate(ang); c.fillStyle="#5a2e0a"; c.fillRect(7,-1.5,9,3); c.restore();
    } else if(id==="penguin"){
      // use darker, menacing penguin
      c.fillStyle="#1e2a3a";
      c.strokeStyle="#0f1320"; c.lineWidth=1.4;
      c.beginPath(); c.ellipse(0,1,9,11,0,0,Math.PI*2); c.fill(); c.stroke();
      c.fillStyle="#fff8ea"; c.beginPath(); c.ellipse(0,3,5.5,7,0,0,Math.PI*2); c.fill();
      // head
      c.fillStyle="#1e2a3a"; c.beginPath(); c.ellipse(0,-8,8,7,0,0,Math.PI*2); c.fill(); c.stroke();
      c.fillStyle="#fff"; c.beginPath(); c.ellipse(0,-7,5.5,4.5,0,0,Math.PI*2); c.fill();
      // eyes red menace
      c.fillStyle="#ff4757"; c.beginPath(); c.arc(-3,-8,1.7,0,Math.PI*2); c.fill(); c.beginPath(); c.arc(3,-8,1.7,0,Math.PI*2); c.fill();
      c.fillStyle="#fff"; c.beginPath(); c.arc(-2.4,-9,0.6,0,Math.PI*2); c.fill(); c.beginPath(); c.arc(3.6,-9,0.6,0,Math.PI*2); c.fill();
      // beak
      c.fillStyle="#ff9f2e"; c.beginPath(); c.moveTo(-3,-4); c.lineTo(3,-4); c.lineTo(0,0); c.closePath(); c.fill();
      // angry brows
      c.strokeStyle="#ff4757"; c.lineWidth=1; c.beginPath(); c.moveTo(-5,-10); c.lineTo(-1,-9); c.moveTo(5,-10); c.lineTo(1,-9); c.stroke();
      // flippers with ice
      c.fillStyle="#1e2a3a"; c.beginPath(); c.ellipse(-8,0,3.2,7,-0.2,0,Math.PI*2); c.fill(); c.stroke();
      c.beginPath(); c.ellipse(8,0,3.2,7,0.2,0,Math.PI*2); c.fill(); c.stroke();
      // frost aura
      c.fillStyle="rgba(160,220,255,0.62)";
      c.beginPath(); c.arc(0,-2,14,0,Math.PI*2); c.stroke();
      // gun ice shard
      c.save(); c.rotate(ang); c.fillStyle="#a0e7ff"; c.strokeStyle="#0f3860"; c.lineWidth=1; c.beginPath(); c.moveTo(7,-2); c.lineTo(14,0); c.lineTo(7,2); c.closePath(); c.fill(); c.stroke(); c.restore();
    }
  }

  function resetGame(){
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

  // init
  buildBlocked();
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

