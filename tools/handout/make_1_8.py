# -*- coding: utf-8 -*-
"""교재 1권 1~8과 핵심 단어·문법 정리 — 동기들에게 나눠 줄 파일(HTML → Chrome 로 PDF). 2026-10-14 대표님 "1단원부터 8단원까지 각 단원의 핵심 단어와 모든 문법 정리해 파일로".
자료: data/gybm.json(교재 낱말, star = 핵심) · data/_gram_ch.json(과별 문법 상자 box · 상자 밖 hidden) · data/grammar.json(문형 카드: 제목·꼴·설명·예문).
교재 본문(대화·지문)은 옮기지 않는다 — 낱말 표·문형 설명·짧은 예문만. 화면에 영어 안 씀.
쓰기: python3 tools/handout/make_1_8.py → ~/Downloads/베트남어_1권_1-8과_핵심단어_문법.pdf (+ 같은 이름 .html)"""
import json, re, pathlib, subprocess, collections, html
R = pathlib.Path(__file__).resolve().parent.parent.parent
OUT = pathlib.Path.home() / 'Downloads' / '베트남어_1권_과별정리'; OUT.mkdir(parents=True, exist_ok=True)
import unicodedata as U
GRAM_LINE = {}
for _n in range(1, 9):   # 교재 과 첫머리의 NGỮ PHÁP 줄(문법 목록 원문) — 정리와 교재를 맞대 볼 수 있게 과 머리에 적는다 (2026-10-14 대표님 "교재와 실제로 대조")
    _m = re.search(r'^(?:NGỮ PHÁP|Ngữ pháp):\s*(.+)$', (R / f'tools/book_ex/src/v1_b{_n}.txt').read_text(encoding='utf-8'), re.M)
    GRAM_LINE[_n] = U.normalize('NFC', _m.group(1).strip()) if _m else ''
G = json.load(open(R / 'data/gybm.json', encoding='utf-8'))['sources'][0]['lessons']
CH = json.load(open(R / 'data/_gram_ch.json', encoding='utf-8'))['chapters']
GR = json.load(open(R / 'data/grammar.json', encoding='utf-8'))['books'][0]['bai']
card = {}
for li, l in enumerate(GR):
    for gi, it in enumerate(l['g']): card[f'{li + 1}.{gi}'] = it
chap = collections.OrderedDict()
for l in G:
    base = re.sub(r' · \d+부$', '', l['title']); chap.setdefault(base, []).extend(l['words'])
titles = list(chap)
strip = lambda s: html.unescape(re.sub(r'<[^>]+>', '', s or '')).strip()
def first_sent(b, n=2):
    s = strip(b); parts = re.split(r'(?<=[.다요])\s+', s); out = ''
    for q in parts[:n]:                                  # 문장 단위로만 자른다 — 글자 수로 끊으면 낱말 가운데서 잘렸다
        if out and len(out) + len(q) > 190: break
        out = (out + ' ' + q).strip()
    return out if len(out) <= 230 else out[:230].rsplit(' ', 1)[0] + '…'
E = html.escape
def grammar_rows(ids, full):
    out = []
    for i in ids:
        it = card.get(i)
        if not it: continue
        exs = [e for e in (it.get('ex') or []) if e.get('vi')][: (2 if full else 1)]
        out.append((it['t'], it.get('k') or '', first_sent(it.get('b'), 2 if full else 1) if full else first_sent(it.get('b'), 1), exs))
    return out
HEAD = '''<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>베트남어 1권 핵심 단어·문법</title>
<style>
@page{size:A4; margin:14mm 12mm}
body{font-family:"Apple SD Gothic Neo","Noto Sans KR","Helvetica Neue",Arial,sans-serif; color:#1a1a1a; font-size:10.5pt; line-height:1.45; margin:0}
h1{font-size:20pt; margin:0 0 4px} .sub{color:#666; font-size:9.5pt; margin-bottom:14px}
h2{font-size:14.5pt; margin:0 0 6px; padding:6px 10px; background:#eef3ff; border-left:5px solid #3b6cf6; page-break-after:avoid}
h2 small{font-weight:400; color:#555; font-size:10.5pt; margin-left:8px}
h3{font-size:11.5pt; margin:12px 0 5px; color:#3b6cf6; page-break-after:avoid}
section.ch{page-break-before:always} section.ch:first-of-type{page-break-before:auto}
table.w{width:100%; border-collapse:collapse; font-size:9.6pt}
table.w td{border-bottom:1px solid #e3e3e3; padding:2px 6px; vertical-align:top}
table.w td.v{font-weight:700; width:24%; white-space:nowrap} table.w td.k{width:26%; color:#333}
.g{margin:0 0 7px; padding:6px 9px; border:1px solid #e1e5ee; border-radius:6px; page-break-inside:avoid}
.g .t{font-weight:700} .g .p{color:#3b6cf6; font-size:9.6pt; margin-left:6px} .g .b{color:#333; font-size:9.6pt; margin-top:2px}
.g .ex{margin-top:3px; font-size:9.6pt} .g .ex b{font-weight:600} .g .ex span{color:#666}
.hid .g{border-style:dashed; background:#fafafa}
.foot{color:#888; font-size:8.5pt; margin-top:18px}
.src{color:#555; font-size:9.3pt; margin:-2px 0 8px; padding:4px 10px; background:#f6f7fa; border-radius:4px}
</style></head><body>'''
SUB = '<div class="sub">메인 교재 Tiếng Việt 1 의 과별 핵심 낱말과 문법 상자 문형. 문법은 과마다 \'교재 문법 상자\'와 \'상자 밖(수업·본문에서 같이 나오는 것)\'으로 나눴습니다.</div>'
def chapter_html(n):
    parts = []
    ch = CH[f'1-{n}']; vt = titles[n - 1]; ws = [w for w in chap[vt] if w.get('star')]
    parts.append(f'<section class="ch"><h2>{n}과 {E(vt)}<small>{E(ch["title_ko"])}</small></h2>')
    if GRAM_LINE.get(n): parts.append(f'<div class="src">교재 문법 목록: {E(GRAM_LINE[n])}</div>')
    parts.append(f'<h3>핵심 단어 {len(ws)}</h3><table class="w">')
    half = (len(ws) + 1) // 2
    for i in range(half):
        a = ws[i]; b = ws[i + half] if i + half < len(ws) else None
        row = f'<tr><td class="v">{E(a["vi"])}</td><td class="k">{E(a["ko"])}</td>'
        row += (f'<td class="v">{E(b["vi"])}</td><td class="k">{E(b["ko"])}</td>' if b else '<td></td><td></td>') + '</tr>'
        parts.append(row)
    parts.append('</table>')
    box = grammar_rows(ch['box'], True); hid = grammar_rows([i for i in ch.get('hidden', []) if i not in ch['box']], False)
    parts.append(f'<h3>문법 — 교재 상자 {len(box)}</h3>')
    for t, k, b, exs in box:
        parts.append(f'<div class="g"><span class="t">{E(t)}</span><span class="p">{E(k)}</span><div class="b">{E(b)}</div>' + ''.join(f'<div class="ex"><b>{E(e["vi"])}</b> <span>— {E(e.get("ko", ""))}</span></div>' for e in exs) + '</div>')
    if hid:
        parts.append(f'<h3>상자 밖 문법 — 수업·본문에서 같이 나오는 것 {len(hid)}</h3><div class="hid">')
        for t, k, b, exs in hid:
            parts.append(f'<div class="g"><span class="t">{E(t)}</span><span class="p">{E(k)}</span>' + ''.join(f'<div class="ex"><b>{E(e["vi"])}</b> <span>— {E(e.get("ko", ""))}</span></div>' for e in exs) + '</div>')
        parts.append('</div>')
    parts.append('</section>')
    return '\n'.join(parts)
FOOT = '<div class="foot">짜오짜오 앱 자료로 정리 · 2026-10-14</div></body></html>'
def to_pdf(hp, pp):
    subprocess.run(['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '--headless=new', '--disable-gpu', '--no-pdf-header-footer', f'--print-to-pdf={pp}', f'file://{hp}'], check=True, capture_output=True, timeout=120)
secs = {n: chapter_html(n) for n in range(1, 9)}
for n in range(1, 9):                                          # 과마다 따로 (대표님 2026-10-14 "각 챕터별로 나눠서")
    name = f'{n}과_{re.sub(r"[?!]", "", titles[n-1]).strip().replace(" ", "_")}'
    hp = OUT / f'{name}.html'; hp.write_text(HEAD + f'<h1>베트남어 1권 {n}과 — 핵심 단어·문법</h1>' + SUB + secs[n] + FOOT, encoding='utf-8')
    to_pdf(hp, OUT / f'{name}.pdf'); hp.unlink()
hp = OUT / '합본_1-8과.html'; hp.write_text(HEAD + '<h1>베트남어 1권 1~8과 — 핵심 단어·문법 정리</h1>' + SUB + '\n'.join(secs[n] for n in range(1, 9)) + FOOT, encoding='utf-8')
to_pdf(hp, OUT / '합본_1-8과.pdf'); hp.unlink()
print('만든 파일:', sorted(p.name for p in OUT.glob('*.pdf')), '| 핵심 낱말', sum(len([w for w in chap[titles[n-1]] if w.get('star')]) for n in range(1, 9)), '· 상자 문형', sum(len(CH[f"1-{n}"]["box"]) for n in range(1, 9)))
