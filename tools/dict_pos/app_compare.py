#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""앱 낱말 품사 전체 점검 — 우리 사전 품사(영어판 위키 + 판정) ↔ 베트남어판 위키 품사 제목을 맞댄다 (2026-10-01).
베트남어판 품사 표시: {{-noun-}} {{-verb-}} {{-adj-}} … 또는 '=== Danh từ ===' 같은 제목. {{-dfn-}}(품사 없는 뜻풀이)는 근거로 안 친다.
분류: 같음(베트남어판 품사가 모두 우리에게 있음) · 우리가 더 많음(영어판이 더 자세함 — 그대로) · **어긋남**(베트남어판에만 있는 품사가 있음) · **전혀 다름**(겹치는 품사 없음) · 베트남어판 근거 없음.
결과 tools/dict_pos/app_compare.tsv (어긋남·전혀 다름만 — 클로드·보조가 뜻풀이로 판정). 쓰기: python3 tools/dict_pos/app_compare.py"""
import json, pathlib, re, collections, sys
R = pathlib.Path(__file__).resolve().parent.parent.parent
SP = pathlib.Path('/private/tmp/claude-501/-Users-leesehyeon-----/d0dc869d-c57f-4a4f-b3b4-4891244877a1/scratchpad')
sys.path.insert(0, str(R / 'tools/dict_pos'))
from fetch_vi import app_words  # noqa: E402
TPL = {'noun': '명', 'verb': '동', 'adj': '형', 'adv': '부', 'pronoun': '대',   # {{-pron-}} 은 발음 절이다(대명사 아님)
       'prep': '전', 'conj': '접', 'intj': '감', 'interj': '감', 'num': '수', 'numeral': '수',
       'class': '분류', 'classifier': '분류', 'part': '조', 'particle': '조', 'phrase': '구', 'idiom': '구', 'proverb': '속담', 'proper noun': '고유', 'name': '고유'}
HEAD = {'danh từ': '명', 'động từ': '동', 'tính từ': '형', 'phó từ': '부', 'trạng từ': '부', 'đại từ': '대', 'giới từ': '전', 'liên từ': '접', 'thán từ': '감',
        'số từ': '수', 'loại từ': '분류', 'trợ từ': '조', 'cụm từ': '구', 'thành ngữ': '구', 'tục ngữ': '속담', 'danh từ riêng': '고유'}


def vi_pos(raw):
    out = set()
    for m in re.finditer(r'\{\{-([a-z ]+)-\}\}', raw):
        t = TPL.get(m.group(1).strip())
        if t: out.add(t)
    for m in re.finditer(r'^=+\s*([^=]+?)\s*=+\s*$', raw, re.M):
        t = HEAD.get(m.group(1).strip().lower())
        if t: out.add(t)
    return out


def main():
    F = json.loads((R / 'data/_dict_full.json').read_text(encoding='utf-8'))
    V = json.loads((SP / 'vi_pos_raw.json').read_text(encoding='utf-8'))
    st, rows = collections.Counter(), []
    for w in app_words():
        if w not in F: continue
        ours = {p for p in F[w]['p'] if p}
        vp = vi_pos(V.get(w, ''))
        if not vp: st['베트남어판 근거 없음'] += 1; continue
        if vp <= ours: st['같음' if vp == ours else '우리가 더 많음'] += 1; continue
        kind = '전혀 다름' if not (vp & ours) else '어긋남'
        st[kind] += 1
        rows.append((w, kind, ' '.join(sorted(ours)), ' '.join(sorted(vp)), ' · '.join(f'[{p}] {s}' for p, s in zip(F[w]['p'], F[w]['s']))[:200]))
    with open(R / 'tools/dict_pos/app_compare.tsv', 'w', encoding='utf-8') as f:
        f.write('# 낱말\t분류\t우리 품사\t베트남어판 품사\t우리 뜻\n')
        for r in rows: f.write('\t'.join(r) + '\n')
    print(dict(st))


if __name__ == '__main__':
    main()
