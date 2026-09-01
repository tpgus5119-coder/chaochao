#!/usr/bin/env python3
"""오늘의 베트남 기사 수집 — 깃허브 액션이 매일 아침 돌린다 (표준 라이브러리만).

고르는 기준은 하나뿐이다: **베트남에 일하러 가는 한국인에게 쓸모 있는가.**
글자 수나 최신순이 아니라 관심사 점수가 먼저다.
새벽 6시 30분에 도니 그 시각에 완성돼 있는 것은 **어제 하루치**다(기사 사이트는
오전 9시~오후 6시에 올린다).
다만 **주말에는 기사가 한 건도 안 올라온다**(실측: 토·일 0건, 월요일도 3건뿐).
그래서 '어제'가 아니라 **기사가 있는 가장 최근 날**을 통째로 쓴다 —
월요일 아침이면 금요일 기사가 나온다.
하루 5개를 싣고, 그 다섯 개 전부가 학습 세트가 된다(tools/news_lesson.py).
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
# 주제마다 **자리**를 잡는다 (대표님 지시 2026-09-02).
# 점수 순으로만 자르면 경제 기사가 다 차지한다 — 8월 실측: 정치 44건이 한 번도 안 뽑혔다.
QUOTA = [('일자리', 3), ('경제', 2), ('사회', 2), ('문화·생활', 2),
         ('공장·산업', 2), ('정치', 1)]
PER_DAY = sum(n for _, n in QUOTA)   # 12
MIN_DAY = 10                      # 모자라면 주제 상관없이 점수 높은 순으로 채워 이만큼은 맞춘다
FLOOR = 5                         # 이 점수 미만은 자리가 비어도 안 싣는다
BODY_MAX = 40                     # 본문을 읽어 볼 후보 수

# 정치는 **베트남 밖 매체**에서만 (대표님 지시) — 현지 매체는 정치를 한쪽으로만 전한다
POLITICS_OK = ('insidevina.com', 'vietnamkoreatimes.com')
KEEP_DAYS = 7                     # 화면에 남기는 날수 (일주일치)

# 인사이드비나(한국어, 베트남 전문)만 쓴다 — 영어 국제면은 베트남 무관 기사가 섞여서 뺐다.
# 기사를 받아 오는 곳 **셋** (대표님 지시 2026-09-02). 8월 실측 발행량:
#   인사이드비나 하루 9.3건 · VnExpress International 하루 36건 · 코리아타임즈 하루 1.1건
# 한 곳만 쓰면 '베끼는 것'처럼 보이고, 그 곳이 멈추면 카드도 멈춘다.
FEEDS = [
    ('인사이드비나', 'https://www.insidevina.com/rss/allArticle.xml'),
    ('베트남코리아타임즈', 'http://www.vietnamkoreatimes.com/rss/allArticle.xml'),
    # VnExpress 는 갈래마다 따로 준다 (한 줄에 60건씩)
    ('VnExpress', 'https://e.vnexpress.net/rss/news.rss'),
    ('VnExpress', 'https://e.vnexpress.net/rss/business.rss'),
    ('VnExpress', 'https://e.vnexpress.net/rss/travel.rss'),
    ('VnExpress', 'https://e.vnexpress.net/rss/life.rss'),
    ('VnExpress', 'https://e.vnexpress.net/rss/world.rss'),
]
FEED = FEEDS[0]        # 옛 이름을 쓰는 곳이 있어 남겨 둔다

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
# 영어 기사(VnExpress)용 — 위 낱말이 다 한국어라 영어 제목은 **늘 0점**이었다.
# 그래서 하루 36건을 받아 놓고 한 건도 안 뽑혔다 (2026-09-02 실측).
CARE_EN = {
    3: ['visa', 'work permit', 'wage', 'salary', 'minimum wage', 'labor', 'worker',
        'hiring', 'recruit', 'residence', 'hospital', 'rent', 'price', 'exchange rate',
        'traffic', 'bus', 'metro', 'motorbike', 'accident', 'safety'],
    2: ['factory', 'manufactur', 'textile', 'garment', 'electronics', 'semiconductor',
        'samsung', 'industrial park', 'logistics', 'insurance', 'school', 'tuition',
        'food', 'festival', 'holiday', 'weather', 'typhoon', 'flood'],
    1: ['economy', 'export', 'import', 'investment', 'company', 'hanoi', 'ho chi minh',
        'tourism', 'travel', 'korea', 'vietnam', 'growth', 'market'],
}
PER_SITE_MAX = 5     # 한 사이트가 다 차지하지 못하게 (열한 건 중 열 건이 한 곳이었다)
# ③ 일상어가 많은가 — 관심사에 걸리는 기사가 하나도 없는 날의 차선책
DAILY_KW = ['사람', '하루', '아침', '저녁', '집', '밥', '먹', '가게', '시장', '길',
            '가족', '아이', '학교', '돈', '값', '비', '더위', '추위', '휴일', '주말']

# 기사 갈래 — 제목·본문의 낱말로 가른다 (대표님 지시, 2026-08-30):
#   "기사 앞에 경제인지 문화인지 정치인지 등 표시해줘"
# AI 를 쓰지 않는다 — 무료 대리인은 분당 20회라 매일 아침 기사마다 부르면 한도가 찬다.
CATS = [
    ('일자리', ['채용', '구인', '취업', '일자리', '임금', '급여', '최저임금', '노동', '근로',
               '해고', '인력', '비자', '노동허가', '체류', '기능실습']),
    ('공장·산업', ['공장', '제조', '봉제', '섬유', '전자', '반도체', '공단', '산업단지',
                 '생산', '설비', '품질', '산업재해', '교대', '잔업']),
    ('경제', ['경제', '수출', '수입', '투자', '기업', '무역', '환율', '물가', '금리',
             '증시', '부동산', '집값', '월세', '성장률', 'GDP', '세금', '회계']),
    ('사회', ['사고', '화재', '범죄', '경찰', '재판', '병원', '보건', '교육', '학교',
             '교통', '버스', '지하철', '홍수', '태풍', '날씨', '오염', '단속', '규정위반',
             '안전', '위반', '처벌', '벌금']),
    # '총리·회담'은 뺐다 — 삼성 수출 기사가 '총리 회담' 때문에 정치로 갔다 (2026-08-30)
    ('정치', ['국회', '외교', '법안', '조약', '개헌', '선거', '당대회', '서기장']),
    ('문화·생활', ['문화', '관광', '여행', '축제', '명절', '설', '음식', '요리', '영화',
                 '음악', '스포츠', '축구', '생활', '풍습']),
]

def cat_of(t):
    """가장 많이 걸리는 갈래. 하나도 안 걸리면 '소식'."""
    best, n = '소식', 0
    for name, kws in CATS:
        c = sum(1 for k in kws if k.lower() in t.lower())
        if c > n: best, n = name, c
    return best


def care_score(t):
    low = t.lower()
    return (sum(w for w, kws in CARE.items() for k in kws if k.lower() in low)
            + sum(w for w, kws in CARE_EN.items() for k in kws if k in low))

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
    # 사이트마다 본문을 담는 곳이 다르다. 차례로 맞춰 본다.
    #   인사이드비나·코리아타임즈 = 같은 한국 기사 시스템 (article-view-content-div)
    #   VnExpress International   = <p class="Normal"> 여러 개
    m = _re.search(r'<article[^>]*id="article-view-content-div"[^>]*>(.*?)</article>', h, _re.S)
    if not m:
        m = _re.search(r'id="article-view-content-div"[^>]*>(.*?)</div>\s*</div>', h, _re.S)
    if not m:
        ps = _re.findall(r'<p class="Normal"[^>]*>(.*?)</p>', h, _re.S)
        if ps:
            t = ' '.join(ps)
            t = _re.sub(r'<[^>]+>', ' ', t)
            return _html.unescape(_re.sub(r'\s+', ' ', t)).strip()
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

today = datetime.now(KST).date()
cand, seen_u = [], set()
src = '인사이드비나'
for feed_src, url in FEEDS:
    try:
        root = ET.fromstring(get(url))
    except Exception as e:
        print(f'  {feed_src} 실패: {e}')
        continue
    n0 = len(cand)
    for it in root.iter('item'):
        t = (it.findtext('title') or '').strip()
        u = (it.findtext('link') or '').strip()
        d = when(it.findtext('pubDate'))
        if not t or not u or not d or u in seen_u:
            continue
        day = d.astimezone(KST).date()
        gap = (today - day).days
        if gap < 1 or gap > 6:              # 오늘 것은 아직 안 올라왔고, 일주일 넘은 건 안 쓴다
            continue
        seen_u.add(u)
        cand.append({'t': t, 'u': u, 'src': feed_src, 'when': d.astimezone(KST), 'day': day,
                     'care': care_score(t), 'daily': daily_score(t), 'body': '',
                     'cat': cat_of(t)})
    print(f'  {feed_src}: {len(cand) - n0}건')
if not cand:
    print('가져올 기사가 없다'); raise SystemExit(0)

# 제목 점수로 후보를 좁힌 뒤, 그 후보들만 본문을 읽어 다시 점수를 매긴다.
# (모든 기사의 본문을 받으면 느리고, 제목만 보면 숫자 기사가 뽑힌다)
# 사이트마다 마지막으로 올린 날이 다르다 — 한 날로 좁히면 다른 사이트가 통째로 빠진다.
# 가장 최근 날과 그 하루 전까지 본다.
newest0 = max(c['day'] for c in cand)
cand = [c for c in cand if (newest0 - c['day']).days <= 1]
cand.sort(key=lambda c: (-c['care'], -c['daily'], -c['when'].timestamp()))
for c in cand[:BODY_MAX]:                                # 그 날의 후보만 본문을 받는다
    c['body'] = body_of(c['u'])
    if c['body']:
        c['cat'] = cat_of(c['t'] + ' ' + c['body'][:1200])   # 본문까지 보고 갈래를 다시 정한다
        c['care'] += min(care_score(c['body']), 12)     # 본문 점수는 12점까지만 (긴 기사 특혜 방지)
        c['daily'] += min(daily_score(c['body']), 8)

# 기사가 있는 가장 최근 날 하루치만 쓴다 (주말을 건너뛰기 위해).
if not cand:
    print('가져올 기사가 없다'); raise SystemExit(0)
newest = max(c['day'] for c in cand)
cand = [c for c in cand if (newest - c['day']).days <= 1]
# 그 안에서 관심사가 있는 기사가 먼저, 없으면 일상어가 많은 기사로 채운다.
cand.sort(key=lambda c: (0 if c['care'] > 0 else 1, -c['care'], -c['daily'], -c['when'].timestamp()))

# ── 갈래를 다시 본다: ① 기사 사이트의 자체 분류를 1차로 믿고 ② Qwen 이 검수한다
#    (대표님 지시 2026-09-02: "기사마다 이미 자체적으로 분류되어 있지 않니? 그 분류를 1차로 믿고")
#    낱말 맞추기만 하면 '삼성전자 수출' 기사가 '총리 회담' 때문에 정치로 간다 (실측).
try:
    import sys as _s, pathlib as _p
    _s.path.insert(0, str(_p.Path(__file__).resolve().parent))
    from news_cat import recat
    recat(cand[:BODY_MAX])
except Exception as e:
    print(f'갈래 재확인 건너뜀: {e}')

# 이미 실은 기사와 **내용이 겹치면** 안 싣는다 (어제 것과 같은 카드가 나왔다)
try:
    _old = json.loads((R / 'data' / 'news_days.json').read_text(encoding='utf-8'))['days']
except Exception:
    _old = []
_old_t = [d.get('title', '') for d in _old]
from difflib import SequenceMatcher as _SM
def _dup(t):
    return any(_SM(None, t, o).ratio() > 0.55 for o in _old_t)
cand = [c for c in cand if not _dup(c['t'])]

def _ok_src(c, cat):
    if cat != '정치':
        return True
    host = c['u'].split('/')[2].lower().replace('www.', '')
    return any(host.endswith(h) for h in POLITICS_OK)

# ── 주제마다 자리만큼 뽑는다
picked, used, per_site = [], set(), {}
def _site(c):
    return c['u'].split('/')[2].lower().replace('www.', '')
for cat, n in QUOTA:
    got = 0
    for c in cand:
        if id(c) in used or got >= n:
            continue
        if c.get('cat') != cat or c['care'] < FLOOR or not _ok_src(c, cat):
            continue
        st = _site(c)
        if per_site.get(st, 0) >= PER_SITE_MAX:
            continue
        picked.append(c); used.add(id(c)); got += 1
        per_site[st] = per_site.get(st, 0) + 1
    if got < n:
        print(f"  자리 못 채움: {cat} {got}/{n}")
# 모자라면 **주제 상관없이** 점수 높은 순으로 채워 최소치를 맞춘다 (대표님 지시)
for c in cand:
    if len(picked) >= MIN_DAY:
        break
    if id(c) not in used and c['care'] >= FLOOR:
        picked.append(c); used.add(id(c))
picked.sort(key=lambda c: -c['care'])
from collections import Counter as _C
print('갈래별로 뽑은 수:', dict(_C(c.get('cat') for c in picked)))

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
                 'care': c['care'], 'cat': c.get('cat'), 'body': c['body'][:5000]} for c in picked]},
    ensure_ascii=False, indent=1))

for c in picked:
    print(f"골랐다: [관심사 {c['care']} · 일상어 {c['daily']} · {c['day']} · 본문 {len(c['body'])}자] {c['t'][:40]}")
print(f'기사 {len(items)}개 기록')
