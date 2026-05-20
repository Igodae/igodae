# 이거돼? — 현재 상황 & TODO & 2차 학습 준비

## 현재 상황 요약

### 완료된 것
- [x] DL 모델 1차 학습 완료 (ArcFace + EfficientNet-B0, 512-dim)
- [x] Flask 추론 서버 (`ml/server.py`, :5001) 연동 완료
- [x] Vite 프록시 미들웨어 (`modelDevProxy`) 추가 → `/api/model-inference`
- [x] App.jsx 하이브리드 파이프라인 구현: DL 모델 → 식약처 DB → Groq 요약
- [x] Groq 크로스밸리데이션 제거 (한국 약 데이터 없어서 의미 없음)
- [x] OOD 방어 (코사인 유사도 < 0.25 → "약이 아닙니다")
- [x] ngrok 외부 접속 설정 완료 (팀원 테스트용)
- [x] co_work 브랜치에 커밋 완료 (de27914)
- [x] CLAUDE.md 문서화

### 현재 문제점
- **학습 데이터 273종뿐** — 식약처 API에서 `ITEM_IMAGE` 필드가 있는 약만 273개
- 전체 식약처 등록 약 25,492개 중 273개만 이미지 있음
- **타이레놀, 게보린 등 대표 OTC 약 대부분 학습 안 됨**
- 웹 크롤링도 현재는 이 273종에 대해서만 수행 (약 당 4장 추가)
- 확신도 낮은 결과 많음 (0.25~0.45 구간)

### 현재 돌아가는 서버 (Mac Mini)
- ML 추론 서버: `localhost:5001` (273개 약, threshold 0.25)
- Vite 개발 서버: `localhost:3000`
- ngrok 터널: `https://grimy-paternity-unison.ngrok-free.dev`

### 미push 변경사항
- `vite.config.js` — `allowedHosts` ngrok 도메인 추가
- `package-lock.json` — 의존성 변경
- `ml/` 폴더 — untracked (gitignore에 data/output/venv 제외됨)

---

## TODO 리스트

### 긴급 (지금)
1. [ ] 미push 변경사항 co_work에 push (`vite.config.js` allowedHosts)
2. [ ] 팀원들 ngrok 링크로 테스트 → 오류 리포트 수집

### 2차 학습 (핵심)
3. [ ] 웹 크롤링 대상 확대: 273종 → 전체 식약처 DB 25,492종
4. [ ] 크롤링 실행 (예상: 1~2일)
5. [ ] 2차 모델 학습 (예상: 4~6시간)
6. [ ] OOD threshold 재조정 (데이터 늘면 0.25보다 높여야 할 수 있음)

### 앱 개선
7. [ ] 여러 약 동시 인식 구현 (현재 Top-1만, server.py에서 Top-15 반환은 가능)
8. [ ] 식약처 데이터 미매칭 시 처리 개선 (drugName이 정확히 안 맞는 케이스)

### 최종
9. [ ] 최종 테스트 + 시연 영상 촬영
10. [ ] co_work → main PR 머지

---

## 2차 학습 준비 — 세부 내용

### 1. 핵심 문제: 왜 273종뿐인가

현재 `train.py`의 `collect_data()` 함수는 식약처 API 2개를 조회함:
- `MdcinGrnIdntfcInfoService03` (낱알식별) — 여기서 `ITEM_IMAGE` 필드가 있는 것만 추출
- `DrbEasyDrugInfoService` (의약품개요) — 여기서 `itemImage` 필드가 있는 것만 추출

**문제**: 전체 25,492개 약 중 이미지 필드가 채워진 건 약 273개뿐.
타이레놀, 게보린, 이부프로펜 등 흔한 약이 이 273개에 포함 안 됨.

### 2. 해결 방법: 웹 크롤링 확대

현재 웹 크롤링 코드(`collect_web_images()`)는 이미 구현되어 있지만,
**식약처에서 이미지를 받은 273종에 대해서만** 추가 이미지를 수집하는 구조임.

#### 수정 필요 사항

**`train.py` 수정 포인트:**

```
# 현재 (line 1107):
web_df = collect_web_images(pill_names)
# pill_names = 식약처 이미지가 있는 273종의 이름 목록

# 변경 목표:
# pill_names = 식약처 전체 등록 약 25,492종 중 상위 N종
# (처음에는 1,000~2,000종부터 시작)
```

**구체적 수정 방법:**

1. **전체 약 이름 목록 수집 함수 추가**
   - 식약처 API 전체 페이지 순회 → 모든 `ITEM_NAME` 수집
   - 이미지 유무와 무관하게 이름만 추출
   - 중복 제거 후 리스트 생성

2. **`collect_web_images()` 입력 변경**
   - 기존: `pill_names` (273종, 식약처 이미지 있는 것만)
   - 변경: `all_pill_names` (전체 또는 상위 N종)
   - 약 이름으로 네이버/구글 이미지 검색 → 다운로드

3. **크롤링 파라미터 조정**
   ```python
   WEB_IMAGES_PER_PILL = 4    # 약 당 최대 4장 (현재 값)
   # → 이미지 없는 약은 8~10장으로 올려야 할 수 있음
   # 식약처 원본이 없으니 웹 이미지가 유일한 소스
   ```

4. **이미지 품질 필터 강화**
   - 현재 `download_web_image()`에서 50x50 미만만 필터링
   - 추가 필요: 약 이미지인지 검증 (텍스트만 있는 이미지, 광고 등 필터)
   - SSIM이나 간단한 규칙 기반 필터 추가 검토

### 3. 크롤링 확대 시 예상 소요시간

| 대상 규모 | 크롤링 시간 | 학습 시간 | 비고 |
|-----------|------------|----------|------|
| 1,000종 × 4장 | ~1시간 | ~4시간 | 1차 확대, 빠른 테스트 |
| 2,000종 × 6장 | ~3시간 | ~5시간 | 주요 약 커버 |
| 5,000종 × 8장 | ~8시간 | ~8시간 | 대규모 확대 |
| 25,492종 × 4장 | ~1.5일 | ~12시간+ | 전체 커버 (비현실적 1차) |

**권장: 1,000~2,000종부터 시작 → 정확도 확인 → 점진적 확대**

### 4. 크롤링 시 주의사항

- **레이트 리밋**: 현재 `time.sleep(0.5)` → 네이버/구글 차단 가능
  - IP 차단 시 VPN 또는 프록시 로테이션 필요
  - `time.sleep(1.0~2.0)` 으로 올리는 게 안전
- **이미지 품질**: 웹 이미지는 노이즈 많음 (약 상자, 광고, 무관한 이미지)
  - 수동 검수 또는 필터 로직 필요
- **저작권**: 네이버/구글 이미지 → 학술/비상업 용도 확인
- **디스크 공간**: 2,000종 × 6장 × ~100KB = ~1.2GB (여유로움)
- **중복 방지**: `WEB_CSV_PATH` 존재 시 스킵 → 기존 데이터 삭제 필요
  ```bash
  rm ml/data/web_pills.csv    # 기존 273종 웹 크롤링 결과 삭제
  rm -rf ml/data/web_images/  # 기존 웹 이미지 삭제
  ```

### 5. 학습 파이프라인 흐름 (2차)

```
1. collect_data()          → 식약처 API 이미지 (273종, 기존 유지)
2. collect_all_names()     → 식약처 전체 약 이름 수집 (NEW)
3. collect_web_images()    → 웹 크롤링 (1,000~2,000종으로 확대)
4. collect_negative_data() → OOD 네거티브 이미지 생성
5. Augmentation            → 원본 1장 → 30장 증강 (기존 유지)
6. ArcFace 학습            → EfficientNet-B0 + 512-dim embeddings
7. ref_embeddings 생성     → best_model.pth + ref_embeddings.npy + ref_names.json
8. ood_config.json 업데이트 → threshold, total_classes 등
```

### 6. 2차 학습 후 변경 필요한 파일

| 파일 | 변경 내용 |
|------|----------|
| `ml/train.py` | 전체 약 이름 수집 함수 추가, 크롤링 대상 확대 |
| `ml/output/best_model.pth` | 새 모델 가중치 (자동 생성) |
| `ml/output/ref_embeddings.npy` | 새 레퍼런스 임베딩 (자동 생성) |
| `ml/output/ref_names.json` | 확대된 약 이름 목록 (273 → 1000+) |
| `ml/output/ood_config.json` | total_classes, threshold 재조정 |
| `ml/server.py` | 변경 없음 (자동으로 새 모델 로드) |
| `src/App.jsx` | 변경 없음 (DL 결과 처리 로직 동일) |
