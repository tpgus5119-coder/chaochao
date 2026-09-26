# 베트남어 TTS 조사 — 무료 · 평생 · 상업 이용 · 북부 남녀 (2026-09-26)

**질문(대표님):** 현존 최고의 "무료 평생 상업 이용 가능" 베트남어 TTS 는? 북부 목소리, 남·여 둘 다.
**방법:** 웹 검색 + 모델 카드·공식 문서 직접 열람. 아래 "확인함"은 원문 페이지에서 직접 읽은 것, "검색 요약"은 검색 결과 요약만 본 것이다.

## 결론
1. **깨끗하게 조건을 다 맞는 오픈소스는 (내가 확인한 범위에서) 없다.** 남·여 북부 목소리를 둘 다 갖추고 상업 이용이 분명한 무료 모델을 찾지 못했다.
2. **가장 가까운 오픈소스 = VieNeu-TTS** (모델 라이선스 Apache-2.0, 북부 남·여 내장 목소리, 맥·CPU 오프라인). 단, **학습에 쓴 자료(VieNeu-TTS-1000h)는 CC BY-NC 4.0(비상업)** 이라고 적혀 있어 '상업 이용'의 근거가 흐리다 → 상업 서비스에 쓰려면 저자에게 확인이 필요하다.
3. **오픈소스인데 남녀 둘이 없는 것**: Piper `vi_VN-vais1000-medium` — 북부 화자 1명(성별 미표기), 데이터 라이선스 CC BY 4.0(Piper 카드 표기), 품질 medium.
4. **무료 한도가 매달 되풀이되는 공식 클라우드**(내려받은 소리 파일을 앱에 넣는 방식이라 우리 규모는 한도 안): Azure AI Speech(HoaiMy 여·NamMinh 남), Google Cloud TTS. 우리 앱의 소리 글은 **약 1.6만 개·29만 자**라 한 달 무료 한도 안에서 통째로 다시 만들 수 있다.
5. **지금 앱은 edge-tts**(Microsoft Edge '읽어 주기' 온라인 서비스를 비공식으로 쓰는 라이브러리, GPL-3.0). README 에 이용약관·상업 이용 언급이 없다 → 상업화 전에는 **같은 목소리(HoaiMy·NamMinh)를 Azure 공식 API 로 다시 만드는 것**이 가장 안전하다(소리·발음이 그대로라 앱은 안 바뀐다).

## 근거 (출처)
| 항목 | 내용 | 출처 |
|---|---|---|
| VieNeu-TTS 모델 | license: apache-2.0. 내장 목소리 Bình(남·북)·Tuyên(남·북)·Nguyên(남·남)·Hương(여·북)·Ngọc(여·북)·Đoan(여·남) — 확인함 | https://huggingface.co/pnnbao-ump/VieNeu-TTS · https://huggingface.co/pnnbao-ump/VieNeu-TTS-v2 |
| VieNeu-TTS 저장소 | Apache 2.0, 맥·CPU ONNX 오프라인, v3 Turbo(48kHz) — 확인함 | https://github.com/pnnbao97/VieNeu-TTS |
| VieNeu-TTS 학습 자료 | **CC BY NC 4.0**, "🚫 NonCommercial — Không dùng cho mục đích thương mại", 상업용은 저자에게 문의 — 확인함 | https://huggingface.co/datasets/pnnbao-ump/VieNeu-TTS-1000h |
| Piper 베트남어 | vi_VN: 25hours_single(low)·vais1000(medium)·vivos(x_low), 각 화자 1명 — 확인함 | https://github.com/rhasspy/piper/blob/master/VOICES.md |
| vais1000 | 데이터 VAIS-1000, 라이선스 CC BY 4.0(Piper 모델 카드), 화자 1명·북부 억양(IEEE DataPort 설명, 성별 미표기, 데이터 페이지에 라이선스 문구는 없음) — 확인함 | https://huggingface.co/rhasspy/piper-voices/blob/main/vi/vi_VN/vais1000/medium/MODEL_CARD · https://ieee-dataport.org/documents/vais-1000-vietnamese-speech-synthesis-corpus |
| Piper 25hours_single | 데이터 InfoRe Technology 1, 라이선스 "Unknown" — 확인함 | https://huggingface.co/rhasspy/piper-voices/blob/main/vi/vi_VN/25hours_single/low/MODEL_CARD |
| Piper vivos | CC BY-NC-SA 4.0(비상업) — 확인함 | https://huggingface.co/rhasspy/piper-voices/blob/main/vi/vi_VN/vivos/x_low/MODEL_CARD |
| viet-tts(dangvansam) | 코드 Apache 2.0, 사전학습 모델·샘플은 CC BY-NC(비상업) — 검색 요약 | https://huggingface.co/dangvansam/viet-tts |
| F5-TTS-Vietnamese-ViVoice | CC-BY-NC-SA-4.0(비상업) — 검색 요약 | https://huggingface.co/hynt/F5-TTS-Vietnamese-ViVoice |
| NTT123/vietTTS | 코드 MIT 표기, 학습 자료(InfoRe)·사전학습 모델의 라이선스 문구 없음 — 확인함 | https://github.com/NTT123/vietTTS |
| edge-tts | GPL-3.0 파일 포함, "Microsoft Edge의 온라인 TTS 서비스를 API 키 없이" 쓴다는 설명, 이용약관·상업 언급 없음 — 확인함 | https://github.com/rany2/edge-tts |
| Azure 목소리 | vi-VN-HoaiMyNeural(여)·vi-VN-NamMinhNeural(남) — 검색 요약(공식 언어 목록 페이지는 길어 직접 확인 못함) | https://json2video.com/ai-voices/azure/voices/vi-vn-hoaimyneural/ · https://json2video.com/ai-voices/azure/voices/vi-vn-namminhneural/ |
| Azure 무료 한도 | Free(F0) 월 50만 자(공식 한도 문서는 월별 허용량을 가격 페이지에 둔다고 안내 — 숫자는 검색 요약) | https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-services-quotas-and-limits |
| Google Cloud TTS | 베트남어(vi-VN) 지원, 무료 월 한도 WaveNet 100만 자·Standard 400만 자, 그 뒤 100만 자당 $4(검색 요약, 가격 페이지 원문은 직접 못 읽음) | https://cloud.google.com/text-to-speech/pricing |
| Google 출력물 사용 | "You can use the audio data files you create using Cloud Text-to-Speech to power your applications…" — 확인함 | https://docs.cloud.google.com/text-to-speech/docs/basics |

## 안 확인한 것 (다음 사람이 채울 자리)
- Azure 공식 언어·목소리 표와 가격 페이지의 원문 숫자 / 출력물 재배포 조항
- Google vi-VN 목소리 이름·성별 표
- VieNeu-TTS 저자가 모델 가중치의 상업 이용을 따로 허락한다는 문구가 있는지(문의)
- 북부 억양이 실제로 북부인지는 **귀로 확인**해야 한다(우리 앱의 HoaiMy·NamMinh 는 Whisper 표본 검수·사람 귀 확인을 거쳤다)
