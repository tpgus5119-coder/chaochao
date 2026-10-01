#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""고른 예문의 독립 2차 확인 시트 — 1차가 T·W 를 고른 낱말만 (2026-10-01). 2차는 1차 이유를 못 본다.
결과 tools/ex_source/vf_NN.json (sh_NN 과 같은 번호 n). 2차 답은 sh_NN.b.tsv: n ⇥ Y/N ⇥ 고친 번역(필요할 때만) ⇥ 까닭. 쓰기: python3 tools/ex_source/make_verify.py"""
import json, pathlib
D = pathlib.Path(__file__).resolve().parent


def main():
    tot = 0
    for f in sorted(D.glob('sh_*.json')):
        src = {str(x['n']): x for x in json.loads(f.read_text(encoding='utf-8'))}
        out = []
        for l in f.with_suffix('.ko.tsv').read_text(encoding='utf-8').splitlines():
            c = (l.split('\t') + [''] * 4)[:4]
            if c[1].strip() in ('', '0'): continue
            x = src[c[0].strip()]; ch = c[1].strip()
            s = x['T'][int(ch[1]) - 1] if ch[0] == 'T' else x['W'][int(ch[1]) - 1]
            out.append({'n': x['n'], 'w': x['w'], 'ko': x['ko'], 'vi': s['vi'], 'tr': c[2].strip(), 'from': '교재' if ch[0] == 'T' else '사전'})
        (D / f'vf_{f.stem[3:]}.json').write_text(json.dumps(out, ensure_ascii=False, indent=0), encoding='utf-8'); tot += len(out)
    print('확인할 것', tot)


if __name__ == '__main__':
    main()
