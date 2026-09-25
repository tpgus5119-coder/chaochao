#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""일상회화 '보강' 세션 — 서브교재·줌 자료 OCR 후보에서 골라 뽑은 낱말(data/_boost_words.json)을
days.json 35일차부터 붙인다(대표님 지시 2026-09-25 #2). 이미 있는 1~34일차는 건드리지 않는다(완료 표시 보존).

- 다시 돌려도 같은 결과(이미 붙은 '보강 · ' 세션을 지우고 다시 붙인다)
- 한글 발음(kr_read·예문 kr)은 tools/vi_kr.py — AI 금지
- 그림은 img/bo-<해시>.webp (tools 밖에서 구워 옮김), 없으면 img 필드를 비운다
- 소리(북부 여·남)는 edge-tts 로 없는 것만 만들고 audio_index.json 에 올린다
사용: python3 tools/build_boost.py [--no-audio]
"""
import asyncio, hashlib, json, pathlib, sys, unicodedata

R = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(R / "tools"))
import vi_kr

nfc = lambda s: unicodedata.normalize("NFC", s)
k12 = lambda t: hashlib.sha1(t.encode()).hexdigest()[:12]
slug = lambda vi: hashlib.sha1(vi.encode()).hexdigest()[:10]
VOICES = {"f": "vi-VN-HoaiMyNeural", "m": "vi-VN-NamMinhNeural"}
TONE_MARK = {0x0300: "huyền", 0x0301: "sắc", 0x0303: "ngã", 0x0309: "hỏi", 0x0323: "nặng"}
TONE_KO = {"ngang": ("평평하게 그대로", "—"), "huyền": ("낮게 내려감", "＼"), "sắc": ("짧게 올라감", "／"),
           "hỏi": ("내렸다 올림", "∨"), "ngã": ("끊었다 올림", "∿"), "nặng": ("짧고 무겁게", "↓")}


def tone_of(syl):
    for c in unicodedata.normalize("NFD", syl):
        if ord(c) in TONE_MARK:
            return TONE_MARK[ord(c)]
    return "ngang"


def tones(vi):
    out = []
    for syl in nfc(vi).split():
        n = tone_of(syl)
        out.append({"syl": syl, "name": n, "ko": TONE_KO[n][0], "shape": TONE_KO[n][1]})
    return out


def main():
    no_audio = "--no-audio" in sys.argv
    src = json.loads((R / "data/_boost_words.json").read_text(encoding="utf-8"))
    dp = R / "data/days.json"
    d = json.loads(dp.read_text(encoding="utf-8"))
    base = [x for x in d["days"] if not str(x.get("theme", "")).startswith("보강 · ")]
    last = max(x["day"] for x in base)
    have = {nfc(w["vi"]).lower() for x in base for w in x["words"]}
    days, texts = [], []
    for i, s in enumerate(src["sessions"], 1):
        ws = []
        for w in s["words"]:
            vi = nfc(w["vi"])
            if vi.lower() in have:
                print("이미 있음(뺌):", vi); continue
            have.add(vi.lower())
            img = f"bo-{slug(vi)}.webp"
            ex = {"vi": w["ex"]["vi"], "ko": w["ex"]["ko"], "kr": vi_kr.word(w["ex"]["vi"].rstrip(".!?"))}
            ws.append({"vi": vi, "ko": w["ko"], "kr_read": vi_kr.word(vi), "tones": tones(vi),
                       "img": img if (R / "img" / img).exists() else "", "ex": ex})
            texts += [vi, ex["vi"]]
        if ws:
            days.append({"day": last + i, "theme": s["theme"], "n": last + i, "words": ws})
    d["days"] = base + days
    dp.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")
    n_img = sum(1 for x in days for w in x["words"] if w["img"])
    print(f"보강 {len(days)}세션 · 낱말 {sum(len(x['words']) for x in days)}개 · 그림 있음 {n_img}")
    if no_audio:
        return
    import edge_tts
    idxp = R / "data/audio_index.json"
    idx = json.loads(idxp.read_text(encoding="utf-8"))

    async def make(t, v):
        p = R / "audio" / v / "n" / f"{k12(t)}.mp3"
        if p.exists() and p.stat().st_size > 3000:
            return True
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
        bad = []
        for t in dict.fromkeys(texts):
            for v in VOICES:
                if not await make(t, v):
                    bad.append((v, t))
        return bad

    bad = asyncio.run(run())
    for t in dict.fromkeys(texts):
        if all((R / f"audio/{v}/n/{k12(t)}.mp3").exists() for v in VOICES):
            idx[t] = k12(t)
    idxp.write_text(json.dumps(idx, ensure_ascii=False, indent=1), encoding="utf-8")
    print("소리 실패", bad, "· 텍스트", len(set(texts)))


if __name__ == "__main__":
    main()
