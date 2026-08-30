#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""과정 낱말의 그림을 Draw Things 로 굽는다 → img/w-*.webp · order.json 에 붙인다

프롬프트는 tools/img_prompt_gen.py 가 만든 data/_imgprompts.json 에서 읽는다.
파일 이름은 뜻에서 만든다(w-<해시>.webp) — 같은 뜻이면 같은 그림을 나눠 쓴다.
이미 있는 그림은 건너뛴다. 같은 이름은 늘 같은 씨앗이라 다시 돌려도 같은 그림이 나온다.
쓰기: python3 tools/gen_word_img.py [--limit N]
"""
import argparse, base64, hashlib, io, json, pathlib, re, time, urllib.request, unicodedata as U

R = pathlib.Path(__file__).resolve().parent.parent
API = "http://127.0.0.1:7860/sdapi/v1/txt2img"
IMG = R / "img"
NEG = ("text, letters, words, watermark, signature, blurry, extra fingers, "
       "deformed hands, ugly, low quality")

def name_of(ko):
    h = hashlib.sha1(U.normalize("NFC", ko).encode()).hexdigest()[:10]
    return f"w-{h}.webp"

def seed_of(n):
    return int(hashlib.sha1(n.encode()).hexdigest()[:8], 16) % (2 ** 31)

def make(prompt, seed):
    body = json.dumps({"prompt": prompt, "negative_prompt": NEG, "steps": 8,
                       "width": 512, "height": 512, "cfg_scale": 5, "seed": seed,
                       "sampler_name": "DPM++ 2M Karras"}).encode()
    req = urllib.request.Request(API, body, {"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return base64.b64decode(json.loads(r.read())["images"][0])

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--limit", type=int, default=0)
    a = ap.parse_args()
    from PIL import Image
    pr = json.loads((R / "data" / "_imgprompts.json").read_text(encoding="utf-8"))
    o = json.loads((R / "data" / "order.json").read_text(encoding="utf-8"))

    def walk(v):
        for t in (v.get("tracks") or [v]):
            for c in t["chapters"]:
                for l in c["lessons"]: yield from l["words"]

    need, seen = [], set()
    for v in o["vols"]:
        for w in walk(v):
            if w.get("img"): continue
            k = re.sub(r"\s+", " ", U.normalize("NFC", w["ko"]).split("/")[0].split("(")[0]).strip()
            if k not in pr or k in seen: continue
            seen.add(k); need.append(k)
    if a.limit: need = need[:a.limit]
    print(f"구울 그림 {len(need)}장", flush=True)
    made = skip = fail = 0
    for i, k in enumerate(need, 1):
        fn = name_of(k)
        p = IMG / fn
        if p.exists(): skip += 1; continue
        try:
            png = make(pr[k], seed_of(fn))
            im = Image.open(io.BytesIO(png)).convert("RGB").resize((384, 384), Image.LANCZOS)
            im.save(p, "WEBP", quality=82, method=6)
            made += 1
        except Exception as e:
            fail += 1
            if fail <= 3: print("  실패", k, e, flush=True)
        if i % 25 == 0: print(f"  {i}/{len(need)} · 만듦 {made} · 건너뜀 {skip} · 실패 {fail}", flush=True)
    print(f"끝. 만듦 {made} · 건너뜀 {skip} · 실패 {fail}", flush=True)
main()
