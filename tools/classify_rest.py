#!/usr/bin/env python3
"""그림이 없는 단어 433개를 둘로 가른다.

  draw   — 사람·동작·상태·장소처럼 **장면으로 그릴 수 있는 말** → 그림 프롬프트를 만든다
  form   — ~이다 · ~의 · 그리고 · 매우 같은 **기능어** → 그림 대신 짧은 공식을 만든다

기능어에 억지로 그림을 붙이면 배우는 사람이 그 그림을 뜻으로 오해한다
(검수에서 'cảm ơn = 고맙습니다'에 우는 아이가 그려진 게 정확히 그 경우였다).
기능어는 그림보다 'A của B = B의 A' 같은 한 줄 공식이 훨씬 잘 통한다.

결과: tools/imgrest.json
사용: python3 tools/classify_rest.py        (중계 서버로 물어본다)
"""
import json, pathlib, subprocess, sys, time

R = pathlib.Path(__file__).resolve().parent.parent
RELAY = 'https://viet-ai.chaochao-app.workers.dev'
OUT = R / 'tools' / 'imgrest.json'
BATCH = 30

PROMPT = """너는 베트남어 학습앱의 단어 카드를 설계한다. 배우는 사람은 한국인 초보다.
아래 베트남어 낱말들을 하나씩 둘 중 하나로 가르고, 그에 맞는 재료를 만들어라.

  "draw" — 사람·사물·동작·상태·장소처럼 **한 장면으로 그릴 수 있는 말**
           (나·형·알다·느리다·아프다·기다리다·위·아래 …)
  "form" — 문법 기능어. 그림으로 그리면 오해만 낳는 말
           (~이다 · ~의 · 그리고 · 매우 · ~입니까 · 아주 · ~도 …)

애매하면 "form" 으로 보내라. 억지 그림은 없는 것보다 나쁘다.

JSON 배열로만 답하라. 각 항목:
 draw 이면 {{"vi":"...", "k":"draw", "p":"영어 그림 프롬프트"}}
 form 이면 {{"vi":"...", "k":"form", "f":"한 줄 공식", "e":"베트남어 보기 = 한국어 뜻"}}

그림 프롬프트(p) 규칙
 · 영어로. 한 장면만. 사람이 나오면 손은 안 보이게.
 · 반드시 이 꼬리말로 끝낼 것:
   ", simple flat illustration, soft pastel colors, thick outlines, plain white background,
   hands not visible, absolutely no text, no letters, no numbers, no logo"
 · 뜻이 한눈에 읽혀야 한다. 'nhớ 그리워하다' → 편지를 안고 창밖을 보는 사람.

공식(f) 규칙
 · 한국어로 열 글자 안팎. 자리를 A·B로 표시한다.
   예: của → "A của B = B의 A"   ·   rất → "rất + 형용사 = 아주 ~"
   không → "không + 동사 = 안 ~"  ·   và → "A và B = A 그리고 B"
 · e 는 그 공식이 실제로 쓰인 짧은 보기. "tên của tôi = 내 이름" 처럼.

낱말:
{words}
"""

def ask(words):
    body = json.dumps({
        'contents': [{'role': 'user', 'parts': [{'text': PROMPT.format(
            words='\n'.join(f"{w['vi']} = {w['ko']}" for w in words))}]}],
        'generationConfig': {'temperature': 0.3, 'maxOutputTokens': 8000,
                             'responseMimeType': 'application/json',
                             'thinkingConfig': {'thinkingBudget': 0}},
    }, ensure_ascii=False)
    pathlib.Path('/tmp/cls.json').write_text(body)
    for _ in range(3):
        r = subprocess.run(['curl', '-s', '-X', 'POST', RELAY,
                            '-H', 'Origin: http://localhost:8899',
                            '-H', 'Content-Type: application/json',
                            '--data-binary', '@/tmp/cls.json'],
                           capture_output=True, text=True).stdout
        try:
            return json.loads(json.loads(r)['candidates'][0]['content']['parts'][0]['text'])
        except Exception:
            time.sleep(6)
    return []

def main():
    words = json.loads(pathlib.Path('/tmp/noimg.json').read_text())
    got = json.loads(OUT.read_text()) if OUT.exists() else {}
    todo = [w for w in words if w['vi'] not in got]
    print(f'남은 낱말 {len(todo)} / {len(words)}')
    for i in range(0, len(todo), BATCH):
        chunk = todo[i:i + BATCH]
        res = ask(chunk)
        for x in res:
            if x.get('vi'):
                got[x['vi']] = x
        OUT.write_text(json.dumps(got, ensure_ascii=False, indent=1))
        d = sum(1 for v in got.values() if v.get('k') == 'draw')
        print(f'  {len(got)}/{len(words)} (그림 {d} · 공식 {len(got)-d})', flush=True)
        time.sleep(4)
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
