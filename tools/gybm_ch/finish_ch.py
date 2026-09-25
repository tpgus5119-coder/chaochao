"""apply_generic 뒤: 빌드 → 빌드에서 사라진(앞 과에 이미 있는) 새 낱말 걸러내기 → 다시 빌드 → 예문·소리 넣기.
사용: python3 finish_ch.py <책 0|1> <과 번호> <과 폴더> <과 제목(정확히)>"""
import json, pathlib, subprocess, sys, unicodedata, importlib.util
ROOT = pathlib.Path.home() / "짜오짜오/베트남어-어플"
SP = pathlib.Path(__file__).resolve().parent
book, chno, D, title = int(sys.argv[1]), int(sys.argv[2]), pathlib.Path(sys.argv[3]), sys.argv[4]
nfc = lambda s: unicodedata.normalize("NFC", s)
def build():
    r = subprocess.run(["python3", "tools/build_gybm.py"], cwd=ROOT, capture_output=True, text=True)
    return [l for l in r.stdout.splitlines() if "메인 교재" in l]
print(build())
g = json.loads((ROOT / "data/gybm.json").read_text(encoding="utf-8"))
main = [s for s in g["sources"] if s["key"] == "main"][0]
have = {nfc(w["vi"]).lower() for l in main["lessons"] if (l["title"] == title or l["title"].startswith(title + " · ")) for w in l["words"]}
new = json.loads((D / "new_b.json").read_text(encoding="utf-8"))
lost = [n for n in new if nfc(n[0]).lower() not in have]
if lost:
    print("빌드에서 사라진 새 낱말:", [n[0] for n in lost])
    rb = json.loads((ROOT / "data/realbook.json").read_text(encoding="utf-8"))
    ch = rb["books"][book]["chapters"][chno - 1]
    ls = {nfc(n[0]).lower() for n in lost}
    ch["words"] = [w for w in ch["words"] if nfc(w["vi"]).lower() not in ls]
    (ROOT / "data/realbook.json").write_text(json.dumps(rb, ensure_ascii=False, indent=1), encoding="utf-8")
    new = [n for n in new if nfc(n[0]).lower() in have]
    (D / "new_b.json").write_text(json.dumps(new, ensure_ascii=False), encoding="utf-8")
    print(build())
r = subprocess.run(["python3", str(SP / "patch_generic.py"), title, str(D / "new_b.json")], cwd=ROOT, capture_output=True, text=True)
print(r.stdout[-300:], r.stderr[-300:])
