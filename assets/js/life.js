/* life.js — Conway's Game of Life strip under the hero.
   Sparse random seed plus a few gliders; moving the cursor over the strip
   births cells. Colors come from the active theme. */
(function () {
  const canvas = document.getElementById("life");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const CELL = 13;        // css px per cell
  const HEIGHT = 91;      // strip height, css px (7 rows)
  const TICK = 200;       // ms per generation

  let cols = 0, rows = 0, dpr = 1;
  let grid = null, next = null;

  function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }

  function glider(cx, cy) {
    // classic glider, heading down-right
    [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]].forEach(([dx, dy]) => {
      const x = (cx + dx + cols) % cols, y = (cy + dy + rows) % rows;
      grid[y * cols + x] = 1;
    });
  }

  function seed() {
    grid.fill(0);
    for (let i = 0; i < cols * rows; i++) if (Math.random() < 0.10) grid[i] = 1;
    for (let g = 0; g < Math.max(2, Math.floor(cols / 30)); g++) {
      glider(Math.floor(Math.random() * cols), Math.floor(Math.random() * (rows - 4)));
    }
  }

  function resize() {
    const w = canvas.parentElement.clientWidth;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(HEIGHT * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = HEIGHT + "px";
    cols = Math.max(10, Math.floor(w / CELL));
    rows = Math.max(4, Math.floor(HEIGHT / CELL));
    grid = new Uint8Array(cols * rows);
    next = new Uint8Array(cols * rows);
    seed();
    draw();
  }

  function step() {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            n += grid[((y + dy + rows) % rows) * cols + ((x + dx + cols) % cols)];
          }
        }
        const i = y * cols + x;
        next[i] = grid[i] ? (n === 2 || n === 3 ? 1 : 0) : (n === 3 ? 1 : 0);
      }
    }
    [grid, next] = [next, grid];
    // if the board dies out or stagnates too sparse, reseed quietly
    let alive = 0;
    for (let i = 0; i < grid.length; i++) alive += grid[i];
    if (alive < cols * rows * 0.02) seed();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const accent = cssVar("--accent") || "#2a527d";
    const cw = canvas.width / cols, ch = canvas.height / rows;
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.78;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (grid[y * cols + x]) ctx.fillRect(x * cw + 1, y * ch + 1, cw - 2, ch - 2);
      }
    }
    ctx.globalAlpha = 1;
  }

  function birthAt(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const x = Math.floor((clientX - r.left) / (r.width / cols));
    const y = Math.floor((clientY - r.top) / (r.height / rows));
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (Math.random() < 0.7) {
          const xi = (x + dx + cols) % cols, yi = (y + dy + rows) % rows;
          grid[yi * cols + xi] = 1;
        }
      }
    }
    draw();
  }

  canvas.parentElement.addEventListener("pointermove", (e) => birthAt(e.clientX, e.clientY));
  canvas.parentElement.addEventListener("pointerdown", (e) => birthAt(e.clientX, e.clientY));

  let timer = null;
  function start() {
    if (timer || reduced) return;
    timer = setInterval(() => { if (!document.hidden) { step(); draw(); } }, TICK);
  }

  window.addEventListener("resize", () => { clearTimeout(window.__lifeRz); window.__lifeRz = setTimeout(resize, 150); });
  document.addEventListener("themechange", draw);

  resize();
  start();
})();
