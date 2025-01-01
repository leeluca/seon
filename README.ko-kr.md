[English](./README.md) | 한국어
<br>

<div align="center">
  
  # Seon (선) 목표 관리
  
  <p>로컬 우선 목표 관리 애플리케이션<br>🚧 개발 진행 중 🚧</p>

</div>

## 소개

Seon(선)이라는 이름은 '선(線)'을 뜻하며, 진행 차트에 표시되는 궤적과 한 걸음씩 목표를 향해 나아가는 길, 두 가지의 의미를 담고 있습니다.

## 주요 기능

- 📱 프로그레시브 웹 앱 (PWA) - 모바일과 데스크톱 지원
- 💾 로컬 우선 아키텍처 - 서버 없이 완전한 오프라인 작동
- ⚡ 로컬 CRUD를 통한 즉각적인 UI 반응
- 🔄 선택적 동기화 기능
- 📊 시각적 목표 추적
- 🌐 다국어 지원 (한국어, 영어)

## 아키텍처

Seon은 SQLite를 주 데이터 저장소로 사용하는 로컬 우선 아키텍처로 개발되었습니다. 모든 CRUD 작업은 먼저 클라이언트 SQLite 인스턴스에서 실행되며, 이는 클라이언트 애플리케이션의 진실 공급원 역할을 합니다. 변경 사항은 백엔드 PostgreSQL 데이터베이스와의 선택적 복제를 위해 대기열에 추가됩니다. 데이터베이스는 클라이언트와 DB 사이에 중간 서버 없이 RLS(Row-Level Security)로 보호됩니다.

백엔드는 변경 스트림 메커니즘을 사용하여 수정 사항을 감지하고 관련 클라이언트에 전파하여, 로컬 데이터베이스가 독립적으로 작동하면서도 최신 상태를 유지할 수 있도록 합니다. 클라이언트의 데이터는 개발자가 정의한 동기화 규칙에 따라 분할되어 각 클라이언트에 복제될 데이터 하위 집합을 결정합니다(PowerSync를 통해 중재됨).<br><br>

![Architecture Diagram](https://github.com/user-attachments/assets/94693c6d-df97-456f-861a-de76a2a8c1a2)
<br>

## 기술 스택

<table>
<tr>
  <td><b>프론트엔드</b></td>
  <td><b>백엔드</b></td>
  <td><b>동기화</b></td>
</tr>
<tr valign="top">
  <td>
    • React + Vite<br>
    • TypeScript<br>
    • Tanstack Router<br>
    • TailwindCSS<br>
    • Radix UI<br>
    • Chart.js<br>
    • SQLite (wa-sqlite)<br>
    • Vite PWA<br>
    • Lingui (다국어)
  </td>
  <td>
    • Hono<br>
    • PostgreSQL<br>
    • Drizzle ORM<br>
    • jose (인증)
  </td>
  <td>
    • PowerSync<br>
    • Supabase SDK
  </td>
</tr>
</table>

## 시작하기

### 필수 조건

- Node.js 20.12.0 이상
- pnpm 패키지 매니저

### 설치

1. 저장소 복제:

```sh
git clone [repo-url]
```

2. 디펜던시 설치:

```sh
pnpm install
```

3. 애플리케이션 실행:

```sh
pnpm -filter seon-web build
pnpm -filter seon-web serve
```

→ 서버 설정 방법 안내는 곧 제공될 예정입니다.
