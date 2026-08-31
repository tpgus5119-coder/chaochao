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

  ① 첫 장 = 갈래표 + 제목 + **다섯 줄 요약**(tools/news_sum5.py) + 배경 그림
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
W, H = 1080, 1080          # 정사각형 (대표님 지시 2026-08-31)

# ── 글자 세팅 (가독성) ────────────────────────────────────────────────
# 자간(letter-spacing): 큰 제목은 **좁히고**, 본문은 **살짝 벌린다.**
#   큰 글씨는 글자 사이가 넓어 보이고, 작은 글씨는 붙어 보이는 착시를 되잡는 것이다.
# 행간(line-height): 한글 본문은 글자 크기의 1.6~1.7배가 읽기 좋다.
#   제목은 덩어리로 읽으므로 1.25~1.35배로 붙인다.
# 장평(가로 폭)은 **건드리지 않는다** — 글꼴을 늘리거나 줄이면 획 굵기가 망가진다.
LS_TITLE, LH_TITLE = -0.022, 1.30      # 자간 -2.2% · 행간 1.30
LS_BODY,  LH_BODY   = 0.010, 1.66      # 자간 +1.0% · 행간 1.66
LS_SMALL, LH_SMALL  = 0.015, 1.45
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


def tw(dr, text, f, ls=0.0):
    """자간을 넣은 글줄의 실제 폭."""
    if not text: return 0
    return dr.textlength(text, font=f) + ls * f.size * (len(text) - 1)


def dtext(dr, xy, text, f, fill, ls=0.0):
    """자간을 넣어 그린다. 자간이 0이면 한 번에 그린다(글꼴의 커닝을 살린다).

    자간을 줄 때는 글자를 하나씩 찍는다. **베트남어에는 쓰지 마라** — 성조가 붙은
    글자를 낱자로 쪼개면 부호가 어긋난다. 한국어·숫자에만 쓴다."""
    if not ls:
        dr.text(xy, text, font=f, fill=fill); return
    x, y = xy
    step = ls * f.size
    for ch in text:
        dr.text((x, y), ch, font=f, fill=fill)
        x += dr.textlength(ch, font=f) + step


def wrap(dr, text, f, width, ls=0.0):
    """글자 폭을 재서 줄을 나눈다. 한국어는 띄어쓰기가 드물어 글자 단위로도 끊는다."""
    out, line = [], ""
    for ch in text:
        t = line + ch
        if tw(dr, t, f, ls) > width and line:
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
    """첫 장 — 그림을 정사각 카드 전면에 깔고 그 위에 갈래·제목·다섯 줄 요약을 얹는다.

    글이 그림에 묻히지 않게, 글이 놓인 데까지만 흐린 막을 씌우고 아래로 걷어 낸다.
    자간·행간은 위 상수(LS_*/LH_*)를 쓴다 — 큰 제목은 좁히고 본문은 살짝 벌린다."""
    im = Image.new("RGB", (W, H), BG)
    f_cat, f_t, f_b, f_s = font(30, 1), font(50, 1), font(26), font(24)
    lh_t, lh_b = int(f_t.size * LH_TITLE), int(f_b.size * LH_BODY)
    PAD = 64

    probe = ImageDraw.Draw(im)
    t_lines = wrap(probe, nfc(d["title"]), f_t, W - PAD * 2, LS_TITLE)[:3]
    body = d.get("sum5") or [d.get("intro") or ""]
    b_lines = []
    for para in body:
        b_lines += wrap(probe, nfc(para), f_b, W - PAD * 2, LS_BODY)
    b_lines = b_lines[:8]   # 한 줄에 안 들어가는 문장은 두 줄로 접힌다
    y_title = 168
    y_body = y_title + len(t_lines) * lh_t + 22
    text_bottom = y_body + len(b_lines) * lh_b

    if bg:
        im.paste(bg.resize((W, H)), (0, 0))
        fade_to = min(H, text_bottom + 150)
        g = Image.new("L", (1, H), 0)
        for y in range(H):
            if y <= text_bottom: v = 235
            elif y >= fade_to:   v = 0
            else:                v = int(235 * (1 - (y - text_bottom) / (fade_to - text_bottom)))
            g.putpixel((0, y), v)
        im.paste(Image.new("RGB", (W, H), BG), (0, 0), g.resize((W, H)))
        # 맨 아래도 옅게 덮는다 — 그림이 어두우면 '짜오짜오 · 날짜' 가 안 읽힌다
        g2 = Image.new("L", (1, H), 0)
        for y in range(H - 110, H):
            g2.putpixel((0, y), int(215 * (y - (H - 110)) / 110))
        im.paste(Image.new("RGB", (W, H), BG), (0, 0), g2.resize((W, H)))

    dr = ImageDraw.Draw(im)
    cat = d.get("cat") or "소식"
    c = CAT_COLOR.get(cat, (60, 60, 60))
    cw = tw(dr, nfc(cat), f_cat, LS_SMALL)
    dr.rounded_rectangle([PAD, 70, PAD + cw + 48, 126], 28, fill=c)
    dtext(dr, (PAD + 24, 80), nfc(cat), f_cat, (255, 255, 255), LS_SMALL)
    y = y_title
    for ln in t_lines:
        dtext(dr, (PAD, y), nfc(ln), f_t, FG, LS_TITLE); y += lh_t
    y = y_body
    for ln in b_lines:
        dtext(dr, (PAD, y), nfc(ln), f_b, (48, 52, 60), LS_BODY); y += lh_b
    dtext(dr, (PAD, H - 56), "짜오짜오 · " + d.get("ts", ""), f_s, DIM, LS_SMALL)
    return im


def card2(d):
    """둘째 장 — 낱말 여섯. 정사각이라 세로가 좁으니 **두 줄(2열 × 3행)** 로 앉힌다.

    베트남어에는 자간을 주지 않는다 — 성조 부호가 어긋난다(dtext 설명 참고)."""
    im = Image.new("RGB", (W, H), BG)
    dr = ImageDraw.Draw(im)
    f_h, f_vi, f_kr, f_ko, f_s = font(38, 1), font(46, vi=True), font(26), font(31), font(24)
    PAD, COL = 64, (W - 64 * 2 - 40) // 2          # 두 칸 사이 40px
    dtext(dr, (PAD, 74), "이 기사에서 배울 말", f_h, FG, LS_TITLE)
    dr.line([PAD, 140, W - PAD, 140], fill=(220, 220, 216), width=3)

    words = (d.get("words") or [])[:6]
    for i, w in enumerate(words):
        cx = PAD + (i % 2) * (COL + 40)
        cy = 196 + (i // 2) * 252        # 세 줄이 카드 안에 고르게 앉는 간격
        vi = nfc(w["vi"])
        # 낱말이 칸보다 길면 글꼴을 줄여서 넣는다 (잘라 내지 않는다)
        fv = f_vi
        for sz in (46, 42, 38, 34, 30):
            fv = font(sz, vi=True)
            if dr.textlength(vi, font=fv) <= COL: break
        dr.text((cx, cy), vi, font=fv, fill=FG)
        kr = w.get("kr_read") or vi_kr.word(w["vi"])
        dtext(dr, (cx, cy + fv.size + 12), "[" + kr + "]", f_kr, DIM, LS_SMALL)
        for j, ln in enumerate(wrap(dr, nfc(w["ko"]), f_ko, COL, LS_BODY)[:2]):
            dtext(dr, (cx, cy + fv.size + 60 + j * int(f_ko.size * LH_SMALL)),
                  ln, f_ko, (48, 52, 60), LS_BODY)
    dtext(dr, (PAD, H - 56), "짜오짜오 · " + d.get("ts", ""), f_s, DIM, LS_SMALL)
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
            # 갈래마다 장면을 **여럿** 두고 기사별로 고른다.
            #   2026-08-31: 장면과 씨앗을 갈래 이름 하나로만 정해서, 같은 갈래 기사 둘이
            #   **완전히 똑같은 그림**을 썼다(삼성전자 카드와 나이키 카드의 배경이 한 장이었다).
            #   씨앗도 기사(제목)에서 뽑아 같은 장면이라도 다른 그림이 나오게 한다.
            SCENES = {
              "일자리": ["an empty office desk with a chair by a window",
                       "a row of lockers in a quiet workplace hallway",
                       "a hard hat and gloves resting on a workbench"],
              "공장·산업": ["a factory building with tall chimneys at sunrise",
                        "rolls of fabric stacked in a bright warehouse",
                        "a conveyor belt with cardboard boxes in a plant",
                        "shipping containers stacked at a port at dawn"],
              "경제": ["stacked coins and a rising line chart on a plain table",
                     "a bank building facade with tall columns",
                     "a calculator and paper documents on a desk"],
              "사회": ["a quiet city street with traffic lights",
                     "a modern city bus at an empty bus stop",
                     "a pedestrian crossing on a wide avenue"],
              "정치": ["a government building with flags",
                     "an empty conference table with microphones"],
              "문화·생활": ["a bowl of pho and chopsticks on a wooden table",
                        "a street food cart under lanterns at dusk",
                        "a traditional market stall with fresh produce"],
            }
            opts = SCENES.get(d.get("cat"), ["a calm city skyline at dawn"])
            key = (d.get("title") or "") + (d.get("ts") or "")
            hv = int(hashlib.sha1(key.encode()).hexdigest(), 16)
            scene = opts[hv % len(opts)]
            pr = scene + ". Flat vector illustration, bold black outlines, flat pastel fill, plain background"
            try: bg = bg_image(pr, hv % 10 ** 8)
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
