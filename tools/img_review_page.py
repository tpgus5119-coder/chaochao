#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""그림 검수판을 굽는다 — **폴더의 그림을 하나도 빠짐없이** 한 화면에.

왜 전부 보여주나: 기계 검사(img_audit)는 '의심되는 것'만 고른다. 그런데 기계가
못 잡는 결함이 있다 — 뜻이 어긋난 그림(학원인데 달러 기호), 문화적으로 불편한 그림,
그냥 못생긴 그림. 그건 사람이 훑어야 나온다. 그래서 판정과 상관없이 전량을 낸다.

한 장은 딱 한 번만 나온다(중복 없음). 갈래는 급한 순으로 놓고, 그림마다 딱지를 붙인다.
  🎯 시험에 쓰임   — 답이 새면 문항이 깨진다. 가장 먼저 본다
  🔤 글자 읽힘     — OCR이 읽어 낸 글자를 그대로 적는다
  ♻︎ 교체됨        — 이번에 다시 구운 것
  🗂 안 쓰임        — 어떤 데이터도 참조하지 않는 그림(지우지 않는다)

쓰는 법: 마음에 안 드는 그림을 눌러 고르고 '고른 것 복사'를 누르면
파일 이름 목록이 클립보드에 담긴다. 그걸 채팅에 붙여 넣으면 그대로 처리한다.
**이 페이지는 아무것도 지우거나 고치지 않는다.**

실행: python3 tools/img_review_page.py
"""
import html
import json
import pathlib
import re
import subprocess

R = pathlib.Path(__file__).resolve().parent.parent
IMG = R / "img"
# 그림 옆에 둔다 — file:// 절대경로를 박으면 HTTP 로 열 때 브라우저가 막고,
# 폴더를 옮기면 통째로 깨진다. 상대경로가 어디서 열든 산다.
OUT = R / "img" / "_그림검수.html"
LINK = pathlib.Path.home() / "Documents" / "시험기출자료고" / "그림검수.html"


def refs():
    used = set()
    for f in (R / "data").glob("*.json"):
        # 밑줄로 시작하는 것은 내부 캐시다(_img_audit.json 은 **모든** 그림 이름을
        # 열쇠로 갖고 있어, 넣고 세면 안 쓰이는 그림이 하나도 없는 것처럼 나온다).
        if f.name.startswith("_"):
            continue
        used |= set(re.findall(r'"([A-Za-z0-9_\-]+\.(?:webp|svg|png|jpg))"',
                               f.read_text(encoding="utf-8", errors="ignore")))
    used |= set(re.findall(r"['\"]([A-Za-z0-9_\-]+\.(?:webp|svg|png|jpg))['\"]",
                           (R / "app.js").read_text(encoding="utf-8", errors="ignore")))
    return used


def exam_files():
    """시험 문항이 실제로 쓰는 그림 파일 이름."""
    import sys
    sys.path.insert(0, str(R / "tools"))
    import ko_exam_gen as g
    import ko_t1_listen as L1
    import ko_t2_listen as L2
    _w, _gl, pics = g.load()
    out = set()
    for w in g.PIC_OK:
        if pics.get(w):
            out.add(pics[w])
    for _lines, ko in L1.LISTEN_PIC_DLG + L2.T2_PICDLG:
        if pics.get(ko):
            out.add(pics[ko])
    ex = json.loads((R / "data" / "ko_exams.json").read_text(encoding="utf-8"))
    for e in ex["exams"]:
        for q in e["questions"]:
            if q.get("img"):
                out.add(q["img"])
            if q.get("optkind") == "img":
                out |= {str(o) for o in q["options"]}
    return out


def changed_now():
    """이번 작업에서 다시 구운 그림 (git 기준)."""
    # 이번 검수 작업의 커밋 둘만 — 더 거슬러 오르면 예전 생성분까지 '새 판'으로 잡힌다
    r = subprocess.run(["git", "-C", str(R), "log", "--name-only", "--pretty=format:",
                        "-n", "2", "--", "img/"], capture_output=True, text=True)
    return {p.split("/")[-1] for p in r.stdout.split() if p.endswith((".webp", ".svg"))}


def main():
    aud = json.loads((R / "data" / "_img_audit.json").read_text(encoding="utf-8")) \
        if (R / "data" / "_img_audit.json").exists() else {}
    used, exams, fresh = refs(), exam_files(), changed_now()
    files = sorted(p.name for p in IMG.iterdir() if not p.name.startswith("."))

    def ocr_of(k):
        for w in aud.get(k, {}).get("why", []):
            m = re.search(r"글자 박힘 의심: “(.*)”", w)
            if m:
                return m.group(1)
        return ""

    # 갈래 나누기 — 한 장은 한 갈래에만 (급한 순으로 먼저 집어간다)
    buckets = [
        ("시험에 쓰이는 그림 — 답이 새면 문항이 깨진다. 여기부터 보세요",
         lambda k: k in exams, "red"),
        ("이번에 다시 구운 그림 — 새 판입니다",
         lambda k: k in fresh, "teal"),
        ("글자가 읽힌 그림 — 시계·달력의 숫자는 정상일 수 있습니다",
         lambda k: bool(ocr_of(k)), "amber"),
        ("어디에도 안 쓰이는 그림 — 지울지 살릴지 판단만 하시면 됩니다",
         lambda k: k not in used, "gray"),
        ("나머지 전부 — 학습 카드에 쓰이는 그림", lambda k: True, "gray"),
    ]
    placed, sections = set(), []
    for title, pred, color in buckets:
        keys = [k for k in files if k not in placed and pred(k)]
        placed |= set(keys)
        sections.append((title, keys, color))

    assert len(placed) == len(files), f"빠진 그림 {len(files) - len(placed)}장"

    def card(k):
        tags = []
        if k in exams:
            tags.append('<i class="t x">🎯 시험</i>')
        if k in fresh:
            tags.append('<i class="t f">♻︎ 교체됨</i>')
        if k not in used:
            tags.append('<i class="t o">🗂 안 쓰임</i>')
        t = ocr_of(k)
        if t:
            tags.append(f'<i class="t c">🔤 {html.escape(t[:34])}</i>')
        return (f'<figure data-n="{html.escape(k)}" onclick="pick(this)">'
                f'<img loading="lazy" src="{html.escape(k)}" alt="">'
                f'<figcaption><b>{html.escape(k)}</b>{"".join(tags)}</figcaption></figure>')

    body = "".join(
        f'<section class="{c}"><h2>{html.escape(t)} <span class="n">{len(ks)}장</span></h2>'
        f'<div class="grid">{"".join(card(k) for k in ks)}</div></section>'
        for t, ks, c in sections)

    page = f"""<!doctype html><meta charset="utf-8"><title>그림 검수 — 짜오짜오</title>
<style>
body{{font-family:-apple-system,'Apple SD Gothic Neo',sans-serif;margin:0;padding:20px 20px 120px;
 background:#f4f5f3;color:#1a211e}}
h1{{font-size:21px;margin:0 0 8px}}
h2{{font-size:16px;margin:34px 0 10px;border-bottom:2px solid #ccc;padding-bottom:6px}}
h2 .n{{color:#888;font-weight:400;font-size:13px}}
section.red h2{{border-color:#a8501c;color:#a8501c}}
section.teal h2{{border-color:#0e6f62;color:#0e6f62}}
section.amber h2{{border-color:#b8860b;color:#8a6508}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:10px}}
figure{{margin:0;background:#fff;border:2px solid #ddd;border-radius:8px;padding:6px;cursor:pointer}}
figure.on{{border-color:#a8501c;background:#fdf2ea}}
figure.on figcaption b{{color:#a8501c}}
img{{width:100%;aspect-ratio:1;object-fit:contain;background:#fff;pointer-events:none}}
figcaption{{font-size:11px;word-break:break-all;padding:4px 2px;line-height:1.5}}
.t{{display:inline-block;font-style:normal;font-size:10px;border-radius:4px;padding:0 4px;margin:2px 3px 0 0}}
.t.x{{background:#fbe4d8;color:#a8501c}} .t.f{{background:#ddebe7;color:#0e6f62}}
.t.o{{background:#eee;color:#666}} .t.c{{background:#fff3cd;color:#7a5c00}}
.note{{background:#fff;border-left:4px solid #0e6f62;padding:12px 16px;border-radius:6px;max-width:74ch}}
#bar{{position:fixed;left:0;right:0;bottom:0;background:#1a211e;color:#fff;padding:12px 18px;
 display:flex;gap:12px;align-items:center;font-size:14px}}
#bar button{{font:inherit;font-weight:700;border:0;border-radius:8px;padding:8px 16px;cursor:pointer}}
#cp{{background:#0e6f62;color:#fff}} #cl{{background:#3a4440;color:#fff}}
#out{{flex:1;color:#9fb;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
</style>
<h1>그림 검수 — 전체 {len(files)}장 (하나도 안 뺐습니다)</h1>
<p class="note"><b>쓰는 법</b> — 마음에 안 드는 그림을 눌러 고른 뒤 아래 <b>고른 것 복사</b>를 누르고
채팅에 붙여 넣어 주세요. 그대로 처리하겠습니다.<br>
이 페이지는 <b>아무것도 지우거나 고치지 않습니다.</b> 좋은 그림은 손대지 않습니다.</p>
{body}
<div id="bar"><b><span id="cnt">0</span>장 고름</b>
<button id="cp" onclick="copyPicked()">고른 것 복사</button>
<button id="cl" onclick="clearPicked()">고른 것 지우기</button>
<span id="out"></span></div>
<script>
const S=new Set();
function pick(el){{const n=el.dataset.n;
 if(S.has(n)){{S.delete(n);el.classList.remove('on')}}else{{S.add(n);el.classList.add('on')}}
 document.getElementById('cnt').textContent=S.size;}}
function copyPicked(){{const t=[...S].join('\\n');
 navigator.clipboard.writeText(t).then(()=>{{document.getElementById('out').textContent
   ='복사했습니다: '+(t.replace(/\\n/g,', ').slice(0,120)||'(없음)');}});}}
function clearPicked(){{S.clear();document.querySelectorAll('figure.on').forEach(e=>e.classList.remove('on'));
 document.getElementById('cnt').textContent=0;document.getElementById('out').textContent='';}}
</script>"""
    OUT.write_text(page, encoding="utf-8")
    # 자료고 폴더에는 **바로가기**만 둔다(그림은 img/ 에 그대로 있어야 보인다)
    LINK.parent.mkdir(parents=True, exist_ok=True)
    LINK.write_text(
        f'<!doctype html><meta charset="utf-8">'
        f'<meta http-equiv="refresh" content="0; url=file://{OUT}">'
        f'<p>그림 검수판으로 갑니다 — <a href="file://{OUT}">여기</a></p>',
        encoding="utf-8")
    print(f"그림 {len(files)}장 전량 수록 → {OUT}")
    print(f"   바로가기 → {LINK}")
    for t, ks, _ in sections:
        print(f"   {len(ks):>5}장  {t[:40]}")


if __name__ == "__main__":
    main()
