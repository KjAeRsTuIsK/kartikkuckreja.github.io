#!/usr/bin/env python3
"""Watch arXiv for new papers by Kartik Kuckreja and add them to the site.

Runs daily via .github/workflows/update-publications.yml. When a paper
appears on arXiv that isn't in assets/data/publications.json yet, it is
prepended (as a Preprint) and a matching entry is added to news.json.
The workflow then opens a pull request, which emails the site owner.

No dependencies beyond the Python standard library.
"""
import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path

AUTHOR = "Kartik Kuckreja"
API = (
    "https://export.arxiv.org/api/query?search_query=au:%22Kuckreja%22"
    "&sortBy=submittedDate&sortOrder=descending&max_results=50"
)
NS = {"a": "http://www.w3.org/2005/Atom"}
ROOT = Path(__file__).resolve().parent.parent
PUBS_PATH = ROOT / "assets" / "data" / "publications.json"
NEWS_PATH = ROOT / "assets" / "data" / "news.json"


def norm_title(t: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", t.lower()).strip()


def slugify(title: str) -> str:
    words = re.sub(r"[^a-z0-9 ]", "", title.lower()).split()
    return "-".join(words[:4]) or "paper"


def fetch_arxiv():
    req = urllib.request.Request(API, headers={"User-Agent": "kartikkuckreja.github.io publication sync"})
    with urllib.request.urlopen(req, timeout=60) as r:
        tree = ET.fromstring(r.read())
    papers = []
    for e in tree.findall("a:entry", NS):
        authors = [a.find("a:name", NS).text.strip() for a in e.findall("a:author", NS)]
        if AUTHOR not in authors:
            continue
        raw_id = e.find("a:id", NS).text  # http://arxiv.org/abs/2311.15826v1
        arxiv_id = raw_id.rsplit("/", 1)[-1]
        arxiv_id = re.sub(r"v\d+$", "", arxiv_id)
        papers.append({
            "arxiv": arxiv_id,
            "title": " ".join(e.find("a:title", NS).text.split()),
            "authors": authors,
            "published": e.find("a:published", NS).text[:10],
            "summary": " ".join(e.find("a:summary", NS).text.split()),
        })
    return papers


def main() -> int:
    pubs_doc = json.loads(PUBS_PATH.read_text())
    news_doc = json.loads(NEWS_PATH.read_text())
    known_ids = {p.get("arxiv") for p in pubs_doc["publications"] if p.get("arxiv")}
    known_titles = {norm_title(p["title"]) for p in pubs_doc["publications"]}

    added = []
    for paper in fetch_arxiv():
        if paper["arxiv"] in known_ids or norm_title(paper["title"]) in known_titles:
            continue
        year = int(paper["published"][:4])
        entry = {
            "id": slugify(paper["title"]),
            "arxiv": paper["arxiv"],
            "title": paper["title"],
            "authors": paper["authors"],
            "equal_contribution": [],
            "venue": "Preprint",
            "award": None,
            "year": year,
            "date": paper["published"],
            "abstract": paper["summary"][:420] + ("…" if len(paper["summary"]) > 420 else ""),
            "thumbnail": None,
            "links": {"paper": f"https://arxiv.org/abs/{paper['arxiv']}"},
            "github_repo": None,
            "hf_dataset": None,
            "topics": [],
            "selected": False,
        }
        pubs_doc["publications"].insert(0, entry)
        month = paper["published"][:7]
        news_doc["news"].insert(0, {
            "date": month,
            "label": month,
            "text": (
                f"New preprint on arXiv: <a href='https://arxiv.org/abs/{paper['arxiv']}'"
                f" target='_blank' rel='noopener'>{paper['title']}</a>."
            ),
            "tag": "paper",
        })
        added.append(paper)

    if not added:
        print("No new papers found — publications.json is up to date.")
        return 0

    pubs_doc["publications"].sort(key=lambda p: p.get("date", ""), reverse=True)
    PUBS_PATH.write_text(json.dumps(pubs_doc, indent=2, ensure_ascii=False) + "\n")
    NEWS_PATH.write_text(json.dumps(news_doc, indent=2, ensure_ascii=False) + "\n")

    print(f"Added {len(added)} new paper(s):")
    for p in added:
        print(f"  - {p['title']} (arXiv:{p['arxiv']}, {p['published']})")

    # expose a summary for the workflow step that opens the PR
    summary = "; ".join(f"{p['title']} (arXiv:{p['arxiv']})" for p in added)
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    if out:
        out.write_text(summary)
    return 0


if __name__ == "__main__":
    sys.exit(main())
