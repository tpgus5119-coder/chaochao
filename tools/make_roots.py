#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""한자 뿌리·외래어 뿌리 → data/_roots.json (앱이 낱말 카드·팝업에서 읽는다).
재료는 클로드가 위키낱말사전 원문을 낱말마다 보고 판정한 표 셋뿐이다 (대표님 지시 2026-09-28 밤: "한문 뿌리 아닌데 넣지 말라, 사실대로"):
  tools/roots/한자_판정.tsv   — 넣은 것 (단어·한자·옛 한자음 여부·표준 한자음·뜻 조건·일부 음절·근거)
  tools/roots/외래어_판정.tsv — 넣은 외래어 (단어·언어 부호·원어·일부 음절·뜻 조건·근거)
  tools/roots/뺀_낱말.tsv     — 원문을 보고 일부러 뺀 것과 까닭 (여기 있는 낱말은 어느 표에 있어도 싣지 않는다)
표에 없는 낱말은 싣지 않는다 — 지어내지 않는다. 한글 음은 hanja 꾸러미(두음법칙 포함, attach_hanviet.reading 과 같음).
결과 꼴: { "học sinh": [{"h":"學生","r":"학생"}], "tuổi": [{"h":"歲","r":"세","o":1,"s":"tuế"}],
           "thư": [{"h":"書","r":"서","c":["편지"]}, ...], "cà phê": [{"l":"프랑스어","w":"café"}], "xe buýt": [{"l":"프랑스어","w":"bus","p":"buýt"}] }
쓰기: python3 tools/make_roots.py"""
import json, pathlib, sys
R = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(R / 'tools')); sys.path.insert(0, str(R / 'tools/roots'))
from attach_hanviet import reading
from build_roots import LANG_KO

LANG_KO = dict(LANG_KO, lo='라오어', kpm='코호어', cjm='짬어')
import hanja
from hanmulti import fix_multi   # 음이 여럿인 한자 — 베트남어 읽기로 가른다(身份 신분, 2026-10-01)

# 여러 음을 가진 한자는 꾸러미가 기본음만 단다 — 이 낱말의 뜻에 맞는 우리 음으로 바로잡는다 (클로드가 142개를 하나씩 봄, 2026-09-28 밤)
KO_FIX = {'giản dị': '간이', 'kế hoạch': '계획', 'thập phương': '시방', 'tiểu tiện': '소변', 'đại tiện': '대변', 'tỉnh lược': '생략',
          'chè': '차', 'trà': '차', 'nhạc': '악', 'càng': '갱', 'dễ': '이', 'đo': '탁', 'hàng': '항'}


def ko_reading(word, han):
    r = _ko_reading(word, han)
    return fix_multi(word, han, r) if r and word not in KO_FIX and len(r) == len(han) == len(word.split()) else r


def _ko_reading(word, han):
    if word in KO_FIX:
        return KO_FIX[word]
    if len(han) == 1:                       # 한 글자는 본음(力 력) — 밑의 훈음('힘 력')과 맞춘다. 두음법칙은 낱말 첫머리에만
        r = hanja.translate('一' + han, 'substitution')[-1:]
        return None if r == han else r
    ko = reading(han)
    if not ko:
        return None
    # 不 은 ㄷ·ㅈ 앞에서 '부' (不定 부정 · 不同 부동 · 不動產 부동산)
    out = list(ko)
    for i, ch in enumerate(han[:-1]):
        nxt = out[i + 1]
        if ch == '不' and '가' <= nxt <= '힣' and (ord(nxt) - 0xAC00) // 588 in (3, 12):
            out[i] = '부'
    return ''.join(out)


def rows(name):
    for line in (R / 'tools/roots' / name).read_text(encoding='utf-8').splitlines():
        if not line.strip() or line.startswith('#'):
            continue
        yield (line.split('\t') + [''] * 8)[:8]


def main():
    out, stat = {}, {'한자': 0, '옛 한자음': 0, '일부 음절': 0, '뜻 조건': 0, '외래어': 0, '음 없음(뺌)': []}
    skip = {r[0].strip().lower() for r in rows('뺀_낱말.tsv')}
    def judged():   # 클로드 판정표 + 선배 한월어 엑셀에서 검산 통과한 것(tools/roots/excel_han.py, 2026-10-01) — 같은 칸
        yield from rows('한자_판정.tsv')
        yield from rows('엑셀_한자.tsv')
    for w, han, old, sv, cond, part, why, _ in judged():
        w = w.strip().lower()
        if w in skip or not han:
            continue
        ko = ko_reading(w, han)
        if not ko:
            stat['음 없음(뺌)'].append(w + ' ' + han); continue
        a = {'h': han, 'r': ko}
        if old.strip() == '1':
            a['o'] = 1; stat['옛 한자음'] += 1
            if sv.strip(): a['s'] = sv.strip()
        if cond.strip():
            a['c'] = [c.strip() for c in cond.split(',') if c.strip()]; stat['뜻 조건'] += 1
        if part.strip():
            a['p'] = part.strip(); stat['일부 음절'] += 1
        out.setdefault(w, []).append(a); stat['한자'] += 1
    # 사전 낱말 전체 (2026-10-01, tools/roots/dict_han.py — 위키 어원 표시 + 한자음 검산). 클로드가 낱말마다 본 위 표가 이긴다
    dict_n = 0
    for w, han, ko, why, old, _, _, _ in rows('사전_한자.tsv'):
        w = w.strip().lower()
        if w in skip or w in out or not han or not ko: continue
        a = {'h': han, 'r': ko}
        if old.strip(): a['o'] = 1; a['s'] = old.strip()
        out[w] = [a]; dict_n += 1
    stat['사전 낱말'] = dict_n
    for w, lg, orig, part, cond, why, _, _ in rows('외래어_판정.tsv'):
        w = w.strip().lower()
        if w in skip or not lg.strip():
            continue
        a = {'l': LANG_KO.get(lg.strip(), lg.strip()), 'w': orig.strip()}
        if part.strip(): a['p'] = part.strip()
        if cond.strip(): a['c'] = [c.strip() for c in cond.split(',') if c.strip()]
        out.setdefault(w, []).append(a); stat['외래어'] += 1
    # 여러 낱말로 된 구(위키에 항목이 없는 'kế hoạch sản xuất' 등)는 **안에 든 두 음절 이상 낱말**이 이미 판정된 것이면 그 낱말별로 싣는다.
    # 한 음절은 같은 소리 다른 뜻이 많아(đồng 구리 銅 / 들판) 붙이지 않는다. 뜻 조건이 달린 낱말도 붙이지 않는다 (2026-09-28 밤)
    from fetch_etym import app_words
    whole = {k: v for k, v in out.items() if len(k.split()) >= 2 and len(v) == 1 and 'c' not in v[0] and 'p' not in v[0]}
    comp = 0
    for w in app_words():
        if w in out or w in skip: continue
        syl = w.split()
        if not 2 <= len(syl) <= 8: continue
        i, parts = 0, []
        while i < len(syl):
            for n in range(min(4, len(syl) - i), 1, -1):
                seg = ' '.join(syl[i:i + n])
                if seg in whole:
                    a = dict(whole[seg][0]); a['p'] = seg; parts.append(a); i += n; break
            else:
                i += 1
        if parts and not (len(parts) == 1 and parts[0]['p'] == w):   # 두 낱말이 구를 꼭 채워도(điện thoại + di động) 싣는다 — 전엔 빠졌다 (2026-10-01)
            out[w] = parts[:4]; comp += 1
    stat['구 안의 낱말로'] = comp
    (R / 'data/_roots.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'낱말 {len(out)} ·', {k: (v if not isinstance(v, list) else len(v)) for k, v in stat.items()})
    if stat['음 없음(뺌)']:
        print('  한글 음을 못 단 것:', stat['음 없음(뺌)'])


if __name__ == '__main__':
    main()
