#!/usr/bin/env python3
"""배포 판번호를 찍는다.
GitHub Pages 가 CSS/JS 를 10분간 캐시시켜서, 고쳐도 바로 안 보인다.
파일 주소 뒤에 ?v=<커밋해시> 를 붙여 새 주소로 만들어 강제로 다시 받게 한다."""
import pathlib, re, subprocess

ver = subprocess.run(['git', 'rev-parse', '--short=8', 'HEAD'],
                     capture_output=True, text=True).stdout.strip() or 'dev'

h = pathlib.Path('index.html'); s = h.read_text()
s = re.sub(r'(href="style\.css)(\?v=[^"]*)?"', rf'\1?v={ver}"', s)
s = re.sub(r'(src="app\.js)(\?v=[^"]*)?"', rf'\1?v={ver}"', s)
h.write_text(s)

w = pathlib.Path('sw.js'); t = w.read_text()
t = re.sub(r"const V = '[^']*';", f"const V = 'vn-{ver}';", t)
w.write_text(t)
print('판번호', ver)
