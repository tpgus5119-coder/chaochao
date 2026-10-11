# -*- coding: utf-8 -*-
"""실제 1차 시험지(data/exam1.json)의 듣기 4(빈칸)·쓰기 2(맞으면 Đúng, 틀리면 고쳐 쓰기)를 보기 고르기 → 직접 쳐서 쓰기로 (대표님 2026-10-11 "직접 쳐서 쓰도록해라").
정답 꼴은 common.accs (숫자는 글자로도 · 같은 말 다른 꼴). 한 번만 돌리면 된다(이미 바뀐 문항은 건너뜀). 쓰기: python3 tools/mock2/typed_exam1.py"""
import json, pathlib, sys
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from common import accs, OKTXT
from form1 import C1ALT, C2ALT
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
    from w3_accept import accept
    for x in J['q']:
        if x['k'] == 'free': x['acc'] = accept('exam1', x.get('model', []))   # 쓰기 3 앱 채점용 맞는 문장 (2026-10-11)
    for x in J['q']:                                   # 다른 바른 답 (2026-10-11 "여러 문장이 정답이 될 수 있다") — 조각의 다른 차례 · 다른 고침
        if x['k'] == 'puzzle' and x['vi'] in C1ALT: x['alts'] = C1ALT[x['vi']]
        if x['k'] == 'type' and x.get('dung') and x.get('fix') in C2ALT and x['acc'][0] != 'Đúng':
            x['acc'] = list(dict.fromkeys(x['acc'] + [z for alt in C2ALT[x['fix']] for z in accs(alt)]))
    p.write_text(json.dumps(J, ensure_ascii=False, indent=1), encoding='utf-8')
    print('직접 쓰기로 바꾼 문항', n)
if __name__ == '__main__':
    main()
