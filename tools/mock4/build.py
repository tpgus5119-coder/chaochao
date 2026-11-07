# -*- coding: utf-8 -*-
"""주간시험 4 모의고사 다섯 벌 → data/mock4_N.json · tools/mock4/_aud_N.json. 검사는 common3.build 그대로. 쓰기: python3 tools/mock4/build.py
소리: gen_audio_list(_aud_1~5) → python3 tools/mock3/dialog_audio3.py"""
import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import common4 as c, sets_a as a, sets_b as b, sets_c as d, sets_w3 as w
def one(n):
    q = a.A1[n] + c.PKS(n, a.A2[n]) + a.A3[n] + a.A4[n] + c.B1S(n, *b.B1[n]) + b.B2_[n]
    for k, (t, tko, two) in enumerate(b.B3_[n]): q += c.B3(t, tko, two, n, k)
    return q + c.B4S(n, b.B4[n]) + d.C1_[n] + d.C2_[n] + [w.C3_[n]]
if __name__ == '__main__':
    for n in range(1, 6): c.build(n, one(n))
