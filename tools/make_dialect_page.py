#!/usr/bin/env python3
"""남·북 말씨 확인 설문 페이지를 만든다 (giong.html) — **가리지 않는다.**

앞선 설문(voice-vi.html)과 다른 점:
  · 저것은 '어느 쪽이 더 사람 같은가'를 가려서 물었다(블라인드).
  · 이것은 '이 목소리가 북부냐 남부냐'를 **이름을 보여 주고** 묻는다.
    A·C 는 북부로 알려진 것, D 는 우리가 남부로 내보내는 것이라 **귀의 잣대**다.
    가리면 잣대가 잣대 노릇을 못 한다. 알고 싶은 것은 **B 하나**다.

묻는 것은 목소리마다 한 가지: Bắc(북) / Trung(중) / Nam(남) / Không rõ(모르겠다).
응답자 자신의 말씨도 먼저 묻는다 — 남부 사람과 북부 사람은 같은 소리를 다르게 듣는다.

색만으로 고른 것을 알리지 않는다(색각 배려) — 고른 단추는 굵기와 테두리도 바뀐다.

실행: python3 tools/make_dialect_page.py   →  giong.html
"""
import html
import json
import pathlib

R = pathlib.Path(__file__).resolve().parent.parent
LIST = R / "dtest" / "list.json"
OUT = R / "giong.html"

# 가리지 않는다 — 어느 엔진인지 적어 둔다. 엔진 이름을 안다고 남·북 판단이
# 흔들리지는 않고, 대표님이 직접 들으실 때 무엇을 듣는지 알아야 한다.
VOICES = [("A", "Giọng A", "Microsoft Edge"), ("B", "Giọng B", "Supertonic 3"),
          ("C", "Giọng C", "Google Chirp 3 HD"), ("D", "Giọng D", "Giọng Nam của ứng dụng")]
PICKS = [("bac", "Bắc"), ("trung", "Trung"), ("nam", "Nam"), ("?", "Không rõ")]

CSS = """
:root{--bg:#fff;--ink:#1a1a1a;--dim:#666;--line:#d8d8d8;--card:#fafafa;--dan:#c0392b}
@media (prefers-color-scheme:dark){:root{--bg:#161616;--ink:#eee;--dim:#aaa;
 --line:#3a3a3a;--card:#1f1f1f;--dan:#e05c4a}}
*{box-sizing:border-box}
body{margin:0;padding:18px 14px 60px;background:var(--bg);color:var(--ink);
 font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
 line-height:1.6;max-width:640px;margin-inline:auto}
h1{font-size:22px;margin:0 0 6px}
.note{color:var(--dim);font-size:14px;margin:0 0 16px}
.rg{border:1px solid var(--line);border-radius:10px;padding:14px;margin-bottom:20px;
 background:var(--card)}
.rg p{margin:0 0 10px;font-weight:700}
.row{display:flex;gap:8px;flex-wrap:wrap}
.row button{flex:1 1 22%;padding:10px 6px;border:1px solid var(--line);
 background:var(--bg);color:var(--ink);border-radius:8px;font-size:15px;cursor:pointer}
.row button.on{border:3px solid var(--dan);font-weight:800;
 background:color-mix(in srgb,var(--dan) 12%,transparent)}
.q{border:1px solid var(--line);border-radius:10px;padding:14px;margin-bottom:18px}
.sent{font-size:18px;font-weight:700;margin:0 0 4px}
.why{font-size:12px;color:var(--dim);margin:0 0 12px}
.v{border-top:1px dashed var(--line);padding-top:12px;margin-top:12px}
.v:first-of-type{border-top:0;padding-top:0;margin-top:0}
.vn{font-weight:700;margin-bottom:6px}
.eng{font-weight:400;font-size:12px;color:var(--dim)}
audio{width:100%;height:36px;margin-bottom:8px}
#send{width:100%;padding:16px;font-size:17px;font-weight:800;border:0;border-radius:10px;
 background:var(--dan);color:#fff;cursor:pointer}
#send:disabled{opacity:.5}
#out{margin-top:14px;white-space:pre-line;font-size:15px}
"""

JS = """
const API='https://viet-club.chaochao-app.workers.dev';
let RG='';
document.querySelectorAll('.rg .row button').forEach(b=>{b.onclick=()=>{
  RG=b.dataset.v;
  b.parentNode.querySelectorAll('button').forEach(x=>x.classList.remove('on'));
  b.classList.add('on');};});
const picks={};
document.querySelectorAll('.q .row button').forEach(b=>{b.onclick=()=>{
  picks[b.dataset.k]=b.dataset.v;
  b.parentNode.querySelectorAll('button').forEach(x=>x.classList.remove('on'));
  b.classList.add('on');};});
document.getElementById('send').onclick=async()=>{
  const n=Object.keys(picks).length;
  if(!RG){alert('Hãy chọn vùng giọng của bạn trước.');return;}
  if(!n){alert('Bạn chưa chọn câu nào.');return;}
  const btn=document.getElementById('send');btn.disabled=true;
  let msg='⚠️ Không gửi được — vẫn cảm ơn bạn!';
  try{
    const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({act:'dialect',rg:RG,picks})});
    if((await r.json()).ok) msg='✅ Đã gửi. Cảm ơn bạn rất nhiều!';
  }catch(e){}
  document.getElementById('out').textContent=
    `Bạn đã đánh dấu ${n} mục.\\n${msg}`;
};
"""


def main():
    items = json.loads(LIST.read_text(encoding="utf-8"))
    p = []
    p.append('<!doctype html><html lang="vi"><head><meta charset="utf-8">')
    p.append('<meta name="viewport" content="width=device-width,initial-scale=1">')
    p.append("<title>Giọng Bắc hay giọng Nam?</title>")
    p.append(f"<style>{CSS}</style></head><body>")
    p.append("<h1>🎧 Giọng này là giọng Bắc hay giọng Nam?</h1>")
    p.append('<p class="note">Mỗi câu có 4 giọng máy đọc. Hãy nghe rồi đánh dấu mỗi giọng là '
             '<b>Bắc</b>, <b>Trung</b> hay <b>Nam</b>. Nếu không chắc, chọn '
             '<b>Không rõ</b> — đừng đoán bừa.<br>'
             'Đây <b>không phải</b> khảo sát “giọng nào hay hơn”. '
             'Chúng tôi chỉ muốn biết mỗi giọng thuộc vùng nào. '
             'Khảo sát cho một ứng dụng học tiếng Hàn – tiếng Việt miễn phí. Cảm ơn bạn! 🙏</p>')

    p.append('<div class="rg"><p>Bạn nói giọng vùng nào?</p><div class="row">')
    for v, lab in [("bac", "Miền Bắc"), ("trung", "Miền Trung"), ("nam", "Miền Nam")]:
        p.append(f'<button type="button" data-v="{v}">{lab}</button>')
    p.append('</div><p class="note" style="margin:10px 0 0">'
             'Không hỏi tên, không hỏi tuổi.</p></div>')

    for it in items:
        p.append('<div class="q">')
        p.append(f'<p class="sent">{it["n"]}. {html.escape(it["text"])}</p>')
        for tag, label, eng in VOICES:
            f = it["files"].get(tag)
            if not f:
                continue
            p.append('<div class="v">')
            p.append(f'<div class="vn">{label} <span class="eng">{eng}</span></div>')
            p.append(f'<audio controls preload="none" src="dtest/{f}"></audio>')
            p.append('<div class="row">')
            for v, lab in PICKS:
                p.append(f'<button type="button" data-k="{it["n"]}{tag}" '
                         f'data-v="{v}">{lab}</button>')
            p.append("</div></div>")
        p.append("</div>")

    p.append('<button id="send">Gửi kết quả</button><div id="out"></div>')
    p.append(f"<script>{JS}</script></body></html>")
    OUT.write_text("\n".join(p), encoding="utf-8")
    n = sum(len(x["files"]) for x in items)
    print(f"{OUT.name} 만듦 — 문장 {len(items)}개 · 소리 {n}장 · {OUT.stat().st_size//1024}KB")


if __name__ == "__main__":
    main()
