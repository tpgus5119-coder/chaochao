# -*- coding: utf-8 -*-
"""Google 뉴스 RSS에서 주제별 기사 후보를 모은다. 난수·크롤링 차단 없음(공식 RSS).

여기서 거르는 것(결정론적):
 - 제목·링크 없는 항목
 - 같은 링크/제목 중복
 - 한글 기사가 아닌 것 (독자가 한국인)
 - 관영·현지매체 지정 목록 (config.FOREIGN_MEDIA_DENY)
'기사 내용' 판단(경제인지, 홍보성인지, 같은 사안인지)은 curate.py(Claude)가 한다.
"""
import datetime as dt
import re
import urllib.parse

import feedparser
import requests

import config

_GN = "https://news.google.com/rss/search?q={q}&hl=ko&gl=KR&ceid=KR:ko"
_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
_TAG = re.compile(r"<[^>]+>")
_WS = re.compile(r"\s+")
_HANGUL = re.compile(r"[가-힣]")
_LATIN = re.compile(r"[A-Za-z]")


def _clean(s: str) -> str:
    return _WS.sub(" ", _TAG.sub(" ", s or "")).strip()


def _strip_source_suffix(title: str, source: str) -> str:
    """Google 뉴스가 붙이는 ' - 언론사' 꼬리 제거."""
    if source and title.endswith(" - " + source):
        return title[: -(len(source) + 3)].strip()
    return re.sub(r"\s+-\s+[^-]{1,20}$", "", title).strip() if " - " in title else title


def norm_title(t: str) -> str:
    """중복 판정용 제목 정규화 (기호·공백 제거)."""
    return _WS.sub("", re.sub(r"[^\w가-힣]", "", (t or "").lower()))


def is_korean(text: str) -> bool:
    """한글 기사 판정: 한글이 있고, 라틴 알파벳이 한글보다 많지 않으면 통과."""
    h = len(_HANGUL.findall(text))
    l = len(_LATIN.findall(text))
    return h >= 2 and h >= l


def _fetch_one(query: str, days: int):
    q = urllib.parse.quote(f"{query} when:{days}d")
    resp = requests.get(_GN.format(q=q), headers={"User-Agent": _UA}, timeout=20)
    resp.raise_for_status()
    feed = feedparser.parse(resp.content)
    items = []
    for e in feed.entries:
        pub = None
        if getattr(e, "published_parsed", None):
            pub = dt.datetime(*e.published_parsed[:6], tzinfo=dt.timezone.utc)
        src = ""
        if getattr(e, "source", None):
            src = getattr(e.source, "title", "") or e.get("source", {}).get("title", "")
        src = _clean(src)
        title = _strip_source_suffix(_clean(e.get("title", "")), src)
        items.append({
            "title": title,
            "link": e.get("link", ""),
            "source": src,
            "published": pub.isoformat() if pub else "",
            "published_ts": pub.timestamp() if pub else 0.0,
            "summary": _clean(e.get("summary", ""))[:400],
        })
    return items


def collect(topic_cfg: dict, days: int):
    """주제 설정을 받아 필터·중복제거한 후보 리스트를 최신순으로 반환."""
    deny = {d.lower() for d in getattr(config, "FOREIGN_MEDIA_DENY", [])}
    seen_link, seen_title, out = set(), set(), []
    for query in topic_cfg["queries"]:
        for it in _fetch_one(query, days):
            nt = norm_title(it["title"])
            if not it["title"] or not it["link"]:
                continue
            if it["source"].lower() in deny:
                continue
            if not is_korean(it["title"]):
                continue
            if it["link"] in seen_link or (nt and nt in seen_title):
                continue
            seen_link.add(it["link"])
            seen_title.add(nt)
            out.append(it)
    out.sort(key=lambda x: x["published_ts"], reverse=True)
    return out
