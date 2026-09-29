#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""필기 낱말 그림 굽기 — scratchpad/notes_img.json [[파일이름, 글감], …] 을 Draw Things(FLUX schnell 4단계, gen_word_img.py 와 같은 설정)로 img/ 에 굽는다.
글감이 빈 것은 건너뛴다. 쓰기: python3 tools/notes/img.py <목록.json>"""
import io, json, pathlib, sys
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / "tools"))
from gen_word_img import make, seed_of  # noqa: E402
from PIL import Image  # noqa: E402

def main():
    lst = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
    made = skip = fail = 0
    for i, (fn, prompt) in enumerate(lst, 1):
        p = R / "img" / fn
        if p.exists() or not prompt: skip += 1; continue
        try:
            png = make(prompt, seed_of(fn))
            Image.open(io.BytesIO(png)).convert("RGB").resize((384, 384), Image.LANCZOS).save(p, "WEBP", quality=82, method=6)
            made += 1
        except Exception as e:
            fail += 1; print("  실패", fn, e, flush=True)
        if i % 10 == 0: print(f"  {i}/{len(lst)} · 만듦 {made} · 건너뜀 {skip} · 실패 {fail}", flush=True)
    print(f"끝 · 만듦 {made} · 건너뜀 {skip} · 실패 {fail}", flush=True)

if __name__ == "__main__":
    main()
