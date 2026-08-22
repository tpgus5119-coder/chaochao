#!/usr/bin/env python3
"""그림 664장을 Draw Things(내 맥의 무료 로컬 서버)로 굽는다.
프롬프트는 docs/image-prompts.md에서 읽는다. 이미 있는 그림은 건너뛴다.
같은 이름은 항상 같은 씨앗을 써서 다시 돌려도 같은 그림이 나온다.
실행: <vieneu 환경>/bin/python tools/gen_images.py [--limit N]"""
import base64, io, json, pathlib, re, sys, urllib.request, zlib

R = pathlib.Path(__file__).resolve().parent.parent
API = 'http://127.0.0.1:7860/sdapi/v1/txt2img'
IMG = R / 'img'
IMG.mkdir(exist_ok=True)

# 문서에서 (파일이름, 프롬프트) 짝을 읽는다
pairs = []
name = None
for line in (R / 'docs' / 'image-prompts.md').read_text().splitlines():
    m = re.match(r'\*\*([\w-]+)\.webp\*\*', line)      # d01- 뿐 아니라 x-(추상어)·n-(기사)도
    if m: name = m.group(1)
    elif name and line.startswith('> '):
        pairs.append((name, line[2:].strip()))
        name = None

limit = None
for i, a in enumerate(sys.argv):
    if a == '--limit': limit = int(sys.argv[i + 1])

from PIL import Image

made = skip = fail = 0
for name, prompt in pairs:
    out = IMG / f'{name}.webp'
    if out.exists(): skip += 1; continue
    if limit is not None and made >= limit: break
    body = json.dumps({
        'prompt': prompt,
        'steps': 4, 'cfg_scale': 1,
        'width': 640, 'height': 640,
        'seed': zlib.crc32(name.encode()) % 2_000_000_000,   # 이름=씨앗 (재현 가능)
    }).encode()
    try:
        req = urllib.request.Request(API, data=body, headers={'Content-Type': 'application/json'})
        r = json.loads(urllib.request.urlopen(req, timeout=600).read())
        png = base64.b64decode(r['images'][0])
        im = Image.open(io.BytesIO(png)).convert('RGB')
        im.save(out, 'WEBP', quality=82)
        made += 1
        if made % 10 == 0: print(f'{made}장 (건너뜀 {skip})', flush=True)
    except Exception as e:
        fail += 1
        print(f'실패 {name}: {e}', flush=True)
        if fail > 20: print('실패가 많아 중단', flush=True); break
print(f'끝 — 새로 {made} / 이미 있음 {skip} / 실패 {fail}', flush=True)
