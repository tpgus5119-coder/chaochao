#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""사전 탭 영어 검색 색인 → data/_dict_en.json (2026-09-29, 대표님: "영어로도 검색되냐?? hospital 이런식으로??").
영어는 **검색 열쇠로만** 쓴다 — 화면에는 한국어 뜻만 나온다(대표님 규칙: 화면에 영어 뜻 금지).
바탕: data/_dict_gloss.json (영어 위키낱말사전 뜻풀이, CC BY-SA) 중 앱 사전에 실리는 낱말(앱 낱말 + 참고 사전 _dict_ko)만.
열쇠 만들기(기계 규칙): 괄호 안 설명 삭제 → 소문자 → 'to/a/an/the' 머리 삭제 → ;·,·/·or 로 쪼갬 → 3낱말 이하만 → 낱말마다 최대 6개.
쓰기: python3 tools/dict_en/build.py"""
import json, pathlib, re, unicodedata
R = pathlib.Path(__file__).resolve().parent.parent.parent
nfc = lambda s: unicodedata.normalize("NFC", s)


def keys(defs):
    out = []
    for d in defs or []:
        d = re.sub(r"\([^)]*\)", " ", d)            # (cooking) 같은 표시 삭제
        d = re.sub(r"\[\[|\]\]|\{\{[^}]*\}\}", " ", d)
        for p in re.split(r"[;,/]| or ", d.lower()):
            if re.search(r"[^\x00-\x7f]", p): continue      # 베트남어 글자가 든 조각(= cám ơn, xe gắn máy)은 영어 열쇠가 아니다
            p = re.sub(r"^\s*(to|a|an|the|be|of)\s+", "", p.strip())
            p = re.sub(r"[^a-z' \-]", "", p).strip()
            if p and len(p.split()) <= 3 and p not in out: out.append(p)
    return out[:6]


def main():
    G = json.loads((R / "data/_dict_gloss.json").read_text(encoding="utf-8"))
    DK = json.loads((R / "data/_dict_ko.json").read_text(encoding="utf-8"))
    want = set(k.lower() for k in DK)
    def walk(o):
        if isinstance(o, dict):
            vi = o.get("vi")
            if isinstance(vi, str) and "ko" in o and len(vi) < 40: want.add(nfc(vi).strip().lower())
            for v in o.values(): walk(v)
        elif isinstance(o, list):
            for v in o: walk(v)
    for f in ("data/order.json", "data/days.json", "data/gybm.json", "data/senior.json"):
        walk(json.loads((R / f).read_text(encoding="utf-8")))
    out = {}
    for w in want:
        g = G.get(w) or G.get(nfc(w))
        if not g or not g.get("defs"): continue
        k = keys(g["defs"])
        if k: out[w] = k
    (R / "data/_dict_en.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":"), sort_keys=True), encoding="utf-8")
    print("사전 낱말", len(want), "· 영어 열쇠 붙은 낱말", len(out), "· 파일", (R / "data/_dict_en.json").stat().st_size // 1024, "KB")
    for w in ("bệnh viện", "nấu", "nấu ăn", "xe máy", "cảm ơn", "đẹp"): print(" ", w, "→", out.get(w))


if __name__ == "__main__":
    main()
