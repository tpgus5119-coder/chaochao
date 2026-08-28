#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""그림 검수판을 굽는다 — **폴더의 그림을 하나도 빠짐없이, 배우는 차례대로.**

왜 전부 보여주나: 기계 검사(img_audit)는 '의심되는 것'만 고른다. 그런데 기계가
못 잡는 결함이 있다 — 뜻이 어긋난 그림(학원인데 달러 기호), 문화적으로 불편한 그림,
그냥 못생긴 그림. 그건 사람이 훑어야 나온다. 그래서 판정과 상관없이 전량을 낸다.

왜 Day 차례인가: 검수하는 사람은 '1장부터 순서대로' 본다. 급한 순으로 섞어 놓으면
같은 날의 그림이 흩어져, 그림끼리 어울리는지(같은 날 카드가 한 화면에 뜬다)를 못 본다.
그래서 Day 1부터 차례로 놓고, 급한 것은 딱지로 표시한다.

그림마다 **그 그림이 무슨 낱말인지** 적는다. 이름만 보고는 판단할 수 없기 때문이다
(d101-trung-tam 이 '학원'인 줄 알아야 달러 기호가 틀렸다는 걸 안다).
낱말은 데이터(days·ko_days·news_days·그림말 대장)에서 끌어오고,
어디에도 없으면 **지어내지 않고** '데이터에 낱말 없음'이라고 적는다.

딱지
  🎯 시험    시험 문항이 쓰는 그림 — 글자가 있으면 답이 샌다
  ♻︎ 교체됨  이번에 다시 구운 것
  🔤        OCR이 읽어 낸 글자를 그대로
  🗂 안 쓰임 어떤 데이터도 참조하지 않는 그림(지우지 않는다)

쓰는 법: 그림을 눌러 고르고 '고른 것 복사' → 채팅에 붙여넣기.
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
# 그림 **옆에** 둔다. 그림을 `src="이름.webp"` 로 부르므로 이 파일이 img/ 밖으로
# 나가는 순간 1,800장이 전부 깨진다 — 실제로 한 번 옮겼다가 그렇게 됐다.
# 이름은 ASCII 로 둔다. 한글 파일명은 주소에서 %EA%B7%B8... 로 바뀌어
# 사람이 손으로 옮겨 적을 수 없고, 어떤 브라우저는 그대로 열지 못한다.
OUT = IMG / "review.html"
URL = "https://tpgus5119-coder.github.io/chaochao/img/review.html"


def words_and_order():
    """{파일: 낱말}, {파일: 배우는 차례}, {Day: 주제}"""
    word, order, theme = {}, {}, {}
    seq = [0]

    def put(k, v):
        if isinstance(k, str) and k.endswith((".webp", ".svg")):
            v = (v or "").strip(" ·")
            if v and len(v) > len(word.get(k, "")):
                word[k] = v

    def take(k):
        if isinstance(k, str) and k.endswith((".webp", ".svg")) and k not in order:
            order[k] = seq[0]
            seq[0] += 1

    for f in ("data/days.json", "data/ko_days.json", "data/news_days.json"):
        p = R / f
        if not p.exists():
            continue
        j = json.loads(p.read_text(encoding="utf-8"))
        for d in j.get("days", []):
            n = d.get("day")
            th = d.get("theme") or d.get("title") or ""
            if isinstance(n, int):
                theme.setdefault(n, th)
            dl = d.get("dialog") or {}
            if dl.get("img"):                       # 장면 그림이 그날의 첫 장
                take(dl["img"])
                put(dl["img"], f"{th} — 오늘의 대화")
            for w in d.get("words") or []:
                if w.get("img"):
                    take(w["img"])
                    put(w["img"], f"{w.get('ko','')} · {w.get('vi','')}")

    # 그림말 대장 — 데이터에 없는 그림의 이름표가 여기 남아 있다
    for line in (R / "docs" / "image-prompts.md").read_text(encoding="utf-8").splitlines():
        m = re.match(r"\*\*([\w\-]+\.webp)\*\*\s*·?\s*(.*)", line)
        if m:
            put(m.group(1), m.group(2))
    return word, order, theme


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
    import sys
    sys.path.insert(0, str(R / "tools"))
    import ko_exam_gen as g
    import ko_t1_listen as L1
    import ko_t2_listen as L2
    _w, _gl, pics = g.load()
    out = {pics[w] for w in g.PIC_OK if pics.get(w)}
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
    # 이번 검수 작업의 커밋 셋만 — 더 거슬러 오르면 예전 생성분까지 '새 판'으로 잡힌다
    r = subprocess.run(["git", "-C", str(R), "log", "--name-only", "--pretty=format:",
                        "-n", "3", "--", "img/"], capture_output=True, text=True)
    return {p.split("/")[-1] for p in r.stdout.split() if p.endswith((".webp", ".svg"))}


def group_of(k):
    """어느 묶음인가 — (정렬키, 묶음 이름). Day 는 이름이 None(날마다 따로)."""
    m = re.match(r"d(\d+)-", k)
    if m:
        return (1, int(m.group(1))), None
    if k.startswith("n-"):
        return (2, 0), "뉴스에서 뽑은 낱말"
    if k.startswith("x-"):
        return (3, 0), "낱말장 — 여러 날에 걸쳐 쓰는 말"
    return (4, 0), "그 밖 — 아이콘·도표·선생님 얼굴"


def main():
    audp = R / "data" / "_img_audit.json"
    aud = json.loads(audp.read_text(encoding="utf-8")) if audp.exists() else {}
    word, order, theme = words_and_order()
    used, exams, fresh = refs(), exam_files(), changed_now()
    files = [p.name for p in IMG.iterdir() if not p.name.startswith(("_", "."))]

    def ocr_of(k):
        for w in aud.get(k, {}).get("why", []):
            m = re.search(r"글자 박힘 의심: “(.*)”", w)
            if m:
                return m.group(1)
        return ""

    # 배우는 차례대로 — 같은 날 안에서는 데이터에 적힌 순서, 없으면 이름순
    files.sort(key=lambda k: (group_of(k)[0], order.get(k, 10 ** 6), k))

    sections, cur, curkey = [], [], None
    for k in files:
        gk, name = group_of(k)
        key = gk if name is None else name
        if key != curkey:
            if cur:
                sections.append((curkey, cur))
            cur, curkey = [], key
        cur.append(k)
    if cur:
        sections.append((curkey, cur))

    total, n = len(files), [0]

    def card(k):
        n[0] += 1
        tags = []
        if k in exams:
            tags.append('<i class="t x">🎯 시험</i>')
        if k in fresh:
            tags.append('<i class="t f">♻︎ 교체됨</i>')
        if k not in used:
            tags.append('<i class="t o">🗂 안 쓰임</i>')
        t = ocr_of(k)
        if t:
            tags.append(f'<i class="t c">🔤 {html.escape(t[:30])}</i>')
        w = word.get(k)
        wline = (f'<b class="w">{html.escape(w)}</b>' if w
                 else '<b class="w none">데이터에 낱말 없음</b>')
        return (f'<figure data-n="{html.escape(k)}" onclick="pick(this)">'
                f'<span class="idx">{n[0]}</span>'
                f'<img loading="lazy" src="{html.escape(k)}" alt="">'
                f'<figcaption>{wline}<span class="fn">{html.escape(k)}</span>'
                f'{"".join(tags)}</figcaption></figure>')

    body = []
    for key, keys in sections:
        if isinstance(key, tuple):
            day = key[1]
            title = f"Day {day}" + (f" · {theme[day]}" if theme.get(day) else "")
        else:
            title = key
        body.append(f'<section><h2>{html.escape(title)} <span class="n">{len(keys)}장</span></h2>'
                    f'<div class="grid">{"".join(card(k) for k in keys)}</div></section>')

    assert n[0] == total, f"번호 {n[0]} ≠ 그림 {total}"
    named = sum(1 for k in files if word.get(k))

    page = f"""<!doctype html><meta charset="utf-8"><title>그림 검수 — 짜오짜오</title>
<style>
body{{font-family:-apple-system,'Apple SD Gothic Neo',sans-serif;margin:0;padding:20px 20px 110px;
 background:#f4f5f3;color:#1a211e}}
h1{{font-size:21px;margin:0 0 8px}}
h2{{font-size:15px;margin:30px 0 10px;border-bottom:2px solid #cfd6cf;padding-bottom:6px;
 position:sticky;top:0;background:#f4f5f3;z-index:2}}
h2 .n{{color:#888;font-weight:400;font-size:12px}}
/* 1,293장 · 6만 픽셀짜리 페이지다. 화면 밖 묶음까지 다 그리면 스크롤이 밀리고
   느린 기기에서는 아예 빈 화면이 된다(실제로 겪었다). 화면에 들어올 때만 그린다.
   contain-intrinsic-size 로 자리는 미리 잡아 둬야 스크롤 막대가 튀지 않는다. */
section{{content-visibility:auto; contain-intrinsic-size:auto 620px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}}
figure{{position:relative;margin:0;background:#fff;border:2px solid #ddd;border-radius:8px;
 padding:6px;cursor:pointer}}
figure.on{{border-color:#a8501c;background:#fdf2ea}}
.idx{{position:absolute;top:4px;left:6px;font-size:10px;color:#9aa39d;
 font-variant-numeric:tabular-nums}}
img{{width:100%;aspect-ratio:1;object-fit:contain;background:#fff;pointer-events:none}}
figcaption{{font-size:11px;padding:4px 2px;line-height:1.55}}
.w{{display:block;font-size:12.5px;color:#1a211e}}
.w.none{{color:#b0b6b1;font-weight:400}}
.fn{{display:block;color:#8a918c;font-size:10px;word-break:break-all;margin-top:1px}}
.t{{display:inline-block;font-style:normal;font-size:10px;border-radius:4px;padding:0 4px;margin:3px 3px 0 0}}
.t.x{{background:#fbe4d8;color:#a8501c}} .t.f{{background:#ddebe7;color:#0e6f62}}
.t.o{{background:#eee;color:#666}} .t.c{{background:#fff3cd;color:#7a5c00}}
.note{{background:#fff;border-left:4px solid #0e6f62;padding:12px 16px;border-radius:6px;max-width:74ch}}
#bar{{position:fixed;left:0;right:0;bottom:0;background:#1a211e;color:#fff;padding:11px 18px;
 display:flex;gap:12px;align-items:center;font-size:14px;z-index:5}}
#bar button{{font:inherit;font-weight:700;border:0;border-radius:8px;padding:8px 16px;cursor:pointer}}
#cp{{background:#0e6f62;color:#fff}} #cl{{background:#3a4440;color:#fff}}
#out{{flex:1;color:#9fb;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
</style>
<h1>그림 검수 — 전체 {total}장을 배우는 차례대로</h1>
<p class="note"><b>쓰는 법</b> — 마음에 안 드는 그림을 눌러 고른 뒤 아래 <b>고른 것 복사</b>를 누르고
채팅에 붙여 넣어 주세요. 그대로 처리하겠습니다.<br>
그림 아래 <b>굵은 글씨가 그 그림의 낱말</b>입니다({named}장). 데이터에 낱말이 없는 그림은
지어내지 않고 그렇게 적어 두었습니다({total - named}장 — 대부분 지금 안 쓰이는 그림).<br>
이 페이지는 <b>아무것도 지우거나 고치지 않습니다.</b> 좋은 그림은 손대지 않습니다.</p>
{''.join(body)}
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
   ='복사했습니다: '+(t.replace(/\\n/g,', ').slice(0,110)||'(없음)');}});}}
function clearPicked(){{S.clear();document.querySelectorAll('figure.on').forEach(e=>e.classList.remove('on'));
 document.getElementById('cnt').textContent=0;document.getElementById('out').textContent='';}}
</script>"""
    OUT.write_text(page, encoding="utf-8")
    print(f"그림 {total}장 전량 · 낱말 붙은 것 {named}장 · 묶음 {len(sections)}개")
    print(f"   {OUT}")
    print(f"   올린 뒤 열 곳: {URL}")


if __name__ == "__main__":
    main()
