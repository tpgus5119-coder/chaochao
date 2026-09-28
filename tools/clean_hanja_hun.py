#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""한자 훈음(data/_hanja_hun.json) 다듬기 — fetch_hanja_hun.py 가 받은 날것을 앱에 보일 꼴로 (2026-09-28 밤).
위키 틀에서 딸려 온 찌꺼기를 걷어 낸다: ']]'·'[['·'^' · 괄호 속 한자 '인간(人間)'→'인간' · 번호 목록 '1. 몽둥이, 2. 묶다'→'몽둥이' · 쉼표 목록은 첫 뜻.
위키 둘 다 훈이 없는 글자는 data/_hanja_hun_manual.json 의 표준 훈음으로 채우고, 그 파일의 '_바로잡음' 은 위키 것을 덮는다(離 가 '교룡 치'로 나오던 것 등).
fetch_hanja_hun.py 가 끝에 이것을 부른다. 따로 쓰기: python3 tools/clean_hanja_hun.py"""
import json, pathlib, re
R = pathlib.Path(__file__).resolve().parent.parent
OUT = R / 'data/_hanja_hun.json'
MAN = R / 'data/_hanja_hun_manual.json'


def clean_hun(h, eum=''):
    h = re.sub(r'\[\[|\]\]|\^', '', h)
    h = re.sub(r'\([^)]*\)', '', h)                   # 괄호 풀이·한자 걷기
    for item in re.split(r'\s*(?:,|;|/|\d\.)\s*', h):   # 목록이면 첫 뜻 ('형 형'·'책 책'처럼 훈과 음이 같은 글자도 있다)
        item = re.sub(r'\s+', ' ', item).strip()
        if item and re.fullmatch(r'[가-힣 ]+', item):
            return item
    return ''


def main():
    got = json.loads(OUT.read_text(encoding='utf-8'))
    man = json.loads(MAN.read_text(encoding='utf-8'))
    fix = man.get('_바로잡음', {})
    stat = {'다듬음': 0, '버림': 0, '사람 표로 채움': 0, '바로잡음': 0}
    for c, pairs in got.items():
        out = []
        for hun, eum in pairs:
            h = clean_hun(hun, eum)
            if h != hun: stat['다듬음'] += 1
            if not h: stat['버림'] += 1; continue
            if [h, eum] not in out: out.append([h, eum])
        got[c] = out
    for c, v in man.items():
        if c.startswith('_'): continue
        if not got.get(c):
            got[c] = [v.rsplit(' ', 1)]; stat['사람 표로 채움'] += 1
    for c, v in fix.items():
        got[c] = [v.rsplit(' ', 1)]; stat['바로잡음'] += 1
    OUT.write_text(json.dumps(got, ensure_ascii=False), encoding='utf-8')
    print(f'훈음 {len(got)} · 있음 {sum(1 for v in got.values() if v)} ·', stat)


if __name__ == '__main__':
    main()
