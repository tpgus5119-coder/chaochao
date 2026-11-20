# -*- coding: utf-8 -*-
"""모의고사 5 수치를 실제 2차 시험 수치와 한 표로 — tools/mock3/metrics.py 를 낱말표만 바꿔 돌린다. 쓰기: python3 tools/mock5/metrics5.py"""
import pathlib, sys
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools/mock5'))
s = (R / 'tools/mock3/metrics.py').read_text(encoding='utf-8').replace('import common3 as c', 'import common5 as c').replace("'mock3': 8,", "'mock5': 15, 'mock4': 11, 'mock3': 8,").replace("else 'mock3'", "else 'mock5'")
exec(compile(s, str(R / 'tools/mock3/metrics.py'), 'exec'), {'__name__': '__main__', '__file__': str(R / 'tools/mock3/metrics.py')})
