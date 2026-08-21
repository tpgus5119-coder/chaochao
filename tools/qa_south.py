#!/usr/bin/env python3
"""남부 음원 자동 검수 + 자가 치유.
모든 한 음절 단어의 음높이 방향을 물리적으로 재서, 성조 기대와 어긋나면
통과할 때까지 다시 굽는다(최대 5회, 가장 좋은 판 채택). 사람 귀 없이 돌아간다.

기준(남부 실측 보정): sắc ≥ +1.0 반음 / huyền ≤ -0.3 / nặng ≤ 0 / ngang |±2.5|
hỏi·ngã는 굴곡형이라 방향 단정이 불가능해 기록만 한다.
실행: <vieneu 환경>/bin/python tools/qa_south.py
"""
import json, pathlib, sys, unicodedata
import numpy as np, soundfile as sf, librosa

R = pathlib.Path(__file__).resolve().parent.parent
IDX = json.loads((R/'data/audio_index.json').read_text())
MARKS = {'̀':'huyền','́':'sắc','̉':'hỏi','̃':'ngã','̣':'nặng'}

def tone_of(syl):
    for ch in unicodedata.normalize('NFD', syl):
        if ch in MARKS: return MARKS[ch]
    return 'ngang'

def f0_trend(path):
    w, sr = sf.read(path)
    if getattr(w, 'ndim', 1) > 1: w = w.mean(axis=1)
    win, hop = int(sr*.04), int(sr*.01)
    lo, hi = int(sr/400), int(sr/80)
    v = []
    for i in range(0, len(w)-win, hop):
        fr = w[i:i+win] * np.hanning(win)
        if np.sqrt((fr**2).mean()) < 0.015: continue
        ac = np.correlate(fr, fr, 'full')[win-1:]
        seg = ac[lo:hi]
        if len(seg) == 0 or ac[0] <= 0: continue
        lag = lo + int(np.argmax(seg))
        if seg.max()/ac[0] > 0.35: v.append(sr/lag)
    if len(v) < 6: return None
    a = np.median(v[:max(2, len(v)//3)]); b = np.median(v[-max(2, len(v)//3):])
    return 12*np.log2(b/a)

def ok(tone, st):
    if st is None: return False
    return {'sắc': st >= 1.0, 'huyền': st <= -0.3, 'nặng': st <= 0.0,
            'ngang': -2.5 <= st <= 2.5}.get(tone, True)   # hỏi·ngã 는 항상 통과(기록만)

words = [(t, h) for t, h in IDX.items() if len(t.split()) == 1]
print(f'한 음절 단어 {len(words)}개 검수 시작', flush=True)

tts = None
def gen(text):
    global tts
    if tts is None:
        from vieneu import Vieneu
        tts = Vieneu(mode="v3turbo")
    return tts.infer(text, voice="Thùy Dung", temperature=0.3)

passed = healed = failed = 0
loglines = []
for i, (t, h) in enumerate(words):
    tone = tone_of(t)
    p = R/f'audio/sf/n/{h}.mp3'
    st = f0_trend(p)
    if ok(tone, st):
        passed += 1
    else:
        best, best_st = None, st
        good = False
        for attempt in range(5):
            wav = gen(t)
            tmp = R/'audio/sf/_qa.wav'
            import vieneu  # save 헬퍼
            tts.save(wav, str(tmp))
            y, sr = sf.read(tmp)
            if getattr(y, 'ndim', 1) > 1: y = y.mean(axis=1)
            y24 = librosa.resample(y.astype('float32'), orig_sr=sr, target_sr=24000)
            cand = R/'audio/sf/_qa_cand.mp3'
            sf.write(cand, y24, 24000, format='MP3')
            st2 = f0_trend(cand)
            if ok(tone, st2):
                sf.write(p, y24, 24000, format='MP3')
                slow = librosa.effects.time_stretch(y24, rate=0.72)
                sf.write(R/f'audio/sf/slow/{h}.mp3', slow, 24000, format='MP3')
                healed += 1; good = True
                loglines.append(f'치유: {t} ({tone}) {st} → {st2:+.1f}')
                break
        if not good:
            failed += 1
            loglines.append(f'미달: {t} ({tone}) st={st}')
    if (i+1) % 40 == 0: print(f'{i+1}/{len(words)} (통과 {passed} 치유 {healed} 미달 {failed})', flush=True)

for f in ['_qa.wav', '_qa_cand.mp3']: (R/f'audio/sf/{f}').unlink(missing_ok=True)
print(f'끝 — 통과 {passed} / 다시 구워 통과 {healed} / 미달 {failed}', flush=True)
for l in loglines: print(' ', l, flush=True)
