#!/usr/bin/env python3
"""그림 지킴이 — 이 맥에서 한 시간마다 돌며 **빠진 그림을 채운다.**

왜 맥에서만 도는가: 그림은 Draw Things(이 맥에서 도는 무료 앱)가 만든다.
깃허브 서버에는 그래픽 카드가 없어서 그림만은 거기서 못 만든다.
그래서 기사 세트처럼 매일 새 단어가 생기는 것은 이 지킴이가 뒤따라가며 채운다.

하는 일 (한 시간에 한 번)
  ① 깃허브에서 최신 내용을 받는다 (로봇이 밤새 올린 기사 세트를 포함)
  ② days.json 과 news_days.json 이 요구하는 그림 중 **없는 것**을 찾는다
  ③ Draw Things 가 켜져 있으면 그것들만 굽는다 (꺼져 있으면 조용히 넘어간다)
  ④ 새로 만든 그림이 있으면 판번호를 찍고 커밋·푸시한다

건드리는 것은 img/ 와 판번호(index.html·sw.js)뿐이다. 코드는 손대지 않는다.
멈추려면: launchctl unload ~/Library/LaunchAgents/chaochao.img.plist
"""
import json, pathlib, subprocess, sys, urllib.request, zlib, io, base64, re

R = pathlib.Path(__file__).resolve().parent.parent
API = 'http://127.0.0.1:7860/sdapi/v1/txt2img'
IMG = R / 'img'

def sh(*a):
    return subprocess.run(a, cwd=R, capture_output=True, text=True)

def alive():
    try:
        urllib.request.urlopen('http://127.0.0.1:7860/sdapi/v1/options', timeout=5)
        return True
    except Exception:
        return False

def wanted():
    """days.json + news_days.json 이 요구하는 (파일이름, 프롬프트 재료) 목록."""
    out = {}
    try:
        d = json.loads((R / 'data' / 'days.json').read_text())
        for x in d['days']:
            for w in x['words']:
                if w.get('img'): out[w['img'][:-5]] = None      # 프롬프트는 문서에서 찾는다
            if x['dialog'].get('img'): out[x['dialog']['img'][:-5]] = None
    except Exception:
        pass
    try:
        n = json.loads((R / 'data' / 'news_days.json').read_text())
        for x in n.get('days', []):
            for w in x.get('words', []):
                if not w.get('emoji'):                         # 이모지도 없는 추상어는 건너뛴다
                    continue
                nm = 'n-' + re.sub(r'[^a-z0-9]+', '-', slug(w['vi'])).strip('-')
                out[nm] = f"{w['ko']} ({w['vi']}), simple flat illustration, soft pastel colors, " \
                          "thick outlines, plain white background, hands not visible, " \
                          "absolutely no text, no letters, no numbers, no logo"
                w['_img'] = nm + '.webp'
    except Exception:
        pass
    return out

def slug(vi):
    import unicodedata as ud
    s = ''.join(c for c in ud.normalize('NFD', vi) if not ud.combining(c))
    return s.replace('đ', 'd').replace('Đ', 'd').lower().replace(' ', '-')

def prompts_from_doc():
    pairs, name = {}, None
    for line in (R / 'docs' / 'image-prompts.md').read_text().splitlines():
        m = re.match(r'\*\*([\w-]+)\.webp\*\*', line)   # d01- 뿐 아니라 x-(추상어)·n-(기사)도
        if m: name = m.group(1)
        elif name and line.startswith('> '):
            pairs[name] = line[2:].strip(); name = None
    return pairs

def bake(name, prompt):
    from PIL import Image
    body = json.dumps({'prompt': prompt, 'steps': 4, 'cfg_scale': 1,
                       'width': 640, 'height': 640,
                       'seed': zlib.crc32(name.encode()) % 2_000_000_000}).encode()
    req = urllib.request.Request(API, data=body, headers={'Content-Type': 'application/json'})
    r = json.loads(urllib.request.urlopen(req, timeout=600).read())
    im = Image.open(io.BytesIO(base64.b64decode(r['images'][0]))).convert('RGB')
    im.save(IMG / f'{name}.webp', 'WEBP', quality=82)

def main():
    if sh('git', 'diff', '--quiet').returncode != 0:
        print('작업 중인 변경이 있어 건너뛴다'); return 0        # 사람이 고치는 중이면 손대지 않는다
    sh('git', 'pull', '--rebase', '--quiet')
    want = wanted()
    doc = prompts_from_doc()
    todo = [(n, want[n] or doc.get(n)) for n in want if not (IMG / f'{n}.webp').exists()]
    todo = [(n, p) for n, p in todo if p]
    if not todo:
        print('빠진 그림 없음'); return 0
    if not alive():
        print(f'빠진 그림 {len(todo)}장 — Draw Things 가 꺼져 있어 다음에'); return 0
    made = 0
    for n, p in todo[:150]:                                    # 한 번에 150장까지만
        try:
            bake(n, p); made += 1
        except Exception as e:
            print(f'실패 {n}: {e}')
    if not made:
        return 0
    subprocess.run([sys.executable, 'tools/stamp.py'], cwd=R)
    sh('git', 'add', 'img', 'index.html', 'sw.js')
    if sh('git', 'diff', '--cached', '--quiet').returncode != 0:
        sh('git', 'commit', '-m', f'그림 {made}장 자동 생성 (그림 지킴이)')
        sh('git', 'push', '--quiet')
    print(f'그림 {made}장 만들어 올림')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
