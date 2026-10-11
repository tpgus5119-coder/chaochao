# -*- coding: utf-8 -*-
"""실제 1차 시험지(data/exam1.json)의 듣기 4(빈칸)·쓰기 2(맞으면 Đúng, 틀리면 고쳐 쓰기)를 보기 고르기 → 직접 쳐서 쓰기로 (대표님 2026-10-11 "직접 쳐서 쓰도록해라").
정답 꼴은 common.accs (숫자는 글자로도 · 같은 말 다른 꼴). 한 번만 돌리면 된다(이미 바뀐 문항은 건너뜀). 쓰기: python3 tools/mock2/typed_exam1.py"""
import json, pathlib, sys
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from common import accs, OKTXT
def main():
    p = R / 'data/exam1.json'; J = json.loads(p.read_text(encoding='utf-8')); n = 0
    for x in J['q']:
        if x['k'] != 'choice': continue
        if x['sec'].startswith('A 듣기 · 4'):
            a = x['opts'][x['ans']]
            for k in ('opts', 'ans', 'shuffle'): x.pop(k, None)
            x['k'] = 'type'; x['acc'] = accs(a); n += 1
        elif x['sec'].startswith('C 쓰기 · 2'):
            a = x['opts'][x['ans']]; ok = a == OKTXT; fx = x['prompt'] if ok else a
            for k in ('opts', 'ans', 'shuffle'): x.pop(k, None)
            x.update(k='type', acc=(['Đúng', 'Đ'] + accs(x['prompt'])) if ok else accs(fx), fix=fx, dung=True); n += 1
    p.write_text(json.dumps(J, ensure_ascii=False, indent=1), encoding='utf-8')
    print('직접 쓰기로 바꾼 문항', n)
if __name__ == '__main__':
    main()
