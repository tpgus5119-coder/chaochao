# -*- coding: utf-8 -*-
"""그림에 박힌 깨진 글자 지우기 — 다시 굽고 **OCR로 확인**해서 깨끗한 판만 채택.
   씨앗을 바꿔 가며 최대 5번. 다 실패하면 글자가 가장 적은 판 채택.
   사용: python3 tools/fix_text_imgs.py 이름1,이름2,..."""
import json, io, base64, zlib, urllib.request, re, pathlib, subprocess, sys
from PIL import Image
R = pathlib.Path(__file__).resolve().parent.parent
IMG = R/'img'; API = 'http://127.0.0.1:7860/sdapi/v1/txt2img'
OCR = '/private/tmp/claude-501/-Users-leesehyeon-my-game/e87f65d0-8749-40f1-9c2e-03d1387ef650/scratchpad/ocr/ocr'
TMP = pathlib.Path('/tmp/txtfix'); TMP.mkdir(exist_ok=True)

pairs, name = {}, None
for line in (R/'docs'/'image-prompts.md').read_text().splitlines():
    m = re.match(r'\*\*([\w-]+)\.webp\*\*', line)
    if m: name = m.group(1)
    elif name and line.startswith('> '): pairs[name] = line[2:].strip(); name = None

def ocr_text(p):
    r = subprocess.run([OCR, str(p)], capture_output=True, text=True, timeout=90)
    if r.returncode != 0:
        raise RuntimeError('OCR 실행 실패 — 조용히 통과시키면 가짜 합격이 된다: ' + r.stderr[:100])
    out = []
    for ln in r.stdout.splitlines():
        q = ln.split('\t')
        if len(q) > 1 and q[1].strip(): out.append(q[1].strip())
    return ' '.join(out)

for n in sys.argv[1].split(','):
    pr = pairs.get(n)
    if not pr: print(f'  ? 그림말 없음 {n}', flush=True); continue
    if 'no signage' not in pr:
        pr += ', no signage, no labels, no writing of any kind, blank surfaces'
    best = None
    for t in range(5):
        seed = (zlib.crc32(n.encode()) + t*7919 + 4241) % 2_000_000_000
        body = json.dumps({'prompt': pr, 'steps': 4, 'cfg_scale': 1,
                           'width': 640, 'height': 640, 'seed': seed}).encode()
        try:
            r = json.loads(urllib.request.urlopen(urllib.request.Request(API, data=body,
                headers={'Content-Type': 'application/json'}), timeout=600).read())
        except Exception as e: print(f'  실패 {n}: {e}', flush=True); break
        im = Image.open(io.BytesIO(base64.b64decode(r['images'][0]))).convert('RGB')
        p = TMP/f'{n}.webp'; im.save(p, 'WEBP', quality=82)
        txt = ocr_text(p)
        if not txt:
            im.save(IMG/f'{n}.webp', 'WEBP', quality=82)
            print(f'  V {n} ({t+1}번째에 글자 없음)', flush=True); best = 'ok'; break
        if best is None or len(txt) < best[0]: best = (len(txt), im, txt)
    if best != 'ok' and isinstance(best, tuple):
        best[1].save(IMG/f'{n}.webp', 'WEBP', quality=82)
        print(f'  D {n} 다섯 번 다 남음 — 최소 채택 [{best[2][:30]}]', flush=True)
print('끝', flush=True)
