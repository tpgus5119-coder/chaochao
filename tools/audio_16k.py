#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""소리를 16kbps(모노·16kHz mp3)로 줄인다 (2026-10-01, 대표님 "모든 소리 그냥 16k로 해보자" — 사전 낱말·예문 소리까지 1GB 안에 넣으려고).
32kbps 원본은 ~/짜오짜오/원본자료/소리_32k_원본_20261001/ 에 보관(지우지 않음). 이미 16k 인 파일은 건너뛴다(다시 돌려도 안전).
새 소리를 만드는 도구(gen_audio_list.py)도 끝에 이걸 부른다. 쓰기: python3 tools/audio_16k.py [파일·폴더 …] (없으면 audio/ 전체)"""
import os, subprocess, sys, pathlib, concurrent.futures as cf
R = pathlib.Path(__file__).resolve().parent.parent


def bitrate(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=bit_rate', '-of', 'csv=p=0', str(p)], capture_output=True, text=True)
    try: return int(r.stdout.strip() or 0)
    except ValueError: return 0


def one(p):
    p = pathlib.Path(p)
    if bitrate(p) <= 17000: return 'skip'
    tmp = p.with_suffix('.tmp.mp3')
    r = subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(p), '-ac', '1', '-ar', '16000', '-b:a', '16k', str(tmp)])
    if r.returncode or not tmp.exists() or tmp.stat().st_size < 200:
        tmp.unlink(missing_ok=True); return 'fail'
    os.replace(tmp, p); return 'ok'


def files(args):
    roots = [pathlib.Path(a) for a in args] or [R / 'audio']
    for r in roots:
        if r.is_dir(): yield from (x for x in r.rglob('*.mp3') if not x.name.endswith('.tmp.mp3'))
        elif r.suffix == '.mp3': yield r


def main():
    fs = list(files(sys.argv[1:]))
    st = {'ok': 0, 'skip': 0, 'fail': 0}
    with cf.ThreadPoolExecutor(8) as ex:
        for i, r in enumerate(ex.map(one, fs), 1):
            st[r] += 1
            if i % 5000 == 0: print(i, st, flush=True)
    print('끝', len(fs), st, flush=True)


if __name__ == '__main__':
    main()
