"""일상 'A와 B' 주제 나누기 (2026-10-02, 대표님 "인사 따로 자기소개 따로 — 와·과로 된 챕터들 → 챕터 나누기 진행해").
주제마다 낱말을 A·B 로 가르는 시트(ds_N.json)를 만든다. 보조가 ds_N.tsv(주제⇥베트남어⇥A|B⇥까닭)로 답하고 chk.py 로 검사, apply.py 가 days.json 에 넣는다."""
import json, pathlib, collections
R = pathlib.Path(__file__).resolve().parent.parent.parent
SPLIT = {
 '인사와 자기소개': ('인사', '자기소개'), '나라와 언어': ('나라', '언어'), '가리키기와 묻기': ('가리키는 말', '묻는 말'),
 '시간과 요일': ('시간', '요일·날짜'), '때 표현과 헤어질 때 인사': ('때 표현', '헤어질 때 인사'), '인터넷과 SNS': ('인터넷', 'SNS'),
 '이메일과 파일': ('이메일', '파일'), '집 구하기와 이사': ('집 구하기', '이사'), '은행과 관공서': ('은행', '관공서'),
 '서류와 비자': ('서류', '비자'), '여행과 숙소': ('여행', '숙소'), '집과 살림': ('집', '살림'), '부엌 도구와 살림살이': ('부엌 도구', '살림살이'),
 '길과 교통': ('길', '교통'), '오고 가기와 길 묻기': ('오고 가기', '길 묻기'), '동네와 장소': ('동네', '장소'), '자연과 동물': ('자연', '동물'),
 '일과 하루': ('일', '하루'), '학교와 공부': ('학교', '공부'), '읽고 쓰기와 회사 일': ('읽고 쓰기', '회사 일'),
 '자리와 정도를 나타내는 말': ('자리를 나타내는 말', '정도·관계를 나타내는 말'), '옷과 소지품': ('옷', '소지품'), '생김새와 성질 말하기': ('생김새', '성질'),
 '식당과 카페': ('식당', '카페'), '베트남 음식과 식사': ('베트남 음식', '식사'), '약국과 병원': ('약국', '병원'), '회식과 술자리': ('회식', '술자리'),
 '마음과 맞장구': ('마음', '맞장구'), '느낌과 생각 말하기': ('느낌 말하기', '생각 말하기'), '성격과 느낌': ('성격', '기분'),
 '가족과 인간관계': ('가족', '인간관계'), '친척과 결혼': ('친척', '결혼'), '사람과 직업': ('사람', '직업'), '고향과 명절': ('고향', '명절'),
 '축하와 기념일': ('축하', '기념일'), '꿈과 노력': ('꿈', '노력'), '손과 몸의 움직임': ('손 움직임', '몸 움직임'),
 '한자말 조각과 바탕 단어': ('한자말 조각', '바탕 단어'), '감정과 의견': ('감정', '의견'),
}
if __name__ == '__main__':
    D = json.loads((R / 'data/days.json').read_text(encoding='utf-8'))
    th = collections.OrderedDict()
    for d in sorted([d for d in D['days'] if isinstance(d.get('day'), int) and not d.get('track')], key=lambda d: d.get('n', 0)):
        b = d['theme'].split(' (')[0]
        if b in SPLIT: th.setdefault(b, []).extend({'vi': w['vi'], 'ko': w['ko']} for w in d['words'])
    items = [{'theme': b, 'A': SPLIT[b][0], 'B': SPLIT[b][1], 'words': ws} for b, ws in th.items()]
    assert len(items) == len(SPLIT), set(SPLIT) - set(th)
    # 넷으로 — 낱말 수가 고르게
    groups = [[], [], [], []]; load = [0, 0, 0, 0]
    for it in sorted(items, key=lambda x: -len(x['words'])):
        k = load.index(min(load)); groups[k].append(it); load[k] += len(it['words'])
    for k, g in enumerate(groups):
        (R / f'tools/day_split/ds_{k}.json').write_text(json.dumps(g, ensure_ascii=False, indent=1), encoding='utf-8')
        print(k, len(g), '주제', load[k], '낱말')
