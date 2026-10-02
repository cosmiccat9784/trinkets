function startLudo() {
  openGame(
    "Ludo",
    "Board · 1–4 Players",
    `
      <div class="game-layout ludo-layout">
        <div class="ludo-setup" id="ludoSetup">
          <p class="game-message">How many humans are playing? The rest become bots.</p>
          <div class="game-actions ludo-countrow">
            <button class="game-action" type="button" data-humans="1">1 PLAYER</button>
            <button class="game-action" type="button" data-humans="2">2 PLAYERS</button>
            <button class="game-action" type="button" data-humans="3">3 PLAYERS</button>
            <button class="game-action" type="button" data-humans="4">4 PLAYERS</button>
          </div>
          <p class="ludo-sub">1P: you are 🔴 · 2P: 🔴🔵 · 3P: 🔴🔵🟢 · 4P: everyone human.<br>Bots play fair — same dice, same rules.</p>
        </div>
        <div class="ludo-main" id="ludoMain" hidden>
          <div class="game-topline ludo-top">
            <span class="game-stat" id="ludoTurn">🔴 RED'S TURN</span>
            <span class="game-stat ludo-dicebox"><span class="ludo-dice" id="ludoDice">🎲</span><span id="ludoDiceNum">–</span></span>
            <button class="game-action ludo-roll" id="ludoRoll" type="button">🎲 ROLL DICE</button>
          </div>
          <div class="ludo-mid">
            <div class="ludo-board" id="ludoBoard" aria-label="Ludo board">
              <div class="ludo-grid" id="ludoGrid"></div>
              <div class="ludo-pieces" id="ludoPieces"></div>
            </div>
            <div class="ludo-side">
              <div class="ludo-players" id="ludoPlayers"></div>
              <p class="game-message ludo-msg" id="ludoMsg">Roll the dice.</p>
              <div class="game-actions">
                <button class="game-action" id="ludoNew" type="button">New game</button>
              </div>
            </div>
          </div>
          <div class="ludo-results" id="ludoResults" hidden></div>
        </div>
      </div>
    `
  );

  // ---------- constants ----------
  const COLORS = ["red", "green", "yellow", "blue"];
  const EMOJI = { red: "🔴", green: "🟢", yellow: "🟡", blue: "🔵" };
  const NAME = { red: "RED", green: "GREEN", yellow: "YELLOW", blue: "BLUE" };
  const ORDER = ["red", "green", "yellow", "blue"]; // clockwise turn order
  const START = { red: 0, green: 13, yellow: 26, blue: 39 };
  const TRACK = [
    [6,1],[6,2],[6,3],[6,4],[6,5],
    [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],
    [1,8],[2,8],[3,8],[4,8],[5,8],
    [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],
    [8,13],[8,12],[8,11],[8,10],[8,9],
    [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],
    [13,6],[12,6],[11,6],[10,6],[9,6],
    [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0]
  ];
  const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
  const HOME_LANE = {
    red: [[7,1],[7,2],[7,3],[7,4],[7,5]],
    green: [[1,7],[2,7],[3,7],[4,7],[5,7]],
    yellow: [[7,13],[7,12],[7,11],[7,10],[7,9]],
    blue: [[13,7],[12,7],[11,7],[10,7],[9,7]]
  };
  const YARD = {
    red: [[1.6,1.6],[1.6,3.4],[3.4,1.6],[3.4,3.4]],
    green: [[1.6,10.6],[1.6,12.4],[3.4,10.6],[3.4,12.4]],
    yellow: [[10.6,10.6],[10.6,12.4],[12.4,10.6],[12.4,12.4]],
    blue: [[10.6,1.6],[10.6,3.4],[12.4,1.6],[12.4,3.4]]
  };
  const DICE_FACES = ["⚀","⚁","⚂","⚃","⚄","⚅"];

  // ---------- state ----------
  let players = [];
  let turnIdx = 0;
  let dice = 0;
  let rolled = false;
  let legal = [];
  let rankings = [];
  let gameActive = false;
  let busy = false; // animating / bot thinking
  let timers = [];
  const diceIntervals = new Set();
  let audioCtx = null;

  const setupEl = document.querySelector("#ludoSetup");
  const mainEl = document.querySelector("#ludoMain");
  const gridEl = document.querySelector("#ludoGrid");
  const piecesEl = document.querySelector("#ludoPieces");
  const turnEl = document.querySelector("#ludoTurn");
  const diceEl = document.querySelector("#ludoDice");
  const diceNumEl = document.querySelector("#ludoDiceNum");
  const rollBtn = document.querySelector("#ludoRoll");
  const msgEl = document.querySelector("#ludoMsg");
  const playersEl = document.querySelector("#ludoPlayers");
  const resultsEl = document.querySelector("#ludoResults");

  function later(fn, ms) {
    const id = setTimeout(() => {
      timers = timers.filter((t) => t !== id);
      fn();
    }, ms);
    timers.push(id);
    return id;
  }

  function sound(freq, dur, type, delay) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (!audioCtx) return;
      const t0 = audioCtx.currentTime + (delay || 0);
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type || "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.05);
    } catch (err) {}
  }
  const sfxDice = () => { for (let i = 0; i < 5; i++) sound(300 + Math.random() * 500, 0.05, "square", i * 0.06); };
  const sfxStep = () => sound(520, 0.07, "sine");
  const sfxOut = () => { sound(440, 0.1, "sine"); sound(660, 0.12, "sine", 0.09); };
  const sfxCapture = () => { sound(700, 0.12, "sawtooth"); sound(350, 0.18, "sawtooth", 0.1); };
  const sfxHome = () => { sound(523, 0.1, "sine"); sound(659, 0.1, "sine", 0.09); sound(784, 0.16, "sine", 0.18); };
  const sfxSix = () => { sound(880, 0.12, "sine"); sound(1174, 0.14, "sine", 0.1); };
  const sfxWin = () => { [523, 659, 784, 1046].forEach((f, i) => sound(f, 0.16, "triangle", i * 0.12)); };

  // ---------- board build (static grid) ----------
  function cellKind(r, c) {
    // yards
    if (r <= 5 && c <= 5) return "yard-red";
    if (r <= 5 && c >= 9) return "yard-green";
    if (r >= 9 && c >= 9) return "yard-yellow";
    if (r >= 9 && c <= 5) return "yard-blue";
    // center
    if (r >= 6 && r <= 8 && c >= 6 && c <= 8) return "center";
    return null;
  }

  function buildGrid() {
    gridEl.innerHTML = "";
    const trackSet = new Set(TRACK.map(([r, c]) => r * 15 + c));
    const laneMap = {};
    for (const col of COLORS) HOME_LANE[col].forEach(([r, c]) => { laneMap[r * 15 + c] = col; });
    const startMap = {};
    for (const col of COLORS) {
      const [r, c] = TRACK[START[col]];
      startMap[r * 15 + c] = col;
    }
    const starSet = new Set([8, 21, 34, 47].map((i) => {
      const [r, c] = TRACK[i];
      return r * 15 + c;
    }));
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        const d = document.createElement("div");
        const k = r * 15 + c;
        d.className = "ludo-cell";
        d.dataset.r = r;
        d.dataset.c = c;
        const yard = cellKind(r, c);
        if (yard) {
          d.classList.add(yard);
          if ((r === 2 || r === 3) && (c === 2 || c === 3 || c === 10 || c === 11) ||
              (r === 11 || r === 12) && (c === 2 || c === 3 || c === 10 || c === 11)) {
            d.classList.add("yard-dot");
          }
        } else if (r >= 6 && r <= 8 && c >= 6 && c <= 8) {
          d.classList.add("center");
        } else if (laneMap[k]) {
          d.classList.add("lane-" + laneMap[k]);
        } else if (trackSet.has(k)) {
          d.classList.add("track");
          if (startMap[k]) d.classList.add("start-" + startMap[k]);
          if (starSet.has(k)) {
            d.classList.add("star");
            d.textContent = "★";
          } else if (startMap[k]) {
            d.textContent = "●";
          }
        } else {
          d.classList.add("blank");
        }
        gridEl.append(d);
      }
    }
  }

  // ---------- helpers ----------
  function absOf(color, rel) {
    if (rel < 0 || rel > 50) return -1;
    return (START[color] + rel) % 52;
  }

  function posToRC(color, pos, pieceIdx) {
    if (pos === -1) return YARD[color][pieceIdx];
    if (pos >= 0 && pos <= 50) return TRACK[absOf(color, pos)];
    if (pos >= 51 && pos <= 55) return HOME_LANE[color][pos - 51];
    // finished -> arrange in center 4x4 mini grid
    const pi = ORDER.indexOf(color);
    const idx = pi * 4 + pieceIdx;
    const gx = idx % 4;
    const gy = Math.floor(idx / 4);
    return [6.35 + gy * 0.44, 6.35 + gx * 0.44];
  }

  function isFinished(color) {
    const p = players.find((x) => x.color === color);
    return p && p.pieces.every((v) => v === 56);
  }

  function legalMoves(color, roll) {
    const p = players.find((x) => x.color === color);
    const out = [];
    p.pieces.forEach((pos, i) => {
      if (pos === 56) return;
      if (pos === -1) {
        if (roll === 6) out.push(i);
        return;
      }
      if (pos + roll <= 56) out.push(i);
    });
    return out;
  }

  function opponentsAt(abs, exceptColor) {
    const hits = [];
    for (const p of players) {
      if (p.color === exceptColor) continue;
      if (rankings.includes(p.color)) continue;
      p.pieces.forEach((pos, i) => {
        if (pos < 0 || pos > 50) return;
        if (absOf(p.color, pos) === abs) hits.push({ color: p.color, idx: i });
      });
    }
    return hits;
  }

  function dangerAt(color, rel) {
    // is this relative main-track spot capturable? (non-safe, opponents nearby behind)
    const abs = absOf(color, rel);
    if (SAFE.has(abs)) return false;
    for (const p of players) {
      if (p.color === color) continue;
      if (rankings.includes(p.color)) continue;
      for (const pos of p.pieces) {
        if (pos < 0 || pos > 50) continue;
        const oa = absOf(p.color, pos);
        const dist = (abs - oa + 52) % 52;
        if (dist >= 1 && dist <= 6) return true;
      }
    }
    return false;
  }

  function wasInDanger(color, rel) {
    const abs = absOf(color, rel);
    if (abs < 0 || SAFE.has(abs)) return false;
    for (const p of players) {
      if (p.color === color) continue;
      if (rankings.includes(p.color)) continue;
      for (const pos of p.pieces) {
        if (pos < 0 || pos > 50) continue;
        const oa = absOf(p.color, pos);
        const dist = (abs - oa + 52) % 52;
        if (dist >= 1 && dist <= 6) return true;
      }
    }
    return false;
  }

  // ---------- rendering ----------
  function render() {
    // turn label
    const cur = players[turnIdx];
    if (cur && gameActive) {
      turnEl.textContent = `${EMOJI[cur.color]} ${NAME[cur.color]}'S TURN${cur.isBot ? " (BOT)" : ""}`;
      turnEl.className = "game-stat ludo-turn-" + cur.color;
    }
    diceNumEl.textContent = rolled ? String(dice) : "–";
    rollBtn.disabled = !gameActive || busy || rolled || (cur && cur.isBot) || (cur && rankings.includes(cur.color));

    // players panel
    playersEl.innerHTML = "";
    for (const p of ORDER) {
      const pl = players.find((x) => x.color === p);
      if (!pl) continue;
      const home = pl.pieces.filter((v) => v === 56).length;
      const div = document.createElement("div");
      const rank = rankings.indexOf(p);
      div.className = "ludo-player pl-" + p + (players[turnIdx] && players[turnIdx].color === p && gameActive ? " active" : "") + (rank >= 0 ? " done" : "");
      div.innerHTML = `<span>${EMOJI[p]} ${NAME[p]}${pl.isBot ? " 🤖" : ""}</span><span>${rank >= 0 ? ["🥇","🥈","🥉","🏅"][rank] : `🏠 ${home}/4`}</span>`;
      playersEl.append(div);
    }

    // pieces
    piecesEl.innerHTML = "";
    // group by cell for stacking offsets
    const groups = {};
    const placements = [];
    players.forEach((p) => {
      p.pieces.forEach((pos, i) => {
        const [r, c] = posToRC(p.color, pos, i);
        const key = r.toFixed(2) + "," + c.toFixed(2);
        if (!groups[key]) groups[key] = [];
        groups[key].push({ color: p.color, idx: i, r, c });
        placements.push({ color: p.color, idx: i, r, c, key });
      });
    });
    const offsets4 = [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]];
    for (const pl of placements) {
      const group = groups[pl.key];
      let or = 0, oc = 0;
      if (group.length > 1) {
        const k = group.findIndex((g) => g.color === pl.color && g.idx === pl.idx);
        if (group.length <= 4) {
          or = offsets4[k][0]; oc = offsets4[k][1];
        } else {
          const cols = 3;
          const gx = k % cols, gy = Math.floor(k / cols);
          oc = (gx - 1) * 0.26; or = (gy - 0.5) * 0.26;
        }
      }
      const b = document.createElement("button");
      b.type = "button";
      const isLegal = gameActive && !busy && rolled && players[turnIdx] && players[turnIdx].color === pl.color && !players[turnIdx].isBot && legal.includes(pl.idx);
      b.className = "ludo-piece pc-" + pl.color + (isLegal ? " legal" : "") + (players.find((x) => x.color === pl.color).pieces[pl.idx] === 56 ? " finished" : "");
      b.style.left = ((pl.c + oc) / 15 * 100) + "%";
      b.style.top = ((pl.r + or) / 15 * 100) + "%";
      b.textContent = String(pl.idx + 1);
      b.setAttribute("aria-label", `${NAME[pl.color]} piece ${pl.idx + 1}`);
      b.disabled = !isLegal;
      b.addEventListener("click", () => {
        if (isLegal) doMove(pl.idx);
      });
      piecesEl.append(b);
    }

    setSnapshot({
      mode: !gameActive ? "ended" : "playing",
      game: "Ludo",
      turn: players[turnIdx] ? players[turnIdx].color : null,
      dice: rolled ? dice : null,
      finished: rankings.slice(),
      leaders: players.map((p) => ({ color: p.color, home: p.pieces.filter((v) => v === 56).length }))
    });
  }

  function setMsg(t) { msgEl.textContent = t; }

  // ---------- game flow ----------
  function startWithHumans(n) {
    const humanSet = n === 1 ? ["red"] : n === 2 ? ["red", "blue"] : n === 3 ? ["red", "blue", "green"] : ["red", "green", "yellow", "blue"];
    players = ORDER.map((color) => ({
      color,
      isBot: !humanSet.includes(color),
      pieces: [-1, -1, -1, -1]
    }));
    turnIdx = 0;
    rankings = [];
    dice = 0;
    rolled = false;
    legal = [];
    gameActive = true;
    busy = false;
    resultsEl.hidden = true;
    resultsEl.innerHTML = "";
    setupEl.hidden = true;
    mainEl.hidden = false;
    // skip finished none yet; ensure first turn is valid (always is)
    setMsg(`${EMOJI[players[0].color]} ${NAME[players[0].color]} starts. Roll the dice!`);
    render();
    fitGameShell();
    maybeBotRoll();
  }

  function current() { return players[turnIdx]; }

  function advanceTurn() {
    if (!gameActive) return;
    if (rankings.length >= 3) return endGame();
    let guard = 0;
    do {
      turnIdx = (turnIdx + 1) % 4;
      guard++;
    } while (rankings.includes(players[turnIdx].color) && guard < 8);
    dice = 0;
    rolled = false;
    legal = [];
    busy = false;
    render();
    const cur = current();
    setMsg(`${EMOJI[cur.color]} ${NAME[cur.color]}'S TURN — roll the dice!`);
    render();
    maybeBotRoll();
  }

  function maybeBotRoll() {
    if (!gameActive) return;
    const cur = current();
    if (!cur.isBot) return;
    if (rankings.includes(cur.color)) { advanceTurn(); return; }
    busy = true;
    render();
    later(() => {
      if (!gameActive) return;
      doRoll();
    }, 800);
  }

  function doRoll() {
    if (!gameActive || rolled) return;
    const cur = current();
    if (!cur) return;
    if (busy && !cur.isBot) return;
    if (rankings.includes(cur.color)) { advanceTurn(); return; }
    sfxDice();
    // dice animation
    let ticks = 0;
    diceEl.classList.add("rolling");
    const anim = setInterval(() => {
      if (!gameActive) { clearInterval(anim); return; }
      diceEl.textContent = DICE_FACES[Math.floor(Math.random() * 6)];
      ticks++;
      if (ticks >= 6) {
        clearInterval(anim);
        diceIntervals.delete(anim);
        diceEl.classList.remove("rolling");
        dice = 1 + Math.floor(Math.random() * 6);
        diceEl.textContent = DICE_FACES[dice - 1];
        rolled = true;
        busy = false;
        if (dice === 6) sfxSix();
        onRolled();
      }
    }, 70);
    diceIntervals.add(anim);
    busy = true;
    render();
  }

  function onRolled() {
    const cur = current();
    legal = legalMoves(cur.color, dice);
    busy = false;
    render();
    if (legal.length === 0) {
      setMsg(`${EMOJI[cur.color]} rolled a ${dice} — no legal moves.`);
      render();
      later(() => {
        if (!gameActive) return;
        if (dice === 6) {
          // rolled a 6 but nothing to do (all home?) — still extra turn, but pass to avoid stall
          setMsg(`${EMOJI[cur.color]} rolled 6 but can't move — turn passes.`);
        }
        // 6 with no moves: per classic, turn still passes (or retries). Pass on.
        advanceTurn();
      }, cur.isBot ? 900 : 1300);
      return;
    }
    const list = legal.map((i) => i + 1).join(", ");
    if (cur.isBot) {
      setMsg(`${EMOJI[cur.color]} rolled a ${dice}! Choosing…`);
      render();
      busy = true;
      render();
      later(() => {
        if (!gameActive) return;
        const pick = botPick(cur.color, dice, legal);
        doMove(pick);
      }, 850);
    } else {
      setMsg(`${EMOJI[cur.color]} rolled a ${dice}! Choose a piece (${list}). Keys 1–4.`);
      render();
    }
  }

  function botPick(color, roll, moves) {
    let best = moves[0];
    let bestScore = -1e9;
    const me = players.find((x) => x.color === color);
    for (const i of moves) {
      const pos = me.pieces[i];
      let s = Math.random() * 4;
      let dest = pos === -1 ? 0 : pos + roll;
      if (dest === 56) s += 100; // finish
      if (pos === -1) s += 60; // bring out
      else if (dest >= 51 && dest <= 55) s += 50; // into lane
      else if (dest >= 0 && dest <= 50) {
        const abs = absOf(color, dest);
        // capture?
        if (!SAFE.has(abs)) {
          const victims = opponentsAt(abs, color).length;
          if (victims > 0) s += 80 + victims * 10;
        } else {
          s += 40; // safe
        }
        if (wasInDanger(color, pos) && !dangerAt(color, dest)) s += 30; // escape
        if (!wasInDanger(color, pos) && dangerAt(color, dest)) s -= 25; // danger
        s += dest * 0.4; // prefer advanced
      }
      if (s > bestScore) { bestScore = s; best = i; }
    }
    return best;
  }

  function doMove(pieceIdx) {
    const cur = current();
    if (!gameActive || !rolled) return;
    if (!legal.includes(pieceIdx)) return;
    busy = true;
    render();
    const me = cur;
    const from = me.pieces[pieceIdx];

    const finishMove = (dest) => {
      me.pieces[pieceIdx] = dest;
      // check capture (main track only, non-safe)
      let captured = [];
      if (dest >= 0 && dest <= 50) {
        const abs = absOf(me.color, dest);
        if (!SAFE.has(abs)) {
          for (const p of players) {
            if (p.color === me.color) continue;
            p.pieces.forEach((pos, i) => {
              if (pos >= 0 && pos <= 50 && absOf(p.color, pos) === abs) {
                captured.push({ color: p.color, idx: i });
              }
            });
          }
          for (const c of captured) {
            const pl = players.find((x) => x.color === c.color);
            pl.pieces[c.idx] = -1;
          }
        }
      }
      render();
      if (captured.length > 0) {
        sfxCapture();
        piecesEl.classList.add("capture-flash");
        setTimeout(() => piecesEl.classList.remove("capture-flash"), 450);
        setMsg(`${EMOJI[me.color]} captures ${captured.map((c) => EMOJI[c.color] + (c.idx + 1)).join(", ")}! 💥`);
      } else if (from === -1) {
        sfxOut();
        setMsg(`${EMOJI[me.color]} brings piece ${pieceIdx + 1} out!`);
      } else if (dest === 56) {
        sfxHome();
        setMsg(`${EMOJI[me.color]} piece ${pieceIdx + 1} is HOME! 🏠`);
      } else {
        sfxStep();
      }
      render();

      later(() => {
        if (!gameActive) return;
        // player finished?
        if (me.pieces.every((v) => v === 56) && !rankings.includes(me.color)) {
          rankings.push(me.color);
          const medals = ["🥇 1st", "🥈 2nd", "🥉 3rd", "🏅 4th"];
          sfxWin();
          setMsg(`${EMOJI[me.color]} ${NAME[me.color]} finishes ${medals[rankings.length - 1]}!`);
          render();
          if (rankings.length >= 3) {
            later(() => endGame(), 1200);
            return;
          }
        }
        // extra turn on 6 (and player still in game)
        if (dice === 6 && !rankings.includes(me.color)) {
          rolled = false;
          legal = [];
          busy = false;
          setMsg(`${EMOJI[me.color]} rolled a 6 — roll again!`);
          render();
          if (me.isBot) maybeBotRollAgain();
          return;
        }
        advanceTurn();
      }, captured.length > 0 ? 900 : 650);
    };

    if (from === -1) {
      // bring out
      finishMove(0);
      return;
    }
    // step animation
    const steps = dice;
    let step = 0;
    const stepTick = () => {
      if (!gameActive) return;
      step++;
      const inter = from + step;
      me.pieces[pieceIdx] = Math.min(inter, 56);
      sfxStep();
      render();
      if (step < steps && inter < 56) {
        later(stepTick, 160);
      } else {
        finishMove(from + steps <= 56 ? from + steps : from);
      }
    };
    later(stepTick, 160);
  }

  function maybeBotRollAgain() {
    busy = true;
    render();
    later(() => {
      if (!gameActive) return;
      busy = false;
      render();
      doRoll();
    }, 800);
  }

  function endGame() {
    // last place = remaining player
    const remaining = ORDER.filter((c) => !rankings.includes(c));
    if (remaining.length === 1) rankings.push(remaining[0]);
    gameActive = false;
    busy = false;
    sfxWin();
    render();
    const medals = ["🥇 1st", "🥈 2nd", "🥉 3rd", "🏅 4th"];
    resultsEl.hidden = false;
    resultsEl.innerHTML =
      `<h3>🏁 Game over!</h3>` +
      rankings.map((c, i) => {
        const pl = players.find((x) => x.color === c);
        return `<div class="ludo-result">${medals[i]} — ${EMOJI[c]} ${NAME[c]}${pl.isBot ? " 🤖" : ""}</div>`;
      }).join("") +
      `<div class="game-actions"><button class="game-action" id="ludoAgain" type="button">Play again</button></div>`;
    setMsg("Game over! See results below.");
    const again = document.querySelector("#ludoAgain");
    if (again) again.addEventListener("click", () => {
      setupEl.hidden = false;
      mainEl.hidden = true;
      setSnapshot({ mode: "ready", game: "Ludo" });
      fitGameShell();
    });
    setSnapshot({ mode: "ended", game: "Ludo", finished: rankings.slice(), winner: rankings[0] || null });
    fitGameShell();
  }

  // ---------- events ----------
  buildGrid();

  setupEl.querySelectorAll("[data-humans]").forEach((btn) => {
    btn.addEventListener("click", () => startWithHumans(Number(btn.dataset.humans)));
  });

  rollBtn.addEventListener("click", () => {
    const cur = current();
    if (!gameActive || busy || rolled || !cur || cur.isBot) return;
    doRoll();
  });

  document.querySelector("#ludoNew").addEventListener("click", () => {
    timers.forEach(clearTimeout);
    timers = [];
    diceIntervals.forEach(clearInterval);
    diceIntervals.clear();
    gameActive = false;
    busy = false;
    setupEl.hidden = false;
    mainEl.hidden = true;
    setSnapshot({ mode: "ready", game: "Ludo" });
    fitGameShell();
  });

  function keydown(e) {
    if (mainEl.hidden) return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (e.code === "Space") {
      e.preventDefault();
      const cur = current();
      if (gameActive && !busy && !rolled && cur && !cur.isBot) doRoll();
    } else if (["Digit1", "Digit2", "Digit3", "Digit4"].includes(e.code)) {
      const n = Number(e.code.slice(5)) - 1;
      const cur = current();
      if (gameActive && rolled && !busy && cur && !cur.isBot && legal.includes(n)) {
        e.preventDefault();
        doMove(n);
      }
    }
  }
  document.addEventListener("keydown", keydown);

  setSnapshot({ mode: "ready", game: "Ludo" });
  activeCleanup = () => {
    timers.forEach(clearTimeout);
    timers = [];
    diceIntervals.forEach(clearInterval);
    diceIntervals.clear();
    document.removeEventListener("keydown", keydown);
  };
}

Object.assign(gameStarters, { ludo: startLudo });
