#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""B반 32회 단어 시험지 만들기 (2026-11-18 대표님 출제 — "?s=5f4t25p(단어장 11/17) 단어로 단어시험 만들어줘. 양식 동일하게").
틀 = b20.docx (1부 베→한 20 · 2부 한→베 20 · 3부 문장 한→베 10 · 정답지) — make_b30·b31 과 같은 방법(문서를 복제해 글만 바꿈).
낱말: 11/17 160개 중 지난 B반 낱말(daily22.json B 30회 + b31, 799개)과 안 겹치는 131 → 기능어·뜻 여럿(thì·mà·cho·nó·ơi·qua·hồi·luôn·chiếc·giải·vai·thân·ô·dù 등)과
      같은 뜻 둘(thi đậu/thi đỗ/đỗ·mặc dù/tuy·quyết/quyết định·mơ ước/ước mơ·sân khấu/sân khấu kịch)은 하나만 → 40. 카드 뜻 'kỷ niệm 기념일'은 교재 쓰임(대학 시절의 추억)대로 '추억, 기념'.
문장: 단어장이 메인 교재 2권 4과(전화)·5과(몸·병)라 5과 6 · 4과 3 · 3과 1, 문법 예문 원문(data/realbook.json), 지난 A·B반 시험·b31 문장과 겹침 0."""
import re, zipfile, html, pathlib, sys
D = pathlib.Path.home() / '짜오짜오/원본자료/베트남어 학습자료/22기 자료/b반'
P1 = [('cấp cứu', '응급(구조)'), ('thắc mắc', '궁금한 점, 문의'), ('đầu dây', '전화선 저쪽, 수화기 너머'), ('bắt máy', '전화를 받다'), ('cúp máy', '전화를 끊다'),
      ('hứa', '약속하다'), ('chắc chắn', '확실히, 틀림없이'), ('giải đáp', '답해 주다, 풀이해 주다'), ('mơ ước', '꿈꾸다, 바라다'), ('tập trung', '집중하다'),
      ('quyết định', '결정하다'), ('ngắm', '바라보다, 감상하다'), ('kỷ niệm', '추억, 기념'), ('lưu lại', '저장하다, 간직하다'), ('sử dụng', '사용하다'),
      ('phàn nàn', '불평하다'), ('đa dạng', '다양한'), ('bỏ cuộc', '포기하다'), ('liên lạc', '연락하다'), ('tình huống', '상황')]
P2 = [('고객센터, 콜센터', 'tổng đài'), ('연극', 'kịch'), ('충전기', 'cục sạc'), ('문자를 보내다', 'nhắn tin'), ('배터리가 다 되다', 'hết pin'),
      ('시험에 합격하다', 'thi đậu (thi đỗ)'), ('시험에 떨어지다', 'thi trượt'), ('비밀번호', 'mật khẩu'), ('다운로드하다', 'tải'), ('입술', 'môi'),
      ('이마', 'trán'), ('눈썹', 'lông mày'), ('손톱', 'móng tay'), ('발가락', 'ngón chân'), ('무릎', 'đầu gối'),
      ('넘어지다', 'ngã'), ('콧물이 나다', 'sổ mũi'), ('알레르기', 'dị ứng'), ('구역질 나다', 'buồn nôn'), ('담배', 'thuốc lá')]
P3 = [('비가 오지만 남은 그래도 학교에 가요.', 'Mặc dù trời mưa nhưng Nam vẫn đi học.', '2권 5과 mặc dù … nhưng'),
      ('그는 아직 직업이 없지만 저는 그와 결혼할 거예요.', 'Mặc dù anh ấy chưa có việc làm nhưng tôi sẽ lấy anh ấy.', '2권 5과 mặc dù … nhưng'),
      ('란은 이틀째 감기에 걸려 있어요.', 'Hai hôm nay Lan bị cảm.', '2권 5과 … nay'),
      ('그분은 보름째 입원해 계세요.', 'Nửa tháng nay ông ấy nằm bệnh viện.', '2권 5과 … nay'),
      ('남은 숙제를 안 해서 선생님께 벌을 받았어요.', 'Nam bị cô giáo phạt vì không làm bài tập.', '2권 5과 bị'),
      ('일요일에 남은 학교에 안 가도 돼서 늦잠을 잘 수 있어요.', 'Chủ nhật Nam được ngủ nướng, vì không phải đi học.', '2권 5과 được'),
      ('운동을 하면 할수록 더 건강해져요.', 'Anh càng chơi thể thao thì càng khỏe.', '2권 4과 càng … càng'),
      ('제 베트남어 실력이 날이 갈수록 좋아지고 있어요.', 'Tiếng Việt của tôi càng ngày càng tốt.', '2권 4과 càng ngày càng'),
      ('그의 가족 모두 붕따우에 갔어요.', 'Cả nhà anh ấy đã đi Vũng Tàu.', '2권 4과 cả'),
      ('그녀가 저에게 바게트빵 세 개를 사 줬어요.', 'Cô ấy đã mua cho tôi ba ổ bánh mì.', '2권 3과 단위명사')]
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
    src = zipfile.ZipFile(D / 'b20.docx'); out = D / 'b32.docx'
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for it in src.infolist(): z.writestr(it, nx if it.filename == 'word/document.xml' else src.read(it.filename))
    print('만듦', out)
if __name__ == '__main__':
    main()
