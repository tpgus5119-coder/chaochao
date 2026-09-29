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
    out = os.path.join(ROOT, 'data/tonetest.json')
    json.dump({'f': fams, 's': s_fams, 'k': k_fams}, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    for name, fs in (('성조 묶음', fams), ('모자 묶음', s_fams), ('모자+성조 묶음', k_fams)):
        size = {}
        for f in fs:
            size[len(f)] = size.get(len(f), 0) + 1
        print(name, len(fs), '낱말', sum(len(f) for f in fs), '크기별', dict(sorted(size.items())))


if __name__ == '__main__':
    sys.exit(main())
