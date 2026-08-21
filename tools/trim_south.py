#!/usr/bin/env python3
"""남부 음원 덧말 제거.
로컬 TTS가 단어를 읽고 나서 헛말을 덧붙이는 일이 있다(끝이 잘린 채).
말 덩어리를 찾아 — 단어는 첫 덩어리만, 문장은 큰 침묵(0.8초) 전까지만 — 남기고 자른다.
느리게 버전은 자른 소리에서 다시 만든다.
실행: <vieneu 환경>/bin/python tools/trim_south.py
"""
import json, pathlib
import numpy as np, soundfile as sf, librosa

R = pathlib.Path(__file__).resolve().parent.parent
IDX = json.loads((R/'data/audio_index.json').read_text())

def segments(y, sr, thresh=0.012, merge_gap=0.28):
    win = int(sr*0.02)
    if len(y) < win*3: return []
    env = np.array([np.sqrt((y[i:i+win]**2).mean()) for i in range(0, len(y)-win, win)])
    segs, start = [], None
    for i, v in enumerate(env > thresh):
        if v and start is None: start = i
        if not v and start is not None: segs.append([start*win, i*win]); start = None
    if start is not None: segs.append([start*win, len(y)])
    merged = []
    for s, e in segs:
        if merged and s - merged[-1][1] < merge_gap*sr: merged[-1][1] = e
        else: merged.append([s, e])
    return merged

changed = 0
for text, h in IDX.items():
    p = R/f'audio/sf/n/{h}.mp3'
    if not p.exists(): continue
    y, sr = sf.read(p)
    if getattr(y, 'ndim', 1) > 1: y = y.mean(axis=1)
    segs = segments(y, sr)
    if not segs: continue
    is_word = len(text.split()) <= 3
    if is_word:
        keep_end = segs[0][1]                      # 첫 말 덩어리만
    else:
        keep_end = segs[0][1]
        for k in range(1, len(segs)):              # 문장: 0.8초 넘게 쉬면 그 뒤는 헛말
            if segs[k][0] - keep_end > 0.8*sr: break
            keep_end = segs[k][1]
    start = max(0, segs[0][0] - int(0.06*sr))
    end = min(len(y), keep_end + int(0.10*sr))
    if end >= len(y) - int(0.05*sr) and start <= int(0.05*sr):
        continue                                   # 자를 게 없다
    y2 = y[start:end].astype('float32')
    sf.write(p, y2, sr, format='MP3')
    sf.write(R/f'audio/sf/slow/{h}.mp3', librosa.effects.time_stretch(y2, rate=0.72), sr, format='MP3')
    changed += 1
print(f'덧말·여백 잘라낸 파일: {changed}개', flush=True)
