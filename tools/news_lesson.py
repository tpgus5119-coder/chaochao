#!/usr/bin/env python3
"""'오늘의 기사' 학습 세트를 만든다 — 깃허브 액션이 매일 아침 fetch_news.py 다음에 돌린다.

하는 일
  ① data/news_body.json 에서 오늘 고른 기사 중 **관심사 점수 1등** 하나를 집는다
  ② 제미나이에게 본문을 주고 요약 2줄 + 베트남어 단어 10개 + 문장 2개를 받는다
  ③ 성조를 자동으로 붙이고(tools/tone.py), 이미 배운 단어는 걸러 새 단어만 남긴다
  ④ data/news_days.json 에 하루치 세트를 쌓는다 (최근 30일치만 남긴다)
  ⑤ 새로 생긴 베트남어의 북부 음성을 edge-tts 로 뽑고 audio_index 에 등록한다

노트북과 무관하다 — 깃허브 서버에서 돈다. 다만 남부 음성과 그림은 여기서 못 만든다.
  · 남부 음성이 없으면 앱이 북부 소리로 대신 낸다(있는 것만 골라 쓴다)
  · 그림이 없으면 이모지가 대신 나온다
  둘 다 나중에 개발자 맥에서 tools/gen_south_vtts.py · tools/gen_images.py 로 채운다.

환경변수 GEMINI_KEY 필요 (깃허브 저장소 Settings → Secrets → Actions 에 넣는다).
"""
import json, os, pathlib, sys, urllib.request, hashlib, re
from datetime import datetime, timezone, timedelta

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from tone import word_tones                      # 글자에서 성조를 자동으로 읽어낸다

R = pathlib.Path(__file__).resolve().parent.parent
KST = timezone(timedelta(hours=9))
KEEP_DAYS = 30                                   # 기사 세트는 30일치만 남긴다 (저장소가 커지지 않게)
MODELS = ['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.5-flash-lite']

def ask(prompt, key):
    """제미나이에 물어 JSON 을 받는다. 모델이 붐비면 다음 모델로 넘어간다."""
    body = json.dumps({
        'contents': [{'role': 'user', 'parts': [{'text': prompt}]}],
        # 생각 예산을 0으로 두지 않으면 생각에만 토큰을 다 써서 답이 잘린다 (실제로 겪었다)
        'generationConfig': {'temperature': 0.4, 'maxOutputTokens': 3000,
                             'responseMimeType': 'application/json',
                             'thinkingConfig': {'thinkingBudget': 0}},
    }).encode()
    last = None
    for m in MODELS:
        url = (f'https://generativelanguage.googleapis.com/v1beta/models/{m}'
               f':generateContent?key={key}')
        try:
            req = urllib.request.Request(url, data=body,
                                         headers={'Content-Type': 'application/json'})
            r = json.loads(urllib.request.urlopen(req, timeout=120).read())
            return json.loads(r['candidates'][0]['content']['parts'][0]['text'])
        except Exception as e:
            last = f'{m}: {e}'
    raise RuntimeError(f'제미나이 실패 — {last}')

PROMPT = """너는 한국인에게 베트남어를 가르친다. 배우는 사람은 곧 베트남 공장·사무실에 일하러 갈
완전 초보 한국인이다. 아래는 오늘 베트남 소식 기사다.

제목: {title}
본문: {body}

이 기사로 하루치 학습 한 세트를 만들어라. 아래 JSON 형식 그대로만 답하라.

{{
 "summary": ["기사를 한국어 한 줄로", "두 번째 줄"],
 "theme": "이 세트의 주제 (한국어 6자 이내, 예: 공장 임금)",
 "words": [
   {{"vi":"베트남어 단어", "ko":"한국어 뜻", "kr":"한글 발음", "emoji":"관련 이모지 1개"}}
 ],
 "lines": [
   {{"who":"A", "vi":"베트남어 문장", "ko":"한국어 뜻", "kr":"한글 발음"}}
 ]
}}

지켜야 할 것
 · summary 는 정확히 2줄. 각 줄 40자 이내. 기사에 없는 내용을 지어내지 마라.
 · words 는 정확히 10개. 기사 내용과 관련된 **일상적으로 쓰는 베트남어 낱말**만.
   사람 이름·회사 이름·지명·숫자는 절대 넣지 마라. 초보가 쓸 수 있는 말이어야 한다.
   한 낱말은 3음절을 넘기지 마라.
   **낱말은 그 자체로 뜻이 통하는 완전한 말이어야 한다.** 긴 낱말을 잘라 쓰지 마라
   (bệnh viện=병원 을 viện 으로 자르면 뜻이 달라진다. 자를 바에는 통째로 넣어라).
 · lines 는 정확히 2개, **주고받는 대화 두 줄**로 만들어라 (A가 묻고 B가 답한다).
   기사 내용을 배우는 사람이 실제로 겪을 상황으로 옮겨라 — 기사 문장을 옮겨 적지 마라.
   (예: 버스 무료 운행 기사 → "이 버스 무료인가요?" / "네, 지금 무료예요.")
   words 의 단어를 쓰되 **억지로 다 넣지 마라** — 어색한 문장은 안 만드느니만 못하다.
   베트남 사람이 실제로 말할 법한 문장인지 스스로 확인하고 아니면 다시 써라.
   한 문장은 8낱말을 넘기지 마라. 첫 줄의 who 는 "A", 둘째 줄은 "B".
 · kr 은 한국인이 소리 내기 쉽게 한글로 적는다 (예: cảm ơn → 깜 언).
 · emoji 는 눈에 보이는 것에만 붙여라. 추상어면 빈 문자열 "" 로 둬라.
 · 베트남어 철자는 성조 부호까지 정확히. 북부(하노이) 표준을 쓴다.
"""

def main():
    key = os.environ.get('GEMINI_KEY', '').split(',')[0].strip()
    if not key:
        print('GEMINI_KEY 가 없다 — 건너뛴다'); return 0

    try:
        picked = json.loads((R / 'data' / 'news_body.json').read_text())['picked']
    except Exception as e:
        print(f'news_body.json 없음 ({e}) — fetch_news.py 를 먼저 돌려라'); return 0
    picked = [p for p in picked if len(p.get('body', '')) > 200]
    if not picked:
        print('본문이 있는 기사가 없다'); return 0
    art = max(picked, key=lambda p: p.get('care', 0))     # 관심사 1등 하나만

    out_p = R / 'data' / 'news_days.json'
    try:
        store = json.loads(out_p.read_text())
    except Exception:
        store = {'days': []}
    today = datetime.now(KST).strftime('%Y-%m-%d')
    if any(d['ts'] == today for d in store['days']):
        print('오늘 세트가 이미 있다'); return 0
    if any(d.get('u') == art['u'] for d in store['days']):
        print('이미 쓴 기사다 — 다음 기사로');
        rest = [p for p in picked if p['u'] != art['u']]
        if not rest: return 0
        art = max(rest, key=lambda p: p.get('care', 0))

    got = ask(PROMPT.format(title=art['t'], body=art['body'][:4000]), key)

    # 이미 가르치는 단어는 뺀다 — 새 단어만 남겨야 배울 것이 있다
    days = json.loads((R / 'data' / 'days.json').read_text())
    known = {w['vi'].lower() for d in days['days'] for w in d['words']}
    words, seen = [], set()
    for w in got.get('words', []):
        vi = (w.get('vi') or '').strip()
        if not vi or vi.lower() in known or vi.lower() in seen:
            continue
        if re.search(r'\d', vi) or vi[:1].isupper():      # 숫자·고유명사 제외
            continue
        seen.add(vi.lower())
        words.append({'vi': vi, 'ko': (w.get('ko') or '').strip(),
                      'kr_read': (w.get('kr') or '').strip(),
                      'emoji': (w.get('emoji') or '').strip(),
                      'tones': word_tones(vi)})
    lines = [{'vi': (l.get('vi') or '').strip(), 'ko': (l.get('ko') or '').strip(),
              'kr_read': (l.get('kr') or '').strip(), 'who': (l.get('who') or 'AB'[i % 2]),
              'tones': word_tones((l.get('vi') or '').strip()),
              'gloss': []}
             for i, l in enumerate(got.get('lines', [])) if (l.get('vi') or '').strip()]
    if len(words) < 4 or not lines:
        print(f'재료가 모자라다 (단어 {len(words)} · 문장 {len(lines)}) — 오늘은 세트를 안 만든다')
        return 0

    day = {
        'ts': today, 'day': 'N' + today.replace('-', ''), 'track': 'news',
        'theme': (got.get('theme') or '오늘의 기사')[:12],
        'title': art['t'], 'u': art['u'],
        'intro': ' '.join(got.get('summary', []))[:120],
        'words': words[:10],
        'dialog': {'title': (got.get('theme') or '오늘의 기사')[:12],
                   'emoji': '📰', 'lines': lines[:2], 'extra': []},
    }
    store['days'] = [d for d in store['days'] if d['ts'] > (
        datetime.now(KST) - timedelta(days=KEEP_DAYS)).strftime('%Y-%m-%d')]
    store['days'].append(day)
    store['days'].sort(key=lambda d: d['ts'], reverse=True)
    for i, d in enumerate(store['days']):
        d['n'] = len(store['days']) - i
    store['updated'] = datetime.now(KST).strftime('%Y-%m-%d %H:%M')
    out_p.write_text(json.dumps(store, ensure_ascii=False, indent=1))
    print(f"세트 만듦: {day['theme']} · 단어 {len(day['words'])} · 문장 {len(lines)}")
    print('  ' + day['intro'])
    for w in day['words']:
        print(f"   {w['vi']} = {w['ko']}")
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
