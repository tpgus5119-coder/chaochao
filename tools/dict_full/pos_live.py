#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""영어판 위키 품사 바로잡기 (2026-10-01, 대표님 "tự tin 은 동사·형용사·명사가 다 있는데 왜 앱엔 동사만?").
원인: 받아 둔 원문(9월)에서 품사 제목과 바로 밑 머리 틀이 어긋난 곳이 있었다(tự tin 둘째 덩어리: 제목 'Verb' · 틀 {{vi-adj}}) — 우리 도구는 제목만 봤다.
어긋난 148곳의 낱말을 **지금의 위키**에서 다시 받아, 뜻풀이 문장이 우리 것과 똑같은 뜻만 그 품사로 바꾼다(추측 안 함).
지금도 어긋나 있으면 머리 틀(그 틀이 위키의 품사 분류를 만든다)을 따르되, 고유명사 제목 + 보통 명사 틀(사람 이름 Công·Thanh)은 제목을 따른다.
결과 tools/dict_full/pos_fix.tsv (낱말 ⇥ 뜻 번호 ⇥ 품사 ⇥ 근거) — merge_full.py 가 읽는다. 쓰기: python3 tools/dict_full/pos_live.py"""
import json, pathlib, re, subprocess, time, urllib.parse, sys
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools'))
from gloss_all import parse  # noqa: E402
UA = 'chaochao-app/1.0 (https://tpgus5119-coder.github.io/chaochao/; tpgus5119@gmail.com)'
TPL = {'vi-adj': 'Adjective', 'vi-noun': 'Noun', 'vi-verb': 'Verb', 'vi-adv': 'Adverb', 'vi-pron': 'Pronoun', 'vi-prep': 'Preposition', 'vi-conj': 'Conjunction',
       'vi-intj': 'Interjection', 'vi-num': 'Numeral', 'vi-classifier': 'Classifier', 'vi-particle': 'Particle', 'vi-phrase': 'Phrase', 'vi-proper noun': 'Proper noun'}
HEAD = re.compile(r'^(===+)\s*([^=]+?)\s*\1\s*\n\s*\{\{(vi-[a-z ]+)[|}]', re.M)


def vi_section(t):
    m = re.search(r'^==\s*Vietnamese\s*==\s*$', t, re.M)
    if not m: return ''
    rest = t[m.end():]; n = re.search(r'^==[^=].*==\s*$', rest, re.M)
    return rest[:n.start()] if n else rest


def fix_headers(raw):
    """머리 틀과 다른 제목을 틀 쪽으로(고유명사 제목+명사 틀은 그대로)"""
    def rep(m):
        eq, h, t = m.group(1), m.group(2).strip(), m.group(3).strip()
        want = TPL.get(t)
        if not want or want == h or h not in TPL.values() or (h == 'Proper noun' and want == 'Noun'): return m.group(0)
        return m.group(0).replace(f'{eq} {m.group(2)} {eq}', f'{eq}{want}{eq}', 1).replace(f'{eq}{m.group(2)}{eq}', f'{eq}{want}{eq}', 1)
    return HEAD.sub(rep, raw)


def main():
    g = json.loads((R / 'data/_dict_gloss.json').read_text(encoding='utf-8'))
    src = json.loads((R / 'tools/dict_full/src.json').read_text(encoding='utf-8'))
    words = sorted({k for k, v in g.items() for m in HEAD.finditer((v or {}).get('raw') or '')
                    if TPL.get(m.group(3).strip()) not in (None, m.group(2).strip()) and m.group(2).strip() in TPL.values()})
    live = {}
    for i in range(0, len(words), 40):
        q = urllib.parse.urlencode({'action': 'query', 'prop': 'revisions', 'rvprop': 'content', 'rvslots': 'main', 'format': 'json', 'formatversion': '2', 'titles': '|'.join(words[i:i + 40])})
        r = subprocess.run(['curl', '-sS', '-m', '60', '-A', UA, 'https://en.wiktionary.org/w/api.php?' + q], capture_output=True, text=True)
        for p in json.loads(r.stdout).get('query', {}).get('pages', []):
            if not p.get('missing'): live[p['title']] = vi_section(p['revisions'][0]['slots']['main']['content'])
        time.sleep(1)
    rows, st = [], {'낱말': len(words), '받음': len(live), '바뀐 뜻': 0, '뜻풀이 달라 둠': 0}
    TAGS = {'Noun': '명', 'Verb': '동', 'Adjective': '형', 'Adverb': '부', 'Pronoun': '대', 'Preposition': '전', 'Conjunction': '접', 'Interjection': '감',
            'Numeral': '수', 'Classifier': '분류', 'Particle': '조', 'Phrase': '구', 'Proper noun': '고유'}
    amb = []
    for k in words:
        s0 = (src.get(k) or src.get(k.lower()) or {}).get('s') or []
        raw = live.get(k, '')
        still = any(TPL.get(m.group(3).strip()) not in (None, m.group(2).strip()) and m.group(2).strip() in TPL.values() for m in HEAD.finditer(raw))
        lv_h, lv_t = parse(raw), parse(fix_headers(raw))          # 제목대로 · 틀대로
        for i, s in enumerate(s0):
            h = [x for x in lv_h if x['t'] == s['t']]; t = [x for x in lv_t if x['t'] == s['t']]
            if not h: st['뜻풀이 달라 둠'] += 1; continue
            ph, pt = h[0]['pos'], (t[0]['pos'] if t else h[0]['pos'])
            if ph == pt:                                          # 지금 위키 제목 = 틀 → 확실
                if ph != s['pos'] and ph in TAGS:
                    rows.append((k.lower(), str(i), TAGS[ph], f"지금 위키 제목·틀 모두 {ph} (받아 둔 원문은 {s['pos']})")); st['바뀐 뜻'] += 1
            else:                                                 # 지금도 어긋남 → 클로드가 본다
                amb.append((k, i, s['pos'], ph, pt, s['t'][:80])); st.setdefault('지금도 어긋남', 0); st['지금도 어긋남'] += 1
    (R / 'tools/dict_full/pos_amb.json').write_text(json.dumps(amb, ensure_ascii=False, indent=0), encoding='utf-8')
    with open(R / 'tools/dict_full/pos_fix.tsv', 'w', encoding='utf-8') as f:
        f.write('# 영어판 위키 품사 바로잡기 (pos_live.py, 2026-10-01). 칸: 낱말 ⇥ 뜻 번호(0부터, src.json 차례) ⇥ 품사 ⇥ 근거\n')
        for r in rows: f.write('\t'.join(r) + '\n')
    print(st); print(rows[:20])


if __name__ == '__main__':
    main()
