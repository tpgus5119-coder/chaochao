#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""선배 한월어 엑셀의 '기타, 참조'(메모)와 예문 → data/_senior_notes.json {"n": {낱말: [메모…]}, "x": {낱말: [[베트남어, 한국어]…]}} (2026-10-01).
클로드가 219 메모·335 예문을 하나씩 봤다(대표님 "무작정 넣지 말고 검사하고"). 틀리거나 엉뚱한 것은 번호(엑셀 # 칸)로 빼고, 오타는 고친다.
화면에 영어 금지 — 메모 속 영어 풀이(college/technical school·Onsen·LOL)는 지우거나 한국어로. 예문은 표제어가 낱말로 든 것만(kinh hoàng 칸의 kinh khủng 예문 등은 기계로 빠진다).
쓰기: python3 tools/roots/excel_notes.py"""
import glob, json, os, pathlib, re, unicodedata as U
R = pathlib.Path(__file__).resolve().parent.parent.parent
nfc = lambda s: U.normalize('NFC', str(s or '')).replace('ȏ', 'ô').replace('ȇ', 'ê').strip()

# 메모 — 뺄 것: 엉뚱하거나 틀림
NOTE_DROP = {785: '여왕 메모에 공주(công chúa) — 엉뚱', 867: "phong độ 를 'phong cách và thái độ' 로 — 민간 어원(실제 風度)",
             391: '군함 = hải thuyền — 흔히 tàu chiến', 919: 'phụ nữ = con gái — con gái 는 딸·소녀', 141: "công nghệ = 기술 — 낱말 뜻을 되풀이할 뿐"}
NOTE_FIX = {515: 'hoa hồng = 장미꽃', 974: 'quản trị kinh doanh = 경영학', 604: 'kính áp tròng = 콘택트렌즈 / kính râm = 선글라스',
            83: 'trường cao đẳng = 전문대학', 653: 'Liên Minh Huyền Thoại = (게임) 리그 오브 레전드', 790: 'suối nước nóng 이 보편적인 단어',
            474: '고객센터·정책 안내에서 주로 사용', 475: '직원 말투·일상에서 주로 사용', 755: 'Phát sinh lỗi nhất thời = 일시적인 오류가 발생했습니다',
            851: None}
# 예문 — 뺄 것(엑셀 # 칸): 틀린 뜻·말이 안 됨·뜻 없는 문장·숫자 빠짐·메타 설명
EX_DROP = {16, 34, 35, 46, 49, 87, 102, 137, 142, 152, 187, 194, 196, 205, 209, 222, 238, 245, 247, 248, 250, 252, 254, 267, 277, 278, 281, 282, 283, 286, 570}


def has_word(sent, w):
    s = ' ' + re.sub(r'\s+', ' ', re.sub(r'[.,!?;:"“”‘’()…–—=]', ' ', sent.lower())) + ' '
    return (' ' + w.lower() + ' ') in s


def head(raw):
    w = nfc(raw)
    w = re.sub(r'^cám \(cảm\) ơn$', 'cám ơn', w, flags=re.I)
    return re.sub(r'\s*\(.*?\)', '', w).strip()


def main():
    import openpyxl
    p = [f for f in glob.glob(os.path.expanduser('~/짜오짜오/원본자료/*/*/*.xlsx')) if 'Han Han Viet' in nfc(f)][0]
    ws = openpyxl.load_workbook(p, read_only=True, data_only=True)['HanViet 1-']
    notes, exs, st = {}, {}, {'메모': 0, '메모 뺌': 0, '예문': 0, '예문 뺌(번호)': 0, '예문 뺌(표제어 없음)': 0}
    for r in list(ws.iter_rows(values_only=True))[1:]:
        if not r[1]: continue
        no, w = r[0], head(r[1])
        k = w.lower()
        if r[5]:
            if no in NOTE_DROP: st['메모 뺌'] += 1
            else:
                m = NOTE_FIX.get(no, nfc(r[5]))
                if m:
                    m = re.sub(r'\s*\n\s*', ' / ', m).strip(' /')
                    notes.setdefault(k, []).append(m); st['메모'] += 1
        if r[6]:
            if no in EX_DROP: st['예문 뺌(번호)'] += 1; continue
            for part in re.split(r'\n(?=[^\s=/])', nfc(r[6])):          # 한 칸에 예문 둘(⏎)
                part = part.replace('\n', ' ')
                m = re.match(r'(.+?)\s*(?:/|=)\s*([^/=]*[가-힣][^/=]*)$', part)
                if not m: continue
                vi, ko = m.group(1).strip(), m.group(2).strip()
                if not has_word(vi, w): st['예문 뺌(표제어 없음)'] += 1; continue
                vi = vi[0].upper() + vi[1:]
                exs.setdefault(k, []).append([vi, ko]); st['예문'] += 1
    (R / 'data/_senior_notes.json').write_text(json.dumps({'n': notes, 'x': exs}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(st, '· 낱말', len(set(notes) | set(exs)))


if __name__ == '__main__':
    main()
