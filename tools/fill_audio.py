#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""앱이 소리 낼 수 있는 베트남어 가운데 **우리 녹음(북부 여·남)이 없는 것**을 채운다.

대표님 지시(2026-09-29): "예문·사전 단어·헷갈리는 짝 팝업 단어 — 모든 tts 가 고른 목소리(남·여)와 같아야 한다."
녹음이 없으면 앱은 폰 목소리로 대신 읽는데, 아이폰에는 베트남어 여자 목소리 하나뿐이라 남자를 골라도
여자 목소리를 낮춰 흉내 낼 뿐이었다. 그래서 녹음을 만들어 폰 목소리로 넘어가는 일을 없앤다.

모으는 곳(앱과 같은 자료): 낱말·예문(order·days·gybm·senior·weekly), 헷갈리는 짝 사전 낱말(sib.json 에 한국어 뜻 있는 것),
짝 상대 낱말, 예문 낱말 뜻(exgloss). 한글이 섞인 것·기호뿐인 것은 뺀다.
만드는 법: edge-tts vi-VN-HoaiMyNeural(여)·NamMinhNeural(남) — apply_ex.py·gen_audio.py 와 같은 목소리.
파일 이름은 글의 sha1 앞 12자리(audio/{f,m}/n/<해시>.mp3), 둘 다 생긴 것만 data/audio_index.json 에 올린다.
쓰기: python3 tools/fill_audio.py [--dry] [--limit N]"""
import asyncio
import hashlib
import json
import os
import pathlib
import re
import sys

R = pathlib.Path(__file__).resolve().parent.parent
VOICES = {"f": "vi-VN-HoaiMyNeural", "m": "vi-VN-NamMinhNeural"}
MIN = 1200          # 한 음절 낱말도 2KB 남짓 — 이보다 작으면 실패로 본다(0바이트 파일이 실제로 있었다)


def k12(t):
    return hashlib.sha1(t.encode()).hexdigest()[:12]


def ok(v, t):
    p = R / "audio" / v / "n" / f"{k12(t)}.mp3"
    return p.exists() and p.stat().st_size >= MIN


def collect():
    words, exs = set(), set()

    def walk(o):
        if isinstance(o, dict):
            if isinstance(o.get("vi"), str) and o.get("ko"):
                words.add(o["vi"].strip())
            e = o.get("ex")
            if isinstance(e, dict) and isinstance(e.get("vi"), str):
                exs.add(e["vi"].strip())
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
    for f in ("order.json", "days.json", "gybm.json", "senior.json", "weekly.json"):
        p = R / "data" / f
        if p.exists():
            walk(json.loads(p.read_text(encoding="utf-8")))
    sib = json.loads((R / "data/sib.json").read_text(encoding="utf-8"))
    sibw = {k for k, v in sib["w"].items() if v.get("k")}
    pairs = set()
    for v in sib["w"].values():
        for fld in ("s", "t", "m", "a", "o"):
            x = v.get(fld)
            if isinstance(x, list):
                pairs.update(y for y in x if isinstance(y, str))
            elif isinstance(x, dict):
                pairs.update(x.keys())
    exg = set(json.loads((R / "data/exgloss.json").read_text(encoding="utf-8")).keys())
    out = []
    for t in sorted(words | exs | sibw | pairs | exg):
        t = t.strip()
        if not t or re.search(r"[가-힣]", t) or not re.search(r"[A-Za-zÀ-ỹđĐ]", t):
            continue
        if t.startswith("-"):          # 끝소리 표기(-c·-ch·-ng) — 읽을 낱말이 아니다
            continue
        out.append(t)
    return out


def main():
    idx_p = R / "data/audio_index.json"
    idx = json.loads(idx_p.read_text(encoding="utf-8"))

    def has(t):
        k = t if t in idx else (t.lower() if t.lower() in idx else None)
        return k is not None and all(ok(v, k) for v in VOICES)
    need = [t for t in collect() if not has(t)]
    if "--limit" in sys.argv:
        need = need[: int(sys.argv[sys.argv.index("--limit") + 1])]
    print("녹음 없는 글", len(need), flush=True)
    if "--dry" in sys.argv:
        print(need[:40])
        return
    import edge_tts
    sem = asyncio.Semaphore(4)          # 한꺼번에 넷까지 — 더 몰면 거절당한다
    fail, done = [], [0]

    async def one(t, v):
        p = R / "audio" / v / "n" / f"{k12(t)}.mp3"
        if ok(v, t):
            return True
        async with sem:
            for a in range(4):
                try:
                    await asyncio.wait_for(edge_tts.Communicate(t, VOICES[v]).save(str(p)), timeout=40)
                    if p.stat().st_size >= MIN:
                        return True
                except Exception:
                    pass
                if p.exists():
                    p.unlink()
                await asyncio.sleep(2 + a * 3)
        return False

    async def run():
        for i in range(0, len(need), 40):
            chunk = need[i:i + 40]
            res = await asyncio.gather(*[one(t, v) for t in chunk for v in VOICES])
            for j, t in enumerate(chunk):
                if res[2 * j] and res[2 * j + 1]:
                    idx[t] = k12(t)
                else:
                    fail.append(t)
            done[0] += len(chunk)
            idx_p.write_text(json.dumps(idx, ensure_ascii=False, indent=1), encoding="utf-8")   # 중간에 멈춰도 만든 만큼은 남게
            print(f"{done[0]}/{len(need)} · 실패 {len(fail)}", flush=True)
    asyncio.run(run())
    print("끝 · 실패", len(fail), fail[:30])


if __name__ == "__main__":
    main()
