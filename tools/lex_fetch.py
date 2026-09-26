import json, re, sys, time, pathlib, urllib.parse, subprocess, unicodedata
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import fetch_batch as fb
SP = pathlib.Path('/private/tmp/claude-501/-Users-leesehyeon-----/d0dc869d-c57f-4a4f-b3b4-4891244877a1/scratchpad/sib')
UA = fb.UA
nfc = lambda s: unicodedata.normalize('NFC', s.strip().lower())
LINK = re.compile(r'\[\[([^\]|#]+)(?:\|[^\]]*)?\]\]')
LANGS = r'(eng|fra|zho|jpn|kor|rus|deu|spa|lat|ita|tha|khm|lao|nld|por|tur|ara|cmn|yue|hin)'

def api_wiki(host, titles):
    url = (f"https://{host}/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&titles="
           + urllib.parse.quote("|".join(titles)))
    for k in range(8):
        r = subprocess.run(["curl", "-sS", "-m", "60", "-w", "\n%{http_code}", "-H", f"User-Agent: {UA}", url], capture_output=True, text=True).stdout
        body, _, code = r.rpartition("\n")
        if code.strip() == "429" or not body.strip().startswith("{"):
            time.sleep(5 + k * 8); continue
        try: return json.loads(body)
        except Exception: time.sleep(3)
    return None

def parse_vi(wt):
    m = re.search(r'\{\{-vie-\}\}', wt)
    if not m: return None
    rest = wt[m.end():]
    n = re.search(r'\{\{-' + LANGS + r'-\}\}', rest)
    sec = rest[:n.start()] if n else rest
    parts = re.split(r'(?m)^\{\{-([^}]+?)-\}\}\s*$', sec)
    out = {'vs': [], 'va': [], 'vr': [], 'ko': []}
    for i in range(1, len(parts) - 1, 2):
        head, body = parts[i], parts[i + 1]
        if head == 'syn':
            out['vs'] += [nfc(x) for x in LINK.findall(body)]
        elif head == 'ant':
            out['va'] += [nfc(x) for x in LINK.findall(body)]
        elif head in ('related', 'see also'):
            out['vr'] += [nfc(x) for x in LINK.findall(body)]
        elif head == 'trans':
            for ln in body.split('\n'):
                if '{{ko}}' in ln:
                    for x in LINK.findall(ln):
                        if re.search(r'[가-힣]', x): out['ko'].append(x.strip())
    return out

def parse_en(wt):
    d = fb.vi_defs(wt)
    m = re.search(r'(?m)^==\s*Vietnamese\s*==\s*$', wt)
    es, ea = [], []
    if m:
        rest = wt[m.end():]; n = re.search(r'(?m)^==[^=]', rest); sec = rest[:n.start()] if n else rest
        for mm in re.finditer(r'\{\{(syn|synonyms|sy|ant|antonyms|an)\|vi\|([^{}]*)\}\}', sec):
            items = [x for x in mm.group(2).split('|') if x and '=' not in x[:6]]
            (es if mm.group(1).startswith(('syn', 'sy')) else ea).extend(nfc(x) for x in items)
    return {'en': d, 'es': es, 'ea': ea}

def run(titles, cache, path):
    todo = [t for t in titles if t not in cache]
    print('todo', len(todo), flush=True)
    for i in range(0, len(todo), 40):
        ch = todo[i:i + 40]
        res = {t: {} for t in ch}
        for host in ('vi.wiktionary.org', 'en.wiktionary.org'):
            j = api_wiki(host, ch)
            if not j: continue
            norm = {x.get('from'): x.get('to') for x in j['query'].get('normalized', [])}
            back = {v: k for k, v in norm.items()}
            for pg in j['query']['pages']:
                if pg.get('missing'): continue
                title = back.get(pg['title'], pg['title'])
                if title not in res: continue
                wt = pg['revisions'][0]['slots']['main']['content']
                p = parse_vi(wt) if host.startswith('vi') else parse_en(wt)
                if p: res[title].update(p)
            time.sleep(1.0)
        for t in ch: cache[t] = res[t]
        if (i // 40) % 10 == 0:
            json.dump(cache, open(path, 'w'), ensure_ascii=False); print(i + len(ch), '/', len(todo), flush=True)
    json.dump(cache, open(path, 'w'), ensure_ascii=False)

if __name__ == '__main__':
    tf = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2])
    titles = json.load(open(tf))
    cache = json.load(open(out)) if out.exists() else {}
    run(titles, cache, out)
    print('끝', len(cache), flush=True)
