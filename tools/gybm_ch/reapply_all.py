"""build_gybm.py 뒤에 과별 손질을 전부 다시 입힌다(예문·소리·그림). 사용: python3 reapply_all.py [--no-img]"""
import json, pathlib, subprocess, sys
SP = pathlib.Path(__file__).resolve().parent
noimg = "--no-img" in sys.argv
dirs = [("ch3","ch3"),("ch4","ch4"),("ch5","ch5"),("ch6","ch6"),("ch7","ch7"),("ch8","ch8"),("ch9","ch9"),("ch10","ch10"),("ch11","ch11"),("ch12","ch12")] + [(f"v2c/c{i}", f"v2c/c{i}") for i in range(1, 13)]
def run(*a):
    r = subprocess.run(["python3", *map(str, a)], capture_output=True, text=True); return (r.stdout + r.stderr).strip().splitlines()[-2:]
TITLES = {"ch1img": "Xin chào!", "ch2": "Chị ấy là người Hàn Quốc"}
for d, _ in dirs:
    D = SP / d
    if not (D / "cfg.json").exists(): continue
    t = json.loads((D / "cfg.json").read_text(encoding="utf-8"))["prefix"]
    if (D / "new_b.json").exists(): print(d, "generic", run(SP / "patch_generic.py", t, D / "new_b.json"))
    for pf in sorted(x.name for x in D.glob("patch*.json") if "need" not in x.name):
        print(d, pf, run(SP / "patch_ch.py", t, D / pf))
for t in ["Xin chào!", "Chị ấy là người Hàn Quốc", "Em học tiếng Việt", "Anh làm nghề gì?", "Bây giờ chúng ta đi đâu?", "Bài ôn", "Tôi thường không ăn sáng", "Anh ấy nói được tiếng gì?", "Thứ năm tôi đi Hà Nội", "Gia đình tôi có bốn người", "Tôi đi bằng xe máy", "Bài ôn (Review)"]:
    print(t, run(SP / "patch_ch.py", t))
for t in ["Cơm sen vừa thơm vừa ngon!", "Tôi mới đi du lịch về.", "Anh thường mua sắm ở đâu?"]: pass
print("nhà thờ", run(SP / "patch_ch.py", "Bây giờ chúng ta đi đâu?", SP / "ch5_ndb.json"))
print("vứt", run(SP / "patch_ch.py", "Tôi mới đi du lịch về.", SP / "v2c3_vut.json"))
print("전역 예문 고침", run(SP / "patch_global.py", SP / "fix_trans1.json", "--strip-speakers"))
if not noimg:
    for d in "ch1img ch3 ch4 ch5 ch6 ch7 ch8 ch9 ch10 ch11 ch12".split():
        print(d, "img", run(SP / d / "install_imgs.py"))
    print("extra1", run(SP / "install_extra.py", SP / "extra1", "ex1"))
