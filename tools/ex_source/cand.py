#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""수업 카드 예문을 교재 원문·사전 예문으로 (2026-10-01, 대표님 "1순위 메인 교재 문장, 2순위 사전 문장, 둘 다 없으면 만든 예문" → "ㄱㄱ").
후보 뽑기(기계): 수업 낱말(일상·직무·선배·22기 + 메인 교재 낱말 중 교재 문장이 아닌 것) 마다
  ① 교재 원문(tools/book_ex/pool.json — 1·2권 글, 공개 안 함) 가운데 그 낱말이 **낱말로** 쓰인 문장 — 사전 표제어로 왼쪽부터 가장 긴 조각으로 잘라 맞춤(an 을 an toàn 속에서 안 셈),
     지시문(Nghe·Đọc·Điền…)·4음절 미만·20음절 넘음은 뺌, 5~14음절 먼저, 4개까지
  ② 사전 예문(data/_dict_ex.json, 위키 + 한국어) 2개까지.
결과 tools/ex_source/cand.json · 시트 tools/ex_source/sh_NN.json (교재 문장 원문이 들어가므로 시트·후보는 공개 안 함 — 판정표만 올린다)
쓰기: python3 tools/ex_source/cand.py"""
import json, pathlib, re, unicodedata as U, collections
R = pathlib.Path(__file__).resolve().parent.parent.parent
nfc = lambda s: U.normalize('NFC', str(s or '')).strip()
INSTR = re.compile(r'^(nghe|đọc|viết|điền|chọn|nối|đánh dấu|hoàn thành|trả lời|hỏi và trả lời|thảo luận|sắp xếp|luyện|xem|quan sát|dùng|đặt câu|tìm|gạch|khoanh|ghép|thực hành|kể|làm theo|lặp lại|nói|giới thiệu về|hãy)\b', re.I)
SHEET = 250


def words():
    D = json.loads((R / 'data/days.json').read_text(encoding='utf-8'))['days']
    O = json.loads((R / 'data/order.json').read_text(encoding='utf-8'))
    G = json.loads((R / 'data/gybm.json').read_text(encoding='utf-8'))['sources']
    out = []
    for d in D:
        if isinstance(d['day'], int) and not d.get('track'):
            for w in d['words']: out.append(('일상', str(d['day']), w))
    for ti, t in enumerate(O['vols'][0]['tracks']):
        for ci, c in enumerate(t['chapters']):
            for li, l in enumerate(c['lessons']):
                for w in l['words']: out.append(('직무', f'J0.{ti}.{ci}.{li}', w))
    PART = {'senior': '선배', 'c22': '22기', 'main': '교재'}
    for s in G:
        for li, l in enumerate(s['lessons']):
            for w in l['words']:
                if s['key'] == 'main' and w.get('ex_src') == 'main_book': continue   # 이미 교재 원문
                out.append((PART.get(s['key'], s['key']), f'B:{s["key"]}{li}', w))
    return out


def main():
    F = json.loads((R / 'data/_dict_full.json').read_text(encoding='utf-8'))
    X = json.loads((R / 'data/_dict_ex.json').read_text(encoding='utf-8'))
    pool = json.loads((R / 'tools/book_ex/pool.json').read_text(encoding='utf-8'))
    W = words()
    heads = set(F) | {nfc(w['vi']).lower() for _, _, w in W}
    # OCR 글이라 글자·성조 오류가 섞인다(1권 1과·2권: lôi→lỗi) — ① 사전에 없는 음절이 든 문장은 뺀다
    # ② 쪽 이미지로 대조해 확인한 문장(tools/book_ex/확인.txt 의 번호 · 메인 교재 예문 main_book)은 '확인' 표시 → 먼저 고른다
    syl = {x for k in F for x in k.split()} | {x for _, _, w in W for x in nfc(w['vi']).lower().split()}
    ok_ids = set((R / 'tools/book_ex/확인.txt').read_text(encoding='utf-8').split())
    G = json.loads((R / 'data/gybm.json').read_text(encoding='utf-8'))['sources']
    ok_txt = {nfc(w['ex']['vi']).lower() for s in G if s['key'] == 'main' for l in s['lessons'] for w in l['words'] if w.get('ex_src') == 'main_book' and w.get('ex')}
    sents, seen = [], set()
    bad_syl = 0
    for p in pool:
        t = nfc(p['text'])
        n = len(t.split())
        if t.lower() in seen or not 4 <= n <= 20 or INSTR.match(t) or re.search(r'[_…]|\.\.\.|\(\s*\)', t): continue
        if any(x not in syl for x in re.sub(r'[^\w\s]', ' ', t.lower()).split() if not x.isdigit()): bad_syl += 1; continue
        seen.add(t.lower()); sents.append({'vi': t, 'vol': p['vol'], 'bai': p['bai'], 'page': p['page'], 'id': p['id'], 'ok': p['id'] in ok_ids or t.lower() in ok_txt})
    idx = collections.defaultdict(list)
    for i, s in enumerate(sents):
        raw = [x for x in re.sub(r'[.,!?;:"“”‘’()…–—]', ' ', s['vi']).split() if x]; t = [x.lower() for x in raw]
        a = 0
        while a < len(t):
            n = min(4, len(t) - a)
            while n > 1 and ' '.join(t[a:a + n]) not in heads: n -= 1
            if not (a > 0 and raw[a][0] != t[a][0]): idx[' '.join(t[a:a + n])].append(i)
            a += n
    out, st = [], collections.Counter()
    for part, lk, w in W:
        k = nfc(w['vi']).lower()
        ex = w.get('ex') or {}
        tb = sorted({i for i in idx.get(k, [])}, key=lambda i: (not sents[i]['ok'], not 5 <= len(sents[i]['vi'].split()) <= 14, len(sents[i]['vi'])))
        tb = [sents[i] for i in tb if sents[i]['vi'].lower() != nfc(ex.get('vi')).lower()][:4]
        wk = [{'vi': v, 'ko': ko} for v, ko in (X.get(k) or [])][:2]
        if not tb and not wk: st['후보 없음(그대로)'] += 1; continue
        st['교재 후보 있음' if tb else '사전 후보만'] += 1
        out.append({'part': part, 'lk': lk, 'w': nfc(w['vi']), 'ko': w.get('ko', ''), 'cur': {'vi': ex.get('vi', ''), 'ko': ex.get('ko', '')},
                    'T': [{'vi': s['vi'], 'where': f"{s['vol']}권 {s['bai']}과 {s['page']}쪽", 'ok': 1 if s['ok'] else 0} for s in tb], 'W': wk})
    (R / 'tools/ex_source/cand.json').write_text(json.dumps(out, ensure_ascii=False), encoding='utf-8')
    for j in range(0, len(out), SHEET):
        sh = [dict(x, n=j + i + 1) for i, x in enumerate(out[j:j + SHEET])]
        (R / f'tools/ex_source/sh_{j // SHEET:02d}.json').write_text(json.dumps(sh, ensure_ascii=False, indent=0), encoding='utf-8')
    print(f'수업 낱말 {len(W)} · 교재 문장(지시문·모르는 음절 {bad_syl} 뺀) {len(sents)} · 확인된 문장 {sum(1 for x in sents if x["ok"])} ·', dict(st), f'· 시트 {(len(out) + SHEET - 1) // SHEET}')


if __name__ == '__main__':
    main()
