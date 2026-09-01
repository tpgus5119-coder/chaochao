#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""**이미 받아 둔 기사** 중에서 오늘 카드로 낼 것을 고른다 → news_days.json 의 pub

fetch_news.py 는 **새 기사를 받을 때** 고른다. 그런데 이미 받아 둔 기사 중에서
다시 고르고 싶을 때가 있다 (기준을 바꿨거나, 오늘 새 기사가 적을 때).
그때 이 도구를 쓴다. 인터넷을 안 탄다.

## 고르는 잣대 (docs/기준.md 와 같다)
  · 주제마다 자리: 일자리3 · 경제2 · 사회2 · 문화2 · 공장2 · 정치1
  · 여섯 줄 풀이가 있고, 낱말 여섯 이상, 대화 두 줄 이상인 것만
  · 모자라면 주제 상관없이 채워 최소 10건
  · 정치는 베트남 밖 매체에서만

쓰기: python3 tools/card_pick.py [--pub 2026-09-02] [--days 3]
"""
import argparse, json, pathlib, re
from collections import Counter
from datetime import datetime, timedelta, timezone

R = pathlib.Path(__file__).resolve().parent.parent
QUOTA = [('일자리', 3), ('경제', 2), ('사회', 2), ('문화·생활', 2), ('공장·산업', 2), ('정치', 1)]
MIN_DAY = 10
POLITICS_OK = ('insidevina.com', 'vietnamkoreatimes.com')
KST = timezone(timedelta(hours=9))


def ok(d):
    """카드로 **낼 만한 기사인가** — 재료가 있느냐로 고르지 않는다.

    전에는 '여섯 줄 풀이·낱말·대화가 이미 있는가'로 골랐다. 그건 거꾸로다 —
    **기사를 먼저 고르고, 고른 기사의 재료를 만드는 것**이 옳다
    (대표님 지적 2026-09-02). 재료로 고르면 좋은 기사가 재료가 없다는 이유로 빠진다.
    여기서는 **기사 자체가 쓸 만한가**만 본다."""
    return bool((d.get('body') or d.get('intro') or d.get('title')))


def main():
    a = argparse.ArgumentParser()
    a.add_argument('--pub', default='')
    a.add_argument('--days', type=int, default=3)
    a = a.parse_args()
    now = datetime.now(KST)
    pub = a.pub or (now + timedelta(days=1) if now.hour >= 12 else now).strftime('%Y-%m-%d')

    p = R / 'data' / 'news_days.json'
    j = json.loads(p.read_text(encoding='utf-8'))
    days = j['days']
    for d in days:
        d.pop('pub', None)

    cut = (now - timedelta(days=a.days)).strftime('%Y-%m-%d')
    cand = [d for d in days if (d.get('ts') or '') >= cut and ok(d)]
    cand.sort(key=lambda d: (-(d.get('n') or 0), d.get('ts') or ''), reverse=False)
    print(f'낼 만한 기사 {len(cand)} (최근 {a.days}일)')

    picked = []
    for cat, want in QUOTA:
        got = 0
        for d in cand:
            if d in picked or got >= want or d.get('cat') != cat:
                continue
            if cat == '정치':
                host = (d.get('u') or '').split('/')[2].replace('www.', '')
                if not any(host.endswith(h) for h in POLITICS_OK):
                    continue
            picked.append(d); got += 1
        if got < want:
            print(f'  자리 못 채움: {cat} {got}/{want}')
    for d in cand:
        if len(picked) >= MIN_DAY:
            break
        if d not in picked:
            lim = dict(QUOTA).get(d.get('cat'), 2) + 1
            if sum(1 for x in picked if x.get('cat') == d.get('cat')) >= lim:
                continue
            picked.append(d)

    # ── 고른 기사의 **재료를 여기서 만든다** (없는 것만)
    need = [d for d in picked
            if len(d.get('sum5') or []) < 4
            or len(d.get('words') or []) < 6
            or len(((d.get('dialog') or {}).get('lines') or [])) < 2]
    if need:
        print(f'\n재료가 없는 기사 {len(need)}건 — 지금 만든다')
        for d in need:
            print(f"   · {(d.get('title') or '')[:40]}")
    for d in picked:
        d['pub'] = pub
    p.write_text(json.dumps(j, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'\n펴낸날 {pub} · 고른 기사 {len(picked)}')
    print('갈래별:', dict(Counter(d.get('cat') for d in picked)))
    print('출처별:', dict(Counter((d.get('u') or '').split('/')[2].replace('www.', '') for d in picked)))
    for d in picked:
        print(f"  [{str(d.get('cat')):8}] {(d.get('title_card') or d.get('title') or '')[:44]}")


if __name__ == '__main__':
    main()
