#!/usr/bin/env python3
"""선배 시험 자료를 앱이 실을 꼴로 굳힌다 → data/senior.json

무엇을 넣나 (대표님 지시)
  · **20기만** 넣는다. 대표님은 22기다 — 19기보다 20기가 가깝고, 4,000개는 못 외운다.
  · 19기에도 나온 낱말에는 **「중요」** 표를 붙인다(w=1).
    두 기수는 서로 모르는 채 각자 시험을 봤는데도 겹친다 — 내가 매긴 등급이 아니라
    자료가 스스로 말하는 증거다.
  · 19기에만 있는 낱말은 넣지 않는다.

차례는 어떻게 정했나 — **짐작하지 않고 자료에서 찾아냈다.**
  주간시험(토요시험)은 그 주의 일일시험 낱말을 다시 낸다. 그래서 주간시험 낱말이
  어느 일일시험 구간과 가장 많이 맞물리는지 전수로 훑어 그 구간 끝에 꽂았다.
  맞물림은 대개 95~100%였다(가장 낮은 것이 74%). 처음엔 '주간 N = 일일 4N' 으로
  가정했는데 주간 10부터 0~5%로 어긋났다 — 번호 매기는 방식이 중간에 바뀐 것이다.
  가정을 버리고 찾아낸 값을 쓴다.

낱말은 한 벌만 두고 번호로 가리킨다 — 같은 낱말이 일일과 주간에 거듭 나오므로,
그대로 담으면 내려받는 양이 두 배가 된다.
"""
import json, pathlib, re, unicodedata

R = pathlib.Path(__file__).resolve().parent.parent
D = R / "data"
nf = lambda t: unicodedata.normalize("NFC", t.strip())

HAN = re.compile(r"[가-힣]")
ASCII = re.compile(r"[A-Za-z][A-Za-z0-9 .,\'’\-]*")
def kor(t):
    """뜻에서 영어를 걷어낸다 — 한국어만 남긴다.

    왜: 선배 자료의 뜻은 'cell phone/ 휴대폰', '주소 address', '아내 – wife' 처럼
    영어가 섞여 있는데 **일부만** 그렇다. 그러면 보기 넷 중 하나만 영어가 붙어
    뜻을 몰라도 답이 보인다. 시험 화면을 실제로 열어 보고 알았다(2026-08-29):
    'điện thoại di động' 문제의 보기가 [회의하다 / cell phone/ 휴대폰 / 가게·식당 / 권리·복리]
    였고 영어가 붙은 것이 곧 정답이었다.

    한국어가 하나도 없는 뜻(고유명사 등)은 손대지 않는다 — 지우면 뜻이 사라진다.
    괄호는 안에 한국어가 있으면 그대로 둔다('반꼼 (베트남 떡)').
    잃는 것: 'manteau' 같은 외래어 어원 표기. 답이 새는 것보다는 낫다."""
    parts = [x.strip() for x in t.split("/")]
    keep = [x for x in parts if HAN.search(x)]
    s = " / ".join(keep) if keep else t
    if not HAN.search(s):
        return t.strip()
    s = re.sub(r"\(([^)]*)\)", lambda m: m.group(0) if HAN.search(m.group(1)) else "", s)
    s = ASCII.sub("", s)
    if s.count("(") != s.count(")"):          # 짝 잃은 괄호만 턴다
        s = re.sub(r"[()]", "", s)
    s = re.sub(r"\s*[–\-]\s*$", "", s)
    s = re.sub(r"\s*\(\s*\)", "", s)
    s = re.sub(r"\s{2,}", " ", s).strip(" ,/–-")
    return s if HAN.search(s) else t.strip()
low = lambda t: nf(t).lower()

def load(f):
    return json.loads((D / f).read_text(encoding="utf-8"))["sets"]

# 19기에 나온 낱말 — 「중요」 표를 붙일 근거
vi19 = {low(w["vi"]) for s in load("_senior_words-19.json")
        for w in s["words"] if w.get("vi")}
# 앱이 이미 가르치는 낱말 — 새로 외울 것이 몇인지 학습자가 알게
taught = {low(w["vi"]) for d in json.loads((D / "days.json").read_text(encoding="utf-8"))["days"]
          for w in (d.get("words") or []) if w.get("vi")}

KIND = {"일일": "d", "주간": "w", "기타": "x"}
raw = []
for s in load("_senior_words.json"):
    ws = [(nf(w["vi"]), kor(nf(w["ko"]))) for w in s["words"] if w.get("vi") and w.get("ko")]
    if len(ws) >= 5:
        raw.append({"k": KIND.get(s["kind"], "x"), "no": s["no"], "ws": ws})

# ── 주간시험 자리 찾기: 가장 잘 맞물리는 일일시험 구간의 **끝** 뒤에 선다
dset = {r["no"]: {low(v) for v, _ in r["ws"]} for r in raw if r["k"] == "d"}
ks = sorted(dset)
def seat(words):
    best = (0, ks[-1] if ks else 0)
    for a in range(len(ks)):
        pool = set()
        for b in range(a, min(a + 8, len(ks))):
            pool |= dset[ks[b]]
            r = len(words & pool) / len(words)
            if r > best[0]: best = (r, ks[b])
    return best                                    # (맞물림, 그 구간의 끝 회차)

for r in raw:
    if r["k"] == "d":   r["at"], r["fit"] = (r["no"], 0), None
    elif r["k"] == "w":
        fit, end = seat({low(v) for v, _ in r["ws"]})
        r["at"], r["fit"] = (end, 1), round(fit * 100)
    else:               r["at"], r["fit"] = (10 ** 6, 2), None
raw.sort(key=lambda r: r["at"])

# ── 낱말 한 벌 + 번호로 가리키기
words, idx, sets = [], {}, []
for r in raw:
    ns = []
    for vi, ko in r["ws"]:
        k = (vi, ko)
        if k not in idx:
            idx[k] = len(words)
            words.append([vi, ko, (1 if low(vi) in vi19 else 0) + (2 if low(vi) in taught else 0)])
        ns.append(idx[k])
    sets.append({"k": r["k"], "no": r["no"], "w": ns, **({"fit": r["fit"]} if r["fit"] else {})})

out = {"note": "GYBM 20기가 실제로 본 시험 낱말. 차례는 실제 시험 차수 순서. "
               "표 t: 1=19기에도 나옴(중요) · 2=앱에서 이미 배움 · 3=둘 다.",
       "words": words, "sets": sets}
p = D / "senior.json"
p.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
imp = sum(1 for w in words if w[2] & 1)
kno = sum(1 for w in words if w[2] & 2)
print(f"낱말 {len(words)}개 · 「중요」 {imp}개 · 앱에서 이미 배운 것 {kno}개")
print(f"묶음 {len(sets)}개 (일일 {sum(1 for s in sets if s['k']=='d')} · "
      f"주간 {sum(1 for s in sets if s['k']=='w')} · 모음 {sum(1 for s in sets if s['k']=='x')})")
print(f"파일 {p.stat().st_size/1024:.0f}KB")
print("\n차례 앞 12개:", [f"{'일일' if s['k']=='d' else '주간' if s['k']=='w' else '모음'}{s['no']}" for s in sets[:12]])
