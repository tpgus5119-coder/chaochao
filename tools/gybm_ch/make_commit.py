"""내 파일만 origin/main 위에 얹어 올린다(임시 색인). 사용: python3 make_commit.py "<메시지>" [--dry]
media(img·audio)는 gybm·days·order 데이터가 가리키는 것 중 origin 과 다른 것만 올린다. audio_index.json 은 origin 것에 내 텍스트 키만 더한다."""
import hashlib, json, os, pathlib, subprocess, sys, tempfile
ROOT = pathlib.Path.home() / "짜오짜오/베트남어-어플"
msg = sys.argv[1]; dry = "--dry" in sys.argv
k12 = lambda t: hashlib.sha1(t.encode()).hexdigest()[:12]
def git(*a, env=None, inp=None):
    r = subprocess.run(["git", *a], cwd=ROOT, capture_output=True, text=True, env=env, input=inp)
    if r.returncode: raise SystemExit(f"git {a[:2]} 실패: {r.stderr[:300]}")
    return r.stdout.strip()
git("fetch", "origin")
MY = ["app.js", "style.css", "icon.png", "icon-192.png", "icon-180.png", "manifest.json", "pitch.js", "mouth.js", "pet.js", "judge.js", "index.html", "sw.js", "data/days.json", "data/order.json", "data/gybm.json", "data/realbook.json",
      "data/siblings.json", "data/basicwords.json", "data/basicword_sets.json", "data/senior.json", "data/cohort22.json", "data/_book_glossary.json", "data/_boost_words.json", "data/_job_boost.json",
      "data/grammar.json", "data/exgloss.json", "data/sib.json", "data/siblings.json", "data/_lex_src.json", "data/_sib_meanings.json", "data/_sib_ko.json", "data/_sib_badrel.json", "data/_sib_goodrel.json", "tools/build_lex.py", "tools/trim_audio.py", "tools/apply_sib_meanings.py", "tools/gen_audio_list.py", "docs/기준.md", "docs/tts-조사.md", "docs/문법_대조.md", "tools/build_gram_main.py", "tools/gram_main_data1.py", "tools/gram_main_data2.py", "tools/build_gybm.py", "tools/stamp.py", "tools/mark_glossary.py", "tools/build_boost.py", "tools/build_job_boost.py", "tools/asr_audit.py", "tools/voice_audit.py", "data/_imgprompts.json", "tools/img_prompt_gen.py", "tools/gen_word_img.py", "tools/club_worker.js", "tools/bug_admin.py", "tools/fetch_hanviet.py", "tools/attach_hanviet.py", "data/_hanviet.json", "data/_hanja_hun.json", "data/_hanja_hun_manual.json", "tools/fetch_hanja_hun.py", "data/_pos.json",
      "data/weekly.json", "data/_seg.json", "data/_senses.json", "data/_seg_voc.json", "tools/seg_check.py", "tools/dict_senses.py", "tools/dict_ko_draft.py",
      "data/_roots.json", "tools/make_roots.py", "tools/build_roots.py", "tools/fetch_etym.py", "tools/fetch_etym_vi.py", "tools/clean_hanja_hun.py",
      "tools/roots/한자_판정.tsv", "tools/roots/외래어_판정.tsv", "tools/roots/뺀_낱말.tsv", "data/_etym_raw.json", "data/_etym_raw_vi.json", "data/_roots_cand.json",
      "tools/img_word_text.py", "tools/img_erase_word.py", "tools/img_erase_keyed.py", "tools/img_scene_redraw.py", "tools/img_text_redraw.json", "tools/ocr_box.swift", "tools/bin/ocr_box",
      "data/_img_ocr.json", "data/_img_wordtext.json", "data/_img_wordtext_done.json", "data/_dict_ko.json", "tools/fix_senior/고침표.tsv", "tools/fix_senior/apply.py", "tools/fix_senior/clean_en.py", "tools/fix_senior/뜻_손질.tsv", "tools/fix_senior/new_img.py", "tools/fix_senior/new_img.json", "tools/fix_senior/이름_외래어_뜻.tsv", "tools/rel_sense/뜻별_짝.tsv", "tools/rel_sense/apply.py"] + [f"tools/dict_one/one_{i:02d}.ko.tsv" for i in range(19)]   # 한자·외래어 뿌리 낱말별 검수 (2026-09-28 밤) — 근거 원문까지   # 주간 시험 회차·묶음 검수·뜻 여러 개 (2026-09-28)
MY = [f for f in MY if (ROOT / f).exists()]   # 아직 없는 파일(_senses.json 은 검수 뒤 생김)은 건너뛴다
MY += [str(p.relative_to(ROOT)) for p in (ROOT / "tools/gybm_ch").glob("*") if p.is_file()]
# origin 쪽에서 내 파일이 바뀌지 않았는지 (index.html·sw.js 는 판번호만)
chk = [f for f in MY if f not in ("index.html", "sw.js", "data/audio_index.json")]
tracked = [f for f in chk if git("ls-tree", "origin/main", f)]
# 로컬 HEAD 는 자동 작업(카드뉴스 봇)이 내 작업 중인 파일까지 끌어안고 로컬 커밋을 만들었을 수 있다(2026-09-26 확인) —
# 그래서 HEAD 가 아니라 **HEAD 와 origin 의 공통 조상**과 견준다.
base = git("merge-base", "HEAD", "origin/main")
r = subprocess.run(["git", "diff", "--quiet", base, "origin/main", "--", *tracked], cwd=ROOT)
if r.returncode: raise SystemExit("origin 쪽에서 내 파일이 바뀌었다 — 손으로 확인")
# 데이터가 가리키는 그림·소리
imgs, texts = set(), set()
def walk(o):
    if isinstance(o, dict):
        if isinstance(o.get("img"), str) and o["img"].endswith(".webp"): imgs.add(o["img"])
        if isinstance(o.get("vi"), str) and "ko" in o:
            texts.add(o["vi"]); ex = o.get("ex")
            if isinstance(ex, dict) and isinstance(ex.get("vi"), str): texts.add(ex["vi"])
            if isinstance(ex, str): texts.add(ex)                       # 글자 카드의 예시 낱말(문자열)
            if isinstance(o.get("snd"), str): texts.add(o["snd"])      # 글자 소리(모음 하나·자음 학교식 bờ·cờ…) (2026-09-27)
        for v in o.values(): walk(v)
    elif isinstance(o, list):
        for v in o: walk(v)
for f in ("gybm", "days", "order", "grammar", "weekly"): walk(   # weekly: 주간 시험 그림   # grammar: 줌 수업 문법 예문 소리도 올린다 (2026-09-27)
    json.loads((ROOT / f"data/{f}.json").read_text(encoding="utf-8")))
sys.path.insert(0, str(ROOT / "tools"))
import build_gram_main            # 메인 교재 문법의 소리(예문·문장 안 낱말·핵심 낱말)도 같이 올린다
texts |= set(build_gram_main.all_texts())
# 헷갈리는 짝 낱말과, 모든 문장 안 낱말(눌러 듣기 — 원래 글자와 소문자 둘 다)의 소리도 같이 올린다 (2026-09-26)
import re as _re0
_sib = json.loads((ROOT / "data/sib.json").read_text(encoding="utf-8"))
for _w in _sib["w"]:
    texts.add(_w)
for _t in list(texts):
    for _w in _re0.sub(r'[,.!?;:…"“”‘’()]', " ", _t).split():
        texts.add(_w); texts.add(_w.lower())
files = list(MY)
for i in sorted(imgs):
    if (ROOT / "img" / i).exists(): files.append(f"img/{i}")
idx_w = json.loads((ROOT / "data/audio_index.json").read_text(encoding="utf-8"))
for t in sorted(texts):
    if idx_w.get(t) == k12(t):
        for v in "fm":
            p = f"audio/{v}/n/{k12(t)}.mp3"
            if (ROOT / p).exists(): files.append(p)
tmp = tempfile.mktemp(); env = {**os.environ, "GIT_INDEX_FILE": tmp}
git("read-tree", "origin/main", env=env)
osha = {}
for line in git("ls-tree", "-r", "origin/main").splitlines():
    meta, path = line.split("\t", 1); osha[path] = meta.split()[2]
def blob(path):
    data = (ROOT / path).read_bytes(); return hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()
changed = []
for f in dict.fromkeys(files):
    if osha.get(f) == blob(f): continue
    changed.append(f)
n_new = len(changed); n_same = len(set(files)) - n_new
subprocess.run(["git", "hash-object", "-w", "--stdin-paths"], cwd=ROOT, input="\n".join(changed) + "\n", text=True, capture_output=True, check=True, env=env)
info = "".join(f"100644 {blob(f)}\t{f}\n" for f in changed)
subprocess.run(["git", "update-index", "--add", "--index-info"], cwd=ROOT, input=info, text=True, capture_output=True, check=True, env=env)
# audio_index: origin + 내 키
oi = json.loads(git("show", "origin/main:data/audio_index.json"))
add = {t: idx_w[t] for t in texts if idx_w.get(t) == k12(t)}
before = len(oi); oi.update(add)
sha = subprocess.run(["git", "hash-object", "-w", "--stdin"], cwd=ROOT, capture_output=True, text=True, env=env, input=json.dumps(oi, ensure_ascii=False)).stdout.strip()
git("update-index", "--add", "--cacheinfo", f"100644,{sha},data/audio_index.json", env=env)
# ── 쓰이지 않는 소리 파일(색인 어디에도 없는 해시) 지우기 — 저장소가 1GB(사이트 한도)에 닿아 간다 (2026-09-26).
#    앱은 소리를 색인(글→해시)으로만 찾는다. 색인에 없는 파일은 아무도 못 부른다. 데이터 파일이 해시를 직접 들고 있는지도 확인한다.
import re as _re
vals = set(oi.values())
tree_files = [l for l in git("ls-tree", "-r", "--name-only", "origin/main", "audio/f/n", "audio/m/n").splitlines() if l.endswith(".mp3")]
orphans = [q for q in tree_files if q.rsplit("/", 1)[1][:-4] not in vals]
held = set()
for q in git("ls-tree", "-r", "--name-only", "origin/main", "data").splitlines():
    if q.endswith(".json") and q != "data/audio_index.json":
        held |= set(_re.findall(r"\b[0-9a-f]{12}\b", git("show", f"origin/main:{q}")))
orphans = [q for q in orphans if q.rsplit("/", 1)[1][:-4] not in held]
if "--no-prune" not in sys.argv and orphans:
    gone = "".join(f"0 {'0' * 40}\t{q}\n" for q in orphans)
    subprocess.run(["git", "update-index", "--index-info"], cwd=ROOT, input=gone, text=True, capture_output=True, check=True, env=env)
print(f"쓰이지 않는 소리 파일 지움 {len(orphans) if '--no-prune' not in sys.argv else 0}")
# ── 쓰이지 않는 그림(어느 데이터·코드에도 이름이 없는 img/*) 지우기 — 대표님 지시 2026-09-27 밤 ("사용하지 않는 이미지 정리").
#    모든 data/*.json(l)·app.js·index.html·style.css·sw.js·manifest 의 본문에서 파일 이름이 보이면 쓰는 것으로 친다(표지·차트도 데이터에 이름이 있다).
_ref = ""
for q in git("ls-tree", "-r", "--name-only", "origin/main").splitlines():
    if (q.startswith("data/") and (q.endswith(".json") or q.endswith(".jsonl"))) or q in ("app.js", "index.html", "style.css", "sw.js", "manifest.json", "voice-vi.html", "voice-ko.html", "privacy.html"):
        _ref += git("show", f"origin/main:{q}") if not (ROOT / q).exists() else (ROOT / q).read_text(encoding="utf-8", errors="ignore")
for f in files:
    if f.startswith("data/") and (ROOT / f).exists(): _ref += (ROOT / f).read_text(encoding="utf-8", errors="ignore")
# 이름을 집합으로 뽑아 견준다 — 60MB 글에 8천 번 부분 문자열 검색을 하면 30분이 넘게 걸린다(2026-09-27 밤 실제로 그랬다)
_names = set(_re.findall(r"[^\s\"'<>()\[\]{},:]+\.(?:webp|svg|png|jpg|jpeg|gif)", _ref))
_imgs = [l for l in git("ls-tree", "-r", "--name-only", "origin/main", "img").splitlines()]
img_orphans = [q for q in _imgs if q.rsplit("/", 1)[1] not in _names and q not in files]
if "--no-prune" not in sys.argv and img_orphans:
    gone = "".join(f"0 {'0' * 40}\t{q}\n" for q in img_orphans)
    subprocess.run(["git", "update-index", "--index-info"], cwd=ROOT, input=gone, text=True, capture_output=True, check=True, env=env)
print(f"쓰이지 않는 그림 지움 {len(img_orphans) if '--no-prune' not in sys.argv else 0}")
print(f"올릴 파일 {n_new} · origin 과 같아 건너뜀 {n_same} · 소리 목록 {before} → {len(oi)}")
if dry: raise SystemExit("dry")
tree = git("write-tree", env=env)
c = git("commit-tree", tree, "-p", "origin/main", "-m", msg + "\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>")
git("push", "origin", f"{c}:refs/heads/main")
print("올림", c)
if "--no-prune" not in sys.argv:
    for q in orphans:
        try: (ROOT / q).unlink()
        except FileNotFoundError: pass
git("fetch", "origin"); git("reset", "--mixed", c)
