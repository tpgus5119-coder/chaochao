"""메인 교재 낱말장 낱말에 gl:1('핵심') 표시를 붙인다 (대표님 지시 2026-09-25 #13).
data/_book_glossary.json(각 과 맨 뒤 Bảng từ 표제어)을 읽어, data/realbook.json 의 같은 낱말마다 gl 를 1로 놓는다.
낱말장에 없는 낱말은 gl 를 지운다(다시 돌려도 같은 결과). 그 다음 tools/build_gybm.py 를 돌리면 gybm.json 으로 넘어간다.
사용: python3 tools/mark_glossary.py"""
import json, pathlib, unicodedata
ROOT = pathlib.Path(__file__).resolve().parent.parent
key = lambda s: unicodedata.normalize("NFC", str(s)).lower().strip()
G = json.loads((ROOT / "data/_book_glossary.json").read_text(encoding="utf-8"))["lists"]
terms = {}
for k, ws in G.items():
    for w in ws:
        terms.setdefault(key(w), []).append(k)
rb = json.loads((ROOT / "data/realbook.json").read_text(encoding="utf-8"))
hit = set()
n = 0
for b in rb["books"]:
    for c in b["chapters"]:
        for w in c["words"]:
            if key(w["vi"]) in terms:
                w["gl"] = 1; hit.add(key(w["vi"])); n += 1
            elif "gl" in w:
                del w["gl"]
(ROOT / "data/realbook.json").write_text(json.dumps(rb, ensure_ascii=False, indent=1), encoding="utf-8")
miss = sorted(set(terms) - hit)
print(f"낱말장 표제어 {len(terms)}개(중복 제외) · 표시한 낱말 {n}개 · 앱에 없어 표시 못한 표제어 {len(miss)}개")
if miss:
    print("  없음:", miss[:60])
