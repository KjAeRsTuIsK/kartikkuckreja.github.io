/* site-data.js — renders publications & news from JSON, live GitHub/HF badges,
   procedural thumbnails, BibTeX. All vanilla, no dependencies. */
(function () {
  const ME = "Kartik Kuckreja";
  const TTL = 6 * 60 * 60 * 1000; // 6h badge cache

  const ICONS = {
    paper: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></svg>',
    code: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>',
    dataset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
    model: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12"/></svg>',
    project: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>',
    dl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>',
    bib: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12a1 1 0 0 1 1 1v16l-7-4-7 4V4a1 1 0 0 1 1-1z"/></svg>'
  };

  // ---------- utils ----------
  const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k" : String(n));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  async function cachedFetch(key, url) {
    try {
      const hit = JSON.parse(localStorage.getItem(key) || "null");
      if (hit && Date.now() - hit.t < TTL) return hit.v;
    } catch (e) {}
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    const v = await res.json();
    try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), v })); } catch (e) {}
    return v;
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  // ---------- placeholder thumbnail (for papers with no figure yet) ----------
  function drawProceduralThumb(canvas, pub) {
    // square canvas + centered composition so object-fit:cover crops safely
    const W = 460, H = 460;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    const paper = cssVar("--paper-raise") || "#fdfcf9";
    const faint = cssVar("--ink-faint") || "#7b7d80";
    const line = cssVar("--line-strong") || "rgba(27,28,30,.3)";

    ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H);
    // graph-paper grid
    ctx.strokeStyle = cssVar("--grid-line") || "rgba(27,28,30,.05)";
    ctx.lineWidth = 1;
    for (let x = 0.5; x < W; x += 28) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0.5; y < H; y += 28) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.strokeStyle = line;
    ctx.fillStyle = paper; ctx.fillRect(120, 190, 220, 80);
    ctx.strokeRect(120, 190, 220, 80);
    ctx.fillStyle = faint;
    ctx.font = "500 17px 'IBM Plex Mono', monospace";
    const wm = pub.arxiv ? "arXiv:" + pub.arxiv : "paper";
    ctx.fillText(wm, (W - ctx.measureText(wm).width) / 2, H / 2 + 6);
  }

  // ---------- BibTeX ----------
  function bibtex(pub) {
    const first = pub.authors[0].split(" ").pop().toLowerCase().replace(/[^a-z]/g, "");
    const word = pub.title.split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, "");
    const key = first + pub.year + word;
    const authors = pub.authors.filter((a) => a !== "et al.").join(" and ");
    if (pub.venue === "Preprint" && pub.arxiv) {
      return `@article{${key},\n  title={${pub.title}},\n  author={${authors}},\n  journal={arXiv preprint arXiv:${pub.arxiv}},\n  year={${pub.year}}\n}`;
    }
    return `@inproceedings{${key},\n  title={${pub.title}},\n  author={${authors}},\n  booktitle={${pub.venue.replace(/ \d{4}.*/, "")}},\n  year={${pub.year}}\n}`;
  }

  // ---------- author line ----------
  function authorLine(pub, links) {
    return pub.authors.map((a) => {
      const star = pub.equal_contribution && pub.equal_contribution.includes(a) ? "*" : "";
      if (a === ME) return `<span class="me">${esc(a)}${star}</span>`;
      if (a === "et al.") return `<em>${pub.author_note ? esc("et al.") : "et al."}</em>`;
      const url = links[a];
      return url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(a)}${star}</a>` : esc(a) + star;
    }).join(", ");
  }

  // ---------- live badges ----------
  async function fillGithub(el, repo) {
    try {
      const d = await cachedFetch("gh:" + repo, "https://api.github.com/repos/" + repo);
      el.innerHTML = `${ICONS.star}<b>${fmt(d.stargazers_count)}</b>&nbsp;${d.stargazers_count === 1 ? "star" : "stars"}`;
      el.title = repo + " on GitHub";
    } catch (e) { el.innerHTML = `${ICONS.star}stars`; }
  }
  async function fillHF(el, id, kind, label) {
    try {
      const d = await cachedFetch("hf2:" + kind + ":" + id, "https://huggingface.co/api/" + kind + "/" + encodeURI(id) + "?expand[]=downloads&expand[]=downloadsAllTime");
      const n = d.downloadsAllTime ?? d.downloads;
      if (n == null) throw 0;
      el.innerHTML = `${ICONS.dl}<b>${fmt(n)}</b>&nbsp;${label}`;
      el.title = id + " on Hugging Face — total downloads";
    } catch (e) { el.style.display = "none"; }
  }

  // ---------- publication card ----------
  function pubCard(pub, links) {
    const el = document.createElement("article");
    el.className = "pub card reveal";
    el.dataset.topics = (pub.topics || []).join(" ");
    el.dataset.year = pub.year;

    const thumb = pub.thumbnail
      ? `<img src="${esc(pub.thumbnail)}" alt="Figure from ${esc(pub.title)}" loading="lazy">`
      : `<canvas data-proc aria-hidden="true"></canvas>`;

    const venueCls = pub.venue === "Preprint" ? "chip venue preprint" : "chip venue";
    const award = pub.award ? `<span class="chip award">★ ${esc(pub.award)}</span>` : "";

    const linkChips = [];
    if (pub.links.paper) linkChips.push(`<a class="chip" href="${esc(pub.links.paper)}" target="_blank" rel="noopener">${ICONS.paper}${pub.arxiv ? "arXiv" : "paper"}</a>`);
    if (pub.links.code) linkChips.push(`<a class="chip" href="${esc(pub.links.code)}" target="_blank" rel="noopener">${ICONS.code}code</a>`);
    if (pub.links.model) linkChips.push(`<a class="chip" href="${esc(pub.links.model)}" target="_blank" rel="noopener">${ICONS.model}model</a>`);
    if (pub.links.dataset) linkChips.push(`<a class="chip" href="${esc(pub.links.dataset)}" target="_blank" rel="noopener">${ICONS.dataset}dataset</a>`);
    if (pub.links.project) linkChips.push(`<a class="chip" href="${esc(pub.links.project)}" target="_blank" rel="noopener">${ICONS.project}project</a>`);
    const gh = pub.github_repo ? `<a class="chip stat" data-gh="${esc(pub.github_repo)}" href="https://github.com/${esc(pub.github_repo)}" target="_blank" rel="noopener">${ICONS.star}…</a>` : "";
    const both = pub.hf_dataset && pub.hf_model;
    const hf = pub.hf_dataset ? `<a class="chip stat" data-hf="${esc(pub.hf_dataset)}" href="https://huggingface.co/datasets/${esc(pub.hf_dataset)}" target="_blank" rel="noopener">${ICONS.dl}…</a>` : "";
    const hfm = pub.hf_model ? `<a class="chip stat" data-hfm="${esc(pub.hf_model)}" href="https://huggingface.co/${esc(pub.hf_model)}" target="_blank" rel="noopener">${ICONS.dl}…</a>` : "";

    el.innerHTML = `
      <div class="pub-thumb">${thumb}</div>
      <div class="pub-body">
        <div class="chips" style="margin-bottom:8px">
          <span class="${venueCls}">${esc(pub.venue)}</span>${award}
          <span class="chip">${pub.year}</span>
        </div>
        <h3 class="pub-title"><a href="${esc(pub.links.paper || "#")}" target="_blank" rel="noopener">${esc(pub.title)}</a></h3>
        <p class="pub-authors">${authorLine(pub, links)}</p>
        <p class="pub-abstract">${esc(pub.abstract || "")}</p>
        <div class="chips">
          ${linkChips.join("")}${gh}${hf}${hfm}
          ${pub.abstract ? `<button class="chip" data-abs>abstract</button>` : ""}
          <button class="chip" data-bib>${ICONS.bib}BibTeX</button>
        </div>
        <div class="bib-pop"><pre>${esc(bibtex(pub))}</pre>
          <div class="chips" style="margin-top:8px"><button class="chip" data-copy>copy</button></div>
        </div>
      </div>`;

    const proc = el.querySelector("[data-proc]");
    if (proc) {
      drawProceduralThumb(proc, pub);
      document.addEventListener("themechange", () => drawProceduralThumb(proc, pub));
    }
    const ghEl = el.querySelector("[data-gh]"); if (ghEl) fillGithub(ghEl, pub.github_repo);
    const hfEl = el.querySelector("[data-hf]"); if (hfEl) fillHF(hfEl, pub.hf_dataset, "datasets", both ? "dataset downloads" : "downloads");
    const hfmEl = el.querySelector("[data-hfm]"); if (hfmEl) fillHF(hfmEl, pub.hf_model, "models", both ? "model downloads" : "downloads");
    const absBtn = el.querySelector("[data-abs]");
    if (absBtn) absBtn.addEventListener("click", () => el.classList.toggle("open"));
    el.querySelector("[data-bib]").addEventListener("click", () => el.classList.toggle("bib-open"));
    el.querySelector("[data-copy]").addEventListener("click", (ev) => {
      navigator.clipboard.writeText(bibtex(pub)).then(() => {
        ev.target.textContent = "copied ✓";
        setTimeout(() => (ev.target.textContent = "copy"), 1600);
      });
    });
    return el;
  }

  // ---------- renderers ----------
  const DATA_V = "?v=5";
  async function getData() {
    if (!window.__pubData) window.__pubData = fetch("/assets/data/publications.json" + DATA_V).then((r) => r.json());
    return window.__pubData;
  }
  async function getNews() {
    if (!window.__newsData) window.__newsData = fetch("/assets/data/news.json" + DATA_V).then((r) => r.json());
    return window.__newsData;
  }

  async function renderPubs(sel, opts = {}) {
    const host = document.querySelector(sel);
    if (!host) return;
    const data = await getData();
    let pubs = data.publications.slice();
    if (opts.selectedOnly) pubs = pubs.filter((p) => p.selected);
    if (opts.limit) pubs = pubs.slice(0, opts.limit);
    host.innerHTML = "";
    pubs.forEach((p) => host.appendChild(pubCard(p, data.author_links)));
    if (window.observeReveals) window.observeReveals(host);
  }

  function setupFilters(listSel, filterSel) {
    const bar = document.querySelector(filterSel);
    if (!bar) return;
    bar.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-filter]");
      if (!btn) return;
      bar.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      const f = btn.dataset.filter;
      document.querySelectorAll(listSel + " .pub").forEach((card) => {
        const show = f === "all" || card.dataset.topics.split(" ").includes(f);
        card.style.display = show ? "" : "none";
      });
    });
  }

  async function renderNews(sel, opts = {}) {
    const host = document.querySelector(sel);
    if (!host) return;
    const { news } = await getNews();
    let items = news.slice();
    if (opts.limit) items = items.slice(0, opts.limit);
    if (opts.grouped) {
      host.innerHTML = "";
      let year = "";
      let ul = null;
      items.forEach((n) => {
        const y = n.date.slice(0, 4);
        if (y !== year) {
          year = y;
          const h = document.createElement("div");
          h.className = "year-mark reveal"; h.textContent = y;
          host.appendChild(h);
          ul = document.createElement("ul"); ul.className = "timeline";
          host.appendChild(ul);
        }
        const li = document.createElement("li");
        li.className = "reveal" + (n.pinned ? " pinned" : "");
        li.innerHTML = `<span class="tdate">${esc(n.label)}${n.tag ? " · " + esc(n.tag) : ""}</span><span class="ttext">${n.text}</span>`;
        ul.appendChild(li);
      });
    } else {
      host.innerHTML = "";
      const ul = document.createElement("ul"); ul.className = "timeline";
      items.forEach((n) => {
        const li = document.createElement("li");
        li.className = "reveal" + (n.pinned ? " pinned" : "");
        li.innerHTML = `<span class="tdate">${esc(n.label)}</span><span class="ttext">${n.text}</span>`;
        ul.appendChild(li);
      });
      host.appendChild(ul);
    }
    if (window.observeReveals) window.observeReveals(host);
  }

  // total stars across every repo linked from the publications list
  async function fillTotalStars(sel) {
    const el = document.querySelector(sel);
    if (!el) return;
    try {
      const data = await getData();
      const repos = [...new Set(data.publications.map((p) => p.github_repo).filter(Boolean))];
      const counts = await Promise.all(repos.map((r) => cachedFetch("gh:" + r, "https://api.github.com/repos/" + r).then((d) => d.stargazers_count).catch(() => 0)));
      const total = counts.reduce((a, b) => a + b, 0);
      if (total > 0) el.textContent = fmt(total);
    } catch (e) { /* leave placeholder */ }
  }

  window.Site = { renderPubs, renderNews, setupFilters, fillTotalStars };
})();
