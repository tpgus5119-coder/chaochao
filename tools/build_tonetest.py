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


def main():
    sib = json.load(open(os.path.join(ROOT, 'data/sib.json'), encoding='utf-8'))
    ai = json.load(open(os.path.join(ROOT, 'data/audio_index.json'), encoding='utf-8'))
    dko = json.load(open(os.path.join(ROOT, 'data/_dict_ko.json'), encoding='utf-8'))
    w = sib['w']
    fams = []
    words = 0
    for base, vs in sib['t'].items():
        seen, row = set(), []
        for v in vs:
            h = ai.get(v)
            if not h:
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
    out = os.path.join(ROOT, 'data/tonetest.json')
    json.dump({'f': fams}, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    size = {}
    for f in fams:
        size[len(f)] = size.get(len(f), 0) + 1
    print('성조 묶음', len(fams), '낱말', words, '크기별', dict(sorted(size.items())))


if __name__ == '__main__':
    sys.exit(main())
