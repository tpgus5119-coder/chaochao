#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""기사 하나를 **카드뉴스 두 장**으로 만든다 → img/card/<날짜>-<n>-{1,2}.webp

대표님 지시 (2026-08-30):
  "각 기사마다 2개씩 카드가 나오는거임. 총 10개의 카드가 나오는거지."
  "글이 너무 많으면 안 된다. 가독성 좋아야하고 심플하고 간결하고 쉬워야한다."
  "손은 넣지 않도록 미리 세팅"

만드는 법 — **글자는 확산 모델로 그리지 않는다.**
  확산 모델은 글자를 제대로 못 쓴다. 그래서 배경 그림만 FLUX 로 굽고,
  제목·요약·낱말은 파이썬(PIL)이 얹는다. 그래야 글자가 정확하다.
  카드 크기는 **1080×1350 (4:5)** — 요즘 SNS 표준이고 세로라 글자리가 넉넉하다.

  ① 첫 장 = 갈래표 + 제목 + 두 줄 요약 + 배경 그림
  ② 둘째 장 = 그 기사에서 뽑은 낱말 여섯 개 (베트남어 · 발음 · 뜻)

쓰기: python3 tools/card_news.py [--day 2026-08-28] [--limit 5]
"""
import argparse, hashlib, io, json, pathlib, re, sys, unicodedata as U, urllib.request

R = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(R / "tools"))
import vi_kr
from PIL import Image, ImageDraw, ImageFont

OUT = R / "img" / "card"
API = "http://127.0.0.1:7860/sdapi/v1/txt2img"
W, H = 1080, 1350
FONT = "/System/Library/Fonts/AppleSDGothicNeo.ttc"          # 한국어
# 베트남어는 한국어 글꼴에 성조 글자가 없다 — 'công' 이 'c□ng' 으로 나왔다 (2026-08-30).
# 그런데 글자를 **가졌다고 제대로 그리는 것은 아니다**: Avenir 는 U+1EA5(ấ) 를 그릴 때
# 성조를 오른쪽으로 밀어 'xuât́' 처럼 만든다. 눈으로 다섯 글꼴을 나란히 그려 보고 골랐다.
# Helvetica·Arial·Verdana 는 제자리에 찍는다.
FONT_VI, FONT_VI_IDX = "/System/Library/Fonts/Helvetica.ttc", 1   # index 1 = Bold
# 갈래마다 색을 달리한다. **색만으로 가르지 않는다** — 글자로도 갈래를 적는다(색각 배려)
CAT_COLOR = {"일자리": (33, 90, 160), "공장·산업": (120, 60, 20), "경제": (20, 90, 70),
             "사회": (130, 40, 90), "정치": (60, 60, 60), "문화·생활": (150, 90, 20)}
BG, FG, DIM = (250, 249, 246), (24, 26, 30), (110, 115, 125)


def font(sz, weight=0, vi=False):
    path = FONT_VI if vi else FONT
    for idx in ((FONT_VI_IDX, 0) if vi else (weight, 0)):
        try: return ImageFont.truetype(path, sz, index=idx)
        except Exception: pass
    return ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Unicode.ttf", sz)


# PIL 은 **분해형(NFD) 글자의 성조를 합쳐 그리지 못한다** — 'sản xuất' 이 'sản xuât' 로 나왔다.
# 그리기 전에 반드시 NFC 로 모은다 (2026-08-30 검수).
nfc = lambda s: U.normalize("NFC", str(s))


def wrap(dr, text, f, width):
    """글자 폭을 재서 줄을 나눈다. 한국어는 띄어쓰기가 드물어 글자 단위로도 끊는다."""
    out, line = [], ""
    for ch in text:
        t = line + ch
        if dr.textlength(t, font=f) > width and line:
            out.append(line); line = ch.lstrip()
        else: line = t
    if line: out.append(line)
    return out


def bg_image(prompt, seed):
    """배경 그림 — 사람·손·글자가 안 나오게 **긍정문으로만** 적는다."""
    body = json.dumps({"prompt": prompt, "steps": 4, "shift": 1, "cfg_scale": 1,
                       "width": 768, "height": 768, "seed": seed,
                       "sampler_name": "Euler A Trailing"}).encode()
    r = urllib.request.urlopen(urllib.request.Request(API, body, {"Content-Type": "application/json"}), timeout=300)
    import base64
    return Image.open(io.BytesIO(base64.b64decode(json.loads(r.read())["images"][0]))).convert("RGB")


def card1(d, bg):
    im = Image.new("RGB", (W, H), BG)
    dr = ImageDraw.Draw(im)
    if bg:
        b = bg.resize((W, W))
        im.paste(b, (0, H - W))
        # 아래 그림 위에 흰 그러데이션을 얹어 글자가 읽히게
        g = Image.new("L", (1, W), 0)
        for y in range(W): g.putpixel((0, y), int(255 * max(0, 1 - y / (W * .55))))
        im.paste(Image.new("RGB", (W, W), BG), (0, H - W), g.resize((W, W)))
    cat = d.get("cat") or "소식"
    c = CAT_COLOR.get(cat, (60, 60, 60))
    f_cat, f_t, f_b, f_s = font(34, 1), font(62, 1), font(38), font(28)
    dr.rounded_rectangle([70, 84, 70 + dr.textlength(nfc(cat), font=f_cat) + 56, 148], 32, fill=c)
    dr.text((98, 96), nfc(cat), font=f_cat, fill=(255, 255, 255))
    y = 200
    for ln in wrap(dr, nfc(d["title"]), f_t, W - 140)[:4]:
        dr.text((70, y), nfc(ln), font=f_t, fill=FG); y += 78
    y += 26
    for ln in wrap(dr, nfc(d.get("intro") or ""), f_b, W - 140)[:4]:
        dr.text((70, y), nfc(ln), font=f_b, fill=(70, 74, 82)); y += 54
    dr.text((70, H - 62), "짜오짜오 · " + d.get("ts", ""), font=f_s, fill=DIM)
    return im


def card2(d):
    im = Image.new("RGB", (W, H), BG)
    dr = ImageDraw.Draw(im)
    f_h, f_vi, f_kr, f_ko, f_s = font(46, 1), font(50, vi=True), font(30), font(36), font(28)
    dr.text((70, 92), "이 기사에서 배울 말", font=f_h, fill=FG)
    dr.line([70, 168, W - 70, 168], fill=(220, 220, 216), width=3)
    y = 210
    for w in (d.get("words") or [])[:6]:
        kr = w.get("kr_read") or vi_kr.word(w["vi"])
        dr.text((70, y), nfc(w["vi"]), font=f_vi, fill=FG)
        dr.text((70 + dr.textlength(nfc(w["vi"]), font=f_vi) + 20, y + 18), "[" + kr + "]", font=f_kr, fill=DIM)
        dr.text((70, y + 66), nfc(w["ko"]), font=f_ko, fill=(70, 74, 82))
        y += 150
    dr.text((70, H - 62), "짜오짜오 · 오늘의 기사", font=f_s, fill=DIM)
    return im


def main():
    a = argparse.ArgumentParser()
    a.add_argument("--day", default=""); a.add_argument("--limit", type=int, default=5)
    a.add_argument("--nobg", action="store_true")
    a = a.parse_args()
    D = json.loads((R / "data" / "news_days.json").read_text(encoding="utf-8"))["days"]
    if a.day: D = [d for d in D if d.get("ts") == a.day]
    else:
        last = max((d.get("ts") or "") for d in D)
        D = [d for d in D if d.get("ts") == last]
    D = D[:a.limit]
    OUT.mkdir(parents=True, exist_ok=True)
    print(f"카드뉴스 {len(D)}편 × 2장", flush=True)
    made = []
    for i, d in enumerate(D, 1):
        bg = None
        if not a.nobg:
            # 배경은 **사람·손·글자 없는 장면**만. 갈래에 맞춘 사물 풍경으로.
            scene = {"일자리": "an empty office desk with a chair by a window",
                     "공장·산업": "a factory building with tall chimneys at sunrise",
                     "경제": "stacked coins and a rising line chart on a plain table",
                     "사회": "a quiet city street with traffic lights",
                     "정치": "a government building with flags",
                     "문화·생활": "a bowl of pho and chopsticks on a wooden table",
                     }.get(d.get("cat"), "a calm city skyline at dawn")
            pr = scene + ". Flat vector illustration, bold black outlines, flat pastel fill, plain background"
            try: bg = bg_image(pr, int(hashlib.sha1(pr.encode()).hexdigest()[:8], 16) % 10 ** 8)
            except Exception as e: print("  배경 못 구움:", type(e).__name__)
        base = f"{d.get('ts','x')}-{i}"
        for n, im in ((1, card1(d, bg)), (2, card2(d))):
            p = OUT / f"{base}-{n}.webp"
            im.save(p, "WEBP", quality=88, method=6)
            made.append(p.name)
        print(f"  {i}/{len(D)} {d.get('theme','')}", flush=True)
    print("만든 카드:", len(made), "→", OUT)


if __name__ == "__main__":
    main()
