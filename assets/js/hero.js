/* hero.js — "darkroom develop": a scanline sweeps down the portrait revealing
   its Sobel edge map (an ink line-sketch on paper), holds, then dissolves into
   the photograph. Hovering the portrait runs the pipeline again. */
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const holder = document.querySelector(".detect");
  const img = holder && holder.querySelector("img");
  if (!holder || !img) return;

  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;";
  holder.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  const src = new Image();
  src.src = img.currentSrc || img.src;

  let sketch = null, raf = null, startT = 0;

  function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function hexToRgb(h) {
    h = h.replace("#", "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  // build the edge-sketch layer at analysis resolution
  function buildSketch() {
    const W = 440;
    const H = Math.round(W * (src.naturalHeight / src.naturalWidth));
    const off = document.createElement("canvas");
    off.width = W; off.height = H;
    const octx = off.getContext("2d", { willReadFrequently: true });
    octx.drawImage(src, 0, 0, W, H);
    const d = octx.getImageData(0, 0, W, H).data;
    const gray = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) gray[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];

    const ink = hexToRgb(cssVar("--ink") || "#1d1a13");
    const out = octx.createImageData(W, H);
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        const gx = -gray[i - W - 1] - 2 * gray[i - 1] - gray[i + W - 1] + gray[i - W + 1] + 2 * gray[i + 1] + gray[i + W + 1];
        const gy = -gray[i - W - 1] - 2 * gray[i - W] - gray[i - W + 1] + gray[i + W - 1] + 2 * gray[i + W] + gray[i + W + 1];
        const mag = Math.sqrt(gx * gx + gy * gy);
        if (mag > 60) {
          const a = Math.min(255, (mag - 60) * 1.7);
          const o = i * 4;
          out.data[o] = ink[0]; out.data[o + 1] = ink[1]; out.data[o + 2] = ink[2]; out.data[o + 3] = a;
        }
      }
    }
    octx.putImageData(out, 0, 0);
    return off;
  }

  function sizeCanvas() {
    const r = holder.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
  }

  const SWEEP = 1.5, HOLD = 1.1, FADE = 1.2; // seconds per phase

  function frame(ts) {
    if (!startT) startT = ts;
    const t = (ts - startT) / 1000;
    const w = canvas.width, h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    let alpha = 1;
    if (t > SWEEP + HOLD) alpha = Math.max(0, 1 - (t - SWEEP - HOLD) / FADE);
    if (alpha <= 0) { raf = null; return; }

    ctx.globalAlpha = alpha;
    ctx.fillStyle = cssVar("--paper-raise") || "#fbf8f0";
    ctx.fillRect(0, 0, w, h);

    // reveal the sketch top→bottom with the scanline
    const p = Math.min(1, t / SWEEP);
    const eased = 1 - Math.pow(1 - p, 2.2);
    const yCut = Math.round(eased * h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, yCut);
    ctx.clip();
    ctx.drawImage(sketch, 0, 0, w, h);
    ctx.restore();

    // scanline + readout
    if (p < 1) {
      const accent = cssVar("--accent") || "#0e6b3d";
      ctx.fillStyle = accent;
      ctx.globalAlpha = alpha * 0.9;
      ctx.fillRect(0, yCut, w, Math.max(2, h * 0.004));
      ctx.globalAlpha = alpha * 0.14;
      ctx.fillRect(0, Math.max(0, yCut - h * 0.04), w, h * 0.04);
      ctx.globalAlpha = alpha;
      ctx.font = `600 ${Math.max(10, w * 0.028)}px 'IBM Plex Mono', monospace`;
      ctx.fillStyle = accent;
      ctx.fillText("sobel " + Math.round(p * 100) + "%", w * 0.03, Math.min(h - 8, yCut + h * 0.045));
    }
    raf = requestAnimationFrame(frame);
  }

  function run() {
    if (raf) cancelAnimationFrame(raf);
    sizeCanvas();
    if (!sketch) sketch = buildSketch();
    startT = 0;
    raf = requestAnimationFrame(frame);
  }

  src.onload = () => run();
  document.addEventListener("themechange", () => { sketch = null; if (!raf) run(); });

  let cooling = false;
  holder.addEventListener("mouseenter", () => {
    if (cooling || raf) return;
    cooling = true;
    run();
    setTimeout(() => (cooling = false), 4500);
  });
})();
