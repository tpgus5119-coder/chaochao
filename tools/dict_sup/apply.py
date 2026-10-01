#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""사전 [보충] 뜻 넣기 → data/_dict_full.json 의 표제어에 뜻을 더하고 그 자리(차례 번호)를 'b' 에 적는다 (2026-10-01, 대표님 "보충도 ㄱㄱ — 검사하고 넣어라").
재료: tools/dict_sup/sup_NN.ko.tsv 의 '보충' (Sonnet 1차) — 클로드가 179건(보충 155·틀림 16·모름 8)을 모두 다시 봐 6건을 뺐다(REJECT).
같은 품사 뜻 바로 뒤에 넣는다(품사 묶음이 갈라지지 않게). 다시 돌려도 같은 결과(전에 넣은 'b' 뜻은 먼저 걷어낸다).
merge_full.py 를 다시 돌린 뒤에는 이것도 다시 돌린다. 쓰기: python3 tools/dict_sup/apply.py"""
import json, pathlib, re, unicodedata as U
R = pathlib.Path(__file__).resolve().parent.parent.parent
nfc = lambda s: U.normalize('NFC', str(s)).strip()
REJECT = {'bạch mã': '지명 표제어(Bạch Mã 산맥)에 보통명사 뜻을 붙이는 것', 'choang': '민족 이름(좡족) 표제어', 'cờ đỏ': '지명(꺼도 현) 표제어',
          'cắc': "의성어 '딱' 근거 약함", 'hua': "'휘두르다' 근거 약함", 'qui': '홀로는 그 뜻으로 안 씀(quy 의 옛 철자는 합성어에서만)'}
RELABEL = {'anh hai': ['(북부) 둘째 형'], 'váy': ['드레스, 원피스'], 'tự nhiên': ['(cứ tự nhiên) 편하게 하세요'], 'chanh': ['레몬(넓게, 라임과 함께)'],
           'gôm': ['(남부) 헤어 스프레이'], 'kêu': ['(남부) (음식·음료를) 주문하다'],
           'kỷ luật': ['징계']}                                    # '징계, 징계하다' 한 줄에 명사·동사가 섞였었다 — 동사는 split.tsv (2026-10-01 밤)
POSK = {'명': '명', '동': '동', '형': '형', '부': '부', '대': '대', '수': '수', '조': '조', '감': '감', '구': '구', '전': '전'}


def main():
    F = json.loads((R / 'data/_dict_full.json').read_text(encoding='utf-8'))
    for e in F.values():                                  # 전에 넣은 보충 뜻 걷기
        b = set(e.pop('b', []) or [])
        if b:
            e['s'] = [s for i, s in enumerate(e['s']) if i not in b]
            e['p'] = [p for i, p in enumerate(e['p']) if i not in b]
    n = skip = 0
    for f in sorted((R / 'tools/dict_sup').glob('sup_*.json')):
        src = {str(x['n']): x for x in json.loads(f.read_text(encoding='utf-8'))}
        for l in f.with_suffix('.ko.tsv').read_text(encoding='utf-8').splitlines():
            c = (l.split('\t') + [''] * 5)[:5]
            if c[1].strip() != '보충': continue
            w = nfc(src[c[0].strip()]['w']); k = w.lower()
            if k in REJECT or k not in F: skip += 1; continue
            senses = RELABEL.get(k) or [x.strip() for x in c[2].split(' · ') if x.strip()]
            e = F[k]; p = POSK.get(c[3].strip(), '')
            have = {re.sub(r'\s', '', x) for x in e['s']}
            for s in senses:
                if re.sub(r'\s', '', s) in have: continue
                at = max([i for i, q in enumerate(e['p']) if q == p], default=len(e['s']) - 1) + 1
                e['s'].insert(at, s); e['p'].insert(at, p)
                e['b'] = sorted([i + 1 if i >= at else i for i in e.get('b', [])] + [at])
                n += 1
    # 다른 품사 뜻 떼어 붙이기 (tools/dict_sup/split.tsv, 2026-10-01 밤) — ko_fix.tsv 로 한 줄에서 걷어 낸 말 가운데 근거 있는 것
    for l in (R / 'tools/dict_sup/split.tsv').read_text(encoding='utf-8').splitlines():
        c = l.split('\t')
        if l.startswith('#') or len(c) < 3: continue
        k = nfc(c[0]).lower(); p = POSK[c[1].strip()]; s = c[2].strip()
        if k not in F: skip += 1; continue
        e = F[k]
        if re.sub(r'\s', '', s) in {re.sub(r'\s', '', x) for x in e['s']}: continue
        at = max([i for i, q in enumerate(e['p']) if q == p], default=len(e['s']) - 1) + 1
        e['s'].insert(at, s); e['p'].insert(at, p)
        e['b'] = sorted([i + 1 if i >= at else i for i in e.get('b', [])] + [at])
        n += 1
    (R / 'data/_dict_full.json').write_text(json.dumps(F, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'보충 뜻 {n} · 뺌 {skip} · 표제어 {sum(1 for e in F.values() if e.get("b"))}')


if __name__ == '__main__':
    main()
    # 품사 판정(tools/dict_pos)도 다시 얹는다 — 보충 뜻을 걷고 넣으면 차례가 밀리므로 그 뒤에 (2026-10-01)
    import runpy; runpy.run_path(str(R / 'tools/dict_pos/apply.py'), run_name='__main__')
