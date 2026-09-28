#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tools/img_text_redraw.json 의 장면대로 그림을 다시 굽고, 글자가 없는 판만 쓴다 (2026-09-28 밤).
Draw Things(FLUX schnell 4단계, gen_word_img.py 와 같은 설정) → 원래 크기로 줄여 webp → Vision OCR 로 글자(2자 이상) 검사.
씨앗을 바꿔 최대 4번, 끝내 글자가 남으면 글자가 가장 적은 판을 _보관/img_redraw_try/ 에만 두고 원본은 그대로. 원본은 _보관/img_text_orig/ 에.
쓰기: python3 tools/img_scene_redraw.py [그림이름 ...]   (이름을 주면 그것만)"""
import base64, io, json, pathlib, re, shutil, subprocess, sys, urllib.request, zlib
from PIL import Image
R = pathlib.Path(__file__).resolve().parent.parent
API = 'http://127.0.0.1:7860/sdapi/v1/txt2img'
OCR = str(R / 'tools/bin/ocr')
CFG = json.loads((R / 'tools/img_text_redraw.json').read_text(encoding='utf-8'))
KEEP = R / '_보관/img_text_orig'; TRY = R / '_보관/img_redraw_try'


def make(prompt, seed):
    body = json.dumps({'prompt': prompt, 'steps': 4, 'shift': 1, 'width': 512, 'height': 512, 'cfg_scale': 1,
                       'seed': seed, 'sampler_name': 'Euler A Trailing'}).encode()
    r = json.loads(urllib.request.urlopen(urllib.request.Request(API, data=body, headers={'Content-Type': 'application/json'}), timeout=600).read())
    return Image.open(io.BytesIO(base64.b64decode(r['images'][0]))).convert('RGB')


def letters(p):
    r = subprocess.run([OCR, str(p)], capture_output=True, text=True, timeout=120)
    t = ' '.join(l for l in r.stdout.splitlines() if not l.startswith('==='))
    return len(re.sub(r'[^A-Za-zÀ-ỹđĐ]', '', t))


def main():
    KEEP.mkdir(parents=True, exist_ok=True); TRY.mkdir(parents=True, exist_ok=True)
    ok, bad = [], []
    only = set(sys.argv[1:])
    for name, scene in CFG['scenes'].items():
        if only and name not in only: continue
        dst = R / 'img' / name
        if not (KEEP / name).exists(): shutil.copy2(dst, KEEP / name)
        size = Image.open(KEEP / name).size
        best = None
        for k in range(4):
            seed = (zlib.crc32(name.encode()) + k * 7919) % 2_000_000_000
            im = make(scene + ', ' + CFG['style'], seed).resize(size, Image.LANCZOS)
            tmp = TRY / f'{name[:-5]}-{k}.webp'; im.save(tmp, 'WEBP', quality=86, method=6)
            n = letters(tmp)
            if best is None or n < best[0]: best = (n, tmp)
            if n < 2: break
        if best[0] < 2:
            shutil.copy2(best[1], dst); ok.append(name)
        else:
            bad.append((name, best[0]))
        print(name, '새 그림' if best[0] < 2 else f'글자 남음 {best[0]}', flush=True)
    print(f'끝 · 새 그림 {len(ok)} · 글자 남아 원본 둠 {len(bad)}', bad)


if __name__ == '__main__':
    main()
