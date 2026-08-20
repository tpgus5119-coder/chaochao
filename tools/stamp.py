#!/usr/bin/env python3
"""배포 판번호를 찍는다.
GitHub Pages 가 CSS/JS 를 10분간 브라우저에 캐시시켜서, 고쳐도 바로 안 보인다.
주소 뒤에 ?v=<내용해시> 를 붙여 '내용이 바뀔 때만' 새 주소가 되게 한다."""
import hashlib, pathlib, re

def h8(*paths):
    m = hashlib.sha1()
    for p in paths:
        m.update(pathlib.Path(p).read_bytes())
    return m.hexdigest()[:8]

ver = h8('style.css', 'app.js', 'data/days.json')

f = pathlib.Path('index.html'); s = f.read_text()
s = re.sub(r'(href="style\.css)(\?v=[^"]*)?"', rf'\1?v={ver}"', s)
s = re.sub(r'(src="app\.js)(\?v=[^"]*)?"', rf'\1?v={ver}"', s)
f.write_text(s)

w = pathlib.Path('sw.js'); t = w.read_text()
t = re.sub(r"const V = '[^']*';", f"const V = 'vn-{ver}';", t)
w.write_text(t)
print('판번호', ver)
