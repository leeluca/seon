<div align="center">
  
  # Seon Goals (선)
  
  <p>A local-first goal management application</p>

</div>

## 🎯 About

Seon (선) is a local-first goal management application designed to help track and achieve your objectives. Named after the Korean word for "line" (선), it reflects both the upward trajectory shown in the progress charts and the path towards achievement, one step at a time.

## ✨ Features

- 📱 Progressive Web App (PWA) - support for mobile and desktop
- 💾 Local-first architecture - works completely offline, no server needed
- ⚡ Instant UI responses with local CRUD
- 🔄 Optional sync capabilities
- 📊 Visual goal tracking
- 🌐 Multi-language support (Korean and English)

## 🚀 Getting Started

### Prerequisites

- Node.js 20 or higher
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

## 🏗 Architecture

The application is built with a local-first architecture, meaning all CRUD happens locally and data can be optionally synced. 

![Architecture Diagram](https://github.com/user-attachments/assets/1f4e12d6-31eb-4ff3-b9ea-a17bcc2306e6)
