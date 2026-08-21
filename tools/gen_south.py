#!/usr/bin/env python3
"""남부(호찌민) 목소리 음원 생성 — FPT.AI lannhi.
키는 환경변수 FPT_KEY 로만 받는다(코드·저장소에 키를 남기지 않는다).
무료 등급은 분당 요청이 막히므로, 막히면 65초 쉬고 다시 시도한다.
쓰임: FPT_KEY=... python3 tools/gen_south.py
"""
import json, os, pathlib, subprocess, sys, time

KEY = os.environ.get('FPT_KEY')
if not KEY: sys.exit('FPT_KEY 환경변수가 없다')
R = pathlib.Path(__file__).resolve().parent.parent
IDX = json.loads((R/'data/audio_index.json').read_text())
SPEEDS = [('n', '0'), ('slow', '-2')]
API = 'https://api.fpt.ai/hmi/tts/v5'

def req(text, speed):
    # 파이썬 기본 인증서가 FPT 인증서 체인을 못 읽어서 curl 을 쓴다 (curl 은 통과 확인됨)
    r = subprocess.run(['curl', '-s', '--max-time', '30', '-X', 'POST', API,
        '-H', f'api_key: {KEY}', '-H', 'voice: lannhi', '-H', f'speed: {speed}',
        '--data-binary', text.encode()], capture_output=True)
    return json.loads(r.stdout or b'{}')

def fetch(url):
    for _ in range(15):                        # 파일이 만들어질 때까지 기다린다
        r = subprocess.run(['curl', '-s', '--max-time', '30', url], capture_output=True)
        b = r.stdout
        if len(b) > 1000 and (b[:3] == b'ID3' or b[0] == 0xFF): return b
        time.sleep(5)
    return None

jobs = [(t, h, sub, sp) for t, h in IDX.items() for sub, sp in SPEEDS]
todo = [(t, h, sub, sp) for t, h, sub, sp in jobs
        if not (R/f'audio/sf/{sub}/{h}.mp3').exists()]
print(f'전체 {len(jobs)} / 남은 {len(todo)}', flush=True)
for sub, _ in SPEEDS: (R/f'audio/sf/{sub}').mkdir(parents=True, exist_ok=True)

ok = fail = 0; limit_streak = 0
for i, (t, h, sub, sp) in enumerate(todo):
    out = R/f'audio/sf/{sub}/{h}.mp3'
    while True:
        try: j = req(t, sp)
        except Exception as e:
            print(f'요청 실패 {t[:20]}: {e}', flush=True); time.sleep(10); continue
        if j.get('error') == 0 and j.get('async'):
            limit_streak = 0
            b = fetch(j['async'])
            if b: out.write_bytes(b); ok += 1
            else: print(f'다운로드 실패: {t[:25]} {sub}', flush=True); fail += 1
            break
        if 'rate limit' in str(j.get('message', '')).lower():
            limit_streak += 1
            if limit_streak > 40:              # 40번(약 45분) 연속이면 하루 한도로 판단
                print(f'하루 한도로 보임. 저장 {ok}, 실패 {fail}, 남음 {len(todo)-i}', flush=True)
                sys.exit(1)
            time.sleep(65); continue
        print(f'오류 응답: {j} ← {t[:25]} {sub}', flush=True); fail += 1; break
    if ok and ok % 20 == 0: print(f'{ok}/{len(todo)} 저장', flush=True)
    time.sleep(1.2)                            # 예의상 간격
print(f'끝. 저장 {ok}, 실패 {fail}', flush=True)
