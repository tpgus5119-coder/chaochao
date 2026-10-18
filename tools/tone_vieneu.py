#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""성조 의심 낱말을 VieNeu-TTS 로 다시 만들어 견주기 (2026-10-18 대표님 "그럼에도 문제가 있다면 바꾸자. 바꾸는 목소리에도 남녀가 있니?").
1단계(이 파일, VieNeu 환경에서): 의심 낱말(성조재확인.json sus)을 여 Mai Anh · 남 Hải Đăng(둘 다 북부)으로 꼴 셋('w', 'w.', 'W.')씩 만들고
   앞말 'Tôi nói từ' 도 같은 목소리로 만든다 → tools/_sound_fix/vieneu/
2단계(python3 tools/tone_vieneu.py judge): 지금 소리와 VieNeu 꼴들을 tone_recheck 와 같은 잣대(앞말+받아쓰기, 빔 1·3·5)로 재서
   VieNeu 가 맞게 들리고(2/3 이상) 지금 소리는 틀리게 들리는(0/3) 것만 바꿀 후보로 적는다 → 성조_VieNeu.json
3단계(apply): 후보를 같은 이름 파일로 바꾼다(무음 자름·32k, 옛 파일은 _sound_fix/old)."""
import json, pathlib, subprocess, sys
R = pathlib.Path(__file__).resolve().parent.parent
D = R / 'tools/_sound_fix/vieneu'; D.mkdir(parents=True, exist_ok=True)
VN = {'f': 'Mai Anh', 'm': 'Hải Đăng'}
FORMS = lambda w: [w, w + '.', w[:1].upper() + w[1:] + '.']
def sus():
    return [(r['k'], r['v']) for r in json.loads((R / 'tools/_sound_fix/성조재확인.json').read_text(encoding='utf-8'))['sus']]
def make():
    from vieneu import Vieneu
    tts = Vieneu(onnx_dir=str(pathlib.Path.home() / '짜오짜오/음성-도구/models/VieNeu-TTS-v3-Turbo/onnx_update'))
    for v in 'fm':
        p = D / f'car_{v}.wav'
        if not p.exists(): tts.save(tts.infer('Tôi nói từ', voice=VN[v]), str(p))
    for w, v in sus():
        for j, t in enumerate(FORMS(w)):
            p = D / f'{w}_{v}_{j}.wav'
            if not p.exists(): tts.save(tts.infer(t, voice=VN[v]), str(p)); print(p.name, flush=True)
def judge():
    import tempfile, re, unicodedata as U, asyncio, edge_tts
    from faster_whisper import WhisperModel
    m = WhisperModel('medium', device='cpu', compute_type='int8', cpu_threads=8)
    idx = json.loads((R / 'data/audio_index.json').read_text(encoding='utf-8'))
    TD = pathlib.Path(tempfile.mkdtemp())
    norm = lambda s: U.normalize('NFC', re.sub(r'[^\w\s]', ' ', s.lower())).split()
    def w16(src, dst, trim=False):
        af = ['-af', 'silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=-1:stop_duration=0.15:stop_threshold=-45dB'] if trim else []
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(src), *af, '-ac', '1', '-ar', '16000', str(dst)], check=True)
    car = {}
    for v, voice in (('f', 'vi-VN-HoaiMyNeural'), ('m', 'vi-VN-NamMinhNeural')):
        p = TD / f'e{v}.mp3'; asyncio.run(edge_tts.Communicate('Tôi nói từ', voice).save(str(p))); car['e' + v] = TD / f'e{v}.wav'; w16(p, car['e' + v], True)
        car['n' + v] = TD / f'n{v}.wav'; w16(D / f'car_{v}.wav', car['n' + v], True)
    def score(src, c, w):
        a = TD / 'a.wav'; w16(src, a, True); cat = TD / 'c.wav'
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(c), '-i', str(a), '-filter_complex', '[0][1]concat=n=2:v=0:a=1', str(cat)], check=True)
        heard = []
        for b in (1, 3, 5):
            ws = norm(' '.join(s.text for s in m.transcribe(str(cat), language='vi', beam_size=b, condition_on_previous_text=False)[0])); heard.append(ws[-1] if ws else '')
        return sum(h == w for h in heard), heard
    out = []
    for w, v in sus():
        cur, ch = score(R / 'audio' / v / 'n' / f'{idx[w]}.mp3', car['e' + v], w)
        best = (-1, None, None)
        for j in range(3):
            s, h = score(D / f'{w}_{v}_{j}.wav', car['n' + v], w)
            if s > best[0]: best = (s, j, h)
        r = {'k': w, 'v': v, 'cur': cur, 'cur_heard': ch, 'vn': best[0], 'vn_form': best[1], 'vn_heard': best[2], 'swap': best[0] >= 2 and cur == 0}
        out.append(r); print(r, flush=True)
    (R / 'tools/_sound_fix/성조_VieNeu.json').write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
def apply():
    sys.path.insert(0, str(R / 'tools'))
    import shutil, trim_audio, reencode_32k
    idx = json.loads((R / 'data/audio_index.json').read_text(encoding='utf-8'))
    n = 0
    for r in json.loads((R / 'tools/_sound_fix/성조_VieNeu.json').read_text(encoding='utf-8')):
        if not r['swap']: continue
        dst = R / 'audio' / r['v'] / 'n' / f"{idx[r['k']]}.mp3"
        old = R / 'tools/_sound_fix/old' / r['v']; old.mkdir(parents=True, exist_ok=True)
        if not (old / dst.name).exists(): shutil.copy2(dst, old / dst.name)
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(D / f"{r['k']}_{r['v']}_{r['vn_form']}.wav"), '-ac', '1', '-b:a', '48k', str(dst)], check=True)
        trim_audio.one((dst, False)); reencode_32k.one(dst); n += 1; print('바꿈', r['k'], r['v'])
    print('바꾼 수', n)
if __name__ == '__main__':
    {'make': make, 'judge': judge, 'apply': apply}[sys.argv[1]]()
