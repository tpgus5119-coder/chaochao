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
      "data/grammar.json", "data/exgloss.json", "data/sib.json", "data/siblings.json", "data/_lex_src.json", "data/_sib_meanings.json", "data/_sib_ko.json", "data/_sib_badrel.json", "data/_sib_goodrel.json", "tools/build_lex.py", "data/tonetest.json", "tools/build_tonetest.py", "tools/tone_audio_check.py", "data/_tone_audio_chk.json", "tools/build_basics.py", "data/_basics.json", "tools/assemble.py", "data/_sdef.json", "tools/sense_review/common.py", "tools/sense_review/sheet.py", "tools/sense_review/apply.py", "tools/sense_review/check.py", "tools/sense_review/뜻목록.tsv", "tools/sense_review/기본뜻.tsv", "tools/sense_review/짝.tsv", "tools/sense_review/예문_어긋남.tsv", "tools/sense_review/rec.py", "tools/sense_review/선배_교재와_다른뜻.tsv", "tools/trim_audio.py", "tools/apply_sib_meanings.py", "tools/gen_audio_list.py", "docs/기준.md", "docs/tts-조사.md", "docs/문법_대조.md", "tools/build_gram_main.py", "tools/gram_main_data1.py", "tools/gram_main_data2.py", "tools/build_gybm.py", "tools/stamp.py", "tools/mark_glossary.py", "tools/build_boost.py", "tools/build_job_boost.py", "tools/asr_audit.py", "tools/voice_audit.py", "data/_imgprompts.json", "tools/img_prompt_gen.py", "tools/gen_word_img.py", "tools/club_worker.js", "tools/bug_admin.py", "tools/fetch_hanviet.py", "tools/attach_hanviet.py", "data/_hanviet.json", "data/_hanja_hun.json", "data/_hanja_hun_manual.json", "tools/fetch_hanja_hun.py", "data/_pos.json",
      "data/weekly.json", "data/_seg.json", "data/_senses.json", "data/_seg_voc.json", "tools/seg_check.py", "tools/dict_senses.py", "tools/dict_ko_draft.py",
      "data/_roots.json", "tools/make_roots.py", "tools/build_roots.py", "tools/fetch_etym.py", "tools/fetch_etym_vi.py", "tools/clean_hanja_hun.py",
      "tools/roots/한자_판정.tsv", "tools/roots/외래어_판정.tsv", "tools/roots/뺀_낱말.tsv", "data/_etym_raw.json", "data/_etym_raw_vi.json", "data/_roots_cand.json",
      "tools/img_word_text.py", "tools/img_erase_word.py", "tools/img_erase_keyed.py", "tools/img_scene_redraw.py", "tools/img_text_redraw.json", "tools/ocr_box.swift", "tools/bin/ocr_box",
      "data/_img_ocr.json", "data/_img_wordtext.json", "data/_img_wordtext_done.json", "data/_dict_ko.json", "data/_dict_head.json", "data/topic_links.json", "tools/gram_audit/add.py", "tools/gram_audit/교재_문법목록.tsv", "tools/rel_fetch.py", "data/_kr_syl.json", "tools/fix_senior/고침표.tsv", "tools/fix_senior/apply.py", "tools/fix_senior/clean_en.py", "tools/fix_senior/뜻_손질.tsv", "tools/fix_senior/new_img.py", "tools/fix_senior/new_img.json", "tools/fix_senior/이름_외래어_뜻.tsv", "tools/rel_sense/뜻별_짝.tsv", "tools/rel_sense/apply.py"] + [f"tools/dict_one/one_{i:02d}.ko.tsv" for i in range(19)] + ["tools/dict_multi/merge.py"] + [f"tools/dict_multi/m{i:03d}.ko.tsv" for i in range(86)] + ["tools/dict_multi/m_hand.ko.tsv"] + ["tools/dict_vw/make_sheets.py", "tools/dict_vw/PROMPT.md", "tools/dict_vw/chk.py"] + [f"tools/dict_vw/vw_{i:02d}.ko.tsv" for i in range(29)] + ["data/exam1.json"] + [f"img/exam1-{k}.webp" for k in ["l1","l2","l3","l4","l5","pa","pb","pc","pd","pe","w3"]]   # 시험지 그림(그림 고르기 보기는 img 칸이 아니라 수집기가 못 본다)   # 베트남어 위키낱말에만 있던 낱말 15,346 (2026-09-30, Sonnet 보조가 씀)   # 한자·외래어 뿌리 낱말별 검수 (2026-09-28 밤) — 근거 원문까지   # 주간 시험 회차·묶음 검수·뜻 여러 개 (2026-09-28)
# 교재 예문을 교재 문장으로 (2026-09-29) — 도구·판정표·쪽 이미지로 확인한 번호·손으로 옮긴 문장, 녹음 채우기·뜻 끼워 넣기
MY += ["tools/fill_audio.py", "tools/sense_review/insert_sense.py"] + [f"tools/book_ex/{n}" for n in ("build_pool.py", "cand.py", "qwen_pass.py", "review.py", "strips.py", "rec_ex.py", "apply_ex.py", "check_ex.py", "예문판정.tsv", "확인.txt", "src/손문장.tsv")] + [".gitignore"]   # 교재 전체 글(src/·pool·cand)은 교재를 통째로 옮긴 것이라 공개 저장소에 안 올린다
# 낱말 하나씩 검사(뜻·발음·짝·녹음 받아쓰기)와 클로드가 지은 유의어·반의어 (2026-09-29)
MY += ["tools/word_check/asr_recheck.py", "data/_asr_recheck.jsonl"]
MY += ["tools/word_check/asr_num.py", "data/_asr_num.jsonl"]
MY += ["data/_dict_skip.json", "data/_dict_en.json", "tools/dict_en/build.py", "tools/word_check/fix_kr.py", "tools/compound/판정.tsv", "tools/compound/_후보.tsv"]   # 사전 문장 빼기·영어 열쇠·발음 고침·붙은 말 판정 (2026-09-29)
MY += ["data/_south.json", "tools/south/남부.tsv", "tools/south/참고사전_남부.tsv", "tools/south/build.py", "tools/south/make_dict_south.py", "tools/gloss_all.py", "tools/fetch_raw_more.py"]
MY += ["data/daily22.json", "tools/daily22/build.py", "tools/daily22/문장.tsv"]
MY += ["tools/word_check/tone_check.py", "data/_tone_check.json"]   # 성조 잣대 (2026-09-30)   # 매일 단어 시험 (2026-09-30)
MY += ["tools/notes/필기_낱말.tsv", "tools/notes/add.py", "tools/notes/img.py"]   # 대표님 필기 낱말 → 일상회화 (2026-09-30)   # 남부 딱지·뜻풀이 전부 뽑기 (2026-09-29 밤)
MY += [f"tools/rel_mine/{n}" for n in ("apply.py", "짝.tsv", "뜻_새로.tsv")] + [f"tools/word_check/{n}" for n in ("asr.py", "sheet.py", "apply_k.py", "carrier.mp3", "검사표.tsv", "k_고침.tsv", "짝_삭제.tsv", "_main_words.json")] + ["data/_asr_word.jsonl"]
# 위키낱말사전에 표시된 유의어·반의어 넣기 + 클로드 뜻별 판정 (2026-09-29)
MY += ["tools/rel_parse.py"] + [f"tools/rel_import/{n}" for n in ("apply.py", "pairs.tsv", "뜻판정.tsv", "뜻_새로.tsv", "갈래.tsv")]
# 일상·직무·선배·22기 예문이 기본 뜻(자료에 적힌 뜻)으로 쓰였나 검사·새로 쓴 예문 (2026-09-29)
MY += [f"tools/sense_review/{n}" for n in ("ex_check.py", "ex_write.py", "예문_새로씀.tsv")]
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
# 성조 테스트 보기 낱말의 소리 (2026-09-28 — 성조 가족 음절 3,201개 소리를 새로 만들었다)
for _fam in json.loads((ROOT / "data/tonetest.json").read_text(encoding="utf-8"))["f"]:
    for _r in _fam:
        texts.add(_r[0])
# 녹음을 채운 낱말(헷갈리는 짝 상대·사전 낱말 — tools/fill_audio.py 가 모으는 것과 같게, 2026-09-29)
import fill_audio
texts |= set(fill_audio.collect())
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
tree_files = [l for l in git("ls-tree", "-r", "--name-only", "origin/main", "audio/f/n", "audio/m/n").splitlines() if l.endswith(".mp3")]
# 앱 데이터가 부르는 글의 소리는 색인에서 빠졌어도 지우지 않고 색인에 다시 잇는다 (2026-09-29).
#   아침 봇이 옛 색인을 올려 nờ·pờ·xờ 등 9개 키가 빠졌고, 그 뒤 이 정리가 '색인에 없는 파일'로 보고 지웠다 — 글자 카드 소리가 기계 목소리로 나왔다.
_need = {k12(t): t for t in texts}
_in_tree = {}
for q in tree_files:
    _in_tree.setdefault(q.rsplit("/", 1)[1][:-4], set()).add(q.split("/")[1])
healed = [_need[h] for h, vs in _in_tree.items() if h in _need and vs >= {"f", "m"} and oi.get(_need[h]) != h]
for t in healed: oi[t] = k12(t)
if healed:
    sha = subprocess.run(["git", "hash-object", "-w", "--stdin"], cwd=ROOT, capture_output=True, text=True, env=env, input=json.dumps(oi, ensure_ascii=False)).stdout.strip()
    git("update-index", "--add", "--cacheinfo", f"100644,{sha},data/audio_index.json", env=env)
print(f"색인에 다시 이은 소리 {len(healed)}")
vals = set(oi.values())
orphans = [q for q in tree_files if q.rsplit("/", 1)[1][:-4] not in vals and q.rsplit("/", 1)[1][:-4] not in _need]
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
# ── 교재 원문(저작권)은 공개 저장소에 두지 않는다 — 아침 봇(card_ship.sh 의 git add -A)이 2026-09-29 새벽에 쓸어 올린 것을 뺀다.
#    이 맥의 파일은 그대로 둔다(올린 판에서만 뺀다). 다시 안 올라가게 .gitignore 에도 적었다.
_nopub = _re.compile(r"tools/book_ex/(src/.*|pool\.json|cand\.json|qwen\.json)$")   # src/ 전부 — 손문장.tsv(쪽 이미지를 보고 옮긴 교재 문장)도 교재 원문이다 (2026-09-29 밤)
book_src = [q for q in git("ls-tree", "-r", "--name-only", "origin/main", "tools/book_ex").splitlines() if _nopub.match(q)]
if book_src:
    gone = "".join(f"0 {'0' * 40}\t{q}\n" for q in book_src)
    subprocess.run(["git", "update-index", "--index-info"], cwd=ROOT, input=gone, text=True, capture_output=True, check=True, env=env)
print(f"교재 원문 뺌 {len(book_src)}")
# ── 앱이 안 쓰는 것은 서버에 두지 않는다 (2026-09-29, 대표님: "한국어 학습 앱용 tts·자료는 서버에 없어도 된다 · 맥북에만 있으면 됨").
#    audio/ko-qwen·ko-qwen2 = Qwen 목소리 시험본(앱 코드가 부르지 않음, 45MB) · scratchpad·_보관 = 작업 중 임시 파일. 이 맥의 파일은 그대로 둔다.
#    audio/ko-f·ko-m = 한국어 뜻 소리 4,134×2 (159MB). 2026-09-07 "한국어 코스 분리" 때 색인 data/ko_audio_index.json 을 지워 앱(speakKo)이 이 파일을 부를 길이 없다 — 늘 폰 목소리(sysSpeakKo)로 간다.
#    아침 봇의 git add -A 가 도로 올린 것. 서버에서만 뺀다(맥의 파일은 그대로) — 대표님 2026-09-29 "안 쓰는 건 서버에 없어도 됨".
#    (2026-09-29 밤) 한글 경로(_보관/…)는 git 이 "\353\263\264…" 로 따옴표를 쳐 startswith 가 못 잡았다 → core.quotePath=false. 그래서 _보관 139개가 서버에 남아 있었다.
#    data/ 에서 앱(app.js·sw.js·index.html)이 이름을 부르지 않는 파일도 뺀다 — 뜻풀이 원문·검수 기록 등 144개 58.6MB. 구글 드라이브 data_서버제외_2026-09-29 에 복사해 뒀고 맥의 파일은 그대로.
_origin_all = git("-c", "core.quotePath=false", "ls-tree", "-r", "--name-only", "origin/main").splitlines()
_app_txt = "".join((ROOT / f).read_text(encoding="utf-8") for f in ("app.js", "sw.js", "index.html") if (ROOT / f).exists())
_data_unused = [q for q in _origin_all if q.startswith("data/") and q.rsplit("/", 1)[-1] not in _app_txt]
_unused = [q for q in _origin_all if q.startswith(("audio/ko-qwen/", "audio/ko-qwen2/", "scratchpad/", "_보관/", "audio/ko-f/", "audio/ko-m/")) or q == "data/compound.json"] + _data_unused   # compound.json = 걷어낸 붙은 말 접기 자료 (2026-09-29 밤)
if _unused:
    gone = "".join(f"0 {'0' * 40}\t{q}\n" for q in _unused)
    subprocess.run(["git", "update-index", "--index-info"], cwd=ROOT, input=gone, text=True, capture_output=True, check=True, env=env)
print(f"앱이 안 쓰는 파일 뺌 {len(_unused)} (그중 data/ {len(_data_unused)})")
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
