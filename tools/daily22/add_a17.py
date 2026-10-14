# -*- coding: utf-8 -*-
"""22기 A반 17회(시험일 10/14) — a반/a17.pdf 는 a16.pdf 와 바이트까지 같은 파일(md5 adb01dcb…). 대표님 "a17, b18 추가해줘"(2026-10-14) 에 따라 a16 과 같은 낱말·문장으로 넣는다.
daily22/build.py 가 반마다 회차를 순서로 세므로(A반 열일곱째 = a17) a18 을 넣으려면 a17 자리가 있어야 한다. a18(adda18.py) 보다 앞 번호로 끼운다. 쓰기: python3 tools/daily22/add_a17.py"""
import json, pathlib
R = pathlib.Path(__file__).resolve().parent.parent.parent
C = json.loads((R / 'data/cohort22.json').read_text(encoding='utf-8'))
L16, L17, L18 = 'A반 10/13 단어 시험', 'A반 10/14 단어 시험', 'A반 10/15 단어 시험'
if not any(d['label'] == L17 for d in C['days']):
    a16 = next(d for d in C['days'] if d['label'] == L16); a18 = next((d for d in C['days'] if d['label'] == L18), None)
    no = a18['no'] if a18 else max(d['no'] for d in C['days']) + 1
    if a18: a18['no'] += 1
    C['days'].append({'no': no, 'label': L17, 'words': json.loads(json.dumps(a16['words']))})
    C['days'].sort(key=lambda d: d['no'])
    (R / 'data/cohort22.json').write_text(json.dumps(C, ensure_ascii=False, indent=1), encoding='utf-8'); print('a17 낱말', len(a16['words']), '(a16 과 같음) · 번호', no)
tsv = R / 'tools/daily22/문장.tsv'; lines = tsv.read_text(encoding='utf-8').splitlines()
if not any(l.startswith('a17\t') for l in lines):
    rows = [l for l in lines if l.startswith('a16\t')]; assert len(rows) == 10
    out = [l for l in lines if not l.startswith('a18\t')] + ['a17' + l[3:] for l in rows] + [l for l in lines if l.startswith('a18\t')]   # a17 을 a18 앞에
    tsv.write_text('\n'.join(out) + '\n', encoding='utf-8'); print('문장 a17 10 (a16 과 같음)')
