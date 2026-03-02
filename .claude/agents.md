# ClawBox — Agent Guidelines

## Project Overview

ClawBox (`ai.openclaw.clawbox`) is an Electron desktop app serving as the GUI front-end for the OpenClaw AI agent gateway. It manages environment setup (Node.js, OpenClaw CLI), provider authentication (OAuth/API keys), messaging channel configuration, and real-time gateway monitoring via WebSocket.

## Tech Stack

- **Runtime**: Electron 33 (main + renderer + preload)
- **Language**: TypeScript 5.7 (strict)
- **UI**: React 18 + Tailwind CSS v4 + TanStack Router (hash history, file-based routes)
- **State**: Zustand 5
- **Build**: electron-vite 2 (Vite 5), electron-builder 26
- **Test**: Vitest 4 + happy-dom
- **Package Manager**: pnpm
- **UI Components**: Hand-rolled CVA/Radix pattern (not shadcn import, but follows the same convention)

## Architecture

### Three-Process Model

```
main process (Node.js)    ←— IPC —→    preload (bridge)    ←— contextBridge —→    renderer (React)
src/main/                               src/preload/                                src/renderer/
```

### IPC Contract (Single Source of Truth)

1. `src/shared/ipc-types.ts` — channel name string constants (`IPC_CHANNELS`, `IPC_EVENTS`)
2. `src/shared/electron-types.ts` — `ElectronIPC` interface (typed API surface)
3. `src/preload/index.ts` — `contextBridge.exposeInMainWorld('electronAPI', ...)`
4. `src/main/main.ts` — `ipcMain.handle()` registrations
5. `src/renderer/hooks/useElectron.ts` — typed access via `window.electronAPI`

**When adding a new IPC channel**: update all 5 files above in order.

### Key Directories

| Path | Purpose |
|---|---|
| `src/main/openclaw/` | OpenClaw integration: env detection, CLI spawn, gateway WebSocket, auth/channel config |
| `src/renderer/features/` | Feature-sliced UI modules (setup, dashboard) |
| `src/renderer/components/ui/` | Reusable UI primitives (button, card, dialog) |
| `src/renderer/stores/` | Zustand stores |
| `src/renderer/i18n/` | i18n with `en.ts` / `zh.ts` locale files |
| `src/shared/` | Types and constants shared across all processes |

## Conventions

### Code Style

- Use `cn()` from `src/renderer/lib/utils.ts` for conditional Tailwind class merging
- UI components follow CVA pattern: `cva` variants, `forwardRef`, `Slot` for `asChild`
- All OpenClaw protocol types are manually mirrored in `src/shared/openclaw-types.ts` — do NOT import from the CLI package

### i18n

- All user-facing strings must go through `useTranslation()` hook
- Add keys to both `src/renderer/i18n/locales/en.ts` and `zh.ts`
- Support parameter interpolation: `t('key', { param: value })` replaces `{param}`

### File Config Access

- `auth-store.ts` and `channel-store.ts` directly read/write `~/.openclaw/openclaw.json` and `~/.openclaw/agents/main/agent/auth-profiles.json`
- Use Node.js `fs` (not the CLI) for config manipulation

### Gateway Client

- `GatewayClient` uses WebSocket with JSON-RPC-style framing (`req`/`res`/`event`)
- Auto-reconnect with exponential backoff (max 3 retries, 1s base)
- Default gateway port: `18789`

### Platform-Aware

- macOS: native traffic lights, drag-region-only titlebar
- Windows/Linux: custom frameless titlebar with IPC-backed controls

## Common Commands

```bash
pnpm dev            # Hot-reload dev mode
pnpm build          # Production build to out/
pnpm typecheck      # Type check (tsc --noEmit)
pnpm test           # Run tests once
pnpm test:watch     # Watch mode
pnpm package:mac    # Build DMG (arm64 + x64)
pnpm package:win    # Build NSIS installer (x64)
```

## Do's and Don'ts

- **DO** keep `src/shared/` as the single source of truth for types and constants
- **DO** update both locale files when adding/changing user-facing text
- **DO** follow the existing IPC contract pattern when adding new IPC channels
- **DO** use Tailwind utility classes — no custom CSS unless absolutely necessary
- **DON'T** import OpenClaw types from the CLI package — mirror them in `openclaw-types.ts`
- **DON'T** use `tailwind.config.js` — Tailwind v4 is configured via the Vite plugin
- **DON'T** add new dependencies without considering Electron's main/renderer process boundaries
