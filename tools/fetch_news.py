#!/usr/bin/env python3
"""오늘의 베트남 기사 수집 — 깃허브 액션이 매일 아침 돌린다 (표준 라이브러리만).
선정 기준: 최근 이틀 기사 중 제목에 제조·투자·노동 관련 낱말이 있으면 먼저,
나머지는 최신순. 인사이드비나(한국어) 3개 + VnExpress International(영어) 2개.
결과는 data/news.json — 앱의 '오늘 기사' 화면이 읽는다."""
import json, pathlib, subprocess, urllib.request, xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime

def get(url):
    """맥의 파이썬이 인증서를 못 읽는 일이 있어 curl로 대체한다(깃허브 서버는 urllib으로 충분)."""
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        return urllib.request.urlopen(req, timeout=30).read()
    except Exception:
        return subprocess.run(['curl', '-sL', '--max-time', '30', '-A', 'Mozilla/5.0', url],
                              capture_output=True, check=True).stdout

R = pathlib.Path(__file__).resolve().parent.parent
KST = timezone(timedelta(hours=9))
# 인사이드비나(한국어, 베트남 전문)만 쓴다 — 영어 국제면은 베트남 무관 기사가 섞여서 뺐다.
FEEDS = [
    ('인사이드비나', 'https://www.insidevina.com/rss/allArticle.xml', 5,
     ['제조', '공장', '투자', '노동', '근로', '임금', '비자', '수출', '산업',
      '전자', '봉제', '섬유', '삼성', '채용', '경제', '한국']),
]
CULT_KW = ['문화', '여행', '음식', '축제', '명절', '풍습', '관광', '요리', '전통', '맛']

def when(s):
    """RSS 날짜가 RFC 형식일 수도, '2026-08-21 17:15:00' 꼴일 수도 있다."""
    s = (s or '').strip()
    for f in (parsedate_to_datetime, datetime.fromisoformat):
        try:
            d = f(s)
            return d if d.tzinfo else d.replace(tzinfo=KST)
        except Exception:
            pass
    return None

items = []
now = datetime.now(timezone.utc)
for src, url, n, kws in FEEDS:
    try:
        root = ET.fromstring(get(url))
    except Exception as e:
        print(f'{src} 실패: {e}')
        continue
    cand = []
    for it in root.iter('item'):
        t = (it.findtext('title') or '').strip()
        u = (it.findtext('link') or '').strip()
        d = when(it.findtext('pubDate'))
        if not t or not u: continue
        if d and (now - d) > timedelta(hours=48): continue
        score = sum(1 for k in kws if k.lower() in t.lower())
        cand.append((score, d or now, t, u))
    cand.sort(key=lambda x: (-x[0], -x[1].timestamp()))
    picked = set()
    for score, d, t, u in cand[:n]:
        k = d.astimezone(KST)
        picked.add(u)
        items.append({'s': src, 't': t, 'u': u,
                      'd': k.strftime('%m월 %d일'), 'ts': k.strftime('%Y-%m-%d')})
    # 문화 읽을거리 2개 — 문화 화면에 실린다
    cult = [(s, d, t, u) for s, d, t, u in cand
            if u not in picked and any(kw in t for kw in CULT_KW)]
    cult.sort(key=lambda x: -x[1].timestamp())
    for score, d, t, u in cult[:2]:
        k = d.astimezone(KST)
        items.append({'s': src, 't': t, 'u': u, 'cat': '문화',
                      'd': k.strftime('%m월 %d일'), 'ts': k.strftime('%Y-%m-%d')})

# 이전 기사는 3일치까지만 남긴다 — 그 이상은 지운다
out_p = R / 'data' / 'news.json'
try:
    old = json.loads(out_p.read_text())['items']
except Exception:
    old = []
cutoff = (datetime.now(KST) - timedelta(days=3)).strftime('%Y-%m-%d')
seen = {it['u'] for it in items}
for it in old:
    if it['u'] not in seen and it.get('ts', '') >= cutoff and it.get('s') == '인사이드비나':
        items.append(it)
        seen.add(it['u'])

items.sort(key=lambda x: x.get('ts', ''), reverse=True)   # 날짜별로 묶여 보이게

if items:                                    # 두 곳 다 죽은 날은 어제 것을 그대로 둔다
    out_p.write_text(json.dumps(
        {'updated': datetime.now(KST).strftime('%Y-%m-%d %H:%M'), 'items': items},
        ensure_ascii=False, indent=1))
print(f'기사 {len(items)}개 기록')
