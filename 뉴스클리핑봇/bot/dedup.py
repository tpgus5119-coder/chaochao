# -*- coding: utf-8 -*-
"""이전에 보낸 기사 기록.

- 링크 / 정규화 제목이 기록에 있으면 중복 (재전송 안 함)
- recent_headlines(): 최근 N일간 보낸 원제목 → Claude에 넘겨 '같은 사안' 제외
sent_history.json 키 규칙:
  "L:<link>"        -> 보낸 시각(iso)
  "T:<정규화제목>"   -> 보낸 시각(iso)
  "H:<iso>|<정규화제목>" -> 사람이 읽는 원제목
"""
import datetime as dt
import json
import os

from collect import norm_title

_PATH = os.path.join(os.path.dirname(__file__), "sent_history.json")


def _now():
    return dt.datetime.now(dt.timezone.utc).isoformat()


def _load():
    try:
        with open(_PATH, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def _save(data):
    tmp = _PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    os.replace(tmp, _PATH)


def _entry_date(key, value):
    if key.startswith("H:"):
        return key[2:].split("|", 1)[0]
    return value


def _prune(data, retention_days):
    cutoff = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=retention_days)).isoformat()
    return {k: v for k, v in data.items() if _entry_date(k, v) >= cutoff}


def load_state(retention_days):
    data = _prune(_load(), retention_days)
    _save(data)
    return data


def is_dup(state, article) -> bool:
    if article.get("link") and ("L:" + article["link"]) in state:
        return True
    nt = norm_title(article.get("title", ""))
    return bool(nt) and ("T:" + nt) in state


def mark(state, article):
    now = _now()
    nt = norm_title(article.get("title", ""))
    if article.get("link"):
        state["L:" + article["link"]] = now
    if nt:
        state["T:" + nt] = now
    state[f"H:{now}|{nt}"] = article.get("title", "")


def recent_headlines(state, days):
    cutoff = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=days)).isoformat()
    return [v for k, v in state.items()
            if k.startswith("H:") and k[2:].split("|", 1)[0] >= cutoff and v]


def commit(state):
    _save(state)
