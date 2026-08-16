# reveal-file

Right-click a **produced file** in DeepSeek Harness (dsh) Web chat and open its location in your OS file manager — with the file selected.

## Features

- **Right-click menu** — "打开所在目录" appears on produced-file rows in chat
- **Cross-platform** — `explorer.exe /select,` (Windows), `open -R` (macOS), `xdg-open` (Linux)
- **Feedback toast** — success / failure notification in the corner
- **Lightweight** — pure DOM context menu, no framework, one REST endpoint

## Requirements

- DeepSeek Harness (`@deepseek-ai/dsh`) with the **web** profile
- `@deepseek-ai/cordis` (bundled with dsh)

## Installation

```bash
pnpm dsh plugin --profile web add reveal-file
pnpm dsh --profile web
```

Or add it to your profile's `cordis.patch.yml`:

```yaml
- insert:
    - id: reveal-file
      name: 'reveal-file'
```

## Usage

In a chat message, right-click any produced file row (the files the model wrote to disk). A small menu appears with **📂 打开所在目录**. Click it — the file manager opens with the file selected.

## How it works

Dual-face plugin:

- **Host half** (`lib/index.js`) — registers a REST endpoint `/api/reveal-file/reveal` on the dsh web server. It resolves the path through the `fs` service, then spawns the platform's reveal command via the `subprocess` service.
- **Client half** (`lib/client.js`) — listens for `contextmenu` events on produced-file rows and calls the endpoint with `fetch()`.

> Note: the host half uses the host `webServer` service. This is the correct pattern for a static host plugin — the dynamic-runner sandbox has no `harness` global.

## License

MIT
