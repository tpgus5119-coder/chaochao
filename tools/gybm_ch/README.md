# GYBM 메인교재 과별 작업 도구 (2026-09-25, 임시폴더에서 쓰던 것을 그대로 보관)

**참고용 사본이다.** 원래 세션 임시폴더(`scratchpad/`)에서 과 폴더(`v2c/cN`, `chN`)와 함께 썼고,
경로는 그 구조를 가정한다(`SP = 이 파일이 있는 폴더`). 다시 쓸 때는 과 폴더를 만들고 스크립트를 그 옆에 둔다. 방법은 `docs/기준.md` §14.

| 도구 | 하는 일 |
|---|---|
| `chk_common.py <과폴더> [--final gybm audio_index]` | 옮겨 적은 책 글(book_text.txt)과 앱을 기계로 대조(음절·사전 붙임말·예문·그림·소리) |
| `apply_generic.py` / `finish_ch.py` | realbook 에 새 낱말을 넣고 → 빌드 → 예문·소리 |
| `patch_generic.py` / `patch_ch.py` | 새 낱말 예문 넣기 / 예문 바로잡기(화자 머리표 떼기·소리 없는 것 만들기). **빌드 뒤에** 한다 |
| `gen_imgs_g.py` `sheet_imgnew_g.py` `install_imgs_g.py` `install_extra.py` | 그림 굽기(Draw Things) → 밑그림표로 눈 검수 → img/ 로 옮겨 잇기 |
| `pil_gram.py` `pil_boost.py` | 글자·도형이 뜻인 낱말(문법 용어·달 이름·지도·연결어)을 직접 그리기 |
| `reapply_all.py` | 빌드를 다시 돌린 뒤 모든 과의 패치·그림을 되입히기 |
| `qwen_trans_check.py` | 예문 (베트남어, 한국어) 쌍이 서로 번역인지 Qwen 이 걸러 봄(플래그용, 판정은 사람) |
| `shared_owners.py` `regen_prompts.py` | 성조만 다른 낱말이 나눠 쓰던 그림 333개의 '맞는 낱말' 판정 / 새 그림 프롬프트 초안 |
| `flux_jobs.py` `gen_boost.py` | 회화 '보강' 낱말 그림 프롬프트·굽기 |
