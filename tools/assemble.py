#!/usr/bin/env python3
"""준비 3일 + 일상 20일(하루 단어 10 + 대화 2문장)을 days.json 으로.
검증: 단어 중복 / 문장에 아직 안 배운 낱말 / 모든 단어가 어딘가 문장에 나오는가"""
import json, pathlib, re, sys, collections, unicodedata

def slug(vi):
    """베트남어 → 부호 없는 파일이름 (cảm ơn → cam-on). 그림 파일 이름에 쓴다."""
    s = unicodedata.normalize('NFD', vi)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return s.replace('đ','d').replace('Đ','d').lower().replace(' ','-')
sys.path.insert(0,'tools')
from visuals import attach
R = pathlib.Path('.')
p1 = json.loads((R/'data/_part1.json').read_text())
days = []
for f in ['_b1','_b2','_b3','_b4','_w1','_w2','_b5','_w3','_w4']:
    days += json.loads((R/f'data/{f}.json').read_text())['days']

out = {"meta": {"version":"v4",
                "voices":{"f":"vi-VN-HoaiMyNeural","m":"vi-VN-NamMinhNeural"},
                "track":"일상 기초 (완전 초보)",
                "note":"북부 표준. 하루 = 단어 10개 + 주고받는 대화 2문장 = 1세트."},
       "prep": p1["prep"], "tonedrill": p1["tonedrill"], "days": days}

SCENE = {1:"👋",2:"🪪",3:"🌏",4:"😊",5:"❓",6:"🚪",7:"🔢",8:"📦",9:"🕐",10:"📅",
         11:"⏰",12:"🍜",13:"🛒",14:"🗺️",15:"👨‍👩‍👧",16:"🏥",17:"🙏",18:"👍",19:"⏳",20:"🤞"}
for d in out["days"]:
    used = set()
    for w in d["words"]:
        attach(w)
        # 구체어(이모지가 붙는 단어)만 그림 파일 자리를 준다. img/ 에 파일을 넣으면 그걸 보여준다.
        if w.get("emoji"):
            s = slug(w["vi"])                      # 부호를 떼면 겹칠 수 있다 (đau/đầu → dau)
            if s in used: s += "2"
            used.add(s)
            w["img"] = f"d{d['day']:02d}-{s}.webp"
    d["dialog"]["emoji"] = SCENE.get(d["day"], "")
    d["dialog"]["img"] = f"d{d['day']:02d}-scene.webp"

CAT = {**{k:'공통' for k in [21,25,26,27,28,29,30,35,36,37,38,39,40]},
       **{k:'봉제' for k in [22,23,24,31,32,33,34]},
       **{k:'전자' for k in range(51,56)}, **{k:'사무' for k in range(56,61)},
       **{k:'공통' for k in range(61,71)}}
for d in out["days"]:
    dd = d["day"]
    if dd in CAT: d["cat"] = CAT[dd]
    if 41 <= dd <= 50: d["n"] = dd - 20          # 일상 Day 21~30
    elif d.get("track") == "work" and dd >= 51: d["n"] = dd - 30   # 직무 21~30

seen = collections.defaultdict(list)
for d in out["days"]:
    for w in d["words"]: seen[w["vi"]].append(d["day"])
dups = {k:v for k,v in seen.items() if len(v)>1}

PROPER = {"hàn","quốc","việt","nam","minsu","nguyễn","văn","hùng","trần","thị","lan",
          "hà","nội","busan"}
toks = lambda s: [t for t in re.split(r"[\s,.!?]+", s) if t]
vocab, bad = set(), []
for d in out["days"]:
    for w in d["words"]: vocab.update(t.lower() for t in w["vi"].split())
    texts = [l["vi"] for l in d["dialog"]["lines"]] + [x["vi"] for x in d["dialog"]["extra"]]
    for txt in texts:
        for t in toks(txt):
            lt=t.lower()
            if lt in PROPER or lt in vocab: continue
            bad.append((d["day"], txt, t))

# 모든 단어가 어딘가 문장에 나오는가
unused=[]
for d in out["days"]:
    txt=' '.join([l["vi"] for l in d["dialog"]["lines"]]+[x["vi"] for x in d["dialog"]["extra"]]).lower()
    for w in d["words"]:
        if w["vi"].lower() not in txt: unused.append((d["day"], w["vi"]))

nw=sum(len(d["words"]) for d in out["days"])
print(f"준비 {len(out['prep'])}일 + Day {len(out['days'])}일 / 단어 {nw} (고유 {len(seen)})")
print(f"대화 {len(out['days'])}개 · {sum(len(d['dialog']['lines']) for d in out['days'])}문장"
      f" / 바꿔말하기 {sum(len(d['dialog']['extra']) for d in out['days'])}")
print("\n중복 단어:", dups or "없음")
print(f"미학습 낱말 {len(bad)}건:")
for a in bad: print('   Day%-3s "%s"  ←  %s' % a)
print(f"\n문장에 안 나오는 단어 {len(unused)}건:")
for a in unused: print('   Day%-3s %s' % a)

if "--write" in sys.argv and not bad and not dups:
    (R/'data/days.json').write_text(json.dumps(out, ensure_ascii=False, indent=1))
    print("\n→ days.json 기록")
elif "--write" in sys.argv:
    print("\n→ 문제가 있어 기록하지 않음")
