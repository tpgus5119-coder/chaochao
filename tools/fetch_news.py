#!/usr/bin/env python3
"""오늘의 베트남 기사 수집 — 깃허브 액션이 매일 아침 돌린다 (표준 라이브러리만).

고르는 기준은 하나뿐이다: **베트남에 일하러 가는 한국인에게 쓸모 있는가.**
글자 수나 최신순이 아니라 관심사 점수가 먼저다. 순서는 이렇다.
   ① 오늘 기사 중 관심사 점수가 있는 것
   ② 없으면 어제 기사 중 관심사 점수가 있는 것
   ③ 없으면 오늘 기사 중 일상어가 많은 것
   ④ 없으면 어제 기사 중 일상어가 많은 것
하루 2개를 싣는다. 그중 1등이 '오늘의 기사' 학습 세트 재료가 된다(tools/news_lesson.py).
결과는 data/news.json — 앱의 '베트남 소식' 화면이 읽는다."""
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
PER_DAY = 2                       # 하루에 싣는 기사 수 (경제·문화 다 합쳐서)
KEEP_DAYS = 3                     # 화면에 남기는 날수

# 인사이드비나(한국어, 베트남 전문)만 쓴다 — 영어 국제면은 베트남 무관 기사가 섞여서 뺐다.
FEED = ('인사이드비나', 'https://www.insidevina.com/rss/allArticle.xml')

# ① 우리 관심사 — 베트남에서 일할 한국인에게 직접 걸리는 말. 가중치가 클수록 먼저 고른다.
#
# 왜 '생활'이 '기업'보다 위인가: 시험해 보니 투자·진출·기업 같은 말이 잔뜩 든 재계 기사가
# 1등으로 뽑혔는데, 정작 거기서 나오는 베트남어는 '크다·좋다·예쁘다' 같은 맹물이었다.
# 반대로 '시내버스 무료 운행' 기사에서는 버스·무료·손님·멈추다처럼 내일 당장 쓸 말이 나왔다.
# 기사가 우리 이야기여야 하는 게 아니라, **거기서 나오는 말이 우리가 쓸 말**이어야 한다.
CARE = {
    3: ['공장', '근로', '노동자', '임금', '급여', '최저임금', '비자', '노동허가', '체류',
        '채용', '구인', '산업재해', '안전', '교대', '잔업', '해고', '계약',
        '한국인', '교민', '주재원', '기능실습', '근로계약',
        '버스', '지하철', '오토바이', '교통', '병원', '약국', '식당', '시장',
        '월세', '집값', '물가', '전기요금', '환율', '송금', '휴일', '연휴'],
    2: ['제조', '봉제', '섬유', '전자', '반도체', '삼성', '공단', '산업단지',
        '물류', '창고', '취업', '인력', '숙련', '보험', '주거', '학교', '학비',
        '음식', '요리', '명절', '설', '축제', '날씨', '더위', '태풍', '홍수'],
    1: ['경제', '한국', '베트남', '하노이', '호찌민', '빈즈엉', '동나이', '박닌',
        '문화', '관광', '여행', '생활', '수출', '투자', '진출', '기업'],
}
# ③ 일상어가 많은가 — 관심사에 걸리는 기사가 하나도 없는 날의 차선책
DAILY_KW = ['사람', '하루', '아침', '저녁', '집', '밥', '먹', '가게', '시장', '길',
            '가족', '아이', '학교', '돈', '값', '비', '더위', '추위', '휴일', '주말']

def care_score(t):
    return sum(w for w, kws in CARE.items() for k in kws if k.lower() in t.lower())

def daily_score(t):
    return sum(1 for k in DAILY_KW if k in t)

import html as _html, re as _re
def body_of(url):
    """기사 본문을 글자만 뽑아 온다. 제목만 보면 '의료관광 10억 달러' 같은
       숫자 기사가 뽑히므로, 본문까지 읽어야 우리에게 쓸모 있는 기사를 고를 수 있다."""
    try:
        h = get(url).decode('utf-8', 'replace')
    except Exception:
        return ''
    m = _re.search(r'<article[^>]*id="article-view-content-div"[^>]*>(.*?)</article>', h, _re.S)
    if not m:
        m = _re.search(r'id="article-view-content-div"[^>]*>(.*?)</div>\s*</div>', h, _re.S)
    if not m:
        return ''
    t = _re.sub(r'<(script|style)[^>]*>.*?</\1>', ' ', m.group(1), flags=_re.S)
    t = _re.sub(r'<[^>]+>', ' ', t)
    return _html.unescape(_re.sub(r'\s+', ' ', t)).strip()

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

src, url = FEED
try:
    root = ET.fromstring(get(url))
except Exception as e:
    print(f'{src} 실패: {e}')
    raise SystemExit(0)

today = datetime.now(KST).date()
cand = []
for it in root.iter('item'):
    t = (it.findtext('title') or '').strip()
    u = (it.findtext('link') or '').strip()
    d = when(it.findtext('pubDate'))
    if not t or not u or not d:
        continue
    day = d.astimezone(KST).date()
    if (today - day).days > 1:              # 오늘과 어제만 본다
        continue
    cand.append({'t': t, 'u': u, 'when': d.astimezone(KST), 'day': day,
                 'care': care_score(t), 'daily': daily_score(t), 'body': ''})

# 제목 점수로 후보를 좁힌 뒤, 그 후보들만 본문을 읽어 다시 점수를 매긴다.
# (모든 기사의 본문을 받으면 느리고, 제목만 보면 숫자 기사가 뽑힌다)
cand.sort(key=lambda c: (-c['care'], -c['daily'], -c['when'].timestamp()))
for c in cand[:10]:
    c['body'] = body_of(c['u'])
    if c['body']:
        c['care'] += min(care_score(c['body']), 12)     # 본문 점수는 12점까지만 (긴 기사 특혜 방지)
        c['daily'] += min(daily_score(c['body']), 8)

# 사용자가 정한 순서대로 고른다.
#   ① 오늘의 관심사 기사 → ② 어제의 관심사 기사 → ③ 오늘의 일상어 기사 → ④ 어제의 일상어 기사
def bucket(c):
    fresh = 0 if c['day'] == today else 1            # 오늘이 어제보다 먼저
    kind = 0 if c['care'] > 0 else 1                 # 관심사가 일상어보다 먼저
    return (kind, fresh)                             # (0,0) → (0,1) → (1,0) → (1,1)

cand.sort(key=lambda c: (bucket(c), -c['care'], -c['daily'], -c['when'].timestamp()))
picked = cand[:PER_DAY]

items = []
for c in picked:
    items.append({'s': src, 't': c['t'], 'u': c['u'],
                  'd': c['when'].strftime('%m월 %d일'),
                  'ts': c['when'].strftime('%Y-%m-%d'),
                  'care': c['care']})           # 학습 세트가 1등을 고를 때 쓴다
# 문화·생활 기사는 따로 표시해 둔다 (앱이 분야 표찰을 붙인다)
CULT_KW = ['문화', '여행', '음식', '축제', '명절', '풍습', '관광', '요리', '전통', '맛']
for it in items:
    if any(k in it['t'] for k in CULT_KW):
        it['cat'] = '문화'

# 이전 기사는 KEEP_DAYS 만큼만 남긴다
out_p = R / 'data' / 'news.json'
try:
    old = json.loads(out_p.read_text())['items']
except Exception:
    old = []
cutoff = (datetime.now(KST) - timedelta(days=KEEP_DAYS)).strftime('%Y-%m-%d')
seen = {it['u'] for it in items}
for it in old:
    if it['u'] not in seen and it.get('ts', '') >= cutoff:
        items.append(it)
        seen.add(it['u'])

items.sort(key=lambda x: x.get('ts', ''), reverse=True)   # 날짜별로 묶여 보이게

if items:                                    # 피드가 죽은 날은 어제 것을 그대로 둔다
    out_p.write_text(json.dumps(
        {'updated': datetime.now(KST).strftime('%Y-%m-%d %H:%M'), 'items': items},
        ensure_ascii=False, indent=1))
# 오늘 고른 기사의 본문은 따로 남긴다 — 학습 세트를 만드는 쪽이 다시 받지 않게.
(R / 'data' / 'news_body.json').write_text(json.dumps(
    {'when': datetime.now(KST).strftime('%Y-%m-%d %H:%M'),
     'picked': [{'t': c['t'], 'u': c['u'], 'ts': c['when'].strftime('%Y-%m-%d'),
                 'care': c['care'], 'body': c['body'][:6000]} for c in picked]},
    ensure_ascii=False, indent=1))

for c in picked:
    print(f"골랐다: [관심사 {c['care']} · 일상어 {c['daily']} · {c['day']} · 본문 {len(c['body'])}자] {c['t'][:40]}")
print(f'기사 {len(items)}개 기록')
