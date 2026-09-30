#!/usr/bin/env python3
"""베트남어 위키낱말사전에만 있던 낱말(우리 사전에 없던 것)의 뜻풀이 시트 만들기 (2026-09-30).
재료: scratchpad/viwikt_defs.json (베트남어 뜻풀이 + 한국어기초사전 거꾸로 힌트). 600개씩 vw_NN.json.
쓰는 쪽(Sonnet 보조)은 vw_NN.ko.tsv 에 'N<탭>낱말<탭>한국어 뜻' 으로 답한다. 규칙은 PROMPT.md."""
import json, os, pathlib, sys
R = pathlib.Path(__file__).resolve().parent
SP = sys.argv[1] if len(sys.argv) > 1 else "/private/tmp/claude-501/-Users-leesehyeon-----/d0dc869d-c57f-4a4f-b3b4-4891244877a1/scratchpad"
d = json.load(open(SP + "/viwikt_defs.json"))
words = sorted(d.keys(), key=lambda w: (len(w.split()), w))
N = 600
for i in range(0, len(words), N):
    sheet = [{"n": i + j + 1, "vi": w, "pos": d[w]["pos"], "defs": d[w]["defs"], "hint": d[w]["hint"]} for j, w in enumerate(words[i:i + N])]
    json.dump(sheet, open(R / f"vw_{i // N:02d}.json", "w"), ensure_ascii=False, indent=0)
print("낱말", len(words), "시트", (len(words) + N - 1) // N)
