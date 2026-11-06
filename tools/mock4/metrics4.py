# -*- coding: utf-8 -*-
"""모의고사 4 수치를 실제 2차 시험 수치와 한 표로 — tools/mock3/metrics.py 를 낱말표만 바꿔 돌린다. 쓰기: python3 tools/mock4/metrics4.py"""
import pathlib, sys
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools/mock4'))
s = (R / 'tools/mock3/metrics.py').read_text(encoding='utf-8').replace('import common3 as c', 'import common4 as c').replace("'mock3': 8,", "'mock4': 11, 'mock3': 8,").replace("else 'mock3'", "else 'mock4'")
exec(compile(s, str(R / 'tools/mock3/metrics.py'), 'exec'), {'__name__': '__main__', '__file__': str(R / 'tools/mock3/metrics.py')})
