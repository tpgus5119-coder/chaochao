"""메인교재 과 하나를 읽어 옮긴 글(book_text.txt)과 앱을 대조하는 공통 도구.
사용: python3 chk_common.py <과 폴더> [--final <gybm.json> <audio_index.json> [사이트주소]]
과 폴더에는 book_text.txt · cfg.json({"prefix": 앱 과 제목 앞부분, "prev": [앞 과 제목 앞부분들], "names": [...], "amb_names": [...], "glossary": [...], "nonword": [...], "expect": 낱말 수})가 있어야 한다."""
import collections, hashlib, json, pathlib, re, subprocess, sys, unicodedata
from concurrent.futures import ThreadPoolExecutor

ROOT = pathlib.Path.home() / "짜오짜오/베트남어-어플"
sys.path.insert(0, str(ROOT / "tools"))
nfc = lambda s: unicodedata.normalize("NFC", s)
key = lambda s: nfc(s) if nfc(s) in ("Anh", "Ý") else nfc(s).lower()
OLD = {"oẻ": "ỏe", "oè": "òe", "oé": "óe", "oẽ": "õe", "oẹ": "ọe", "oà": "òa", "oá": "óa", "oả": "ỏa", "oã": "õa", "oạ": "ọa",
       "uỳ": "ùy", "uý": "úy", "uỷ": "ủy", "uỹ": "ũy", "uỵ": "ụy", "Oẻ": "Ỏe", "Oà": "Òa"}


def modern(s):
    s = nfc(s)
    for a, b in OLD.items():
        s = re.sub(re.escape(a) + r"(?![^\W\d_])", b, s)      # 끝소리 없는 음절(khoẻ·hoà·thuý)만 현대 표기로
    return s


TITLES = {"anh", "chị", "ông", "bà", "cô", "em", "thầy", "bạn", "cậu", "bác", "chú", "cháu"}
D = pathlib.Path(sys.argv[1])
cfg = json.loads((D / "cfg.json").read_text(encoding="utf-8"))
NAMES = {nfc(x).lower() for x in cfg["names"]}
AMB = {nfc(x).lower() for x in cfg["amb_names"]}
dic = {nfc(x).strip().lower() for x in json.loads((ROOT / "data/_vi_words.json").read_text(encoding="utf-8"))}
dic_letters = {w for w in dic if re.fullmatch(r"[a-zà-ỹđ ]+", w)}

sections = collections.OrderedDict()
cur = None
for line in (D / "book_text.txt").read_text(encoding="utf-8").splitlines():
    if line.startswith("## "):
        cur = line[3:]
        sections[cur] = []
    elif cur:
        sections[cur].append(modern(line))

SPEAKER = re.compile(r"^\s*(?:[A-ZÀ-Ỹ][\wÀ-ỹ]*(?: [A-Z][\wÀ-ỹ]*)?|A|B|Thư ký)\s*:\s+")


def clauses(line):
    line = nfc(line)
    line = SPEAKER.sub("", line, count=1)
    line = re.sub(r"\([^)]*\)", lambda m: " , " + m.group(0)[1:-1].replace("/", " , ") + " , ", line)
    for part in re.split(r"[.,;:?!…/\-–\"“”]+", line):
        toks = re.findall(r"[A-Za-zÀ-ỹĐđ]+", part)
        if toks:
            yield toks


DYNAMIC_NAMES = bool(cfg.get("dynamic_names"))


def is_name(toks, i):
    t = toks[i]
    lo = t.lower()
    if not t[0].isupper():
        return False
    if DYNAMIC_NAMES and lo not in dic_letters and lo not in {"ai","anh","chị","em"}:
        return True
    if lo in NAMES:
        return True
    if lo in AMB and i > 0 and toks[i - 1].lower() in TITLES:
        return True
    return False


def segment(toks):
    n = len(toks)
    low = [t.lower() for t in toks]
    NEG = -10 ** 9
    best = [NEG] * (n + 1)
    back = [None] * (n + 1)
    best[0] = 0
    for i in range(n):
        if best[i] == NEG:
            continue
        if is_name(toks, i):
            if best[i] > best[i + 1]:
                best[i + 1] = best[i]
                back[i + 1] = (i, "NAME")
            continue
        for L in range(1, 6):
            if i + L > n:
                break
            if any(is_name(toks, i + k) for k in range(L)):
                break
            w = " ".join(low[i:i + L])
            if w in dic_letters:
                sc = best[i] + L * L
                if sc > best[i + L]:
                    best[i + L] = sc
                    back[i + L] = (i, w)
        sc = best[i] - 3
        if sc > best[i + 1]:
            best[i + 1] = sc
            back[i + 1] = (i, "?" + low[i])
    out = []
    j = n
    while j > 0:
        i, w = back[j]
        if w != "NAME":
            out.append(w)
        j = i
    return out[::-1]


def load_main(gpath):
    g = json.loads(pathlib.Path(gpath).read_text(encoding="utf-8"))
    return g, [s for s in g["sources"] if s["key"] == "main"][0]


def is_ch(title, prefix):
    """과 제목이 정확히 그 과인가('Bài ôn' 이 'Bài ôn (Review)' 와 섞이지 않게)"""
    return title == prefix or title.startswith(prefix + " · ")


def chapter_words(main, prefix):
    return [w for l in main["lessons"] if is_ch(l["title"], prefix) for w in l["words"]]


def segmentation():
    words = collections.OrderedDict()
    for sec, lines in sections.items():
        for ln in lines:
            for toks in clauses(ln):
                for w in segment(toks):
                    words.setdefault(w, []).append(sec.split()[0])
    return words


def report():
    g, main = load_main(ROOT / "data/gybm.json")
    words = segmentation()
    prev = {key(w["vi"]) for p in cfg["prev"] for w in chapter_words(main, p)}
    mine = chapter_words(main, cfg["prefix"])
    mk = {key(w["vi"]) for w in mine}
    where = collections.defaultdict(list)
    for l in main["lessons"]:
        for w in l["words"]:
            where[key(w["vi"])].append(l["title"])
    known = [w for w in words if not w.startswith("?")]
    unk = [w for w in words if w.startswith("?")]
    print(f"책 글에서 (사전 기준 붙여 나눈) 고유 낱말 {len(known)}개 · 사전에 없는 음절 {len(unk)}개: {unk}")
    print(f"앞 과 낱말 {len(prev)}개 · 이 과(앱) {len(mine)}개")
    in_prev = [w for w in known if w in prev]
    in_mine = [w for w in known if w in mk]
    miss = [w for w in known if w not in prev and w not in mk]
    print(f" - 앞 과에 이미 있음 {len(in_prev)} · 이 과에 있음 {len(in_mine)} · 둘 다 없음 {len(miss)}")
    print("\n[둘 다 없는 낱말 (앱 다른 과 위치)]")
    for w in miss:
        print(f"  {w:22} x{len(words[w])} 쪽 {sorted(set(words[w]), key=lambda s:(len(s), s))[:4]} 앱: {[t[:16] for t in where.get(w, [])][:2] or '—'}")
    kn = set(known)
    extra = [w["vi"] for w in mine if key(w["vi"]) not in kn]
    print(f"\n[앱 이 과에는 있는데 책 글에서 안 나온 것 {len(extra)}개]")
    print(" | ".join(extra))
    dup = [w["vi"] for w in mine if key(w["vi"]) in prev]
    print(f"\n[앱 이 과 안에서 앞 과와 겹치는 것 {len(dup)}개]", dup)


def final(gpath, ipath, base=None):
    from vi_kr import word as vkr
    g, main = load_main(gpath)
    idx = json.loads(pathlib.Path(ipath).read_text(encoding="utf-8"))
    ok = [True]

    def check(name, cond, detail=""):
        ok[0] &= bool(cond)
        print(("  통과 " if cond else "  실패 ") + name + (f" — {detail}" if detail else ""))

    prevw = [w for p in cfg["prev"] for w in chapter_words(main, p)]
    mine = chapter_words(main, cfg["prefix"])
    lessons = [l for l in main["lessons"] if is_ch(l["title"], cfg["prefix"])]
    v_prev = {key(w["vi"]) for w in prevw}
    v = [key(w["vi"]) for w in mine]
    print(f"메인 교재: 레슨 {len(main['lessons'])}개 · 낱말 {sum(len(l['words']) for l in main['lessons'])}개")
    print(f"이 과: 레슨 {len(lessons)}개 · 낱말 {len(mine)}개 · 앞 과 낱말 {len(prevw)}개")
    check(f"이 과 낱말 {cfg['expect']}개", len(mine) == cfg["expect"], str(len(mine)))
    check("이 과 안에 같은 낱말이 두 번 나오지 않음", len(v) == len(set(v)))
    check("앞 과와 겹치는 낱말이 없음(대소문자 구분)", not (set(v) & v_prev), str(sorted(set(v) & v_prev)))
    allprefix = list(cfg["prev"]) + [cfg["prefix"]]
    other = collections.Counter(key(w["vi"]) for l in main["lessons"] if not any(is_ch(l["title"], x) for x in allprefix) for w in l["words"])
    check("이 과 낱말이 메인의 다른 과에 또 있지 않음", not [x for x in v if x in other], str([x for x in v if x in other]))
    allv = set(v) | v_prev
    gl = cfg["glossary"]
    check(f"공식 낱말장 {len(gl)}개가 앞 과+이 과에 모두 있음", all(key(x) in allv for x in gl), str([x for x in gl if key(x) not in allv]))
    print("    (낱말장 중 앞 과에 있어 이 과에서 뺀 것:", [x for x in gl if key(x) in v_prev], ")")
    nonword = {nfc(x).lower() for x in cfg["nonword"]}
    txt = modern("\n".join(l for l in (D / "book_text.txt").read_text(encoding="utf-8").splitlines() if not l.startswith("##"))).lower()
    names_all = NAMES | AMB
    book = {t for t in re.findall(r"[a-zà-ỹđ]+", txt)}
    have = {s for w in prevw + mine for s in nfc(w["vi"]).lower().split()}
    miss = sorted(t for t in book if t not in have and t not in nonword and t not in names_all)
    check(f"읽은 글의 음절 {len(book)}개가 앞 과+이 과 낱말 안에 있음(이름·글자소리 빼고)", not miss, f"빠진 것 {miss}")
    words = segmentation()
    mk = set(v)
    skip = {nfc(x).lower() for x in cfg.get("skip", [])}
    missw = [w for w in words if not w.startswith("?") and w not in v_prev and w not in mk and w not in skip]
    check("사전 기준으로 붙여 나눈 책 낱말이 모두 앞 과+이 과에 있음", not missw, str(missw))
    noko = [w["vi"] for w in mine if not w.get("ko")]
    noex = [w["vi"] for w in mine if not (w.get("ex") or {}).get("vi")]
    badkr = [w["vi"] for w in mine if not re.fullmatch(r"[가-힣 ]+", w.get("kr_read") or "") or w["kr_read"] != vkr(w["vi"])]
    check("모든 낱말에 뜻·한글 발음·예문이 있고 한글 발음이 규칙과 같음", not (noko or noex or badkr), f"뜻없음 {noko} 예문없음 {noex} 발음이상 {badkr}")
    prefix = [w["vi"] for w in mine if re.match(r"^[가-힣A-Za-z ]{1,10}:\s", w["ex"]["ko"]) and ":" not in w["ex"]["vi"][:15]]
    check("예문 한국어 앞에 화자 이름이 혼자 붙어 있지 않음", not prefix, str(prefix))
    noimg = [w["vi"] for w in mine if not w.get("img")]
    check("모든 낱말에 그림이 있음", not noimg, str(noimg))
    missimg = [w["img"] for w in mine if w.get("img") and not (ROOT / "img" / w["img"]).exists()]
    check("그림 파일이 모두 있음", not missimg, str(missimg[:5]))
    k12 = lambda t: hashlib.sha1(t.encode()).hexdigest()[:12]
    texts = [w["vi"] for w in mine] + [w["ex"]["vi"] for w in mine]
    check(f"소리 목록에 낱말·예문 {len(set(texts))}개가 다 있음", all(t in idx and idx[t] == k12(t) for t in texts), str([t for t in texts if t not in idx][:5]))
    nof = [(x, t) for t in dict.fromkeys(texts) for x in "fm" if not ((ROOT / f"audio/{x}/n/{k12(t)}.mp3").exists() and (ROOT / f"audio/{x}/n/{k12(t)}.mp3").stat().st_size > 3000)]
    check("낱말·예문 여·남 소리 파일이 이 컴퓨터에 다 있음", not nof, str(nof[:5]))
    if base:
        def head(url):
            r = None
            for _ in range(3):
                r = subprocess.run(["curl", "-s", "-o", "/dev/null", "-I", "-w", "%{http_code}", "-m", "25", url], capture_output=True, text=True)
                if r.stdout.strip() == "200":
                    return "200"
            return r.stdout.strip()
        urls = [f"{base}/audio/{x}/n/{k12(t)}.mp3" for t in dict.fromkeys(texts) for x in "fm"]
        na = len(urls)
        urls += [f"{base}/img/{w['img']}" for w in mine if w.get("img")]
        with ThreadPoolExecutor(12) as ex:
            res = list(ex.map(head, urls))
        bad = [(u, c) for u, c in zip(urls, res) if c != "200"]
        check(f"소리 {na}개·그림 {len(urls) - na}개 파일이 사이트에서 모두 열림(200)", not bad, str(bad[:5]))
    print("최종:", "모두 통과" if ok[0] else "실패 있음")
    return ok[0]


if __name__ == "__main__":
    if "--final" in sys.argv:
        i = sys.argv.index("--final")
        a = sys.argv[i + 1:]
        sys.exit(0 if final(a[0], a[1], a[2] if len(a) > 2 else None) else 1)
    report()
