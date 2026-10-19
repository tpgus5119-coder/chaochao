#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""B반 21회 단어 시험지 만들기 (2026-10-19 대표님 출제 차례 — "b반 지금까지와 시험 겹치지 않게, 동일한 틀로. 출처는 내 단어장 10/16, 부족하면 10/15·10/14.
문장 문제 문법은 8과 1순위, 9과 2순위, 7과 3순위").
틀 = b20.docx (1부 베→한 20 · 2부 한→베 20 · 3부 문장 한→베 10 · 정답지) — 문서를 복제해 글만 바꾼다.
낱말: 대표님 단어장 폴더 10/16(공유 ?s=1j3jr7n) 19 + 10/15(?s=9c6ne8j) 21 — 지난 B반 20회 낱말 523개와 겹침 0 (data/daily22.json 로 검사).
문장: 메인 교재 1권 7·8·9과의 문법 예문·대화 원문(data/realbook.json) — 8과 5 · 9과 3 · 7과 2, 지난 시험 문장과 겹침 0."""
import re, zipfile, html, pathlib, sys
D = pathlib.Path.home() / '짜오짜오/원본자료/베트남어 학습자료/22기 자료/b반'
P1 = [('Tháng Giêng', '(음력) 1월, 정월'), ('năm kia', '재작년'), ('hôm kia', '그저께'), ('sang năm', '내년'), ('ngày kia', '모레'),
      ('tiếp theo', '다음, 이어서'), ('đáp', '대답하다'), ('trận', '(경기·비·재난 등의) 한 차례, 한 판'), ('xe lửa', '기차'), ('thế kỷ', '세기(100년)'),
      ('phụ đề', '자막'), ('cả nhà', '온 가족'), ('thực phẩm', '식품'), ('chăm sóc', '돌보다, 보살피다'), ('tháng trước', '지난달'),
      ('thủy thủ', '선원'), ('kiến trúc sư', '건축가'), ('phi công', '조종사, 파일럿'), ('quay phim', '촬영하다'), ('khách hàng', '고객')]
P2 = [('(날짜 앞) 초 (초하루의 초)', 'mùng / mồng'), ('언제', 'bao giờ (khi nào)'), ('표, 티켓', 'vé'), ('봄', 'xuân (mùa xuân)'), ('여름', 'hè (mùa hè)'),
      ('가을', 'thu (mùa thu)'), ('10년 (십 년)', 'thập kỷ'), ('미래', 'tương lai'), ('과거', 'quá khứ'), ('남편', 'chồng'),
      ('마중 나가다', 'đón'), ('빵, 과자', 'bánh'), ('되돌아오다', 'quay lại'), ('소방관', 'lính cứu hỏa'), ('노동자', 'công nhân'),
      ('진찰받다', 'khám bệnh'), ('지하철', 'tàu điện ngầm'), ('목수', 'thợ mộc'), ('생일', 'sinh nhật'), ('축하하다', 'chúc mừng')]
P3 = [('프랑스어 할 수 있어요?', 'Em nói tiếng Pháp được không?', '8과 được'),
      ('여기 얼마나 더 계세요?', 'Anh còn ở đây bao lâu nữa?', '8과 bao lâu'),
      ('베트남어를 배운 지 얼마 안 돼서 어렵게 느껴져요.', 'Em mới học tiếng Việt nên thấy khó.', '8과 mới · 7과 nên'),
      ('여기 앉지 마세요!', 'Chị đừng ngồi đây!', '8과 đừng'),
      ('자, 보세요!', 'Đây, chị xem đi!', '8과 đi(끝)'),
      ('여행 투어는 예약했어요?', 'Anh đã đặt tour du lịch chưa?', '9과 đã … chưa'),
      ('언제 냐짱에 가세요?', 'Bao giờ chị đi Nha Trang?', '9과 bao giờ'),
      ('곧 주말이에요!', 'Sắp cuối tuần rồi đấy.', '9과 đấy · 7과 sắp'),
      ('어제 늦게 주무셨죠?', 'Hôm qua chị thức khuya hả?', '7과 hả'),
      ('지금 저는 좀 피곤해요.', 'Bây giờ tôi hơi mệt.', '7과 hơi')]
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
    src = zipfile.ZipFile(D / 'b20.docx'); out = D / 'b21.docx'
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for it in src.infolist(): z.writestr(it, nx if it.filename == 'word/document.xml' else src.read(it.filename))
    print('만듦', out)
if __name__ == '__main__':
    main()
