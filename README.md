English | [한국어](./README.ko-kr.md)
<br>

<div align="center">
  
  # Seon Goals
  
  <p>A local-first goal management application.<br>🚧 Under development 🚧</p>

</div>

## About

The name Seon, Korean for "line" (선), relates to the trajectory shown in the progress charts and suggests a path towards achievement, one step at a time.

## Features

- 📱 Progressive Web App (PWA) - support for mobile and desktop
- 💾 Local-first architecture - works completely offline, no server needed
- ⚡ Instant UI responses with local CRUD
- 🔄 Optional sync capabilities
- 📊 Visual goal tracking
- 🌐 Multi-language support (English, Korean)

## Architecture

Seon implements a local-first architecture pattern using SQLite as the primary data store. All CRUD operations execute against the client SQLite instance first, which servers as the source of truth for the client application. Changes are queued for eventual (optional) replication to the backend PostgreSQL database. The database is secured with RLS (Row-Level Security) with no intermediate server between client and DB.

The backend uses a change stream mechanism to detect modifications and propagate them to relevant client, ensuring that local databases remain current while maintaining their ability to operate independently. Client's data is partitioned according to developer-defined Sync rules that determine which data subsets should be replicated to each client (intermediated by PowerSync).<br><br>

![Architecture Diagram](https://github.com/user-attachments/assets/fe28996c-3b54-4a91-b28e-b42f16da1fdd)
<br>

## Tech Stack

<table>
<tr>
  <td><b>Frontend</b></td>
  <td><b>Backend</b></td>
  <td><b>Sync</b></td>
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
    • Lingui (i18n)
  </td>
  <td>
    • Hono<br>
    • PostgreSQL<br>
    • Drizzle ORM<br>
    • jose (auth)
  </td>
  <td>
    • PowerSync<br>
    • Supabase SDK
  </td>
</tr>
</table>

## Getting Started

### Prerequisites

- Node.js 20.12.0 or higher
- pnpm package manager

### Installation

1. Clone the repository:

```sh
git clone [repo-url]
```

2. Install dependencies:

```sh
pnpm install
```

3. Run the application:

```sh
pnpm -filter seon-web build
pnpm -filter seon-web serve
```

→ Server setting instructions coming soon.
