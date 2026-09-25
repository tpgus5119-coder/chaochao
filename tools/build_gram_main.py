#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""메인 교재 1·2권 문법 전체를 앱 문법(data/grammar.json)에 붙인다 (대표님 지시 2026-09-26 "문법 넣어야지").

- 자료: tools/gram_main_data1.py(1권 54개) · gram_main_data2.py(2권 47개). 교재 문법을 앱 문법 카드 짜임으로 다시 쓴 것.
- 앱에 이미 있는 3권(기초·중급 1·중급 2)은 건드리지 않는다. '메인 교재 …' 이름의 권만 지우고 다시 붙인다 → 다시 돌려도 같은 결과.
- 한글 발음(kr 북부 · krs 남부)은 tools/vi_kr.py — AI 금지.
- 소리: 예문 문장·핵심 낱말·예문 안 낱말(눌러 듣기용)을 edge-tts 여·남으로 없는 것만 만들어 audio_index.json 에 올린다.
사용: python3 tools/build_gram_main.py [--no-audio]
"""
import asyncio, hashlib, json, pathlib, re, sys, unicodedata

R = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(R / "tools"))
import vi_kr
from gram_main_data1 import BOOK as B1
from gram_main_data2 import BOOK as B2

nfc = lambda s: unicodedata.normalize("NFC", s)
k12 = lambda t: hashlib.sha1(t.encode()).hexdigest()[:12]
VOICES = {"f": "vi-VN-HoaiMyNeural", "m": "vi-VN-NamMinhNeural"}
HANGUL = re.compile(r"^[가-힣 ]+$")
PREFIX = "메인 교재"


def kr_of(vi, south=False):
    return vi_kr.word(re.sub(r"[.,!?;:…]", " ", vi).strip(), south=south)


def all_texts():
    """소리가 있어야 하는 글: 예문 문장 · 문장 안 낱말(눌러 듣기, 소문자) · 핵심 낱말. 읽을 수 있는 글자만."""
    texts = []
    for B in (B1, B2):
        for ch in B["bai"]:
            for p in ch["g"]:
                for e in p["ex"]:
                    vi = nfc(e["vi"])
                    texts.append(vi)
                    texts += [t.lower() for t in re.sub(r"[,.!?;:…]", " ", vi).split()]
                for a, _ in p["kw"]:
                    texts.append(nfc(a).replace(".", "").replace("…", "").strip())
    ok = re.compile(r"^[^\W\d_]+([ ,.!?;:]+[^\W\d_]+)*[.,!?;:]?$")   # ·, /, +, 이중 공백이 든 핵심 표기는 뺀다(기기 목소리에 맡김)
    return list(dict.fromkeys(t for t in texts if t and ok.match(t)))


def build():
    g = json.loads((R / "data/grammar.json").read_text(encoding="utf-8"))
    keep = [b for b in g["books"] if not b["book"].startswith(PREFIX)]
    bad = []
    books = []
    for B in (B1, B2):
        bai = []
        for ch in B["bai"]:
            gs = []
            for p in ch["g"]:
                ex = []
                for e in p["ex"]:
                    vi = nfc(e["vi"])
                    kr, krs = kr_of(vi), kr_of(vi, True)
                    for lab, s in (("kr", kr), ("krs", krs)):
                        if not HANGUL.match(s):
                            bad.append((B["book"], ch["no"], vi, lab, s))
                    ex.append({"vi": vi, "ko": e["ko"], "kr": kr, "krs": krs})
                kw = [[nfc(a), b] for a, b in p["kw"]]
                gs.append({"t": p["t"], "k": p["k"], "b": p["b"], "ex": ex, "kw": kw, "tip": p["tip"]})
            bai.append({"no": ch["no"], "t": ch["t"], "g": gs})
        books.append({"book": B["book"], "bai": bai})
    g["books"] = keep + books
    (R / "data/grammar.json").write_text(json.dumps(g, ensure_ascii=False, indent=1), encoding="utf-8")
    n = sum(len(c["g"]) for b in books for c in b["bai"])
    ne = sum(len(p["ex"]) for b in books for c in b["bai"] for p in c["g"])
    print(f"메인 교재 문법 {n}개 · 예문 {ne}개 · 권 {len(books)} (기존 {len(keep)}권 그대로)")
    if bad:
        print("한글이 아닌 발음:", *bad, sep="\n  ")
    return all_texts()


def audio(texts):
    import edge_tts
    idxp = R / "data/audio_index.json"
    idx = json.loads(idxp.read_text(encoding="utf-8"))
    low = {k.lower(): v for k, v in idx.items()}
    # 이미 있는 것: 정확히 같은 글자, 또는 소문자 표제어(낱말 눌러 듣기)
    need = [t for t in texts if t not in idx and t.lower() not in low]
    print(f"소리 필요 {len(need)} / 전체 {len(texts)}")

    async def make(t, v):
        p = R / "audio" / v / "n" / f"{k12(t)}.mp3"
        if p.exists() and p.stat().st_size > 3000:
            return True
        p.parent.mkdir(parents=True, exist_ok=True)
        for a in range(4):
            try:
                await asyncio.wait_for(edge_tts.Communicate(t, VOICES[v]).save(str(p)), timeout=30)
                if p.stat().st_size > 3000:
                    return True
            except Exception:
                if p.exists():
                    p.unlink()
                await asyncio.sleep(2 + a * 2)
        return False

    async def run():
        fail = []
        for t in need:
            for v in VOICES:
                if not await make(t, v):
                    fail.append((v, t))
        return fail

    fail = asyncio.run(run())
    got = 0
    for t in need:
        if all((R / f"audio/{v}/n/{k12(t)}.mp3").exists() for v in VOICES):
            idx[t] = k12(t)
            got += 1
    idxp.write_text(json.dumps(idx, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"소리 새로 {got} · 실패 {len(fail)}", fail[:10])


if __name__ == "__main__":
    texts = build()
    if "--no-audio" not in sys.argv:
        audio(texts)
