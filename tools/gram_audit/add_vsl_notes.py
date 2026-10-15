#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""쌤이 주신 'VSL 문법' 안내서 사진 26장(수업 자료/문법, 교보 eBook 쪽 5~58)과 앱 문법 카드를 맞대어 **빠졌던 세부 설명**을 더한다 (2026-10-15, 대표님 "수업자료-문법 폴더 확인해봐").
책 글은 옮기지 않는다 — 규칙만 우리 말로 적고 예문은 우리가 쓴다. 더한 곳: còn↔và 가르기(27.3·27.0) · mấy 의 '몇 번'(8.0) · rồi 의 '하고 나서'·'안 하면'·'sắp…rồi'(11.1) ·
rất 진술/quá 감탄/lắm 입말·quá 앞(12.3) · đấy 물음 끝=vậy·평서문 알림(38.0) · sắp 과 때 낱말(10.4) · đi đâu 의 ở 없음·đứng/ngồi/nằm(17.0) · 빈도 사다리(15.3) · được 목적어 앞뒤(19.2) ·
làm + 직업(S + là N 카드) · để 세 쓰임(24.4). 쓰기: python3 tools/gram_audit/add_vsl_notes.py → 소리 tools/gram_audit/_new_ex_vsl.json"""
import json, pathlib, sys
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools'))
from vi_kr import word as vk
def EX(vi, ko): return {'vi': vi, 'ko': ko, 'kr': vk(vi), 'krs': vk(vi, south=True)}
G = json.load(open(R / 'data/grammar.json', encoding='utf-8')); B = G['books'][0]['bai']; new_all = []
def add(id_, head, mark, note, exs):
    li, gi = id_.split('.'); g = B[int(li) - 1]['g'][int(gi)]; assert g['t'].startswith(head), (id_, g['t'])
    if mark not in g['b']: g['b'] = g['b'].rstrip() + ' ' + note
    have = {e['vi'] for e in g['ex']}; add_ = [e for e in exs if e['vi'] not in have]; g['ex'] += add_; new_all.extend(e['vi'] for e in add_)
    print(f'{id_} {g["t"][:24]} 예문 +{len(add_)} → {len(g["ex"])}')
add('27.3', 'còn — 그런데', 'và 와 가르기', 'và 와 가르기: 주어가 같거나 동사가 같으면 và(Tôi và em tôi uống cà phê · Cô ấy đẹp và thông minh), 주어도 동사도 다르면 còn(Tôi học tiếng Việt, còn vợ tôi học tiếng Anh). 이 còn 은 뒷문장 주어 <b>앞</b>에 옵니다 — 주어 뒤에 오면 \'아직\'(27.4)입니다.',
    [EX('Bố tôi đang dọn nhà, còn mẹ tôi đang nấu ăn.', '아버지는 집을 치우고 있고, 어머니는 요리하고 있어요.')])
add('27.0', 'và — 그리고', 'còn 과 가르기', 'còn 과 가르기: 주어가 같거나 동사가 같을 때만 và(다른 두 사람이 같은 일 — Tôi và em gái tôi uống cà phê / 한 사람의 두 성질 — Bạn tôi đẹp và thông minh). 주어도 동사도 다르면 còn(27.3).',
    [EX('Tôi và em gái tôi uống cà phê.', '저와 여동생은 커피를 마셔요.')])
add('8.0', 'S + V + bao nhiêu', '몇 번', '\'몇 번\'을 묻는 것(번지·호실·군·전화번호·시각)은 수가 커도 mấy 입니다: quận mấy? · phòng mấy? · mấy giờ? · số điện thoại mấy? mấy 는 명사 앞(mấy người)에, 번호를 물을 땐 명사 뒤(quận mấy)에 옵니다. bao nhiêu 는 \'얼마나 많은\'(감탄)으로도 씁니다.',
    [EX('Nhà anh ở quận mấy?', '집이 몇 군에 있어요?')])
add('11.1', 'rồi — 이미', 'A rồi B', 'A rồi B 는 \'A 하고 나서 B\'(Tôi ăn sáng rồi đi làm). 앞말이 조건이면 \'안 하면/하면 ~된다\'(Không ăn rồi lại đói — 안 먹으면 또 배고파져요). sắp … rồi 는 \'곧 ~해요\'(Sắp đến giờ học rồi). Đúng rồi·Tất nhiên rồi 처럼 끝에 붙어 \'맞아요·당연하죠\'로도 씁니다.',
    [EX('Tôi ăn sáng rồi đi làm.', '저는 아침을 먹고 나서 출근해요.'), EX('Sắp đến giờ học rồi.', '곧 수업 시간이에요.')])
add('12.3', 'rất · quá · lắm', 'quá 가 형용사 앞', 'rất 은 사실을 적는 말(진술·글), quá 는 말하는 사람의 느낌(감탄), lắm 은 입말입니다. quá 가 형용사 <b>앞</b>에 오면 \'지나치게\'(부정적): quá đắt(너무 비싸다). 부정은 không … lắm 뿐이고 không rất·không quá 는 쓰지 않습니다.',
    [EX('Món này quá đắt.', '이 음식은 지나치게 비싸요.'), EX('Cô ấy nói tiếng Việt giỏi lắm.', '그녀는 베트남어를 아주 잘해요.')])
add('38.0', 'đấy — ~거든요', '물음 끝의 đấy', '물음 끝의 đấy 는 vậy·thế·đó 와 같은 말로, 의문사 물음 뒤에 흔합니다(Anh đi đâu đấy? — 호찌민에서는 vậy). 평서문 + đấy 는 \'내 말 들어요\' — 알림·경고·확정입니다(Ông giám đốc đang đến đấy).',
    [EX('Ông giám đốc đang đến đấy.', '사장님 오고 계세요(조심해요).'), EX('Anh đang làm gì đấy?', '지금 뭐 해요?')])
add('10.4', 'sắp — 곧', '때 낱말', 'ngày mai·tháng sau 처럼 때 낱말이 있으면 sắp 대신 sẽ 를 씁니다(Tháng sau tôi sẽ về nước). sắp 은 보통 끝의 rồi 와 짝을 이룹니다(sắp … rồi).',
    [EX('Tháng sau tôi sẽ về nước.', '다음 달에 저는 귀국해요.')])
add('17.0', '~ ở đâu?', 'đi 와 쓰면', 'đi 와 쓰면 ở 를 넣지 않습니다(Anh đi đâu? — \'어디에 가요\'의 \'에\'가 있어도). 다른 동사 뒤에는 ở đâu(Anh làm việc ở đâu?). đứng·ngồi·nằm 뒤와 \'어디가 아파?\'(Em đau (ở) đâu?)에서는 ở 를 빼도 됩니다.',
    [EX('Anh làm việc ở đâu?', '어디에서 일하세요?'), EX('Em đau ở đâu?', '어디가 아파?')])
add('15.3', 'thường — 보통', '빈도 사다리', '빈도 사다리: luôn luôn(항상) > thường xuyên(자주) > thường = hay(보통·자주) > thỉnh thoảng = đôi khi(가끔) > ít khi = hiếm khi(드물게) > không bao giờ(절대 안). thường·luôn luôn 은 주어 뒤에, thỉnh thoảng·đôi khi·ít khi 는 문장 맨 앞에도 옵니다.',
    [EX('Anh ấy thường không đọc sách.', '그는 책을 잘 안 읽어요.'), EX('Thỉnh thoảng tôi đi xem phim.', '가끔 저는 영화를 보러 가요.')])
add('19.2', 'được / có thể', '목적어 앞뒤', '목적어 앞뒤 둘 다 됩니다: nói được tiếng Anh = nói tiếng Anh được(보통 목적어 앞). 못 하면 không nói được tiếng Anh = không nói tiếng Anh được.',
    [EX('Tôi nói tiếng Anh được.', '저는 영어를 할 수 있어요.')])
add('24.4', '(A) để B V', 'để 는 셋', 'để 는 셋입니다: ① để + 사람 + 동사 = ~하게 두다 / 내가 할게(Để tôi làm) ② 동사 + để + 동사 = ~하기 위해(29.4) ③ để + 물건 + ở + 곳 = ~에 두다(Tôi để sách ở trên bàn).',
    [EX('Tôi để sách ở trên bàn.', '저는 책을 책상 위에 두었어요.')])
add('4.0', 'S + là + ', 'làm 도 됩니다', '직업은 là 대신 làm 도 됩니다(Tôi làm bác sĩ = Tôi là bác sĩ — \'의사로 일해요\'). 단 làm 은 돈 버는 직업에만 — 학생은 là 만(Tôi làm sinh viên ✗).',
    [EX('Tôi làm giáo viên ở trường này.', '저는 이 학교에서 교사로 일해요.')])
json.dump(G, open(R / 'data/grammar.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
(R / 'tools/gram_audit/_new_ex_vsl.json').write_text(json.dumps(new_all, ensure_ascii=False), encoding='utf-8'); print('새 예문', len(new_all))
