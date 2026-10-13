#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""교재 속 숨은 문법 찾기 (2026-10-13, 대표님 "문법 상자에 없는 문법들도 교재 안에 숨어 있다니까? 찾아내 봐").
메인 교재 1·2권 24과의 **모든 베트남어 문장**(대화·연습·발음 문장·읽기·듣기 대본 — tools/book_ex/src/v1_b*.txt·v2_b*.txt OCR, 공개 저장소에 안 올림)을 문장으로 나누고,
① 앱 문형 규칙(data/_gram_tok.json)이 각 문장에서 덮는 글자 자리를 표시한 뒤
② 기능어·문형 목록(FUNC, 아래)의 쓰임 가운데 **어느 앱 규칙에도 덮이지 않는 것**을 모은다 → 사람(클로드)이 읽고 문법인지 판단.
쓰기: python3 tools/gram_hidden/scan.py > (보고) — 결과 표는 tools/gram_hidden/_scan.tsv (교재 문장은 안 적고 과·횟수만)"""
import json, re, pathlib, collections, unicodedata as U, sys
R = pathlib.Path(__file__).resolve().parent.parent.parent
SRC = R / 'tools/book_ex/src'
L = 'A-Za-zÀ-ỹĐđ'
def wb(x): return f'(?<![{L}]){x}(?![{L}])'
VI = re.compile('[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]', re.I)
def sentences():
    out = []
    for vol in (1, 2):
        for b in range(1, 13):
            f = SRC / f'v{vol}_b{b}.txt'
            if not f.exists(): continue
            for line in f.read_text(encoding='utf-8').splitlines():
                line = U.normalize('NFC', line).strip()
                if not line or line.startswith('##') or re.search('[가-힣]', line): continue
                line = re.sub(r'^[A-ZĐa-zđ][^:：]{0,20}[:：]\s*', '', line)          # 'Vân: …' 말한 사람
                line = re.sub(r'^(\d+[.)]|[a-z][.)]|[-•])\s*', '', line)
                if len(VI.findall(line)) < 2 or len(line.split()) < 3: continue        # 베트남어 문장만 (영어 번역 줄 빼기)
                for s in re.split(r'(?<=[.?!])\s+|\s+/\s+', line):
                    if len(s.split()) >= 2: out.append((f'{vol}-{b}', s.strip()))
    return out
# 기능어·문형 목록 — 베트남어 기초~중급 문법에서 쓰이는 닫힌 낱말과 틀 (클로드가 적음). 앱 규칙이 덮지 못한 쓰임만 보고한다
FUNC = """à ạ ấy chứ đấy đây đi hả hở nhé nhỉ nha nghen mà thôi vậy thế cơ kia kìa ơi ư sao đâu chăng hen
ai gì nào mấy bao+giờ khi+nào lúc+nào bao+nhiêu bao+lâu bao+xa tại+sao vì+sao thế+nào như+thế+nào làm+sao làm+gì để+làm+gì
đã đang sẽ sắp vừa mới rồi chưa xong từng đã+từng chưa+từng vẫn còn cứ luôn hãy đừng chớ nên cần phải được bị có+thể không+thể muốn định
và với cùng nhưng hay hoặc vì nên vì+vậy vì+thế cho+nên do nhờ tại nếu thì khi lúc trước+khi sau+khi trong+khi để cho mặc+dù tuy dù nhưng+mà là rằng
sau+đó trước+đó ngoài+ra hơn+nữa thế+mà vậy+mà thế+thì vậy+thì chẳng+hạn ví+dụ nghĩa+là tức+là nói+chung thật+ra thật+sự có+lẽ chắc chắc+chắn hình+như nghe+nói
theo về đối+với so+với giống+như như bằng hơn nhất kém thua càng ngày+càng cũng đều cả tất+cả mỗi mọi những các một+số vài nhiều ít hơi khá rất lắm quá thật cực+kỳ
chẳng chả không+bao+giờ chưa+bao+giờ không+ai không+gì nữa chỉ ngay liền lập+tức xin mời làm+ơn thử xem giúp hộ giùm bảo nhờ khuyên cho+phép làm+cho khiến
có+vẻ trông hồi+nãy lúc+nãy hồi dạo+này gần+đây mãi suốt kể+từ cho+đến đến+khi cách+đây
ở tại trên dưới trong ngoài trước sau giữa bên+cạnh gần xa đối+diện ra vào lên xuống sang qua tới đến lại
nhau lẫn+nhau với+nhau cùng+nhau tự chính ngay+cả đến+cả cũng+được thế+à vậy+à ủa ơ ồ trời+ơi ôi chà
chứ+không chứ+gì thì+sao có+phải phải+không đúng+không được+không biết+không xem+nào thôi+nào đi+thôi
hết thêm luôn+luôn thường thỉnh+thoảng ít+khi hiếm+khi không+mấy+khi
nào+cũng gì+cũng ai+cũng đâu+cũng lúc+nào+cũng bao+giờ+cũng
không+những không+chỉ mà+còn cả+lẫn vừa+vừa hoặc+là hay+là đến+nỗi đến+mức quá+nên đã+lại
cho+tôi cho+em nói+là nghĩ+là thấy+là biết+là hy+vọng mong ước chúc định+là
một+chút một+ít một+lát chút+xíu""".split()
def pat(f):
    if f in ('vừa+vừa',): return r'(?<![%s])vừa(?![%s]).+?(?<![%s])vừa(?![%s])' % (L, L, L, L)
    if f == 'cả+lẫn': return wb('cả') + '.+?' + wb('lẫn')
    if f == 'không+những': return wb('không\\s+những')
    if f == 'đã+lại': return wb('đã') + '.+?' + wb('lại')
    if f == 'quá+nên': return wb('quá') + '.+?' + wb('nên')
    return wb(f.replace('+', '\\s+'))
def main():
    T = json.load(open(R / 'data/_gram_tok.json', encoding='utf-8'))['items']
    rx = [(it['id'], [re.compile(r, re.I) for r in it['re']]) for it in T if not it['always']]
    S = sentences()
    uncovered = collections.defaultdict(list); total = collections.Counter()
    for ch, s in S:
        low = s.lower()
        cov = [0] * len(low)
        for gid, rs in rx:
            for r in rs:
                for m in r.finditer(low):
                    for i in range(m.start(), m.end()): cov[i] = 1
        for f in FUNC:
            for m in re.finditer(pat(f), low, re.I):
                total[f] += 1
                if not any(cov[m.start():m.end()]): uncovered[f].append((ch, s))
    rows = sorted(uncovered.items(), key=lambda kv: -len(kv[1]))
    with open(R / 'tools/gram_hidden/_scan.tsv', 'w', encoding='utf-8') as fo:
        fo.write('기능어\t앱 규칙이 못 덮은 쓰임\t전체 쓰임\t처음 과\n')
        for f, v in rows:
            chs = sorted({c for c, _ in v}, key=lambda k: (k[0], int(k.split('-')[1])))
            fo.write(f"{f.replace('+', ' ')}\t{len(v)}\t{total[f]}\t{chs[0]}\n")
    print('문장', len(S), '· 못 덮인 기능어 종류', len(rows))
    show = int(sys.argv[1]) if len(sys.argv) > 1 else 4
    for f, v in rows:
        seen = set(); ex = []
        for c, s in v:
            if c in seen: continue
            seen.add(c); ex.append(f'{c}: {s[:80]}')
            if len(ex) >= show: break
        print(f"## {f.replace('+', ' ')} — 못 덮음 {len(v)}/{total[f]}")
        for e in ex: print('   ', e)
if __name__ == '__main__':
    main()
