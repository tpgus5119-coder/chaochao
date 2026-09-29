#!/usr/bin/env python3
"""참고 사전(data/_dict_ko.json) 만들기 (2026-09-28 밤~).
한 음절: tools/dict_one/one_*.ko.tsv · 여러 음절: tools/dict_multi/m*.ko.tsv (클로드가 영어 위키낱말 뜻풀이·한국어기초사전 대역·한자를 근거로 낱말마다 적은 것)
· 이름·외래어: tools/fix_senior/이름_외래어_뜻.tsv · 손으로 더한 것: tools/dict_multi/m_hand.ko.tsv(맨 뒤에 읽어 앞 것을 덮는다). '-' 는 낱말이 아니거나 근거가 모자라 뺀 것.
쓰기: python3 tools/dict_multi/merge.py"""
import glob, json, pathlib, unicodedata

R = pathlib.Path(__file__).resolve().parent.parent.parent


def main():
    d = {}
    files = sorted(glob.glob(str(R / "tools/dict_one/one_*.ko.tsv"))) + sorted(glob.glob(str(R / "tools/dict_multi/m*.ko.tsv")))
    for f in files:
        for line in open(f, encoding="utf-8"):
            p = line.rstrip("\n").split("\t")
            if len(p) < 2:
                continue
            vi, ko = unicodedata.normalize("NFC", p[0].strip()), p[1].strip()
            if ko in ("-", "=", ""):
                continue
            k = " ".join(vi.lower().split())
            if k in d and vi != vi.lower():
                continue                       # 소문자 표제어를 먼저 둔다 (Áo 오스트리아 < áo 옷)
            d[k] = ko
    for line in open(R / "tools/fix_senior/이름_외래어_뜻.tsv", encoding="utf-8"):
        p = line.rstrip("\n").split("\t")
        if len(p) == 2:
            d[unicodedata.normalize("NFC", p[0].strip().lower())] = p[1]
    (R / "data/_dict_ko.json").write_text(json.dumps(d, ensure_ascii=False, separators=(",", ":"), sort_keys=True), encoding="utf-8")
    print("참고 사전", len(d))


if __name__ == "__main__":
    main()
