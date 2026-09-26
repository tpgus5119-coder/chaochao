#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""헷갈리는 짝의 '뜻 미확인'을 없앤다 (대표님 지시 2026-09-26: "뜻 모른다고 표시하지 말고 사전에서 찾아서 뜻만 넣어라").

입력 : data/siblings.json (tools/build_siblings.py 가 만든 것) + data/_sib_meanings.json (낱말 → 한국어 뜻, 아래 방법으로 찾은 것)
출력 : data/siblings.json 을 고쳐 쓴다 —
  · 사전에만 있던 짝(u)은 **뜻을 찾은 것만** m 에 넣고, 못 찾은 것은 뺀다 (뜻 없는 낱말을 늘어놓지 않는다)
  · 뜻이 비어 있던 m 항목은 뜻을 채운다 (못 찾으면 '예 낱말 뜻' 그대로 — 화면은 '뜻 미확인'이라 적지 않는다)
  · 한 가족 안의 순서는 성조 순(ngang huyền sắc hỏi ngã nặng), 같으면 글자 순
뜻 찾은 방법 (data/_sib_meanings.json — 다시 만들 때 참고):
  ① 영어 위키낱말의 베트남어 뜻풀이(REST/API) ② 한국어기초사전(영어 대역) 과 **영어 뜻이 겹치는 정도**로 한국어 낱말 후보를 셈(첫 뜻이 맞아야 함)
  ③ Qwen 이 영어 뜻풀이와 한국어 사전 뜻풀이가 같은 뜻인지 yes/no 로 확인 ④ 사람(클로드)이 눈으로 훑어 어긋난 것·비속어·방언·옛말만 뜻인 것을 뺐다.
  한국어기초사전 거꾸로 찾기만으로는 엉뚱한 뜻이 많다(múa→휘갈기다) — 그래서 ②~④ 를 거친 것만 넣었다.
사용: python3 tools/apply_sib_meanings.py   (이미 적용했으면 같은 결과 — u 가 없으면 건드리지 않는다)
"""
import json, pathlib, unicodedata

R = pathlib.Path(__file__).resolve().parent.parent
TONE_MARK = {0x0300: "huyền", 0x0301: "sắc", 0x0309: "hỏi", 0x0303: "ngã", 0x0323: "nặng"}
TONES = ["ngang", "huyền", "sắc", "hỏi", "ngã", "nặng"]
nfc = lambda s: unicodedata.normalize("NFC", s)


def tone_idx(s):
    for c in unicodedata.normalize("NFD", s):
        if ord(c) in TONE_MARK:
            return TONES.index(TONE_MARK[ord(c)])
    return 0


def strip_tone(s):
    return nfc("".join(c for c in unicodedata.normalize("NFD", s) if ord(c) not in TONE_MARK))


def main():
    sp = R / "data/siblings.json"
    doc = json.loads(sp.read_text(encoding="utf-8"))
    mean = json.loads((R / "data/_sib_meanings.json").read_text(encoding="utf-8"))
    added = filled = dropped = 0
    for kind in ("tone", "shape"):
        for key, fam in doc[kind].items():
            m = [list(x) for x in fam.get("m", [])]
            for x in m:
                if not x[1] and x[0] in mean:
                    x[1] = mean[x[0]]; x[2:] = []; filled += 1        # 뜻이 생기면 예 낱말은 필요 없다
            have = {x[0] for x in m}
            for u in fam.get("u", []):
                if u in mean and u not in have:
                    m.append([u, mean[u]]); added += 1
                else:
                    dropped += 1
            m.sort(key=lambda x: (tone_idx(x[0]), strip_tone(x[0])))
            fam["m"] = m
            fam.pop("u", None)
    sp.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":"), sort_keys=True), encoding="utf-8")
    print(f"뜻 채움 {filled} · 짝으로 더함 {added} · 뜻을 못 찾아 뺌 {dropped}")


if __name__ == "__main__":
    main()
