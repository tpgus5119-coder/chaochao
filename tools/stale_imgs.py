# -*- coding: utf-8 -*-
"""같은 이름으로 다시 그린 그림을 sw.js 의 STALE(기기 캐시에서 뺄 목록)에 자동으로 넣는다 (2026-10-11 대표님 "기기마다 이미지가 다르냐? 동일해야지").
sw.js 는 그림을 한 번 받으면 계속 캐시에서 꺼내 쓴다(cache-first). 같은 파일 이름으로 그림을 바꾸면, 전에 본 기기는 옛 그림을 계속 본다.
배포 전에(deploy.sh) origin 에 이미 있는 img/*.webp 중 내용이 바뀐 것을 찾아 STALE 에 더한다 — 새 sw.js 가 켜질 때(activate) 그 그림만 캐시에서 지운다.
쓰기: python3 tools/stale_imgs.py [이름 …]   (이름을 주면 그것도 넣는다)"""
import hashlib, pathlib, re, subprocess, sys
R = pathlib.Path(__file__).resolve().parent.parent
def main():
    tree = {}
    out = subprocess.run(['git', 'ls-tree', '-r', 'origin/main', 'img'], cwd=R, capture_output=True, text=True).stdout
    for ln in out.splitlines():
        meta, path = ln.split('\t', 1); tree[path] = meta.split()[2]
    changed = list(sys.argv[1:])
    for path, h in tree.items():
        if not path.endswith('.webp'): continue
        f = R / path
        if not f.exists(): continue
        b = f.read_bytes()
        if hashlib.sha1(b'blob %d\0' % len(b) + b).hexdigest() != h: changed.append(path[4:-5])   # 'img/' 와 '.webp' 를 뗀 이름
    sw = R / 'sw.js'; t = sw.read_text(encoding='utf-8')
    m = re.search(r"const STALE = \[(.*?)\]\.map\(n => '/img/' \+ n \+ '\.webp'\);", t, re.S)
    have = set(re.findall(r"'([^']+)'", m.group(1)))
    add = [n for n in dict.fromkeys(changed) if n not in have]
    if add:
        body = m.group(1).rstrip() + ',\n               ' + ', '.join(f"'{n}'" for n in add)
        t = t[:m.start(1)] + body + t[m.end(1):]
        sw.write_text(t, encoding='utf-8')
    print(f'같은 이름으로 바뀐 그림 → 캐시에서 뺄 목록에 더함 {len(add)}' + (': ' + ' '.join(add) if add else ''))
if __name__ == '__main__':
    main()
