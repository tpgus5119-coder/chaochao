#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""남부 딱지 자료 만들기 (2026-09-29 밤). tools/south/남부.tsv(낱말 ⇥ 북부 말 ⇥ 어느 뜻일 때 ⇥ 근거) → data/_south.json {낱말(소문자): {"n": 북부 말, "s": 어느 뜻일 때, "w": 근거}}.
북부가 기준이라 **남부 말에만** 딱지가 붙는다. 낱말은 앱 낱말이어야 한다(아니면 세어서 알린다). 쓰기: python3 tools/south/build.py"""
import json, pathlib, unicodedata
R = pathlib.Path(__file__).resolve().parent.parent.parent
nfc = lambda s: unicodedata.normalize("NFC", s)

def app_words():
    ws = set()
    def grab(o):
        if isinstance(o, dict):
            if isinstance(o.get("words"), list):
                for w in o["words"]:
                    if isinstance(w, dict) and isinstance(w.get("vi"), str): ws.add(nfc(w["vi"]).strip().lower())
            for v in o.values(): grab(v)
        elif isinstance(o, list):
            for v in o: grab(v)
    grab(json.loads((R / "data/order.json").read_text(encoding="utf-8")))
    grab(json.loads((R / "data/days.json").read_text(encoding="utf-8")))
    for s in json.loads((R / "data/gybm.json").read_text(encoding="utf-8"))["sources"]:
        for l in s["lessons"]:
            for w in l["words"]: ws.add(nfc(w["vi"]).strip().lower())
    for w in json.loads((R / "data/senior.json").read_text(encoding="utf-8"))["words"]: ws.add(nfc(w[0]).strip().lower())
    return ws

def main():
    ws = app_words(); out = {}; miss = []; nd = 0
    DK = json.loads((R / "data/_dict_ko.json").read_text(encoding="utf-8"))
    for f, must_app in (("남부.tsv", True), ("참고사전_남부.tsv", False)):    # 앱 낱말(손 판정) + 참고 사전 낱말(위키 표시가 모든 뜻에 있는 것, make_dict_south.py)
        for ln in (R / "tools/south" / f).read_text(encoding="utf-8").splitlines():
            if not ln.strip() or ln.startswith("#"): continue
            p = (ln.rstrip("\n") + "\t\t\t").split("\t")
            k = nfc(p[0]).strip().lower()
            if must_app and k not in ws: miss.append(k)
            if not must_app and k not in DK and k not in ws: miss.append(k)
            if k in out: continue                       # 손 판정이 먼저
            out[k] = {"n": nfc(p[1]).strip(), "s": p[2].strip(), "w": p[3].strip()}
            if not must_app: nd += 1
    (R / "data/_south.json").write_text(json.dumps(out, ensure_ascii=False, indent=0), encoding="utf-8")
    print(f"남부 딱지 {len(out)}개(앱 낱말 {len(out) - nd} · 참고 사전 {nd}) · 목록에 없는 낱말 {len(miss)} {miss}")

if __name__ == "__main__":
    main()
