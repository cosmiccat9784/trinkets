function startPowderSim() {
  openGame(
    "Powder Sim",
    "Arcade",
    `
      <div class="game-layout">
        <div class="game-topline">
          <span class="game-stat" id="powderElement">Element: Sand</span>
          <span class="game-stat" id="powderCount">Particles: 0</span>
        </div>
        <p class="game-message">Pick an element, then click or drag on the canvas to draw. Watch the physics unfold.</p>
        <div class="powder-toolbar" id="powderToolbar">
          <button class="powder-tool active" data-element="1" type="button" title="Sand">Sand</button>
          <button class="powder-tool" data-element="2" type="button" title="Water">Water</button>
          <button class="powder-tool" data-element="3" type="button" title="Stone">Stone</button>
          <button class="powder-tool" data-element="4" type="button" title="Fire">Fire</button>
          <button class="powder-tool" data-element="6" type="button" title="Oil">Oil</button>
          <button class="powder-tool" data-element="7" type="button" title="Acid">Acid</button>
          <button class="powder-tool" data-element="8" type="button" title="Plant">Plant</button>
          <button class="powder-tool powder-tool-erase" data-element="0" type="button" title="Eraser">Erase</button>
        </div>
        <div class="powder-brush-row">
          <label class="powder-brush-label">Brush: <span id="powderBrushVal">3</span></label>
          <input type="range" class="powder-brush-slider" id="powderBrush" min="1" max="8" value="3"/>
        </div>
        <canvas class="powder-canvas" id="powderCanvas"></canvas>
        <div class="game-actions">
          <button class="game-action" id="powderClear" type="button">Clear all</button>
          <button class="game-action" id="powderPause" type="button">Pause</button>
        </div>
      </div>
    `
  );

  const CELL = 4;
  const canvas = document.querySelector("#powderCanvas");
  const ctx = canvas.getContext("2d");
  let w, h, cols, rows;
  let grid, nextGrid, life;
  let selectedElement = 1;
  let brushSize = 3;
  let painting = false;
  let paused = false;
  let mouseX = 0, mouseY = 0;
  let raf;

  const NAMES = ["", "Sand", "Water", "Stone", "Fire", "Smoke", "Oil", "Acid", "Plant"];
  const COLORS = {
    1: ["#d4a574", "#c9956a", "#deb887", "#c8956e"],
    2: ["#4f8fcf", "#5a9fd8", "#3d7dbf", "#6aafef"],
    3: ["#6b7280", "#7b8290", "#5b6270", "#8b92a0"],
    4: ["#ff6b35", "#ff4500", "#ff8c00", "#ffaa33"],
    5: ["#9ca3af", "#b0b8c4", "#8892a0", "#c0c8d4"],
    6: ["#a0845c", "#b0946c", "#90744c", "#c0a47c"],
    7: ["#22c55e", "#16a34a", "#34d058", "#4ade80"],
    8: ["#166534", "#15803d", "#14532d", "#19782e"]
  };

  const SAND = 1, WATER = 2, STONE = 3, FIRE = 4, SMOKE = 5, OIL = 6, ACID = 7, PLANT = 8;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    w = canvas.width = rect.width || 480;
    h = canvas.height = rect.height || 340;
    cols = Math.ceil(w / CELL);
    rows = Math.ceil(h / CELL);
    grid = new Uint8Array(cols * rows);
    nextGrid = new Uint8Array(cols * rows);
    life = new Int16Array(cols * rows);
  }
  resize();

  function idx(x, y) { return y * cols + x; }
  function get(x, y) {
    if (x < 0 || x >= cols || y < 0 || y >= rows) return STONE;
    return grid[idx(x, y)];
  }
  function set(x, y, val) {
    if (x < 0 || x >= cols || y < 0 || y >= rows) return;
    nextGrid[idx(x, y)] = val;
  }
  function setLife(x, y, v) {
    if (x >= 0 && x < cols && y >= 0 && y < rows) life[idx(x, y)] = v;
  }
  function getLife(x, y) {
    if (x < 0 || x >= cols || y < 0 || y >= rows) return 0;
    return life[idx(x, y)];
  }
  function isEmpty(x, y) { return get(x, y) === 0; }
  function isType(x, y, t) { return get(x, y) === t; }
  function swap(x1, y1, x2, y2) {
    const a = get(x1, y1);
    set(x1, y1, get(x2, y2));
    set(x2, y2, a);
    const la = getLife(x1, y1);
    setLife(x1, y1, getLife(x2, y2));
    setLife(x2, y2, la);
  }

  function density(type) {
    if (type === 0) return 0;
    if (type === SMOKE) return 1;
    if (type === FIRE) return 2;
    if (type === WATER) return 5;
    if (type === OIL) return 4;
    if (type === ACID) return 5;
    if (type === SAND) return 8;
    return 99;
  }

  function step() {
    nextGrid.set(grid);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = idx(x, y);
        const type = grid[i];
        if (type === 0 || type === STONE) continue;
        if (type === SAND) stepSand(x, y);
        else if (type === WATER) stepLiquid(x, y, WATER);
        else if (type === ACID) stepLiquid(x, y, ACID);
        else if (type === OIL) stepLiquid(x, y, OIL);
        else if (type === FIRE) stepFire(x, y);
        else if (type === SMOKE) stepSmoke(x, y);
        else if (type === PLANT) stepPlant(x, y);
      }
    }
    const tmp = grid;
    grid = nextGrid;
    nextGrid = tmp;
  }

  function stepSand(x, y) {
    if (tryMove(x, y, x, y + 1)) return;
    const dir = Math.random() < 0.5 ? -1 : 1;
    if (tryMove(x, y, x + dir, y + 1)) return;
    if (tryMove(x, y, x - dir, y + 1)) return;
  }

  function tryMove(x1, y1, x2, y2) {
    if (x2 < 0 || x2 >= cols || y2 < 0 || y2 >= rows) return false;
    const a = get(x1, y1);
    const b = get(x2, y2);
    if (a === b) return false;
    if (b === STONE) return false;
    if (isLiquid(a) && b !== 0 && !isLiquid(b)) return false;
    if (isLiquid(b) && a !== 0 && !isLiquid(a) && density(a) >= density(b)) return false;
    if (b === 0 || (isLiquid(a) && isLiquid(b) && density(a) > density(b))) {
      swap(x1, y1, x2, y2);
      return true;
    }
    return false;
  }

  function isLiquid(t) { return t === WATER || t === OIL || t === ACID; }

  function stepLiquid(x, y, type) {
    if (tryMove(x, y, x, y + 1)) return;
    const dir = Math.random() < 0.5 ? -1 : 1;
    if (tryMove(x, y, x + dir, y + 1)) return;
    if (tryMove(x, y, x - dir, y + 1)) return;
    const spread = type === OIL ? 3 : 5;
    if (Math.random() < 0.6) {
      if (tryMove(x, y, x + dir, y)) return;
      for (let s = 2; s <= spread; s++) {
        if (tryMove(x, y, x + dir * s, y)) return;
        if (get(x + dir * s, y) !== 0) break;
      }
    }
  }

  function stepFire(x, y) {
    let l = getLife(x, y);
    if (l <= 0) { set(x, y, SMOKE); setLife(x, y, 20 + Math.random() * 30 | 0); return; }
    setLife(x, y, l - 1);
    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1]];
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      const nb = get(nx, ny);
      if (nb === OIL || nb === PLANT) {
        if (Math.random() < 0.15) {
          set(nx, ny, FIRE);
          setLife(nx, ny, 30 + Math.random() * 40 | 0);
        }
      } else if (nb === WATER) {
        set(x, y, SMOKE);
        setLife(x, y, 10);
        return;
      }
    }
    if (Math.random() < 0.03) { set(x, y, SMOKE); setLife(x, y, 15 + Math.random() * 20 | 0); return; }
    if (isEmpty(x, y - 1) || (get(x, y - 1) === SMOKE && Math.random() < 0.5)) {
      if (tryMove(x, y, x, y - 1)) return;
    }
  }

  function stepSmoke(x, y) {
    let l = getLife(x, y);
    if (l <= 0) { set(x, y, 0); return; }
    setLife(x, y, l - 1);
    if (Math.random() < 0.05) { set(x, y, 0); return; }
    if (tryMove(x, y, x, y - 1)) return;
    const dir = Math.random() < 0.5 ? -1 : 1;
    if (tryMove(x, y, x + dir, y - 1)) return;
    if (tryMove(x, y, x + dir, y)) return;
  }

  function stepPlant(x, y) {
    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (const [dx, dy] of dirs) {
      if (isType(x + dx, y + dy, WATER)) {
        set(x + dx, y + dy, 0);
        if (Math.random() < 0.08) {
          const gd = dirs[Math.random() * 4 | 0];
          const gx = x + gd[0], gy = y + gd[1];
          if (isEmpty(gx, gy)) { set(gx, gy, PLANT); }
        }
        return;
      }
    }
    for (const [dx, dy] of dirs) {
      if (isType(x + dx, y + dy, ACID)) {
        set(x, y, 0);
        return;
      }
    }
  }

  function interactions(x, y) {
    const type = get(x, y);
    const dirs = [[0, 1], [0, -1], [-1, 0], [1, 0]];
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      const nb = get(nx, ny);
      if (type === ACID && nb !== 0 && nb !== STONE && nb !== ACID) {
        if (Math.random() < 0.05) { set(nx, ny, 0); setLife(nx, ny, 0); }
      }
    }
  }

  function paint(cx, cy) {
    const r = brushSize;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r + r) continue;
        const x = cx + dx, y = cy + dy;
        if (x < 0 || x >= cols || y < 0 || y >= rows) continue;
        if (selectedElement === 0) {
          set(x, y, 0);
          setLife(x, y, 0);
        } else if (get(x, y) === 0 || get(x, y) === selectedElement) {
          set(x, y, selectedElement);
          if (selectedElement === FIRE) setLife(x, y, 30 + Math.random() * 40 | 0);
          else if (selectedElement === SMOKE) setLife(x, y, 30 + Math.random() * 30 | 0);
          else setLife(x, y, 0);
        }
      }
    }
  }

  function render() {
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const type = grid[idx(x, y)];
        if (type === 0) continue;
        const colors = COLORS[type];
        if (!colors) continue;
        let c;
        if (type === FIRE) {
          const l = getLife(x, y);
          const fi = l > 30 ? 0 : l > 15 ? 1 : 2;
          c = colors[fi] || colors[0];
        } else if (type === SMOKE) {
          const l = getLife(x, y);
          const fi = l > 25 ? 0 : l > 10 ? 1 : 2;
          c = colors[fi] || colors[0];
        } else {
          c = colors[(x + y * 3) % colors.length];
        }
        ctx.fillStyle = c;
        ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }
    let count = 0;
    for (let i = 0; i < grid.length; i++) { if (grid[i] !== 0) count++; }
    document.querySelector("#powderCount").textContent = "Particles: " + count;
  }

  function animate() {
    if (!paused) {
      step();
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (grid[idx(x, y)] !== 0 && grid[idx(x, y)] !== STONE) interactions(x, y);
        }
      }
    }
    render();
    raf = requestAnimationFrame(animate);
  }
  animate();

  function canvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.floor((clientX - rect.left) / (rect.width / cols)),
      y: Math.floor((clientY - rect.top) / (rect.height / rows))
    };
  }

  canvas.addEventListener("mousedown", (e) => {
    painting = true;
    const p = canvasCoords(e);
    mouseX = p.x; mouseY = p.y;
    paint(p.x, p.y);
  });
  canvas.addEventListener("mousemove", (e) => {
    const p = canvasCoords(e);
    mouseX = p.x; mouseY = p.y;
    if (painting) paint(p.x, p.y);
  });
  canvas.addEventListener("mouseup", () => { painting = false; });
  canvas.addEventListener("mouseleave", () => { painting = false; });
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    painting = true;
    const p = canvasCoords(e);
    mouseX = p.x; mouseY = p.y;
    paint(p.x, p.y);
  }, { passive: false });
  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    const p = canvasCoords(e);
    mouseX = p.x; mouseY = p.y;
    if (painting) paint(p.x, p.y);
  }, { passive: false });
  canvas.addEventListener("touchend", () => { painting = false; });

  document.querySelectorAll(".powder-tool").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".powder-tool").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedElement = Number(btn.dataset.element);
      document.querySelector("#powderElement").textContent = "Element: " + NAMES[selectedElement];
    });
  });

  const brushSlider = document.querySelector("#powderBrush");
  const brushVal = document.querySelector("#powderBrushVal");
  brushSlider.addEventListener("input", () => {
    brushSize = Number(brushSlider.value);
    brushVal.textContent = brushSize;
  });

  document.querySelector("#powderClear").addEventListener("click", () => {
    grid.fill(0);
    nextGrid.fill(0);
    life.fill(0);
  });

  document.querySelector("#powderPause").addEventListener("click", () => {
    paused = !paused;
    document.querySelector("#powderPause").textContent = paused ? "Play" : "Pause";
  });

  setSnapshot({
    mode: "playing",
    game: "Powder Sim",
    selectedElement: NAMES[selectedElement],
    brushSize,
    paused
  });

  activeCleanup = () => {
    cancelAnimationFrame(raf);
  };
}

gameStarters.powder = startPowderSim;
