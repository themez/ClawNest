# ClawNest

An Electron desktop app for [OpenClaw](https://github.com/nicepkg/openclaw) — set up, authenticate, and monitor your AI agent gateway from a native GUI.

## Features

- **Environment Setup** — Detect and install Node.js and OpenClaw CLI with one click
- **API Authentication** — Configure AI model providers (OpenAI, Anthropic, etc.) via OAuth device-code flow or API key
- **Channel Management** — Connect messaging platforms (Telegram, Discord, Slack, WhatsApp, Signal, Feishu/Lark) with guided pairing
- **Real-time Dashboard** — Monitor gateway health, active sessions, and channel status over WebSocket
- **Gateway Control** — Start and stop the OpenClaw gateway directly from the app
- **i18n** — English and Chinese (Simplified) with runtime toggle

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Electron 33 |
| Language | TypeScript 5.7 (strict) |
| UI | React 18 + Tailwind CSS 4 + TanStack Router |
| State | Zustand 5 |
| Build | electron-vite 2 (Vite 5) |
| Package | electron-builder 26 |
| Test | Vitest + happy-dom |

## Prerequisites

- **Node.js** 18+
- **pnpm** (required)

## Quick Start

```bash
# Install dependencies
pnpm install

# Start dev server with hot reload
pnpm dev
```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Development mode with hot reload |
| `pnpm build` | Production build |
| `pnpm typecheck` | Type check (`tsc --noEmit`) |
| `pnpm test` | Run tests once |
| `pnpm test:watch` | Watch mode |
| `pnpm test:coverage` | Coverage report |
| `pnpm package:mac` | Build macOS DMG (arm64 + x64) |
| `pnpm package:win` | Build Windows NSIS installer (x64) |
| `pnpm package:all` | Build for all platforms |

## Project Structure

```
src/
├── main/               # Main process (Node.js)
│   ├── main.ts         # Window creation, IPC handlers, gateway lifecycle
│   └── openclaw/       # CLI spawn, auth, channel config, WebSocket client
├── preload/            # IPC bridge (contextBridge)
├── renderer/           # React app
│   ├── features/       # Feature modules (setup, dashboard)
│   ├── components/     # Reusable UI (button, card, dialog, titlebar)
│   ├── stores/         # Zustand stores
│   └── i18n/           # Locale files (en, zh)
└── shared/             # Types and constants shared across all processes
```

## Architecture

```
Main Process (Node.js)  ←— IPC —→  Preload (bridge)  ←— contextBridge —→  Renderer (React)
```

The app follows Electron's three-process model with a strict IPC contract defined in `src/shared/`. The main process manages the OpenClaw gateway subprocess and communicates with it over WebSocket (JSON-RPC framing). The renderer uses file-based routing with hash history.

## License

MIT
