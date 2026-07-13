# kartikkuckreja.github.io

Personal academic website of **Kartik Kuckreja** — live at [kartikkuckreja.github.io](https://kartikkuckreja.github.io).

Hand-built with vanilla HTML/CSS/JS. No frameworks, no build step, no trackers. The design is quiet and typography-first: warm paper, near-black ink, one restrained blue accent, with a matching dark theme.

## How it works

```
index.html            home — bio, research focus, selected publications, news
publications.html     all papers, rendered from JSON, with live badges
research.html         research areas in prose
news.html             the full news log
about.html            bio, experience, contact
assets/
  css/main.css        the whole design system (light + dark themes)
  js/main.js          theme toggle, scroll reveals, nav
  js/site-data.js     renders publications & news from JSON; live GitHub-star and
                      HF-download badges; BibTeX generator
  data/publications.json   ← the single source of truth for papers
  data/news.json           ← the single source of truth for news
scripts/update_publications.py   arXiv watcher (stdlib only)
.github/workflows/update-publications.yml   daily sync job
```

## Automatic publication updates

A GitHub Action runs daily at 06:17 UTC. It queries the arXiv API for new papers
authored by *Kartik Kuckreja*, and if it finds one that isn't in
`assets/data/publications.json`, it opens a **pull request** adding the paper (as a
preprint) and a news entry. GitHub emails you when the PR opens. Merge it and the
site updates; edit the JSON on the PR branch first if you want to set a venue,
thumbnail, topics, or repo links.

> **One-time setup**: in the repo, go to *Settings → Actions → General → Workflow
> permissions* and enable **"Allow GitHub Actions to create and approve pull
> requests"** (plus "Read and write permissions"). You can also trigger the job
> manually from the Actions tab ("Sync publications from arXiv" → Run workflow).

## Adding or editing a paper by hand

Edit `assets/data/publications.json`. Useful fields:

- `venue` — e.g. `"CVPR 2026"` or `"Preprint"`; `award` — e.g. `"Highlight"`
- `github_repo` — `"owner/repo"` → shows a live star-count chip
- `hf_dataset` — HF dataset id → shows a live download-count chip
- `thumbnail` — path under `assets/img/`; leave `null` for a generated pattern
- `topics` — used by the filter chips on the publications page
- `selected: true` — features the paper on the homepage
- `equal_contribution` — list of author names to mark with `*`

News lives in `assets/data/news.json` (newest first, `pinned: true` highlights).

## Local development

```bash
python3 -m http.server 4173
# open http://localhost:4173
```

## Custom domain (optional)

1. Buy a domain (e.g. `kartikkuckreja.com`).
2. Add a `CNAME` file to this repo containing just the domain name.
3. At your DNS provider, add a `CNAME` record pointing `www` to
   `kjaerstuisk.github.io`, and `A`/`ALIAS` records for the apex to GitHub Pages
   IPs (`185.199.108.153` …`.109` …`.110` …`.111`).
4. In *Settings → Pages*, set the custom domain and enable *Enforce HTTPS*.
