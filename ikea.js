const IKEA_PRODUCTS = [
  // Sofa
  { name: "KLIPPAN", type: "Sofa" },
  { name: "EKTORP", type: "Sofa" },
  { name: "VIMLE", type: "Sofa" },
  { name: "SÖDERHAMN", type: "Sofa" },
  { name: "FRIHETEN", type: "Sofa" },
  { name: "UPPLAND", type: "Sofa" },
  { name: "KARLSTAD", type: "Sofa" },
  { name: "BACKSÄLEN", type: "Sofa" },
  { name: "PÄRUP", type: "Sofa" },
  { name: "NYHAMN", type: "Sofa" },
  // Bed
  { name: "MALM", type: "Bed" },
  { name: "TARVA", type: "Bed" },
  { name: "BRIMNES", type: "Bed" },
  { name: "UTÅKER", type: "Bed" },
  { name: "STORÅ", type: "Bed" },
  { name: "SLATTUM", type: "Bed" },
  { name: "SAGSTUA", type: "Bed" },
  { name: "NESTTUN", type: "Bed" },
  { name: "GURSKEN", type: "Bed" },
  // Chair
  { name: "INGOLF", type: "Chair" },
  { name: "NORDMYRA", type: "Chair" },
  { name: "MARKUS", type: "Chair" },
  { name: "MILLBERGET", type: "Chair" },
  { name: "MAMMUT", type: "Chair" },
  { name: "KYRRE", type: "Chair" },
  { name: "TOBIAS", type: "Chair" },
  { name: "STEFAN", type: "Chair" },
  { name: "NOLMYRA", type: "Chair" },
  { name: "ODDVAR", type: "Chair" },
  { name: "BEKVÄM", type: "Chair" },
  // Armchair
  { name: "POÄNG", type: "Armchair" },
  { name: "STRANDMON", type: "Armchair" },
  { name: "VEDBO", type: "Armchair" },
  { name: "EKENÄSET", type: "Armchair" },
  { name: "TULLSTA", type: "Armchair" },
  { name: "PELLO", type: "Armchair" },
  // Table
  { name: "LACK", type: "Table" },
  { name: "DOCKSTA", type: "Table" },
  { name: "NORDEN", type: "Table" },
  { name: "MELLTORP", type: "Table" },
  { name: "LINNMON", type: "Table" },
  { name: "NORDVIKEN", type: "Table" },
  { name: "TRULSTORP", type: "Table" },
  { name: "INGATORP", type: "Table" },
  { name: "STORNÄS", type: "Table" },
  { name: "BJURSTA", type: "Table" },
  { name: "LERHAMN", type: "Table" },
  // Desk
  { name: "MICKE", type: "Desk" },
  { name: "BEKANT", type: "Desk" },
  { name: "LAGKAPTEN", type: "Desk" },
  { name: "ALEX", type: "Desk" },
  { name: "TROTTEN", type: "Desk" },
  { name: "THYGE", type: "Desk" },
  { name: "GALANT", type: "Desk" },
  // Shelf
  { name: "BILLY", type: "Shelf" },
  { name: "KALLAX", type: "Shelf" },
  { name: "BESTÅ", type: "Shelf" },
  { name: "MOSSLANDA", type: "Shelf" },
  { name: "BERGSHULT", type: "Shelf" },
  { name: "VITTSJÖ", type: "Shelf" },
  { name: "EKET", type: "Shelf" },
  { name: "VALJE", type: "Shelf" },
  { name: "ALGOT", type: "Shelf" },
  // Dresser
  { name: "HEMNES", type: "Dresser" },
  { name: "NORDLI", type: "Dresser" },
  { name: "SONGESAND", type: "Dresser" },
  { name: "KOPPANG", type: "Dresser" },
  { name: "KULLEN", type: "Dresser" },
  { name: "RAST", type: "Dresser" },
  // Wardrobe
  { name: "PAX", type: "Wardrobe" },
  { name: "RAKKESTAD", type: "Wardrobe" },
  { name: "TRYSIL", type: "Wardrobe" },
  { name: "ELVARLI", type: "Wardrobe" },
  // Lamp
  { name: "RANARP", type: "Lamp" },
  { name: "HEKTAR", type: "Lamp" },
  { name: "TERTIAL", type: "Lamp" },
  { name: "NOT", type: "Lamp" },
  { name: "ARÖD", type: "Lamp" },
  { name: "FADO", type: "Lamp" },
  { name: "LERSTA", type: "Lamp" },
  { name: "KNIXHULT", type: "Lamp" },
  // Frame
  { name: "RIBBA", type: "Frame" },
  { name: "FISKBO", type: "Frame" },
  { name: "SANNAHED", type: "Frame" },
  { name: "LOMVIKEN", type: "Frame" },
  // Rug
  { name: "STOENSE", type: "Rug" },
  { name: "VINDUM", type: "Rug" },
  { name: "LOHALS", type: "Rug" },
  { name: "TANUM", type: "Rug" },
];

const IKEA_TYPES = [...new Set(IKEA_PRODUCTS.map((p) => p.type))];

const IKEA_EMOJI = {
  Sofa: "🛋️",
  Bed: "🛏️",
  Chair: "🪑",
  Armchair: "🦘",
  Table: "🍽️",
  Desk: "💻",
  Shelf: "📚",
  Dresser: "🗄️",
  Wardrobe: "🚪",
  Lamp: "💡",
  Frame: "🖼️",
  Rug: "🧶",
};

const IKEA_ROUNDS = 10;

function startIkeaGuess() {
  openGame(
    "Guess the IKEA Product",
    "Word",
    `
      <div class="game-layout">
        <div class="game-topline">
          <span class="game-stat" id="ikeaRound">Round: 1/${IKEA_ROUNDS}</span>
          <span class="game-stat" id="ikeaScore">Score: 0</span>
          <span class="game-stat" id="ikeaStreak">Streak: 0</span>
        </div>
        <div class="clue-panel">
          <div>
            <p class="tag">What is this IKEA product?</p>
            <div class="ikea-name" id="ikeaName">BILLY</div>
            <p class="game-message" id="ikeaMsg">Pick the right furniture type. Spelling counts for IKEA, not for you.</p>
          </div>
          <div class="choice-list ikea-choices" id="ikeaChoices"></div>
          <div class="game-actions">
            <button class="game-action" id="ikeaHint" type="button">💡 Hint</button>
            <button class="game-action" id="ikeaSkip" type="button">Skip</button>
            <button class="game-action" id="ikeaRestart" type="button">New run</button>
          </div>
        </div>
      </div>
    `
  );

  const nameEl = document.querySelector("#ikeaName");
  const choicesEl = document.querySelector("#ikeaChoices");
  const msgEl = document.querySelector("#ikeaMsg");
  const roundEl = document.querySelector("#ikeaRound");
  const scoreEl = document.querySelector("#ikeaScore");
  const streakEl = document.querySelector("#ikeaStreak");
  const hintBtn = document.querySelector("#ikeaHint");

  let deck = [];
  let index = 0;
  let score = 0;
  let streak = 0;
  let bestStreak = 0;
  let correctCount = 0;
  let hintStage = 0;
  let locked = false;
  let currentOptions = [];
  let advanceTimer = 0;

  function newRun() {
    clearTimeout(advanceTimer);
    const uniqueNames = [...new Map(IKEA_PRODUCTS.map((p) => [p.name, p])).values()];
    deck = shuffleArray([...uniqueNames]).slice(0, IKEA_ROUNDS);
    index = 0;
    score = 0;
    streak = 0;
    bestStreak = 0;
    correctCount = 0;
    renderQuestion();
  }

  function pickDistractors(correctType) {
    const others = IKEA_TYPES.filter((t) => t !== correctType);
    shuffleArray(others);
    return others.slice(0, 3);
  }

  function renderQuestion() {
    if (index >= deck.length) {
      renderFinal();
      return;
    }
    locked = false;
    hintStage = 0;
    if (hintBtn) {
      hintBtn.disabled = false;
      hintBtn.textContent = "💡 Hint";
    }
    const product = deck[index];
    currentOptions = shuffleArray([product.type, ...pickDistractors(product.type)]);
    nameEl.textContent = product.name;
    roundEl.textContent = `Round: ${index + 1}/${deck.length}`;
    scoreEl.textContent = `Score: ${score}`;
    streakEl.textContent = `Streak: ${streak}`;
    choicesEl.innerHTML = "";
    currentOptions.forEach((type, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice-button";
      btn.dataset.type = type;
      btn.innerHTML = `<span class="ikea-opt-num">${i + 1}.</span> <span class="ikea-opt-emoji" aria-hidden="true">${IKEA_EMOJI[type] || "📦"}</span> ${type}`;
      btn.addEventListener("click", () => answer(type, btn));
      choicesEl.append(btn);
    });
    if (index === 0) {
      msgEl.textContent = "Pick the right furniture type. Spelling counts for IKEA, not for you.";
    }
    setSnapshot({
      mode: "playing",
      game: "Guess the IKEA Product",
      score,
      round: index + 1,
      streak,
      name: product.name,
    });
  }

  function reveal(correctType, pickedBtn) {
    [...choicesEl.children].forEach((btn) => {
      btn.disabled = true;
      if (btn.dataset.type === correctType) btn.classList.add("good");
      else if (btn === pickedBtn) btn.classList.add("bad");
      else btn.classList.add("dim");
    });
  }

  function answer(pickedType, pickedBtn) {
    if (locked || index >= deck.length) return;
    locked = true;
    const product = deck[index];
    const correct = pickedType === product.type;
    reveal(product.type, pickedBtn);
    if (correct) {
      streak += 1;
      if (streak > bestStreak) bestStreak = streak;
      const bonus = streak >= 3 ? 2 : 0;
      score += 10 + bonus;
      correctCount += 1;
      msgEl.textContent =
        streak >= 3
          ? `Correct! ${product.name} is ${article(product.type)} ${product.type}. Streak x${streak} (+${10 + bonus}).`
          : `Correct! ${product.name} is ${article(product.type)} ${product.type}.`;
    } else {
      streak = 0;
      score = Math.max(0, score - 2);
      msgEl.textContent = `Nope — ${product.name} is ${article(product.type)} ${product.type}, not ${pickedType}. (-2)`;
    }
    scoreEl.textContent = `Score: ${score}`;
    streakEl.textContent = `Streak: ${streak}`;
    setSnapshot({
      mode: "playing",
      game: "Guess the IKEA Product",
      score,
      round: index + 1,
      streak,
      name: product.name,
      picked: pickedType,
      correct,
    });
    clearTimeout(advanceTimer);
    advanceTimer = setTimeout(() => {
      if (!document.querySelector("#ikeaChoices")) return;
      index += 1;
      renderQuestion();
    }, correct ? 900 : 1400);
  }

  function article(word) {
    return /^[AEIOU]/i.test(word) ? "an" : "a";
  }

  function renderFinal() {
    const result = recordScore("ikea", score, "high");
    nameEl.textContent = "✓";
    roundEl.textContent = `Done: ${deck.length}/${deck.length}`;
    choicesEl.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "ikea-final";
    wrap.innerHTML = `
      <p><strong>${correctCount}/${deck.length} correct.</strong> Score: ${score}. Best streak: ${bestStreak}.</p>
      <p>${result.isNew && score > 0 ? "New best! The showroom applauds you." : `Best: ${result.best}.`}</p>
    `;
    choicesEl.append(wrap);
    msgEl.textContent = correctCount === deck.length
      ? "Flawless. IKEA should hire you to name things."
      : correctCount >= 7
        ? "Strong. You clearly wander showrooms for fun."
        : "The meatballs are still yours. Try another run.";
    if (hintBtn) hintBtn.disabled = true;
    setSnapshot({
      mode: "ended",
      game: "Guess the IKEA Product",
      score,
      round: deck.length,
      streak: bestStreak,
      correct: correctCount,
    });
  }

  function useHint() {
    if (locked || hintStage >= 2 || index >= deck.length) return;
    const product = deck[index];
    if (hintStage === 0) {
      hintStage = 1;
      if (hintBtn) hintBtn.textContent = "💡 Hint again";
      msgEl.textContent = `💡 Hint: ${product.name} is ${article(product.type)} ${product.type[0]}${"·".repeat(Math.max(0, product.type.length - 1))} (${product.type.length} letters, starts with ${product.type[0]}).`;
    } else {
      hintStage = 2;
      if (hintBtn) hintBtn.disabled = true;
      const wrongBtns = [...choicesEl.children].filter((b) => b.dataset.type !== product.type);
      shuffleArray(wrongBtns);
      wrongBtns.slice(0, 2).forEach((b) => {
        b.disabled = true;
        b.classList.add("dim");
      });
      msgEl.textContent = `💡 Hint: ${product.name} is NOT ${wrongBtns.slice(0, 2).map((b) => b.dataset.type).join(" or ")}.`;
    }
  }

  function skip() {
    if (locked || index >= deck.length) return;
    streak = 0;
    streakEl.textContent = `Streak: ${streak}`;
    const product = deck[index];
    msgEl.textContent = `Skipped. ${product.name} was ${article(product.type)} ${product.type}.`;
    locked = true;
    reveal(product.type, null);
    clearTimeout(advanceTimer);
    advanceTimer = setTimeout(() => {
      if (!document.querySelector("#ikeaChoices")) return;
      index += 1;
      renderQuestion();
    }, 900);
  }

  function keydown(e) {
    if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) return;
    const n = Number(e.key);
    if (n >= 1 && n <= currentOptions.length && !locked && index < deck.length) {
      const btn = choicesEl.children[n - 1];
      if (btn && !btn.disabled) answer(currentOptions[n - 1], btn);
    }
  }

  document.querySelector("#ikeaHint").addEventListener("click", useHint);
  document.querySelector("#ikeaSkip").addEventListener("click", skip);
  document.querySelector("#ikeaRestart").addEventListener("click", newRun);
  document.addEventListener("keydown", keydown);
  activeCleanup = () => {
    clearTimeout(advanceTimer);
    document.removeEventListener("keydown", keydown);
  };

  newRun();
}

Object.assign(gameStarters, { ikea: startIkeaGuess });
