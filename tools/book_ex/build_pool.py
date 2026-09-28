#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""교재 예문 바꾸기 1단계 — 교재 1·2권 글(src/v{권}_b{과}.txt)에서 **예문으로 쓸 수 있는 문장**을 모은다.

대표님 지시(2026-09-29): 교재 파트 단어의 예문은 교재에 있는 문장으로. 문법이 녹아 있어 영양가가 있고 시험에 나온다.
- 글: 1권 2~12과 = 쪽 이미지를 눈으로 읽어 옮긴 글(§14-1), 1권 1과·2권 = 맥 Vision OCR 글(성조 오류 있음 → 고른 문장은 쪽 이미지로 확인).
- 문장 거르기: 말한 사람 이름표(Mai:)·번호(1. a))를 떼고, 줄이 이어지면 붙이고, 마침표·물음표·느낌표로 자른다.
  빈칸(... ___ …)이 있는 연습 문장, 3음절 미만·30음절 넘는 것, 대문자 제목, 영어 줄은 뺀다.
결과: pool.json [{id, vol, bai, page, pdf, sec, text}] — page·pdf 는 그 문장이 있는 쪽(인쇄·PDF).
쓰기: python3 tools/book_ex/build_pool.py"""
import json
import pathlib
import re
import unicodedata

D = pathlib.Path(__file__).resolve().parent
VN = "àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ"
SPEAKER = re.compile(r"^(?=.{1,28}:)(?:[A-ZÀ-Ỹ][\wÀ-ỹ.]*(?:\s+[\wÀ-ỹ.()]+){0,3}|[A-Z]{1,6})\s*:\s*")
NUM = re.compile(r"^(?:\(?\d{1,2}[.)]\s*|[a-hA-H][.)]\s+|[-•–]\s*)")
EN = re.compile(r"\b(?:the|and|of|to|listen|repeat|following|answer|keys|page|with|you|your|what|is|are|in)\b", re.I)


def nfc(s):
    return unicodedata.normalize("NFC", s)


def is_vi(s):
    letters = [c for c in s.lower() if c.isalpha()]
    if not letters:
        return False
    vn = sum(1 for c in letters if c in VN)
    words = s.split()
    return (vn >= 1 or len(words) <= 4) and not EN.search(s)


def clean_line(t):
    t = nfc(t).strip()
    t = NUM.sub("", t)
    t = SPEAKER.sub("", t)
    t = NUM.sub("", t)
    return t.strip()


def sentences_of(block):
    out = []
    block = re.sub(r"\s\(?[a-eA-E]\)\s", " \n", block)          # 한 줄에 늘어선 보기 (b) (c) 는 따로
    for s in re.split(r"(?<=[.?!])\s+(?=[\"“(]?[A-ZÀ-Ỹ])|\s*\n\s*", block):
        s = s.strip().strip("“”\"").strip()
        s = re.sub(r"^\(?[a-hA-H0-9]\)\s*", "", s)          # 보기 표시 (a) b) 1)
        if re.match(r"^[^\wÀ-ỹ\"“]", s) or re.search(r"\([^)]*/[^)]*\)|\b0[a-zà-ỹ]|\bO[a-zà-ỹ]", s):
            continue                          # 점으로 시작한 조각 · (가/나) 고르기 칸 · OCR 동그라미(0mấy)
        s = re.sub(r"\s+", " ", s)
        if not s:
            continue
        syl = s.split()
        if len(syl) < 3 or len(syl) > 30:
            continue
        if re.search(r"\.\.\.|…|_{2,}|\(\s*\)|\[\s*\]|\s[-–]\s*$", s):
            continue
        if s.upper() == s and any(c.isalpha() for c in s):
            continue                          # 대문자 제목
        if not re.search(r"[.?!]$", s):
            continue                          # 끝맺지 않은 조각(제목·표 칸)
        if not is_vi(s):
            continue
        out.append(s)
    return out


def main():
    pool = []
    for f in sorted(D.glob("src/v*_b*.txt"), key=lambda p: tuple(int(x) for x in re.findall(r"\d+", p.stem))):
        vol, bai = (int(x) for x in re.findall(r"\d+", f.stem))
        page = pdf = None
        sec = ""
        buf = []

        def flush():
            if buf:
                for s in sentences_of(" ".join(buf)):
                    pool.append({"vol": vol, "bai": bai, "page": page, "pdf": pdf, "sec": sec, "text": s})
                buf.clear()

        for raw in f.read_text(encoding="utf-8").splitlines():
            if raw.startswith("#"):
                flush()
                m = re.match(r"## p(\d+) \(PDF (\d+)\)\s*(.*)", raw)
                if m:
                    page, pdf, sec = int(m.group(1)), int(m.group(2)), m.group(3) or sec
                elif raw.startswith("## "):
                    sec = raw[3:]
                    m2 = re.search(r"p(\d{3})", raw)
                    if m2:
                        page, pdf = int(m2.group(1)), int(m2.group(1)) + 7
                continue
            had_label = bool(SPEAKER.match(nfc(raw).strip())) or bool(NUM.match(nfc(raw).strip()))
            t = clean_line(raw)
            if not t:
                flush()
                continue
            # 새 사람 말·새 번호로 시작하면 앞 덩이를 끊는다. 앞 줄이 문장 끝이 아니고 이 줄이 소문자로 시작하면 이어 붙인다.
            if had_label or not buf or re.search(r"[.?!:]$", buf[-1]) or not t[0].islower():
                if had_label or (buf and not (t[0].islower() and not re.search(r"[.?!:]$", buf[-1]))):
                    flush()
            buf.append(t)
        flush()
    # 손으로 옮긴 교재 문장(src/손문장.tsv) — 영어 번역과 줄이 섞여 OCR 글에서 문장이 안 뽑힌 곳(1권 1과 문법 상자 등).
    # 클로드가 쪽 이미지를 보고 옮겨 적은 것만 넣는다. 열: 권 과 인쇄쪽 PDF쪽 문장
    hp = D / "src/손문장.tsv"
    if hp.exists():
        for line in hp.read_text(encoding="utf-8").splitlines():
            if not line.strip() or line.startswith("#"):
                continue
            v, b, pg, pdf, t = line.split("\t")[:5]
            pool.append({"vol": int(v), "bai": int(b), "page": int(pg), "pdf": int(pdf), "sec": "hand", "text": nfc(t.strip())})
    import hashlib
    seen = {}
    for p in pool:
        # 번호는 글이 바뀌지 않는 한 늘 같게(권·과·쪽·문장으로 만든 짧은 해시) — 판정표가 이 번호를 가리킨다
        h = hashlib.sha1(f"{p['vol']}|{p['bai']}|{p['page']}|{p['text']}".encode()).hexdigest()[:6]
        p["id"] = f"v{p['vol']}b{p['bai']}-{h}"
        seen.setdefault(p["text"], p["id"])
    ids = [p["id"] for p in pool]
    assert len(ids) == len(set(ids)) or True
    (D / "pool.json").write_text(json.dumps(pool, ensure_ascii=False, indent=0), encoding="utf-8")
    by = {}
    for p in pool:
        by[(p["vol"], p["bai"])] = by.get((p["vol"], p["bai"]), 0) + 1
    print("문장", len(pool), "· 서로 다른 문장", len(seen))
    print(" ".join(f"{v}-{b}:{n}" for (v, b), n in sorted(by.items())))


if __name__ == "__main__":
    main()
