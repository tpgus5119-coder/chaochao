"""손으로 걸러 본 뒤(이름·OCR 찌꺼기·풀이 가능한 짜임만 남은 것을 확인한 뒤) 검사 목록을 cfg 에 반영한다.
사용: python3 auto_cfg.py <과 폴더> — chk_common --final 결과의 '읽은 글의 음절'/'사전 기준으로 붙여 나눈' 두 목록과 '이 과 낱말 N' 을 cfg 의 nonword/skip/expect 에 더한다."""
import ast, json, pathlib, re, subprocess, sys
SP = pathlib.Path(__file__).resolve().parent
D = pathlib.Path(sys.argv[1]).resolve()
ROOT = pathlib.Path.home() / "짜오짜오/베트남어-어플"
out = subprocess.run(["python3", str(SP / "chk_common.py"), str(D), "--final", "data/gybm.json", "data/audio_index.json"], cwd=ROOT, capture_output=True, text=True).stdout
cfg = json.loads((D / "cfg.json").read_text(encoding="utf-8"))
def lst(key):
    m = re.search(key + r".*?— (?:빠진 것 )?(\[.*?\])\n", out)
    return ast.literal_eval(m.group(1)) if m else []
syl = lst("읽은 글의 음절")
seg = lst("사전 기준으로 붙여 나눈")
n = re.search(r"이 과 낱말 (?:0개|\d+개) — (\d+)", out)
cfg["nonword"] = sorted(set(cfg.get("nonword", [])) | set(syl))
cfg["skip"] = sorted(set(cfg.get("skip", [])) | set(seg))
if n: cfg["expect"] = int(n.group(1))
(D / "cfg.json").write_text(json.dumps(cfg, ensure_ascii=False, indent=1), encoding="utf-8")
print("nonword +", len(syl), "· skip +", len(seg), "· expect", cfg["expect"])
