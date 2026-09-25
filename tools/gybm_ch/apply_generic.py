"""한 과에 낱말을 옮기고 새로 넣는다. 사용: python3 apply_generic.py <책 0|1> <과 번호(1부터)> <과 폴더>
과 폴더의 new_words.py 에 NEW=[(vi, ko, en, 예문vi, 예문ko)...], MOVE=[...], DROP=[...](이 과에서 지울 것, 선택), FIXVI={옛:새}(선택)."""
import importlib.util, json, pathlib, sys, unicodedata
ROOT = pathlib.Path.home() / "짜오짜오/베트남어-어플"
sys.path.insert(0, str(ROOT / "tools"))
from vi_kr import word as vkr
book, chno, D = int(sys.argv[1]), int(sys.argv[2]), pathlib.Path(sys.argv[3])
spec = importlib.util.spec_from_file_location("nw", D / "new_words.py"); nw = importlib.util.module_from_spec(spec); spec.loader.exec_module(nw)
NEW, MOVE = nw.NEW, nw.MOVE
DROP = getattr(nw, "DROP", []); FIXVI = getattr(nw, "FIXVI", {})
P = ROOT / "data/realbook.json"
rb = json.loads(P.read_text(encoding="utf-8"))
nfc = lambda s: unicodedata.normalize("NFC", s)
ch = rb["books"][book]["chapters"][chno - 1]
before = len(ch["words"])
ch["words"] = [w for w in ch["words"] if nfc(w["vi"]).lower() not in {nfc(x).lower() for x in DROP}]
for w in ch["words"]:
    if nfc(w["vi"]) in FIXVI:
        w["vi"] = FIXVI[nfc(w["vi"])]
        w["kr_read"] = vkr(w["vi"])
have = {nfc(w["vi"]).lower() for w in ch["words"]}
def after(bi, ci):        # (bi, ci) 가 이 과보다 뒤인가
    return (bi, ci) > (book, chno - 1)
first = {}
for bi, b in enumerate(rb["books"]):
    for ci, c in enumerate(b["chapters"]):
        if not after(bi, ci):
            continue
        for w in c["words"]:
            k = nfc(w["vi"]).lower()
            if k in {nfc(x).lower() for x in MOVE} and k not in first:
                first[k] = dict(w)
missing = {nfc(x).lower() for x in MOVE} - set(first)
assert not missing, missing
assert not (have & {nfc(x).lower() for x in MOVE}), have & {nfc(x).lower() for x in MOVE}
newl = {nfc(v).lower() for v, *_ in NEW}
if have & newl:
    print("이미 이 과에 있어 건너뜀:", sorted(have & newl))
    NEW = [n for n in NEW if nfc(n[0]).lower() not in have]
    newl = {nfc(v).lower() for v, *_ in NEW}
removed = 0
for bi, b in enumerate(rb["books"]):
    for ci, c in enumerate(b["chapters"]):
        if not after(bi, ci):
            continue
        n0 = len(c["words"])
        c["words"] = [w for w in c["words"] if nfc(w["vi"]).lower() not in {nfc(x).lower() for x in MOVE}]
        removed += n0 - len(c["words"])
add = [first[nfc(k).lower()] for k in MOVE] + [{"vi": v, "ko": ko, "en": en, "kr_read": vkr(v)} for v, ko, en, *_ in NEW]
ch["words"].extend(add)
P.write_text(json.dumps(rb, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"{ch['title'][:22]}: {before} → {len(ch['words'])} (옮겨 옴 {len(MOVE)}, 새로 {len(NEW)}, 지움 {len(DROP)}) · 뒤쪽 과에서 뺌 {removed}곳 · 레슨 {-(-before // 15)}→{-(-len(ch['words']) // 15)}")
bad = [v for v, *_ in NEW if not vkr(v)]
print("kr_read 없음:", bad)
json.dump([[v, ko, en, evi, eko] for v, ko, en, evi, eko in NEW], open(D / "new_b.json", "w", encoding="utf-8"), ensure_ascii=False)
