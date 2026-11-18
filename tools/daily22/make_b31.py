#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""B반 31회 단어 시험지 만들기 (2026-11-12 대표님 출제 — "단어장 1순위 11/11(?s=uy4ma16) · 2순위 11/10(?s=x5kbigs) · 3순위 11/9(?s=bptaubr)에서 시험 내 주라. 단어시험 양식·기준은 전에 만든 것과 동일").
틀 = b20.docx (1부 베→한 20 · 2부 한→베 20 · 3부 문장 한→베 10 · 정답지) — make_b30.py 와 같은 방법(문서를 복제해 글만 바꿈).
낱말: 11/11 53개 중 지난 B반 30회 낱말 759개(data/daily22.json)와 안 겹치는 43 → 다의어(dưới·tính·vừa·mốt) 빼고 같은 뜻 둘(gồm/bao gồm·tiền thối/tiền thừa)은 하나만 = 37,
      + 11/10 에서 같은 쇼핑 과 낱말 3(chất lượng·hàng thủ công·cà vạt) = 40. 11/9 는 쓰지 않음. 답이 둘 이상인 말(áo thun·quần bò·tiền thừa·váy·bao gồm)은 베→한 쪽에.
문장: 단어장이 메인 교재 2권 3과(Anh thường mua sắm ở đâu? — 단위명사·thôi·쇼핑)라 b30 처럼 3과 6 · 2과 3 · 1과 1, 문법 예문 원문(data/realbook.json), 지난 A·B반 시험 문장과 겹침 0."""
import re, zipfile, html, pathlib, sys
D = pathlib.Path.home() / '짜오짜오/원본자료/베트남어 학습자료/22기 자료/b반'
P1 = [('mặc cả', '흥정하다'), ('nói thách', '값을 실제보다 비싸게 부르다'), ('như thế nào', '어떻게'), ('ủa', '어?, 어머? (놀람)'), ('bớt', '(값을) 깎다, 줄이다'),
      ('đòi', '요구하다'), ('bao gồm', '포함하다'), ('mặt hàng', '품목, 상품'), ('túi', '봉지, 가방'), ('áo thun', '티셔츠'),
      ('hợp lý', '합리적이다'), ('hợp với', '~에 어울리다, ~에 맞다'), ('kiểu', '스타일, 모양'), ('quần bò', '청바지'), ('váy', '치마, 원피스'),
      ('tiền thừa', '거스름돈'), ('pha lê', '크리스털'), ('lon', '캔'), ('mang theo', '가지고 가다, 지니다'), ('sau đó', '그 다음에')]
P2 = [('100그램(무게 단위)', 'lạng'), ('판촉, 할인 행사', 'khuyến mãi'), ('튼튼하다, 오래가다', 'bền'), ('슬리퍼, 샌들', 'dép'), ('광고', 'quảng cáo'),
      ('칫솔', 'bàn chải đánh răng'), ('스포츠, 운동', 'thể thao'), ('마지막으로, 결국', 'cuối cùng'), ('수건, 스카프', 'khăn'), ('고기', 'thịt'),
      ('메뉴', 'thực đơn'), ('스웨터, 니트', 'áo len'), ('겉옷, 재킷', 'áo khoác'), ('폴로 셔츠', 'áo pô lô (áo polo)'), ('두껍다', 'dày'),
      ('정장, 양복 한 벌', 'bộ vest (bộ com lê)'), ('정장 바지', 'quần tây (quần âu)'), ('품질', 'chất lượng'), ('수공예품', 'hàng thủ công'), ('넥타이', 'cà vạt')]
P3 = [('저는 소고기 1킬로를 샀어요.', 'Tôi mua một kí thịt bò.', '2권 3과 단위명사'),
      ('저는 맥주 두 병을 마셨어요.', 'Tôi đã uống hai chai bia.', '2권 3과 단위명사'),
      ('그 옷 하나도 안 싸요.', 'Cái áo đó không rẻ đâu.', '2권 3과 không … đâu'),
      ('베트남에서 저는 버스만 타요.', 'Ở Việt Nam tôi chỉ đi xe buýt thôi.', '2권 3과 chỉ … thôi'),
      ('그녀는 공부를 잘할 뿐만 아니라 마음씨도 좋아서 모두가 좋아해요.', 'Cô ấy không những học giỏi mà còn tốt bụng nên ai cũng thích.', '2권 3과 không những … mà còn'),
      ('이 편지 다시 써 주세요!', 'Anh viết lại bức thư này đi!', '2권 3과 V + lại'),
      ('저희 아버지는 올해 80세이신데 여전히 건강하세요.', 'Bố tôi năm nay 80 tuổi nhưng vẫn khỏe mạnh.', '2권 2과 vẫn'),
      ('자동차가 오토바이보다 더 빨리 달려요.', 'Xe hơi chạy nhanh hơn xe máy.', '2권 2과 hơn'),
      ('란 씨는 음식을 사러 시장에 나가요.', 'Chị Lan đi ra chợ mua thức ăn.', '2권 2과 ra'),
      ('그는 밥을 먹으면서 TV를 봐요.', 'Anh ấy vừa ăn cơm vừa xem tivi.', '2권 1과 vừa … vừa')]
def interleave(L):                      # 1,11,2,12,… 차례 (두 단 표)
    out = []
    for i in range(10): out += [(i + 1, L[i]), (i + 11, L[i + 10])]
    return out
def main():
    x = zipfile.ZipFile(D / 'b20.docx').read('word/document.xml').decode()
    paras = re.findall(r'<w:p[ >].*?</w:p>', x, flags=re.S)
    new = {}
    for k, (n, (q, a)) in zip(range(4, 24), interleave(P1)): new[k] = f'{n}. {q}'
    for k, (n, (q, a)) in zip(range(24, 44), interleave(P2)): new[k] = f'{n}. {q}'
    for i, (q, a, g) in enumerate(P3): new[44 + 2 * i] = f'{i + 1}. {q}'
    k = 67
    for n, (q, a) in interleave(P1): new[k] = f'{n}. {q}'; new[k + 1] = a; k += 2
    k = 108
    for n, (q, a) in interleave(P2): new[k] = f'{n}. {q}'; new[k + 1] = a; k += 2
    for i, (q, a, g) in enumerate(P3): new[149 + i] = f'{i + 1}. {q} → 정답: {a}'
    def put(p, t):
        ts = list(re.finditer(r'(<w:t)([^>]*)>([^<]*)</w:t>', p))
        out, last = [], 0
        for j, m in enumerate(ts):
            out.append(p[last:m.start()])
            out.append(f'<w:t xml:space="preserve">{html.escape(t, quote=False)}</w:t>' if j == 0 else '<w:t></w:t>')
            last = m.end()
        out.append(p[last:]); return ''.join(out)
    pos = 0; buf = []
    for i, p in enumerate(paras):
        st = x.index(p, pos); buf.append(x[pos:st]); buf.append(put(p, new[i]) if i in new else p); pos = st + len(p)
    buf.append(x[pos:]); nx = ''.join(buf)
    src = zipfile.ZipFile(D / 'b20.docx'); out = D / 'b31.docx'
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for it in src.infolist(): z.writestr(it, nx if it.filename == 'word/document.xml' else src.read(it.filename))
    print('만듦', out)
if __name__ == '__main__':
    main()
