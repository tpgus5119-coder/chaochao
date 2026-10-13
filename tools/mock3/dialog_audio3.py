# -*- coding: utf-8 -*-
"""주간시험 3 모의고사 두 사람 대화 소리 (2026-10-13). 주간시험 2 의 tools/mock2/dialog_audio.py 와 같은 방법인데 두 곳이 다르다
(대표님 2026-10-12 3번 — 실제 2회차 듣기 녹음과 견줌):
  · 목소리 차례를 문항마다 x['voices'] 대로 — 'fm' = 여→남, 'mf' = 남→여 (늘 여→남이던 것을 번갈아).
  · 물음과 대답 사이 쉼 1초(0.45초 → 1.0초).
data/mock3_*.json 의 audio 중 줄바꿈이 든 글 = 대화. 줄 소리(gen_audio_list — 북부 여 HoaiMy·남 NamMinh, 무음 잘림·32k)를 이어 붙여 한 파일,
이름은 대화 글 전체의 sha1 앞 12자리, audio/f/n 과 audio/m/n 에 같은 파일. audio_index.json 에 대화 글 → 이름.
같은 대화 글이 다른 목소리 차례로 이미 있으면(주간시험 2) 멈춘다 — 앱은 글로 소리를 찾으므로 한 글에 한 파일뿐이다.
쓰기: python3 tools/mock3/dialog_audio3.py"""
import hashlib, json, pathlib, subprocess, sys, tempfile
R = pathlib.Path(__file__).resolve().parent.parent.parent
k12 = lambda t: hashlib.sha1(t.encode()).hexdigest()[:12]
GAP = 1.0


def main():
    dlg = {}
    for p in sorted(list((R / 'data').glob('mock3_*.json')) + list((R / 'data').glob('mock1_*.json'))):   # 주간시험 1 모의고사도 (2026-10-13)
        for x in json.loads(p.read_text(encoding='utf-8'))['q']:
            a = x.get('audio')
            if isinstance(a, str) and '\n' in a:
                v = x.get('voices') or 'fm'
                if dlg.get(a, v) != v: raise SystemExit(f'같은 대화가 다른 목소리 차례: {a[:40]}')
                dlg[a] = v
    old = set()
    for p in sorted((R / 'data').glob('mock2_*.json')):
        for x in json.loads(p.read_text(encoding='utf-8'))['q']:
            if isinstance(x.get('audio'), str) and '\n' in x['audio']: old.add(x['audio'])
    clash = [d for d in dlg if d in old and dlg[d] != 'fm']
    if clash: raise SystemExit(f'주간시험 2 대화와 같은 글인데 목소리 차례가 다름: {clash[:3]}')
    lines = list(dict.fromkeys(l for d in dlg for l in d.split('\n')))
    idxp = R / 'data/audio_index.json'
    idx = json.loads(idxp.read_text(encoding='utf-8'))
    need = [l for l in lines if l not in idx]
    print(f'대화 {len(dlg)} (여→남 {sum(1 for v in dlg.values() if v == "fm")} · 남→여 {sum(1 for v in dlg.values() if v == "mf")}) · 줄 {len(lines)} · 줄 소리 새로 {len(need)}', flush=True)
    for _ in range(4):                                  # edge-tts 가 가끔 끊긴다 — 빠진 것만 다시
        if not need: break
        with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False, encoding='utf-8') as f:
            json.dump(need, f, ensure_ascii=False); lst = f.name
        subprocess.run([sys.executable, str(R / 'tools/gen_audio_list.py'), lst, '--jobs', '3'], check=False)
        idx = json.loads(idxp.read_text(encoding='utf-8'))
        need = [l for l in lines if l not in idx]
    if need: raise SystemExit(f'줄 소리 못 만듦 {len(need)}: {need[:5]}')
    made = 0
    for d, v in dlg.items():
        ls = d.split('\n'); k = k12(d)
        outs = [R / f'audio/{z}/n/{k}.mp3' for z in ('f', 'm')]
        if idx.get(d) == k and all(o.exists() and o.stat().st_size > 3000 for o in outs) and '--redo' not in sys.argv: continue
        srcs = [R / f"audio/{v[i % 2]}/n/{idx[l]}.mp3" for i, l in enumerate(ls)]
        for s in srcs:
            if not s.exists(): raise SystemExit(f'줄 소리 파일 없음: {s}')
        cmd = ['ffmpeg', '-y', '-v', 'error']
        for i, s in enumerate(srcs):
            cmd += ['-i', str(s)]
            if i < len(srcs) - 1: cmd += ['-f', 'lavfi', '-t', str(GAP), '-i', 'anullsrc=r=24000:cl=mono']
        n = len(srcs) * 2 - 1
        flt = ''.join(f'[{i}:a]aresample=24000,aformat=channel_layouts=mono[a{i}];' for i in range(n)) + ''.join(f'[a{i}]' for i in range(n)) + f'concat=n={n}:v=0:a=1[o]'
        tmp = outs[0].with_suffix('.tmp.mp3')
        r = subprocess.run(cmd + ['-filter_complex', flt, '-map', '[o]', '-ac', '1', '-ar', '24000', '-b:a', '32k', str(tmp)], capture_output=True, text=True)
        if r.returncode or not tmp.exists(): raise SystemExit(f'잇기 실패: {d[:40]} {r.stderr[:200]}')
        data = tmp.read_bytes(); tmp.unlink()
        for o in outs: o.parent.mkdir(parents=True, exist_ok=True); o.write_bytes(data)
        idx[d] = k; made += 1
    idxp.write_text(json.dumps(idx, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'대화 소리 새로 {made} · 모두 {len(dlg)}')


if __name__ == '__main__':
    main()
