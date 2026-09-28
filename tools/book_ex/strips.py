#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""고른 교재 문장을 **쪽 이미지에서 그 줄만 잘라** 한 장에 모은다 — 클로드가 눈으로 글자(성조)를 대조하려고.
OCR 줄 위치(src/_ocr_v1.json · _ocr_v2.json, 맥 Vision, 왼쪽 아래 원점 0~1)로 문장이 있는 줄을 찾아 가로 띠로 자른다.
쪽 이미지는 PDF 에서 250dpi 로 뽑아 scratchpad 에 둔다(없으면 새로 뽑음).
쓰기: python3 tools/book_ex/strips.py 출력.png id1 id2 …"""
import json
import pathlib
import subprocess
import sys
import unicodedata

from PIL import Image, ImageDraw, ImageFont

D = pathlib.Path(__file__).resolve().parent
PAGES = pathlib.Path("/private/tmp/claude-501/-Users-leesehyeon-----/d0dc869d-c57f-4a4f-b3b4-4891244877a1/scratchpad/pages")
BOOKDIR = pathlib.Path.home() / "짜오짜오/원본자료/베트남어 학습자료/수업 자료/메인"


def pdf_path(vol):
    for p in BOOKDIR.iterdir():
        if unicodedata.normalize("NFC", p.name).endswith(f"việt {vol}.pdf"):
            return p


def page_img(vol, pdf):
    PAGES.mkdir(parents=True, exist_ok=True)
    f = PAGES / f"v{vol}-{pdf:03d}.png"
    if not f.exists():
        subprocess.run(["pdftoppm", "-r", "250", "-f", str(pdf), "-l", str(pdf), "-png", "-singlefile",
                        str(pdf_path(vol)), str(f.with_suffix(""))], check=True)
    return Image.open(f)


def bare(t):
    t = unicodedata.normalize("NFD", t.lower().replace("đ", "d"))
    return "".join(c for c in t if unicodedata.category(c) != "Mn" and (c.isalnum() or c == " "))


OCR = {}


def ocr_lines(vol, pdf):
    if vol not in OCR:
        OCR[vol] = json.loads((D / f"src/_ocr_v{vol}.json").read_text(encoding="utf-8"))
    d = OCR[vol]
    k = f"p-{pdf:03d}.jpg" if vol == 1 else f"q-{pdf:03d}.jpg"
    page = d.get(k)
    if page is None:
        return []
    lines = page if isinstance(page, list) else page.get("lines", [])
    out = []
    for l in lines:
        t = l.get("t") or l.get("text") or ""
        out.append((t, l["x"], l["y"], l.get("h", 0.013)))
    return out


def locate(vol, pdf, text):
    """문장의 음절이 가장 많이 겹치는 줄들(연속)을 찾아 (위, 아래) 비율을 돌려준다(위쪽 원점)."""
    target = bare(text).split()
    best = _locate(vol, (pdf, pdf - 1, pdf + 1), pdf, target)
    if not best:
        # 2권 듣기 대본 문장은 pool 쪽 번호가 그 과 쪽이라(대본 쪽이 따로 없어서) 근처에 없다 → 그 권 전체에서 찾는다
        OCR.get(vol) or ocr_lines(vol, pdf)
        pages = sorted(int(k[2:5]) for k in OCR[vol])
        best = _locate(vol, pages, pdf, target, strict=True)   # 멀리서 찾을 땐 문장 대부분이 겹쳐야
    return best


def _locate(vol, pages, pdf, target, strict=False):
    best = None
    for pg in pages:
        lines = ocr_lines(vol, pg)
        for i, (t, x, y, h) in enumerate(lines):
            tw = set(bare(t).split())
            if not tw:
                continue
            hit = len(tw & set(target)) / max(1, len(tw))
            cov = len(tw & set(target)) / max(1, len(set(target)))
            if (not strict and ((hit >= 0.6 and cov >= 0.25) or cov >= 0.8)) or (strict and cov >= 0.8):
                # 같은 문장이 다음 줄로 이어지면 그 줄도(y 가 조금 아래)
                ys = [(y, h)]
                for t2, x2, y2, h2 in lines:
                    if 0 < y - y2 < 0.035 and set(bare(t2).split()) & set(target) and len(set(bare(t2).split()) & set(target)) / max(1, len(bare(t2).split())) >= 0.6:
                        ys.append((y2, h2))
                score = cov + (0.5 if pg == pdf else 0) + 0.3 * hit
                if not best or score > best[0]:
                    top = 1 - max(a + b for a, b in ys) - 0.006
                    bot = 1 - min(a for a, _ in ys) + 0.008
                    best = (score, pg, top, bot)
    return best


def main():
    out, ids = sys.argv[1], sys.argv[2:]
    pool = {p["id"]: p for p in json.loads((D / "pool.json").read_text(encoding="utf-8"))}
    try:
        font = ImageFont.truetype("/System/Library/Fonts/AppleSDGothicNeo.ttc", 26)
    except Exception:
        font = ImageFont.load_default()
    rows, miss = [], []
    for i in ids:
        p = pool[i]
        loc = locate(p["vol"], p["pdf"], p["text"])
        if not loc:
            miss.append(i)
            continue
        _, pg, top, bot = loc
        im = page_img(p["vol"], pg)
        W, H = im.size
        crop = im.crop((int(W * 0.06), max(0, int(H * top)), int(W * 0.97), min(H, int(H * bot))))
        lab = Image.new("RGB", (crop.width, 34), "white")
        ImageDraw.Draw(lab).text((6, 2), f"{i} (PDF {pg})", fill=(200, 0, 0), font=font)
        rows.append(lab)
        rows.append(crop)
    if not rows:
        print("잘라낸 것 없음", miss)
        return
    W = max(r.width for r in rows)
    H = sum(r.height for r in rows)
    sheet = Image.new("RGB", (W, H), "white")
    y = 0
    for r in rows:
        sheet.paste(r, (0, y))
        y += r.height
    if sheet.width > 1600:
        sheet = sheet.resize((1600, int(sheet.height * 1600 / sheet.width)))
    # 너무 길면 눈으로 읽기 어려워 2,200px 씩 나눠 저장(out, out_2, out_3 …)
    parts, y0, n = [], 0, 1
    while y0 < sheet.height:
        o = out if n == 1 else out.replace(".png", f"_{n}.png")
        sheet.crop((0, y0, sheet.width, min(sheet.height, y0 + 2200))).save(o)
        parts.append(o); y0 += 2200; n += 1
    print("저장", parts, "못 찾음", miss)


if __name__ == "__main__":
    main()
