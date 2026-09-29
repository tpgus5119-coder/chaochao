#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""위키낱말사전에 **표시된** 유의어·반의어를 그대로 뽑는다 (2026-09-29, 대표님: "인터넷 대형 사전에 유의어와 반의어가 표시된다면 일차적으로는 그것을 그대로 카피해서 반영").
입력: data/_dict_gloss.json(영어 위키 베트남어 절 — 6,000자에서 잘린 25쪽은 data/_rel_raw.json en 의 온전한 것으로 바꿔 읽음) · data/_rel_raw.json vi(베트남어 위키 베트남어 절).
뽑는 표시:
  영어 위키  {{syn|vi|…}} · {{ant|vi|…}} (뜻 줄 '#' 밑 '#:' — 몇 번째 뜻의 짝인지 함께) · ====Synonyms==== / ====Antonyms==== 절의 낱말
  베트남어 위키 {{-syn-}} · {{-ant-}} 절의 낱말 ({{-related-}} 관련어는 유의어가 아니라 뺀다)
짝 낱말은 **베트남어 표제어**(_vi_words·사전·앱 낱말)에 있는 것만 — 설명 글·영어·틀 조각을 거른다. 자기 자신은 뺀다.
결과 tools/rel_import/pairs.tsv : 낱말 · 짝 · s(유의)/a(반의) · 출처(en/vi) · 위키 뜻 번호(en 만) · 위키 뜻풀이(영어, 판정 참고용 — 앱 화면에는 안 씀)"""
import json, pathlib, re, sys, unicodedata

R = pathlib.Path(__file__).resolve().parent.parent
nfc = lambda s: unicodedata.normalize('NFC', s).strip()
OUT = R / 'tools/rel_import/pairs.tsv'


def clean_item(x):
    x = re.sub(r'<[^>]*>', '', x)                 # <q:Southern Vietnam> 같은 꼬리
    x = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', x)
    x = re.sub(r"'''?", '', x)
    x = x.split('#')[0]
    x = re.sub(r'\s+', ' ', x.replace('\xa0', ' '))   # 붙지 않는 빈칸(nbsp)도 빈칸으로 (hướng\xa0nội)
    return nfc(x).strip(' ,;:.·')


def tmpl_items(body):
    """{{syn|vi|A|B|q2=…}} 의 A, B"""
    out = []
    for p in body.split('|'):
        p = p.strip()
        if not p or '=' in p or p.lower().startswith('thesaurus'):
            continue
        out.append(clean_item(p))
    return out


def list_items(block):
    """절 안의 * 줄에서 낱말: {{l|vi|X}} · [[X]] · {{col..|vi|X|Y}} · 맨 글자"""
    items = []
    for ln in block.split('\n'):
        s = ln.strip()
        if not s.startswith('*') and not s.startswith('{{col'):
            continue
        got = False
        for m in re.finditer(r'\{\{(?:l|link|vi-l)\|vi\|([^}|]+)', s):
            items.append(clean_item(m.group(1))); got = True
        for m in re.finditer(r'\{\{col[0-9a-z-]*\|vi\|([^}]*)\}\}', s):
            items += tmpl_items(m.group(1)); got = True
        if not got:
            for m in re.finditer(r'\[\[([^\]]+)\]\]', s):
                items.append(clean_item(m.group(0))); got = True
        if not got:
            t = re.sub(r'^\*+\s*', '', s)
            t = re.sub(r'\{\{[^}]*\}\}', '', t)
            for part in re.split(r'[,;]', t):
                part = clean_item(part)
                if part:
                    items.append(part)
    return items


def en_pairs(word, raw):
    out = []
    sense_no, gloss = 0, ''
    for ln in raw.split('\n'):
        if re.match(r'^#(?![#:*])\s*', ln):                 # 뜻 줄 (# …), 하위 뜻(##)도 따로 세지 않고 앞 뜻에 붙인다
            sense_no += 1
            gloss = re.sub(r'\{\{[^}]*\}\}|\[\[|\]\]', '', ln.lstrip('# ')).strip()[:80]
        for kind, tag in (('s', 'syn'), ('a', 'ant')):
            for m in re.finditer(r'\{\{' + tag + r'\|vi\|([^}]*)\}\}', ln):
                for it in tmpl_items(m.group(1)):
                    out.append((it, kind, 'en', sense_no or '', gloss))
    for kind, head in (('s', 'Synonyms'), ('a', 'Antonyms')):
        for m in re.finditer(r'^=+\s*' + head + r'\s*=+\s*\n(.*?)(?=^=|\Z)', raw, re.M | re.S):
            for it in list_items(m.group(1)):
                out.append((it, kind, 'en', '', ''))
    return out


def vi_pairs(word, raw):
    out = []
    for kind, tag in (('s', '-syn-'), ('a', '-ant-')):
        for m in re.finditer(r'\{\{' + tag + r'\}\}\s*\n(.*?)(?=\{\{-[a-z-]+-\}\}|^=|\Z)', raw, re.M | re.S):
            for it in list_items(m.group(1)):
                out.append((it, kind, 'vi', '', ''))
    return out


def known_words():
    ks = set()
    W = json.loads((R / 'data/_vi_words.json').read_text(encoding='utf-8'))
    for w in (W if isinstance(W, list) else W.keys()):
        ks.add(nfc(str(w)).lower())
    for f in ('data/_dict_ko.json', 'data/_senses.json'):
        ks |= {nfc(k).lower() for k in json.loads((R / f).read_text(encoding='utf-8'))}
    ks |= {nfc(k).lower() for k in json.loads((R / 'data/sib.json').read_text(encoding='utf-8'))['w']}
    return ks


def main():
    g = json.loads((R / 'data/_dict_gloss.json').read_text(encoding='utf-8'))
    rr = json.loads((R / 'data/_rel_raw.json').read_text(encoding='utf-8'))
    known = known_words()
    rows, seen, drop = [], set(), 0
    for w, v in g.items():
        raw = rr['en'].get(w) or v.get('raw') or ''
        for it, kind, src, sn, gl in en_pairs(w, raw):
            rows.append((nfc(w), it, kind, src, sn, gl))
    for w, raw in rr['vi'].items():
        if raw:
            for it, kind, src, sn, gl in vi_pairs(w, raw):
                rows.append((nfc(w), it, kind, src, sn, gl))
    out = []
    for w, it, kind, src, sn, gl in rows:
        a, b = w.lower(), it.lower()
        if not b or a == b or b not in known or len(b) > 40 or re.search(r'[\u2e80-\u9fff\uf900-\ufaff\U00020000-\U0003ffff]', a + b):   # 한자(쯔놈) 표제어·짝은 뺀다
            drop += 1; continue
        k = (a, b, kind, src)
        if k in seen:
            continue
        seen.add(k)
        out.append((a, b, kind, src, str(sn), gl))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text('낱말\t짝\t갈래\t출처\t위키뜻번호\t위키뜻풀이\n' + ''.join('\t'.join(r) + '\n' for r in out), encoding='utf-8')
    from collections import Counter
    c = Counter((r[2], r[3]) for r in out)
    print('짝', len(out), dict(c), '거른 것', drop)


if __name__ == '__main__':
    sys.exit(main())
