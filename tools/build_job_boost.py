#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""직무회화 낱말 보강 — data/_job_boost.json 의 낱말을 order.json 직무 8트랙 **뒤쪽 레슨**으로 붙인다(대표님 지시 2026-09-25 #8).
앞의 레슨은 안 건드린다(진도 키 J<권>.<트랙>.<챕터>.<레슨> 이 안 밀린다). 다시 돌려도 같은 결과(`boost:1` 레슨을 지우고 다시 붙임).
한글 발음(kr·krs)은 tools/vi_kr.py(북·남 규칙), 그림은 img/jb-<해시>.webp, 소리는 edge-tts 여·남.
사용: python3 tools/build_job_boost.py [--no-audio]"""
import asyncio, hashlib, json, pathlib, sys, unicodedata

R = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(R / "tools"))
import vi_kr
from build_boost import tones, k12, slug, VOICES, nfc

PER = 10


def main():
    no_audio = "--no-audio" in sys.argv
    src = json.loads((R / "data/_job_boost.json").read_text(encoding="utf-8"))["tracks"]
    op = R / "data/order.json"
    o = json.loads(op.read_text(encoding="utf-8"))
    job = [v for v in o["vols"] if v.get("kind") == "job"][0]
    have = set()

    def walk(z):
        if isinstance(z, dict):
            if isinstance(z.get("vi"), str): have.add(nfc(z["vi"]).lower())
            for v in z.values(): walk(v)
        elif isinstance(z, list):
            for v in z: walk(v)
    for t in job["tracks"]:
        for c in t["chapters"]:
            c["lessons"] = [l for l in c["lessons"] if not l.get("boost")]
    walk(job)
    days = json.loads((R / "data/days.json").read_text(encoding="utf-8"))["days"]
    walk(days)
    texts = []
    for ti, t in enumerate(job["tracks"], 1):
        ws = src.get(t["track"], [])
        new = []
        for w in ws:
            vi = nfc(w["vi"])
            if vi.lower() in have:
                print("이미 있음(뺌):", vi); continue
            have.add(vi.lower())
            img = f"jb-{slug(vi)}.webp"
            ex = {"vi": w["ex"]["vi"], "ko": w["ex"]["ko"], "kr": vi_kr.word(w["ex"]["vi"].rstrip(".!?")),
                  "krs": vi_kr.word(w["ex"]["vi"].rstrip(".!?"), south=True), "src": "claude"}
            new.append({"vi": vi, "ko": w["ko"], "kr": vi_kr.word(vi), "krs": vi_kr.word(vi, south=True),
                        "img": img if (R / "img" / img).exists() else "", "tones": tones(vi),
                        "kr_read": vi_kr.word(vi), "ex": ex})
            texts += [vi, ex["vi"]]
        ch = t["chapters"][-1]
        k0 = len(ch["lessons"])
        for i in range(0, len(new), PER):
            k = k0 + i // PER + 1
            ch["lessons"].append({"t": f"챕터{ti}-{k}", "words": new[i:i + PER], "boost": 1})
        t["words"] = sum(len(l["words"]) for c in t["chapters"] for l in c["lessons"])
        print(t["track"], "+", len(new), "→", t["words"])
    op.write_text(json.dumps(o, ensure_ascii=False, indent=1), encoding="utf-8")
    if no_audio:
        return
    import edge_tts
    idxp = R / "data/audio_index.json"
    idx = json.loads(idxp.read_text(encoding="utf-8"))

    async def make(text, v):
        p = R / "audio" / v / "n" / f"{k12(text)}.mp3"
        if p.exists() and p.stat().st_size > 3000:
            return True
        for a in range(4):
            try:
                await asyncio.wait_for(edge_tts.Communicate(text, VOICES[v]).save(str(p)), timeout=30)
                if p.stat().st_size > 3000:
                    return True
            except Exception:
                if p.exists():
                    p.unlink()
                await asyncio.sleep(2 + a * 2)
        return False

    async def run():
        bad = []
        for text in dict.fromkeys(texts):
            for v in VOICES:
                if not await make(text, v):
                    bad.append((v, text))
        return bad
    bad = asyncio.run(run())
    for text in dict.fromkeys(texts):
        if all((R / f"audio/{v}/n/{k12(text)}.mp3").exists() for v in VOICES):
            idx[text] = k12(text)
    idxp.write_text(json.dumps(idx, ensure_ascii=False, indent=1), encoding="utf-8")
    print("소리 실패", bad, "· 텍스트", len(set(texts)))


if __name__ == "__main__":
    main()
