# wearesdm frontend v3

`wearesdm` 청년부 관리 플랫폼의 React + TypeScript 프론트엔드입니다. 현재 백엔드의 Supabase Auth, RLS, Storage 정책, 안전한 RPC/workflow 계약을 기준으로 구성되어 있습니다.

## 핵심 원칙

- 브라우저에는 Supabase URL + publishable key만 둡니다. Service Role Key는 절대 사용하지 않습니다.
- 프론트 권한 체크는 UI/UX를 위한 것이며 실제 보안은 Supabase RLS와 DB 함수가 담당합니다.
- 행사 참가와 출석 변경은 백엔드 workflow RPC를 사용합니다.
- 프로필/기도제목처럼 직접 노출하면 안 되는 데이터는 백엔드의 safe API RPC를 사용합니다.
- Storage 경로는 백엔드가 요구하는 `profiles/{userId}/...`, `media/{organizationId}/...` 규칙을 따릅니다.

## 기술 스택

- React 19.2.8
- TypeScript 7.0.2
- Vite 8.1.5
- React Router 7.18.1
- TanStack Query 5.101.4
- Supabase JS 2.110.8
- CSS 기반 반응형 디자인 시스템

## 시작

Node.js 22.12+ 권장.

```bash
npm install
cp .env.example .env
```

`.env`:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

개발 서버:

```bash
npm run dev
```

검증:

```bash
npm run typecheck
npm run build
```

## 포함 화면

- 로그인 / 회원가입 / 비밀번호 재설정
- 대시보드
- 공지사항
- 일정/행사 및 참가 신청
- 예배
- 조직/팀/순/동아리/봉사팀
- 기도제목 및 반응
- 미디어 / Storage 업로드
- 출석 / 출석 수정 요청 / 검토
- 알림 및 수신 설정
- 내 프로필 / 프로필 이미지
- 관리자 역할 / 감사 로그 / 알림 정책

## v3에서 강화된 부분

- Auth 세션 경쟁 상태 방지 및 context 로딩 오류 화면
- 전역 React Error Boundary
- 모달 ESC 닫기, focus, body scroll lock
- datetime-local의 로컬 시간 표시/저장 안정화
- 출석 수정 요청 검토 화면 연결 오류 수정
- 역할별 조직 범위 필터 강화
- 조직 관리자 권한 UI와 백엔드 권한 규칙 정합성 개선
- 프로필/미디어 업로드 파일 크기 및 MIME 검증
- 업로드 후 DB 저장 실패 시 orphan Storage 파일 정리
- 모바일 하단 내비게이션
- 반응형/접근성/Reduced Motion 개선
- GitHub Actions에서 typecheck + production build 자동 검증

## 백엔드 계약

현재 백엔드에서 사용하는 주요 RPC:

- `get_my_profile`
- `get_visible_profiles`
- `get_prayer_requests`
- `register_for_event`
- `cancel_event_registration`
- `set_attendance`
- `request_attendance_correction`
- `review_attendance_correction`

백엔드의 RLS가 직접 쓰기를 막은 `event_participants`, `attendance_records`, `attendance_correction_requests`에는 클라이언트가 직접 insert/update/delete하지 않습니다.

## 배포 전 체크

1. Supabase `.env` 값을 입력합니다.
2. 백엔드 migration이 최신 상태인지 확인합니다.
3. 첫 관리자 bootstrap을 백엔드에서 완료합니다.
4. GitHub Actions의 `typecheck`와 `build`가 모두 통과하는지 확인합니다.
5. 실제 Supabase 프로젝트에서 관리자/팀장/순장/일반회원 계정으로 RLS 흐름을 테스트합니다.
