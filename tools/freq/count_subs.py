"""자막 빈도 (2026-10-02, 대표님 "정렬 ㄱㄱ") — OPUS OpenSubtitles 2018 베트남어 자막 모음(원본자료/자막빈도/vi.txt.gz, 이 맥에만)에서
앱 낱말이 **낱말 단위로** 몇 번 나오는지 센다. 원문은 저장소에 안 올리고, 결과(낱말 → 횟수)만 tools/freq/sub_counts.json.
- 줄을 소문자·NFC 로, 문장부호는 띄어쓰기로 바꾼 뒤 음절 열에서 1~4 음절 n-gram 이 대상 낱말과 같으면 센다(부분 음절은 안 셈: 'an' 이 'an toàn' 안에서는 1음절 'an' 으로 따로 셈).
- 음절 목록(vi_50k.txt)은 bệnh viện 같은 여러 음절 낱말을 못 세서 원문을 직접 센다."""
import gzip, json, re, sys, unicodedata, pathlib, collections
R = pathlib.Path(__file__).resolve().parent.parent.parent
SRC = pathlib.Path.home() / '짜오짜오/원본자료/자막빈도/vi.txt.gz'
nfc = lambda s: unicodedata.normalize('NFC', s).lower().strip()
punct = re.compile(r"[^\w\s]", re.U)
key = lambda s: re.sub(r'\s+', ' ', punct.sub(' ', nfc(s))).strip()   # 대상 낱말도 원문과 같게 — ki-lô-gam → ki lô gam
targets = set()
D = json.loads((R / 'data/days.json').read_text(encoding='utf-8'))['days']
for d in D:
    for w in d.get('words') or []:
        k = key(w['vi'])
        if 1 <= len(k.split()) <= 4: targets.add(k)
G = json.loads((R / 'data/gybm.json').read_text(encoding='utf-8'))['sources']
for s in G:
    for l in s['lessons']:
        for w in l['words']:
            k = key(w['vi'])
            if 1 <= len(k.split()) <= 4: targets.add(k)
print('대상', len(targets), file=sys.stderr)
cnt = collections.Counter(); lines = toks = 0
with gzip.open(SRC, 'rt', encoding='utf-8', errors='ignore') as f:
    for line in f:
        lines += 1
        t = punct.sub(' ', nfc(line)).split()
        toks += len(t)
        n = len(t)
        for i in range(n):
            g = t[i]
            if g in targets: cnt[g] += 1
            for m in (2, 3, 4):
                if i + m > n: break
                g = g + ' ' + t[i + m - 1]
                if g in targets: cnt[g] += 1
        if lines % 1000000 == 0: print(lines, file=sys.stderr)
out = {'note': 'OPUS OpenSubtitles v2018 vi — 원문은 이 맥에만(공개 안 함), 여기엔 낱말별 횟수만. 열쇠는 소문자·문장부호를 띄어쓰기로 바꾼 꼴. 줄 %d · 음절 %d' % (lines, toks), 'lines': lines, 'tokens': toks,
       'c': {k: cnt.get(k, 0) for k in sorted(targets)}}
(R / 'tools/freq/sub_counts.json').write_text(json.dumps(out, ensure_ascii=False), encoding='utf-8')
print('줄', lines, '음절', toks, '0회', sum(1 for k in targets if not cnt.get(k)), file=sys.stderr)
