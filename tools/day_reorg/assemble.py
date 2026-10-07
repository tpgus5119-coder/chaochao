# -*- coding: utf-8 -*-
"""일상 낱말 재편 — 주제·소묶음 다시 매기고 차례·세트를 다시 자른다 (2026-10-07, 대표님 "챕터 순서·챕터 안 단어 순서 근거 없음, 체크 하나하나 해").
근거: 주제 차례 = 메인 교재 1·2권 과 순서(taxonomy_v2.md) · 주제 안 = 소묶음(뜻 묶음) 차례 → 교재 첫 등장 과 → 교재 문장 등장 수 → 음절 수 → 자막 빈도.
판정: 보조(Opus) 10명 × 2차(1차 taxonomy.md · 2차 taxonomy_v2.md) → 주제 일치 3,112/3,400, 불일치 288 + 2차 확신1 46 + 둘 다 74 인 103 은 클로드가 하나하나 정함(OVERRIDE·SUB74).
쓰기: python3 tools/day_reorg/assemble.py [--write]   (안 쓰면 scratch 에 days_new.json·report.txt 만)"""
import json, re, sys, math, pathlib, collections, unicodedata
R = pathlib.Path(__file__).resolve().parent.parent.parent
SP = pathlib.Path('/private/tmp/claude-501/-Users-leesehyeon-----/d0dc869d-c57f-4a4f-b3b4-4891244877a1/scratchpad/reorg')
SET = 16
nfc = lambda s: unicodedata.normalize('NFC', s)
low = lambda s: nfc(s).lower().strip()
short = lambda s: re.sub(r'\(.*$', '', s.strip()).strip()

# ── 분류표 v2: 주제 차례·이름·소묶음 차례 ──
TOP = collections.OrderedDict(); SUBS = {}
for l in (SP / 'taxonomy_v2.md').read_text(encoding='utf-8').splitlines():
    m = re.match(r'^(\d\d) (.+?) — (.+)$', l)
    if not m: continue
    no, name, rest = m.group(1), m.group(2).strip(), m.group(3)
    TOP[no] = name
    SUBS[no] = [short(x) for x in rest.split(' / ')]
# 클로드가 더한 소묶음
ADD = {'51': ['정보·소식'], '12': ['학교 시설'], '62': [], '67': ['능력·솜씨', '정확·알맞다', '이상하다·특별하다', '그 밖의 성질'],
       '74': ['추상 명사', '변화·발전', '참여·모임·조직', '적응·낯섦', '농사·공예·특산', '종교·전설·역사', '사회·정치', '상태·모양', '문제·해결', '습관·중독', '운', '장난감·인형', '그 밖의 동사', '그 밖의 형용사', '그 밖의 명사', '부사']}
for k, v in ADD.items():
    if k == '74': SUBS[k] = v
    else: SUBS[k] = SUBS[k] + [x for x in v if x not in SUBS[k]]
KEEP = {('11', '0~10'), ('11', '11~100·백·천·만·억'), ('31', '1월~12월'), ('30', '요일')}

# ── 클로드 결정: 불일치·확신1 (vi → (주제, 소묶음)); 없으면 2차 판정 ──
OVERRIDE = {
 'tiếng Hindi': ('05', '언어 이름'), 'hoàng hôn': ('17', '아침·점심·저녁·밤·새벽'), 'thời gian biểu': ('12', '학기·학년·시간표·개강'), 'người nhận': ('59', '우체국·택배·봉투·우편번호'),
 'thông tin': ('51', '정보·소식'), 'truyền thông': ('51', '정보·소식'), 'mét vuông': ('11', '단위'), 'tờ khai': ('59', '서류·신청서·양식·서명·도장·증명사진'),
 'chổi': ('62', '청소·정리·쓸다·닦다'), 'giẻ lau': ('62', '청소·정리·쓸다·닦다'), 'đi bộ': ('24', '가다·오다·도착하다·돌아오다'), 'máy bay': ('27', '탈것'), 'sân bay': ('27', '역·정류장·공항·터미널·주유소·대기실'),
 'khu công nghiệp': ('20', '거리·골목·구역·동'), 'sảnh chung cư': ('61', '공간'), 'trung tâm': ('20', '시내·교외·도심·읍'), 'sân bóng rổ': ('65', '헬스장·운동장·코트·라켓·공'),
 'cổng trường': ('12', '학교 시설'), 'chủ đề': ('14', '글자·단어·문장·쉼표'), 'tra cứu': ('13', '배우다·외우다·복습·연습'), 'gói': ('71', '축하·선물·파티·소원'), 'dùng thử': ('45', '쇼핑 표현'),
 'bao': ('11', '세는 말'), 'bia': ('42', '술·잔·건배·취하다'), 'quốc lủi': ('42', '술·잔·건배·취하다'), 'rượu vang': ('42', '술·잔·건배·취하다'), 'chai nước': ('39', '포장·빨대·병'), 'tái': ('40', '조리법'),
 'thập cẩm': ('38', '식당 메뉴'), 'bánh chưng': ('40', '대표 음식'), 'quán': ('38', '식당·메뉴·주문·종업원'), 'cắn': ('10', '몸 움직임'), 'cơm bình dân': ('38', '식당·메뉴·주문·종업원'), 'cơm bụi': ('38', '식당·메뉴·주문·종업원'),
 'ngửi': ('10', '말하다·듣다·보다·읽다·쓰다'), 'hỏi': ('10', '말하다·듣다·보다·읽다·쓰다'), 'trả lời': ('10', '말하다·듣다·보다·읽다·쓰다'), 'sự cố': ('74', '문제·해결'), 'mỡ': ('41', '고기·생선·해산물'),
 'không được': ('08', '네·아니요'), 'cũng có thể': ('08', '맞아요·정말요·그렇군요'), 'hôn': ('55', '좋아하다·싫어하다·사랑하다·그리움'), 'tin': ('10', '알다·생각하다·이해하다·기억하다'), 'ngoại tình': ('33', '결혼하다·이혼·독신·재혼'),
 'ông chủ': ('15', '회사원·사장·직원·비서'), 'giám đốc': ('15', '회사원·사장·직원·비서'), 'chủ nhiệm': ('12', '교실·수업·반'), 'viện trưởng': ('15', '회사원·사장·직원·비서'), 'chủ quán cà phê': ('15', '회사원·사장·직원·비서'),
 'làm nội trợ': ('15', '직업 일반'), 'phó viện trưởng': ('15', '회사원·사장·직원·비서'), 'viện phó': ('15', '회사원·사장·직원·비서'), 'leo núi': ('65', '스포츠 종목'), 'tính': ('11', '셈'),
 'kỳ': ('67', '이상하다·특별하다'), 'lạ': ('67', '이상하다·특별하다'), 'đặc biệt': ('67', '이상하다·특별하다'), 'chuẩn': ('67', '정확·알맞다'), 'chính xác': ('67', '정확·알맞다'), 'rõ ràng': ('67', '정확·알맞다'), 'hợp với': ('67', '정확·알맞다'),
 'hợp lý': ('67', '정확·알맞다'), 'chính đáng': ('67', '정확·알맞다'), 'hiệu quả': ('67', '정확·알맞다'), 'thích hợp': ('67', '정확·알맞다'), 'phù hợp': ('67', '정확·알맞다'), 'ổn định': ('67', '정확·알맞다'), 'chặt chẽ': ('67', '정확·알맞다'),
 'bí': ('67', '그 밖의 성질'), 'điên': ('67', '그 밖의 성질'), 'trang trọng': ('67', '그 밖의 성질'), 'sâu sắc': ('67', '그 밖의 성질'), 'lạc hậu': ('67', '새것·낡음·가득·빈'),
 'giỏi': ('67', '능력·솜씨'), 'kém': ('67', '능력·솜씨'), 'dốt': ('67', '능력·솜씨'), 'thông thạo': ('67', '능력·솜씨'), 'khéo léo': ('67', '능력·솜씨'), 'khéo tay': ('67', '능력·솜씨'), 'thạo': ('67', '능력·솜씨'), 'khả năng': ('67', '능력·솜씨'), 'trình độ': ('67', '능력·솜씨'),
 'ngoại': ('73', '한자말 조각'), 'nội': ('73', '한자말 조각'), 'xã hội': ('74', '사회·정치'), 'điều': ('74', '추상 명사'), 'ô': ('74', '상태·모양'), 'cứ': ('36', '명령·금지 말'), 'phần': ('11', '서수·횟수·대략·합계'),
 'dẫn': ('24', '방문·마중·배웅·들르다'), 'tiêu': ('45', '사다·팔다·가격·물가'), 'chỉ cần': ('37', '만약·~하면·그렇다면'), 'nhắc': ('10', '알다·생각하다·이해하다·기억하다'), 'đổ': ('68', '비·바람·눈·폭풍·천둥·번개·무지개'),
 'đoạn': ('14', '글자·단어·문장·쉼표'), 'chiến tranh': ('74', '사회·정치'), 'chính phủ': ('74', '사회·정치'), 'hòa bình': ('74', '사회·정치'), 'an ninh': ('74', '사회·정치'), 'trung ương': ('74', '사회·정치'), 'quy hoạch': ('74', '사회·정치'),
 'tổ chức': ('74', '참여·모임·조직'), 'tham dự': ('74', '참여·모임·조직'), 'tập trung': ('13', '배우다·외우다·복습·연습'), 'kêu': ('38', '식당·메뉴·주문·종업원'), 'nghe nói': ('10', '말하다·듣다·보다·읽다·쓰다'), 'miễn': ('12', '학비·장학금·기숙사'),
 'pha': ('39', '커피·차·음료 이름'), 'nghiện': ('74', '습관·중독'), 'hút thuốc': ('74', '습관·중독'), 'đánh bạc': ('74', '습관·중독'), 'thêm nữa': ('36', '양'), 'nhân tiện': ('37', '그리고·그러나·또는·그런데'), 'tiện dịp': ('37', '그리고·그러나·또는·그런데'),
 'biến đổi': ('74', '변화·발전'), 'sự thay đổi': ('74', '변화·발전'), 'ngày một': ('74', '변화·발전'), 'dần dần': ('74', '변화·발전'), 'hi sinh': ('72', '노력·동기·시련·분투'), 'bắt buộc': ('36', '피동·사역 말'),
 'vũ trang': ('15', '의사·경찰·군인·공무원'), 'siêu nhân': ('74', '장난감·인형'), 'truyền thuyết': ('74', '종교·전설·역사'), 'biểu tượng': ('74', '종교·전설·역사'), 'đạo diễn': ('15', '예술·서비스'), 'giếng': ('74', '농사·공예·특산'),
 'gốm': ('74', '농사·공예·특산'), 'mỹ nghệ': ('74', '농사·공예·특산'), 'sơn mài': ('74', '농사·공예·특산'), 'sản vật': ('74', '농사·공예·특산'), 'đồ gốm sứ': ('74', '농사·공예·특산'), 'vải thổ cẩm': ('74', '농사·공예·특산'),
 'lưu niệm': ('43', '여행·관광·관광객·가이드'), 'phổ thông': ('05', '언어 일반'), 'khảo sát': ('16', '회사 업무'), 'tiêu thụ': ('16', '산업·경제'), 'rạng rỡ': ('66', '얼굴·피부·머리카락·주름·혈색'),
 'biểu thị': ('13', '문법 용어'), 'biển quảng cáo': ('45', '비싸다·싸다·할인·판촉'), 'láy': ('13', '문법 용어'), 'sừng sững': ('69', '땅·산·강·바다·호수·섬·숲·계곡'), 'sốc văn hóa': ('74', '적응·낯섦'),
 'nhấn mạnh cảm xúc': ('13', '문법 용어'), 'so sánh bằng': ('13', '문법 용어'), 'phòng ẩm thực': ('38', '식당·메뉴·주문·종업원'), 'cơ sở': ('74', '추상 명사'), 'ngất ngưỡng': ('74', '상태·모양'),
 'hút': ('74', '그 밖의 동사'), 'phá': ('74', '그 밖의 동사'), 'dành': ('74', '그 밖의 동사'), 'hưởng': ('74', '그 밖의 동사'), 'chặn': ('74', '그 밖의 동사'), 'mọc': ('74', '그 밖의 동사'), 'duy trì': ('74', '그 밖의 동사'),
 'thừa kế': ('74', '그 밖의 동사'), 'thủng': ('74', '그 밖의 동사'), 'ra đời': ('74', '그 밖의 동사'), 'thăm dò': ('74', '그 밖의 동사'), 'bù đắp': ('74', '그 밖의 동사'), 'tranh thủ': ('74', '그 밖의 동사'), 'tự túc đi': ('74', '부사'),
}
# 둘 다 74 인 낱말의 소묶음 (없으면 품사 → 그 밖의 동사/형용사/명사/부사)
SUB74 = {
 '추상 명사': ['đồ vật', 'vật', 'hành động', 'hoạt động', 'nguồn', 'tình trạng', 'điều kiện', 'tình huống', 'quá trình', 'cuộc sống', 'cách', 'loại', 'kiểu', 'chương trình', 'hoàn cảnh', 'thực trạng', 'chuông', 'cấp', 'hệ thống'],
 '변화·발전': ['mở rộng', 'tiến bộ', 'cải thiện', 'bước tiến', 'nâng cao', 'xu hướng', 'cải cách', 'mọc lên', 'khá lên'],
 '참여·모임·조직': ['dự', 'tham gia', 'gia nhập', 'giải tán', 'nhập hội', 'góp phần', 'đóng góp'],
 '적응·낯섦': ['xa lạ', 'thích nghi', 'hòa nhập', 'thích ứng'],
 '농사·공예·특산': ['cày', 'xẻng', 'cuốc', 'trồng trọt', 'cấy lúa'],
 '종교·전설·역사': ['tiên', 'ma', 'thượng đế', 'ông trời', 'theo đạo', 'lên ngôi'],
 '사회·정치': ['cộng đồng', 'chính sách', 'nhà nước', 'dân số', 'chính phủ số'],
 '상태·모양': ['cố định', 'rải rác', 'hình dạng', 'vòng', 'ngầm'],
 '문제·해결': ['giải pháp', 'biện pháp'],
 '운': ['rủi'],
 '장난감·인형': ['gấu bông', 'con chó bông', 'đồ chơi Việt Nam'],
 '그 밖의 동사': ['kiểm soát', 'bỏ qua', 'ghép', 'đứt', 'kết hợp', 'thu hút', 'đáp ứng', 'lưu giữ', 'mải', 'thiệt thòi'],
 '부사': ['tự', 'trực tiếp', 'nhầm', 'cố tình', 'kỹ', 'đích thân', 'tận mắt'],
}
SUB74I = {v: k for k, vs in SUB74.items() for v in vs}
POS74 = {'동사': '그 밖의 동사', '형용사': '그 밖의 형용사', '명사': '그 밖의 명사', '부사·기타': '부사'}
# 1차 소묶음 이름(옛 분류표)에서 바뀐 것 — 2차 판정을 기본으로 쓰므로 거의 안 쓰임

rows = json.load(open(SP / 'merged.json', encoding='utf-8'))
D = json.load(open(R / 'data/days.json', encoding='utf-8'))
life = sorted([d for d in D['days'] if isinstance(d.get('day'), int) and not d.get('track')], key=lambda d: d.get('n', 0))
others = [d for d in D['days'] if not (isinstance(d.get('day'), int) and not d.get('track'))]
words = [(d['theme'].split(' (')[0], d['day'], w) for d in life for w in d['words']]
assert len(words) == len(rows) == 3400

TB = json.load(open(SP / 'tb_freq.json', encoding='utf-8'))
C = json.load(open(R / 'tools/freq/sub_counts.json', encoding='utf-8'))['c']
punct = re.compile(r"[^\w\s]", re.U)
ckey = lambda s: re.sub(r'\s+', ' ', punct.sub(' ', low(s))).strip()

final = []   # (topic, sub, idx, word, oldtheme, oldkey)
bad = []
DROP = {'Bình'}          # bình thường 이 잘린 꼴 (2026-10-07 검수) — 뺀다
seen_vk = set()
for i, (r, (ot, ok, w)) in enumerate(zip(rows, words)):
    assert r['vi'] == w['vi'], (i, r['vi'], w['vi'])
    if w['vi'] in DROP: print('뺌', w['vi']); continue
    vk = (low(w['vi']), w['ko'])
    if vk in seen_vk: print('겹침 뺌', w['vi'], w['ko']); continue      # dài(길다) 둘
    seen_vk.add(vk)
    t, s = r['t2'], r['s2']
    if r['vi'] in OVERRIDE: t, s = OVERRIDE[r['vi']]
    elif t == '74': s = SUB74I.get(r['vi'], POS74.get(s, '그 밖의 명사'))
    if s == '기타': s = SUBS[t][-1] if t != '74' else '그 밖의 명사'
    if t not in TOP or s not in SUBS[t]: bad.append((r['vi'], t, s))
    final.append((t, s, i, w, ot, ok))
if bad:
    for b in bad[:40]: print('소묶음 이름 안 맞음', b)
    raise SystemExit(f'안 맞음 {len(bad)}')

# 주제별 묶기 → 소묶음 차례 → 정렬
def skey(t, s, i, w):
    if (t, s) in KEEP: return (0, 0, 0, 0, i)
    tb = TB.get(low(w['vi'])); first = tuple(tb['first']) if tb else (9, 99); n = tb['n'] if tb else 0
    return (first, -n, len(w['vi'].split()), -C.get(ckey(w['vi']), 0), i)
bytopic = collections.OrderedDict((no, []) for no in TOP)
for f in final: bytopic[f[0]].append(f)
new_days, report, contrib = [], [], collections.defaultdict(collections.Counter)
oldkeys = collections.OrderedDict()
for d in life: oldkeys.setdefault(d['theme'].split(' (')[0], []).append(d['day'])
nextkey = max(d['day'] for d in D['days'] if isinstance(d.get('day'), int)) + 1
newkey_used = 0
plans = []
for no, fs in bytopic.items():
    if not fs: continue
    name = TOP[no]
    bysub = collections.OrderedDict((s, []) for s in SUBS[no])
    for f in fs: bysub[f[1]].append(f)
    chunks = []
    for s, lst in bysub.items():
        if not lst: continue
        lst.sort(key=lambda f: skey(f[0], f[1], f[2], f[3]))
        chunks.append((s, [f[3] for f in lst]))
    # 세트 자르기 — 소묶음 경계 우선, 16 넘지 않게
    sets, cur = [], []
    for s, ws in chunks:
        if len(cur) + len(ws) <= SET: cur += ws; continue
        if cur: sets.append(cur); cur = []
        if len(ws) > SET:
            k = math.ceil(len(ws) / SET); sz = [len(ws) // k + (1 if j < len(ws) % k else 0) for j in range(k)]
            p = 0
            for z in sz[:-1]: sets.append(ws[p:p + z]); p += z
            cur = ws[p:]
        else: cur = ws
    if cur: sets.append(cur)
    if len(sets) > 1 and len(sets[-1]) < 6 and len(sets[-2]) + len(sets[-1]) <= 20: last = sets.pop(); sets[-1] += last
    for f in fs: contrib[no][f[4]] += 1
    plans.append((no, name, sets, chunks))
# 진도 열쇠: 기여한 옛 주제의 열쇠를 차례로
pools = {k: list(v) for k, v in oldkeys.items()}
n = 0
for no, name, sets, chunks in plans:
    keys = []
    for ot, _ in contrib[no].most_common():
        while pools.get(ot) and len(keys) < len(sets): keys.append(pools[ot].pop(0))
        if len(keys) >= len(sets): break
    while len(keys) < len(sets): keys.append(nextkey); nextkey += 1; newkey_used += 1
    for j, ws in enumerate(sets):
        n += 1
        new_days.append({'day': keys[j], 'theme': name + (f' ({j + 1}/{len(sets)})' if len(sets) > 1 else ''), 'n': n, 'words': ws})
    report.append(f'{no} {name} · {sum(len(s) for s in sets)}낱말 · {len(sets)}세트 · ' + ' / '.join(f'{s}({len(ws)})' for s, ws in chunks))
    report.append('     ' + ' · '.join(w['vi'] for ws in sets for w in ws)[:600])
# 소묶음 이름을 낱말에 (g)
gmap = {id(f[3]): f[1] for f in final}
for d in new_days:
    for w in d['words']: w['g'] = gmap[id(w)]
left = sum(len(v) for v in pools.values())
report.append(f'\n세트 {len(new_days)} · 낱말 {sum(len(d["words"]) for d in new_days)} · 새 열쇠 {newkey_used} · 안 쓴 옛 열쇠 {left}')
(SP / 'report.txt').write_text('\n'.join(report), encoding='utf-8')
out = dict(D); out['days'] = new_days + others
json.dump(out, open(SP / 'days_new.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
# topic_links: 옛 주제 이름 → 새 주제
tl = json.load(open(R / 'data/topic_links.json', encoding='utf-8'))
went = collections.defaultdict(collections.Counter)
for f in final: went[f[4]][TOP[f[0]]] += 1
for ch, v in tl['main'].items():
    c = collections.Counter()
    for od in v['days']:
        for nt, k in went.get(od, {}).items(): c[nt] += k
    v['days'] = [t for t, k in c.most_common() if k >= 3][:7]
json.dump(tl, open(SP / 'topic_links_new.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(report[-1])
if '--write' in sys.argv:
    json.dump(out, open(R / 'data/days.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump(tl, open(R / 'data/topic_links.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('썼음 data/days.json · data/topic_links.json')
