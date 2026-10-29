#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""B반 30회 단어 시험지 만들기 (2026-10-29 대표님 출제 — "오늘 배운 단어(단어장 10/29 ?s=xib9pmy), 이전 b반 시험 단어와 겹치지 않게, 부족하면 10/28(?s=xs0spqa) 2순위·10/27(?s=z7gvbl6) 3순위.
문장 만들기 문법은 11단원 1순위, 10단원 2순위, 9단원 3순위").
틀 = b20.docx (1부 베→한 20 · 2부 한→베 20 · 3부 문장 한→베 10 · 정답지) — make_b21.py 와 같은 방법(문서를 복제해 글만 바꿈).
낱말: 10/29 34개 중 안 겹치는 21 + 10/28 7 + 10/27 12 = 40, 지난 B반 29회 낱말 749개와 겹침 0(data/daily22.json). 같은 뜻 둘(trạm/bến xe buýt)은 하나만, 다의어(lên·bài·theo·nằm)는 뺌.
문장: 메인 교재 1권 11·10·9과 문법 예문 원문(data/realbook.json) — 11과 6 · 10과 3 · 9과 1, 지난 A·B반 시험 문장과 겹침 0."""
import re, zipfile, html, pathlib, sys
D = pathlib.Path.home() / '짜오짜오/원본자료/베트남어 학습자료/22기 자료/b반'
P1 = [('điều', '것, 사항'), ('làm cho', '~하게 만들다'), ('tuy nhiên', '그러나, 하지만'), ('một số', '몇몇의, 일부'), ('đối với', '~에 대해, ~에게 있어서'),
      ('tự do', '자유로운'), ('vì vậy', '그래서, 그렇기 때문에'), ('cách', '방법'), ('sang', '(다른 쪽·것으로) 넘어가다, ~으로'), ('tuyến', '노선'),
      ('phổ biến', '널리 퍼진, 보편적인'), ('hết giờ', '시간이 다 되다'), ('rủ', '(같이 하자고) 권하다'), ('chắc là', '아마 ~일 것이다'), ('riêng', '개인의, 자기만의'),
      ('định', '~할 예정이다, ~하려고 하다'), ('bất tiện', '불편한'), ('mắng', '꾸짖다'), ('phức tạp', '복잡하다'), ('đúng giờ', '시간에 맞게, 정각에')]
P2 = [('교통', 'giao thông'), ('빌리다, 세내다', 'thuê'), ('편리한', 'tiện lợi'), ('뛰다, 달리다', 'chạy'), ('위험한', 'nguy hiểm'),
      ('안전, 안전한', 'an toàn'), ('산', 'núi'), ('식탁', 'bàn ăn'), ('섬', 'đảo'), ('성(행정 구역)', 'tỉnh'),
      ('도서관', 'thư viện'), ('지상철(고가 전철)', 'tàu điện trên cao'), ('시외버스, 고속버스', 'xe khách'), ('침대', 'giường'), ('앱, 애플리케이션', 'ứng dụng'),
      ('우비', 'áo mưa'), ('멈추다', 'dừng'), ('헬멧', 'mũ bảo hiểm'), ('버스 정류장', 'trạm xe buýt (bến xe buýt)'), ('졸업하다', 'tốt nghiệp')]
P3 = [('이제 그는 다시 예매할 거예요.', 'Bây giờ anh ấy sẽ đặt lại.', '11과 lại'),
      ('그녀는 그 노래를 다시 듣고 싶어 해요.', 'Chị ấy muốn nghe lại bài hát đó.', '11과 lại'),
      ('택시를 타고 가면 공항에 더 빨리 도착할 거예요.', 'Nếu đi bằng tắc xi thì em sẽ đến sân bay nhanh hơn.', '11과 nếu … thì'),
      ('오토바이를 타는 건 하나도 위험하지 않아요.', 'Đi bằng xe máy không nguy hiểm đâu.', '11과 không … đâu'),
      ('어제부터 지금까지 여전히 비가 와요.', 'Trời vẫn mưa từ hôm qua đến giờ.', '11과 vẫn'),
      ('아직도 쎄옴(오토바이 택시)을 타고 다니세요?', 'Chị vẫn đi bằng xe ôm à?', '11과 vẫn'),
      ('그의 집은 회사에서 꽤 멀어요.', 'Nhà anh ấy khá xa công ty.', '10과 khá'),
      ('우리는 함께 조부모님을 뵈러 가요.', 'Chúng tôi cùng đi thăm ông bà.', '10과 cùng'),
      ('저희 부모님은 당연히 아직 일하시죠.', 'Bố mẹ tôi còn làm việc chứ.', '10과 chứ'),
      ('그 고객은 좀 까다로워요.', 'Người khách hàng đó hơi khó tính đấy.', '9과 đấy')]
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
    src = zipfile.ZipFile(D / 'b20.docx'); out = D / 'b30.docx'
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for it in src.infolist(): z.writestr(it, nx if it.filename == 'word/document.xml' else src.read(it.filename))
    print('만듦', out)
if __name__ == '__main__':
    main()
