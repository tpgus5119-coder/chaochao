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
MY = ["app.js", "style.css", "pitch.js", "mouth.js", "index.html", "sw.js", "data/days.json", "data/order.json", "data/gybm.json", "data/realbook.json",
      "data/siblings.json", "data/basicwords.json", "data/basicword_sets.json", "data/senior.json", "data/cohort22.json", "data/_book_glossary.json", "data/_boost_words.json", "data/_job_boost.json",
      "docs/기준.md", "docs/문법_대조.md", "tools/build_gybm.py", "tools/stamp.py", "tools/mark_glossary.py", "tools/build_boost.py", "tools/build_job_boost.py"]
MY += [str(p.relative_to(ROOT)) for p in (ROOT / "tools/gybm_ch").glob("*") if p.is_file()]
# origin 쪽에서 내 파일이 바뀌지 않았는지 (index.html·sw.js 는 판번호만)
chk = [f for f in MY if f not in ("index.html", "sw.js", "data/audio_index.json")]
tracked = [f for f in chk if git("ls-tree", "origin/main", f)]
r = subprocess.run(["git", "diff", "--quiet", "HEAD", "origin/main", "--", *tracked], cwd=ROOT)
if r.returncode: raise SystemExit("origin 쪽에서 내 파일이 바뀌었다 — 손으로 확인")
# 데이터가 가리키는 그림·소리
imgs, texts = set(), set()
def walk(o):
    if isinstance(o, dict):
        if isinstance(o.get("img"), str) and o["img"].endswith(".webp"): imgs.add(o["img"])
        if isinstance(o.get("vi"), str) and "ko" in o:
            texts.add(o["vi"]); ex = o.get("ex")
            if isinstance(ex, dict) and isinstance(ex.get("vi"), str): texts.add(ex["vi"])
        for v in o.values(): walk(v)
    elif isinstance(o, list):
        for v in o: walk(v)
for f in ("gybm", "days", "order"): walk(json.loads((ROOT / f"data/{f}.json").read_text(encoding="utf-8")))
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
print(f"올릴 파일 {n_new} · origin 과 같아 건너뜀 {n_same} · 소리 목록 {before} → {len(oi)}")
if dry: raise SystemExit("dry")
tree = git("write-tree", env=env)
c = git("commit-tree", tree, "-p", "origin/main", "-m", msg + "\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>")
git("push", "origin", f"{c}:refs/heads/main")
print("올림", c)
git("fetch", "origin"); git("reset", "--mixed", c)
