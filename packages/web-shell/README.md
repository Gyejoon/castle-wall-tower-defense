# web-shell

Grid Line Defense의 React + Vite 클라이언트. Phaser 게임 엔진(`@gld/phaser-game`)을 DOM UI로 감싼다.

## 랭킹 시스템 로컬 실행

Supabase 로컬 스택을 띄워 계정/리더보드를 테스트한다. Docker 필요.

1. 로컬 스택 기동
   ```bash
   supabase start
   ```
2. `.env.local` 작성 (저장소 루트에서)
   ```bash
   cp packages/web-shell/.env.example packages/web-shell/.env.local
   # supabase status 의 API URL/anon key 를 .env.local 에 채움
   ```
3. 마이그레이션 적용
   ```bash
   supabase db reset
   ```
4. 제약 회귀 테스트(옵션)
   ```bash
   supabase db execute --file supabase/tests/runs_constraints.sql
   ```
5. 개발 서버
   ```bash
   bun run --cwd packages/web-shell dev
   ```

### 수동 QA 체크리스트

1. 서로 다른 이메일로 두 계정을 만들어 닉네임 충돌 시 "이미 사용 중" 표시 확인.
2. 로그인 후 게임 1판 → 랭킹 탭에서 본인 행 `(나)` 태그 표시.
3. 동일 계정이 더 높은 웨이브 기록 시 `v_leaderboard` 의 best 만 노출되는지 확인.
4. 네트워크 단절 후 게임 종료 → localStorage `gld:pending_run` 키 저장, 다음 부팅 시 자동 재전송.
5. 430px 뷰포트(iPhone 15 Pro 기준)에서 4탭이 잘림 없이 렌더되는지 확인.

## Vercel 프로덕션 환경 변수

- `VITE_SUPABASE_URL` — Supabase 프로젝트 API URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon key
- Preview / Production 환경 각각 주입, Encrypted 로 저장.
- RLS 정책이 service_role 없이 동작하도록 설계되어 있으므로 anon key 만 클라이언트에 노출한다.

## 관련 경로

- 마이그레이션: `supabase/migrations/`
- 제약 테스트: `supabase/tests/`
- 랭킹 타입: `@gld/shared` → `types/ranking.ts`
- authStore: `src/stores/authStore.ts`
- Supabase 클라이언트: `src/lib/supabase.ts`
