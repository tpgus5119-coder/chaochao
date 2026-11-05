#!/usr/bin/env python3
"""교재 음원(수업 자료/Q1·Q2 오디오 파일)을 faster-whisper 로 받아써 낱말마다 시각을 얻는다 (듣기 연습 비공개 페이지용, 2026-11-05).
받아쓴 글은 시각을 얻는 데만 쓴다 — 화면 글은 교재 글(tools/book_ex/src)이다(Whisper 는 지어낸다).
결과는 저장소 밖 ~/짜오짜오/듣기연습/whisper/<파일>.json (교재 음원·원문은 공개 저장소 금지)."""
import json, pathlib, sys
from faster_whisper import WhisperModel
SRC = pathlib.Path.home() / '짜오짜오/원본자료/베트남어 학습자료/수업 자료'
OUT = pathlib.Path.home() / '짜오짜오/듣기연습/whisper'
DIRS = ['Q1 오디오 파일/Hội thoại', 'Q1 오디오 파일/Bài nghe', 'Q1 오디오 파일/Phát âm + Đọc + Chính tả',
        'Q2 오디오 파일/Hội thoại', 'Q2 오디오 파일/Bài nghe', 'Q2 오디오 파일/Đọc']
m = WhisperModel(sys.argv[1] if len(sys.argv) > 1 else 'medium', device='cpu', compute_type='int8')
for d in DIRS:
    for f in sorted((SRC / d).glob('*.m4a')):
        o = OUT / (d.split('/')[0][:2] + '__' + d.split('/')[1] + '__' + f.stem + '.json')
        if o.exists(): continue
        segs, info = m.transcribe(str(f), language='vi', word_timestamps=True, beam_size=5, vad_filter=False, condition_on_previous_text=False)
        words = [{'w': w.word.strip(), 's': round(w.start, 2), 'e': round(w.end, 2)} for s in segs for w in (s.words or [])]
        o.write_text(json.dumps({'file': str(f.relative_to(SRC)), 'dur': round(info.duration, 2), 'words': words}, ensure_ascii=False))
        print(o.name, len(words), flush=True)
