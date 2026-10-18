"""성조 테스트 문제 자료 만들기 → data/tonetest.json

대표님 지시(2026-09-28): 테스트 탭에 성조만 따로 연습하는 곳을 만든다.
귀로 듣고 "같은 글자, 성조만 다른" 보기 중에서 고른다.

- 묶음은 짝 사전(data/sib.json 의 t: 글자 → 성조만 다른 낱말들)에서 가져온다.
- **여·남 두 목소리 녹음이 모두 있는 낱말만** 쓴다 — 목소리를 섞어 들려주고,
  틀리면 정답과 고른 것을 이어서 들려주므로 보기 전부에 소리가 있어야 한다.
- 두 개 이상 남은 묶음만 낸다.

형식: {"f": [[[낱말, 성조이름, 뜻], ...], ...]}
셀 수 있는 일이라 AI 없이 만든다.
"""
import json
import os
import sys
import unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARK = {'̀': 'huyền', '́': 'sắc', '̉': 'hỏi', '̃': 'ngã', '̣': 'nặng'}
ORDER = ['ngang', 'huyền', 'sắc', 'hỏi', 'ngã', 'nặng']


def tone_of(s):
    for ch in unicodedata.normalize('NFD', s):
        if ch in MARK:
            return MARK[ch]
    return 'ngang'


def short(k):
    """뜻은 첫 뜻만 짧게 — 보기 옆에 붙는다"""
    k = (k or '').split(' · ')[0].split('·')[0].strip()
    return k[:24]


def hat_sig(s):
    """모음 모자 — 성조 표시를 뗀 뒤의 모음 글자들 (bận → 'â', người → 'ươi')"""
    t = ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if c not in MARK)
    t = unicodedata.normalize('NFC', t)
    # gi·qu 의 i·u 는 자음 쪽 글자다 (giàu → 'au', quá → 'a'). 'gì' 처럼 뒤에 모음이 없으면 i 가 모음
    if t.startswith('qu'):
        t = 'q' + t[2:]
    elif t.startswith('gi') and len(t) > 2 and t[2] in 'aăâeêoôơuưy':
        t = 'g' + t[2:]
    return ''.join(c for c in t if c in 'aăâeêioôơuưy')


def cons_key(s):
    """모자·성조를 다 떼고 남는 글자 — đ 는 남는다(d/đ 는 자음이 다른 말이라 한 문제에 섞지 않는다)"""
    return ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if not unicodedata.combining(c))


def hat_fams(groups, ok, need_tones):
    """모자 묶음 (대표님 지시 2026-09-29: "모음 모자도 성조처럼 헷갈림 — 성조만/모자만/둘 다").
    groups = 짝 사전 s(같은 성조, 모자만 다름) 또는 k(모자·성조 다 다름). 자음이 다르면 나눈다.
    같은 (성조, 모자) 두 표기는 하나만. 모자가 두 가지 이상이어야 하고, need_tones 면 성조도 두 가지 이상."""
    out = []
    for vs in groups.values():
        by = {}
        for v in vs:
            by.setdefault(cons_key(v), []).append(v)
        for sub in by.values():
            seen, row = set(), []
            for v in sub:
                it = ok(v)
                if not it:
                    continue
                sig = (it[1], hat_sig(v))
                if sig in seen:
                    continue
                seen.add(sig)
                row.append(it + [hat_sig(v)])
            if len({r[3] for r in row}) < 2 or (need_tones and len({r[1] for r in row}) < 2):
                continue
            row.sort(key=lambda r: (r[3], ORDER.index(r[1])))
            out.append(row)
    return out


# ── 비슷한 소리 (대표님 2026-10-18 오류 보고: "듣고 어떤 단어인지 고르는 시험 — d 도 ㅈ 소리, gi 도 ㅈ 소리. 비슷한 소리들 테스트해 줘") ──
# 성조·모음은 같고 **첫소리나 받침만** 헷갈리는 무리 안에서 다른 낱말들을 한 묶음으로.
#   첫소리 무리: d·gi·r (북부는 셋 다 'ㅈ') · s·x · ch·tr (북부는 같은 소리) · t·th · c(k)·kh · n·nh·ng·l
#   받침 무리:   n·ng·nh · t·c·ch
# 북부 표준에서 소리가 **같은** 무리(d·gi·r, s·x, ch·tr)는 귀로는 가릴 수 없다 — 그래서 이 갈래는 문제에 정답의 뜻을 함께 보여 준다(앱 쪽).
# 같은 뜻의 두 표기(뜻이 같은 낱말)는 하나만 남긴다 — 정답이 둘이 되지 않게.
INIT = ['ngh', 'ng', 'nh', 'ch', 'tr', 'th', 'kh', 'ph', 'gh', 'gi', 'qu', 'b', 'c', 'd', 'đ', 'g', 'h', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'x']
IGRP = {'d': 'z', 'gi': 'z', 'r': 'z', 's': 's', 'x': 's', 'ch': 'c', 'tr': 'c', 't': 't', 'th': 't',
        'c': 'k', 'k': 'k', 'kh': 'k', 'n': 'n', 'nh': 'n', 'ng': 'n', 'ngh': 'n', 'l': 'n'}
FGRP = {'n': 'n', 'ng': 'n', 'nh': 'n', 't': 't', 'c': 't', 'ch': 't'}
VOW = 'aăâeêioôơuưy'
# 북부에서 소리가 같은데 뜻까지 비슷하거나(정답이 둘), 사투리·외래어라 보기로 부적절한 것 — 2026-10-18 눈으로 43쌍 확인
C_DROP = {'chuyền', 'truyện', 'giai', 'tray', 'dời'}


def split_syl(v):
    """(첫소리, 모음, 받침, 성조) — 성조를 뗀 소문자로. 모음이 없으면 None"""
    t = unicodedata.normalize('NFC', ''.join(c for c in unicodedata.normalize('NFD', v.lower()) if c not in MARK))
    if ' ' in t or not t:
        return None
    ini = ''
    for i0 in INIT:
        if t.startswith(i0):
            ini = i0
            break
    rest = t[len(ini):]
    if ini == 'gi' and (not rest or rest[0] not in VOW):     # gì·gìn — i 가 모음이다
        rest = 'i' + rest
    if not rest or rest[0] not in VOW:
        return None
    j = len(rest)
    while j > 0 and rest[j - 1] not in VOW:
        j -= 1
    nuc, fin = rest[:j], rest[j:]
    if fin not in ('', 'c', 'ch', 'm', 'n', 'ng', 'nh', 'p', 't'):
        return None
    return ini, nuc, fin, tone_of(v)


def c_fams(words, ok):
    groups = {}
    for v in words:
        sp = split_syl(v)
        if not sp:
            continue
        ini, nuc, fin, tn = sp
        ig = IGRP.get(ini, ini) if ini != 'k' else 'k'
        if ini in ('ngh',):
            ig = 'n'
        fg = FGRP.get(fin, fin)
        groups.setdefault((ig, nuc.replace('y', 'i') if False else nuc, fg, tn), []).append((v, ini, fin))
    out = []
    for key, vs in groups.items():
        seen, kos, row = set(), set(), []
        for v, ini, fin in sorted(vs):
            if v in C_DROP:
                continue
            it = ok(v)
            if not it:
                continue
            ini_s = {'k': 'c', 'ngh': 'ng'}.get(ini, ini)   # c·k, ng·ngh 는 같은 소리의 다른 표기
            lab = (ini or '∅') + ('·' + fin if fin else '')
            sig = (ini_s, fin)
            if sig in seen or it[2] in kos:
                continue
            seen.add(sig)
            kos.add(it[2])
            row.append(it + [lab])
        if len({r[3] for r in row}) >= 2:
            out.append(row)
    return out


def main():
    sib = json.load(open(os.path.join(ROOT, 'data/sib.json'), encoding='utf-8'))
    ai = json.load(open(os.path.join(ROOT, 'data/audio_index.json'), encoding='utf-8'))
    dko = json.load(open(os.path.join(ROOT, 'data/_dict_ko.json'), encoding='utf-8'))
    # 소리가 표시된 성조대로 들리는 낱말만 (tools/tone_audio_check.py — 먼저 돌려야 한다, 2026-09-28)
    chk = json.load(open(os.path.join(ROOT, 'data/_tone_audio_chk.json'), encoding='utf-8'))
    drop = set(chk['bad']) | set(chk['foreign'])
    w = sib['w']
    fams = []
    words = 0
    for base, vs in sib['t'].items():
        seen, row = set(), []
        for v in vs:
            h = ai.get(v)
            if not h or v not in chk['w'] or v in drop:
                continue
            if not (os.path.exists(os.path.join(ROOT, f'audio/f/n/{h}.mp3'))
                    and os.path.exists(os.path.join(ROOT, f'audio/m/n/{h}.mp3'))):
                continue
            t = tone_of(v)
            if t in seen:          # 같은 성조 두 표기(hoà/hòa)는 하나만
                continue
            ko = short((w.get(v) or {}).get('k') or dko.get(v) or '')
            if not ko:
                continue
            seen.add(t)
            row.append([v, t, ko])
        if len(row) >= 2:
            row.sort(key=lambda r: ORDER.index(r[1]))
            fams.append(row)
            words += len(row)
    def ok(v):                     # 성조 묶음과 같은 거름: 여·남 녹음 + 소리 성조 검사 통과 + 뜻
        h = ai.get(v)
        if not h or v not in chk['w'] or v in drop:
            return None
        if not (os.path.exists(os.path.join(ROOT, f'audio/f/n/{h}.mp3'))
                and os.path.exists(os.path.join(ROOT, f'audio/m/n/{h}.mp3'))):
            return None
        ko = short((w.get(v) or {}).get('k') or dko.get(v) or '')
        return [v, tone_of(v), ko] if ko else None
    s_fams = hat_fams(sib['s'], ok, False)      # 모자만 — 같은 성조
    k_fams = hat_fams(sib['k'], ok, True)       # 둘 다 — 모자도 성조도 다른 말이 섞인 묶음
    c_fam = c_fams([v for v in ai if ' ' not in v.strip()], ok)   # 비슷한 소리 (2026-10-18)
    out = os.path.join(ROOT, 'data/tonetest.json')
    json.dump({'f': fams, 's': s_fams, 'k': k_fams, 'c': c_fam}, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    for name, fs in (('성조 묶음', fams), ('모자 묶음', s_fams), ('모자+성조 묶음', k_fams), ('비슷한 소리 묶음', c_fam)):
        size = {}
        for f in fs:
            size[len(f)] = size.get(len(f), 0) + 1
        print(name, len(fs), '낱말', sum(len(f) for f in fs), '크기별', dict(sorted(size.items())))


if __name__ == '__main__':
    sys.exit(main())
