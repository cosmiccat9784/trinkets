const PENGUIN_KEY = "trinkets-penguin-v1";

const PENGUINS = [
  { id: "classic", name: "Classic", price: 0, body: "#1e2a3a", belly: "#fff8ea", beak: "#ff9f2e", foot: "#ff9f2e", eye: "#0f1320", hat: null, scarf: null, desc: "The original. Reliable." },
  { id: "berry", name: "Berry", price: 20, body: "#c94a6a", belly: "#ffe8ef", beak: "#ff9f2e", foot: "#ff6b6b", eye: "#2b0e1a", hat: "berry", scarf: "#fffaf0", desc: "Sweet and speedy" },
  { id: "emperor", name: "Emperor", price: 35, body: "#1f314f", belly: "#fff0a0", beak: "#f6c445", foot: "#f6c445", eye: "#0f1320", hat: "crown", scarf: "#f6c445", desc: "Golden belly, royal glide" },
  { id: "ninja", name: "Ninja", price: 50, body: "#1a1e24", belly: "#cbd6e6", beak: "#3a3a3a", foot: "#3a3a3a", eye: "#ff2d2d", hat: "headband", scarf: "#ff6b6b", desc: "Silent flaps" },
  { id: "astro", name: "Astro", price: 65, body: "#eaf2ff", belly: "#d6ecff", beak: "#ff9f2e", foot: "#4f8fcf", eye: "#0f1320", hat: "helmet", scarf: null, desc: "Low-gravity trained" },
  { id: "viking", name: "Viking", price: 80, body: "#6b4a2f", belly: "#fff8ea", beak: "#ff9f2e", foot: "#ff9f2e", eye: "#0f1320", hat: "viking", scarf: "#4f8fcf", desc: "Horns help with headbutts" },
  { id: "chef", name: "Chef", price: 95, body: "#fffaf0", belly: "#ffe8c8", beak: "#ff9f2e", foot: "#8a5a2b", eye: "#2b1a0e", hat: "chef", scarf: "#ff6b6b", desc: "Serves fish-coins fresh" },
  { id: "pirate", name: "Pirate", price: 115, body: "#1a2530", belly: "#e8d5a8", beak: "#ff9f2e", foot: "#6b4a2f", eye: "#0f1320", hat: "pirate", scarf: "#cc1a00", desc: "Arrr, parkour!" },
  { id: "snowflake", name: "Frost", price: 135, body: "#d6f0ff", belly: "#ffffff", beak: "#4f8fcf", foot: "#4f8fcf", eye: "#1e4a7a", hat: "snowflake", scarf: "#a8d6ff", desc: "Never melts, always slides" },
  { id: "disco", name: "Disco", price: 155, body: "#6a4cff", belly: "#ffe9ff", beak: "#ffd166", foot: "#ff6b9d", eye: "#1a0a2e", hat: "disco", scarf: "#ffd166", desc: "Grooves between jumps" },
  { id: "ghost", name: "Ghost", price: 180, body: "#e8eef6", belly: "#ffffff", beak: "#cbd6e6", foot: "#cbd6e6", eye: "#4a5a7a", hat: "ghost", scarf: null, desc: "Boo! Slightly translucent" },
  { id: "knight", name: "Knight", price: 210, body: "#8a9ab0", belly: "#d6e2ef", beak: "#ff9f2e", foot: "#2a3442", eye: "#0f1a2a", hat: "knight", scarf: "#cc1a00", desc: "Armor adds +1 bravery" },
  { id: "robot", name: "Robo", price: 240, body: "#c0c8d4", belly: "#e8f0ff", beak: "#ff9f2e", foot: "#4a5a6b", eye: "#00ffaa", hat: "robot", scarf: "#ff6b6b", desc: "Beep boop waddle" },
  { id: "waddles", name: "Waddles", price: 500, body: "#1e2a3a", belly: "#fff8ea", beak: "#ff9f2e", foot: "#ff9f2e", eye: "#1a0a12", hat: "waddles", scarf: "#ffd166", desc: "PERFECTLY CIRCULAR. SOOOOO CUTE. The ultimate.", circular: true }
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
      var currentLevel = typeof raw.currentLevel === "number" ? raw.currentLevel : (bestLevel>0 ? Math.min(bestLevel, TOTAL_PENGUIN_LEVELS-1) : 0);
      if (currentLevel <0) currentLevel=0;
      if (currentLevel >= TOTAL_PENGUIN_LEVELS) currentLevel = TOTAL_PENGUIN_LEVELS-1;
      var secretUnlocked = raw.secretUnlocked === true;
      return { coins: coins, unlocked: unlocked, selected: selected, bestLevel: bestLevel, bestCoins: bestCoins, currentLevel: currentLevel, secretUnlocked: secretUnlocked };
    }
  } catch(e){}
  return { coins: 0, unlocked: ["classic"], selected: "classic", bestLevel: 0, bestCoins: 0, currentLevel: 0, secretUnlocked: false };
}
function savePenguinData(d) {
  try { localStorage.setItem(PENGUIN_KEY, JSON.stringify(d)); } catch(e){}
}

var TOTAL_PENGUIN_LEVELS = 250;

// ——— seeded RNG for deterministic levels ———
function penguinHash(s){
  var h = 2166136261;
  for(var i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function penguinRNG(seed){
  var a = seed >>> 0;
  return function(){
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ——— level titles & intros ———
var PENGUIN_BIOMES = [
  "Tutorial Meadows", "Icy Heights", "Bouncy Bay", "Crumble Canyon", "Sky Peak",
  "Ember Embankment", "Frosted Flats", "Pop Plateau", "Shatter Shelf", "Drift Docks",
  "Magma Marsh", "Glacier Glide", "Rebound Ridge", "Fragile Frontier", "Hover Heights",
  "Scalding Steps", "Permafrost Pass", "Spring Spire", "Dust Dunes", "Wind Walk",
  "Ashen Ascent", "Chill Chasm", "Bounce Bastion", "Crackling Crest", "Soaring Strait",
  "Inferno Incline", "Tundra Terrace", "Pogo Pinnacle", "Crumble Causeway", "Glide Gallery",
  "Ember Estuary", "Hoarfrost Hollows", "Trampoline Terrace", "Quake Quay", "Aerial Arcade",
  "Blazing Bluff", "Snowdrift Summit", "Boing Bridge", "Fracture Field", "Zephyr Zone"
];
var PENGUIN_TITLES = [];
for(var ti=0; ti<TOTAL_PENGUIN_LEVELS; ti++){
  if(ti < 5) { PENGUIN_TITLES.push(PENGUIN_BIOMES[ti]); continue; }
  if(ti === TOTAL_PENGUIN_LEVELS-1) { PENGUIN_TITLES.push("Champion Road"); continue; }
  var base = PENGUIN_BIOMES[5 + (ti % (PENGUIN_BIOMES.length-5))];
  var tier = Math.floor(ti / 25);
  var suffix = tier===0 ? "" : tier===1 ? " II" : tier===2 ? " III" : tier===3 ? " IV" : tier===4 ? " V" : " ●".repeat(Math.min(tier-4,3));
  // add variation for loop
  var variant = (ti % 17 === 0) ? " — Deep Heat" : (ti % 13 === 0) ? " — Thin Air" : (ti % 11 === 0) ? " — Whiteout" : "";
  PENGUIN_TITLES.push(base + suffix + variant);
}
function penguinIntro(n){
  // n zero-based
  if(n===0) return "THE FLOOR IS LAVA! Stay on the platforms. Arrow keys / A D to move, Space to jump. Grab coins, reach the flag!";
  if(n===1) return "New: ICE! Blue platforms are slippery — you'll slide after stopping. Feather your inputs.";
  if(n===2) return "New: BOING PAD! Pink pads bounce you sky-high. Land in the center for max pop!";
  if(n===3) return "New: CRUMBLE! Brown blocks crack and fall 0.5s after you land — keep moving! Don't look back.";
  if(n===4) return "New: MOVING! Yellow platforms shuttle back and forth — ride them, time your leap.";
  if(n===5) return "Mixed bag! Ice + BOING together. Try sliding onto a bounce for extra distance.";
  if(n===6) return "Crumble + moving combo. The ground doesn't want you here.";
  if(n===9) return "Tight gaps: gaps stretch. Hold run, use full jump arc.";
  if(n===14) return "High climb: vertical stacks. BOINGs are your ladders now.";
  if(n===19) return "Eyes up — platforms hide above. Listen for the coin shimmer.";
  if(n===24) return "All mechanics at once. Read the colors: blue=ice, pink=boing, brown=crumble, yellow=move.";
  if(n===29) return "Hot and cold: lava glows brighter. The heat makes you wobble (it’s style).";
  if(n===39) return "Rhythm section: moving platforms sync to 1.2s. Find the beat.";
  if(n===49) return "Halfway hump! Levels get longer and gaps get meaner. You’ve got this.";
  if(n===74) return "Ice storm: almost everything is blue. Tap to micro-adjust.";
  if(n===99) return "Triple threat: triple crumble chains. Don't hesitate.";
  if(n===124) return "Bounce maze: chain 3 BOINGs to reach the flag island.";
  if(n===149) return "Sky labyrinth: 30+ platforms. Map it with your eyes first.";
  if(n===174) return "Crumble gauntlet: one safe step, one fall. Memorize.";
  if(n===199) return "Final stretch: champion’s antechamber. Only the cleanest runs survive.";
  if(n===248) return "The penultimate test. One more coin, one more perfect landing.";
  if(n===249) return "CHAMPION ROAD — The ultimate. Every mechanic, no forgiveness. The floor is still lava. Become legend, Waddles awaits.";
  return null;
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

// ——— champion road: hand-crafted finale ———
var CHAMPION_ROAD = {
  width: 4600, height: 480,
  start: { x: 80, y: 360 },
  platforms: [
    { x: 80-48, y: 395, w: 112, h:16, type:"normal" },
    { x: 260, y: 340, w: 90, h:16, type:"ice" },
    { x: 430, y: 285, w: 84, h:16, type:"bouncy" },
    { x: 600, y: 330, w: 72, h:16, type:"crumble" },
    { x: 760, y: 260, w: 96, h:16, type:"moving", move:{min:740,max:950,speed:68} },
    { x: 980, y: 310, w: 80, h:16, type:"ice" },
    { x: 1140, y: 360, w: 68, h:16, type:"crumble" },
    { x: 1300, y: 280, w: 84, h:16, type:"bouncy" },
    { x: 1480, y: 240, w: 72, h:16, type:"moving", move:{min:1460,max:1680,speed:78} },
    { x: 1680, y: 330, w: 76, h:16, type:"ice" },
    { x: 1860, y: 285, w: 64, h:16, type:"crumble" },
    { x: 2020, y: 350, w: 88, h:16, type:"normal" },
    { x: 2200, y: 260, w: 84, h:16, type:"bouncy" },
    { x: 2380, y: 320, w: 72, h:16, type:"moving", move:{min:2360,max:2550,speed:85} },
    { x: 2580, y: 280, w: 76, h:16, type:"ice" },
    { x: 2750, y: 360, w: 60, h:16, type:"crumble" },
    { x: 2910, y: 305, w: 80, h:16, type:"bouncy" },
    { x: 3090, y: 250, w: 88, h:16, type:"moving", move:{min:3070,max:3270,speed:72} },
    { x: 3290, y: 330, w: 70, h:16, type:"ice" },
    { x: 3450, y: 285, w: 66, h:16, type:"crumble" },
    { x: 3620, y: 340, w: 84, h:16, type:"normal" },
    { x: 3800, y: 260, w: 80, h:16, type:"bouncy" },
    { x: 3980, y: 310, w: 76, h:16, type:"moving", move:{min:3960,max:4140,speed:90} },
    { x: 4180, y: 285, w: 72, h:16, type:"ice" },
    { x: 4360, y: 340, w: 64, h:16, type:"crumble" },
    { x: 4480, y: 395, w: 136, h:16, type:"normal" }
  ],
  coins: [
    {x:305,y:300},{x:472,y:245},{x:636,y:290},{x:808,y:220},{x:1020,y:270},{x:1174,y:320},{x:1342,y:240},{x:1580,y:200},{x:1718,y:290},{x:1892,y:245},{x:2064,y:310},{x:2242,y:220},{x:2472,y:280},{x:2618,y:240},{x:2780,y:320},{x:2950,y:265},{x:3180,y:210},{x:3325,y:290},{x:3483,y:245},{x:3662,y:300},{x:3840,y:220},{x:4068,y:270},{x:4216,y:245},{x:4392,y:300}
  ],
  flag: { x: 4520, y: 395 }
};

function genProcLevel(index, rand) {
  var procIdx = index - PENGUIN_LEVELS.length;
  // progressive width: 1700 + n*7.5 + wiggle, caps around 4200 before champion
  var width = 1680 + Math.floor(index * 8.5 + rand()*110);
  if (width > 4300) width = 4300 + Math.floor(rand()*40);
  var start = { x: 80, y: 360 };
  var count = 7 + Math.floor(index * 0.13 + rand()*2);
  if (count > 38) count = 38 + Math.floor(rand()*3);
  if (count < 7) count = 7;
  var platforms = [];
  var lastX = 140;
  var lastY = 340 + (rand()-0.5)*40;
  for (var i=0;i<count;i++) {
    var w = 78 + rand()*68;
    if (index > 120 && w > 90) w -= 12; // later levels tighter
    if (index > 180 && w > 82) w -= 10;
    var gapBase = 108 + rand()*74;
    var gapBonus = Math.min(58, index*0.22);
    var gap = gapBase + gapBonus;
    // widen gap if vertical change is large (need run)
    var y = 235 + rand()*150;
    if (i>0) {
      if (Math.abs(y - lastY) > 88) y = lastY + (rand()<0.5? -58: 58);
      y = Math.max(205, Math.min(395, y));
      if (Math.abs(y - lastY) > 70) gap -= 18;
    }
    var x = lastX + gap;
    if (x + w > width - 140) { x = width - 140 - w; }
    if (x < lastX + 40) x = lastX + 40;
    // type distribution ramps with index
    var r = rand();
    var type = "normal";
    var iceChance = Math.min(0.26, 0.10 + index*0.0009);
    var bouncyChance = Math.min(0.22, 0.07 + index*0.0007);
    var crumbleChance = Math.min(0.24, 0.06 + index*0.00085);
    var movingChance = Math.min(0.20, 0.04 + index*0.00065);
    // early game forced distributions to keep intros clean
    if (index===5) type = rand()<0.5?"ice":"bouncy";
    else if (index < 10) {
      if (r < iceChance) type="ice";
      else if (r < iceChance + bouncyChance*0.7) type="bouncy";
      else type="normal";
    } else {
      if (r < iceChance) type="ice";
      else if (r < iceChance + bouncyChance) type="bouncy";
      else if (r < iceChance + bouncyChance + crumbleChance) type="crumble";
      else if (r < iceChance + bouncyChance + crumbleChance + movingChance) type="moving";
      else type="normal";
    }
    // ensure not too many crumbles in a row
    if (i>1 && platforms.length>=2 && platforms[platforms.length-1].type==="crumble" && platforms[platforms.length-2].type==="crumble" && type==="crumble" && rand()<0.7) type="normal";
    var p = { x: x, y: y, w: w, h: 16, type: type };
    if (type==="moving") {
      var range = 56 + rand()*86;
      var extraSpeed = Math.min(38, index*0.18);
      p.move = { min: Math.max(0, x - range/2), max: Math.min(width- w, x + range/2), speed: 42 + rand()*36 + extraSpeed };
    }
    platforms.push(p);
    lastX = x + w;
    lastY = y;
    if (lastX > width - 180) break;
  }
  // coins: one per platform + extra for harder levels
  var coins = [];
  for (var j=0;j<platforms.length;j++) {
    var pl = platforms[j];
    if (rand()<0.82) {
      coins.push({ x: pl.x + pl.w/2, y: pl.y - 26 });
      if (index>30 && rand()<0.18) coins.push({ x: pl.x + pl.w*0.22, y: pl.y - 46 });
      if (index>90 && rand()<0.08) coins.push({ x: pl.x + pl.w*0.78, y: pl.y - 46 });
    }
  }
  while (coins.length > 14) coins.splice(Math.floor(rand()*coins.length),1);
  var minCoins = index < 20 ? 6 : index < 80 ? 7 : index < 160 ? 8 : 10;
  while (coins.length < minCoins) coins.push({ x: 260 + rand()*(width-480), y: 220 + rand()*80 });
  var flag = { x: width - 86, y: 440 };
  return { width: width, height: 480, start: start, platforms: platforms, coins: coins, flag: flag };
}

function getPenguinLevel(n) {
  if (n < 0) n = 0;
  if (n >= TOTAL_PENGUIN_LEVELS) n = TOTAL_PENGUIN_LEVELS - 1;
  if (n < PENGUIN_LEVELS.length) {
    var src = PENGUIN_LEVELS[n];
    return JSON.parse(JSON.stringify(src));
  }
  if (n === TOTAL_PENGUIN_LEVELS - 1) {
    return JSON.parse(JSON.stringify(CHAMPION_ROAD));
  }
  var rng = penguinRNG(penguinHash("penguin-level-" + n));
  return genProcLevel(n, rng);
}

var SECRET_COIN_CODE = "12113";
var SECRET_LEVEL_INDEX = -99;

function getSecretCoinLevel() {
  var width = 2900;
  var platforms = [
    { x: 32, y: 395, w: 130, h: 16, type: "normal" },
    { x: 250, y: 350, w: 170, h: 16, type: "normal" },
    { x: 500, y: 310, w: 170, h: 16, type: "bouncy" },
    { x: 750, y: 340, w: 170, h: 16, type: "normal" },
    { x: 1000, y: 295, w: 180, h: 16, type: "ice" },
    { x: 1260, y: 335, w: 170, h: 16, type: "normal" },
    { x: 1510, y: 285, w: 180, h: 16, type: "bouncy" },
    { x: 1770, y: 330, w: 170, h: 16, type: "normal" },
    { x: 2020, y: 290, w: 180, h: 16, type: "ice" },
    { x: 2280, y: 340, w: 170, h: 16, type: "normal" },
    { x: 2530, y: 395, w: 150, h: 16, type: "normal" }
  ];
  var coins = [];
  // coin carpets above every platform
  for (var pi = 0; pi < platforms.length; pi++) {
    var pl = platforms[pi];
    var count = 5;
    for (var k = 0; k < count; k++) {
      coins.push({ x: pl.x + 18 + k * ((pl.w - 36) / (count - 1)), y: pl.y - 30 });
    }
    // second floating row
    for (var k2 = 0; k2 < 3; k2++) {
      coins.push({ x: pl.x + 30 + k2 * ((pl.w - 60) / 2), y: pl.y - 62 });
    }
  }
  // bonus coin rainbows in the gaps
  for (var g = 0; g < 10; g++) {
    var gx = 200 + g * 240;
    coins.push({ x: gx, y: 220 });
    coins.push({ x: gx + 18, y: 200 });
    coins.push({ x: gx + 36, y: 220 });
  }
  return { width: width, height: 480, start: { x: 90, y: 360 }, platforms: platforms, coins: coins, flag: { x: 2590, y: 395 }, secret: true };
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
        '<div class="penguin-level-picker-overlay" id="penguinLevelPicker" hidden>' +
          '<div class="penguin-level-picker-panel">' +
            '<div class="penguin-level-picker-header"><strong>Jump to Level</strong><button class="game-action" id="penguinLevelClose" type="button">Close</button></div>' +
            '<div class="penguin-level-picker-grid" id="penguinLevelGrid"></div>' +
            '<p class="penguin-shop-hint">Progress unlocks with each flag. Champion Road at 250!</p>' +
          '</div>' +
        '</div>' +
        '<div class="penguin-cheat-overlay" id="penguinCheat" hidden>' +
          '<div class="penguin-cheat-panel">' +
            '<div class="penguin-cheat-header"><strong>??? SECRET ???</strong><button class="game-action" id="penguinCheatClose" type="button">X</button></div>' +
            '<p class="penguin-cheat-sub">Enter the 5-digit code</p>' +
            '<div class="penguin-pin-display" id="penguinPinDisplay">_ _ _ _ _</div>' +
            '<div class="penguin-pin-grid" id="penguinPinGrid"></div>' +
            '<p class="penguin-cheat-msg" id="penguinCheatMsg"></p>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="game-actions">' +
        '<button class="game-action" id="penguinLevelsBtn" type="button">Levels</button>' +
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
  var LAVA_TOP = 448;

  var selectedPenguin = penguinById(data.selected);

  var raf = 0;
  var last = performance.now();

  var isSecretLevel = false;
  var secretReturnIndex = 0;

  function buildLevel(n) {
    if (n === SECRET_LEVEL_INDEX) {
      level = getSecretCoinLevel();
      isSecretLevel = true;
    } else {
      level = getPenguinLevel(n);
      isSecretLevel = false;
    }
    levelWidth = level.width;
    // filter out the old floor (y==440 w==width) — floor is now lava!
    var rawPlats = level.platforms.filter(function(p){ return !(p.y===440 && p.w===level.width); });
    platforms = rawPlats.map(function(p){
      var np = { x: p.x, y: p.y, w: p.w, h: p.h, type: p.type, origX: p.x, alive:true, crumbleT:0 };
      if (p.move) { np.move = { min:p.move.min, max:p.move.max, speed:p.move.speed, dir: 1 }; np.x = (p.move.min + p.move.max)/2; }
      return np;
    });
    // ensure spawn island
    var hasSpawn = platforms.some(function(p){ return p.x < level.start.x + 40 && p.x + p.w > level.start.x - 40 && Math.abs(p.y - 390) < 30; });
    if (!hasSpawn) {
      platforms.push({ x: level.start.x - 48, y: 395, w: 112, h: 16, type: "normal", origX: level.start.x - 48, alive:true, crumbleT:0 });
    }
    // ensure flag island
    var hasFlagPlat = platforms.some(function(p){ return Math.abs(p.x + p.w/2 - level.flag.x) < 90 && Math.abs(p.y - 395) < 60; });
    if (!hasFlagPlat) {
      platforms.push({ x: level.flag.x - 68, y: 395, w: 136, h: 16, type: "normal", origX: level.flag.x - 68, alive:true, crumbleT:0 });
    }
    coins = level.coins.map(function(c){ return { x:c.x, y:c.y, r:11, taken:false, phase: Math.random()*Math.PI*2 }; });
    var flagBaseY = hasFlagPlat ? level.flag.y : 395;
    flag = { x: level.flag.x, y: flagBaseY, w: 26, h: 70 };
    startPos = { x: level.start.x, y: level.start.y };
    player.x = startPos.x;
    player.y = startPos.y - 6;
    player.vx = 0; player.vy = 0; player.onGround=false; player.coyote=0; player.buffer=0; player.squish=0;
    won=false; dead=false; deadTimer=0; levelCoinsCollected=0; camX=0;
    particles=[]; popups=[]; shake=0;
    levelIndex = n;
    if (isSecretLevel) {
      // don't overwrite auto-save resume with secret — keep return point
      updateUI();
      msg.textContent = "★ SECRET COIN VAULT ★ — grab it all! Reach the flag to return.";
      document.querySelector("#penguinNext").hidden = true;
      return;
    }
    // auto-save current level so you resume where you left off
    data.currentLevel = n;
    try { savePenguinData(data); } catch(e){}
    updateUI();
    var intro = penguinIntro(n);
    if (intro) msg.textContent = levelLabel(n) + " — " + intro;
    else msg.textContent = levelLabel(n) + " — THE FLOOR IS LAVA! Stay off it.";
    document.querySelector("#penguinNext").hidden = true;
    // pulse the message a bit for new mechanic intros
    if (intro && n < 25) {
      msg.animate && msg.animate([{transform:"scale(1)"},{transform:"scale(1.03)"},{transform:"scale(1)"}],{duration:520,easing:"ease-out"});
    }
  }

  function buildSecretLevel() {
    secretReturnIndex = (typeof levelIndex === "number" && levelIndex >= 0) ? levelIndex : (data.currentLevel || 0);
    buildLevel(SECRET_LEVEL_INDEX);
  }

  function levelLabel(n) {
    if (n === SECRET_LEVEL_INDEX) return "★ SECRET COIN VAULT ★";
    var title = PENGUIN_TITLES[n] || ("Level " + (n+1));
    return "Level " + (n+1) + "/" + TOTAL_PENGUIN_LEVELS + " · " + title;
  }

  function updateUI() {
    levelEl.textContent = isSecretLevel ? "★ SECRET ★" : ("Level " + (levelIndex+1) + "/" + TOTAL_PENGUIN_LEVELS);
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
    // also use global highscore for stats band (skip secret level)
    if (!isSecretLevel) {
      try { recordScore("penguin", Math.max(data.bestLevel, levelIndex + (won?1:0)), "high"); } catch(e){}
    }
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
    if (typeof levelPicker !== "undefined" && levelPicker && !levelPicker.hidden) return;
    if (typeof cheatOverlay !== "undefined" && cheatOverlay && !cheatOverlay.hidden) return;
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
    if ((shopOverlay && !shopOverlay.hidden) || (typeof levelPicker !== "undefined" && levelPicker && !levelPicker.hidden) || (typeof cheatOverlay !== "undefined" && cheatOverlay && !cheatOverlay.hidden)) {
      // pause game while overlays open
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
        if (isSecretLevel) {
          try { savePenguinData(data); } catch(e){}
          bestEl.textContent = "Best: " + data.bestLevel;
          msg.textContent = "★ VAULT LOOTED! ★ " + levelCoinsCollected + "/" + coins.length + " coins pocketed! Returning you back…";
          document.querySelector("#penguinNext").textContent = "Back to level " + (secretReturnIndex+1) + " ↩";
          document.querySelector("#penguinNext").hidden = false;
          // auto-return after a beat so it feels like a bonus stage
          setTimeout(function(){
            try { if (won && isSecretLevel && document.querySelector("#penguinCanvas")) buildLevel(secretReturnIndex); } catch(e){}
          }, 2600);
        } else {
          data.bestLevel = Math.max(data.bestLevel, levelIndex+1);
          savePenguinData(data);
          try { recordScore("penguin", data.bestLevel, "high"); } catch(e){}
          bestEl.textContent = "Best: " + data.bestLevel;
          if (levelIndex === TOTAL_PENGUIN_LEVELS - 1) {
            msg.textContent = "★★ CHAMPION ROAD CONQUERED! ★★ " + levelCoinsCollected + "/" + coins.length + " coins. You are the Waddles champion!";
            document.querySelector("#penguinNext").textContent = "Play again from start ↺";
          } else {
            msg.textContent = "Flag reached! " + levelCoinsCollected + "/" + coins.length + " coins. " + (bonus?"Perfect bonus! ":"") + (penguinIntro(levelIndex+1) ? "Next: " + (PENGUIN_TITLES[levelIndex+1]||("Level "+(levelIndex+2))) : "");
            document.querySelector("#penguinNext").textContent = "Next level →";
          }
          document.querySelector("#penguinNext").hidden = false;
        }
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

    // lava death — THE FLOOR IS LAVA
    if (!dead && !won && player.y + PH/2 > LAVA_TOP) {
      dead = true;
      deadTimer = 0.7;
      shake = 14;
      msg.textContent = "SIZZLE! The floor is lava! Respawning…";
      for (var di=0; di<16; di++) {
        var angL = Math.random()*Math.PI - Math.PI;
        particles.push({ x: player.x + (Math.random()-0.5)*14, y: LAVA_TOP - 2, vx: Math.cos(angL)* (40+Math.random()*120), vy: -90 - Math.random()*160, life:0.55+Math.random()*0.25, max:0.7, r:3+Math.random()*3, color: ["#ff6b35","#ff4500","#ff8c00","#ffd166"][Math.floor(Math.random()*4)], type:"star"});
      }
      for (var di2=0; di2<10; di2++) particles.push({ x: player.x, y: LAVA_TOP-2, vx:(Math.random()-0.5)*90, vy:-30 -Math.random()*50, life:0.45, max:0.45, r:3, color:"rgba(40,14,2,0.9)", type:"puff"});
    } else if (player.y - PH/2 > H + 180) {
      // fallback void
      dead = true;
      deadTimer = 0.55;
      shake = 10;
      msg.textContent = "Whoa — you fell into the abyss! Respawning…";
      for (var di3=0; di3<10; di3++) particles.push({ x: player.x, y: H-30, vx:(Math.random()-0.5)*120, vy:-80 -Math.random()*120, life:0.6, max:0.6, r:3, color:"#4f8fcf", type:"puff"});
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

    // LAVA FLOOR — THE FLOOR IS LAVA!
    (function drawLava(){
      var lavaY = LAVA_TOP;
      var t = performance.now() * 0.004;
      // glow above lava
      var gradGlow = ctx.createLinearGradient(0, lavaY-28, 0, lavaY+6);
      gradGlow.addColorStop(0, "rgba(255,107,53,0)");
      gradGlow.addColorStop(0.6, "rgba(255,120,40,0.22)");
      gradGlow.addColorStop(1, "rgba(255,80,20,0.45)");
      ctx.fillStyle = gradGlow;
      ctx.fillRect(-20, lavaY-28, W+40, 34);
      // main lava
      var grad = ctx.createLinearGradient(0, lavaY, 0, H);
      grad.addColorStop(0, "#ff8c2a");
      grad.addColorStop(0.22, "#ff5a1f");
      grad.addColorStop(0.55, "#cc1a00");
      grad.addColorStop(1, "#5a0a00");
      ctx.fillStyle = grad;
      ctx.fillRect(-20, lavaY, W+40, H - lavaY + 20);
      // wobbly surface line
      ctx.strokeStyle = "#ffd166";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-20, lavaY);
      for (var lx=-20; lx<=W+20; lx+=14) {
        var wy = lavaY + Math.sin(lx*0.045 + t*2.2)*5 + Math.cos(lx*0.02 - t*1.4)*3;
        ctx.lineTo(lx, wy);
      }
      ctx.stroke();
      // inner bright core
      ctx.strokeStyle = "rgba(255,240,180,0.9)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-20, lavaY+2);
      for (var lx2=-20; lx2<=W+20; lx2+=14) {
        var wy2 = lavaY+2 + Math.sin(lx2*0.055 + t*2.6)*3;
        ctx.lineTo(lx2, wy2);
      }
      ctx.stroke();
      // bubbles
      ctx.fillStyle = "rgba(255,230,160,0.95)";
      for (var bi=0; bi<5; bi++) {
        var bx = (bi*150 + (t*40)%150 + (bi*73)%80) % (W+40) -20;
        var by = lavaY + 12 + Math.sin(bi*1.7 + t*1.8 + bi)*6;
        var br = 2 + (bi%2? 3: 4) + Math.sin(t*3 + bi)*0.7;
        // pop
        var popPhase = (t*0.9 + bi*1.3) % 4;
        if (popPhase < 0.3) continue; // occasionally pop
        ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI*2); ctx.fill();
        // highlight
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.beginPath(); ctx.arc(bx- br*0.3, by- br*0.3, br*0.35, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "rgba(255,230,160,0.95)";
      }
      ctx.globalAlpha = 1;
      // crust cracks
      ctx.strokeStyle = "rgba(60,10,0,0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var ck=0; ck<3; ck++) {
        var csx = (ck*260 + t*18) % (W+60) -30;
        ctx.moveTo(csx, lavaY+16);
        ctx.lineTo(csx+18, lavaY+22);
        ctx.moveTo(csx+10, lavaY+28);
        ctx.lineTo(csx+24, lavaY+32);
      }
      ctx.stroke();
    })();

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

    // vignette when dead — lava!
    if (dead) {
      ctx.fillStyle = "rgba(255,72,20,"+(0.26 + (0.55 - deadTimer)*0.22)+")";
      ctx.fillRect(0,0,W,H);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 28px monospace";
      ctx.textAlign="center";
      ctx.textBaseline="middle";
      ctx.fillText("SIZZLE! Respawning…", W/2, H/2);
    }
    if (won) {
      ctx.fillStyle = levelIndex === TOTAL_PENGUIN_LEVELS - 1 ? "rgba(255,241,150,0.92)" : "rgba(255,255,255,0.82)";
      ctx.fillRect(0,0,W,H);
      ctx.fillStyle = "#1e2a3a";
      ctx.font = "bold 32px sans-serif";
      ctx.textAlign="center";
      if (levelIndex === TOTAL_PENGUIN_LEVELS - 1) {
        ctx.fillText("★ CHAMPION ROAD ★", W/2, H/2 - 14);
        ctx.font = "bold 15px monospace";
        ctx.fillStyle = "#6a4a0a";
        ctx.fillText("ALL 250 LEVELS CONQUERED! WADDLES IS YOURS!", W/2, H/2 + 12);
        ctx.font = "bold 13px monospace";
        ctx.fillStyle = "#394354";
        ctx.fillText(levelCoinsCollected + "/" + coins.length + " coins · Total: " + data.coins, W/2, H/2 + 32);
      } else {
        ctx.fillText("Level complete!", W/2, H/2 - 10);
        ctx.font = "bold 16px monospace";
        ctx.fillStyle = "#394354";
        ctx.fillText(levelCoinsCollected + "/" + coins.length + " coins · Total: " + data.coins, W/2, H/2 + 22);
      }
    }

    ctx.restore();
  }

  function drawPenguinModel(c, skin, stateObj) {
    var t = performance.now() * 0.006;
    var isMoving = Math.abs(stateObj.vx) > 20 && stateObj.onGround;
    var waddle = isMoving ? Math.sin(t*1.35)*0.14 : Math.sin(t*0.45)*0.04;
    var flipperSwing = isMoving ? Math.sin(t*2.2)*0.6 : Math.sin(t*0.9)*0.15;

    // ——— WADDLES: perfectly circular, devastatingly cute ———
    if (skin.circular) {
      // feet (tiny, peeking)
      c.fillStyle = skin.foot;
      c.strokeStyle = "rgba(0,0,0,0.18)"; c.lineWidth = 1.1;
      c.beginPath(); c.ellipse(-5.5, 12.5, 5.5, 2.8, 0,0,Math.PI*2); c.fill(); c.stroke();
      c.beginPath(); c.ellipse(5.5, 12.5, 5.5, 2.8, 0,0,Math.PI*2); c.fill(); c.stroke();
      // body = perfect circle
      c.fillStyle = skin.body;
      c.strokeStyle = "#1a2632"; c.lineWidth = 2;
      c.beginPath(); c.arc(0, 0, 14.5, 0, Math.PI*2); c.fill(); c.stroke();
      // belly big circle
      c.fillStyle = skin.belly;
      c.strokeStyle = "rgba(0,0,0,0.08)"; c.lineWidth = 1;
      c.beginPath(); c.arc(0, 3.2, 9.5, 0, Math.PI*2); c.fill(); c.stroke();
      // subtle belly shine
      c.fillStyle = "rgba(255,255,255,0.95)";
      c.beginPath(); c.ellipse(-2.5, -0.5, 2.2, 1.2, -0.2, 0, Math.PI*2); c.fill();
      // flippers tiny & round
      c.fillStyle = skin.body; c.strokeStyle = "#1a2632"; c.lineWidth = 1.2;
      c.save(); c.translate(-12.2, 0); c.rotate(flipperSwing*0.65); c.beginPath(); c.ellipse(0,0,3.4,6.2,-0.15,0,Math.PI*2); c.fill(); c.stroke(); c.restore();
      c.save(); c.translate(12.2, 0); c.rotate(-flipperSwing*0.65); c.beginPath(); c.ellipse(0,0,3.4,6.2,0.15,0,Math.PI*2); c.fill(); c.stroke(); c.restore();
      // face — slightly squished circle
      c.fillStyle = "#fff";
      c.beginPath(); c.ellipse(0, -4.2, 9.2, 8.2, 0, 0, Math.PI*2); c.fill();
      // eyes — HUGE, sparkly, a little low for baby proportions
      // eye whites
      c.fillStyle = "#fff";
      c.beginPath(); c.arc(-4.8, -5.2, 3.4, 0, Math.PI*2); c.fill();
      c.beginPath(); c.arc(4.8, -5.2, 3.4, 0, Math.PI*2); c.fill();
      c.strokeStyle = "rgba(0,0,0,0.12)"; c.lineWidth = 0.8; c.stroke();
      c.stroke();
      // iris — big, glossy
      c.fillStyle = skin.eye; // very dark for waddles but still
      // allow waddles eye color override to dark brown, add iris
      c.fillStyle = "#1a0a12";
      c.beginPath(); c.arc(-4.8, -4.6, 2.2, 0, Math.PI*2); c.fill();
      c.beginPath(); c.arc(4.8, -4.6, 2.2, 0, Math.PI*2); c.fill();
      // pupil shine — big
      c.fillStyle = "#fff";
      c.beginPath(); c.arc(-3.9, -6.2, 1.1, 0, Math.PI*2); c.fill();
      c.beginPath(); c.arc(5.7, -6.2, 1.1, 0, Math.PI*2); c.fill();
      c.beginPath(); c.arc(-4.8, -3.7, 0.5, 0, Math.PI*2); c.fill();
      c.beginPath(); c.arc(4.8, -3.7, 0.5, 0, Math.PI*2); c.fill();
      // rosy cheeks — the cuteness engine
      c.fillStyle = "rgba(255,120,130,0.58)";
      c.beginPath(); c.ellipse(-7.8, -2.2, 2.1, 1.2, 0,0,Math.PI*2); c.fill();
      c.beginPath(); c.ellipse(7.8, -2.2, 2.1, 1.2, 0,0,Math.PI*2); c.fill();
      // beak — tiny, upturned, extra cute
      c.fillStyle = skin.beak; c.strokeStyle = "#6b3a0a"; c.lineWidth = 1;
      c.beginPath(); c.moveTo(-3.8, -2.2); c.lineTo(3.8, -2.2); c.lineTo(0, 0.4); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = "rgba(255,255,255,0.85)";
      c.beginPath(); c.ellipse(-1, -1.6, 0.8, 0.5, 0,0,Math.PI*2); c.fill();
      // little tuft on head
      c.fillStyle = skin.body; c.strokeStyle = "#1a2632"; c.lineWidth = 1;
      c.beginPath(); c.ellipse(0, -13.2, 1.8, 2.6, -0.3, 0, Math.PI*2); c.fill(); c.stroke();
      c.beginPath(); c.ellipse(1.4, -12.8, 1.3, 2.0, 0.4, 0, Math.PI*2); c.fill(); c.stroke();
      // scarf for waddles — chunky knit, keeps the circle cozy
      c.fillStyle = skin.scarf || "#ffd166"; c.strokeStyle = "rgba(0,0,0,0.16)"; c.lineWidth=1;
      c.beginPath(); c.roundRect(-8.5, 5.8, 17, 4.2, 2); c.fill(); c.stroke();
      c.fillRect(3.2, 9.6, 3.8, 5.5); c.strokeRect(3.2, 9.6, 3.8, 5.5);
      c.fillStyle = "#ff6b6b"; c.fillRect(-8.5, 7.2, 17, 1); c.fillRect(3.2, 11.8, 3.8, 1);
      // sparkles around waddles when moving/idle
      var spark = Math.sin(t*2.2);
      if (spark > 0.6) {
        c.fillStyle = "rgba(255,241,150,0.9)";
        c.beginPath(); c.arc(9.5, -10.5, 0.9,0,Math.PI*2); c.fill();
        c.beginPath(); c.arc(-10, -8, 0.7,0,Math.PI*2); c.fill();
      }
      return;
    }

    // ——— normal penguins ———
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
    c.save();
    c.translate(-11, 0);
    c.rotate(flipperSwing * 0.7);
    c.beginPath(); c.ellipse(0, 0, 4.2, 9, -0.2, 0, Math.PI*2); c.fill(); c.stroke();
    c.restore();
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
    c.strokeStyle = "rgba(0,0,0,0.2)";
    c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(-1, -5.5); c.lineTo(1, -5.5); c.stroke();
    // hats
    if (skin.hat === "berry") {
      c.fillStyle = "#c94a6a"; c.beginPath(); c.ellipse(0, -20, 7, 5, 0,0,Math.PI*2); c.fill();
      c.fillStyle = "#7ac74f"; c.beginPath(); c.ellipse(0, -23, 3, 2.2, 0,0,Math.PI*2); c.fill();
      c.strokeStyle = "#2b0e1a"; c.lineWidth=1; c.stroke();
    } else if (skin.hat === "crown") {
      c.fillStyle = "#f6c445"; c.strokeStyle = "#7a4a0a"; c.lineWidth=1.2;
      c.beginPath(); c.moveTo(-7, -18); c.lineTo(-4, -24); c.lineTo(0, -19); c.lineTo(4, -24); c.lineTo(7, -18); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = "#ff6b6b"; c.beginPath(); c.arc(0, -19.5, 1.6,0,Math.PI*2); c.fill();
    } else if (skin.hat === "headband") {
      c.fillStyle = "#ff6b6b"; c.fillRect(-11, -16, 22, 4); c.strokeStyle = "#7a0f0f"; c.lineWidth=1; c.strokeRect(-11, -16, 22, 4);
      c.fillStyle = "#fff"; c.font = "bold 6px monospace"; c.textAlign="center"; c.fillText("忍", 0, -12.5);
    } else if (skin.hat === "helmet") {
      c.strokeStyle = "#4f8fcf"; c.lineWidth=1.4; c.beginPath(); c.arc(0, -11, 12.5, Math.PI*0.92, Math.PI*0.08); c.stroke();
      c.fillStyle = "rgba(255,255,255,0.9)"; c.beginPath(); c.ellipse(3, -15, 4, 2.2, -0.5,0,Math.PI*2); c.fill();
      c.fillStyle = "#4f8fcf"; c.fillRect(-12, -5, 24, 2);
    } else if (skin.hat === "viking") {
      c.fillStyle = "#8a7a5a"; c.strokeStyle = "#3d2f1b"; c.lineWidth=1.2;
      c.beginPath(); c.ellipse(0, -18, 10, 7, 0,0,Math.PI*2); c.fill(); c.stroke();
      c.fillStyle = "#fff8ea"; c.strokeStyle = "#3d2f1b";
      c.beginPath(); c.moveTo(-9, -18); c.quadraticCurveTo(-16, -26, -13, -30); c.lineTo(-8, -26); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(9, -18); c.quadraticCurveTo(16, -26, 13, -30); c.lineTo(8, -26); c.closePath(); c.fill(); c.stroke();
    } else if (skin.hat === "chef") {
      c.fillStyle = "#fff"; c.strokeStyle = "#2a3442"; c.lineWidth=1.1;
      c.beginPath(); c.ellipse(0, -19, 9, 6, 0,0,Math.PI*2); c.fill(); c.stroke();
      c.fillStyle = "#fff"; c.beginPath(); c.ellipse(0, -23, 7, 4.5, 0,0,Math.PI*2); c.fill(); c.stroke();
      c.strokeStyle = "rgba(0,0,0,0.08)"; c.lineWidth=0.7;
      for(var ci=0; ci<3; ci++){ c.beginPath(); c.moveTo(-5+ci*5, -22); c.lineTo(-5+ci*5, -18); c.stroke(); }
    } else if (skin.hat === "pirate") {
      c.fillStyle = "#1a0f0a"; c.strokeStyle = "#000"; c.lineWidth=1.2;
      c.beginPath(); c.ellipse(0, -19, 11, 4.5, 0,0,Math.PI*2); c.fill(); c.stroke();
      c.fillStyle = "#cc1a00"; c.beginPath(); c.ellipse(0, -22, 8, 5, 0,0,Math.PI*2); c.fill(); c.stroke();
      c.fillStyle = "#f6c445"; c.font = "bold 7px serif"; c.textAlign="center"; c.fillText("☠", 0, -20.5);
      // eyepatch
      c.fillStyle = "#000"; c.beginPath(); c.arc(4.2, -11, 3.2, 0, Math.PI*2); c.fill();
      c.strokeStyle = "#000"; c.lineWidth=1; c.beginPath(); c.moveTo(4.2, -14); c.lineTo(7.5, -17); c.stroke();
      c.fillStyle = "#fff"; c.beginPath(); c.arc(4.2, -11, 0.9, 0, Math.PI*2); c.fill();
    } else if (skin.hat === "snowflake") {
      c.fillStyle = "#a8d6ff"; c.strokeStyle = "#1e4a7a"; c.lineWidth=1;
      c.beginPath(); c.ellipse(0, -19.5, 7, 7, 0,0,Math.PI*2); c.fill(); c.stroke();
      c.strokeStyle = "#fff"; c.lineWidth=1.1;
      for(var si=0; si<6; si++){ var a=si*Math.PI/3; c.beginPath(); c.moveTo(0,-19.5); c.lineTo(Math.cos(a)*6, -19.5+Math.sin(a)*6); c.stroke(); }
      c.fillStyle = "#fff"; c.beginPath(); c.arc(0,-19.5,1.5,0,Math.PI*2); c.fill();
    } else if (skin.hat === "disco") {
      // afro
      c.fillStyle = "#4a1a6b";
      for(var di=0; di<9; di++){ var ax=Math.cos(di*0.9)*9, ay=-20+Math.sin(di*0.9)*3; c.beginPath(); c.arc(ax, ay, 3.2,0,Math.PI*2); c.fill(); }
      c.fillStyle = "#ffd166"; c.beginPath(); c.ellipse(0,-19,9,5,0,0,Math.PI*2); c.fill();
      c.fillStyle = "#fff"; c.font="bold 5px monospace"; c.textAlign="center"; c.fillText("DISCO",0,-17.5);
    } else if (skin.hat === "ghost") {
      c.fillStyle = "rgba(255,255,255,0.92)"; c.strokeStyle = "rgba(42,52,66,0.25)"; c.lineWidth=1;
      c.beginPath(); c.ellipse(0,-18,10,8,0,0,Math.PI*2); c.fill(); c.stroke();
      c.fillStyle = "rgba(255,255,255,0.92)";
      c.beginPath(); c.moveTo(-10,-14); c.lineTo(-7,-10); c.lineTo(-3,-14); c.lineTo(0,-10); c.lineTo(3,-14); c.lineTo(7,-10); c.lineTo(10,-14); c.lineTo(10,-18); c.lineTo(-10,-18); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = "#4a5a7a"; c.beginPath(); c.arc(-4,-18,1.2,0,Math.PI*2); c.fill(); c.beginPath(); c.arc(4,-18,1.2,0,Math.PI*2); c.fill();
    } else if (skin.hat === "knight") {
      c.fillStyle = "#8a9ab0"; c.strokeStyle = "#1a2632"; c.lineWidth=1.3;
      c.beginPath(); c.roundRect(-9,-24,18,10,2); c.fill(); c.stroke();
      c.fillStyle = "#4a5a6b"; c.fillRect(-9,-20,18,2);
      // visor slits
      c.fillStyle = "#1a2632"; for(var vk=0; vk<3; vk++) c.fillRect(-5+vk*5, -22, 2, 4);
      // plume
      c.fillStyle = "#cc1a00"; c.beginPath(); c.ellipse(0,-26,3,6,0,0,Math.PI*2); c.fill();
    } else if (skin.hat === "robot") {
      c.fillStyle = "#c0c8d4"; c.strokeStyle = "#2a3442"; c.lineWidth=1.2; c.beginPath(); c.roundRect(-8,-23,16,8,2); c.fill(); c.stroke();
      c.fillStyle = "#00ffaa"; c.beginPath(); c.arc(-3.5,-19,1.6,0,Math.PI*2); c.fill(); c.beginPath(); c.arc(3.5,-19,1.6,0,Math.PI*2); c.fill();
      c.strokeStyle = "#2a3442"; c.lineWidth=0.8; c.beginPath(); c.moveTo(0,-23); c.lineTo(0,-26); c.stroke();
      c.fillStyle = "#ff6b6b"; c.beginPath(); c.arc(0,-26.5,1.5,0,Math.PI*2); c.fill();
    } else if (skin.hat === "waddles") {
      // waddles already handled via circular, but add tiny star crown for ultra
      c.fillStyle = "#ffd166"; c.strokeStyle = "#7a4a0a"; c.lineWidth=0.9;
      c.beginPath(); c.moveTo(-4,-13.8); c.lineTo(-1.5,-16.2); c.lineTo(0,-14); c.lineTo(1.5,-16.2); c.lineTo(4,-13.8); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = "#ff6b9d"; c.beginPath(); c.arc(0,-14.2,0.8,0,Math.PI*2); c.fill();
    }
    if (skin.scarf) {
      c.fillStyle = skin.scarf; c.strokeStyle = "rgba(0,0,0,0.18)"; c.lineWidth=1;
      if (!skin.circular) { c.fillRect(-9, -2, 18, 5); c.strokeRect(-9, -2, 18, 5); c.fillRect(4, 2, 4, 8); c.strokeRect(4, 2, 4, 8); }
      if (skin.id==="berry") { c.fillStyle = "#ff6b6b"; c.fillRect(-9, 0, 18, 1.2); }
      if (skin.id==="viking") { c.fillStyle = "#fff"; c.fillRect(-9, 1, 18, 1); }
      if (skin.id==="chef") { c.fillStyle = "#fff"; c.font="bold 4px monospace"; c.textAlign="center"; c.fillText("CHEF", -0.5, 1.8); }
      if (skin.id==="disco") { c.fillStyle = "rgba(255,255,255,0.9)"; c.fillRect(-9,1,18,1); }
    }
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
        pc.scale(1.18,1.18);
        drawPenguinModel(pc, p, {vx:0, vy:0, onGround:true, facing:1, squish:0});
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
    // secret cheat: Ctrl+F3 opens pin pad (check first, even with overlays open)
    if (e.ctrlKey && (e.key === "F3" || e.code === "F3" || e.keyCode === 114)) {
      e.preventDefault();
      if (typeof openCheat === "function") openCheat();
      else if (typeof cheatOverlay !== "undefined" && cheatOverlay) { cheatOverlay.hidden = false; cheatOverlay.style.display = "flex"; }
      return;
    }
    if (typeof cheatOverlay !== "undefined" && cheatOverlay && !cheatOverlay.hidden && e.key==="Escape") { closeCheat(); return; }
    if (levelPicker && !levelPicker.hidden && e.key==="Escape") { closeLevelPicker(); return; }
    if (shopOverlay && !shopOverlay.hidden && e.key==="Escape") { closeShop(); return; }
    // pause input when any overlay open
    if ((shopOverlay && !shopOverlay.hidden) || (levelPicker && !levelPicker.hidden) || (typeof cheatOverlay !== "undefined" && cheatOverlay && !cheatOverlay.hidden)) return;
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
  // level picker
  var levelPicker = document.querySelector("#penguinLevelPicker");
  var levelGrid = document.querySelector("#penguinLevelGrid");
  function renderLevelPicker(){
    levelGrid.innerHTML = "";
    for(var li=0; li<TOTAL_PENGUIN_LEVELS; li++){
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "penguin-level-btn";
      if (li === levelIndex) btn.classList.add("current");
      var maxUnlock = data.bestLevel; // bestLevel is count beaten, so next index = bestLevel
      // allow replay of any beaten + next one
      if (li > maxUnlock) {
        btn.classList.add("locked");
        btn.disabled = true;
        btn.title = "Locked — beat level " + (maxUnlock+1) + " first";
      } else {
        (function(idx){ btn.addEventListener("click", function(){ closeLevelPicker(); buildLevel(idx); }); })(li);
        if (li === TOTAL_PENGUIN_LEVELS - 1) btn.classList.add("champion");
      }
      if (li === TOTAL_PENGUIN_LEVELS - 1 && maxUnlock < li) {
        btn.classList.add("champion");
        btn.classList.add("locked");
        btn.disabled = true;
        btn.title = "Locked — conquer " + (TOTAL_PENGUIN_LEVELS-1) + " levels first";
        // re-add champion styling even when locked
      }
      btn.textContent = li === TOTAL_PENGUIN_LEVELS-1 ? "★ 250" : String(li+1);
      if (li === TOTAL_PENGUIN_LEVELS-1 && btn.disabled) btn.title = "Locked — conquer " + (TOTAL_PENGUIN_LEVELS-1) + " levels first";
      else if (li === TOTAL_PENGUIN_LEVELS-1) btn.title = "Champion Road — the final test";
      else btn.title = PENGUIN_TITLES[li] || ("Level " + (li+1));
      levelGrid.appendChild(btn);
    }
  }
  function openLevelPicker(){
    renderLevelPicker();
    levelPicker.hidden = false;
    levelPicker.style.display = "flex";
  }
  function closeLevelPicker(){
    levelPicker.hidden = true;
    levelPicker.style.display = "none";
  }
  levelEl.style.cursor = "pointer";
  levelEl.title = "Click to jump to any unlocked level";
  levelEl.addEventListener("click", openLevelPicker);
  document.querySelector("#penguinLevelClose").addEventListener("click", closeLevelPicker);
  levelPicker.addEventListener("click", function(ev){ if(ev.target===levelPicker) closeLevelPicker(); });
  var levelsBtn = document.querySelector("#penguinLevelsBtn");
  if (levelsBtn) levelsBtn.addEventListener("click", openLevelPicker);
  // secret cheat pin pad (Ctrl+F3, code 12113 → coin vault)
  var cheatOverlay = document.querySelector("#penguinCheat");
  var pinDisplay = document.querySelector("#penguinPinDisplay");
  var pinGrid = document.querySelector("#penguinPinGrid");
  var cheatMsg = document.querySelector("#penguinCheatMsg");
  var pinEntry = "";
  function renderPin() {
    if (!pinDisplay) return;
    var out = "";
    for (var i = 0; i < 5; i++) {
      out += (i < pinEntry.length ? pinEntry[i] : "_") + (i < 4 ? " " : "");
    }
    pinDisplay.textContent = out;
    pinDisplay.classList.toggle("filled", pinEntry.length === 5);
  }
  function cheatSay(t, ok) {
    if (!cheatMsg) return;
    cheatMsg.textContent = t;
    cheatMsg.classList.toggle("good", !!ok);
    cheatMsg.classList.toggle("bad", !ok && !!t);
  }
  function pressPinDigit(d) {
    if (cheatOverlay.hidden) return;
    if (pinEntry.length >= 5) return;
    pinEntry += d;
    renderPin();
    cheatSay("", true);
    if (pinEntry.length === 5) {
      if (pinEntry === SECRET_COIN_CODE) {
        data.secretUnlocked = true;
        try { savePenguinData(data); } catch(e){}
        cheatSay("★ UNLOCKED! Coin vault opening… ★", true);
        if (pinDisplay) {
          pinDisplay.classList.add("unlocked");
          setTimeout(function(){ pinDisplay.classList.remove("unlocked"); }, 1600);
        }
        setTimeout(function(){ closeCheat(); buildSecretLevel(); }, 750);
      } else {
        cheatSay("Nope. That code melts.", false);
        if (pinDisplay) {
          pinDisplay.classList.add("denied");
          setTimeout(function(){ pinDisplay.classList.remove("denied"); }, 450);
        }
        setTimeout(function(){ pinEntry = ""; renderPin(); }, 550);
      }
    }
  }
  function openCheat() {
    pinEntry = "";
    renderPin();
    // if already unlocked, hint it
    if (data.secretUnlocked) cheatSay("Vault already unlocked — re-enter code to return.", true);
    else cheatSay("", true);
    cheatOverlay.hidden = false;
    cheatOverlay.style.display = "flex";
  }
  function closeCheat() {
    pinEntry = "";
    renderPin();
    cheatSay("", true);
    cheatOverlay.hidden = true;
    cheatOverlay.style.display = "none";
  }
  if (pinGrid) {
    pinGrid.innerHTML = "";
    ["1","2","3","4","5","6","7","8","9","C","0","⌫"].forEach(function(label){
      var b = document.createElement("button");
      b.type = "button";
      b.className = "penguin-pin-btn" + (label==="C" ? " pin-clear" : label==="⌫" ? " pin-back" : "");
      b.textContent = label;
      b.setAttribute("aria-label", "Pin " + label);
      b.addEventListener("click", function(){
        if (label === "C") { pinEntry = ""; renderPin(); cheatSay("", true); }
        else if (label === "⌫") { pinEntry = pinEntry.slice(0, -1); renderPin(); }
        else pressPinDigit(label);
      });
      pinGrid.appendChild(b);
    });
  }
  document.querySelector("#penguinCheatClose").addEventListener("click", closeCheat);
  cheatOverlay.addEventListener("click", function(ev){ if(ev.target===cheatOverlay) closeCheat(); });
  // physical keyboard digits while cheat open
  function pinKeys(e){
    if (!cheatOverlay || cheatOverlay.hidden) return;
    if (/^[0-9]$/.test(e.key)) { e.preventDefault(); pressPinDigit(e.key); }
    else if (e.key === "Backspace") { e.preventDefault(); pinEntry = pinEntry.slice(0,-1); renderPin(); }
  }
  document.addEventListener("keydown", pinKeys);
  document.querySelector("#penguinRestart").addEventListener("click", function(){
    if (isSecretLevel) buildLevel(SECRET_LEVEL_INDEX);
    else buildLevel(levelIndex);
  });
  document.querySelector("#penguinNext").addEventListener("click", function(){
    if (isSecretLevel) { buildLevel(secretReturnIndex); return; }
    var next = levelIndex + 1;
    if (next >= TOTAL_PENGUIN_LEVELS) next = 0;
    buildLevel(next);
  });

  bindTouch();

  // init — auto-resume where you left off
  selectedPenguin = penguinById(data.selected);
  var resume = (typeof data.currentLevel === "number") ? data.currentLevel : (data.bestLevel ? Math.min(data.bestLevel, TOTAL_PENGUIN_LEVELS-1) : 0);
  if (resume <0) resume=0; if (resume >= TOTAL_PENGUIN_LEVELS) resume = TOTAL_PENGUIN_LEVELS-1;
  // clamp to unlocked: if player somehow saved beyond unlock, clamp to maxUnlock
  var maxAllowed = (data.bestLevel||0);
  if (resume > maxAllowed) resume = maxAllowed;
  buildLevel(resume);
  renderShop();
  closeShop();
  // also close picker initially
  if (typeof levelPicker !== "undefined" && levelPicker) { levelPicker.hidden = true; levelPicker.style.display = "none"; }

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
    document.removeEventListener("keydown", pinKeys);
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
