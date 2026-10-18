#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""낱말(두 음절 이상)·예문 소리 전체 점검 2판 (2026-10-18 오류 보고 '"Bà" có thanh huyền' — "예문과 단어들 문장들 모두 발음 점검 제대로 해라").
알게 된 것(실측):
 · 1초 안팎의 짧은 낱말은 Whisper 가 **새로 만든 멀쩡한 소리도** 틀리게 받아쓴다(tai nghe → 'Đại niệm') — 그래서 1판(sound_fix multi)의 판정은 근거가 없었고, 바꾼 67개는 되돌렸다.
 · 같은 목소리의 앞말 'Tôi nói' + 앱 소리 + 'rồi.' 로 문장 속에 넣으면 멀쩡한 낱말 30개 중 24개가 0.75 이상(평균 0.91). 그래서 낱말은 이 틀로, 문장(다섯 낱말 이상)은 그대로 받아쓴다.
 · 따옴표·괄호·빗금 같은 기호가 든 글은 소리 엔진이 기호를 읽어 없는 소리가 붙는다("Bà" → 'Bà Y') — 기호를 떼고 만든다(speak_text).
판정: 받아쓴 글과 글자를 낱말 단위로 맞대(성조 부호 자리 khoẻ=khỏe, 북부에서 같은 소리 d·gi·r / s·x / ch·tr 는 같게) 0.75 아래면 의심 → 빔 5로 한 번 더.
그래도 낮으면 기호 뗀 글로 두 꼴(그대로·마침표) 다시 만들어 같은 잣대로 재고, 0.75 이상이면서 0.25 넘게 나으면 바꾼다(옛 파일 tools/_sound_fix/old2).
차례: 수업 자료(days·gybm·grammar·realbook·daily22)에 나오는 글 먼저, 그다음 나머지. 결과 tools/_sound_fix/점검2.jsonl (이어 하기 됨).
쓰기: python3 tools/sound_audit2.py run | symbols(기호 든 소리만 바로 다시 만들기) | stat"""
import asyncio, json, pathlib, re, shutil, subprocess, sys, tempfile, unicodedata as U, difflib
R = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(R / 'tools'))
from sound_fix import n2w, synth, finish, VOICES
OUT = R / 'tools/_sound_fix'; LOG = OUT / '점검2.jsonl'
SYM = re.compile(r'["“”‘’\'()/=~…+—&]|\.\.\.')
def speak_text(k):
    t = k.replace('...', ', ').replace('…', ', ').replace('—', ', ').replace('/', ', ').replace('&', ' và ')
    t = re.sub(r'["“”‘’]', '', t); t = re.sub(r"(?<!\w)'|'(?!\w)", '', t)
    t = re.sub(r'\(\s*=\s*', ', ', t); t = t.replace('(', ' ').replace(')', ' ').replace('=', ' ').replace('~', ' ').replace('+', ' ')
    t = re.sub(r'\s+', ' ', t); t = re.sub(r'\s+,', ',', t); t = re.sub(r',(\s*,)+', ',', t); t = re.sub(r'([?!.]),', r'\1', t)
    t = t.strip(' ,')
    return t
MV = {'oá': 'óa', 'oà': 'òa', 'oả': 'ỏa', 'oã': 'õa', 'oạ': 'ọa', 'oé': 'óe', 'oè': 'òe', 'oẻ': 'ỏe', 'oẽ': 'õe', 'oẹ': 'ọe', 'uý': 'úy', 'uỳ': 'ùy', 'uỷ': 'ủy', 'uỹ': 'ũy', 'uỵ': 'ụy'}
EQ = {'tư': 'bốn', 'mốt': 'một', 'lăm': 'năm', 'ngàn': 'nghìn', 'linh': 'lẻ'}
def norm_words(s):
    s = re.sub(r'\d+', lambda m: n2w(int(m.group())) if int(m.group()) < 10000 else m.group(), s)
    out = []
    for w in re.sub(r'[^\w\s]', ' ', U.normalize('NFC', s.lower())).split():
        for a, b in MV.items():
            if w.endswith(a) and not w.startswith('qu'): w = w[:-2] + b
        w = re.sub(r'^(gi(?=[aăâeêoôơuưy])|r|d)', 'z', w); w = re.sub(r'^x', 's', w); w = re.sub(r'^tr', 'ch', w)
        out.append(EQ.get(w, w))
    return out
def score(ref, hyp):
    A, B = norm_words(ref), norm_words(hyp)
    return difflib.SequenceMatcher(None, A, B).ratio() if A else 0
def order_keys(idx):
    first = []
    def walk(o):
        if isinstance(o, dict):
            for v in o.values(): walk(v)
        elif isinstance(o, list):
            for v in o: walk(v)
        elif isinstance(o, str) and o in idx: first.append(o)
    for f in ['days.json', 'gybm.json', 'grammar.json', 'realbook.json', 'daily22.json']:
        try: walk(json.loads((R / 'data' / f).read_text(encoding='utf-8')))
        except Exception: pass
    seen, out = set(), []
    for k in first + sorted(idx):
        if k not in seen and len(k.split()) >= 2: seen.add(k); out.append(k)
    return out
class Judge:
    def __init__(s):
        from faster_whisper import WhisperModel
        s.m = WhisperModel('medium', device='cpu', compute_type='int8', cpu_threads=8); s.td = pathlib.Path(tempfile.mkdtemp()); s.car = {}
        for v in 'fm':
            for nm, t in (('a', 'Tôi nói'), ('b', 'rồi.')):
                p = s.td / f'{nm}{v}.mp3'; asyncio.run(synth(t, v, p)); s.car[nm + v] = p
    def tx(s, p, beam):
        return ' '.join(x.text for x in s.m.transcribe(str(p), language='vi', beam_size=beam, condition_on_previous_text=False)[0]).strip()
    def judge(s, k, v, p, beam=1):
        ref = speak_text(k)
        if len(ref.split()) >= 5:
            w = s.td / 'x.wav'; subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(p), '-af', 'adelay=400|400,apad=pad_dur=0.5', '-ar', '16000', '-ac', '1', str(w)], check=True)
            h = s.tx(w, beam); return score(ref, h), h
        w = s.td / 'c.wav'
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(s.car['a' + v]), '-i', str(p), '-i', str(s.car['b' + v]), '-filter_complex', '[0][1][2]concat=n=3:v=0:a=1', '-ar', '16000', '-ac', '1', str(w)], check=True)
        h = s.tx(w, beam); ws = h.split()
        core = ' '.join(ws[2:-1]) if len(ws) > 3 else h
        return max(score(ref, core), score('tôi nói ' + ref + ' rồi', h)), h
def log(r):
    with LOG.open('a', encoding='utf-8') as f: f.write(json.dumps(r, ensure_ascii=False) + '\n')
def remake(J, k, v, p0, s0):
    best = (s0, None, None)
    t0 = speak_text(k)
    with tempfile.TemporaryDirectory() as td:
        for i, t in enumerate(dict.fromkeys([t0, t0.rstrip('.!?,') + '.'])):
            p = pathlib.Path(td) / f'{i}.mp3'
            if not asyncio.run(synth(t, v, p)): continue
            finish(p); sc, _ = J.judge(k, v, p, 5)
            if sc > best[0]: best = (sc, t, p.read_bytes())
    if best[2] and best[0] >= 0.75 and best[0] >= s0 + 0.25:
        bk = OUT / 'old2' / v; bk.mkdir(parents=True, exist_ok=True)
        if not (bk / p0.name).exists(): shutil.copy(p0, bk / p0.name)
        p0.write_bytes(best[2]); return best[0], best[1], True
    return best[0], best[1], False
def run():
    idx = json.loads((R / 'data/audio_index.json').read_text(encoding='utf-8'))
    done = set()
    if LOG.exists():
        for l in LOG.read_text(encoding='utf-8').splitlines():
            x = json.loads(l); done.add((x['k'], x['v']))
    J = Judge(); keys = order_keys(idx); n = fx = 0
    print('점검할 글', len(keys), '· 이미', len(done), flush=True)
    for k in keys:
        for v in 'fm':
            if (k, v) in done: continue
            p0 = R / 'audio' / v / 'n' / f'{idx[k]}.mp3'
            if not p0.exists(): continue
            s1, h1 = J.judge(k, v, p0, 1); rec = {'k': k, 'v': v, 's': round(s1, 2)}
            if s1 < 0.75:
                s5, h5 = J.judge(k, v, p0, 5); rec.update({'s5': round(s5, 2), 'h': h5})
                if max(s1, s5) < 0.75:
                    a, t, ok = remake(J, k, v, p0, max(s1, s5)); rec.update({'after': round(a, 2), 'text': t})
                    if ok: rec['fixed'] = 1; fx += 1
            log(rec); n += 1
            if n % 200 == 0: print(f'  {n} · 바꿈 {fx}', flush=True)
    print('끝', n, '바꿈', fx, flush=True)
def symbols():
    """기호 든 글의 소리는 점검 없이도 다시 만든다 — 기호를 읽은 소리는 틀린 것이 분명하다(Whisper 로 바꾼 뒤가 더 나은지만 확인)"""
    idx = json.loads((R / 'data/audio_index.json').read_text(encoding='utf-8'))
    J = Judge(); ks = [k for k in idx if SYM.search(k)]; fx = 0
    print('기호 든 글', len(ks), flush=True)
    for k in ks:
        t = speak_text(k)
        if not t: continue
        for v in 'fm':
            p0 = R / 'audio' / v / 'n' / f'{idx[k]}.mp3'
            if not p0.exists(): continue
            s0, h0 = J.judge(k, v, p0, 5)
            with tempfile.TemporaryDirectory() as td:
                p = pathlib.Path(td) / 'n.mp3'
                if not asyncio.run(synth(t, v, p)): continue
                finish(p); s1, h1 = J.judge(k, v, p, 5)
                rec = {'k': k, 'v': v, 'kind': 'sym', 'text': t, 'before': round(s0, 2), 'after': round(s1, 2), 'h0': h0, 'h1': h1}
                if s1 >= s0:
                    bk = OUT / 'old2' / v; bk.mkdir(parents=True, exist_ok=True)
                    if not (bk / p0.name).exists(): shutil.copy(p0, bk / p0.name)
                    p0.write_bytes(p.read_bytes()); rec['fixed'] = 1; fx += 1
                log(rec); print(rec['k'], v, rec['before'], '→', rec['after'], '바꿈' if rec.get('fixed') else '', flush=True)
    print('바꿈', fx, flush=True)
if __name__ == '__main__':
    {'run': run, 'symbols': symbols}[sys.argv[1]]()
