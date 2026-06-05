# 장독대 국어 · 개념어 학습기 (풀버전)

수능 국어 개념어 **298개**를 학습하는 독립 웹앱. 검증된 개념 DB는 앱에 내장되어 즉시·정확하게 뜨고, AI는 적용·해석 문제 생성에만 보강으로 쓰입니다.

- **프런트**: Vite + React (개념 298개 내장: `src/data/concepts.json`)
- **저장**: Supabase (학생 · 풀이 기록)
- **AI**: Anthropic API (Vercel 서버리스 `/api/claude`, 키 숨김)

## 주요 기능
- **학생 등록·로그인** (이름·학교·학년·비번, 비번은 bcrypt 해시)
- **개념 학습** — 영역(시·소설·고전문학·문법·화법/작문/독서) · 소분류 · 난이도(하/중/상)로 카드 학습
- **변별 퀴즈** — ‘관련 개념’을 오답 보기로 써서 헷갈리는 개념을 집중 훈련 (AI·인터넷 불필요)
- **AI 적용·해석 문제** — 개념을 골라 작품/예문 적용 문제를 생성
- **적응형 복습** — 틀리거나 복습 주기가 된 개념을 정답률 낮은 순으로 다시 출제(간격 반복)
- **오답노트** — 틀린 개념 + 무엇과 혼동했는지 패턴 표시, 바로 다시 풀기
- **강사 대시보드** — 학생별 학습량·습득·정답률, 전체 혼동 개념 Top (로그인 화면의 ‘선생님 모드’)

## 배포 순서
1. **Supabase**: 새 프로젝트 → SQL Editor 에 `supabase_schema.sql` 붙여넣고 Run → Settings>API 에서 URL·anon key 복사
2. **Anthropic**: console.anthropic.com 에서 API 키 발급
3. **GitHub**: 이 폴더를 새 저장소(예: `costudy15/jangdokdae-gaenyeomeo`)에 push
4. **Vercel**: 저장소 Import (Framework=Vite 자동) → 환경변수 3개 등록 후 Deploy
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`

## 선생님 모드 비밀번호
- 기본값은 **`jangdokdae`** 입니다. 반드시 변경하세요.
- Supabase SQL Editor 에서 한 줄 실행:
  ```sql
  update app_config set value = crypt('새비밀번호', gen_salt('bf')) where key = 'teacher_pw';
  ```

## 로컬 테스트
`npm run dev` 는 화면만 뜨고 `/api/claude` 서버 함수는 실행되지 않습니다.
AI 문제까지 로컬에서 보려면:
```bash
npm install
npm i -g vercel
# 루트에 .env 만들고 .env.example 의 3개 값 채운 뒤
vercel dev
```

## 다음에 다듬을 거리
- 개념 데이터는 `src/data/concepts.json` 만 교체하면 즉시 반영됩니다(엑셀 갱신 시 재변환).
- 적응형 가중치(전이·힌트 의존·망각)를 리포트의 mastery 공식대로 더 정교화 가능.
- 강사 대시보드에 개념별 정답률 히트맵, 기간 필터 추가 가능.
