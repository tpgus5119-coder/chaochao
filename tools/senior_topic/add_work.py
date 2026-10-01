#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""선배 시험 낱말 중 '직무' 43개를 직무 회화 주제(order.json 트랙)의 과에 넣는다 (2026-10-01, 대표님 "선배낱말 따로 하지마").
· 판은 tools/senior_topic/결과.tsv 의 '직무: <트랙>' 줄. 회화(일상+직무)에 이미 있으면 안 넣는다.
· 트랙 안에서 낱말이 가장 적은 과부터 하나씩 채운다(과 하나 18낱말 넘지 않게). 과 이름·차례는 그대로 → 진도 열쇠 안 바뀜.
· 뜻·예문·그림·한자는 gybm.json(선배) 것을 그대로, 발음은 vi_kr.py(북 kr·남 krs).
쓰기: python3 tools/senior_topic/add_work.py [--dry]"""
import json, pathlib, re, sys, unicodedata as U
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / "tools")); sys.path.insert(0, str(R / "tools/senior_topic"))
from vi_kr import word as krw            # noqa: E402
from build_boost import tones as tonesf  # noqa: E402
from add_senior import name_of, SP       # noqa: E402
nfc = lambda s: U.normalize("NFC", str(s or "")).strip()
CAP = 18
FIX_VI = {"vật liệu / chất liệu": "chất liệu", "Chuẩn bị tài liệu": "chuẩn bị tài liệu", "công ty điện tử samsung": "công ty điện tử Samsung"}

def kr(t, south=False):
    return re.sub(r"\s+", " ", " ".join(krw(x, south) for x in nfc(t).split())).strip()

def main():
    dry = "--dry" in sys.argv
    O = json.loads((R / "data/order.json").read_text(encoding="utf-8"))
    D = json.loads((R / "data/days.json").read_text(encoding="utf-8"))
    conv = {nfc(w["vi"]).lower() for d in D["days"] for w in d["words"]}
    tracks = {t["track"]: t for t in O["vols"][0]["tracks"]}
    for t in tracks.values():
        for c in t["chapters"]:
            for l in c["lessons"]: conv |= {nfc(w["vi"]).lower() for w in l["words"]}
    G = json.loads((R / "data/gybm.json").read_text(encoding="utf-8"))
    gi = {}
    for s in sorted(G["sources"], key=lambda s: {"senior": 0, "main": 1, "c22": 2}.get(s["key"], 9)):
        for l in s["lessons"]:
            for w in l["words"]: gi.setdefault(nfc(w["vi"]).lower(), w)
    AIDX = json.loads((R / "data/audio_index.json").read_text(encoding="utf-8")); alow = {k.lower() for k in AIDX}
    added, skipped, need_img, need_audio = [], [], [], []
    for ln in (R / "tools/senior_topic/결과.tsv").read_text(encoding="utf-8").splitlines()[1:]:
        p = ln.split("\t")
        if len(p) < 4 or not p[2].startswith("직무: ") or p[3] == "이미 그 과에 있음": continue
        raw, ko, tr = nfc(p[0]), nfc(p[1]), p[2][4:].strip()
        vi = FIX_VI.get(raw, raw); k = vi.lower()
        if k in conv: skipped.append((vi, "회화에 이미 있음")); continue
        g = gi.get(raw.lower()) or gi.get(k) or {}
        e = {"vi": vi, "ko": ko, "kr": kr(vi), "krs": kr(vi, True), "kr_read": g.get("kr_read") or kr(vi), "tones": tonesf(vi)}
        if g.get("ex", {}).get("vi"):
            x = g["ex"]; e["ex"] = {"vi": x["vi"], "ko": x.get("ko", ""), "kr": x.get("kr") or kr(x["vi"]), "krs": x.get("krs") or kr(x["vi"], True)}
        if g.get("hanja"): e["hanja"] = g["hanja"]
        img = g.get("img") or ""
        if not img or not (R / "img" / img).exists():
            img = name_of(ko.split("(")[0].split("/")[0].split(",")[0].split("·")[0].strip())
            if not (R / "img" / img).exists(): need_img.append([img, ""])
        e["img"] = img; e["src"] = "선배"
        for t in [vi] + ([e["ex"]["vi"]] if e.get("ex") else []):
            if t not in AIDX and t.lower() not in alow: need_audio.append(t)
        ls = [l for c in tracks[tr]["chapters"] for l in c["lessons"]]
        l = min(ls, key=lambda l: len(l["words"]))           # 가장 적은 과 (같으면 앞 과)
        if len(l["words"]) >= CAP: skipped.append((vi, "자리 없음: " + tr)); continue
        l["words"].append(e); conv.add(k); added.append((vi, tr, l["t"]))
    for t in tracks.values(): t["words"] = sum(len(l["words"]) for c in t["chapters"] for l in c["lessons"])
    print(f"넣음 {len(added)} · 건너뜀 {skipped} · 그림 만들 것 {len(need_img)} · 소리 만들 글 {len(need_audio)}")
    for a in added: print("  ", a)
    if dry: return
    (R / "data/order.json").write_text(json.dumps(O, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (SP / "work_img.json").write_text(json.dumps(need_img, ensure_ascii=False), encoding="utf-8")
    (SP / "work_audio.json").write_text(json.dumps(need_audio, ensure_ascii=False), encoding="utf-8")

if __name__ == "__main__":
    main()
