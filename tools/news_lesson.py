#!/usr/bin/env python3
"""'오늘의 기사' 학습 세트를 만든다 — 깃허브 액션이 매일 아침 fetch_news.py 다음에 돌린다.

하는 일
  ① data/news_body.json 의 어제 기사 5개를 **전부** 재료로 쓴다
  ② 기사마다 제미나이에게 요약 2줄 + 베트남어 단어 10개 + 대화 2줄을 받는다
  ③ 성조를 자동으로 붙인다(tools/tone.py)
  ④ data/news_days.json 에 그날치를 쌓는다 (일주일치만 남기고 지운다)

**이미 배운 단어를 일부러 빼지 않는다.** 아는 말이 새 문맥에서 다시 나오는 것이
기억에는 오히려 이롭고, 음성도 이미 있어서 새로 만들 것이 줄어든다.
기사 학습은 복습 창고에 넣지 않는다 — 어제 베트남에서 무슨 일이 있었는지 알면서
겸사겸사 말도 익히는 자리다.

노트북과 무관하다 — 깃허브 서버에서 돈다. 다만 남부 음성과 그림은 여기서 못 만든다.
  · 남부 음성이 없으면 앱이 북부 소리로 대신 낸다(있는 것만 골라 쓴다)
  · 그림이 없으면 이모지가 대신 나온다
  둘 다 나중에 개발자 맥에서 tools/gen_south_vtts.py · tools/gen_images.py 로 채운다.

환경변수 GEMINI_KEY 필요 (깃허브 저장소 Settings → Secrets → Actions 에 넣는다).
"""
import json, os, pathlib, sys, time, urllib.request, urllib.error, hashlib, re, unicodedata as ud
from datetime import datetime, timezone, timedelta

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from tone import word_tones                      # 글자에서 성조를 자동으로 읽어낸다

def slug(vi):
    """베트남어 → 부호 없는 파일이름 (cảm ơn → cam-on). 그림 파일 이름에 쓴다."""
    t = ''.join(c for c in ud.normalize('NFD', vi) if not ud.combining(c))
    return re.sub(r'[^a-z0-9]+', '-', t.replace('đ', 'd').lower()).strip('-')

R = pathlib.Path(__file__).resolve().parent.parent
KST = timezone(timedelta(hours=9))
KEEP_DAYS = 7                                    # 일주일치만 남긴다 (저장소가 커지지 않게)
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
    import time
    errs = []
    for round_ in range(2):                       # 다 막히면 20초 쉬고 한 바퀴 더
        for m in MODELS:
            url = (f'https://generativelanguage.googleapis.com/v1beta/models/{m}'
                   f':generateContent?key={key}')
            try:
                req = urllib.request.Request(url, data=body,
                                             headers={'Content-Type': 'application/json'})
                r = json.loads(urllib.request.urlopen(req, timeout=120).read())
                return json.loads(r['candidates'][0]['content']['parts'][0]['text'])
            except urllib.error.HTTPError as e:
                # 몸통에 진짜 이유가 들어 있다. 마지막 것만 남기면 원인을 못 찾는다
                try: why = e.read().decode()[:180]
                except Exception: why = ''
                errs.append(f'{m} {e.code} {why}')
            except Exception as e:
                errs.append(f'{m} {e}')
        if round_ == 0:
            time.sleep(20)
    raise RuntimeError('제미나이 실패 — ' + ' | '.join(errs[:6]))

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
   흔한 쉬운 낱말을 피하려 애쓰지 마라 — 아는 말이 다시 나오는 것도 좋은 일이다.
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

    out_p = R / 'data' / 'news_days.json'
    try:
        store = json.loads(out_p.read_text())
    except Exception:
        store = {'days': []}
    have = {d.get('u') for d in store['days']}
    made = 0
    for art in picked:
        if art['u'] in have:
            continue
        try:
            got = ask(PROMPT.format(title=art['t'], body=art['body'][:4000]), key)
        except Exception as e:
            print(f"실패 {art['t'][:30]}: {e}"); continue
        finally:
            time.sleep(6)                          # 다섯 번을 몰아치면 분당 한도에 걸린다
        words, seen = [], set()
        for w in got.get('words', []):
            vi = (w.get('vi') or '').strip()
            if not vi or vi.lower() in seen:
                continue
            if re.search(r'\d', vi) or vi[:1].isupper():      # 숫자·고유명사 제외
                continue
            seen.add(vi.lower())
            emo = (w.get('emoji') or '').strip()
            item = {'vi': vi, 'ko': (w.get('ko') or '').strip(),
                    'kr_read': (w.get('kr') or '').strip(),
                    'emoji': emo, 'tones': word_tones(vi)}
            # 눈에 보이는 말에만 그림 자리를 준다. 그림은 개발자 맥의 '그림 지킴이'가 뒤따라 채운다
            # (깃허브 서버에는 그래픽 카드가 없어 그림만은 거기서 못 만든다).
            if emo: item['img'] = 'n-' + slug(vi) + '.webp'
            words.append(item)
        lines = [{'vi': (l.get('vi') or '').strip(), 'ko': (l.get('ko') or '').strip(),
                  'kr_read': (l.get('kr') or '').strip(), 'who': (l.get('who') or 'AB'[i % 2]),
                  'tones': word_tones((l.get('vi') or '').strip()),
                  'gloss': []}
                 for i, l in enumerate(got.get('lines', [])) if (l.get('vi') or '').strip()]
        if len(words) < 4 or not lines:
            print(f"재료가 모자라다 — 건너뜀: {art['t'][:30]}"); continue
        theme = (got.get('theme') or '기사')[:12]
        store['days'].append({
            'ts': art['ts'], 'day': 'N' + art['u'][-8:], 'track': 'news',
            'theme': theme, 'title': art['t'], 'u': art['u'], 'cat': art.get('cat'),
            'intro': ' '.join(got.get('summary', []))[:140],
            'words': words[:10],
            'dialog': {'title': theme, 'emoji': '📰', 'lines': lines[:2], 'extra': []},
        })
        have.add(art['u']); made += 1
        print(f"  세트: {theme} · 단어 {len(words)} · 대화 {len(lines)} · {art['t'][:34]}")

    cut = (datetime.now(KST) - timedelta(days=KEEP_DAYS)).strftime('%Y-%m-%d')
    store['days'] = [d for d in store['days'] if d['ts'] >= cut]   # 일주일 지난 것은 지운다
    store['days'].sort(key=lambda d: (d['ts'], d['theme']), reverse=True)
    for i, d in enumerate(store['days']):
        d['n'] = len(store['days']) - i
    store['updated'] = datetime.now(KST).strftime('%Y-%m-%d %H:%M')
    out_p.write_text(json.dumps(store, ensure_ascii=False, indent=1))
    print(f'기사 세트 {made}개 새로 만듦 · 보관 {len(store["days"])}개')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
