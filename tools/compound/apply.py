#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""붙은 말 판정(tools/compound/판정.tsv)의 '같음=바탕낱말' 을 앱 자료로 → data/compound.json (2026-09-29).
대표님: "단어 두 개를 붙여서 다른 의미가 된다면 하나로 합치면 안 됨. 그러나 동일한 의미라면 하나의 단어 안에 넣어야지."
앱: 붙은 말(nấu ăn)을 열면 바탕 낱말(nấu) 카드가 뜨고 그 안 '쓰임' 줄에 nấu ăn 이 강조돼 보인다. 사전에서 nấu ăn 을 찾아도 같은 카드.
파일 꼴: {"nấu ăn": "nấu", …} (소문자 열쇠). 바탕 낱말이 앱 낱말이 아니면 넣지 않는다(카드가 없으니).
쓰기: python3 tools/compound/apply.py"""
import json, pathlib, unicodedata
R = pathlib.Path(__file__).resolve().parent.parent.parent
nfc = lambda s: unicodedata.normalize("NFC", s)


def main():
    rows = [l.split("\t") for l in (R / "tools/compound/판정.tsv").read_text(encoding="utf-8").splitlines() if l.count("\t") >= 2 and not l.startswith("낱말")]
    same = {nfc(r[0]).strip().lower(): nfc(r[1][3:]).strip().lower() for r in rows if r[1].startswith("같음=")}
    app = set()
    def walk(o):
        if isinstance(o, dict):
            vi = o.get("vi")
            if isinstance(vi, str) and "ko" in o and len(vi) < 40: app.add(nfc(vi).strip().lower())
            for v in o.values(): walk(v)
        elif isinstance(o, list):
            for v in o: walk(v)
    for f in ("data/order.json", "data/days.json", "data/gybm.json", "data/senior.json"):
        walk(json.loads((R / f).read_text(encoding="utf-8")))
    out = {c: b for c, b in same.items() if b in app and c in app}
    skipped = {c: b for c, b in same.items() if c not in out}
    (R / "data/compound.json").write_text(json.dumps(out, ensure_ascii=False, indent=0, sort_keys=True), encoding="utf-8")
    print("같음", len(same), "→ 앱에 넣음", len(out), "· 못 넣음(바탕이나 붙은 말이 앱 낱말이 아님)", len(skipped), list(skipped.items())[:10])


if __name__ == "__main__":
    main()
