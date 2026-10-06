#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""22기 매일 단어 시험 → data/daily22.json (대표님 지시 2026-09-30: "매일 보는 단어 시험을 테스트 파트에서 학습하고 이어서 시험")
재료: data/cohort22.json(낱말 40개씩 — 뜻·예문·그림·발음) + tools/daily22/문장.tsv(문장 10개씩, 클로드가 시험지에서 옮김)
      + 원본 시험지(원본자료/베트남어 학습자료/22기 자료/a반·b반) — 낱말마다 **시험지가 물은 방향**을 읽는다:
        시험지에 'N  베트남어' 가 적혀 있으면 베트남어를 보고 뜻을 쓰는 문제(to_ko), 아니면 뜻을 보고 베트남어를 쓰는 문제(to_vi).
문법 표시: 문장에 든 문형을 문법 46과 번호로 단다(틀리면 그 과로 가는 단추).
쓰기: python3 tools/daily22/build.py   →  data/daily22.json · scratchpad 소리 목록 출력"""
import json, pathlib, re, subprocess, sys, unicodedata, zipfile
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / "tools"))
from vi_kr import word as vi_kr  # noqa: E402
SRC = pathlib.Path.home() / "짜오짜오/원본자료/베트남어 학습자료/22기 자료"
DATES = ['9/22', '9/23', '9/24', '9/25', '9/26', '9/28', '9/29', '9/30', '10/1', '10/2', '10/5', '10/6', '10/7']      # 시험 날짜들 (2026-10-05 대표님: 10/2 다음 시험은 10/5 — 11회 두 반 다 10/5, 12회 10/6) (일요일 9/27 없음)
nfc = lambda s: unicodedata.normalize('NFC', s)
def bare(s):
    s = unicodedata.normalize('NFD', nfc(s).lower().replace('đ', 'd'))
    return re.sub(r'[̀-ͯ]', '', s)
def text_of(p):
    if p.suffix == '.pdf': return subprocess.run(['pdftotext', '-layout', str(p), '-'], capture_output=True, text=True).stdout
    x = zipfile.ZipFile(p).read('word/document.xml').decode('utf-8')
    return '\n'.join(t for t in ('' .join(re.findall(r'<w:t(?:\s[^>]*)?>(.*?)</w:t>', para, flags=re.S)).strip()
                                 for para in re.findall(r'<w:p(?:\s[^>]*)?>.*?</w:p>', x, flags=re.S)) if t)
GRAM = [(r'không phải là', 4), (r'\blà\b', 4), (r'\bcủa\b', 4), (r'\bcũng\b', 4), (r'\bcó\b[^?]*\bkhông\?', 5), (r'phải không', 5),
        (r'\bgì\b', 5), (r'\bai\b', 5), (r'nước nào', 5), (r'thế nào', 5), (r'\bmấy\b', 8), (r'bao nhiêu', 8), (r'\bđã\b|\bđang\b|\bsẽ\b', 10),
        (r'\bchưa\b', 11), (r'\brất\b|\bquá\b', 12), (r'ở đâu|đi đâu|từ đâu', 17), (r'\bđều\b', 28), (r'\bđược\b|\bbiết\b|có thể|\bmuốn\b', 19)]
SPLIT = {'b12': 20}
DIRS = {'b13': ('to_ko', {'mở', 'đông', 'báo'}), 'a13': ('to_ko', {w.lower() for w in ['ngồi','thử','bằng','đặc biệt','cuối tuần','phố đi bộ','mắc','mời','cảm xúc','giỏi','khách','đài truyền hình','sau khi','yếu','nói chuyện','đi dạo','vì ... nên','thân thiện','nên','khen']})}   # a13: 표에서 흘린 줄 때문에   # 표 꼴 시험지(낱말 칸이 문단으로 쪼개져 방향을 못 읽음): 기본 방향, 뜻→베트남어인 낱말들 (2026-10-07)
OVR = {('b1', 'tắc xi'): 'to_ko', ('a12', 'nên'): 'to_ko'}   # a12 '39 Nên (단독)' — 뒤 괄호 때문에 못 읽음   # 시험지 'Taxi'(베트남어 칸) — 앱 표제어는 tắc xi 라 글자로 못 찾는다
# 문장 속 이름(한국·영어 이름·약자)은 베트남어 읽기 규칙으로 읽으면 이상해진다('Seung Bin' → 쌔우 빈) — 발음 칸에서만 바로잡는다
NAME_KR = {'Seung Bin': '승빈', 'Yeo Jeong': '여정', 'Eun Ji': '은지', 'GYBM': '지와이비엠', 'Brian': '브라이언', 'David': '데이비드',
           'James': '제임스', 'Kate': '케이트', 'BJ': '비제이', 'WP': '더블유피', 'MJ': '엠제이', 'Seoul': '서울'}
def kr_of(vi):
    """이름이 없으면 vi_kr 그대로. 있으면 낱말마다 읽되 이름 자리는 NAME_KR 로 — vi_kr 은 이름을 빈 글자로 읽어 통째 치환하면 번진다"""
    if not any(n in vi for n in NAME_KR): return vi_kr(vi)
    toks, out, i = vi.split(), [], 0
    names = sorted(NAME_KR, key=lambda n: -len(n.split()))
    while i < len(toks):
        for n in names:
            k = n.split()
            if [re.sub(r'[.,!?]+$', '', x) for x in toks[i:i + len(k)]] == k:
                out.append(NAME_KR[n]); i += len(k); break
        else:
            r = vi_kr(toks[i])
            if r: out.append(r)
            i += 1
    return ' '.join(out)
def gram_of(vi):
    v = nfc(vi).lower(); out = []
    for pat, n in GRAM:
        if re.search(pat, v) and n not in out: out.append(n)
    return out

def main():
    C = json.loads((R / 'data/cohort22.json').read_text(encoding='utf-8'))
    rows = [l.rstrip('\n').split('\t') for l in (R / 'tools/daily22/문장.tsv').read_text(encoding='utf-8').splitlines() if l.strip() and not l.startswith('#')]
    sents = {}
    for r in rows:
        r += [''] * (7 - len(r))
        f, no, d, vi, ko, alt, src = r[:7]
        assert d in ('to_vi', 'to_ko'), r
        sents.setdefault(f, []).append({"no": int(no), "dir": d, "vi": vi.strip(), "ko": ko.strip(), "alt": [a.strip() for a in alt.split(' / ') if a.strip()],
                                        "kr": kr_of(vi.strip()), "gram": gram_of(vi), "src": src.strip()})
    tests, audio, seen = [], [], {}
    nth = {}
    for d in sorted(C['days'], key=lambda d: d['no']):
        m = re.match(r'([AB])반 (\d+/\d+) 단어 시험', d['label']); cls, date = m.group(1), m.group(2)
        nth[cls] = nth.get(cls, 0) + 1; key = cls.lower() + str(nth[cls])   # 반마다 회차를 센다 — B반은 10/3(토)에 11회, A반 11회는 10/5(월) (2026-10-04)
        fs = [p for p in (SRC / (cls.lower() + '반')).glob(key + '.*') if not p.name.startswith('.')]
        raw = text_of(fs[0]) if fs else ''
        if '정답 및 해설지' in raw: raw = raw.split('정답 및 해설지')[0]   # 문제 + 답지가 한 파일(b11) — 방향은 문제 쪽만 보고 읽는다. 답지의 '21. trường học' 은 베트남어→뜻 문제가 아니다
        t, tx = bare(raw), nfc(raw).lower()
        # 방향: 시험지에 '번호 베트남어'(문제지·A반 정답지) 또는 줄 머리 '베트남어 :'(B반 정답지)로 적혀 있으면 베트남어를 보고 뜻(to_ko), 아니면 뜻을 보고 베트남어(to_vi).
        # 번호로 짝짓지 않는다 — 39·49낱말 회차는 번호가 한 칸씩 밀린다. 시험지의 'A / B' 꼴(không ngon / dở)은 못 찾으므로,
        # 한 시험의 85% 넘게가 베트남어→뜻이면 그 시험은 전부 베트남어→뜻(B반 '베트남어 · 한국어 뜻' 짜임).
        def direction(vi):
            # 성조·모자까지 같은 글자로 먼저 찾는다 — 모자를 떼면 mượn 과 Muộn 이 같아진다. 시험지에 그 글자가 아예 없을 때만 모자 뗀 글자로.
            for txt, key_ in ((tx, nfc(vi).lower()), (t, bare(vi))):
                if key_ not in txt: continue
                b = re.escape(key_)
                end = r'(?=[ \t]*(:|_|/|\n|$)|[ \t]{2,}|[ \t]*답)'   # '1. ngân hàng답: ____' 꼴(b11 — 워드 글에서는 띄어쓰기 없이 붙는다)       # 낱말 뒤가 칸 나눔 — 'làm' 이 '40 Làm thêm' 에 걸리지 않게, 'Heo / lợn' 은 걸리게
                if re.search(r'(?<![a-z0-9])\d{1,2}[.)]?\s+' + b + end, txt): return 'to_ko'      # '번호 베트남어'
                if re.search(r'(^|\n)\s*' + b + r'\s*:', txt): return 'to_ko'                   # 줄 머리 '베트남어 :' (B반 정답지)
                return OVR.get((key, vi), 'to_vi')
            return OVR.get((key, vi), 'to_vi')
        words = []
        for w in d['words']:
            words.append({k: w[k] for k in ('vi', 'ko', 'kr_read', 'img', 'ex') if k in w} | {"dir": direction(w['vi'])})
        if sum(x['dir'] == 'to_ko' for x in words) >= 0.85 * len(words):
            for x in words: x['dir'] = 'to_ko'
        if key in DIRS:
            d0, tv = DIRS[key]
            for x in words: x['dir'] = 'to_vi' if x['vi'].lower() in tv else d0
        if key in SPLIT:                       # 우리가 낸 시험지(b12 — 대표님 단어장으로 클로드 출제, 2026-10-05): 앞 절반 베트남어→뜻, 뒤 절반 뜻→베트남어로 정해져 있다.
            for i, x in enumerate(words): x['dir'] = 'to_ko' if i < SPLIT[key] else 'to_vi'   # 성조 뗀 글자가 앞 문제와 겹쳐(chùa~chưa) 방향을 잘못 읽었다
        nv = sum(x['dir'] == 'to_vi' for x in words)
        ss = sorted(sents.get(key, []), key=lambda s: s['no'])
        assert len(ss) == 10, (key, len(ss))
        for s in ss: audio.append(s['vi'])
        tests.append({"key": key, "cls": cls, "date": date, "label": d['label'], "words": words, "sents": ss})
        print(f"{key:3s} {d['label']:18s} 낱말 {len(words):2d} (뜻→베트남어 {nv:2d} · 베트남어→뜻 {len(words) - nv:2d}) · 문장 10 "
              f"(한→베 {sum(s['dir'] == 'to_vi' for s in ss):2d}) · 출처 " + ','.join(sorted({s['src'].split(':')[0] for s in ss})))
    out = {"note": "22기 매일 단어 시험 — 시험지 그대로(낱말 방향·문장 10). 만든 도구 tools/daily22/build.py (2026-09-30)", "tests": tests}
    (R / 'data/daily22.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    lst = pathlib.Path('/private/tmp/claude-501/-Users-leesehyeon-----/d0dc869d-c57f-4a4f-b3b4-4891244877a1/scratchpad/daily22_audio.json')
    lst.write_text(json.dumps(list(dict.fromkeys(audio)), ensure_ascii=False), encoding='utf-8')
    print('시험', len(tests), '· 낱말', sum(len(t['words']) for t in tests), '· 문장', sum(len(t['sents']) for t in tests),
          '· 파일', round((R / 'data/daily22.json').stat().st_size / 1024), 'KB · 소리 목록', len(set(audio)))

if __name__ == '__main__':
    main()
