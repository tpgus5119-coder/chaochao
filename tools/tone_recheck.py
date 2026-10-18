#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""한 음절 낱말 소리 성조 다시 확인 — **문장 틀에 넣어 받아쓰기** (2026-10-18 대표님 "성조 다시 정확하게 체크해봐. 그럼에도 문제가 있다면 바꾸자").
Whisper 는 낱말 하나만 들으면 성조를 못 맞힌다(đầy → Nè). 같은 목소리로 만든 앞말 'Tôi nói từ'(나는 ~라는 낱말을 말해요) 뒤에 **앱의 그 소리 파일을 그대로 붙여**
Whisper medium 으로 받아쓰고, 마지막 낱말이 철자(성조까지)와 같은지 본다. 앞말 덕에 '낱말 하나'가 아니라 문장 속 낱말로 듣는다.
먼저 판정기가 괜찮다고 본 낱말 120개로 이 방법의 맞춤률을 재고(잣대 검사), 의심 낱말(sound_fix 못 고친 것)을 같은 방법으로 잰다. 세 번(빔 1·3·5) 중 두 번 넘게 틀리면 '틀림'.
쓰기: python3 tools/tone_recheck.py → tools/_sound_fix/성조재확인.json"""
import asyncio, json, pathlib, random, re, subprocess, sys, tempfile, unicodedata as U
R = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(R / 'tools'))
from faster_whisper import WhisperModel
import edge_tts
VOICES = {"f": "vi-VN-HoaiMyNeural", "m": "vi-VN-NamMinhNeural"}
TD = pathlib.Path(tempfile.mkdtemp())
def wav(src, dst): subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(src), '-ac', '1', '-ar', '16000', str(dst)], check=True)
async def carrier(v):
    p = TD / f'car_{v}.mp3'; await edge_tts.Communicate('Tôi nói từ', VOICES[v]).save(str(p)); return p
def norm(s): return U.normalize('NFC', re.sub(r'[^\w\s]', ' ', s.lower())).split()
def main():
    idx = json.loads((R / 'data/audio_index.json').read_text(encoding='utf-8'))
    car = {}
    for v in 'fm':
        p = asyncio.run(carrier(v)); w = TD / f'car_{v}.wav'
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(p), '-af', 'silenceremove=stop_periods=-1:stop_duration=0.15:stop_threshold=-40dB', '-ac', '1', '-ar', '16000', str(w)], check=True); car[v] = w
    m = WhisperModel('medium', device='cpu', compute_type='int8', cpu_threads=8)
    res = [json.loads(l) for l in (R / 'tools/_sound_fix/결과.jsonl').read_text(encoding='utf-8').splitlines()]
    sus = sorted({(r['k'], r['v']) for r in res if r.get('kind') == 'one' and not r.get('fixed')})
    import importlib.util
    spec = importlib.util.spec_from_file_location('sf', R / 'tools/sound_fix.py'); sf = importlib.util.module_from_spec(spec); spec.loader.exec_module(sf)
    pool = sorted({w for w in idx if sf.WORD.match(w) and sf.real_syl(w)} - {k for k, _ in sus}); random.Random(5).shuffle(pool)
    ctrl = [(w, v) for w in pool[:60] for v in 'fm']
    def judge(w, v):
        src = R / 'audio' / v / 'n' / f'{idx[w]}.mp3'; ww = TD / 'w.wav'; wav(src, ww); cat = TD / 'c.wav'
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(car[v]), '-i', str(ww), '-filter_complex', '[0][1]concat=n=2:v=0:a=1', str(cat)], check=True)
        outs = []
        for b in (1, 3, 5):
            t = ' '.join(s.text for s in m.transcribe(str(cat), language='vi', beam_size=b, condition_on_previous_text=False)[0]); ws = norm(t)
            outs.append(ws[-1] if ws else '')
        ok = sum(o == w for o in outs)
        return {'k': w, 'v': v, 'heard': outs, 'ok': ok}
    out = {'ctrl': [], 'sus': []}
    for w, v in ctrl: out['ctrl'].append(judge(w, v))
    acc = sum(r['ok'] >= 2 for r in out['ctrl']) / len(out['ctrl']); print('잣대 검사(멀쩡하다고 본 낱말) 맞춤률', round(acc, 3), flush=True)
    for w, v in sus: r = judge(w, v); out['sus'].append(r); print(r, flush=True)
    out['acc'] = acc
    (R / 'tools/_sound_fix/성조재확인.json').write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
if __name__ == '__main__': main()
