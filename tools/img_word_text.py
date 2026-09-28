#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""낱말 그림 속에 **그 낱말 글자**가 박혀 있는지 찾는다 (대표님 지시 2026-09-28 밤: "단어 알파벳이 그 이미지에 들어갔다면 다시 만들어라").
그림을 보고 뜻을 떠올려야 하는데 글자가 있으면 글자를 읽고 끝난다 — 그림의 쓸모가 사라진다.
맥 내장 Vision OCR(tools/bin/ocr, 기기 안·무료)로 앱 낱말이 쓰는 그림을 모두 읽는다 → data/_img_ocr.json {그림: 읽은 글}.
이어서 돌릴 수 있다(이미 읽은 그림은 건너뜀). 판정: 성조·부호를 뗀 글자로, 낱말(2글자 이상)이 읽은 글 안에 있으면 '낱말 글자 있음'.
쓰기: python3 tools/img_word_text.py            → 읽기 + 판정 요약, data/_img_wordtext.json (다시 그릴 목록)"""
import json, pathlib, re, subprocess, sys, unicodedata as U
R = pathlib.Path(__file__).resolve().parent.parent
OCR = str(R / 'tools' / 'bin' / 'ocr')
OUT = R / 'data' / '_img_ocr.json'
HIT = R / 'data' / '_img_wordtext.json'


def bare(s):
    d = U.normalize('NFD', str(s).lower().replace('đ', 'd'))
    return re.sub(r'[^a-z0-9]+', ' ', ''.join(c for c in d if not U.combining(c))).strip()


def word_imgs():
    """앱 자료의 낱말 → 그림. 같은 그림을 여러 낱말이 쓰면 모두 모은다"""
    out = {}
    def walk(o):
        if isinstance(o, dict):
            v, im = o.get('vi'), o.get('img')
            if isinstance(v, str) and isinstance(im, str) and im.endswith('.webp'):
                out.setdefault(im, set()).add(v.strip())
            for x in o.values(): walk(x)
        elif isinstance(o, list):
            for x in o: walk(x)
    for f in ('days', 'order', 'gybm', 'cohort22', 'basicwords', 'senior'):
        p = R / f'data/{f}.json'
        if p.exists(): walk(json.loads(p.read_text(encoding='utf-8')))
    return out


def main():
    W = word_imgs()
    got = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    todo = [im for im in W if im not in got and (R / 'img' / im).exists()]
    print(f'그림 {len(W)} · 이미 읽음 {len(got)} · 읽을 것 {len(todo)}', flush=True)
    for i in range(0, len(todo), 40):
        batch = todo[i:i + 40]
        r = subprocess.run([OCR] + [str(R / 'img' / b) for b in batch], capture_output=True, text=True, timeout=900)
        cur, buf = None, {}
        for ln in r.stdout.splitlines():
            if ln.startswith('=== '):
                cur = pathlib.Path(ln[4:].strip()).name; buf[cur] = []
            elif cur and ln.strip():
                buf[cur].append(ln.strip())
        for b in batch:
            got[b] = ' | '.join(buf.get(b, []))
        OUT.write_text(json.dumps(got, ensure_ascii=False), encoding='utf-8')
        print(f'  {min(i + 40, len(todo))}/{len(todo)}', flush=True)
    hits = {}
    for im, words in W.items():
        t = bare(got.get(im, ''))
        if not t: continue
        tt = ' ' + t + ' '
        for w in words:
            b = bare(w)
            if len(b.replace(' ', '')) >= 2 and (' ' + b + ' ') in tt:
                hits.setdefault(im, []).append(w)
    HIT.write_text(json.dumps(hits, ensure_ascii=False, indent=1), encoding='utf-8')
    anytext = sum(1 for im in W if len(bare(got.get(im, '')).replace(' ', '')) >= 3)
    print(f'끝 · 그림 {len(W)} · 글자가 조금이라도 있는 것 {anytext} · 그 낱말 글자가 박힌 것 {len(hits)} → {HIT.name}', flush=True)


if __name__ == '__main__':
    main()
