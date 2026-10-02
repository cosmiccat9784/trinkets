function startTrinketsTag() {
  openGame(
    "Trinkets Tag",
    "Arcade",
    `
      <div class="game-layout">
        <div class="game-topline">
          <span class="game-stat" id="tagTime">60.0</span>
          <span class="game-stat" id="tagIt">IT: —</span>
          <span class="game-stat" id="tagEvent">Calm</span>
          <span class="game-stat" id="tagBest">Best: —</span>
        </div>
        <div class="tag-setup" id="tagSetup">
          <div class="tag-row" role="group" aria-label="Game mode">
            <span class="tag-label">Mode</span>
            <button class="game-action tag-pick on" data-mode="classic" type="button" title="60 seconds. Least time as IT wins.">Classic</button>
            <button class="game-action tag-pick" data-mode="last" type="button" title="Tagged players are out. Last one standing wins.">Last Standing</button>
            <button class="game-action tag-pick" data-mode="infection" type="button" title="Tagged players become IT too. Survive.">Infection</button>
            <button class="game-action tag-pick" data-mode="potato" type="button" title="Hold the potato too long and you pop. Tag someone fast!">Hot Potato</button>
          </div>
          <div class="tag-row" role="group" aria-label="Arena">
            <span class="tag-label">Arena</span>
            <button class="game-action tag-arena on" data-arena="open" type="button">Open</button>
            <button class="game-action tag-arena" data-arena="park" type="button">Park</button>
            <button class="game-action tag-arena" data-arena="maze" type="button">Maze</button>
            <button class="game-action tag-arena" data-arena="ice" type="button">Ice</button>
            <button class="game-action tag-arena" data-arena="house" type="button">House</button>
            <button class="game-action tag-arena" data-arena="site" type="button">Construction</button>
            <button class="game-action tag-arena" data-arena="chaos" type="button">Chaos</button>
          </div>
          <div class="tag-row" role="group" aria-label="Players">
            <span class="tag-label">P2</span>
            <button class="game-action tag-p2 on" data-p2="bot" type="button" title="Second slot is a bot">Bot</button>
            <button class="game-action tag-p2" data-p2="human" type="button" title="Two humans, one keyboard: P1 WASD, P2 Arrows">Human</button>
            <button class="game-action tag-p2" data-p2="off" type="button" title="Just you vs the bots">Off</button>
            <span class="tag-label">Bots</span>
            <button class="game-action tag-bots" data-bots="2" type="button">2</button>
            <button class="game-action tag-bots on" data-bots="4" type="button">4</button>
            <button class="game-action tag-chaos on" id="tagChaosBtn" type="button" title="Random chaos events mid-round">Chaos: on</button>
          </div>
        </div>
        <canvas class="tag-canvas" id="tagCanvas" width="720" height="480"></canvas>
        <p class="game-message" id="tagMsg">P1: WASD (or Arrows solo) · P2: Arrows · Touch: drag to run. Don't be IT when the clock hits zero!</p>
        <div class="game-actions">
          <button class="game-action one-press" id="tagStart" type="button">START — DON'T BE IT</button>
          <button class="game-action" id="tagRestart" type="button">Restart</button>
        </div>
      </div>
    `
  );

  const canvas = document.querySelector("#tagCanvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const PR = 13;

  const timeEl = document.querySelector("#tagTime");
  const itEl = document.querySelector("#tagIt");
  const eventEl = document.querySelector("#tagEvent");
  const bestEl = document.querySelector("#tagBest");
  const message = document.querySelector("#tagMsg");
  const setupEl = document.querySelector("#tagSetup");

  // ---------- config ----------
  let mode = "classic";
  let arena = "open";
  let p2slot = "bot";
  let botCount = 4;
  let chaosOn = true;

  setupEl.querySelectorAll(".tag-pick").forEach((b) => b.addEventListener("click", () => {
    setupEl.querySelectorAll(".tag-pick").forEach((x) => x.classList.remove("on"));
    b.classList.add("on");
    mode = b.dataset.mode;
  }));
  setupEl.querySelectorAll(".tag-arena").forEach((b) => b.addEventListener("click", () => {
    setupEl.querySelectorAll(".tag-arena").forEach((x) => x.classList.remove("on"));
    b.classList.add("on");
    arena = b.dataset.arena;
  }));
  setupEl.querySelectorAll(".tag-p2").forEach((b) => b.addEventListener("click", () => {
    setupEl.querySelectorAll(".tag-p2").forEach((x) => x.classList.remove("on"));
    b.classList.add("on");
    p2slot = b.dataset.p2;
  }));
  setupEl.querySelectorAll(".tag-bots").forEach((b) => b.addEventListener("click", () => {
    setupEl.querySelectorAll(".tag-bots").forEach((x) => x.classList.remove("on"));
    b.classList.add("on");
    botCount = Number(b.dataset.bots) || 4;
  }));
  const chaosBtn = document.querySelector("#tagChaosBtn");
  chaosBtn.addEventListener("click", () => {
    chaosOn = !chaosOn;
    chaosBtn.textContent = chaosOn ? "Chaos: on" : "Chaos: off";
    chaosBtn.classList.toggle("on", chaosOn);
  });

  // ---------- bests ----------
  let bestSurvived = 0;
  try {
    bestSurvived = Number((readScores() || {}).tag) || 0;
  } catch (err) {}

  // ---------- arenas ----------
  // rects: {x,y,w,h,mx,my,range,spd,ph} — movers oscillate
  function buildArena(kind) {
    const obs = [];
    const ice = kind === "ice" || kind === "chaos";
    if (kind === "park") {
      obs.push({ x: 150, y: 110, w: 54, h: 54, tree: true });
      obs.push({ x: 516, y: 110, w: 54, h: 54, tree: true });
      obs.push({ x: 150, y: 316, w: 54, h: 54, tree: true });
      obs.push({ x: 516, y: 316, w: 54, h: 54, tree: true });
      obs.push({ x: 333, y: 213, w: 54, h: 54, tree: true });
    } else if (kind === "maze") {
      obs.push({ x: 180, y: 0, w: 24, h: 300 });
      obs.push({ x: 180, y: 380, w: 24, h: 100 });
      obs.push({ x: 516, y: 0, w: 24, h: 100 });
      obs.push({ x: 516, y: 180, w: 24, h: 300 });
      obs.push({ x: 280, y: 228, w: 160, h: 24 });
      obs.push({ x: 60, y: 120, w: 60, h: 24 });
      obs.push({ x: 600, y: 336, w: 60, h: 24 });
    } else if (kind === "house") {
      // outer rooms: vertical wall with two doors, horizontal wall with one door
      obs.push({ x: 348, y: 0, w: 24, h: 170 });
      obs.push({ x: 348, y: 250, w: 24, h: 230 });
      obs.push({ x: 0, y: 300, w: 240, h: 24 });
      obs.push({ x: 320, y: 300, w: 400, h: 24 });
      obs.push({ x: 90, y: 90, w: 70, h: 70, tree: true }); // sofa
    } else if (kind === "site") {
      obs.push({ x: 120, y: 140, w: 90, h: 24 });
      obs.push({ x: 510, y: 316, w: 90, h: 24 });
      obs.push({ x: 330, y: 0, w: 60, h: 120, mx: 1, range: 120, spd: 1.1, ph: 0, homeX: 330, homeY: 0 }); // moving platform
      obs.push({ x: 330, y: 360, w: 60, h: 120, mx: 1, range: 120, spd: 1.4, ph: 2, homeX: 330, homeY: 360 });
    } else if (kind === "chaos") {
      obs.push({ x: 200, y: 100, w: 60, h: 60, tree: true });
      obs.push({ x: 460, y: 320, w: 60, h: 60, tree: true });
      obs.push({ x: 100, y: 0, w: 40, h: 160, my: 1, range: 150, spd: 1.2, ph: 0, homeX: 100, homeY: 0 });
      obs.push({ x: 580, y: 320, w: 40, h: 160, my: 1, range: 150, spd: 1.5, ph: 3, homeX: 580, homeY: 320 });
    }
    return { obs, ice };
  }

  // ---------- state ----------
  const COLORS = ["#43c6ac", "#f6c445", "#ff8fab", "#74c0fc", "#b197fc", "#63e6be"];

  let players = [];
  let obstacles = [];
  let icy = false;
  let phase = "ready"; // ready | playing | over
  let timeLeft = 60;
  let timeElapsed = 0;
  let tagCooldown = 0;
  let fuse = 0; // hot potato
  let longestHold = 0;
  let holdStart = 0;
  let events = { speed: 0, ice: 0, wind: 0, ghost: 0, reverse: 0, clones: 0, invis: 0 };
  let eventTimer = 9;
  let eventLabel = "Calm";
  let wind = { x: 0, y: 0, ang: 0 };
  let clones = [];
  let particles = [];
  let popups = [];
  let shake = 0;
  let confetti = [];
  let raf = 0;
  let last = performance.now();
  let nearCd = {}; // "i-j" -> timer
  let time = 0;

  const keys = new Set();
  let pointer = { active: false, x: 0, y: 0 };

  function roundTime() {
    if (mode === "classic") return 60;
    if (mode === "infection") return 90;
    return 120;
  }

  function spawnPoints(n) {
    const pts = [];
    const cx = W / 2, cy = H / 2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      pts.push({ x: cx + Math.cos(a) * 220, y: cy + Math.sin(a) * 150 });
    }
    return pts;
  }

  function freeSpot(x, y) {
    for (const o of obstacles) {
      if (x > o.x - PR - 4 && x < o.x + o.w + PR + 4 && y > o.y - PR - 4 && y < o.y + o.h + PR + 4) {
        return false;
      }
    }
    return x > 30 && x < W - 30 && y > 30 && y < H - 30;
  }

  function nudgeFree(p) {
    if (freeSpot(p.x, p.y)) return;
    for (let r = 20; r < 300; r += 20) {
      for (let a = 0; a < 12; a++) {
        const x = p.x + Math.cos((a / 12) * Math.PI * 2) * r;
        const y = p.y + Math.sin((a / 12) * Math.PI * 2) * r;
        if (freeSpot(x, y)) { p.x = x; p.y = y; return; }
      }
    }
  }

  function buildPlayers() {
    const list = [];
    const spots = spawnPoints(6);
    list.push({ idx: 0, name: "YOU", human: "p1", color: COLORS[0], it: false });
    if (p2slot !== "off") {
      list.push({ idx: 1, name: p2slot === "human" ? "P2" : "P2 🤖", human: p2slot === "human" ? "p2" : null, bot: p2slot === "human" ? null : "chaser", color: COLORS[1], it: false });
    }
    const kinds = ["runner", "chaser", "smart", "chaos"];
    for (let i = 0; i < botCount && list.length < 6; i++) {
      const k = kinds[i % kinds.length];
      list.push({ idx: list.length, name: ["Bun 🐇", "Wolf 🐺", "Brain 🧠", "Goblin 😈"][i % 4], human: null, bot: k, color: COLORS[list.length % COLORS.length], it: false });
    }
    list.forEach((p, i) => {
      p.x = spots[i].x; p.y = spots[i].y;
      p.vx = 0; p.vy = 0;
      p.dx = 0; p.dy = 0;
      p.boost = 0;
      p.alive = true;
      p.eliminated = false;
      p.itTime = 0; p.tags = 0; p.escapes = 0; p.near = 0; p.dist = 0; p.survived = 0;
      p.aiT = Math.random() * 0.2;
      p.aiDir = { x: Math.random() - 0.5, y: Math.random() - 0.5 };
      p.aiMode = "chase";
      p.aiSwitch = 1 + Math.random() * 2;
      nudgeFree(p);
    });
    // random first IT (a bot if possible, so the human isn't instantly doomed)
    const bots = list.filter((p) => !p.human);
    const first = bots.length ? bots[Math.floor(Math.random() * bots.length)] : list[0];
    first.it = true;
    return list;
  }

  function resetRound() {
    const a = buildArena(arena);
    obstacles = a.obs;
    icy = a.ice;
    players = buildPlayers();
    phase = "playing";
    timeLeft = roundTime();
    timeElapsed = 0;
    tagCooldown = 1;
    fuse = 8;
    longestHold = 0;
    holdStart = 0;
    events = { speed: 0, ice: 0, wind: 0, ghost: 0, reverse: 0, clones: 0, invis: 0 };
    eventTimer = 8;
    eventLabel = "Calm";
    clones = [];
    particles = [];
    popups = [];
    confetti = [];
    shake = 0;
    nearCd = {};
    message.textContent = itNames() + (mode === "potato" ? " hold the potato — tag someone before it pops!" : " is IT — run!");
    syncHud();
  }

  // ---------- helpers ----------
  function alivePlayers() {
    return players.filter((p) => p.alive && !p.eliminated);
  }
  function itPlayers() {
    return alivePlayers().filter((p) => p.it);
  }
  function itNames() {
    const its = itPlayers();
    if (!its.length) return "Nobody";
    return its.map((p) => p.name).join(" + ");
  }
  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  function burst(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 180;
      particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.6, max: 0.6, color, size: 2 + Math.random() * 3 });
    }
  }
  function popup(x, y, text, color) {
    popups.push({ x, y, text, color, life: 1.1, max: 1.1 });
  }
  function poof(x, y, color) {
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 220;
      confetti.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, life: 1.4 + Math.random(), max: 2, color: ["#ff6b6b", "#f6c445", "#43c6ac", "#74c0fc", "#b197fc", color][i % 6], size: 3 + Math.random() * 3, rot: Math.random() * 6 });
    }
  }

  function collideWalls(p) {
    if (events.ghost > 0) return;
    for (const o of obstacles) {
      const nx = Math.max(o.x, Math.min(p.x, o.x + o.w));
      const ny = Math.max(o.y, Math.min(p.y, o.y + o.h));
      let dx = p.x - nx;
      let dy = p.y - ny;
      let d = Math.hypot(dx, dy);
      if (d < PR) {
        if (d === 0) { // center inside rect: push along smallest exit
          const l = p.x - o.x, r = o.x + o.w - p.x, t = p.y - o.y, b = o.y + o.h - p.y;
          const m = Math.min(l, r, t, b);
          if (m === l) p.x = o.x - PR;
          else if (m === r) p.x = o.x + o.w + PR;
          else if (m === t) p.y = o.y - PR;
          else p.y = o.y + o.h + PR;
        } else {
          p.x = nx + (dx / d) * PR;
          p.y = ny + (dy / d) * PR;
        }
      }
    }
  }

  function clearance(x, y, dx, dy) {
    // distance along ray before hitting wall/edge (for smart fleeing)
    let c = 0;
    for (let s = 12; s <= 180; s += 12) {
      const px = x + dx * s, py = y + dy * s;
      if (px < 20 || px > W - 20 || py < 20 || py > H - 20) break;
      let hit = false;
      for (const o of obstacles) {
        if (px > o.x - 6 && px < o.x + o.w + 6 && py > o.y - 6 && py < o.y + o.h + 6) { hit = true; break; }
      }
      if (hit) break;
      c = s;
    }
    return c;
  }

  // ---------- bot brains ----------
  function nearestIT(p) {
    let bestP = null, bd = 1e9;
    for (const q of alivePlayers()) {
      if (!q.it || q === p) continue;
      const d = dist(p, q);
      if (d < bd) { bd = d; bestP = q; }
    }
    return bestP;
  }
  function nearestFoe(p) {
    let bestP = null, bd = 1e9;
    for (const q of alivePlayers()) {
      if (q === p) continue;
      if (mode === "infection" && p.it && q.it) continue;
      if (p.it && q.it) continue;
      const d = dist(p, q);
      if (d < bd) { bd = d; bestP = q; }
    }
    return bestP;
  }

  function botThink(p, dt) {
    p.aiT -= dt;
    if (p.aiT > 0) return;
    p.aiT = 0.15 + Math.random() * 0.06;
    const it = nearestIT(p);
    const foe = nearestFoe(p);
    let want = { x: 0, y: 0 };

    if (p.bot === "chaos") {
      p.aiSwitch -= 0.15;
      if (p.aiSwitch <= 0) {
        p.aiSwitch = 0.8 + Math.random() * 1.8;
        const rolls = ["chase", "flee", "spin", "wall", "nap"];
        p.aiMode = rolls[Math.floor(Math.random() * rolls.length)];
        p.aiDir = { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1 };
      }
      if (p.aiMode === "chase" && foe) want = { x: foe.x - p.x, y: foe.y - p.y };
      else if (p.aiMode === "flee" && it) want = { x: p.x - it.x, y: p.y - it.y };
      else if (p.aiMode === "wall") want = { x: p.aiDir.x * 200, y: p.aiDir.y * 200 }; // may bonk. glorious.
      else if (p.aiMode === "spin") { p.aiDir = { x: -p.aiDir.y, y: p.aiDir.x }; want = { x: p.aiDir.x * 100, y: p.aiDir.y * 100 }; }
      else want = { x: 0, y: 0 }; // nap. questionable.
    } else if (p.it) {
      // everyone hunts when IT — with their own flavor
      if (foe) {
        if (p.bot === "smart") want = { x: (foe.x + foe.vx * 0.35) - p.x, y: (foe.y + foe.vy * 0.35) - p.y };
        else if (p.bot === "runner") want = { x: foe.x - p.x, y: foe.y - p.y }; // runner is just slower at hunting
        else want = { x: foe.x - p.x, y: foe.y - p.y };
      }
    } else if (p.bot === "runner") {
      if (it) want = { x: p.x - it.x, y: p.y - it.y };
      want.x += (W / 2 - p.x) * 0.002;
      want.y += (H / 2 - p.y) * 0.002;
    } else if (p.bot === "chaser") {
      const t = foe || it;
      if (t) want = { x: t.x - p.x, y: t.y - p.y }; // hunts even when safe. menace.
    } else if (p.bot === "smart") {
      if (it) {
        // flee toward most open direction, blended away from IT
        let bx = 0, by = 0, bc = -1;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const c = clearance(p.x, p.y, Math.cos(a), Math.sin(a));
          const away = Math.cos(a) * (p.x - it.x) + Math.sin(a) * (p.y - it.y);
          const score = c + away * 0.6;
          if (score > bc) { bc = score; bx = Math.cos(a); by = Math.sin(a); }
        }
        want = { x: bx * 100, y: by * 100 };
      }
    }
    const m = Math.hypot(want.x, want.y);
    if (m > 1) { p.aiDir = { x: want.x / m, y: want.y / m }; }
    else if (p.bot === "chaos" && p.aiMode === "nap") { p.aiDir = { x: 0, y: 0 }; }
  }

  // ---------- tagging ----------
  function doTag(tagger, victim) {
    if (mode === "infection") {
      if (victim.it) return;
      victim.it = true;
      victim.boost = 1.2;
      tagger.tags += 1;
      burst(victim.x, victim.y, 14, "#ff6b6b");
      popup(victim.x, victim.y - 24, "INFECTED!", "#ff6b6b");
      shake = Math.max(shake, 6);
      message.textContent = `${victim.name} is IT! ${alivePlayers().filter((p) => !p.it).length} still free!`;
      checkEnd();
      return;
    }
    if (mode === "last") {
      victim.eliminated = true;
      victim.alive = true;
      tagger.tags += 1;
      tagger.escapes += 1;
      poof(victim.x, victim.y, victim.color);
      popup(victim.x, victim.y - 24, "OUT!", "#ff6b6b");
      shake = Math.max(shake, 8);
      const left = alivePlayers();
      message.textContent = `${victim.name} is OUT! ${left.length} remain!`;
      checkEnd();
      return;
    }
    // classic + potato: pass the IT
    const hold = timeElapsed - holdStart;
    if (hold > longestHold) longestHold = hold;
    tagger.it = false;
    tagger.escapes += 1;
    victim.it = true;
    victim.boost = 1.5;
    tagger.tags += 1;
    tagCooldown = 1.0;
    holdStart = timeElapsed;
    burst(victim.x, victim.y, 14, "#ff6b6b");
    popup((tagger.x + victim.x) / 2, (tagger.y + victim.y) / 2 - 26, "TAG!", "#ff6b6b");
    shake = Math.max(shake, 6);
    if (mode === "potato") {
      fuse = 8;
      message.textContent = `${victim.name} has the POTATO! 🥔 Tag someone!`;
    } else {
      message.textContent = `${victim.name} is IT — run!`;
    }
  }

  function checkEnd() {
    const alive = alivePlayers();
    if (mode === "last" || mode === "potato") {
      if (alive.length <= 1) endRound();
    } else if (mode === "infection") {
      const free = alive.filter((p) => !p.it);
      if (free.length === 0) endRound();
    }
  }

  function scoreOf(p) {
    if (mode === "classic") return Math.max(0, Math.round((timeElapsed - p.itTime) * 10));
    return Math.round(p.survived * 10);
  }

  function endRound() {
    if (phase !== "playing") return;
    phase = "over";
    const hold = timeElapsed - holdStart;
    if (hold > longestHold) longestHold = hold;
    const alive = alivePlayers();
    let winner = null;
    let title = "";
    if (mode === "classic") {
      const ranked = [...alive].sort((a, b) => a.itTime - b.itTime);
      winner = ranked[0];
      title = `${winner.name} WINS!`;
    } else if (mode === "last") {
      winner = alive[0] || [...players].sort((a, b) => b.survived - a.survived)[0];
      title = `${winner.name} IS LAST STANDING!`;
    } else if (mode === "infection") {
      const free = alive.filter((p) => !p.it);
      if (free.length) {
        winner = [...free].sort((a, b) => b.survived - a.survived)[0];
        title = `${winner.name} NEVER GOT INFECTED!`;
      } else {
        winner = [...alive].sort((a, b) => b.tags - a.tags)[0];
        title = "EVERYONE IS IT! 🧟";
      }
    } else {
      winner = alive[0] || [...players].sort((a, b) => b.survived - a.survived)[0];
      title = `${winner.name} DIDN'T EXPLODE! 🎉`;
    }
    const me = players[0];
    const myScore = mode === "classic"
      ? Math.max(0, Math.round((timeElapsed - me.itTime) * 10))
      : (winner === me ? 1000 + Math.round(me.survived * 10) : Math.round(me.survived * 10));
    let result = { best: myScore, isNew: false };
    try { result = recordScore("tag", myScore, "high"); } catch (err) {}
    bestSurvived = Math.max(bestSurvived, result.best);
    const table = [...players]
      .sort((a, b) => (mode === "classic" ? a.itTime - b.itTime : b.survived - a.survived))
      .map((p) => `${p === winner ? "👑 " : ""}${p.name}: IT ${p.itTime.toFixed(1)}s · tags ${p.tags} · near ${p.near}`)
      .join(" · ");
    message.textContent = `${title} YOU survived ${me.survived.toFixed(1)}s · IT ${me.itTime.toFixed(1)}s · tags ${me.tags} · escapes ${me.escapes} · near-miss ${me.near} · longest chase ${longestHold.toFixed(1)}s · ${(result.isNew ? "New best " + myScore + "!" : "Best " + result.best + ".")} ${table}`;
    for (const p of players) {
      if (p === winner) poof(p.x, p.y, p.color);
    }
    syncHud();
  }

  // ---------- chaos events ----------
  const EVENT_DEFS = [
    { k: "speed", label: "⚡ SPEED BOOST", dur: 8 },
    { k: "ice", label: "🧊 ICE FLOOR", dur: 10 },
    { k: "wind", label: "🌪️ WIND", dur: 8 },
    { k: "ghost", label: "👻 GHOST MODE", dur: 8 },
    { k: "reverse", label: "🔀 CONTROLS REVERSED", dur: 6 },
    { k: "clones", label: "👯 CLONES!", dur: 10 },
    { k: "invis", label: "🫥 INVISIBILITY", dur: 8 }
  ];

  function fireEvent() {
    const def = EVENT_DEFS[Math.floor(Math.random() * EVENT_DEFS.length)];
    events[def.k] = def.dur;
    eventLabel = def.label;
    if (def.k === "wind") wind.ang = Math.random() * Math.PI * 2;
    if (def.k === "clones") {
      clones = [];
      for (const p of alivePlayers()) {
        for (let i = 0; i < 2; i++) {
          clones.push({ x: p.x + (Math.random() - 0.5) * 120, y: p.y + (Math.random() - 0.5) * 120, vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.5) * 120, color: p.color, ph: Math.random() * 6 });
        }
      }
    }
    message.textContent = `${def.label}!`;
    popup(W / 2, H / 2 - 40, def.label, "#f6c445");
  }

  // ---------- update ----------
  function syncHud() {
    timeEl.textContent = phase === "playing" ? `${timeLeft.toFixed(1)}s` : mode.toUpperCase();
    itEl.textContent = `IT: ${phase === "ready" ? "—" : itNames()}`;
    const act = Object.keys(events).filter((k) => events[k] > 0);
    eventEl.textContent = act.length ? eventLabel : "Calm";
    bestEl.textContent = `Best: ${bestSurvived || "—"}`;
    const me = players[0];
    setSnapshot({
      mode: phase === "playing" ? "playing" : phase === "over" ? "ended" : "ready",
      game: "Trinkets Tag",
      tagMode: mode,
      arena,
      time: Math.max(0, Number(timeLeft.toFixed(1))),
      it: itPlayers().map((p) => p.name),
      score: me ? scoreOf(me) : 0,
      survived: me ? Number(me.survived.toFixed(1)) : 0,
      tags: me ? me.tags : 0,
      event: eventLabel
    });
  }

  function update(dt) {
    time += dt;
    shake = Math.max(0, shake - dt * 26);
    for (const p of particles) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.94; p.vy *= 0.94;
      p.life -= dt;
    }
    particles = particles.filter((p) => p.life > 0);
    for (const p of popups) { p.y -= 40 * dt; p.life -= dt; }
    popups = popups.filter((p) => p.life > 0);
    for (const c of confetti) {
      c.x += c.vx * dt; c.y += c.vy * dt;
      c.vy += 500 * dt; c.rot += dt * 6; c.life -= dt;
    }
    confetti = confetti.filter((c) => c.life > 0);
    for (const k of Object.keys(nearCd)) {
      nearCd[k] -= dt;
      if (nearCd[k] <= 0) delete nearCd[k];
    }

    if (phase !== "playing") return;

    timeLeft -= dt;
    timeElapsed += dt;
    if (tagCooldown > 0) tagCooldown -= dt;

    // movers
    for (const o of obstacles) {
      if (o.mx) o.x = o.homeX + Math.sin(time * o.spd + o.ph) * o.range;
      if (o.my) o.y = Math.max(0, o.homeY + Math.sin(time * o.spd + o.ph) * o.range * 0.6);
    }

    // chaos scheduler
    if (chaosOn) {
      eventTimer -= dt;
      if (eventTimer <= 0) {
        eventTimer = 10 + Math.random() * 6;
        fireEvent();
      }
    }
    for (const k of Object.keys(events)) {
      if (events[k] > 0) { events[k] -= dt; if (events[k] <= 0) { events[k] = 0; if (k === "clones") clones = []; } }
    }
    if (!Object.values(events).some((v) => v > 0)) eventLabel = "Calm";

    if (events.wind > 0) {
      wind.ang += dt * 0.7;
      wind.x = Math.cos(wind.ang) * 130;
      wind.y = Math.sin(wind.ang) * 130;
    }

    const slide = icy || events.ice > 0;
    const spdMul = (events.speed > 0 ? 1.3 : 1) * (arena === "chaos" ? 1.08 : 1);
    const BASE = 215;

    const twoHuman = p2slot === "human";
    // human dirs
    let h1 = { x: 0, y: 0 };
    if (twoHuman) {
      if (keys.has("w")) h1.y -= 1;
      if (keys.has("s")) h1.y += 1;
      if (keys.has("a")) h1.x -= 1;
      if (keys.has("d")) h1.x += 1;
    } else {
      if (keys.has("w") || keys.has("arrowup")) h1.y -= 1;
      if (keys.has("s") || keys.has("arrowdown")) h1.y += 1;
      if (keys.has("a") || keys.has("arrowleft")) h1.x -= 1;
      if (keys.has("d") || keys.has("arrowright")) h1.x += 1;
    }
    let h2 = { x: 0, y: 0 };
    if (twoHuman) {
      if (keys.has("arrowup")) h2.y -= 1;
      if (keys.has("arrowdown")) h2.y += 1;
      if (keys.has("arrowleft")) h2.x -= 1;
      if (keys.has("arrowright")) h2.x += 1;
    }
    if (events.reverse > 0) { h1 = { x: -h1.x, y: -h1.y }; h2 = { x: -h2.x, y: -h2.y }; }
    if (pointer.active && players[0] && !players[0].eliminated) {
      const me = players[0];
      const dx = pointer.x - me.x, dy = pointer.y - me.y;
      if (Math.hypot(dx, dy) > 14) {
        const m = Math.hypot(dx, dy);
        h1 = { x: dx / m, y: dy / m };
        if (events.reverse > 0) h1 = { x: -h1.x, y: -h1.y };
      } else if (!twoHuman && h1.x === 0 && h1.y === 0) {
        h1 = { x: 0, y: 0 };
      }
    }

    for (const p of players) {
      if (p.eliminated) continue;
      let dir;
      if (p.human === "p1") dir = h1;
      else if (p.human === "p2") dir = h2;
      else { botThink(p, dt); dir = { ...p.aiDir }; if (events.reverse > 0 && Math.random() < 0.02) dir = { x: -dir.x, y: -dir.y }; }
      const m = Math.hypot(dir.x, dir.y);
      if (m > 1) { dir.x /= m; dir.y /= m; }
      let sp = BASE * spdMul;
      if (p.bot === "runner" && !p.it) sp *= 1.0;
      if (p.bot === "chaser" && p.it) sp *= 1.04;
      if (p.it) sp *= 0.985; // IT a hair slower so corners matter…
      if (p.boost > 0) { sp *= 1.35; p.boost -= dt; } // …but fresh tags burst
      if (slide) {
        const k = Math.min(1, dt * 3.2);
        p.vx += (dir.x * sp - p.vx) * k;
        p.vy += (dir.y * sp - p.vy) * k;
      } else {
        const k = Math.min(1, dt * 12);
        p.vx += (dir.x * sp - p.vx) * k;
        p.vy += (dir.y * sp - p.vy) * k;
      }
      if (events.wind > 0) { p.vx += wind.x * dt; p.vy += wind.y * dt; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.x = Math.max(PR + 4, Math.min(W - PR - 4, p.x));
      p.y = Math.max(PR + 4, Math.min(H - PR - 4, p.y));
      collideWalls(p);
      p.dist += Math.hypot(p.vx, p.vy) * dt;
      if (p.it) p.itTime += dt;
      else p.survived += dt;
    }

    // clones drift
    for (const c of clones) {
      c.ph += dt * 3;
      c.x += (c.vx + Math.cos(c.ph) * 30) * dt;
      c.y += (c.vy + Math.sin(c.ph) * 30) * dt;
      if (c.x < 20 || c.x > W - 20) c.vx *= -1;
      if (c.y < 20 || c.y > H - 20) c.vy *= -1;
    }

    // near misses
    const its = itPlayers();
    for (const t of its) {
      for (const q of alivePlayers()) {
        if (q === t || q.it) continue;
        const d = dist(t, q);
        const key = t.idx + "-" + q.idx;
        if (d < PR * 2 + 24 && d >= PR * 2 + 2 && !nearCd[key]) {
          nearCd[key] = 2.5;
          q.near += 1;
          popup((t.x + q.x) / 2, (t.y + q.y) / 2 - 20, "CLOSE!", "#74c0fc");
        }
      }
    }

    // tags
    if (tagCooldown <= 0) {
      for (const t of its) {
        for (const q of alivePlayers()) {
          if (q === t) continue;
          if (mode === "infection" && q.it) continue;
          if (mode !== "infection" && q.it) continue;
          if (q.eliminated) continue;
          if (dist(t, q) < PR * 2 + 2) {
            doTag(t, q);
            tagCooldown = Math.max(tagCooldown, 0.6);
            break;
          }
        }
        if (tagCooldown > 0.5) break;
      }
    }

    // hot potato fuse
    if (mode === "potato") {
      fuse -= dt;
      const holder = itPlayers()[0];
      if (fuse <= 0 && holder) {
        holder.eliminated = true;
        poof(holder.x, holder.y, "#f6c445");
        popup(holder.x, holder.y - 26, "POP! 🫧", "#f6c445");
        shake = 10;
        message.textContent = `${holder.name} EXPLODED into confetti! 🫧`;
        const rest = alivePlayers();
        if (rest.length <= 1) { endRound(); return; }
        rest[0].it = true;
        rest[0].boost = 1.2;
        fuse = 8;
        tagCooldown = 1;
      }
    }

    // infection trickle: none — tags only

    if (timeLeft <= 0) {
      timeLeft = 0;
      endRound();
      return;
    }
    syncHudThrottled();
  }

  let hudT = 0;
  function syncHudThrottled() {
    hudT += 1;
    if (hudT % 8 === 0) syncHud();
    else {
      timeEl.textContent = `${Math.max(0, timeLeft).toFixed(1)}s`;
      itEl.textContent = `IT: ${itNames()}`;
    }
  }

  // ---------- draw ----------
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // floor
    const g = ctx.createLinearGradient(0, 0, 0, H);
    if (arena === "ice" || events.ice > 0) {
      g.addColorStop(0, "#d0ebff"); g.addColorStop(1, "#a5d8ff");
    } else if (arena === "chaos") {
      g.addColorStop(0, "#241d4d"); g.addColorStop(1, "#3b2d7a");
    } else if (arena === "park") {
      g.addColorStop(0, "#d3f9d8"); g.addColorStop(1, "#8ce99a");
    } else {
      g.addColorStop(0, "#fff8ea"); g.addColorStop(1, "#f5e6c4");
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

    // grid dots
    ctx.fillStyle = arena === "chaos" ? "rgba(255,255,255,0.15)" : "rgba(25,33,43,0.08)";
    for (let gx = 30; gx < W; gx += 44) {
      for (let gy = 30; gy < H; gy += 44) {
        ctx.fillRect(gx, gy, 2.5, 2.5);
      }
    }

    // obstacles
    for (const o of obstacles) {
      ctx.fillStyle = o.tree ? "#2b8a3e" : "#27313f";
      ctx.strokeStyle = "#10151d";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(o.x, o.y, o.w, o.h, o.tree ? 16 : 6);
      ctx.fill();
      ctx.stroke();
      if (o.tree) {
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.beginPath();
        ctx.arc(o.x + o.w * 0.35, o.y + o.h * 0.3, Math.min(o.w, o.h) * 0.18, 0, Math.PI * 2);
        ctx.fill();
      }
      if (o.mx || o.my) {
        ctx.fillStyle = "#f6c445";
        ctx.fillRect(o.x + 6, o.y + 6, o.w - 12, 4);
      }
    }

    // wind arrow
    if (events.wind > 0) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = "#74c0fc";
      ctx.lineWidth = 4;
      for (let i = 0; i < 5; i++) {
        const x = ((i * 173 + time * 90) % (W + 80)) - 40;
        const y = 60 + i * 90;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(wind.ang) * 40, y + Math.sin(wind.ang) * 40);
        ctx.stroke();
      }
      ctx.restore();
    }

    // clones
    if (events.clones > 0) {
      for (const c of clones) {
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.arc(c.x, c.y, PR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    const invis = events.invis > 0;

    // players
    for (const p of players) {
      if (p.eliminated) continue; // out: gone (confetti said goodbye)
      const flicker = phase === "ready" ? 0.75 + Math.sin(time * 3 + p.idx) * 0.25 : 1;
      // shadow always visible (even in invisibility — "except their shadows")
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + PR - 2, PR * 0.9, PR * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      if (invis && !p.it) continue; // only shadow remains
      ctx.globalAlpha = flicker;
      // IT ring
      if (p.it) {
        ctx.strokeStyle = "#ff6b6b";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, PR + 5 + Math.sin(time * 6) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      // body
      ctx.fillStyle = p.it ? "#ff6b6b" : p.color;
      ctx.strokeStyle = "#10151d";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, PR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // eyes look along velocity
      const sp = Math.hypot(p.vx, p.vy);
      const ex = sp > 20 ? p.vx / sp : 0, ey = sp > 20 ? p.vy / sp : 0;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(p.x - 4 + ex * 3, p.y - 2 + ey * 3, 3.6, 0, Math.PI * 2);
      ctx.arc(p.x + 4 + ex * 3, p.y - 2 + ey * 3, 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#10151d";
      ctx.beginPath();
      ctx.arc(p.x - 4 + ex * 5, p.y - 2 + ey * 5, 1.7, 0, Math.PI * 2);
      ctx.arc(p.x + 4 + ex * 5, p.y - 2 + ey * 5, 1.7, 0, Math.PI * 2);
      ctx.fill();
      // labels
      ctx.fillStyle = p.it ? "#c92a2a" : "#27313f";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(p.it ? "IT: " + p.name : p.name, p.x, p.y - PR - 8);
      if (p.boost > 0) {
        ctx.fillStyle = "#f6c445";
        ctx.font = "bold 13px sans-serif";
        ctx.fillText("💨", p.x + PR + 8, p.y);
      }
      ctx.globalAlpha = 1;
    }

    // particles / popups / confetti
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const c of confetti) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.globalAlpha = Math.max(0, Math.min(1, c.life));
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.6);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "center";
    for (const p of popups) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.font = "bold 20px monospace";
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillText(p.text, p.x + 2, p.y + 2);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;

    // fuse bar (hot potato)
    if (mode === "potato" && phase === "playing") {
      const holder = itPlayers()[0];
      if (holder) {
        const bw = 300;
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.beginPath();
        ctx.roundRect(W / 2 - bw / 2, 12, bw, 16, 8);
        ctx.fill();
        ctx.fillStyle = fuse < 2.5 ? "#ff6b6b" : "#f6c445";
        ctx.beginPath();
        ctx.roundRect(W / 2 - bw / 2, 12, bw * Math.max(0, fuse / 8), 16, 8);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText("🥔 " + fuse.toFixed(1) + "s", W / 2, 25);
      }
    }

    // event banner
    if (eventLabel !== "Calm" && phase === "playing") {
      ctx.font = "bold 20px sans-serif";
      const tw = ctx.measureText(eventLabel).width + 40;
      ctx.fillStyle = "rgba(12,10,20,0.8)";
      ctx.beginPath();
      ctx.roundRect(W / 2 - tw / 2, 40, tw, 36, 10);
      ctx.fill();
      ctx.fillStyle = "#f6c445";
      ctx.fillText(eventLabel, W / 2, 64);
    }

    // ready / over overlays
    if (phase === "ready") {
      ctx.fillStyle = "rgba(10,12,24,0.62)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff8ea";
      ctx.font = "bold 54px sans-serif";
      ctx.fillText("DON'T BE IT", W / 2, H / 2 - 40);
      ctx.font = "bold 18px sans-serif";
      ctx.fillStyle = "#f6c445";
      const modeHelp = {
        classic: "Classic 60s — least time as IT wins.",
        last: "Last Standing — tagged = OUT. Survive.",
        infection: "Infection — tagged = IT. Don't get caught.",
        potato: "Hot Potato — pass it in 8s or POP! 🥔🫧"
      };
      ctx.fillText(modeHelp[mode] || "", W / 2, H / 2 - 6);
      ctx.fillStyle = "#fff8ea";
      ctx.font = "15px sans-serif";
      ctx.fillText(p2slot === "human" ? "P1: WASD · P2: Arrows · solo: both work + drag" : "WASD / Arrows / drag to run", W / 2, H / 2 + 22);
      ctx.fillStyle = "#43c6ac";
      ctx.font = "bold 17px sans-serif";
      ctx.fillText("— press START —", W / 2, H / 2 + 52);
    }
    if (phase === "over") {
      ctx.fillStyle = "rgba(10,8,16,0.45)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.fillStyle = "#f6c445";
      ctx.font = "bold 46px sans-serif";
      ctx.fillText("TIME!", W / 2, H / 2 - 8);
      ctx.fillStyle = "#fff8ea";
      ctx.font = "bold 17px sans-serif";
      const me = players[0];
      ctx.fillText(`YOU survived ${me.survived.toFixed(1)}s · IT ${me.itTime.toFixed(1)}s · tags ${me.tags}`, W / 2, H / 2 + 26);
    }

    ctx.restore();

    timeEl.textContent = phase === "playing" ? `${Math.max(0, timeLeft).toFixed(1)}s` : mode.toUpperCase();
  }

  function tick(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    raf = requestAnimationFrame(tick);
  }

  // ---------- input ----------
  function keydown(e) {
    const k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
    keys.add(k);
    if (e.repeat) return;
    if ((k === "enter" || k === " ") && phase !== "playing") startPressed();
  }
  function keyup(e) {
    keys.delete(e.key.toLowerCase());
  }
  function canvasPos(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * W,
      y: ((e.clientY - r.top) / r.height) * H
    };
  }
  function pointerdown(e) {
    const p = canvasPos(e);
    pointer = { active: true, x: p.x, y: p.y };
    if (phase !== "playing") startPressed();
  }
  function pointermove(e) {
    if (!pointer.active) return;
    if (e.buttons === 0 && e.type === "mousemove") return;
    const p = canvasPos(e);
    pointer.x = p.x; pointer.y = p.y;
  }
  function pointerup() {
    pointer.active = false;
  }

  function startPressed() {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    resetRound();
  }

  document.querySelector("#tagStart").addEventListener("click", startPressed);
  document.querySelector("#tagRestart").addEventListener("click", startPressed);
  document.addEventListener("keydown", keydown);
  document.addEventListener("keyup", keyup);
  canvas.addEventListener("pointerdown", pointerdown);
  canvas.addEventListener("pointermove", pointermove);
  window.addEventListener("pointerup", pointerup);
  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    const t = e.touches[0];
    if (t) {
      const r = canvas.getBoundingClientRect();
      pointer = { active: true, x: ((t.clientX - r.left) / r.width) * W, y: ((t.clientY - r.top) / r.height) * H };
    }
  }, { passive: false });
  canvas.addEventListener("touchend", pointerup);

  // idle attract mode behind the setup screen
  (function attract() {
    const a = buildArena(arena);
    obstacles = a.obs;
    icy = a.ice;
    players = buildPlayers();
    phase = "ready";
    syncHud();
  })();

  setSnapshot({ mode: "ready", game: "Trinkets Tag", tagMode: mode, arena, time: roundTime(), it: [], score: 0, survived: 0, tags: 0, event: "Calm" });
  activeAdvance = (ms) => {
    const steps = Math.max(1, Math.round(ms / 16));
    for (let i = 0; i < steps; i++) update(1 / 60);
    draw();
  };
  activeCleanup = () => {
    cancelAnimationFrame(raf);
    document.removeEventListener("keydown", keydown);
    document.removeEventListener("keyup", keyup);
    window.removeEventListener("pointerup", pointerup);
  };
  last = performance.now();
  raf = requestAnimationFrame(tick);
}

Object.assign(gameStarters, { tag: startTrinketsTag });
