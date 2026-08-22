#!/usr/bin/env python3
"""기사 세트에 새로 생긴 베트남어의 북부 음성을 만든다 — 깃허브 액션에서 돈다.

edge-tts 는 마이크로소프트 음성 서비스를 쓰는 무료 라이브러리다(가입·키 불필요).
그래서 개발자 노트북이 꺼져 있어도 깃허브 서버에서 그대로 돌아간다.
남부 음성(sf·sm)은 로컬 모델이 필요해 여기서 못 만든다 — 앱이 알아서 북부로 대신 낸다.

사용: python3 tools/news_audio.py
"""
import asyncio, hashlib, json, pathlib, sys
import edge_tts

R = pathlib.Path(__file__).resolve().parent.parent
VOICES = {'f': 'vi-VN-HoaiMyNeural', 'm': 'vi-VN-NamMinhNeural'}
SLOW_RATE = '-35%'

key = lambda t: hashlib.sha1(t.encode()).hexdigest()[:12]

def wanted():
    """기사 세트의 단어와 문장 전부."""
    try:
        store = json.loads((R / 'data' / 'news_days.json').read_text())
    except Exception:
        return []
    out = []
    for d in store.get('days', []):
        out += [w['vi'] for w in d.get('words', [])]
        out += [l['vi'] for l in d.get('dialog', {}).get('lines', [])]
    return sorted(set(t for t in out if t))

async def one(text, voice, path, slow):
    kw = {'rate': SLOW_RATE} if slow else {}
    await edge_tts.Communicate(text, voice, **kw).save(str(path))

async def main():
    idx_p = R / 'data' / 'audio_index.json'
    idx = json.loads(idx_p.read_text()) if idx_p.exists() else {}
    made = skip = fail = 0
    for text in wanted():
        h = idx.get(text) or key(text)
        need = []
        for v, name in VOICES.items():
            for kind, slow in (('n', False), ('slow', True)):
                p = R / 'audio' / v / kind / f'{h}.mp3'
                if p.exists():
                    continue
                p.parent.mkdir(parents=True, exist_ok=True)
                need.append((name, p, slow))
        if not need:
            idx[text] = h
            skip += 1
            continue
        try:
            for name, p, slow in need:
                await one(text, name, p, slow)
            idx[text] = h
            made += 1
        except Exception as e:
            fail += 1
            print(f'실패 {text}: {e}', flush=True)
    idx_p.write_text(json.dumps(idx, ensure_ascii=False))
    print(f'음성 — 새로 {made} · 이미 있음 {skip} · 실패 {fail}')

if __name__ == '__main__':
    asyncio.run(main())
