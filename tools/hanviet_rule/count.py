#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""한국 한자음 ↔ 베트남 한월음 대응 세기 (대표님 2026-10-18 "한문으로 일이 nhất 같고 — 규칙화할 수 있니?").
data/_hanviet.json(낱말 → 한자) 에서 한자 수 = 음절 수인 낱말로 한자마다 베트남 음절을 맞추고, data/_hanja_hun.json 의 한국 음(훈음의 음)을 붙여
① 받침 ↔ 끝소리 ② 첫소리 ↔ 첫소리 ③ 받침 ↔ 성조 를 센다. AI 없음. 쓰기: python3 tools/hanviet_rule/count.py"""
import collections, json, pathlib, re, unicodedata as U
R = pathlib.Path(__file__).resolve().parents[2]
hv = json.loads((R / 'data/_hanviet.json').read_text(encoding='utf-8'))
hun = json.loads((R / 'data/_hanja_hun.json').read_text(encoding='utf-8'))
pair = collections.Counter()
for w, x in hv.items():
    h = (x or {}).get('han')
    if not h: continue
    syl = w.lower().split()
    h = re.sub(r'[^㐀-鿿]', '', h)
    if len(h) != len(syl): continue
    for c, s in zip(h, syl):
        if c in hun and hun[c]: pair[(c, hun[c][0][1], s)] += 1
by = {}
for (c, k, s), n in pair.items():
    if c not in by or n > by[c][2]: by[c] = (k, s, n)
CH = '가각간갈감갑강개객갱거건걸검겁게격견결겸경계고곡곤골공곶과곽관괄광괘괴굉교구국군굴궁권궐궤귀규균귤극근글금급긍기긴길김끽'
def kparts(k):
    c = ord(k) - 0xAC00
    if not 0 <= c < 11172: return None
    I = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'[c // 588]; F = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'][c % 28]
    return I, F
TONE = {'̀': 'huyền', '́': 'sắc', '̉': 'hỏi', '̃': 'ngã', '̣': 'nặng'}
def vparts(s):
    d = U.normalize('NFD', s); t = next((TONE[c] for c in d if c in TONE), 'ngang')
    b = U.normalize('NFC', ''.join(c for c in d if c not in TONE))
    m = re.match(r'^(ngh|ng|nh|ch|tr|th|kh|ph|gh|gi|qu|[bcdđghklmnprstvx]?)(.*?)(ng|nh|ch|[cmnpt])?$', b)
    return m.group(1) or '∅', m.group(3) or '∅(모음)', t
fin, ini, ton = collections.defaultdict(collections.Counter), collections.defaultdict(collections.Counter), collections.defaultdict(collections.Counter)
ex = collections.defaultdict(list)
for c, (k, s, n) in by.items():
    kp = kparts(k)
    if not kp: continue
    vi, vf, vt = vparts(s); ki, kf = kp
    fin[kf or '(없음)'][vf] += 1; ini[ki][vi] += 1; ton[kf in ('ㄱ', 'ㄹ', 'ㅂ')][vt] += 1
    if len(ex[(kf, vf)]) < 4: ex[(kf, vf)].append(f'{c}{k}={s}')
out = {'chars': len(by), 'final': {}, 'initial': {}, 'tone_checked': dict(ton[True]), 'tone_other': dict(ton[False]), 'map': {c: [k, s] for c, (k, s, n) in sorted(by.items())}}
print('맞춘 한자', len(by))
for kf, cnt in sorted(fin.items(), key=lambda x: -sum(x[1].values())):
    tot = sum(cnt.values()); top = cnt.most_common(3)
    out['final'][kf] = [[v, n, round(n / tot * 100)] for v, n in top]
    print('받침', kf, tot, ' · '.join(f'{v} {round(n / tot * 100)}% ({"、".join(ex[(kf if kf != "(없음)" else "", v)][:3])})' for v, n in top))
for ki, cnt in sorted(ini.items(), key=lambda x: -sum(x[1].values())):
    tot = sum(cnt.values()); top = cnt.most_common(4)
    out['initial'][ki] = [[v, n, round(n / tot * 100)] for v, n in top]
    print('첫소리', ki, tot, ' · '.join(f'{v} {round(n / tot * 100)}%' for v, n in top))
for k, cnt in ton.items():
    tot = sum(cnt.values()); print('받침 ㄱㄹㅂ' if k else '그 밖', tot, ' · '.join(f'{v} {round(n / tot * 100)}%' for v, n in cnt.most_common()))
(R / 'tools/hanviet_rule/표.json').write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
