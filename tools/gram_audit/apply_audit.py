# -*- coding: utf-8 -*-
"""문법 46과 260문형 검증 보고(Opus 보조 셋, 2026-10-07 scratchpad/reorg/audit_gram_A·B·C.md) 가운데 클로드가 맞다고 확인한 것을 data/grammar.json 에 적용.
원칙: 문형을 지우거나 끼워 넣지 않는다(규칙.tsv·_gram_ch.json 의 '과.번' 이 밀린다) — 글·예문·kw·tip 만 고친다.
새 예문의 한글 발음은 vi_kr, 소리는 tools/gen_audio_list.py 로. 적용 뒤 tools/gram_tok/build.py 로 규칙 자가 검사.
쓰기: python3 tools/gram_audit/apply_audit.py [--write]"""
import json, re, sys, pathlib
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools')); import vi_kr
G = json.load(open(R / 'data/grammar.json', encoding='utf-8'))
bai = G['books'][0]['bai']
LOG, MISS, NEWVI = [], [], []
def it(li, j): return bai[li]['g'][j]
def sub(li, j, f, old, new, must=True):
    x = it(li, j); v = x.get(f, '')
    if old in v: x[f] = v.replace(old, new); LOG.append(f'{li}.{j} {f} sub')
    elif must: MISS.append(f'{li}.{j} {f} 없음: {old[:40]}')
def setf(li, j, f, new): it(li, j)[f] = new; LOG.append(f'{li}.{j} {f} set')
def app(li, j, f, add): x = it(li, j); x[f] = (x.get(f, '') + (' ' if x.get(f) else '') + add); LOG.append(f'{li}.{j} {f} +')
def mkex(vi, ko): NEWVI.append(vi); return {'vi': vi, 'ko': ko, 'kr': vi_kr.word(vi), 'krs': vi_kr.word(vi, south=True)}
def ex_find(li, j, vi):
    for i, e in enumerate(it(li, j)['ex']):
        if e['vi'] == vi or e['vi'].rstrip('.!?') == vi.rstrip('.!?'): return i
    return -1
def ex_set(li, j, vi_old, vi=None, ko=None):
    i = ex_find(li, j, vi_old)
    if i < 0: MISS.append(f'{li}.{j} 예문 없음: {vi_old}'); return
    e = it(li, j)['ex'][i]
    if vi and vi != e['vi']: e.update(mkex(vi, ko or e['ko']))
    elif ko: e['ko'] = ko
    LOG.append(f'{li}.{j} ex set')
def ex_del(li, j, vi_old):
    i = ex_find(li, j, vi_old)
    if i < 0: MISS.append(f'{li}.{j} 예문 없음(삭제): {vi_old}'); return
    del it(li, j)['ex'][i]; LOG.append(f'{li}.{j} ex del')
def ex_add(li, j, vi, ko): it(li, j)['ex'].append(mkex(vi, ko)); LOG.append(f'{li}.{j} ex add')
def kw_set(li, j, word, new):
    for k in it(li, j).get('kw') or []:
        if k[0] == word: k[1] = new; LOG.append(f'{li}.{j} kw {word}'); return
    MISS.append(f'{li}.{j} kw 없음: {word}')
def kw_del(li, j, word):
    x = it(li, j); n = len(x.get('kw') or []); x['kw'] = [k for k in (x.get('kw') or []) if k[0] != word]
    if len(x['kw']) == n: MISS.append(f'{li}.{j} kw 삭제 없음: {word}')
def kw_add(li, j, word, mean): x = it(li, j); x.setdefault('kw', []).append([word, mean])
def rm_sent(li, j, f, pat):   # pat 가 든 문장(마침표 단위) 지우기
    x = it(li, j); v = x.get(f, '')
    parts = re.split(r'(?<=[.다요음!])\s+(?=[^\s])', v)
    keep = [p for p in parts if not re.search(pat, p)]
    if len(keep) == len(parts): MISS.append(f'{li}.{j} {f} 문장 없음: {pat}'); return
    x[f] = ' '.join(keep).strip(); LOG.append(f'{li}.{j} {f} rm')

# ───────── A (0~15) ─────────
sub(0,1,'b','입을 다물지 않는', '입을 벌린', must=False); app(0,1,'b','단, o·ô·u 뒤(ong·ông·ung)에서는 끝에 입술을 살짝 다뭅니다.')
ex_set(2,0,'Cháu chào ông.', 'Cháu chào ông ạ.')
sub(2,0,'b','같은 말을 인사 뒤에 붙이면 존댓말이 됩니다','호칭을 붙이면 예의 바른 인사가 되고, 윗사람께는 끝에 ạ 까지 붙입니다', must=False)
ex_set(2,1,'Anh là kỹ sư.', ko='(동생에게) 나는 엔지니어야.')
sub(2,3,'tip',"'우리'는 다음 과에서 배웁니다","'우리'는 바로 다음 항목 — chúng tôi·chúng ta", must=False)
sub(2,4,'b','5과에서 나옵니다','바로 다음 항목에 나옵니다', must=False)
for j,x in enumerate(bai[3]['g']):
    if 'của' in x['t']: sub(3,j,'b','가족·몸처럼 뗄 수 없는 것은 của를 빼고','가족·친구·집·반처럼 가까운 관계는 của 를 흔히 빼고(mẹ tôi, bạn tôi, lớp tôi)')
    if x['t'].startswith('có'): sub(3,j,'b','과거의 행동을 묻고 답할 때는 có를 꼭 씁니다',"지난 일을 có … không? 으로 물을 수 있고, 대답의 có + 동사는 '정말 했다'는 강조입니다"); sub(3,j,'tip','có를 빼지 마세요',"có + 동사 = '정말 ~했다'는 강조", must=False)
    if 'thế nào' in x['t']: setf(3,j,'k','주어 + thế nào?(어때요) · 주어 + 동사 + thế nào?(어떻게)')
for j,x in enumerate(bai[4]['g']):
    if x['t'].startswith('có') and 'không' in x['t'] and 'phải' not in x['t']: sub(4,j,'tip','không … không 처럼 부정어가 앞에 붙습니다','Không, tôi không + 동사 로 답합니다', must=False)
    if 'thế nào' in x['t']: setf(4,j,'k','주어 + thế nào?(어때요) · 주어 + 동사 + thế nào?(어떻게)')
ex_set(5,0,'Tôi biết anh ấy, chị ạ.', 'Em biết anh ấy, chị ạ.')
for j,x in enumerate(bai[5]['g']):
    if 'vậy' in x['t']:
        setf(5,j,'t','… vậy / thế? — ~예요? (구어)'); app(5,j,'b','물음 끝의 vậy 는 말을 부드럽고 구어답게 합니다. 북부 입말에서는 같은 자리에 thế 도 흔히 씁니다(Đi đâu thế?).'); sub(5,j,'tip','(9과)','(38과)', must=False)
    if 'hả' in x['t']: sub(5,j,'tip','ạ·không으로 바꾸세요','… phải không ạ? 로 바꾸세요', must=False)
    if 'nhỉ' in x['t']: sub(5,j,'b','hả · há · hê로 바꿔 쓸 수도 있습니다','입말에서 nhể 로도 소리 나고, 남부에서는 há·ha 를 씁니다', must=False)
    if 'dạ' in x['t']: sub(5,j,'b','남부는 Dạ, 북부는 Vâng이 흔함','dạ 는 남북 모두 공손한 대답, vâng 은 북부에서 많이 씀', must=False)
for j,x in enumerate(bai[6]['g']):
    if '11' in x['t'] or 'trăm' in x.get('b',''): app(6,j,'b','101 = một trăm linh một(남부 lẻ một), 105 = một trăm linh năm.'); break
for j,x in enumerate(bai[6]['g']): sub(6,j,'b','hai bốn 도 됨','hai mươi bốn 도 됨', must=False)
for j,x in enumerate(bai[7]['g']):
    for e in x['ex']:
        if e['vi'].startswith('Một cân bao nhiêu'): e['ko'] = '1킬로에 얼마예요?'; LOG.append('7 cân ko'); kw_add(7,j,'cân','1kg(입말)')
    sub(7,j,'k','mấy = 1~10 · bao nhiêu = 10 넘게','mấy = 작은 수(아이) · bao nhiêu = 어른·큰 수', must=False)
sub(8,0,'b','반드시 붙입니다','보통 붙입니다. 다만 người·ngày·năm·lần 처럼 그 자체가 단위인 명사에는 붙이지 않습니다(hai người, ba ngày)')
ex_set(8,0,'một trái xoài', 'Một quả xoài.', None) if ex_find(8,0,'một trái xoài')>=0 else None
for e in it(8,0)['ex']:
    if 'trái xoài' in e['vi']: e.update(mkex(e['vi'].replace('trái xoài','quả xoài'), e['ko'])); LOG.append('8.0 trái→quả')
sub(8,0,'b','ly · chén · tô · trái · ký','cốc 잔 · bát 그릇 · quả 개(열매) · cân 킬로(남부 ly · chén·tô · trái · ký)', must=False)
kw_set(8,0,'ly','잔(남부; 북부 cốc)') if any(k[0]=='ly' for k in it(8,0).get('kw') or []) else None
rm_sent(8,1,'tip','골라서')
for e in list(it(8,1)['ex']):
    if e['vi'].startswith('Những'): it(8,1)['ex'].remove(e); LOG.append('8.1 những ex del')
sub(8,3,'b','(bao nhiêu는 안 씀)','(많을 것 같으면 bao nhiêu)', must=False)
sub(8,4,'b','명사 앞에 단어를 배치합니다','수 앞에 놓습니다', must=False); rm_sent(8,4,'b','상황에 따라')
ex_set(8,4,'Đợi khoảng năm phút nhé.', ko='5분쯤 기다려 줘요.')
ex_set(9,0,'Tôi đã ăn cơm.', 'Tôi đã ăn cơm rồi.'); app(9,0,'b','끝남은 흔히 … rồi 와 함께 말합니다(11과).')
for j,x in enumerate(bai[9]['g']):
    if x['t'].startswith('sắp'): sub(9,j,'b','때가 없으면 sẽ는 비교적 먼 미래, sắp은 가까운 미래입니다.',"sẽ 는 가깝든 멀든 앞일 전체에, sắp 은 '곧(임박)'에 씁니다.")
    if 'mới' in x['t']: app(9,j,'b','mới + 동사 + 기간 은 "겨우 ~밖에 안 됐다"(Em mới học tiếng Việt một tháng.)')
def dedupe_tip(li,j):
    x=it(li,j); t=x.get('tip','')
    if ' · ' in t:
        seen=[]; [seen.append(p) for p in t.split(' · ') if p not in seen]; x['tip']=' · '.join(seen)
for li in (10,14):
    for j in range(len(bai[li]['g'])): dedupe_tip(li,j)
for j,x in enumerate(bai[10]['g']):
    if 'xong' in x['t']: sub(10,j,'b','동사 바로 뒤에 붙여 쓰며','동사 뒤(목적어가 있으면 목적어 뒤에도: làm xong bài tập / làm bài tập xong)에 쓰며', must=False)
    sub(10,j,'b',"'rồi'을","'rồi'를", must=False)
    if x['t'].startswith('lâu'): ex_set(10,j,'Gặp nhau lâu rồi nhỉ.','Lâu rồi không gặp nhỉ!','오랜만이네요!')
    if x['t'].startswith('rồi'):
        for e in x['ex']:
            if e['ko'].endswith('한 달이나 됐어요.'): e['ko']='베트남어 배운 지 한 달 됐어요.'; LOG.append('10 rồi ko')
    if x['t'].startswith('lần'):
        for e in x['ex']:
            if e['vi'].startswith('Tôi ăn ở đó mấy lần'): e['ko']='저 거기서 몇 번 먹어 봤어요.'; LOG.append('10 lần ko')
        sub(10,j,'tip','시간 길이는 tiếng·giờ','시간 길이는 tiếng(격식 글에서는 giờ 도)', must=False)
    rm_sent(10,j,'b','일터에서') if '일터에서' in x.get('b','') else None
for j,x in enumerate(bai[11]['g']):
    sub(11,j,'b','주로 글말에서 씁니다','말·글 어디서나 씁니다(lắm·quá 는 주로 입말)', must=False)
    sub(11,j,'b','부정문에서는 lắm만 쓸 수 있습니다','부정문에는 rất 을 못 씁니다 — không … lắm 또는 không quá + 형용사', must=False)
    sub(11,j,'tip','앞에 놓으면 rất, 뒤에 놓으면 quá·lắm — 자리로 외우세요','rất 은 앞, lắm 은 뒤, quá 는 뒤(감탄)·앞(지나치게)', must=False)
    if x['t'].startswith('quá'): app(11,j,'b','quá 는 형용사 앞에도 옵니다 — quá đắt(지나치게 비싸다).')
    if x['t'].startswith('hơi'):
        for e in x['ex']:
            if 'hơi trễ' in e['vi']: e.update(mkex(e['vi'].replace('hơi trễ','hơi muộn'), e['ko'])); LOG.append('11 hơi trễ→muộn')
        kw_set(11,j,'trễ','늦다') if any(k[0]=='trễ' for k in x.get('kw') or []) else None
        for k in x.get('kw') or []:
            if k[0]=='trễ': k[0]='muộn'
        app(11,j,'b','주로 아쉬운 성질과 씁니다(hơi đắt, hơi mệt).')
    sub(11,j,'b','무조건 큰 쪽의 단어을 써서','보통 큰 쪽 말로 물어서(cao bao nhiêu, dài bao nhiêu)', must=False); sub(11,j,'b','단어을','단어를', must=False)
for j,x in enumerate(bai[12]['g']):
    rm_sent(12,j,'b','숫자 뒤에 단위를 순서대로') if '숫자 뒤에 단위를 순서대로' in x.get('b','') else None
    sub(12,j,'b','시각을 나타내는 숫자 뒤에 씁니다','lúc 은 시각 앞에 붙고(lúc 5 giờ), lúc + 시각 은 문장 끝이나 맨 앞에 옵니다', must=False)
    rm_sent(12,j,'tip','동사 앞에 lúc') if '동사 앞에 lúc' in x.get('tip','') else None
    sub(12,j,'b','항상 숫자 뒤에 써야','보통 시각 뒤에 써서(7 giờ sáng)', must=False); rm_sent(12,j,'tip','시각 앞에 쓰지 마세요') if '시각 앞에 쓰지 마세요' in x.get('tip','') else None
    for e in x['ex']:
        if e['vi']=='Anh học tiếng Việt bao lâu?': e.update(mkex('Anh học tiếng Việt bao lâu rồi?', e['ko'])); LOG.append('12 bao lâu rồi')
    rm_sent(12,j,'b','일터에서') if '일터에서' in x.get('b','') else None
for j,x in enumerate(bai[13]['g']):
    if '요일' in x['t']: app(13,j,'b','수요일은 thứ tư(thứ bốn 아님)이고, thứ một 은 없습니다.')
    if x['t'].startswith('날짜'): app(13,j,'b',"1~10일은 입말에서 mồng(북)/mùng(남)을 붙입니다(mồng 2 tháng 9). 'Hôm nay ngày mấy?' 도 흔한 물음입니다.")
    for k in x.get('kw') or []:
        if k[0]=='một' and k[1]=='일': k[1]='1(하나)'; LOG.append('13 kw một')
    if x['t'].startswith('vào'):
        ex_set(13,j,'Vào ngày mai tôi đi công tác.','Ngày mai tôi đi công tác.','내일 저는 출장을 가요.')
        sub(13,j,'tip','생략 가능합니다','보통 붙이지 않습니다(hôm nay·ngày mai·tuần sau)', must=False)
for j,x in enumerate(bai[14]['g']):
    for e in x['ex']:
        if e['vi'].startswith('Nước suối bao nhiêu'): e.update(mkex('Nước lọc bao nhiêu tiền?', e['ko'])); LOG.append('14 nước lọc')
        if e['vi'].startswith('Bình thường thì'): e.update(mkex('Thường thì tôi dậy lúc sáu giờ.', '보통 저는 6시에 일어나요.')); LOG.append('14 thường thì')
    sub(14,j,'tip','모두 동사 앞에 옵니다 · 반드시 동사 앞에 쓰세요','대개 동사 앞에 오고, thỉnh thoảng 은 문장 맨 앞·끝에도 옵니다', must=False)
    sub(14,j,'tip','4과의 빈도부사표','바로 앞 빈도부사 표', must=False)
    for k in x.get('kw') or []:
        if k[0]=='lúc nào' and k[1]=='언제나': k[0]='lúc nào cũng'
    sub(14,j,'tip','뒤에는 반드시 동사','뒤에 동사·형용사가 옵니다', must=False); sub(14,j,'b','주어 뒤에 배치','주로 주어 뒤에 두고 문장 맨 앞도 됩니다', must=False)
    rm_sent(14,j,'b','겸손하게') if '겸손하게' in x.get('b','') else None
for j,x in enumerate(bai[15]['g']):
    sub(15,j,'b',"한국어처럼 모두 '쓰다'나 '하다'로 퉁칠 수 없으니","한국어와 짝이 다릅니다 — 안경은 '쓰다'지만 đeo, 모자는 đội 이니", must=False)
    rm_sent(15,j,'b','외모를 먼저') if '외모를 먼저' in x.get('b','') else None; rm_sent(15,j,'tip','외모를 먼저') if '외모를 먼저' in x.get('tip','') else None
    for e in x['ex']:
        if e['vi']=='Cô ấy tóc dài và thấp.': e.update(mkex('Cô ấy thấp, tóc dài.', e['ko'])); LOG.append('15 tóc dài')
# ───────── B (16~30) ─────────
rm_sent(16,0,'tip','물음표만'); 
i=ex_find(16,0,'Đến công ty đi thế nào?')
if i>=0: del it(16,0)['ex'][i]; ex_add(16,1,'Từ đây đến công ty đi thế nào?','여기서 회사까지 어떻게 가요?')
sub(16,2,'k','(안 보이는) 거기','거기(듣는 사람 쪽·앞서 말한 곳)', must=False); setf(16,2,'tip','상대 쪽이나 앞서 말한 곳은 đó(북부 đấy), 둘 다에게서 먼 곳은 kia 입니다.')
app(16,3,'b','베트남 안에서 북쪽으로 가면 ra(ra Hà Nội), 남쪽으로 가면 vào(vào Sài Gòn)이라고 합니다.')
kw_set(16,5,'về','돌아가다·돌아오다')
sub(17,1,'tip','도착지 앞에는 sang을 꼭 써주세요.','건너가거나 다른 곳으로 옮길 때는 đến 대신 sang 을 씁니다.', must=False)
setf(17,2,'tip','đi + 탈것은 bằng 없이(đi xe máy), 다른 동사 뒤에서는 bằng(đi làm bằng xe máy).'); kw_set(17,2,'bằng','~로(재료·수단·도구)')
for e in it(17,4)['ex']:
    if e['vi'].startswith('Đến 12 giờ đêm'): e['ko']='밤 12시가 돼서야 집에 왔어요.'
setf(17,5,'b','cách đây + 거리 = 여기서 ~ 떨어져(Công ty cách đây 2 km) / cách đây + 기간 = ~ 전(cách đây một năm). cách 는 "떨어지다", đây 는 "여기·지금"이라 거리와 시간 둘 다 됩니다.'); setf(17,5,'tip','cách đây 뒤에 거리나 기간을 넣습니다.')
ex_set(17,5,'Nhà tôi cách đây xa không?','Nhà anh cách đây có xa không?','집이 여기서 먼가요?')
ex_set(17,5,'Cách đây một năm tôi đi làm.','Cách đây một năm tôi bắt đầu đi làm.','1년 전에 일을 시작했어요.')
sub(17,6,'b','기간 앞에 쓰면 그 시간 내내를 뜻하고',"기간 앞에 쓰면 '~동안(내내)' 또는 '~안에(기한)'를 뜻하고", must=False); kw_set(17,6,'có','있다(존재)')
for e in it(17,6)['ex']:
    if 'máy lạnh' in e['vi']: e.update(mkex(e['vi'].replace('máy lạnh','điều hòa'), e['ko'])); LOG.append('17.6 điều hòa')
for k in it(17,6).get('kw') or []:
    if k[0]=='máy lạnh': k[0]='điều hòa'
sub(17,7,'tip','khi 뒤에 동사 없이 명사를 써도 괜찮습니다.','명사 앞에서는 khi 를 뺍니다: trước bữa ăn, sau Tết.', must=False)
sub(18,2,'b','동사나 형용사 뒤에 붙여','một chút·giỏi 는 동사구 뒤(nói tiếng Việt một chút), khá·rất 은 형용사 앞(khá tốt)에 붙여', must=False); sub(18,2,'b','한국어처럼 문장 끝에','', must=False)
ex_del(18,3,'Anh Brian không nói được tiếng Hàn.')
sub(18,5,'tip','동사 뒤에 붙여야 자연스럽습니다.','nào 는 명사 바로 뒤에 옵니다: món nào, giờ nào.', must=False); app(18,5,'k','· 동사구 + cũng được — ~해도 괜찮다')
sub(19,0,'b',"'안 해야 한다'는 표현보다 '할 필요 없다(không cần)'를 훨씬 많이 씁니다",'không phải + 동사 = 안 해도 된다 / không cần + 동사 = 할 필요 없다 / không được + 동사 = 하면 안 된다', must=False)
ex_set(19,2,'Trời lạnh nên mặc áo ấm.','Trời lạnh, anh nên mặc áo ấm.','추우니까 따뜻하게 입는 게 좋아요.')
setf(19,3,'t','nên/cần + A + chứ không nên/cần + B — B 말고 A'); setf(19,3,'b','해야 할 것과 하지 말 것을 맞대어 말할 때 씁니다: B 말고 A. 뒤 절의 không cần 은 "할 필요 없다"이지 금지가 아닙니다.'); sub(19,3,'tip','chứ를 빼먹으면 의미가 안 통하니 꼭 넣으세요.','chứ 를 넣으면 대비가 또렷해집니다.', must=False)
for e in it(19,3)['ex']:
    if e['vi'].startswith('Cần đọc chứ không cần viết'): e['ko']='읽기만 하면 되고 쓸 필요는 없어요.'
kw_set(20,0,'đi','(문장 끝) ~해요·~하자')
ex_set(20,1,'Khi nào điện thoại này hư anh hãy mua.','Khi nào điện thoại này hỏng thì anh hãy mua.')
for k in it(20,1).get('kw') or []:
    if k[0]=='hư': k[0]='hỏng'; k[1]='고장 나다'
ex_set(20,4,'Trời vẫn mưa.','Trời cứ mưa mãi.','비가 자꾸 와요.'); app(20,4,'b','② 자꾸(고집스레) 계속 ~하다: Nó cứ khóc mãi.')
sub(21,3,'b',"'~하면 안 돼'나 '~할라'","'안 그러면 ~할라', '~하지 않게'", must=False)
sub(21,5,'b','처음 만나는 동료나 윗사람에게 말할 때 가장 좋은 정중한 표현','모르는 사람에게 부탁할 때(길 묻기·택시)에 맞는 말이고, 말투에 따라 다급하게 들릴 수 있습니다. 안내문·서면의 정중한 말은 vui lòng', must=False)
kw_set(21,5,'cho','cho + 사람 + 동사 — ~하게 해 주다')
sub(21,6,'b','**상대방의 허락을 받는 상황**','<b>상대방의 허락을 받는 상황</b>', must=False); sub(21,6,'t','Xin phép + cho + 동사','(주어) xin phép (+ 사람) + 동사', must=False)
ex_set(21,6,'Xin phép cho tôi ra ngoài.','Cho tôi xin phép ra ngoài một chút.','잠깐 나가도 될까요?')
sub(22,1,'b','구체적인 의지','~할 생각(계획)', must=False); sub(22,1,'tip','định은 개인의 결심','định = ~하려고 한다(계획). 하려다 못 한 일에도: định … nhưng …', must=False)
sub(22,2,'b','한국어와 달리 동사 뒤에',"한국어 '-해 보다'처럼 동사 뒤에", must=False)
sub(22,3,'tip','사양할 때 꼭 쓰이는 표현입니다.','칭찬·감사에 겸손하게 답할 때도 씁니다(격식). 일상에서는 Không có gì.', must=False)
sub(22,4,'tip',"뒤에 'rồi'을 꼭",'뒤에 rồi 를 붙이거나(quen … rồi) đã quen 으로', must=False)
kw_set(23,3,'hộ','(대신) ~해 주다')
sub(24,0,'b','베트남어는 주어와 동사 사이에 고정해서 씁니다',"동사 앞에 두면 '다 같이 ~하다', 동사 뒤의 cùng (với) + 사람 은 '~와 함께'(다음 항목)입니다", must=False)
sub(24,1,'b','더 정중하고','더 또렷하고', must=False)
ex_del(24,2,'Cho tôi đi với!'); ex_del(24,2,'Tôi đi với anh ấy.'); rm_sent(24,2,'tip',"đi với")
setf(24,3,'t','동사 + (대명사) + với — 좀 ~해 줘요'); setf(24,3,'b','부탁 끝에 với 를 붙여 간절함을 더하거나 재촉합니다: Giúp tôi với! (좀 도와줘요) · Đợi tôi với! (좀 기다려 줘요). "나도 끼워 줘요"는 Cho tôi đi với! 입니다.')
ex_set(24,3,'Cho tôi làm cùng với!','Cho tôi làm với!','저도 같이 하게 해 줘요!')
sub(24,4,'b','항상 동사 바로 뒤에','보통 동사 뒤(yêu nhau)에 오고, với nhau·lẫn nhau·cùng nhau 꼴도 흔하게', must=False); sub(24,4,'tip','항상 동사 바로 뒤에','보통 동사 뒤에', must=False)
ex_set(24,5,'Anh ấy nấu lấy.','Anh ấy tự nấu ăn lấy.','그는 스스로 요리해요.')
for e in it(25,1)['ex']:
    if '일찍 와야 합니다' in e['ko']: e['ko']=e['ko'].replace('일찍 와야 합니다','일찍 가야 합니다')
for e in it(26,1)['ex']:
    if 'còn bệnh' in e['vi']: e.update(mkex(e['vi'].replace('còn bệnh','còn ốm'), e['ko'])); LOG.append('26.1 ốm')
for k in it(26,1).get('kw') or []:
    if k[0]=='bệnh': k[0]='ốm'; k[1]='아프다'
for e in it(26,3)['ex']:
    v=e['vi']; v2=v.replace('giống cha','giống bố').replace('thì mắc','thì đắt').replace('đi trễ','đi muộn')
    if v2!=v: e.update(mkex(v2, e['ko'])); LOG.append('26.3 북부')
for k in it(26,3).get('kw') or []:
    if k[0]=='mắc': k[0]='đắt'; k[1]='비싸다'
sub(26,5,'tip','대화의 흐름을 바꿀 때 꼭 써보세요.','상대 말을 받아 결론·제안을 할 때 씁니다.', must=False)
if '구분하여 사용해야 합니다' in it(26,6).get('b',''): setf(26,6,'b',"hay 와 hoặc 은 둘 다 '또는'입니다. 물음에는 반드시 hay 를 쓰고(Anh uống trà hay cà phê?), 평서문에는 hoặc(글·격식)이나 hay(말) 둘 다 씁니다.")
sub(26,7,'tip','한국어와 달리 và 가 낱말 사이에 들어갑니다','và 는 와/과 구분 없이 늘 같은 꼴입니다', must=False)
sub(27,0,'b','주어가 둘 이상이어야 합니다.','đều 앞에 놓인 말(주어, 또는 앞으로 뺀 목적어)이 둘 이상이어야 합니다.', must=False)
sub(27,2,'b','동사나 명사 뒤에 놓으며','동사 뒤, 또는 명사·수량 앞에 놓으며', must=False)
ex_set(27,3,'Tôi làm việc hết rồi.','Tôi làm hết việc rồi.'); app(27,3,'b','xong 은 동작을 끝내는 것, hết 은 남김없이 다 쓰는 것입니다(ăn hết = 다 먹어 치움).')
setf(27,5,'b',"동사 뒤에 쓰면 '즉시'(làm ngay), 장소·때 말 앞에 쓰면 '바로 그'(ngay cạnh, ngay bây giờ)입니다.")
setf(28,0,'k','Vì sao / Tại sao / Sao + 문장?'); setf(28,0,'b',"'왜'를 묻는 세 말은 모두 문장 앞에 옵니다. sao 가 가장 입말이고, 끝에 vậy/thế 를 붙이면 부드러워집니다(Sao anh không đến vậy?)."); setf(28,0,'tip',"문장 끝의 sao 는 '왜'가 아니라 놀람·반문입니다: Anh không biết sao? (몰랐단 말이에요?)")
for e in it(28,1)['ex']:
    if e['vi'].startswith('Vì mệt nên tôi nghỉ làm'): e['ko']='피곤해서 일을 쉬어요.'
    if 'ăn sáng trễ' in e['vi']: e.update(mkex(e['vi'].replace('ăn sáng trễ','ăn sáng muộn'), e['ko'])); LOG.append('28.1 muộn')
setf(28,1,'tip','Vì A nên B / A nên B / B vì A 세 꼴 모두 됩니다.')
ex_set(28,2,'Bởi bận nên tôi đến muộn.','Bởi vì bận nên tôi đến muộn.'); app(28,2,'b',"가장 흔한 '왜냐하면'은 bởi vì · tại vì 입니다: Tại vì trời mưa nên tôi ở nhà.")
app(28,3,'b','② do + 사람 + 동사 = ~가 한(행위자): Việc này do tôi làm.'); sub(28,3,'b',"원인과 결과 사이에 'nên'을 꼭 넣습니다",'보통 nên 으로 잇습니다', must=False)
ex_del(28,3,'Do mưa nên hoãn.'); ex_set(28,3,'Do trời mưa nên hoãn.','Do trời mưa nên trận đấu bị hoãn.','비 때문에 경기가 미뤄졌어요.')
sub(29,0,'t','Nhờ … thì / mà …','Nhờ … mà / nên …', must=False); sub(29,0,'k','thì / mà','mà / nên', must=False)
sub(30,0,'b',"'thì'를 잊지 말고 꼭 붙여야 합니다",'thì 는 빼도 되지만 넣으면 조건과 결과가 또렷해집니다', must=False); sub(30,0,'tip','thì를 생략하지 않는 것이 포인트','thì 는 빼도 됩니다(Nếu chị không sợ, tôi sẽ …)', must=False)
for e in it(30,0)['ex']:
    if 'đi bằng xe máy' in e['vi'] and 'tập cho' in e['vi']: e.update(mkex(e['vi'].replace('đi bằng xe máy','đi xe máy'), e['ko'])); LOG.append('30.0 đi xe máy')
sub(30,2,'b','둘 중 하나를 내놓습니다.','앞말대로 하지 않으면 뒷일이 생긴다는 뜻입니다(= nếu không thì). kẻo 보다 중립적입니다.', must=False)
# (31~35과는 보조 C 보고가 1부터 센 번호라 1을 뺐다 — 36~45는 0부터)
# ───────── C (31~45) ─────────
ex_set(31,0,'Hễ cần là tôi sẽ giúp.','Hễ anh cần gì thì cứ gọi tôi.','뭐든 필요하기만 하면 저를 부르세요.')
sub(31,0,'b','문장 맨 앞과 중간','문장 맨 앞 또는 주어 바로 뒤', must=False); sub(31,1,'b','‘Cứ’는 문장 맨 앞에','cứ 는 문장 맨 앞이나 주어 뒤에', must=False)
ex_set(31,1,'Cứ đến công ty là làm việc.','Cứ đến cuối tháng là tôi hết tiền.','월말만 되면 돈이 떨어져요.')
setf(31,2,'t','phải chi / ước gì / giá mà — ~라면 좋을 텐데 · ~했더라면'); app(31,2,'b',"지난 일의 아쉬움뿐 아니라 지금·앞날의 소망('~면 좋겠다')에도 씁니다. giá mà · giá như 도 같은 뜻입니다.")
for e in it(31,2)['ex']:
    if e['vi'].startswith('Ước gì lương'): e['ko']='월급이 더 많이 오르면 좋겠어요.'
kw_set(31,2,'Phải chi','~했더라면, ~라면 좋을 텐데') if any(k[0]=='Phải chi' for k in it(31,2).get('kw') or []) else None
setf(31,3,'k','Lẽ ra + (주어) + phải/nên + 동사'); app(31,3,'tip',"'원래는 ~하기로 돼 있었다'(기대)에도 씁니다: Lẽ ra giờ này anh ấy phải đến rồi.")
for e in it(32,1)['ex']:
    if e['vi']=='Anh thích cái này hơn cái kia.': e['ko']='저것보다 이것이 더 좋아요.'
setf(32,2,'tip','như 는 비교 대상 바로 앞에 옵니다: (형용사/동사) + như + B'); setf(32,2,'k','A + (형용사/동사) + như + B')
setf(32,5,'k','ra·lên(커짐·늘어남) / đi(줄어듦·약해짐) / lại(오그라듦·되돌아옴)'); setf(32,5,'tip','좋은 쪽은 ra·lên, 나쁜 쪽은 đi 가 많지만 규칙은 아닙니다(béo ra 살이 쪘다).')
ex_set(32,5,'Công việc ít lại.','Ngày ngắn lại rồi.','해가 짧아졌어요.')
sub(32,9,'k','bằng (như)','bằng/như', must=False); ex_set(32,9,'Tiếng Nhật khó hơn tiếng Anh.','Tiếng Anh không khó bằng tiếng Nhật.','영어는 일본어만큼 어렵지 않아요.')
sub(33,2,'b','비슷한 상태를 부정할 때',"두 상태를 모두 부정할 때 — 흔히 반대말 짝으로 '딱 중간'임을 말할 때", must=False)
for e in it(33,3)['ex']:
    e['ko']=e['ko'].replace('똑똑할','유능할').replace('힘들 ','어려울 ').replace('힘들뿐','어려울 뿐')
ex_set(33,4,'Cả nhà lẫn xe đều mất.','Cả tiền lẫn điện thoại đều bị mất.','돈도 전화기도 다 잃어버렸어요.'); rm_sent(33,4,'tip','복습')
ex_set(33,6,'Trừ chủ nhật, tuần nào tôi cũng đi làm.','Trừ chủ nhật, ngày nào tôi cũng đi làm.','일요일만 빼고 매일 출근해요.')
sub(34,0,'tip','chỉ와 thôi를 꼭 세트로 쓰세요.',"함께 쓰면 '딱 그것뿐' 느낌이 강해집니다(따로 써도 됩니다).", must=False)
setf(34,2,'k','동사 + có + 수량 (+ thôi)'); setf(34,2,'ex',[mkex('Tôi ngủ có bốn tiếng thôi.','겨우 네 시간 잤어요.'), mkex('Nó ăn có một bát cơm.','걔는 밥을 겨우 한 그릇 먹었어요.'), mkex('Chỉ có mười nghìn.','겨우 만 동이에요.')])
sub(34,3,'b','수량을 나타내는 명사 바로 앞','숫자 바로 앞', must=False)
ex_set(34,4,'Chỉ học mới khá tiếng Việt.','Chỉ có chăm học thì tiếng Việt mới khá lên được.','열심히 공부해야만 베트남어가 늘어요.')
setf(34,5,'b',"때 + mới + 동사 = 그제야(생각보다 늦게): Mười giờ anh ấy mới đến. (10시가 되어서야 왔어요) · Đến bây giờ tôi mới biết. (이제야 알았어요). '방금' 뜻의 mới 는 10과에 있습니다.")
setf(34,5,'ex',[mkex('Mười giờ anh ấy mới đến.','10시가 되어서야 그가 왔어요.'), mkex('Đến bây giờ tôi mới biết.','이제야 알았어요.'), mkex('Tám giờ cửa hàng mới mở.','8시가 돼야 가게가 열어요.')])
ex_set(35,0,'Tất cả nhân viên.','Tất cả nhân viên đều đi họp.','모든 직원이 회의에 가요.')
app(35,4,'b','① 저마다 다름(Mỗi người một ý) ② 하나씩(Mỗi người một cái) 두 뜻이 있습니다.')
for e in it(35,4)['ex']:
    if 'máy lạnh' in e['vi']: e.update(mkex(e['vi'].replace('một máy lạnh','một cái điều hòa'), e['ko'])); LOG.append('35.5 điều hòa')
ex_add(36,0,'Đi đâu cũng thấy xe máy.','어딜 가도 오토바이가 보여요.')
setf(36,2,'tip','nào 와 ấy(nấy)가 짝입니다. 명사는 같아도(món nào món ấy) 달라도(tiền nào của ấy) 됩니다. 속담에서는 흔히 nấy 를 씁니다.'); rm_sent(36,2,'b','두 번 반복'); rm_sent(36,2,'b','업무 중')
setf(36,3,'b',"đâu … đấy 는 '~하는 곳(거기)'에, bao nhiêu … bấy nhiêu 는 '~하는 만큼'에 씁니다. 짝을 문장 앞뒤에 나누어 놓습니다.")
ex_set(36,3,'Đi đâu thì về đấy.','Anh đi đâu, em theo đấy.','당신이 가는 곳이면 어디든 따라가요.'); ex_set(36,3,'Nói bao nhiêu hiểu bấy nhiêu.','Biết bao nhiêu nói bấy nhiêu.','아는 만큼 말해요.')
ex_set(36,4,'Tôi cần việc nào đó.','Tôi cần một công việc nào đó.','어떤 일이 필요해요.'); ex_set(36,4,'Ngày nào đó gặp nhau.','Một ngày nào đó mình gặp lại nhé.','언젠가 다시 만나요.'); ex_set(36,4,'Người nào đó đang đợi.','Có ai đó đang đợi anh.','누군가 당신을 기다리고 있어요.')
setf(36,4,'tip',"묻는 말 nào(어느?)와 달리 nào đó 는 '어떤 ~(정해지지 않은)'입니다.")
app(37,1,'b',"물음 끝에 붙이면 '~죠?'(그렇다고 믿고 확인)입니다: Anh khỏe chứ?"); ex_set(37,1,'Tất nhiên rồi chứ!','Chứ sao!','당연하죠!')
setf(37,2,'tip',"동사 앞에서는 phải 없이 'chứ không + 동사'도 됩니다: Tôi đi chơi chứ không đi làm.")
ex_set(37,3,'Dạ, em hiểu chứ ạ.','Anh biết tiếng Việt chứ? — Biết chứ!','베트남어 할 줄 알죠? — 알죠!')
sub(37,4,'b','쓰임새가 완벽히 같으며',"비슷하며('~다니까요'로도 옮겨지며)", must=False)
setf(37,5,'tip','mà 는 빼도 됩니다(입말에서는 빼는 쪽이 흔함). 꾸밈이 길 때 넣으면 경계가 분명해집니다.'); sub(37,5,'b','항상 명사 뒤에 붙여서','명사 뒤에 붙여서', must=False)
app(38,0,'tip',"· 'Tôi không đi đâu.'는 '안 갈래요'와 '아무 데도 안 가요' 둘 다 될 수 있습니다.")
kw_set(38,1,'có','(강조)'); kw_set(38,2,'thế','(물음 끝) ~요?')
sub(38,2,'b','끝에 ‘thế’를 붙여 놀람이나 당혹스러운 감정을 더 강하게 표현합니다','물음 끝 thế 는 부드럽게 묻는 말투(vậy 와 같음)이고, Cái gì thế này? 는 눈앞의 것에 놀랄 때 씁니다', must=False)
app(39,0,'tip','· được + 동사(하게 되다)와 동사 + được(할 수 있다, 19과)은 자리가 다릅니다: Tôi được nghỉ / Tôi nghỉ được.')
setf(39,2,'kw',[['đỡ','덜하다·나아지다'],['đau','아프다'],['mệt','피곤하다']]); setf(39,2,'tip',"đỡ 는 나쁜 상태(đau·mệt·sốt·buồn)를 덜 때만 씁니다 — đỡ khỏe ×. 'Tôi đỡ rồi'(좀 나았어요)도 흔합니다."); ex_add(39,2,'Anh đỡ chưa? — Tôi đỡ nhiều rồi.','좀 나아졌어요? — 많이 나았어요.')
app(40,0,'b','tuy 도 mặc dù 와 같습니다(조금 글말).'); ex_set(40,0,'Tuy nhà xa nhưng tôi không muộn.','Tuy nhà xa nhưng tôi không bao giờ đi muộn.','집이 멀지만 저는 한 번도 늦은 적이 없어요.')
setf(40,1,'b',"같은 방향의 두 성질·일이 겹칠 때 씁니다 — '~한 데다 ~까지'. 불평에 자주 쓰지만 좋은 성질에도 씁니다: Chợ ấy đã rẻ lại gần. (그 시장은 싸고 게다가 가까워요)"); setf(40,1,'tip','둘 다 좋거나 둘 다 나쁜 두 가지를 겹칠 때 씁니다.'); kw_del(40,1,'đã'); ex_add(40,1,'Chợ ấy đã rẻ lại gần.','그 시장은 싸고 게다가 가까워요.')
sub(41,0,'b','문장 맨 앞에 둡니다','문장 맨 앞이나 주어 바로 뒤에 둡니다', must=False); sub(41,0,'tip',"문장 끝에 'không'을 붙여 의문문으로 만들 수 있습니다.","물음은 끝에 ', phải không?'을 붙입니다.", must=False)
setf(41,1,'tip','입말에서는 chắc hẳn 이 더 흔합니다.')
sub(41,2,'b','문장 중간에 주어를 사이에 두고','주어는 thế nào 앞이나 뒤에 오고', must=False); setf(41,2,'tip','Thế nào … cũng 을 짝으로 씁니다.')
setf(41,3,'tip','')
kw_set(41,5,'chắc là','아마(~일 거예요)'); setf(41,5,'tip',"hình như 는 보고 느낀 근거로 짐작, có lẽ·chắc là 는 '아마'. '틀림없이'는 chắc chắn 입니다.")
for e in it(41,5)['ex']:
    if e['vi']=='Có lẽ không.': e['ko']='아마 아닐 거예요.'
ex_set(42,0,'Nóng đến nỗi không muốn đi.','Trời nóng đến nỗi tôi không muốn ra ngoài.','밖에 나가기 싫을 만큼 더워요.')
app(42,1,'tip','· một cách 는 보통 두 음절 형용사와 씁니다(một cách cẩn thận).')
for e in it(42,3)['ex']:
    if e['vi'].startswith('Không có ai tốt bụng'): e['ko']='그녀만큼 마음씨 좋은 사람은 없어요.'
setf(42,4,'t','A + không + 형용사 + bằng + B — ~만큼 ~하지 않다'); setf(42,4,'k','A + không + 형용사/동사 + bằng + B'); setf(42,4,'b','A 가 B 만큼은 ~하지 않다는 비교입니다(bằng 앞에 không). 33과의 bằng 비교와 짝입니다.'); setf(42,4,'tip','긍정 비교는 A + 형용사 + bằng + B(33과).')
setf(43,2,'t','không thể A nếu không B — ~하지 않고는 ~할 수 없다'); setf(43,2,'k','không thể + A + nếu không + B  ·  không thể + A + mà không + B'); setf(43,2,'b','조건이 없으면 결과도 없다는 뜻입니다. không thể A nếu không B, 또는 không thể A mà không B(~하지 않고서는) 로 말합니다.'); setf(43,2,'tip','mà không + 동사 = ~하지 않고(서)')
setf(43,2,'ex',[mkex('Không thể giỏi nếu không luyện tập.','연습하지 않고는 잘할 수 없어요.'), mkex('Không thể hiểu nếu không hỏi.','묻지 않고는 이해할 수 없어요.'), mkex('Không thể thành công mà không cố gắng.','노력하지 않고서는 성공할 수 없어요.')])
setf(43,2,'kw',[['không thể','할 수 없다'],['nếu không','~하지 않으면'],['mà không','~하지 않고서']])
setf(43,3,'t','không thể A nếu thiếu + 명사 — ~가 없으면 ~할 수 없다'); setf(43,3,'k','không thể + 동사 + nếu thiếu + 명사'); setf(43,3,'tip',"thiếu 는 '모자라다·없다'는 동사입니다.")
for e in it(43,3)['ex']:
    if ' mà nếu thiếu ' in e['vi']: e.update(mkex(e['vi'].replace(' mà nếu thiếu ',' nếu thiếu '), e['ko']))
setf(43,3,'kw',[['không thể','할 수 없다'],['nếu thiếu','~가 없으면']])
setf(43,4,'t','không chê vào đâu được — 나무랄 데 없다'); setf(43,4,'k','không (thể) chê vào đâu được'); setf(43,4,'b',"굳은 말로, '흠잡을 데가 없다'는 칭찬입니다. '도저히 못 ~하겠다'는 뜻이 아닙니다 — 그것은 không thể + 동사 + được(19과)."); setf(43,4,'tip','칭찬할 때 씁니다.'); setf(43,4,'kw',[['chê','흠잡다·나무라다'],['vào đâu được','어디에도(~할 데가)']])
setf(43,4,'ex',[mkex('Món này ngon không chê vào đâu được.','이 요리는 나무랄 데 없이 맛있어요.'), mkex('Cô ấy làm việc không chê vào đâu được.','그녀는 일을 흠잡을 데 없이 해요.')])
sub(43,5,'b','nổi는 체력적으로 힘이 닿는지','nổi 는 힘·형편·마음이 닿는지(mua không nổi 살 형편이 안 됨)', must=False); setf(43,5,'tip','주로 부정·물음에 씁니다(Anh làm nổi không?).')
setf(44,0,'t','chẳng/chả … là gì — ~하잖아요 (반어)'); setf(44,0,'b',"북부 입말의 반어 표현 — 부정 꼴로 당연함을 강조합니다: '~하잖아요, ~하고말고'. chả 는 chẳng 의 입말입니다."); setf(44,0,'kw',[['chẳng','안(입말 chả)'],['là gì','~잖아(반어)']])
setf(44,0,'ex',[mkex('Đi bộ cả ngày, chẳng mệt là gì!','하루 종일 걸었는데 안 피곤하겠어요(당연히 피곤하죠)!'), mkex('Nó chả bảo thế là gì.','걔가 그렇게 말했잖아.')])
setf(44,1,'tip','글말·격식 표현입니다. 입말은 không phải để A mà là để B.'); ex_set(44,1,'Không nhằm trốn mà là để nghỉ.','Tôi nói vậy không phải để phê bình mà là để giúp anh.','제가 이렇게 말하는 건 비판하려는 게 아니라 당신을 도우려는 거예요.')
rm_sent(44,1,'b','문장의 중간에'); rm_sent(44,2,'b','면접이나'); setf(44,2,'tip',"앞에 Không phải chỉ vì 를 쓰면 뒤는 mà còn (là) vì 로 받습니다(34과 không những … mà còn 의 '이유'판).")
sub(45,0,'tip','상대방 이름 뒤에 ạ를 붙여','문장 끝에 ạ 를 붙여', must=False)
sub(45,1,'b','상대방에게 의향을 물을 때 Mời + 대상 + 동사 순서로 말합니다','권할 때 Mời (+ 사람) + 동사 로 말합니다', must=False); setf(45,1,'tip','사람을 넣으면 더 정중합니다(Mời vào! 처럼 사람 없이도 씁니다).')
sub(45,4,'k','통째로 외우는 다섯 마디','통째로 외우는 여섯 마디', must=False); sub(45,4,'b','슬라이드의 ‘유용한 표현’: ','', must=False)
# 남부 낱말 (31~45 예문)
for li in range(31,46):
    for x in bai[li]['g']:
        for e in x['ex']:
            v=e['vi']; v2=re.sub(r'\bxe hơi\b','ô tô',v); v2=re.sub(r'\bngàn\b','nghìn',v2); v2=v2.replace('máy lạnh','điều hòa').replace('ly bia','cốc bia').replace('như cha tôi','như bố tôi')
            if v2!=v: e.update(mkex(v2,e['ko'])); LOG.append(f'남부→북부 {v[:30]}')
# ** → <b>, kw 정리(자리표시·예문에 없는 낱말)
PH={'A','B','주어','동사','형용사/동사','문장','S','X','Y'}
nkw=0
for li,b in enumerate(bai):
    for j,x in enumerate(b['g']):
        if '**' in x.get('b',''): x['b']=re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', x['b']); LOG.append(f'{li}.{j} ** → b')
        txt=(' '.join(e['vi'] for e in x['ex'])+' '+x.get('b','')+' '+x.get('k','')+' '+x['t']).lower()
        kw=x.get('kw') or []
        keep=[k for k in kw if k[0] not in PH and k[0].lower() in txt]
        if len(keep)!=len(kw): nkw+=len(kw)-len(keep); x['kw']=keep
LOG.append(f'kw 뺌 {nkw}')
print('적용', len(LOG), '· 못 찾음', len(MISS))
for m in MISS: print('  MISS', m)
print('새 예문', len(NEWVI))
if '--write' in sys.argv:
    json.dump(G, open(R / 'data/grammar.json','w',encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump(NEWVI, open(R / 'tools/gram_audit/_aud_new.json','w',encoding='utf-8'), ensure_ascii=False)
    print('썼음')
