#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""사전 예문 합치기 → data/_dict_ex.json { 표제어(소문자): [[베트남어 예문, 한국어 뜻], …] } (2026-10-01, ② 예문).
예문은 위키낱말사전 원문 그대로(CC BY-SA), 한국어는 Sonnet 보조가 옮김(ex_NN.ko.tsv, PROMPT.md·chk.py 문제 0). 'x'(잘림·욕설·뜻 모름)는 뺀다.
쓰기: python3 tools/dict_ex/merge.py"""
import json, pathlib, glob
R = pathlib.Path(__file__).resolve().parent.parent.parent
D = R / 'tools/dict_ex'


def main():
    out, n, x, miss = {}, 0, 0, []
    for f in sorted(D.glob('ex_*.json')):
        t = f.with_suffix('.ko.tsv')
        if not t.exists(): miss.append(f.stem); continue
        src = json.loads(f.read_text(encoding='utf-8'))
        ko = {}
        for l in t.read_text(encoding='utf-8').splitlines():
            p = l.split('\t')
            if len(p) >= 3: ko[(p[0].strip(), p[1].strip())] = p[2].strip()
        for it in src:
            for e in it['x']:
                k = ko.get((str(it['n']), str(e['i'])), '')
                if not k or k == 'x': x += 1; continue
                out.setdefault(it['w'].lower(), []).append([e['vi'], k]); n += 1
    (R / 'data/_dict_ex.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'표제어 {len(out)} · 예문 {n} · 뺌 {x} · 답 없는 시트 {miss}')


if __name__ == '__main__':
    main()
