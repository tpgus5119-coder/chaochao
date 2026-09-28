#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""낱말 그림에 박힌 **그 낱말 글자만** 지운다 (대표님 지시 2026-09-28 밤: "단어 알파벳이 이미지에 들어갔다면 다시 만들거나 그 단어만 지워도 된다").
그림을 보고 뜻을 떠올려야 하는데 글자가 있으면 글자를 읽고 끝난다.
① data/_img_wordtext.json(tools/img_word_text.py 가 찾은 것)의 그림마다 글자 자리를 Vision 으로 잡고(tools/bin/ocr_box)
② 낱말과 겹치는 글자 칸만(물음표 같은 기호는 남긴다) 둘레를 넉넉히 잡아 OpenCV 인페인트로 메운다
③ 다시 OCR 해서 그 낱말이 사라졌는지 확인 — 남아 있으면 한 번 더 넓혀 지운다. 원본은 _보관/img_text_orig/ 에 둔다(지우지 않는다)
쓰기: python3 tools/img_erase_word.py [--dry]"""
import json, pathlib, re, shutil, subprocess, sys, unicodedata as U
import cv2, numpy as np
from PIL import Image
R = pathlib.Path(__file__).resolve().parent.parent
BOX = str(R / 'tools/bin/ocr_box')
KEEP = R / '_보관/img_text_orig'


def bare(s):
    d = U.normalize('NFD', str(s).lower().replace('đ', 'd'))
    return re.sub(r'[^a-z0-9]+', ' ', ''.join(c for c in d if not U.combining(c))).strip()


def boxes(p):
    r = subprocess.run([BOX, str(p)], capture_output=True, text=True, timeout=120)
    return json.loads(r.stdout.strip().splitlines()[-1])


def word_boxes(j, words):
    toks = {t for w in words for t in bare(w).split() if len(t) >= 2}
    out = []
    for txt, x, y, w, h in j.get('b', []):
        bt = bare(txt).split()
        if any(t in toks for t in bt) or any(bare(w) in bare(txt) for w in words):
            out.append((x, y, w, h))
    return out


def erase(p, bxs, grow):
    im = np.array(Image.open(p).convert('RGB'))
    H, W = im.shape[:2]
    mask = np.zeros((H, W), np.uint8)
    for x, y, w, h in bxs:
        px, py = int(w * grow + 4), int(h * (grow + .35) + 4)      # 부호(모자·성조)가 칸 위로 삐져나오므로 위아래를 더
        cv2.rectangle(mask, (max(0, int(x) - px), max(0, int(y) - py)), (min(W - 1, int(x + w) + px), min(H - 1, int(y + h) + py // 2)), 255, -1)
    out = cv2.inpaint(cv2.cvtColor(im, cv2.COLOR_RGB2BGR), mask, 7, cv2.INPAINT_TELEA)
    Image.fromarray(cv2.cvtColor(out, cv2.COLOR_BGR2RGB)).save(p, 'WEBP', quality=86, method=6)


def main():
    dry = '--dry' in sys.argv
    hits = json.loads((R / 'data/_img_wordtext.json').read_text(encoding='utf-8'))
    KEEP.mkdir(parents=True, exist_ok=True)
    done, left = [], []
    for name, words in hits.items():
        p = R / 'img' / name
        if not p.exists(): continue
        j = boxes(p); bx = word_boxes(j, words)
        if not bx: left.append((name, words, 'OCR 칸을 못 잡음')); continue
        if dry: print(name, words, bx); continue
        if not (KEEP / name).exists(): shutil.copy2(p, KEEP / name)
        erase(p, bx, .12)
        if word_boxes(boxes(p), words):                               # 아직 남았다 — 원본에서 더 넓게
            shutil.copy2(KEEP / name, p); erase(p, word_boxes(boxes(p), words), .45)
        still = word_boxes(boxes(p), words)
        (left if still else done).append((name, words, '남음' if still else ''))
    print(f'지움 {len(done)} · 못 지움 {len(left)}')
    for x in left: print('  남음', x)
    (R / 'data/_img_wordtext_done.json').write_text(json.dumps({'done': [d[0] for d in done], 'left': [l[0] for l in left]}, ensure_ascii=False, indent=1), encoding='utf-8')


if __name__ == '__main__':
    main()
