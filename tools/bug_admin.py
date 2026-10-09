#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""앱 오류 보고 읽기 — 사용자가 머리띠의 ⚑ 로 보낸 것(동아리 워커 KV 'bug:')을 본다 (2026-09-27).

쓰기
  python3 tools/bug_admin.py 목록                 — 최근 보고 목록 (언제·누가·종류·화면·낱말·한 줄)
  python3 tools/bug_admin.py 보기 <id>            — 하나를 자세히: 상황 전부 + 화면 HTML 을 파일로 만들어 연다
  python3 tools/bug_admin.py 새것                 — 아직 처리 안 한 보고만 (처리됨.tsv 에 없는 것)
  python3 tools/bug_admin.py 처리 <id> <한 줄>     — 처리했다고 적어 둔다(서버 보고는 지우지 않는다) — tools/_bugs/처리됨.tsv
  python3 tools/bug_admin.py 지우기 <id>          — 처리한 보고 지우기
  python3 tools/bug_admin.py 진도초기화 <아이디>   — 그 계정의 서버 진도(prog:)를 지운다 (워커 새 판 필요)

열쇠는 환경변수 PUSH_KEY 에서 읽는다(없으면 물어본다). 화면 HTML 은 tools/_bugs/<id>.html 로 저장되며
앱의 style.css 를 그대로 물려 받아 **그 사람이 본 화면을 거의 그대로** 다시 그린다(사진이 아니라 글자라 가볍다)."""
import json, os, subprocess, sys, getpass, pathlib, webbrowser, time

URL = "https://viet-club.chaochao-app.workers.dev"
ORIGIN = "https://tpgus5119-coder.github.io"
R = pathlib.Path(__file__).resolve().parent.parent
KIND = {"img": "그림", "snd": "소리", "mean": "뜻·발음", "ui": "화면", "dead": "멈춤", "etc": "기타"}


def call(**kw):
    p = subprocess.run(["curl", "-sS", "-X", "POST", URL, "-H", "Content-Type: application/json",
                        "-H", f"Origin: {ORIGIN}", "--data-binary", "@-"],
                       input=json.dumps(kw), capture_output=True, text=True, timeout=60)
    try: return json.loads(p.stdout)
    except Exception: return {"error": p.stdout[:200]}


def key():
    if os.environ.get("PUSH_KEY"): return os.environ["PUSH_KEY"]
    # 맥 키체인에 한 번 저장해 두면(대표님 2026-10-04 "오류 보고 니가 다이렉트로 보고 고칠 수 있게") 묻지 않고 꺼내 쓴다 — 열쇠 값은 화면·기록에 안 남는다.
    #   저장: security add-generic-password -U -a "$USER" -s chaochao-push-key -w   (값은 숨긴 채 묻는다)
    try:
        import subprocess
        k = subprocess.run(["security", "find-generic-password", "-a", os.environ.get("USER", ""), "-s", "chaochao-push-key", "-w"],
                           capture_output=True, text=True, timeout=20).stdout.strip()
        if k: return k
    except Exception: pass
    return getpass.getpass("관리자 열쇠(PUSH_KEY): ")


DONE = R / "tools" / "_bugs" / "처리됨.tsv"   # id ⇥ 처리한 때 ⇥ 한 줄 (2026-10-09) — 이 맥에만, 공개 저장소엔 안 올림(.gitignore)


def done_ids():
    try: return {l.split("\t")[0] for l in DONE.read_text(encoding="utf-8").splitlines() if l.strip()}
    except FileNotFoundError: return set()


def when(ms):
    return time.strftime("%m-%d %H:%M", time.localtime(ms / 1000))


def main():
    a = sys.argv[1:] or ["목록"]
    cmd = a[0]
    if cmd == "처리":
        DONE.parent.mkdir(exist_ok=True)
        with DONE.open("a", encoding="utf-8") as f: f.write(f"{a[1]}\t{time.strftime('%Y-%m-%d %H:%M')}\t{' '.join(a[2:])}\n")
        print("  ✓ 처리됨으로 적음", a[1]); return
    if cmd in ("목록", "새것"):
        j = call(act="bugs", key=key())
        if j.get("error"): print("  ✗", j["error"], "(워커가 옛 판이면 tools/club_worker.js 를 다시 붙여넣어 Deploy)"); return
        bugs = j.get("bugs", []); dn = done_ids()
        if cmd == "새것": bugs = [b for b in bugs if b["id"] not in dn]
        print(f"  보고 {len(bugs)}건" + ("(처리 안 한 것)" if cmd == "새것" else f" · 처리함 {sum(b['id'] in dn for b in bugs)}"))
        for b in bugs:
            c = b.get("ctx", {}) or {}
            w = (c.get("item") or {}).get("vi") or (c.get("quiz") or {}).get("word") or (c.get("flash") or {}).get("vi") or c.get("pair") or ""
            print(f"  {when(b['at'])}  {b.get('nick') or '-':<8} {KIND.get(b.get('kind'), b.get('kind')):<5} {c.get('title', '')[:14]:<14} {w[:16]:<16} {b.get('note', '')[:40]}   id={b['id']}{'  ✓' if b['id'] in dn else ''}")
        return
    if cmd == "보기":
        j = call(act="bug1", id=a[1], key=key())
        b = j.get("bug")
        if not b: print("  ✗", j.get("error") or "없음"); return
        c = b.get("ctx", {}) or {}
        print(f"  때 {when(b['at'])} · 별명 {b.get('nick')} · 종류 {KIND.get(b.get('kind'), b.get('kind'))} · 판 {c.get('ver')}")
        print(f"  화면 {c.get('view')} / 탭 {c.get('tab')} / 제목 {c.get('title')} · 목소리 {c.get('voice')} · 기기 {c.get('scr')} · {c.get('ua', '')[:70]}")
        for k in ("lesson", "theme", "face", "item", "quiz", "flash", "audio", "pair", "mview", "spd", "ctxErr"):
            if c.get(k) is not None: print(f"  {k}: {json.dumps(c[k], ensure_ascii=False)}")
        if b.get("note"): print(f"  한 줄: {b['note']}")
        if b.get("snap"):
            out = R / "tools" / "_bugs"; out.mkdir(exist_ok=True)
            css = (R / "style.css").resolve()
            html = ('<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=390">'
                    f'<link rel="stylesheet" href="file://{css}"><style>body{{max-width:390px;margin:0 auto}}</style></head>'
                    f'<body class="has-tabbar">{b["snap"]}</body></html>')
            p = out / (a[1].replace(":", "_") + ".html")
            p.write_text(html, encoding="utf-8")
            print(f"  화면 HTML → {p}  (열어서 그 사람이 본 화면을 본다)")
            webbrowser.open(p.as_uri())
        return
    if cmd == "지우기":
        if input(f"  {a[1]} 을(를) 지울까요? (y/N) ").strip().lower() != "y": return
        j = call(act="delbug", id=a[1], key=key())
        print("  ✓ 지움" if j.get("ok") else f"  ✗ {j.get('error')}")
        return
    if cmd == "진도초기화":
        if input(f"  계정 {a[1]} 의 서버 진도를 지울까요? (y/N) ").strip().lower() != "y": return
        j = call(act="resetprog", id=a[1], key=key())
        print("  ✓ 지움 (기기에 남은 진도는 앱의 내 정보 › 진도 초기화로)" if j.get("ok") else f"  ✗ {j.get('error')}")
        return
    print(__doc__)


if __name__ == "__main__":
    main()
