"""한 과의 카드 중 검토가 필요한 것만 출력: 예문 출처가 qwen 인 것(품질 들쭉날쭉), 화자 머리표, CJK 섞임, 예문에 낱말이 없는 것, 그림 없음/공유. 사용: python3 review_cards.py <과 제목>"""
import collections, json, pathlib, re, sys, unicodedata
ROOT = pathlib.Path.home() / "짜오짜오/베트남어-어플"
nfc = lambda s: unicodedata.normalize("NFC", s)
title = sys.argv[1]
g = json.loads((ROOT / "data/gybm.json").read_text(encoding="utf-8"))
main = [s for s in g["sources"] if s["key"] == "main"][0]
ws = [w for l in main["lessons"] if (l["title"] == title or l["title"].startswith(title + " · ")) for w in l["words"]]
users = collections.defaultdict(set)
def walk(o):
    if isinstance(o, dict):
        im = o.get("img")
        if isinstance(im, str) and im.endswith(".webp") and "vi" in o:
            users[im].add(nfc(str(o["vi"])).lower())
        for v in o.values():
            walk(v)
    elif isinstance(o, list):
        for v in o:
            walk(v)
walk(g)
for p in (ROOT / "data").glob("*.json"):
    if p.name == "gybm.json" or p.name.startswith("_"):
        continue
    try:
        walk(json.loads(p.read_text(encoding="utf-8")))
    except Exception:
        pass
def has(sent, word):
    s = " " + " ".join(re.findall(r"[^\W\d_]+", nfc(sent).lower())) + " "
    return " " + nfc(word).lower() + " " in s
PRE = re.compile(r"^([가-힣A-Za-z ]{1,10}):\s")
cjk = re.compile(r"[一-鿿぀-ヿ]")
n = 0
for i, w in enumerate(ws, 1):
    ex = w.get("ex") or {}
    flags = []
    if w.get("ex_src") == "qwen": flags.append("qwen")
    if PRE.match(ex.get("ko", "")) and ":" not in ex.get("vi", "")[:15]: flags.append("화자")
    if cjk.search(ex.get("ko", "")) or cjk.search(w.get("ko", "")): flags.append("CJK")
    if ex and not has(ex.get("vi", ""), w["vi"]): flags.append("낱말없음")
    sh = users.get(w.get("img"), set())
    if not w.get("img"): flags.append("그림없음")
    elif len(sh) > 1: flags.append("그림공유:" + "/".join(sorted(sh - {nfc(w['vi']).lower()})[:2]))
    if flags:
        n += 1
        print(f"{i:3} {w['vi']} | {w['ko'][:30]} | {ex.get('vi')} / {ex.get('ko')} | {','.join(flags)}")
print(len(ws), "낱말 중 검토", n)
