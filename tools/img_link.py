#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""이미 구워 둔 그림을 **과정 낱말에 이어 붙인다** → order.json 에 img 를 채운다.

새로 굽기 전에 이것부터 한다 — 그림이 2,128장 있는데 과정 낱말에는 713개만 붙어 있었다.
붙이는 잣대 ① 같은 낱말(베트남어)  ② 같은 뜻(한국어 첫 조각)
쓰기: python3 tools/img_link.py
"""
import json, os, pathlib, re, unicodedata as U, collections

R = pathlib.Path(__file__).resolve().parent.parent

def key(v):
    s = U.normalize("NFC", str(v)).strip().lower()
    s = re.sub(r"\([^)]*\)", "", s)
    return re.sub(r"\s+", " ", s).strip(" .,;:!?~–—/\"'")

def kko(k):
    return re.sub(r"[\s,·]", "", U.normalize("NFC", str(k)).split("/")[0].split("(")[0]).strip()

def main():
    have = {p.name for p in (R / "img").glob("*.webp")}
    byvi, byko = {}, {}
    for f in ("days.json", "ko_days.json"):
        p = R / "data" / f
        if not p.exists(): continue
        d = json.loads(p.read_text(encoding="utf-8"))
        for day in (d if isinstance(d, list) else d.get("days", [])):
            for w in (day.get("words") or []):
                im = w.get("img")
                if not im or im not in have: continue
                byvi.setdefault(key(w.get("vi", "")), im)
                byko.setdefault(kko(w.get("ko", "")), im)
    o = json.loads((R / "data" / "order.json").read_text(encoding="utf-8"))
    stat = collections.Counter()

    def walk(v):
        for t in (v.get("tracks") or [v]):
            for c in t["chapters"]:
                for l in c["lessons"]:
                    yield from l["words"]

    for v in o["vols"]:
        for w in walk(v):
            if w.get("img") and w["img"] in have: stat["이미 있음"] += 1; continue
            im = byvi.get(key(w["vi"])) or byko.get(kko(w["ko"]))
            if im: w["img"] = im; stat["새로 이어 붙임"] += 1
            else:
                w.pop("img", None); stat["아직 그림 없음"] += 1
    for w in o.get("gramwords", []):
        im = byvi.get(key(w["vi"])) or byko.get(kko(w["ko"]))
        if im: w["img"] = im
    (R / "data" / "order.json").write_text(json.dumps(o, ensure_ascii=False, separators=(",", ":")),
                                           encoding="utf-8")
    print("그림 파일", len(have), "· 낱말별:", dict(stat))
main()
