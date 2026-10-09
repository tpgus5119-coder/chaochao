# -*- coding: utf-8 -*-
"""모의고사 듣기 3 '두 사람 대화' 소리 (2026-10-09, 대표님 "두 사람 대화 + 질문 — 한 번씩 주고받는 수준, 주고받는 것 모두 합쳐 최대 2문장").
data/mock2_*.json 의 audio 중 줄바꿈('\n')이 든 글 = 대화. 첫 줄은 북부 여(HoaiMy), 둘째 줄은 북부 남(NamMinh) 목소리로,
줄 소리(gen_audio_list 가 만든 것, 무음 잘림·32k)를 0.45초 쉼을 두고 이어 붙여 한 파일로 만든다.
파일 이름은 대화 글 전체의 sha1 앞 12자리 — audio/f/n 과 audio/m/n 에 같은 파일(누가 목소리를 무엇으로 골랐든 여→남 순서로 들린다).
audio_index.json 에 대화 글 → 이름을 올린다. make_commit 이 data 의 audio 를 보고 올린다.
쓰기: python3 tools/mock2/dialog_audio.py"""
import hashlib, json, pathlib, subprocess, sys, tempfile
R = pathlib.Path(__file__).resolve().parent.parent.parent
k12 = lambda t: hashlib.sha1(t.encode()).hexdigest()[:12]
GAP = 0.45


def main():
    dlg = []
    for p in sorted((R / 'data').glob('mock2_*.json')):
        for x in json.loads(p.read_text(encoding='utf-8'))['q']:
            a = x.get('audio')
            if isinstance(a, str) and '\n' in a: dlg.append(a)
    dlg = list(dict.fromkeys(dlg))
    lines = list(dict.fromkeys(l for d in dlg for l in d.split('\n')))
    idxp = R / 'data/audio_index.json'
    idx = json.loads(idxp.read_text(encoding='utf-8'))
    need = [l for l in lines if l not in idx]
    print(f'대화 {len(dlg)} · 줄 {len(lines)} · 줄 소리 새로 {len(need)}', flush=True)
    for _ in range(4):                                  # edge-tts 가 가끔 끊긴다 — 빠진 것만 다시
        if not need: break
        with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False, encoding='utf-8') as f:
            json.dump(need, f, ensure_ascii=False); lst = f.name
        subprocess.run([sys.executable, str(R / 'tools/gen_audio_list.py'), lst, '--jobs', '3'], check=False)
        idx = json.loads(idxp.read_text(encoding='utf-8'))
        need = [l for l in lines if l not in idx]
    if need: raise SystemExit(f'줄 소리 못 만듦 {len(need)}: {need[:5]}')
    made = 0
    for d in dlg:
        ls = d.split('\n'); k = k12(d)
        outs = [R / f'audio/{v}/n/{k}.mp3' for v in ('f', 'm')]
        if idx.get(d) == k and all(o.exists() and o.stat().st_size > 3000 for o in outs): continue
        srcs = [R / f"audio/{'f' if i % 2 == 0 else 'm'}/n/{idx[l]}.mp3" for i, l in enumerate(ls)]
        cmd = ['ffmpeg', '-y', '-v', 'error']
        parts = []
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
