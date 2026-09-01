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


def wrap_balanced(dr, text, f, width, ls=0.0):
    """줄을 **고르게** 나눈다.

    그냥 나누면 마지막 줄에 서너 글자만 남는 일이 잦다('…바랍니다' 다음 줄에 '.' 하나).
    줄 수를 그대로 둔 채 폭을 조금씩 좁혀 보고, 마지막 줄이 가장 긴 나눔을 고른다.
    글꼴을 줄이지 않고도 외톨이 줄이 사라져 **큰 글씨를 유지**할 수 있다."""
    base = wrap(dr, text, f, width, ls)
    if len(base) < 2:
        return base
    best = base
    for k in range(95, 74, -3):                     # 폭을 95% → 76% 로 좁혀 본다
        got = wrap(dr, text, f, width * k / 100, ls)
        if len(got) != len(base):                   # 줄 수가 늘면 그만
            break
        if len(got[-1].strip()) > len(best[-1].strip()):
            best = got
    return best


def wrap(dr, text, f, width, ls=0.0):
    """글자 폭을 재서 줄을 나눈다.

    **띄어쓰기에서 끊는 것이 먼저다.** 글자 단위로만 끊으면 '늘었습니 / 다.' 처럼
    낱말 한가운데가 갈라진다 (2026-09-02 실측, 카드에 그대로 찍혀 나갔다).
    한 어절이 통째로 한 줄보다 길 때만 글자 단위로 쪼갠다."""
    out, line = [], ""
    for word in str(text).split(" "):
        cand = (line + " " + word) if line else word
        if tw(dr, cand, f, ls) <= width:
            line = cand; continue
        if line:
            out.append(line); line = ""
        # 어절 하나가 한 줄보다 길면 그때만 글자로 쪼갠다
        if tw(dr, word, f, ls) <= width:
            line = word; continue
        for ch in word:
            t = line + ch
            if tw(dr, t, f, ls) > width and line:
                out.append(line); line = ch
            else:
                line = t
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


# 기사 출처 — 카드 아래에 **반드시** 적는다 (대표님 지시 2026-09-01 "출처는 아래에 표시해줘 무조건").
# 출처를 밝힌다고 남의 글을 쓸 권리가 생기는 것은 아니다. 다만 우리는 사실만 가져와
# 새로 쓰므로, 어디서 온 사실인지 밝히는 것이 정당한 인용의 요건에 가깝고 예의이기도 하다.
SRC_NAME = {
    "insidevina.com": "인사이드비나",
    "vnexpress.net": "VnExpress",
    "tuoitre.vn": "Tuổi Trẻ",
    "thanhnien.vn": "Thanh Niên",
    "vietnamnews.vn": "Vietnam News",
    "vietnamplus.vn": "VietnamPlus",
}


def source_of(d):
    """기사 주소에서 매체 이름을 뽑는다. 모르는 곳이면 주소 그대로 적는다."""
    import urllib.parse
    host = urllib.parse.urlparse(d.get("u") or "").netloc.lower()
    host = host[4:] if host.startswith("www.") else host
    return SRC_NAME.get(host, host)


def foot(dr, d, f, pad):
    """카드 아래 한 줄 — 만든 곳 · 날짜 · 출처"""
    src = source_of(d)
    # 날짜는 **기사 날짜가 아니라 카드를 펴낸 날**이다 (대표님 지시 2026-09-01
    # "날짜는 오늘 날짜로 하고"). 아침에 도는 일은 전날 기사로 오늘 카드를 만든다 —
    # 기사 사이트는 낮에 올리므로 아침에 완성돼 있는 것은 어제 하루치뿐이다.
    t = "짜오짜오 · " + (d.get("pub") or d.get("ts", "")) + ("  ·  출처 " + src if src else "")
    dtext(dr, (pad, H - 56), t, f, DIM, LS_SMALL)



def card1(d, bg, bgsave=None):
    """첫 장 — 본문이 **카드를 가득** 채운다. 그림은 뒤에서 은은히 받쳐 주는 바탕이다.

    대표님 지시 (2026-08-31): "글자는 화면 가득 채워줘야지. 8줄 내외로.
                              배경에 글이 가려지지 않도록 잘해봐. 글배경을 넣든가"
    그래서 그림 위에 **카드 전체를 덮는 밝은 막**(92%)을 씌운다. 그림은 무늬처럼만 남고
    글은 어디에 놓이든 또렷하다 — 글이 그림에 걸려 안 읽히는 일이 아예 생기지 않는다.
    줄 간격은 남는 자리를 나눠 갖도록 **늘려서** 마지막 줄이 카드 아래에 닿게 한다."""
    im = Image.new("RGB", (W, H), BG)
    f_cat, f_t, f_s = font(30, 1), font(50, 1), font(24)
    PAD = 62
    TOP_TITLE = 152
    BOTTOM = H - 96                      # 만든이 줄 위까지가 글자리

    probe = ImageDraw.Draw(im)
    # 카드에 얹을 제목 — 원문이 카드에 안 들어갈 만큼 길 때만 tools/card_title.py 가
    # 다듬어 둔 것을 쓴다. 없으면 원문 그대로다 (제목은 저작물성이 낮아 그대로 써도 된다).
    title = d.get("title_card") or d["title"]
    t_lines = wrap_balanced(probe, nfc(title), f_t, W - PAD * 2, LS_TITLE)[:3]
    lh_t = int(f_t.size * LH_TITLE)
    y_body = TOP_TITLE + len(t_lines) * lh_t + 30
    room = BOTTOM - y_body

    # 본문 글꼴을 **자리에 맞춰 키운다** — 남는 자리를 줄 간격으로만 늘리면
    # 글자는 작은데 줄만 띄엄띄엄해져 오히려 허전하다. 들어가는 한 가장 큰 글꼴을 쓴다.
    body = d.get("sum5") or [d.get("intro") or ""]
    def lay(sz):
        fb = font(sz)
        lines, orphan = [], False
        for para in body:
            got = wrap_balanced(probe, nfc(para), fb, W - PAD * 2, LS_BODY)
            # 외톨이 줄 — 마지막 조각이 서너 글자뿐이면 보기 흉하다('…바랍니다' 다음 줄에 '.' 하나)
            if len(got) > 1 and len(got[-1].strip()) <= 5: orphan = True
            # (줄, 이어지는 줄인가) — 이어지는 줄은 들여써야 새 문장으로 안 읽힌다
            lines += [(ln, i > 0) for i, ln in enumerate(got)]
        return fb, lines, orphan, len(lines) * int(sz * LH_BODY) <= room

    SIZES = (38, 36, 34, 33, 32, 31, 30, 29, 28)
    cands = [lay(sz) for sz in SIZES]
    # ① 자리에 들어가고 외톨이 줄도 없는 것 중 가장 큰 것
    pick = next((c for c in cands if c[3] and not c[2]), None)
    # ② 없으면 자리에 들어가기만 하는 것 중 가장 큰 것
    pick = pick or next((c for c in cands if c[3]), None)
    # ③ 그것도 없으면 가장 작은 글꼴로 넣고 넘치는 줄은 자른다
    if not pick:
        fb, lines, _, _ = cands[-1]
        pick = (fb, lines[:max(1, int(room / (fb.size * LH_BODY)))], False, True)
    f_b, b_lines = pick[0], pick[1]
    # 그러고도 남는 자리는 줄 사이에 고루 나눈다 (너무 벌어지지 않게 상한 1.95배)
    lh_b = int(room / max(1, len(b_lines)))
    lh_b = max(int(f_b.size * LH_BODY), min(lh_b, int(f_b.size * 2.45)))

    if bg:
        im.paste(bg.resize((W, H)), (0, 0))
        # 카드 전체를 덮는 밝은 막 — 그림은 무늬로 남고 글은 어디서나 읽힌다
        veil = Image.new("RGB", (W, H), BG)
        im.paste(veil, (0, 0), Image.new("L", (W, H), 234))
        # 아래쪽은 조금 더 걷어 그림이 살아 있게 둔다 (막이 옅어지는 만큼 글도 아래에서 끝난다)
        g = Image.new("L", (1, H), 0)
        for y in range(H):
            g.putpixel((0, y), 0 if y < BOTTOM - 40 else min(60, (y - (BOTTOM - 40))))
        im.paste(Image.new("RGB", (W, H), (255, 255, 255)), (0, 0), g.resize((W, H)))

    # 글자를 얹기 **직전** 모습을 남긴다 — 파워포인트가 이것을 깔고 글은 글상자로 얹는다
    # (PPT 는 webp 를 못 읽어서 png 로 쓴다). tools/card_ppt.py 참고
    if bgsave:
        bgsave.parent.mkdir(parents=True, exist_ok=True)
        im.save(bgsave, "PNG")

    dr = ImageDraw.Draw(im)
    cat = d.get("cat") or "소식"
    c = CAT_COLOR.get(cat, (60, 60, 60))
    cw = tw(dr, nfc(cat), f_cat, LS_SMALL)
    dr.rounded_rectangle([PAD, 58, PAD + cw + 48, 114], 28, fill=c)
    dtext(dr, (PAD + 24, 68), nfc(cat), f_cat, (255, 255, 255), LS_SMALL)
    y = TOP_TITLE
    for ln in t_lines:
        dtext(dr, (PAD, y), nfc(ln), f_t, FG, LS_TITLE); y += lh_t
    # 줄 간격 상한에 걸려 남은 자리는 위아래로 나눈다 — 아래가 텅 비는 것을 막는다
    y = y_body + max(0, (room - lh_b * len(b_lines))) // 3   # 남는 자리는 아래에 더 준다
    for ln, cont in b_lines:
        dtext(dr, (PAD + (26 if cont else 0), y), nfc(ln), f_b, (38, 42, 50), LS_BODY); y += lh_b
    foot(dr, d, f_s, PAD)
    return im


def card2(d):
    """둘째 장 — 낱말 여섯 + **그 기사의 대화 두 줄.**

    대표님 지시 (2026-09-01): "단어 6개 밑에 문장 2개 넣어봐. 대화가 되는 문장으로.
    (대화만 봐도 어떤 기사 내용이구나를 대충 알 수 있도록)"
    대화는 news_lesson.py 가 기사마다 만들어 둔 것을 그대로 쓴다.

    쏠림도 고쳤다 — 오른쪽 칸 뜻이 짧아 오른쪽이 휑했다. 좌우 여백을 키우고
    두 칸을 안쪽으로 모아 덩어리가 가운데 오게 했다."""
    im = Image.new("RGB", (W, H), BG)
    dr = ImageDraw.Draw(im)
    f_h, f_vi, f_kr, f_ko, f_s = font(34, 1), font(44, vi=True), font(25), font(29), font(24)
    f_dvi, f_dko, f_who = font(31, vi=True), font(27), font(23, 1)
    PAD, GAP = 84, 56                       # 여백을 키워 덩어리를 가운데로
    COL = (W - PAD * 2 - GAP) // 2

    # '이 기사에서 배울 말' 제목은 뺐다 (대표님 지시 2026-09-01) —
    # 낱말과 대화를 넣을 자리를 벌기 위해. 무엇인지는 보면 안다.

    words = (d.get("words") or [])[:6]
    for i, w in enumerate(words):
        cx = PAD + (i % 2) * (COL + GAP)
        cy = 80 + (i // 2) * 190     # 아래가 비지 않게 줄 사이를 벌렸다
        vi = nfc(w["vi"])
        fv = f_vi
        for sz in (44, 40, 36, 32, 28):
            fv = font(sz, vi=True)
            if dr.textlength(vi, font=fv) <= COL: break
        dr.text((cx, cy), vi, font=fv, fill=FG)
        # kr_read 를 그대로 믿지 않는다 — AI 가 만든 자료라 học 의 발음에 'học' 이
        # 그대로 들어와 카드에 [học] 으로 찍힌 적이 있다 (2026-09-01 실측).
        # 한글이 아니면 우리 변환기(vi_kr)로 다시 만든다. 같은 글자면 늘 같은 결과다.
        # **발음은 늘 우리 도구가 만든다.** AI 가 준 kr_read 는 쓰지 않는다 —
        # 한글이기만 하면 통과돼 điện→[디에트]·sản xuất→[산 수트] 가 카드에 찍혔다
        # (2026-09-02 실측). 같은 글자면 늘 같은 결과라야 검산이 된다.
        kr = vi_kr.word(w["vi"]) or (w.get("kr_read") or "")
        dtext(dr, (cx, cy + fv.size + 10), "[" + kr + "]", f_kr, DIM, LS_SMALL)
        for j2, ln in enumerate(wrap(dr, nfc(w["ko"]), f_ko, COL, LS_BODY)[:1]):
            dtext(dr, (cx, cy + fv.size + 52), ln, f_ko, (48, 52, 60), LS_BODY)

    # ── 대화 두 줄 — 이것만 봐도 무슨 기사인지 안다
    lines = ((d.get("dialog") or {}).get("lines") or [])[:2]
    if lines:
        y = 700
        dr.line([PAD, y - 26, W - PAD, y - 26], fill=(226, 226, 222), width=3)
        dtext(dr, (PAD, y), "이 기사로 나누는 말", f_h, FG, LS_TITLE)
        y += 62
        for ln in lines:
            who = (ln.get("who") or "").strip() or "A"
            cw = dr.textlength(who, font=f_who)
            dr.ellipse([PAD, y + 2, PAD + 38, y + 40], fill=(226, 228, 233))
            dr.text((PAD + 19 - cw / 2, y + 9), who, font=f_who, fill=(70, 74, 82))
            tx = PAD + 54
            vw = W - tx - PAD
            vl = wrap(dr, nfc(ln.get("vi") or ""), f_dvi, vw)[:2]
            for k, t in enumerate(vl):
                dr.text((tx, y + k * 38), t, font=f_dvi, fill=FG)
            yy = y + len(vl) * 38 + 6
            for k, t in enumerate(wrap(dr, nfc(ln.get("ko") or ""), f_dko, vw, LS_BODY)[:2]):
                dtext(dr, (tx, yy + k * 34), t, f_dko, (78, 82, 90), LS_BODY)
            y = yy + 34 * min(2, max(1, len(wrap(dr, nfc(ln.get("ko") or ""), f_dko, vw, LS_BODY)))) + 22

    foot(dr, d, f_s, PAD)
    return im


def main():
    a = argparse.ArgumentParser()
    a.add_argument("--day", default=""); a.add_argument("--limit", type=int, default=5)
    a.add_argument("--nobg", action="store_true")
    a.add_argument("--pub", default="")      # 카드에 찍을 '펴낸 날'. 안 주면 오늘
    a = a.parse_args()
    D = json.loads((R / "data" / "news_days.json").read_text(encoding="utf-8"))["days"]
    if a.day: D = [d for d in D if d.get("ts") == a.day]
    else:
        last = max((d.get("ts") or "") for d in D)
        D = [d for d in D if d.get("ts") == last]
    D = D[:a.limit]
    from datetime import datetime, timezone, timedelta
    pub = a.pub or datetime.now(timezone(timedelta(hours=9))).strftime("%Y-%m-%d")
    for d in D:
        d["pub"] = pub                        # 내보내기·파워포인트도 같은 날짜를 쓴다
    # 펴낸 날을 자료에 적어 둔다 — card_export.py 가 이 날짜로 폴더를 만든다
    _f = R / "data" / "news_days.json"
    _j = json.loads(_f.read_text(encoding="utf-8"))
    _by = {(x.get("ts"), x.get("title")): x for x in D}
    for x in _j["days"]:
        if (x.get("ts"), x.get("title")) in _by:
            x["pub"] = pub
    _f.write_text(json.dumps(_j, ensure_ascii=False, indent=1), encoding="utf-8")
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
        bgp = OUT / "bg" / f"{d.get('ts','x')}-{i}.png"
        for n, im in ((1, card1(d, bg, bgp)), (2, card2(d))):
            p = OUT / f"{base}-{n}.webp"
            im.save(p, "WEBP", quality=88, method=6)
            made.append(p.name)
        print(f"  {i}/{len(D)} {d.get('theme','')}", flush=True)
    print("만든 카드:", len(made), "→", OUT)


if __name__ == "__main__":
    main()
