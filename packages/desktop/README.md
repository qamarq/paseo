# desktop

Electron desktop app for Paseo.

## Paseo Glass identity

This fork ships the desktop app as **Paseo Glass** so it runs next to the official Paseo app on one
machine. `src/identity.ts` holds the runtime values; `src/identity.test.ts` fails when
`electron-builder.yml` drifts from them.

| What                  | Paseo Glass                                     | Official Paseo        |
| --------------------- | ----------------------------------------------- | --------------------- |
| Product name / bundle | `Paseo Glass` / `Paseo Glass.app`               | `Paseo` / `Paseo.app` |
| App ID                | `sh.paseo.desktop.glass`                        | `sh.paseo.desktop`    |
| userData and lock     | `~/Library/Application Support/Paseo Glass`     | `.../Paseo`           |
| Daemon home           | `~/.paseo-glass`                                | `~/.paseo`            |
| Daemon listen         | `127.0.0.1:6777`                                | `127.0.0.1:6767`      |
| Agent link scheme     | `paseo-glass://`                                | `paseo://`            |
| Auto-update           | Off: no feed in the build, checks short-circuit | GitHub releases       |

Rules the code enforces:

- `PASEO_HOME` still overrides the daemon home, except that Glass never adopts `~/.paseo`.
  Shells and agents started by the official app export that value, and Glass ignores it.
- The first daemon start on a home without `config.json` writes the server defaults with
  `daemon.listen` set to `127.0.0.1:6777`. An existing `config.json` is left alone, so change the
  port with `paseo daemon config set daemon.listen <host:port> --home ~/.paseo-glass`.
- The renderer still loads from the internal `paseo://app` origin. That scheme is not registered
  with the OS, and the daemon CORS allowlist expects it.

### Desktop dev

```bash
npm run dev:desktop
```

Dev uses `<checkout>/.dev/paseo-home`, daemon `127.0.0.1:6768` and `<checkout>/.dev/user-data`.
It ignores an inherited `PASEO_HOME`; set `PASEO_DEV_MANAGED_HOME=1` with `PASEO_HOME` to pick
another home.

### Local unsigned macOS build

On an Apple Silicon Mac:

```bash
npm run build:mac-local --workspace=@getpaseo/desktop
```

This builds the renderer, daemon and CLI, then writes
`packages/desktop/release/mac-arm64/Paseo Glass.app` (`--dir`, arm64 only, no DMG or zip).
`electron-builder.mac-local.yml` ad-hoc signs it (`identity: "-"`) and turns off hardened runtime
and notarization. No Apple certificate is needed.

Install and launch:

```bash
ditto "packages/desktop/release/mac-arm64/Paseo Glass.app" "/Applications/Paseo Glass.app"
open "/Applications/Paseo Glass.app"
```

A copy built on the same Mac has no quarantine flag and opens directly. A copy downloaded or
AirDropped from elsewhere needs `xattr -dr com.apple.quarantine "/Applications/Paseo Glass.app"`.

Check that it runs on its own daemon:

```bash
cat ~/.paseo-glass/paseo.pid                           # listen: 127.0.0.1:6777
lsof -nP -iTCP:6767 -iTCP:6777 -sTCP:LISTEN            # two daemons, one per port
grep paseoHome "$HOME/Library/Logs/Paseo Glass/main.log" | tail -1
```
