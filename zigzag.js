function startZigzag() {
  openGame(
    "Zigzag",
    "Arcade",
    `
      <div class="game-layout">
        <div class="game-topline">
          <span class="game-stat" id="zgDist">0 m</span>
          <span class="game-stat" id="zgP2Dist" style="display:none">P2: 0 m</span>
          <span class="game-stat" id="zgScore">Score: 0</span>
          <span class="game-stat" id="zgCoins">Coins: 0</span>
          <span class="game-stat" id="zgBest">Best: 0 m</span>
        </div>
        <div class="tag-row" role="group" aria-label="Players">
          <span class="tag-label">Players</span>
          <button class="game-action tag-pick on" id="zg1P" type="button">1 Player</button>
          <button class="game-action tag-pick" id="zg2P" type="button" title="P1: SPACE/W or HOLD (P1) · P2: ↑ or HOLD (P2) — last plane flying wins">2 Players</button>
        </div>
        <canvas class="zigzag-canvas" id="zgCanvas" width="720" height="480"></canvas>
        <p class="game-message" id="zgMsg">HOLD to rise · RELEASE to dive. Thread the gaps, don't touch the walls.</p>
        <div class="zg-shop" id="zgShop" aria-label="Plane shop"></div>
        <div class="game-actions">
          <button class="game-action one-press" id="zgHold" type="button">HOLD (P1)</button>
          <button class="game-action one-press" id="zgHold2" type="button" style="display:none">HOLD (P2)</button>
          <button class="game-action" id="zgRetry" type="button">Restart</button>
        </div>
      </div>
    `
  );

  const canvas = document.querySelector("#zgCanvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const PX = 180;      // player screen x (world scrolls past)
  const PR = 11;       // player collision radius
  const MID = H / 2;
  const STEP = 14;     // wall sampling step for render/collision

  const distEl = document.querySelector("#zgDist");
  const p2DistEl = document.querySelector("#zgP2Dist");
  const scoreEl = document.querySelector("#zgScore");
  const coinsEl = document.querySelector("#zgCoins");
  const bestEl = document.querySelector("#zgBest");
  const message = document.querySelector("#zgMsg");
  const holdBtn = document.querySelector("#zgHold");
  const holdBtn2 = document.querySelector("#zgHold2");
  const shopEl = document.querySelector("#zgShop");

  // --- 2P: last plane flying wins. Shared world, two altitudes. ---
  let twoP = false;
  let alive1 = true;
  let alive2 = false;
  let playerY2 = MID + 40;
  let vy2 = 0;
  let holding2 = false;
  let trail2 = [];
  let graze2 = 0;
  let distAtDeath1 = 0;
  let distAtDeath2 = 0;
  let score2 = 0;
  let coins2 = 0;
  const PX1 = 150;
  const PX2 = 210;
  function pxFor(i) { return i === 1 ? PX2 : (twoP ? PX1 : PX); }

  function setTwoP(on) {
    twoP = on;
    document.querySelector("#zg1P").classList.toggle("on", !on);
    document.querySelector("#zg2P").classList.toggle("on", on);
    p2DistEl.style.display = on ? "" : "none";
    holdBtn.textContent = on ? "HOLD (P1)" : "HOLD TO RISE";
    holdBtn2.style.display = on ? "" : "none";
    resetRun(true);
    message.textContent = on
      ? "P1: SPACE/W or HOLD (P1) · P2: ↑ or HOLD (P2). Last plane wins!"
      : "HOLD to rise · RELEASE to dive. Thread the gaps, don't touch the walls.";
    syncHud();
  }
  document.querySelector("#zg1P").addEventListener("click", () => setTwoP(false));
  document.querySelector("#zg2P").addEventListener("click", () => setTwoP(true));

  const QUIPS = [
    "Bonk. The wall sends regards.",
    "Threaded like a needle. Into a wall.",
    "So smooth. Then so flat.",
    "The gap was right there. Was.",
    "That wall was load-bearing. For you.",
    "Gravity always wins. Especially inverted."
  ];
  const EXTRA_KEY = "trinkets-zigzag-extra";

  let best = 0;
  let bestScore = 0;
  let bestCoins = 0;
  try {
    best = Number((readScores() || {}).zigzag) || 0;
    const extra = JSON.parse(localStorage.getItem(EXTRA_KEY));
    if (extra && typeof extra === "object") {
      bestScore = Number(extra.score) || 0;
      bestCoins = Number(extra.coins) || 0;
    }
  } catch (err) {}

  let raf = 0;
  let last = performance.now();
  let mode = "ready"; // ready | playing | dead
  let time = 0;
  let worldX = 0;
  let playerY = MID;
  let vy = 0;
  let holding = false;
  let speed = 265;
  let score = 0;
  let coinsGot = 0;
  let perfects = 0;
  let grazeAcc = 0;
  let segs = [];
  let divs = [];   // divider bars for fake-lane splits {x1,x2,y,h,blockTop}
  let teeth = [];  // wall spikes {wx,side}
  let coins = [];  // {wx,y,taken,phase}
  let particles = [];
  let popups = [];
  let trail = [];
  let genX = 0;
  let stageIdx = 0;
  let playerSegIdx = -1;
  let shake = 0;
  let flash = 0;
  let deadAge = 0;
  let banner = null;
  let shown = {};
  let dustT = 0;

  function distM() {
    return Math.floor(worldX / 50);
  }

  function leadScore() { return Math.max(score, twoP ? score2 : 0); }

  function saveExtra() {
    try {
      localStorage.setItem(EXTRA_KEY, JSON.stringify({ score: bestScore, coins: bestCoins }));
    } catch (err) {}
  }

  // --- plane shop: collected coins are the currency ---
  const SKINS = [
    { id: "sunny", name: "Sunny", cost: 0, dot: "#f59f00", hi: "#ffe066", lo: "#f59f00", trail: "246,196,69" },
    { id: "minty", name: "Minty", cost: 30, dot: "#2f9e44", hi: "#b2f2bb", lo: "#2f9e44", trail: "105,219,124" },
    { id: "berry", name: "Berry", cost: 70, dot: "#e64980", hi: "#ffc2d4", lo: "#d6336c", trail: "247,131,172" },
    { id: "splash", name: "Splash", cost: 140, dot: "#1971c2", hi: "#a5d8ff", lo: "#1971c2", trail: "77,171,247" },
    { id: "dusk", name: "Dusk", cost: 220, dot: "#7048e8", hi: "#d0bfff", lo: "#6741d9", trail: "177,151,252" },
    { id: "ghost", name: "Ghost", cost: 350, dot: "#868e96", hi: "#ffffff", lo: "#adb5bd", trail: "248,249,250" }
  ];
  const SHOP_KEY = "trinkets-zigzag-shop-v1";
  let shop = { bank: 0, owned: ["sunny"], selected: "sunny" };
  try {
    const raw = JSON.parse(localStorage.getItem(SHOP_KEY));
    if (raw && typeof raw === "object") {
      if (typeof raw.bank === "number" && raw.bank >= 0) shop.bank = Math.floor(raw.bank);
      if (Array.isArray(raw.owned)) shop.owned = raw.owned.filter((id) => SKINS.some((s) => s.id === id));
      if (typeof raw.selected === "string" && shop.owned.includes(raw.selected)) shop.selected = raw.selected;
    }
  } catch (err) {}
  if (!shop.owned.includes("sunny")) shop.owned.unshift("sunny");

  function saveShop() {
    try {
      localStorage.setItem(SHOP_KEY, JSON.stringify(shop));
    } catch (err) {}
  }

  function skin() {
    return SKINS.find((s) => s.id === shop.selected) || SKINS[0];
  }

  function renderShop() {
    if (!shopEl.isConnected) return;
    shopEl.innerHTML = "";
    for (const s of SKINS) {
      const owned = shop.owned.includes(s.id);
      const selected = shop.selected === s.id;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "zg-skin" + (selected ? " selected" : "") + (!owned && shop.bank < s.cost ? " locked" : "");
      const tag = selected ? "flying" : owned ? "owned" : `${s.cost} coins`;
      btn.innerHTML = `<span class="dot" style="background:${s.dot}"></span>${s.name} · ${tag}`;
      btn.title = selected ? `${s.name} is equipped` : owned ? `Fly the ${s.name} plane` : `Unlock ${s.name} for ${s.cost} coins`;
      btn.setAttribute("aria-label", btn.title);
      btn.addEventListener("click", () => shopAction(s.id));
      shopEl.append(btn);
    }
  }

  function shopAction(id) {
    const s = SKINS.find((x) => x.id === id);
    if (!s) return;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (shop.selected === id) {
      message.textContent = `Already flying ${s.name}.`;
      return;
    }
    if (shop.owned.includes(id)) {
      shop.selected = id;
      saveShop();
      renderShop();
      message.textContent = `${s.name} equipped. Looking sharp.`;
      return;
    }
    if (shop.bank >= s.cost) {
      shop.bank -= s.cost;
      shop.owned.push(id);
      shop.selected = id;
      saveShop();
      renderShop();
      syncHud();
      burst(PX, playerY, 16, s.trail, 200);
      showBanner(`${s.name.toUpperCase()} UNLOCKED!`);
      message.textContent = `${s.name} unlocked and equipped!`;
    } else {
      message.textContent = `${s.name} costs ${s.cost} coins — bank has ${shop.bank}. Grab ${s.cost - shop.bank} more.`;
    }
  }

  // --- cheat code: Ctrl+F3 arms it, then type the magic words ---
  const CHEAT_CODE = "opensesame";
  const CHEAT_BANK = 999999;
  let cheatArmed = false;
  let cheatBuffer = "";

  function removeCheatPopup() {
    const popup = document.querySelector("#zgCheatPopup");
    if (popup) popup.remove();
  }

  function openCheatPopup() {
    if (document.querySelector("#zgCheatPopup")) return;
    const panel = document.querySelector(".modal-panel");
    if (!panel) return;
    const popup = document.createElement("div");
    popup.id = "zgCheatPopup";
    popup.className = "fl-cheat-overlay";
    popup.innerHTML = `<div class="fl-cheat-box" role="dialog" aria-modal="true" aria-label="Cheat confirmation">
      <p class="fl-cheat-text">Are you sure you want to ruin the fun?</p>
      <div class="fl-cheat-row">
        <button class="game-action fl-cheat-yes" type="button">Ruin it</button>
        <button class="game-action fl-cheat-no" type="button">Keep it fun</button>
      </div>
    </div>`;
    panel.append(popup);
    popup.addEventListener("click", (ev) => { if (ev.target === popup) cancelCheat(); });
    popup.querySelector(".fl-cheat-yes").addEventListener("click", confirmCheat);
    popup.querySelector(".fl-cheat-no").addEventListener("click", cancelCheat);
    popup.querySelector(".fl-cheat-no").focus();
  }

  function confirmCheat() {
    shop.bank = CHEAT_BANK;
    shop.owned = SKINS.map((s) => s.id);
    shop.selected = "ghost";
    saveShop();
    renderShop();
    syncHud();
    removeCheatPopup();
    burst(PX, playerY, 26, "#f6c445", 300);
    showBanner("OPEN SESAME");
    message.textContent = "Mischief managed: endless coins, every plane. Ghost leads the fleet.";
  }

  function cancelCheat() {
    removeCheatPopup();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    message.textContent = "Phew. The fun survives another day.";
  }

  function cheatKeydown(e) {
    if (e.key === "F3" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (e.repeat) return;
      cheatArmed = true;
      cheatBuffer = "";
      message.textContent = "Cheat armed. Type the magic words…";
      return;
    }
    if (!cheatArmed || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (!shopEl.isConnected || document.querySelector("#zgCheatPopup")) return;
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (typeof e.key !== "string" || e.key.length !== 1) return;
    cheatBuffer = (cheatBuffer + e.key.toLowerCase()).slice(-80);
    if (cheatBuffer.endsWith(CHEAT_CODE)) {
      cheatArmed = false;
      cheatBuffer = "";
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      openCheatPopup();
    }
  }

  function showBanner(text) {
    banner = { text, t: 1.8 };
  }

  function burst(x, y, n, color, spread) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * (spread || 220);
      particles.push({
        x, y,
        vx: Math.cos(a) * sp - speed * 0.3,
        vy: Math.sin(a) * sp,
        life: 0.55 + Math.random() * 0.3,
        max: 0.85,
        color,
        size: 2 + Math.random() * 3
      });
    }
  }

  function popup(x, y, text, color) {
    popups.push({ x, y, text, color, life: 1.1, max: 1.1 });
  }

  // ---------- procedural tunnel ----------
  // A segment: straight corridor around center c with half-height h,
  // optional sine/triangle slalom on top, optional breathing walls,
  // optional control inversion, optional speed boost.
  function shapeOff(seg, dx) {
    if (!seg.shape) return 0;
    if (seg.shape.type === "sine") {
      return seg.shape.amp * Math.sin((dx / seg.shape.period) * Math.PI * 2);
    }
    if (seg.shape.type === "tri") {
      const p = (dx % seg.shape.period) / seg.shape.period; // 0..1
      const tri = p < 0.5 ? p * 4 - 1 : 3 - p * 4;           // -1..1..-1
      return seg.shape.amp * tri;
    }
    return 0;
  }

  function segEndCenter(seg) {
    return seg.c + shapeOff(seg, seg.len);
  }

  function pushSeg(opts) {
    const prev = segs.length ? segs[segs.length - 1] : null;
    const seg = {
      x0: genX,
      len: opts.len || 640,
      c: opts.c !== undefined ? opts.c : (prev ? segEndCenter(prev) : MID),
      h: opts.h !== undefined ? opts.h : 100,
      shape: opts.shape || null,
      moveAmp: opts.moveAmp || 0,
      moveFreq: opts.moveFreq || 2.4,
      slosh: !!opts.slosh,
      invert: !!opts.invert,
      fast: !!opts.fast,
      label: opts.label || "",
      hint: opts.hint || ""
    };
    // continuity: start near where the previous corridor ended, drifting back to middle
    if (opts.c === undefined && prev) {
      seg.c = MID + (segEndCenter(prev) - MID) * 0.6;
    }
    // keep the tunnel on screen: clamp center so walls stay inside canvas
    const margin = seg.h + 30;
    seg.c = Math.max(margin, Math.min(H - margin, seg.c));
    segs.push(seg);
    genX += seg.len;

    // coins along the corridor
    const nCoins = opts.coins !== undefined ? opts.coins : 3;
    for (let i = 0; i < nCoins; i++) {
      const wx = seg.x0 + seg.len * ((i + 1) / (nCoins + 1));
      let y = seg.c + shapeOff(seg, wx - seg.x0) + (opts.coinOff || 0);
      if (opts.coinRisky) y = seg.c + shapeOff(seg, wx - seg.x0) - seg.h + 24;
      coins.push({ wx, y, taken: false, phase: Math.random() * Math.PI * 2 });
    }
    // teeth spikes alternating off the walls
    if (opts.teeth) {
      const n = Math.max(2, Math.floor(seg.len / 130));
      for (let i = 0; i < n; i++) {
        teeth.push({
          wx: seg.x0 + 90 + i * ((seg.len - 140) / Math.max(1, n - 1)),
          side: i % 2 === 0 ? 1 : -1,
          size: opts.teethSize || 26
        });
      }
    }
    // fake-lane split: a mid divider, one lane dead-ends at a cap wall
    if (opts.split) {
      const blockTop = Math.random() < 0.5;
      const y = seg.c;
      const x1 = seg.x0 + 130;
      const x2 = seg.x0 + seg.len - 110;
      divs.push({ x1, x2, y, h: 18, blockTop });
      // coin guide down the OPEN lane; one bait coin deep in the trap lane
      const openY = blockTop ? y + 62 : y - 62;
      const trapY = blockTop ? y - 62 : y + 62;
      for (let i = 0; i < 4; i++) {
        coins.push({
          wx: x1 + 70 + (i * (x2 - x1 - 140)) / 3,
          y: openY,
          taken: false,
          phase: Math.random() * Math.PI * 2
        });
      }
      coins.push({ wx: x2 - 60, y: trapY, taken: false, phase: 0, bait: true });
    }
    return seg;
  }

  function scriptedStage(i) {
    const builders = [
      () => pushSeg({ h: 112, len: 640, label: "STRAIGHT", hint: "Hold to rise · release to dive. Cruise it.", coins: 3 }),
      () => pushSeg({ h: 80, len: 620, label: "NARROWING", hint: "Corridor tightens. Small fingers.", coins: 3 }),
      () => pushSeg({ h: 86, len: 700, shape: { type: "sine", amp: 70, period: 600 }, label: "S-BENDS", hint: "Ride the curves — feather your holds.", coins: 3 }),
      () => pushSeg({ h: 80, len: 720, shape: { type: "tri", amp: 70, period: 380 }, label: "ZIGZAG!", hint: "Rapid flips! Tap-tap-tap.", coins: 3, teeth: true, teethSize: 24 }),
      () => pushSeg({ h: 92, len: 680, moveAmp: 24, moveFreq: 2.4, label: "MOVING WALLS", hint: "The walls breathe. Time the squeeze.", coins: 3 }),
      () => pushSeg({ h: 95, len: 700, fast: true, label: "SPEED UP", hint: "Reaction time: gone. Good luck.", coins: 3 }),
      () => pushSeg({ h: 95, len: 600, invert: true, label: "INVERTED", hint: "Controls flipped! Hold to DIVE.", coins: 3 }),
      () => pushSeg({ h: 130, len: 640, split: true, label: "PICK A LANE", hint: "One lane is a trap — follow the coins, mind the skull.", coins: 0 }),
      () => pushSeg({ h: 68, len: 620, coinRisky: true, label: "RISK PAYS", hint: "Coins hug the wall. Graze them for bonus.", coins: 5 })
    ];
    return builders[i % builders.length]();
  }

  function endlessStage(d) {
    // difficulty ramps: gaps shrink, walls get livelier
    const hBase = Math.max(54, 96 - d * 0.045);
    const roll = Math.random();
    const len = 560 + Math.random() * 200;
    if (roll < 0.16) {
      return pushSeg({ h: Math.max(50, hBase - 12), len, label: "THREAD IT", hint: "Tiny gaps. Breathe out.", coins: 3 });
    } else if (roll < 0.30) {
      return pushSeg({ h: hBase + 4, len, shape: { type: "sine", amp: 50 + Math.random() * 20, period: 560 + Math.random() * 160 }, label: "S-BENDS", hint: "Ride the curves.", coins: 3 });
    } else if (roll < 0.43) {
      return pushSeg({ h: hBase + 2, len, shape: { type: "tri", amp: 55 + Math.random() * 15, period: 360 + Math.random() * 80 }, label: "ZIGZAG!", hint: "Rapid flips!", coins: 3, teeth: true, teethSize: 24 });
    } else if (roll < 0.55) {
      return pushSeg({ h: hBase + 16, len, moveAmp: 18 + Math.random() * 10, moveFreq: 2.2 + Math.random() * 1.2, slosh: Math.random() < 0.5, label: "MOVING WALLS", hint: "The safe path changes.", coins: 3 });
    } else if (roll < 0.65) {
      return pushSeg({ h: hBase + 10, len: len - 60, invert: true, label: "INVERTED", hint: "Hold to DIVE. Don't think, feel.", coins: 3 });
    } else if (roll < 0.76) {
      return pushSeg({ h: 122, len, split: true, label: "PICK A LANE", hint: "One lane is a trap.", coins: 0 });
    } else if (roll < 0.88) {
      return pushSeg({ h: Math.max(52, hBase - 6), len, coinRisky: true, label: "RISK PAYS", hint: "Risky coins. Graze for bonus.", coins: 5 });
    }
    return pushSeg({ h: hBase + 8, len, fast: true, label: "SPEED UP", hint: "Faster. Absolutely ridiculous.", coins: 3 });
  }

  function ensureGen() {
    while (genX < worldX + W + 900) {
      if (stageIdx === 0) {
        pushSeg({ c: MID, h: 115, len: 820, label: "STRAIGHT", hint: "Hold to rise · release to dive. Cruise it.", coins: 2 });
      } else if (stageIdx <= 9) {
        scriptedStage(stageIdx - 1);
      } else {
        endlessStage(distM());
      }
      stageIdx += 1;
    }
    // prune far-behind content
    const cut = worldX - 400;
    segs = segs.filter((s) => s.x0 + s.len > cut);
    divs = divs.filter((d) => d.x2 > cut);
    teeth = teeth.filter((t) => t.wx > cut);
    coins = coins.filter((c) => c.wx > cut - 40);
  }

  function findSeg(wx) {
    for (let i = segs.length - 1; i >= 0; i--) {
      if (wx >= segs[i].x0) return { seg: segs[i], idx: i };
    }
    return { seg: segs[0], idx: 0 };
  }

  function wallsAt(wx, t) {
    const found = findSeg(wx);
    const seg = found.seg;
    const dx = Math.max(0, wx - seg.x0);
    let c = seg.c + shapeOff(seg, dx);
    let h = seg.h;
    // smooth center + half-height across segment joints (no unfair steps)
    if (dx < 90 && found.idx > 0) {
      const prev = segs[found.idx - 1];
      const s = dx / 90;
      const sm = s * s * (3 - 2 * s);
      c = segEndCenter(prev) + (c - segEndCenter(prev)) * sm;
      h = prev.h + (seg.h - prev.h) * sm;
    }
    let m = 0;
    if (seg.moveAmp) m = seg.moveAmp * Math.sin(t * seg.moveFreq + wx * 0.02);
    let ceil, floor;
    if (seg.slosh) {
      ceil = c - h + m;
      floor = c + h + m;
    } else {
      ceil = c - h + m;
      floor = c + h - m;
    }
    return { ceil, floor, c, h, seg, idx: found.idx };
  }

  function circleRect(cx, cy, r, rx, ry, rw, rh) {
    const nx = Math.max(rx, Math.min(cx, rx + rw));
    const ny = Math.max(ry, Math.min(cy, ry + rh));
    const ddx = cx - nx;
    const ddy = cy - ny;
    return ddx * ddx + ddy * ddy < r * r;
  }

  function syncHud() {
    const d = distM();
    if (twoP) {
      distEl.textContent = `P1: ${alive1 ? d : distAtDeath1} m`;
      p2DistEl.textContent = `P2: ${alive2 ? d : distAtDeath2} m`;
      scoreEl.textContent = `P1: ${Math.floor(score)}`;
    } else {
      distEl.textContent = `${d} m`;
      scoreEl.textContent = `Score: ${Math.floor(score)}`;
    }
    coinsEl.textContent = `Coins: ${shop.bank}`;
    bestEl.textContent = `Best: ${Math.max(best, d)} m`;
    setSnapshot({
      mode: mode === "playing" ? "playing" : mode === "dead" ? "ended" : "ready",
      game: "Zigzag",
      dist: d,
      score: Math.floor(leadScore()),
      coins: shop.bank,
      best: Math.max(best, d),
      perfects,
      skin: shop.selected,
      twoP,
      p1: Math.floor(score),
      p2: twoP ? Math.floor(score2) : undefined
    });
  }

  function resetRun(toReady) {
    worldX = 0;
    playerY = twoP ? MID - 24 : MID;
    vy = 0;
    holding = false;
    playerY2 = twoP ? MID + 24 : MID;
    vy2 = 0;
    holding2 = false;
    alive1 = true;
    alive2 = twoP;
    distAtDeath1 = 0;
    distAtDeath2 = 0;
    speed = 265;
    score = 0;
    score2 = 0;
    coinsGot = 0;
    coins2 = 0;
    perfects = 0;
    grazeAcc = 0;
    graze2 = 0;
    segs = [];
    divs = [];
    teeth = [];
    coins = [];
    particles = [];
    popups = [];
    trail = [];
    trail2 = [];
    genX = 0;
    stageIdx = 0;
    playerSegIdx = -1;
    shake = 0;
    flash = 0;
    banner = null;
    shown = {};
    ensureGen();
    playerSegIdx = findSeg(worldX + pxFor(0)).idx;
    mode = toReady ? "ready" : "playing";
    deadAge = 0;
    if (toReady) message.textContent = twoP
      ? "P1: HOLD (P1) / SPACE/W — P2: HOLD (P2) / ↑ — last plane wins!"
      : "HOLD to rise · RELEASE to dive. Thread the gaps, don't touch the walls.";
    syncHud();
  }

  function finishMatch2P() {
    mode = "dead";
    deadAge = 0;
    const d1 = distAtDeath1 || distM();
    const d2 = distAtDeath2 || distM();
    let title;
    if (d1 > d2) title = "P1 WINS!";
    else if (d2 > d1) title = "P2 WINS!";
    else if (score > score2) title = "P1 WINS!";
    else if (score2 > score) title = "P2 WINS!";
    else title = "DRAW!";
    shake = 14;
    flash = 0.45;
    message.textContent = `${title} P1 ${Math.floor(score)} (${d1} m) · P2 ${Math.floor(score2)} (${d2} m).`;
    syncHud();
  }

  function die(reason, idx) {
    if (mode !== "playing") return;
    if (twoP && (idx === 0 || idx === 1)) {
      const d = distM();
      if (idx === 1) {
        if (!alive2) return;
        alive2 = false; distAtDeath2 = d;
        burst(pxFor(1), playerY2, 20, "#74c0fc", 220);
        popup(pxFor(1), playerY2 - 24, "P2 OUT!", "#74c0fc");
        if (alive1) { message.textContent = "P2 down! P1 still flying…"; syncHud(); return; }
      } else {
        if (!alive1) return;
        alive1 = false; distAtDeath1 = d;
        burst(pxFor(0), playerY, 20, "#ff6b6b", 220);
        popup(pxFor(0), playerY - 24, "P1 OUT!", "#ff6b6b");
        if (alive2) { message.textContent = "P1 down! P2 still flying…"; syncHud(); return; }
      }
      finishMatch2P();
      return;
    }
    mode = "dead";
    deadAge = 0;
    const d = distM();
    const s = Math.floor(leadScore());
    const result = recordScore("zigzag", d, "high");
    best = Math.max(best, result.best, d);
    if (s > bestScore) bestScore = s;
    if (coinsGot > bestCoins) bestCoins = coinsGot;
    saveExtra();
    burst(PX, playerY, 24, "#f6c445", 260);
    burst(PX, playerY, 12, "#fff8ea", 180);
    shake = 14;
    flash = 0.45;
    message.textContent = `${reason || QUIPS[Math.floor(Math.random() * QUIPS.length)]}` +
      (result.isNew && d > 0 ? ` New best: ${d} m!` : ` Dist ${d} m · Score ${s} · +${coinsGot} coins (bank ${shop.bank}) · Grazes ${perfects}. Best ${best} m.`);
    syncHud();
  }

  function pressDown(idx) {
    const who = idx === 1 ? 1 : 0;
    if (twoP && mode === "playing" && !(who === 0 ? alive1 : alive2)) return;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (mode === "ready") {
      resetRun(false);
      if (twoP) { holding = true; holding2 = true; }
      else if (who === 1) holding2 = true; else holding = true;
      showBanner("HOLD = RISE · RELEASE = DIVE");
      message.textContent = twoP ? "Go! Last plane wins — hold to rise." : "Thread the gaps. Coins pay, walls don't.";
      syncHud();
    } else if (mode === "playing") {
      if (twoP) { if (who === 1) holding2 = true; else holding = true; }
      else holding = true;
    }
  }

  function pressUp(idx) {
    const who = idx === 1 ? 1 : 0;
    if (twoP) { if (who === 1) holding2 = false; else holding = false; }
    else holding = false;
  }

  function milestone(d) {
    const marks = [
      [150, "NARROWING…"],
      [320, "SPEED CREEPING UP"],
      [520, "IT GETS SILLY NOW"],
      [800, "ABSOLUTELY RIDICULOUS 💀"]
    ];
    for (const [at, text] of marks) {
      if (d >= at && !shown[at]) {
        shown[at] = true;
        showBanner(text);
      }
    }
  }

  function update(dt) {
    time += dt;
    if (banner) {
      banner.t -= dt;
      if (banner.t <= 0) banner = null;
    }
    shake = Math.max(0, shake - dt * 30);
    if (flash > 0) flash -= dt;

    particles = particles.filter((p) => p.life > 0);
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 500 * dt;
      p.life -= dt;
    }
    popups = popups.filter((p) => p.life > 0);
    for (const p of popups) {
      p.y -= 46 * dt;
      p.life -= dt;
    }

    if (mode === "ready") {
      ensureGen();
      if (twoP) {
        const w1 = wallsAt(worldX + PX1, time);
        const w2 = wallsAt(worldX + PX2, time);
        playerY = w1.c + Math.sin(time * 2.2) * 14;
        playerY2 = w2.c + Math.cos(time * 2.2) * 14;
        trail.push({ x: PX1, y: playerY }); if (trail.length > 40) trail.shift();
        trail2.push({ x: PX2, y: playerY2 }); if (trail2.length > 40) trail2.shift();
      } else {
        const w = wallsAt(worldX + PX, time);
        playerY = w.c + Math.sin(time * 2.2) * 18;
        trail.push({ x: PX, y: playerY });
        if (trail.length > 40) trail.shift();
      }
      return;
    }

    if (mode === "dead") {
      deadAge += dt;
      if (deadAge > 1.7) resetRun(true);
      return;
    }

    // playing
    const d = distM();
    milestone(d);
    ensureGen();

    const probe = wallsAt(worldX + pxFor(0), time);
    const targetSpeed = Math.min(700, 265 + d * 0.85) + (probe.seg.fast ? 130 : 0);
    speed = targetSpeed;
    worldX += speed * dt;

    // zone entry banner (follow P1)
    const now = wallsAt(worldX + pxFor(0), time);
    if (now.idx !== playerSegIdx) {
      playerSegIdx = now.idx;
      if (now.seg.label) {
        let tag = now.seg.label;
        if (stageIdx > 10 && !["INVERTED", "SPEED UP", "PICK A LANE", "MOVING WALLS"].includes(tag)) {
          tag = `ENDLESS · ${tag}`;
        }
        showBanner(tag);
      }
      if (now.seg.hint) message.textContent = now.seg.hint;
    }

    const inverted = now.seg.invert;
    const V = speed * 1.02;
    // per-plane vertical physics
    if (!twoP) {
      const wantDive = inverted ? holding : !holding;
      const target = wantDive ? V : -V;
      vy += (target - vy) * Math.min(1, dt * 18);
      playerY += vy * dt;
      trail.push({ x: PX, y: playerY }); if (trail.length > 46) trail.shift();
    } else {
      // P1
      if (alive1) {
        const wantDive1 = inverted ? holding : !holding;
        const target1 = wantDive1 ? V : -V;
        vy += (target1 - vy) * Math.min(1, dt * 18);
        playerY += vy * dt;
      }
      trail.push({ x: PX1, y: playerY }); if (trail.length > 46) trail.shift();
      // P2
      if (alive2) {
        const wantDive2 = inverted ? holding2 : !holding2;
        const target2 = wantDive2 ? V : -V;
        vy2 += (target2 - vy2) * Math.min(1, dt * 18);
        playerY2 += vy2 * dt;
      }
      trail2.push({ x: PX2, y: playerY2 }); if (trail2.length > 46) trail2.shift();
    }

    // dust while ripping along
    dustT -= dt;
    if (dustT <= 0 && speed > 420) {
      dustT = 0.05;
      if (!twoP) {
        particles.push({ x: pxFor(0) - 14, y: playerY + (Math.random() - 0.5) * 10, vx: -speed * 0.4, vy: (Math.random() - 0.5) * 60, life: 0.3, max: 0.3, color: "rgba(255,255,255,0.5)", size: 2 });
      } else {
        if (alive1) particles.push({ x: PX1 - 14, y: playerY + (Math.random() - 0.5) * 10, vx: -speed * 0.4, vy: (Math.random() - 0.5) * 60, life: 0.3, max: 0.3, color: "rgba(255,255,255,0.5)", size: 2 });
        if (alive2) particles.push({ x: PX2 - 14, y: playerY2 + (Math.random() - 0.5) * 10, vx: -speed * 0.4, vy: (Math.random() - 0.5) * 60, life: 0.3, max: 0.3, color: "rgba(255,255,255,0.5)", size: 2 });
      }
    }

    function checkPlane(idx) {
      const px = pxFor(idx);
      const py = idx === 1 ? playerY2 : playerY;
      const alive = idx === 1 ? alive2 : alive1;
      if (!alive) return false;
      const pWX = worldX + px;
      for (const ox of [-8, 0, 8]) {
        const w = wallsAt(pWX + ox, time);
        const shrink = ox === 0 ? 0 : 3;
        if (py - PR + shrink < w.ceil || py + PR - shrink > w.floor) { die(undefined, idx); return true; }
      }
      for (const t of teeth) {
        const dx = Math.abs(pWX - t.wx);
        if (dx > 16) continue;
        const w = wallsAt(t.wx, time);
        const peak = t.size * (1 - dx / 16);
        if (t.side === 1) { if (py + PR - 3 > w.floor - peak) { die("Spiked. The teeth were hungry.", idx); return true; } }
        else { if (py - PR + 3 < w.ceil + peak) { die("Spiked. The teeth were hungry.", idx); return true; } }
      }
      for (const dv of divs) {
        if (pWX + PR < dv.x1 || pWX - PR > dv.x2 + 16) continue;
        if (circleRect(pWX, py, PR - 2, dv.x1, dv.y - dv.h / 2, dv.x2 - dv.x1, dv.h)) { die("Bonk. The middle bar is solid.", idx); return true; }
        if (dv.blockTop) { if (circleRect(pWX, py, PR - 2, dv.x2, -40, 16, (dv.y - dv.h / 2) + 40)) { die("Dead end. That lane was a trap. 💀", idx); return true; } }
        else { if (circleRect(pWX, py, PR - 2, dv.x2, dv.y + dv.h / 2, 16, H - (dv.y + dv.h / 2) + 40)) { die("Dead end. That lane was a trap. 💀", idx); return true; } }
      }
      if (py - PR < 0 || py + PR > H) { die(undefined, idx); return true; }
      return false;
    }

    if (!twoP) {
      if (checkPlane(0)) return;
    } else {
      const d1 = checkPlane(0);
      const d2 = checkPlane(1);
      if (!alive1 && !alive2) return;
      // if one died, keep the other flying (don't return early unless both dead)
    }

    // --- coins (shared pool, first taker wins) ---
    for (const cn of coins) {
      if (cn.taken) continue;
      const sx = cn.wx - worldX;
      if (sx < -20 || sx > W + 20) continue;
      const cy = cn.y + Math.sin(time * 3 + cn.phase) * 3;
      let taker = -1;
      if (!twoP) { if (Math.hypot(sx - PX, cy - playerY) < PR + 11) taker = 0; }
      else {
        const d1 = alive1 ? Math.hypot(sx - PX1, cy - playerY) : 999;
        const d2 = alive2 ? Math.hypot(sx - PX2, cy - playerY2) : 999;
        if (d1 < PR + 11 && d1 <= d2) taker = 0;
        else if (d2 < PR + 11) taker = 1;
      }
      if (taker >= 0) {
        cn.taken = true;
        if (taker === 0) { coinsGot += 1; score += 25; popup(pxFor(0) + 24, playerY - 26, "+25", "#f6c445"); burst(sx, cy, 8, "#f6c445", 160); }
        else { coins2 += 1; score2 += 25; popup(pxFor(1) + 24, playerY2 - 26, "+25", "#74c0fc"); burst(sx, cy, 8, "#74c0fc", 160); }
        shop.bank += 1; saveShop();
        if (cn.bait) popup(pxFor(taker) + 24, (taker === 1 ? playerY2 : playerY) - 48, "BAIT! RUN!", "#ff6b6b");
        renderShop();
      }
    }

    // --- graze bonus per plane ---
    function grazeFor(idx) {
      const px = pxFor(idx);
      const py = idx === 1 ? playerY2 : playerY;
      const cw = wallsAt(worldX + px, time);
      const clr = Math.min(py - PR - cw.ceil, cw.floor - (py + PR));
      let g = idx === 1 ? graze2 : grazeAcc;
      if (clr > 0 && clr < 15) {
        g += dt;
        if (g >= 0.55) { g = 0; perfects += 1; if (idx === 1) score2 += 15; else score += 15; popup(px + 30, py - 24, "GRAZE +15", "#43c6ac"); burst(px, py, 5, "#43c6ac", 120); }
      } else if (clr >= 30) g = Math.max(0, g - dt * 2);
      if (idx === 1) graze2 = g; else grazeAcc = g;
    }
    if (!twoP) grazeFor(0);
    else { if (alive1) grazeFor(0); if (alive2) grazeFor(1); }

    score += speed * dt * 0.06;
    if (twoP && (alive1 || alive2)) score2 += speed * dt * 0.06;
    syncHudThrottled();
  }

  let hudT = 0;
  function syncHudThrottled() {
    hudT += 1;
    if (hudT % 6 === 0) syncHud();
    else {
      const d = distM();
      if (twoP) { distEl.textContent = `P1: ${alive1 ? d : distAtDeath1} m`; p2DistEl.textContent = `P2: ${alive2 ? d : distAtDeath2} m`; scoreEl.textContent = `P1: ${Math.floor(score)}`; }
      else { distEl.textContent = `${d} m`; scoreEl.textContent = `Score: ${Math.floor(score)}`; }
      coinsEl.textContent = `Coins: ${shop.bank}`;
    }
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#141a33");
    sky.addColorStop(0.5, "#1d2550");
    sky.addColorStop(1, "#141a33");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    const shx = (Math.random() - 0.5) * shake;
    const shy = (Math.random() - 0.5) * shake;
    ctx.save();
    ctx.translate(shx, shy);

    // backdrop grid dots
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    const off = worldX % 60;
    for (let gx = -off; gx < W; gx += 60) {
      for (let gy = 30; gy < H; gy += 60) {
        ctx.fillRect(gx, gy, 2, 2);
      }
    }
    // speed lines when ridiculous
    if (speed > 470 && mode === "playing") {
      ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.25, (speed - 470) / 900).toFixed(2)})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const y = 40 + ((i * 67 + time * 700) % (H - 80));
        const x = (i * 211 + 40) % W;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 46, y);
        ctx.stroke();
      }
    }

    const probe = wallsAt(worldX + PX, time);
    const inverted = mode === "playing" ? probe.seg.invert : false;
    const edgeColor = inverted ? "#b197fc" : "#f6c445";
    const wallFill = inverted ? "#241d4d" : "#1a1440";

    // top + bottom wall bodies
    for (const top of [true, false]) {
      ctx.beginPath();
      ctx.moveTo(-20, top ? -20 : H + 20);
      for (let x = -20; x <= W + 20; x += STEP) {
        const w = wallsAt(worldX + x, time);
        ctx.lineTo(x, top ? w.ceil : w.floor);
      }
      ctx.lineTo(W + 20, top ? -20 : H + 20);
      ctx.closePath();
      ctx.fillStyle = wallFill;
      ctx.fill();
    }
    // neon wall edges
    for (const top of [true, false]) {
      ctx.beginPath();
      for (let x = -20; x <= W + 20; x += STEP) {
        const w = wallsAt(worldX + x, time);
        const y = top ? w.ceil : w.floor;
        if (x === -20) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = edgeColor;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // zone tint markers: paint invert/fast stretches on the edges
    for (let x = -20; x <= W + 20; x += 8) {
      const w = wallsAt(worldX + x, time);
      if (w.seg.invert) {
        ctx.fillStyle = "rgba(177,151,252,0.5)";
        ctx.fillRect(x, w.ceil - 7, 8, 5);
        ctx.fillRect(x, w.floor + 2, 8, 5);
      } else if (w.seg.fast) {
        ctx.fillStyle = "rgba(255,107,107,0.45)";
        ctx.fillRect(x, w.ceil - 7, 8, 5);
        ctx.fillRect(x, w.floor + 2, 8, 5);
      }
    }

    // teeth spikes
    for (const t of teeth) {
      const sx = t.wx - worldX;
      if (sx < -30 || sx > W + 30) continue;
      const w = wallsAt(t.wx, time);
      const y0 = t.side === 1 ? w.floor : w.ceil;
      const dir = t.side === 1 ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(sx - 13, y0);
      ctx.lineTo(sx, y0 + dir * t.size);
      ctx.lineTo(sx + 13, y0);
      ctx.closePath();
      ctx.fillStyle = "#ff6b6b";
      ctx.fill();
      ctx.strokeStyle = "#0f1320";
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // divider bars (fake-lane splits) + dead-end caps + skull warning
    for (const dv of divs) {
      const sx1 = dv.x1 - worldX;
      const sx2 = dv.x2 - worldX;
      if (sx2 < -40 || sx1 > W + 40) continue;
      const bw = sx2 - sx1;
      ctx.fillStyle = "#6a4c93";
      ctx.strokeStyle = "#0f1320";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(sx1, dv.y - dv.h / 2, bw, dv.h, 7);
      ctx.fill();
      ctx.stroke();
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(sx1, dv.y - dv.h / 2, bw, dv.h, 7);
      ctx.clip();
      ctx.strokeStyle = "rgba(246,196,69,0.85)";
      ctx.lineWidth = 3;
      for (let hx = sx1 - bw; hx < sx2 + 8; hx += 16) {
        ctx.beginPath();
        ctx.moveTo(hx, dv.y - dv.h / 2 - 4);
        ctx.lineTo(hx + 10, dv.y + dv.h / 2 + 4);
        ctx.stroke();
      }
      ctx.restore();
      // cap wall sealing the trap lane
      const capH = dv.blockTop
        ? (dv.y - dv.h / 2) + 60
        : H - (dv.y + dv.h / 2) + 60;
      const capY = dv.blockTop ? -60 : dv.y + dv.h / 2;
      ctx.fillStyle = "#ff6b6b";
      ctx.strokeStyle = "#0f1320";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(sx2, capY, 15, capH, 5);
      ctx.fill();
      ctx.stroke();
      // skull at the trap mouth
      ctx.font = "20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("💀", sx2 + 7, dv.blockTop ? dv.y - dv.h / 2 - 26 : dv.y + dv.h / 2 + 30);
      // chevrons guiding into the open lane at the split mouth
      const openY = dv.blockTop ? dv.y + 62 : dv.y - 62;
      ctx.fillStyle = "#69db7c";
      ctx.font = "bold 18px sans-serif";
      const chx = sx1 + 26 + Math.sin(time * 5) * 6;
      ctx.fillText(dv.blockTop ? "▼" : "▲", chx, openY + 6);
    }

    // coins
    for (const cn of coins) {
      if (cn.taken) continue;
      const sx = cn.wx - worldX;
      if (sx < -20 || sx > W + 20) continue;
      const cy = cn.y + Math.sin(time * 3 + cn.phase) * 3;
      ctx.save();
      ctx.translate(sx, cy);
      const pulse = 1 + Math.sin(time * 5 + cn.phase) * 0.08;
      ctx.scale(pulse, pulse);
      ctx.fillStyle = cn.bait ? "#ff8787" : "#f6c445";
      ctx.strokeStyle = "#0f1320";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = cn.bait ? "#5c0a0a" : "#92600a";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(cn.bait ? "!" : "$", 0, 1);
      ctx.textBaseline = "alphabetic";
      ctx.restore();
    }

    // player trail ribbons
    if (mode !== "dead") {
      const step = speed / 60;
      const trailRgb = inverted ? "177,151,252" : skin().trail;
      if (!twoP) {
        if (trail.length > 1) {
          for (let i = 1; i < trail.length; i++) {
            const a = i / trail.length;
            ctx.strokeStyle = `rgba(${trailRgb},${(a * 0.6).toFixed(2)})`;
            ctx.lineWidth = 3 + a * 7;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(PX - (trail.length - i) * step, trail[i - 1].y);
            ctx.lineTo(PX - (trail.length - 1 - i) * step, trail[i].y);
            ctx.stroke();
          }
        }
      } else {
        if (trail.length > 1 && alive1) {
          for (let i = 1; i < trail.length; i++) {
            const a = i / trail.length;
            ctx.strokeStyle = `rgba(${trailRgb},${(a * 0.5).toFixed(2)})`;
            ctx.lineWidth = 3 + a * 6;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(PX1 - (trail.length - i) * step, trail[i - 1].y);
            ctx.lineTo(PX1 - (trail.length - 1 - i) * step, trail[i].y);
            ctx.stroke();
          }
        }
        if (trail2.length > 1 && alive2) {
          for (let i = 1; i < trail2.length; i++) {
            const a = i / trail2.length;
            ctx.strokeStyle = `rgba(116,192,252,${(a * 0.5).toFixed(2)})`;
            ctx.lineWidth = 3 + a * 6;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(PX2 - (trail2.length - i) * step, trail2[i - 1].y);
            ctx.lineTo(PX2 - (trail2.length - 1 - i) * step, trail2[i].y);
            ctx.stroke();
          }
        }
      }
    }

    function drawPlane(px, py, v, holdVal, isP2) {
      const tilt = Math.max(-0.7, Math.min(0.7, v / 900));
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(tilt * 0.8);
      const bodyGrad = ctx.createLinearGradient(-12, 0, 14, 0);
      if (inverted) { bodyGrad.addColorStop(0, "#d0bfff"); bodyGrad.addColorStop(1, "#7048e8"); }
      else if (isP2) { bodyGrad.addColorStop(0, "#74c0fc"); bodyGrad.addColorStop(1, "#1864ab"); }
      else { const sk = skin(); bodyGrad.addColorStop(0, sk.hi); bodyGrad.addColorStop(1, sk.lo); }
      ctx.fillStyle = bodyGrad;
      ctx.strokeStyle = "#0f1320";
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(16, 0); ctx.lineTo(-10, -10); ctx.lineTo(-4, 0); ctx.lineTo(-10, 10); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#0f1320";
      ctx.beginPath(); ctx.arc(4, -1, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      if (mode === "playing") {
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "center";
        const h = isP2 ? holding2 : holding;
        ctx.fillStyle = h === inverted ? "#69db7c" : "#a5d8ff";
        ctx.fillText(h === inverted ? "▼" : "▲", px, py - 22);
        if (twoP) { ctx.font = "bold 11px sans-serif"; ctx.fillStyle = isP2 ? "#74c0fc" : "#f6c445"; ctx.fillText(isP2 ? "P2" : "P1", px, py - 36); }
      }
    }

    if (mode !== "dead") {
      if (!twoP) drawPlane(PX, playerY, vy, holding, false);
      else {
        if (alive1) drawPlane(PX1, playerY, vy, holding, false);
        if (alive2) drawPlane(PX2, playerY2, vy2, holding2, true);
      }
    }

    // particles
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // popups
    ctx.textAlign = "center";
    for (const p of popups) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.font = "bold 20px monospace";
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillText(p.text, p.x + 2, p.y + 2);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;

    // banner
    if (banner) {
      ctx.font = "bold 24px sans-serif";
      const tw = ctx.measureText(banner.text).width + 48;
      ctx.fillStyle = "rgba(12,10,24,0.82)";
      ctx.beginPath();
      ctx.roundRect(W / 2 - tw / 2, 24, tw, 44, 12);
      ctx.fill();
      ctx.fillStyle = "#ffe066";
      ctx.textBaseline = "middle";
      ctx.fillText(banner.text, W / 2, 47);
      ctx.textBaseline = "alphabetic";
    }

    // invert status tag
    if (inverted && mode === "playing") {
      ctx.font = "bold 15px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#b197fc";
      ctx.fillText("◄ INVERTED ►", W / 2, H - 14);
    }

    // overlays
    if (mode === "ready") {
      ctx.fillStyle = "rgba(10,10,24,0.62)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff8ea";
      ctx.font = "bold 52px sans-serif";
      ctx.fillText("ZIGZAG", W / 2, H / 2 - 66);
      ctx.font = "bold 19px sans-serif";
      ctx.fillStyle = "#ffe066";
      ctx.fillText("Hold to rise · release to dive", W / 2, H / 2 - 28);
      ctx.fillStyle = "#fff8ea";
      ctx.font = "16px sans-serif";
      if (twoP) {
        ctx.fillText("P1: SPACE/W or HOLD (P1) — P2: ↑ or HOLD (P2)", W / 2, H / 2 + 2);
        ctx.fillText("Shared canyon — last plane flying wins. Coins buy planes.", W / 2, H / 2 + 26);
      } else {
        ctx.fillText("PRESS & HOLD — SPACE · CLICK · TAP", W / 2, H / 2 + 2);
        ctx.fillText("Thread the gaps. Coins buy planes · grazing walls pays.", W / 2, H / 2 + 26);
      }
      ctx.fillText("Purple = inverted. Skull lane = trap.", W / 2, H / 2 + 50);
      ctx.fillStyle = "#69db7c";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("— press & hold to start —", W / 2, H / 2 + 82);
    }

    if (mode === "dead") {
      ctx.fillStyle = "rgba(10,8,16,0.45)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      if (twoP) {
        const d1 = distAtDeath1 || distM(), d2 = distAtDeath2 || distM();
        const title = d1 > d2 ? "P1 WINS!" : d2 > d1 ? "P2 WINS!" : score > score2 ? "P1 WINS!" : score2 > score ? "P2 WINS!" : "DRAW!";
        ctx.fillStyle = d1 > d2 || score > score2 ? "#f6c445" : d2 > d1 || score2 > score ? "#74c0fc" : "#ffe066";
        ctx.font = "bold 42px sans-serif";
        ctx.fillText(title, W / 2, H / 2 - 10);
        ctx.fillStyle = "#fff8ea";
        ctx.font = "bold 15px sans-serif";
        ctx.fillText(`P1 ${Math.floor(score)} (${d1} m) · P2 ${Math.floor(score2)} (${d2} m)`, W / 2, H / 2 + 24);
      } else {
        ctx.fillStyle = "#ff6b6b";
        ctx.font = "bold 54px sans-serif";
        ctx.fillText("SPLAT", W / 2, H / 2 - 10);
        ctx.fillStyle = "#fff8ea";
        ctx.font = "bold 18px sans-serif";
        ctx.fillText(`${distM()} m · Score ${Math.floor(score)} · Bank ${shop.bank}`, W / 2, H / 2 + 24);
      }
    }

    ctx.restore();

    if (flash > 0) {
      ctx.fillStyle = `rgba(255,80,80,${Math.min(0.4, flash).toFixed(2)})`;
      ctx.fillRect(0, 0, W, H);
    }

    const d = distM();
    if (twoP) { distEl.textContent = `P1: ${alive1 ? d : distAtDeath1} m`; p2DistEl.textContent = `P2: ${alive2 ? d : distAtDeath2} m`; scoreEl.textContent = `P1: ${Math.floor(score)} · P2: ${Math.floor(score2)}`; }
    else { distEl.textContent = `${d} m`; scoreEl.textContent = `Score: ${Math.floor(score)}`; }
    coinsEl.textContent = `Coins: ${shop.bank}`;
  }

  function tick(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    raf = requestAnimationFrame(tick);
  }

  function keydown(e) {
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (twoP) {
      if (e.code === "Space" || e.code === "KeyW") {
        e.preventDefault(); if (e.repeat) return; pressDown(0);
        return;
      }
      if (e.code === "ArrowUp") {
        e.preventDefault(); if (e.repeat) return; pressDown(1);
        return;
      }
      if (e.code === "Enter" && mode !== "playing") {
        e.preventDefault(); pressDown(0); setTimeout(() => pressUp(0), 120);
        return;
      }
    } else {
      if (e.code === "Space" || e.code === "ArrowDown" || e.code === "KeyS") {
        e.preventDefault(); if (e.repeat) return; pressDown(0);
        return;
      }
      if (e.code === "Enter" && mode !== "playing") {
        e.preventDefault(); pressDown(0); setTimeout(() => pressUp(0), 120);
        return;
      }
    }
  }

  function keyup(e) {
    if (twoP) {
      if (e.code === "Space" || e.code === "KeyW") pressUp(0);
      if (e.code === "ArrowUp") pressUp(1);
      return;
    }
    if (e.code === "Space" || e.code === "ArrowDown" || e.code === "KeyS") pressUp(0);
  }

  function tapWhich(e) {
    const rect = canvas.getBoundingClientRect();
    return (e.clientX - rect.left) > rect.width / 2 ? 1 : 0;
  }

  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    if (twoP) pressDown(tapWhich(e)); else pressDown(0);
  });
  const releasePointer = () => { if (twoP) { pressUp(0); pressUp(1); } else pressUp(0); };
  function releaseFor(e) {
    if (!twoP) { pressUp(0); return; }
    // if 2P and released on canvas, release that half's hold only; button releases are explicit
    try {
      const rect = canvas.getBoundingClientRect();
      const half = (e.clientX - rect.left) > rect.width / 2 ? 1 : 0;
      pressUp(half);
    } catch (err) { pressUp(0); pressUp(1); }
  }
  canvas.addEventListener("pointerup", (e) => { if (twoP) releaseFor(e); else releasePointer(); });
  canvas.addEventListener("pointercancel", releasePointer);
  canvas.addEventListener("pointerleave", releasePointer);
  holdBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    pressDown(0);
  });
  holdBtn2.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    pressDown(1);
  });
  holdBtn.addEventListener("pointerup", () => pressUp(0));
  holdBtn2.addEventListener("pointerup", () => pressUp(1));
  holdBtn.addEventListener("pointercancel", () => pressUp(0));
  holdBtn2.addEventListener("pointercancel", () => pressUp(1));
  holdBtn.addEventListener("pointerleave", () => pressUp(0));
  holdBtn2.addEventListener("pointerleave", () => pressUp(1));
  holdBtn.addEventListener("contextmenu", (e) => e.preventDefault());
  holdBtn2.addEventListener("contextmenu", (e) => e.preventDefault());
  document.querySelector("#zgRetry").addEventListener("click", () => {
    resetRun(false);
    message.textContent = "Thread the gaps. Coins pay, walls don't.";
    showBanner("HOLD = RISE · RELEASE = DIVE");
    syncHud();
  });
  document.addEventListener("keydown", keydown);
  document.addEventListener("keyup", keyup);
  document.addEventListener("keydown", cheatKeydown);

  setSnapshot({ mode: "ready", game: "Zigzag", dist: 0, score: 0, coins: 0, best, perfects: 0 });
  activeAdvance = (ms) => {
    const steps = Math.max(1, Math.round(ms / 16));
    for (let i = 0; i < steps; i++) update(1 / 60);
    draw();
  };
  activeCleanup = () => {
    cancelAnimationFrame(raf);
    document.removeEventListener("keydown", keydown);
    document.removeEventListener("keyup", keyup);
    document.removeEventListener("keydown", cheatKeydown);
    removeCheatPopup();
  };
  bestEl.textContent = `Best: ${best} m`;
  renderShop();
  last = performance.now();
  raf = requestAnimationFrame(tick);
}

Object.assign(gameStarters, { zigzag: startZigzag });
