#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""교재 예문 바꾸기 4단계 — 예문판정.tsv 를 data/gybm.json 의 **교재(main) 단어에만** 넣고, 새 문장 소리(북부 여·남)를 만든다.
다른 갈래(선배·22기)의 같은 단어 예문은 건드리지 않는다(대표님 지시 2026-09-29).
- 고른 것 = pool id → ex = {vi: 문장(비우면 pool 글), ko: 번역}, ex_src = "main_book"(교재 문장)
- new → ex_src = "claude_new"(교재에 알맞은 문장이 없어 클로드가 씀) · keep → 교재에 알맞은 문장이 없고 있던 예문이 뜻에 맞아 그대로 둠(ex_chk="kept", 출처 표시는 그대로), 번역만 바꿀 때 번역 칸
- 기본뜻 칸에 숫자가 있으면 sense_review/기본뜻.tsv 에 한 줄 더해 기본 뜻을 바꾼다(apply.py 를 이어서 돌림).
빌드(build_gybm.py)는 같은 출처의 옛 값을 먼저 쓰므로 여기서 넣은 예문이 유지된다.
쓰기: python3 tools/book_ex/apply_ex.py [--no-audio]"""
import asyncio
import hashlib
import json
import pathlib
import subprocess
import sys

D = pathlib.Path(__file__).resolve().parent
R = D.parent.parent
sys.path.insert(0, str(D.parent / "sense_review"))
from common import key  # noqa: E402

VOICES = {"f": "vi-VN-HoaiMyNeural", "m": "vi-VN-NamMinhNeural"}


def k12(t):
    return hashlib.sha1(t.encode()).hexdigest()[:12]


def rows():
    p = D / "예문판정.tsv"
    out = []
    for line in p.read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        c = line.split("\t") + [""] * 7
        out.append({"lk": c[0], "vi": c[1], "pick": c[2].strip(), "evi": c[3].strip(), "eko": c[4].strip(), "sense": c[5].strip(), "memo": c[6].strip()})
    last = {}
    for r in out:                 # 같은 단어를 다시 적으면 뒤의 것이 이긴다
        last[(r["lk"], key(r["vi"]))] = r
    return list(last.values())


async def make(t, v):
    import edge_tts
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


def main():
    pool = {p["id"]: p for p in json.loads((D / "pool.json").read_text(encoding="utf-8"))}
    gp = R / "data/gybm.json"
    g = json.loads(gp.read_text(encoding="utf-8"))
    main_src = [s for s in g["sources"] if s["key"] == "main"][0]
    n = {"main_book": 0, "claude_new": 0, "keep": 0}
    sense_rows, texts, bad = [], [], []
    for r in rows():
        li = int(r["lk"].replace("B:main", ""))
        ws = [w for w in main_src["lessons"][li]["words"] if key(w["vi"]) == key(r["vi"])]
        if not ws:
            bad.append(r["lk"] + " " + r["vi"]); continue
        w = ws[0]
        if r["pick"] == "keep":
            if r["eko"]:
                w["ex"] = {"vi": w["ex"]["vi"], "ko": r["eko"]}
            # 교재에 알맞은 문장이 없어 **있던 예문을 그대로 둠**(뜻이 맞는 것만). 출처 표시는 바꾸지 않는다 —
            # 교재 문장이 아닌데 main_book 으로 적으면 거짓이 된다. 이미 교재 문장(main_exact)이었을 때만 main_book.
            if w.get("ex_src") == "main_exact":
                w["ex_src"] = "main_book"
            w["ex_chk"] = "kept"
            n["keep"] += 1
        elif r["pick"] == "new":
            w["ex"] = {"vi": r["evi"], "ko": r["eko"]}
            w["ex_src"] = "claude_new"
            n["claude_new"] += 1
        else:
            vi = r["evi"] or pool[r["pick"]]["text"]
            w["ex"] = {"vi": vi, "ko": r["eko"]}
            w["ex_src"] = "main_book"
            w["ex_pool"] = r["pick"]
            n["main_book"] += 1
        texts.append(w["ex"]["vi"])
        if r["sense"].isdigit():
            sense_rows.append(f"{r['lk']}\t{w['vi']}\t{r['sense']}")
    gp.write_text(json.dumps(g, ensure_ascii=False, indent=1), encoding="utf-8")
    print("넣음", n, "· 못 찾은 줄", bad)
    if sense_rows:
        with open(D.parent / "sense_review/기본뜻.tsv", "a", encoding="utf-8") as f:
            f.write("# 교재 예문을 교재 문장으로 바꾸며 교재 문맥에 맞춰 기본 뜻 조정(2026-09-29)\n" + "\n".join(sense_rows) + "\n")
        subprocess.run([sys.executable, str(D.parent / "sense_review/apply.py")], check=True)
    if "--no-audio" in sys.argv:
        return
    idxp = R / "data/audio_index.json"
    idx = json.loads(idxp.read_text(encoding="utf-8"))
    need = [t for t in dict.fromkeys(texts) if idx.get(t) != k12(t) or not all((R / f"audio/{v}/n/{k12(t)}.mp3").exists() for v in VOICES)]
    print("소리 만들 문장", len(need), flush=True)

    async def run():
        fail = []
        for t in need:
            for v in VOICES:
                if not await make(t, v):
                    fail.append((v, t))
        return fail
    fail = asyncio.run(run())
    for t in need:
        if all((R / f"audio/{v}/n/{k12(t)}.mp3").exists() for v in VOICES):
            idx[t] = k12(t)
    idxp.write_text(json.dumps(idx, ensure_ascii=False, indent=1), encoding="utf-8")
    print("소리 실패", fail)


if __name__ == "__main__":
    main()
