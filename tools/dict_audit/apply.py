#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""사전 뜻 점검 확정 → merge_full.py 가 읽는 고침 파일 (2026-10-01 밤~).
tools/dict_audit/확정.tsv (클로드가 1차·2차 보조 판정을 한 줄씩 보고 정한 것):
  n ⇥ i ⇥ 표제어(src.json 그대로) ⇥ 결정(A=보조 고침 받아들임 · R=지금 그대로 · K=클로드가 새로 씀) ⇥ 새 한국어 ⇥ 새 품사 ⇥ 근거
→ tools/dict_audit/ko_fix.tsv (표제어 ⇥ 뜻 번호 ⇥ 새 한국어 ⇥ 근거) · pos_fix.tsv (소문자 표제어 ⇥ 뜻 번호 ⇥ 품사 ⇥ 근거)
쓰기: python3 tools/dict_audit/apply.py && python3 tools/dict_full/merge_full.py"""
import pathlib, collections
A = pathlib.Path(__file__).resolve().parent


def main():
    ko, pos, st = [], [], collections.Counter()
    for l in (A / '확정.tsv').read_text(encoding='utf-8').splitlines():
        if l.startswith('#') or not l.strip(): continue
        n, i, w, d, k, p, why = (l.split('\t') + [''] * 7)[:7]
        st[d] += 1
        if d == 'R': continue
        if k: ko.append(f'{w}\t{i}\t{k}\t{why}')
        if p: pos.append(f'{w.lower()}\t{i}\t{p}\t{why}')
    (A / 'ko_fix.tsv').write_text('# 사전 전체 뜻 점검 확정분(apply.py 가 확정.tsv 에서 만듦 — 손으로 고치지 말 것)\n' + '\n'.join(ko) + '\n', encoding='utf-8')
    (A / 'pos_fix.tsv').write_text('# 사전 전체 뜻 점검 확정분(apply.py 가 확정.tsv 에서 만듦 — 손으로 고치지 말 것)\n' + '\n'.join(pos) + '\n', encoding='utf-8')
    print(dict(st), '· 한국어 고침', len(ko), '· 품사 고침', len(pos))


if __name__ == '__main__':
    main()
