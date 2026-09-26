import json, pathlib, re, subprocess, sys, time, urllib.parse, unicodedata as U
R = pathlib.Path('/Users/leesehyeon/짜오짜오/베트남어-어플')
SP = pathlib.Path('/private/tmp/claude-501/-Users-leesehyeon-----/d0dc869d-c57f-4a4f-b3b4-4891244877a1/scratchpad/sib')
UA = "chaochao-vn-app/1.0 (learning app dictionary check; contact tpgus5119@gmail.com)"
nfc = lambda s: U.normalize('NFC', s)

def api(titles):
    url = ("https://en.wiktionary.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&titles="
           + urllib.parse.quote("|".join(titles)))
    for k in range(8):
        r = subprocess.run(["curl", "-sS", "-m", "60", "-w", "\n%{http_code}", "-H", f"User-Agent: {UA}", url], capture_output=True, text=True).stdout
        body, _, code = r.rpartition("\n")
        if code.strip() == "429" or not body.strip().startswith("{"):
            time.sleep(5 + k * 8); continue
        try: return json.loads(body)
        except Exception: time.sleep(3)
    return None

def clean(t):
    t = re.sub(r"<!--.*?-->", "", t, flags=re.S)
    t = re.sub(r"<ref[^>]*>.*?</ref>|<ref[^>]*/>", "", t, flags=re.S)
    t = re.sub(r"<[^>]+>", "", t)
    for _ in range(6):
        def rep(m):
            parts = m.group(1).split("|")
            name = parts[0].strip().lower(); a = parts[1:]
            a = [x for x in a if "=" not in x.split("[[")[0][:12] or x.startswith("t=")]
            if name in ("l", "link", "m", "mention", "l-self", "ll") : 
                # {{l|vi|X|tr|t=gloss}}: 표제어 X 만
                return a[1] if len(a) > 1 else ""
            if name in ("lb", "lbl", "label", "context"): return "(" + ", ".join(x for x in a[1:] if x) + ")" if len(a) > 1 else ""
            if name in ("gloss", "gl", "qualifier", "q", "i", "qual"): return "(" + ", ".join(a) + ")"
            if name in ("w", "pedia"): return a[-1] if a else ""
            if name in ("alt form", "alternative form of", "alt form of", "altform", "alter"): return "alternative form of " + (a[1] if len(a) > 1 else "")
            if name in ("synonym of", "syn of", "senseid"): return ("synonym of " + a[1]) if name != "senseid" and len(a) > 1 else ""
            if name in ("vi-alternative spelling of", "vi-alt sp", "vi-alt spelling of", "vi-alt sp of"): return "alternative spelling of " + (a[0] if a else "")
            if name in ("vi-sino", "sino-vietnamese reading of", "vi-sv") : return "Sino-Vietnamese"
            if name in ("n-g", "non-gloss definition", "non-gloss", "ngd"): return " ".join(a)
            if name in ("short for", "clipping of", "abbreviation of", "abbr of", "initialism of", "vi-short for"):
                tgt = a[1] if len(a) > 1 else ""; gl = a[3] if len(a) > 3 else ""
                return ("short for " + tgt + (" (" + gl + ")" if gl else "")).strip()
            if "of" in name and len(a) > 1: return name + " " + a[1]
            return ""
        t2 = re.sub(r"\{\{([^{}]*)\}\}", rep, t)
        if t2 == t: break
        t = t2
    t = re.sub(r"\[\[(?:[^\]|]*\|)?([^\]]*)\]\]", r"\1", t)
    t = re.sub(r"'{2,}", "", t)
    return re.sub(r"\s+", " ", t).strip(" ,;")

def vi_defs(wt):
    m = re.search(r"(?m)^==\s*Vietnamese\s*==\s*$", wt)
    if not m: return ""
    rest = wt[m.end():]
    n = re.search(r"(?m)^==[^=]", rest)
    sec = rest[:n.start()] if n else rest
    out, pos = [], ""
    for line in sec.split("\n"):
        h = re.match(r"^={3,4}\s*([^=]+?)\s*={3,4}\s*$", line)
        if h: pos = h.group(1); continue
        if re.match(r"^#(?![:*#])", line):
            g = clean(line[1:])
            if g and len(g) > 1: out.append(f"({pos}) {g}" if pos else g)
    return " / ".join(out[:6])[:500]

if __name__ == "__main__":
    s = json.load(open(R/'data/siblings.json'))
    need = set()
    for kind in ('tone', 'shape'):
        for k, f in s[kind].items():
            for m in f.get('m', []):
                if not m[1]: need.add(m[0])
            for u in f.get('u', []): need.add(u)
    cache = json.load(open(SP/'defs.json')) if (SP/'defs.json').exists() else {}
    todo = [w for w in sorted(need) if w not in cache]
    lim = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    if lim: todo = todo[:lim]
    print('need', len(need), 'todo', len(todo), flush=True)
    for i in range(0, len(todo), 40):
        ch = todo[i:i+40]
        j = api(ch)
        if not j: print('fail chunk', i, flush=True); continue
        got = {}
        norm = {x.get('from'): x.get('to') for x in j['query'].get('normalized', [])}
        for pg in j['query']['pages']:
            if pg.get('missing'): got[pg['title']] = ""; continue
            wt = pg['revisions'][0]['slots']['main']['content']
            got[pg['title']] = vi_defs(wt)
        for w in ch:
            cache[w] = got.get(norm.get(w, w), got.get(w, ""))
        json.dump(cache, open(SP/'defs.json', 'w'), ensure_ascii=False)
        print(i + len(ch), '/', len(todo), 'have', sum(1 for w in ch if cache[w]), flush=True)
        time.sleep(1.5)
    print('done', len(cache), 'with def', sum(1 for v in cache.values() if v), flush=True)
