#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""사전 낱말 전체의 한자 뿌리 (2026-10-01, 대표님 "니가 말한 순서대로 ㄱㄱ" — ① 한자).
근거는 위키낱말사전 원문에 **적혀 있는** 한자 어원 표시뿐이다 — 지어내지 않는다:
  · 영어판 {{vi-etym-sino|大|…|學|…}} (data/_dict_gloss.json raw)
  · 베트남어판 {{vie-etym-sino|…}}·{{vi-etym-sino|…}}·{{etym-translit|lang=Hani|term=…}} (번역 표 줄 '{{t' 는 안 본다)
기계 검산 (하나라도 걸리면 뺀다):
  ① 두 음절 이상 · 한자 글자 수 = 음절 수 (한 음절은 뜻마다 한자가 달라 사전 [한자] 뜻으로만 둔다)
  ② 글자마다 한자음 검산: 그 글자가 **다른 낱말에서도 같은 음절**로 읽혔거나(2번 이상), 그 글자의 유일한 읽기일 것
  ③ 한글 음(대학)을 hanja 꾸러미로 달 수 있을 것
  ④ tools/roots/한자_판정.tsv(클로드가 낱말마다 본 것)·뺀_낱말.tsv 에 있는 낱말은 그대로 둔다(이 표가 이긴다)
결과 tools/roots/사전_한자.tsv (make_roots.py 가 읽는다) · 걸러진 것 tools/roots/사전_한자_뺌.tsv
쓰기: python3 tools/roots/dict_han.py"""
import json, pathlib, re, sys, collections, unicodedata as U
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools')); sys.path.insert(0, str(R / 'tools/roots'))
SP = pathlib.Path('/private/tmp/claude-501/-Users-leesehyeon-----/d0dc869d-c57f-4a4f-b3b4-4891244877a1/scratchpad')
CJK = re.compile(r'^[一-鿿㐀-䶿\U00020000-\U0002ffff]+$')
nfc = lambda s: U.normalize('NFC', s).strip()
TONES = '\u0300\u0301\u0309\u0303\u0323'


ONSET_Y = re.compile(r'^(b|c|ch|d|đ|g|gh|h|k|kh|l|m|n|ng|ngh|nh|p|ph|r|s|t|th|tr|v|x|qu)y$')


def canon(syl):
    """성조 찍는 자리만 다른 꼴(uý·úy, hoá·hóa)과 자음 뒤 홀로 쓴 y·i(kỹ·kĩ, lý·lí)를 같게 — 앱 viCanon 과 같은 규칙"""
    d = U.normalize('NFD', syl.lower())
    t = ''.join(c for c in d if c in TONES)
    b = U.normalize('NFC', ''.join(c for c in d if c not in TONES))
    if ONSET_Y.match(b): b = b[:-1] + 'i'
    return b + t

# 한자음 검산에 걸렸지만 클로드가 하나씩 보고 표준 한자어로 확인한 것 (2026-10-01) — 드문 읽기·남부 읽기(tánh·nhơn)·변이음(uý/úy) 때문에 걸렸다.
# 민간 어원이 의심되는 것(bủn xỉn 貧賤·tỉ mỉ 細密·thiêng liêng 精靈 …)·외국 지명 음역(a lịch sơn·tân gia ba …)·위키 글자가 틀려 보이는 것(nạn dân 戁民·tiến thoái 先退)은 살리지 않는다.
# 값: 한글 음을 손으로 줄 때만(꾸러미 기본음이 이 낱말 음과 다를 때). 옛 한자음 섞인 것은 (음, 표준 한자음 글)
HAND_OK = {
 'a giao': '', 'a hoàn': '', 'ai lao': '', 'an ủi': ('', 'úy'), 'bao biếm': '', 'bi chí': '', 'biện hàn': '', 'bàn môn điếm': '',
 'bàng hoàng': '', 'bào chế': '', 'bá tánh': '', 'bán kính': '', 'bát quái': '', 'bích hoạ': '', 'bí kíp': '', 'bạc liêu': '', 'bặt thiệp': '',
 'bố đại': '', 'bối cảnh': '', 'can khương': '', 'canh cánh': '', 'chiếm đoạt': '', 'chấp nê': '', 'cánh sinh': '', 'cát cánh': '',
 'cúng dường': '', 'cầu an': '', 'cầu não': '', 'cổ phần': '', 'củ khởi': '', 'dẫn độ': '', 'duyên cớ': ('', 'cố'), 'giao thoa': '',
 'hành vi': '', 'hô hào': '', 'hoành phi': '', 'hối đoái': '', 'khoa trương': '', 'khoái trá': '', 'khâu nhục': '', 'khể thủ': '',
 'khống chỉ': '', 'kinh giới': '', 'ký nhi viện': '', 'kết liễu': '', 'kỉ hà': '', 'kỉ tử': '', 'long diên hương': '', 'lung lạc': '',
 'lũng đoạn': '', 'lẫm liệt': '', 'ma da': '', 'ma sát': '', 'ma tổ': '', 'mai khôi': '', 'mân côi': '', 'môn đăng hộ đối': '',
 'mại bản': '', 'nghiêu khê': '', 'nhiêu khê': '', 'nguỵ biện': '', 'ngũ trược': '', 'nha phiến': '', 'á phiện': '', 'nhiên liệu': '',
 'nãi man': '', 'não mô cầu': '', 'phiên thiết': '', 'phiêu lưu kí': '', 'phúc thẩm': '', 'phảng phất': '', 'phụ hoạ': '', 'phục chế': '',
 'quan tái': '', 'qui phục': '', 'quy nhơn': '', 'sang chấn': '', 'sáp nhập': '', 'sính lễ': '', 'thiên thai': '', 'thiền vu': '선우',
 'thong dong': '', 'thuyên tắc': '', 'thuần phục': '', 'thái ấp': '', 'thát đát': '', 'thâm sơn cùng cốc': '', 'thân phận': '', 'thí dụ': '',
 'thương hiệt': '', 'thất phu': '', 'thặng dư': '', 'thổ dục hồn': '토욕혼', 'tinh hoàn': '', 'tiêm nhiễm': '', 'tiếp thu': '', 'tiền tiêu': '',
 'trường kỉ': '', 'trọc phú': '', 'trụ trì': '', 'trứ danh': '', 'tuần lộc': '', 'tú cầu': '', 'tường vi': '', 'tản viên sơn thánh': '',
 'tỉ lệ xích': '', 'uý lạo': '', 'vu lan': '', 'võ biền': '', 'xá lợi phất': '', 'xán lạn': '', 'xúc tu': '', 'âu sầu': '', 'đinh ninh': '',
 'đàng hoàng': '', 'đào luyện': '', 'đăng bộ': '', 'đại để': '', 'đấu củng': '', 'đậu phụ': '', 'ất tỵ': '',
}

from hanmulti import fix_multi   # noqa: E402  음이 여럿인 한자 (tools/roots/hanmulti.py)


# 두 낱말이 붙은 네 글자 말은 뒤 낱말 첫머리에도 두음법칙 (安貧樂道 안빈낙도 · 男尊女卑 남존여비). 꾸러미는 맨 앞에만 적용한다.
# 한 낱말 안의 글자(古人類學 고인류학 · 西伯利亞 서백리아)는 그대로 — 클로드가 하나씩 봄 (2026-10-01)
KO_HAND = {'hàng ngũ': '항오', 'an bần lạc đạo': '안빈낙도', 'an cư lạc nghiệp': '안거낙업', 'hồ tư loạn tưởng': '호사난상', 'khai thiên lập địa': '개천입지',
 'nam tôn nữ ti': '남존여비', 'nhất cử lưỡng tiện': '일거양편', 'quân chủ lập hiến': '군주입헌', 'song thất lục bát': '쌍칠육팔',
 'tam thập lục kế': '삼십육계', 'thuỷ quân lục chiến': '수군육전', 'tiến thoái lưỡng nan': '진퇴양난', 'trí cùng lực kiệt': '지궁역갈',
 'táng tận lương tâm': '상진양심', 'xuất đầu lộ diện': '출두노면', 'điện thoại niên giám': '전화연감', 'điệu hổ li sơn': '조호이산'}


def chars_of(args):
    """틀 인자에서 한자 글자 차례 — {{vi-etym-sino|學|to learn|生|…}} 는 한자·뜻이 번갈아, {{vi-etym-sino|大學}} 는 통째로"""
    out = ''
    for a in args:
        a = a.strip()
        if '=' in a and not CJK.match(a): continue
        if CJK.match(a): out += a
    return out


def from_en():
    g = json.loads((R / 'data/_dict_gloss.json').read_text(encoding='utf-8'))
    for k, v in g.items():
        raw = (v or {}).get('raw') or ''
        for m in re.finditer(r'\{\{vi-etym-sino\|([^{}]*)\}\}', raw):
            h = chars_of(m.group(1).split('|'))
            if h: yield nfc(k), h, '영어판 vi-etym-sino'; break


def from_vi():
    for f in ['viwikt_text', 'viwikt_text4', 'viwikt_text_more', 'viwikt_text_more2']:
        p = SP / (f + '.json')
        if not p.exists(): continue
        for k, v in json.loads(p.read_text(encoding='utf-8')).items():
            if not v: continue
            for line in v.split('\n'):
                if '{{t' in line or 'langname' in line: continue
                m = re.search(r'\{\{vie?-etym-sino\|([^{}]*)\}\}', line)
                if m:
                    h = chars_of(m.group(1).split('|'))
                    if h: yield nfc(k), h, '베트남어판 etym-sino'; break
                m = re.search(r'\{\{etym-translit\|[^{}]*lang=Hani[^{}]*term=([^|{}]+)', line)
                if m and CJK.match(m.group(1).strip()):
                    yield nfc(k), m.group(1).strip(), '베트남어판 etym-translit'; break


def rows(name):
    p = R / 'tools/roots' / name
    for line in p.read_text(encoding='utf-8').splitlines():
        if line.strip() and not line.startswith('#'): yield (line.split('\t') + [''] * 8)[:8]


def main():
    from make_roots import ko_reading
    F = json.loads((R / 'data/_dict_full.json').read_text(encoding='utf-8'))
    heads = {k.lower(): (e.get('h') or k) for k, e in F.items()}
    judged = {r[0].strip().lower() for r in rows('한자_판정.tsv')} | {r[0].strip().lower() for r in rows('뺀_낱말.tsv')}
    cand = {}
    for src in (from_en(), from_vi()):
        for w, h, why in src:
            cand.setdefault(w.lower(), []).append((h, why))
    # 글자 → 읽힌 음절들 (모든 후보 + 판정표). 낱말마다 한 번만 센다
    readings = collections.defaultdict(collections.Counter)
    def feed(w, h):
        syl = w.lower().split()
        if len(syl) == len(h):
            for c, s in zip(h, syl): readings[c][canon(s)] += 1
    for w, lst in cand.items():
        for h in {h for h, _ in lst}: feed(w, h)
    for r in rows('한자_판정.tsv'):
        if r[1] and r[2].strip() != '1': feed(r[0].strip(), r[1].strip())
    keep, drop = [], []
    for w, lst in sorted(cand.items()):
        if w not in heads or w in judged: continue
        syl = w.split()
        hs = list(dict.fromkeys(h for h, _ in lst))
        why = ' · '.join(sorted({y for _, y in lst}))
        if len(syl) < 2: continue
        if len(hs) > 1: drop.append((w, '/'.join(hs), '근거끼리 한자가 다름')); continue
        h = hs[0]
        if len(h) != len(syl): drop.append((w, h, '글자 수 ≠ 음절 수')); continue
        bad = [c + ':' + s for c, s in zip(h, syl) if not (readings[c][canon(s)] >= 2 or len(readings[c]) == 1)]
        old = ''
        if bad:
            if w not in HAND_OK: drop.append((w, h, '한자음 검산 안 됨 ' + ','.join(bad))); continue
            v = HAND_OK[w]; why += ' · 클로드가 한자음 확인'
            if isinstance(v, tuple): v, old = v
        ko = (HAND_OK.get(w) if isinstance(HAND_OK.get(w), str) and HAND_OK.get(w) else None) or ko_reading(w, h)
        if not ko or len(ko) != len(h): drop.append((w, h, '한글 음 못 닮')); continue
        ko = KO_HAND.get(w) or fix_multi(w, h, ko)
        keep.append((w, h, ko, why, old))
    with open(R / 'tools/roots/사전_한자.tsv', 'w', encoding='utf-8') as f:
        f.write('# 사전 낱말 한자 뿌리 — tools/roots/dict_han.py 가 위키 어원 표시에서 뽑고 한자음 검산을 통과한 것 (2026-10-01). 칸: 단어⇥한자⇥한글 음⇥근거⇥옛 한자음일 때 표준 한자음\n')
        for r in keep: f.write('\t'.join(r) + '\n')
    with open(R / 'tools/roots/사전_한자_뺌.tsv', 'w', encoding='utf-8') as f:
        f.write('# dict_han.py 가 뺀 것과 까닭. 칸: 단어⇥한자⇥까닭\n')
        for r in drop: f.write('\t'.join(r) + '\n')
    c = collections.Counter(d[2].split(' ')[0] for d in drop)
    print(f'후보 {len(cand)} · 넣음 {len(keep)} · 뺌 {len(drop)} {dict(c)}')


if __name__ == '__main__':
    main()
